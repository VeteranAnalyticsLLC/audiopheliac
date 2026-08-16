import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { getEngine, type EngineSnapshot } from "@/lib/audio/engine";
import { hitsToMidi } from "@/lib/audio/midi-file";
import { downloadBlob, stamp } from "@/lib/audio/wav";
import { kitById, type VoiceId } from "@/lib/audio/types";
import { KEY_TO_VOICE, MidiManager, resolvePriviaNote } from "@/lib/midi";
import { findPriviaPort, PRIVIA_SPEC } from "@/lib/privia";
import { hydrateMachine, useMachine, type MachineState } from "@/lib/store";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Pads } from "./Pads";
import { PianoMap } from "./PianoMap";
import { Sequencer } from "./Sequencer";
import { DrawerButtons, StudioDrawer } from "./StudioDrawer";
import { Transport } from "./Transport";
import { SceneButton } from "./KitPicker";
import { KidsPlayground } from "./KidsPlayground";
import { listAudioPorts, pickPreferredOutput } from "@/lib/audio/io";
import { looksLikeDawPort } from "@/lib/audio/handoff";
import { VinylDeck } from "./VinylDeck";
import { PianoCoach } from "./PianoCoach";
import { cn } from "@/lib/utils";

export function DrumMachine() {
  const [booted, setBooted] = useState(false);

  useEffect(() => {
    hydrateMachine();
    setBooted(true);
  }, []);

  if (!booted) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-bg text-muted">
        <p className="font-mono text-xs tracking-widest">ARMING KIT</p>
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={250}>
      <MachineInner />
    </TooltipProvider>
  );
}

