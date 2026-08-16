import {
  EASY_VOICES,
  cloneGrid,
  emptyGrid,
  kitById,
  type KidsWorld,
  type KitId,
  type PatternGrid,
  type VoiceId,
} from "@/lib/audio/types";
import { FACTORY } from "@/lib/patterns";

export const WORLDS: {
  id: KidsWorld;
  name: string;
  blurb: string;
  kit: KitId;
  tempo: number;
  scene: string;
}[] = [
  { id: "robot", name: "Robot", blurb: "Big booms and beeps.", kit: "808s", tempo: 96, scene: "808" },
  { id: "jungle", name: "Jungle", blurb: "Shakers and bells.", kit: "latin", tempo: 108, scene: "latin" },
  { id: "space", name: "Space", blurb: "Dark and floaty.", kit: "drill", tempo: 88, scene: "lofi" },
  { id: "party", name: "Party", blurb: "Four on the floor.", kit: "house", tempo: 120, scene: "house" },
];

export function mutateGrid(
  grid: PatternGrid,
  amount = 0.14,
  voices: VoiceId[] = EASY_VOICES,
): PatternGrid {
  const next = cloneGrid(grid);
  for (const voice of voices) {
    if (!next[voice]) continue;
    for (let i = 0; i < next[voice].length; i++) {
      if (Math.random() < amount) next[voice][i] = !next[voice][i];
    }
  }
  return next;
}

export function surpriseGrid(): { grid: PatternGrid; tempo: number; swing: number; kit: KitId } {
  const f = FACTORY[Math.floor(Math.random() * FACTORY.length)] ?? FACTORY[0];
  const kit = (["808s", "909s", "trap", "boom-bap", "house", "pop", "latin"] as KitId[])[
    Math.floor(Math.random() * 7)
  ];
  return { grid: f.build(), tempo: f.tempo, swing: f.swing, kit: kit ?? "808s" };
}

export function kidsStarter(world: KidsWorld): PatternGrid {
  const w = WORLDS.find((x) => x.id === world);
  const scene = FACTORY.find((p) => p.id === w?.scene);
  return scene ? scene.build() : emptyGrid();
}

export function fillHits(step: number): VoiceId[] {
  const extra: VoiceId[] = [];
  if (step % 2 === 1) extra.push("chh");
  if (step === 7 || step === 15) extra.push("ohh");
  if (step === 14) extra.push("snare");
  if (step === 13) extra.push("htom");
  return extra;
}

export function worldById(id: KidsWorld) {
  return WORLDS.find((w) => w.id === id) ?? WORLDS[0];
}

export { kitById };
