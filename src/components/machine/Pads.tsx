import { useEffect, useRef, useState } from "react";
import { VOICES, type VoiceId } from "@/lib/audio/types";
import { VOICE_TO_KEY } from "@/lib/midi";
import { useMachine } from "@/lib/store";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

export function Pads({ onHit }: { onHit: (voice: VoiceId, velocity: number, tune?: number) => void }) {
  const selected = useMachine((s) => s.selected);
  const hits = useMachine((s) => s.hits);
  const params = useMachine((s) => s.params);
  const learn = useMachine((s) => s.learn);
  const sixteenLevels = useMachine((s) => s.sixteenLevels);
  const noteRepeat = useMachine((s) => s.noteRepeat);
  const tempo = useMachine((s) => s.tempo);
  const mode = useMachine((s) => s.mode);
  const set = useMachine((s) => s.set);
  const setParam = useMachine((s) => s.setParam);
  const [now, setNow] = useState(0);
  const repeatRef = useRef<number | null>(null);

  useEffect(() => {
    const id = window.setInterval(() => setNow(performance.now()), 40);
    return () => window.clearInterval(id);
  }, []);

  useEffect(
    () => () => {
      if (repeatRef.current) window.clearInterval(repeatRef.current);
    },
    [],
  );

  function startHit(voice: VoiceId, vel: number, tune?: number) {
    set({ selected: voice });
    onHit(voice, vel, tune);
    if (repeatRef.current) window.clearInterval(repeatRef.current);
    if (noteRepeat) {
      const ms = Math.max(60, (60 / tempo / 4) * 1000);
      repeatRef.current = window.setInterval(() => onHit(voice, vel, tune), ms);
    }
  }

  function stopRepeat() {
    if (repeatRef.current) {
      window.clearInterval(repeatRef.current);
      repeatRef.current = null;
    }
  }

  const p = params[selected];

  return (
    <section className="flex flex-col gap-4">
      <div className="grid grid-cols-4 gap-2 sm:gap-2.5">
        {sixteenLevels
          ? Array.from({ length: 16 }, (_, i) => {
              const vel = (i + 1) / 16;
              const tune = i - 8;
              return (
                <button
                  key={i}
                  type="button"
                  onPointerDown={(e) => {
                    e.preventDefault();
                    startHit(selected, vel, tune);
                  }}
                  onPointerUp={stopRepeat}
                  onPointerCancel={stopRepeat}
                  className="pad-rubber aspect-square rounded-md px-2 py-2 text-left"
                >
                  <div className="flex h-full flex-col justify-between">
                    <span className="font-mono text-micro text-faint">{i + 1}</span>
                    <div className="font-mono text-xs">{Math.round(vel * 127)}</div>
                  </div>
                </button>
              );
            })
          : VOICES.map((v) => {
              const lit = now - (hits[v.id] ?? 0) < 140;
              const active = selected === v.id;
              return (
                <button
                  key={v.id}
                  type="button"
                  data-hit={lit}
                  onPointerDown={(e) => {
                    e.preventDefault();
                    const vel = e.pressure > 0.08 ? Math.min(1, e.pressure) : 0.92;
                    startHit(v.id, vel);
                  }}
                  onPointerUp={stopRepeat}
                  onPointerCancel={stopRepeat}
                  className={cn(
                    "pad-rubber aspect-square rounded-md px-2 py-2 text-left",
                    active && "ring-1 ring-accent/50",
                  )}
                >
                  <div className="flex h-full flex-col justify-between">
                    <span className="font-mono text-micro tracking-wider text-faint">
                      {VOICE_TO_KEY[v.id]}
                    </span>
                    <div>
                      <div className="font-mono text-xs tracking-wide">{v.short}</div>
                      <div className="hidden text-2xs text-muted sm:block">{v.label}</div>
                    </div>
                  </div>
                </button>
              );
            })}
      </div>

      {mode !== "easy" && (
        <div className="rounded-lg bg-raised p-3 shadow-[var(--shadow-panel)]">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">{VOICES.find((v) => v.id === selected)?.label}</div>
              <div className="font-mono text-micro tracking-widest text-faint">
                GM {VOICES.find((v) => v.id === selected)?.gm}
              </div>
            </div>
            <button
              type="button"
              onClick={() => set({ learn: !learn })}
              className={cn(
                "h-8 rounded-sm px-2.5 font-mono text-micro tracking-widest",
                learn ? "bg-step text-accent-fg" : "bg-inset text-muted hover:text-fg",
              )}
            >
              {learn ? "PLAY A KEY" : "MIDI LEARN"}
            </button>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
            <Knob
              label="Tune"
              value={p.tune}
              min={-12}
              max={12}
              step={1}
              display={`${p.tune > 0 ? "+" : ""}${p.tune}`}
              onChange={(v) => setParam(selected, { tune: v })}
            />
            <Knob
              label="Decay"
              value={p.decay}
              min={0.3}
              max={2}
              step={0.05}
              display={p.decay.toFixed(2)}
              onChange={(v) => setParam(selected, { decay: v })}
            />
            <Knob
              label="Level"
              value={p.volume}
              min={0}
              max={1}
              step={0.01}
              display={`${Math.round(p.volume * 100)}`}
              onChange={(v) => setParam(selected, { volume: v })}
            />
            <Knob
              label="Pan"
              value={p.pan}
              min={-1}
              max={1}
              step={0.05}
              display={p.pan === 0 ? "C" : p.pan < 0 ? `L${Math.round(-p.pan * 100)}` : `R${Math.round(p.pan * 100)}`}
              onChange={(v) => setParam(selected, { pan: v })}
            />
          </div>
        </div>
      )}
    </section>
  );
}

function Knob({
  label,
  value,
  min,
  max,
  step,
  display,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block">
      <div className="mb-1 flex justify-between font-mono text-micro tracking-widest text-faint">
        <span>{label.toUpperCase()}</span>
        <span>{display}</span>
      </div>
      <Slider min={min} max={max} step={step} value={[value]} onValueChange={([v]) => onChange(v ?? value)} />
    </label>
  );
}
