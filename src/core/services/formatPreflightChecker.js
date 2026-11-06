/**
 * @file formatPreflightChecker.js
 * @description Duration-Spanning Multi-Format Preflight Checker (Fase 8)
 * Samples keyframe trajectories along the entire timeline duration across 6 aspect ratios
 * to detect text overflow, bounds violations, off-canvas motion, and safe-area encroachment.
 */

import { ASPECT_RATIOS } from '../../constants/fonts.js';
import { SUPPORTED_RATIOS, resolveLayerForFormat } from '../domain/layoutVariants.js';
import { evaluateLayerKeyframes } from './animationEngine.js';

export const SAFE_AREA_CONFIG = {
  general: {
    actionSafePercent: 0.05, // 5% margins (90% safe box)
    titleSafePercent: 0.10,  // 10% margins (80% safe box)
  },
  '9:16': {
    // Specific platform UI clearance for TikTok, IG Reels, YT Shorts
    topMarginPercent: 0.12,   // Header, search, camera indicator
    bottomMarginPercent: 0.20,// Caption, username, sound title, navigation
    rightMarginPercent: 0.15, // Like, comment, share, bookmark stack
    leftMarginPercent: 0.05,
  },
};

/**
 * Samples and inspects all 6 aspect ratio variants across the full timeline duration.
 *
 * @param {object} project
 * @param {object} options - { sampleCount: number, ratios: string[] }
 * @returns {object} Full Preflight Report
 */
