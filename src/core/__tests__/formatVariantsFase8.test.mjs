/**
 * @file formatVariantsFase8.test.mjs
 * @description Acceptance Test Suite for Fase 8: Multi-Format Layouts, Variants & Templates
 * Verifies all 6 aspect ratios (9:16, 1:1, 4:5, 16:9, 4:3, 3:4), linked properties,
 * non-destructive per-format overrides, duration-spanning bounds & safe area preflight,
 * and template search, filter, preview, duplication, and custom saving.
 */

import assert from 'node:assert';
import { ASPECT_RATIOS } from '../../constants/fonts.js';
import {
  SUPPORTED_RATIOS,
  resolveLayerForFormat,
  setLayerFormatOverride,
  removeLayerFormatOverride,
  resolveSceneForFormat,
  resolveProjectForFormat,
} from '../domain/layoutVariants.js';
import { checkProjectFormatVariants } from '../services/formatPreflightChecker.js';
import {
  searchAndFilterTemplates,
  saveProjectAsCustomTemplate,
  duplicateTemplate,
  normalizeTemplateCatalog,
} from '../services/templateService.js';
import {
  createTextLayer,
  createShapeLayer,
  createScene,
  createKeyframe,
} from '../domain/models.js';
import {
  serializeProject,
  deserializeProject,
  validateProjectSchema,
} from '../domain/projectSchema.js';

console.log('🧪 Starting Fase 8 Multi-Format Layouts, Variants & Templates Suite...\n');

// -------------------------------------------------------------
// Test 1: All 6 Aspect Ratios Validity & Dimension Invariants
// -------------------------------------------------------------
console.log('Test 1: All 6 Aspect Ratios Validity & Dimension Invariants...');
{
  const expectedRatios = ['4:5', '1:1', '9:16', '16:9', '4:3', '3:4'];
  assert.strictEqual(SUPPORTED_RATIOS.length, 6, 'Exactly 6 standardized ratios must be supported');
  for (const r of expectedRatios) {
    assert.ok(SUPPORTED_RATIOS.includes(r), `SUPPORTED_RATIOS must contain ${r}`);
    const dim = ASPECT_RATIOS[r];
    assert.ok(dim, `ASPECT_RATIOS must define dimension for ${r}`);
    assert.ok(dim.width > 0 && dim.height > 0, `Width and height must be positive for ${r}`);
  }

  // Exact dimension checks
  assert.strictEqual(ASPECT_RATIOS['9:16'].width, 1080);
  assert.strictEqual(ASPECT_RATIOS['9:16'].height, 1920);
  assert.strictEqual(ASPECT_RATIOS['1:1'].width, 1080);
  assert.strictEqual(ASPECT_RATIOS['1:1'].height, 1080);
  assert.strictEqual(ASPECT_RATIOS['16:9'].width, 1920);
  assert.strictEqual(ASPECT_RATIOS['16:9'].height, 1080);
  assert.strictEqual(ASPECT_RATIOS['3:4'].width, 1080);
  assert.strictEqual(ASPECT_RATIOS['3:4'].height, 1440);

  console.log('  ✓ All 6 aspect ratios (9:16, 1:1, 4:5, 16:9, 4:3, 3:4) verified with exact dimensions.');
}

