/**
 * @file effectModels.js
 * @description Domain Models for Non-Destructive Effect Stack & Blend Modes (Fase 10)
 * Defines Effect entities, parameter constraints, blend modes, mask/matte configurations,
 * license provenance, and non-destructive legacy unsupported effect detection.
 */

export const SUPPORTED_BLEND_MODES = [
  'source-over',
  'multiply',
  'screen',
  'overlay',
  'darken',
  'lighten',
  'color-dodge',
  'color-burn',
  'hard-light',
  'soft-light',
  'difference',
  'exclusion',
];

export const EFFECT_CATEGORIES = {
  ADJUSTMENT: 'Adjustment',
  STYLIZE: 'Stylize',
  OPTICAL: 'Optical & VR',
  RETRO: 'Retro & CRT',
  DISTORT: 'Distort & Time',
  MATTE_MASK: 'Matte & Mask',
};

/**
 * Authoritative Registry of Supported Procedural & Layer Effects.
 * Every entry has verified HTML5 Canvas 2D renderer implementation,
 * explicit parameter constraints, matchName compatibility, and license status.
 */
export const EFFECT_REGISTRY = {
  brightnessContrast: {
    id: 'brightnessContrast',
    name: 'Brightness & Contrast',
    category: EFFECT_CATEGORIES.ADJUSTMENT,
    matchName: 'ec.adjust.brightnesscontrast',
    license: 'MIT / Apache-2.0 (Clover Canvas 2D Engine)',
    supported: true,
    parameters: [
      { key: 'brightness', type: 'number', default: 0, min: -100, max: 100, unit: '%', label: 'Brightness' },
      { key: 'contrast', type: 'number', default: 0, min: -100, max: 100, unit: '%', label: 'Contrast' },
    ],
  },
  hueSaturation: {
    id: 'hueSaturation',
    name: 'Hue & Saturation',
    category: EFFECT_CATEGORIES.ADJUSTMENT,
    matchName: 'ec.adjust.huesaturation',
    license: 'MIT / Apache-2.0 (Clover Canvas 2D Engine)',
    supported: true,
    parameters: [
      { key: 'hue', type: 'number', default: 0, min: -180, max: 180, unit: 'deg', label: 'Hue Rotate' },
      { key: 'saturation', type: 'number', default: 0, min: -100, max: 200, unit: '%', label: 'Saturation' },
    ],
  },
  gaussianBlur: {
    id: 'gaussianBlur',
    name: 'Gaussian Blur',
    category: EFFECT_CATEGORIES.ADJUSTMENT,
    matchName: 'ec.filter.gaussianblur',
    license: 'MIT / Apache-2.0 (Clover Canvas 2D Engine)',
    supported: true,
    parameters: [
      { key: 'radius', type: 'number', default: 8, min: 0, max: 80, unit: 'px', label: 'Blur Radius' },
    ],
  },
  colorTint: {
    id: 'colorTint',
    name: 'Color Tint',
    category: EFFECT_CATEGORIES.ADJUSTMENT,
    matchName: 'ec.color.tint',
    license: 'MIT / Apache-2.0 (Clover Canvas 2D Engine)',
    supported: true,
    parameters: [
      { key: 'color', type: 'color', default: '#159947', label: 'Tint Color' },
      { key: 'amount', type: 'number', default: 50, min: 0, max: 100, unit: '%', label: 'Tint Amount' },
    ],
  },
  vignette: {
    id: 'vignette',
    name: 'Cinema Lens Vignette',
    category: EFFECT_CATEGORIES.STYLIZE,
    matchName: 'ec.stylize.ccvignette',
    license: 'MIT / Apache-2.0 (Clover Canvas 2D Engine)',
    supported: true,
    parameters: [
      { key: 'radius', type: 'number', default: 0.75, min: 0.1, max: 1.5, step: 0.05, label: 'Vignette Radius' },
      { key: 'amount', type: 'number', default: 60, min: 0, max: 100, unit: '%', label: 'Darkness' },
    ],
  },
  invert: {
    id: 'invert',
    name: 'Invert Color',
    category: EFFECT_CATEGORIES.ADJUSTMENT,
    matchName: 'ec.channel.invert',
    license: 'MIT / Apache-2.0 (Clover Canvas 2D Engine)',
    supported: true,
    parameters: [
      { key: 'amount', type: 'number', default: 100, min: 0, max: 100, unit: '%', label: 'Invert Amount' },
    ],
  },
  threshold: {
    id: 'threshold',
    name: 'Threshold / Posterize',
    category: EFFECT_CATEGORIES.STYLIZE,
    matchName: 'ec.stylize.threshold',
    license: 'MIT / Apache-2.0 (Clover Canvas 2D Engine)',
    supported: true,
    parameters: [
      { key: 'level', type: 'number', default: 128, min: 1, max: 255, label: 'Cutoff Level' },
    ],
  },
  glow: {
    id: 'glow',
    name: 'Bloom & Neon Glow',
    category: EFFECT_CATEGORIES.STYLIZE,
    matchName: 'ec.stylize.glow',
    license: 'MIT / Apache-2.0 (Clover Canvas 2D Engine)',
    supported: true,
    parameters: [
      { key: 'intensity', type: 'number', default: 55, min: 0, max: 100, unit: '%', label: 'Glow Intensity', audioReactiveCapable: true },
      { key: 'radius', type: 'number', default: 14, min: 2, max: 64, unit: 'px', label: 'Glow Radius', audioReactiveCapable: true },
      { key: 'color', type: 'color', default: '#22c55e', label: 'Glow Color' },
    ],
  },
  chromaticAberration: {
    id: 'chromaticAberration',
    name: 'Chromatic Aberration',
    category: EFFECT_CATEGORIES.OPTICAL,
    matchName: 'ec.vr.chromatic',
    license: 'MIT / Apache-2.0 (Clover Canvas 2D Engine)',
    supported: true,
    parameters: [
      { key: 'offset', type: 'number', default: 12, min: 0, max: 50, unit: 'px', label: 'Channel Shift', audioReactiveCapable: true },
    ],
  },
  scanlines: {
    id: 'scanlines',
    name: 'CRT Scanlines & Phosphor',
    category: EFFECT_CATEGORIES.RETRO,
    matchName: 'ec.stylize.ccblockload',
    license: 'MIT / Apache-2.0 (Clover Canvas 2D Engine)',
    supported: true,
    parameters: [
      { key: 'density', type: 'number', default: 4, min: 2, max: 16, unit: 'px', label: 'Line Spacing' },
      { key: 'opacity', type: 'number', default: 35, min: 0, max: 100, unit: '%', label: 'Scanline Opacity' },
    ],
  },
  vhsGlitch: {
    id: 'vhsGlitch',
    name: 'VHS & Digital Glitch',
    category: EFFECT_CATEGORIES.RETRO,
    matchName: 'ec.vr.glitch',
    license: 'MIT / Apache-2.0 (Clover Canvas 2D Engine)',
    supported: true,
    parameters: [
      { key: 'intensity', type: 'number', default: 45, min: 0, max: 100, unit: '%', label: 'Glitch Intensity', audioReactiveCapable: true },
      { key: 'slices', type: 'number', default: 6, min: 2, max: 24, label: 'Slice Count' },
    ],
  },
  halftone: {
    id: 'halftone',
    name: 'Halftone Screen & Bayer Dither',
    category: EFFECT_CATEGORIES.STYLIZE,
    matchName: 'ec.sim.ballaction',
    license: 'MIT / Apache-2.0 (Clover Canvas 2D Engine)',
    supported: true,
    parameters: [
      { key: 'dotSize', type: 'number', default: 6, min: 2, max: 24, unit: 'px', label: 'Dot Grid Size' },
      { key: 'angle', type: 'number', default: 45, min: 0, max: 90, unit: 'deg', label: 'Grid Angle' },
    ],
  },
  pixelate: {
    id: 'pixelate',
    name: 'Pixelate & Mosaic Block',
    category: EFFECT_CATEGORIES.DISTORT,
    matchName: 'ec.stylize.mosaic',
    license: 'MIT / Apache-2.0 (Clover Canvas 2D Engine)',
    supported: true,
    parameters: [
      { key: 'blockSize', type: 'number', default: 12, min: 2, max: 64, unit: 'px', label: 'Mosaic Size' },
    ],
  },
  alphaMask: {
    id: 'alphaMask',
    name: 'Alpha Matte Mask',
    category: EFFECT_CATEGORIES.MATTE_MASK,
    matchName: 'ec.matte.alpha',
    license: 'MIT / Apache-2.0 (Clover Canvas 2D Engine)',
    supported: true,
    parameters: [
      { key: 'inverted', type: 'boolean', default: false, label: 'Invert Mask' },
      { key: 'maskLayerId', type: 'string', default: null, label: 'Source Layer' },
    ],
  },
  luminanceMask: {
    id: 'luminanceMask',
    name: 'Luminance Matte Mask',
    category: EFFECT_CATEGORIES.MATTE_MASK,
    matchName: 'ec.matte.luminance',
    license: 'MIT / Apache-2.0 (Clover Canvas 2D Engine)',
    supported: true,
    parameters: [
      { key: 'inverted', type: 'boolean', default: false, label: 'Invert Luminance' },
      { key: 'maskLayerId', type: 'string', default: null, label: 'Source Layer' },
    ],
  },
};

