import type { MidiHit } from "./types";

const PPQ = 480;

export function hitsToMidi(hits: MidiHit[], bpm: number): Blob {
  const usPerQuarter = Math.round(60_000_000 / Math.max(40, Math.min(220, bpm)));
  const tempoTrack: number[] = [];
  writeMeta(tempoTrack, 0, 0x51, [usPerQuarter >> 16, (usPerQuarter >> 8) & 0xff, usPerQuarter & 0xff]);
  writeMeta(tempoTrack, 0, 0x2f, []);

  const noteTrack: number[] = [];
  const events: { tick: number; bytes: number[] }[] = [];

  for (const hit of hits) {
    const start = secondsToTicks(hit.time, bpm);
    const end = secondsToTicks(hit.time + Math.max(0.04, hit.duration), bpm);
    const vel = Math.max(1, Math.min(127, Math.round(hit.velocity * 127)));
    events.push({ tick: start, bytes: [0x99, hit.note, vel] });
    events.push({ tick: end, bytes: [0x89, hit.note, 0] });
  }
  events.sort((a, b) => a.tick - b.tick || a.bytes[0] - b.bytes[0]);

  let last = 0;
  for (const ev of events) {
    writeVarLen(noteTrack, ev.tick - last);
    noteTrack.push(...ev.bytes);
    last = ev.tick;
  }
  writeMeta(noteTrack, 0, 0x2f, []);

  const bytes = [
    ...encodeChunk("MThd", [0, 1, 0, 2, (PPQ >> 8) & 0xff, PPQ & 0xff]),
    ...encodeChunk("MTrk", tempoTrack),
    ...encodeChunk("MTrk", noteTrack),
  ];
  return new Blob([new Uint8Array(bytes)], { type: "audio/midi" });
}

function secondsToTicks(sec: number, bpm: number): number {
  return Math.max(0, Math.round((sec * bpm * PPQ) / 60));
}

function encodeChunk(type: string, data: number[]): number[] {
  const out: number[] = [];
  for (const ch of type) out.push(ch.charCodeAt(0));
  const len = data.length;
  out.push((len >>> 24) & 0xff, (len >>> 16) & 0xff, (len >>> 8) & 0xff, len & 0xff);
  out.push(...data);
  return out;
}

function writeMeta(track: number[], delta: number, type: number, data: number[]) {
  writeVarLen(track, delta);
  track.push(0xff, type);
  writeVarLen(track, data.length);
  track.push(...data);
}

function writeVarLen(track: number[], value: number) {
  let v = Math.max(0, value);
  const bytes = [v & 0x7f];
  v >>= 7;
  while (v > 0) {
    bytes.unshift((v & 0x7f) | 0x80);
    v >>= 7;
  }
  track.push(...bytes);
}
