/**
 * @file projectService.js
 * @description Application Domain Services (Hexagonal Architecture / Inbound Port)
 * Handles all state transitions for scenes, layers, showcase geometry, and responsive formatting.
 * Pure, side-effect free, and guarantees that modifying one aspect never corrupts others.
 */

import {
  createScene,
  createShowcaseConfig,
  createTextLayer,
  createShapeLayer,
  createImageLayer,
  createKeyframe,
  createMarker,
} from '../domain/models.js';
import {
  createAudioTrack,
  createAudioClip,
  createMasterDspConfig,
} from '../domain/audioModels.js';
import {
  trimClipInTrack,
  splitClipInTrack,
  setClipGainPanInTrack,
  setClipFadeInTrack,
  setClipLoopInTrack,
  moveClipInTrack,
  deleteClipFromTrack,
} from './audioService.js';
import {
  createVideoTrack,
  createVideoClip,
} from '../domain/videoModels.js';
import {
  splitVideoClip,
  trimVideoClip,
  rippleDeleteVideoClip,
  updateVideoClipTransform,
  updateVideoClipCrop,
  setVideoClipTransition,
} from './videoService.js';
import {
  setLayerFormatOverride,
  removeLayerFormatOverride,
} from '../domain/layoutVariants.js';
import { createDefaultProject } from '../domain/projectSchema.js';
import { createVectorPathLayer } from '../domain/vectorPathModels.js';
import {
  addEffectToStack,
  updateEffectInStack,
  reorderEffectInStack,
  toggleEffectInStack,
  removeEffectFromStack,
} from './effectStackService.js';

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

// ==========================================
// Fase 3: Design Canvas & Object Hierarchy
// ==========================================

export function addShapeLayerToScene(project, sceneIndex, shapeType = 'rectangle', init = {}) {
  if (!project || !project.scenes || !project.scenes[sceneIndex]) return { project, newLayerId: null };
  const layer = createShapeLayer({ ...init, shapeType });
  const updatedScenes = project.scenes.map((sc, idx) => {
    if (idx !== sceneIndex) return sc;
    return {
      ...sc,
      layers: [...(sc.layers || []), layer],
    };
  });
  return { project: { ...project, scenes: updatedScenes }, newLayerId: layer.id };
}

export function addImageLayerToScene(project, sceneIndex, init = {}) {
  if (!project || !project.scenes || !project.scenes[sceneIndex]) return { project, newLayerId: null };
  const layer = createImageLayer(init);
  const updatedScenes = project.scenes.map((sc, idx) => {
    if (idx !== sceneIndex) return sc;
    return {
      ...sc,
      layers: [...(sc.layers || []), layer],
    };
  });
  return { project: { ...project, scenes: updatedScenes }, newLayerId: layer.id };
}

export function addTextLayerToScene(project, sceneIndex, init = {}) {
  if (!project || !project.scenes || !project.scenes[sceneIndex]) return { project, newLayerId: null };
  const layer = createTextLayer(init);
  const updatedScenes = project.scenes.map((sc, idx) => {
    if (idx !== sceneIndex) return sc;
    return {
      ...sc,
      layers: [...(sc.layers || []), layer],
    };
  });
  return { project: { ...project, scenes: updatedScenes }, newLayerId: layer.id };
}

export function deleteLayersFromScene(project, sceneIndex, layerIds = []) {
  if (!project || !project.scenes || !project.scenes[sceneIndex]) return project;
  const idSet = new Set(layerIds);
  const updatedScenes = project.scenes.map((sc, idx) => {
    if (idx !== sceneIndex) return sc;
    return {
      ...sc,
      layers: (sc.layers || []).filter((l) => !idSet.has(l.id)),
    };
  });
  return { ...project, scenes: updatedScenes };
}

