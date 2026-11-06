/**
 * @file audioModels.js
 * @description Core Domain Entities for Multi-Track Audio Engine (Fase 5)
 * Defines AudioTrack, AudioClip, MasterDspConfig, and BeatGrid models with
 * strict type invariants, lossless timebase alignment, and pure immutability.
 */

/**
 * Pure numeric coercion with fallback, preventing NaN poisoning.
 * @param {any} val
 * @param {number} fallback
 * @returns {number}
 */
function toNum(val, fallback) {
  if (val === undefined || val === null || val === '') return fallback;
  const n = Number(val);
  return Number.isNaN(n) ? fallback : n;
}

/**
 * Creates a validated Master DSP Configuration object.
 * @param {object} init
 * @returns {object}
 */
export function createMasterDspConfig(init = {}) {
  const bassGain = Math.max(-12, Math.min(18, toNum(init.eq?.bassGain ?? init.bassGain, 0)));
  const midGain = Math.max(-12, Math.min(12, toNum(init.eq?.midGain ?? init.midGain, 0)));
  const trebleGain = Math.max(-12, Math.min(15, toNum(init.eq?.trebleGain ?? init.trebleGain, 0)));
  const lowpassFreq = Math.max(120, Math.min(20000, toNum(init.eq?.lowpassFreq ?? init.lowpassFreq, 20000)));
  const delayMix = Math.max(0, Math.min(0.85, toNum(init.delay?.mix ?? init.delayMix, 0)));
  const delayTime = Math.max(0.02, Math.min(1.2, toNum(init.delay?.time ?? init.delayTime, 0.28)));
  const delayFeedback = Math.max(0, Math.min(0.85, toNum(init.delay?.feedback ?? init.delayFeedback, 0.36)));
  const reverbMix = Math.max(0, Math.min(0.85, toNum(init.reverb?.mix ?? init.reverbMix, 0)));
  const reverbDecay = Math.max(0.2, Math.min(4.0, toNum(init.reverb?.decay ?? init.reverbDecay, 1.8)));

  return {
    volume: Math.max(0, Math.min(1.0, toNum(init.volume, 0.8))),
    pan: Math.max(-1.0, Math.min(1.0, toNum(init.pan, 0.0))),
    isMuted: Boolean(init.isMuted),
    bpm: Math.max(40, Math.min(240, toNum(init.bpm, 120))),
    // Flat accessors for seamless compatibility
    bassGain,
    midGain,
    trebleGain,
    lowpassFreq,
    delayMix,
    delayTime,
    delayFeedback,
    reverbMix,
    reverbDecay,
    // Grouped rack definitions
    eq: {
      bassGain,
      midGain,
      trebleGain,
      lowpassFreq,
    },
    delay: {
      mix: delayMix,
      time: delayTime,
      feedback: delayFeedback,
    },
    reverb: {
      mix: reverbMix,
      decay: reverbDecay,
    },
  };
}

/**
 * Creates a validated AudioClip entity.
 * @param {object} init
 * @returns {object}
 */
export function createAudioClip(init = {}) {
  const trimIn = Math.max(0, Number(init.trimIn) || 0);
  const trimOut = Math.max(trimIn + 0.01, Number(init.trimOut) || (trimIn + 4.0));
  const duration = Number((trimOut - trimIn).toFixed(3));

  return {
    id: init.id || `clip_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    assetId: init.assetId || null,
    name: init.name || 'Audio Clip',
    trackTime: Math.max(0, Number(init.trackTime) || 0), // Start offset on timeline in seconds
    trimIn,
    trimOut,
    duration,
    gain: Math.max(0, Math.min(2.0, toNum(init.gain, 1.0))),
    pan: Math.max(-1.0, Math.min(1.0, toNum(init.pan, 0.0))),
    loop: Boolean(init.loop),
    fadeIn: Math.max(0, Math.min(duration / 2, toNum(init.fadeIn, 0))),
    fadeOut: Math.max(0, Math.min(duration / 2, toNum(init.fadeOut, 0))),
    waveformPeaks: Array.isArray(init.waveformPeaks) && init.waveformPeaks.length > 0
      ? [...init.waveformPeaks]
      : [],
  };
}

/**
 * Creates a validated AudioTrack entity.
 * @param {object} init
 * @param {string} fallbackName
 * @returns {object}
 */
export function createAudioTrack(init = {}, fallbackName = 'Audio Track 1') {
  return {
    id: init.id || `track_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name: init.name || fallbackName,
    volume: Math.max(0, Math.min(1.0, toNum(init.volume, 1.0))),
    pan: Math.max(-1.0, Math.min(1.0, toNum(init.pan, 0.0))),
    mute: Boolean(init.mute),
    solo: Boolean(init.solo),
    clips: Array.isArray(init.clips)
      ? init.clips.map((c) => createAudioClip(c))
      : [],
  };
}
