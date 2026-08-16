import { create } from "zustand";
import {
  DEFAULT_VOICE_PARAMS,
  STEPS,
  VOICES,
  cloneGrid,
  emptyFlags,
  emptyGrid,
  isKitId,
  kitById,
  type ExperienceMode,
  type KidsWorld,
  type KitId,
  type PatternGrid,
  type PatternLength,
  type SeqScale,
  type VoiceId,
  type VoiceParams,
} from "@/lib/audio/types";
import type { MidiDevice } from "@/lib/midi";
import type { AudioPort, MonitorId } from "@/lib/audio/io";
import { defaultGrid, FACTORY } from "@/lib/patterns";
import { kidsStarter, mutateGrid, surpriseGrid, worldById } from "@/lib/perform";

export type DrawerTab = "io" | "mix" | "export";

export interface MachineState {
  armed: boolean;
  kit: KitId;
  tempo: number;
  swing: number;
  master: number;
  metronome: boolean;
  playing: boolean;
  recording: boolean;
  recSeconds: number;
  step: number;
  level: number;
  hits: Partial<Record<VoiceId, number>>;
  selected: VoiceId;
  learn: boolean;
  customMap: Record<number, VoiceId>;
  params: Record<VoiceId, VoiceParams>;
  grid: PatternGrid;
  patternSlot: number;
  banks: PatternGrid[];
  accentBanks: PatternGrid[];
  midiSupported: boolean;
  midiReady: boolean;
  midiError: string | null;
  inputs: MidiDevice[];
  outputs: MidiDevice[];
  inputId: string | null;
  outputId: string | null;
  sendDaw: boolean;
  localOff: boolean;
  pianoConfirmed: boolean;
  lastInputName: string | null;
  lastNote: number | null;
  sustainDown: boolean;
  usbPortName: string | null;
  keyboardChannel: number | null;
  audioInputs: AudioPort[];
  audioOutputs: AudioPort[];
  audioOutId: string | null;
  audioInId: string | null;
  audioRate: number;
  monitor: MonitorId;
  drawer: DrawerTab | null;
  bounceBars: 1 | 2 | 4 | 8;
  tapTimes: number[];
  mode: ExperienceMode;
  scale: SeqScale;
  patternLength: PatternLength;
  chain: boolean;
  accents: PatternGrid;
  chance: Record<VoiceId, number>;
  fillHeld: boolean;
  noteRepeat: boolean;
  sixteenLevels: boolean;
  kidsWorld: KidsWorld;
  set: (partial: Partial<MachineState>) => void;
  flash: (voice: VoiceId) => void;
  toggleStep: (voice: VoiceId, step: number) => void;
  setParam: (voice: VoiceId, patch: Partial<VoiceParams>) => void;
  selectKit: (id: KitId) => void;
  loadScene: (id?: KitId) => void;
  loadFactory: (id: string) => void;
  clearPattern: () => void;
  saveBank: () => void;
  loadBank: (i: number) => void;
  copyBank: () => void;
  mutatePattern: () => void;
  surpriseBeat: () => void;
  setMode: (mode: ExperienceMode) => void;
  setKidsWorld: (world: KidsWorld) => void;
  mapNote: (note: number, voice: VoiceId) => void;
  clearMap: () => void;
  tapTempo: () => void;
}

const STORAGE_KEY = "audiopheliac-kit-v4";
const LEGACY_KEYS = ["privia-kit-v3", "privia-kit-v1", "audiopheliac-kit-v3"];

function sanitizeGrid(raw: unknown): PatternGrid {
  const base = emptyGrid();
  if (!raw || typeof raw !== "object") return base;
  const src = raw as Partial<Record<VoiceId, unknown>>;
  for (const v of VOICES) {
    const row = src[v.id];
    if (!Array.isArray(row)) continue;
    base[v.id] = Array.from({ length: STEPS }, (_, i) => Boolean(row[i]));
  }
  return base;
}

