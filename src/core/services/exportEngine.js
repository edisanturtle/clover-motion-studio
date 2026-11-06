/**
 * @file exportEngine.js
 * @description Core Export Engine for Still PNG, Sequences, Audio WAV & Project Bundles (Fase 10)
 * Evaluates frames using the exact same pure renderSceneToCanvas pipeline as the live preview,
 * guaranteeing 100% visual fidelity, deterministic timing, and transparent/color preservation.
 */

import { ASPECT_RATIOS } from '../../constants/fonts.js';
import { renderSceneToCanvas } from '../../engine/canvasRenderer.js';
import { serializeProject, CURRENT_SCHEMA_VERSION } from '../domain/projectSchema.js';

/**
 * Renders a single frame to a canvas or dataURL at specified time, resolution and transparency.
 *
 * @param {object} params
 * @param {object} params.project
 * @param {number} [params.sceneIndex=0]
 * @param {number} [params.localTime=0]
 * @param {string} [params.ratio='4:5']
 * @param {number} [params.scaleFactor=1]
 * @param {boolean} [params.transparentBg=false]
 * @param {HTMLCanvasElement} [params.customCanvas=null]
 * @param {object} [params.audioSignals={ bass: 0, mid: 0, treble: 0, rms: 0 }]
 * @returns {{ width: number, height: number, canvas: HTMLCanvasElement, toDataUrl: Function }}
 */
export function renderStillFrame({
  project,
  sceneIndex = 0,
  localTime = 0,
  ratio = '4:5',
  scaleFactor = 1,
  transparentBg = false,
  customCanvas = null,
  audioSignals = { bass: 0, mid: 0, treble: 0, rms: 0 },
}) {
  if (!project || !project.scenes || project.scenes.length === 0) {
    throw new Error('Cannot render still frame: project contains no scenes.');
  }

  const scene = project.scenes[sceneIndex] || project.scenes[0];
  const targetDim = ASPECT_RATIOS[ratio] || ASPECT_RATIOS[project.ratio] || ASPECT_RATIOS['4:5'];
  const baseW = targetDim.width;
  const baseH = targetDim.height;
  const outW = Math.round(baseW * scaleFactor);
  const outH = Math.round(baseH * scaleFactor);

  let canvas = customCanvas;
  if (!canvas && typeof document !== 'undefined') {
    canvas = document.createElement('canvas');
  }

  if (canvas) {
    canvas.width = outW;
    canvas.height = outH;
  }

  const ctx = canvas?.getContext ? canvas.getContext('2d') : null;

  if (ctx) {
    ctx.save();
    if (scaleFactor !== 1) {
      ctx.scale(scaleFactor, scaleFactor);
    }

    if (transparentBg) {
      // Clear to full transparency
      ctx.clearRect(0, 0, baseW, baseH);
    }

    // Call the exact same project render evaluator as the live canvas viewport!
    renderSceneToCanvas({
      ctx,
      width: baseW,
      height: baseH,
      scene,
      localTime,
      audioSignals,
      selectedLayerId: null,
      showGrid: false,
      showSafeGuides: false,
      showCenterCrosshair: false,
      project,
    });

    ctx.restore();
  }

  return {
    width: outW,
    height: outH,
    canvas,
    toDataUrl: (type = 'image/png', quality = 1.0) => {
      if (canvas && typeof canvas.toDataURL === 'function') {
        return canvas.toDataURL(type, quality);
      }
      return null;
    },
  };
}

/**
 * Generates a deterministic sequence of PNG frames across an in/out range.
 *
 * @param {object} params
 * @param {object} params.project
 * @param {number} [params.sceneIndex=0]
 * @param {number} [params.rangeIn=0]
 * @param {number} [params.rangeOut=null]
 * @param {number} [params.fps=30]
 * @param {string} [params.ratio='4:5']
 * @param {number} [params.scaleFactor=1]
 * @param {boolean} [params.transparentBg=false]
 * @param {Function} [params.onProgress=null]
 * @param {Function} [params.isCancelled=null]
 * @returns {Promise<{ frames: Array<{ index: number, time: number, filename: string, dataUrl: string }>, totalFrames: number, duration: number, fps: number }>}
 */