export function duplicateLayersInScene(project, sceneIndex, layerIds = [], offset = 20) {
  if (!project || !project.scenes || !project.scenes[sceneIndex]) return project;
  const idSet = new Set(layerIds);
  const updatedScenes = project.scenes.map((sc, idx) => {
    if (idx !== sceneIndex) return sc;
    const current = sc.layers || [];
    const clones = current
      .filter((l) => idSet.has(l.id))
      .map((l) => ({
        ...l,
        id: `layer_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        x: (l.x || 0) + offset,
        y: (l.y || 0) + offset,
      }));
    return {
      ...sc,
      layers: [...current, ...clones],
    };
  });
  return { ...project, scenes: updatedScenes };
}

export function groupLayersInScene(project, sceneIndex, layerIds = []) {
  if (!project || !project.scenes || !project.scenes[sceneIndex]) return { project, groupId: null };
  const groupId = `group_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const idSet = new Set(layerIds);
  const updatedScenes = project.scenes.map((sc, idx) => {
    if (idx !== sceneIndex) return sc;
    return {
      ...sc,
      layers: (sc.layers || []).map((l) => (idSet.has(l.id) ? { ...l, groupId } : l)),
    };
  });
  return { project: { ...project, scenes: updatedScenes }, groupId };
}

export function ungroupLayersInScene(project, sceneIndex, layerIds = []) {
  if (!project || !project.scenes || !project.scenes[sceneIndex]) return project;
  const targetLayers = project.scenes[sceneIndex].layers.filter((l) => layerIds.includes(l.id));
  const groupIdsToDissolve = new Set(targetLayers.map((l) => l.groupId).filter(Boolean));
  const updatedScenes = project.scenes.map((sc, idx) => {
    if (idx !== sceneIndex) return sc;
    return {
      ...sc,
      layers: (sc.layers || []).map((l) => (groupIdsToDissolve.has(l.groupId) ? { ...l, groupId: null } : l)),
    };
  });
  return { ...project, scenes: updatedScenes };
}

export function alignLayersInScene(project, sceneIndex, layerIds = [], alignType = 'center', canvasWidth = 1080, canvasHeight = 1350) {
  if (!project || !project.scenes || !project.scenes[sceneIndex] || !layerIds.length) return project;
  const sc = project.scenes[sceneIndex];
  const selected = (sc.layers || []).filter((l) => layerIds.includes(l.id));
  if (!selected.length) return project;

  let targetVal = 0;
  if (selected.length === 1) {
    if (alignType === 'left') targetVal = 0;
    else if (alignType === 'center') targetVal = canvasWidth / 2;
    else if (alignType === 'right') targetVal = canvasWidth;
    else if (alignType === 'top') targetVal = 0;
    else if (alignType === 'middle') targetVal = canvasHeight / 2;
    else if (alignType === 'bottom') targetVal = canvasHeight;
  } else {
    const xs = selected.map((l) => l.x || 0);
    const ys = selected.map((l) => l.y || 0);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);

    if (alignType === 'left') targetVal = minX;
    else if (alignType === 'center') targetVal = (minX + maxX) / 2;
    else if (alignType === 'right') targetVal = maxX;
    else if (alignType === 'top') targetVal = minY;
    else if (alignType === 'middle') targetVal = (minY + maxY) / 2;
    else if (alignType === 'bottom') targetVal = maxY;
  }

  const isX = ['left', 'center', 'right'].includes(alignType);
  const updatedScenes = project.scenes.map((scene, idx) => {
    if (idx !== sceneIndex) return scene;
    return {
      ...scene,
      layers: (scene.layers || []).map((l) => {
        if (!layerIds.includes(l.id)) return l;
        return isX ? { ...l, x: targetVal } : { ...l, y: targetVal };
      }),
    };
  });
  return { ...project, scenes: updatedScenes };
}

export function distributeLayersInScene(project, sceneIndex, layerIds = [], axis = 'horizontal') {
  if (!project || !project.scenes || !project.scenes[sceneIndex] || layerIds.length < 3) return project;
  const sc = project.scenes[sceneIndex];
  const selected = (sc.layers || []).filter((l) => layerIds.includes(l.id));
  const isX = axis === 'horizontal';

  selected.sort((a, b) => (isX ? (a.x || 0) - (b.x || 0) : (a.y || 0) - (b.y || 0)));
  const minCoord = isX ? selected[0].x : selected[0].y;
  const maxCoord = isX ? selected[selected.length - 1].x : selected[selected.length - 1].y;
  const step = (maxCoord - minCoord) / (selected.length - 1);

  const coordMap = new Map();
  selected.forEach((l, i) => {
    coordMap.set(l.id, minCoord + i * step);
  });

  const updatedScenes = project.scenes.map((scene, idx) => {
    if (idx !== sceneIndex) return scene;
    return {
      ...scene,
      layers: (scene.layers || []).map((l) => {
        if (!coordMap.has(l.id)) return l;
        return isX ? { ...l, x: coordMap.get(l.id) } : { ...l, y: coordMap.get(l.id) };
      }),
    };
  });
  return { ...project, scenes: updatedScenes };
}

export function reorderLayersZ(project, sceneIndex, layerIds = [], direction = 'bringForward') {
  if (!project || !project.scenes || !project.scenes[sceneIndex] || !layerIds.length) return project;
  const sc = project.scenes[sceneIndex];
  const layers = [...(sc.layers || [])];
  const idSet = new Set(layerIds);

  if (direction === 'bringToFront') {
    const unselected = layers.filter((l) => !idSet.has(l.id));
    const selected = layers.filter((l) => idSet.has(l.id));
    layers.length = 0;
    layers.push(...unselected, ...selected);
  } else if (direction === 'sendToBack') {
    const selected = layers.filter((l) => idSet.has(l.id));
    const unselected = layers.filter((l) => !idSet.has(l.id));
    layers.length = 0;
    layers.push(...selected, ...unselected);
  } else if (direction === 'bringForward') {
    for (let i = layers.length - 2; i >= 0; i--) {
      if (idSet.has(layers[i].id) && !idSet.has(layers[i + 1].id)) {
        const temp = layers[i];
        layers[i] = layers[i + 1];
        layers[i + 1] = temp;
      }
    }
  } else if (direction === 'sendBackward') {
    for (let i = 1; i < layers.length; i++) {
      if (idSet.has(layers[i].id) && !idSet.has(layers[i - 1].id)) {
        const temp = layers[i];
        layers[i] = layers[i - 1];
        layers[i - 1] = temp;
      }
    }
  }

  const updatedScenes = project.scenes.map((scene, idx) =>
    idx !== sceneIndex ? scene : { ...scene, layers }
  );
  return { ...project, scenes: updatedScenes };
}

// ==========================================
// Fase 4: Keyframe & Animation Services
// ==========================================

export function addKeyframeToLayer(project, sceneIndex, layerId, keyframeData = {}) {
  if (!project || !project.scenes || !project.scenes[sceneIndex]) return { project, keyframe: null };
  const newKf = createKeyframe(keyframeData);

  const updatedScenes = project.scenes.map((sc, sIdx) => {
    if (sIdx !== sceneIndex) return sc;
    return {
      ...sc,
      layers: (sc.layers || []).map((l) => {
        if (l.id !== layerId) return l;
        const currentKfs = l.keyframes || [];
        const existingIdx = currentKfs.findIndex(
          (k) => k.property === newKf.property && Math.abs(k.time - newKf.time) < 0.001
        );
        let nextKfs;
        if (existingIdx >= 0) {
          nextKfs = [...currentKfs];
          nextKfs[existingIdx] = { ...currentKfs[existingIdx], ...newKf };
        } else {
          nextKfs = [...currentKfs, newKf].sort((a, b) => a.time - b.time);
        }
        return { ...l, keyframes: nextKfs };
      }),
    };
  });
  return { project: { ...project, scenes: updatedScenes }, keyframe: newKf };
}

export function updateKeyframeInLayer(project, sceneIndex, layerId, keyframeId, patch = {}) {
  if (!project || !project.scenes || !project.scenes[sceneIndex]) return project;
  const updatedScenes = project.scenes.map((sc, sIdx) => {
    if (sIdx !== sceneIndex) return sc;
    return {
      ...sc,
      layers: (sc.layers || []).map((l) => {
        if (l.id !== layerId) return l;
        const nextKfs = (l.keyframes || [])
          .map((k) => (k.id === keyframeId ? { ...k, ...patch } : k))
          .sort((a, b) => a.time - b.time);
        return { ...l, keyframes: nextKfs };
      }),
    };
  });
  return { ...project, scenes: updatedScenes };
}

export function deleteKeyframesFromLayer(project, sceneIndex, layerId, keyframeIds = []) {
  if (!project || !project.scenes || !project.scenes[sceneIndex]) return project;
  const idSet = new Set(keyframeIds);
  const updatedScenes = project.scenes.map((sc, sIdx) => {
    if (sIdx !== sceneIndex) return sc;
    return {
      ...sc,
      layers: (sc.layers || []).map((l) => {
        if (l.id !== layerId) return l;
        return {
          ...l,
          keyframes: (l.keyframes || []).filter((k) => !idSet.has(k.id)),
        };
      }),
    };
  });
  return { ...project, scenes: updatedScenes };
}

export function duplicateKeyframesInLayer(project, sceneIndex, layerId, keyframeIds = [], timeOffset = 0.5) {
  if (!project || !project.scenes || !project.scenes[sceneIndex]) return project;
  const idSet = new Set(keyframeIds);
  const updatedScenes = project.scenes.map((sc, sIdx) => {
    if (sIdx !== sceneIndex) return sc;
    return {
      ...sc,
      layers: (sc.layers || []).map((l) => {
        if (l.id !== layerId) return l;
        const currentKfs = l.keyframes || [];
        const toDup = currentKfs.filter((k) => idSet.has(k.id));
        const duplicates = toDup.map((k) =>
          createKeyframe({
            ...k,
            id: undefined,
            time: Math.max(0, k.time + timeOffset),
          })
        );
        const nextKfs = [...currentKfs, ...duplicates].sort((a, b) => a.time - b.time);
        return { ...l, keyframes: nextKfs };
      }),
    };
  });
  return { ...project, scenes: updatedScenes };
}

export function pasteKeyframesToLayer(project, sceneIndex, layerId, keyframes = [], targetTime = 0, fps = 30) {
  if (!project || !project.scenes || !project.scenes[sceneIndex] || !keyframes.length) return project;
  const minTime = Math.min(...keyframes.map((k) => k.time || 0));
  const newKeyframes = keyframes.map((k) => {
    const rawTime = Math.max(0, targetTime + ((k.time || 0) - minTime));
    const snappedTime = Number((Math.round(rawTime * fps) / fps).toFixed(3));
    return createKeyframe({
      ...k,
      id: undefined,
      time: snappedTime,
    });
  });

  const updatedScenes = project.scenes.map((sc, sIdx) => {
    if (sIdx !== sceneIndex) return sc;
    return {
      ...sc,
      layers: (sc.layers || []).map((l) => {
        if (l.id !== layerId) return l;
        const nextKfs = [...(l.keyframes || []), ...newKeyframes].sort((a, b) => a.time - b.time);
        return { ...l, keyframes: nextKfs };
      }),
    };
  });
  return { ...project, scenes: updatedScenes };
}

export function addMarkerToScene(project, sceneIndex, markerData = {}) {
  if (!project || !project.scenes || !project.scenes[sceneIndex]) return project;
  const marker = createMarker(markerData);
  const updatedScenes = project.scenes.map((sc, idx) => {
    if (idx !== sceneIndex) return sc;
    return {
      ...sc,
      markers: [...(sc.markers || []), marker].sort((a, b) => a.time - b.time),
    };
  });
  return { ...project, scenes: updatedScenes };
}

export function deleteMarkerFromScene(project, sceneIndex, markerId) {
  if (!project || !project.scenes || !project.scenes[sceneIndex]) return project;
  const updatedScenes = project.scenes.map((sc, idx) => {
    if (idx !== sceneIndex) return sc;
    return {
      ...sc,
      markers: (sc.markers || []).filter((m) => m.id !== markerId),
    };
  });
  return { ...project, scenes: updatedScenes };
}

// ==========================================
// Fase 5: Multi-Track Audio & Master DSP
// ==========================================

export function addAudioTrackToProject(project, name) {
  if (!project) return project;
  const tracks = project.audioTracks || [];
  const trackNum = tracks.length + 1;
  const newTrack = createAudioTrack({}, name || `Audio Track ${trackNum}`);
  return {
    ...project,
    audioTracks: [...tracks, newTrack],
  };
}

export function deleteAudioTrackFromProject(project, trackId) {
  if (!project || !project.audioTracks) return project;
  return {
    ...project,
    audioTracks: project.audioTracks.filter((t) => t.id !== trackId),
  };
}

export function updateAudioTrackInProject(project, trackId, patch = {}) {
  if (!project || !project.audioTracks) return project;
  return {
    ...project,
    audioTracks: project.audioTracks.map((t) => (t.id === trackId ? { ...t, ...patch } : t)),
  };
}

export function addAudioClipToTrackInProject(project, trackId, clipData = {}) {
  if (!project || !project.audioTracks) return project;
  const clip = createAudioClip(clipData);
  return {
    ...project,
    audioTracks: project.audioTracks.map((t) =>
      t.id === trackId ? { ...t, clips: [...(t.clips || []), clip] } : t
    ),
  };
}

export function updateAudioClipInProject(project, clipId, patch = {}) {
  if (!project || !project.audioTracks) return project;
  return {
    ...project,
    audioTracks: project.audioTracks.map((track) => ({
      ...track,
      clips: (track.clips || []).map((c) => (c.id === clipId ? { ...c, ...patch } : c)),
    })),
  };
}

export function trimAudioClipInProject(project, clipId, trimIn, trimOut) {
  if (!project || !project.audioTracks) return project;
  return {
    ...project,
    audioTracks: project.audioTracks.map((track) =>
      track.clips?.some((c) => c.id === clipId)
        ? trimClipInTrack(track, clipId, trimIn, trimOut)
        : track
    ),
  };
}

export function splitAudioClipInProject(project, clipId, splitTime) {
  if (!project || !project.audioTracks) return project;
  return {
    ...project,
    audioTracks: project.audioTracks.map((track) =>
      track.clips?.some((c) => c.id === clipId)
        ? splitClipInTrack(track, clipId, splitTime)
        : track
    ),
  };
}

export function deleteAudioClipFromProject(project, clipId) {
  if (!project || !project.audioTracks) return project;
  return {
    ...project,
    audioTracks: project.audioTracks.map((track) =>
      track.clips?.some((c) => c.id === clipId)
        ? deleteClipFromTrack(track, clipId)
        : track
    ),
  };
}

export function updateMasterDspInProject(project, dspPatch = {}) {
  if (!project) return project;
  const currentDsp = project.audioDsp || {};
  const mergedEq = {
    ...(currentDsp.eq || {}),
    bassGain: dspPatch.bassGain ?? dspPatch.eq?.bassGain ?? currentDsp.eq?.bassGain,
    midGain: dspPatch.midGain ?? dspPatch.eq?.midGain ?? currentDsp.eq?.midGain,
    trebleGain: dspPatch.trebleGain ?? dspPatch.eq?.trebleGain ?? currentDsp.eq?.trebleGain,
    lowpassFreq: dspPatch.lowpassFreq ?? dspPatch.eq?.lowpassFreq ?? currentDsp.eq?.lowpassFreq,
  };
  const mergedDelay = {
    ...(currentDsp.delay || {}),
    mix: dspPatch.delayMix ?? dspPatch.delay?.mix ?? currentDsp.delay?.mix,
    time: dspPatch.delayTime ?? dspPatch.delay?.time ?? currentDsp.delay?.time,
    feedback: dspPatch.delayFeedback ?? dspPatch.delay?.feedback ?? currentDsp.delay?.feedback,
  };
  const mergedReverb = {
    ...(currentDsp.reverb || {}),
    mix: dspPatch.reverbMix ?? dspPatch.reverb?.mix ?? currentDsp.reverb?.mix,
    decay: dspPatch.reverbDecay ?? dspPatch.reverb?.decay ?? currentDsp.reverb?.decay,
  };

  return {
    ...project,
    audioDsp: createMasterDspConfig({
      ...currentDsp,
      ...dspPatch,
      eq: mergedEq,
      delay: mergedDelay,
      reverb: mergedReverb,
    }),
  };
}

// ==========================================
// Fase 7: Video Tracks, Clips & Editing Mutators
// ==========================================

export function addVideoTrackToProject(project, name) {
  if (!project) return project;
  const tracks = project.videoTracks || [];
  const trackNum = tracks.length + 1;
  const newTrack = createVideoTrack({}, name || `Video Track ${trackNum}`);
  return {
    ...project,
    videoTracks: [...tracks, newTrack],
  };
}

export function deleteVideoTrackFromProject(project, trackId) {
  if (!project || !project.videoTracks) return project;
  return {
    ...project,
    videoTracks: project.videoTracks.filter((t) => t.id !== trackId),
  };
}

export function updateVideoTrackInProject(project, trackId, patch = {}) {
  if (!project || !project.videoTracks) return project;
  return {
    ...project,
    videoTracks: project.videoTracks.map((t) => (t.id === trackId ? { ...t, ...patch } : t)),
  };
}

export function addVideoClipToTrackInProject(project, trackId, clipData = {}) {
  if (!project || !project.videoTracks) return project;
  const clip = createVideoClip(clipData);
  return {
    ...project,
    videoTracks: project.videoTracks.map((t) =>
      t.id === trackId ? { ...t, clips: [...(t.clips || []), clip] } : t
    ),
  };
}

export function updateVideoClipInProject(project, clipId, patch = {}) {
  if (!project || !project.videoTracks) return project;
  return {
    ...project,
    videoTracks: project.videoTracks.map((track) => ({
      ...track,
      clips: (track.clips || []).map((c) => (c.id === clipId ? { ...c, ...patch } : c)),
    })),
  };
}

export function splitVideoClipInProject(project, clipId, splitTime) {
  if (!project || !project.videoTracks) return project;
  return {
    ...project,
    videoTracks: project.videoTracks.map((track) =>
      track.clips?.some((c) => c.id === clipId)
        ? splitVideoClip(track, clipId, splitTime)
        : track
    ),
  };
}

export function trimVideoClipInProject(project, clipId, trimIn, trimOut) {
  if (!project || !project.videoTracks) return project;
  return {
    ...project,
    videoTracks: project.videoTracks.map((track) =>
      track.clips?.some((c) => c.id === clipId)
        ? trimVideoClip(track, clipId, trimIn, trimOut)
        : track
    ),
  };
}

export function rippleDeleteVideoClipInProject(project, clipId) {
  if (!project || !project.videoTracks) return project;
  return {
    ...project,
    videoTracks: project.videoTracks.map((track) =>
      track.clips?.some((c) => c.id === clipId)
        ? rippleDeleteVideoClip(track, clipId)
        : track
    ),
  };
}

export function updateVideoClipTransformInProject(project, clipId, transformPatch) {
  if (!project || !project.videoTracks) return project;
  return {
    ...project,
    videoTracks: project.videoTracks.map((track) =>
      track.clips?.some((c) => c.id === clipId)
        ? updateVideoClipTransform(track, clipId, transformPatch)
        : track
    ),
  };
}

export function updateVideoClipCropInProject(project, clipId, cropPatch) {
  if (!project || !project.videoTracks) return project;
  return {
    ...project,
    videoTracks: project.videoTracks.map((track) =>
      track.clips?.some((c) => c.id === clipId)
        ? updateVideoClipCrop(track, clipId, cropPatch)
        : track
    ),
  };
}

export function setVideoClipTransitionInProject(project, clipId, edge, transition) {
  if (!project || !project.videoTracks) return project;
  return {
    ...project,
    videoTracks: project.videoTracks.map((track) =>
      track.clips?.some((c) => c.id === clipId)
        ? setVideoClipTransition(track, clipId, edge, transition)
        : track
    ),
  };
}

export function updateVideoClipCaptionsInProject(project, clipId, captions) {
  if (!project || !project.videoTracks) return project;
  return {
    ...project,
    videoTracks: project.videoTracks.map((track) => ({
      ...track,
      clips: (track.clips || []).map((c) => (c.id === clipId ? { ...c, captions } : c)),
    })),
  };
}

// ==========================================
// Fase 8: Multi-Format Layout Overrides
// ==========================================

export function setLayerFormatOverrideInProject(project, sceneId, layerId, formatRatio, layoutPatch) {
  if (!project || !project.scenes) return project;
  return {
    ...project,
    scenes: project.scenes.map((scene) => {
      if (scene.id !== sceneId) return scene;
      return {
        ...scene,
        layers: (scene.layers || []).map((layer) => {
          if (layer.id !== layerId) return layer;
          return setLayerFormatOverride(layer, formatRatio, layoutPatch);
        }),
      };
    }),
  };
}

export function removeLayerFormatOverrideInProject(project, sceneId, layerId, formatRatio) {
  if (!project || !project.scenes) return project;
  return {
    ...project,
    scenes: project.scenes.map((scene) => {
      if (scene.id !== sceneId) return scene;
      return {
        ...scene,
        layers: (scene.layers || []).map((layer) => {
          if (layer.id !== layerId) return layer;
          return removeLayerFormatOverride(layer, formatRatio);
        }),
      };
    }),
  };
}

export { createDefaultProject };

// ==========================================
// Fase 9: Vector Paths & Non-Destructive Effects
// ==========================================

export function addVectorPathLayerToScene(project, sceneId, pathInit = {}) {
  if (!project || !project.scenes) return project;
  const newPathLayer = createVectorPathLayer(pathInit);
  return {
    ...project,
    scenes: project.scenes.map((scene) => {
      if (scene.id !== sceneId) return scene;
      return {
        ...scene,
        layers: [...(scene.layers || []), newPathLayer],
      };
    }),
  };
}

export function addEffectToLayerInProject(project, sceneId, layerId, effectData = {}) {
  if (!project || !project.scenes) return project;
  return {
    ...project,
    scenes: project.scenes.map((scene) => {
      if (scene.id !== sceneId) return scene;
      return {
        ...scene,
        layers: (scene.layers || []).map((layer) => {
          if (layer.id !== layerId) return layer;
          const currentStack = layer.effects || [];
          return {
            ...layer,
            effects: addEffectToStack(currentStack, effectData),
          };
        }),
      };
    }),
  };
}

export function updateEffectInLayerInProject(project, sceneId, layerId, effectId, patch = {}) {
  if (!project || !project.scenes) return project;
  return {
    ...project,
    scenes: project.scenes.map((scene) => {
      if (scene.id !== sceneId) return scene;
      return {
        ...scene,
        layers: (scene.layers || []).map((layer) => {
          if (layer.id !== layerId) return layer;
          return {
            ...layer,
            effects: updateEffectInStack(layer.effects || [], effectId, patch),
          };
        }),
      };
    }),
  };
}

export function reorderEffectInLayerInProject(project, sceneId, layerId, effectId, newIndex) {
  if (!project || !project.scenes) return project;
  return {
    ...project,
    scenes: project.scenes.map((scene) => {
      if (scene.id !== sceneId) return scene;
      return {
        ...scene,
        layers: (scene.layers || []).map((layer) => {
          if (layer.id !== layerId) return layer;
          return {
            ...layer,
            effects: reorderEffectInStack(layer.effects || [], effectId, newIndex),
          };
        }),
      };
    }),
  };
}

export function toggleEffectInLayerInProject(project, sceneId, layerId, effectId, enabled = null) {
  if (!project || !project.scenes) return project;
  return {
    ...project,
    scenes: project.scenes.map((scene) => {
      if (scene.id !== sceneId) return scene;
      return {
        ...scene,
        layers: (scene.layers || []).map((layer) => {
          if (layer.id !== layerId) return layer;
          return {
            ...layer,
            effects: toggleEffectInStack(layer.effects || [], effectId, enabled),
          };
        }),
      };
    }),
  };
}

export function removeEffectFromLayerInProject(project, sceneId, layerId, effectId) {
  if (!project || !project.scenes) return project;
  return {
    ...project,
    scenes: project.scenes.map((scene) => {
      if (scene.id !== sceneId) return scene;
      return {
        ...scene,
        layers: (scene.layers || []).map((layer) => {
          if (layer.id !== layerId) return layer;
          return {
            ...layer,
            effects: removeEffectFromStack(layer.effects || [], effectId),
          };
        }),
      };
    }),
  };
}
