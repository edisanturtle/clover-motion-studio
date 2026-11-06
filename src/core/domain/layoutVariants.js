/**
 * @file layoutVariants.js
 * @description Canonical Multi-Format Layout Variants & Per-Format Overrides Engine (Fase 8)
 * Standardizes 6 responsive aspect ratios (9:16, 1:1, 4:5, 16:9, 4:3, 3:4),
 * linking core content properties while enabling non-destructive per-format layout overrides.
 */

import { ASPECT_RATIOS } from '../../constants/fonts.js';

export const SUPPORTED_RATIOS = ['4:5', '1:1', '9:16', '16:9', '4:3', '3:4'];

/**
 * Resolves an effective layer entity for a target aspect ratio.
 * Core content properties (text, font, color, audio-reactive, keyframes) remain linked.
 * Format-specific layout properties (x, y, scale, fontSize, width, height, rotation, visible)
 * are overridden if an explicit override exists for targetRatio.
 *
 * @param {object} layer - Source layer
 * @param {string} targetRatio - Target aspect ratio ID ('9:16' | '1:1' | '4:5' | '16:9' | '4:3' | '3:4')
 * @param {string} baseRatio - Project base aspect ratio (default '4:5')
 * @returns {object} Resolved layer for targetRatio
 */
export function resolveLayerForFormat(layer, targetRatio, baseRatio = '4:5') {
  if (!layer) return layer;
  if (!targetRatio || targetRatio === baseRatio) {
    // If formatOverrides exists for baseRatio, apply it; otherwise return layer as is
    if (layer.formatOverrides?.[baseRatio]) {
      return {
        ...layer,
        ...layer.formatOverrides[baseRatio],
      };
    }
    return layer;
  }

  // Check if an explicit per-format override exists
  const explicitOverride = layer.formatOverrides?.[targetRatio];
  if (explicitOverride && typeof explicitOverride === 'object') {
    return {
      ...layer,
      ...explicitOverride,
      _isOverridden: true,
      _formatRatio: targetRatio,
    };
  }

  // Automatic proportional adaptive scaling fallback if no explicit override
  const srcDim = ASPECT_RATIOS[baseRatio] || ASPECT_RATIOS['4:5'];
  const dstDim = ASPECT_RATIOS[targetRatio] || ASPECT_RATIOS['4:5'];

  const sx = dstDim.width / srcDim.width;
  const sy = dstDim.height / srcDim.height;
  const uniformScale = Math.min(sx, sy);

  const adaptedX = Math.round((layer.x || 0) * sx);
  const adaptedY = Math.round((layer.y || 0) * sy);
  const adaptedScale = Number(((layer.scale || 1.0) * (uniformScale / (layer.scale || 1.0) >= 0.75 ? 1.0 : uniformScale)).toFixed(3));
  const adaptedFontSize = layer.fontSize ? Math.round(layer.fontSize * uniformScale) : undefined;
  const adaptedWidth = layer.width ? Math.round(layer.width * sx) : undefined;
  const adaptedHeight = layer.height ? Math.round(layer.height * sy) : undefined;

  return {
    ...layer,
    x: adaptedX,
    y: adaptedY,
    scale: adaptedScale,
    ...(adaptedFontSize ? { fontSize: adaptedFontSize } : {}),
    ...(adaptedWidth ? { width: adaptedWidth } : {}),
    ...(adaptedHeight ? { height: adaptedHeight } : {}),
    _isOverridden: false,
    _formatRatio: targetRatio,
  };
}

/**
 * Sets or updates a per-format layout override for a layer.
 * Strictly guarantees that modifying targetRatio does NOT mutate base properties
 * or any other format's overrides.
 *
 * @param {object} layer
 * @param {string} targetRatio
 * @param {object} layoutPatch - { x, y, scale, fontSize, width, height, rotation, visible }
 * @returns {object} New layer with updated formatOverrides
 */
export function setLayerFormatOverride(layer, targetRatio, layoutPatch = {}) {
  if (!layer || !targetRatio) return layer;

  const currentOverrides = layer.formatOverrides || {};
  const ratioOverride = currentOverrides[targetRatio] || {};

  return {
    ...layer,
    formatOverrides: {
      ...currentOverrides,
      [targetRatio]: {
        ...ratioOverride,
        ...layoutPatch,
      },
    },
  };
}

/**
 * Removes a per-format layout override, restoring the layer to its linked base layout.
 *
 * @param {object} layer
 * @param {string} targetRatio
 * @returns {object} Layer with override removed for targetRatio
 */
export function removeLayerFormatOverride(layer, targetRatio) {
  if (!layer || !layer.formatOverrides || !targetRatio) return layer;

  const updatedOverrides = { ...layer.formatOverrides };
  delete updatedOverrides[targetRatio];

  return {
    ...layer,
    formatOverrides: updatedOverrides,
  };
}

/**
 * Resolves an entire scene's layers for a target aspect ratio.
 *
 * @param {object} scene
 * @param {string} targetRatio
 * @param {string} baseRatio
 * @returns {object} Resolved scene
 */
export function resolveSceneForFormat(scene, targetRatio, baseRatio = '4:5') {
  if (!scene) return scene;

  const resolvedLayers = (scene.layers || []).map((layer) =>
    resolveLayerForFormat(layer, targetRatio, baseRatio)
  );

  return {
    ...scene,
    layers: resolvedLayers,
    _resolvedRatio: targetRatio,
  };
}

/**
 * Resolves a full project payload for a target aspect ratio.
 *
 * @param {object} project
 * @param {string} targetRatio
 * @returns {object} Resolved project
 */
export function resolveProjectForFormat(project, targetRatio) {
  if (!project || !targetRatio) return project;
  const baseRatio = project.ratio || '4:5';

  const resolvedScenes = (project.scenes || []).map((scene) =>
    resolveSceneForFormat(scene, targetRatio, baseRatio)
  );

  return {
    ...project,
    ratio: targetRatio,
    scenes: resolvedScenes,
    _baseRatio: baseRatio,
  };
}
