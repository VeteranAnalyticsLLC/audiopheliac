import type { Kit, VoiceId, VoiceParams } from "./types";

const noiseCache = new WeakMap<BaseAudioContext, AudioBuffer>();

function noiseBuffer(ctx: BaseAudioContext): AudioBuffer {
  const cached = noiseCache.get(ctx);
  if (cached) return cached;
  const length = Math.floor(ctx.sampleRate * 2);
  const buf = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < length; i++) {
    const white = Math.random() * 2 - 1;
    last = last * 0.96 + white * 0.04;
    data[i] = white * 0.72 + last * 0.28;
  }
  noiseCache.set(ctx, buf);
  return buf;
}

function noiseSource(ctx: BaseAudioContext, when: number, dur: number): AudioBufferSourceNode {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx);
  src.loop = true;
  src.start(when);
  src.stop(when + dur);
  return src;
}

function osc(
  ctx: BaseAudioContext,
  type: OscillatorType,
  freq: number,
  when: number,
  dur: number,
): OscillatorNode {
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq, when);
  o.start(when);
  o.stop(when + dur);
  return o;
}

function env(
  ctx: BaseAudioContext,
  when: number,
  peak: number,
  attack: number,
  decay: number,
): GainNode {
  const g = ctx.createGain();
  const a = Math.max(0.0015, attack);
  const p = Math.max(0.0001, peak);
  g.gain.setValueAtTime(0.0001, when);
  g.gain.exponentialRampToValueAtTime(p, when + a);
  g.gain.exponentialRampToValueAtTime(0.0001, when + a + Math.max(0.02, decay));
  return g;
}

function biquad(
  ctx: BaseAudioContext,
  type: BiquadFilterType,
  freq: number,
  q = 0.8,
): BiquadFilterNode {
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  return f;
}

function saturate(ctx: BaseAudioContext, amount: number): WaveShaperNode {
  const ws = ctx.createWaveShaper();
  const n = 256;
  const curve = new Float32Array(n);
  const k = 1 + amount * 6;
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1;
    curve[i] = Math.tanh(x * k);
  }
  ws.curve = curve;
  ws.oversample = "2x";
  return ws;
}

function hzFromTune(base: number, semitones: number): number {
  return base * 2 ** (semitones / 12);
}

export interface VoiceTrigger {
  ctx: BaseAudioContext;
  dest: AudioNode;
  voice: VoiceId;
  when: number;
  velocity: number;
  kit: Kit;
  params: VoiceParams;
  tuneExtra?: number;
}

export interface ActiveVoice {
  choke?: () => void;
  stop?: () => void;
}

export function triggerVoice(opts: VoiceTrigger): ActiveVoice {
  const vel = Math.max(0.05, Math.min(1, opts.velocity));
  switch (opts.voice) {
    case "kick":
      return kick(opts, vel);
    case "snare":
      return snare(opts, vel);
    case "clap":
      return clap(opts, vel);
    case "rim":
      return rim(opts, vel);
    case "chh":
      return hat(opts, vel, "closed");
    case "phh":
      return hat(opts, vel, "pedal");
    case "ohh":
      return hat(opts, vel, "open");
    case "ride":
      return ride(opts, vel);
    case "ltom":
      return tom(opts, vel, 82);
    case "mtom":
      return tom(opts, vel, 128);
    case "htom":
      return tom(opts, vel, 188);
    case "crash":
      return crash(opts, vel);
    case "cowbell":
      return cowbell(opts, vel);
    case "tamb":
      return tamb(opts, vel);
    case "shaker":
      return shaker(opts, vel);
    case "perc":
      return claves(opts, vel);
  }
}

function chainToDest(opts: VoiceTrigger, node: AudioNode, when: number, vel: number) {
  const pan = opts.ctx.createStereoPanner();
  pan.pan.setValueAtTime(Math.max(-1, Math.min(1, opts.params.pan)), when);
  const g = opts.ctx.createGain();
  g.gain.setValueAtTime(opts.params.volume * (0.55 + vel * 0.55), when);
  node.connect(pan);
  pan.connect(g);
  g.connect(opts.dest);
}

