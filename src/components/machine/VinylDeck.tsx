import { BRAND } from "@/lib/brand";
import { useMachine } from "@/lib/store";
import { VinylMark } from "./Mark";
import { cn } from "@/lib/utils";

export function VinylDeck() {
  const playing = useMachine((s) => s.playing);
  const tempo = useMachine((s) => s.tempo);
  const kit = useMachine((s) => s.kit);
  const level = useMachine((s) => s.level);
  const step = useMachine((s) => s.step);
  const seconds = Math.max(1.6, 240 / Math.max(40, tempo));

  return (
    <div className="flex items-center gap-4">
      <div className="relative size-28 shrink-0 sm:size-32">
        <div
          className={cn("vinyl-platter absolute inset-0", playing && "vinyl-spin")}
          style={{ animationDuration: `${seconds}s` }}
        >
          <div className="spectrum-ring absolute inset-0 rounded-full opacity-80" />
          <div className="absolute inset-1 rounded-full bg-bg" />
          <div className="absolute inset-2 overflow-hidden rounded-full">
            <VinylMark className="size-full" />
          </div>
          <div
            className="absolute inset-[38%] rounded-full bg-bg shadow-[var(--shadow-panel)]"
            style={{ transform: `scale(${1 + level * 0.08})` }}
          />
        </div>
        <div
          className={cn(
            "pointer-events-none absolute -right-1 top-2 h-16 w-1 origin-top rounded-full bg-fg/80",
            playing && "vinyl-needle",
          )}
        />
        <div className="absolute -right-2 top-1 size-2 rounded-full bg-accent" />
      </div>
      <div className="min-w-0">
        <p className="font-display text-xl tracking-wide">{BRAND.name}</p>
        <p className="mt-0.5 font-mono text-xs tabular-nums text-muted">
          {kit.toUpperCase()} · {tempo} BPM · {playing ? `STEP ${String(step + 1).padStart(2, "0")}` : "CUE"}
        </p>
        <p className="mt-1 hidden text-2xs text-faint sm:block">{BRAND.tagline}</p>
      </div>
    </div>
  );
}
