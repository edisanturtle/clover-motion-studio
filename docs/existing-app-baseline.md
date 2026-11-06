# Clover Motion Studio — Existing Application Baseline (`docs/existing-app-baseline.md`)

**Document Revision:** 1.0.0 (Iteration P0 Baseline Audit)  
**Audit Date:** 2026-11-06  
**Auditor:** Antigravity AI Engineering Team  
**Governing Playbook:** `docs/antigravity-ingestion-playbook.md` (Iterasi P0)  
**Status:** Canonical & Protected Baseline

---

## (a) Source Repository & Verified Technology Stack

### 1. Source Repository Location
- **Workspace Root:** `/Users/edisantoso/Downloads/Clover Motion`
- **Git Remote Origin:** `https://github.com/edisanturtle/clover-motion-studio.git`
- **Active Git Branch:** `main`
- **Current HEAD Commit:** `e374be4` (*feat: add global continuous playback mode across all scenes for full-length content export*)
- **Working Tree State:** Clean with respect to tracked files; protected untracked files present (`docs/archive-coverage-ledger.csv`, `docs/audit-progress.md`).
- **Live Dev Server Execution:**
  - Runtime: Node.js Next.js dev server
  - Process ID: PID `44938` (`task-584`)
  - Target URL: `http://localhost:3000/`
  - Health Status: HTTP 200 OK, active hot reload, zero console runtime exceptions.

