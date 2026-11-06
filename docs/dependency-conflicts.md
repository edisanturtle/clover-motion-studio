# Dependency Conflicts, Toolchains, and Missing Dependency Nodes Audit (`docs/dependency-conflicts.md`)

**Revision:** 2.0.0 (Iteration A5 Comprehensive Verification)
**Status:** Canonical Static Manifest Audit

---

## 1. Executive Summary of Build-Boundary Conflicts

Static inspection of all Cargo manifests across the 23 archives proves that **merging these workspaces mechanically into a single mono-repo is fundamentally blocked** by:
1. **Missing External Dependency `craft-libs`:** Pinned across 5 conflicting git revisions (`92d392c...`, `ca1b5e2...`, `c5a1cbf...`, `9be9a63...`, `e11f9d9...`). This repository is completely absent from the archive folder.
2. **Missing External Dependency `storytold/filmcraft`:** EffectCraft references 18 `filmcraft-*` crates at git commit `d5ead4ba1ee2f1cd13cb86a4239aee2730a3d9f5`. The standalone `filmcraft-main.zip` is a separate snapshot whose commit SHA is not bound to `d5ead4b...`.
3. **Toolchain & Rust Version Divergence:** Workspaces declare incompatible `rust-version` constraints (`1.77.2` in ArtCraft, `1.87` in Craft Anything, `1.90` in SoundCraft, `1.95` in EffectCraft/FilmCraft/VectorCraft/PhotoCraft/FigCraft).
4. **Crate Name Collisions:** Identical package identities exist in separate archives (`xtask` in VectorCraft/DeckCraft/DesignCraft; `pr-claude`, `pr-core`, `pr-github` in PR Review Tool & Repo Status App; `wgpu-hal` vendored in Craft Anything).

---

## 2. Six Primary Candidate Workspace Manifests & Pins

| Application | Crates Count | Edition | Declared Rust Version | `craft-libs` Pinned Revision | Notable Features & Target Constraints |
|---|---:|---:|---:|---|---|
| **EffectCraft** | 40 | 2024 | 1.95 | `92d392cff132eaf...` (pdf/docpath/quit/ui), `ca1b5e2edb8...` (format), `c5a1cbfb5...` (update) | Imports 18 `filmcraft-*` crates from git `d5ead4b...`; patches `hayro-syntax`, `hayro-jbig2` |
| **FilmCraft** | 54 | 2024 | 1.95 | `c5a1cbfb5f9049f...` (docpath/media/ui/update) | Patches `storytold/egui` (`6d518fc...`) & `storytold/winit` (`a517b38...`) |
| **SoundCraft** | 20 | 2024 | 1.90 | `c5a1cbfb5f9049f...` (docpath/media/ui/update) | Native audio device support (`cpal`/`audio-io`); WASM fallback via `.scraftz` bundle |
| **VectorCraft** | 30 | 2024 | 1.95 | `9be9a63782298ab...` (pdf/print/docpath/ui/keymap/format), `c5a1cbfb5...` (update) | Patches `hayro-syntax`, `hayro-interpret`, `hayro-jbig2`, `hayro-cmap`, `hayro-postscript`, `krilla` |
| **PhotoCraft** | 37 | 2024 | 1.95 | `c5a1cbfb5f9049f...` (ui/print/docpath/jpeg/update), `b8f7d93b0...` (format) | Tiles/blobs content-addressed engine; GPU fallback to CPU oracle |
| **FigCraft** | 27 | 2024 | 1.95 | `e11f9d9aebea5f6...` (docpath/window/font-store/ui/menu/settings), `c5a1cbfb5...` (update) | Patches `krilla`; embedded fonts in penpot module |

---

## 3. Detailed Missing Dependency Node Inventory

| Missing Dependency | Pinned Git URL | Exact Commit Revision | Consuming Workspace(s) | Status & Risk Impact |
|---|---|---|---|---|
| `craft-libs` (Rev 92d) | `https://github.com/storytold/craft-libs` | `92d392cff132eaf53e13afff77f38b5c11b73aa0` | EffectCraft, DesignCraft, CadCraft | **MISSING NODE:** Shared UI, PDF, and docpath implementations absent |
| `craft-libs` (Rev ca1) | `https://github.com/storytold/craft-libs` | `ca1b5e2edb8568335c6c14f390307bd5beae8238` | EffectCraft (`craft-ecproj-format`) | **MISSING NODE:** Native `.ecproj` binary format encoder/decoder absent |
| `craft-libs` (Rev c5a) | `https://github.com/storytold/craft-libs` | `c5a1cbfb5f9049f9270955caffb5bee5997aebf7` | FilmCraft, SoundCraft, PhotoCraft, DeckCraft | **MISSING NODE:** Common update & updater UI absent |
| `craft-libs` (Rev 9be) | `https://github.com/storytold/craft-libs` | `9be9a63782298ab59cd9b7a42ee9cba4f42a5ccb` | VectorCraft | **MISSING NODE:** Vector PDF & Print export backends absent |
| `craft-libs` (Rev e11) | `https://github.com/storytold/craft-libs` | `e11f9d9aebea5f6b8e74643c1ea1ed172ba5f545` | FigCraft | **MISSING NODE:** Font catalog & settings storage absent |
| `storytold/filmcraft` | `https://github.com/storytold/filmcraft` | `d5ead4ba1ee2f1cd13cb86a4239aee2730a3d9f5` | EffectCraft (18 crates) | **MISSING NODE:** EffectCraft cannot compile without external filmcraft clone at commit d5ead4b |
| `storytold/indd-utils` | `https://github.com/storytold/indd-utils` | `7f3060e5bce78d21ea70e0d5eacb96edce15dfbe` | DesignCraft | **MISSING NODE:** InDesign parsing utility absent |

---

## 4. Resolutions Marked as UNKNOWN

In strict accordance with Iteration A5 guidelines, the following resolutions **cannot be proven without Cargo metadata and live lockfile resolution**, and are therefore formally labeled `unknown`:
- **Cargo Target Unification:** Whether Cargo's resolver would successfully unify duplicate package names across git branches.
- **WASM Portability Closure:** Whether native audio device and codec FFI calls compile cleanly to WebAssembly target.
- **SemVer API Compatibility:** Whether breaking changes exist between `craft-libs` rev `92d...` and rev `c5a...`.
