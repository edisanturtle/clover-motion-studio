/**
 * @file exportEngineFase10.test.mjs
 * @description Automated Acceptance Test Suite for Fase 10:
 * Export Studio, Preflight Verification, PNG Still/Sequence,
 * Audio WAV PCM, Project Bundle, Codec/FPS Options, and Queue Lifecycle.
 */

import assert from 'node:assert/strict';
import {
  runExportPreflight,
  isCodecSupported,
  SUPPORTED_VIDEO_CODECS,
} from '../services/exportPreflightService.js';
import {
  createExportItem,
  addExportItem,
  updateExportItem,
  cancelExportItem,
  retryExportItem,
  appendExportLog,
  clearCompletedItems,
  createBatchVariantItems,
  EXPORT_STATUS,
} from '../services/exportQueueService.js';
import {
  renderStillFrame,
  renderPngSequence,
  encodeWavPcm,
  exportNativeProjectBundle,
} from '../services/exportEngine.js';
import {
  createDefaultProject,
  deserializeProject,
} from '../domain/projectSchema.js';
import { addTextLayerToScene, addImageLayerToScene } from '../services/projectService.js';

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

console.log('\n=== Starting Fase 10 Acceptance Test Suite (Export Studio & Preflight) ===\n');

// -------------------------------------------------------------
// Test 1: Preflight Timing & Empty Range Validation
// -------------------------------------------------------------
runTest('1. Preflight Timing & Empty Range Validation', () => {
  const project = createDefaultProject('Test Preflight');

  // Case A: Valid Range (0 to 4s)
  const validRes = runExportPreflight({
    project,
    format: 'webm',
    rangeIn: 0,
    rangeOut: 4,
  });
  assert.equal(validRes.passed, true, 'Valid range should pass preflight');
  assert.equal(validRes.diagnostics.durationSeconds, 4);

  // Case B: Inverted / Empty Range (In >= Out)
  const invalidRes = runExportPreflight({
    project,
    format: 'webm',
    rangeIn: 5,
    rangeOut: 2,
  });
  assert.equal(invalidRes.passed, false, 'Inverted range must fail preflight');
  assert.ok(
    invalidRes.errors.some((e) => e.includes('Empty export range')),
    'Must report empty range error'
  );

  // Case C: Zero Duration Range (In == Out)
  const zeroRes = runExportPreflight({
    project,
    format: 'webm',
    rangeIn: 3,
    rangeOut: 3,
  });
  assert.equal(zeroRes.passed, false, 'Zero duration range must fail preflight');
});

// -------------------------------------------------------------
// Test 2: Preflight Frame Rate & Codec Compatibility
// -------------------------------------------------------------
runTest('2. Preflight Frame Rate & Codec Support Matrix', () => {
  const project = createDefaultProject('Codec Test');

  // Invalid FPS (< 12 or > 60)
  const lowFps = runExportPreflight({ project, fps: 5 });
  assert.equal(lowFps.passed, false);
  assert.ok(lowFps.errors.some((e) => e.includes('Invalid frame rate')));

  const highFps = runExportPreflight({ project, fps: 120 });
  assert.equal(highFps.passed, false);

  // Codec matrix checks
  assert.ok(SUPPORTED_VIDEO_CODECS.includes('video/webm;codecs=vp9'));
  assert.ok(SUPPORTED_VIDEO_CODECS.includes('video/mp4;codecs=avc1'));
  assert.equal(isCodecSupported('video/webm;codecs=vp9'), true);

  // Fallback diagnostic for unsupported browser codec
  const unsupportedCodecRes = runExportPreflight({
    project,
    format: 'mp4',
    codec: 'video/x-unknown-proprietary',
  });
  assert.ok(
    unsupportedCodecRes.warnings.some((w) => w.includes('fallback') || w.includes('not be supported')),
    'Should issue warning for unvetted codecs'
  );
});

// -------------------------------------------------------------
// Test 3: Preflight Missing Media & Font Verification
// -------------------------------------------------------------
runTest('3. Preflight Missing Assets & Font Inspection', () => {
  let project = createDefaultProject('Asset Inspection');
  const sceneId = project.scenes[0].id;

  // Add layer referencing unregistered asset
  const resImg = addImageLayerToScene(project, 0, {
    name: 'Hero Logo',
    assetId: 'asset_missing_ghost_404',
  });
  project = resImg.project;

  // Add layer referencing uncataloged font
  const resTxt = addTextLayerToScene(project, 0, {
    name: 'Headline',
    fontFamily: 'ComicSansCustomUltra',
  });
  project = resTxt.project;

  const res = runExportPreflight({ project });
  assert.equal(res.passed, false, 'Missing asset must fail preflight');
  assert.ok(res.errors.some((e) => e.includes('asset_missing_ghost_404')), 'Error must cite missing assetId');
  assert.ok(
    res.warnings.some((w) => w.includes('ComicSansCustomUltra')),
    'Warning must cite uncataloged font'
  );
  assert.equal(res.diagnostics.missingAssets.length, 1);
  assert.equal(res.diagnostics.missingFonts.length, 1);
});

