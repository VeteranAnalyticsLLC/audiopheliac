import { Pause, Play } from "lucide-react";
import { EASY_VOICES, VOICES, type PatternLength, type SeqScale, type VoiceId } from "@/lib/audio/types";
import { FACTORY } from "@/lib/patterns";
import { STEPS, useMachine } from "@/lib/store";
import { cn } from "@/lib/utils";

export function Sequencer({
  compact = false,
  onPlay,
}: {
  compact?: boolean;
  onPlay?: () => void;
}) {
  const grid = useMachine((s) => s.grid);
  const accents = useMachine((s) => s.accents);
  const step = useMachine((s) => s.step);
  const playing = useMachine((s) => s.playing);
  const patternSlot = useMachine((s) => s.patternSlot);
  const patternLength = useMachine((s) => s.patternLength);
  const scale = useMachine((s) => s.scale);
  const chain = useMachine((s) => s.chain);
  const fillHeld = useMachine((s) => s.fillHeld);
  const chance = useMachine((s) => s.chance);
  const selected = useMachine((s) => s.selected);
  const mode = useMachine((s) => s.mode);
  const toggleStep = useMachine((s) => s.toggleStep);
  const loadFactory = useMachine((s) => s.loadFactory);
  const clearPattern = useMachine((s) => s.clearPattern);
  const loadBank = useMachine((s) => s.loadBank);
  const saveBank = useMachine((s) => s.saveBank);
  const copyBank = useMachine((s) => s.copyBank);
  const mutatePattern = useMachine((s) => s.mutatePattern);
  const surpriseBeat = useMachine((s) => s.surpriseBeat);
  const set = useMachine((s) => s.set);

  const voices = compact || mode === "easy" ? VOICES.filter((v) => EASY_VOICES.includes(v.id)) : VOICES;
  const cols = patternLength;

  return (
    <section className="rounded-lg bg-raised p-3 shadow-[var(--shadow-panel)] md:p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="mr-1 font-mono text-micro tracking-widest text-faint">SEQ</span>
        {onPlay && (
          <button
            type="button"
            onClick={onPlay}
            className={cn(
              "inline-flex h-9 items-center gap-1.5 rounded-sm px-3 text-sm",
              playing ? "bg-accent text-accent-fg" : "bg-accent text-accent-fg",
            )}
          >
            {playing ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
            {playing ? "Pause" : "Play beat"}
          </button>
        )}
        {[0, 1, 2, 3].map((i) => (
          <button
            key={i}
            type="button"
            onClick={() => loadBank(i)}
            className={cn(
              "size-9 rounded-sm font-mono text-xs",
              patternSlot === i ? "bg-accent text-accent-fg" : "bg-inset text-muted hover:text-fg",
            )}
          >
            {String.fromCharCode(65 + i)}
          </button>
        ))}
        <button
          type="button"
          onClick={saveBank}
          className="h-8 rounded-sm bg-inset px-2 font-mono text-micro tracking-widest text-muted hover:text-fg"
        >
          SAVE
        </button>
        {mode === "studio" && (
          <>
            <button
              type="button"
              onClick={copyBank}
              className="h-8 rounded-sm bg-inset px-2 font-mono text-micro tracking-widest text-muted hover:text-fg"
            >
              COPY
            </button>
            <button
              type="button"
              onClick={() => set({ chain: !chain })}
              className={cn(
                "h-8 rounded-sm px-2 font-mono text-micro tracking-widest",
                chain ? "bg-accent text-accent-fg" : "bg-inset text-muted hover:text-fg",
              )}
            >
              CHAIN
            </button>
            <button
              type="button"
              onPointerDown={() => set({ fillHeld: true })}
              onPointerUp={() => set({ fillHeld: false })}
              onPointerLeave={() => fillHeld && set({ fillHeld: false })}
              className={cn(
                "h-8 rounded-sm px-2 font-mono text-micro tracking-widest",
                fillHeld ? "bg-step text-accent-fg" : "bg-inset text-muted hover:text-fg",
              )}
            >
              FILL
            </button>
            <div className="mx-1 hidden h-5 w-px bg-border sm:block" />
            {(["16th", "8th", "triplet"] as SeqScale[]).map((sc) => (
              <button
                key={sc}
                type="button"
                onClick={() => set({ scale: sc })}
                className={cn(
                  "h-8 rounded-sm px-2 font-mono text-micro tracking-widest",
                  scale === sc ? "bg-accent text-accent-fg" : "bg-inset text-muted hover:text-fg",
                )}
              >
                {sc === "16th" ? "16" : sc === "8th" ? "8" : "3"}
              </button>
            ))}
            {([8, 12, 16] as PatternLength[]).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => set({ patternLength: n })}
                className={cn(
                  "h-8 rounded-sm px-2 font-mono text-micro tracking-widest",
                  patternLength === n ? "bg-accent text-accent-fg" : "bg-inset text-muted hover:text-fg",
                )}
              >
                {n}
              </button>
            ))}
          </>
        )}
        <button
          type="button"
          onClick={mutatePattern}
          className="h-8 rounded-sm bg-inset px-2 font-mono text-micro tracking-widest text-muted hover:text-fg"
        >
          DICE
        </button>
        <button
          type="button"
          onClick={surpriseBeat}
          className="h-8 rounded-sm bg-inset px-2 font-mono text-micro tracking-widest text-muted hover:text-fg"
        >
          SURPRISE
        </button>
        {mode === "studio" &&
          FACTORY.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => loadFactory(f.id)}
              className="hidden h-8 rounded-sm bg-inset px-2 font-mono text-micro tracking-widest text-muted hover:text-fg lg:inline-flex lg:items-center"
            >
              {f.name.toUpperCase()}
            </button>
          ))}
        <button
          type="button"
          onClick={clearPattern}
          className="ml-auto h-8 rounded-sm px-2 font-mono text-micro tracking-widest text-faint hover:text-fg"
        >
          CLEAR
        </button>
      </div>

      <div className="-mx-1 overflow-x-auto px-1">
        <div className="min-w-[640px]">
          <div
            className="mb-1 grid gap-1"
            style={{ gridTemplateColumns: `52px repeat(${cols}, minmax(0,1fr))` }}
          >
            <div />
            {Array.from({ length: cols }, (_, i) => (
              <div
                key={i}
                className={cn(
                  "text-center font-mono text-micro tabular-nums",
                  playing && step === i ? "text-step" : i % 4 === 0 ? "text-muted" : "text-faint",
                )}
              >
                {i + 1}
              </div>
            ))}
          </div>
          {voices.map((v) => (
            <Row
              key={v.id}
              voice={v.id}
              label={v.short}
              cells={grid[v.id]}
              accents={accents[v.id] ?? []}
              cols={cols}
              playhead={playing ? step : -1}
              onToggle={toggleStep}
            />
          ))}
        </div>
      </div>

      {mode === "studio" && (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <span className="font-mono text-micro tracking-widest text-faint">
            CHANCE · {VOICES.find((v) => v.id === selected)?.short}
          </span>
          <input
            type="range"
            min={20}
            max={100}
            step={5}
            value={Math.round((chance[selected] ?? 1) * 100)}
            onChange={(e) =>
              set({
                chance: { ...chance, [selected]: Number(e.target.value) / 100 },
              })
            }
            className="h-1 w-36 accent-current"
            aria-label="Step probability"
          />
          <span className="font-mono text-micro text-muted">
            {Math.round((chance[selected] ?? 1) * 100)}%
          </span>
          <span className="text-2xs text-faint">Tap a step twice for accent. Hold FILL for a roll.</span>
        </div>
      )}
    </section>
  );
}

function Row({
  voice,
  label,
  cells,
  accents,
  cols,
  playhead,
  onToggle,
}: {
  voice: VoiceId;
  label: string;
  cells: boolean[];
  accents: boolean[];
  cols: number;
  playhead: number;
  onToggle: (voice: VoiceId, step: number) => void;
}) {
  return (
    <div className="mb-1 grid gap-1" style={{ gridTemplateColumns: `52px repeat(${cols}, minmax(0,1fr))` }}>
      <div className="flex items-center font-mono text-micro tracking-wide text-muted">{label}</div>
      {cells.slice(0, cols).map((on, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onToggle(voice, i)}
          aria-label={`${label} step ${i + 1}`}
          className={cn(
            "seq-cell h-7 rounded-xs",
            on && accents?.[i] ? "bg-step" : on ? "bg-accent" : i % 4 === 0 ? "bg-line" : "bg-inset",
            playhead === i && "shadow-[0_0_0_1px_var(--color-step)]",
          )}
        />
      ))}
    </div>
  );
}