export async function renderPngSequence({
  project,
  sceneIndex = 0,
  rangeIn = 0,
  rangeOut = null,
  fps = 30,
  ratio = '4:5',
  scaleFactor = 1,
  transparentBg = false,
  onProgress = null,
  isCancelled = null,
}) {
  const scene = project?.scenes?.[sceneIndex] || project?.scenes?.[0];
  const sceneDuration = Number(scene?.duration) || 4;
  const start = Math.max(0, Number(rangeIn) || 0);
  const end = rangeOut !== null && rangeOut !== undefined ? Number(rangeOut) : sceneDuration;
  const duration = Math.max(0, end - start);
  const totalFrames = Math.max(1, Math.floor(duration * fps));

  const frames = [];

  for (let i = 0; i < totalFrames; i++) {
    if (isCancelled && isCancelled()) {
      break;
    }

    const t = start + i / fps;
    const rendered = renderStillFrame({
      project,
      sceneIndex,
      localTime: t,
      ratio,
      scaleFactor,
      transparentBg,
    });

    const filename = `frame_${String(i + 1).padStart(5, '0')}.png`;
    const dataUrl = rendered.toDataUrl();

    frames.push({
      index: i + 1,
      time: Number(t.toFixed(4)),
      filename,
      dataUrl,
    });

    if (onProgress) {
      onProgress({
        currentFrame: i + 1,
        totalFrames,
        progress: (i + 1) / totalFrames,
        time: t,
      });
    }

    // Yield to browser event loop every 10 frames to avoid freezing UI
    if (i % 10 === 0 && typeof Promise !== 'undefined') {
      await new Promise((r) => setTimeout(r, 0));
    }
  }

  return {
    frames,
    totalFrames: frames.length,
    duration,
    fps,
  };
}

/**
 * Encodes raw audio sample buffers (Float32Array) into a standard 16-bit PCM RIFF/WAV Blob.
 * Also computes true peak amplitude and peak dB.
 *
 * @param {object} params
 * @param {Float32Array[]} params.channelData - Array of Float32Array per channel (e.g. [left, right])
 * @param {number} [params.sampleRate=44100]
 * @returns {{ buffer: ArrayBuffer, blob: Blob | null, peakAmplitude: number, peakDb: number, duration: number }}
 */
export function encodeWavPcm({ channelData = [], sampleRate = 44100 }) {
  const numChannels = Math.max(1, channelData.length);
  const numSamples = channelData[0]?.length || 0;
  const bytesPerSample = 2; // 16-bit PCM
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = numSamples * blockAlign;
  const bufferSize = 44 + dataSize;

  const arrayBuffer = new ArrayBuffer(bufferSize);
  const view = new DataView(arrayBuffer);

  // Helper to write ASCII strings
  const writeString = (offset, string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  // 1. RIFF Header
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');

  // 2. fmt Sub-chunk
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // SubChunk1Size (16 for PCM)
  view.setUint16(20, 1, true); // AudioFormat (1 = PCM)
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true); // BitsPerSample (16)

  // 3. data Sub-chunk
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  // Write Interleaved 16-bit PCM audio samples & compute peak
  let offset = 44;
  let maxAbsSample = 0;

  for (let i = 0; i < numSamples; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const sample = channelData[ch] ? channelData[ch][i] : 0;
      const absSample = Math.abs(sample);
      if (absSample > maxAbsSample) maxAbsSample = absSample;

      // Clamp to [-1, 1] then scale to 16-bit signed integer [-32768, 32767]
      const clamped = Math.max(-1, Math.min(1, sample));
      const int16 = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
      view.setInt16(offset, int16, true);
      offset += 2;
    }
  }

  const peakDb = maxAbsSample > 0 ? 20 * Math.log10(maxAbsSample) : -Infinity;
  const duration = numSamples / sampleRate;

  let blob = null;
  if (typeof Blob !== 'undefined') {
    blob = new Blob([arrayBuffer], { type: 'audio/wav' });
  }

  return {
    buffer: arrayBuffer,
    blob,
    peakAmplitude: Number(maxAbsSample.toFixed(4)),
    peakDb: Number(peakDb.toFixed(2)),
    duration: Number(duration.toFixed(3)),
  };
}

/**
 * Packages a native project bundle (.clovermotion.json) with schema validation metadata.
 *
 * @param {object} project
 * @param {boolean} [includeAssets=true]
 * @returns {{ jsonString: string, blob: Blob | null, filename: string }}
 */
export function exportNativeProjectBundle(project, includeAssets = true) {
  if (!project) throw new Error('Cannot export null project bundle.');

  const serialized = serializeProject(project);
  const safeName = (project.name || 'project').toLowerCase().replace(/\s+/g, '-');
  const filename = `${safeName}_v${CURRENT_SCHEMA_VERSION}.clovermotion.json`;

  let blob = null;
  if (typeof Blob !== 'undefined') {
    blob = new Blob([serialized], { type: 'application/json' });
  }

  return {
    jsonString: serialized,
    blob,
    filename,
  };
}
