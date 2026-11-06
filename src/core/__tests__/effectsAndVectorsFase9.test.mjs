/**
 * @file effectsAndVectorsFase9.test.mjs
 * @description Automated Acceptance Test Suite for Fase 9:
 * Non-destructive Effect Stack, Procedural Shaders, Matte Masks,
 * Vector Path / Bézier Node Editing, Gradients, and Performance Budgeting.
 */

import assert from 'node:assert/strict';
import {
  createEffect,
  SUPPORTED_BLEND_MODES,
  DEFAULT_EFFECT_PARAMS,
} from '../domain/effectModels.js';
import {
  createPathNode,
  createVectorPathLayer,
} from '../domain/vectorPathModels.js';
import {
  evaluateCubicBezierPoint,
  evaluateQuadraticBezierPoint,
  createFillStyle,
  renderVectorPathToCanvas,
  getVectorPathBounds,
  booleanPathOperation,
} from '../services/vectorPathService.js';
import {
  addEffectToStack,
  updateEffectInStack,
  reorderEffectInStack,
  toggleEffectInStack,
  removeEffectFromStack,
  evaluateEffectParams,
  applyEffectStackToCanvas,
  TARGET_FRAME_BUDGET_MS,
} from '../services/effectStackService.js';
import {
  convertLuminanceToAlpha,
  applyMatteMaskToCanvas,
} from '../services/matteMaskService.js';
import {
  validateProjectSchema,
  ensureStableIds,
} from '../domain/projectSchema.js';
import {
  createDefaultProject,
  addVectorPathLayerToScene,
  addEffectToLayerInProject,
  updateEffectInLayerInProject,
  reorderEffectInLayerInProject,
  toggleEffectInLayerInProject,
  removeEffectFromLayerInProject,
} from '../services/projectService.js';

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

console.log('\n=== Starting Fase 9 Acceptance Test Suite (Effects & Vector Paths) ===\n');

// -------------------------------------------------------------
// Test 1: Effect Entity Validation & All 15 Default Parameter Types
// -------------------------------------------------------------
runTest('1. Effect Entity Validation & 15 Effect Types', () => {
  const allTypes = Object.keys(DEFAULT_EFFECT_PARAMS);
  assert.equal(allTypes.length, 15, 'Must support 15 default effect types');

  for (const type of allTypes) {
    const fx = createEffect({ type });
    assert.ok(fx.id.startsWith('fx_'), `Effect ID must start with fx_: ${fx.id}`);
    assert.equal(fx.type, type);
    assert.equal(fx.enabled, true);
    assert.ok(SUPPORTED_BLEND_MODES.includes(fx.blendMode), `Blend mode must be valid: ${fx.blendMode}`);
    assert.deepEqual(fx.params, DEFAULT_EFFECT_PARAMS[type], `Params for ${type} must match defaults`);
  }
});

// -------------------------------------------------------------
// Test 2: Non-Destructive Effect Stack CRUD (Add, Update, Toggle, Delete)
// -------------------------------------------------------------
runTest('2. Non-Destructive Effect Stack CRUD Operations', () => {
  let stack = [];

  // Add
  stack = addEffectToStack(stack, { type: 'gaussianBlur', params: { radius: 12 } });
  stack = addEffectToStack(stack, { type: 'vignette', params: { amount: 80 } });
  assert.equal(stack.length, 2);
  const blurId = stack[0].id;
  const vigId = stack[1].id;

  // Update
  stack = updateEffectInStack(stack, blurId, { params: { radius: 24 } });
  assert.equal(stack[0].params.radius, 24, 'Blur radius should be updated');
  assert.equal(stack[1].params.amount, 80, 'Vignette amount preserved');

  // Toggle
  stack = toggleEffectInStack(stack, vigId, false);
  assert.equal(stack[1].enabled, false, 'Vignette should be disabled');
  stack = toggleEffectInStack(stack, vigId, true);
  assert.equal(stack[1].enabled, true, 'Vignette should be re-enabled');

  // Delete
  stack = removeEffectFromStack(stack, blurId);
  assert.equal(stack.length, 1);
  assert.equal(stack[0].id, vigId, 'Only vignette remains in stack');
});

