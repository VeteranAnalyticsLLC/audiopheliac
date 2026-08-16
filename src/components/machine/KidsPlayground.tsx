import { useEffect, useState } from "react";
import { Dice5, Pause, Play, Square, Turtle, Rabbit } from "lucide-react";
import { KIDS_PADS, KIDS_ROWS, type VoiceId } from "@/lib/audio/types";
import { WORLDS } from "@/lib/perform";
import { useMachine } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { BRAND } from "@/lib/brand";
import { cn } from "@/lib/utils";
import { VinylMark } from "./Mark";
import { PianoCoach } from "./PianoCoach";

export function KidsPlayground({
  onPlay,
  onStop,
  onHit,
}: {
  onPlay: () => void;
  onStop: () => void;
  onHit: (voice: VoiceId, vel: number) => void;
}) {
  const playing = useMachine((s) => s.playing);
  const world = useMachine((s) => s.kidsWorld);
  const grid = useMachine((s) => s.grid);
  const step = useMachine((s) => s.step);
  const hits = useMachine((s) => s.hits);
  const tempo = useMachine((s) => s.tempo);
  const setMode = useMachine((s) => s.setMode);
  const setKidsWorld = useMachine((s) => s.setKidsWorld);
  const toggleStep = useMachine((s) => s.toggleStep);
  const surpriseBeat = useMachine((s) => s.surpriseBeat);
  const mutatePattern = useMachine((s) => s.mutatePattern);
  const clearPattern = useMachine((s) => s.clearPattern);
  const [now, setNow] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setNow(performance.now()), 50);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="min-h-dvh bg-bg text-fg">
      <header className="flex items-center justify-between gap-3 px-4 py-4 md:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <VinylMark className="size-9 shrink-0" />
          <div className="min-w-0">
            <p className="font-mono text-micro tracking-widest text-faint">{BRAND.name.toUpperCase()}</p>
            <h1 className="text-xl font-medium tracking-tight sm:text-2xl">Make a beat</h1>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setMode("easy")}
          className="h-10 rounded-md bg-raised px-3 text-sm text-muted hover:text-fg"
        >
          Grown-up mode
        </button>
      </header>

      <main className="mx-auto max-w-3xl px-4 pb-16 md:px-8">
        <p className="mb-4 text-sm text-muted">
          Pick a world. Tap the big pads. Paint squares to write a beat. Hit play.
        </p>
        <PianoCoach />

        <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {WORLDS.map((w) => (
            <button
              key={w.id}
              type="button"
              onClick={() => setKidsWorld(w.id)}
              className={cn(
                "rounded-lg px-3 py-3 text-left",
                world === w.id ? "bg-accent text-accent-fg" : "bg-raised hover:bg-line",
              )}
            >
              <div className="text-base font-medium">{w.name}</div>
              <div className={cn("mt-0.5 text-xs", world === w.id ? "text-accent-fg/80" : "text-muted")}>
                {w.blurb}
              </div>
            </button>
          ))}
        </div>

        <div className="mb-5 flex flex-wrap items-center gap-2">
          <Button
            size="lg"
            variant={playing ? "play" : "default"}
            className="min-w-36"
            onClick={onPlay}
          >
            {playing ? <Pause className="mr-2 size-5" /> : <Play className="mr-2 size-5" />}
            {playing ? "Pause" : "Play beat"}
          </Button>
          <Button variant="panel" size="lg" onClick={onStop} aria-label="Stop">
            <Square className="size-4 fill-current" />
          </Button>
          <div className="ml-auto flex items-center gap-1">
            <SpeedChip icon={Turtle} label="Slow" bpm={80} active={tempo <= 92} />
            <SpeedChip icon={Rabbit} label="Fast" bpm={128} active={tempo >= 116} />
            <SpeedChip label="Medium" bpm={104} active={tempo > 92 && tempo < 116} />
          </div>
        </div>

        <div className="mb-6 grid grid-cols-4 gap-2 sm:gap-3">
          {KIDS_PADS.map((p) => {
            const lit = now - (hits[p.voice] ?? 0) < 160;
            return (
              <button
                key={p.voice}
                type="button"
                onPointerDown={(e) => {
                  e.preventDefault();
                  onHit(p.voice, 0.95);
                }}
                className={cn(
                  "flex aspect-square flex-col justify-between rounded-lg bg-raised p-3 text-left shadow-[var(--shadow-panel)]",
                  lit && "bg-pad-lit text-accent-fg",
                )}
              >
                <span className="text-xs text-muted">{p.hint}</span>
                <span className="text-lg font-medium">{p.name}</span>
              </button>
            );
          })}
        </div>

        <section className="rounded-xl bg-surface p-4 shadow-[var(--shadow-panel)]">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-medium">Paint the beat</h2>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={mutatePattern}
                className="inline-flex h-10 items-center gap-1.5 rounded-md bg-raised px-3 text-sm"
              >
                <Dice5 className="size-4" />
                Mix it
              </button>
              <button
                type="button"
                onClick={surpriseBeat}
                className="h-10 rounded-md bg-raised px-3 text-sm"
              >
                Surprise me
              </button>
              <button
                type="button"
                onClick={clearPattern}
                className="h-10 rounded-md px-3 text-sm text-muted"
              >
                Clear
              </button>
            </div>
          </div>
          <div className="space-y-2">
            {KIDS_ROWS.map((row) => (
              <div key={row.voice} className="grid grid-cols-[56px_repeat(8,minmax(0,1fr))] gap-1.5">
                <div className="flex items-center text-sm text-muted">{row.name}</div>
                {Array.from({ length: 8 }, (_, i) => {
                  const on = grid[row.voice][i];
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => toggleStep(row.voice, i)}
                      aria-label={`${row.name} beat ${i + 1}`}
                      className={cn(
                        "h-12 rounded-md sm:h-14",
                        on ? "bg-accent" : "bg-inset",
                        playing && step === i && "shadow-[0_0_0_2px_var(--color-step)]",
                      )}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

function SpeedChip({
  icon: Icon,
  label,
  bpm,
  active,
}: {
  icon?: typeof Turtle;
  label: string;
  bpm: number;
  active: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => useMachine.getState().set({ tempo: bpm })}
      className={cn(
        "inline-flex h-10 items-center gap-1.5 rounded-md px-3 text-sm",
        active ? "bg-accent text-accent-fg" : "bg-raised text-muted",
      )}
    >
      {Icon ? <Icon className="size-4" /> : null}
      {label}
    </button>
  );
}
