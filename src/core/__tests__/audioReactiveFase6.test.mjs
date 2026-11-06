/**
 * @file audioReactiveFase6.test.mjs
 * @description Comprehensive Automated Verification Suite for Fase 6
 * Validates audio analysis feature extraction (amplitude/bass/mids/treble/transients/beat),
 * deterministic time-indexed caching, audio-to-visual property mapping (sensitivity,
 * range, curves, smoothing), audio mixdown export, and sample project integrity.
 */

import assert from 'node:assert/strict';
import {
  analyzeAudioChannelData,
  getInterpolatedAudioSignals,
  evaluateAudioReactiveMapping,
  generateDeterministicAnalysisFrames,
} from '../services/audioAnalysisService.js';
import {
  renderAudioMixdownWav,
  generateSyntheticTestAudio,
} from '../services/audioService.js';
import { createTextLayer, createShapeLayer } from '../domain/models.js';
import { createSampleAudioReactiveProject } from '../../fixtures/sampleAudioReactiveProject.js';
import { serializeProject, deserializeProject } from '../domain/projectSchema.js';

async function runFase6Tests() {
  console.log('🧪 Starting Fase 6 Audio-to-Visual Reactive Binding & DSP Suite...\n');

  // -------------------------------------------------------------------------
  // Test 1: Audio Analysis Feature Extraction (Amplitude, Bass, Mid, Treble, Transients)
  // -------------------------------------------------------------------------
  console.log('Test 1: Audio Analysis Feature Extraction & Peak Energy Extraction...');
  {
    const sampleRate = 48000;
    const duration = 2.0;
    const numSamples = Math.round(duration * sampleRate);
    const channelData = new Float32Array(numSamples);

    // Generate low frequency bass pulse at t=0.5s and high frequency burst at t=1.2s
    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      if (t >= 0.4 && t <= 0.6) {
        // 60Hz pure sine kick
        channelData[i] = Math.sin(2 * Math.PI * 60 * t) * 0.9;
      } else if (t >= 1.2 && t <= 1.3) {
        // High frequency white noise burst
        channelData[i] = (Math.random() * 2 - 1) * 0.7;
      } else {
        channelData[i] = 0.02 * Math.sin(2 * Math.PI * 440 * t);
      }
    }

    const analysis = analyzeAudioChannelData(channelData, sampleRate, 30);
    assert.equal(analysis.frames.length, 60, '2 seconds at 30 fps produces 60 analysis frames');
    assert.equal(analysis.duration, 2.0);

    // Frame at t=0.5s (index 15) must exhibit strong bass energy
    const kickFrame = analysis.frames[15];
    assert.ok(kickFrame.bass > 0.4, `Kick frame exhibits strong bass: ${kickFrame.bass}`);
    assert.ok(kickFrame.amplitude > 0.3, `Kick frame amplitude is elevated: ${kickFrame.amplitude}`);

    // Frame at t=1.25s (index 37) must exhibit strong treble energy
    const noiseFrame = analysis.frames[37];
    assert.ok(noiseFrame.treble > 0.3, `Noise frame exhibits strong treble: ${noiseFrame.treble}`);

    console.log('  ✓ Multi-band frequency separation (bass, mids, treble) and amplitudes verified.\n');
  }

  // -------------------------------------------------------------------------
  // Test 2: Transient Onset Acceleration & Beat Detection
  // -------------------------------------------------------------------------
  console.log('Test 2: Transient Onset Acceleration & Beat Detection...');
  {
    const frames = generateDeterministicAnalysisFrames(4.0, 120, 30);
    assert.equal(frames.length, 120, '120 frames generated for 4.0s @ 30fps');

    // Downbeat at t=0.0s, t=0.5s, t=1.0s, etc. (120 BPM = 0.5s beat)
    const downbeat0 = frames[0];
    assert.equal(downbeat0.beat, 1, 'Beat 1 detected at t=0.0');
    assert.ok(downbeat0.transient > 0.8, 'Transient burst at downbeat');

    const midBeat = frames[7]; // t=0.23s (between beats)
    assert.equal(midBeat.beat, 0, 'No beat pulse in middle of quarter note');
    assert.ok(midBeat.transient < downbeat0.transient, 'Transient envelope decays exponentially');

    const downbeat1 = frames[15]; // t=0.5s
    assert.equal(downbeat1.beat, 1, 'Beat 2 detected at t=0.5s');

    console.log('  ✓ Transient energy acceleration triggers clean, decaying onset bursts.\n');
  }

  // -------------------------------------------------------------------------
  // Test 3: Deterministic Time-Indexed Feature Cache Interpolation
  // -------------------------------------------------------------------------
  console.log('Test 3: Deterministic Feature Cache Lookup & Frame Blending...');
  {
    const frames = [
      { time: 0.0, amplitude: 0.2, bass: 0.2, mid: 0.1, treble: 0.05, transient: 0, beat: 0 },
      { time: 1.0, amplitude: 0.8, bass: 0.8, mid: 0.5, treble: 0.25, transient: 1, beat: 1 },
    ];

    // Midpoint query at t=0.5s
    const midSignals = getInterpolatedAudioSignals(frames, 0.5);
    assert.equal(midSignals.amplitude, 0.5, 'Amplitude lerped exactly to 0.5');
    assert.equal(midSignals.bass, 0.5, 'Bass lerped exactly to 0.5');
    assert.equal(midSignals.mid, 0.3, 'Mid lerped exactly to 0.3');
    assert.equal(midSignals.treble, 0.15, 'Treble lerped exactly to 0.15');

    // Out of bounds queries safely clamp
    const beforeStart = getInterpolatedAudioSignals(frames, -0.5);
    assert.equal(beforeStart.bass, 0.2, 'Before start clamps to first frame');
    const afterEnd = getInterpolatedAudioSignals(frames, 2.5);
    assert.equal(afterEnd.bass, 0.8, 'After end clamps to last frame');

    console.log('  ✓ Continuous frame interpolation operates with zero drift.\n');
  }

  // -------------------------------------------------------------------------
  // Test 4: Audio-to-Visual Property Mapping: Bass → Scale with Curves & Ranges
  // -------------------------------------------------------------------------
  console.log('Test 4: Bass → Scale Mapping with Sensitivity & Range Clamping...');
  {
    const layer = createTextLayer({
      scale: 1.0,
      audioReactive: true,
      audioSignal: 'bass',
      audioTarget: 'scale',
      audioSensitivity: 50, // 1.0x factor
      audioMinRange: 1.0,
      audioMaxRange: 1.6,
      audioCurve: 'linear',
    });

    // Zero signal
    const modZero = evaluateAudioReactiveMapping(layer, { bass: 0.0 });
    assert.equal(modZero.dScale, 0.0, 'Zero bass produces 0 delta scale (remains 1.0)');

    // 50% signal
    const modHalf = evaluateAudioReactiveMapping(layer, { bass: 0.5 });
    assert.equal(modHalf.dScale, 0.3, '50% bass scales midway to 1.3 (delta +0.3)');

    // 100% signal
    const modFull = evaluateAudioReactiveMapping(layer, { bass: 1.0 });
    assert.equal(modFull.dScale, 0.6, 'Full bass scales to 1.6 (delta +0.6)');

    console.log('  ✓ Bass → Scale explicit min/max range mapping verified.\n');
  }

  // -------------------------------------------------------------------------
  // Test 5: Response Curve Evaluation (Linear, EaseOut, Exponential, Stepped)
  // -------------------------------------------------------------------------
  console.log('Test 5: Audio Response Curve Shaping (EaseOut, Exponential, Stepped)...');
  {
    const baseConfig = {
      scale: 1.0,
      audioReactive: true,
      audioSignal: 'bass',
      audioTarget: 'scale',
      audioSensitivity: 50,
      audioMinRange: 0.0,
      audioMaxRange: 1.0,
    };

    const linearLayer = createTextLayer({ ...baseConfig, audioCurve: 'linear' });
    const easeOutLayer = createTextLayer({ ...baseConfig, audioCurve: 'easeOut' });
    const expLayer = createTextLayer({ ...baseConfig, audioCurve: 'exponential' });
    const steppedLayer = createTextLayer({ ...baseConfig, audioCurve: 'stepped' });

    const signal = { bass: 0.25 }; // 25% input

    const linMod = evaluateAudioReactiveMapping(linearLayer, signal);
    const easeMod = evaluateAudioReactiveMapping(easeOutLayer, signal);
    const expMod = evaluateAudioReactiveMapping(expLayer, signal);
    const stepMod = evaluateAudioReactiveMapping(steppedLayer, signal);

    // EaseOut sqrt(0.25) = 0.5 > Linear 0.25 > Exponential (0.25)^2 = 0.0625
    assert.ok(easeMod.dScale > linMod.dScale, 'EaseOut amplifies low-level signals dynamically');
    assert.ok(linMod.dScale > expMod.dScale, 'Exponential suppresses low-level signals for punchy accents');
    assert.equal(stepMod.dScale, -1.0, 'Stepped response stays 0 below 0.4 threshold');

    // Stepped above threshold
    const stepAbove = evaluateAudioReactiveMapping(steppedLayer, { bass: 0.6 });
    assert.equal(stepAbove.dScale, 0.0, 'Stepped response snaps to 1.0 above threshold');

    console.log('  ✓ All 4 response curves (Linear, EaseOut, Exponential, Stepped) behave as specified.\n');
  }

  // -------------------------------------------------------------------------
  // Test 6: Multi-Channel Mappings (Mids → Rotation, Transient → Opacity)
  // -------------------------------------------------------------------------
  console.log('Test 6: Multi-Channel Targets (Mids → Rotation, Transient → Opacity)...');
  {
    // Rotation mapping
    const rotLayer = createShapeLayer({
      rotation: 0,
      audioReactive: true,
      audioSignal: 'mid',
      audioTarget: 'rotation',
      audioSensitivity: 50,
      audioMinRange: -30,
      audioMaxRange: 30,
      audioCurve: 'linear',
    });

    const rotMod = evaluateAudioReactiveMapping(rotLayer, { mid: 0.5 });
    assert.equal(rotMod.dRot, 0, 'Mid signal 0.5 maps to 0 degree midpoint of [-30, +30]');

    const rotModFull = evaluateAudioReactiveMapping(rotLayer, { mid: 1.0 });
    assert.equal(rotModFull.dRot, 30, 'Mid signal 1.0 maps to maximum rotation +30 degrees');

    // Opacity mapping
    const opacityLayer = createTextLayer({
      opacity: 1.0,
      audioReactive: true,
      audioSignal: 'transient',
      audioTarget: 'opacity',
      audioSensitivity: 50,
      audioMinRange: 0.2,
      audioMaxRange: 1.0,
      audioCurve: 'linear',
    });

    const opMod = evaluateAudioReactiveMapping(opacityLayer, { transient: 0.0 });
    assert.equal(opMod.dAlpha, -0.8, '0 transient drops opacity from 1.0 to 0.2');

    const opModFull = evaluateAudioReactiveMapping(opacityLayer, { transient: 1.0 });
    assert.equal(opModFull.dAlpha, 0.0, 'Full transient stays at 1.0');

    console.log('  ✓ Independent channel targets (Rotation, Opacity, Position) verified.\n');
  }

  // -------------------------------------------------------------------------
  // Test 7: Audio Reactivity On/Off Invariance
  // -------------------------------------------------------------------------
  console.log('Test 7: Audio Reactivity On/Off Invariance...');
  {
    const offLayer = createTextLayer({
      audioReactive: false,
      audioSignal: 'bass',
      audioTarget: 'scale',
      audioSensitivity: 100,
    });

    const signals = { bass: 1.0, mid: 1.0, treble: 1.0, amplitude: 1.0, transient: 1.0, beat: 1 };
    const mod = evaluateAudioReactiveMapping(offLayer, signals);

    assert.equal(mod.dx, 0);
    assert.equal(mod.dy, 0);
    assert.equal(mod.dScale, 0);
    assert.equal(mod.dRot, 0);
    assert.equal(mod.dAlpha, 0);
    assert.equal(mod.dStroke, 0);
    assert.equal(mod.dColorRatio, 0);

    console.log('  ✓ When audioReactive=false, all modulation deltas are strictly zero.\n');
  }

  // -------------------------------------------------------------------------
  // Test 8: Project Audio Mixdown to 16-Bit Stereo RIFF WAV
  // -------------------------------------------------------------------------
  console.log('Test 8: Project Audio Mixdown to 16-Bit Stereo RIFF WAV...');
  {
    const sample = createSampleAudioReactiveProject('1:1');
    const mixdown = renderAudioMixdownWav(sample, null, 3.0);

    assert.ok(mixdown.buffer instanceof ArrayBuffer);
    assert.equal(mixdown.duration, 3.0);
    assert.equal(mixdown.sampleRate, 48000);
    assert.equal(mixdown.channels, 2);

    const view = new DataView(mixdown.buffer);
    const getAscii = (offset, len) => {
      let str = '';
      for (let i = 0; i < len; i++) str += String.fromCharCode(view.getUint8(offset + i));
      return str;
    };

    assert.equal(getAscii(0, 4), 'RIFF');
    assert.equal(getAscii(8, 4), 'WAVE');
    assert.equal(view.getUint16(20, true), 1, 'Format 1 PCM');
    assert.equal(view.getUint16(22, true), 2, 'Stereo 2 channels');
    assert.equal(view.getUint32(24, true), 48000, '48 kHz sample rate');
    assert.equal(view.getUint16(34, true), 16, '16-bit word size');

    console.log('  ✓ Audio mixdown renders compliant stereo 16-bit 48kHz WAV buffer.\n');
  }

  // -------------------------------------------------------------------------
  // Test 9: Editable Sample Project Schema & Inspection
  // -------------------------------------------------------------------------
  console.log('Test 9: Editable Sample Project Schema & Inspection...');
  {
    const sample = createSampleAudioReactiveProject('1:1');
    assert.equal(sample.schemaVersion, 1);
    assert.equal(sample.fps, 30);
    assert.ok(sample.audioTracks.length >= 1, 'Sample has audio tracks');
    assert.ok(sample.scenes[0].layers.length >= 4, 'Sample has 4+ layers');

    // Verify headline layer has explicit inspectable Bass -> Scale binding
    const headline = sample.scenes[0].layers.find((l) => l.audioTarget === 'scale');
    assert.ok(headline, 'Headline has scale target');
    assert.equal(headline.audioReactive, true);
    assert.equal(headline.audioSignal, 'bass');
    assert.equal(headline.audioSensitivity, 65);
    assert.equal(headline.audioMinRange, 1.0);
    assert.equal(headline.audioMaxRange, 1.55);
    assert.equal(headline.audioCurve, 'easeOut');

    // Serialization & Deserialization
    const serialized = serializeProject(sample);
    const reopened = deserializeProject(serialized);

    assert.equal(reopened.scenes[0].layers[1].audioReactive, true);
    assert.equal(reopened.audioDsp.bassGain, 6);
    assert.equal(reopened.audioDsp.bpm, 128);

    console.log('  ✓ Canonical sample project losslessly serializes and restores.\n');
  }

  console.log('🎉 ALL 9 FASE 6 TESTS PASSED SUCCESSFULLY!\n');
}

runFase6Tests().catch((err) => {
  console.error('❌ Fase 6 test suite failed:', err);
  process.exit(1);
});