export function checkProjectFormatVariants(project, { sampleCount = 6, ratios = SUPPORTED_RATIOS } = {}) {
  if (!project || !Array.isArray(project.scenes)) {
    return {
      totalIssuesCount: 0,
      resultsPerRatio: {},
      summary: 'No scenes to inspect.',
    };
  }

  const baseRatio = project.ratio || '4:5';
  const resultsPerRatio = {};
  let totalIssuesCount = 0;

  for (const ratioId of ratios) {
    const dim = ASPECT_RATIOS[ratioId] || ASPECT_RATIOS['4:5'];
    const issues = [];

    project.scenes.forEach((scene, sceneIdx) => {
      const sceneDuration = Math.max(1, Number(scene.duration) || 4);

      // Collect sample points: 0, intermediate fractions, duration, plus explicit keyframe times
      const sampleTimesSet = new Set([0, sceneDuration]);
      for (let s = 1; s < sampleCount; s++) {
        sampleTimesSet.add(Number(((sceneDuration * s) / sampleCount).toFixed(3)));
      }

      // Add explicit keyframe timestamps from layers
      (scene.layers || []).forEach((l) => {
        (l.keyframes || []).forEach((kf) => {
          if (kf.time >= 0 && kf.time <= sceneDuration) {
            sampleTimesSet.add(Number(kf.time.toFixed(3)));
          }
        });
      });

      const sampleTimes = Array.from(sampleTimesSet).sort((a, b) => a - b);

      // Inspect each layer across all sample times for this ratio
      (scene.layers || []).forEach((layer) => {
        if (layer.visible === false) return;

        const effectiveLayer = resolveLayerForFormat(layer, ratioId, baseRatio);

        for (const t of sampleTimes) {
          const kfPose = evaluateLayerKeyframes(effectiveLayer, t);

          const cx = dim.width / 2 + (effectiveLayer.x || 0) + (kfPose.posX || 0);
          const cy = dim.height / 2 + (effectiveLayer.y || 0) + (kfPose.posY || 0);
          const scale = (effectiveLayer.scale || 1.0) * (kfPose.scale || 1.0);

          // 1. Text Bounds & Overflow Verification
          if (effectiveLayer.type === 'text' || effectiveLayer.text) {
            const text = String(effectiveLayer.text || '');
            const lines = text.split('\n');
            const maxLineLen = lines.reduce((max, l) => Math.max(max, l.length), 0);
            const fontSize = (effectiveLayer.fontSize || 36) * scale;

            // Estimated physical bounding box
            const estWidth = maxLineLen * fontSize * 0.62;
            const estHeight = lines.length * fontSize * 1.25;

            const boxLeft = cx - estWidth / 2;
            const boxRight = cx + estWidth / 2;
            const boxTop = cy - estHeight / 2;
            const boxBottom = cy + estHeight / 2;

            // Check canvas frame boundary overflow
            if (boxLeft < 0 || boxRight > dim.width) {
              const overflowPx = Math.max(0 - boxLeft, boxRight - dim.width);
              issues.push({
                ratio: ratioId,
                sceneIndex: sceneIdx,
                sceneName: scene.name || `Scene ${sceneIdx + 1}`,
                layerId: layer.id,
                layerName: layer.name || 'Text Layer',
                time: t,
                type: 'text_overflow',
                severity: overflowPx > 40 ? 'error' : 'warning',
                message: `Text overflows horizontal canvas edge by ${Math.round(overflowPx)}px at ${t.toFixed(2)}s in ${ratioId}`,
              });
            }

            if (boxTop < 0 || boxBottom > dim.height) {
              const overflowPx = Math.max(0 - boxTop, boxBottom - dim.height);
              issues.push({
                ratio: ratioId,
                sceneIndex: sceneIdx,
                sceneName: scene.name || `Scene ${sceneIdx + 1}`,
                layerId: layer.id,
                layerName: layer.name || 'Text Layer',
                time: t,
                type: 'text_overflow',
                severity: 'error',
                message: `Text overflows vertical canvas edge by ${Math.round(overflowPx)}px at ${t.toFixed(2)}s in ${ratioId}`,
              });
            }

            // Check Safe Area Clearance
            if (ratioId === '9:16') {
              const cfg = SAFE_AREA_CONFIG['9:16'];
              const safeTop = dim.height * cfg.topMarginPercent;
              const safeBottom = dim.height * (1.0 - cfg.bottomMarginPercent);
              const safeRight = dim.width * (1.0 - cfg.rightMarginPercent);

              if (boxTop < safeTop) {
                issues.push({
                  ratio: ratioId,
                  sceneIndex: sceneIdx,
                  sceneName: scene.name || `Scene ${sceneIdx + 1}`,
                  layerId: layer.id,
                  layerName: layer.name,
                  time: t,
                  type: 'safe_area_encroachment',
                  severity: 'warning',
                  message: `Text enters top 9:16 platform navigation area (${Math.round(safeTop - boxTop)}px above clearance) at ${t.toFixed(2)}s`,
                });
              }

              if (boxBottom > safeBottom) {
                issues.push({
                  ratio: ratioId,
                  sceneIndex: sceneIdx,
                  sceneName: scene.name || `Scene ${sceneIdx + 1}`,
                  layerId: layer.id,
                  layerName: layer.name,
                  time: t,
                  type: 'safe_area_encroachment',
                  severity: 'warning',
                  message: `Text enters bottom 9:16 caption/sound zone (${Math.round(boxBottom - safeBottom)}px below clearance) at ${t.toFixed(2)}s`,
                });
              }
            } else {
              // General Title Safe (10% margins)
              const safeMarginX = dim.width * SAFE_AREA_CONFIG.general.titleSafePercent;
              const safeMarginY = dim.height * SAFE_AREA_CONFIG.general.titleSafePercent;

              if (boxLeft < safeMarginX || boxRight > dim.width - safeMarginX || boxTop < safeMarginY || boxBottom > dim.height - safeMarginY) {
                issues.push({
                  ratio: ratioId,
                  sceneIndex: sceneIdx,
                  sceneName: scene.name || `Scene ${sceneIdx + 1}`,
                  layerId: layer.id,
                  layerName: layer.name,
                  time: t,
                  type: 'safe_area_encroachment',
                  severity: 'warning',
                  message: `Text touches Title Safe 80% boundary at ${t.toFixed(2)}s in ${ratioId}`,
                });
              }
            }
          }

          // 2. Off-Canvas Motion Trajectory Check
          const marginOut = 100;
          if (
            cx < -marginOut ||
            cx > dim.width + marginOut ||
            cy < -marginOut ||
            cy > dim.height + marginOut
          ) {
            issues.push({
              ratio: ratioId,
              sceneIndex: sceneIdx,
              sceneName: scene.name || `Scene ${sceneIdx + 1}`,
              layerId: layer.id,
              layerName: layer.name,
              time: t,
              type: 'off_canvas_motion',
              severity: 'warning',
              message: `Layer animated position travels off-canvas (x: ${Math.round(cx)}, y: ${Math.round(cy)}) at ${t.toFixed(2)}s in ${ratioId}`,
            });
          }
        }
      });
    });

    // Deduplicate overlapping issues for the same layer/ratio
    const uniqueIssues = [];
    const seen = new Set();
    for (const item of issues) {
      const key = `${item.ratio}_${item.layerId}_${item.type}_${Math.floor(item.time)}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueIssues.push(item);
      }
    }

    const hasErrors = uniqueIssues.some((i) => i.severity === 'error');
    const hasWarnings = uniqueIssues.some((i) => i.severity === 'warning');

    resultsPerRatio[ratioId] = {
      ratio: ratioId,
      width: dim.width,
      height: dim.height,
      name: dim.name,
      status: hasErrors ? 'error' : hasWarnings ? 'warning' : 'pass',
      issuesCount: uniqueIssues.length,
      issues: uniqueIssues,
    };

    totalIssuesCount += uniqueIssues.length;
  }

  return {
    totalIssuesCount,
    resultsPerRatio,
    summary:
      totalIssuesCount === 0
        ? 'All 6 format variants pass duration preflight without overflow or safe-area violations.'
        : `Found ${totalIssuesCount} layout advisory item(s) across duration in 6 format variants.`,
  };
}
