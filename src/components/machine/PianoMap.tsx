import { VOICE_BY_ID, type VoiceId } from "@/lib/audio/types";
import { isBlackKey, noteName, PIANO_HIGH, PIANO_LOW, resolvePriviaNote } from "@/lib/midi";
import { PRIVIA_SPEC } from "@/lib/privia";
import { useMachine } from "@/lib/store";
import { cn } from "@/lib/utils";

const FOCUS_LOW = 36;
const FOCUS_HIGH = 59;

export function PianoMap({ onNote }: { onNote: (note: number, velocity: number) => void }) {
  const customMap = useMachine((s) => s.customMap);
  const lastNote = useMachine((s) => s.lastNote);
  const selected = useMachine((s) => s.selected);
  const whites: number[] = [];
  for (let n = FOCUS_LOW; n <= FOCUS_HIGH; n++) {
    if (!isBlackKey(n)) whites.push(n);
  }
  const overview: number[] = [];
  for (let n = PIANO_LOW; n <= PIANO_HIGH; n++) {
    if (!isBlackKey(n)) overview.push(n);
  }

  return (
    <section className="rounded-lg bg-raised p-3 shadow-[var(--shadow-panel)] md:p-4">
      <div className="mb-2 flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
        <span className="font-mono text-micro tracking-widest text-faint">
          PX-870 · {PRIVIA_SPEC.lowestName}–{PRIVIA_SPEC.highestName} · C2–B3 play
        </span>
        <span className="text-2xs text-muted">
          Low keys are 808s. C2 up is GM drums. Damper holds open hats.
        </span>
      </div>
      <div className="mb-2 flex gap-2 font-mono text-micro tracking-widest text-faint">
        <span className="flex-1">KICK / SNARE</span>
        <span className="flex-1 text-center">HATS / TOMS</span>
        <span className="flex-1 text-right">PERC</span>
      </div>
      <div className="relative h-28 overflow-hidden rounded-sm">
        <div className="flex h-full">
          {whites.map((note) => {
            const mapped = resolveVoice(note, customMap);
            const active = lastNote === note;
            const sel = mapped.voice === selected;
            return (
              <button
                key={note}
                type="button"
                onPointerDown={(e) => {
                  e.preventDefault();
                  onNote(note, 0.92);
                }}
                className={cn(
                  "piano-key relative flex min-w-0 flex-1 flex-col justify-end border-x border-bg px-0.5 pb-1.5",
                  active ? "bg-pad-lit text-accent-fg" : sel ? "bg-accent/80 text-accent-fg" : "bg-fg text-accent-fg",
                )}
              >
                <span className="font-mono text-micro leading-none">{VOICE_BY_ID[mapped.voice].short}</span>
                <span className="font-mono text-micro leading-none opacity-50">{noteName(note)}</span>
              </button>
            );
          })}
        </div>
        <div className="pointer-events-none absolute inset-0 flex">
          {whites.map((note) => {
            const black = note + 1;
            const hasBlack = isBlackKey(black) && black <= FOCUS_HIGH;
            return (
              <div key={`slot-${note}`} className="relative flex-1">
                {hasBlack ? (
                  <BlackKey
                    note={black}
                    mapped={resolveVoice(black, customMap)}
                    active={lastNote === black}
                    selected={resolveVoice(black, customMap).voice === selected}
                    onNote={onNote}
                  />
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
      <div className="mt-3">
        <div className="mb-1 font-mono text-micro tracking-widest text-faint">FULL 88</div>
        <div className="flex h-6 overflow-hidden rounded-xs bg-inset">
          {overview.map((note) => {
            const mapped = resolveVoice(note, customMap);
            const inFocus = note >= FOCUS_LOW && note <= FOCUS_HIGH;
            const active = lastNote === note;
            return (
              <button
                key={`ov-${note}`}
                type="button"
                onPointerDown={(e) => {
                  e.preventDefault();
                  onNote(note, 0.92);
                }}
                title={`${noteName(note)} · ${VOICE_BY_ID[mapped.voice].short}`}
                className={cn(
                  "min-w-0 flex-1 border-x border-bg/40",
                  active ? "bg-pad-lit" : inFocus ? "bg-fg/80" : "bg-muted/40",
                )}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
}

function BlackKey({
  note,
  mapped,
  active,
  selected,
  onNote,
}: {
  note: number;
  mapped: { voice: VoiceId; tune: number };
  active: boolean;
  selected: boolean;
  onNote: (note: number, velocity: number) => void;
}) {
  return (
    <button
      type="button"
      onPointerDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onNote(note, 0.92);
      }}
      className={cn(
        "piano-key pointer-events-auto absolute top-0 z-10 flex h-3/5 w-2/3 flex-col justify-end rounded-b-sm px-0.5 pb-1",
        active ? "bg-step text-accent-fg" : selected ? "bg-muted text-fg" : "bg-inset text-muted",
      )}
      style={{ left: "68%" }}
    >
      <span className="font-mono text-micro leading-none">{VOICE_BY_ID[mapped.voice].short}</span>
    </button>
  );
}

function resolveVoice(note: number, custom: Record<number, VoiceId>) {
  if (custom[note]) return { voice: custom[note], tune: 0 };
  return resolvePriviaNote(note);
}
