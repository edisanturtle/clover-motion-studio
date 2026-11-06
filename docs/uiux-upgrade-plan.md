# Clover Motion Studio — UI/UX Master Upgrade Plan (`docs/uiux-upgrade-plan.md`)

**Document ID:** `CMS-UIUX-PLAN-001`  
**Phase:** **Fase 0 — Baseline & Upgrade Master Plan**  
**Status:** **Approved Architecture & Blueprint**  
**Author:** Clover Motion Architecture & Design Systems Team  
**Date:** 2026-11-07T00:33:00+07:00 (Asia/Jakarta)  

---

## 1. Executive Vision & Visual Direction

Clover Motion is designed as a **canvas-first, playful, clean, and highly professional creative studio** unifying Swiss typography, 3D projective card showcases, procedural shaders, and Web Audio synthesis into a single timeline.

```
                  ┌─────────────────────────────────────────────────┐
                  │           CLOVER MOTION VISUAL DIRECTION        │
                  │   Clean · Professional · Playful · Canvas-First │
                  └─────────────────────────────────────────────────┘
                                           │
         ┌──────────────────┬──────────────┴─────┬──────────────────┐
         ▼                  ▼                    ▼                  ▼
   [Canvas-First]     [Swiss Craft]       [Playful Audio]    [Motion Polish]
  ~60% screen area   Matte dark surfaces  Live 32-band FFT   Transitions.dev
  Adaptive zoom/pan  Emerald green accent 24 synth tracks    Spring physics
  Collapsible rails  High-contrast type   One-shot SFX pads  Zero jank/stutter
```

### Core Design Values
1. **Canvas-First Workspace**: The canvas viewport is the hero of the application, commanding roughly **60% of horizontal screen area**. Surrounding toolbars, sidebars, and inspectors remain slim, contextual, and collapsible.
2. **Clean & Professional**: Distraction-free matte dark studio surfaces (`#0a0a0a`, `#0e0e0e`, `#141414`) with precise border delineation (`border-neutral-800/80`) and tabular numeric typography. No generic SaaS card sprawl or decorative dashboard fluff.
3. **Playful Energy**: Saturated **Clover Green** signals (`#159947`, `#16a34a`, `#22c55e`, `#4ade80`), glowing audio-reactive visualizers, dynamic 3D perspective tilts, and instant sound-design SFX pads.
4. **Zero-Guessing Transparency**: Every control exposes its exact unit (`px`, `°`, `%`, `dB`, `Hz`, `BPM`, `s`, `ticks`). No fake sliders or unlinked mock buttons.

---

## 2. Synthesis of External Reference Research

Our plan synthesizes the best interaction patterns from industry references while strictly avoiding proprietary code or asset cloning:

| Reference Platform | Role & Key Lessons Extracted | Concrete Application in Clover Motion |
| :--- | :--- | :--- |
| **Animos** | *3D & Perspective Showcase Discovery*<br>Output-centric framing, preset categories, direct parameter tweaking. | Curate 25+ 3D showcase templates into 9 intuitive categories; maintain pure 2D Canvas projective math (zero WebGL context loss). |
| **Noodle Type** | *Unified Design + Motion + Sound in One Canvas*<br>Progressive Quick vs Advanced disclosure, layer transform handles, timeline lanes. | Two distinct editing depths: Quick Mode for rapid headline/color/audio swaps, Advanced Mode for keyframing, DSP tweaking, and format overrides. |
| **Transitions.dev** | *Component Motion Design System*<br>Semantic motion tokens, stateful UI transitions, strict `prefers-reduced-motion` compliance. | Standardize UI motion tokens (`duration.fast`, `duration.normal`, `ease.standard`, spring physics); keep canvas rendering decoupled from UI transitions. |
| **Awwwards** | *Editorial Typography & Composition*<br>Typographic scale rhythm, confident contrast, asymmetrical balance. | Implement Swiss poster layout blueprints, variable font weight/leading/tracking, and high-contrast color palettes. |

---

## 3. Baseline Viewports & Recorded Screenshots

Baseline screenshots were captured directly from the live dev server at `http://localhost:3000/` using headless Chrome:

| Viewport Profile | Resolution | Screenshot Asset Path | Dominant Characteristics |
| :--- | :--- | :--- | :--- |
| **Desktop Wide (FHD)** | $1920 \times 1080$ | `docs/screenshots/baseline-editor-1920x1080.png` | Optimal canvas workspace; left sidebar (320px), central canvas (1180px), right inspector (320px). |
| **Desktop Standard** | $1440 \times 900$ | `docs/screenshots/baseline-editor-1440x900.png` | Standard desktop layout; compact tool headers, auto-scaled canvas viewport with fit-to-screen zoom. |
| **Laptop Compact** | $1280 \times 800$ | `docs/screenshots/baseline-editor-1280x800.png` | Minimum responsive threshold; sidebars collapse into compact icon tabs; canvas remains centered. |

