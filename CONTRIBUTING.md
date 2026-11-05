# Contributing to Clover Motion Studio

Thank you for your interest in contributing to **Clover Motion Studio**! This guide covers our architecture conventions, how to add new templates, graphic primitives, and procedural audio tracks, and how to submit pull requests.

---

## Development Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/edisanturtle/clover-motion-studio.git
   cd clover-motion-studio
   ```
2. **Install dependencies**:
   ```bash
   npm install
   ```
3. **Start the development server**:
   ```bash
   npm run dev
   ```
4. **Verify production build before committing**:
   ```bash
   npm run build
   ```

---

## Architecture Guidelines

The project follows a strict separation of concerns so human developers and AI coding agents (**Codex**, **Hermes**, etc.) can navigate and extend modules cleanly:

| Directory | Responsibility |
| :--- | :--- |
| `src/constants/` | Declarative catalogs (`templateCatalog.js`, `graphicAssets.js`, `audioTracks.js`, `motionPresets.js`, `fonts.js`). Pure data — no DOM or React state. |
| `src/engine/` | Imperative rendering & Web Audio synthesis (`canvasRenderer.js`, `audioEngine.js`). Resolution-independent and framework-agnostic. |
| `src/utils/` | Pure state builders and math/timecode utilities (`projectBuilder.js`, `timecode.js`). |
| `src/components/layout/` | Workspace shell panels (`TopHeaderBar`, `LeftSidebar`, `CanvasViewport`, `RightInspector`, `TimelinePanel`, `BottomAudioBar`). |
| `src/components/modals/` | Self-contained modal dialogs built on native `<dialog closedby="any">`. |

---

## Extending Clover Motion

### 1. Adding a New Motion Template
1. Open `src/constants/templateCatalog.js` and append a template definition to `RAW_TEMPLATES`.
2. Specify its `category`, `purpose`, `audioTrackId`, `palette`, `defaults` (`title`, `subtitle`, `date`, `location`, `cta`, `brand`), and `scenes`.
3. If the template uses a custom procedural background or glyph-clipped pattern, add a branch in `drawTemplateDecor()` inside `src/engine/canvasRenderer.js` and layer hydration rules in `src/utils/projectBuilder.js`.

### 2. Adding a New Graphic Primitive or Template
1. Register the graphic metadata in `GRAPHIC_TEMPLATES` or `GRAPHIC_ASSETS` inside `src/constants/graphicAssets.js`.
2. Add the corresponding 2D Canvas drawing routine in `drawGraphicAsset()` inside `src/engine/canvasRenderer.js`.

### 3. Adding a New Procedural Audio Track
1. Open `src/constants/audioTracks.js` and add an entry to `DEMO_TRACKS` with `id`, `name`, `genre`, `group`, `bpm`, `rootFreq`, and `pattern`.
2. Optionally map it to a use case in `RECOMMENDED_AUDIO_BY_USE`.

---

## Commit Message Convention

We follow **Conventional Commits**:
- `feat:` — A new feature, template, graphic system, or audio track
- `fix:` — A bug fix in rendering, audio synthesis, or UI state
- `refactor:` — Code restructuring without changing external behavior
- `docs:` — Documentation and README updates
- `chore:` — Build scripts, CI workflows, or dependency updates
