/**
 * @file audioService.js
 * @description Core Domain Services for Multi-Track Audio Editing (Fase 5)
 * Handles local audio file validation, waveform extraction/caching,
 * clip trimming/splitting/looping/fading, and musical beat grid alignment.
 */

import { createAudioTrack, createAudioClip, createSynthNoteConfig } from '../domain/audioModels.js';

export const SUPPORTED_AUDIO_MIMES = new Set([
  'audio/wav',
  'audio/x-wav',
  'audio/wave',
  'audio/mpeg',
  'audio/mp3',
  'audio/ogg',
  'audio/aac',
  'audio/flac',
  'audio/x-flac',
  'audio/mp4',
  'audio/x-m4a',
]);

export const SUPPORTED_AUDIO_EXTENSIONS = new Set([
  'wav',
  'mp3',
  'ogg',
  'aac',
  'flac',
  'm4a',
]);

/**
 * Validates a local audio File or Blob before decoding.
 * 
 * @param {File|Blob} file
 * @returns {{ valid: boolean, error?: string, format?: string, sizeBytes?: number }}
 */
export function validateAudioFile(file) {
  if (!file) {
    return { valid: false, error: 'No audio file provided' };
  }

  const name = file.name || '';
  const ext = name.split('.').pop()?.toLowerCase() || '';
  const type = (file.type || '').toLowerCase();

  const isExtSupported = SUPPORTED_AUDIO_EXTENSIONS.has(ext);
  const isMimeSupported = SUPPORTED_AUDIO_MIMES.has(type);

  if (!isExtSupported && !isMimeSupported) {
    return {
      valid: false,
      error: `Unsupported audio format "${ext || type}". Supported: WAV, MP3, OGG, AAC, FLAC, M4A.`,
    };
  }

  // Safety ceiling: 150MB per single audio file to preserve memory
  const maxBytes = 150 * 1024 * 1024;
  if (file.size > maxBytes) {
    return {
      valid: false,
      error: `Audio file exceeds maximum allowed size of 150MB (got ${(file.size / (1024 * 1024)).toFixed(1)}MB).`,
    };
  }

  const detectedFormat = ext ? ext.toUpperCase() : type.split('/')[1]?.toUpperCase() || 'AUDIO';
  return {
    valid: true,
    format: detectedFormat,
    sizeBytes: file.size,
  };
}

/**
 * Extracts and normalizes a downsampled waveform peak cache (0..1) from channel data.
 * Enables zero-lag 60fps waveform rendering without needing to touch AudioBuffer at runtime.
 * 
 * @param {Float32Array|number[]|object} channelData - Audio samples or object with getChannelData
 * @param {number} numPeaks - Number of visual peaks to extract (default 120)
 * @returns {number[]} Array of normalized amplitude floats [0.0 .. 1.0]
 */
export function extractWaveformPeaks(channelData, numPeaks = 120) {
  let samples;
  if (channelData && typeof channelData.getChannelData === 'function') {
    samples = channelData.getChannelData(0);
  } else if (channelData instanceof Float32Array || Array.isArray(channelData)) {
    samples = channelData;
  } else {
    return new Array(numPeaks).fill(0.05);
  }

  if (!samples || samples.length === 0) {
    return new Array(numPeaks).fill(0.05);
  }

  const length = samples.length;
  const blockSize = Math.max(1, Math.floor(length / numPeaks));
  const rawPeaks = new Array(numPeaks);
  let maxPeak = 0.0001;

  for (let i = 0; i < numPeaks; i++) {
    const start = i * blockSize;
    const end = Math.min(length, start + blockSize);
    let peak = 0;
    for (let j = start; j < end; j += 4) { // Step by 4 for high-speed scanning
      const absVal = Math.abs(samples[j]);
      if (absVal > peak) peak = absVal;
    }
    rawPeaks[i] = peak;
    if (peak > maxPeak) maxPeak = peak;
  }

  // Normalize all peaks between 0.05 (visible floor) and 1.0
  return rawPeaks.map((p) => Number((Math.max(0.05, p / maxPeak)).toFixed(3)));
}

