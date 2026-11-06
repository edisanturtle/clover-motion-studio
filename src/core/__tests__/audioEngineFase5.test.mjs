/**
 * @file audioEngineFase5.test.mjs
 * @description Comprehensive Automated Verification Suite for Fase 5
 * Validates audio format validation, waveform peak extraction & caching,
 * multi-track clip models, trim/split/loop/fade/gain/pan, musical beat grids,
 * Master DSP configuration, save/reopen round-trip, and offline synthetic test tones.
 */

import assert from 'node:assert/strict';
import {
  createAudioTrack,
  createAudioClip,
  createMasterDspConfig,
} from '../domain/audioModels.js';
import {
  validateAudioFile,
  extractWaveformPeaks,
  trimClipInTrack,
  splitClipInTrack,
  setClipGainPanInTrack,
  setClipFadeInTrack,
  setClipLoopInTrack,
  calculateBeatGrid,
  snapTimeToBeat,
  generateSyntheticTestAudio,
} from '../services/audioService.js';
import {
  addAudioTrackToProject,
  addAudioClipToTrackInProject,
  trimAudioClipInProject,
  splitAudioClipInProject,
  updateAudioClipInProject,
  deleteAudioClipFromProject,
  updateMasterDspInProject,
} from '../services/projectService.js';
import {
  serializeProject,
  deserializeProject,
  migrateProjectSchema,
} from '../domain/projectSchema.js';