// -------------------------------------------------------------
// Test 3: Effect Reordering Preserves Parameters and Properties
// -------------------------------------------------------------
runTest('3. Effect Reordering Preserving Properties', () => {
  let stack = [];
  stack = addEffectToStack(stack, { type: 'brightnessContrast', params: { brightness: 15 } });
  stack = addEffectToStack(stack, { type: 'glow', params: { intensity: 75 } });
  stack = addEffectToStack(stack, { type: 'scanlines', params: { density: 6 } });

  const fx1 = stack[0].id;
  const fx2 = stack[1].id;
  const fx3 = stack[2].id;

  // Move glow (index 1) to top (index 0)
  const reordered = reorderEffectInStack(stack, fx2, 0);
  assert.equal(reordered[0].id, fx2);
  assert.equal(reordered[1].id, fx1);
  assert.equal(reordered[2].id, fx3);
  assert.equal(reordered[0].params.intensity, 75, 'Parameters must stay intact');
  assert.equal(reordered[1].params.brightness, 15);
  assert.equal(reordered[2].params.density, 6);
});

// -------------------------------------------------------------
// Test 4: Keyframe Interpolation & Audio-Reactive Modulation
// -------------------------------------------------------------
runTest('4. Keyframe Interpolation & Audio Modulation on Effect Params', () => {
  const effect = createEffect({
    type: 'glow',
    params: { radius: 10, intensity: 50 },
    audioReactive: true,
    audioSignal: 'bass',
    keyframes: [
      { time: 0, prop: 'intensity', value: 20, interpolation: 'linear' },
      { time: 2, prop: 'intensity', value: 80, interpolation: 'linear' },
    ],
  });

  // At t = 1.0 (midway between 20 and 80 -> 50) without audio
  const paramsAt1 = evaluateEffectParams(effect, 1.0, { bass: 0 });
  assert.equal(paramsAt1.intensity, 50, 'Midway linear interpolation should evaluate to 50');

  // At t = 1.0 with 100% bass boost (50 * (1 + 1.0 * 0.8) = 50 * 1.8 = 90)
  const paramsWithBass = evaluateEffectParams(effect, 1.0, { bass: 1.0 });
  assert.equal(paramsWithBass.intensity, 90, 'Bass audio signal should modulate intensity to 90');
});

// -------------------------------------------------------------
// Test 5: Vector Path Bézier Curve Evaluation Accuracy
// -------------------------------------------------------------
runTest('5. Cubic & Quadratic Bézier Math Solvers', () => {
  const p0 = { x: 0, y: 0 };
  const p1 = { x: 0, y: 100 };
  const p2 = { x: 100, y: 100 };
  const p3 = { x: 100, y: 0 };

  // Cubic start t=0
  const pt0 = evaluateCubicBezierPoint(p0, p1, p2, p3, 0);
  assert.equal(pt0.x, 0);
  assert.equal(pt0.y, 0);

  // Cubic end t=1
  const pt1 = evaluateCubicBezierPoint(p0, p1, p2, p3, 1);
  assert.equal(pt1.x, 100);
  assert.equal(pt1.y, 0);

  // Cubic midpoint t=0.5
  // B(0.5) = 0.125*P0 + 0.375*P1 + 0.375*P2 + 0.125*P3
  // x = 0 + 0 + 37.5 + 12.5 = 50
  // y = 0 + 37.5 + 37.5 + 0 = 75
  const ptMid = evaluateCubicBezierPoint(p0, p1, p2, p3, 0.5);
  assert.equal(ptMid.x, 50);
  assert.equal(ptMid.y, 75);

  // Quadratic evaluation
  const q0 = { x: 0, y: 0 };
  const q1 = { x: 50, y: 100 };
  const q2 = { x: 100, y: 0 };
  const qMid = evaluateQuadraticBezierPoint(q0, q1, q2, 0.5);
  // B(0.5) = 0.25*0 + 0.5*50 + 0.25*100 = 50, y = 0.5*100 = 50
  assert.equal(qMid.x, 50);
  assert.equal(qMid.y, 50);
});

// -------------------------------------------------------------
// Test 6: Linear and Radial Gradient Fill Generation
// -------------------------------------------------------------
runTest('6. Linear & Radial Gradient Fill Style Generators', () => {
  // Mock canvas context
  const createdGradients = [];
  const mockCtx = {
    createLinearGradient(x1, y1, x2, y2) {
      const grad = {
        type: 'linear',
        coords: [x1, y1, x2, y2],
        stops: [],
        addColorStop(offset, color) {
          this.stops.push({ offset, color });
        },
      };
      createdGradients.push(grad);
      return grad;
    },
    createRadialGradient(x1, y1, r1, x2, y2, r2) {
      const grad = {
        type: 'radial',
        coords: [x1, y1, r1, x2, y2, r2],
        stops: [],
        addColorStop(offset, color) {
          this.stops.push({ offset, color });
        },
      };
      createdGradients.push(grad);
      return grad;
    },
  };

  // Linear gradient at 45 degrees
  const linearDef = {
    type: 'linear',
    angle: 45,
    stops: [{ offset: 0, color: '#159947' }, { offset: 1, color: '#000000' }],
  };
  const gradLin = createFillStyle(mockCtx, linearDef, 200, 200);
  assert.equal(gradLin.type, 'linear');
  assert.equal(gradLin.stops.length, 2);
  assert.equal(gradLin.stops[0].color, '#159947');

  // Radial gradient
  const radialDef = {
    type: 'radial',
    cx: 0.5,
    cy: 0.5,
    r: 0.5,
    stops: [{ offset: 0, color: '#ffffff' }, { offset: 1, color: '#16a34a' }],
  };
  const gradRad = createFillStyle(mockCtx, radialDef, 200, 200);
  assert.equal(gradRad.type, 'radial');
  assert.equal(gradRad.stops.length, 2);
});