export const DEFAULT_EFFECT_PARAMS = Object.fromEntries(
  Object.entries(EFFECT_REGISTRY).map(([type, def]) => [
    type,
    Object.fromEntries(def.parameters.map((p) => [p.key, p.default])),
  ])
);

/**
 * Checks whether an effect type or ID is supported by the 2D Canvas renderer.
 * @param {string} type
 * @returns {boolean}
 */
export function isEffectSupported(type) {
  if (!type || typeof type !== 'string') return false;
  return Boolean(EFFECT_REGISTRY[type]);
}

/**
 * Creates a validated Effect entity.
 * If the effect type is unsupported, marks it as isUnsupported: true while preserving all raw params verbatim.
 * @param {object} init
 * @returns {object} Effect
 */
export function createEffect(init = {}) {
  const now = Date.now();
  const id = init.id && String(init.id).startsWith('fx_')
    ? init.id
    : `fx_${now}_${Math.random().toString(36).slice(2, 7)}`;

  const type = init.type || 'glow';
  const isSupported = isEffectSupported(type);
  const def = EFFECT_REGISTRY[type];
  const defaultParams = DEFAULT_EFFECT_PARAMS[type] || {};
  const params = { ...defaultParams, ...(init.params || {}) };

  return {
    id,
    type,
    name: init.name || (def ? def.name : formatEffectName(type)),
    enabled: init.enabled !== false,
    opacity: Math.max(0, Math.min(1, init.opacity !== undefined ? Number(init.opacity) : 1)),
    blendMode: SUPPORTED_BLEND_MODES.includes(init.blendMode) ? init.blendMode : 'source-over',
    params,
    audioReactive: Boolean(init.audioReactive),
    audioSignal: init.audioSignal || 'bass',
    keyframes: Array.isArray(init.keyframes) ? [...init.keyframes] : [],
    isUnsupported: !isSupported || Boolean(init.isUnsupported),
    unsupportedReason: !isSupported
      ? `Effect type "${type}" is not supported by HTML5 2D Canvas renderer. Parameters preserved.`
      : init.unsupportedReason || null,
    license: def?.license || 'Unknown / Preserved Legacy Asset',
    matchName: def?.matchName || init.matchName || `unsupported.${type}`,
    createdAt: init.createdAt || now,
    updatedAt: now,
  };
}

