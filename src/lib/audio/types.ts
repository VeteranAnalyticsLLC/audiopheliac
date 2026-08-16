export type VoiceId =
  | "kick"
  | "snare"
  | "clap"
  | "rim"
  | "chh"
  | "phh"
  | "ohh"
  | "ride"
  | "ltom"
  | "mtom"
  | "htom"
  | "crash"
  | "cowbell"
  | "tamb"
  | "shaker"
  | "perc";

export type KitFamily = "machine" | "kit" | "style";

export type KitId =
  | "808s"
  | "909s"
  | "drum-kick"
  | "live-kit"
  | "tight-kit"
  | "trap"
  | "boom-bap"
  | "house"
  | "drill"
  | "lofi"
  | "pop"
  | "techno"
  | "latin"
  | "audiopheliac";

export type ExperienceMode = "kids" | "easy" | "studio";
export type SeqScale = "16th" | "8th" | "triplet";
export type PatternLength = 8 | 12 | 16;
export type KidsWorld = "robot" | "jungle" | "space" | "party";

export interface VoiceDef {
  id: VoiceId;
  label: string;
  short: string;
  gm: number;
  family: "drum" | "hat" | "tom" | "cym" | "perc";
}

export const VOICES: VoiceDef[] = [
  { id: "kick", label: "Kick", short: "KIK", gm: 36, family: "drum" },
  { id: "snare", label: "Snare", short: "SNR", gm: 38, family: "drum" },
  { id: "clap", label: "Clap", short: "CLP", gm: 39, family: "drum" },
  { id: "rim", label: "Rim", short: "RIM", gm: 37, family: "drum" },
  { id: "chh", label: "Closed Hat", short: "CHH", gm: 42, family: "hat" },
  { id: "phh", label: "Pedal Hat", short: "PHH", gm: 44, family: "hat" },
  { id: "ohh", label: "Open Hat", short: "OHH", gm: 46, family: "hat" },
  { id: "ride", label: "Ride", short: "RID", gm: 51, family: "cym" },
  { id: "ltom", label: "Low Tom", short: "LTM", gm: 45, family: "tom" },
  { id: "mtom", label: "Mid Tom", short: "MTM", gm: 47, family: "tom" },
  { id: "htom", label: "High Tom", short: "HTM", gm: 50, family: "tom" },
  { id: "crash", label: "Crash", short: "CRS", gm: 49, family: "cym" },
  { id: "cowbell", label: "Cowbell", short: "CWB", gm: 56, family: "perc" },
  { id: "tamb", label: "Tambourine", short: "TMB", gm: 54, family: "perc" },
  { id: "shaker", label: "Shaker", short: "SHK", gm: 70, family: "perc" },
  { id: "perc", label: "Claves", short: "CLV", gm: 75, family: "perc" },
];

export const VOICE_BY_ID: Record<VoiceId, VoiceDef> = Object.fromEntries(
  VOICES.map((v) => [v.id, v]),
) as Record<VoiceId, VoiceDef>;

export const STEPS = 16;

export interface VoiceParams {
  tune: number;
  decay: number;
  volume: number;
  pan: number;
  mute: boolean;
  solo: boolean;
}

export const DEFAULT_VOICE_PARAMS: VoiceParams = {
  tune: 0,
  decay: 1,
  volume: 0.85,
  pan: 0,
  mute: false,
  solo: false,
};

export interface Kit {
  id: KitId;
  name: string;
  tag: string;
  family: KitFamily;
  description: string;
  drive: number;
  dark: number;
  punch: number;
  pitchDrop: number;
  hatDecay: number;
  room: number;
  kickStart: number;
  kickEnd: number;
  kickDecay: number;
  kickClick: number;
  snarePitch: number;
  snareDecay: number;
  clapSpread: boolean;
  scene: string;
}

export const KIT_FAMILIES: { id: KitFamily; label: string }[] = [
  { id: "machine", label: "Machines" },
  { id: "kit", label: "Drum kits" },
  { id: "style", label: "Styles" },
];

