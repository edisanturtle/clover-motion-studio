/**
 * @file sampleVideoProject.js
 * @description Canonical Video Editing & Compositing Sample Project (Fase 7)
 * Demonstrates multi-track video clips, transitions, crop rectangles,
 * broadcast captions, still/text overlays, and audio synchronization.
 */

import { createScene, createTextLayer, createShapeLayer } from '../core/domain/models.js';
import { createVideoTrack, createVideoClip } from '../core/domain/videoModels.js';
import { createAudioTrack, createAudioClip } from '../core/domain/audioModels.js';

export function createSampleVideoProject() {
  const now = Date.now();

  const clip1 = createVideoClip({
    id: 'clip_v_sample_1',
    name: 'Zurich_Broll_Plate_01.mp4',
    startTime: 0.0,
    duration: 5.0,
    sourceDuration: 15.0,
    trimIn: 1.0,
    trimOut: 6.0,
    speed: 1.0,
    volume: 0.8,
    codec: 'avc1.64001F (H.264 High)',
    transform: {
      x: 0,
      y: 0,
      scale: 1.0,
      rotation: 0,
      opacity: 1.0,
      blendMode: 'source-over',
    },
    crop: {
      top: 5,
      bottom: 5,
      left: 0,
      right: 0,
    },
    transitionIn: {
      type: 'fadeToBlack',
      duration: 0.8,
    },
    transitionOut: {
      type: 'crossfade',
      duration: 0.6,
    },
    captions: [
      {
        id: 'cap_sample_1',
        startTime: 1.5,
        endTime: 4.5,
        text: 'ZÜRICH CREATIVE LABS · 47.3769° N',
        position: 'bottom',
      },
    ],
  });

  const clip2 = createVideoClip({
    id: 'clip_v_sample_2',
    name: 'Typography_Motion_Plate_02.mp4',
    startTime: 5.0,
    duration: 5.0,
    sourceDuration: 10.0,
    trimIn: 0.0,
    trimOut: 5.0,
    speed: 1.0,
    volume: 1.0,
    codec: 'avc1.4D401F (H.264 Main)',
    transform: {
      x: 0,
      y: 0,
      scale: 1.05,
      rotation: 0,
      opacity: 1.0,
      blendMode: 'source-over',
    },
    crop: {
      top: 0,
      bottom: 0,
      left: 4,
      right: 4,
    },
    transitionIn: {
      type: 'crossfade',
      duration: 0.6,
    },
    transitionOut: {
      type: 'slideUp',
      duration: 0.8,
    },
    captions: [
      {
        id: 'cap_sample_2',
        startTime: 5.5,
        endTime: 9.0,
        text: 'NON-DESTRUCTIVE MULTI-TRACK COMPOSITING',
        position: 'bottom',
      },
    ],
  });

  const videoTrack1 = createVideoTrack({
    id: 'track_v_main',
    name: 'V1 · Main Footage',
    clips: [clip1, clip2],
  });

  const scene1 = createScene(
    {
      id: 'scene_video_1',
      name: 'Video Master Sequence',
      duration: 10,
      bg: '#0a0a0f',
      layers: [
        createTextLayer({
          id: 'layer_title_overlay',
          name: 'Title Overlay',
          text: 'CLOVER MOTION // V7',
          fontFamily: 'Inter',
          fontSize: 32,
          fontWeight: 800,
          color: '#ffffff',
          x: 0,
          y: -180,
        }),
        createShapeLayer({
          id: 'layer_accent_badge',
          name: 'Live Rec Badge',
          shapeType: 'pill',
          width: 80,
          height: 24,
          fill: 'rgba(239, 68, 68, 0.9)',
          x: -180,
          y: -220,
        }),
      ],
    },
    'Video Master Sequence'
  );

  return {
    schemaVersion: 1,
    appVersion: '2.0.0',
    id: 'proj_sample_video_fase7',
    name: 'Swiss Video Composite Master',
    createdAt: now,
    updatedAt: now,
    ratio: '16:9',
    fps: 30,
    scenes: [scene1],
    videoTracks: [videoTrack1],
    audioTracks: [
      createAudioTrack({
        id: 'track_a_bgm',
        name: 'A1 · Stereo Mix',
        clips: [
          createAudioClip({
            id: 'clip_a_bgm_1',
            name: 'Ambient_Atmosphere.wav',
            startTime: 0,
            duration: 10.0,
            sourceDuration: 10.0,
            volume: 0.85,
          }),
        ],
      }),
    ],
  };
}