/**
 * Trims an AudioClip's start (trimIn) and end (trimOut) points.
 * 
 * @param {object} track
 * @param {string} clipId
 * @param {number} newTrimIn
 * @param {number} newTrimOut
 * @returns {object} Updated track
 */
export function trimClipInTrack(track, clipId, newTrimIn, newTrimOut) {
  if (!track || !track.clips) return track;
  const safeIn = Math.max(0, Number(newTrimIn) || 0);
  const safeOut = Math.max(safeIn + 0.05, Number(newTrimOut) || (safeIn + 0.05));
  const duration = Number((safeOut - safeIn).toFixed(3));

  const updatedClips = track.clips.map((clip) => {
    if (clip.id !== clipId) return clip;
    return {
      ...clip,
      trimIn: safeIn,
      trimOut: safeOut,
      duration,
      fadeIn: Math.min(clip.fadeIn, duration / 2),
      fadeOut: Math.min(clip.fadeOut, duration / 2),
    };
  });

  return { ...track, clips: updatedClips };
}

/**
 * Non-destructively splits an AudioClip into two adjacent clips at a given playhead time.
 * 
 * @param {object} track
 * @param {string} clipId
 * @param {number} splitTrackTime - Time in seconds on the track timeline where the split occurs
 * @returns {object} Updated track with the original clip trimmed and a new second clip appended
 */
export function splitClipInTrack(track, clipId, splitTrackTime) {
  if (!track || !track.clips) return track;
  const clip = track.clips.find((c) => c.id === clipId);
  if (!clip) return track;

  // Split point must fall strictly within the active duration of the clip
  const clipStart = clip.trackTime;
  const clipEnd = clip.trackTime + clip.duration;
  if (splitTrackTime <= clipStart + 0.05 || splitTrackTime >= clipEnd - 0.05) {
    return track; // Split point out of range
  }

  const offsetInClip = splitTrackTime - clipStart;
  const newTrimBoundary = Number((clip.trimIn + offsetInClip).toFixed(3));

  // Clip A: Left half
  const clipA = {
    ...clip,
    trimOut: newTrimBoundary,
    duration: Number((newTrimBoundary - clip.trimIn).toFixed(3)),
    fadeOut: Math.min(clip.fadeOut, (newTrimBoundary - clip.trimIn) / 2),
  };

  // Clip B: Right half
  const clipB = createAudioClip({
    assetId: clip.assetId,
    name: `${clip.name} (Part 2)`,
    trackTime: Number(splitTrackTime.toFixed(3)),
    trimIn: newTrimBoundary,
    trimOut: clip.trimOut,
    gain: clip.gain,
    pan: clip.pan,
    loop: clip.loop,
    fadeIn: 0,
    fadeOut: clip.fadeOut,
    waveformPeaks: clip.waveformPeaks,
  });

  const nextClips = [];
  track.clips.forEach((c) => {
    if (c.id === clipId) {
      nextClips.push(clipA, clipB);
    } else {
      nextClips.push(c);
    }
  });

  return { ...track, clips: nextClips };
}

/**
 * Updates gain and stereo pan on a clip.
 */
export function setClipGainPanInTrack(track, clipId, gain, pan) {
  if (!track || !track.clips) return track;
  return {
    ...track,
    clips: track.clips.map((c) =>
      c.id === clipId
        ? {
            ...c,
            gain: Math.max(0, Math.min(2.0, (gain !== undefined && !Number.isNaN(Number(gain))) ? Number(gain) : c.gain)),
            pan: Math.max(-1.0, Math.min(1.0, (pan !== undefined && !Number.isNaN(Number(pan))) ? Number(pan) : c.pan)),
          }
        : c
    ),
  };
}

/**
 * Updates fade-in and fade-out durations on a clip.
 */
