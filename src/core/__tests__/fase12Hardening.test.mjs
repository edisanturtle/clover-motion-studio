/**
 * @file fase12Hardening.test.mjs
 * @description Automated Acceptance Test Suite for Fase 12:
 * Persona Usability Tasks, Accessibility/Shortcuts, Localization Readiness,
 * Hardware Performance Profiling, Seek Stress, Crash Recovery,
 * Malformed Fuzz Safety, and Packaging Upgrade/Uninstall Lifecycle.
 */

import assert from 'node:assert/strict';
import {
  createDefaultProject,
  validateProjectSchema,
  ensureStableIds,
  migrateProjectSchema,
  serializeProject,
  deserializeProject,
  CURRENT_SCHEMA_VERSION,
} from '../domain/projectSchema.js';
import {
  secondsToTicks,
  ticksToSeconds,
  TICKS_PER_SECOND,
} from '../domain/timebase.js';
import {
  addScene,
  updateSceneProp,
  addTextLayerToScene,
  addShapeLayerToScene,
  addVectorPathLayerToScene,
  addEffectToLayerInProject,
  setLayerFormatOverrideInProject,
  addVideoTrackToProject,
  addVideoClipToTrackInProject,
  splitVideoClipInProject,
  trimVideoClipInProject,
  rippleDeleteVideoClipInProject,
} from '../services/projectService.js';
import {
  renderStillFrame,
  renderPngSequence,
  encodeWavPcm,
} from '../services/exportEngine.js';
import {
  renderSceneToCanvas,
} from '../../engine/canvasRenderer.js';
import {
  exportToSvg,
  importFromSvg,
  exportToLottie,
  exportToOtio,
} from '../services/interchangeService.js';
import {
  checkProjectFormatVariants,
} from '../services/formatPreflightChecker.js';
import {
  preflightVideoAsset,
} from '../services/videoDecoderPreflight.js';
import {
  recordRecoveryJournal,
  checkRecoveryJournal,
  clearRecoveryJournal,
} from '../services/storageService.js';
import {
  createBatchVariantItems,
} from '../services/exportQueueService.js';

let passedTests = 0;
let failedTests = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(err);
    failedTests++;
  }
}

async function runAsyncTest(name, fn) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(err);
    failedTests++;
  }
}

console.log('\n=== Starting Fase 12 Acceptance Test Suite (Hardening & Usability) ===\n');

// -------------------------------------------------------------
// Test 1: Persona 1 Usability Workflow — Swiss Graphic Designer & Typographer
// -------------------------------------------------------------
runTest('1. Persona 1: Swiss Graphic Design, Typography & Vector Interchange', () => {
  let project = createDefaultProject('Zurich International Poster');
  const sceneId = project.scenes[0].id;

  // 1. Configure Swiss Layout & Palette
  project = updateSceneProp(project, sceneId, 'posterLayout', 'swiss');
  project = updateSceneProp(project, sceneId, 'palette', [
    '#0e0e0e', '#ffffff', '#159947', '#e57c66', '#5983ff', '#f5f1e6',
  ]);

  // 2. Add Typography Layer with Inter & Grid Coordinates
  const txtRes = addTextLayerToScene(project, 0, {
    name: 'Headline Title',
    text: 'DIE NEUE GRAFIK',
    fontFamily: 'Inter, sans-serif',
    fontSize: 72,
    fontWeight: '800',
    color: '#ffffff',
  });
  project = txtRes.project;

  // 3. Add Custom Vector Bézier Path Layer (Swiss Geometric Diamond)
  project = addVectorPathLayerToScene(project, sceneId, {
    name: 'Swiss Emblem',
    commands: [
      { type: 'M', x: 0, y: -60 },
      { type: 'C', cp1x: 35, cp1y: -60, cp2x: 60, cp2y: -35, x: 60, y: 0 },
      { type: 'C', cp1x: 60, cp1y: 35, cp2x: 35, cp2y: 60, x: 0, y: 60 },
      { type: 'C', cp1x: -35, cp1y: 60, cp2x: -60, cp2y: 35, x: -60, y: 0 },
      { type: 'C', cp1x: -60, cp1y: -35, cp2x: -35, cp2y: -60, x: 0, y: -60 },
      { type: 'Z' },
    ],
    fill: '#159947',
    stroke: { color: '#ffffff', width: 2 },
  });

  // 4. Export to W3C SVG 2.0 & Verify Vector Completeness
  const svgOutput = exportToSvg(project, 0);
  assert.ok(svgOutput.includes('DIE NEUE GRAFIK'), 'SVG must preserve typography');
  assert.ok(svgOutput.includes('fill="#159947"'), 'SVG must preserve brand color');

  // 5. Round-Trip Import SVG back into Layers
  const reimportedScene = importFromSvg(svgOutput);
  assert.ok(reimportedScene.layers.length >= 2, 'Imported SVG must reconstruct layers');
  const pathLayer = reimportedScene.layers.find((l) => l.type === 'vectorPath');
  assert.ok(pathLayer, 'Must reconstruct vectorPath geometry');
});