export const KITS: Kit[] = [
  {
    id: "audiopheliac",
    name: "Audiopheliac",
    tag: "TAP",
    family: "style",
    description: "The house kit. Round kick, vinyl-aware snare, air on the hats. Built for HS7s at 48 kHz.",
    drive: 0.22,
    dark: 0.18,
    punch: 0.82,
    pitchDrop: 0.7,
    hatDecay: 0.92,
    room: 0.16,
    kickStart: 126,
    kickEnd: 46,
    kickDecay: 0.48,
    kickClick: 0.22,
    snarePitch: 172,
    snareDecay: 0.22,
    clapSpread: false,
    scene: "boom",
  },
  {
    id: "808s",
    name: "808s",
    tag: "808",
    family: "machine",
    description: "Long sine boom, snappy clap, cowbell. The TR-808 bass drum producers still chase.",
    drive: 0.62,
    dark: 0.16,
    punch: 0.55,
    pitchDrop: 1.55,
    hatDecay: 1.2,
    room: 0.06,
    kickStart: 92,
    kickEnd: 34,
    kickDecay: 1.05,
    kickClick: 0.08,
    snarePitch: 210,
    snareDecay: 0.2,
    clapSpread: true,
    scene: "808",
  },
  {
    id: "909s",
    name: "909s",
    tag: "909",
    family: "machine",
    description: "Hard click, gated snare, short hats. House and techno stock.",
    drive: 0.38,
    dark: 0.02,
    punch: 1,
    pitchDrop: 0.72,
    hatDecay: 0.68,
    room: 0.04,
    kickStart: 168,
    kickEnd: 52,
    kickDecay: 0.26,
    kickClick: 0.42,
    snarePitch: 200,
    snareDecay: 0.14,
    clapSpread: false,
    scene: "house",
  },
  {
    id: "drum-kick",
    name: "Drum Kick",
    tag: "KIK",
    family: "kit",
    description: "Beater click into a round sub. The live kick used on records.",
    drive: 0.18,
    dark: 0.1,
    punch: 0.88,
    pitchDrop: 0.55,
    hatDecay: 0.95,
    room: 0.14,
    kickStart: 118,
    kickEnd: 48,
    kickDecay: 0.42,
    kickClick: 0.34,
    snarePitch: 176,
    snareDecay: 0.22,
    clapSpread: false,
    scene: "pop",
  },
  {
    id: "live-kit",
    name: "Live Kit",
    tag: "KIT",
    family: "kit",
    description: "Close-mic acoustic kit. Body on the snare, wood on the toms.",
    drive: 0.14,
    dark: 0.12,
    punch: 0.7,
    pitchDrop: 0.62,
    hatDecay: 1.05,
    room: 0.22,
    kickStart: 128,
    kickEnd: 50,
    kickDecay: 0.46,
    kickClick: 0.28,
    snarePitch: 168,
    snareDecay: 0.26,
    clapSpread: false,
    scene: "rock",
  },
  {
    id: "tight-kit",
    name: "Tight Kit",
    tag: "GTK",
    family: "kit",
    description: "Gated, dry, close. Session pop and R&B drums.",
    drive: 0.22,
    dark: 0.06,
    punch: 0.96,
    pitchDrop: 0.5,
    hatDecay: 0.7,
    room: 0.05,
    kickStart: 140,
    kickEnd: 54,
    kickDecay: 0.22,
    kickClick: 0.36,
    snarePitch: 196,
    snareDecay: 0.12,
    clapSpread: false,
    scene: "pop",
  },
  {
    id: "trap",
    name: "Trap",
    tag: "TRP",
    family: "style",
    description: "Short 808, rattly hats, clap on the backbeat.",
    drive: 0.48,
    dark: 0.14,
    punch: 0.7,
    pitchDrop: 1.4,
    hatDecay: 0.55,
    room: 0.05,
    kickStart: 78,
    kickEnd: 36,
    kickDecay: 0.72,
    kickClick: 0.1,
    snarePitch: 230,
    snareDecay: 0.16,
    clapSpread: true,
    scene: "trap",
  },
  {
    id: "boom-bap",
    name: "Boom Bap",
    tag: "BMP",
    family: "style",
    description: "Fat kick, crack snare, swung hats. Mid-90s MPC pocket.",
    drive: 0.28,
    dark: 0.32,
    punch: 0.78,
    pitchDrop: 0.88,
    hatDecay: 0.9,
    room: 0.2,
    kickStart: 124,
    kickEnd: 44,
    kickDecay: 0.5,
    kickClick: 0.2,
    snarePitch: 158,
    snareDecay: 0.24,
    clapSpread: false,
    scene: "boom",
  },
  {
    id: "house",
    name: "House",
    tag: "HSE",
    family: "style",
    description: "Four-on-the-floor punch, clap, open hat on the offbeat.",
    drive: 0.3,
    dark: 0.05,
    punch: 0.94,
    pitchDrop: 0.78,
    hatDecay: 0.82,
    room: 0.1,
    kickStart: 152,
    kickEnd: 50,
    kickDecay: 0.3,
    kickClick: 0.32,
    snarePitch: 188,
    snareDecay: 0.16,
    clapSpread: true,
    scene: "house",
  },
  {
    id: "drill",
    name: "Drill",
    tag: "DRL",
    family: "style",
    description: "Dark sliding 808, sparse hats, hard clap.",
    drive: 0.52,
    dark: 0.38,
    punch: 0.6,
    pitchDrop: 1.7,
    hatDecay: 0.6,
    room: 0.04,
    kickStart: 70,
    kickEnd: 30,
    kickDecay: 0.88,
    kickClick: 0.06,
    snarePitch: 240,
    snareDecay: 0.15,
    clapSpread: true,
    scene: "drill",
  },
  {
    id: "lofi",
    name: "Lo-Fi",
    tag: "LP",
    family: "style",
    description: "Dusted, rounded, a little room in the mids.",
    drive: 0.2,
    dark: 0.48,
    punch: 0.5,
    pitchDrop: 0.85,
    hatDecay: 0.86,
    room: 0.3,
    kickStart: 110,
    kickEnd: 46,
    kickDecay: 0.44,
    kickClick: 0.12,
    snarePitch: 150,
    snareDecay: 0.28,
    clapSpread: false,
    scene: "lofi",
  },
  {
    id: "pop",
    name: "Pop",
    tag: "POP",
    family: "style",
    description: "Bright, compressed, radio-ready kick and snare.",
    drive: 0.26,
    dark: 0.04,
    punch: 0.98,
    pitchDrop: 0.6,
    hatDecay: 0.78,
    room: 0.08,
    kickStart: 136,
    kickEnd: 52,
    kickDecay: 0.28,
    kickClick: 0.38,
    snarePitch: 192,
    snareDecay: 0.15,
    clapSpread: false,
    scene: "pop",
  },
  {
    id: "techno",
    name: "Techno",
    tag: "TEC",
    family: "style",
    description: "Industrial 909 punch, dry hats, no fluff.",
    drive: 0.44,
    dark: 0.08,
    punch: 1,
    pitchDrop: 0.68,
    hatDecay: 0.58,
    room: 0.03,
    kickStart: 175,
    kickEnd: 48,
    kickDecay: 0.2,
    kickClick: 0.48,
    snarePitch: 205,
    snareDecay: 0.11,
    clapSpread: false,
    scene: "techno",
  },
  {
    id: "latin",
    name: "Latin",
    tag: "LTN",
    family: "style",
    description: "Live kick, rim, shaker, cowbell. Percussion up front.",
    drive: 0.16,
    dark: 0.1,
    punch: 0.72,
    pitchDrop: 0.58,
    hatDecay: 1,
    room: 0.18,
    kickStart: 122,
    kickEnd: 50,
    kickDecay: 0.36,
    kickClick: 0.24,
    snarePitch: 180,
    snareDecay: 0.18,
    clapSpread: false,
    scene: "latin",
  },
];

