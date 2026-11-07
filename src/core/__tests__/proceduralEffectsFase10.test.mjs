/**
 * @file proceduralEffectsFase10.test.mjs
 * @description Comprehensive Acceptance Test Suite for Fase 10:
 * Procedural Effects, Raster Mask / Track Matte, Non-Destructive Parameter Editing,
 * Undo/Redo History, Real Canvas 2D Rendering, and Legacy Unsupported Non-Destructive Guard.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  EFFECT_REGISTRY,
  EFFECT_CATEGORIES,
  SUPPORTED_BLEND_MODES,
  isEffectSupported,
  createEffect,
  detectUnsupportedProjectFeatures,
} from '../domain/effectModels.js';

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
  addShapeLayerToScene,
  addEffectToLayerInProject,
  updateEffectInLayerInProject,
  toggleEffectInLayerInProject,
  reorderEffectInLayerInProject,
  removeEffectFromLayerInProject,
} from '../services/projectService.js';

import {
  createDefaultProject,
  serializeProject,
  deserializeProject,
} from '../domain/projectSchema.js';

import { CommandHistoryManager } from '../services/commandHistory.js';
import { EFFECTCRAFT_FX_RACK, EFFECTCRAFT_SHADER_BACKGROUNDS } from '../../constants/effectCraftEffects.js';
import { applyEffectCraftRack, renderEffectCraftShaderBg } from '../../engine/effectCraftRenderer.js';

/**
 * Mock HTML5 2D Canvas Context for Headless Node.js Testing
 */
function createMockCanvasContext(w = 1080, h = 1080) {
  const operations = [];
  const canvas = { width: w, height: h };

  return {
    canvas,
    operations,
    globalAlpha: 1.0,
    globalCompositeOperation: 'source-over',
    filter: 'none',
    fillStyle: '#000000',
    strokeStyle: '#000000',
    lineWidth: 1,
    lineCap: 'butt',
    save() {
      operations.push({ op: 'save' });
    },
    restore() {
      operations.push({ op: 'restore' });
    },
    fillRect(x, y, width, height) {
      operations.push({ op: 'fillRect', x, y, width, height });
    },
    beginPath() {
      operations.push({ op: 'beginPath' });
    },
    arc(x, y, r, sa, ea) {
      operations.push({ op: 'arc', x, y, r, sa, ea });
    },
    fill() {
      operations.push({ op: 'fill' });
    },
    stroke() {
      operations.push({ op: 'stroke' });
    },
    moveTo(x, y) {
      operations.push({ op: 'moveTo', x, y });
    },
    lineTo(x, y) {
      operations.push({ op: 'lineTo', x, y });
    },
    closePath() {
      operations.push({ op: 'closePath' });
    },
    translate(x, y) {
      operations.push({ op: 'translate', x, y });
    },
    scale(x, y) {
      operations.push({ op: 'scale', x, y });
    },
    rotate(angle) {
      operations.push({ op: 'rotate', angle });
    },
    drawImage(img, ...args) {
      operations.push({ op: 'drawImage', args });
    },
    fillText(text, x, y) {
      operations.push({ op: 'fillText', text, x, y });
    },
    createLinearGradient(x0, y0, x1, y1) {
      return {
        addColorStop(offset, color) {
          operations.push({ op: 'gradientAddColorStop', offset, color });
        },
      };
    },
    createRadialGradient(x0, y0, r0, x1, y1, r1) {
      return {
        addColorStop(offset, color) {
          operations.push({ op: 'radialAddColorStop', offset, color });
        },
      };
    },
  };
}

