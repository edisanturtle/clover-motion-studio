# Clover Motion — Kinetic Typography, Swiss Graphic Systems & Sound Studio

Clean, modular **Next.js (JavaScript / App Router)** implementation of **Clover Motion**, refactored from a 2,520-line monolithic React file into a maintainable architecture ready for continued development in **Codex** or **Hermes**.

---

## Quick Start

```bash
# Install dependencies
npm install

# Run development server (http://localhost:3000)
npm run dev

# Build for production
npm run build
npm start
```

---

## Architecture & Directory Structure

```text
src/
├── app/
│   ├── globals.css                         # Tailwind CSS v4 + Google Fonts + native <dialog> rules
│   ├── layout.js                           # Root App Router layout & metadata
│   └── page.js                             # Main entry rendering <NoodleTypeStudio />
├── components/
│   ├── NoodleTypeStudio.jsx                # Top-level Studio orchestrator (state, playback, undo/redo, export)
│   ├── common/
│   │   ├── BrandLogo.jsx                   # Clover Motion 4-leaf clover SVG emblem & wordmark
│   │   └── ModalDialog.jsx                 # Native <dialog closedby="any"> modal wrapper with light-dismiss
│   ├── layout/
│   │   ├── TopHeaderBar.jsx                # Header bar: Template library, Colors popover, Quick/Advanced switch, Format tabs
│   │   ├── LeftSidebar.jsx                 # Quick Editor sidebar & Advanced Studio Design/Motion inspector
│   │   ├── CanvasViewport.jsx              # Interactive 2D Canvas stage with drag/resize HUD & transport controls
│   │   ├── SceneStripCard.jsx              # Live-rendered mini canvas thumbnails for Intro / Poster / End card scenes
│   │   ├── RightInspector.jsx              # Advanced mode right inspector (Design / Motion / Audio tabs)
│   │   ├── TimelinePanel.jsx               # Multi-track keyframe timeline & cubic-bezier value graph editor
│   │   └── BottomAudioBar.jsx              # Procedural synthesizer bar, 32-band FFT visualizer, MP3/WAV upload & mic input
│   └── modals/
│       ├── TemplateLibraryModal.jsx        # Full 27-template Motion Library + 12 Swiss Poster Layout blueprints
│       ├── LiveTemplatePreviewInspector.jsx # Right-pane live interactive canvas preview inside Template Library
│       ├── FormatReviewModal.jsx           # Side-by-side 3-format inspection (Feed 4:5, Square 1:1, Story 9:16)
│       ├── ExportModal.jsx                 # Real-time WebM/MP4 video recorder, high-res PNG & JSON project export
│       ├── MyProjectsModal.jsx             # Local browser storage manager + JSON project import/export
│       ├── BrandKitsModal.jsx              # Brand kits manager (colors, typography, logo upload & placement)
│       ├── MotionTemplatesModal.jsx        # Preset kinetic motion templates & custom saved motion presets
│       ├── FullscreenPreviewModal.jsx      # Theater fullscreen live canvas player
│       └── HelpShortcutsModal.jsx          # Keyboard shortcuts & workflow reference
├── constants/
│   ├── audioTracks.js                      # 24 procedural Web Audio synth tracks, use-case recommendations & groups
│   ├── fonts.js                            # Curated display/editorial/mono/Korean typefaces + aspect ratio presets
│   ├── graphicAssets.js                    # Vector artwork primitives + 8 Graphic Templates + 12 Poster Layouts
│   ├── motionPresets.js                    # Keyframe/kinetic text presets + curated color palettes + layout grids
│   └── templateCatalog.js                  # All 27 authentic templates + Sound check + 12 Poster Layout blueprints
├── engine/
│   ├── audioEngine.js                      # Procedural multi-voice Web Audio synthesizer + FFT analyzer + mic/file input
│   └── canvasRenderer.js                   # Resolution-independent HTML5 2D Canvas renderer for all 27 templates & layers
└── utils/
    ├── projectBuilder.js                   # Scene & layer hydration from templates, poster blueprints, and aspect ratios
    └── timecode.js                         # SMPTE frame timecode formatter (MM:SS:FF) and cubic-bezier math helpers
```

---

## Key Features Included

1. **Complete 27-Template Motion Library + 9 Poster Layouts (`src/constants/templateCatalog.js`)**:
   - **Start here (6)**: `Hangul Modules`, `Pattern Playground`, `Shutter Play`, `Split Signal`, `Paper Stack`, `Prism Radio`
   - **Kinetic type (7)**: `Focus Pull`, `Offset Echo`, `Whisper Loud`, `Kinetic Chant`, `Split Counter`, `Strobe Cut`, `Echo Stack`
   - **Graphic systems (8)**: `Hangul Modules`, `Pattern Playground`, `Shutter Play`, `Split Signal`, `Paper Stack`, `Signal Cross`, `SolarTicker`, `Grid Index`
   - **Expert collection (3 — 16s / 4 scenes)**: `Obsidian Orbit`, `Silk Frequency`, `Hyper Assembly`
   - **Studio collection (6)**: `Prism Radio`, `Bureau Grid`, `Contour Study`, `Chromatic Cut`, `Blue Pleat`, `Ribbon Pulse`
   - Plus **Sound check** (`60s` audio-reactive starter) and **9 Swiss Poster Layouts**.
2. **Dual Workflow Modes**:
   - **Quick Editor**: Guided 3-step customization (`1. Pick a template` → `2. Make it yours` → `3. Export all 3 sizes`).
   - **Advanced Studio**: Full layer stack, custom `.ttf/.otf/.woff2` font upload, custom `.svg/.png/.jpg` artwork upload, multi-track keyframe timeline (`Pos X`, `Pos Y`, `Scale`, `Rotation`, `Opacity`), and Cubic Curve Value Graph.
3. **Multi-Format Responsive Layout Engine**:
   - Instant switching and side-by-side preview across **Feed · 4:5** (`1080×1350`), **Square · 1:1** (`1080×1080`), and **Story · 9:16** (`1080×1920`).
4. **Procedural Web Audio Synthesizer & Real-Time FFT Reactivity**:
   - Zero external audio asset dependencies required: synthesizes kick, snare, hi-hat, bass, and chord stabs in real time via Web Audio API, or accepts custom `.mp3/.wav/.ogg` files and live Microphone FFT input.

---

## Guide for Continuing in Codex / Hermes

- **Adding a New Template**: Add an entry to ` STUDIO_TEMPLATES` in `src/constants/templateCatalog.js` and, if it uses a bespoke generative background, add a matching branch in `drawTemplateDecor()` inside `src/engine/canvasRenderer.js`.
- **Adding a New Vector Artwork or Kinetic Graphic**: Register its metadata in `src/constants/graphicAssets.js` and add its canvas drawing routine in `drawGraphicAsset()` inside `src/engine/canvasRenderer.js`.
- **Adding a New Audio Track**: Add its BPM, root frequency, and rhythmic pattern in `src/constants/audioTracks.js`.
