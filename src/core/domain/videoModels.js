/**
 * @file videoModels.js
 * @description Canonical Video Domain Models & Entities (Fase 7)
 * Defines VideoClip, VideoTrack, Transitions, Transform, Crop, and Caption models
 * adhering to strict non-destructive editing and schema invariance.
 */

export const SUPPORTED_TRANSITIONS = [
  'none',
  'crossfade',
  'fadeToBlack',
  'wipeLeft',
  'wipeRight',
  'slideUp',
];

export const SUPPORTED_BLEND_MODES = [
  'source-over',
  'multiply',
  'screen',
  'overlay',
  'darken',
  'lighten',
  'color-dodge',
  'difference',
];

/**
 * Creates a validated VideoClip entity.
 * @param {object} init
 * @returns {object} VideoClip
 */
export function createVideoClip(init = {}) {
  const now = Date.now();
  const id = init.id
    ? (String(init.id).startsWith('clip_v_') ? String(init.id) : `clip_v_${init.id}`)
    : `clip_v_${now}_${Math.random().toString(36).slice(2, 7)}`;

  const startTime = Math.max(0, Number(init.startTime) || 0);
  const duration = Math.max(0.1, Number(init.duration) || 4.0);
  const sourceDuration = Math.max(duration, Number(init.sourceDuration) || duration);
  const trimIn = Math.max(0, Math.min(sourceDuration - 0.1, Number(init.trimIn) || 0));
  const trimOut = Math.max(trimIn + 0.1, Math.min(sourceDuration, Number(init.trimOut) || (trimIn + duration)));
  const speed = Math.max(0.25, Math.min(4.0, Number(init.speed) || 1.0));

  // Transform parameters
  const transform = {
    x: Number(init.transform?.x) || 0,
    y: Number(init.transform?.y) || 0,
    scale: Math.max(0.1, Math.min(5.0, Number(init.transform?.scale) || 1.0)),
    rotation: Number(init.transform?.rotation) || 0,
    opacity: Math.max(0, Math.min(1.0, init.transform?.opacity !== undefined ? Number(init.transform.opacity) : 1.0)),
    blendMode: SUPPORTED_BLEND_MODES.includes(init.transform?.blendMode)
      ? init.transform.blendMode
      : 'source-over',
  };

  // Crop parameters (percentages 0..100)
  const crop = {
    top: Math.max(0, Math.min(90, Number(init.crop?.top) || 0)),
    bottom: Math.max(0, Math.min(90, Number(init.crop?.bottom) || 0)),
    left: Math.max(0, Math.min(90, Number(init.crop?.left) || 0)),
    right: Math.max(0, Math.min(90, Number(init.crop?.right) || 0)),
  };

  // Transitions
  const transitionIn = {
    type: SUPPORTED_TRANSITIONS.includes(init.transitionIn?.type) ? init.transitionIn.type : 'none',
    duration: Math.max(0, Math.min(duration / 2, Number(init.transitionIn?.duration) || 0.5)),
  };

  const transitionOut = {
    type: SUPPORTED_TRANSITIONS.includes(init.transitionOut?.type) ? init.transitionOut.type : 'none',
    duration: Math.max(0, Math.min(duration / 2, Number(init.transitionOut?.duration) || 0.5)),
  };

  // Caption cues
  const captions = Array.isArray(init.captions)
    ? init.captions.map((cap, cIdx) => ({
        id: cap.id || `cap_${cIdx + 1}_${Math.random().toString(36).slice(2, 6)}`,
        startTime: Math.max(0, Number(cap.startTime) || 0),
        endTime: Math.max(Number(cap.startTime) || 0, Number(cap.endTime) || duration),
        text: String(cap.text || '').trim(),
        position: cap.position || 'bottom', // 'bottom' | 'top' | 'center'
        style: {
          fontSize: Number(cap.style?.fontSize) || 24,
          color: cap.style?.color || '#ffffff',
          bg: cap.style?.bg || 'rgba(0, 0, 0, 0.75)',
        },
      }))
    : [];

  return {
    id,
    name: init.name || 'Untitled Video Clip',
    assetId: init.assetId || null,
    trackId: init.trackId || null,
    startTime: Number(startTime.toFixed(3)),
    duration: Number(duration.toFixed(3)),
    sourceDuration: Number(sourceDuration.toFixed(3)),
    trimIn: Number(trimIn.toFixed(3)),
    trimOut: Number(trimOut.toFixed(3)),
    speed,
    volume: Math.max(0, Math.min(2.0, init.volume !== undefined ? Number(init.volume) : 1.0)),
    muted: Boolean(init.muted),
    transform,
    crop,
    transitionIn,
    transitionOut,
    captions,
    proxyUrl: init.proxyUrl || null,
    hasProxy: Boolean(init.hasProxy),
    codec: init.codec || 'avc1.64001F',
    isMissing: Boolean(init.isMissing),
    createdAt: init.createdAt || now,
    updatedAt: now,
  };
}

/**
 * Creates a validated VideoTrack entity.
 * @param {object} init
 * @param {string} defaultName
 * @returns {object} VideoTrack
 */
export function createVideoTrack(init = {}, defaultName = 'Video Track 1') {
  const now = Date.now();
  const id = init.id
    ? (String(init.id).startsWith('track_v_') ? String(init.id) : `track_v_${init.id}`)
    : `track_v_${now}_${Math.random().toString(36).slice(2, 7)}`;

  const clips = Array.isArray(init.clips)
    ? init.clips.map((c) => createVideoClip({ ...c, trackId: id }))
    : [];

  return {
    id,
    name: init.name || defaultName,
    type: 'video',
    muted: Boolean(init.muted),
    solo: Boolean(init.solo),
    visible: init.visible !== undefined ? Boolean(init.visible) : true,
    opacity: Math.max(0, Math.min(1.0, init.opacity !== undefined ? Number(init.opacity) : 1.0)),
    clips,
    createdAt: init.createdAt || now,
    updatedAt: now,
  };
}