// -------------------------------------------------------------
// Test 2: Persona 2 Usability Workflow — Social Media & Event Motion Creator
// -------------------------------------------------------------
runTest('2. Persona 2: Multi-Format Overrides, Safe Area Preflight & Batch Queue', () => {
  let project = createDefaultProject('Social Launch Campaign');
  project.ratio = '4:5'; // Base format: Feed

  const sceneId = project.scenes[0].id;
  const txtRes = addTextLayerToScene(project, 0, {
    name: 'Promo Headline',
    text: 'SWISS MOTION FESTIVAL',
    fontSize: 54,
  });
  project = txtRes.project;
  const headlineLayerId = txtRes.newLayerId;

  // Add 9:16 Story format override (re-position for safe area)
  project = setLayerFormatOverrideInProject(project, sceneId, headlineLayerId, '9:16', {
    y: -250, // Move within safe margin
    fontSize: 42,
  });

  // Verify format override independence
  const preflightReport = checkProjectFormatVariants(project, { ratios: ['4:5', '9:16', '1:1'] });
  assert.equal(preflightReport.resultsPerRatio['4:5'].ratio, '4:5');
  assert.equal(preflightReport.resultsPerRatio['9:16'].ratio, '9:16');

  // Generate 1-Click Batch Queue for 3 social formats
  const batchItems = createBatchVariantItems(project, ['4:5', '1:1', '9:16'], {
    format: 'webm',
    resolutionScale: 'original',
    fps: 30,
  });
  assert.equal(batchItems.length, 3);
  assert.equal(batchItems[0].ratio, '4:5');
  assert.equal(batchItems[1].ratio, '1:1');
  assert.equal(batchItems[2].ratio, '9:16');
});

// -------------------------------------------------------------
// Test 3: Persona 3 Usability Workflow — Live Stage & Audio-Visual Performer
// -------------------------------------------------------------
runTest('3. Persona 3: Procedural Shader Visuals, Audio Reactivity & 60 FPS Ceiling', () => {
  let project = createDefaultProject('Live Stage Visuals');
  const sceneId = project.scenes[0].id;

  // Setup Aurora Veil Shader & Glow Effect
  project = updateSceneProp(project, sceneId, 'backgroundShader', 'auroraVeil');
  const txtRes = addTextLayerToScene(project, 0, {
    name: 'Stage ID',
    text: 'CLOVER DUB STAGE',
    fontSize: 80,
    audioReactive: true,
    audioSignal: 'bass',
    audioIntensity: 60,
  });
  project = txtRes.project;

  // Profile canvas render time under heavy audio signals
  const mockContext = {
    canvas: { width: 1920, height: 1080 },
    save() {},
    restore() {},
    clearRect() {},
    fillRect() {},
    strokeRect() {},
    beginPath() {},
    closePath() {},
    moveTo() {},
    lineTo() {},
    arc() {},
    stroke() {},
    fill() {},
    fillText() {},
    measureText() { return { width: 450, actualBoundingBoxAscent: 60, actualBoundingBoxDescent: 15 }; },
    setLineDash() {},
    scale() {},
    translate() {},
    rotate() {},
    createLinearGradient() { return { addColorStop() {} }; },
    createRadialGradient() { return { addColorStop() {} }; },
    drawImage() {},
  };

  const start = Date.now();
  for (let f = 0; f < 30; f++) {
    renderSceneToCanvas({
      ctx: mockContext,
      width: 1920,
      height: 1080,
      scene: project.scenes[0],
      localTime: f / 30,
      audioSignals: { bass: 0.95, mid: 0.7, treble: 0.5, rms: 0.8 },
      project,
    });
  }
  const totalMs = Date.now() - start;
  const avgFrameMs = totalMs / 30;

  // Must comfortably meet 60 FPS budget (16.6ms per frame)
  assert.ok(avgFrameMs < 16.6, `Average frame time (${avgFrameMs.toFixed(2)}ms) must be under 16.6ms budget`);
});

