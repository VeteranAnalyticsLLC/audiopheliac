/** Studio audio I/O — MOTU M4 and Focusrite Scarlett (class-compliant USB). */

export const STUDIO_RATE = 48000;

export interface AudioPort {
  id: string;
  label: string;
  kind: "input" | "output";
  family: "scarlett" | "motu" | "other";
}

export function identifyInterface(label: string): AudioPort["family"] {
  const n = label.toLowerCase();
  if (n.includes("scarlett") || n.includes("focusrite")) return "scarlett";
  if (n.includes("motu") || /\bm[24]\b/.test(n) || n.includes("motu m")) return "motu";
  return "other";
}

export function looksLikeStudioInterface(label: string): boolean {
  return identifyInterface(label) !== "other";
}

export function formatInterface(port: AudioPort): string {
  if (port.family === "scarlett") return `${port.label} · Scarlett`;
  if (port.family === "motu") return `${port.label} · MOTU`;
  return port.label;
}

export function pickPreferredOutput(ports: AudioPort[]): AudioPort | null {
  return ports.find((p) => p.family === "scarlett") ?? ports.find((p) => p.family === "motu") ?? null;
}

export async function unlockAudioLabels(): Promise<void> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) return;
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      video: false,
    });
    for (const t of stream.getTracks()) t.stop();
  } catch {
    /* permission optional — labels may stay anonymous */
  }
}

export async function listAudioPorts(): Promise<{ inputs: AudioPort[]; outputs: AudioPort[] }> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.enumerateDevices) {
    return { inputs: [], outputs: [] };
  }
  const devices = await navigator.mediaDevices.enumerateDevices();
  const inputs: AudioPort[] = [];
  const outputs: AudioPort[] = [];
  for (const d of devices) {
    if (d.kind !== "audioinput" && d.kind !== "audiooutput") continue;
    if (!d.deviceId || d.deviceId === "default" || d.deviceId === "communications") continue;
    const label = d.label || (d.kind === "audiooutput" ? "Audio out" : "Audio in");
    const port: AudioPort = {
      id: d.deviceId,
      label,
      kind: d.kind === "audiooutput" ? "output" : "input",
      family: identifyInterface(label),
    };
    if (port.kind === "output") outputs.push(port);
    else inputs.push(port);
  }
  return { inputs, outputs };
}

export function loopbackHint(family: AudioPort["family"]): string {
  if (family === "scarlett") {
    return "Scarlett Solo 4th Gen loopback is inputs 3–4 in Ableton or Audacity. Mute that track’s output so it does not feed back.";
  }
  if (family === "motu") {
    return "MOTU M4 loopback is Loopback 1–2. Set the computer output to the M4, then record those inputs in the DAW.";
  }
  return "Send this kit to the interface outputs. In the DAW, record the interface loopback inputs.";
}

export type MonitorId = "hs7" | "scarlett" | "motu" | "phones";

export const MONITORS: { id: MonitorId; name: string; blurb: string }[] = [
  { id: "hs7", name: "HS7 + sub", blurb: "Yamaha HS7 / LSR310S — presence and a tight floor." },
  { id: "scarlett", name: "Scarlett", blurb: "Focusrite Solo path, almost flat, a little air." },
  { id: "motu", name: "MOTU M4", blurb: "M4 mains — honest, wide, very little color." },
  { id: "phones", name: "M50x", blurb: "ATH-M50x — a bit more mid, less room." },
];

export function applyMonitor(
  air: BiquadFilterNode,
  body: BiquadFilterNode,
  low: BiquadFilterNode,
  id: MonitorId,
) {
  air.type = "highshelf";
  body.type = "peaking";
  low.type = "lowshelf";
  if (id === "hs7") {
    air.frequency.value = 9000;
    air.gain.value = 1.4;
    body.frequency.value = 2200;
    body.Q.value = 0.8;
    body.gain.value = 1.6;
    low.frequency.value = 80;
    low.gain.value = 1.1;
  } else if (id === "scarlett") {
    air.frequency.value = 11000;
    air.gain.value = 0.8;
    body.frequency.value = 1800;
    body.Q.value = 0.7;
    body.gain.value = 0.4;
    low.frequency.value = 70;
    low.gain.value = 0.3;
  } else if (id === "motu") {
    air.frequency.value = 12000;
    air.gain.value = 0.3;
    body.frequency.value = 1600;
    body.Q.value = 0.7;
    body.gain.value = 0;
    low.frequency.value = 60;
    low.gain.value = 0.2;
  } else {
    air.frequency.value = 7000;
    air.gain.value = 1.8;
    body.frequency.value = 2800;
    body.Q.value = 0.9;
    body.gain.value = 2.2;
    low.frequency.value = 90;
    low.gain.value = -0.6;
  }
}

export const STEM_GROUPS: { id: string; name: string; voices: VoiceLike[] }[] = [
  { id: "kick", name: "kick", voices: ["kick"] },
  { id: "snare", name: "snare", voices: ["snare", "clap", "rim"] },
  { id: "hats", name: "hats", voices: ["chh", "phh", "ohh", "ride"] },
  {
    id: "room",
    name: "room",
    voices: ["ltom", "mtom", "htom", "crash", "cowbell", "tamb", "shaker", "perc"],
  },
];

type VoiceLike =
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
