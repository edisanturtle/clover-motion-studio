# Clover Motion Studio — Phase 0/1 Architectural Open Questions & Decision Gates (`docs/open-questions.md`)

**Revision:** 2.0.0 (Iteration A6 Synthesis)
**Status:** Active Decision Gates for Engineering Alignment

---

## 1. Resolved Decisions from Audits (A0 through A6)

1. **Single Application Host Shell:** Resolved in favor of the existing Next.js 16 + React 19 browser studio at `http://localhost:3000/`. Native Rust/egui desktop shells are rejected due to missing dependencies, platform divergence, and poor web deployment ergonomics.
2. **Rendering Engine Invariant:** Resolved in favor of Pure HTML5 2D Canvas projective mathematics (`src/engine/canvasRenderer.js` & `src/engine/animosRenderer.js`). Zero WebGL dependency guarantees zero GPU context loss, zero crashes, and identical deterministic exports.
3. **Missing Dependency Barrier:** Porting native Rust crates from EffectCraft, DesignCraft, and VectorCraft is permanently blocked until source code for `craft-libs` is provided. Pure mathematical adaptation into JavaScript/Web Audio is the approved strategy.
4. **Asset Quarantine Policy:** All 299 third-party project samples (.aep, .psd, .prproj) and model weights are quarantined under `hold/unknown`. Only verified OFL-1.1 fonts and Lucide icons are approved for production builds.

---

## 2. Active Decision Gates for Phase 1 Implementation

### Gate 1: Custom Audio Track Import & Waveform Slicing
- **Context:** Clover Motion currently provides 24 procedural synth tracks and 8 live SFX pads via Web Audio API. Users need custom background music import.
- **Options:**
  - Option A: Native HTML5 `AudioContext.decodeAudioData()` with client-side waveform peak generation.
  - Option B: Compile SoundCraft's `audio-io` / `symphonia` decoder to WebAssembly.
- **Recommendation:** **Option A**. Native browser decoders support MP3, WAV, AAC, and OGG with zero WASM bundle overhead, zero memory leaks, and instant playback.

### Gate 2: Cross-Scene Continuous Audio Transition Modes
- **Context:** Multi-scene video export requires seamless audio flow across scenes.
- **Options:**
  - Option A: Global master audio track playing continuously beneath scene cuts (Clover commit `e374be4`).
  - Option B: Per-scene audio stems with configurable crossfade curves (dip to silence, 0.5s beat-matched crossfade).
- **Recommendation:** Support both via per-scene override switch (`scene.audioMode: 'global' | 'isolated' | 'crossfade'`).

### Gate 3: Custom Font File Upload (.woff2 / .ttf)
- **Context:** Users require custom corporate brand fonts for Swiss typography templates.
- **Options:**
  - Option A: Browser `FontFace` API loading uploaded font bytes into local DOM and Canvas context.
  - Option B: Embedded server-side font rasterizer.
- **Recommendation:** **Option A**. Native `document.fonts.add(new FontFace(...))` allows immediate client-side font registration with zero server telemetry.