export function setClipFadeInTrack(track, clipId, fadeIn, fadeOut) {
  if (!track || !track.clips) return track;
  return {
    ...track,
    clips: track.clips.map((c) => {
      if (c.id !== clipId) return c;
      const maxFade = c.duration / 2;
      return {
        ...c,
        fadeIn: Math.max(0, Math.min(maxFade, Number(fadeIn) || 0)),
        fadeOut: Math.max(0, Math.min(maxFade, Number(fadeOut) || 0)),
      };
    }),
  };
}

/**
 * Toggles loop state on an AudioClip.
 */
export function setClipLoopInTrack(track, clipId, loop) {
  if (!track || !track.clips) return track;
  return {
    ...track,
    clips: track.clips.map((c) => (c.id === clipId ? { ...c, loop: Boolean(loop) } : c)),
  };
}

/**
 * Moves an AudioClip's position on the track timeline.
 */
export function moveClipInTrack(track, clipId, newTrackTime) {
  if (!track || !track.clips) return track;
  return {
    ...track,
    clips: track.clips.map((c) =>
      c.id === clipId ? { ...c, trackTime: Math.max(0, Number(newTrackTime) || 0) } : c
    ),
  };
}

/**
 * Deletes a clip from a track.
 */
export function deleteClipFromTrack(track, clipId) {
  if (!track || !track.clips) return track;
  return {
    ...track,
    clips: track.clips.filter((c) => c.id !== clipId),
  };
}

/**
 * Computes musical beat grid intervals, bar lines, and quarter-note timestamps.
 * 
 * @param {number} bpm - Tempo in Beats Per Minute (e.g. 120)
 * @param {number} totalDuration - Total sequence duration in seconds
 * @returns {{ beatDuration: number, barDuration: number, beats: number[], bars: number[] }}
 */
export function calculateBeatGrid(bpm = 120, totalDuration = 12) {
  const cleanBpm = Math.max(40, Math.min(240, Number(bpm) || 120));
  const beatDuration = 60 / cleanBpm; // Quarter note duration
  const barDuration = beatDuration * 4; // 4/4 time signature

  const beats = [];
  const bars = [];

  let t = 0;
  let count = 0;
  while (t <= totalDuration + 0.001) {
    const fixedT = Number(t.toFixed(3));
    beats.push(fixedT);
    if (count % 4 === 0) {
      bars.push(fixedT);
    }
    t += beatDuration;
    count++;
  }

  return {
    beatDuration: Number(beatDuration.toFixed(4)),
    barDuration: Number(barDuration.toFixed(4)),
    beats,
    bars,
  };
}

/**
 * Snaps a given time in seconds to the nearest musical beat grid subdivision.
 * 
 * @param {number} time
 * @param {number} bpm
 * @param {number} subdivision - 1 for quarter notes, 2 for eighth notes, 4 for sixteenth notes
 * @returns {number}
 */
export function snapTimeToBeat(time, bpm = 120, subdivision = 1) {
  const cleanBpm = Math.max(40, Math.min(240, Number(bpm) || 120));
  const subDuration = 60 / (cleanBpm * Math.max(1, subdivision));
  return Number((Math.round(time / subDuration) * subDuration).toFixed(3));
}

/**
 * Generates an offline synthetic test audio tone (440Hz / 880Hz sine wave) with an uncompressed
 * RIFF WAV ArrayBuffer and waveform peak cache for zero-network testing of sync, seek, and loop.
 * 
 * @param {number} frequency - Sine frequency in Hz (default 440Hz A4)
 * @param {number} duration - Length in seconds (default 3.0s)
 * @param {number} sampleRate - Sample rate (default 48000Hz)
 * @returns {{ buffer: ArrayBuffer, peaks: number[], duration: number, sampleRate: number }}
 */