### 2. Verified Technology Stack & Version Matrix
Verified against [package.json](file:///Users/edisantoso/Downloads/Clover%20Motion/package.json):
- **Framework:** Next.js `16.2.2` (Next.js App Router, React Server Components & Turbopack enabled)
- **UI Runtime:** React `19.2.4` & React-DOM `19.2.4`
- **Styling Architecture:** Tailwind CSS `4.2.2` via `@tailwindcss/postcss` and CSS variable tokens
- **Iconography System:** `lucide-react` `1.16.0`
- **Rendering Subsystem:** Pure HTML5 2D Canvas (`CanvasRenderingContext2D`)
  - *Zero WebGL context loss risk*: All 3D perspective projections, rotations, depth scaling, and skewing are performed via pure projective mathematics and affine transformation matrices directly in 2D canvas context.
- **Audio DSP Subsystem:** Web Audio API (`AudioContext`, `BiquadFilterNode`, `DelayNode`, `ConvolverNode`, `WaveShaperNode`, `AnalyserNode`, `MediaStreamAudioDestinationNode`)
- **Video Export Subsystem:** HTML5 Canvas `captureStream()` + Web Audio `MediaStreamDestination` feeding native `MediaRecorder` (WebM VP9/Opus and MP4 support)

---

## (b) Architecture, Route, Component, State & Persistence Map

Clover Motion follows a **Hexagonal / Clean Architecture** pattern where the domain models and state transformation services are isolated from the React UI and canvas rendering engines.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Next.js App Router (UI)                         │
│   src/app/page.js  ─────────►  src/components/CloverMotionStudio.jsx   │
├────────────────────────────────────────────────────────────────────────┤
│                       Layout & Modal Components                        │
│   • TopHeaderBar         • LeftSidebar          • CanvasViewport       │
│   • RightInspector       • TimelinePanel        • BottomAudioBar       │
│   • SceneStripCard       • ModalDialog          • 9 Feature Modals     │
├──────────────────────────────────┬─────────────────────────────────────┤
│      Core Domain & Services      │         Engine Subsystems           │
│  • src/core/domain/models.js     │  • src/engine/canvasRenderer.js     │
│  • src/core/services/            │  • src/engine/animosRenderer.js     │
│       projectService.js          │  • src/engine/effectCraftRenderer.js│
│  • src/utils/projectBuilder.js   │  • src/engine/audioEngine.js        │
│  • src/utils/timecode.js         │  • src/constants/*                  │
├──────────────────────────────────┴─────────────────────────────────────┤
│                    Storage & Browser Integration                       │
│    localStorage (clover_motion_saved_projects_v1) │ Blob JSON File I/O │
└────────────────────────────────────────────────────────────────────────┘
```

### 1. Routes & Entrypoints
| Route / File | Path | Line Citations | Role & Architectural Function |
| :--- | :--- | :--- | :--- |
| **Root Page** | [src/app/page.js](file:///Users/edisantoso/Downloads/Clover%20Motion/src/app/page.js) | L1–L5 | Mounts the root orchestrator `<CloverMotionStudio />`. |
| **Root Layout** | [src/app/layout.js](file:///Users/edisantoso/Downloads/Clover%20Motion/src/app/layout.js) | L1–L21 | Global dark theme shell (`#0a0a0a`), metadata, typography imports, and green text selection highlights. |
| **Global Styles** | [src/app/globals.css](file:///Users/edisantoso/Downloads/Clover%20Motion/src/app/globals.css) | L1–L95 | Tailwind v4 tokens, custom scrollbars, range slider tracks, canvas viewport grids. |

### 2. Primary UI Orchestrator & Layout Components
| Component | Path | Line Citations | Role & Responsibilities |
| :--- | :--- | :--- | :--- |
| **`CloverMotionStudio`** | [src/components/CloverMotionStudio.jsx](file:///Users/edisantoso/Downloads/Clover%20Motion/src/components/CloverMotionStudio.jsx) | L1–L1690 | Central state orchestrator: manages `project`, `activeSceneIndex`, `selectedLayerId`, `isPlaying`, `localTime`, global playback loop, keyboard shortcuts (`Space`, `F`, `Cmd+Z`, `Cmd+Shift+Z`), audio sync, and modal visibility states. |
| **`TopHeaderBar`** | [src/components/layout/TopHeaderBar.jsx](file:///Users/edisantoso/Downloads/Clover%20Motion/src/components/layout/TopHeaderBar.jsx) | L1–L340 | Studio logo, project title inline rename, Quick/Advanced editor toggle, format switcher buttons, undo/redo buttons, Format Review trigger, Fullscreen trigger, and Export CTA. |
| **`LeftSidebar`** | [src/components/layout/LeftSidebar.jsx](file:///Users/edisantoso/Downloads/Clover%20Motion/src/components/layout/LeftSidebar.jsx) | L1–L1880 | 6 Studio tabs: `Content` (text fields), `3D Cards` (Animos showcase templates & geometry controls), `FX Rack` (EffectCraft shaders & post-processing filters), `Style` (Swiss typography & color palettes), `Motion` (Spring physics & easing curves), and `Scenes` (multi-scene strip management). |
| **`CanvasViewport`** | [src/components/layout/CanvasViewport.jsx](file:///Users/edisantoso/Downloads/Clover%20Motion/src/components/layout/CanvasViewport.jsx) | L1–L840 | High-DPI canvas container (`window.devicePixelRatio`), interactive pan & zoom (25% to 400%), layer drag/selection bounding box, rotation stem, 8 resize handles, safe area guides, and aspect ratio pill toggles. |
| **`RightInspector`** | [src/components/layout/RightInspector.jsx](file:///Users/edisantoso/Downloads/Clover%20Motion/src/components/layout/RightInspector.jsx) | L1–L1250 | Property inspector with 3 tabs: `Design` (typography, colors, transform coordinates), `Motion` (per-layer motion presets and spring overrides), and `Audio` (reactive pulse magnitude and band selection). |
| **`TimelinePanel`** | [src/components/layout/TimelinePanel.jsx](file:///Users/edisantoso/Downloads/Clover%20Motion/src/components/layout/TimelinePanel.jsx) | L1–L960 | Multi-track keyframe timeline, SMPTE timecode display, playhead scrub bar, keyframe creation/deletion diamonds, and Value Graph interpolation editor. |
| **`BottomAudioBar`** | [src/components/layout/BottomAudioBar.jsx](file:///Users/edisantoso/Downloads/Clover%20Motion/src/components/layout/BottomAudioBar.jsx) | L1–L820 | Master audio transport, 24 procedural synth tracks switcher, Master DSP popover rack (3-band EQ, Space Acoustics, Groove Saturation, 8 SFX Pads), volume control, and live 3-band VU frequency visualizer. |
| **`SceneStripCard`** | [src/components/layout/SceneStripCard.jsx](file:///Users/edisantoso/Downloads/Clover%20Motion/src/components/layout/SceneStripCard.jsx) | L1–L65 | Live offscreen thumbnail renderer for scenes in the horizontal scene strip. |
| **`ModalDialog`** | [src/components/common/ModalDialog.jsx](file:///Users/edisantoso/Downloads/Clover%20Motion/src/components/common/ModalDialog.jsx) | L1–L75 | Accessible native HTML5 `<dialog>` component with `.showModal()`, light-dismiss backdrop, and keyboard ESC trap. |

### 3. Modal Dialog Components
| Modal Component | Path | Line Citations | Role & Workflow |
| :--- | :--- | :--- | :--- |
| **`ExportModal`** | [src/components/modals/ExportModal.jsx](file:///Users/edisantoso/Downloads/Clover%20Motion/src/components/modals/ExportModal.jsx) | L1–L540 | Multi-format rendering engine: WebM (VP9/Opus), MP4, and PNG Sequence with social presets (Reel, Feed, Square, Stage, LED Wall). |
| **`FormatReviewModal`**| [src/components/modals/FormatReviewModal.jsx](file:///Users/edisantoso/Downloads/Clover%20Motion/src/components/modals/FormatReviewModal.jsx) | L1–L220 | Multi-format side-by-side live comparison (Feed 4:5, Square 1:1, Story 9:16) rendering simultaneously via pure canvas loop. |
| **`TemplateLibraryModal`**| [src/components/modals/TemplateLibraryModal.jsx](file:///Users/edisantoso/Downloads/Clover%20Motion/src/components/modals/TemplateLibraryModal.jsx) | L1–L720 | 28+ Swiss graphic & kinetic templates catalog with real-time thumbnail preview, category tabs, and 1-click instantiation. |
| **`MyProjectsModal`** | [src/components/modals/MyProjectsModal.jsx](file:///Users/edisantoso/Downloads/Clover%20Motion/src/components/modals/MyProjectsModal.jsx) | L1–L240 | Local project persistence manager (`localStorage`), JSON export, and JSON file importer. |
| **`FullscreenPreviewModal`**| [src/components/modals/FullscreenPreviewModal.jsx](file:///Users/edisantoso/Downloads/Clover%20Motion/src/components/modals/FullscreenPreviewModal.jsx) | L1–L260 | Zero-chrome presentation & projector mode for live events with keyboard control. |
| **`BrandKitsModal`** | [src/components/modals/BrandKitsModal.jsx](file:///Users/edisantoso/Downloads/Clover%20Motion/src/components/modals/BrandKitsModal.jsx) | L1–L450 | Swiss color palette and typography brand kits with 1-click apply to active scene or entire project. |
| **`MotionTemplatesModal`**| [src/components/modals/MotionTemplatesModal.jsx](file:///Users/edisantoso/Downloads/Clover%20Motion/src/components/modals/MotionTemplatesModal.jsx) | L1–L280 | Motion curves, spring dynamics (stiffness, damping, mass), and bezier library preview. |
| **`HelpShortcutsModal`**| [src/components/modals/HelpShortcutsModal.jsx](file:///Users/edisantoso/Downloads/Clover%20Motion/src/components/modals/HelpShortcutsModal.jsx) | L1–L120 | Keyboard shortcuts cheat-sheet (`Space`, `F`, `K`, `Cmd+Z`, `1-4`, etc.). |
| **`LiveTemplatePreviewInspector`**| [src/components/modals/LiveTemplatePreviewInspector.jsx](file:///Users/edisantoso/Downloads/Clover%20Motion/src/components/modals/LiveTemplatePreviewInspector.jsx) | L1–L190 | Live interactive preview inspector for examining template animations prior to loading. |

### 4. Engine, Core Domain & Utility Subsystems
| Module | Path | Line Citations | Key Invariants & Capabilities |
| :--- | :--- | :--- | :--- |
| **`canvasRenderer.js`** | [src/engine/canvasRenderer.js](file:///Users/edisantoso/Downloads/Clover%20Motion/src/engine/canvasRenderer.js) | L1–L1933 | Deterministic 5-stage canvas pipeline: `(1)` Background Fill & Procedural Shader, `(2)` Generative Decor & Animos 3D Cards, `(3)` Layers Render & Audio-Reactive text, `(4)` EffectCraft Post-Processing FX, `(5)` Bounding Box & Gizmo Overlays. Offscreen canvas pooling (`getGlyphScratchCanvas`). |
| **`animosRenderer.js`** | [src/engine/animosRenderer.js](file:///Users/edisantoso/Downloads/Clover%20Motion/src/engine/animosRenderer.js) | L1–L880 | Pure 2D Canvas projective 3D cards math engine: 25+ templates across 9 categories (Cascade Deck, Depth Stack Fan, Card Toss, Sphere Wall, Diagonal Wipe, Orbit, Grid, Spotlight, Isometric). Zero WebGL context loss. |
| **`effectCraftRenderer.js`**| [src/engine/effectCraftRenderer.js](file:///Users/edisantoso/Downloads/Clover%20Motion/src/engine/effectCraftRenderer.js) | L1–L620 | 8 procedural background shaders (`Aurora Veil`, `Cyber Grid`, `Plasma`, `Particle World`, etc.) and 10 stackable post-processing effects (`ec.glow`, `ec.rgbSplit`, `ec.glitch`, `ec.scanlines`, `ec.halftone`, `ec.ascii`, etc.). |
| **`audioEngine.js`** | [src/engine/audioEngine.js](file:///Users/edisantoso/Downloads/Clover%20Motion/src/engine/audioEngine.js) | L1–L750 | Web Audio API synthesizer (`ProceduralAudioEngine`), 16-step sequencer, master DSP chain (Lowpass filter, 3-band biquad EQ, tape saturation, impulse response convolution reverb, tempo-synced delay), 8 live SFX one-shot pads, and real-time FFT frequency analyzer (`getAnalysis()`). |
| **`models.js`** | [src/core/domain/models.js](file:///Users/edisantoso/Downloads/Clover%20Motion/src/core/domain/models.js) | L1–L120 | Pure domain entities: `createShowcaseConfig()`, `createScene()`, `createTextLayer()`. Guarantees default immutability and property validation. |
| **`projectService.js`** | [src/core/services/projectService.js](file:///Users/edisantoso/Downloads/Clover%20Motion/src/core/services/projectService.js) | L1–L280 | Hexagonal domain mutation service: pure immutable state transforms for `addScene`, `duplicateScene`, `deleteScene`, `updateShowcaseConfig`, `updateSceneAudio`, `updateSceneMotion`, `updateLayer`, and `reorderLayers`. |
| **`timecode.js`** | [src/utils/timecode.js](file:///Users/edisantoso/Downloads/Clover%20Motion/src/utils/timecode.js) | L1–L320 | SMPTE timecode formatting (`00:00:00:00`), analytical 2nd-order spring dynamics solver (`solveSpring`), cubic bezier evaluators, and multi-scene continuous global time mapping (`mapSceneTimeToGlobal`, `getGlobalProjectDuration`). |
| **`projectBuilder.js`** | [src/utils/projectBuilder.js](file:///Users/edisantoso/Downloads/Clover%20Motion/src/utils/projectBuilder.js) | L1–L310 | Factory that instantiates complete multi-scene projects from template catalog presets with Swiss typography and default cards. |

### 5. State Management & Persistence Flow
1. **Local Session State:** Managed in `CloverMotionStudio.jsx` via React 19 `useState` hooks with clean unidirectional flow down to presentation components.
2. **Persistence Storage Key:** `localStorage.getItem('clover_motion_saved_projects_v1')`. Handled with defensive try/catch blocks to avoid SSR and quota errors.
3. **Project File Interchange:** Pure JSON serialization via native browser `Blob` download (`.clovermotion.json`) and `FileReader` JSON parsing.

---

## (c) Working Workflows vs. UI Placeholders Inventory

Every feature was verified through direct inspection of handlers and visual evidence from the running application:

| Feature / Workflow Area | Sub-feature / Action | Status | Evidence / Implementation Citation |
| :--- | :--- | :--- | :--- |
| **Canvas Viewport** | Pan & Zoom (25%–400%) | **Working** | Implemented with wheel event listener and zoom buttons in [CanvasViewport.jsx](file:///Users/edisantoso/Downloads/Clover%20Motion/src/components/layout/CanvasViewport.jsx#L140-L190). |
| **Canvas Viewport** | Transform Gizmo & Handles | **Working** | Active bounding box, top rotation handle (↻), and 8 resize corner/mid handles rendered in [canvasRenderer.js](file:///Users/edisantoso/Downloads/Clover%20Motion/src/engine/canvasRenderer.js#L1850-L1905). Visible in screenshots. |
| **Canvas Viewport** | Safe Area & Rule Grids | **Working** | Toggled via header/canvas buttons; draws dashed safe margins in [canvasRenderer.js](file:///Users/edisantoso/Downloads/Clover%20Motion/src/engine/canvasRenderer.js#L1907-L1925). |
| **Animos 3D Engine** | 25+ 3D Showcase Templates | **Working** | 9 categories fully implemented in [animosRenderer.js](file:///Users/edisantoso/Downloads/Clover%20Motion/src/engine/animosRenderer.js#L282-L880) and [animosTemplates.js](file:///Users/edisantoso/Downloads/Clover%20Motion/src/constants/animosTemplates.js#L227-L450). Live cards render in Canvas. |
| **Animos 3D Engine** | Media Slot Upload | **Working** | Users can upload PNG/JPG/WebP images to populate card showcase slots; falls back to procedural Swiss cards. |
| **EffectCraft Engine** | 8 Procedural Shaders | **Working** | Real-time Canvas 2D math shaders (`Aurora Veil`, `Cyber Grid`, `Plasma`, etc.) in [effectCraftRenderer.js](file:///Users/edisantoso/Downloads/Clover%20Motion/src/engine/effectCraftRenderer.js#L11-L290). |
| **EffectCraft Engine** | 10 Post-Processing FX | **Working** | Stackable offscreen scratch canvas filters (`ec.glow`, `ec.rgbSplit`, `ec.glitch`, `ec.scanlines`, `ec.ascii`) in [effectCraftRenderer.js](file:///Users/edisantoso/Downloads/Clover%20Motion/src/engine/effectCraftRenderer.js#L294-L610). |
| **Audio Subsystem** | 24 Procedural Synth Tracks | **Working** | Real-time Web Audio step sequencer in [audioEngine.js](file:///Users/edisantoso/Downloads/Clover%20Motion/src/engine/audioEngine.js#L490-L645). |
| **Audio Subsystem** | Master DSP Rack | **Working** | 3-band EQ, Dub Echo Delay, Convolver Reverb, and Tape Saturation in [audioEngine.js](file:///Users/edisantoso/Downloads/Clover%20Motion/src/engine/audioEngine.js#L205-L265). Controls active in BottomAudioBar. |
| **Audio Subsystem** | 8 Live Event SFX Pads | **Working** | `808 Sub Drop`, `Noise Riser`, `Cyber Glitch`, `Laser Zap`, `Camera Shutter`, `Lush Chord`, `Tape Rewind`, `Arena Clap` triggered via `triggerSoundEffect()` in [audioEngine.js](file:///Users/edisantoso/Downloads/Clover%20Motion/src/engine/audioEngine.js#L282-L450). |
| **Audio Subsystem** | Audio-Reactive Pulse | **Working** | Web Audio Analyser node provides FFT byte frequency data (`bass`, `mid`, `treble`, `rms`) driving dynamic canvas scaling. |
| **Timeline Subsystem**| Multi-track Keyframes | **Working** | Keyframe creation, time dragging, and property interpolation in [TimelinePanel.jsx](file:///Users/edisantoso/Downloads/Clover%20Motion/src/components/layout/TimelinePanel.jsx) & [canvasRenderer.js](file:///Users/edisantoso/Downloads/Clover%20Motion/src/engine/canvasRenderer.js#L19-L60). |
| **Timeline Subsystem**| Continuous Global Playback | **Working** | Plays seamlessly across all scenes sequentially or loops active scene; mapped via [timecode.js](file:///Users/edisantoso/Downloads/Clover%20Motion/src/utils/timecode.js#L250-L310). |
| **Multi-scene Strip** | Add/Duplicate/Reorder/Delete| **Working** | Pure immutable scene mutations handled via [projectService.js](file:///Users/edisantoso/Downloads/Clover%20Motion/src/core/services/projectService.js#L14-L80); UI thumbnails render live via `SceneStripCard.jsx`. |
| **Multi-format Review**| 3-Aspect Ratio Comparison | **Working** | Live side-by-side rendering in [FormatReviewModal.jsx](file:///Users/edisantoso/Downloads/Clover%20Motion/src/components/modals/FormatReviewModal.jsx). |
| **Project Persistence**| LocalStorage & JSON Export | **Working** | Full project tree serialized to `localStorage` and downloadable as `.clovermotion.json` via [MyProjectsModal.jsx](file:///Users/edisantoso/Downloads/Clover%20Motion/src/components/modals/MyProjectsModal.jsx). |
| **Media Export** | WebM / MP4 / PNG Sequence | **Working** | MediaRecorder pipeline capturing Canvas + Web Audio stream in [ExportModal.jsx](file:///Users/edisantoso/Downloads/Clover%20Motion/src/components/modals/ExportModal.jsx#L120-L260). |
| **Raster Video Editing**| Multi-track Video Clipping | **Not in Scope**| Video workspace (Premiere-style razor tool / raster video import) is planned for PRD Phase 7; current engine focuses on vector, typography, and procedural 3D card assets. |
| **Cloud Collaboration**| Real-time Multiplayer Sync | **Not in Scope**| PRD explicitly defines Clover Motion as offline-first, client-side, zero-telemetry studio for privacy and performance. |

---

## (d) Visual Evidence & Screenshot Pointers

The local UI at `http://localhost:3000/` was captured across multiple operational workflows:

1. **Master Sound & Event SFX Popover Over 3D Fan Shuffle:**
   - *Evidence Image:* [media_1793958552787_428cde93.jpg](file:///Users/edisantoso/.gemini/antigravity/brain/98bc6230-a45a-4103-8108-c8c02702f526/.user_uploaded/media_1793958552787_428cde93.jpg)
   - *Observations:* Quick editor active on Square 1:1 format. Open Master Sound modal displays Lowpass Filter Cutoff (20,000 Hz), Sub-Bass Boost (+0 dB), Dub Echo Delay Mix (0%), and 8 Live SFX Pads with active green signal dots. In the background, "Fan Shuffle" 3D card layout renders 12 procedural cards behind Swiss typography.
2. **SoundCraft Studio Audio Rack & Advanced Multi-track Keyframe Timeline:**
   - *Evidence Images:* [media_1793961469227_8a116561.jpg](file:///Users/edisantoso/.gemini/antigravity/brain/98bc6230-a45a-4103-8108-c8c02702f526/.user_uploaded/media_1793961469227_8a116561.jpg) & [media_1793961469225_01ef82a2.jpg](file:///Users/edisantoso/.gemini/antigravity/brain/98bc6230-a45a-4103-8108-c8c02702f526/.user_uploaded/media_1793961469225_01ef82a2.jpg)
   - *Observations:* Advanced mode enabled. Bottom timeline displays 360 frames (12.0s duration), keyframe diamonds on `T Brand`, `T CTA`, `T Location`, and `Type Sculpture` layers at `00:04:15`. Canvas shows white interactive bounding box with corner resize handles and top rotation stem. SoundCraft rack displays 4 tabs: `[3-Band EQ, Acoustics, Groove & Tape, SFX Pads]`.
3. **Animos 3D Showcase Engine (Cascade Deck & Depth Stack Fan):**
   - *Evidence Images:* [media_1793961469244_4e4f669f.jpg](file:///Users/edisantoso/.gemini/antigravity/brain/98bc6230-a45a-4103-8108-c8c02702f526/.user_uploaded/media_1793961469244_4e4f669f.jpg) & [media_1793961469235_53063758.jpg](file:///Users/edisantoso/.gemini/antigravity/brain/98bc6230-a45a-4103-8108-c8c02702f526/.user_uploaded/media_1793961469235_53063758.jpg)
   - *Observations:* Left sidebar tab `3D Cards` under category `Stack & Scatter`. "Cascade Deck" slides 8 cards out of center stack with smooth perspective depth and shadow. "Depth Stack Fan" renders multi-layer card deck with Behance-style perspective offset.
4. **Animos 3D Showcase Engine (Sphere Wall & Diagonal Wipe):**
   - *Evidence Images:* Latest live Chrome captures on `localhost:3000` demonstrating "Sphere Wall" 3D curved cards panning around headline typography and "Diagonal Wipe" revealing full-frame showcases across scenes.

---

## (e) Protected Git Diff & User Work Integrity

The following files represent active audit progress and engineering assets that **MUST BE PROTECTED** and never overwritten or deleted:

1. **Untracked Audit Ledgers:**
   - `docs/archive-coverage-ledger.csv`: Canonical audit ledger tracking all 10,950+ file members across the 22 Craft archives.
   - `docs/audit-progress.md`: Formal progress dashboard with SHA-256 validation results and archive inventory.
2. **Recent Core Architecture Commits on `main`:**
   - Commit `e374be4`: Continuous multi-scene playback engine and global timecode mapping.
   - Commit `c3977ef`: Hexagonal domain service refactor and per-scene audio/motion/design overrides.
   - Commit `13d5041`: Custom card curve controls, spring physics tuner, and responsive scene strip.
   - Commit `c73bd74`: Transitions.dev animation curves, smooth easing algorithms, and perspective projection stabilization.
   - Commit `7d75987`: SoundCraft Master DSP chain, Convolver impulse reverb, and live event one-shot sampler.

---

## (f) Gap Analysis Against PRD & Craft Audit

| Functional Area | PRD Target (PRD-Clover-Motion.md) | Existing Clover Baseline Status | Gap & Next Steps (Fase 1–12) |
| :--- | :--- | :--- | :--- |
| **Design Canvas & Typography** | Swiss kinetic typography, grid systems, text transformations, font pairing. | **Fully Aligned** (Fase 1–3 complete). 28+ templates, Swiss grids, full font controls. | Custom font upload (`.woff2`/`.ttf`) local reader to be added in Fase 3. |
| **3D & Perspective Showcase** | 3D card perspective motion, multi-card stacks, carousel, orbit. | **Fully Aligned** (Fase 4 complete). 25+ templates in 9 categories via pure 2D Canvas math. | Card border radius & 3D shadow blur curve controls to be expanded. |
| **Procedural Shaders & FX** | Stackable shader backgrounds, post-processing filters (glow, chromatic, glitch). | **Fully Aligned** (Fase 9 complete). 8 shaders + 10 post-processing FX in rack. | Selective layer-scoped masking for FX rack. |
| **Audio & Master DSP** | Procedural synth tracks, master EQ, delay, reverb, live event SFX pads. | **Fully Aligned** (Fase 5–6 complete). 24 synth tracks, 8 SFX pads, full DSP chain. | Custom audio file track import (`.mp3`/`.wav`) with visual waveform slicing. |
| **Timeline & Animation** | Multi-track keyframes, SMPTE timecode, value graph, continuous playback. | **Fully Aligned** (Fase 4 complete). Multi-track timeline, keyframe diamonds, continuous loop. | Multi-select keyframe dragging and box selection refinement. |
| **Multi-Scene & Format Review** | Multi-scene sequence, 4:5, 1:1, 9:16 aspect ratios, live format review. | **Fully Aligned** (Fase 8 complete). FormatReviewModal renders 3 formats live simultaneously. | Per-scene transition duration customization (wipe, crossfade, dip to black). |
| **Export & Publishing** | WebM (VP9), MP4, PNG sequence, social media presets. | **Fully Aligned** (Fase 10 complete). MediaRecorder pipeline capturing Canvas + Web Audio. | Preflight validation check (clipping check, duration warning, safe title check). |
| **Craft Archives Ingestion** | Ingestion of 22 archives from `/Users/edisantoso/Downloads/Craft`. | **Iteration A0 Complete** (Ledger generated, 0 unsafe files). | Iteration A1 (Triage classification across 10,950+ members) is next. |

---

## (g) Non-Negotiable Features to Preserve

To ensure production stability and brand identity throughout subsequent iterations, the following 4 Core Pillars and architectural invariants **MUST NEVER BE BROKEN OR REGRESSED**:

1. **Pillar 1: Swiss Graphic Design & Kinetic Typography System**
   - High-contrast typography rules, layout blueprints (`src/constants/posterLayouts.js`), and deterministic text layout calculations.
2. **Pillar 2: Animos 3D & Perspective Showcase Engine**
   - Pure HTML5 2D Canvas projective geometry mathematics (`src/engine/animosRenderer.js`). **Never replace with WebGL/Three.js** to guarantee zero WebGL context loss, zero GPU driver crashes, and instant cross-platform export.
3. **Pillar 3: EffectCraft Procedural Shaders & FX Post-Processing Rack**
   - Real-time procedural backgrounds and stackable post-processing filters (`src/engine/effectCraftRenderer.js`). Strict adherence to offscreen canvas pooling (`getScratchCanvasA`, `getScratchCanvasB`, `getEchoCanvas`).
4. **Pillar 4: Web Audio Synthesizer, Master DSP Chain & Event SFX Pads**
   - Procedural 16-step sequencer, biquad EQ, tape saturation, impulse reverb, tempo-synced delay, and 8 live SFX one-shot pads (`src/engine/audioEngine.js`).
5. **Architectural Guardrails:**
   - **Hexagonal Architecture:** Domain logic in `src/core/domain/models.js` and `src/core/services/projectService.js` must remain completely decoupled from React hooks and DOM elements.
   - **Accessible Modal Standard:** All modals must leverage `src/components/common/ModalDialog.jsx` backed by native HTML5 `<dialog>`.
   - **Deterministic Rendering Pipeline:** `renderSceneToCanvas()` in `src/engine/canvasRenderer.js` must remain pure and free of side-effects so that Viewport, Scene Strip, Format Review, Stage Mode, and MediaRecorder Exporter produce identical visuals.
