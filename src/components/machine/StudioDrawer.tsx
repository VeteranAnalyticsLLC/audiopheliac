import { useState, type ReactNode } from "react";
import { Cable, Download, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { VOICES } from "@/lib/audio/types";
import { getEngine } from "@/lib/audio/engine";
import {
  formatInterface,
  listAudioPorts,
  loopbackHint,
  pickPreferredOutput,
  unlockAudioLabels,
  MONITORS,
} from "@/lib/audio/io";
import {
  buildAbletonSession,
  buildAudacityProject,
  downloadSession,
  looksLikeDawPort,
  sendToSuno,
  sunoPrompt,
} from "@/lib/audio/handoff";
import { looksLikePrivia, MidiManager } from "@/lib/midi";
import { findPriviaPort, PRIVIA_SPEC } from "@/lib/privia";
import { useMachine, type DrawerTab } from "@/lib/store";
import { cn } from "@/lib/utils";

const TABS: { id: DrawerTab; label: string; icon: typeof Cable }[] = [
  { id: "io", label: "I/O", icon: Cable },
  { id: "mix", label: "Mix", icon: SlidersHorizontal },
  { id: "export", label: "Send", icon: Download },
];

export function StudioDrawer() {
  const drawer = useMachine((s) => s.drawer);
  const set = useMachine((s) => s.set);

  return (
    <Sheet open={drawer !== null} onOpenChange={(open) => !open && set({ drawer: null })}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Studio</SheetTitle>
          <SheetDescription>Privia, Scarlett or MOTU, then send to Live, Audacity, or Suno.</SheetDescription>
        </SheetHeader>
        <div className="mb-4 flex gap-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => set({ drawer: t.id })}
              className={cn(
                "flex h-10 flex-1 items-center justify-center gap-1 rounded-sm text-xs",
                drawer === t.id ? "bg-accent text-accent-fg" : "bg-raised text-muted hover:text-fg",
              )}
            >
              <t.icon className="size-3.5" />
              {t.label}
            </button>
          ))}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          {drawer === "io" && (
            <>
              <MidiPane />
              <div className="my-5 h-px bg-border" />
              <AudioPane />
            </>
          )}
          {drawer === "mix" && <MixPane />}
          {drawer === "export" && <ExportPane />}
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function DrawerButtons() {
  const set = useMachine((s) => s.set);
  return (
    <div className="flex flex-wrap gap-1">
      {TABS.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => set({ drawer: t.id })}
          className="h-9 rounded-sm bg-raised px-2.5 font-mono text-micro tracking-widest text-muted hover:text-fg"
        >
          {t.label.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

function MidiPane() {
  const inputs = useMachine((s) => s.inputs);
  const outputs = useMachine((s) => s.outputs);
  const inputId = useMachine((s) => s.inputId);
  const outputId = useMachine((s) => s.outputId);
  const sendDaw = useMachine((s) => s.sendDaw);
  const midiSupported = useMachine((s) => s.midiSupported);
  const midiReady = useMachine((s) => s.midiReady);
  const customMap = useMachine((s) => s.customMap);
  const usbPortName = useMachine((s) => s.usbPortName);
  const lastInputName = useMachine((s) => s.lastInputName);
  const sustainDown = useMachine((s) => s.sustainDown);
  const keyboardChannel = useMachine((s) => s.keyboardChannel);
  const pianoConfirmed = useMachine((s) => s.pianoConfirmed);
  const set = useMachine((s) => s.set);
  const clearMap = useMachine((s) => s.clearMap);
  const privia = findPriviaPort(inputs);

  return (
    <div className="space-y-5">
      <div className="rounded-md bg-inset px-3 py-3">
        <div className="font-mono text-micro tracking-widest text-faint">USB TO HOST</div>
        <p className="mt-1 text-sm">
          {privia
            ? `${privia.name} · 88-key ${PRIVIA_SPEC.lowestName}–${PRIVIA_SPEC.highestName} · ch ${keyboardChannel ?? PRIVIA_SPEC.keyboardChannel}`
            : "Plug the Privia USB-B jack into the computer. It appears as CASIO USB-MIDI. No driver."}
        </p>
        <p className="mt-1 text-xs text-muted">
          Class-compliant USB-MIDI. Velocity 1–127. Damper CC{PRIVIA_SPEC.damperCc}
          {sustainDown ? " · pedal down" : ""}.
        </p>
      </div>

      <div className="rounded-md bg-inset px-3 py-3">
        <div className="font-mono text-micro tracking-widest text-faint">MUTE THE CONCERT GRAND</div>
        <p className="mt-1 text-sm">
          The PX-870 ignores Local Off over USB. Keys trigger the kit here and the piano in the
          Casio at the same time until you mute it on the instrument.
        </p>
        <ol className="mt-3 list-decimal space-y-1.5 pl-4 text-sm">
          <li>
            Slide <span className="text-fg">VOLUME to 0</span> on the Privia. Fastest. MIDI still
            plays drums.
          </li>
          <li>
            Or hold <span className="text-fg">{PRIVIA_SPEC.localControl.hold}</span> and tap the
            lowest C (3rd white key). Long beep = Local Control off.
          </li>
        </ol>
        <Button
          className="mt-3"
          variant={pianoConfirmed ? "outline" : "default"}
          onClick={() => {
            set({ pianoConfirmed: true, localOff: true });
            MidiManager.current?.setKeyboardLocal(true, usbPortName ?? lastInputName);
            toast.success("Got it — only the kit should sound");
          }}
        >
          {pianoConfirmed ? "Marked muted" : "Piano is muted"}
        </Button>
      </div>

      {!midiSupported && (
        <p className="rounded-md bg-inset px-3 py-2 text-sm text-muted">
          This browser has no Web MIDI. Use Chrome or Edge for the USB link. Pads still play.
        </p>
      )}
      {midiSupported && !midiReady && (
        <p className="rounded-md bg-inset px-3 py-2 text-sm text-muted">
          MIDI permission was denied. Allow MIDI, then reconnect the USB cable.
        </p>
      )}

      <Field label="CASIO USB-MIDI in">
        <NativeSelect
          value={inputId ?? ""}
          onChange={(v) => set({ inputId: v || null })}
          options={[
            { value: "", label: usbPortName ? `Auto · ${usbPortName}` : "Waiting for USB" },
            ...inputs.map((d) => ({
              value: d.id,
              label: looksLikePrivia(d.name, d.manufacturer) ? `${d.name} · USB` : d.name,
            })),
          ]}
        />
      </Field>

      <Field label="MIDI out to Live">
        <NativeSelect
          value={outputId ?? ""}
          onChange={(v) => set({ outputId: v || null })}
          options={[
            { value: "", label: "None" },
            ...outputs.map((d) => ({
              value: d.id,
              label: looksLikeDawPort(d.name) ? `${d.name} · Live` : d.name,
            })),
          ]}
        />
        <label className="mt-3 flex items-center justify-between gap-3">
          <span className="text-sm">Send GM drums + clock</span>
          <Switch checked={sendDaw} onCheckedChange={(v) => set({ sendDaw: v })} />
        </label>
      </Field>

      <Field label="Custom map">
        <p className="text-sm text-muted">
          {Object.keys(customMap).length === 0
            ? "Stock GM drum map."
            : `${Object.keys(customMap).length} remapped keys.`}
        </p>
        <Button variant="outline" size="sm" className="mt-2" onClick={clearMap}>
          Reset mapping
        </Button>
      </Field>
    </div>
  );
}

function AudioPane() {
  const outputs = useMachine((s) => s.audioOutputs);
  const audioOutId = useMachine((s) => s.audioOutId);
  const audioRate = useMachine((s) => s.audioRate);
  const set = useMachine((s) => s.set);
  const selected = outputs.find((p) => p.id === audioOutId) ?? pickPreferredOutput(outputs);

  async function refresh() {
    await unlockAudioLabels();
    const ports = await listAudioPorts();
    const preferred = pickPreferredOutput(ports.outputs);
    const nextOut =
      audioOutId && ports.outputs.some((p) => p.id === audioOutId) ? audioOutId : preferred?.id ?? null;
    set({ audioInputs: ports.inputs, audioOutputs: ports.outputs, audioOutId: nextOut });
    if (nextOut) await getEngine().setOutput(nextOut);
  }

  return (
    <div className="space-y-5">
      <Field label="Monitors / interface">
        <NativeSelect
          value={audioOutId ?? ""}
          onChange={(v) => {
            set({ audioOutId: v || null });
            void getEngine().setOutput(v || null);
          }}
          options={[
            { value: "", label: "System default" },
            ...outputs.map((p) => ({ value: p.id, label: formatInterface(p) })),
          ]}
        />
        <Button variant="outline" size="sm" className="mt-2" onClick={() => void refresh()}>
          Scan interfaces
        </Button>
      </Field>
      <p className="text-xs text-muted">
        {audioRate ? `${Math.round(audioRate / 100) / 10} kHz` : "—"}
        {selected ? ` · ${formatInterface(selected)}` : ""}
      </p>
      {selected && <p className="text-xs text-muted">{loopbackHint(selected.family)}</p>}
    </div>
  );
}

function MixPane() {
  const master = useMachine((s) => s.master);
  const tempo = useMachine((s) => s.tempo);
  const swing = useMachine((s) => s.swing);
  const metronome = useMachine((s) => s.metronome);
  const monitor = useMachine((s) => s.monitor);
  const params = useMachine((s) => s.params);
  const set = useMachine((s) => s.set);
  const setParam = useMachine((s) => s.setParam);

  return (
    <div className="space-y-5">
      <Field label={`Master ${Math.round(master * 100)}`}>
        <Slider min={0} max={1} step={0.01} value={[master]} onValueChange={([v]) => set({ master: v ?? master })} />
      </Field>
      <Field label={`Tempo ${Math.round(tempo)} BPM`}>
        <Slider min={40} max={200} step={1} value={[tempo]} onValueChange={([v]) => set({ tempo: v ?? tempo })} />
      </Field>
      <Field label={`Swing ${Math.round(swing * 100)}`}>
        <Slider min={0} max={0.4} step={0.01} value={[swing]} onValueChange={([v]) => set({ swing: v ?? swing })} />
      </Field>
      <Field label="Color">
        <div className="grid grid-cols-2 gap-1">
          {MONITORS.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => set({ monitor: m.id })}
              className={cn(
                "rounded-sm px-2 py-2 text-left",
                monitor === m.id ? "bg-accent text-accent-fg" : "bg-raised text-muted hover:text-fg",
              )}
            >
              <div className="text-sm">{m.name}</div>
              <div className={cn("text-2xs", monitor === m.id ? "text-accent-fg/80" : "text-faint")}>{m.blurb}</div>
            </button>
          ))}
        </div>
      </Field>
      <label className="flex items-center justify-between gap-3">
        <span className="text-sm">Metronome</span>
        <Switch checked={metronome} onCheckedChange={(v) => set({ metronome: v })} />
      </label>
      <div className="grid grid-cols-4 gap-1">
        {VOICES.map((v) => (
          <button
            key={v.id}
            type="button"
            onClick={() => setParam(v.id, { mute: !params[v.id].mute })}
            className={cn(
              "h-8 rounded-sm font-mono text-micro",
              params[v.id].mute ? "bg-rec/40 text-fg" : "bg-raised text-muted hover:text-fg",
            )}
          >
            {v.short}
          </button>
        ))}
      </div>
    </div>
  );
}

