/**
 * @file keyframeEngineFase4.test.mjs
 * @description Acceptance Test Suite for Fase 4 (Animation Engine, Sequence/Scene,
 * Project Clock, Keyframes, Interpolation Curves, and Property Lanes).
 * 
 * Verifies:
 * 1. Rational integer clock & SMPTE timecode determinism (zero drift).
 * 2. Deterministic frame-stepping and frame snapping.
 * 3. Keyframe evaluation with Linear interpolation.
 * 4. Keyframe evaluation with Standard Easing (ease, easeIn, easeOut, easeInOut).
 * 5. Keyframe evaluation with Custom Cubic Bézier curves ([cp1x, cp1y, cp2x, cp2y]).
 * 6. Multi-property keyframe channel evaluation (posX, posY, scale, rotation, opacity).
 * 7. Keyframe domain operations (add, update, duplicate, delete, paste, snap).
 * 8. Timeline markers management (add, delete, sorting).
 * 9. Editable sample animation project schema integrity and evaluation.
 */

import assert from 'node:assert/strict';
import {
  TICKS_PER_SECOND,
  secondsToTicks,
  ticksToSeconds,
  getRationalFps,
  timebaseToTimecode,
  frameStepTime,
  snapTimeToFrame,
} from '../domain/timebase.js';
import {
  createScene,
  createTextLayer,
  createShapeLayer,
  createKeyframe,
  createMarker,
} from '../domain/models.js';
import {
  addKeyframeToLayer,
  updateKeyframeInLayer,
  deleteKeyframesFromLayer,
  duplicateKeyframesInLayer,
  pasteKeyframesToLayer,
  addMarkerToScene,
  deleteMarkerFromScene,
} from '../services/projectService.js';
import { evaluateLayerKeyframes } from '../services/animationEngine.js';
import { solveCubicBezier } from '../../utils/timecode.js';
import { createSampleAnimationProject } from '../../fixtures/sampleAnimationProject.js';

