/**
 * @file animationEngine.js
 * @description Canonical Keyframe Evaluation & Motion Curve Engine (Fase 4)
 * Pure, deterministic mathematical evaluation of animatable properties over time.
 * Serves as the single source of truth for viewport preview, video export,
 * format review, and headless tests.
 */

import { evaluateEasing, solveCubicBezier } from '../../utils/timecode.js';

export const BEZIER_PRESETS = {
  smooth: { label: 'Smooth', coords: [0.25, 0.1, 0.25, 1.0] },
  snappy: { label: 'Snappy', coords: [0.22, 1.0, 0.36, 1.0] },
  anticipate: { label: 'Anticipate', coords: [0.36, 0.0, 0.66, -0.56] },
  overshoot: { label: 'Overshoot', coords: [0.34, 1.56, 0.64, 1.0] },
  ease: { label: 'CSS Ease', coords: [0.25, 0.1, 0.25, 1.0] },
  easeIn: { label: 'Ease In', coords: [0.42, 0.0, 1.0, 1.0] },
  easeOut: { label: 'Ease Out', coords: [0.0, 0.0, 0.58, 1.0] },
  easeInOut: { label: 'Ease In Out', coords: [0.42, 0.0, 0.58, 1.0] },
};

/**
 * Evaluates layer animatable properties at an exact point in time.
 * 
 * Supports:
 * - Channels: posX (x), posY (y), scale, rotation, opacity
 * - Curves: linear, ease, easeIn, easeOut, easeInOut, custom cubic-bezier([cp1x, cp1y, cp2x, cp2y]),
 *   and named CSS/motion easings.
 * 
 * @param {object} layer - Domain layer entity with optional keyframes array
 * @param {number} localTime - Current playback time in seconds
 * @returns {{ posX: number, posY: number, x: number, y: number, scale: number, rotation: number, opacity: number }}
 */
export function evaluateLayerKeyframes(layer, localTime = 0) {
  const result = {
    posX: layer?.x ?? 0,
    posY: layer?.y ?? 0,
    x: layer?.x ?? 0,
    y: layer?.y ?? 0,
    scale: layer?.scale ?? 1,
    rotation: layer?.rotation ?? 0,
    opacity: layer?.opacity ?? 1,
  };

  if (!layer?.keyframes || layer.keyframes.length === 0) {
    return result;
  }

  const props = ['posX', 'posY', 'scale', 'rotation', 'opacity'];
  for (const prop of props) {
    const kfs = layer.keyframes
      .filter((k) => k.prop === prop || (prop === 'posX' && k.prop === 'x') || (prop === 'posY' && k.prop === 'y'))
      .sort((a, b) => a.time - b.time);

    if (kfs.length === 0) continue;

    if (localTime <= kfs[0].time) {
      const val = kfs[0].value;
      result[prop] = val;
      if (prop === 'posX') result.x = val;
      if (prop === 'posY') result.y = val;
      continue;
    }

    if (localTime >= kfs[kfs.length - 1].time) {
      const val = kfs[kfs.length - 1].value;
      result[prop] = val;
      if (prop === 'posX') result.x = val;
      if (prop === 'posY') result.y = val;
      continue;
    }

    for (let i = 0; i < kfs.length - 1; i++) {
      const k0 = kfs[i];
      const k1 = kfs[i + 1];
      if (localTime >= k0.time && localTime <= k1.time) {
        const span = Math.max(0.0001, k1.time - k0.time);
        const rawT = Math.max(0, Math.min(1, (localTime - k0.time) / span));

        // Read interpolation from either k0 (outgoing) or k1 (incoming)
        const interp = k0.interpolation || k1.interpolation || k0.easing || k1.easing || 'easeOutCubic';
        const bz = k0.bezier || k1.bezier || k0.curve || k1.curve;

        let progress = rawT;
        if (interp === 'linear') {
          progress = rawT;
        } else if (interp === 'bezier' && Array.isArray(bz) && bz.length === 4) {
          progress = solveCubicBezier(rawT, bz[0], bz[1], bz[2], bz[3]);
        } else if (interp === 'ease') {
          progress = solveCubicBezier(rawT, 0.25, 0.1, 0.25, 1.0);
        } else if (interp === 'easeIn') {
          progress = solveCubicBezier(rawT, 0.42, 0, 1.0, 1.0);
        } else if (interp === 'easeOut') {
          progress = solveCubicBezier(rawT, 0, 0, 0.58, 1.0);
        } else if (interp === 'easeInOut') {
          progress = solveCubicBezier(rawT, 0.42, 0, 0.58, 1.0);
        } else {
          progress = evaluateEasing(interp, rawT);
        }

        const interpolated = k0.value + (k1.value - k0.value) * progress;
        result[prop] = interpolated;
        if (prop === 'posX') result.x = interpolated;
        if (prop === 'posY') result.y = interpolated;
        break;
      }
    }
  }

  return result;
}
