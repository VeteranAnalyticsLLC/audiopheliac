interface MIDIOptions {
  sysex?: boolean;
  software?: boolean;
}

interface MIDIMessageEvent extends Event {
  data: Uint8Array | null;
}

interface MIDIPort extends EventTarget {
  id: string;
  name?: string;
  manufacturer?: string;
  state: "connected" | "disconnected";
  type: "input" | "output";
}

interface MIDIInput extends MIDIPort {
  type: "input";
  onmidimessage: ((ev: MIDIMessageEvent) => void) | null;
}

interface MIDIOutput extends MIDIPort {
  type: "output";
  send(data: number[] | Uint8Array, timestamp?: number): void;
}

interface MIDIInputMap {
  forEach(callback: (port: MIDIInput, key: string) => void): void;
  get(id: string): MIDIInput | undefined;
}

interface MIDIOutputMap {
  forEach(callback: (port: MIDIOutput, key: string) => void): void;
  get(id: string): MIDIOutput | undefined;
}

interface MIDIAccess extends EventTarget {
  inputs: MIDIInputMap;
  outputs: MIDIOutputMap;
  onstatechange: ((ev: Event) => void) | null;
}

interface Navigator {
  requestMIDIAccess?: (options?: MIDIOptions) => Promise<MIDIAccess>;
}
