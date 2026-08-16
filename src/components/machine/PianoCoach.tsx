import { PRIVIA_SPEC } from "@/lib/privia";
import { useMachine } from "@/lib/store";
import { Button } from "@/components/ui/button";

/** C1 is the 3rd white key on an 88-key A0–C8 (A0, B0, C1). */
function C1Guide() {
  const whites = 52;
  const c1 = 2;
  return (
    <div className="mt-3" aria-hidden>
      <div className="flex h-8 overflow-hidden rounded-sm border border-border">
        {Array.from({ length: whites }, (_, i) => (
          <div
            key={i}
            className={
              i === c1
                ? "min-w-0 flex-1 bg-accent"
                : "min-w-0 flex-1 border-r border-border/60 bg-paper"
            }
          />
        ))}
      </div>
      <p className="mt-1 font-mono text-micro tracking-widest text-faint">
        LOWEST C · C1 · 3RD WHITE KEY
      </p>
    </div>
  );
}

export function PianoCoach() {
  const usb = useMachine((s) => s.usbPortName ?? s.lastInputName);
  const confirmed = useMachine((s) => s.pianoConfirmed);
  const set = useMachine((s) => s.set);
  if (!usb || confirmed) return null;

  return (
    <aside className="mb-4 rounded-lg border border-accent/40 bg-raised px-4 py-3 shadow-[var(--shadow-panel)]">
      <p className="font-mono text-micro tracking-widest text-accent">PIANO IS STILL ON</p>
      <h2 className="mt-1 text-lg font-medium tracking-tight">
        USB cannot mute the PX-870. The Concert Grand lives in the piano.
      </h2>
      <ol className="mt-3 space-y-2 text-sm">
        <li>
          <span className="font-medium text-fg">Fastest — </span>
          slide the Privia <span className="text-fg">VOLUME to 0</span>. MIDI still plays the kit.
        </li>
        <li>
          <span className="font-medium text-fg">Keep the speakers for later — </span>
          hold <span className="text-fg">{PRIVIA_SPEC.localControl.hold}</span> and tap the
          lowest C. A long beep means Local Control is off.
        </li>
      </ol>
      <C1Guide />
      <div className="mt-3 flex flex-wrap gap-2">
        <Button onClick={() => set({ pianoConfirmed: true, localOff: true })}>
          Piano is muted
        </Button>
        <Button
          variant="ghost"
          onClick={() => set({ pianoConfirmed: true, localOff: false })}
        >
          Leave piano on
        </Button>
      </div>
    </aside>
  );
}
