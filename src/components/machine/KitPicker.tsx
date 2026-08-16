import { useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import { ChevronDown } from "lucide-react";
import { getEngine } from "@/lib/audio/engine";
import { KIT_FAMILIES, KITS, kitById, type KitFamily, type KitId } from "@/lib/audio/types";
import { FACTORY } from "@/lib/patterns";
import { useMachine } from "@/lib/store";
import { cn } from "@/lib/utils";

export function KitPicker() {
  const kit = useMachine((s) => s.kit);
  const selectKit = useMachine((s) => s.selectKit);
  const armed = useMachine((s) => s.armed);
  const current = kitById(kit);
  const [family, setFamily] = useState<KitFamily>(current.family);

  function pick(id: KitId) {
    selectKit(id);
    setFamily(kitById(id).family);
    if (armed) {
      getEngine().hitVoice("kick", 0.92);
      useMachine.getState().flash("kick");
    }
  }

  const visible = KITS.filter((k) => k.family === family);

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          className="flex h-8 min-w-36 items-center justify-between gap-2 rounded-sm bg-raised px-2.5 text-left shadow-[var(--shadow-panel)] hover:text-fg"
        >
          <span className="font-mono text-xs tracking-wide">{current.name}</span>
          <ChevronDown className="size-3.5 text-faint" />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={8}
          className="z-50 w-80 rounded-lg bg-surface p-3 shadow-[var(--shadow-panel)]"
        >
          <div className="mb-2 flex gap-1">
            {KIT_FAMILIES.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFamily(f.id)}
                className={cn(
                  "h-8 flex-1 rounded-sm text-xs",
                  family === f.id ? "bg-accent text-accent-fg" : "bg-raised text-muted hover:text-fg",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-1 gap-1">
            {visible.map((k) => (
              <button
                key={k.id}
                type="button"
                onClick={() => pick(k.id)}
                className={cn(
                  "rounded-sm px-2.5 py-2 text-left",
                  kit === k.id ? "bg-accent text-accent-fg" : "bg-raised hover:bg-line",
                )}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-sm font-medium">{k.name}</span>
                  <span
                    className={cn(
                      "font-mono text-micro tracking-widest",
                      kit === k.id ? "text-accent-fg/70" : "text-faint",
                    )}
                  >
                    {k.tag}
                  </span>
                </div>
                <p className={cn("mt-0.5 text-2xs", kit === k.id ? "text-accent-fg/80" : "text-muted")}>
                  {k.description}
                </p>
              </button>
            ))}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

export function KitRail() {
  const kit = useMachine((s) => s.kit);
  const selectKit = useMachine((s) => s.selectKit);
  const armed = useMachine((s) => s.armed);

  function pick(id: KitId) {
    selectKit(id);
    if (armed) {
      getEngine().hitVoice("kick", 0.92);
      useMachine.getState().flash("kick");
    }
  }

  return (
    <div className="flex flex-1 items-center gap-2 overflow-x-auto">
      {KITS.map((k) => (
        <button
          key={k.id}
          type="button"
          onClick={() => pick(k.id)}
          className={cn(
            "h-8 shrink-0 rounded-sm px-2.5 font-mono text-xs tracking-wide",
            kit === k.id ? "bg-accent text-accent-fg" : "bg-raised text-muted hover:text-fg",
          )}
        >
          {k.name}
        </button>
      ))}
    </div>
  );
}

export function SceneButton({ compact = false }: { compact?: boolean }) {
  const kit = useMachine((s) => s.kit);
  const loadScene = useMachine((s) => s.loadScene);
  const meta = kitById(kit);
  const scene = FACTORY.find((p) => p.id === meta.scene);
  if (!scene) return null;
  return (
    <button
      type="button"
      onClick={() => loadScene()}
      className={cn(
        "rounded-sm bg-inset px-2.5 font-mono text-micro tracking-widest text-muted hover:text-fg",
        compact ? "h-8" : "h-9",
      )}
    >
      Load {scene.name} groove · {scene.tempo} BPM
    </button>
  );
}
