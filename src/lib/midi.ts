import { VOICES, type VoiceId } from "@/lib/audio/types";
import { looksLikeDawPort } from "@/lib/audio/handoff";
import { looksLikePrivia, PRIVIA_SPEC } from "@/lib/privia";

export { looksLikePrivia } from "@/lib/privia";

export interface MidiDevice {
  id: string;
  name: string;
  manufacturer: string;
}

export const KEY_TO_VOICE: Record<string, VoiceId> = {
  Digit1: "kick",
  Digit2: "snare",
  Digit3: "clap",
  Digit4: "rim",
  KeyQ: "chh",
  KeyW: "phh",
  KeyE: "ohh",
  KeyR: "ride",
  KeyA: "ltom",
  KeyS: "mtom",
  KeyD: "htom",
  KeyF: "crash",
  KeyZ: "cowbell",
  KeyX: "tamb",
  KeyC: "shaker",
  KeyV: "perc",
};

export const VOICE_TO_KEY: Record<VoiceId, string> = {
  kick: "1",
  snare: "2",
  clap: "3",
  rim: "4",
  chh: "Q",
  phh: "W",
  ohh: "E",
  ride: "R",
  ltom: "A",
  mtom: "S",
  htom: "D",
  crash: "F",
  cowbell: "Z",
  tamb: "X",
  shaker: "C",
  perc: "V",
};

/** General MIDI percussion, channel 10. Note → closest kit voice + extra tune. */
const GM_TABLE: Record<number, { voice: VoiceId; tune: number }> = {
  35: { voice: "kick", tune: -2 },
  36: { voice: "kick", tune: 0 },
  37: { voice: "rim", tune: 0 },
  38: { voice: "snare", tune: 0 },
  39: { voice: "clap", tune: 0 },
  40: { voice: "snare", tune: 3 },
  41: { voice: "ltom", tune: -5 },
  42: { voice: "chh", tune: 0 },
  43: { voice: "ltom", tune: 0 },
  44: { voice: "phh", tune: 0 },
  45: { voice: "ltom", tune: 4 },
  46: { voice: "ohh", tune: 0 },
  47: { voice: "mtom", tune: 0 },
  48: { voice: "mtom", tune: 4 },
  49: { voice: "crash", tune: 0 },
  50: { voice: "htom", tune: 0 },
  51: { voice: "ride", tune: 0 },
  52: { voice: "crash", tune: -4 },
  53: { voice: "ride", tune: 5 },
  54: { voice: "tamb", tune: 0 },
  55: { voice: "crash", tune: 7 },
  56: { voice: "cowbell", tune: 0 },
  57: { voice: "crash", tune: -2 },
  58: { voice: "perc", tune: -7 },
  59: { voice: "ride", tune: -3 },
  60: { voice: "perc", tune: 4 },
  61: { voice: "perc", tune: 2 },
  62: { voice: "perc", tune: 0 },
  63: { voice: "mtom", tune: 8 },
  64: { voice: "ltom", tune: 8 },
  65: { voice: "perc", tune: 10 },
  66: { voice: "perc", tune: 8 },
  67: { voice: "perc", tune: 14 },
  68: { voice: "perc", tune: 12 },
  69: { voice: "tamb", tune: 4 },
  70: { voice: "shaker", tune: 0 },
  71: { voice: "perc", tune: 6 },
  72: { voice: "perc", tune: 9 },
  73: { voice: "shaker", tune: 5 },
  74: { voice: "shaker", tune: 8 },
  75: { voice: "perc", tune: 0 },
  76: { voice: "perc", tune: 3 },
  77: { voice: "perc", tune: -3 },
  80: { voice: "perc", tune: 16 },
  81: { voice: "perc", tune: 19 },
};

export function resolveGm(note: number): { voice: VoiceId; tune: number } | null {
  return GM_TABLE[note] ?? null;
}

/**
 * Full 88-key Privia map (A0=21 … C8=108).
 * Below C2: chromatic 808 / drum kicks.
 * C2–A5: GM drums.
 * Above: hats and perc.
 */