export function generateSyntheticTestAudio(frequency = 440, duration = 3.0, sampleRate = 48000) {
  const numSamples = Math.round(duration * sampleRate);
  const samples = new Float32Array(numSamples);

  // Generate sine tone with smooth attack and release envelope to prevent click artifacts
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const attack = Math.min(1.0, i / (sampleRate * 0.05));
    const release = Math.min(1.0, (numSamples - i) / (sampleRate * 0.05));
    const envelope = attack * release;
    samples[i] = Math.sin(2 * Math.PI * frequency * t) * 0.8 * envelope;
  }

  // Encode as standard 16-bit PCM Mono RIFF WAV
  const headerLength = 44;
  const dataBytes = numSamples * 2;
  const wavBuffer = new ArrayBuffer(headerLength + dataBytes);
  const view = new DataView(wavBuffer);

  // RIFF Chunk Descriptor
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataBytes, true);
  writeString(view, 8, 'WAVE');

  // fmt Subchunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true);  // AudioFormat (1 for PCM)
  view.setUint16(22, 1, true);  // NumChannels (1 mono)
  view.setUint32(24, sampleRate, true); // SampleRate
  view.setUint32(28, sampleRate * 2, true); // ByteRate (SampleRate * NumChannels * BitsPerSample/8)
  view.setUint16(32, 2, true);  // BlockAlign
  view.setUint16(34, 16, true); // BitsPerSample (16-bit)

  // data Subchunk
  writeString(view, 36, 'data');
  view.setUint32(40, dataBytes, true);

  // Write 16-bit PCM integer samples (-32768 to 32767)
  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    const intSample = s < 0 ? s * 32768 : s * 32767;
    view.setInt16(offset, intSample, true);
    offset += 2;
  }

  const peaks = extractWaveformPeaks(samples, 120);

  return {
    buffer: wavBuffer,
    peaks,
    duration,
    sampleRate,
    channels: 1,
  };
}

/**
 * Synthesizes a discrete synth note with oscillator waveform and ADSR envelope (Fase 8 sound-from-zero slice).
 * Generates an offline Float32Array and RIFF WAV buffer for deterministic verification and audio clip instantiation.
 * 
 * @param {object} config - Configuration compatible with createSynthNoteConfig
 * @param {number} sampleRate - Standard audio sample rate (default 48000Hz)
 * @returns {{ samples: Float32Array, buffer: ArrayBuffer, peaks: number[], duration: number, sampleRate: number }}
 */
export function synthesizeSynthNoteBuffer(config = {}, sampleRate = 48000) {
  const cfg = createSynthNoteConfig(config);
  const totalDuration = cfg.duration + cfg.release;
  const numSamples = Math.max(1, Math.round(totalDuration * sampleRate));
  const samples = new Float32Array(numSamples);

  const attackSamples = Math.max(1, Math.round(cfg.attack * sampleRate));
  const decaySamples = Math.max(1, Math.round(cfg.decay * sampleRate));
  const noteSamples = Math.max(attackSamples + decaySamples, Math.round(cfg.duration * sampleRate));

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    // Waveform evaluation
    let rawWave = 0;
    const phase = (2 * Math.PI * cfg.frequency * t) % (2 * Math.PI);
    if (cfg.waveform === 'sine') {
      rawWave = Math.sin(phase);
    } else if (cfg.waveform === 'triangle') {
      rawWave = (2 / Math.PI) * Math.asin(Math.sin(phase));
    } else if (cfg.waveform === 'sawtooth') {
      rawWave = 2 * (t * cfg.frequency - Math.floor(t * cfg.frequency + 0.5));
    } else if (cfg.waveform === 'square') {
      rawWave = Math.sin(phase) >= 0 ? 1 : -1;
    }

    // ADSR Envelope
    let env = 0;
    if (i < attackSamples) {
      env = (i / attackSamples) * cfg.gain;
    } else if (i < attackSamples + decaySamples) {
      const decayProgress = (i - attackSamples) / decaySamples;
      env = cfg.gain - decayProgress * (cfg.gain - cfg.gain * cfg.sustain);
    } else if (i < noteSamples) {
      env = cfg.gain * cfg.sustain;
    } else {
      const releaseSamples = Math.max(1, numSamples - noteSamples);
      const releaseProgress = (i - noteSamples) / releaseSamples;
      env = (cfg.gain * cfg.sustain) * Math.max(0, 1 - releaseProgress);
    }

    samples[i] = rawWave * env;
  }

  // Encode as standard 16-bit PCM Mono RIFF WAV
  const headerLength = 44;
  const dataBytes = numSamples * 2;
  const wavBuffer = new ArrayBuffer(headerLength + dataBytes);
  const view = new DataView(wavBuffer);

  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataBytes, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // Mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, 'data');
  view.setUint32(40, dataBytes, true);

  for (let i = 0; i < numSamples; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    const intVal = s < 0 ? s * 0x8000 : s * 0x7fff;
    view.setInt16(headerLength + i * 2, intVal, true);
  }

  return {
    samples,
    buffer: wavBuffer,
    peaks: extractWaveformPeaks(samples, 60),
    duration: Number(totalDuration.toFixed(3)),
    sampleRate,
    channels: 1,
    frequency: cfg.frequency,
    note: cfg.note,
    waveform: cfg.waveform,
  };
}