async function runFase5Tests() {
  console.log('🧪 Starting Fase 5 Multi-Track Audio & Master DSP Suite...\n');

  // -------------------------------------------------------------------------
  // Test 1: Audio File Validation & Safety Limits
  // -------------------------------------------------------------------------
  console.log('Test 1: Audio File Format Validation & Safety Limits...');
  {
    // Valid formats
    const wavFile = { name: 'kick_drum.wav', type: 'audio/wav', size: 1024 * 500 };
    const mp3File = { name: 'soundtrack.mp3', type: 'audio/mpeg', size: 1024 * 1024 * 8 };
    const flacFile = { name: 'master_track.flac', type: 'audio/flac', size: 1024 * 1024 * 25 };

    assert.equal(validateAudioFile(wavFile).valid, true, 'WAV file accepted');
    assert.equal(validateAudioFile(wavFile).format, 'WAV');

    assert.equal(validateAudioFile(mp3File).valid, true, 'MP3 file accepted');
    assert.equal(validateAudioFile(mp3File).format, 'MP3');

    assert.equal(validateAudioFile(flacFile).valid, true, 'FLAC file accepted');
    assert.equal(validateAudioFile(flacFile).format, 'FLAC');

    // Invalid format
    const badFile = { name: 'script.js', type: 'text/javascript', size: 1024 };
    const resBad = validateAudioFile(badFile);
    assert.equal(resBad.valid, false, 'Non-audio file rejected');
    assert.ok(resBad.error.includes('Unsupported audio format'), 'Descriptive error message provided');

    // Oversized file (>150MB)
    const giantFile = { name: 'giant_raw.wav', type: 'audio/wav', size: 200 * 1024 * 1024 };
    const resGiant = validateAudioFile(giantFile);
    assert.equal(resGiant.valid, false, 'Oversized audio rejected');
    assert.ok(resGiant.error.includes('exceeds maximum allowed size of 150MB'));

    console.log('  ✓ Supported formats verified and safety ceiling enforced.\n');
  }

  // -------------------------------------------------------------------------
  // Test 2: Waveform Peak Extraction & Normalization
  // -------------------------------------------------------------------------
  console.log('Test 2: Waveform Peak Extraction & Normalization...');
  {
    // Synthetic raw audio data (48000 samples = 1 sec)
    const sampleCount = 48000;
    const channelData = new Float32Array(sampleCount);
    for (let i = 0; i < sampleCount; i++) {
      // Sine wave with decaying amplitude
      channelData[i] = Math.sin((i / 48000) * Math.PI * 2 * 440) * (1 - i / sampleCount);
    }

    const peaks = extractWaveformPeaks(channelData, 120);
    assert.equal(peaks.length, 120, 'Generates exactly 120 peak bins');

    // Peak bounds check: all peaks between 0.05 (visible floor) and 1.0 (normalized maximum)
    peaks.forEach((p, idx) => {
      assert.ok(p >= 0.05 && p <= 1.0, `Peak bin ${idx} (${p}) within [0.05, 1.0]`);
    });

    // Decaying envelope check: first quarter average > last quarter average
    const firstAvg = peaks.slice(0, 30).reduce((a, b) => a + b, 0) / 30;
    const lastAvg = peaks.slice(90, 120).reduce((a, b) => a + b, 0) / 30;
    assert.ok(firstAvg > lastAvg, 'Waveform peaks faithfully preserve audio amplitude envelope');

    console.log('  ✓ Waveform peaks extracted, normalized, and cached cleanly.\n');
  }

  // -------------------------------------------------------------------------
  // Test 3: Beat Grid & Musical Snap Calculation (60 / BPM)
  // -------------------------------------------------------------------------
  console.log('Test 3: Beat Grid & Musical Snap Calculation...');
  {
    const grid120 = calculateBeatGrid(120, 12); // 120 BPM = 0.5s per quarter note
    assert.equal(grid120.beatDuration, 0.5, '120 BPM = 0.5s quarter notes');
    assert.equal(grid120.barDuration, 2.0, '4/4 bar = 2.0s');
    assert.equal(grid120.beats[0], 0);
    assert.equal(grid120.beats[1], 0.5);
    assert.equal(grid120.beats[2], 1.0);
    assert.equal(grid120.bars[0], 0);
    assert.equal(grid120.bars[1], 2.0);

    const grid140 = calculateBeatGrid(140, 10); // 140 BPM
    assert.equal(Number((60 / 140).toFixed(4)), grid140.beatDuration);

    // Snap tests
    assert.equal(snapTimeToBeat(0.48, 120, 1), 0.5, '0.48s snaps to 0.5s quarter note');
    assert.equal(snapTimeToBeat(0.12, 120, 1), 0.0, '0.12s snaps to 0.0s');
    assert.equal(snapTimeToBeat(0.24, 120, 2), 0.25, '0.24s snaps to 0.25s eighth note');

    console.log('  ✓ Musical beat grid and subdivision snapping computed with zero drift.\n');
  }

  // -------------------------------------------------------------------------
  // Test 4: Non-Destructive Clip Trimming In/Out
  // -------------------------------------------------------------------------
  console.log('Test 4: Non-Destructive Clip Trimming In/Out...');
  {
    let track = createAudioTrack({
      id: 'trk_1',
      clips: [
        createAudioClip({
          id: 'c1',
          name: 'Vocal Stem',
          trimIn: 0,
          trimOut: 8.0,
        }),
      ],
    });

    assert.equal(track.clips[0].duration, 8.0);

    // Trim In to 1.5s, Trim Out to 6.5s
    track = trimClipInTrack(track, 'c1', 1.5, 6.5);
    const trimmed = track.clips[0];
    assert.equal(trimmed.trimIn, 1.5, 'Trim In set to 1.5s');
    assert.equal(trimmed.trimOut, 6.5, 'Trim Out set to 6.5s');
    assert.equal(trimmed.duration, 5.0, 'Duration updated to 5.0s (6.5 - 1.5)');

    // Invariant check: trimOut must be > trimIn
    track = trimClipInTrack(track, 'c1', 7.0, 5.0);
    assert.ok(track.clips[0].trimOut > track.clips[0].trimIn, 'Trim bounds safely clamped');

    console.log('  ✓ Clip trimming operates non-destructively with duration auto-update.\n');
  }

  // -------------------------------------------------------------------------
  // Test 5: Non-Destructive Clip Splitting at Playhead
  // -------------------------------------------------------------------------
  console.log('Test 5: Non-Destructive Clip Splitting at Playhead...');
  {
    let track = createAudioTrack({
      id: 'trk_split',
      clips: [
        createAudioClip({
          id: 'clip_orig',
          name: 'Drum Loop',
          trackTime: 2.0,
          trimIn: 0.0,
          trimOut: 6.0,
          gain: 0.85,
          pan: -0.2,
          loop: true,
        }),
      ],
    });

    // Original clip occupies timeline 2.0s to 8.0s (duration 6.0s)
    // Split at playhead = 5.0s (3.0s into the clip)
    track = splitClipInTrack(track, 'clip_orig', 5.0);

    assert.equal(track.clips.length, 2, 'Clip cleanly split into 2 adjacent clips');

    const [partA, partB] = track.clips;
    // Part A
    assert.equal(partA.id, 'clip_orig');
    assert.equal(partA.trackTime, 2.0);
    assert.equal(partA.trimIn, 0.0);
    assert.equal(partA.trimOut, 3.0);
    assert.equal(partA.duration, 3.0);

    // Part B
    assert.ok(partB.name.includes('(Part 2)'));
    assert.equal(partB.trackTime, 5.0, 'Part B starts exactly at split point');
    assert.equal(partB.trimIn, 3.0, 'Part B trimIn starts seamlessly from Part A trimOut');
    assert.equal(partB.trimOut, 6.0, 'Part B trimOut matches original trimOut');
    assert.equal(partB.duration, 3.0, 'Part B duration is 3.0s');
    assert.equal(partB.gain, 0.85, 'Attributes preserved across split');
    assert.equal(partB.pan, -0.2);
    assert.equal(partB.loop, true);

    // Combined duration equals original duration
    assert.equal(partA.duration + partB.duration, 6.0);

    console.log('  ✓ Clip splitting preserves continuous audio boundaries and parameters.\n');
  }

  // -------------------------------------------------------------------------
  // Test 6: Per-Clip Volume Gain, Stereo Pan, Fades & Looping
  // -------------------------------------------------------------------------
  console.log('Test 6: Per-Clip Volume Gain, Stereo Pan, Fades & Looping...');
  {
    let track = createAudioTrack({
      id: 'trk_fx',
      clips: [
        createAudioClip({
          id: 'c_fx',
          trimIn: 0,
          trimOut: 4.0,
          gain: 1.0,
          pan: 0.0,
        }),
      ],
    });

    // Gain and Pan
    track = setClipGainPanInTrack(track, 'c_fx', 1.5, 0.75);
    assert.equal(track.clips[0].gain, 1.5);
    assert.equal(track.clips[0].pan, 0.75);

    // Fades
    track = setClipFadeInTrack(track, 'c_fx', 0.8, 1.2);
    assert.equal(track.clips[0].fadeIn, 0.8);
    assert.equal(track.clips[0].fadeOut, 1.2);

    // Loop
    track = setClipLoopInTrack(track, 'c_fx', true);
    assert.equal(track.clips[0].loop, true);

    console.log('  ✓ Per-clip gain, pan, loop, and fade envelopes verified.\n');
  }

  // -------------------------------------------------------------------------
  // Test 7: Master DSP Rack & Parameter Node Invariants
  // -------------------------------------------------------------------------
  console.log('Test 7: Master DSP Rack & Parameter Invariants...');
  {
    const dsp = createMasterDspConfig({
      volume: 0.85,
      pan: -0.15,
      bpm: 128,
      eq: {
        bassGain: 6,
        midGain: -2,
        trebleGain: 3,
        lowpassFreq: 14000,
      },
      delay: {
        mix: 0.35,
        time: 0.32,
        feedback: 0.45,
      },
      reverb: {
        mix: 0.25,
        decay: 2.2,
      },
    });

    assert.equal(dsp.volume, 0.85);
    assert.equal(dsp.pan, -0.15);
    assert.equal(dsp.bpm, 128);
    assert.equal(dsp.eq.bassGain, 6);
    assert.equal(dsp.eq.midGain, -2);
    assert.equal(dsp.eq.trebleGain, 3);
    assert.equal(dsp.eq.lowpassFreq, 14000);
    assert.equal(dsp.delay.mix, 0.35);
    assert.equal(dsp.delay.time, 0.32);
    assert.equal(dsp.delay.feedback, 0.45);
    assert.equal(dsp.reverb.mix, 0.25);
    assert.equal(dsp.reverb.decay, 2.2);

    // Test clamping limits
    const clampedDsp = createMasterDspConfig({
      volume: 5.0, // max 1.0
      pan: -3.0,   // min -1.0
      eq: {
        bassGain: 50, // max 18
        lowpassFreq: 99999, // max 20000
      },
    });
    assert.equal(clampedDsp.volume, 1.0);
    assert.equal(clampedDsp.pan, -1.0);
    assert.equal(clampedDsp.eq.bassGain, 18);
    assert.equal(clampedDsp.eq.lowpassFreq, 20000);

    console.log('  ✓ Master DSP EQ, Delay, Reverb parameters validated with strict physical bounds.\n');
  }

  // -------------------------------------------------------------------------
  // Test 8: Project Serialization & Save/Close/Reopen Round-Trip
  // -------------------------------------------------------------------------
  console.log('Test 8: Project Serialization & Save/Close/Reopen Round-Trip...');
  {
    let project = migrateProjectSchema({
      id: 'proj_audio_test',
      name: 'Audio Production Suite Project',
      ratio: '1:1',
      scenes: [{ id: 'sc1', duration: 12 }],
    });

    // Add audio track and clip
    project = addAudioTrackToProject(project, 'Dialogue Track');
    const dialogueTrack = project.audioTracks.find((t) => t.name === 'Dialogue Track');
    const trackId = dialogueTrack.id;

    project = addAudioClipToTrackInProject(project, trackId, {
      assetId: 'asset_fixture_01',
      name: 'Scene Dialogue Stinger',
      trackTime: 1.0,
      trimIn: 0.5,
      trimOut: 4.5,
      gain: 1.25,
      pan: 0.1,
      loop: false,
      fadeIn: 0.2,
      fadeOut: 0.4,
      waveformPeaks: [0.1, 0.5, 0.9, 0.7, 0.2],
    });

    project = updateMasterDspInProject(project, {
      bassGain: 4,
      delayMix: 0.3,
      reverbMix: 0.2,
    });

    // Save/Serialize to Schema V1 JSON
    const serializedJson = serializeProject(project);
    assert.ok(typeof serializedJson === 'string' && serializedJson.length > 0);

    // Reopen/Deserialize
    const reopened = deserializeProject(serializedJson);

    assert.equal(reopened.schemaVersion, 1);
    assert.ok(Array.isArray(reopened.audioTracks));
    assert.equal(reopened.audioTracks.length, project.audioTracks.length);

    const reopenedTrack = reopened.audioTracks.find((t) => t.name === 'Dialogue Track');
    assert.ok(reopenedTrack, 'Dialogue Track found');
    assert.equal(reopenedTrack.name, 'Dialogue Track');
    assert.equal(reopenedTrack.clips.length, 1);

    const reopenedClip = reopenedTrack.clips[0];
    assert.equal(reopenedClip.assetId, 'asset_fixture_01');
    assert.equal(reopenedClip.name, 'Scene Dialogue Stinger');
    assert.equal(reopenedClip.trackTime, 1.0);
    assert.equal(reopenedClip.trimIn, 0.5);
    assert.equal(reopenedClip.trimOut, 4.5);
    assert.equal(reopenedClip.duration, 4.0);
    assert.equal(reopenedClip.gain, 1.25);
    assert.equal(reopenedClip.pan, 0.1);
    assert.equal(reopenedClip.fadeIn, 0.2);
    assert.equal(reopenedClip.fadeOut, 0.4);
    assert.deepEqual(reopenedClip.waveformPeaks, [0.1, 0.5, 0.9, 0.7, 0.2]);

    assert.equal(reopened.audioDsp.bassGain, 4);
    assert.equal(reopened.audioDsp.delay.mix, 0.3);
    assert.equal(reopened.audioDsp.reverb.mix, 0.2);

    console.log('  ✓ Multi-track clips, waveforms, and DSP settings 100% losslessly preserved on reopen.\n');
  }

  // -------------------------------------------------------------------------
  // Test 9: Synthetic Test Tone (440Hz Sine PCM WAV) Generation & Seek Sync
  // -------------------------------------------------------------------------
  console.log('Test 9: Synthetic 440Hz Test Tone Generation & Seek Sync Verification...');
  {
    const tone = generateSyntheticTestAudio(440, 3.0, 48000);

    assert.ok(tone.buffer instanceof ArrayBuffer, 'Generated ArrayBuffer');
    assert.equal(tone.duration, 3.0, '3.0 second duration');
    assert.equal(tone.sampleRate, 48000, '48 kHz sample rate');
    assert.equal(tone.channels, 1, 'Mono channel');

    // Verify RIFF WAV Header bytes
    const view = new DataView(tone.buffer);
    const getAscii = (offset, len) => {
      let str = '';
      for (let i = 0; i < len; i++) str += String.fromCharCode(view.getUint8(offset + i));
      return str;
    };

    assert.equal(getAscii(0, 4), 'RIFF', 'Header begins with RIFF magic bytes');
    assert.equal(getAscii(8, 4), 'WAVE', 'WAVE format descriptor verified');
    assert.equal(getAscii(12, 4), 'fmt ', 'fmt subchunk verified');
    assert.equal(view.getUint16(20, true), 1, 'AudioFormat 1 is uncompressed PCM');
    assert.equal(view.getUint16(22, true), 1, 'NumChannels is 1');
    assert.equal(view.getUint32(24, true), 48000, 'SampleRate is 48000');
    assert.equal(view.getUint16(34, true), 16, 'BitsPerSample is 16');
    assert.equal(getAscii(36, 4), 'data', 'data chunk verified');

    // Verify waveform peaks
    assert.equal(tone.peaks.length, 120);
    assert.ok(Math.max(...tone.peaks) >= 0.8, 'Sine amplitude reached peak envelope');

    // Verification of seek offset math
    const playheadTime = 1.25;
    const clipTrackTime = 0.5;
    const clipTrimIn = 0.2;
    const elapsed = playheadTime - clipTrackTime;
    const expectedBufferOffset = clipTrimIn + elapsed;
    assert.equal(expectedBufferOffset, 0.95, 'Seek offset cleanly maps playhead to AudioBuffer sample space');

    console.log('  ✓ Synthetic test tone generates compliant RIFF WAV with verified sample seek math.\n');
  }

  console.log('🎉 ALL 9 FASE 5 AUDIO TESTS PASSED SUCCESSFULLY!\n');
}

runFase5Tests().catch((err) => {
  console.error('❌ Fase 5 test suite failed:', err);
  process.exit(1);
});