function sanitizeParams(raw: unknown): Record<VoiceId, VoiceParams> {
  const base = defaultParams();
  if (!raw || typeof raw !== "object") return base;
  const src = raw as Partial<Record<VoiceId, Partial<VoiceParams>>>;
  for (const v of VOICES) {
    const p = src[v.id];
    if (p && typeof p === "object") base[v.id] = { ...base[v.id], ...p };
  }
  return base;
}

function sanitizeBanks(raw: unknown): PatternGrid[] {
  const fallback = defaultBanks();
  if (!Array.isArray(raw)) return fallback;
  return [0, 1, 2, 3].map((i) => sanitizeGrid(raw[i] ?? fallback[i]));
}

function defaultParams(): Record<VoiceId, VoiceParams> {
  return Object.fromEntries(
    VOICES.map((v) => [v.id, { ...DEFAULT_VOICE_PARAMS }]),
  ) as Record<VoiceId, VoiceParams>;
}

function defaultBanks(): PatternGrid[] {
  return [defaultGrid(), emptyGrid(), emptyGrid(), emptyGrid()];
}

function defaultChance(): Record<VoiceId, number> {
  return Object.fromEntries(VOICES.map((v) => [v.id, 1])) as Record<VoiceId, number>;
}

function persistable(s: MachineState) {
  return {
    kit: s.kit,
    tempo: s.tempo,
    swing: s.swing,
    master: s.master,
    metronome: s.metronome,
    customMap: s.customMap,
    params: s.params,
    grid: s.grid,
    patternSlot: s.patternSlot,
    banks: s.banks,
    sendDaw: s.sendDaw,
    localOff: s.localOff,
    bounceBars: s.bounceBars,
    selected: s.selected,
    audioOutId: s.audioOutId,
    audioInId: s.audioInId,
    monitor: s.monitor,
    mode: s.mode,
    scale: s.scale,
    patternLength: s.patternLength,
    chain: s.chain,
    accents: s.accents,
    accentBanks: s.accentBanks,
    chance: s.chance,
    kidsWorld: s.kidsWorld,
  };
}

function applyScene(id: KitId) {
  const kit = kitById(id);
  const scene = FACTORY.find((p) => p.id === kit.scene);
  if (!scene) return { kit: kit.id };
  return { kit: kit.id, grid: scene.build(), tempo: scene.tempo, swing: scene.swing };
}