/**
 * Mixes down all project audio tracks and procedural synthesizer sounds into a
 * clean, uncompressed 16-bit Stereo PCM RIFF WAV ArrayBuffer (Fase 6).
 *
 * @param {object} project
 * @param {object} audioEngine - ProceduralAudioEngine instance
 * @param {number} totalDuration - Total length in seconds
 * @returns {{ buffer: ArrayBuffer, duration: number, sampleRate: number, channels: number }}
 */
export function renderAudioMixdownWav(project, audioEngine = null, totalDuration = 12) {
  const sampleRate = 48000;
  const duration = Math.max(1, totalDuration || 12);
  const numSamples = Math.round(duration * sampleRate);

  const leftChannel = new Float32Array(numSamples);
  const rightChannel = new Float32Array(numSamples);

  const tracks = project.audioTracks || [];
  const hasSolo = tracks.some((t) => t.solo);
  const audibleTracks = tracks.filter((t) => (hasSolo ? t.solo && !t.mute : !t.mute));

  // 1. Render all active audio clips
  audibleTracks.forEach((track) => {
    const trackVol = track.volume ?? 1.0;
    const trackPan = Math.max(-1, Math.min(1, track.pan ?? 0.0));
    const leftPanGain = Math.cos(((trackPan + 1) * Math.PI) / 4);
    const rightPanGain = Math.sin(((trackPan + 1) * Math.PI) / 4);

    (track.clips || []).forEach((clip) => {
      const audioBuffer = audioEngine?.getClipBuffer?.(clip.assetId);
      if (!audioBuffer) return;

      const clipStart = Number(clip.trackTime) || 0;
      const clipDuration = Number(clip.duration) || 1.0;
      const trimIn = Number(clip.trimIn) || 0;
      const clipGain = (clip.gain ?? 1.0) * trackVol;

      const srcLeft = audioBuffer.getChannelData(0);
      const srcRight = audioBuffer.numberOfChannels > 1 ? audioBuffer.getChannelData(1) : srcLeft;
      const srcRate = audioBuffer.sampleRate;

      const startIdx = Math.round(clipStart * sampleRate);
      const endIdx = Math.min(numSamples, Math.round((clipStart + clipDuration) * sampleRate));

      for (let i = startIdx; i < endIdx; i++) {
        const timeFromClipStart = (i - startIdx) / sampleRate;
        const srcTime = trimIn + (clip.loop ? (timeFromClipStart % clipDuration) : timeFromClipStart);
        const srcIdx = Math.floor(srcTime * srcRate);

        if (srcIdx >= 0 && srcIdx < srcLeft.length) {
          // Fade Envelopes
          let fadeMul = 1.0;
          if (clip.fadeIn > 0 && timeFromClipStart < clip.fadeIn) {
            fadeMul = timeFromClipStart / clip.fadeIn;
          } else if (clip.fadeOut > 0 && timeFromClipStart > clipDuration - clip.fadeOut) {
            fadeMul = Math.max(0, (clipDuration - timeFromClipStart) / clip.fadeOut);
          }

          const sl = srcLeft[srcIdx] * clipGain * fadeMul * leftPanGain;
          const sr = srcRight[srcIdx] * clipGain * fadeMul * rightPanGain;
          leftChannel[i] += sl;
          rightChannel[i] += sr;
        }
      }
    });
  });

  // 2. Render procedural synth beat rhythm if no clips exist or as background groove
  const bpm = project.audioDsp?.bpm || 120;
  const beatSec = 60 / bpm;
  const beatSamples = Math.round(beatSec * sampleRate);

  // Synth groove baseline
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const inBeat = (i % beatSamples) / beatSamples;
    const beatIndex = Math.floor(i / beatSamples) % 4;

    // Kick on quarter notes
    let kick = 0;
    if (inBeat < 0.2) {
      const kickEnv = Math.exp(-inBeat * 25);
      const kickFreq = 120 * Math.exp(-inBeat * 15) + 38;
      kick = Math.sin(2 * Math.PI * kickFreq * t) * kickEnv * 0.35;
    }

    // Snare on beats 2 & 4
    let snare = 0;
    if ((beatIndex === 1 || beatIndex === 3) && inBeat < 0.22) {
      const snareEnv = Math.exp(-inBeat * 18);
      snare = (Math.random() * 2 - 1) * snareEnv * 0.22;
    }

    // Hi-hat on eighth notes
    const eighthFraction = (t % (beatSec / 2)) / (beatSec / 2);
    let hat = 0;
    if (eighthFraction < 0.08) {
      hat = (Math.random() * 2 - 1) * Math.exp(-eighthFraction * 35) * 0.12;
    }

    const synthGroove = kick + snare + hat;
    leftChannel[i] += synthGroove * 0.4;
    rightChannel[i] += synthGroove * 0.4;
  }

  // 3. Master Volume & Soft Limiting
  const masterVolume = project.audioDsp?.volume ?? 0.8;
  for (let i = 0; i < numSamples; i++) {
    leftChannel[i] = Math.max(-0.98, Math.min(0.98, leftChannel[i] * masterVolume));
    rightChannel[i] = Math.max(-0.98, Math.min(0.98, rightChannel[i] * masterVolume));
  }

  // 4. Encode to 16-bit Stereo PCM RIFF WAV
  const headerLength = 44;
  const bytesPerSample = 2; // 16-bit
  const numChannels = 2;
  const dataBytes = numSamples * numChannels * bytesPerSample;
  const wavBuffer = new ArrayBuffer(headerLength + dataBytes);
  const view = new DataView(wavBuffer);

  // RIFF header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataBytes, true);
  writeString(view, 8, 'WAVE');

  // fmt subchunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // PCM subchunk size
  view.setUint16(20, 1, true);  // Audio format 1 = PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * bytesPerSample, true);
  view.setUint16(32, numChannels * bytesPerSample, true);
  view.setUint16(34, 16, true); // 16-bit

  // data subchunk
  writeString(view, 36, 'data');
  view.setUint32(40, dataBytes, true);

  // Write interleaved stereo samples
  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    const sl = Math.max(-1, Math.min(1, leftChannel[i]));
    const sr = Math.max(-1, Math.min(1, rightChannel[i]));
    view.setInt16(offset, sl < 0 ? sl * 32768 : sl * 32767, true);
    view.setInt16(offset + 2, sr < 0 ? sr * 32768 : sr * 32767, true);
    offset += 4;
  }

  return {
    buffer: wavBuffer,
    duration,
    sampleRate,
    channels: 2,
  };
}

/**
 * Triggers a browser file download of the rendered WAV audio mixdown.
 * Safely revokes temporary object URL after triggering download.
 *
 * @param {ArrayBuffer} wavBuffer
 * @param {string} filename
 */
export function downloadWavBlob(wavBuffer, filename = 'clover-motion-mixdown.wav') {
  if (typeof window === 'undefined') return;
  const blob = new Blob([wavBuffer], { type: 'audio/wav' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function writeString(view, offset, string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}
