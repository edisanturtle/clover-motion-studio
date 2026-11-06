/**
 * @file audioAnalysisService.js
 * @description Audio Analysis, Feature Caching & Audio-to-Visual Property Mapping (Fase 6)
 * Computes deterministic amplitude, bass, mids, treble, and transient/beat energy signals.
 * Maps audio signals to visual properties (scale, posX, posY, rotation, opacity, stroke, color)
 * with configurable sensitivity, min/max ranges, smoothing envelopes, and response curves.
 */

/**
 * Analyzes raw Float32Array channel audio data and generates a downsampled,
 * time-indexed feature frame cache for 100% deterministic, zero-lag visual binding.
 *
 * @param {Float32Array|number[]} channelData
 * @param {number} sampleRate - e.g. 44100 or 48000
 * @param {number} fps - target frame rate (default 30 fps)
 * @returns {{ frames: Array<{ time: number, amplitude: number, bass: number, mid: number, treble: number, transient: number, beat: number }>, duration: number }}
 */
export function analyzeAudioChannelData(channelData, sampleRate = 48000, fps = 30) {
  if (!channelData || channelData.length === 0) {
    return { frames: [], duration: 0 };
  }

  const length = channelData.length;
  const duration = length / sampleRate;
  const totalFrames = Math.max(1, Math.ceil(duration * fps));
  const samplesPerFrame = Math.max(1, Math.floor(sampleRate / fps));

  const frames = [];
  let prevEnergy = 0;
  let transientEnvelope = 0;

  for (let f = 0; f < totalFrames; f++) {
    const startSample = f * samplesPerFrame;
    const endSample = Math.min(length, startSample + samplesPerFrame);
    const windowLength = Math.max(1, endSample - startSample);

    let sumSquares = 0;
    let lowEnergy = 0;
    let midEnergy = 0;
    let highEnergy = 0;

    // Sub-sample window with step = 2 for high performance
    for (let i = startSample; i < endSample; i += 2) {
      const s = channelData[i] || 0;
      const absS = Math.abs(s);
      sumSquares += s * s;

      // Frequency estimation via sample differences (derivative filters)
      const prevS = i > 0 ? channelData[i - 1] : 0;
      const diff = Math.abs(s - prevS);

      if (diff < 0.08) {
        lowEnergy += absS; // Low frequency (smooth changes)
      } else if (diff < 0.35) {
        midEnergy += absS; // Mid frequency
      } else {
        highEnergy += absS; // High frequency (rapid transients)
      }
    }

    const subSampleCount = Math.max(1, windowLength / 2);
    const rms = Math.sqrt(sumSquares / subSampleCount);
    const bass = Math.min(1.0, (lowEnergy / subSampleCount) * 2.8);
    const mid = Math.min(1.0, (midEnergy / subSampleCount) * 3.2);
    const treble = Math.min(1.0, (highEnergy / subSampleCount) * 4.0);
    const amplitude = Math.min(1.0, rms * 2.5);

    // Transient Onset Detection (energy acceleration)
    const currentEnergy = bass * 0.6 + amplitude * 0.4;
    const energyDelta = Math.max(0, currentEnergy - prevEnergy);
    prevEnergy = currentEnergy;

    if (energyDelta > 0.18) {
      transientEnvelope = 1.0; // Trigger burst
    } else {
      transientEnvelope = Math.max(0, transientEnvelope * 0.72); // Exponential decay
    }

    const beat = transientEnvelope > 0.4 ? 1.0 : 0.0;
    const frameTime = Number((f / fps).toFixed(3));

    frames.push({
      time: frameTime,
      amplitude: Number(amplitude.toFixed(3)),
      bass: Number(bass.toFixed(3)),
      mid: Number(mid.toFixed(3)),
      treble: Number(treble.toFixed(3)),
      transient: Number(transientEnvelope.toFixed(3)),
      beat,
    });
  }

  return {
    frames,
    duration: Number(duration.toFixed(3)),
  };
}

/**
 * Retrieves deterministic audio signal values from an analysis cache at a specific time.
 * Interpolates smoothly between frames to avoid stepped visual artifacts.
 *
 * @param {Array<object>} frames - Array of analysis frames
 * @param {number} time - Current timeline playhead in seconds
 * @returns {{ amplitude: number, bass: number, mid: number, treble: number, transient: number, beat: number, rms: number }}
 */