function kick(opts: VoiceTrigger, vel: number): ActiveVoice {
  const { ctx, when, kit, params } = opts;
  const mix = ctx.createGain();
  const start = hzFromTune(kit.kickStart, params.tune + (opts.tuneExtra ?? 0));
  const end = hzFromTune(kit.kickEnd, params.tune + (opts.tuneExtra ?? 0));
  const bodyDur = kit.kickDecay * params.decay;

  const body = osc(ctx, "sine", start, when, bodyDur + 0.08);
  body.frequency.exponentialRampToValueAtTime(Math.max(20, end), when + 0.055 * kit.pitchDrop);
  const bodyG = env(ctx, when, 0.96 * vel, 0.002, bodyDur);
  body.connect(bodyG);
  bodyG.connect(mix);

  const click = noiseSource(ctx, when, 0.028);
  const hp = biquad(ctx, "highpass", kit.kickClick > 0.3 ? 2200 : 1600, 0.7);
  const clickG = env(ctx, when, 0.55 * kit.kickClick * kit.punch * vel, 0.001, 0.016);
  click.connect(hp);
  hp.connect(clickG);
  clickG.connect(mix);

  const beater = osc(ctx, "triangle", start * 1.8, when, 0.05);
  const beaterG = env(ctx, when, 0.16 * kit.kickClick * vel, 0.001, 0.028);
  beater.connect(beaterG);
  beaterG.connect(mix);

  const thump = osc(ctx, "triangle", end * 1.12, when, Math.min(0.22, bodyDur));
  const thumpG = env(ctx, when, 0.16 * vel, 0.002, Math.min(0.16, bodyDur));
  thump.connect(thumpG);
  thumpG.connect(mix);

  const sat = saturate(ctx, kit.drive);
  mix.connect(sat);
  chainToDest(opts, sat, when, vel);
  return {};
}

function snare(opts: VoiceTrigger, vel: number): ActiveVoice {
  const { ctx, when, kit, params } = opts;
  const mix = ctx.createGain();
  const pitch = hzFromTune(kit.snarePitch, params.tune + (opts.tuneExtra ?? 0));
  const dur = kit.snareDecay * params.decay;

  const tone = osc(ctx, "triangle", pitch, when, dur);
  tone.frequency.exponentialRampToValueAtTime(pitch * 0.72, when + 0.05);
  const toneG = env(ctx, when, 0.3 * vel, 0.002, dur * 0.7);
  tone.connect(toneG);
  toneG.connect(mix);

  const tone2 = osc(ctx, "sine", pitch * 1.72, when, dur * 0.6);
  const tone2G = env(ctx, when, 0.11 * vel, 0.001, dur * 0.45);
  tone2.connect(tone2G);
  tone2G.connect(mix);

  const n = noiseSource(ctx, when, dur + 0.05);
  const bp = biquad(ctx, "bandpass", kit.dark > 0.3 ? 1500 : 2500, 0.85);
  const nG = env(ctx, when, 0.56 * vel, 0.002, dur);
  n.connect(bp);
  bp.connect(nG);
  nG.connect(mix);

  const snap = noiseSource(ctx, when, 0.02);
  const snapHp = biquad(ctx, "highpass", 5000, 0.6);
  const snapG = env(ctx, when, 0.28 * kit.punch * vel, 0.001, 0.012);
  snap.connect(snapHp);
  snapHp.connect(snapG);
  snapG.connect(mix);

  const sat = saturate(ctx, kit.drive * 0.6);
  mix.connect(sat);
  chainToDest(opts, sat, when, vel);
  return {};
}

function clap(opts: VoiceTrigger, vel: number): ActiveVoice {
  const { ctx, when, kit, params } = opts;
  const mix = ctx.createGain();
  const offsets = kit.clapSpread ? [0, 0.011, 0.023, 0.041] : [0, 0.013, 0.026];
  const dur = 0.22 * params.decay;

  for (const off of offsets) {
    const n = noiseSource(ctx, when + off, 0.08);
    const bp = biquad(ctx, "bandpass", 1200, 1.1);
    const g = env(ctx, when + off, 0.42 * vel, 0.0015, 0.045);
    n.connect(bp);
    bp.connect(g);
    g.connect(mix);
  }

  const tail = noiseSource(ctx, when + 0.03, dur);
  const tailBp = biquad(ctx, "bandpass", 1400, 0.7);
  const tailG = env(ctx, when + 0.03, 0.22 * vel, 0.01, dur);
  tail.connect(tailBp);
  tailBp.connect(tailG);
  tailG.connect(mix);

  chainToDest(opts, mix, when, vel);
  return {};
}

