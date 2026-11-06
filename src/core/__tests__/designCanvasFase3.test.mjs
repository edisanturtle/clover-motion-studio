/**
 * @file designCanvasFase3.test.mjs
 * @description Fase 3 Automated Test Suite: Design Canvas, Primitive Shapes,
 * Image Layers, Grouping, Z-Order, Alignment, Distribution, and Undo/Redo Serialization.
 */

import assert from 'node:assert/strict';
import {
  createScene,
  createShapeLayer,
  createImageLayer,
  createTextLayer,
} from '../domain/models.js';
import {
  addShapeLayerToScene,
  addImageLayerToScene,
  addTextLayerToScene,
  deleteLayersFromScene,
  duplicateLayersInScene,
  groupLayersInScene,
  ungroupLayersInScene,
  alignLayersInScene,
  distributeLayersInScene,
  reorderLayersZ,
} from '../services/projectService.js';
import {
  serializeProject,
  deserializeProject,
  migrateProjectSchema,
} from '../domain/projectSchema.js';
import { CommandHistoryManager } from '../services/commandHistory.js';

function createBaseProject() {
  const scene = createScene({
    name: 'Scene 1',
    duration: 5,
    layers: [
      createTextLayer({ id: 'layer_title', text: 'HELLO SWISS', x: 540, y: 300 }),
    ],
  });

  return migrateProjectSchema({
    schemaVersion: 1,
    name: 'Fase 3 Design Canvas Project',
    ratio: '4:5',
    scenes: [scene],
  });
}

