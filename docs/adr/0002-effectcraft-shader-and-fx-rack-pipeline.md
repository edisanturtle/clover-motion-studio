# ADR-0002: EffectCraft Procedural Shaders & Post-Processing FX Rack Pipeline

- **Status:** Accepted
- **Date:** 2026-11-06

## Context

`EffectCraft` defines a rich catalog of procedural generators (`Aurora`, `Plasma`, `Lava`, `Voronoi`, `Cyber Grid`, `CC Particle World`) and post-processing effects (`Glow`, `Chromatic Aberration`, `VR Digital Glitch`, `CRT Scanlines`, `CC Ball Action`, `ASCII Matrix`, `CC Kaleida`, `Echo`, `Pixel Sort`, `Grain & Vignette`).

## Decision

We implemented `src/engine/effectCraftRenderer.js` using pooled offscreen HTML5 2D canvases (`scratchCanvasA`, `scratchCanvasB`, `echoBufferCanvas`) with zero per-frame heap allocations:
- Each effect is addressed by a stable `matchName` (`ec.glow`, `ec.rgbSplit`, `ec.glitch`, etc.) and supports `intensity` (`0-100`), a secondary parameter, and `audioReactive` beat modulation (`bass` / `mid` / `treble`).

## Consequences

- 60fps real-time compositing with deterministic memory usage and full compatibility with `canvas.captureStream()` video recording.
