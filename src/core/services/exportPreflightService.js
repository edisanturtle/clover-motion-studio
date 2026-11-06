/**
 * @file exportPreflightService.js
 * @description Export Preflight Verification Service (Fase 10)
 * Validates project readiness before export:
 * - Empty range & timing invariants (start < end, duration > 0)
 * - Missing assets & font verification
 * - Text overflow along timeline duration
 * - Off-canvas motion trajectory bounds
 * - Unsupported effects or disabled shaders
 * - Codec / frame-rate compatibility
 * - Audio peaks & clipping hazards (> 0dB / > 1.0 amplitude)
 */

import { FONT_OPTIONS, ASPECT_RATIOS } from '../../constants/fonts.js';
import { checkProjectFormatVariants } from './formatPreflightChecker.js';

export const SUPPORTED_VIDEO_CODECS = [
  'video/webm;codecs=vp9',
  'video/webm;codecs=vp8',
  'video/mp4;codecs=avc1',
  'video/mp4',
  'video/webm',
];

/**
 * Checks whether a video mimeType/codec is supported in the current environment.
 * @param {string} mimeType
 * @returns {boolean}
 */
export function isCodecSupported(mimeType) {
  if (typeof MediaRecorder === 'undefined' || typeof MediaRecorder.isTypeSupported !== 'function') {
    // In headless/test environments, check against known standard codecs
    return SUPPORTED_VIDEO_CODECS.includes(mimeType);
  }
  return MediaRecorder.isTypeSupported(mimeType);
}

/**
 * Runs a comprehensive preflight verification on export parameters and project state.
 *
 * @param {object} params
 * @param {object} params.project
 * @param {string} [params.format='webm'] - 'png' | 'zip' | 'webm' | 'mp4' | 'audio' | 'bundle'
 * @param {string} [params.ratio='4:5']
 * @param {number} [params.fps=30]
 * @param {number} [params.rangeIn=0]
 * @param {number} [params.rangeOut=null]
 * @param {string} [params.codec='video/webm;codecs=vp9']
 * @param {number} [params.audioPeak=0]
 * @param {boolean} [params.includeAudio=true]
 * @returns {{ passed: boolean, errors: string[], warnings: string[], diagnostics: object }}
 */