function rim(opts: VoiceTrigger, vel: number): ActiveVoice {
  const { ctx, when, params } = opts;
  const mix = ctx.createGain();
  const pitch = hzFromTune(820, params.tune + (opts.tuneExtra ?? 0));
  const click = osc(ctx, "sine", pitch, when, 0.05);
  const clickG = env(ctx, when, 0.45 * vel, 0.001, 0.035 * params.decay);
  click.connect(clickG);
  clickG.connect(mix);

  const n = noiseSource(ctx, when, 0.03);
  const bp = biquad(ctx, "bandpass", 2400, 1.4);
  const nG = env(ctx, when, 0.3 * vel, 0.001, 0.022);
  n.connect(bp);
  bp.connect(nG);
  nG.connect(mix);

  chainToDest(opts, mix, when, vel);
  return {};
}

function hat(opts: VoiceTrigger, vel: number, kind: "closed" | "pedal" | "open"): ActiveVoice {
  const { ctx, when, kit, params } = opts;
  const mix = ctx.createGain();
  const freqs = [247, 318, 411, 528, 679, 866, 1110];
  const baseDecay =
    kind === "open" ? 0.42 * kit.hatDecay : kind === "pedal" ? 0.1 : 0.046 * kit.hatDecay;
  const dur = baseDecay * params.decay * (kind === "open" ? 1.6 : 1);
  const peak = kind === "open" ? 0.22 : 0.28;

  for (const f of freqs) {
    const o = osc(ctx, "square", hzFromTune(f, params.tune + (opts.tuneExtra ?? 0)), when, dur + 0.04);
    const g = env(ctx, when, peak * vel * (0.08 + Math.random() * 0.04), 0.001, dur);
    o.connect(g);
    g.connect(mix);
  }

  const n = noiseSource(ctx, when, dur + 0.04);
  const hp = biquad(ctx, "highpass", kind === "pedal" ? 4200 : 6800, 0.65);
  const nG = env(ctx, when, 0.2 * vel, 0.0015, dur);
  n.connect(hp);
  hp.connect(nG);
  nG.connect(mix);

  const outHp = biquad(ctx, "highpass", 5500, 0.5);
  mix.connect(outHp);

  const gate = ctx.createGain();
  gate.gain.setValueAtTime(1, when);
  outHp.connect(gate);
  chainToDest(opts, gate, when, vel);

  return {
    choke: () => {
      const t = ctx.currentTime;
      gate.gain.cancelScheduledValues(t);
      gate.gain.setValueAtTime(Math.max(gate.gain.value, 0.0001), t);
      gate.gain.exponentialRampToValueAtTime(0.0001, t + 0.028);
    },
    stop: () => {
      const t = ctx.currentTime;
      gate.gain.cancelScheduledValues(t);
      gate.gain.setValueAtTime(Math.max(gate.gain.value, 0.0001), t);
      gate.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);
    },
  };
}

function tom(opts: VoiceTrigger, vel: number, base: number): ActiveVoice {
  const { ctx, when, kit, params } = opts;
  const mix = ctx.createGain();
  const pitch = hzFromTune(base, params.tune + (opts.tuneExtra ?? 0));
  const dur = 0.32 * params.decay;

  const body = osc(ctx, "sine", pitch, when, dur + 0.05);
  body.frequency.exponentialRampToValueAtTime(pitch * 0.62, when + 0.09 * kit.pitchDrop);
  const bodyG = env(ctx, when, 0.72 * vel, 0.003, dur);
  body.connect(bodyG);
  bodyG.connect(mix);

  const tri = osc(ctx, "triangle", pitch * 1.01, when, dur * 0.7);
  const triG = env(ctx, when, 0.18 * vel, 0.002, dur * 0.55);
  tri.connect(triG);
  triG.connect(mix);

  const stick = noiseSource(ctx, when, 0.025);
  const hp = biquad(ctx, "highpass", 1800, 0.7);
  const stickG = env(ctx, when, 0.16 * vel, 0.001, 0.018);
  stick.connect(hp);
  hp.connect(stickG);
  stickG.connect(mix);

  chainToDest(opts, mix, when, vel);
  return {};
}

function crash(opts: VoiceTrigger, vel: number): ActiveVoice {
  const { ctx, when, kit, params } = opts;
  const mix = ctx.createGain();
  const dur = (kit.id === "tight-kit" || kit.id === "techno" ? 0.95 : 1.35) * params.decay * (kit.id === "tight-kit" ? 0.7 : 1);

  const n = noiseSource(ctx, when, dur + 0.1);
  const hp = biquad(ctx, "highpass", 700, 0.55);
  const bp = biquad(ctx, "bandpass", 4200, 0.45);
  const nG = env(ctx, when, 0.32 * vel, 0.004, dur);
  n.connect(hp);
  hp.connect(bp);
  bp.connect(nG);
  nG.connect(mix);

  const partials = [420, 612, 880, 1190, 1640, 2280, 3120];
  for (const f of partials) {
    const o = osc(ctx, "sine", hzFromTune(f, params.tune + (opts.tuneExtra ?? 0)), when, dur);
    const g = env(ctx, when, 0.035 * vel, 0.006, dur * (0.6 + Math.random() * 0.3));
    o.connect(g);
    g.connect(mix);
  }

  chainToDest(opts, mix, when, vel);
  return {};
}

