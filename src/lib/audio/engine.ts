import { STUDIO_RATE, STEM_GROUPS, applyMonitor, type MonitorId } from "./io";
import { fillHits } from "@/lib/perform";
import {
  DEFAULT_VOICE_PARAMS,
  kitById,
  STEPS,
  VOICE_BY_ID,
  type KitId,
  type MidiHit,
  type PatternGrid,
  type PatternLength,
  type SeqScale,
  type VoiceId,
  type VoiceParams,
} from "./types";
import { click, triggerVoice, type ActiveVoice } from "./voices";
import { encodeWav } from "./wav";
import { GM_BY_VOICE, MidiManager, resolveGm, resolvePriviaNote } from "@/lib/midi";

export interface EngineSnapshot {
  kit: KitId;
  tempo: number;
  swing: number;
  master: number;
  metronome: boolean;
  params: Record<VoiceId, VoiceParams>;
  grid: PatternGrid;
  accents: PatternGrid;
  chance: Record<VoiceId, number>;
  sendDaw: boolean;
  scale: SeqScale;
  patternLength: PatternLength;
  fillHeld: boolean;
  monitor: MonitorId;
}

type EngineListener = {
  onStep?: (step: number) => void;
  onHit?: (voice: VoiceId, velocity: number) => void;
  onLevel?: (level: number) => void;
  onPatternEnd?: () => void;
};

export class DrumEngine {
  ctx: AudioContext | null = null;
  private master!: GainNode;
  private comp!: DynamicsCompressorNode;
  private limit!: DynamicsCompressorNode;
  private dark!: BiquadFilterNode;
  private air!: BiquadFilterNode;
  private body!: BiquadFilterNode;
  private low!: BiquadFilterNode;
  private clickBus!: GainNode;
  private analyser!: AnalyserNode;
  private analyserData: Uint8Array | null = null;
  private midi: MidiManager | null = null;
  private snap: EngineSnapshot | null = null;
  private listeners: EngineListener = {};
  private timer: number | null = null;
  private nextNoteTime = 0;
  private step = 0;
  private playing = false;
  private recording = false;
  private recStart = 0;
  private recChunksL: Float32Array[] = [];
  private recChunksR: Float32Array[] = [];
  private recProc: ScriptProcessorNode | null = null;
  private recMute: GainNode | null = null;
  private hits: MidiHit[] = [];
  private openHats: ActiveVoice[] = [];
  private held = new Map<number, { voice: VoiceId; active: ActiveVoice }>();
  private levelRaf = 0;
  private sustain = false;
  private sinkId: string | null = null;
  private nextClockTime = 0;
  private clockRunning = false;

  get audioReady() {
    return this.ctx?.state === "running";
  }

  get isPlaying() {
    return this.playing;
  }

  get isRecording() {
    return this.recording;
  }

  get recordedHits() {
    return this.hits;
  }

  setListener(l: EngineListener) {
    this.listeners = l;
  }

  attachMidi(midi: MidiManager) {
    this.midi = midi;
  }

  sync(snap: EngineSnapshot) {
    this.snap = snap;
    if (this.ctx && this.master) {
      this.master.gain.setTargetAtTime(snap.master, this.ctx.currentTime, 0.03);
      const kit = kitById(snap.kit);
      const cutoff = 18000 - kit.dark * 11000;
      this.dark.frequency.setTargetAtTime(cutoff, this.ctx.currentTime, 0.05);
      if (this.air) applyMonitor(this.air, this.body, this.low, snap.monitor);
    }
  }

  get sampleRate() {
    return this.ctx?.sampleRate ?? STUDIO_RATE;
  }

  async setOutput(deviceId: string | null) {
    this.sinkId = deviceId;
    const ctx = this.ctx as (AudioContext & { setSinkId?: (id: string) => Promise<void> }) | null;
    if (!ctx?.setSinkId) return false;
    try {
      await ctx.setSinkId(deviceId ?? "");
      return true;
    } catch {
      return false;
    }
  }

  async arm(): Promise<boolean> {
    if (!this.ctx) {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      try {
        this.ctx = new Ctor({ sampleRate: STUDIO_RATE, latencyHint: "interactive" });
      } catch {
        this.ctx = new Ctor();
      }
      this.buildGraph();
      if (this.sinkId) await this.setOutput(this.sinkId);
    }
    if (this.ctx.state === "suspended") {
      await this.ctx.resume();
    }
    this.startMeter();
    return this.ctx.state === "running";
  }

  setSustain(down: boolean) {
    this.sustain = down;
    if (!down) {
      for (const h of this.openHats) h.stop?.();
    }
  }

  hitVoice(voice: VoiceId, velocity: number, fromMidiNote?: number, tuneExtra = 0) {
    if (!this.ctx || !this.snap) return;
    const params = this.effectiveParams(voice);
    if (!params) return;
    this.fire(voice, velocity, this.ctx.currentTime, params, tuneExtra, fromMidiNote);
  }

