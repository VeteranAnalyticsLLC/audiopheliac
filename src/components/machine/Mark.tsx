import { SPECTRUM } from "@/lib/brand";

export function VinylMark({ className = "size-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <circle cx="32" cy="32" r="31" fill="#0A0A0B" />
      {SPECTRUM.map((color, i) => (
        <circle
          key={color}
          cx="32"
          cy="32"
          r={28 - i * 3.4}
          fill="none"
          stroke={color}
          strokeWidth={i === 0 ? 2.4 : 1.7}
          opacity={0.95}
        />
      ))}
      <circle cx="32" cy="32" r="7.5" fill="#0A0A0B" stroke="#F8E91F" strokeWidth="1.2" />
      <circle cx="32" cy="32" r="2.1" fill="#F5F5F7" />
    </svg>
  );
}
