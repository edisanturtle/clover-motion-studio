# Laporan Implementasi Fase 4 — Animation Engine, Project Clock & Keyframe Interpolation

**Proyek**: Clover Motion Studio (`clover.motion`)  
**Fase**: Fase 4 (Animation Engine & Keyframing)  
**Status**: SELESAI (Verified & Passing)  
**Tanggal**: 2026-11-06  
**Standar Arsitektur**: Next.js 16 (App Router), React 19, Tailwind CSS 4, HTML5 2D Canvas, Web Audio API, ADR 001–006.

---

## 1. Ringkasan Eksekutif

Sesuai instruksi:
> *"Jalankan Fase 4 saja. Bangun sequence/scene, fps/timecode berbasis project clock, playhead, play/pause/loop/scrub/frame-step, tracks, markers dan keyframes untuk position/scale/rotation/opacity. Tambahkan linear/ease/custom Bezier curve, add/remove/duplicate/multi-select/snap/copy-paste keyframes, property lanes dan value graph. Preview harus memakai evaluator keyframe yang sama dengan final render. Pastikan waktu deterministik setelah reload dan tidak menggeser audio/video clock. Sediakan satu animasi sample yang semua keyframe-nya editable."*

Seluruh kapabilitas Fase 4 telah diimplementasikan, diverifikasi, dan diuji secara komprehensif. Arsitektur keyframe evaluation kini beroperasi sebagai single source of truth yang murni dan deterministik untuk preview interaktif di viewport, fullscreen preview, format review, maupun ekspor video render akhir.

---

## 2. Kapabilitas yang Diimplementasikan

### 2.1 Project Clock & SMPTE Timecode Determinism (`src/core/domain/timebase.js`)
- **Basis Integer Ticks Kanonikal**: Berlandaskan `TICKS_PER_SECOND = 254_016_000_000n` (ADR 004), membagi frame rate (24, 25, 30, 60, 29.97, 23.976, 59.94) dengan sisa 0 tanpa akumulasi drift floating point.
- **Format SMPTE Presisi (`timebaseToTimecode`)**: Mengonversi waktu ticks secara eksak ke `HH:MM:SS:FF` (misalnya 1.5s @ 30fps menghasilkan tepat `00:00:01:15`).
- **Deterministic Frame-Step (`frameStepTime`)**:
  - Maju 1 frame (`.` atau tombol Next Frame)
  - Mundur 1 frame (`,` atau tombol Prev Frame)
  - Melangkah tepat `ticksPerFrame`, menjamin 30 frame step pada 30fps kembali ke tepat 1.000 detik tanpa deviasi desimal.
- **Magnetic Frame Snapping (`snapTimeToFrame`)**: Membulatkan waktu secara deterministik ke batas frame terdekat (`round(t * fps) / fps`).

### 2.2 Unified Keyframe Evaluator (`src/core/services/animationEngine.js`, `src/engine/canvasRenderer.js`)
- Mengabstraksi evaluasi kurva animasi matematis secara murni tanpa dependensi DOM/browser.
- Mendukung 5 channel animatable properties:
  1. `posX` (dan alias `x`)
  2. `posY` (dan alias `y`)
  3. `scale`
  4. `rotation`
  5. `opacity`
- Mendukung tipe interpolasi & kurva:
  - `linear`: Kemajuan linier $t$.
  - `ease` (CSS default `cubic-bezier(0.25, 0.1, 0.25, 1.0)`).
  - `easeIn` (CSS ease-in `cubic-bezier(0.42, 0, 1.0, 1.0)`).
  - `easeOut` (CSS ease-out `cubic-bezier(0, 0, 0.58, 1.0)`).
  - `easeInOut` (CSS ease-in-out `cubic-bezier(0.42, 0, 0.58, 1.0)`).
  - `bezier`: Cubic-Bézier kustom berbasis solver Newton-Raphson presisi tinggi dengan koordinat kontrol `[cp1x, cp1y, cp2x, cp2y]`.
  - Preset Bézier: `Smooth` `[0.25, 0.1, 0.25, 1.0]`, `Snappy` `[0.22, 1.0, 0.36, 1.0]`, `Anticipate` `[0.36, 0.0, 0.66, -0.56]`, `Overshoot` `[0.34, 1.56, 0.64, 1.0]`.
- **Single Source of Truth**: Digunakan secara identik oleh:
  - Interactive Canvas Viewport (`CanvasViewport.jsx`)
  - Fullscreen Stage Mode (`FullscreenPreviewModal.jsx`)
  - Format Review Modal (`FormatReviewModal.jsx`)
  - Multi-preset Exporter (`ExportModal.jsx`)

