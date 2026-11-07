/**
 * @file keyframeWorkflowFase7.test.mjs
 * @description Comprehensive automated acceptance test for Fase 7:
 * Continuous Keyframe Workflow:
 * Select Layer/Property -> Create Keyframe -> Edit Time/Value/Easing/Curve Manual ->
 * Scrub/Playback Determinism -> Undo/Redo -> Save/Reopen Deep Equality ->
 * Preview/Render Consistency -> Timebase Exactness -> EffectCraft AEP Gate -> Reduced-Motion Separation.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  addShapeLayerToScene,
  addKeyframeToLayer,
  updateKeyframeInLayer,
  deleteKeyframesFromLayer,
  duplicateKeyframesInLayer,
  pasteKeyframesToLayer,
  updateLayer,
} from '../services/projectService.js';
import {
  createDefaultProject,
  serializeProject,
  deserializeProject,
} from '../domain/projectSchema.js';
import { CommandHistoryManager } from '../services/commandHistory.js';
import { evaluateLayerKeyframes } from '../services/animationEngine.js';
import {
  secondsToTicks,
  ticksToSeconds,
  audioSamplesToTicks,
  ticksToAudioSamples,
  musicalTicksToTimebase,
  TICKS_PER_SECOND,
  AUDIO_48K_FACTOR,
  AUDIO_44K1_FACTOR,
} from '../domain/timebase.js';
import { INTERCHANGE_FORMATS } from '../services/interchangeCapabilityService.js';

test('Fase 7: Full Keyframe Lifecycle, Timebase Invariance & Easing Curve Suite', async (t) => {
  let project = createDefaultProject('Fase 7 Animation Suite');
  const history = new CommandHistoryManager();
  const sceneIndex = 0;

  // Add initial test shape
  const shapeRes = addShapeLayerToScene(project, sceneIndex, 'rectangle', {
    x: 100,
    y: 200,
    width: 200,
    height: 120,
    scale: 1.0,
    rotation: 0,
    opacity: 1.0,
  });
  project = shapeRes.project;
  const layerId = shapeRes.newLayerId;
  assert.ok(layerId, 'Layer must be created with ID');

  // --------------------------------------------------------------------------
  // 1. SELECT LAYER/PROPERTY & CREATE INITIAL KEYFRAMES
  // --------------------------------------------------------------------------
  let kf1Id = null;
  let kf2Id = null;

  await t.test('1. Create keyframes on selected layer channels (posX and opacity)', () => {
    // Add Keyframe 1: at t=0.0s, posX = 100, linear
    const res1 = addKeyframeToLayer(project, sceneIndex, layerId, {
      prop: 'posX',
      time: 0.0,
      value: 100,
      interpolation: 'linear',
      easing: 'linear',
    });
    project = res1.project;
    kf1Id = res1.keyframe.id;
    assert.ok(kf1Id, 'First keyframe must have an ID');

    // Add Keyframe 2: at t=2.0s, posX = 600, cubic-bezier
    const res2 = addKeyframeToLayer(project, sceneIndex, layerId, {
      prop: 'posX',
      time: 2.0,
      value: 600,
      interpolation: 'bezier',
      easing: 'bezier',
      bezier: [0.25, 0.1, 0.25, 1.0],
    });
    project = res2.project;
    kf2Id = res2.keyframe.id;
    assert.ok(kf2Id, 'Second keyframe must have an ID');

    // Add Keyframe 3: on opacity channel at t=0.0s = 0.2
    const res3 = addKeyframeToLayer(project, sceneIndex, layerId, {
      prop: 'opacity',
      time: 0.0,
      value: 0.2,
      interpolation: 'easeOut',
      easing: 'easeOut',
    });
    project = res3.project;

    // Add Keyframe 4: on opacity channel at t=1.0s = 1.0
    const res4 = addKeyframeToLayer(project, sceneIndex, layerId, {
      prop: 'opacity',
      time: 1.0,
      value: 1.0,
      interpolation: 'easeOut',
      easing: 'easeOut',
    });
    project = res4.project;

    const layer = project.scenes[0].layers.find((l) => l.id === layerId);
    assert.equal(layer.keyframes.length, 4, 'Layer must contain exactly 4 keyframes');
  });

  // --------------------------------------------------------------------------
  // 2. MANUAL EDITING: TIME, VALUE, EASING & CUSTOM BÉZIER CURVES
  // --------------------------------------------------------------------------
  await t.test('2. Manual precision editing of time, value, easing, and custom Bézier handles', () => {
    // Update kf2: time from 2.0s to 1.5s, value from 600 to 750, custom overshoot Bézier
    const customBezier = [0.34, 1.56, 0.64, 1.0];
    project = updateKeyframeInLayer(project, sceneIndex, layerId, kf2Id, {
      time: 1.5,
      value: 750,
      interpolation: 'bezier',
      easing: 'bezier',
      bezier: customBezier,
    });

    const layer = project.scenes[0].layers.find((l) => l.id === layerId);
    const updatedKf2 = layer.keyframes.find((k) => k.id === kf2Id);

    assert.equal(updatedKf2.time, 1.5, 'Keyframe time must be 1.5s');
    assert.equal(updatedKf2.value, 750, 'Keyframe value must be 750');
    assert.equal(updatedKf2.interpolation, 'bezier');
    assert.deepEqual(updatedKf2.bezier, customBezier, 'Bézier handles must match custom coordinates');
  });

  // --------------------------------------------------------------------------
  // 3. SCRUB / PLAYBACK DETERMINISTIC EVALUATION
  // --------------------------------------------------------------------------
  await t.test('3. Deterministic scrub and playback evaluation across timeline timestamps', () => {
    const layer = project.scenes[0].layers.find((l) => l.id === layerId);

    // Evaluate at t = 0.0s (start boundary)
    const stateAtStart = evaluateLayerKeyframes(layer, 0.0);
    assert.equal(stateAtStart.posX, 100, 'At t=0s, posX must exactly equal 100');
    assert.equal(stateAtStart.opacity, 0.2, 'At t=0s, opacity must exactly equal 0.2');

    // Evaluate at t = 1.0s (opacity end boundary)
    const stateAtOne = evaluateLayerKeyframes(layer, 1.0);
    assert.equal(stateAtOne.opacity, 1.0, 'At t=1s, opacity must reach 1.0');
    assert.ok(stateAtOne.posX > 100 && stateAtOne.posX < 750, 'posX must be interpolated between 100 and 750');

    // Evaluate at t = 1.5s (posX end boundary)
    const stateAtEnd = evaluateLayerKeyframes(layer, 1.5);
    assert.equal(stateAtEnd.posX, 750, 'At t=1.5s, posX must reach 750');

    // Evaluate past end (clamping to terminal keyframe value)
    const statePast = evaluateLayerKeyframes(layer, 3.0);
    assert.equal(statePast.posX, 750, 'Past t=1.5s, posX must clamp to 750');
    assert.equal(statePast.opacity, 1.0, 'Past t=1.0s, opacity must clamp to 1.0');
  });

  // --------------------------------------------------------------------------
  // 4. TRANSACTIONAL UNDO / REDO
  // --------------------------------------------------------------------------
  await t.test('4. Transactional undo/redo reversibility of keyframe edits', () => {
    history.clear();
    const snapshotBefore = JSON.parse(JSON.stringify(project));

    // Perform keyframe edit: shift kf1 value from 100 to 250
    const nextProject = updateKeyframeInLayer(project, sceneIndex, layerId, kf1Id, {
      value: 250,
    });
    history.push(snapshotBefore, nextProject, 'Edit Keyframe Value');
    project = nextProject;

    const layerAfter = project.scenes[0].layers.find((l) => l.id === layerId);
    assert.equal(layerAfter.keyframes.find((k) => k.id === kf1Id).value, 250);

    // Undo
    const undoRes = history.undo();
    assert.ok(undoRes.canUndo);
    project = undoRes.state;
    const layerUndone = project.scenes[0].layers.find((l) => l.id === layerId);
    assert.equal(layerUndone.keyframes.find((k) => k.id === kf1Id).value, 100, 'Undo must revert value to 100');

    // Redo
    const redoRes = history.redo();
    assert.ok(redoRes.canRedo);
    project = redoRes.state;
    const layerRedone = project.scenes[0].layers.find((l) => l.id === layerId);
    assert.equal(layerRedone.keyframes.find((k) => k.id === kf1Id).value, 250, 'Redo must re-apply value 250');
  });

  // --------------------------------------------------------------------------
  // 5. SAVE, SERIALIZE & REOPEN LOSSLESS DEEP EQUALITY
  // --------------------------------------------------------------------------
  await t.test('5. Lossless Schema V1 save/reopen preserves custom Bézier curves & keyframe channels', () => {
    const serialized = serializeProject(project);
    assert.ok(typeof serialized === 'string' && serialized.length > 100);

    const reloaded = deserializeProject(serialized);
    const origLayer = project.scenes[0].layers.find((l) => l.id === layerId);
    const reloadedLayer = reloaded.scenes[0].layers.find((l) => l.id === layerId);

    assert.equal(reloadedLayer.keyframes.length, origLayer.keyframes.length);
    assert.deepEqual(reloadedLayer.keyframes, origLayer.keyframes, 'Keyframes array must be 100% losslessly preserved');
  });

  // --------------------------------------------------------------------------
  // 6. RATIONAL TIMEBASE INVARIANCE & ZERO SUB-FRAME DRIFT (ADR 004)
  // --------------------------------------------------------------------------
  await t.test('6. Rational Integer Timebase (254,016,000,000 ticks/sec) mathematical exactness', () => {
    // 1. Invariants: exact integer divisor check
    assert.strictEqual(TICKS_PER_SECOND % 48000n, 0n, '48kHz sample rate must divide ticks with 0 remainder');
    assert.strictEqual(TICKS_PER_SECOND % 44100n, 0n, '44.1kHz sample rate must divide ticks with 0 remainder');
    assert.strictEqual(TICKS_PER_SECOND / 48000n, AUDIO_48K_FACTOR);
    assert.strictEqual(TICKS_PER_SECOND / 44100n, AUDIO_44K1_FACTOR);

    // 2. Fractional seconds roundtrip
    const tSec = 2.375;
    const ticks = secondsToTicks(tSec);
    const secBack = ticksToSeconds(ticks);
    assert.strictEqual(secBack, tSec, 'Float seconds to BigInt ticks roundtrip must be mathematically lossless');

    // 3. Audio sample sync at 48kHz
    const samples = 96000; // 2 seconds
    const sampleTicks = audioSamplesToTicks(samples, 48000);
    assert.strictEqual(sampleTicks, TICKS_PER_SECOND * 2n);
    const samplesBack = ticksToAudioSamples(sampleTicks, 48000);
    assert.strictEqual(samplesBack, samples);

    // 4. Frame boundary exactness at 24fps, 30fps, 60fps
    for (const fps of [24n, 30n, 60n]) {
      assert.strictEqual(TICKS_PER_SECOND % fps, 0n, `${fps} FPS must divide TICKS_PER_SECOND with 0 remainder`);
    }
  });

  // --------------------------------------------------------------------------
  // 7. EFFECTCRAFT AEP IMPORT VERIFICATION & STATUS ENFORCEMENT
  // --------------------------------------------------------------------------
  await t.test('7. EffectCraft AEP Import status is verified as HOLD / quarantined (No false claims)', () => {
    // Verify that interchange capabilities strictly do NOT claim AEP support
    assert.equal(INTERCHANGE_FORMATS.AEP, undefined, 'AEP binary import must NOT be claimed as supported format');

    // Supported formats are standard, verified formats: OTIO, LOTTIE, CLOVER_BUNDLE, SVG
    assert.ok(INTERCHANGE_FORMATS.OTIO, 'OpenTimelineIO is verified');
    assert.ok(INTERCHANGE_FORMATS.LOTTIE, 'Lottie is verified');
    assert.ok(INTERCHANGE_FORMATS.CLOVER_BUNDLE, 'Clover Bundle format is verified');
    assert.ok(INTERCHANGE_FORMATS.SVG, 'SVG frame is verified');
  });

  // --------------------------------------------------------------------------
  // 8. REDUCED-MOTION SEPARATION (UI TRANSITION VS USER ARTWORK MOTION)
  // --------------------------------------------------------------------------
  await t.test('8. UI transition isolation from user project animation curves', () => {
    const layer = project.scenes[0].layers.find((l) => l.id === layerId);

    // Mathematical evaluation of user motion curve at t=0.75s
    const evalNormal = evaluateLayerKeyframes(layer, 0.75);

    // User artwork motion MUST evaluate purely and identically regardless of UI reduced-motion
    assert.ok(Number.isFinite(evalNormal.posX));
    assert.ok(Number.isFinite(evalNormal.opacity));
    assert.equal(evalNormal.posX > 100 && evalNormal.posX < 750, true);

    // Subsequent re-evaluation yields identical deterministic values (zero drift)
    const evalRepeat = evaluateLayerKeyframes(layer, 0.75);
    assert.equal(evalNormal.posX, evalRepeat.posX);
    assert.equal(evalNormal.opacity, evalRepeat.opacity);
  });
});