  hitNote(note: number, velocity: number, custom?: Partial<Record<number, VoiceId>>) {
    const mapped = custom?.[note];
    const resolved = mapped ? { voice: mapped, tune: 0 } : resolvePriviaNote(note);
    this.hitVoice(resolved.voice, velocity, note, resolved.tune);
    if (this.ctx) {
      this.held.set(note, { voice: resolved.voice, active: this.lastActive });
    }
  }

  releaseNote(note: number) {
    const held = this.held.get(note);
    if (!held) return;
    this.held.delete(note);
    if (held.voice === "ohh") held.active.stop?.();
    if (this.snap?.sendDaw) {
      this.midi?.sendDrum(note >= 35 && note <= 81 ? note : GM_BY_VOICE[held.voice], 0, false);
    }
  }

  private lastActive: ActiveVoice = {};

  private fire(
    voice: VoiceId,
    velocity: number,
    when: number,
    params: VoiceParams,
    tuneExtra: number,
    midiNote?: number,
  ) {
    if (!this.ctx || !this.snap) return;
    if ((voice === "chh" || voice === "phh") && !this.sustain) {
      for (const h of this.openHats) h.choke?.();
      this.openHats = [];
    }
    const active = triggerVoice({
      ctx: this.ctx,
      dest: this.comp,
      voice,
      when,
      velocity,
      kit: kitById(this.snap.kit),
      params,
      tuneExtra,
    });
    this.lastActive = active;
    if (voice === "ohh") this.openHats.push(active);
    this.listeners.onHit?.(voice, velocity);

    const gm = midiNote && resolveGm(midiNote) ? midiNote : GM_BY_VOICE[voice];
    if (this.snap.sendDaw) {
      this.midi?.sendDrum(gm, velocity, true);
      const offAt = Math.max(40, (VOICE_BY_ID[voice].family === "cym" ? 600 : 180));
      window.setTimeout(() => this.midi?.sendDrum(gm, 0, false), offAt);
    }
    if (this.recording) {
      this.hits.push({
        note: gm,
        velocity,
        time: Math.max(0, when - this.recStart),
        duration: 0.12,
        voice,
      });
    }
  }

  play() {
    if (!this.ctx || this.playing) return;
    this.playing = true;
    this.nextNoteTime = this.ctx.currentTime + 0.05;
    if (this.snap?.sendDaw) {
      this.midi?.sendStart();
      this.nextClockTime = this.ctx.currentTime;
      this.clockRunning = true;
    }
    this.scheduler();
  }

  stop() {
    this.playing = false;
    if (this.timer != null) {
      window.clearTimeout(this.timer);
      this.timer = null;
    }
    if (this.clockRunning) this.midi?.sendStop();
    this.clockRunning = false;
    this.step = 0;
    this.listeners.onStep?.(0);
  }

  togglePlay() {
    if (this.playing) {
      this.playing = false;
      if (this.timer != null) {
        window.clearTimeout(this.timer);
        this.timer = null;
      }
      if (this.clockRunning) this.midi?.sendStop();
      this.clockRunning = false;
    } else {
      this.play();
    }
  }

  startRecord() {
    if (!this.ctx || this.recording) return;
    this.recording = true;
    this.hits = [];
    this.recStart = this.ctx.currentTime;
    this.recChunksL = [];
    this.recChunksR = [];
    this.recProc = this.ctx.createScriptProcessor(4096, 2, 2);
    this.recMute = this.ctx.createGain();
    this.recMute.gain.value = 0;
    this.recProc.onaudioprocess = (ev) => {
      this.recChunksL.push(ev.inputBuffer.getChannelData(0).slice());
      this.recChunksR.push(ev.inputBuffer.getChannelData(1).slice());
    };
    this.limit.connect(this.recProc);
    this.recProc.connect(this.recMute);
    this.recMute.connect(this.ctx.destination);
  }

  stopRecord(): { wav: Blob | null; hits: MidiHit[] } {
    this.recording = false;
    if (this.recProc) {
      try {
        this.recProc.disconnect();
      } catch {
        /* already gone */
      }
      this.recProc.onaudioprocess = null;
      this.recProc = null;
    }
    if (this.recMute) {
      try {
        this.recMute.disconnect();
      } catch {
        /* already gone */
      }
      this.recMute = null;
    }
    const wav = this.flattenRecording();
    return { wav, hits: [...this.hits] };
  }

