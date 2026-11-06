/**
 * @file effectStackService.js
 * @description Non-Destructive Effect Stack Engine & Performance Budget Evaluator (Fase 9)
 * Manages effect reordering, keyframe interpolation, audio-reactive modulation,
 * blend mode compositing, and CPU fallback under strict 16.6ms performance budgets.
 */

import { createEffect } from '../domain/effectModels.js';
import { evaluateEasing } from '../../utils/timecode.js';

export const TARGET_FRAME_BUDGET_MS = 16.6; // 60 FPS Target Ceiling

/**
 * Adds a new effect to an effect stack.
 * @param {Array<object>} stack
 * @param {object} effectData
 * @returns {Array<object>}
 */
export function addEffectToStack(stack = [], effectData = {}) {
  const newFx = createEffect(effectData);
  return [...stack, newFx];
}

/**
 * Updates an effect in a stack by ID.
 * @param {Array<object>} stack
 * @param {string} effectId
 * @param {object} patch
 * @returns {Array<object>}
 */
export function updateEffectInStack(stack = [], effectId, patch = {}) {
  return stack.map((fx) => {
    if (fx.id === effectId) {
      return createEffect({
        ...fx,
        ...patch,
        params: { ...fx.params, ...(patch.params || {}) },
      });
    }
    return fx;
  });
}

/**
 * Reorders an effect within a stack to a new index position.
 * Non-destructive: preserves all parameters.
 * @param {Array<object>} stack
 * @param {string} effectId
 * @param {number} newIndex
 * @returns {Array<object>}
 */
export function reorderEffectInStack(stack = [], effectId, newIndex) {
  const currentIndex = stack.findIndex((fx) => fx.id === effectId);
  if (currentIndex === -1) return stack;

  const targetIdx = Math.max(0, Math.min(stack.length - 1, newIndex));
  if (currentIndex === targetIdx) return stack;

  const updated = [...stack];
  const [removed] = updated.splice(currentIndex, 1);
  updated.splice(targetIdx, 0, removed);
  return updated;
}

/**
 * Toggles an effect on/off.
 * @param {Array<object>} stack
 * @param {string} effectId
 * @param {boolean} enabled
 * @returns {Array<object>}
 */
export function toggleEffectInStack(stack = [], effectId, enabled = null) {
  return stack.map((fx) => {
    if (fx.id === effectId) {
      const nextEnabled = enabled !== null ? Boolean(enabled) : !fx.enabled;
      return { ...fx, enabled: nextEnabled, updatedAt: Date.now() };
    }
    return fx;
  });
}

/**
 * Removes an effect from the stack.
 * @param {Array<object>} stack
 * @param {string} effectId
 * @returns {Array<object>}
 */
export function removeEffectFromStack(stack = [], effectId) {
  return stack.filter((fx) => fx.id !== effectId);
}

/**
 * Evaluates an effect's animated parameters at localTime and modulates with audio.
 * @param {object} effect
 * @param {number} localTime
 * @param {object} audioSignals
 * @returns {object} Evaluated parameter dictionary
 */
export function evaluateEffectParams(effect, localTime = 0, audioSignals = {}) {
  const evaluated = { ...effect.params };

  // 1. Evaluate keyframes if present
  if (Array.isArray(effect.keyframes) && effect.keyframes.length > 0) {
    const keyframesByProp = {};
    for (const kf of effect.keyframes) {
      if (!keyframesByProp[kf.prop]) keyframesByProp[kf.prop] = [];
      keyframesByProp[kf.prop].push(kf);
    }

    for (const [prop, kfs] of Object.entries(keyframesByProp)) {
      kfs.sort((a, b) => a.time - b.time);
      if (localTime <= kfs[0].time) {
        evaluated[prop] = kfs[0].value;
      } else if (localTime >= kfs[kfs.length - 1].time) {
        evaluated[prop] = kfs[kfs.length - 1].value;
      } else {
        for (let i = 0; i < kfs.length - 1; i++) {
          const kfA = kfs[i];
          const kfB = kfs[i + 1];
          if (localTime >= kfA.time && localTime <= kfB.time) {
            const span = kfB.time - kfA.time;
            const progress = span > 0 ? (localTime - kfA.time) / span : 0;
            const eased = evaluateEasing(kfB.interpolation || 'linear', progress);
            evaluated[prop] = kfA.value + (kfB.value - kfA.value) * eased;
            break;
          }
        }
      }
    }
  }

  // 2. Modulate with audio reactive signal if enabled
  if (effect.audioReactive) {
    const signal = audioSignals[effect.audioSignal || 'bass'] || 0;
    const boost = 1 + signal * 0.8;
    if (typeof evaluated.intensity === 'number') {
      evaluated.intensity = Math.round(evaluated.intensity * boost);
    }
    if (typeof evaluated.radius === 'number') {
      evaluated.radius = Math.round(evaluated.radius * boost);
    }
  }

  return evaluated;
}

