/**
 * @file timebase.js
 * @description Canonical Rational & Integer Timebase Subsystem (ADR 004)
 * Losslessly reconciles FilmCraft integer ticks (254,016,000,000 ticks/sec),
 * audio sample rates (48 kHz, 44.1 kHz, 96 kHz), and SoundCraft musical ticks (PPQ = 960).
 * 
 * Invariants:
 * 1. 254_016_000_000 / 48_000 = 5_292_000 (Exact, 0 remainder)
 * 2. 254_016_000_000 / 44_100 = 5_760_000 (Exact, 0 remainder)
 * 3. 254_016_000_000 / 96_000 = 2_646_000 (Exact, 0 remainder)
 * 4. Film frame rates (24, 25, 30, 60, 23.976, 29.97, 59.94) divide with zero sub-frame drift.
 */

export const TICKS_PER_SECOND = 254_016_000_000n;
export const AUDIO_48K_FACTOR = 5_292_000n;
export const AUDIO_44K1_FACTOR = 5_760_000n;
export const AUDIO_96K_FACTOR = 2_646_000n;
export const MUSICAL_PPQ = 960n;

/**
 * Converts fractional floating-point seconds into canonical BigInt ticks.
 * @param {number} seconds
 * @returns {bigint}
 */
export function secondsToTicks(seconds) {
  if (typeof seconds !== 'number' || isNaN(seconds) || seconds <= 0) return 0n;
  // Use integer arithmetic with microsecond base to prevent float precision truncation
  const micros = BigInt(Math.round(seconds * 1_000_000));
  return (micros * TICKS_PER_SECOND) / 1_000_000n;
}

/**
 * Converts BigInt ticks back into fractional seconds for render timing.
 * @param {bigint|number|string} ticks
 * @returns {number}
 */
export function ticksToSeconds(ticks) {
  const bTicks = typeof ticks === 'bigint' ? ticks : BigInt(ticks || 0);
  if (bTicks <= 0n) return 0;
  const micros = (bTicks * 1_000_000n) / TICKS_PER_SECOND;
  return Number(micros) / 1_000_000;
}

/**
 * Losslessly converts audio sample count at a given sample rate into canonical ticks.
 * @param {number|bigint} samples
 * @param {number} sampleRate - Standard audio sample rate (48000, 44100, 96000)
 * @returns {bigint}
 */
export function audioSamplesToTicks(samples, sampleRate = 48000) {
  const s = typeof samples === 'bigint' ? samples : BigInt(Math.max(0, Math.round(Number(samples) || 0)));
  if (sampleRate === 48000) return s * AUDIO_48K_FACTOR;
  if (sampleRate === 44100) return s * AUDIO_44K1_FACTOR;
  if (sampleRate === 96000) return s * AUDIO_96K_FACTOR;
  const sr = BigInt(Math.max(1, Math.round(sampleRate)));
  return (s * TICKS_PER_SECOND) / sr;
}

/**
 * Converts canonical ticks into exact discrete audio samples.
 * @param {bigint|number|string} ticks
 * @param {number} sampleRate
 * @returns {number}
 */
export function ticksToAudioSamples(ticks, sampleRate = 48000) {
  const bTicks = typeof ticks === 'bigint' ? ticks : BigInt(ticks || 0);
  if (sampleRate === 48000) return Number(bTicks / AUDIO_48K_FACTOR);
  if (sampleRate === 44100) return Number(bTicks / AUDIO_44K1_FACTOR);
  if (sampleRate === 96000) return Number(bTicks / AUDIO_96K_FACTOR);
  const sr = BigInt(Math.max(1, Math.round(sampleRate)));
  return Number((bTicks * sr) / TICKS_PER_SECOND);
}

/**
 * Losslessly converts musical ticks (SoundCraft PPQ = 960) to canonical ticks for a given BPM.
 * Formula: ticks_per_musical_tick = (TICKS_PER_SECOND * 60) / (BPM * PPQ)
 * For 120 BPM: (254_016_000_000 * 60) / (120 * 960) = 132_300_000 ticks exactly!
 * @param {number|bigint} musicalTick
 * @param {number} bpm
 * @returns {bigint}
 */
export function musicalTicksToTimebase(musicalTick, bpm = 120) {
  const m = typeof musicalTick === 'bigint' ? musicalTick : BigInt(Math.max(0, Math.round(Number(musicalTick) || 0)));
  const b = BigInt(Math.max(1, Math.round(bpm)));
  const numerator = TICKS_PER_SECOND * 60n * m;
  const denominator = b * MUSICAL_PPQ;
  return numerator / denominator;
}

