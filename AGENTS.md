<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Clover Motion Studio — Agent & Engineering Governance (`AGENTS.md`)

**Clover Motion Studio (`clover.motion`)** is an all-in-one browser-based **Design, 3D Showcase, Procedural Shader/FX, Web Audio DSP, and Social/Event Media Publishing Platform** built on **Next.js 16 (App Router)**, **React 19**, **Tailwind CSS 4**, **HTML5 2D Canvas**, and the **Web Audio API**.

## 1. Unified Platform Architecture (4 Core Pillars)

1. **Design & Kinetic Typography (`Clover Motion Core`)**:
   - 28+ Swiss graphic & kinetic typography templates (`src/constants/templateCatalog.js`), 15 poster layout blueprints (`src/constants/posterLayouts.js`), and multi-scene synchronization.
2. **3D & Perspective Media Showcase (`Animos Engine`)**:
   - 25+ 3D/Perspective showcase templates across 9 categories (`3D & Perspective`, `Multiscene`, `Isometric`, `Orbit`, `Carousel & Flow`, `Grid`, `Spotlight & Focus`, `Reveal & Wipe`, `Stack & Scatter`) rendered via pure 2D Canvas projective math (`src/engine/animosRenderer.js` & `src/constants/animosTemplates.js`).
3. **Procedural Shaders & Post-Processing FX Rack (`EffectCraft Engine`)**:
   - 8 real-time procedural background shaders (`Aurora Veil`, `Pastel Plasma`, `Magma Flow`, `Voronoi Crystals`, `Cyber Perspective Grid`, `CC Particle World`, `Audio Spectrum Ring`) and 10 stackable post-processing effects (`ec.glow`, `ec.rgbSplit`, `ec.glitch`, `ec.scanlines`, `ec.halftone`, `ec.ascii`, `ec.kaleido`, `ec.echo`, `ec.pixelSort`, `ec.grainVignette`) in `src/engine/effectCraftRenderer.js`.
4. **Web Audio Synthesizer, Master DSP & Event/Social Publishing**:
   - 24 procedural synth tracks (`src/constants/audioTracks.js`), Master DSP chain (Lowpass Filter, Sub-Bass Boost EQ, Dub Echo Delay), 8 Live Event One-Shot SFX Pads (`src/engine/audioEngine.js`), Live Stage Clean Projector Mode (`src/components/modals/FullscreenPreviewModal.jsx`), and 8 Social & Event Media export presets (`src/components/modals/ExportModal.jsx`).

## 2. Memory Safety & Performance Rules (`memory-safety-patterns`)

- **Offscreen Canvas Pooling**: Never allocate new `document.createElement('canvas')` inside a `requestAnimationFrame` render call. Always reuse module-scoped scratch canvases (`getScratchCanvasA`, `getScratchCanvasB`, `getEchoCanvas`, `getGlyphScratchCanvas`).
- **Resource Lifecycle (RAII)**: Revoke temporary `URL.createObjectURL` blobs after download/disposal, stop active `MediaStreamTrack` instances when disabling microphone input, and clear `requestAnimationFrame` / `setInterval` timers on unmount.
- **Pure Render Pipeline**: `renderSceneToCanvas()` in `src/engine/canvasRenderer.js` must remain deterministic and side-effect-free so that the main Canvas Viewport, Scene Strip thumbnails, Format Review modal, Fullscreen Stage Preview, and WebM/MP4/PNG Exporter produce identical visual output.

## 3. UI/UX & Brand Guardrails (`brand`, `ui-ux-pro-max`, `tailwind-design-system`)

- **Brand Accent**: Signature **Clover Green** (`#159947` primary fill, `#16a34a` brand core, `#22c55e` active border/signal, `#4ade80` highlight text) on neutral matte dark studio surfaces (`#0e0e0e`, `#141414`, `#161616`, `#1c1c1c`).
- **Accessible Modals**: All modal dialogs must use `src/components/common/ModalDialog.jsx` backed by native `<dialog>` with `.showModal()` and light-dismiss support.