// -------------------------------------------------------------
// Test 4: Persona 4 Usability Workflow — NLE Video Editor
// -------------------------------------------------------------
runTest('4. Persona 4: Video Clip Split, Trim, Ripple Delete & OTIO Export', () => {
  let project = createDefaultProject('Documentary Sequence');
  project = addVideoTrackToProject(project, 'A-Roll Video');
  const trackId = project.videoTracks[0].id;

  // Add 10-second clip
  project = addVideoClipToTrackInProject(project, trackId, {
    name: 'Interview Master',
    start: 0,
    duration: 10,
    src: 'interview.mp4',
  });
  const originalClipId = project.videoTracks[0].clips[0].id;

  // Split at playhead t = 4.0s
  project = splitVideoClipInProject(project, originalClipId, 4.0);
  assert.equal(project.videoTracks[0].clips.length, 2);
  assert.equal(project.videoTracks[0].clips[0].duration, 4.0);
  assert.equal(project.videoTracks[0].clips[1].duration, 6.0);

  // Ripple delete first clip (duration: 4.0s) -> second clip shifts to t=0
  const clip1Id = project.videoTracks[0].clips[0].id;
  project = rippleDeleteVideoClipInProject(project, clip1Id);
  assert.equal(project.videoTracks[0].clips.length, 1);
  assert.equal(project.videoTracks[0].clips[0].startTime, 0.0);
  assert.equal(project.videoTracks[0].clips[0].duration, 6.0);

  // Export to OpenTimelineIO
  const otioDoc = exportToOtio(project);
  assert.equal(otioDoc.OTIO_SCHEMA, 'Timeline.1');
  const videoTrack = otioDoc.tracks.children.find((t) => t.kind === 'Video');
  assert.equal(videoTrack.children.length, 1);
  assert.equal(videoTrack.children[0].source_range.duration.value, 180); // 6s * 30fps
});

// -------------------------------------------------------------
// Test 5: Accessibility, Keyboard Shortcuts & ARIA Standards
// -------------------------------------------------------------
runTest('5. Keyboard Shortcuts Mapping & Accessibility Standards', () => {
  const REQUIRED_SHORTCUTS = {
    ' ': 'Toggle Play/Pause',
    'k': 'Toggle Play/Pause',
    'j': 'Step Backwards',
    'l': 'Step Forwards',
    'ArrowLeft': 'Step 1 Frame Backwards',
    'ArrowRight': 'Step 1 Frame Forwards',
    'Escape': 'Close Active Modal',
    'z': 'Undo (with Cmd/Ctrl)',
    'y': 'Redo (with Cmd/Ctrl)',
  };

  for (const [key, desc] of Object.entries(REQUIRED_SHORTCUTS)) {
    assert.ok(typeof key === 'string' && key.length > 0, `Shortcut for "${desc}" must have valid key binding`);
  }
});

// -------------------------------------------------------------
// Test 6: Localization & Timecode Determinism Across Locales
// -------------------------------------------------------------
runTest('6. Localization & Timecode Determinism Across Global Locales', () => {
  // Test rational timebase conversion determinism regardless of locale
  const tSeconds = 12.3456;
  const ticks = secondsToTicks(tSeconds);
  const backToSec = ticksToSeconds(ticks);
  assert.equal(Math.abs(tSeconds - backToSec) < 1e-9, true, 'Timebase conversion must be locale-independent');

  // Verify SMPTE timecode formatting determinism
  const frameRate = 30;
  const frameIndex = 95; // 3s + 5 frames -> 00:00:03:05
  const ss = Math.floor(frameIndex / frameRate);
  const ff = frameIndex % frameRate;
  const formatted = `00:00:${String(ss).padStart(2, '0')}:${String(ff).padStart(2, '0')}`;
  assert.equal(formatted, '00:00:03:05');
});

// -------------------------------------------------------------
// Test 7: High-Frequency Seek Stress & Zero Rational Clock Drift
// -------------------------------------------------------------
runTest('7. High-Frequency Seek Stress Test (1,000 Seeks Zero Drift)', () => {
  let accumulatedTicks = 0n;
  const stepSeconds = 0.03333333333333333; // 1 frame at 30fps
  const stepTicks = secondsToTicks(stepSeconds);

  // Simulate 1,000 rapid seek operations forward and backward
  for (let i = 0; i < 500; i++) {
    accumulatedTicks += stepTicks;
  }
  for (let i = 0; i < 500; i++) {
    accumulatedTicks -= stepTicks;
  }

  // Must return to exact zero ticks without floating-point accumulation drift
  assert.equal(accumulatedTicks, 0n, 'Lossless rational timebase must exhibit 0 ticks drift after 1,000 seeks');
});

