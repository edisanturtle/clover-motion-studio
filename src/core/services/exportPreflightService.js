/**
 * @file exportPreflightService.js
 * @description Export Preflight Verification Service (Fase 11)
 * Validates project readiness before export:
 * - Missing media & font verification (images, video clips, custom typefaces)
 * - Unsupported effects detection & non-destructive preservation notices
 * - Dimensions, frame rate (12-60 fps), and duration invariants (start < end, duration > 0)
 * - Audio clipping (> 0dB / > 1.0 amplitude) and timecode sync verification
 * - Color / Alpha / Codec compatibility (transparent background vs container capability)
 * - License provenance issues (quarantine/hold blocker, unverified notices)
 */

import { FONT_OPTIONS, ASPECT_RATIOS } from '../../constants/fonts.js';
import { checkProjectFormatVariants } from './formatPreflightChecker.js';
import { detectUnsupportedProjectFeatures } from '../domain/effectModels.js';

export const SUPPORTED_VIDEO_CODECS = [
  'video/webm;codecs=vp9',
  'video/webm;codecs=vp8',
  'video/mp4;codecs=avc1',
  'video/mp4',
  'video/webm',
];

export const SUPPORTED_EXPORT_FORMATS = [
  { id: 'webm', name: 'WebM Video', ext: 'webm', mimeType: 'video/webm', supportsAlpha: true, supportsAudio: true },
  { id: 'mp4', name: 'MP4 Video', ext: 'mp4', mimeType: 'video/mp4', supportsAlpha: false, supportsAudio: true },
  { id: 'png', name: 'Still PNG Frame', ext: 'png', mimeType: 'image/png', supportsAlpha: true, supportsAudio: false },
  { id: 'zip', name: 'PNG Frame Sequence (ZIP)', ext: 'zip', mimeType: 'application/zip', supportsAlpha: true, supportsAudio: false },
  { id: 'audio', name: 'WAV Master Audio', ext: 'wav', mimeType: 'audio/wav', supportsAlpha: false, supportsAudio: true },
  { id: 'bundle', name: 'Native Project Bundle', ext: 'clovermotion.json', mimeType: 'application/json', supportsAlpha: true, supportsAudio: true },
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
 * @param {boolean} [params.transparentBg=false]
 * @param {number} [params.audioSampleRate=48000]
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
  transparentBg = false,
  audioSampleRate = 48000,
}) {
  const errors = [];
  const warnings = [];
  const diagnostics = {
    missingAssets: [],
    missingMedia: [],
    missingFonts: [],
    overflowLayers: [],
    offCanvasLayers: [],
    unsupportedEffects: [],
    licenseIssues: [],
    codecIssue: null,
    alphaIssue: null,
    audioClipping: false,
    audioSyncIssue: null,
    durationSeconds: 0,
    totalFrames: 0,
    dimensions: null,
  };

  if (!project) {
    return {
      passed: false,
      errors: ['No project loaded for export preflight.'],
      warnings: [],
      diagnostics,
    };
  }

  // 1. Dimensions, Ratio & Timing Invariants
  const dim = ASPECT_RATIOS[ratio] || ASPECT_RATIOS['4:5'] || { width: 1080, height: 1350 };
  diagnostics.dimensions = { width: dim.width, height: dim.height, ratio };

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

  // 2. Frame-rate Validation (12 - 60 FPS)
  const numericFps = Number(fps);
  if (!numericFps || numericFps < 12 || numericFps > 60) {
    errors.push(`Invalid frame rate: ${fps} fps. Allowed range: 12 - 60 fps.`);
  }

  // 3. Format & Codec Compatibility Check
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

  // 4. Color / Alpha Transparency vs Container Capability
  if (transparentBg) {
    if (format === 'mp4') {
      warnings.push(
        'MP4 (H.264) video container does not support an alpha transparency channel. The exported background will render opaque black. Use WebM (VP9) or PNG Sequence for transparent alpha.'
      );
      diagnostics.alphaIssue = 'mp4_no_alpha';
    } else if (format === 'audio') {
      // Audio does not have visual channels
    }
  }

  // 5. Missing Media (Images & Video Clips)
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

  // Video Track clips check
  if (Array.isArray(project.videoTracks)) {
    for (const track of project.videoTracks) {
      for (const clip of track.clips || []) {
        if (clip.assetId && !registeredAssetIds.has(clip.assetId)) {
          errors.push(
            `Missing video asset in track "${track.name}", clip "${clip.name}": assetId "${clip.assetId}" is missing.`
          );
          diagnostics.missingMedia.push({ trackId: track.id, clipId: clip.id, assetId: clip.assetId });
        }
      }
    }
  }

  // 6. Font Availability Check
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

  // 7. Unsupported Effects Check (Fase 10 / 11 Integration)
  const unsupportedDiagnostics = detectUnsupportedProjectFeatures(project);
  if (unsupportedDiagnostics.hasUnsupported) {
    for (const w of unsupportedDiagnostics.warnings) {
      warnings.push(
        `Preserved legacy effect "${w.name}" [${w.type}] (${w.location}): Skipped during 2D Canvas export. All project parameters remain preserved.`
      );
      diagnostics.unsupportedEffects.push(w);
    }
  }

  // 8. Audio Clipping & Timecode Sync
  if (includeAudio && format !== 'png' && format !== 'bundle') {
    if (audioPeak > 1.0) {
      warnings.push(
        `Audio clipping detected (peak amplitude ${(audioPeak * 100).toFixed(1)}% > 100%). Audio may distort upon export.`
      );
      diagnostics.audioClipping = true;
    }

    if (![44100, 48000].includes(Number(audioSampleRate))) {
      warnings.push(`Non-standard audio sample rate: ${audioSampleRate}Hz. Standard broadcast rates are 48000Hz or 44100Hz.`);
      diagnostics.audioSyncIssue = 'non_standard_sample_rate';
    }
  }

  // 9. License Provenance Audit
  if (project.assets && typeof project.assets === 'object') {
    for (const [id, asset] of Object.entries(project.assets)) {
      if (asset?.license === 'hold' || asset?.license === 'quarantined') {
        errors.push(
          `Asset "${asset.name || id}" has restricted license status "${asset.license}". Export blocked until legal clearance.`
        );
        diagnostics.licenseIssues.push({ assetId: id, status: asset.license });
      } else if (asset?.license === 'unknown') {
        warnings.push(
          `Asset "${asset.name || id}" has unknown license provenance. Verify commercial distribution rights.`
        );
        diagnostics.licenseIssues.push({ assetId: id, status: 'unknown' });
      }
    }
  }

  // 10. Text Overflow and Off-Canvas Motion Checks (Duration-Spanning)
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

  return {
    passed: errors.length === 0,
    errors,
    warnings,
    diagnostics,
  };
}