---

## 4. Route Map & View Hierarchy

Clover Motion uses a single-page studio architecture under Next.js App Router (`src/app/page.js`), housing four distinct specialized workspaces and nine accessible dialog overlays:

```
┌────────────────────────────────────────────────────────────────────────┐
│                              STUDIO SHELL                              │
│  TopHeaderBar: Project Title · Quick/Advanced Toggle · Format Switcher │
├──────────────┬──────────────────────────────────────────┬──────────────┤
│ LEFT SIDEBAR │            CANVAS VIEWPORT               │  RIGHT INSP. │
│ 6 Studio Tabs│  High-DPI 2D Canvas (4:5, 1:1, 9:16, etc)│ 3 Tabs:      │
│ • Content    │  Interactive Transform Gizmo & Handles   │ • Design     │
│ • 3D Cards   │  Ruler & Safe Area Bounding Overlays     │ • Motion     │
│ • FX Rack    │  Zoom / Pan Controller (25% to 400%)     │ • Audio      │
│ • Style      ├──────────────────────────────────────────┴──────────────┤
│ • Motion     │                     TIMELINE PANEL                      │
│ • Scenes     │  Playhead Scrub · Keyframe Diamonds · Value Graph Curves │
├──────────────┴─────────────────────────────────────────────────────────┤
│                            BOTTOM AUDIO BAR                            │
│  Master Transport · 24 Synth Tracks · Master DSP Popover · 8 SFX Pads  │
└────────────────────────────────────────────────────────────────────────┘
```

### Specialized Workspaces (Advanced Mode Keys `1`, `2`, `3`, `4`)
1. **Design Workspace (`Key 1`)**: Focused on layout blueprints, typography hierarchy, geometric primitives, and Swiss color palettes.
2. **Animate Workspace (`Key 2`)**: Focused on kinetic typography, 3D card showcases, procedural shaders, and keyframe motion curves.
3. **Video Workspace (`Key 3`)**: Focused on multi-scene storyboard sequencing, 60s master playback, clip trimming, and video preflight.
4. **Audio Workspace (`Key 4`)**: Focused on procedural synthesizer tracks, 32-band FFT frequency analyzer, Master DSP rack, and one-shot SFX triggers.

### Accessible Dialog Overlays (Native `<dialog>` with ESC / Light-Dismiss)
1. **`ExportModal`**: WebM (VP9/Opus), MP4 (H.264), PNG image sequence, and WAV mixdown renderer.
2. **`FormatReviewModal`**: Live side-by-side comparative canvas review across 4:5 Feed, 1:1 Square, and 9:16 Story.
3. **`TemplateLibraryModal`**: Curated catalog of 28+ Swiss graphic & kinetic typography templates with interactive preview inspector.
4. **`MyProjectsModal`**: Local persistence manager (`localStorage`), JSON export/import, and project duplicate/trash.
5. **`FullscreenPreviewModal`**: Clean zero-chrome projector mode for live stage events with keyboard transport.
6. **`BrandKitsModal`**: Color palette and font pairing presets applicable to active scene or whole project.
7. **`MotionTemplatesModal`**: Cubic Bézier easing library and spring physics preset explorer.
8. **`HelpShortcutsModal`**: Complete keyboard shortcut cheat-sheet.
9. **`TransferConsentModal`**: Explicit user disclosure and permission gate for any external data exchange.

---

## 5. Design System Tokens & Styling Architecture

The studio design system is built using CSS custom properties configured in `src/app/globals.css` and compiled via Tailwind CSS 4.

### 5.1 Color Tokens
```css
/* Surface Hierarchy */
--studio-bg: #0a0a0a;           /* Deepest root backdrop */
--studio-chrome: #0e0e0e;       /* Header and transport background */
--studio-panel: #141414;        /* Sidebar and inspector background */
--studio-card: #1c1c1c;         /* Inner card and input field background */
--studio-hover: #242424;        /* Button and row hover state */
--studio-border: rgba(255, 255, 255, 0.08); /* Crisp separator border */

/* Brand & Signal Tokens */
--clover-primary: #159947;      /* Primary button fill */
--clover-core: #16a34a;         /* Brand logo and accent core */
--clover-signal: #22c55e;       /* Active border, playhead, selection ring */
--clover-highlight: #4ade80;    /* Glow badges, active text, status indicator */
--clover-dim: rgba(22, 163, 74, 0.15); /* Subtle active container tint */

/* Neutral Typography Tokens */
--text-primary: #ffffff;        /* Headings and active values */
--text-secondary: #a3a3a3;      /* Section labels and secondary info */
--text-muted: #737373;          /* Placeholder text and shortcuts */
--text-faint: #525252;          /* Disabled states and subtle hints */
```

