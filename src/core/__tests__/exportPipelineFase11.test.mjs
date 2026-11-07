/**
 * @file exportPipelineFase11.test.mjs
 * @description Comprehensive Acceptance Test Suite for Fase 11:
 * Real Export Pipeline, Preflight Verification (Media, Fonts, Effects, Timing, Audio, Alpha, License),
 * SHA-256 Audit Manifest & Receipts, Progress/Cancel/Retry Lifecycle, and Native Project Editability.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  runExportPreflight,
  isCodecSupported,
  SUPPORTED_VIDEO_CODECS,
  SUPPORTED_EXPORT_FORMATS,
} from '../services/exportPreflightService.js';

import {
  computeBufferHash,
  generateExportManifest,
  getFormatLimitations,
} from '../services/exportManifestService.js';

import {
  createExportItem,
  addExportItem,
  updateExportItem,
  cancelExportItem,
  retryExportItem,
  EXPORT_STATUS,
} from '../services/exportQueueService.js';

import {
  createDefaultProject,
  serializeProject,
  deserializeProject,
} from '../domain/projectSchema.js';

import { addShapeLayerToScene } from '../services/projectService.js';

test('Fase 11: Real Export Pipeline, Preflight Verification & Output Manifest', async (t) => {
  await t.test('1. Preflight Invariant: Dimensions, Frame Rate (12-60 FPS) and Duration Validation', () => {
    const project = createDefaultProject('Timing Test');

    // Valid configuration
    const validRes = runExportPreflight({
      project,
      format: 'webm',
      ratio: '1:1',
      fps: 30,
      rangeIn: 0,
      rangeOut: 4,
    });
    assert.strictEqual(validRes.passed, true);
    assert.strictEqual(validRes.errors.length, 0);
    assert.strictEqual(validRes.diagnostics.durationSeconds, 4);
    assert.strictEqual(validRes.diagnostics.totalFrames, 120);

    // Invalid: In >= Out
    const invalidRange = runExportPreflight({
      project,
      rangeIn: 5,
      rangeOut: 3,
    });
    assert.strictEqual(invalidRange.passed, false);
    assert.ok(invalidRange.errors.some((e) => e.includes('Empty export range')));

    // Invalid: FPS below 12 or above 60
    const invalidFpsLow = runExportPreflight({ project, fps: 5 });
    assert.strictEqual(invalidFpsLow.passed, false);
    assert.ok(invalidFpsLow.errors.some((e) => e.includes('Invalid frame rate')));

    const invalidFpsHigh = runExportPreflight({ project, fps: 120 });
    assert.strictEqual(invalidFpsHigh.passed, false);
    assert.ok(invalidFpsHigh.errors.some((e) => e.includes('Invalid frame rate')));
  });

  await t.test('2. Preflight Missing Media (Image & Video Clip) and Custom Font Verification', () => {
    let project = createDefaultProject('Missing Media Test');
    const scene = project.scenes[0];

    // Inject layer referencing unregistered assetId
    scene.layers.push({
      id: 'layer_unregistered_asset',
      name: 'Unregistered Graphic',
      type: 'image',
      assetId: 'asset_missing_123',
    });

    // Inject layer with unknown custom font
    scene.layers.push({
      id: 'layer_unknown_font',
      name: 'Custom Headline',
      type: 'text',
      text: 'Hello World',
      fontFamily: 'UnknownObscureFont, sans-serif',
    });

    const preflight = runExportPreflight({ project, format: 'webm' });
    assert.strictEqual(preflight.passed, false, 'Preflight must fail due to missing media asset');
    assert.ok(preflight.errors.some((e) => e.includes('asset_missing_123')));
    assert.ok(preflight.warnings.some((w) => w.includes('UnknownObscureFont')));
    assert.strictEqual(preflight.diagnostics.missingAssets.length, 1);
    assert.strictEqual(preflight.diagnostics.missingFonts.length, 1);
  });

  await t.test('3. Preflight Unsupported Effect Non-Destructive Warning Notice', () => {
    let project = createDefaultProject('Unsupported Effects Preflight Test');
    const scene = project.scenes[0];

    // Inject unsupported legacy effect
    scene.effects = [
      {
        id: 'fx_gpu_fluid',
        type: 'ec.gpu.fluidSimulation',
        name: 'Fluid Dynamics',
        params: { viscosity: 0.9 },
      },
    ];

    const preflight = runExportPreflight({ project, format: 'webm' });
    assert.strictEqual(preflight.passed, true, 'Unsupported effects must not hard-fail preflight');
    assert.ok(preflight.warnings.some((w) => w.includes('ec.gpu.fluidSimulation')));
    assert.strictEqual(preflight.diagnostics.unsupportedEffects.length, 1);
  });

  await t.test('4. Preflight Audio Clipping & Sample Rate Sync Verification', () => {
    const project = createDefaultProject('Audio Preflight Test');

    // Clipping peak (> 1.0)
    const clipRes = runExportPreflight({
      project,
      format: 'webm',
      includeAudio: true,
      audioPeak: 1.25,
    });
    assert.ok(clipRes.warnings.some((w) => w.includes('Audio clipping detected')));
    assert.strictEqual(clipRes.diagnostics.audioClipping, true);

    // Non-standard sample rate
    const sampleRes = runExportPreflight({
      project,
      format: 'webm',
      includeAudio: true,
      audioSampleRate: 22050,
    });
    assert.ok(sampleRes.warnings.some((w) => w.includes('Non-standard audio sample rate')));
  });

  await t.test('5. Preflight Color / Alpha Transparency vs Format Codec Invariants', () => {
    const project = createDefaultProject('Alpha Codec Test');

    // Requesting transparent background with MP4 (MP4 container does not support alpha channel)
    const mp4AlphaRes = runExportPreflight({
      project,
      format: 'mp4',
      transparentBg: true,
    });
    assert.ok(mp4AlphaRes.warnings.some((w) => w.includes('MP4 (H.264) video container does not support an alpha transparency channel')));
    assert.strictEqual(mp4AlphaRes.diagnostics.alphaIssue, 'mp4_no_alpha');

    // Requesting transparent background with WebM (supported via VP9)
    const webmAlphaRes = runExportPreflight({
      project,
      format: 'webm',
      transparentBg: true,
    });
    assert.strictEqual(webmAlphaRes.diagnostics.alphaIssue, null);
  });

  await t.test('6. Preflight License Provenance Blocker for Quarantined / Hold Assets', () => {
    let project = createDefaultProject('License Audit Test');
    project.assets = {
      asset_ok: { id: 'asset_ok', name: 'Permissive Logo', license: 'OFL-1.1' },
      asset_quarantined: { id: 'asset_quarantined', name: 'Copyright Sample', license: 'quarantined' },
    };

    const preflight = runExportPreflight({ project, format: 'webm' });
    assert.strictEqual(preflight.passed, false, 'Preflight must block export of quarantined assets');
    assert.ok(preflight.errors.some((e) => e.includes('Copyright Sample')));
    assert.strictEqual(preflight.diagnostics.licenseIssues.length, 1);
  });

  await t.test('7. Deterministic SHA-256 Cryptographic Hash Generation', async () => {
    // Standard test vector: SHA-256("antigravity-clover-fase11")
    const testData = new TextEncoder().encode('antigravity-clover-fase11');
    const hashHex = await computeBufferHash(testData);

    assert.strictEqual(typeof hashHex, 'string');
    assert.strictEqual(hashHex.length, 64, 'SHA-256 hash must be exactly 64 hexadecimal characters');
    assert.match(hashHex, /^[0-9a-f]{64}$/, 'Hash must contain only lowercase hex characters');

    // Verify determinism: hashing identical data produces identical hash
    const hashHex2 = await computeBufferHash(testData);
    assert.strictEqual(hashHex, hashHex2, 'Hash must be strictly deterministic');
  });

  await t.test('8. Export Manifest & Receipt Generation with Technical Limitations', () => {
    const project = createDefaultProject('Manifest Test');
    const exportOptions = {
      format: 'webm',
      codec: 'video/webm;codecs=vp9',
      fps: 30,
      ratio: '1:1',
      width: 1080,
      height: 1080,
      rangeIn: 0,
      rangeOut: 4,
      includeAudio: true,
      audioSampleRate: 48000,
      transparentBg: true,
    };

    const manifest = generateExportManifest({
      project,
      exportOptions,
      fileSizeBytes: 2450000,
      sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      preflightSummary: { passed: true, errors: [], warnings: [] },
    });

    assert.ok(manifest.exportId.startsWith('exp_'), 'Manifest must have stable ID starting with exp_');
    assert.strictEqual(manifest.format, 'webm');
    assert.strictEqual(manifest.codec, 'video/webm;codecs=vp9');
    assert.strictEqual(manifest.dimensions.width, 1080);
    assert.strictEqual(manifest.dimensions.height, 1080);
    assert.strictEqual(manifest.dimensions.ratio, '1:1');
    assert.strictEqual(manifest.fps, 30);
    assert.strictEqual(manifest.durationSeconds, 4);
    assert.strictEqual(manifest.totalFrames, 120);
    assert.strictEqual(manifest.hasAlpha, true);
    assert.strictEqual(manifest.fileSizeBytes, 2450000);
    assert.strictEqual(manifest.sha256, 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
    assert.ok(Array.isArray(manifest.limitations) && manifest.limitations.length > 0, 'Limitations must be documented');
    assert.ok(manifest.limitations.some((l) => l.includes('editable')), 'Must document that native project remains editable');
  });

  await t.test('9. Export Lifecycle: Progress, Non-Blocking Cancellation, and Retry', () => {
    let queue = [];

    // 1. Enqueue Export Item
    queue = addExportItem(queue, {
      name: 'Story Reel (9:16)',
      format: 'webm',
      fps: 30,
      totalFrames: 120,
    });
    assert.strictEqual(queue.length, 1);
    const item = queue[0];
    assert.strictEqual(item.status, EXPORT_STATUS.QUEUED);

    // 2. Update Progress
    queue = updateExportItem(queue, item.id, {
      status: EXPORT_STATUS.PROCESSING,
      progress: 0.45,
      currentFrame: 54,
    });
    assert.strictEqual(queue[0].status, EXPORT_STATUS.PROCESSING);
    assert.strictEqual(queue[0].progress, 0.45);

    // 3. Cancel Export Item
    queue = cancelExportItem(queue, item.id);
    assert.strictEqual(queue[0].status, EXPORT_STATUS.CANCELLED);
    assert.ok(queue[0].logs.some((l) => l.message.includes('cancelled by user')));

    // 4. Retry Export Item
    queue = retryExportItem(queue, item.id);
    assert.strictEqual(queue[0].status, EXPORT_STATUS.QUEUED);
    assert.strictEqual(queue[0].progress, 0);
    assert.strictEqual(queue[0].currentFrame, 0);
  });

  await t.test('10. Native Project Remains 100% Editable (Save / Reopen Roundtrip Equality)', () => {
    let originalProject = createDefaultProject('Native Editable Roundtrip Test');
    const addLayerRes = addShapeLayerToScene(originalProject, 0, 'rectangle');
    originalProject = addLayerRes.project;

    // Simulate preflight and export manifest creation
    const preflight = runExportPreflight({ project: originalProject });
    assert.strictEqual(preflight.passed, true);

    const manifest = generateExportManifest({
      project: originalProject,
      exportOptions: { format: 'webm' },
    });
    assert.ok(manifest.exportId);

    // Assert that the native project state was NOT mutated, stripped, or converted into a flat file
    assert.strictEqual(originalProject.scenes[0].layers.length, 1);
    assert.strictEqual(originalProject.scenes[0].layers[0].type, 'shape');

    // Test deep serialization roundtrip equality
    const jsonStr = serializeProject(originalProject);
    const reopenedProject = deserializeProject(jsonStr);

    assert.strictEqual(reopenedProject.id, originalProject.id);
    assert.strictEqual(reopenedProject.name, originalProject.name);
    assert.strictEqual(reopenedProject.scenes.length, originalProject.scenes.length);
    assert.strictEqual(reopenedProject.scenes[0].layers[0].id, originalProject.scenes[0].layers[0].id);
    assert.strictEqual(reopenedProject.scenes[0].layers[0].shapeType, 'rectangle');
  });

  await t.test('11. Only Genuine Export Formats Supported (No Dead Controls)', () => {
    for (const fmt of SUPPORTED_EXPORT_FORMATS) {
      assert.ok(fmt.id, 'Format must have id');
      assert.ok(fmt.name, 'Format must have name');
      assert.ok(fmt.ext, 'Format must have extension');
      assert.ok(fmt.mimeType, 'Format must have mimeType');
      assert.strictEqual(typeof fmt.supportsAlpha, 'boolean');
      assert.strictEqual(typeof fmt.supportsAudio, 'boolean');
    }

    // Codecs check
    assert.ok(SUPPORTED_VIDEO_CODECS.includes('video/webm;codecs=vp9'));
    assert.ok(SUPPORTED_VIDEO_CODECS.includes('video/mp4;codecs=avc1'));
  });
});