function MachineInner() {
  const midiRef = useRef<MidiManager | null>(null);
  const recTimer = useRef<number | null>(null);
  const lastUsb = useRef<string | null>(null);
  const localPushed = useRef(false);
  const set = useMachine((s) => s.set);
  const mode = useMachine((s) => s.mode);

  async function connectMidiAccess() {
    const midi = midiRef.current;
    if (!midi) return false;
    const ok = await midi.init();
    set({
      midiReady: ok,
      midiSupported: midi.supported,
      midiError: midi.lastError,
    });
    return ok;
  }

  useEffect(() => {
    const engine = getEngine();
    const midi = new MidiManager({
      onNoteOn: (note, velocity, deviceId, channel) => {
        const state = useMachine.getState();
        if (state.inputId && deviceId !== state.inputId) return;
        if (state.localOff && !localPushed.current) {
          localPushed.current = midi.setKeyboardLocal(true, state.lastInputName);
        }
        const device = state.inputs.find((d) => d.id === deviceId);
        if (state.learn) {
          state.mapNote(note, state.selected);
          toast.message(`Mapped ${state.selected.toUpperCase()} to ${note}`);
          return;
        }
        set({
          lastNote: note,
          lastInputName: device?.name ?? state.lastInputName,
          keyboardChannel: channel,
        });
        engine.hitNote(note, velocity, state.customMap);
        const resolved = state.customMap[note]
          ? { voice: state.customMap[note] }
          : resolvePriviaNote(note);
        state.flash(resolved.voice);
      },
      onNoteOff: (note, deviceId) => {
        const state = useMachine.getState();
        if (state.inputId && deviceId !== state.inputId) return;
        engine.releaseNote(note);
        if (useMachine.getState().lastNote === note) set({ lastNote: null });
      },
      onCc: (cc, value) => {
        if (cc === PRIVIA_SPEC.damperCc) {
          const down = value >= 64;
          getEngine().setSustain(down);
          set({ sustainDown: down });
        }
      },
      onStart: () => {
        if (useMachine.getState().sendDaw) return;
        const engine = getEngine();
        if (!engine.isPlaying) {
          engine.play();
          useMachine.getState().set({ playing: true });
        }
      },
      onContinue: () => {
        if (useMachine.getState().sendDaw) return;
        const engine = getEngine();
        if (!engine.isPlaying) {
          engine.play();
          useMachine.getState().set({ playing: true });
        }
      },
      onStop: () => {
        if (useMachine.getState().sendDaw) return;
        getEngine().stop();
        useMachine.getState().set({ playing: false, step: 0 });
      },
      onDevices: (inputs, outputs) => {
        const privia = findPriviaPort(inputs);
        const state = useMachine.getState();
        const selectedGone = Boolean(state.inputId && !inputs.some((d) => d.id === state.inputId));
        const nextInput = selectedGone ? null : state.inputId;
        const daw = outputs.find((d) => looksLikeDawPort(d.name));
        const outGone = Boolean(state.outputId && !outputs.some((d) => d.id === state.outputId));
        const nextOut = outGone || !state.outputId ? (daw?.id ?? state.outputId) : state.outputId;
        const keyboard = privia ?? inputs.find((d) => !looksLikeDawPort(d.name)) ?? inputs[0];
        set({
          inputs,
          outputs,
          inputId: nextInput,
          outputId: nextOut,
          lastInputName: keyboard?.name ?? null,
          usbPortName: privia?.name ?? keyboard?.name ?? null,
          midiError: MidiManager.current?.lastError ?? null,
        });
        if (keyboard && lastUsb.current !== keyboard.id) {
          lastUsb.current = keyboard.id;
          const mute = useMachine.getState().localOff;
          if (mute) midi.setKeyboardLocal(true, keyboard.name);
          toast.success(`USB · ${keyboard.name} — mute the piano on the PX-870`);
        } else if (keyboard && useMachine.getState().localOff) {
          midi.setKeyboardLocal(true, keyboard.name);
        }
      },
    });
    midiRef.current = midi;
    set({ midiSupported: midi.supported });
    void connectMidiAccess();
    engine.attachMidi(midi);
    engine.setListener({
      onStep: (step) => set({ step }),
      onHit: (voice) => useMachine.getState().flash(voice),
      onLevel: (level) => set({ level }),
      onPatternEnd: () => {
        const s = useMachine.getState();
        if (!s.chain) return;
        const next = (s.patternSlot + 1) % 4;
        s.loadBank(next);
      },
    });
    syncEngine();

    const AUDIO_KEYS: (keyof MachineState)[] = [
      "kit",
      "tempo",
      "swing",
      "master",
      "metronome",
      "params",
      "grid",
      "accents",
      "chance",
      "sendDaw",
      "scale",
      "patternLength",
      "fillHeld",
      "monitor",
    ];
    const unsub = useMachine.subscribe((s, prev) => {
      if (AUDIO_KEYS.some((k) => s[k] !== prev[k])) syncEngine();
    });

    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const t = e.target;
      if (t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement || t instanceof HTMLSelectElement) {
        return;
      }
      if (e.code === "Space") {
        e.preventDefault();
        void togglePlay();
        return;
      }
      if (e.code === "KeyR" && (e.metaKey || e.ctrlKey)) return;
      if (e.code === "KeyM" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        useMachine.setState((s) => ({ metronome: !s.metronome }));
        return;
      }
      const voice = KEY_TO_VOICE[e.code];
      if (voice) {
        e.preventDefault();
        void hit(voice, 0.94);
      }
    };
    window.addEventListener("keydown", onKey);
    const onDev = () => {
      void listAudioPorts().then((ports) => {
        const preferred = pickPreferredOutput(ports.outputs);
        const cur = useMachine.getState().audioOutId;
        const next = cur && ports.outputs.some((p) => p.id === cur) ? cur : preferred?.id ?? cur;
        useMachine.getState().set({
          audioInputs: ports.inputs,
          audioOutputs: ports.outputs,
          audioOutId: next,
        });
        if (next) void getEngine().setOutput(next);
      });
    };
    navigator.mediaDevices?.addEventListener?.("devicechange", onDev);

    const onLeave = () => {
      if (useMachine.getState().localOff) midi.setKeyboardLocal(false);
    };
    window.addEventListener("pagehide", onLeave);

    return () => {
      unsub();
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pagehide", onLeave);
      navigator.mediaDevices?.removeEventListener?.("devicechange", onDev);
      if (useMachine.getState().localOff) midi.setKeyboardLocal(false);
      midi.dispose();
      engine.stopAll();
      if (recTimer.current) window.clearInterval(recTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    midiRef.current?.setOutput(useMachine.getState().outputId);
    const unsub = useMachine.subscribe((s, prev) => {
      if (s.outputId !== prev.outputId) midiRef.current?.setOutput(s.outputId);
    });
    return unsub;
  }, []);

  async function ensureArmed() {
    const engine = getEngine();
    const ok = await engine.arm();
    void connectMidiAccess();
    const ports = await listAudioPorts();
    const state = useMachine.getState();
    const preferred = pickPreferredOutput(ports.outputs);
    const outId =
      state.audioOutId && ports.outputs.some((p) => p.id === state.audioOutId)
        ? state.audioOutId
        : preferred?.id ?? state.audioOutId;
    if (outId) await engine.setOutput(outId);
    set({
      armed: ok,
      audioInputs: ports.inputs,
      audioOutputs: ports.outputs,
      audioOutId: outId,
      audioRate: engine.sampleRate,
    });
    if (preferred) toast.success(`Audio · ${preferred.label}`);
    syncEngine();
    return ok;
  }

  async function hit(voice: VoiceId, velocity: number, tune = 0) {
    if (!useMachine.getState().armed) await ensureArmed();
    getEngine().hitVoice(voice, velocity, undefined, tune);
    useMachine.getState().flash(voice);
  }

  async function hitNote(note: number, velocity: number) {
    if (!useMachine.getState().armed) await ensureArmed();
    const state = useMachine.getState();
    if (state.learn) {
      state.mapNote(note, state.selected);
      toast.message("Key remapped");
      return;
    }
    getEngine().hitNote(note, velocity, state.customMap);
    set({ lastNote: note });
  }

  async function togglePlay() {
    if (!useMachine.getState().armed) await ensureArmed();
    const state = useMachine.getState();
    const hasHits = Object.values(state.grid).some((row) => row.some(Boolean));
    if (!hasHits) state.loadScene();
    const engine = getEngine();
    engine.togglePlay();
    set({ playing: engine.isPlaying });
  }

  function stop() {
    const engine = getEngine();
    engine.stop();
    set({ playing: false, step: 0 });
  }

  async function toggleRecord() {
    if (!useMachine.getState().armed) await ensureArmed();
    const engine = getEngine();
    if (engine.isRecording) {
      const { wav, hits } = engine.stopRecord();
      if (recTimer.current) window.clearInterval(recTimer.current);
      set({ recording: false });
      if (wav) {
        downloadBlob(wav, `audiopheliac-kit-take-${stamp()}.wav`);
        toast.success("Take saved as WAV");
      }
      if (hits.length) {
        downloadBlob(hitsToMidi(hits, useMachine.getState().tempo), `audiopheliac-kit-take-${stamp()}.mid`);
      }
      return;
    }
    engine.startRecord();
    set({ recording: true, recSeconds: 0 });
    const start = performance.now();
    recTimer.current = window.setInterval(() => {
      set({ recSeconds: (performance.now() - start) / 1000 });
    }, 100);
    toast.message("Recording — play the Privia or the pads");
  }

  if (mode === "kids") {
    return (
      <>
        <KidsPlayground
          onPlay={() => void togglePlay()}
          onStop={stop}
          onHit={(v, vel) => void hit(v, vel)}
        />
      </>
    );
  }

  return (
    <div className="min-h-dvh bg-bg text-fg">
      <Transport
        onPlay={() => void togglePlay()}
        onStop={stop}
        onRecord={() => void toggleRecord()}
        onTap={() => useMachine.getState().tapTempo()}
      />

      <div className="mx-auto max-w-6xl px-3 py-4 md:px-6 md:py-6">
        <div className="chassis rounded-xl p-3 md:p-4">
        <PianoCoach />
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="hidden lg:block">
            <VinylDeck />
          </div>
          <Lcd />
          <div className="hidden flex-wrap items-center gap-2 sm:flex">
            <DrawerButtons />
          </div>
        </div>

        <div className="mb-3 sm:hidden">
          <DrawerButtons />
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
          <Pads onHit={(v, vel, tune) => void hit(v, vel, tune)} />
          <SideCard />
        </div>

        <div className="mt-4">
          <Sequencer onPlay={() => void togglePlay()} />
        </div>
        {mode === "studio" && (
          <div className="mt-4">
            <PianoMap onNote={(n, v) => void hitNote(n, v)} />
          </div>
        )}
        </div>

        <footer className="mt-8 flex flex-col gap-2 pb-10 text-xs text-faint md:flex-row md:items-center md:justify-between">
          <p>PX-870 · 1–4 QWER ASDF ZXCV · Space plays</p>
          <p>48 kHz WAV · GM MIDI · Ableton / Audacity / Suno</p>
        </footer>
      </div>

      <StudioDrawer />
    </div>
  );
}

function Lcd() {
  const kit = useMachine((s) => s.kit);
  const tempo = useMachine((s) => s.tempo);
  const step = useMachine((s) => s.step);
  const playing = useMachine((s) => s.playing);
  const recording = useMachine((s) => s.recording);
  const level = useMachine((s) => s.level);
  const lastInputName = useMachine((s) => s.lastInputName);
  const usbPortName = useMachine((s) => s.usbPortName);
  const recSeconds = useMachine((s) => s.recSeconds);
  const armed = useMachine((s) => s.armed);
  const midiReady = useMachine((s) => s.midiReady);
  const confirmed = useMachine((s) => s.pianoConfirmed);
  const kitMeta = kitById(kit);
  const link = usbPortName ?? lastInputName;

  return (
    <div className="lcd-screen w-full rounded-md px-3 py-2.5 lg:max-w-md">
      <div className="relative z-10 flex items-start justify-between gap-3">
        <div>
          <div className="font-mono text-micro tracking-widest text-led">
            {kitMeta.tag} · {kitMeta.name.toUpperCase()}
          </div>
          <div className="mt-0.5 font-mono text-sm text-led">
            {tempo.toFixed(0)} BPM · STEP {String(step + 1).padStart(2, "0")}
          </div>
          <div className="mt-0.5 max-w-56 truncate font-mono text-micro text-led/70">
            {link
              ? confirmed
                ? `USB · ${link} · PIANO MUTED`
                : `USB · ${link} · MUTE PIANO ON THE PX-870`
              : midiReady
                ? "USB · WAITING — TAP CONNECT"
                : armed
                  ? "USB · CLICK CONNECT MIDI"
                  : "TAP A PAD OR CONNECT MIDI"}
            {recording ? ` · REC ${recSeconds.toFixed(1)}` : playing ? " · RUN" : " · STOP"}
          </div>
        </div>
        <div className="flex h-9 w-24 items-end gap-px">
          {Array.from({ length: 16 }, (_, i) => {
            const thresh = (i + 1) / 16;
            const on = level >= thresh * 0.35;
            return (
              <div
                key={i}
                className={cn("flex-1 rounded-xs", on ? "bg-led" : "bg-led-dim")}
                style={{ height: `${18 + i * 3}px` }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

function SideCard() {
  const kit = useMachine((s) => s.kit);
  const mode = useMachine((s) => s.mode);
  const kitMeta = kitById(kit);
  return (
    <aside className="hidden flex-col justify-between rounded-lg bg-raised p-4 shadow-[var(--shadow-panel)] lg:flex">
      <div>
        <div className="font-mono text-micro tracking-widest text-faint">
          {kitMeta.family === "machine" ? "MACHINE" : kitMeta.family === "kit" ? "DRUM KIT" : "STYLE"}
        </div>
        <h2 className="mt-1 text-lg font-medium leading-snug">{kitMeta.name}</h2>
        <p className="mt-2 text-sm text-muted">{kitMeta.description}</p>
        <div className="mt-4">
          <SceneButton />
        </div>
      </div>
      <div className="mt-6 space-y-2 text-sm text-muted">
        <p>
          {mode === "easy"
            ? "Easy mode. Load a groove, tap pads, export a stem. USB the Privia when you want the keys."
            : "USB-B on the Privia. CASIO USB-MIDI, 88 keys, A0–C8. C2 is kick; keys below are 808s."}
        </p>
        {mode === "studio" && (
          <p>88 keys, A0–C8, velocity and damper, class-compliant — no driver.</p>
        )}
      </div>
    </aside>
  );
}

function syncEngine() {
  const s = useMachine.getState();
  const snap: EngineSnapshot = {
    kit: s.kit,
    tempo: s.tempo,
    swing: s.swing,
    master: s.master,
    metronome: s.metronome,
    params: s.params,
    grid: s.grid,
    accents: s.accents,
    chance: s.chance,
    sendDaw: s.sendDaw,
    scale: s.scale,
    patternLength: s.patternLength,
    fillHeld: s.fillHeld,
    monitor: s.monitor,
  };
  getEngine().sync(snap);
}