// -------------------------------------------------------------
// Test 4: Preflight Audio Peaks & Clipping Hazards
// -------------------------------------------------------------
runTest('4. Preflight Audio Peak & Clipping Detection', () => {
  const project = createDefaultProject('Audio Test');

  // Normal audio (peak = 0.85 -> -1.4dB)
  const safeRes = runExportPreflight({
    project,
    format: 'webm',
    includeAudio: true,
    audioPeak: 0.85,
  });
  assert.equal(safeRes.diagnostics.audioClipping, false);

  // Clipped audio (peak = 1.25 > 1.0 -> +1.9dB)
  const clippedRes = runExportPreflight({
    project,
    format: 'webm',
    includeAudio: true,
    audioPeak: 1.25,
  });
  assert.equal(clippedRes.diagnostics.audioClipping, true);
  assert.ok(
    clippedRes.warnings.some((w) => w.includes('Audio clipping detected')),
    'Must issue audio clipping warning'
  );
});

// -------------------------------------------------------------
// Test 5: PNG Still Frame Rendering & Alpha Channel Preservation
// -------------------------------------------------------------
runTest('5. PNG Still Frame Dimensions, Scaling & Transparency', () => {
  const project = createDefaultProject('Still Render Test');

  // Mock canvas and context
  let filledWithRect = false;
  let clearedRect = false;
  const mockContext = {
    canvas: { width: 0, height: 0 },
    save() {},
    restore() {},
    scale() {},
    translate() {},
    rotate() {},
    fillRect() { filledWithRect = true; },
    clearRect() { clearedRect = true; },
    toDataURL() { return 'data:image/png;base64,STUB_PNG_DATA'; },
  };
  const mockCanvas = {
    width: 0,
    height: 0,
    getContext() { return mockContext; },
    toDataURL: mockContext.toDataURL,
  };

  // Render native (1x)
  const still1x = renderStillFrame({
    project,
    sceneIndex: 0,
    localTime: 1.0,
    ratio: '4:5',
    scaleFactor: 1,
    customCanvas: mockCanvas,
  });
  assert.equal(still1x.width, 1080);
  assert.equal(still1x.height, 1350);

  // Render Ultra HD (2x)
  const still2x = renderStillFrame({
    project,
    sceneIndex: 0,
    localTime: 1.0,
    ratio: '4:5',
    scaleFactor: 2,
    customCanvas: mockCanvas,
  });
  assert.equal(still2x.width, 2160);
  assert.equal(still2x.height, 2700);

  // Render Transparent Alpha
  const stillTrans = renderStillFrame({
    project,
    sceneIndex: 0,
    localTime: 1.0,
    ratio: '1:1',
    scaleFactor: 1,
    transparentBg: true,
    customCanvas: mockCanvas,
  });
  assert.equal(stillTrans.width, 1080);
  assert.equal(stillTrans.height, 1080);
  assert.equal(clearedRect, true, 'Transparent option must execute clearRect');
});

// -------------------------------------------------------------
// Test 6: Deterministic PNG Sequence Frame Count & Timing
// -------------------------------------------------------------
await runAsyncTest('6. Deterministic PNG Sequence Duration & Frame Stepping', async () => {
  const project = createDefaultProject('Sequence Test');
  project.scenes[0].duration = 2.0; // 2 seconds

  const progressUpdates = [];
  const sequenceResult = await renderPngSequence({
    project,
    sceneIndex: 0,
    rangeIn: 0,
    rangeOut: 2.0,
    fps: 30,
    ratio: '1:1',
    scaleFactor: 0.5,
    onProgress: (p) => progressUpdates.push(p.currentFrame),
  });

  // Expected frame count = 2.0 * 30 = 60 frames
  assert.equal(sequenceResult.totalFrames, 60, 'Total frames must equal duration * fps');
  assert.equal(sequenceResult.frames.length, 60);
  assert.equal(sequenceResult.frames[0].filename, 'frame_00001.png');
  assert.equal(sequenceResult.frames[59].filename, 'frame_00060.png');
  assert.equal(sequenceResult.frames[0].time, 0.0);
  assert.equal(Number(sequenceResult.frames[30].time.toFixed(2)), 1.0, 'Frame 31 at 30fps is t=1.0s');
  assert.equal(progressUpdates.length, 60, 'Progress must be reported per frame');
});