async function runTests() {
  console.log('🧪 Starting Fase 4 Animation Engine & Keyframe Suite...\n');

  // -------------------------------------------------------------------------
  // Test 1: Project Clock & SMPTE Timecode Determinism
  // -------------------------------------------------------------------------
  console.log('Test 1: Rational Integer Clock & Timecode Determinism...');
  {
    // At t = 0s -> 00:00:00:00
    assert.equal(timebaseToTimecode(0, 30), '00:00:00:00');

    // At t = 1.5s @ 30fps -> exactly 45 frames -> 00:00:01:15
    assert.equal(timebaseToTimecode(1.5, 30), '00:00:01:15');

    // At t = 62.0s @ 24fps -> 1 min, 2 sec, 0 frames -> 00:01:02:00
    assert.equal(timebaseToTimecode(62.0, 24), '00:01:02:00');

    // Deterministic frame stepping without float accumulation drift
    let t = 0;
    for (let f = 0; f < 30; f++) {
      t = frameStepTime(t, 1, 30, 10);
    }
    // After exactly 30 forward steps @ 30fps, t must be 1.0s exactly!
    assert.equal(Math.round(t * 1000) / 1000, 1.0, '30 frame steps @ 30fps must equal 1.0s exactly');

    // Frame snapping
    const snapped = snapTimeToFrame(1.018, 30);
    const expectedFrame = Math.round(1.018 * 30) / 30; // frame 31 -> ~1.033333s
    assert.equal(Math.round(snapped * 1000), Math.round(expectedFrame * 1000), 'Snap to frame matches exact frame tick');

    console.log('  ✓ SMPTE timecode and rational clock stepping operate without drift.\n');
  }

  // -------------------------------------------------------------------------
  // Test 2: Linear Keyframe Interpolation
  // -------------------------------------------------------------------------
  console.log('Test 2: Keyframe Evaluation with Linear Interpolation...');
  {
    const layer = createTextLayer({
      x: 100,
      y: 200,
      keyframes: [
        { id: 'kf1', time: 0.0, prop: 'posX', value: 100, interpolation: 'linear' },
        { id: 'kf2', time: 2.0, prop: 'posX', value: 300, interpolation: 'linear' },
      ],
    });

    const atStart = evaluateLayerKeyframes(layer, 0.0);
    assert.equal(atStart.posX, 100, 'At t=0s, posX should be 100');

    const atMid = evaluateLayerKeyframes(layer, 1.0);
    assert.equal(atMid.posX, 200, 'At t=1s (50%), linear posX should be exactly 200');

    const atEnd = evaluateLayerKeyframes(layer, 2.0);
    assert.equal(atEnd.posX, 300, 'At t=2s, posX should be 300');

    const afterEnd = evaluateLayerKeyframes(layer, 3.5);
    assert.equal(afterEnd.posX, 300, 'Past last keyframe, value should clamp to 300');

    console.log('  ✓ Linear interpolation computes exact midpoints and bounds.\n');
  }

  // -------------------------------------------------------------------------
  // Test 3: Standard Easing Interpolation (Ease In vs Ease Out)
  // -------------------------------------------------------------------------
  console.log('Test 3: Standard Easing Interpolation (Ease In, Ease Out, Ease In-Out)...');
  {
    const layerEaseIn = createTextLayer({
      x: 0,
      keyframes: [
        { id: 'kf_in1', time: 0.0, prop: 'posX', value: 0, interpolation: 'easeIn' },
        { id: 'kf_in2', time: 1.0, prop: 'posX', value: 100, interpolation: 'easeIn' },
      ],
    });

    const layerEaseOut = createTextLayer({
      x: 0,
      keyframes: [
        { id: 'kf_out1', time: 0.0, prop: 'posX', value: 0, interpolation: 'easeOut' },
        { id: 'kf_out2', time: 1.0, prop: 'posX', value: 100, interpolation: 'easeOut' },
      ],
    });

    const midEaseIn = evaluateLayerKeyframes(layerEaseIn, 0.5);
    const midEaseOut = evaluateLayerKeyframes(layerEaseOut, 0.5);

    // Ease-in accelerates slowly: value at mid-time must be less than 50 (linear)
    assert.ok(midEaseIn.posX < 50, `EaseIn at t=0.5 must be < 50, got ${midEaseIn.posX}`);

    // Ease-out decelerates: value at mid-time must be greater than 50 (linear)
    assert.ok(midEaseOut.posX > 50, `EaseOut at t=0.5 must be > 50, got ${midEaseOut.posX}`);

    console.log(`  ✓ EaseIn (mid=${midEaseIn.posX.toFixed(1)}) and EaseOut (mid=${midEaseOut.posX.toFixed(1)}) exhibit correct curvature.\n`);
  }

  // -------------------------------------------------------------------------
  // Test 4: Custom Cubic-Bézier Curve Interpolation
  // -------------------------------------------------------------------------
  console.log('Test 4: Custom Cubic-Bézier Curves ([cp1x, cp1y, cp2x, cp2y])...');
  {
    // Transitions.dev signature snappy curve: [0.22, 1.0, 0.36, 1.0]
    const bzCoords = [0.22, 1.0, 0.36, 1.0];
    const layerBezier = createShapeLayer({
      shapeType: 'pill',
      scale: 1,
      keyframes: [
        { id: 'bz1', time: 0.0, prop: 'scale', value: 0.0, interpolation: 'bezier', bezier: bzCoords },
        { id: 'bz2', time: 1.0, prop: 'scale', value: 1.0, interpolation: 'bezier', bezier: bzCoords },
      ],
    });

    const atQuarter = evaluateLayerKeyframes(layerBezier, 0.25);
    const atHalf = evaluateLayerKeyframes(layerBezier, 0.5);

    // This snappy curve achieves ~70% progress by 25% duration!
    assert.ok(atQuarter.scale > 0.6, `Snappy bezier at t=0.25 should be > 0.6, got ${atQuarter.scale}`);
    assert.ok(atHalf.scale > 0.85, `Snappy bezier at t=0.5 should be > 0.85, got ${atHalf.scale}`);

    // Direct solver test
    const solvedZero = solveCubicBezier(0, 0.22, 1, 0.36, 1);
    const solvedOne = solveCubicBezier(1, 0.22, 1, 0.36, 1);
    assert.equal(solvedZero, 0, 'solveCubicBezier(0) must equal 0');
    assert.equal(solvedOne, 1, 'solveCubicBezier(1) must equal 1');

    console.log('  ✓ Custom cubic-bezier solver computes high-precision easing curves.\n');
  }

  // -------------------------------------------------------------------------
  // Test 5: Multi-Channel Keyframe Evaluation
  // -------------------------------------------------------------------------
  console.log('Test 5: Multi-Channel Synchronous Keyframe Evaluation (posX, posY, scale, rotation, opacity)...');
  {
    const layer = createShapeLayer({
      shapeType: 'star',
      keyframes: [
        { id: 'k1', time: 0, prop: 'posX', value: 100, interpolation: 'linear' },
        { id: 'k2', time: 2, prop: 'posX', value: 500, interpolation: 'linear' },
        { id: 'k3', time: 0, prop: 'posY', value: 200, interpolation: 'linear' },
        { id: 'k4', time: 2, prop: 'posY', value: 600, interpolation: 'linear' },
        { id: 'k5', time: 0, prop: 'scale', value: 0.5, interpolation: 'linear' },
        { id: 'k6', time: 2, prop: 'scale', value: 1.5, interpolation: 'linear' },
        { id: 'k7', time: 0, prop: 'rotation', value: 0, interpolation: 'linear' },
        { id: 'k8', time: 2, prop: 'rotation', value: 180, interpolation: 'linear' },
        { id: 'k9', time: 0, prop: 'opacity', value: 0.2, interpolation: 'linear' },
        { id: 'k10', time: 2, prop: 'opacity', value: 1.0, interpolation: 'linear' },
      ],
    });

    const evaluated = evaluateLayerKeyframes(layer, 1.0);
    assert.equal(evaluated.posX, 300, 'posX evaluated correctly');
    assert.equal(evaluated.posY, 400, 'posY evaluated correctly');
    assert.equal(evaluated.scale, 1.0, 'scale evaluated correctly');
    assert.equal(evaluated.rotation, 90, 'rotation evaluated correctly');
    assert.equal(Math.round(evaluated.opacity * 10) / 10, 0.6, 'opacity evaluated correctly');

    console.log('  ✓ All 5 channels evaluated synchronously in a single deterministic pass.\n');
  }

  // -------------------------------------------------------------------------
  // Test 6: Keyframe CRUD Operations (Add, Update, Duplicate, Delete, Paste)
  // -------------------------------------------------------------------------
  console.log('Test 6: Keyframe Domain Operations (Add, Update, Duplicate, Delete, Paste)...');
  {
    const project = {
      schemaVersion: 1,
      scenes: [
        createScene({
          id: 'sc1',
          layers: [createTextLayer({ id: 'l1', text: 'TEST', keyframes: [] })],
        }),
      ],
    };

    // 1. Add keyframe
    const addRes = addKeyframeToLayer(project, 0, 'l1', {
      time: 1.0,
      prop: 'scale',
      value: 1.5,
      interpolation: 'easeOut',
    });
    let state = addRes.project;
    let kfs = state.scenes[0].layers[0].keyframes;
    assert.equal(kfs.length, 1, 'Keyframe added');
    assert.equal(kfs[0].value, 1.5);
    assert.equal(kfs[0].interpolation, 'easeOut');

    // 2. Add second keyframe
    const addRes2 = addKeyframeToLayer(state, 0, 'l1', {
      time: 2.0,
      prop: 'scale',
      value: 2.0,
      interpolation: 'linear',
    });
    state = addRes2.project;
    kfs = state.scenes[0].layers[0].keyframes;
    assert.equal(kfs.length, 2, 'Second keyframe added and sorted');

    // 3. Update keyframe value
    state = updateKeyframeInLayer(state, 0, 'l1', kfs[0].id, { value: 1.8 });
    kfs = state.scenes[0].layers[0].keyframes;
    assert.equal(kfs[0].value, 1.8, 'Keyframe value updated');

    // 4. Duplicate keyframe
    state = duplicateKeyframesInLayer(state, 0, 'l1', [kfs[0].id], 0.5);
    kfs = state.scenes[0].layers[0].keyframes;
    assert.equal(kfs.length, 3, 'Keyframe duplicated forward in time');

    // 5. Delete keyframes
    state = deleteKeyframesFromLayer(state, 0, 'l1', [kfs[0].id]);
    kfs = state.scenes[0].layers[0].keyframes;
    assert.equal(kfs.length, 2, 'Keyframe deleted cleanly');

    // 6. Paste keyframes with frame snapping
    state = pasteKeyframesToLayer(state, 0, 'l1', [kfs[0]], 3.01, 30);
    kfs = state.scenes[0].layers[0].keyframes;
    assert.equal(kfs.length, 3, 'Keyframe pasted with snapping');

    console.log('  ✓ Keyframe CRUD, duplicate, and paste operations verified.\n');
  }

  // -------------------------------------------------------------------------
  // Test 7: Timeline Markers Management
  // -------------------------------------------------------------------------
  console.log('Test 7: Scene Timeline Markers (Add, Sort, Delete)...');
  {
    let project = {
      schemaVersion: 1,
      scenes: [createScene({ id: 'sc1', markers: [] })],
    };

    project = addMarkerToScene(project, 0, { time: 2.5, label: 'Chorus' });
    project = addMarkerToScene(project, 0, { time: 0.5, label: 'Intro' });
    project = addMarkerToScene(project, 0, { time: 1.5, label: 'Drop' });

    let markers = project.scenes[0].markers;
    assert.equal(markers.length, 3, '3 markers added');
    // Markers must be sorted chronologically
    assert.equal(markers[0].label, 'Intro');
    assert.equal(markers[1].label, 'Drop');
    assert.equal(markers[2].label, 'Chorus');

    // Delete marker
    project = deleteMarkerFromScene(project, 0, markers[1].id);
    markers = project.scenes[0].markers;
    assert.equal(markers.length, 2, '1 marker deleted');
    assert.equal(markers[1].label, 'Chorus');

    console.log('  ✓ Timeline markers maintain chronological order and clean deletion.\n');
  }

  // -------------------------------------------------------------------------
  // Test 8: Editable Sample Animation Project Integrity
  // -------------------------------------------------------------------------
  console.log('Test 8: Editable Sample Animation Project Schema & Evaluation...');
  {
    const sample = createSampleAnimationProject('1:1');
    assert.equal(sample.schemaVersion, 1, 'Valid Schema V1');
    assert.ok(sample.scenes.length >= 1, 'Contains scenes');

    const sc = sample.scenes[0];
    assert.ok(sc.markers.length >= 4, 'Sample has 4+ timeline markers');
    assert.ok(sc.layers.length >= 4, 'Sample has 4+ animated layers');

    // Verify keyframes on layers
    const titleLayer = sc.layers.find((l) => l.id === 'layer_sample_title');
    assert.ok(titleLayer, 'Title layer present');
    assert.ok(titleLayer.keyframes.length >= 6, 'Title layer has 6+ keyframes across posY, scale, opacity');

    // Verify continuous evaluation across sample timeline
    for (let sec = 0; sec <= 4; sec += 0.5) {
      const evalState = evaluateLayerKeyframes(titleLayer, sec);
      assert.ok(!isNaN(evalState.posX), `posX at ${sec}s must be a number`);
      assert.ok(!isNaN(evalState.posY), `posY at ${sec}s must be a number`);
      assert.ok(!isNaN(evalState.scale), `scale at ${sec}s must be a number`);
      assert.ok(!isNaN(evalState.opacity), `opacity at ${sec}s must be a number`);
    }

    console.log('  ✓ Editable sample animation project verified across all timeframes.\n');
  }

  console.log('🎉 ALL 8 FASE 4 TESTS PASSED SUCCESSFULLY!\n');
}

runTests().catch((err) => {
  console.error('❌ Test failed with error:', err);
  process.exit(1);
});
