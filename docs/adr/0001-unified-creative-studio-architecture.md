# ADR-0001: Unified Creative Studio Architecture (Clover Motion + Animos + EffectCraft)

- **Status:** Accepted
- **Date:** 2026-11-06

## Context

Creators, event organizers, and social media teams typically switch between multiple fragmented tools:
1. Typography & poster layout tools (e.g., kinetic typography editors)
2. 3D card & media showcase animators (`https://animos.app/editor`)
3. Real-time procedural shader & post-processing VJ racks (`EffectCraft`)
4. Audio synthesis, sound effect samplers, and video format exporters

## Decision

We unified all four workflows into a single deterministic HTML5 Canvas + Web Audio studio (**Clover Motion Studio v2.0**):
1. **Pure 5-Stage Render Pipeline (`renderSceneToCanvas`)**:
   - Stage 1: Base Color + EffectCraft Procedural Shader Background (`renderEffectCraftShaderBg`)
   - Stage 2: Swiss / Kinetic System Decor (`drawTemplateDecor`)
   - Stage 3: Animos 3D & Perspective Media Showcase (`renderAnimosShowcase`)
   - Stage 4: Keyframed & Audio-Reactive Typography / Vector Layers (`renderGraphicLayer`, `renderTextLayer`)
   - Stage 5: EffectCraft Stackable Post-Processing FX Rack (`applyEffectCraftRack`) + Editor HUD overlays
2. **Integrated Web Audio DSP & Event SFX Sampler (`ProceduralAudioEngine`)**:
   - 24 procedural synth tracks + MP3/WAV upload + Live Microphone FFT
   - Master DSP chain (Lowpass Filter, Sub-Bass Boost EQ, Dub Echo Delay)
   - 8 one-shot Live Event SFX pads (`808 Sub Drop`, `Whoosh Riser`, `Glitch Stutter`, `Synth Laser`, `Camera Shutter`, `Clover Stinger`, `Vinyl Brake`, `Festival Uplift`)

## Consequences

- Every visual feature (3D showcases, procedural shaders, post-FX, kinetic typography) automatically works in live preview, multi-format review, fullscreen stage projection, and WebM/MP4/PNG export without WebGL context loss or external runtime dependencies.