// -------------------------------------------------------------
// Test 7: Audio-Only Mixdown & Lossless 16-Bit PCM WAV Encoding
// -------------------------------------------------------------
runTest('7. Audio WAV PCM Header Structure & Peak dB Calculation', () => {
  const sampleRate = 44100;
  const numSamples = 44100; // 1 second
  const left = new Float32Array(numSamples);
  const right = new Float32Array(numSamples);

  // 1 kHz sine wave with peak amplitude 0.5 (-6.02 dB)
  for (let i = 0; i < numSamples; i++) {
    const s = Math.sin(2 * Math.PI * 1000 * (i / sampleRate)) * 0.5;
    left[i] = s;
    right[i] = s;
  }

  const wav = encodeWavPcm({
    channelData: [left, right],
    sampleRate,
  });

  assert.equal(wav.duration, 1.0);
  assert.equal(wav.peakAmplitude, 0.5);
  assert.equal(wav.peakDb, -6.02, 'Peak dB for 0.5 amplitude must be -6.02 dB');

  // Verify RIFF header structure in DataView
  const view = new DataView(wav.buffer);
  const riffTag = String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3));
  const waveTag = String.fromCharCode(view.getUint8(8), view.getUint8(9), view.getUint8(10), view.getUint8(11));
  assert.equal(riffTag, 'RIFF');
  assert.equal(waveTag, 'WAVE');
  assert.equal(view.getUint16(20, true), 1, 'Audio format must be 1 (PCM)');
  assert.equal(view.getUint16(22, true), 2, 'Num channels must be 2');
  assert.equal(view.getUint32(24, true), 44100, 'Sample rate must be 44100');
  assert.equal(view.getUint16(34, true), 16, 'Bits per sample must be 16');
});

// -------------------------------------------------------------
// Test 8: Native Project Bundle Export & Deserialization Round-Trip
// -------------------------------------------------------------
runTest('8. Native Project Bundle Packaging & Deserialization', () => {
  const original = createDefaultProject('Native Bundle Spec');
  original.scenes[0].name = 'Hero Scene';

  const bundle = exportNativeProjectBundle(original, true);
  assert.ok(bundle.filename.endsWith('.clovermotion.json'));
  assert.ok(bundle.jsonString.length > 100);

  // Deserialize bundle back into project
  const restored = deserializeProject(bundle.jsonString);
  assert.equal(restored.name, 'Native Bundle Spec');
  assert.equal(restored.scenes[0].name, 'Hero Scene');
  assert.equal(restored.schemaVersion, 1);
});

// -------------------------------------------------------------
// Test 9: Export Queue Lifecycle (Add, Progress, Cancel, Retry, Logs)
// -------------------------------------------------------------
runTest('9. Export Queue Manager Lifecycle & Diagnostic Logs', () => {
  let queue = [];

  // Add Item
  queue = addExportItem(queue, {
    name: 'Story Render 9:16',
    format: 'webm',
    ratio: '9:16',
    fps: 30,
  });
  assert.equal(queue.length, 1);
  const itemId = queue[0].id;
  assert.equal(queue[0].status, EXPORT_STATUS.QUEUED);

  // Update Progress & Append Frame Log
  queue = updateExportItem(queue, itemId, {
    status: EXPORT_STATUS.PROCESSING,
    progress: 0.5,
    currentFrame: 45,
    totalFrames: 90,
  });
  queue = appendExportLog(queue, itemId, 'Rendered frame 45/90', 'info');
  assert.equal(queue[0].status, EXPORT_STATUS.PROCESSING);
  assert.equal(queue[0].progress, 0.5);
  assert.equal(queue[0].logs.length, 2);

  // Cancel Item
  queue = cancelExportItem(queue, itemId);
  assert.equal(queue[0].status, EXPORT_STATUS.CANCELLED);
  assert.ok(queue[0].logs.some((l) => l.message.includes('cancelled')));

  // Retry Item
  queue = retryExportItem(queue, itemId);
  assert.equal(queue[0].status, EXPORT_STATUS.QUEUED);
  assert.equal(queue[0].progress, 0);

  // Mark Completed & Clear
  queue = updateExportItem(queue, itemId, { status: EXPORT_STATUS.COMPLETED, progress: 1.0 });
  const cleared = clearCompletedItems(queue);
  assert.equal(cleared.length, 0, 'Completed items must be cleaned up from active queue');
});

// -------------------------------------------------------------
// Test 10: Batch Multi-Format Variants Queue Generation
// -------------------------------------------------------------
runTest('10. 1-Click Multi-Format Batch Variant Queue Generation', () => {
  const project = createDefaultProject('Campaign Launch');
  const batchItems = createBatchVariantItems(project, ['4:5', '1:1', '9:16'], {
    format: 'png',
    resolutionScale: 'original',
    fps: 30,
  });

  assert.equal(batchItems.length, 3, 'Must create 3 variant queue items');
  assert.equal(batchItems[0].ratio, '4:5');
  assert.equal(batchItems[1].ratio, '1:1');
  assert.equal(batchItems[2].ratio, '9:16');
  assert.equal(batchItems[0].name, 'Campaign Launch [4:5]');
  assert.equal(batchItems[1].name, 'Campaign Launch [1:1]');
  assert.equal(batchItems[2].name, 'Campaign Launch [9:16]');
});

console.log(`\n========================================`);
console.log(`Fase 10 Test Results: ${passedTests} Passed, ${failedTests} Failed`);
console.log(`========================================\n`);

if (failedTests > 0) {
  process.exit(1);
}