export const useMachine = create<MachineState>((set, get) => {
  const house = applyScene("audiopheliac");
  return {
  armed: false,
  kit: house.kit ?? "audiopheliac",
  tempo: house.tempo ?? 92,
  swing: house.swing ?? 0.22,
  master: 0.82,
  metronome: false,
  playing: false,
  recording: false,
  recSeconds: 0,
  step: 0,
  level: 0,
  hits: {},
  selected: "kick",
  learn: false,
  customMap: {},
  params: defaultParams(),
  grid: house.grid ?? defaultGrid(),
  patternSlot: 0,
  banks: [house.grid ?? defaultGrid(), emptyGrid(), emptyGrid(), emptyGrid()],
  accentBanks: [emptyFlags(), emptyFlags(), emptyFlags(), emptyFlags()],
  midiSupported: false,
  midiReady: false,
  midiError: null,
  inputs: [],
  outputs: [],
  inputId: null,
  outputId: null,
  sendDaw: false,
  localOff: true,
  pianoConfirmed: false,
  lastInputName: null,
  lastNote: null,
  sustainDown: false,
  usbPortName: null,
  keyboardChannel: null,
  audioInputs: [],
  audioOutputs: [],
  audioOutId: null,
  audioInId: null,
  audioRate: 48000,
  monitor: "hs7",
  drawer: null,
  bounceBars: 4,
  tapTimes: [],
  mode: "easy",
  scale: "16th",
  patternLength: 16,
  chain: false,
  accents: emptyFlags(),
  chance: defaultChance(),
  fillHeld: false,
  noteRepeat: false,
  sixteenLevels: false,
  kidsWorld: "robot",
  set: (partial) => set(partial),
  flash: (voice) =>
    set((s) => ({ hits: { ...s.hits, [voice]: performance.now() } })),
  toggleStep: (voice, step) =>
    set((s) => {
      const next = cloneGrid(s.grid);
      const acc = cloneGrid(s.accents);
      if (s.mode === "kids") {
        next[voice][step] = !next[voice][step];
        acc[voice][step] = false;
        return { grid: next, accents: acc };
      }
      const on = next[voice][step];
      const accented = acc[voice][step];
      if (!on) {
        next[voice][step] = true;
        acc[voice][step] = false;
      } else if (!accented) {
        acc[voice][step] = true;
      } else {
        next[voice][step] = false;
        acc[voice][step] = false;
      }
      return { grid: next, accents: acc };
    }),
  setParam: (voice, patch) =>
    set((s) => ({
      params: { ...s.params, [voice]: { ...s.params[voice], ...patch } },
    })),
  selectKit: (id) => set({ kit: kitById(id).id }),
  loadScene: (id) => set(applyScene(id ?? get().kit)),
  loadFactory: (id) => {
    const f = FACTORY.find((p) => p.id === id);
    if (!f) return;
    set({ grid: f.build(), tempo: f.tempo, swing: f.swing });
  },
  clearPattern: () => set({ grid: emptyGrid(), accents: emptyFlags() }),
  saveBank: () =>
    set((s) => {
      const banks = s.banks.map((b, i) => (i === s.patternSlot ? cloneGrid(s.grid) : b));
      const accentBanks = (s.accentBanks ?? defaultBanks()).map((b, i) =>
        i === s.patternSlot ? cloneGrid(s.accents) : b,
      );
      return { banks, accentBanks };
    }),
  loadBank: (i) =>
    set((s) => ({
      patternSlot: i,
      grid: cloneGrid(s.banks[i] ?? emptyGrid()),
      accents: cloneGrid((s.accentBanks ?? defaultBanks())[i] ?? emptyFlags()),
    })),
  copyBank: () =>
    set((s) => {
      const dest = (s.patternSlot + 1) % 4;
      const banks = s.banks.map((b, i) => (i === dest ? cloneGrid(s.grid) : b));
      const accentBanks = (s.accentBanks ?? defaultBanks()).map((b, i) =>
        i === dest ? cloneGrid(s.accents) : b,
      );
      return { banks, accentBanks, patternSlot: dest, grid: cloneGrid(s.grid), accents: cloneGrid(s.accents) };
    }),
  mutatePattern: () =>
    set((s) => ({
      grid: mutateGrid(s.grid, 0.14, s.mode === "kids" ? ["kick", "clap", "chh", "cowbell"] : undefined),
    })),
  surpriseBeat: () => {
    const s = useMachine.getState();
    if (s.mode === "kids") {
      const g = mutateGrid(kidsStarter(s.kidsWorld), 0.35, ["kick", "clap", "chh", "cowbell"]);
      set({ grid: g, accents: emptyFlags(), patternLength: 8 });
      return;
    }
    const pack = surpriseGrid();
    set({ grid: pack.grid, tempo: pack.tempo, swing: pack.swing, kit: pack.kit, accents: emptyFlags() });
  },
  setMode: (mode) => {
    if (mode === "kids") {
      const world = useMachine.getState().kidsWorld;
      const w = worldById(world);
      set({
        mode,
        kit: w.kit,
        tempo: w.tempo,
        grid: kidsStarter(world),
        patternLength: 8,
        swing: 0.06,
      });
      if (typeof document !== "undefined") document.documentElement.dataset.mode = "kids";
      return;
    }
    if (typeof document !== "undefined") delete document.documentElement.dataset.mode;
    set({ mode, patternLength: 16 });
  },
  setKidsWorld: (world) => {
    const w = worldById(world);
    set({
      kidsWorld: world,
      kit: w.kit,
      tempo: w.tempo,
      grid: kidsStarter(world),
      accents: emptyFlags(),
    });
  },
  mapNote: (note, voice) =>
    set((s) => ({ customMap: { ...s.customMap, [note]: voice }, learn: false })),
  clearMap: () => set({ customMap: {} }),
  tapTempo: () => {
    const now = performance.now();
    const times = [...get().tapTimes, now].filter((t) => now - t < 2400).slice(-5);
    if (times.length >= 2) {
      const spans: number[] = [];
      for (let i = 1; i < times.length; i++) spans.push((times[i] ?? 0) - (times[i - 1] ?? 0));
      const avg = spans.reduce((a, b) => a + b, 0) / spans.length;
      const bpm = Math.round(Math.min(220, Math.max(40, 60000 / avg)));
      set({ tapTimes: times, tempo: bpm });
    } else {
      set({ tapTimes: times });
    }
  },
};
});