export function getInterpolatedAudioSignals(frames, time = 0) {
  if (!frames || frames.length === 0) {
    return { amplitude: 0.1, bass: 0.12, mid: 0.1, treble: 0.08, transient: 0, beat: 0, rms: 0.1 };
  }

  const safeTime = Math.max(0, time);
  if (safeTime <= frames[0].time) {
    return { ...frames[0], rms: frames[0].amplitude };
  }
  if (safeTime >= frames[frames.length - 1].time) {
    const last = frames[frames.length - 1];
    return { ...last, rms: last.amplitude };
  }

  // Binary search for surrounding frame indices
  let low = 0;
  let high = frames.length - 1;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if (frames[mid].time < safeTime) {
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  const idx0 = Math.max(0, low - 1);
  const idx1 = Math.min(frames.length - 1, low);
  const f0 = frames[idx0];
  const f1 = frames[idx1];

  const span = f1.time - f0.time;
  const ratio = span > 0.0001 ? Math.max(0, Math.min(1, (safeTime - f0.time) / span)) : 0;

  const lerp = (a, b) => Number((a + (b - a) * ratio).toFixed(3));

  const amplitude = lerp(f0.amplitude, f1.amplitude);
  return {
    amplitude,
    bass: lerp(f0.bass, f1.bass),
    mid: lerp(f0.mid, f1.mid),
    treble: lerp(f0.treble, f1.treble),
    transient: lerp(f0.transient, f1.transient),
    beat: f0.beat || f1.beat ? 1 : 0,
    rms: amplitude,
  };
}

/**
 * Evaluates the audio-reactive visual property modulation for a given layer.
 * Applies sensitivity, min/max ranges, smoothing/attack-release, and response curve.
 *
 * @param {object} layer - Layer entity with audioReactive properties
 * @param {object} signals - Object containing { bass, mid, treble, amplitude, transient, beat, rms }
 * @returns {{ dx: number, dy: number, dScale: number, dRot: number, dAlpha: number, dStroke: number, dColorRatio: number }}
 */
export function evaluateAudioReactiveMapping(layer, signals = {}) {
  if (!layer || !layer.audioReactive) {
    return { dx: 0, dy: 0, dScale: 0, dRot: 0, dAlpha: 0, dStroke: 0, dColorRatio: 0 };
  }

  const signalKey = layer.audioSignal || 'bass';
  let rawSignal = 0;

  if (signalKey === 'bass') rawSignal = signals.bass ?? 0;
  else if (signalKey === 'mid' || signalKey === 'mids') rawSignal = signals.mid ?? 0;
  else if (signalKey === 'treble') rawSignal = signals.treble ?? 0;
  else if (signalKey === 'transient' || signalKey === 'transients') rawSignal = signals.transient ?? 0;
  else if (signalKey === 'beat') rawSignal = signals.beat ?? 0;
  else if (signalKey === 'amplitude' || signalKey === 'rms') rawSignal = signals.amplitude ?? signals.rms ?? 0;
  else rawSignal = signals[signalKey] ?? 0;

  const clampedSignal = Math.max(0, Math.min(1.0, rawSignal));

  // Response curve shaping
  const curve = layer.audioCurve || 'linear';
  let curvedSignal = clampedSignal;
  if (curve === 'easeOut') {
    curvedSignal = Math.sqrt(clampedSignal);
  } else if (curve === 'exponential') {
    curvedSignal = Math.pow(clampedSignal, 2);
  } else if (curve === 'stepped') {
    curvedSignal = clampedSignal >= 0.4 ? 1.0 : 0.0;
  }

  // Sensitivity multiplier (default 50 = 1.0x factor; 100 = 2.0x factor)
  const sensitivity = Math.max(0, (layer.audioSensitivity ?? layer.audioIntensity ?? 40)) / 50;

  const target = layer.audioTarget || 'scale';
  const hasMinRange = typeof layer.audioMinRange === 'number';
  const hasMaxRange = typeof layer.audioMaxRange === 'number';

  const result = { dx: 0, dy: 0, dScale: 0, dRot: 0, dAlpha: 0, dStroke: 0, dColorRatio: 0 };

  if (target === 'scale') {
    if (hasMinRange && hasMaxRange) {
      // Maps to explicit target scale range [min, max]
      const targetScale = layer.audioMinRange + (layer.audioMaxRange - layer.audioMinRange) * curvedSignal * sensitivity;
      result.dScale = targetScale - (layer.scale || 1.0);
    } else {
      result.dScale = curvedSignal * sensitivity * 0.45;
    }
  } else if (target === 'posY') {
    if (hasMinRange && hasMaxRange) {
      result.dy = layer.audioMinRange + (layer.audioMaxRange - layer.audioMinRange) * curvedSignal * sensitivity;
    } else {
      result.dy = -curvedSignal * sensitivity * 65;
    }
  } else if (target === 'posX') {
    if (hasMinRange && hasMaxRange) {
      result.dx = layer.audioMinRange + (layer.audioMaxRange - layer.audioMinRange) * curvedSignal * sensitivity;
    } else {
      result.dx = curvedSignal * sensitivity * 55;
    }
  } else if (target === 'rotation') {
    if (hasMinRange && hasMaxRange) {
      result.dRot = layer.audioMinRange + (layer.audioMaxRange - layer.audioMinRange) * curvedSignal * sensitivity;
    } else {
      result.dRot = curvedSignal * sensitivity * 35;
    }
  } else if (target === 'opacity') {
    if (hasMinRange && hasMaxRange) {
      const targetOpacity = layer.audioMinRange + (layer.audioMaxRange - layer.audioMinRange) * curvedSignal * sensitivity;
      result.dAlpha = targetOpacity - (layer.opacity ?? 1.0);
    } else {
      result.dAlpha = -curvedSignal * sensitivity * 0.4;
    }
  } else if (target === 'strokeWidth') {
    result.dStroke = curvedSignal * sensitivity * 8;
  } else if (target === 'color') {
    result.dColorRatio = curvedSignal * sensitivity;
  }

  result.dx = Number(result.dx.toFixed(4));
  result.dy = Number(result.dy.toFixed(4));
  result.dScale = Number(result.dScale.toFixed(4));
  result.dRot = Number(result.dRot.toFixed(4));
  result.dAlpha = Number(result.dAlpha.toFixed(4));
  result.dStroke = Number(result.dStroke.toFixed(4));
  result.dColorRatio = Number(result.dColorRatio.toFixed(4));

  return result;
}

/**
 * Generates deterministic synthetic analysis frames based on BPM and musical timing.
 * Enables 100% reproducible test verification and offline rendering without Web Audio hardware.
 *
 * @param {number} duration - Sequence duration in seconds
 * @param {number} bpm - Tempo in BPM (e.g. 120)
 * @param {number} fps - Frame rate (default 30)
 * @returns {Array<object>} Analysis frames
 */
export function generateDeterministicAnalysisFrames(duration = 4.0, bpm = 120, fps = 30) {
  const totalFrames = Math.max(1, Math.ceil(duration * fps));
  const beatSec = 60 / bpm;
  const frames = [];

  for (let i = 0; i < totalFrames; i++) {
    const t = i / fps;
    const timeInBeat = t % beatSec;
    const beatFraction = timeInBeat / beatSec;

    // Bass & Transient hit hard at the beginning of each beat and decay
    const bass = Number((Math.max(0.08, Math.exp(-beatFraction * 5.0) * 0.95)).toFixed(3));
    const transient = Number((beatFraction < 0.15 ? 1.0 - beatFraction / 0.15 : 0.0).toFixed(3));
    const beat = beatFraction < 0.1 ? 1 : 0;

    // Mid peaks on snare (beats 2 and 4 in 4/4)
    const currentBeatNum = Math.floor(t / beatSec) % 4;
    const isSnareBeat = currentBeatNum === 1 || currentBeatNum === 3;
    const mid = Number((isSnareBeat ? Math.max(0.1, Math.exp(-beatFraction * 4.0) * 0.85) : 0.15).toFixed(3));

    // Treble hi-hat hits on eighth notes
    const eighthFraction = (t % (beatSec / 2)) / (beatSec / 2);
    const treble = Number((Math.max(0.05, Math.exp(-eighthFraction * 6.0) * 0.7)).toFixed(3));
    const amplitude = Number((bass * 0.5 + mid * 0.35 + treble * 0.15).toFixed(3));

    frames.push({
      time: Number(t.toFixed(3)),
      amplitude,
      bass,
      mid,
      treble,
      transient,
      beat,
    });
  }

  return frames;
}
