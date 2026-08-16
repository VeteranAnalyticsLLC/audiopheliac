import { emptyGrid, type PatternGrid, type VoiceId } from "@/lib/audio/types";

function set(grid: PatternGrid, voice: VoiceId, steps: number[]) {
  for (const s of steps) grid[voice][s] = true;
}

export interface FactoryPattern {
  id: string;
  name: string;
  tempo: number;
  swing: number;
  build: () => PatternGrid;
}

export const FACTORY: FactoryPattern[] = [
  {
    id: "808",
    name: "808",
    tempo: 70,
    swing: 0.08,
    build: () => {
      const g = emptyGrid();
      set(g, "kick", [0, 10]);
      set(g, "clap", [4, 12]);
      set(g, "chh", [0, 2, 4, 6, 8, 10, 12, 14]);
      set(g, "ohh", [7, 15]);
      set(g, "cowbell", [0, 8]);
      return g;
    },
  },
  {
    id: "house",
    name: "House",
    tempo: 124,
    swing: 0.04,
    build: () => {
      const g = emptyGrid();
      set(g, "kick", [0, 4, 8, 12]);
      set(g, "clap", [4, 12]);
      set(g, "chh", [0, 2, 4, 6, 8, 10, 12, 14]);
      set(g, "ohh", [6, 14]);
      set(g, "shaker", [1, 5, 9, 13]);
      return g;
    },
  },
  {
    id: "boom",
    name: "Boom Bap",
    tempo: 92,
    swing: 0.22,
    build: () => {
      const g = emptyGrid();
      set(g, "kick", [0, 6, 10]);
      set(g, "snare", [4, 12, 15]);
      set(g, "chh", [0, 2, 4, 6, 8, 10, 12, 14]);
      set(g, "perc", [2, 9]);
      set(g, "rim", [7]);
      return g;
    },
  },
  {
    id: "trap",
    name: "Trap",
    tempo: 140,
    swing: 0.06,
    build: () => {
      const g = emptyGrid();
      set(g, "kick", [0, 7, 11]);
      set(g, "clap", [4, 12]);
      set(g, "chh", [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);
      set(g, "ohh", [6, 14]);
      set(g, "perc", [3, 11]);
      return g;
    },
  },
  {
    id: "drill",
    name: "Drill",
    tempo: 142,
    swing: 0.1,
    build: () => {
      const g = emptyGrid();
      set(g, "kick", [0, 6, 9]);
      set(g, "clap", [4, 12]);
      set(g, "chh", [0, 3, 4, 8, 11, 12]);
      set(g, "ohh", [7]);
      set(g, "rim", [10]);
      return g;
    },
  },
  {
    id: "pop",
    name: "Pop",
    tempo: 118,
    swing: 0.03,
    build: () => {
      const g = emptyGrid();
      set(g, "kick", [0, 8, 10]);
      set(g, "snare", [4, 12]);
      set(g, "chh", [0, 2, 4, 6, 8, 10, 12, 14]);
      set(g, "ohh", [6]);
      set(g, "clap", [12]);
      return g;
    },
  },
  {
    id: "techno",
    name: "Techno",
    tempo: 132,
    swing: 0,
    build: () => {
      const g = emptyGrid();
      set(g, "kick", [0, 4, 8, 12]);
      set(g, "chh", [2, 6, 10, 14]);
      set(g, "ohh", [14]);
      set(g, "rim", [4, 12]);
      set(g, "perc", [3, 11]);
      return g;
    },
  },
  {
    id: "lofi",
    name: "Lo-Fi",
    tempo: 84,
    swing: 0.16,
    build: () => {
      const g = emptyGrid();
      set(g, "kick", [0, 7]);
      set(g, "snare", [4, 12]);
      set(g, "chh", [0, 3, 4, 8, 11, 12]);
      set(g, "perc", [6, 14]);
      return g;
    },
  },
  {
    id: "rock",
    name: "Rock",
    tempo: 110,
    swing: 0.02,
    build: () => {
      const g = emptyGrid();
      set(g, "kick", [0, 6, 8]);
      set(g, "snare", [4, 12]);
      set(g, "chh", [0, 2, 4, 6, 8, 10, 12, 14]);
      set(g, "crash", [0]);
      set(g, "htom", [14]);
      return g;
    },
  },
  {
    id: "break",
    name: "Break",
    tempo: 136,
    swing: 0.08,
    build: () => {
      const g = emptyGrid();
      set(g, "kick", [0, 3, 10]);
      set(g, "snare", [4, 12]);
      set(g, "chh", [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);
      set(g, "ohh", [7, 15]);
      set(g, "htom", [14]);
      return g;
    },
  },
  {
    id: "latin",
    name: "Latin",
    tempo: 108,
    swing: 0.06,
    build: () => {
      const g = emptyGrid();
      set(g, "kick", [0, 7, 8, 14]);
      set(g, "rim", [4, 12]);
      set(g, "chh", [2, 6, 10, 14]);
      set(g, "perc", [0, 3, 6, 10, 13]);
      set(g, "cowbell", [0, 4, 8, 12]);
      set(g, "shaker", [0, 2, 4, 6, 8, 10, 12, 14]);
      return g;
    },
  },
];

export const defaultGrid = () => FACTORY[0].build();