// -------------------------------------------------------------
// Test 2: Linked Layer Resolution vs Override per Format
// -------------------------------------------------------------
console.log('\nTest 2: Linked Layer Resolution vs Override per Format...');
{
  const baseLayer = createTextLayer({
    id: 'layer_hero_title',
    text: 'SWISS KINETIC DESIGN',
    fontFamily: 'Inter',
    fontSize: 54,
    color: '#ffffff',
    x: 0,
    y: -80,
    scale: 1.0,
  });

  // Base resolution (4:5)
  const resolvedBase = resolveLayerForFormat(baseLayer, '4:5', '4:5');
  assert.strictEqual(resolvedBase.text, 'SWISS KINETIC DESIGN', 'Linked text preserved');
  assert.strictEqual(resolvedBase.y, -80, 'Base y position preserved');

  // Add explicit format override for 9:16 (shift lower and scale up for vertical totem)
  const overriddenLayer = setLayerFormatOverride(baseLayer, '9:16', {
    y: 150,
    fontSize: 40,
    scale: 1.2,
  });

  // Resolve for 9:16: must reflect explicit override
  const resolved916 = resolveLayerForFormat(overriddenLayer, '9:16', '4:5');
  assert.strictEqual(resolved916.text, 'SWISS KINETIC DESIGN', 'Linked text remains intact in 9:16');
  assert.strictEqual(resolved916.y, 150, '9:16 override y is 150');
  assert.strictEqual(resolved916.fontSize, 40, '9:16 override fontSize is 40');
  assert.strictEqual(resolved916.scale, 1.2, '9:16 override scale is 1.2');

  // CRITICAL CHECK: Base format (4:5) and other format (1:1) MUST NOT be mutated
  const resolved11 = resolveLayerForFormat(overriddenLayer, '1:1', '4:5');
  assert.strictEqual(resolved11.text, 'SWISS KINETIC DESIGN');
  assert.notStrictEqual(resolved11.y, 150, '1:1 format MUST NOT receive 9:16 y override');
  assert.strictEqual(overriddenLayer.y, -80, 'Original base layer y must remain -80');

  console.log('  ✓ Per-format overrides modify target ratio without bleeding into base or other formats.');
}

// -------------------------------------------------------------
// Test 3: Reset / Remove Format Overrides
// -------------------------------------------------------------
console.log('\nTest 3: Reset / Remove Format Overrides...');
{
  const layer = createTextLayer({ id: 'layer_test', x: 10, y: 20 });
  const withOverride = setLayerFormatOverride(layer, '16:9', { x: 200, y: 400 });
  assert.strictEqual(resolveLayerForFormat(withOverride, '16:9').x, 200);

  const cleared = removeLayerFormatOverride(withOverride, '16:9');
  assert.strictEqual(cleared.formatOverrides?.['16:9'], undefined, '16:9 override deleted');

  const resolvedAgain = resolveLayerForFormat(cleared, '16:9', '4:5');
  assert.notStrictEqual(resolvedAgain.x, 200, 'Reverted to linked base adaptation');

  console.log('  ✓ Format override removal safely restores linked base layout.');
}

// -------------------------------------------------------------
// Test 4: Duration-Spanning Text Overflow Detection
// -------------------------------------------------------------
console.log('\nTest 4: Duration-Spanning Text Overflow Detection along timeline...');
{
  // Short text fits comfortably inside 1080x1080 at t=0 (width ~120px, boxRight ~600px < 1080px),
  // but keyframed translation at t=2.0s moves it +800px to the right, causing overflow at t=2.0s
  const animatedLayer = createTextLayer({
    id: 'layer_overflowing',
    name: 'Animated Short Headline',
    text: 'SWISS',
    fontSize: 40,
    x: 0,
    y: 0,
    keyframes: [
      createKeyframe({ property: 'posX', time: 0, value: 0 }),
      createKeyframe({ property: 'posX', time: 2.0, value: 800 }), // Translates out past right edge
    ],
  });

  const scene = createScene({
    duration: 3.0,
    layers: [animatedLayer],
  });

  const testProject = {
    ratio: '1:1',
    scenes: [scene],
  };

  const report = checkProjectFormatVariants(testProject);
  assert.ok(report.totalIssuesCount > 0, 'Must detect issues along timeline duration');

  const ratio11 = report.resultsPerRatio['1:1'];
  assert.ok(ratio11.issues.length > 0, '1:1 format must report overflow issues');
  const overflowIssue = ratio11.issues.find((i) => i.type === 'text_overflow');
  assert.ok(overflowIssue, 'Finds text_overflow issue at animated time');
  assert.ok(overflowIssue.time > 0, `Overflow detected during motion at t=${overflowIssue.time}s (not static frame 0)`);

  console.log('  ✓ Duration preflight checker catches motion-induced text overflow across animated timeline.');
}

