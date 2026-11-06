/**
 * @file projectService.js
 * @description Application Domain Services (Hexagonal Architecture / Inbound Port)
 * Handles all state transitions for scenes, layers, showcase geometry, and responsive formatting.
 * Pure, side-effect free, and guarantees that modifying one aspect never corrupts others.
 */

import { createScene, createShowcaseConfig, createTextLayer } from '../domain/models.js';

/**
 * Adds a new scene to the project, inheriting the palette and ratio while generating
 * unique IDs and maintaining clean timeline state.
 */
export function addScene(project, sourceIndex = null) {
  if (!project) return project;
  const scenes = project.scenes || [];
  const src = (sourceIndex !== null && scenes[sourceIndex])
    ? scenes[sourceIndex]
    : scenes[scenes.length - 1] || null;

  let newScene;
  if (src) {
    // Deep clone with freshly generated IDs for scene & layers
    const clonedLayers = (src.layers || []).map((l) => ({
      ...l,
      id: `layer_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    }));
    newScene = createScene({
      ...src,
      id: `scene_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: `Scene ${scenes.length + 1}`,
      layers: clonedLayers,
    });
  } else {
    newScene = createScene({}, `Scene ${scenes.length + 1}`);
  }

  return {
    ...project,
    scenes: [...scenes, newScene],
  };
}

/**
 * Duplicates a scene cleanly at a specific index.
 */
export function duplicateScene(project, index) {
  if (!project || !project.scenes || !project.scenes[index]) return project;
  const scenes = [...project.scenes];
  const target = scenes[index];

  const clonedLayers = (target.layers || []).map((l) => ({
    ...l,
    id: `layer_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
  }));

  const cloned = createScene({
    ...target,
    id: `scene_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    name: `${target.name} Copy`,
    layers: clonedLayers,
  });

  scenes.splice(index + 1, 0, cloned);
  return { ...project, scenes };
}

/**
 * Deletes a scene safely. Always maintains at least one active scene.
 */
export function deleteScene(project, index) {
  if (!project || !project.scenes || project.scenes.length <= 1) return project;
  return {
    ...project,
    scenes: project.scenes.filter((_, i) => i !== index),
  };
}

/**
 * Updates a scene property (duration, bg, transition, name) idempotently.
 */
export function updateSceneProp(project, sceneIndex, key, value) {
  if (!project || !project.scenes || !project.scenes[sceneIndex]) return project;
  const updatedScenes = project.scenes.map((sc, idx) =>
    idx !== sceneIndex ? sc : { ...sc, [key]: value }
  );
  return { ...project, scenes: updatedScenes };
}

/**
 * Updates showcase configuration with domain validation and effect parameters.
 * Supports per-scene targeting or global project synchronization.
 */
export function updateShowcaseConfig(project, sceneIndex = null, patch = {}, applyToAll = false) {
  if (!project) return project;

  // Handle case where patch was passed as first argument for backwards compatibility
  let actualPatch = patch;
  let actualIdx = sceneIndex;
  let actualApplyToAll = applyToAll;
  if (typeof sceneIndex === 'object' && sceneIndex !== null && !('length' in sceneIndex)) {
    actualPatch = sceneIndex;
    actualIdx = null;
    actualApplyToAll = true;
  }

  const baseShowcase = (actualIdx !== null && project.scenes?.[actualIdx]?.showcase)
    || project.showcase
    || {};

  const merged = createShowcaseConfig({
    ...baseShowcase,
    ...actualPatch,
  });

  if (actualApplyToAll || actualIdx === null || !project.scenes?.[actualIdx]) {
    // Apply globally
    return {
      ...project,
      showcase: merged,
      scenes: (project.scenes || []).map((sc) => ({
        ...sc,
        showcase: createShowcaseConfig({
          ...(sc.showcase || {}),
          ...actualPatch,
        }),
      })),
    };
  }

  // Apply to specific scene only
  const updatedScenes = project.scenes.map((sc, idx) =>
    idx !== actualIdx
      ? sc
      : {
          ...sc,
          showcase: merged,
        }
  );

  return { ...project, scenes: updatedScenes };
}

/**
 * Updates per-scene sound configuration (track, entrance SFX, volume).
 */
export function updateSceneAudio(project, sceneIndex, patch = {}) {
  if (!project || !project.scenes || !project.scenes[sceneIndex]) return project;
  const updatedScenes = project.scenes.map((sc, idx) => {
    if (idx !== sceneIndex) return sc;
    return {
      ...sc,
      ...(patch.audioTrackId !== undefined && { audioTrackId: patch.audioTrackId }),
      ...(patch.sfxOnEnter !== undefined && { sfxOnEnter: patch.sfxOnEnter }),
      ...(patch.audioVolume !== undefined && { audioVolume: Number(patch.audioVolume) }),
      ...(patch.customAudioName !== undefined && { customAudioName: patch.customAudioName }),
    };
  });
  return { ...project, scenes: updatedScenes };
}

/**
 * Updates per-scene motion preset, dynamics curve, speed multiplier, or transition.
 */
export function updateSceneMotion(project, sceneIndex, patch = {}, applyToAll = false) {
  if (!project || !project.scenes) return project;
  const updatedScenes = project.scenes.map((sc, idx) => {
    if (!applyToAll && idx !== sceneIndex) return sc;
    return {
      ...sc,
      ...(patch.motionPreset !== undefined && { motionPreset: patch.motionPreset }),
      ...(patch.motionCurve !== undefined && { motionCurve: patch.motionCurve }),
      ...(patch.motionSpeed !== undefined && { motionSpeed: Number(patch.motionSpeed) }),
      ...(patch.transition !== undefined && { transition: patch.transition }),
    };
  });
  return { ...project, scenes: updatedScenes };
}

/**
 * Updates per-scene design attributes (bg color, palette, shader background, FX rack, poster layout).
 */
export function updateSceneDesign(project, sceneIndex, patch = {}, applyToAll = false) {
  if (!project || !project.scenes) return project;
  const updatedScenes = project.scenes.map((sc, idx) => {
    if (!applyToAll && idx !== sceneIndex) return sc;
    return {
      ...sc,
      ...(patch.bg !== undefined && { bg: patch.bg }),
      ...(patch.palette !== undefined && { palette: [...patch.palette] }),
      ...(patch.shaderBg !== undefined && { shaderBg: patch.shaderBg }),
      ...(patch.shaderOpacity !== undefined && { shaderOpacity: Number(patch.shaderOpacity) }),
      ...(patch.fxRack !== undefined && { fxRack: { ...(sc.fxRack || {}), ...patch.fxRack } }),
      ...(patch.gridStyle !== undefined && { gridStyle: patch.gridStyle }),
      ...(patch.decorStyle !== undefined && { decorStyle: patch.decorStyle }),
      ...(patch.posterLayout !== undefined && { posterLayout: patch.posterLayout }),
    };
  });

  return {
    ...project,
    scenes: updatedScenes,
    ...(applyToAll && patch.palette && { palette: patch.palette }),
    ...(applyToAll && patch.shaderBg && { shaderBg: patch.shaderBg }),
    ...(applyToAll && patch.fxRack && { fxRack: { ...(project.fxRack || {}), ...patch.fxRack } }),
  };
}

/**
 * Updates per-scene media slots (images or cards used in 3D showcases and graphic layouts).
 */
export function updateSceneMediaSlots(project, sceneIndex, mediaSlots = [], applyToAll = false) {
  if (!project || !project.scenes) return project;
  if (applyToAll || sceneIndex === null) {
    return {
      ...project,
      mediaSlots,
      scenes: project.scenes.map((sc) => ({ ...sc, mediaSlots })),
    };
  }
  const updatedScenes = project.scenes.map((sc, idx) =>
    idx !== sceneIndex ? sc : { ...sc, mediaSlots }
  );
  return { ...project, scenes: updatedScenes };
}

/**
 * Updates a layer within a specific scene.
 */
export function updateLayer(project, sceneIndex, layerId, patch = {}) {
  if (!project || !project.scenes || !project.scenes[sceneIndex]) return project;
  const updatedScenes = project.scenes.map((sc, sIdx) => {
    if (sIdx !== sceneIndex) return sc;
    return {
      ...sc,
      layers: (sc.layers || []).map((l) =>
        l.id !== layerId ? l : { ...l, ...patch }
      ),
    };
  });
  return { ...project, scenes: updatedScenes };
}

/**
 * Reorders layers within a scene (z-index hierarchy).
 */
export function reorderLayers(project, sceneIndex, fromIdx, toIdx) {
  if (!project || !project.scenes || !project.scenes[sceneIndex]) return project;
  const sc = project.scenes[sceneIndex];
  const layers = [...(sc.layers || [])];
  if (fromIdx < 0 || fromIdx >= layers.length || toIdx < 0 || toIdx >= layers.length) {
    return project;
  }
  const [removed] = layers.splice(fromIdx, 1);
  layers.splice(toIdx, 0, removed);

  const updatedScenes = project.scenes.map((s, idx) =>
    idx !== sceneIndex ? s : { ...s, layers }
  );
  return { ...project, scenes: updatedScenes };
}