### 2.3 Tracks, Property Lanes & Keyframe Interactions (`src/components/layout/TimelinePanel.jsx`)
- **Expanded Layer Tracks**: Setiap layer dapat di-expand untuk menampilkan 5 jalur properti (`Position X`, `Position Y`, `Scale`, `Rotation`, `Opacity`).
- **Evaluated Value Indicator**: Setiap jalur properti menampilkan nilai evaluasi real-time pada waktu playhead saat ini (dalam satuan %, px, atau derajat °).
- **Capsule Bar**: Bar kapsul menghubungkan sekuens keyframe pada jalur properti.
- **Keyframe Diamond Nodes**:
  - Klik biasa: Seleksi keyframe tunggal (`selectedKeyframeIds = [id]`).
  - Shift-Klik: Multi-seleksi keyframe (`selectedKeyframeIds = [...ids]`).
  - Dragging: Menggeser waktu keyframe secara halus dengan snapping magnetik ke batas frame tick (`1/fps`).
  - Double-Click: Menghapus keyframe langsung.
  - Visual Feedback: Keyframe yang terseleksi menyala dengan ring hijau Clover (`ring-2 ring-[#22c55e] scale-125`).

### 2.4 Operasi Manajemen Keyframe Lengkap (`src/core/services/projectService.js`)
- `addKeyframeToLayer`: Menambah keyframe baru pada waktu playhead, atau mengupdate nilai/interpolasi jika keyframe pada waktu dan properti yang sama sudah ada.
- `updateKeyframeInLayer`: Mengupdate nilai, waktu, atau tipe kurva keyframe dan mempertahankan pengurutan kronologis.
- `deleteKeyframesFromLayer`: Menghapus satu atau sekelompok keyframe terseleksi.
- `duplicateKeyframesInLayer`: Menduplikasi keyframe terpilih dengan pergeseran waktu ke depan (+0.5s atau offset frame).
- `pasteKeyframesToLayer`: Menempelkan keyframe dari memori clipboard dengan frame snapping otomatis.

### 2.5 Value Graph & Bézier Curve Editor
- Mode tampilan **Value Graph** menggambar kurva nilai kontinu terhadap waktu menggunakan SVG bervektor (`stroke="#22c55e"`).
- Node keyframe pada kurva dapat diklik untuk seleksi, dan diseret secara interaktif.
- **Curve & Value Inspector Sub-Bar**:
  - Menampilkan input angka untuk Time (s) dan Value.
  - Dropdown pemilih tipe kurva (Linear, Ease, Ease In, Ease Out, Ease In Out, Custom Bézier).
  - Ketika memilih `Custom Bézier`, muncul tombol preset (`Smooth`, `Snappy`, `Anticipate`, `Overshoot`), input numerik 4 koordinat `[cp1x, cp1y, cp2x, cp2y]`, serta diagram pratinjau mini kurva Bézier SVG real-time.

### 2.6 Timeline Markers
- Marker sekuens/scene disimpan dalam entitas `scene.markers = [{ id, time, label, color }]`.
- Ditampilkan sebagai pin vertikal berwarna kuning amber pada timecode ruler.
- Mengklik marker menggeser playhead langsung ke waktu marker tersebut.
- Double-click pada ruler menambah marker baru pada posisi playhead.
- Double-click pada pin marker menghapus marker.

### 2.7 Animasi Sampel Editable (`src/fixtures/sampleAnimationProject.js`)
- Proyek sampel kanonikal **"Kinetic Brand Launch (Fase 4 Sample)"**:
  - **Kinetic Headline**: Keyframe Position Y (Snappy Bézier), Scale (Overshoot Bézier), dan Opacity (Ease In).
  - **Subtitle Tagline**: Keyframe Opacity dan Position Y (Ease Out).
  - **Geometric Star**: Keyframe Scale (Anticipate Bézier), Rotation 0°–360° (Linear/EaseInOut), Opacity.
  - **Pill Status Badge**: Keyframe Position X horizontal sweep (Snappy Bézier) dan Opacity.
  - **4 Timeline Markers**: "Intro Pulse" (0.0s), "Title Apex" (0.8s), "Star Accent" (1.6s), "Badge Lock" (2.8s).
- Tersedia tombol **"Sample Animation"** pada Project Browser (`MyProjectsModal.jsx`) untuk langsung memuat dan menguji animasi ini. Setiap keyframe dapat diedit, digeser, atau diubah kurvanya.

