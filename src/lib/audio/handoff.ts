import { kitById, type KitId, type MidiHit } from "./types";
import { hitsToMidi } from "./midi-file";
import { downloadBlob, stamp } from "./wav";
import { textBlob, zipBlobs } from "./zip";

export { stamp } from "./wav";

export const SUNO_STUDIO = "https://suno.com/create";
export const SUNO_STUDIO_APP = "https://suno.com/studio-welcome";

export function looksLikeDawPort(name: string): boolean {
  return /iac|loopmidi|loopbe|rtmidi|virtual|ableton|bus\s*\d|midiox|loopback/i.test(name);
}

export function sunoPrompt(kit: KitId, tempo: number): string {
  const meta = kitById(kit);
  return [
    `Drum reference only, ${Math.round(tempo)} BPM, 4/4.`,
    `${meta.name}: ${meta.description}`,
    "Lock to this pocket. Add bass and melody. Do not replace the drums unless they stay on this grid.",
  ].join(" ");
}

export function audacityLabels(hits: MidiHit[], bars: number, tempo: number): string {
  const bar = (60 / tempo) * 4;
  const lines: string[] = [];
  for (let i = 0; i < bars; i++) {
    const t = i * bar;
    lines.push(`${t.toFixed(6)}\t${(t + bar).toFixed(6)}\tBar ${i + 1}`);
  }
  for (const hit of hits) {
    const name = hit.voice ?? `n${hit.note}`;
    lines.push(`${hit.time.toFixed(6)}\t${(hit.time + 0.08).toFixed(6)}\t${name}`);
  }
  return lines.join("\n") + "\n";
}

export async function buildAbletonSession(opts: {
  mix: Blob;
  stems: { id: string; blob: Blob }[];
  hits: MidiHit[];
  tempo: number;
  kit: KitId;
  bars: number;
}): Promise<Blob> {
  const midi = hitsToMidi(opts.hits, opts.tempo);
  const readme = textBlob(
    [
      "Audiopheliac Kit → Ableton Live",
      "",
      `Tempo ${Math.round(opts.tempo)} BPM · ${opts.bars} bars · ${kitById(opts.kit).name}`,
      "",
      "1. Drop Audiopheliac-Kit.mid on a MIDI track. Live reads the tempo.",
      "2. Set the track to a Drum Rack or GM drum device. Notes are GM channel 10.",
      "3. Drop Mix.wav or the Stems folder on audio tracks at 48 kHz.",
      "4. For live play: I/O → MIDI out = IAC Driver (Mac) or loopMIDI (Windows),",
      "   then hit Play into Live. Clock + start/stop follow this kit.",
      "",
    ].join("\n"),
  );
  const files = [
    { name: "Audiopheliac-Kit.mid", blob: midi },
    { name: "Mix.wav", blob: opts.mix },
    { name: "Ableton.txt", blob: readme },
    ...opts.stems.map((s) => ({ name: `Stems/${s.id}.wav`, blob: s.blob })),
  ];
  return zipBlobs(files);
}

export async function buildAudacityProject(opts: {
  mix: Blob;
  stems: { id: string; blob: Blob }[];
  hits: MidiHit[];
  tempo: number;
  bars: number;
}): Promise<Blob> {
  const labels = textBlob(audacityLabels(opts.hits, opts.bars, opts.tempo));
  const lof = textBlob(
    ["window", 'file "Mix.wav"', ...opts.stems.map((s) => `file "Stems/${s.id}.wav"`)].join("\n") + "\n",
  );
  const readme = textBlob(
    [
      "Audiopheliac Kit → Audacity",
      "",
      `Project rate 48000 Hz · ${Math.round(opts.tempo)} BPM · ${opts.bars} bars`,
      "",
      "File → Open → Mix.wav  (or drag the whole folder).",
      "File → Import → Labels → Labels.txt for bar and hit markers.",
      "File → Import → Audio the Stems if you want separate tracks.",
      "Live capture: record Scarlett loopback 3–4 or MOTU Loopback 1–2 at 48 kHz.",
      "",
    ].join("\n"),
  );
  return zipBlobs([
    { name: "Mix.wav", blob: opts.mix },
    { name: "Labels.txt", blob: labels },
    { name: "project.lof", blob: lof },
    { name: "Audacity.txt", blob: readme },
    ...opts.stems.map((s) => ({ name: `Stems/${s.id}.wav`, blob: s.blob })),
  ]);
}

export async function sendToSuno(opts: { wav: Blob; prompt: string }): Promise<void> {
  try {
    await navigator.clipboard.writeText(opts.prompt);
  } catch {
    /* clipboard may be blocked */
  }
  const file = new File([opts.wav], `audiopheliac-suno-${stamp()}.wav`, { type: "audio/wav" });
  const payload = { files: [file], title: "Audiopheliac drums", text: opts.prompt };
  const nav = navigator as Navigator & {
    canShare?: (d: unknown) => boolean;
    share?: (d: unknown) => Promise<void>;
  };
  if (nav.share && nav.canShare?.(payload)) {
    try {
      await nav.share(payload);
      window.open(SUNO_STUDIO, "_blank", "noopener");
      return;
    } catch {
      /* user cancelled or share failed — fall through */
    }
  }
  downloadBlob(opts.wav, file.name);
  window.open(SUNO_STUDIO, "_blank", "noopener");
}

export function downloadSession(blob: Blob, dest: "ableton" | "audacity") {
  downloadBlob(blob, `audiopheliac-${dest}-${stamp()}.zip`);
}