### 5.2 Typography Tokens
- **Display & Titles**: `Space Grotesk`, `Inter`, `system-ui`, sans-serif.
- **Body & Labels**: `Inter`, `Helvetica Neue`, sans-serif.
- **Numeric & Timecode**: `JetBrains Mono`, `ui-monospace`, monospace (tabular figures enabled for jitter-free counters).

### 5.3 Motion & Transition Tokens (Transitions.dev Inspired)
- `--ease-spring`: `cubic-bezier(0.175, 0.885, 0.32, 1.275)` (Snappy spring pop).
- `--ease-smooth`: `cubic-bezier(0.4, 0.0, 0.2, 1)` (Fluid panel expand/collapse).
- `--ease-exit`: `cubic-bezier(0.0, 0.0, 0.2, 1)` (Swift dismissal).
- `--duration-fast`: `150ms` (Hover states, button active, badge toggles).
- `--duration-normal`: `250ms` (Panel reveals, tab switches, modal entrance).
- `--duration-slow`: `350ms` (Workspace transitions, drawer slides).
- **Reduced Motion Support**: When `prefers-reduced-motion: reduce` is detected, all transitions drop to `0ms` while maintaining instantaneous state changes.

---

## 6. User Changes & Invariants to Preserve

To ensure absolute zero regression during the upgrade:
1. **Zero Data Loss on Reload**: All existing user projects in `clover_motion_saved_projects_v1` and crash recovery sessions in `clover_motion_recovery_journal_v1` must load seamlessly.
2. **Schema V1 Integrity**: The self-contained `.clovermotion.json` structure, rational timebase, and asset registry must not be mutated without automated migration.
3. **Pure 2D Canvas Determinism**: No WebGL dependencies may be introduced into the main viewport or exporter pipelines.
4. **NaN Immunity**: All range slider inputs must retain their `safeNum()` and `Number.isFinite()` wrappers to prevent React runtime warnings.
5. **Multi-Scene 60s Sequence Playback**: The global continuous video playback transport and timeline scrub bar must remain intact.

---

## 7. Phased Implementation Roadmap

```
[Fase 0] Baseline & Master Plan (COMPLETED)
   │
   ▼
[Fase 1] Capability & Legal Gate (Audit & Shortlist Craft features; keep quarantine)
   │
   ▼
[Fase 2] Visual Identity & Design Tokens (Define tokens in globals.css; design spec)
   │
   ▼
[Fase 3] Canvas-First Workspace Redesign (~60% canvas area, collapsible sidebars)
   │
   ▼
[Fase 4] Multi-Workspace Consistent Redesign (Design, Animate, Video, Audio)
   │
   ▼
[Fase 5] Asset & Template Refresh (Curate 28+ open editable Swiss templates)
   │
   ▼
[Fase 6] Design & Object Editing (Precision transform, align, group, undo/redo)
   │
   ▼
[Fase 7] Motion & Timeline Engine (Keyframe value graph, spring curves, timebase)
   │
   ▼
[Fase 8] Audio DSP & Visual Reactivity (Waveform peaks, beat grid, reactive binding)
   │
   ▼
[Fase 9] Video NLE & Multi-Clip Compositing (Trim, split, ripple delete, proxy)
   │
   ▼
[Fase 10] Shaders, Effects & Vector Paths (Bézier nodes, non-destructive FX rack)
   │
   ▼
[Fase 11] Multi-Format Export & Preflight (WebM, MP4, PNG sequence, batch queue)
   │
   ▼
[Fase 12] Final Hardening, Usability & Release Gate (Accessibility, perf, sign-off)
```

---

## 8. Fase 0 Exit Gate Evaluation

- [x] **Repository integrity verified**: `/Users/edisantoso/Downloads/Clover Motion` on branch `main` at commit `f6d9476`.
- [x] **Dev server operational**: `http://localhost:3000/` running on Node.js / Turbopack with 200 OK.
- [x] **User changes and recent bug fixes safeguarded**: Zero NaNs, 56 templates functional, 11/11 tests passing.
- [x] **Baseline screenshots captured**: Recorded across 3 standard viewports ($1920\times1080$, $1440\times900$, $1280\times800$).
- [x] **Zero UI/Code/Data mutations during Fase 0**: Work completed strictly in documentation.

**CONCLUSION**: **FASE 0 IS 100% COMPLETE. AMAN MASUK FASE 1.**
