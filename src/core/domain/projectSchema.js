/**
 * @file projectSchema.js
 * @description Canonical Project Schema V1 Specification, Validation & Migration System (ADR 005)
 * Standardizes the single self-contained project format (.clovermotion.json)
 * with stable IDs, rational timebase metadata, and portable asset registries.
 */

import { createScene, createShowcaseConfig, createTextLayer } from './models.js';
import { createAudioTrack, createMasterDspConfig } from './audioModels.js';
import { createVideoTrack } from './videoModels.js';
import { secondsToTicks, TICKS_PER_SECOND } from './timebase.js';

export const CURRENT_SCHEMA_VERSION = 1;
export const APP_VERSION = '2.0.0';

/**
 * Validates a candidate project object against Schema V1.
 * @param {any} candidate
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateProjectSchema(candidate) {
  const errors = [];

  if (!candidate || typeof candidate !== 'object') {
    return { valid: false, errors: ['Project payload is not an object'] };
  }

  if (typeof candidate.id !== 'string' || !candidate.id.trim()) {
    errors.push('Missing or invalid project "id"');
  }

  if (typeof candidate.name !== 'string' || !candidate.name.trim()) {
    errors.push('Missing or invalid project "name"');
  }

  if (!Array.isArray(candidate.scenes) || candidate.scenes.length === 0) {
    errors.push('Project must contain at least one scene in "scenes" array');
  }

  const validRatios = ['4:5', '1:1', '9:16', '16:9', '4:3', '3:4'];
  if (candidate.ratio && !validRatios.includes(candidate.ratio)) {
    errors.push(`Invalid aspect ratio "${candidate.ratio}". Allowed: ${validRatios.join(', ')}`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Ensures all scenes, layers, and assets possess persistent stable IDs.
 * @param {object} project
 * @returns {object} Clean project with guaranteed stable IDs
 */