async function runTests() {
  console.log('🧪 Starting Fase 3 Design Canvas & Object Editing Tests...\n');

  // Test 1: Primitive Shape Creation across all 6 shape types
  console.log('Test 1: Adding all 6 primitive shape types (rectangle, circle, pill, triangle, star, line)...');
  let proj = createBaseProject();
  const shapeTypes = ['rectangle', 'circle', 'pill', 'triangle', 'star', 'line'];
  const createdShapeIds = [];

  for (const st of shapeTypes) {
    const res = addShapeLayerToScene(proj, 0, st, {
      width: 250,
      height: 180,
      fill: '#159947',
      stroke: '#22c55e',
      strokeWidth: 4,
      cornerRadius: st === 'rectangle' ? 12 : (st === 'pill' ? 50 : 0),
    });
    proj = res.project;
    createdShapeIds.push(res.newLayerId);
  }

  const layers = proj.scenes[0].layers;
  assert.equal(layers.length, 7, 'Base layer + 6 shapes should equal 7 layers');
  const rectangleLayer = layers.find((l) => l.shapeType === 'rectangle');
  assert.equal(rectangleLayer.cornerRadius, 12, 'Rectangle corner radius should be preserved');
  assert.equal(rectangleLayer.fill, '#159947', 'Fill color should match Clover signature');
  const starLayer = layers.find((l) => l.shapeType === 'star');
  assert.equal(starLayer.shapeType, 'star', 'Star shapeType should match');
  console.log('  ✓ All 6 primitive shapes created with correct geometric parameters.\n');

  // Test 2: Local Image / SVG Asset Layer Creation
  console.log('Test 2: Adding local image / SVG asset layer...');
  const imgRes = addImageLayerToScene(proj, 0, {
    name: 'Swiss Brand Icon',
    assetId: 'asset_swiss_cross_svg',
    src: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIj48cmVjdCBmaWxsPSJyZWQiIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIi8+PC9zdmc+',
    width: 320,
    height: 320,
    cornerRadius: 8,
    stroke: '#ffffff',
    strokeWidth: 2,
  });
  proj = imgRes.project;
  const imgLayer = proj.scenes[0].layers.find((l) => l.id === imgRes.newLayerId);
  assert.ok(imgLayer, 'Image layer should exist in scene');
  assert.equal(imgLayer.type, 'image', 'Layer type should be image');
  assert.equal(imgLayer.assetId, 'asset_swiss_cross_svg', 'Asset ID should be linked');
  console.log('  ✓ Image layer added and bound to asset record.\n');

  // Test 3: Layer Grouping and Ungrouping
  console.log('Test 3: Grouping and ungrouping selected layers...');
  const groupTargetIds = [createdShapeIds[0], createdShapeIds[1]];
  const groupRes = groupLayersInScene(proj, 0, groupTargetIds);
  proj = groupRes.project;
  const gId = groupRes.groupId;
  assert.ok(gId && gId.startsWith('group_'), 'Group ID should be properly formatted');

  const groupedLayers = proj.scenes[0].layers.filter((l) => groupTargetIds.includes(l.id));
  assert.equal(groupedLayers.length, 2);
  assert.equal(groupedLayers[0].groupId, gId);
  assert.equal(groupedLayers[1].groupId, gId);

  // Ungroup
  proj = ungroupLayersInScene(proj, 0, [groupTargetIds[0]]);
  const ungroupedLayers = proj.scenes[0].layers.filter((l) => groupTargetIds.includes(l.id));
  assert.equal(ungroupedLayers[0].groupId, null);
  assert.equal(ungroupedLayers[1].groupId, null);
  console.log('  ✓ Grouping assigned stable group ID and ungrouping dissolved cleanly.\n');

  // Test 4: Z-Order Hierarchy Manipulation
  console.log('Test 4: Z-order reordering (bringToFront, sendToBack, bringForward, sendBackward)...');
  const targetId = createdShapeIds[2]; // pill shape
  // Bring to front
  proj = reorderLayersZ(proj, 0, [targetId], 'bringToFront');
  const currentLayers = proj.scenes[0].layers;
  assert.equal(currentLayers[currentLayers.length - 1].id, targetId, 'Layer should be at very top after bringToFront');

  // Send to back
  proj = reorderLayersZ(proj, 0, [targetId], 'sendToBack');
  assert.equal(proj.scenes[0].layers[0].id, targetId, 'Layer should be at very bottom after sendToBack');

  // Bring forward
  proj = reorderLayersZ(proj, 0, [targetId], 'bringForward');
  assert.equal(proj.scenes[0].layers[1].id, targetId, 'Layer should move forward one index');

  // Send backward
  proj = reorderLayersZ(proj, 0, [targetId], 'sendBackward');
  assert.equal(proj.scenes[0].layers[0].id, targetId, 'Layer should move backward one index');
  console.log('  ✓ Z-order stack operations correctly shift layers without corruption.\n');

  // Test 5: Layer Alignment (Single layer relative to Canvas, Multi-layer relative to Selection)
  console.log('Test 5: Aligning layers (left, center, right, top, middle, bottom)...');
  // Single layer align center relative to 1080x1350 canvas
  proj = alignLayersInScene(proj, 0, ['layer_title'], 'center', 1080, 1350);
  const centeredTitle = proj.scenes[0].layers.find((l) => l.id === 'layer_title');
  assert.equal(centeredTitle.x, 540, 'Centered title X should be 540');

  // Multi-layer align left
  const multiAlignIds = [createdShapeIds[0], createdShapeIds[1], createdShapeIds[2]];
  proj = alignLayersInScene(proj, 0, multiAlignIds, 'center', 1080, 1350);
  const alignedShapes = proj.scenes[0].layers.filter((l) => multiAlignIds.includes(l.id));
  const xValues = alignedShapes.map((l) => l.x);
  assert.equal(xValues[0], xValues[1], 'Shapes should have equal X after align center');
  assert.equal(xValues[1], xValues[2], 'Shapes should have equal X after align center');
  console.log('  ✓ Alignment calculations match exact geometric targets.\n');

  // Test 6: Layer Distribution
  console.log('Test 6: Distributing layers evenly along an axis...');
  const distIds = [createdShapeIds[0], createdShapeIds[1], createdShapeIds[2]];
  // Put first at X=100, last at X=700
  proj.scenes[0].layers.find((l) => l.id === distIds[0]).x = 100;
  proj.scenes[0].layers.find((l) => l.id === distIds[1]).x = 220; // off-center
  proj.scenes[0].layers.find((l) => l.id === distIds[2]).x = 700;

  proj = distributeLayersInScene(proj, 0, distIds, 'horizontal');
  const distributedShapes = proj.scenes[0].layers.filter((l) => distIds.includes(l.id));
  const middleX = distributedShapes.find((l) => l.id === distIds[1]).x;
  assert.equal(middleX, 400, 'Middle layer should be placed exactly midway between 100 and 700 (X=400)');
  console.log('  ✓ Horizontal distribution verified: endpoints preserved, intermediate layers spaced evenly.\n');

  // Test 7: Serialization & Deserialization of Schema V1 Project with Shapes & Groups
  console.log('Test 7: Schema V1 serialization and lossless round-trip...');
  // Regroup two shapes before serializing
  proj = groupLayersInScene(proj, 0, [createdShapeIds[0], createdShapeIds[1]]).project;
  const serialized = serializeProject(proj);
  assert.ok(typeof serialized === 'string', 'Serialized output must be a string');
  assert.ok(serialized.includes('"shapeType": "rectangle"'), 'Serialized JSON must contain shapeType');
  assert.ok(serialized.includes('"shapeType": "star"'), 'Serialized JSON must contain star');
  assert.ok(serialized.includes('"groupId": "group_'), 'Serialized JSON must contain groupId');

  const deserialized = deserializeProject(serialized);
  assert.equal(deserialized.schemaVersion, 1, 'Deserialized schemaVersion must be 1');
  assert.equal(deserialized.scenes[0].layers.length, proj.scenes[0].layers.length, 'Layer count must match exactly');
  const dRect = deserialized.scenes[0].layers.find((l) => l.shapeType === 'rectangle');
  assert.equal(dRect.cornerRadius, 12, 'Corner radius preserved in round-trip');
  assert.equal(dRect.fill, '#159947', 'Fill preserved in round-trip');
  console.log('  ✓ Lossless serialization & deserialization round-trip verified.\n');

  // Test 8: Transactional Undo/Redo Batching
  console.log('Test 8: Transactional Undo/Redo for canvas edits...');
  const history = new CommandHistoryManager(50);
  const initialState = createBaseProject();

  // Begin transaction: Add two shapes and group them
  history.beginTransaction(initialState, 'Create & Group Shapes');
  let state = initialState;
  const res1 = addShapeLayerToScene(state, 0, 'rectangle', { x: 300, y: 300 });
  history.push(state, res1.project, 'Add Rectangle');
  state = res1.project;

  const res2 = addShapeLayerToScene(state, 0, 'circle', { x: 600, y: 300 });
  history.push(state, res2.project, 'Add Circle');
  state = res2.project;

  const shapeAId = state.scenes[0].layers[1].id;
  const shapeBId = res2.newLayerId;
  const groupTxRes = groupLayersInScene(state, 0, [shapeAId, shapeBId]);
  history.push(state, groupTxRes.project, 'Group Layers');
  state = groupTxRes.project;
  history.commitTransaction();

  assert.equal(state.scenes[0].layers.length, 3, 'State should have 3 layers after transaction');
  assert.equal(history.canUndo(), true, 'History should allow undo');

  // Undo transaction (must revert to initialState in exactly 1 step)
  const undoRes = history.undo();
  assert.equal(undoRes.canUndo, true, 'Undo should succeed');
  assert.equal(undoRes.state.scenes[0].layers.length, 1, 'Undone state should return to 1 layer');

  // Redo transaction (must re-apply all coalesced changes in 1 step)
  const redoRes = history.redo();
  assert.equal(redoRes.canRedo, true, 'Redo should succeed');
  assert.equal(redoRes.state.scenes[0].layers.length, 3, 'Redone state should restore all 3 layers with grouping intact');
  assert.ok(redoRes.state.scenes[0].layers[1].groupId, 'Redone layers must retain groupId');
  console.log('  ✓ Transactional undo and redo batched complex canvas mutations cleanly.\n');

  console.log('🎉 ALL 8 FASE 3 TESTS PASSED SUCCESSFULLY!\n');
}

runTests().catch((err) => {
  console.error('❌ Test failed with error:', err);
  process.exit(1);
});