  async bouncePattern(bars: number, only?: Set<VoiceId>): Promise<Blob | null> {
    if (!this.snap) return null;
    const bpm = this.snap.tempo;
    const seconds = (bars * 4 * 60) / bpm;
    const sr = STUDIO_RATE;
    const offline = new OfflineAudioContext(2, Math.ceil(seconds * sr), sr);
    const dest = offline.createGain();
    dest.gain.value = this.snap.master;
    const comp = offline.createDynamicsCompressor();
    comp.threshold.value = -16;
    comp.ratio.value = 3;
    comp.attack.value = 0.003;
    comp.release.value = 0.12;
    dest.connect(comp);
    comp.connect(offline.destination);

    const kit = kitById(this.snap.kit);
    const stepDur = stepSeconds(this.snap.tempo, this.snap.scale);
    const len = this.snap.patternLength || STEPS;
    const totalSteps = Math.max(len, bars * len);
    for (let i = 0; i < totalSteps; i++) {
      const step = i % len;
      let when = i * stepDur;
      if (this.snap.scale === "16th" && step % 2 === 1) when += stepDur * this.snap.swing;
      for (const voice of Object.keys(this.snap.grid) as VoiceId[]) {
        if (!this.snap.grid[voice][step]) continue;
        if (only && !only.has(voice)) continue;
        const chance = this.snap.chance[voice] ?? 1;
        if (chance < 1 && Math.random() > chance) continue;
        const params = this.effectiveParams(voice);
        if (!params) continue;
        triggerVoice({
          ctx: offline,
          dest,
          voice,
          when,
          velocity: this.snap.accents[voice]?.[step] ? 1 : 0.8,
          kit,
          params,
        });
      }
    }

    const rendered = await offline.startRendering();
    return encodeWav(
      [rendered.getChannelData(0), rendered.getChannelData(1)],
      rendered.sampleRate,
    );
  }

  async bounceStems(bars: number): Promise<{ id: string; blob: Blob }[]> {
    const out: { id: string; blob: Blob }[] = [];
    for (const group of STEM_GROUPS) {
      const blob = await this.bouncePattern(bars, new Set(group.voices as VoiceId[]));
      if (blob) out.push({ id: group.id, blob });
    }
    return out;
  }

  patternHits(bars: number): MidiHit[] {
    if (!this.snap) return [];
    const bpm = this.snap.tempo;
    const stepDur = stepSeconds(bpm, this.snap.scale);
    const len = this.snap.patternLength || STEPS;
    const totalSteps = Math.max(len, bars * len);
    const hits: MidiHit[] = [];
    for (let i = 0; i < totalSteps; i++) {
      const step = i % len;
      let when = i * stepDur;
      if (this.snap.scale === "16th" && step % 2 === 1) when += stepDur * this.snap.swing;
      for (const voice of Object.keys(this.snap.grid) as VoiceId[]) {
        if (!this.snap.grid[voice][step]) continue;
        if (!this.effectiveParams(voice)) continue;
        hits.push({
          note: GM_BY_VOICE[voice],
          velocity: this.snap.accents[voice]?.[step] ? 1 : 0.8,
          time: when,
          duration: 0.12,
          voice,
        });
      }
    }
    return hits;
  }

  stopAll() {
    this.stop();
    if (this.recording) this.stopRecord();
    if (this.levelRaf) cancelAnimationFrame(this.levelRaf);
  }

  private buildGraph() {
    if (!this.ctx) return;
    this.master = this.ctx.createGain();
    this.master.gain.value = this.snap?.master ?? 0.85;
    this.comp = this.ctx.createDynamicsCompressor();
    this.comp.threshold.value = -18;
    this.comp.knee.value = 12;
    this.comp.ratio.value = 3.2;
    this.comp.attack.value = 0.004;
    this.comp.release.value = 0.14;
    this.limit = this.ctx.createDynamicsCompressor();
    this.limit.threshold.value = -1.8;
    this.limit.knee.value = 0;
    this.limit.ratio.value = 18;
    this.limit.attack.value = 0.001;
    this.limit.release.value = 0.05;
    this.dark = this.ctx.createBiquadFilter();
    this.dark.type = "lowpass";
    this.dark.frequency.value = 18000;
    this.air = this.ctx.createBiquadFilter();
    this.body = this.ctx.createBiquadFilter();
    this.low = this.ctx.createBiquadFilter();
    applyMonitor(this.air, this.body, this.low, this.snap?.monitor ?? "hs7");
    this.clickBus = this.ctx.createGain();
    this.clickBus.gain.value = 0.7;
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 256;
    this.analyser.smoothingTimeConstant = 0.72;
    this.analyserData = new Uint8Array(this.analyser.frequencyBinCount);

    this.clickBus.connect(this.master);
    this.comp.connect(this.dark);
    this.dark.connect(this.low);
    this.low.connect(this.body);
    this.body.connect(this.air);
    this.air.connect(this.limit);
    this.limit.connect(this.master);
    this.master.connect(this.analyser);
    this.master.connect(this.ctx.destination);
  }