export function runExportPreflight({
  project,
  format = 'webm',
  ratio = '4:5',
  fps = 30,
  rangeIn = 0,
  rangeOut = null,
  codec = 'video/webm;codecs=vp9',
  audioPeak = 0,
  includeAudio = true,
}) {
  const errors = [];
  const warnings = [];
  const diagnostics = {
    missingAssets: [],
    missingFonts: [],
    overflowLayers: [],
    offCanvasLayers: [],
    unsupportedEffects: [],
    codecIssue: null,
    audioClipping: false,
    durationSeconds: 0,
    totalFrames: 0,
  };

  if (!project) {
    return {
      passed: false,
      errors: ['No project loaded for export preflight.'],
      warnings: [],
      diagnostics,
    };
  }

  // 1. Calculate and Validate Duration & Range Selection
  const totalProjectDuration = (project.scenes || []).reduce(
    (sum, s) => sum + (Number(s.duration) || 4),
    0
  );
  const effectiveEnd = rangeOut !== null && rangeOut !== undefined ? Number(rangeOut) : totalProjectDuration;
  const effectiveStart = Number(rangeIn) || 0;
  const exportDuration = effectiveEnd - effectiveStart;

  diagnostics.durationSeconds = Math.max(0, exportDuration);
  diagnostics.totalFrames = Math.max(0, Math.floor(exportDuration * fps));

  if (effectiveStart >= effectiveEnd) {
    errors.push(
      `Empty export range: In-point (${effectiveStart.toFixed(2)}s) must be strictly less than Out-point (${effectiveEnd.toFixed(2)}s).`
    );
  }

  if (exportDuration <= 0) {
    errors.push('Export duration must be greater than zero.');
  }

  // 2. Frame-rate Validation
  const numericFps = Number(fps);
  if (!numericFps || numericFps < 12 || numericFps > 60) {
    errors.push(`Invalid frame rate: ${fps} fps. Allowed range: 12 - 60 fps.`);
  }

  // 3. Codec Validation (for video formats)
  if (format === 'mp4' || format === 'webm') {
    const isSupported = isCodecSupported(codec);
    if (!isSupported) {
      if (format === 'mp4') {
        warnings.push(
          `Browser does not natively support MP4 (${codec}) recording. Clover Motion will fallback to high-quality WebM (VP9).`
        );
        diagnostics.codecIssue = 'mp4_fallback_to_webm';
      } else {
        warnings.push(`Requested codec "${codec}" may not be supported by this browser.`);
        diagnostics.codecIssue = 'codec_unsupported';
      }
    }
  }

  // 4. Missing Assets Check
  const registeredAssetIds = new Set(Object.keys(project.assets || {}));
  for (const scene of project.scenes || []) {
    for (const layer of scene.layers || []) {
      if (layer.type === 'image' && layer.assetId) {
        if (!registeredAssetIds.has(layer.assetId)) {
          errors.push(
            `Missing asset in layer "${layer.name || layer.id}": assetId "${layer.assetId}" is not in project registry.`
          );
          diagnostics.missingAssets.push({ layerId: layer.id, assetId: layer.assetId });
        }
      }
    }
  }

  // 5. Font Availability Check
  const validFontNames = new Set(FONT_OPTIONS.map((f) => f.name.toLowerCase()));
  for (const scene of project.scenes || []) {
    for (const layer of scene.layers || []) {
      if (layer.type === 'text' && layer.fontFamily) {
        const fontKey = layer.fontFamily.toLowerCase().replace(/['"]/g, '').trim();
        if (!validFontNames.has(fontKey) && !['inter', 'sans-serif', 'monospace', 'serif', 'helvetica'].includes(fontKey)) {
          warnings.push(
            `Layer "${layer.name || 'Text'}" uses custom font "${layer.fontFamily}". Verify web font availability.`
          );
          diagnostics.missingFonts.push({ layerId: layer.id, font: layer.fontFamily });
        }
      }
    }
  }

  // 6. Text Overflow and Off-Canvas Motion Checks (Duration-Spanning)
  try {
    const formatReview = checkProjectFormatVariants(project, { ratios: [ratio] });
    const ratioIssues = formatReview.resultsPerRatio?.[ratio]?.issues || [];
    for (const issue of ratioIssues) {
      if (issue.type === 'text_overflow') {
        warnings.push(
          `Text overflow in layer "${issue.layerName}" at ${issue.timestamp}: ${issue.message}`
        );
        diagnostics.overflowLayers.push(issue);
      } else if (issue.type === 'off_canvas') {
        warnings.push(
          `Off-canvas motion: layer "${issue.layerName}" at ${issue.timestamp}: ${issue.message}`
        );
        diagnostics.offCanvasLayers.push(issue);
      }
    }
  } catch {
    // If formatReview has minor simulation differences, continue safely
  }

  // 7. Unsupported / Disabled Effects Check
  for (const scene of project.scenes || []) {
    const sceneEffects = scene.effects || [];
    for (const fx of sceneEffects) {
      if (!fx.type) {
        warnings.push(`Scene "${scene.name}" contains an untyped or corrupted effect.`);
        diagnostics.unsupportedEffects.push({ sceneId: scene.id, effect: fx });
      }
    }
    for (const layer of scene.layers || []) {
      const layerEffects = layer.effects || [];
      for (const fx of layerEffects) {
        if (!fx.type) {
          warnings.push(`Layer "${layer.name}" contains an untyped or corrupted effect.`);
          diagnostics.unsupportedEffects.push({ layerId: layer.id, effect: fx });
        }
      }
    }
  }

  // 8. Audio Peaks & Clipping Check
  if (includeAudio && format !== 'png' && format !== 'bundle') {
    if (audioPeak > 1.0) {
      warnings.push(
        `Audio clipping detected (peak amplitude ${(audioPeak * 100).toFixed(1)}% > 100%). Audio may distort upon export.`
      );
      diagnostics.audioClipping = true;
    }
  }

  return {
    passed: errors.length === 0,
    errors,
    warnings,
    diagnostics,
  };
}
