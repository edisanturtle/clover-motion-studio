# Clover Motion Studio — Architecture Decision Record (`docs/architecture-decision-record.md`)

**Status:** Draft / Approved Canonical Architecture
**Date:** 2026-11-06
**Deciders:** Antigravity AI Engineering Team, Product Owner
**Governing Playbook:** `docs/antigravity-ingestion-playbook.md` (Iterasi A6)

---

## 1. Context & Problem Statement

Clover Motion Studio is an interactive motion design, Swiss typography, 3D card showcase, procedural shader, and Web Audio synthesizer platform. An external corpus of 23 archives from `/Users/edisantoso/Downloads/Craft` was audited to determine whether to port native Rust/egui desktop crates or adapt their mathematical models and algorithms into the existing high-performance browser application at `http://localhost:3000/`.

---

## 2. Decision Matrix & Boundary Trade-Offs

### ADR 001: UI Shell & Host Platform Boundary
- **Decision:** Retain and enhance the existing **Next.js 16 (App Router) + React 19 + Tailwind CSS 4** browser application.
- **Alternatives Considered:**
  - *Native Rust/egui desktop application:* Blocked by 5 conflicting `craft-libs` pins, missing crates, non-portable audio device APIs, and high friction for social media creators.
  - *WASM monolith compilation:* 461 crates compiled to WebAssembly would result in massive bundle sizes (>150 MB), slow startup times, and complex canvas bridge overhead.
- **Consequences:** Instant browser accessibility, zero installation friction, 60 FPS client rendering, responsive layout across all viewports, and zero telemetry.

### ADR 002: Rendering Subsystem — Pure 2D Canvas vs. WebGL/Three.js
- **Decision:** Execute all 3D card perspective projections, camera rotations, and depth stacks via **Pure HTML5 2D Canvas (`CanvasRenderingContext2D`) projective mathematics** (`src/engine/animosRenderer.js`).
- **Alternatives Considered:**
  - *WebGL / Three.js / WGPU:* Prone to WebGL context loss during background tab switching, high GPU memory spikes, driver crashes on low-end hardware, and non-deterministic frame capture during export.
- **Consequences:** Zero context loss risk, 100% deterministic pixel rendering between Viewport, Scene Strip, Format Review, and MediaRecorder video export, and memory safety through offscreen canvas pooling (`getScratchCanvasA/B`).

### ADR 003: Core Domain & State Architecture (Hexagonal Model)
- **Decision:** Enforce a strict **Hexagonal Architecture** where domain entities (`src/core/domain/models.js`) and state mutators (`src/core/services/projectService.js`) remain pure, immutable, and decoupled from React hooks and DOM elements.
- **Consequences:** Ensures state changes (adding scenes, altering card curves, tweaking DSP parameters) can be unit-tested without DOM mocks, preventing UI regressions when adding new templates.

### ADR 004: Canonical Timebase & Media Clock Synchronization
- **Decision:** Implement **Lossless Rational Integer Timebase Mapping** derived from FilmCraft (`254_016_000_000` ticks/s) and SoundCraft ($PPQ=960$).
- **Consequences:** Completely eliminates floating-point rounding errors and audio/video drift across multi-minute exports. Provides exact SMPTE timecode formatting (`HH:MM:SS:FF`) for 24, 25, 30, and drop-frame broadcast standards.

### ADR 005: Project Storage & File Interchange Model
- **Decision:** Standardize on a single, human-readable, self-contained JSON schema (`.clovermotion.json`) persisted to `localStorage` (`clover_motion_saved_projects_v1`) and downloadable via native Blob.
- **Alternatives Considered:** Fragmented proprietary containers (`.fcproj`, `.scraft`, `.ecproj`, `.figcraft`) which create format silos and require complex multi-crate decoders.
- **Consequences:** 100% offline-first operation, seamless version migration, and instant project sharing without cloud dependencies.

### ADR 006: Web Audio DSP Graph & Master Dynamics Rack
- **Decision:** Implement native **Web Audio API DSP graph** (`src/engine/audioEngine.js`) featuring 16-step procedural synthesis, 3-band biquad EQ, tape saturation curve, impulse response convolution reverb, tempo-synced dub echo, and 8 live event SFX pads.
- **Consequences:** Zero external audio framework dependencies, sub-millisecond audio latency, and real-time FFT frequency byte analysis (`bass`, `mid`, `treble`, `rms`) driving audio-reactive canvas animations.

---
*Approved and ratified in Iteration A6 as the canonical engineering foundation of Clover Motion Studio.*