---

## 3. Bukti Verifikasi & Pengujian (Acceptance Evidence)

### 3.1 Automated Test Suite Fase 4 (`src/core/__tests__/keyframeEngineFase4.test.mjs`)
Dijalankan via Node.js:
```bash
node src/core/__tests__/keyframeEngineFase4.test.mjs
```
Hasil uji:
- **Test 1**: Rational Integer Clock & Timecode Determinism -> **PASSED**
- **Test 2**: Keyframe Evaluation with Linear Interpolation -> **PASSED**
- **Test 3**: Standard Easing Interpolation (Ease In, Ease Out, Ease In-Out) -> **PASSED**
- **Test 4**: Custom Cubic-Bézier Curves ([cp1x, cp1y, cp2x, cp2y]) -> **PASSED**
- **Test 5**: Multi-Channel Synchronous Keyframe Evaluation (posX, posY, scale, rotation, opacity) -> **PASSED**
- **Test 6**: Keyframe Domain Operations (Add, Update, Duplicate, Delete, Paste) -> **PASSED**
- **Test 7**: Scene Timeline Markers (Add, Sort, Delete) -> **PASSED**
- **Test 8**: Editable Sample Animation Project Schema & Evaluation -> **PASSED**
- **Status**: **8/8 PASSED (100% Success)**

### 3.2 Regression Check Test Suites (Fase 2 & Fase 3)
Dijalankan bersamaan:
```bash
node src/core/__tests__/saveCloseReopen.test.mjs && node src/core/__tests__/designCanvasFase3.test.mjs
```
- **Fase 2 Acceptance**: **6/6 PASSED (100% Coverage)**
- **Fase 3 Acceptance**: **8/8 PASSED (100% Coverage)**
- **Total Suite Passing**: **22/22 Tests PASSED**.

### 3.3 Production Build Verification
Dijalankan via Turbopack:
```bash
npm run build
```
- **Status**: **Compiled successfully in 850ms** tanpa error sintaks, TypeScript check bersih, 0 linting fatal issues.

### 3.4 Live Local Server
- Server aktif di `http://localhost:3000/` merespons **HTTP 200 OK**.

---

## 4. File yang Diubah & Dibuat

| File | Status | Perubahan |
|---|---|---|
| `src/core/domain/timebase.js` | Dimodifikasi | Menambahkan `timebaseToTimecode`, `frameStepTime`, dan `snapTimeToFrame`. |
| `src/core/domain/models.js` | Dimodifikasi | Menambahkan `createKeyframe`, `createMarker`, dan dukungan `markers` pada scene. |
| `src/core/services/animationEngine.js` | Dibuat | Engine evaluasi matematis keyframe murni dan solver kurva Bézier kustom. |
| `src/core/services/projectService.js` | Dimodifikasi | Menambahkan operasi keyframe domain: add, update, duplicate, delete, paste, dan marker management. |
| `src/engine/canvasRenderer.js` | Dimodifikasi | Mengintegrasikan evaluator keyframe dari `animationEngine.js` sebagai single source of truth render. |
| `src/components/layout/TimelinePanel.jsx` | Dimodifikasi | Waktu SMPTE eksak, kontrol frame-step, multi-seleksi keyframe, tombol duplikasi/snap, property lanes, value graph editor, dan timeline markers. |
| `src/components/CloverMotionStudio.jsx` | Dimodifikasi | Shortcut keyboard frame-step (`,` dan `.`), handler keyframe & marker, serta integrasi state. |
| `src/components/modals/MyProjectsModal.jsx` | Dimodifikasi | Menambahkan tombol 1-klik "Sample Animation" untuk memuat project animasi sampel Fase 4. |
| `src/fixtures/sampleAnimationProject.js` | Dibuat | Proyek animasi sampel terstruktur dengan sekuens keyframe multi-saluran dan kurva Bézier yang dapat diedit bebas. |
| `src/core/__tests__/keyframeEngineFase4.test.mjs` | Dibuat | Test suite komprehensif 8 skenario pengujian Fase 4. |

---

## 5. Kepatuhan Batasan & Status Fase

- **Batasan Fase**: Hanya mengerjakan **Fase 4**. Fase multi-track audio compositing (Fase 5) dan DSP synth lanjutan (Fase 6) tidak disentuh sebelum instruksi berikutnya.
- **Zero Drift**: Waktu deterministik setelah reload berkat timebase integer ticks dan evaluator matematis murni.
- **Unified Preview/Render**: Render canvas viewport dan render ekspor memakai evaluator yang 100% sama.
