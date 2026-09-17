# The Audiopheliac Kit

Turn a Casio Privia PX-870 into a drum machine. Pads, sequencer, USB-MIDI, WAV and GM MIDI for Ableton, Audacity, and Suno.

**Text this:** [https://raw.githack.com/VeteranAnalyticsLLC/audiopheliac/main/docs/index.html](https://raw.githack.com/VeteranAnalyticsLLC/audiopheliac/main/docs/index.html)

Repo: [VeteranAnalyticsLLC/audiopheliac](https://github.com/VeteranAnalyticsLLC/audiopheliac)

Chrome or Edge. Plug the Privia USB-B (USB to Host). Slide piano volume to 0. Hit **Play beat**.

## Modes

- **Kids** — paint a beat
- **Easy** — pads + sequencer
- **Studio** — chain, fill, 16 levels, Ableton clock, Audacity pack, Suno handoff

## Repository role and deployment

This is the browser-based Audiopheliac Kit music application, not the household
Cockpit or its AV relay. Keep those product roles distinct.

The checked-in [Pages workflow](.github/workflows/pages.yml) builds with
`npm run build:pages` and publishes `docs/` on pushes to main. A README-only
main-branch change also triggers that workflow. The static link above is the
existing distribution link, not a fresh uptime verification.

The package provides `typecheck` and `test` scripts. Its ordinary `build`
script also runs database migrations; it is not the same command as the
Pages build. Use the correct build for the intended environment.

## Local

```bash
npm install
npm run dev
```

Repository role reviewed September 17, 2026. This review did not exercise MIDI,
audio playback, or a live deployment.