function ride(opts: VoiceTrigger, vel: number): ActiveVoice {
  const { ctx, when, params } = opts;
  const mix = ctx.createGain();
  const dur = 0.85 * params.decay;
  const bell = hzFromTune(880, params.tune + (opts.tuneExtra ?? 0));

  for (const [f, amp, d] of [
    [bell, 0.16, 0.45],
    [bell * 1.49, 0.08, 0.32],
    [bell * 2.76, 0.05, 0.22],
  ] as const) {
    const o = osc(ctx, "sine", f, when, d * params.decay);
    const g = env(ctx, when, amp * vel, 0.002, d * params.decay);
    o.connect(g);
    g.connect(mix);
  }

  const n = noiseSource(ctx, when, dur);
  const hp = biquad(ctx, "highpass", 6200, 0.6);
  const nG = env(ctx, when, 0.12 * vel, 0.003, dur);
  n.connect(hp);
  hp.connect(nG);
  nG.connect(mix);

  chainToDest(opts, mix, when, vel);
  return {};
}

function cowbell(opts: VoiceTrigger, vel: number): ActiveVoice {
  const { ctx, when, params } = opts;
  const mix = ctx.createGain();
  const dur = 0.28 * params.decay;
  const a = osc(ctx, "square", hzFromTune(540, params.tune + (opts.tuneExtra ?? 0)), when, dur);
  const b = osc(ctx, "square", hzFromTune(800, params.tune + (opts.tuneExtra ?? 0)), when, dur);
  const bp = biquad(ctx, "bandpass", 720, 2.2);
  const g = env(ctx, when, 0.22 * vel, 0.002, dur);
  a.connect(bp);
  b.connect(bp);
  bp.connect(g);
  g.connect(mix);
  chainToDest(opts, mix, when, vel);
  return {};
}

function tamb(opts: VoiceTrigger, vel: number): ActiveVoice {
  const { ctx, when, params } = opts;
  const mix = ctx.createGain();
  const dur = 0.22 * params.decay;
  for (const off of [0, 0.018, 0.034]) {
    const n = noiseSource(ctx, when + off, 0.07);
    const hp = biquad(ctx, "highpass", 7000, 0.7);
    const g = env(ctx, when + off, 0.22 * vel, 0.001, 0.05);
    n.connect(hp);
    hp.connect(g);
    g.connect(mix);
  }
  const jingle = osc(ctx, "sine", hzFromTune(4200, params.tune + (opts.tuneExtra ?? 0)), when, dur);
  const jG = env(ctx, when, 0.08 * vel, 0.002, dur);
  jingle.connect(jG);
  jG.connect(mix);
  chainToDest(opts, mix, when, vel);
  return {};
}

function shaker(opts: VoiceTrigger, vel: number): ActiveVoice {
  const { ctx, when, params } = opts;
  const mix = ctx.createGain();
  const dur = 0.14 * params.decay;
  const n = noiseSource(ctx, when, dur + 0.04);
  const bp = biquad(ctx, "bandpass", 7200, 1.1);
  const g = env(ctx, when, 0.28 * vel, 0.012, dur);
  n.connect(bp);
  bp.connect(g);
  g.connect(mix);
  chainToDest(opts, mix, when, vel);
  return {};
}

function claves(opts: VoiceTrigger, vel: number): ActiveVoice {
  const { ctx, when, params } = opts;
  const mix = ctx.createGain();
  const pitch = hzFromTune(2350, params.tune + (opts.tuneExtra ?? 0));
  const o = osc(ctx, "sine", pitch, when, 0.08 * params.decay);
  o.frequency.exponentialRampToValueAtTime(pitch * 0.92, when + 0.03);
  const g = env(ctx, when, 0.42 * vel, 0.001, 0.055 * params.decay);
  o.connect(g);
  g.connect(mix);
  chainToDest(opts, mix, when, vel);
  return {};
}

export function click(ctx: BaseAudioContext, dest: AudioNode, when: number, accent: boolean) {
  const o = osc(ctx, "sine", accent ? 1400 : 900, when, 0.04);
  const g = env(ctx, when, accent ? 0.18 : 0.1, 0.001, 0.03);
  o.connect(g);
  g.connect(dest);
}