function ExportPane() {
  const bounceBars = useMachine((s) => s.bounceBars);
  const tempo = useMachine((s) => s.tempo);
  const kit = useMachine((s) => s.kit);
  const recording = useMachine((s) => s.recording);
  const recSeconds = useMachine((s) => s.recSeconds);
  const sendDaw = useMachine((s) => s.sendDaw);
  const outputId = useMachine((s) => s.outputId);
  const outputs = useMachine((s) => s.outputs);
  const set = useMachine((s) => s.set);
  const [busy, setBusy] = useState<string | null>(null);

  const dawOut = outputs.find((d) => d.id === outputId);
  const liveReady = Boolean(outputId && sendDaw);

  async function armOrFail() {
    const engine = getEngine();
    if (!engine.audioReady) {
      toast.error("Tap a pad first.");
      return null;
    }
    return engine;
  }

  async function sessionFiles() {
    const engine = await armOrFail();
    if (!engine) return;
    setBusy("ableton");
    try {
      const mix = await engine.bouncePattern(bounceBars);
      const stems = await engine.bounceStems(bounceBars);
      const hits = engine.patternHits(bounceBars);
      if (!mix || hits.length === 0) {
        toast.error("Empty pattern.");
        return;
      }
      const zip = await buildAbletonSession({ mix, stems, hits, tempo, kit, bars: bounceBars });
      downloadSession(zip, "ableton");
      toast.success("Ableton session ready — drop the MIDI on a track.");
    } finally {
      setBusy(null);
    }
  }

  async function audacityFiles() {
    const engine = await armOrFail();
    if (!engine) return;
    setBusy("audacity");
    try {
      const mix = await engine.bouncePattern(bounceBars);
      const stems = await engine.bounceStems(bounceBars);
      const hits = engine.patternHits(bounceBars);
      if (!mix) {
        toast.error("Empty pattern.");
        return;
      }
      const zip = await buildAudacityProject({ mix, stems, hits, tempo, bars: bounceBars });
      downloadSession(zip, "audacity");
      toast.success("Audacity project — open Mix.wav, import Labels.txt.");
    } finally {
      setBusy(null);
    }
  }

  async function sunoSend() {
    const engine = await armOrFail();
    if (!engine) return;
    setBusy("suno");
    try {
      const mix = await engine.bouncePattern(bounceBars);
      if (!mix) {
        toast.error("Empty pattern.");
        return;
      }
      await sendToSuno({ wav: mix, prompt: sunoPrompt(kit, tempo) });
      toast.success("WAV saved. Prompt copied. Drop the file on Suno Studio.");
    } finally {
      setBusy(null);
    }
  }

  function playIntoAbleton() {
    const daw = outputs.find((d) => looksLikeDawPort(d.name)) ?? outputs[0];
    if (!daw) {
      toast.error("No MIDI out. Enable IAC Driver (Mac) or loopMIDI (Windows).");
      return;
    }
    set({ outputId: daw.id, sendDaw: true, drawer: null });
    toast.success(`Live · ${daw.name} · GM ch 10 + clock`);
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted">
        One click per desk. Live MIDI into Ableton. A project folder for Audacity. A WAV + prompt for
        Suno Studio.
      </p>

      <Field label="Length">
        <div className="flex gap-1">
          {([1, 2, 4, 8] as const).map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => set({ bounceBars: n })}
              className={cn(
                "h-9 flex-1 rounded-sm font-mono text-xs",
                bounceBars === n ? "bg-accent text-accent-fg" : "bg-raised text-muted hover:text-fg",
              )}
            >
              {n} bar
            </button>
          ))}
        </div>
      </Field>

      <Dest
        name="Ableton Live"
        detail={
          liveReady
            ? `Playing into ${dawOut?.name ?? "MIDI out"} · GM 10 + clock`
            : "IAC / loopMIDI for live drums. Session files drop on a track."
        }
      >
        <Button onClick={playIntoAbleton} disabled={!!busy}>
          Play into Live
        </Button>
        <Button variant="outline" onClick={() => void sessionFiles()} disabled={!!busy}>
          {busy === "ableton" ? "Rendering…" : "Session files"}
        </Button>
      </Dest>

      <Dest name="Audacity" detail="48 kHz mix, stems, and a label track for every hit.">
        <Button variant="outline" onClick={() => void audacityFiles()} disabled={!!busy}>
          {busy === "audacity" ? "Rendering…" : "Audacity project"}
        </Button>
      </Dest>

      <Dest name="Suno Studio" detail="Groove as a drum reference. Prompt is copied.">
        <Button variant="outline" onClick={() => void sunoSend()} disabled={!!busy}>
          {busy === "suno" ? "Rendering…" : "Send to Studio"}
        </Button>
      </Dest>

      <p className="font-mono text-xs tabular-nums text-muted">
        {recording ? `REC ${recSeconds.toFixed(1)}s` : "Not recording"}
      </p>
    </div>
  );
}

function Dest({ name, detail, children }: { name: string; detail: string; children: ReactNode }) {
  return (
    <div className="rounded-md bg-inset px-3 py-3">
      <div className="font-medium">{name}</div>
      <p className="mt-1 text-xs text-muted">{detail}</p>
      <div className="mt-3 flex flex-col gap-2">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 font-mono text-micro tracking-widest text-faint">{label.toUpperCase()}</div>
      {children}
    </div>
  );
}

function NativeSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-10 w-full rounded-sm border border-border bg-inset px-2 text-sm"
    >
      {options.map((o) => (
        <option key={o.value || "empty"} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