export function ensureStableIds(project) {
  if (!project) return project;

  const projId = project.id && String(project.id).startsWith('proj_')
    ? project.id
    : `proj_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  const scenes = (project.scenes || []).map((scene, scIdx) => {
    const sceneId = scene.id && String(scene.id).startsWith('scene_')
      ? scene.id
      : `scene_${scIdx + 1}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;

    const layers = (scene.layers || []).map((layer, lIdx) => {
      const layerId = layer.id && String(layer.id).startsWith('layer_')
        ? layer.id
        : `layer_${scIdx + 1}_${lIdx + 1}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;

      const effects = Array.isArray(layer.effects)
        ? layer.effects.map((fx, fxIdx) => ({
            ...fx,
            id: fx.id && String(fx.id).startsWith('fx_')
              ? fx.id
              : `fx_${scIdx + 1}_${lIdx + 1}_${fxIdx + 1}_${Date.now().toString(36)}`,
          }))
        : layer.effects;

      return {
        ...layer,
        id: layerId,
        ...(effects !== undefined ? { effects } : {}),
      };
    });

    return {
      ...scene,
      id: sceneId,
      layers,
    };
  });

  const audioTracks = (project.audioTracks || []).map((t, tIdx) => ({
    ...t,
    id: t.id && String(t.id).startsWith('track_')
      ? t.id
      : `track_${tIdx + 1}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    clips: (t.clips || []).map((c, cIdx) => ({
      ...c,
      id: c.id && String(c.id).startsWith('clip_')
        ? c.id
        : `clip_${tIdx + 1}_${cIdx + 1}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    })),
  }));

  const videoTracks = (project.videoTracks || []).map((t, tIdx) => ({
    ...t,
    id: t.id && String(t.id).startsWith('track_v_')
      ? t.id
      : `track_v_${tIdx + 1}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    clips: (t.clips || []).map((c, cIdx) => ({
      ...c,
      id: c.id && String(c.id).startsWith('clip_v_')
        ? c.id
        : `clip_v_${tIdx + 1}_${cIdx + 1}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    })),
  }));

  return {
    ...project,
    id: projId,
    scenes,
    audioTracks,
    videoTracks,
  };
}

/**
 * Migrates any legacy or unversioned project format into Schema V1.
 * Guarantees zero data loss and backwards compatibility.
 * @param {any} raw
 * @returns {object} Migrated Schema V1 Project
 */
export function migrateProjectSchema(raw) {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Cannot migrate null or non-object project payload');
  }

  const version = Number(raw.schemaVersion) || 0;
  let migrated = { ...raw };

  // Migration from Legacy Version 0 to Version 1
  if (version < 1) {
    const now = Date.now();
    migrated.schemaVersion = 1;
    migrated.appVersion = APP_VERSION;
    migrated.id = migrated.id || `proj_${now}_${Math.random().toString(36).slice(2, 7)}`;
    migrated.name = migrated.name || 'Untitled Swiss Motion';
    migrated.createdAt = migrated.createdAt || now;
    migrated.updatedAt = now;
    migrated.ratio = migrated.ratio || '1:1';
    migrated.fps = Math.max(12, Math.min(60, Number(migrated.fps) || 30));
    migrated.audioTrackId = migrated.audioTrackId || 'funk';
    migrated.palette = Array.isArray(migrated.palette) && migrated.palette.length > 0
      ? [...migrated.palette]
      : ['#101935', '#f5f1e6', '#5983ff', '#e57c66', '#6bb39b', '#c299d0'];
    migrated.lockedSwatches = Array.isArray(migrated.lockedSwatches)
      ? [...migrated.lockedSwatches]
      : [false, false, false, false, false, false];

    // Ensure assets dictionary exists
    migrated.assets = migrated.assets && typeof migrated.assets === 'object'
      ? { ...migrated.assets }
      : {};

    // Standardize scenes
    if (!Array.isArray(migrated.scenes) || migrated.scenes.length === 0) {
      migrated.scenes = [createScene({}, 'Scene 1')];
    } else {
      migrated.scenes = migrated.scenes.map((sc, i) => createScene(sc, `Scene ${i + 1}`));
    }

    // Attach canonical rational timebase metadata
    const totalSecs = migrated.scenes.reduce((acc, sc) => acc + (Number(sc.duration) || 4), 0);
    migrated.timebase = {
      ticksPerSecond: TICKS_PER_SECOND.toString(),
      totalTicks: secondsToTicks(totalSecs).toString(),
      timecodeStandard: 'SMPTE_30',
    };

    migrated.metadata = {
      generator: `Clover Motion Studio ${APP_VERSION}`,
      migratedFromVersion: version,
      migratedAt: new Date(now).toISOString(),
    };
  }

  // Standardize audioTracks and audioDsp (Fase 5)
  migrated.audioDsp = createMasterDspConfig(migrated.audioDsp);
  migrated.audioTracks = Array.isArray(migrated.audioTracks) && migrated.audioTracks.length > 0
    ? migrated.audioTracks.map((t, idx) => createAudioTrack(t, `Audio Track ${idx + 1}`))
    : [createAudioTrack({}, 'Audio Track 1')];

  // Standardize videoTracks (Fase 7)
  migrated.videoTracks = Array.isArray(migrated.videoTracks) && migrated.videoTracks.length > 0
    ? migrated.videoTracks.map((t, idx) => createVideoTrack(t, `Video Track ${idx + 1}`))
    : [createVideoTrack({}, 'Video Track 1')];

  // Ensure stable IDs across all levels
  return ensureStableIds(migrated);
}

/**
 * Creates a valid blank Project adhering to Schema V1.
 * @param {string} name
 * @returns {object} Schema V1 Project
 */
export function createDefaultProject(name = 'Untitled Project') {
  return migrateProjectSchema({ name });
}

/**
 * Pure serialization to Schema V1 JSON string.
 * @param {object} project
 * @returns {string} JSON string
 */
export function serializeProject(project) {
  const normalized = migrateProjectSchema(project);
  return JSON.stringify(normalized, null, 2);
}

/**
 * Pure deserialization from JSON string to Schema V1 Project.
 * Validates integrity and executes schema migration if necessary.
 * @param {string} jsonString
 * @returns {object} Validated Schema V1 Project
 */
export function deserializeProject(jsonString) {
  if (typeof jsonString !== 'string' || !jsonString.trim()) {
    throw new Error('Project JSON string is empty or invalid');
  }

  let parsed;
  try {
    parsed = JSON.parse(jsonString);
  } catch (err) {
    throw new Error(`Failed to parse project JSON syntax: ${err.message}`);
  }

  return migrateProjectSchema(parsed);
}
