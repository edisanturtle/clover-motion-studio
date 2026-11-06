# Changelog

All notable changes to **Clover Motion Studio** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2026-11-06

### Added
- **Animos 3D & Perspective Showcase Engine (`src/engine/animosRenderer.js`, `src/constants/animosTemplates.js`)**:
  - 25+ 3D and perspective showcase templates across 9 categories (*3D & Perspective*, *Multiscene*, *Isometric*, *Orbit*, *Carousel & Flow*, *Grid*, *Spotlight & Focus*, *Reveal & Wipe*, *Stack & Scatter*).
  - Multi-image media slot uploader (`Media · N slots`), Card Size, Card Aspect (`1:1`, `16:9`, `4:3`, `3:4`, `9:16`), Camera Tilt, Depth Fade, and Animos Backdrop Gradients.
- **EffectCraft Procedural Shaders & Post-Processing FX Rack (`src/engine/effectCraftRenderer.js`, `src/constants/effectCraftEffects.js`)**:
  - 8 procedural background shaders (*Aurora Veil*, *Pastel Plasma*, *Magma Flow*, *Voronoi Crystals*, *Cyber Perspective Grid*, *CC Particle World*, *Audio Spectrum Ring*).
  - 10 stackable post-processing effects (*Phosphor Glow*, *Chromatic Aberration*, *VR Digital Glitch*, *CRT Scanlines*, *CC Ball Action / Halftone*, *ASCII Matrix*, *CC Kaleida*, *Echo Motion Trails*, *Pixel Sort / Smear*, *Add Grain & Vignette*) with audio-reactive beat modulation.
- **Master Sound DSP & Live Event SFX Sampler (`src/engine/audioEngine.js`, `src/components/layout/BottomAudioBar.jsx`)**:
  - Real-time Web Audio Master DSP chain with *Lowpass Filter*, *Sub-Bass Boost EQ*, and *Dub Echo Delay*.
  - 8 one-shot synthesized Live Event SFX trigger pads (*808 Sub Drop*, *Whoosh Riser*, *Glitch Stutter*, *Synth Laser*, *Camera Shutter*, *Clover Stinger*, *Vinyl Brake*, *Festival Uplift*).
- **Social Media & Event Media Publishing (`src/components/modals/ExportModal.jsx`, `src/components/modals/FullscreenPreviewModal.jsx`)**:
  - Expanded aspect ratios to 6 formats (`4:5`, `1:1`, `9:16`, `16:9`, `4:3`, `3:4`) and 8 one-click presets for social media and event LED walls/totems.
  - Added chromeless **Clean Stage Output** mode in Fullscreen Preview for live event projection.
- **Engineering Governance & Architecture Documentation**:
  - Added `.agents/skills.json`, `AGENTS.md`, `turbo.json`, `docs/adr/`, `conductor/`, `design-system/clover-motion-studio/MASTER.md`, and `src/types/studio.d.ts`.

## [1.0.0] - 2026-11-06

### Added
- Initial release of **Clover Motion Studio (`clover.motion`)** featuring 28 kinetic typography & graphic templates, 15 poster layouts, 24 procedural synth tracks, multi-track keyframe timeline, and PNG/WebM/MP4/JSON export.