/**
 * Losslessly converts canonical media ticks to SoundCraft musical ticks (PPQ = 960) for a given BPM.
 * Formula: musical_ticks = (ticks * BPM * PPQ) / (TICKS_PER_SECOND * 60)
 * Note: Musical ticks are strictly NOT media ticks and must never be cast directly!
 * 
 * @param {bigint|number|string} ticks
 * @param {number} bpm
 * @returns {bigint}
 */
export function timebaseToMusicalTicks(ticks, bpm = 120) {
  const bTicks = typeof ticks === 'bigint' ? ticks : BigInt(ticks || 0);
  if (bTicks <= 0n) return 0n;
  const b = BigInt(Math.max(1, Math.round(bpm)));
  const numerator = bTicks * b * MUSICAL_PPQ;
  const denominator = TICKS_PER_SECOND * 60n;
  return numerator / denominator;
}


/**
 * Rational frame rate calculator (e.g. 29.97 = 30000 / 1001).
 * @param {number} fps
 * @returns {{ num: bigint, den: bigint, ticksPerFrame: bigint }}
 */
export function getRationalFps(fps = 30) {
  if (Math.abs(fps - 29.97) < 0.01) {
    const num = 30000n;
    const den = 1001n;
    const ticksPerFrame = (TICKS_PER_SECOND * den) / num;
    return { num, den, ticksPerFrame };
  }
  if (Math.abs(fps - 23.976) < 0.01) {
    const num = 24000n;
    const den = 1001n;
    const ticksPerFrame = (TICKS_PER_SECOND * den) / num;
    return { num, den, ticksPerFrame };
  }
  if (Math.abs(fps - 59.94) < 0.01) {
    const num = 60000n;
    const den = 1001n;
    const ticksPerFrame = (TICKS_PER_SECOND * den) / num;
    return { num, den, ticksPerFrame };
  }
  const intFps = BigInt(Math.max(1, Math.round(fps)));
  return {
    num: intFps,
    den: 1n,
    ticksPerFrame: TICKS_PER_SECOND / intFps,
  };
}

/**
 * Calculates SMPTE timecode (HH:MM:SS:FF) strictly using the canonical rational clock.
 * Guarantees zero sub-frame drift across hours of playback or after project reload.
 * 
 * @param {number|bigint} timeInSecondsOrTicks
 * @param {number} fps - Project frame rate (default 30)
 * @returns {string} Formatted SMPTE string "00:00:00:00"
 */
export function timebaseToTimecode(timeInSecondsOrTicks, fps = 30) {
  const { ticksPerFrame } = getRationalFps(fps);
  const currentTicks = typeof timeInSecondsOrTicks === 'bigint'
    ? timeInSecondsOrTicks
    : secondsToTicks(Number(timeInSecondsOrTicks) || 0);

  if (currentTicks <= 0n) {
    return '00:00:00:00';
  }

  const totalFrames = currentTicks / ticksPerFrame;
  const intFps = BigInt(Math.max(1, Math.round(fps)));

  const ff = Number(totalFrames % intFps);
  const totalSeconds = totalFrames / intFps;
  const ss = Number(totalSeconds % 60n);
  const totalMinutes = totalSeconds / 60n;
  const mm = Number(totalMinutes % 60n);
  const hh = Number(totalMinutes / 60n);

  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(hh)}:${pad(mm)}:${pad(ss)}:${pad(ff)}`;
}

/**
 * Deterministically steps the project clock forward or backward by exact frame ticks.
 * Prevents floating-point accumulation drift during scrub or frame-stepping.
 * 
 * @param {number} currentSec
 * @param {number} direction - +1 for forward, -1 for backward
 * @param {number} fps - Frame rate
 * @param {number} maxDuration - Max sequence/scene duration
 * @returns {number} New time in seconds
 */
export function frameStepTime(currentSec, direction = 1, fps = 30, maxDuration = 60) {
  const { ticksPerFrame } = getRationalFps(fps);
  const currentTicks = secondsToTicks(Math.max(0, currentSec));
  const stepTicks = BigInt(direction) * ticksPerFrame;
  let targetTicks = currentTicks + stepTicks;
  if (targetTicks < 0n) targetTicks = 0n;

  const maxTicks = secondsToTicks(maxDuration);
  if (targetTicks > maxTicks) targetTicks = maxTicks;

  return ticksToSeconds(targetTicks);
}

/**
 * Snaps any floating-point second value to the exact nearest frame boundary.
 * 
 * @param {number} timeSec
 * @param {number} fps
 * @returns {number} Snapped time in seconds
 */
export function snapTimeToFrame(timeSec, fps = 30) {
  const { ticksPerFrame } = getRationalFps(fps);
  const currentTicks = secondsToTicks(Math.max(0, timeSec));
  const halfFrame = ticksPerFrame / 2n;
  const frameIndex = (currentTicks + halfFrame) / ticksPerFrame;
  return ticksToSeconds(frameIndex * ticksPerFrame);
}