export function resolvePriviaNote(note: number): { voice: VoiceId; tune: number } {
  const gm = GM_TABLE[note];
  if (gm) return gm;
  if (note < 35) return { voice: "kick", tune: note - 36 };
  if (note <= 95) return { voice: "ohh", tune: note - 82 };
  return { voice: "perc", tune: note - 96 };
}

export const GM_BY_VOICE: Record<VoiceId, number> = Object.fromEntries(
  VOICES.map((v) => [v.id, v.gm]),
) as Record<VoiceId, number>;

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

export function noteName(note: number): string {
  const n = ((note % 12) + 12) % 12;
  const oct = Math.floor(note / 12) - 1;
  return `${NOTE_NAMES[n]}${oct}`;
}

export function isBlackKey(note: number): boolean {
  return [1, 3, 6, 8, 10].includes(((note % 12) + 12) % 12);
}

/** Official 88-key Privia span. */
export const PIANO_LOW = 21;
export const PIANO_HIGH = 108;

export interface MidiHandlers {
  onNoteOn: (note: number, velocity: number, deviceId: string, channel: number) => void;
  onNoteOff: (note: number, deviceId: string, channel: number) => void;
  onCc: (cc: number, value: number, channel: number) => void;
  onDevices: (inputs: MidiDevice[], outputs: MidiDevice[]) => void;
  onStart?: () => void;
  onStop?: () => void;
  onContinue?: () => void;
}

export class MidiManager {
  private access: MIDIAccess | null = null;
  private handlers: MidiHandlers;
  private outId: string | null = null;
  private unsubs: Array<() => void> = [];

  get supported(): boolean {
    return typeof navigator !== "undefined" && typeof navigator.requestMIDIAccess === "function";
  }

  get lastError(): string | null {
    return this.error;
  }

  private error: string | null = null;
  static current: MidiManager | null = null;

  constructor(handlers: MidiHandlers) {
    this.handlers = handlers;
    MidiManager.current = this;
  }

  async init(): Promise<boolean> {
    if (!this.supported) {
      this.error = "This browser has no Web MIDI. Use Chrome or Edge.";
      this.handlers.onDevices([], []);
      return false;
    }
    if (!window.isSecureContext) {
      this.error = "MIDI needs a secure page.";
      this.handlers.onDevices([], []);
      return false;
    }
    try {
      const request = navigator.requestMIDIAccess?.bind(navigator);
      if (!request) {
        this.error = "requestMIDIAccess missing.";
        this.handlers.onDevices([], []);
        return false;
      }
      this.access = await request({ sysex: false });
      this.access.onstatechange = () => this.refresh();
      this.bindInputs();
      this.refresh();
      this.error = this.access.inputs.size === 0 ? "No MIDI ports yet. Power the Privia, then tap Connect again." : null;
      return true;
    } catch (err) {
      const name = err instanceof DOMException ? err.name : "";
      if (name === "NotAllowedError" || name === "SecurityError") {
        this.error = "MIDI was blocked. Click Allow, or reset MIDI permission for this site in Chrome.";
      } else {
        this.error = "Could not open MIDI.";
      }
      this.handlers.onDevices([], []);
      return false;
    }
  }

  setOutput(id: string | null) {
    this.outId = id;
  }

  sendDrum(note: number, velocity: number, on: boolean) {
    const out = this.output();
    if (!out) return;
    const status = on ? 0x99 : 0x89;
    const vel = on ? Math.max(1, Math.min(127, Math.round(velocity * 127))) : 0;
    try {
      out.send([status, note, vel]);
    } catch {
      /* port may have vanished */
    }
  }

  sendStart() {
    this.sendRealtime(0xfa);
  }

  sendStop() {
    this.sendRealtime(0xfc);
  }

  sendContinue() {
    this.sendRealtime(0xfb);
  }

  sendClock(timestamp?: number) {
    const out = this.output();
    if (!out) return;
    try {
      if (timestamp != null) out.send([0xf8], timestamp);
      else out.send([0xf8]);
    } catch {
      /* port may have vanished */
    }
  }