const LEGACY_KITS: Record<string, KitId> = {
  studio: "live-kit",
  analog: "808s",
  tight: "909s",
  vinyl: "lofi",
  hybrid: "drum-kick",
};

export function kitById(id: string | null | undefined): Kit {
  if (id && LEGACY_KITS[id]) {
    return KITS.find((k) => k.id === LEGACY_KITS[id]) ?? KITS[0];
  }
  return KITS.find((k) => k.id === id) ?? KITS[0];
}

export function isKitId(id: string): id is KitId {
  return KITS.some((k) => k.id === id);
}

export interface MidiHit {
  note: number;
  velocity: number;
  time: number;
  duration: number;
  voice: VoiceId;
}

export type PatternGrid = Record<VoiceId, boolean[]>;

export function emptyGrid(): PatternGrid {
  return Object.fromEntries(VOICES.map((v) => [v.id, Array<boolean>(STEPS).fill(false)])) as PatternGrid;
}

export function cloneGrid(grid: PatternGrid): PatternGrid {
  return Object.fromEntries(VOICES.map((v) => [v.id, [...grid[v.id]]])) as PatternGrid;
}

export function emptyFlags(): PatternGrid {
  return emptyGrid();
}

export const EASY_VOICES: VoiceId[] = ["kick", "snare", "clap", "rim", "chh", "ohh", "perc", "crash"];

export const KIDS_PADS: { voice: VoiceId; name: string; hint: string }[] = [
  { voice: "kick", name: "Boom", hint: "The big one" },
  { voice: "snare", name: "Snap", hint: "Backbeat" },
  { voice: "clap", name: "Clap", hint: "Hands" },
  { voice: "chh", name: "Tick", hint: "Hats" },
  { voice: "ohh", name: "Splash", hint: "Open hat" },
  { voice: "ltom", name: "Tom", hint: "Low drum" },
  { voice: "crash", name: "Crash", hint: "Cymbal" },
  { voice: "cowbell", name: "Bell", hint: "Cowbell" },
];

export const KIDS_ROWS: { voice: VoiceId; name: string }[] = [
  { voice: "kick", name: "Boom" },
  { voice: "clap", name: "Clap" },
  { voice: "chh", name: "Tick" },
  { voice: "cowbell", name: "Bell" },
];
