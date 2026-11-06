<div align="center">

<img src="public/favicon.svg" alt="Clover Motion Logo" width="84" height="84" />

# Clover Motion Studio (`clover.motion`) — v2.0

**All-in-One Creative Studio for Kinetic Typography, 3D Media Showcases, Procedural Shaders/FX, Web Audio DSP, and Social & Event Media Publishing**

[![CI](https://github.com/edisanturtle/clover-motion-studio/actions/workflows/ci.yml/badge.svg)](https://github.com/edisanturtle/clover-motion-studio/actions/workflows/ci.yml)
[![Next.js](https://img.shields.io/badge/Next.js-16.2-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2-149eca?logo=react)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.0-38bdf8?logo=tailwindcss)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-16a34a.svg)](./LICENSE)

</div>

---

## Overview

**Clover Motion Studio v2.0** combines four creative production workflows into a single browser-native studio:
1. **Design & Kinetic Typography (`Clover Motion`)**: 28+ curated templates, 15 Swiss poster layout blueprints, custom font uploads (`.ttf`, `.otf`, `.woff`, `.woff2`), and Brand Kits.
2. **3D & Perspective Media Showcases (`Animos Engine`)**: 25+ interactive 3D card templates across 9 categories (*3D Ring*, *3D Globe*, *3D Sphere Wall*, *3D Spiral*, *3D Tunnel*, *Isometric Stack*, *Cover Flow*, *Orbit*, and *Modular Grid*) with custom multi-image slot uploads.
3. **Procedural Shaders & Post-Processing FX Rack (`EffectCraft Engine`)**: 8 generative background shaders (*Aurora Veil*, *Pastel Plasma*, *Magma Flow*, *Voronoi Crystals*, *Cyber Perspective Grid*, *CC Particle World*, *Audio Spectrum Ring*) and 10 stackable post-processing effects (*Phosphor Glow*, *Chromatic Aberration*, *VR Digital Glitch*, *CRT Scanlines*, *CC Ball Action / Halftone*, *ASCII Matrix*, *CC Kaleida*, *Echo Motion Trails*, *Pixel Sort*, *Film Grain & Vignette*).
4. **Web Audio Synthesizer, Master DSP & Event/Social Publishing**:
   - **Sound Studio**: 24 procedural synth tracks, Master DSP rack (*Lowpass Filter*, *Sub-Bass Boost EQ*, *Dub Echo Delay*), 8 one-shot **Live Event SFX Pads** (*808 Sub Drop*, *Whoosh Riser*, *Glitch Stutter*, *Synth Laser*, *Camera Shutter*, *Clover Stinger*, *Vinyl Brake*, *Festival Uplift*), custom MP3/WAV upload, and live microphone FFT reactivity.
   - **Publish Everywhere**: 6 aspect ratios (`4:5`, `1:1`, `9:16`, `16:9`, `4:3`, `3:4`), 8 one-click presets for **Social Media** (*Reels*, *TikTok*, *Instagram Feed*, *YouTube*) and **Live Event Media** (*Main Stage LED Wall 16:9*, *Event Digital Signage Totem 9:16*, *Exhibition Booth 4:3*, *Event Digital Poster 3:4*), plus a chromeless **Clean Stage Output** mode for live HDMI/LED wall projection.

---

## Project Architecture

```text
clover-motion-studio/
├── .agents/
│   └── skills.json                  # 34 registered AI/engineering skills & module bindings
├── conductor/                       # Conductor feature tracks & verification specs
├── design-system/
│   └── clover-motion-studio/        # UI/UX Pro Max design system & Clover Green tokens
├── docs/
│   └── adr/                         # Architecture Decision Records (ADR-0001..0003)
├── public/
│   └── favicon.svg                  # Signature 'c' + four-leaf clover vector mark
├── src/
│   ├── app/                         # Next.js 16 App Router shell & global styles
│   ├── components/
│   │   ├── CloverMotionStudio.jsx   # Unified studio state & keyboard shortcut orchestrator
│   │   ├── common/                  # BrandLogo & accessible native <dialog> ModalDialog
│   │   ├── layout/                  # TopHeaderBar, LeftSidebar, CanvasViewport, RightInspector, TimelinePanel, BottomAudioBar
│   │   └── modals/                  # TemplateLibrary, FormatReview, Export, MyProjects, FullscreenPreview, BrandKits, MotionTemplates
│   ├── constants/
│   │   ├── animosTemplates.js       # 25+ Animos 3D/Perspective showcase templates & gradients
│   │   ├── effectCraftEffects.js    # 10 EffectCraft post-FX, 8 shaders, 8 SFX pads & export presets
│   │   ├── audioTracks.js           # 24 procedural synthesizer tracks
│   │   ├── fonts.js                 # Typeface catalog & 6 aspect ratios (4:5, 1:1, 9:16, 16:9, 4:3, 3:4)
│   │   ├── graphicAssets.js         # Vector shapes & generative graphic templates
│   │   ├── motionPresets.js         # Kinetic presets, easings & color palettes
│   │   ├── posterLayouts.js         # 15 Swiss poster layout blueprints
│   │   └── templateCatalog.js       # 28 ready-made multi-scene templates
│   ├── engine/
│   │   ├── animosRenderer.js        # 3D perspective card projection & depth-sorted renderer
│   │   ├── effectCraftRenderer.js   # Procedural shader generator & post-processing FX compositor
│   │   ├── canvasRenderer.js        # Unified 5-stage 2D Canvas rendering pipeline
│   │   └── audioEngine.js           # Web Audio synthesizer, Master DSP chain, Event SFX & FFT analyzer
│   ├── types/
│   │   └── studio.d.ts              # Strict TypeScript domain contracts
│   └── utils/
│       ├── projectBuilder.js        # Aspect-ratio-aware scene & layer factory
│       └── timecode.js              # Frame-accurate timecode & cubic-bezier evaluator
├── AGENTS.md                        # Engineering & architectural guardrails
└── turbo.json                       # Turborepo deterministic build & lint pipeline
```

---

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## License

Distributed under the **MIT License**. See [`LICENSE`](./LICENSE) for more information.