export function hydrateMachine() {
  if (typeof window === "undefined") return;
  try {
    let raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      for (const key of LEGACY_KEYS) {
        raw = localStorage.getItem(key);
        if (raw) break;
      }
    }
    if (raw) {
      const data = JSON.parse(raw) as Partial<MachineState> & { kit?: string };
      const kit = kitById(data.kit);
      const grid = sanitizeGrid(data.grid);
      const accents = sanitizeGrid(data.accents);
      useMachine.setState({
        kit: kit.id,
        tempo: data.tempo ?? (kit.scene === "808" ? 70 : kit.scene === "boom" ? 92 : 124),
        swing: data.swing ?? 0.08,
        master: data.master ?? 0.82,
        metronome: Boolean(data.metronome),
        customMap: data.customMap ?? {},
        params: sanitizeParams(data.params),
        grid,
        patternSlot: data.patternSlot ?? 0,
        banks: sanitizeBanks(data.banks),
        accentBanks: sanitizeBanks(Array.isArray(data.accentBanks) ? data.accentBanks : [emptyFlags(), emptyFlags(), emptyFlags(), emptyFlags()]),
        sendDaw: Boolean(data.sendDaw),
        localOff: data.localOff !== false,
        bounceBars: data.bounceBars ?? 4,
        selected: data.selected ?? "kick",
        audioOutId: data.audioOutId ?? null,
        audioInId: data.audioInId ?? null,
        monitor:
          data.monitor === "scarlett" || data.monitor === "motu" || data.monitor === "phones"
            ? data.monitor
            : "hs7",
        mode: data.mode === "kids" || data.mode === "studio" || data.mode === "easy" ? data.mode : "easy",
        scale: data.scale === "8th" || data.scale === "triplet" ? data.scale : "16th",
        patternLength: data.patternLength === 8 || data.patternLength === 12 ? data.patternLength : 16,
        chain: Boolean(data.chain),
        accents,
        chance: { ...defaultChance(), ...(data.chance ?? {}) },
        kidsWorld: data.kidsWorld === "jungle" || data.kidsWorld === "space" || data.kidsWorld === "party" ? data.kidsWorld : "robot",
      });
      if (typeof document !== "undefined") {
        const mode = useMachine.getState().mode;
        if (mode === "kids") document.documentElement.dataset.mode = "kids";
        else delete document.documentElement.dataset.mode;
      }
    }
  } catch {
    /* ignore bad cache */
  }
  const g = globalThis as typeof globalThis & { __kitPersist__?: boolean };
  if (g.__kitPersist__) return;
  g.__kitPersist__ = true;
  useMachine.subscribe((s) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(persistable(s)));
    } catch {
      /* quota */
    }
  });
}

export { STEPS, isKitId };