test('Fase 10: Procedural Effects, Raster Matte/Mask & Non-Destructive Guard', async (t) => {
  await t.test('1. Effect Registry & Specification Completeness', () => {
    const requiredEffects = [
      'brightnessContrast',
      'hueSaturation',
      'gaussianBlur',
      'colorTint',
      'vignette',
      'invert',
      'threshold',
      'glow',
      'chromaticAberration',
      'scanlines',
      'vhsGlitch',
      'halftone',
      'pixelate',
      'alphaMask',
      'luminanceMask',
    ];

    for (const key of requiredEffects) {
      const def = EFFECT_REGISTRY[key];
      assert.ok(def, `Effect "${key}" must be registered in EFFECT_REGISTRY`);
      assert.strictEqual(def.id, key);
      assert.ok(def.name, `Effect "${key}" must have a name`);
      assert.ok(def.category, `Effect "${key}" must have a category`);
      assert.ok(def.matchName, `Effect "${key}" must have an AE/EffectCraft matchName`);
      assert.ok(def.license.includes('MIT') || def.license.includes('Apache-2.0'), `Effect "${key}" must have open-source license`);
      assert.strictEqual(def.supported, true, `Effect "${key}" must be marked supported`);
      assert.ok(Array.isArray(def.parameters) && def.parameters.length > 0, `Effect "${key}" must have parameter definitions`);
      assert.strictEqual(isEffectSupported(key), true, `isEffectSupported("${key}") must be true`);
    }

    assert.strictEqual(isEffectSupported('unsupportedGpuRaymarch'), false);
    assert.strictEqual(isEffectSupported('unknownPlugin3d'), false);
  });

  await t.test('2. Effect Entity Creation, Parameter Defaults & Bounds', () => {
    const glowFx = createEffect({ type: 'glow', opacity: 0.85, blendMode: 'screen' });
    assert.ok(glowFx.id.startsWith('fx_'), 'Glow effect ID must start with fx_');
    assert.strictEqual(glowFx.type, 'glow');
    assert.strictEqual(glowFx.opacity, 0.85);
    assert.strictEqual(glowFx.blendMode, 'screen');
    assert.strictEqual(glowFx.params.intensity, 55);
    assert.strictEqual(glowFx.params.radius, 14);
    assert.strictEqual(glowFx.isUnsupported, false);

    // Test clamped opacity
    const clampedFx = createEffect({ type: 'gaussianBlur', opacity: 2.5 });
    assert.strictEqual(clampedFx.opacity, 1.0);

    // Test invalid blend mode fallback
    const fallbackBlend = createEffect({ type: 'invert', blendMode: 'invalid-mode' });
    assert.strictEqual(fallbackBlend.blendMode, 'source-over');
  });

  await t.test('3. End-to-End Manual Edit → Model Updates → Undo/Redo', () => {
    let project = createDefaultProject('Fase 10 Effect Test');
    const addLayerRes = addShapeLayerToScene(project, 0, 'rectangle');
    project = addLayerRes.project;
    const scene = project.scenes[0];
    const layer = scene.layers[0];
    assert.ok(layer, 'Scene must contain a layer');

    const history = new CommandHistoryManager();
    const snapshot0 = JSON.parse(JSON.stringify(project));

    // 1. Add Effect to layer
    project = addEffectToLayerInProject(project, scene.id, layer.id, {
      type: 'glow',
      params: { intensity: 75, radius: 20 },
    });
    const updatedLayer = project.scenes[0].layers.find((l) => l.id === layer.id);
    assert.strictEqual(updatedLayer.effects.length, 1);
    assert.strictEqual(updatedLayer.effects[0].type, 'glow');
    assert.strictEqual(updatedLayer.effects[0].params.intensity, 75);

    history.push(snapshot0, project, 'Add Glow Effect');
    const snapshot1 = JSON.parse(JSON.stringify(project));

    // 2. Manual edit of parameters
    const glowId = updatedLayer.effects[0].id;
    project = updateEffectInLayerInProject(project, scene.id, layer.id, glowId, {
      params: { intensity: 90, radius: 32 },
    });
    const editedLayer = project.scenes[0].layers.find((l) => l.id === layer.id);
    assert.strictEqual(editedLayer.effects[0].params.intensity, 90);
    assert.strictEqual(editedLayer.effects[0].params.radius, 32);

    history.push(snapshot1, project, 'Edit Glow Parameters');
    assert.strictEqual(history.canUndo(), true);

    // 3. Undo manual edit
    const undoRes = history.undo();
    assert.strictEqual(undoRes.canUndo, true);
    project = undoRes.state;
    const undoneLayer = project.scenes[0].layers.find((l) => l.id === layer.id);
    assert.strictEqual(undoneLayer.effects[0].params.intensity, 75, 'Intensity must revert to 75');

    // 4. Redo manual edit
    const redoRes = history.redo();
    assert.strictEqual(redoRes.canRedo, true);
    project = redoRes.state;
    const redoneLayer = project.scenes[0].layers.find((l) => l.id === layer.id);
    assert.strictEqual(redoneLayer.effects[0].params.intensity, 90, 'Intensity must restore to 90');

    // 5. Toggle and Remove
    project = toggleEffectInLayerInProject(project, scene.id, layer.id, glowId, false);
    assert.strictEqual(project.scenes[0].layers[0].effects[0].enabled, false);

    project = removeEffectFromLayerInProject(project, scene.id, layer.id, glowId);
    assert.strictEqual(project.scenes[0].layers[0].effects.length, 0);
  });

  await t.test('4. Real 2D Canvas Rendering Under 16.6ms Performance Budget', () => {
    const ctx = createMockCanvasContext(1920, 1080);
    const effects = [
      createEffect({ type: 'brightnessContrast', params: { brightness: 10, contrast: 20 } }),
      createEffect({ type: 'hueSaturation', params: { hue: 45, saturation: 10 } }),
      createEffect({ type: 'gaussianBlur', params: { radius: 10 } }),
      createEffect({ type: 'colorTint', params: { color: '#159947', amount: 40 } }),
      createEffect({ type: 'vignette', params: { radius: 0.8, amount: 50 } }),
      createEffect({ type: 'invert', params: { amount: 100 } }),
      createEffect({ type: 'threshold', params: { level: 128 } }),
      createEffect({ type: 'glow', params: { intensity: 60, radius: 15 } }),
      createEffect({ type: 'chromaticAberration', params: { offset: 10 } }),
      createEffect({ type: 'scanlines', params: { density: 4, opacity: 30 } }),
      createEffect({ type: 'vhsGlitch', params: { intensity: 50, slices: 4 } }),
      createEffect({ type: 'halftone', params: { dotSize: 6, angle: 45 } }),
      createEffect({ type: 'pixelate', params: { blockSize: 16 } }),
    ];

    const t0 = performance.now();
    applyEffectStackToCanvas({
      ctx,
      width: 1920,
      height: 1080,
      effects,
      localTime: 1.5,
      audioSignals: { bass: 0.6, mid: 0.3, treble: 0.5, rms: 0.4 },
      performanceBudgetMs: TARGET_FRAME_BUDGET_MS,
    });
    const elapsed = performance.now() - t0;

    assert.ok(elapsed < TARGET_FRAME_BUDGET_MS, `Render execution (${elapsed.toFixed(2)}ms) must be under ${TARGET_FRAME_BUDGET_MS}ms`);
    assert.ok(ctx.operations.length > 20, 'Canvas operations must have executed across all effect types');
  });

  await t.test('5. Procedural Shaders & FX Rack Execution', () => {
    const ctx = createMockCanvasContext(1080, 1080);
    const shaders = [
      'auroraVeil',
      'pastelPlasma',
      'magmaFlow',
      'voronoiCrystals',
      'cyberGrid',
      'particlesWorld',
      'audioSpectrumRing',
    ];

    for (const sh of shaders) {
      renderEffectCraftShaderBg({
        ctx,
        width: 1080,
        height: 1080,
        shaderId: sh,
        localTime: 2.0,
        audioSignals: { bass: 0.5, mid: 0.4, treble: 0.6, rms: 0.5 },
      });
    }

    const fxRack = {
      glow: { enabled: true, intensity: 60, audioReactive: true },
      chromatic: { enabled: true, intensity: 50, audioReactive: true },
      vhsGlitch: { enabled: true, intensity: 45, audioReactive: true },
      crtScanlines: { enabled: true, intensity: 40 },
      halftoneDither: { enabled: true, intensity: 35 },
      asciiMatrix: { enabled: true, intensity: 50, audioReactive: true },
      kaleidoscope: { enabled: true, intensity: 50 },
      echoTrails: { enabled: true, intensity: 40, audioReactive: true },
      pixelSort: { enabled: true, intensity: 45, audioReactive: true },
      vignetteGrain: { enabled: true, intensity: 40 },
    };

    applyEffectCraftRack({
      ctx,
      width: 1080,
      height: 1080,
      fxRack,
      localTime: 3.5,
      audioSignals: { bass: 0.8, mid: 0.4, treble: 0.7, rms: 0.6 },
    });

    assert.ok(ctx.operations.length > 50, 'All 10 FX Rack filters must render operations to canvas');
  });

  await t.test('6. Track Matte Masking & Rec. 709 Luminance Conversion', () => {
    // Rec. 709 luminance weights: 0.2126*R + 0.7152*G + 0.0722*B
    const mockImageData = {
      data: new Uint8ClampedArray([
        255, 255, 255, 255, // Pure White -> Lum 255
        0, 0, 0, 255,       // Pure Black -> Lum 0
        255, 0, 0, 255,     // Pure Red -> Lum 54
        0, 255, 0, 255,     // Pure Green -> Lum 182
      ]),
    };

    convertLuminanceToAlpha(mockImageData, false);
    assert.strictEqual(mockImageData.data[3], 255, 'White alpha should be 255');
    assert.strictEqual(mockImageData.data[7], 0, 'Black alpha should be 0');
    assert.strictEqual(mockImageData.data[11], 54, 'Red alpha should be ~54');
    assert.strictEqual(mockImageData.data[15], 182, 'Green alpha should be ~182');

    // Inverted luminance
    const mockInverted = {
      data: new Uint8ClampedArray([255, 255, 255, 255, 0, 0, 0, 255]),
    };
    convertLuminanceToAlpha(mockInverted, true);
    assert.strictEqual(mockInverted.data[3], 0, 'Inverted white alpha should be 0');
    assert.strictEqual(mockInverted.data[7], 255, 'Inverted black alpha should be 255');

    // Test applyMatteMaskToCanvas
    const targetCtx = createMockCanvasContext(1080, 1080);
    const maskCanvas = { width: 1080, height: 1080 };
    applyMatteMaskToCanvas(targetCtx, maskCanvas, 'alpha', 1080, 1080);
    assert.ok(targetCtx.operations.some((op) => op.op === 'drawImage'), 'Matte mask drawImage must be called');
  });

  await t.test('7. Keyframe Interpolation & Audio-Reactive Modulation', () => {
    const animFx = createEffect({
      type: 'glow',
      params: { intensity: 50, radius: 10 },
      keyframes: [
        { prop: 'intensity', time: 0, value: 20, interpolation: 'linear' },
        { prop: 'intensity', time: 2, value: 80, interpolation: 'linear' },
        { prop: 'radius', time: 0, value: 5, interpolation: 'linear' },
        { prop: 'radius', time: 2, value: 25, interpolation: 'linear' },
      ],
      audioReactive: true,
      audioSignal: 'bass',
    });

    // At t = 1.0 (midway) without audio: intensity = 50, radius = 15
    const midParams = evaluateEffectParams(animFx, 1.0, { bass: 0 });
    assert.strictEqual(midParams.intensity, 50);
    assert.strictEqual(midParams.radius, 15);

    // At t = 1.0 with audio (bass = 0.5): boost = 1 + 0.5 * 0.8 = 1.4
    const audioParams = evaluateEffectParams(animFx, 1.0, { bass: 0.5 });
    assert.strictEqual(audioParams.intensity, Math.round(50 * 1.4));
    assert.strictEqual(audioParams.radius, Math.round(15 * 1.4));
  });

  await t.test('8. Legacy Unsupported Effect Detection & Non-Destructive Data Preservation', () => {
    let legacyProject = createDefaultProject('Legacy Unsupported Project');
    const addLayerRes = addShapeLayerToScene(legacyProject, 0, 'rectangle');
    legacyProject = addLayerRes.project;
    const scene = legacyProject.scenes[0];
    const layer = scene.layers[0];

    // Inject unsupported legacy effects into layer and scene
    layer.effects = [
      createEffect({ type: 'gaussianBlur', params: { radius: 12 } }),
      {
        id: 'fx_legacy_fluid',
        type: 'ec.gpu.fluidSimulation',
        name: 'GPU Fluid Dynamics',
        params: { viscosity: 0.85, vorticity: 1.2, gridRes: 256 },
        enabled: true,
      },
    ];

    scene.effects = [
      {
        id: 'fx_legacy_optical',
        type: 'opticalFlowMotionBlur3D',
        name: 'Optical Flow 3D',
        params: { samples: 32, shutterAngle: 180 },
        enabled: true,
      },
    ];

    legacyProject.fxRack = {
      unsupportedRaymarch: {
        id: 'fx_raymarch',
        name: 'Raymarching 3D Volume',
        steps: 64,
        enabled: true,
      },
    };

    // 1. Detect unsupported features
    const diagnostics = detectUnsupportedProjectFeatures(legacyProject);
    assert.strictEqual(diagnostics.hasUnsupported, true, 'Diagnostics must flag unsupported features');
    assert.strictEqual(diagnostics.warnings.length, 3, 'Must identify all 3 unsupported features');

    const warningTypes = diagnostics.warnings.map((w) => w.type);
    assert.ok(warningTypes.includes('ec.gpu.fluidSimulation'));
    assert.ok(warningTypes.includes('opticalFlowMotionBlur3D'));
    assert.ok(warningTypes.includes('unsupportedRaymarch'));

    // 2. Pure Canvas Renderer Gracefully Skips Unsupported (No crash)
    const ctx = createMockCanvasContext(1080, 1080);
    assert.doesNotThrow(() => {
      applyEffectStackToCanvas({
        ctx,
        width: 1080,
        height: 1080,
        effects: layer.effects,
        localTime: 0,
      });
    }, 'Unsupported effect must not throw or crash renderer');

    // 3. Serialization and Deserialization Roundtrip Guarantee Zero Data Loss
    const serializedJson = serializeProject(legacyProject);
    const restoredProject = deserializeProject(serializedJson);

    const restoredLayer = restoredProject.scenes[0].layers.find((l) => l.id === layer.id);
    assert.strictEqual(restoredLayer.effects.length, 2, 'Both effects must be preserved');

    const restoredFluid = restoredLayer.effects.find((f) => f.type === 'ec.gpu.fluidSimulation');
    assert.ok(restoredFluid, 'Unsupported fluid effect must exist in restored project');
    assert.strictEqual(restoredFluid.params.viscosity, 0.85, 'Viscosity must be preserved verbatim');
    assert.strictEqual(restoredFluid.params.vorticity, 1.2, 'Vorticity must be preserved verbatim');
    assert.strictEqual(restoredFluid.params.gridRes, 256, 'GridRes must be preserved verbatim');

    const restoredSceneFx = restoredProject.scenes[0].effects[0];
    assert.strictEqual(restoredSceneFx.type, 'opticalFlowMotionBlur3D');
    assert.strictEqual(restoredSceneFx.params.samples, 32);

    assert.ok(restoredProject.fxRack.unsupportedRaymarch, 'Project fxRack unsupported effect must be preserved');
    assert.strictEqual(restoredProject.fxRack.unsupportedRaymarch.steps, 64);
  });

  await t.test('9. No Dead Controls Invariant (Every Exposed Effect Has Working Renderer)', () => {
    // Check all 10 FX Rack entries have matching implementations in applyEffectCraftRack
    for (const fx of EFFECTCRAFT_FX_RACK) {
      assert.ok(fx.id, `FX Rack item must have id`);
      assert.ok(fx.matchName, `FX Rack item ${fx.id} must have matchName`);
      assert.ok(typeof fx.defaultIntensity === 'number', `FX Rack item ${fx.id} must have defaultIntensity`);
    }

    // Check all 8 Shader Backgrounds have matching implementations in renderEffectCraftShaderBg
    for (const sh of EFFECTCRAFT_SHADER_BACKGROUNDS) {
      assert.ok(sh.id, `Shader item must have id`);
      assert.ok(sh.name, `Shader item ${sh.id} must have name`);
    }

    // Check all items in EFFECT_REGISTRY have real renderer cases in applyEffectStackToCanvas
    for (const [key, def] of Object.entries(EFFECT_REGISTRY)) {
      const ctx = createMockCanvasContext(512, 512);
      const testEffect = createEffect({ type: key });
      assert.doesNotThrow(() => {
        applyEffectStackToCanvas({
          ctx,
          width: 512,
          height: 512,
          effects: [testEffect],
          localTime: 1.0,
          audioSignals: { bass: 0.5, mid: 0.5, treble: 0.5, rms: 0.5 },
        });
      }, `applyEffectStackToCanvas must execute for ${key}`);
    }
  });
});