  /** Mute or unmute the Privia's own Concert Grand (GM Local Control CC 122). */
  setKeyboardLocal(mutePiano: boolean, preferredName?: string | null): boolean {
    const ports = this.keyboardOutputs(preferredName);
    if (ports.length === 0) return false;
    const value = mutePiano ? 0 : 127;
    for (const port of ports) {
      void port
        .open()
        .then(() => {
          for (let ch = 0; ch < 16; ch++) {
            try {
              port.send([0xb0 | ch, PRIVIA_SPEC.localControlCc, value]);
            } catch {
              /* port may have vanished */
            }
          }
        })
        .catch(() => {
          /* host refused the port */
        });
    }
    return true;
  }

  private keyboardOutputs(preferredName?: string | null): MIDIOutput[] {
    if (!this.access) return [];
    const named: MIDIOutput[] = [];
    const matched: MIDIOutput[] = [];
    this.access.outputs.forEach((port) => {
      const name = port.name ?? "";
      if (looksLikeDawPort(name)) return;
      if (looksLikePrivia(name, port.manufacturer ?? "")) matched.push(port);
      if (preferredName && name === preferredName) named.push(port);
    });
    if (matched.length) return matched;
    if (named.length) return named;
    return [];
  }

  private sendRealtime(status: number) {
    const out = this.output();
    if (!out) return;
    try {
      out.send([status]);
    } catch {
      /* port may have vanished */
    }
  }

  dispose() {
    for (const off of this.unsubs) off();
    this.unsubs = [];
    this.access = null;
  }

  private output(): MIDIOutput | null {
    if (!this.access || !this.outId) return null;
    return this.access.outputs.get(this.outId) ?? null;
  }

  private refresh() {
    if (!this.access) return;
    const inputs: MidiDevice[] = [];
    this.access.inputs.forEach((port) => {
      inputs.push({
        id: port.id,
        name: port.name ?? "MIDI In",
        manufacturer: port.manufacturer ?? "",
      });
    });
    const outputs: MidiDevice[] = [];
    this.access.outputs.forEach((port) => {
      outputs.push({
        id: port.id,
        name: port.name ?? "MIDI Out",
        manufacturer: port.manufacturer ?? "",
      });
    });
    this.handlers.onDevices(inputs, outputs);
    this.bindInputs();
  }

  private bindInputs() {
    for (const off of this.unsubs) off();
    this.unsubs = [];
    if (!this.access) return;
    this.access.inputs.forEach((port) => {
      const handler = (ev: MIDIMessageEvent) => this.onMessage(ev, port.id);
      port.onmidimessage = handler;
      void port.open().catch(() => {
        /* some hosts refuse until the cable enumerates */
      });
      this.unsubs.push(() => {
        if (port.onmidimessage === handler) port.onmidimessage = null;
      });
    });
  }

  private onMessage(ev: MIDIMessageEvent, deviceId: string) {
    const data = ev.data;
    if (!data || data.length < 1) return;
    const status = data[0] ?? 0;
    if (status === 0xfa) {
      this.handlers.onStart?.();
      return;
    }
    if (status === 0xfb) {
      this.handlers.onContinue?.();
      return;
    }
    if (status === 0xfc) {
      this.handlers.onStop?.();
      return;
    }
    if (data.length < 2) return;
    const type = status & 0xf0;
    const channel = (status & 0x0f) + 1;
    const d1 = data[1] ?? 0;
    const d2 = data[2] ?? 0;
    if (type === 0x90 && d2 > 0) {
      this.handlers.onNoteOn(d1, d2 / 127, deviceId, channel);
      return;
    }
    if (type === 0x80 || (type === 0x90 && d2 === 0)) {
      this.handlers.onNoteOff(d1, deviceId, channel);
      return;
    }
    if (type === 0xb0) {
      this.handlers.onCc(d1, d2, channel);
    }
  }
}

export function preferredUsbLabel(inputs: MidiDevice[]): string | null {
  const named = inputs.find((d) => looksLikePrivia(d.name, d.manufacturer));
  return named?.name ?? null;
}
