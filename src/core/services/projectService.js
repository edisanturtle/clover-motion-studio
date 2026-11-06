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
 */
export function updateShowcaseConfig(project, patch = {}) {
  if (!project) return project;
  const current = project.showcase || {};
  return {
    ...project,
    showcase: createShowcaseConfig({
      ...current,
      ...patch,
    }),
  };
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