  private effectiveParams(voice: VoiceId): VoiceParams | null {
    if (!this.snap) return DEFAULT_VOICE_PARAMS;
    const p = this.snap.params[voice];
    if (p.mute) return null;
    const anySolo = Object.values(this.snap.params).some((x) => x.solo);
    if (anySolo && !p.solo) return null;
    return p;
  }

  private scheduler = () => {
    if (!this.ctx || !this.playing || !this.snap) return;
    const ahead = 0.12;
    while (this.nextNoteTime < this.ctx.currentTime + ahead) {
      this.scheduleStep(this.step, this.nextNoteTime);
      this.advance();
    }
    if (this.clockRunning && this.snap.sendDaw && this.midi) {
      const pulse = 60 / Math.max(40, this.snap.tempo) / 24;
      while (this.nextClockTime < this.ctx.currentTime + ahead) {
        const delay = Math.max(0, this.nextClockTime - this.ctx.currentTime);
        this.midi.sendClock(performance.now() + delay * 1000);
        this.nextClockTime += pulse;
      }
    }
    this.timer = window.setTimeout(this.scheduler, 25);
  };

  private scheduleStep(step: number, when: number) {
    if (!this.ctx || !this.snap) return;
    const t = when;
    window.setTimeout(
      () => this.listeners.onStep?.(step),
      Math.max(0, (when - this.ctx.currentTime) * 1000),
    );
    const clock = this.snap.scale === "triplet" ? 3 : 4;
    if (this.snap.metronome && step % clock === 0) {
      click(this.ctx, this.clickBus, t, step === 0);
    }
    const play = (voice: VoiceId, vel: number) => {
      const params = this.effectiveParams(voice);
      if (!params) return;
      this.fire(voice, vel, t, params, 0);
    };
    for (const voice of Object.keys(this.snap.grid) as VoiceId[]) {
      if (!this.snap.grid[voice][step]) continue;
      const chance = this.snap.chance[voice] ?? 1;
      if (chance < 1 && Math.random() > chance) continue;
      const accent = this.snap.accents[voice]?.[step];
      play(voice, accent ? 1 : 0.78);
    }
    if (this.snap.fillHeld) {
      for (const voice of fillHits(step)) {
        if (this.snap.grid[voice][step]) continue;
        play(voice, 0.72);
      }
    }
  }

  private advance() {
    if (!this.snap || !this.ctx) return;
    const bpm = this.snap.tempo;
    let unit = 60 / bpm / 4;
    if (this.snap.scale === "8th") unit = 60 / bpm / 2;
    if (this.snap.scale === "triplet") unit = 60 / bpm / 3;
    if (this.snap.scale === "16th" && this.step % 2 === 0) {
      this.nextNoteTime += unit * (1 + this.snap.swing);
    } else if (this.snap.scale === "16th") {
      this.nextNoteTime += unit * (1 - this.snap.swing);
    } else {
      this.nextNoteTime += unit;
    }
    const len = this.snap.patternLength || STEPS;
    this.step += 1;
    if (this.step >= len) {
      this.step = 0;
      this.listeners.onPatternEnd?.();
    }
  }

  private flattenRecording(): Blob | null {
    if (!this.ctx || this.recChunksL.length === 0) return null;
    const length = this.recChunksL.reduce((n, c) => n + c.length, 0);
    const L = new Float32Array(length);
    const R = new Float32Array(length);
    let o = 0;
    for (let i = 0; i < this.recChunksL.length; i++) {
      L.set(this.recChunksL[i] ?? [], o);
      R.set(this.recChunksR[i] ?? this.recChunksL[i] ?? [], o);
      o += this.recChunksL[i]?.length ?? 0;
    }
    return encodeWav([L, R], this.ctx.sampleRate);
  }

  private startMeter() {
    if (this.levelRaf) return;
    const tick = () => {
      if (this.analyser && this.analyserData) {
        this.analyser.getByteTimeDomainData(this.analyserData as unknown as Uint8Array<ArrayBuffer>);
        let sum = 0;
        for (let i = 0; i < this.analyserData.length; i++) {
          const v = ((this.analyserData[i] ?? 128) - 128) / 128;
          sum += v * v;
        }
        const rms = Math.sqrt(sum / this.analyserData.length);
        this.listeners.onLevel?.(Math.min(1, rms * 3.2));
      }
      this.levelRaf = requestAnimationFrame(tick);
    };
    this.levelRaf = requestAnimationFrame(tick);
  }
}

function stepSeconds(tempo: number, scale: SeqScale) {
  if (scale === "8th") return 60 / tempo / 2;
  if (scale === "triplet") return 60 / tempo / 3;
  return 60 / tempo / 4;
}

let singleton: DrumEngine | null = null;

export function getEngine(): DrumEngine {
  if (!singleton) singleton = new DrumEngine();
  return singleton;
}