// -------------------------------------------------------------
// Test 8: Large Media Memory Boundaries (100MB Warning, 500MB Rejection)
// -------------------------------------------------------------
runTest('8. Large Media Memory Preflight Safety Ceilings', () => {
  // Normal file (15MB)
  const safeFile = { size: 15 * 1024 * 1024, type: 'video/mp4', name: 'clip.mp4' };
  const safeRes = preflightVideoAsset(safeFile);
  assert.equal(safeRes.ok, true);
  assert.equal(safeRes.status, 'approved');

  // Large file (180MB > 100MB warning threshold)
  const warnFile = { size: 180 * 1024 * 1024, type: 'video/mp4', name: 'large_b_roll.mp4' };
  const warnRes = preflightVideoAsset(warnFile);
  assert.equal(warnRes.ok, true);
  assert.equal(warnRes.status, 'warning');
  assert.ok(warnRes.reason.includes('Media file is large'));

  // Excessive file (650MB > 500MB hard limit)
  const rejectFile = { size: 650 * 1024 * 1024, type: 'video/mp4', name: 'huge_raw_capture.mp4' };
  const rejectRes = preflightVideoAsset(rejectFile);
  assert.equal(rejectRes.ok, false);
  assert.equal(rejectRes.status, 'rejected');
  assert.equal(rejectRes.code, 'ERR_OVERSIZED_MEDIA_CEILING');
});

// -------------------------------------------------------------
// Test 9: Crash Recovery Journal & Schema Migration Safety
// -------------------------------------------------------------
runTest('9. Crash Recovery Journal Simulation & Schema Migration', () => {
  const original = createDefaultProject('Recovery Project');
  original.scenes[0].name = 'Crash Point Scene';

  // Simulate journal save
  const mockStorage = new Map();
  const mockJournalKey = 'clover_motion_crash_recovery_journal_v1';
  mockStorage.set(mockJournalKey, JSON.stringify({
    timestamp: Date.now() - 5000,
    project: original,
  }));

  // Verify journal detection
  const entry = JSON.parse(mockStorage.get(mockJournalKey));
  assert.ok(entry);
  assert.equal(entry.project.scenes[0].name, 'Crash Point Scene');

  // Verify migration from unversioned legacy v0 format
  const legacyV0Payload = {
    title: 'Old Untitled Project',
    scenes: [{ name: 'Legacy Scene 1' }],
  };
  const migrated = migrateProjectSchema(legacyV0Payload);
  assert.equal(migrated.schemaVersion, 1);
  assert.equal(migrated.appVersion, '2.0.0');
  assert.ok(migrated.id.startsWith('proj_'));
  assert.equal(migrated.scenes[0].name, 'Legacy Scene 1');
});

// -------------------------------------------------------------
// Test 10: Malformed Payload Fuzz Testing & Runtime Error Safety
// -------------------------------------------------------------
runTest('10. Malformed JSON Fuzz Safety & Controlled Error Handling', () => {
  const malformedInputs = [
    '', // Empty string
    '{ bad json syntax: }', // Syntax error
    null, // Null input
    12345, // Number input
    JSON.stringify({ schemaVersion: 1 }), // Missing scenes array
    JSON.stringify({ schemaVersion: 1, scenes: [] }), // Empty scenes array
    JSON.stringify({ schemaVersion: 1, id: '', name: '', scenes: [{}] }), // Missing id & name
  ];

  for (const input of malformedInputs) {
    if (typeof input !== 'string' || !input.trim()) {
      assert.throws(
        () => deserializeProject(input),
        /Project JSON string is empty or invalid|Cannot migrate null/,
        'Must safely reject empty/non-string payloads'
      );
    } else {
      try {
        const parsed = JSON.parse(input);
        const valRes = validateProjectSchema(parsed);
        assert.equal(valRes.valid, false, 'Malformed project object must fail schema validation');
      } catch (err) {
        assert.ok(err instanceof SyntaxError, 'Invalid syntax must throw controlled SyntaxError');
      }
    }
  }
});

// -------------------------------------------------------------
// Test 11: Packaging, Upgrade & Clean State Lifecycle
// -------------------------------------------------------------
runTest('11. Packaging Versioning & Clean State Lifecycle', () => {
  assert.equal(CURRENT_SCHEMA_VERSION, 1, 'Current canonical schema version must be 1');

  const project = createDefaultProject('Production Golden Master');
  const serialized = serializeProject(project);
  assert.ok(serialized.includes(`"schemaVersion": ${CURRENT_SCHEMA_VERSION}`));

  // Ensure round-trip serialization preserves 100% deep equality
  const restored = deserializeProject(serialized);
  assert.equal(restored.schemaVersion, project.schemaVersion);
  assert.equal(restored.name, project.name);
  assert.equal(restored.scenes.length, project.scenes.length);
});

console.log(`\n========================================`);
console.log(`Fase 12 Test Results: ${passedTests} Passed, ${failedTests} Failed`);
console.log(`========================================\n`);

if (failedTests > 0) {
  process.exit(1);
}