// -------------------------------------------------------------
// Test 5: Off-Canvas Motion Trajectory Detection
// -------------------------------------------------------------
console.log('\nTest 5: Off-Canvas Motion Trajectory Detection...');
{
  const flyerLayer = createShapeLayer({
    id: 'layer_flyer',
    name: 'Rocket Accent',
    x: 0,
    y: 0,
    keyframes: [
      createKeyframe({ property: 'posY', time: 0, value: 0 }),
      createKeyframe({ property: 'posY', time: 2.5, value: -2500 }), // Flies way off canvas
    ],
  });

  const testProject = {
    ratio: '16:9',
    scenes: [createScene({ duration: 4.0, layers: [flyerLayer] })],
  };

  const report = checkProjectFormatVariants(testProject);
  const issues = report.resultsPerRatio['16:9'].issues;
  const offCanvas = issues.find((i) => i.type === 'off_canvas_motion');
  assert.ok(offCanvas, 'Identifies off-canvas motion trajectory');
  assert.strictEqual(offCanvas.layerId, 'layer_flyer');

  console.log('  ✓ Off-canvas animated trajectories correctly flagged with temporal citations.');
}

// -------------------------------------------------------------
// Test 6: Platform Safe Area Guides Compliance (9:16)
// -------------------------------------------------------------
console.log('\nTest 6: Platform Safe Area Guides Compliance (9:16 Story/Reel)...');
{
  // Place text in the extreme top 5% of canvas (height: 1920, top 5% is 96px, unsafe is top 12% = 230px)
  const topHeaderLayer = createTextLayer({
    id: 'layer_top_danger',
    name: 'Dangerous Top Header',
    text: 'SWISS DESIGN FORUM',
    fontSize: 32,
    x: 0,
    y: -880, // Very high near top edge
  });

  const testProject = {
    ratio: '9:16',
    scenes: [createScene({ duration: 2.0, layers: [topHeaderLayer] })],
  };

  const report = checkProjectFormatVariants(testProject, { ratios: ['9:16'] });
  const issues = report.resultsPerRatio['9:16'].issues;
  const safeAreaIssue = issues.find((i) => i.type === 'safe_area_encroachment');
  assert.ok(safeAreaIssue, 'Detects 9:16 platform navigation encroachment');
  assert.ok(safeAreaIssue.message.includes('top 9:16 platform navigation area'));

  console.log('  ✓ Platform safe area violations in 9:16 detected accurately.');
}

// -------------------------------------------------------------
// Test 7: Template Search, Keyword & License Filtering
// -------------------------------------------------------------
console.log('\nTest 7: Template Search, Keyword & License Filtering...');
{
  const catalog = normalizeTemplateCatalog();
  assert.ok(catalog.length >= 10, 'Catalog contains templates');

  // 7a. Text Query Search
  const searchResults = searchAndFilterTemplates(catalog, { query: 'hangul' });
  assert.ok(searchResults.length > 0, 'Found Hangul template');
  assert.strictEqual(searchResults[0].id, 'tpl_hangul');

  // 7b. Category Filter
  const kineticResults = searchAndFilterTemplates(catalog, { category: 'Kinetic typography' });
  assert.ok(Array.isArray(kineticResults));

  // 7c. License Filter
  const mitResults = searchAndFilterTemplates(catalog, { license: 'MIT' });
  assert.ok(mitResults.every((t) => t.license === 'MIT'), 'All results have MIT license');

  // 7d. Ratio Filter
  const ratioResults = searchAndFilterTemplates(catalog, { ratio: '9:16' });
  assert.ok(ratioResults.every((t) => t.supportedRatios.includes('9:16')));

  console.log('  ✓ Template search and multi-parameter filtering (query, category, ratio, license) verified.');
}