// -------------------------------------------------------------
// Test 7: Vector Path Stroke Styling & Bounds Computation
// -------------------------------------------------------------
runTest('7. Vector Path Stroke Properties & Bounds Calculation', () => {
  const pathLayer = createVectorPathLayer({
    name: 'Test Path',
    stroke: {
      color: '#22c55e',
      width: 4,
      cap: 'round',
      join: 'miter',
      dash: [5, 5],
    },
    commands: [
      { type: 'M', x: -50, y: -80 },
      { type: 'L', x: 120, y: -80 },
      { type: 'L', x: 120, y: 150 },
      { type: 'L', x: -50, y: 150 },
      { type: 'Z' },
    ],
  });

  assert.equal(pathLayer.stroke.cap, 'round');
  assert.equal(pathLayer.stroke.join, 'miter');
  assert.deepEqual(pathLayer.stroke.dash, [5, 5]);

  const bounds = getVectorPathBounds(pathLayer);
  assert.equal(bounds.minX, -50);
  assert.equal(bounds.maxX, 120);
  assert.equal(bounds.width, 170);
  assert.equal(bounds.minY, -80);
  assert.equal(bounds.maxY, 150);
  assert.equal(bounds.height, 230);
});

// -------------------------------------------------------------
// Test 8: Vector Boolean Operations (Union, Subtract, Intersect)
// -------------------------------------------------------------
runTest('8. Vector Boolean Operations Simulation', () => {
  const pathA = createVectorPathLayer({ name: 'A', commands: [{ type: 'M', x: 0, y: 0 }, { type: 'L', x: 10, y: 10 }] });
  const pathB = createVectorPathLayer({ name: 'B', commands: [{ type: 'M', x: 5, y: 5 }, { type: 'L', x: 20, y: 20 }] });

  const union = booleanPathOperation(pathA, pathB, 'union');
  assert.equal(union.booleanOp, 'union');
  assert.equal(union.blendMode, 'source-over');
  assert.equal(union.commands.length, 4);

  const subtract = booleanPathOperation(pathA, pathB, 'subtract');
  assert.equal(subtract.booleanOp, 'subtract');
  assert.equal(subtract.fillRule, 'evenodd');
  assert.equal(subtract.blendMode, 'destination-out');

  const intersect = booleanPathOperation(pathA, pathB, 'intersect');
  assert.equal(intersect.booleanOp, 'intersect');
  assert.equal(intersect.blendMode, 'source-in');
});

// -------------------------------------------------------------
// Test 9: Alpha & Rec. 709 Luminance Matte Conversion
// -------------------------------------------------------------
runTest('9. Alpha & Rec. 709 Luminance Conversion Accuracy', () => {
  // Pure Red: (255, 0, 0) -> lum = 0.2126 * 255 = 54.213 -> ~54
  // Pure Green: (0, 255, 0) -> lum = 0.7152 * 255 = 182.376 -> ~182
  // Pure Blue: (0, 0, 255) -> lum = 0.0722 * 255 = 18.411 -> ~18
  // Pure White: (255, 255, 255) -> lum = 255 -> 255
  const mockImageData = {
    data: new Uint8ClampedArray([
      255, 0, 0, 0,       // Red pixel
      0, 255, 0, 0,       // Green pixel
      0, 0, 255, 0,       // Blue pixel
      255, 255, 255, 0,   // White pixel
    ]),
  };

  convertLuminanceToAlpha(mockImageData, false);
  const data = mockImageData.data;

  assert.equal(data[3], 54, 'Red pixel luminance should be ~54');
  assert.equal(data[7], 182, 'Green pixel luminance should be ~182');
  assert.equal(data[11], 18, 'Blue pixel luminance should be ~18');
  assert.equal(data[15], 255, 'White pixel luminance should be 255');

  // Inverted luminance test
  const invertedMock = {
    data: new Uint8ClampedArray([255, 255, 255, 0]),
  };
  convertLuminanceToAlpha(invertedMock, true);
  assert.equal(invertedMock.data[3], 0, 'Inverted white luminance alpha should be 0');
});

