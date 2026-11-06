/**
 * @file effectModels.js
 * @description Domain Models for Non-Destructive Effect Stack & Blend Modes (Fase 9)
 * Defines Effect entities, parameter constraints, blend modes, and mask/matte configurations.
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
  MATTE_MASK: 'Matte & Mask',
};

export const DEFAULT_EFFECT_PARAMS = {
  brightnessContrast: { brightness: 0, contrast: 0 },
  hueSaturation: { hue: 0, saturation: 0 },
  gaussianBlur: { radius: 8 },
  colorTint: { color: '#159947', amount: 50 },
  vignette: { radius: 0.75, softness: 0.45, amount: 60 },
  invert: { amount: 100 },
  threshold: { level: 128 },
  glow: { intensity: 55, radius: 14, color: '#22c55e' },
  chromaticAberration: { offset: 12 },
  scanlines: { density: 4, opacity: 35 },
  vhsGlitch: { intensity: 45, slices: 6 },
  halftone: { dotSize: 6, angle: 45 },
  pixelate: { blockSize: 12 },
  alphaMask: { inverted: false, maskLayerId: null },
  luminanceMask: { inverted: false, maskLayerId: null },
};

/**
 * Creates a validated Effect entity.
 * @param {object} init
 * @returns {object} Effect
 */
export function createEffect(init = {}) {
  const now = Date.now();
  const id = init.id && String(init.id).startsWith('fx_')
    ? init.id
    : `fx_${now}_${Math.random().toString(36).slice(2, 7)}`;

  const type = init.type || 'glow';
  const defaultParams = DEFAULT_EFFECT_PARAMS[type] || {};
  const params = { ...defaultParams, ...(init.params || {}) };

  return {
    id,
    type,
    name: init.name || formatEffectName(type),
    enabled: init.enabled !== false,
    opacity: Math.max(0, Math.min(1, init.opacity !== undefined ? Number(init.opacity) : 1)),
    blendMode: SUPPORTED_BLEND_MODES.includes(init.blendMode) ? init.blendMode : 'source-over',
    params,
    audioReactive: Boolean(init.audioReactive),
    audioSignal: init.audioSignal || 'bass',
    keyframes: Array.isArray(init.keyframes) ? [...init.keyframes] : [],
    createdAt: init.createdAt || now,
    updatedAt: now,
  };
}

/**
 * Formats effect type into human-readable label.
 */
function formatEffectName(type) {
  const names = {
    brightnessContrast: 'Brightness & Contrast',
    hueSaturation: 'Hue & Saturation',
    gaussianBlur: 'Gaussian Blur',
    colorTint: 'Color Tint',
    vignette: 'Vignette',
    invert: 'Invert Color',
    threshold: 'Threshold / Posterize',
    glow: 'Bloom & Neon Glow',
    chromaticAberration: 'Chromatic Aberration',
    scanlines: 'CRT Scanlines',
    vhsGlitch: 'Digital Glitch',
    halftone: 'Halftone Screen',
    pixelate: 'Pixelate Block',
    alphaMask: 'Alpha Mask',
    luminanceMask: 'Luminance Matte',
  };
  return names[type] || 'Custom Effect';
}
