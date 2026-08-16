import { Circle, Disc3, Pause, Play, Square } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { BRAND } from "@/lib/brand";
import type { ExperienceMode } from "@/lib/audio/types";
import { MidiManager } from "@/lib/midi";
import { findPriviaPort, formatPriviaLink } from "@/lib/privia";
import { useMachine } from "@/lib/store";
import { cn } from "@/lib/utils";
import { KitPicker, KitRail } from "./KitPicker";
import { VinylMark } from "./Mark";

const MODES: { id: ExperienceMode; label: string }[] = [
  { id: "kids", label: "Kids" },
  { id: "easy", label: "Easy" },
  { id: "studio", label: "Studio" },
];

export function Transport({
  onPlay,
  onStop,
  onRecord,
  onTap,
}: {
  onPlay: () => void;
  onStop: () => void;
  onRecord: () => void;
  onTap: () => void;
}) {
  const playing = useMachine((s) => s.playing);
  const recording = useMachine((s) => s.recording);
  const tempo = useMachine((s) => s.tempo);
  const lastInputName = useMachine((s) => s.lastInputName);
  const inputs = useMachine((s) => s.inputs);
  const usbPortName = useMachine((s) => s.usbPortName);
  const midiReady = useMachine((s) => s.midiReady);
  const midiSupported = useMachine((s) => s.midiSupported);
  const mode = useMachine((s) => s.mode);
  const noteRepeat = useMachine((s) => s.noteRepeat);
  const sixteenLevels = useMachine((s) => s.sixteenLevels);
  const fillHeld = useMachine((s) => s.fillHeld);
  const set = useMachine((s) => s.set);
  const setMode = useMachine((s) => s.setMode);

  const privia = findPriviaPort(inputs);
  const linked = Boolean(privia || usbPortName || lastInputName);
  const midiLabel = linked
    ? formatPriviaLink(privia?.name ?? usbPortName ?? lastInputName)
    : midiReady
      ? "USB · no piano yet"
      : "Connect MIDI";

  async function connectMidi() {
    const midi = MidiManager.current;
    if (!midi) {
      toast.error("MIDI is not ready.");
      return;
    }
    const ok = await midi.init();
    set({ midiReady: ok, midiSupported: midi.supported, midiError: midi.lastError });
    if (ok && midi.lastError) toast.message(midi.lastError);
    else if (ok) toast.success("MIDI open — play a key.");
    else toast.error(midi.lastError ?? "MIDI blocked.");
  }

  return (
    <header className="flex flex-col gap-3 border-b border-border px-4 py-3 md:px-6">
      <div className="flex flex-col gap-2.5 md:flex-row md:items-center md:gap-5">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5">
            <span className="relative inline-flex size-8 items-center justify-center">
              <span className="spectrum-ring absolute inset-0 rounded-full opacity-90" />
              <span className="absolute inset-px rounded-full bg-bg" />
              <VinylMark className="relative size-7" />
            </span>
            <div className="flex flex-col">
              <span className="font-display text-lg leading-none tracking-wide">{BRAND.name}</span>
              <span className="font-mono text-micro tracking-widest text-faint">
                {BRAND.product.toUpperCase()} · PX-870
              </span>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-1.5 md:hidden">
            <button
              type="button"
              onClick={onTap}
              className="flex h-10 min-w-11 flex-col items-end justify-center pr-1"
              title="Tap tempo"
            >
              <span className="font-mono text-sm leading-none tabular-nums">{tempo.toFixed(0)}</span>
              <span className="font-mono text-micro tracking-widest text-faint">BPM</span>
            </button>
            <Button
              variant={playing ? "play" : "default"}
              onClick={onPlay}
              aria-label={playing ? "Pause" : "Play beat"}
              className="min-w-[6.75rem]"
            >
              {playing ? <Pause /> : <Play className="ml-0.5" />}
              {playing ? "Pause" : "Play beat"}
            </Button>
            <Button variant="panel" size="icon" onClick={onStop} aria-label="Stop">
              <Square className="size-3.5 fill-current" />
            </Button>
            <Button
              variant={recording ? "rec" : "panel"}
              size="icon"
              onClick={onRecord}
              aria-label={recording ? "Stop recording" : "Record"}
            >
              {recording ? <Disc3 /> : <Circle className="size-3.5 fill-current" />}
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex h-10 rounded-sm bg-raised p-0.5">
            {MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setMode(m.id)}
                className={cn(
                  "min-w-14 rounded-xs px-3 text-sm",
                  mode === m.id ? "bg-accent text-accent-fg" : "text-muted hover:text-fg",
                )}
              >
                {m.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 md:hidden">
            <KitPicker />
          </div>
        </div>

        <div className="hidden items-center gap-2 md:flex">
          <span className={cn("size-1.5 rounded-full", linked ? "bg-led" : "bg-faint")} />
          <button
            type="button"
            onClick={() => (linked ? set({ drawer: "io" }) : void connectMidi())}
            className="max-w-56 truncate font-mono text-xs text-muted hover:text-fg"
          >
            {midiLabel}
          </button>
          {(!linked || !midiReady) && midiSupported !== false && (
            <button
              type="button"
              onClick={() => void connectMidi()}
              className="h-8 rounded-sm bg-raised px-2.5 font-mono text-micro tracking-widest text-muted hover:text-fg"
            >
              CONNECT
            </button>
          )}
        </div>

        <div className="ml-auto hidden items-center gap-3 md:flex">
          {mode === "studio" && (
            <div className="hidden items-center gap-1 lg:flex">
              <button
                type="button"
                onClick={() => set({ noteRepeat: !noteRepeat })}
                className={cn(
                  "h-8 rounded-sm px-2 font-mono text-micro tracking-widest",
                  noteRepeat ? "bg-accent text-accent-fg" : "bg-raised text-muted",
                )}
              >
                REPEAT
              </button>
              <button
                type="button"
                onClick={() => set({ sixteenLevels: !sixteenLevels })}
                className={cn(
                  "h-8 rounded-sm px-2 font-mono text-micro tracking-widest",
                  sixteenLevels ? "bg-accent text-accent-fg" : "bg-raised text-muted",
                )}
              >
                16 LVL
              </button>
              <button
                type="button"
                onPointerDown={() => set({ fillHeld: true })}
                onPointerUp={() => set({ fillHeld: false })}
                onPointerLeave={() => fillHeld && set({ fillHeld: false })}
                className={cn(
                  "h-8 rounded-sm px-2 font-mono text-micro tracking-widest",
                  fillHeld ? "bg-step text-accent-fg" : "bg-raised text-muted",
                )}
              >
                FILL
              </button>
            </div>
          )}
          <button
            type="button"
            onClick={onTap}
            className="hidden min-w-16 flex-col items-end md:flex"
            title="Tap tempo"
          >
            <span className="font-mono text-lg leading-none tabular-nums">{tempo.toFixed(0)}</span>
            <span className="font-mono text-micro tracking-widest text-faint">BPM</span>
          </button>
          <Slider
            className="hidden w-28 md:flex"
            min={40}
            max={200}
            step={1}
            value={[tempo]}
            onValueChange={([v]) => set({ tempo: v ?? tempo })}
            aria-label="Tempo"
          />

          <div className="flex items-center gap-1.5">
            <Button
              variant={playing ? "play" : "default"}
              className="min-w-[7.5rem]"
              onClick={onPlay}
              aria-label={playing ? "Pause" : "Play beat"}
            >
              {playing ? <Pause /> : <Play className="ml-0.5" />}
              {playing ? "Pause" : "Play beat"}
            </Button>
            <Button variant="panel" size="icon" onClick={onStop} aria-label="Stop">
              <Square className="size-3.5 fill-current" />
            </Button>
            <Button
              variant={recording ? "rec" : "panel"}
              size="icon"
              onClick={onRecord}
              aria-label={recording ? "Stop recording" : "Record"}
            >
              {recording ? <Disc3 /> : <Circle className="size-3.5 fill-current" />}
            </Button>
          </div>
        </div>
      </div>

      {mode !== "kids" && (
        <div className="hidden md:flex">
          <KitRail />
        </div>
      )}
    </header>
  );
}
