/**
 * The Audiopheliac — Phase 1 brand tokens of record (2026-04-21).
 * Source: assets/Branding_Kit.md / site/assets/css/tokens.css
 * Canonical mark: rainbow-spectrum vinyl on near-black.
 */
export const BRAND = {
  name: "The Audiopheliac",
  product: "Kit",
  tagline: "Where every cable, waveform, and decibel earns its keep.",
  domain: "theaudiopheliac.com",
  shareUrl: "https://raw.githack.com/VeteranAnalyticsLLC/audiopheliac/main/docs/index.html",
  piano: "Casio Privia PX-870WE",
  ink: "#0A0A0B",
  paper: "#F5F5F7",
  hairline: "#FFFFFF",
  yellow: "#F8E91F",
  lightGreen: "#99E257",
  green: "#41D99A",
  teal: "#0ABED3",
  blue: "#0F82DF",
  violet: "#5E54D4",
} as const;

export const SPECTRUM = [
  BRAND.yellow,
  BRAND.lightGreen,
  BRAND.green,
  BRAND.teal,
  BRAND.blue,
  BRAND.violet,
] as const;