// -------------------------------------------------------------
// Test 10: Performance Budget Compliance (16.6ms Ceiling)
// -------------------------------------------------------------
runTest('10. Performance Budget Compliance & Graceful Fallback', () => {
  assert.equal(TARGET_FRAME_BUDGET_MS, 16.6, 'Target budget must be 16.6ms for 60fps');

  let appliedEffectsCount = 0;
  const mockCtx = {
    canvas: {},
    save() {},
    restore() {},
    fillRect() { appliedEffectsCount++; },
  };

  const effects = [
    createEffect({ type: 'colorTint', enabled: true }),
    createEffect({ type: 'colorTint', enabled: true }),
    createEffect({ type: 'colorTint', enabled: true }),
    createEffect({ type: 'colorTint', enabled: true }),
  ];

  // Run with an immediate zero budget to simulate heavy frame overload
  applyEffectStackToCanvas({
    ctx: mockCtx,
    width: 100,
    height: 100,
    effects,
    performanceBudgetMs: -1, // Force budget breach on first iteration
  });

  // Since budget was breached immediately, effects were skipped to protect frame timing
  assert.equal(appliedEffectsCount, 0, 'Effects must be bypassed when budget is exceeded');
});

// -------------------------------------------------------------
// Test 11: Schema V1 Round-Trip Serialization with Vector Paths & Effects
// -------------------------------------------------------------
runTest('11. Schema V1 Serialization & Project Mutators for Fase 9', () => {
  let project = createDefaultProject();
  const sceneId = project.scenes[0].id;

  // Add Vector Path Layer
  project = addVectorPathLayerToScene(project, sceneId, {
    name: 'Custom Swiss Path',
    stroke: { color: '#22c55e', width: 3 },
  });

  const addedLayer = project.scenes[0].layers.find((l) => l.type === 'vectorPath');
  assert.ok(addedLayer, 'Vector path layer must be added to scene');
  assert.equal(addedLayer.name, 'Custom Swiss Path');

  // Add Effect to Vector Path Layer
  project = addEffectToLayerInProject(project, sceneId, addedLayer.id, {
    type: 'glow',
    params: { intensity: 80, radius: 15 },
  });

  const layerWithFx = project.scenes[0].layers.find((l) => l.id === addedLayer.id);
  assert.equal(layerWithFx.effects.length, 1);
  assert.equal(layerWithFx.effects[0].type, 'glow');
  const fxId = layerWithFx.effects[0].id;

  // Update Effect in Layer
  project = updateEffectInLayerInProject(project, sceneId, addedLayer.id, fxId, {
    params: { intensity: 95 },
  });
  const updatedLayer = project.scenes[0].layers.find((l) => l.id === addedLayer.id);
  assert.equal(updatedLayer.effects[0].params.intensity, 95);

  // Toggle Effect
  project = toggleEffectInLayerInProject(project, sceneId, addedLayer.id, fxId, false);
  const toggledLayer = project.scenes[0].layers.find((l) => l.id === addedLayer.id);
  assert.equal(toggledLayer.effects[0].enabled, false);

  // Ensure stable IDs preserves everything
  const sanitized = ensureStableIds(project);
  const validated = validateProjectSchema(sanitized);
  assert.equal(validated.valid, true, `Project must remain valid Schema V1: ${validated.errors.join(', ')}`);

  // JSON round-trip serialization
  const jsonStr = JSON.stringify(sanitized);
  const deserialized = JSON.parse(jsonStr);
  assert.equal(deserialized.scenes[0].layers.length, project.scenes[0].layers.length);
  const deserializedPath = deserialized.scenes[0].layers.find((l) => l.type === 'vectorPath');
  assert.equal(deserializedPath.effects[0].params.intensity, 95);

  // Remove effect from layer
  project = removeEffectFromLayerInProject(project, sceneId, addedLayer.id, fxId);
  const finalLayer = project.scenes[0].layers.find((l) => l.id === addedLayer.id);
  assert.equal(finalLayer.effects.length, 0, 'Effect must be successfully removed');
});

console.log(`\n========================================`);
console.log(`Fase 9 Test Results: ${passedTests} Passed, ${failedTests} Failed`);
console.log(`========================================\n`);

if (failedTests > 0) {
  process.exit(1);
}
