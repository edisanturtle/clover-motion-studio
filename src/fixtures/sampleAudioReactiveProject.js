/**
 * @file sampleAudioReactiveProject.js
 * @description Canonical Sample Project for Fase 6 Audio-to-Visual Reactive Binding
 * Showcases:
 * 1. User audio sample clip (440Hz Test Tone in Track 1)
 * 2. Internal procedural synthesizer (128 BPM Electronic Funk groove)
 * 3. Explicit inspectable Bass -> Scale modulation on headline text
 * 4. Mid -> Rotation modulation on graphic shape
 * 5. Transient -> Opacity modulation on subtitle
 */

import { createScene, createTextLayer, createShapeLayer } from '../core/domain/models.js';
import { createAudioTrack, createAudioClip, createMasterDspConfig } from '../core/domain/audioModels.js';
import { generateDeterministicAnalysisFrames } from '../core/services/audioAnalysisService.js';
import { generateSyntheticTestAudio } from '../core/services/audioService.js';

export function createSampleAudioReactiveProject(ratio = '1:1') {
  const tone = generateSyntheticTestAudio(440, 4.0, 48000);

  const headlineLayer = createTextLayer({
    id: 'layer_hero_bass_scale',
    name: 'Hero Title (Bass → Scale)',
    role: 'title',
    text: 'CLOVER DYNAMICS',
    fontFamily: "'Space Grotesk', sans-serif",
    fontSize: 78,
    fontWeight: 800,
    lineHeight: 0.95,
    letterSpacing: -2,
    align: 'center',
    color: '#f5f1e6',
    x: 540,
    y: 440,
    width: 900,
    scale: 1.0,
    opacity: 1.0,
    // Fase 6 Audio Reactive Binding: Bass -> Scale
    audioReactive: true,
    audioSignal: 'bass',
    audioTarget: 'scale',
    audioSensitivity: 65,
    audioMinRange: 1.0,
    audioMaxRange: 1.55,
    audioCurve: 'easeOut',
    audioSmoothing: 0.15,
    keyframes: [],
  });

  const matrixPillLayer = createShapeLayer({
    id: 'layer_mid_rotation_pill',
    name: 'Modulator Pill (Mids → Rotation)',
    shapeType: 'pill',
    x: 540,
    y: 600,
    width: 320,
    height: 48,
    fill: '#159947',
    stroke: '#22c55e',
    strokeWidth: 3,
    rotation: 0,
    scale: 1.0,
    opacity: 0.92,
    // Fase 6 Audio Reactive Binding: Mids -> Rotation
    audioReactive: true,
    audioSignal: 'mid',
    audioTarget: 'rotation',
    audioSensitivity: 50,
    audioMinRange: -25,
    audioMaxRange: 25,
    audioCurve: 'linear',
    audioSmoothing: 0.2,
    keyframes: [],
  });

  const subtitleLayer = createTextLayer({
    id: 'layer_transient_opacity_sub',
    name: 'Subtitle (Transient → Opacity)',
    role: 'subtitle',
    text: 'PROCEDURAL SYNTH · 128 BPM · 440HZ CONCERT A',
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 18,
    fontWeight: 600,
    letterSpacing: 3,
    align: 'center',
    color: '#4ade80',
    x: 540,
    y: 710,
    width: 800,
    scale: 1.0,
    opacity: 1.0,
    // Fase 6 Audio Reactive Binding: Transient -> Opacity
    audioReactive: true,
    audioSignal: 'transient',
    audioTarget: 'opacity',
    audioSensitivity: 75,
    audioMinRange: 0.35,
    audioMaxRange: 1.0,
    audioCurve: 'stepped',
    audioSmoothing: 0.1,
    keyframes: [],
  });

  const starLayer = createShapeLayer({
    id: 'layer_bass_bounce_star',
    name: 'Accent Star (Bass → Y Bounce)',
    shapeType: 'star',
    x: 540,
    y: 280,
    width: 90,
    height: 90,
    fill: '#22c55e',
    stroke: '#4ade80',
    strokeWidth: 2,
    rotation: 0,
    scale: 1.0,
    opacity: 0.95,
    // Fase 6 Audio Reactive Binding: Bass -> PosY
    audioReactive: true,
    audioSignal: 'bass',
    audioTarget: 'posY',
    audioSensitivity: 55,
    audioMinRange: 0,
    audioMaxRange: -40,
    audioCurve: 'easeOut',
    audioSmoothing: 0.12,
    keyframes: [],
  });

  const scene = createScene({
    id: 'scene_audio_reactive_demo',
    name: 'Audio Dynamics 01',
    duration: 8.0,
    bg: '#0a0f16',
    palette: ['#0a0f16', '#f5f1e6', '#159947', '#22c55e', '#4ade80', '#e57c66'],
    transition: 'Cut',
    posterLayout: 'swiss',
    audioTrackId: 'funk',
    audioVolume: 1.0,
    sfxOnEnter: 'subDrop',
    layers: [starLayer, headlineLayer, matrixPillLayer, subtitleLayer],
    markers: [
      { id: 'mk_intro', time: 0.0, label: 'Intro Downbeat', color: '#22c55e' },
      { id: 'mk_verse', time: 2.0, label: 'Bass Drop', color: '#3b82f6' },
      { id: 'mk_chorus', time: 4.0, label: 'Full Climax', color: '#ec4899' },
      { id: 'mk_outro', time: 6.0, label: 'Decay Outro', color: '#eab308' },
    ],
  });

  const audioTrack = createAudioTrack({
    id: 'track_test_tone_sample',
    name: 'User Tone Sample Track',
    volume: 0.9,
    pan: 0.0,
    clips: [
      createAudioClip({
        id: 'clip_440hz_concert_a',
        assetId: 'asset_tone_440hz_sample',
        name: '440Hz Concert A Sine (4.0s)',
        trackTime: 0.0,
        trimIn: 0.0,
        trimOut: 4.0,
        duration: 4.0,
        gain: 1.0,
        pan: 0.0,
        loop: true,
        fadeIn: 0.15,
        fadeOut: 0.3,
        waveformPeaks: tone.peaks,
      }),
    ],
  });

  const audioDsp = createMasterDspConfig({
    volume: 0.85,
    pan: 0.0,
    bpm: 128,
    eq: {
      bassGain: 6, // +6dB Sub-Bass boost
      midGain: 1,
      trebleGain: 2,
      lowpassFreq: 18000,
    },
    delay: {
      mix: 0.28,
      time: 0.35,
      feedback: 0.42,
    },
    reverb: {
      mix: 0.24,
      decay: 2.2,
    },
  });

  // Generate deterministic 30fps analysis frames for 8s
  const analysisCache = generateDeterministicAnalysisFrames(8.0, 128, 30);

  return {
    schemaVersion: 1,
    id: 'proj_sample_audio_reactive',
    name: 'Audio-Reactive Swiss Dynamics · Fase 6',
    purpose: 'Audio-Reactive Motion & Web Audio DSP',
    category: 'Kinetic',
    ratio,
    fps: 30,
    scenes: [scene],
    audioTracks: [audioTrack],
    audioDsp,
    analysisCache,
    assets: {
      asset_tone_440hz_sample: {
        id: 'asset_tone_440hz_sample',
        type: 'audio',
        name: '440Hz Concert A Sine (4.0s)',
        size: tone.buffer.byteLength,
        format: 'WAV',
        duration: 4.0,
        sampleRate: 48000,
        channels: 1,
      },
    },
  };
}