/**
 * Scans a project tree for unsupported effects and features.
 * Returns an array of diagnostic warnings while guaranteeing zero data loss.
 * @param {object} project
 * @returns {{ hasUnsupported: boolean, warnings: Array<{ id: string, type: string, name: string, location: string, reason: string, rawData: object }> }}
 */
export function detectUnsupportedProjectFeatures(project) {
  const warnings = [];
  if (!project || typeof project !== 'object') {
    return { hasUnsupported: false, warnings };
  }

  // 1. Check project-level fxRack
  if (project.fxRack && typeof project.fxRack === 'object') {
    for (const [key, fx] of Object.entries(project.fxRack)) {
      if (fx && !EFFECT_REGISTRY[key] && !['glow', 'chromatic', 'vhsGlitch', 'crtScanlines', 'halftoneDither', 'asciiMatrix', 'kaleidoscope', 'echoTrails', 'pixelSort', 'vignetteGrain'].includes(key)) {
        warnings.push({
          id: fx.id || `proj_fx_${key}`,
          type: key,
          name: fx.name || key,
          location: 'project.fxRack',
          reason: `Post-processing FX "${key}" has no registered 2D Canvas shader.`,
          rawData: fx,
        });
      }
    }
  }

  // 2. Check project-level effects stack
  if (Array.isArray(project.effects)) {
    project.effects.forEach((fx, idx) => {
      if (fx && !isEffectSupported(fx.type)) {
        warnings.push({
          id: fx.id || `proj_effect_${idx}`,
          type: fx.type || 'unknown',
          name: fx.name || fx.type,
          location: `project.effects[${idx}]`,
          reason: `Layer effect "${fx.type}" is unsupported in HTML5 2D Canvas mode.`,
          rawData: fx,
        });
      }
    });
  }

  // 3. Check each scene and scene layers
  if (Array.isArray(project.scenes)) {
    project.scenes.forEach((scene, scIdx) => {
      const sceneLabel = scene.name || `Scene ${scIdx + 1}`;

      // Scene-level effects
      if (Array.isArray(scene.effects)) {
        scene.effects.forEach((fx, idx) => {
          if (fx && !isEffectSupported(fx.type)) {
            warnings.push({
              id: fx.id || `scene_${scIdx}_fx_${idx}`,
              type: fx.type || 'unknown',
              name: fx.name || fx.type,
              location: `${sceneLabel} (scene.effects[${idx}])`,
              reason: `Scene effect "${fx.type}" is not supported by Canvas 2D renderer.`,
              rawData: fx,
            });
          }
        });
      }

      // Layer-level effects
      if (Array.isArray(scene.layers)) {
        scene.layers.forEach((layer, lIdx) => {
          const layerLabel = layer.name || `Layer ${lIdx + 1}`;
          if (Array.isArray(layer.effects)) {
            layer.effects.forEach((fx, idx) => {
              if (fx && !isEffectSupported(fx.type)) {
                warnings.push({
                  id: fx.id || `layer_${layer.id}_fx_${idx}`,
                  type: fx.type || 'unknown',
                  name: fx.name || fx.type,
                  location: `${sceneLabel} > ${layerLabel}`,
                  reason: `Layer effect "${fx.type}" is unsupported in HTML5 2D Canvas mode.`,
                  rawData: fx,
                });
              }
            });
          }
        });
      }
    });
  }

  return {
    hasUnsupported: warnings.length > 0,
    warnings,
  };
}

/**
 * Formats effect type into human-readable label.
 */
function formatEffectName(type) {
  if (EFFECT_REGISTRY[type]) {
    return EFFECT_REGISTRY[type].name;
  }
  return type
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}