/**
 * Applies a stack of effects sequentially onto a canvas context with performance budgeting.
 * If elapsed time exceeds performanceBudgetMs, gracefully skips heavy effects to maintain 60 FPS.
 *
 * @param {object} params
 */
export function applyEffectStackToCanvas({
  ctx,
  width,
  height,
  effects = [],
  localTime = 0,
  audioSignals = {},
  performanceBudgetMs = TARGET_FRAME_BUDGET_MS,
}) {
  if (!ctx || !Array.isArray(effects) || effects.length === 0) return;

  const canvas = ctx.canvas;
  const startTime = typeof performance !== 'undefined' ? performance.now() : Date.now();

  const drawSelf = () => {
    if (canvas && typeof ctx.drawImage === 'function') {
      try {
        ctx.drawImage(canvas, 0, 0, width, height);
      } catch {
        // Fallback for detached canvas
      }
    }
  };

  for (const effect of effects) {
    if (!effect.enabled) continue;

    // Check performance budget
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const elapsed = now - startTime;
    if (elapsed > performanceBudgetMs) {
      // Exceeded budget: skip heavy effect and continue to protect frame rate
      break;
    }

    const params = evaluateEffectParams(effect, localTime, audioSignals);

    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, effect.opacity ?? 1));
    ctx.globalCompositeOperation = effect.blendMode || 'source-over';

    switch (effect.type) {
      case 'brightnessContrast': {
        const b = 100 + (params.brightness || 0);
        const c = 100 + (params.contrast || 0);
        ctx.filter = `brightness(${b}%) contrast(${c}%)`;
        drawSelf();
        ctx.filter = 'none';
        break;
      }

      case 'hueSaturation': {
        const hue = params.hue || 0;
        const sat = 100 + (params.saturation || 0);
        ctx.filter = `hue-rotate(${hue}deg) saturate(${sat}%)`;
        drawSelf();
        ctx.filter = 'none';
        break;
      }

      case 'gaussianBlur': {
        const r = Math.max(1, params.radius || 4);
        ctx.filter = `blur(${r}px)`;
        drawSelf();
        ctx.filter = 'none';
        break;
      }

      case 'invert': {
        const amount = params.amount || 100;
        ctx.filter = `invert(${amount}%)`;
        drawSelf();
        ctx.filter = 'none';
        break;
      }

      case 'colorTint': {
        ctx.fillStyle = params.color || '#159947';
        ctx.globalAlpha = ((params.amount || 50) / 100) * 0.45;
        ctx.fillRect(0, 0, width, height);
        break;
      }

      case 'vignette': {
        const rad = Math.max(width, height) * (params.radius || 0.75);
        if (typeof ctx.createRadialGradient === 'function') {
          const grad = ctx.createRadialGradient(width / 2, height / 2, rad * 0.3, width / 2, height / 2, rad);
          const amt = ((params.amount || 60) / 100) * 0.85;
          grad.addColorStop(0, 'transparent');
          grad.addColorStop(0.7, `rgba(0,0,0,${amt * 0.4})`);
          grad.addColorStop(1, `rgba(0,0,0,${amt})`);
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, width, height);
        }
        break;
      }

      case 'scanlines': {
        const density = Math.max(2, params.density || 4);
        const opacity = ((params.opacity || 35) / 100) * 0.35;
        ctx.fillStyle = `rgba(0, 0, 0, ${opacity.toFixed(2)})`;
        for (let y = 0; y < height; y += density * 2) {
          ctx.fillRect(0, y, width, density);
        }
        break;
      }

      case 'glow': {
        const intensity = ((params.intensity ?? 55) / 100) * 0.6;
        const rad = Math.max(4, params.radius || 14);
        ctx.globalCompositeOperation = 'screen';
        ctx.globalAlpha = intensity;
        ctx.filter = `blur(${rad}px) brightness(1.2)`;
        drawSelf();
        ctx.filter = 'none';
        break;
      }

      case 'chromaticAberration': {
        const shift = Math.max(2, params.offset || 8);
        ctx.globalCompositeOperation = 'screen';
        ctx.globalAlpha = 0.45;
        if (canvas && typeof ctx.drawImage === 'function') {
          try {
            ctx.drawImage(canvas, -shift, 0, width, height);
            ctx.drawImage(canvas, shift, 0, width, height);
          } catch {}
        }
        break;
      }

      default:
        break;
    }

    ctx.restore();
  }
}