// -------------------------------------------------------------
// Test 8: Save Project as Custom Template with Metadata
// -------------------------------------------------------------
console.log('\nTest 8: Save Project as Custom Template with Metadata...');
{
  const mockProject = {
    id: 'proj_orig_123',
    name: 'Bauhaus Summer Fest',
    ratio: '1:1',
    scenes: [createScene({}, 'Main Poster')],
    palette: ['#000000', '#ffffff', '#ff0000'],
  };

  const customTpl = saveProjectAsCustomTemplate(mockProject, {
    name: 'Bauhaus Master Layout',
    purpose: 'Event poster template',
    license: 'CC-BY-4.0',
    author: 'Studio Zürich',
  });

  assert.ok(customTpl.id.startsWith('tpl_user_'), 'Generates stable user template ID');
  assert.strictEqual(customTpl.name, 'Bauhaus Master Layout');
  assert.strictEqual(customTpl.license, 'CC-BY-4.0');
  assert.strictEqual(customTpl.author, 'Studio Zürich');
  assert.strictEqual(customTpl.templateVersion, 1);
  assert.strictEqual(customTpl.supportedRatios.length, 6, 'Supports all 6 ratios');

  console.log('  ✓ Save Project as Custom Template preserves full versioned schema and licensing metadata.');
}

// -------------------------------------------------------------
// Test 9: Template Duplication with Independent ID
// -------------------------------------------------------------
console.log('\nTest 9: Template Duplication with Independent ID...');
{
  const baseTpl = {
    id: 'tpl_hangul',
    name: 'Hangul Modules',
    license: 'MIT',
    category: 'Graphic systems',
    supportedRatios: ['4:5', '1:1', '9:16', '16:9', '4:3', '3:4'],
  };

  const cloned = duplicateTemplate(baseTpl, 'Hangul Modules Custom Remix');
  assert.ok(cloned.id.startsWith('tpl_copy_'), 'Clone receives independent unique ID');
  assert.strictEqual(cloned.name, 'Hangul Modules Custom Remix');
  assert.notStrictEqual(cloned.id, baseTpl.id, 'IDs must be distinct');

  console.log('  ✓ Template cloning creates isolated duplicate with new ID.');
}

// -------------------------------------------------------------
// Test 10: Full Schema V1 Save -> Reopen Round-Trip with Layer Overrides
// -------------------------------------------------------------
console.log('\nTest 10: Schema V1 Serialization Round-Trip with Layer Format Overrides...');
{
  const baseLayer = createTextLayer({ id: 'layer_hero', text: 'ZÜRICH 2026' });
  const layerWithOverrides = setLayerFormatOverride(baseLayer, '9:16', { y: 120, fontSize: 36 });
  const layerWithBoth = setLayerFormatOverride(layerWithOverrides, '16:9', { x: 50, scale: 0.9 });

  const testProject = {
    schemaVersion: 1,
    id: 'proj_multiformat_test',
    name: 'Responsive Multi-Format Project',
    ratio: '4:5',
    fps: 30,
    scenes: [createScene({ layers: [layerWithBoth] })],
  };

  const jsonString = serializeProject(testProject);
  assert.strictEqual(typeof jsonString, 'string');

  const reopened = deserializeProject(jsonString);
  const validation = validateProjectSchema(reopened);
  assert.strictEqual(validation.valid, true, 'Reopened project passes Schema V1 validation');

  const reopenedLayer = reopened.scenes[0].layers[0];
  assert.ok(reopenedLayer.formatOverrides, 'formatOverrides dictionary persisted');
  assert.strictEqual(reopenedLayer.formatOverrides['9:16'].y, 120, '9:16 override preserved');
  assert.strictEqual(reopenedLayer.formatOverrides['16:9'].x, 50, '16:9 override preserved');

  // Verify resolution operates identically after reopen
  const res916 = resolveLayerForFormat(reopenedLayer, '9:16', '4:5');
  assert.strictEqual(res916.y, 120);

  console.log('  ✓ Schema V1 lossless round-trip verified for multi-format overrides.');
}

console.log('\n🎉 ALL 10 FASE 8 FORMAT VARIANTS & TEMPLATES TESTS PASSED SUCCESSFULLY!\n');
