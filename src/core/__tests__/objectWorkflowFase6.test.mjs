/**
 * @file objectWorkflowFase6.test.mjs
 * @description Comprehensive automated acceptance test for Fase 6 Object Workflow:
 * Lifecycle: Create -> Select -> Edit Precision Properties -> Group/Ungroup -> Reorder Z-Stack ->
 * Duplicate -> Delete -> Undo/Redo -> Save/Reopen Deep Equality, plus full non-finite & NaN resilience.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  addShapeLayerToScene,
  addVectorPathLayerToScene,
  addImageLayerToScene,
  deleteLayersFromScene,
  duplicateLayersInScene,
  groupLayersInScene,
  ungroupLayersInScene,
  reorderLayersZ,
  updateLayer,
} from '../services/projectService.js';
import {
  serializeProject,
  deserializeProject,
  createDefaultProject,
} from '../domain/projectSchema.js';
import { CommandHistoryManager } from '../services/commandHistory.js';
import { getLayerBoundingBox } from '../../engine/canvasRenderer.js';
import { createVectorPathLayer } from '../domain/vectorPathModels.js';

test('Fase 6: Complete Object Workflow & Resilient Property Manipulation', async (t) => {
  let project = createDefaultProject('Fase 6 Object Workflow Suite');
  const history = new CommandHistoryManager();
  const sceneIndex = 0;
  const initialLayerCount = project.scenes[0].layers.length;

  // --------------------------------------------------------------------------
  // 1. CREATE: Shape Layers (rectangle, star) & VectorCraft Bézier Path
  // --------------------------------------------------------------------------
  await t.test('1. Create primitive shape layers and VectorCraft Bézier path layer', () => {
    // Add Shape 1: Rectangle
    const shapeRes1 = addShapeLayerToScene(project, sceneIndex, 'rectangle', {
      x: 300,
      y: 400,
      width: 250,
      height: 150,
      fill: '#159947',
      stroke: '#22c55e',
      strokeWidth: 4,
      cornerRadius: 12,
    });
    project = shapeRes1.project;
    const shapeId1 = shapeRes1.newLayerId;
    assert.ok(shapeId1, 'Shape 1 should have unique ID');

    // Add Shape 2: Star
    const shapeRes2 = addShapeLayerToScene(project, sceneIndex, 'star', {
      x: 600,
      y: 400,
      size: 180,
      fill: '#facc15',
    });
    project = shapeRes2.project;
    const shapeId2 = shapeRes2.newLayerId;
    assert.ok(shapeId2, 'Shape 2 should have unique ID');

    // Add VectorCraft Path: Diamond Polygon
    project = addVectorPathLayerToScene(project, sceneIndex, {
      pathType: 'diamond',
      name: 'Vector Diamond',
      x: 450,
      y: 700,
      width: 320,
      height: 320,
      fill: '#10b981',
      stroke: '#ffffff',
      strokeWidth: 6,
    });
    const vectorPathId = project.newLayerId;
    assert.ok(vectorPathId, 'Vector path should have unique ID');

    const scene = project.scenes[0];
    assert.equal(scene.layers.length, initialLayerCount + 3, 'Scene should contain 3 new layers');

    const createdPath = scene.layers.find((l) => l.id === vectorPathId);
    assert.equal(createdPath.type, 'vectorPath');
    assert.equal(createdPath.pathType, 'diamond');
    assert.ok(Array.isArray(createdPath.nodes) && createdPath.nodes.length >= 4);
  });

  // --------------------------------------------------------------------------
  // 2. SELECT & EDIT PRECISION PROPERTIES
  // --------------------------------------------------------------------------
  await t.test('2. Precision property manipulation (Position, Size, Rotation, Opacity, Fill, Stroke, Radius)', () => {
    const scene = project.scenes[0];
    const rectLayer = scene.layers.find((l) => l.type === 'shape' && l.shapeType === 'rectangle');
    const pathLayer = scene.layers.find((l) => l.type === 'vectorPath');

    assert.ok(rectLayer, 'Rectangle layer should exist');
    assert.ok(pathLayer, 'Vector path layer should exist');

    // Edit Rectangle with exact precision coordinates
    project = updateLayer(project, sceneIndex, rectLayer.id, {
      x: 540,
      y: 960,
      width: 480,
      height: 320,
      rotation: 45,
      scale: 1.25,
      opacity: 0.85,
      fill: '#059669',
      stroke: '#34d399',
      strokeWidth: 8,
      cornerRadius: 24,
    });

    const updatedRect = project.scenes[0].layers.find((l) => l.id === rectLayer.id);
    assert.equal(updatedRect.x, 540);
    assert.equal(updatedRect.y, 960);
    assert.equal(updatedRect.width, 480);
    assert.equal(updatedRect.height, 320);
    assert.equal(updatedRect.rotation, 45);
    assert.equal(updatedRect.scale, 1.25);
    assert.equal(updatedRect.opacity, 0.85);
    assert.equal(updatedRect.fill, '#059669');
    assert.equal(updatedRect.stroke, '#34d399');
    assert.equal(updatedRect.strokeWidth, 8);
    assert.equal(updatedRect.cornerRadius, 24);

    // Edit VectorPath precision properties
    project = updateLayer(project, sceneIndex, pathLayer.id, {
      x: 540,
      y: 1300,
      width: 400,
      height: 400,
      rotation: -30,
      opacity: 0.9,
      fill: '#159947',
      stroke: '#22c55e',
      strokeWidth: 5,
      lineCap: 'round',
      lineJoin: 'round',
    });

    const updatedPath = project.scenes[0].layers.find((l) => l.id === pathLayer.id);
    assert.equal(updatedPath.x, 540);
    assert.equal(updatedPath.y, 1300);
    assert.equal(updatedPath.width, 400);
    assert.equal(updatedPath.height, 400);
    assert.equal(updatedPath.rotation, -30);
    assert.equal(updatedPath.lineCap, 'round');
    assert.equal(updatedPath.lineJoin, 'round');
  });

  // --------------------------------------------------------------------------
  // 3. GROUP & UNGROUP LAYERS
  // --------------------------------------------------------------------------
  await t.test('3. Multi-layer grouping and ungrouping', () => {
    const scene = project.scenes[0];
    const rect = scene.layers.find((l) => l.type === 'shape' && l.shapeType === 'rectangle');
    const star = scene.layers.find((l) => l.type === 'shape' && l.shapeType === 'star');
    assert.ok(rect && star);

    // Group the rectangle and star
    const groupRes = groupLayersInScene(project, sceneIndex, [rect.id, star.id]);
    project = groupRes.project;
    const groupedRect = project.scenes[0].layers.find((l) => l.id === rect.id);
    const groupedStar = project.scenes[0].layers.find((l) => l.id === star.id);

    assert.ok(groupedRect.groupId, 'Rectangle must have a groupId');
    assert.equal(groupedRect.groupId, groupedStar.groupId, 'Both layers must share same groupId');

    // Ungroup
    project = ungroupLayersInScene(project, sceneIndex, [rect.id, star.id]);
    const ungroupedRect = project.scenes[0].layers.find((l) => l.id === rect.id);
    const ungroupedStar = project.scenes[0].layers.find((l) => l.id === star.id);

    assert.equal(ungroupedRect.groupId, null, 'Rectangle groupId should be dissolved');
    assert.equal(ungroupedStar.groupId, null, 'Star groupId should be dissolved');
  });

  // --------------------------------------------------------------------------
  // 4. Z-ORDER REORDERING (bringToFront, sendToBack, bringForward, sendBackward)
  // --------------------------------------------------------------------------
  await t.test('4. Z-order stack management (front, back, forward, backward)', () => {
    const scene = project.scenes[0];
    const layerIds = scene.layers.map((l) => l.id);
    const targetId = layerIds[0];

    // Bring to front
    project = reorderLayersZ(project, sceneIndex, targetId, 'bringToFront');
    const frontLayers = project.scenes[0].layers;
    assert.equal(frontLayers[frontLayers.length - 1].id, targetId, 'Target layer should be at front (top)');

    // Send to back
    project = reorderLayersZ(project, sceneIndex, targetId, 'sendToBack');
    const backLayers = project.scenes[0].layers;
    assert.equal(backLayers[0].id, targetId, 'Target layer should be at back (bottom)');

    // Bring forward
    project = reorderLayersZ(project, sceneIndex, targetId, 'bringForward');
    const forwardLayers = project.scenes[0].layers;
    assert.equal(forwardLayers[1].id, targetId, 'Target layer should have stepped forward one position');

    // Send backward
    project = reorderLayersZ(project, sceneIndex, targetId, 'sendBackward');
    const backwardLayers = project.scenes[0].layers;
    assert.equal(backwardLayers[0].id, targetId, 'Target layer should have stepped backward to 0');
  });

  // --------------------------------------------------------------------------
  // 5. DUPLICATION & DELETION
  // --------------------------------------------------------------------------
  await t.test('5. Layer duplication with offset and clean deletion', () => {
    const scene = project.scenes[0];
    const pathLayer = scene.layers.find((l) => l.type === 'vectorPath');
    assert.ok(pathLayer);

    const prevCount = scene.layers.length;
    project = duplicateLayersInScene(project, sceneIndex, [pathLayer.id]);
    const dupScene = project.scenes[0];

    assert.equal(dupScene.layers.length, prevCount + 1, 'Duplication should increment layer count by 1');
    const dupLayer = dupScene.layers[dupScene.layers.length - 1];
    assert.notEqual(dupLayer.id, pathLayer.id, 'Duplicate layer must have a distinct unique ID');
    assert.equal(dupLayer.x, pathLayer.x + 20, 'Duplicate layer X should be offset +20px');
    assert.equal(dupLayer.y, pathLayer.y + 20, 'Duplicate layer Y should be offset +20px');

    // Delete duplicated layer
    project = deleteLayersFromScene(project, sceneIndex, [dupLayer.id]);
    const afterDeleteScene = project.scenes[0];
    assert.equal(afterDeleteScene.layers.length, prevCount, 'Layer count should return to previous');
    assert.ok(!afterDeleteScene.layers.some((l) => l.id === dupLayer.id), 'Duplicate layer must be gone');
  });

  // --------------------------------------------------------------------------
  // 6. UNDO / REDO COMMAND HISTORY
  // --------------------------------------------------------------------------
  await t.test('6. Transactional Undo / Redo history transitions', () => {
    history.clear();
    const scene = project.scenes[0];
    const rect = scene.layers.find((l) => l.type === 'shape');
    assert.ok(rect);

    const snapshotBefore = JSON.parse(JSON.stringify(project));
    const nextState = updateLayer(project, sceneIndex, rect.id, { x: 999 });
    history.push(snapshotBefore, nextState, 'Move Shape');
    project = nextState;

    assert.equal(project.scenes[0].layers.find((l) => l.id === rect.id).x, 999);
    assert.ok(history.canUndo(), 'Should be able to undo');

    // Perform Undo
    const undoRes = history.undo();
    assert.ok(undoRes.canUndo);
    project = undoRes.state;
    assert.equal(project.scenes[0].layers.find((l) => l.id === rect.id).x, snapshotBefore.scenes[0].layers.find((l) => l.id === rect.id).x);
    assert.ok(history.canRedo(), 'Should be able to redo');

    // Perform Redo
    const redoRes = history.redo();
    assert.ok(redoRes.canRedo);
    project = redoRes.state;
    assert.equal(project.scenes[0].layers.find((l) => l.id === rect.id).x, 999);
  });

  // --------------------------------------------------------------------------
  // 7. SAVE / CLOSE / REOPEN LOSSLESS DEEP EQUALITY
  // --------------------------------------------------------------------------
  await t.test('7. Lossless Schema V1 save, serialization, and reopen deep equality', () => {
    const serializedJson = serializeProject(project);
    assert.ok(typeof serializedJson === 'string' && serializedJson.length > 50);

    const reopenedProject = deserializeProject(serializedJson);
    assert.equal(reopenedProject.name, project.name);
    assert.equal(reopenedProject.scenes.length, project.scenes.length);
    assert.equal(reopenedProject.scenes[0].layers.length, project.scenes[0].layers.length);

    // Deep equality on vectorPath
    const origPath = project.scenes[0].layers.find((l) => l.type === 'vectorPath');
    const reloadedPath = reopenedProject.scenes[0].layers.find((l) => l.type === 'vectorPath');
    assert.ok(origPath && reloadedPath);
    assert.deepEqual(origPath, reloadedPath, 'VectorPath layer must be 100% losslessly preserved');
  });

  // --------------------------------------------------------------------------
  // 8. RESILIENCE: Non-Finite & NaN Bounds Checking
  // --------------------------------------------------------------------------
  await t.test('8. NaN and non-finite bounding box protection', () => {
    // Malformed layer with NaN scale and size
    const malformedLayer = {
      type: 'shape',
      shapeType: 'rectangle',
      scale: NaN,
      width: NaN,
      height: undefined,
    };
    const box = getLayerBoundingBox(malformedLayer);
    assert.ok(Number.isFinite(box.width) && box.width > 0, 'Bounding box width must be finite');
    assert.ok(Number.isFinite(box.height) && box.height > 0, 'Bounding box height must be finite');

    // VectorPath with non-finite scale
    const malformedPath = {
      type: 'vectorPath',
      scale: Infinity,
      width: null,
      height: NaN,
    };
    const pathBox = getLayerBoundingBox(malformedPath);
    assert.ok(Number.isFinite(pathBox.width) && pathBox.width >= 10);
    assert.ok(Number.isFinite(pathBox.height) && pathBox.height >= 10);
  });
});
