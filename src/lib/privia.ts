/**
 * Casio Privia — published USB-MIDI spec (class-compliant USB to Host).
 * Sources: Casio MIDI Implementation (PX series), PX-S1100/S3100/S5000
 * product specs, and Casio Music Space connect docs.
 *
 * Port name on the computer: "CASIO USB-MIDI" or "CASIO [model] USB".
 * Cable: USB Type-B (USB to Host) → computer. No driver on current PX-S.
 */
export const PRIVIA_SPEC = {
  brand: "Casio",
  series: "Privia",
  keys: 88,
  lowest: 21,
  highest: 108,
  lowestName: "A0",
  highestName: "C8",
  keyboardChannel: 1,
  velocityMin: 1,
  velocityMax: 127,
  noteOffVelocity: 0,
  aftertouch: false,
  pitchBendFromKeys: false,
  damperCc: 64,
  sostenutoCc: 66,
  softCc: 67,
  localControlCc: 122,
  localControl: {
    hold: "FUNCTION",
    key: "C1",
    keyNote: 24,
    defaultOn: true,
    longBeepMeansOff: true,
  },
  usb: {
    jack: "USB Type-B (USB to Host)",
    classCompliant: true,
    audioOverUsb: false,
    portNames: ["CASIO USB-MIDI", "CASIO USB"],
  },
} as const;

export const PRIVIA_MODELS = [
  { id: "px-870", name: "PX-870", usb: "Type-B class-compliant" },
  { id: "px-s1100", name: "PX-S1100", usb: "Type-B class-compliant" },
  { id: "px-s3100", name: "PX-S3100", usb: "Type-B class-compliant" },
  { id: "px-s5000", name: "PX-S5000", usb: "Type-B class-compliant" },
  { id: "px-s6000", name: "PX-S6000", usb: "Type-B class-compliant" },
  { id: "px-s7000", name: "PX-S7000", usb: "Type-B class-compliant" },
  { id: "px-s1000", name: "PX-S1000", usb: "Type-B class-compliant" },
  { id: "px-160", name: "PX-160", usb: "Type-B class-compliant" },
  { id: "px-770", name: "PX-770", usb: "Type-B class-compliant" },
  { id: "px-870", name: "PX-870", usb: "Type-B class-compliant" },
] as const;

export interface PriviaPort {
  id: string;
  name: string;
  usb: boolean;
  modelHint: string | null;
}

export function looksLikePrivia(name: string, manufacturer = ""): boolean {
  return identifyPrivia(name, manufacturer) !== null;
}

export function identifyPrivia(name: string, manufacturer = ""): Omit<PriviaPort, "id"> | null {
  const raw = `${name} ${manufacturer}`.trim();
  const n = raw.toLowerCase();
  if (!n) return null;
  const hit =
    n.includes("privia") ||
    n.includes("pravia") ||
    n.includes("casio") ||
    n.includes("celviano") ||
    /px[-\s]?s?\d/.test(n) ||
    n.includes("usb-midi") ||
    n.includes("usb midi") ||
    n.includes("digital piano") ||
    n.includes("electronic keyboard") ||
    n.includes("midiin") ||
    n.includes("midi in");
  if (!hit) return null;
  const model = PRIVIA_MODELS.find((m) => n.includes(m.id) || n.includes(m.name.toLowerCase()));
  return {
    name: name || "CASIO USB-MIDI",
    usb: n.includes("usb") || n.includes("casio"),
    modelHint: model?.name ?? (n.includes("usb-midi") ? "CASIO USB-MIDI" : null),
  };
}

export function findPriviaPort<T extends { id: string; name: string; manufacturer?: string }>(
  ports: T[],
): (T & { specName: string }) | null {
  for (const port of ports) {
    const info = identifyPrivia(port.name, port.manufacturer ?? "");
    if (info) return { ...port, specName: info.modelHint ?? port.name };
  }
  return null;
}

export function formatPriviaLink(portName: string | null): string {
  if (!portName) return "USB · waiting for CASIO USB-MIDI";
  return `USB · ${portName}`;
}
