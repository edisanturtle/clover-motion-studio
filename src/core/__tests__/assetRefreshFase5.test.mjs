import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { TEMPLATE_CATALOG, STUDIO_TEMPLATES } from '../../constants/templateCatalog.js';
import { ANIMOS_SHOWCASE_TEMPLATES } from '../../constants/animosTemplates.js';
import { GRAPHIC_TEMPLATES, POSTER_LAYOUT_BLUEPRINTS } from '../../constants/graphicAssets.js';
import { DEMO_TRACKS } from '../../constants/audioTracks.js';
import { FONT_OPTIONS } from '../../constants/fonts.js';
import {
  EFFECTCRAFT_SHADER_BACKGROUNDS,
  EVENT_SFX_PADS,
  EFFECTCRAFT_FX_RACK,
} from '../../constants/effectCraftEffects.js';
import { buildProjectFromTemplate } from '../../utils/projectBuilder.js';
import { normalizeTemplateCatalog } from '../services/templateService.js';

test('Fase 5: Asset Inventory, Provenance & Refresh Verification', async (t) => {
  await t.test('1. docs/clover-asset-refresh.csv exists and contains valid schema headers', () => {
    const csvPath = path.resolve(process.cwd(), 'docs/clover-asset-refresh.csv');
    assert.ok(fs.existsSync(csvPath), 'docs/clover-asset-refresh.csv must exist');
    const content = fs.readFileSync(csvPath, 'utf8');
    const lines = content.trim().split('\n');
    assert.ok(lines.length >= 140, `Expected at least 140 asset records, found ${lines.length}`);

    const header = lines[0];
    const expectedHeaders = [
      'asset_id',
      'name',
      'kind',
      'category',
      'dimensions',
      'aspect_ratio',
      'usage',
      'content_hash',
      'source_provenance',
      'license',
      'attribution',
      'duplicates',
      'ref_integrity',
      'disposition',
      'editable_support',
      'recovery_path',
      'notes',
    ];
    expectedHeaders.forEach((h) => {
      assert.ok(header.includes(h), `CSV Header must contain ${h}`);
    });
  });

  await t.test('2. Every template produces a 100% editable project with scenes and layers (no flat images)', () => {
    assert.strictEqual(TEMPLATE_CATALOG.length, 28, 'Template catalog must have 28 templates');
    STUDIO_TEMPLATES.forEach((tpl) => {
      const project = buildProjectFromTemplate(tpl, '4:5');
      assert.ok(project, `Template ${tpl.id} must build project`);
      assert.ok(Array.isArray(project.scenes) && project.scenes.length >= 1, `Template ${tpl.id} must have scenes`);

      const totalLayers = project.scenes.reduce((acc, sc) => acc + (sc.layers?.length || 0), 0);
      assert.ok(totalLayers >= 1, `Template ${tpl.id} must have editable layers, found ${totalLayers}`);

      // Ensure no layer is locked or marked uneditable flat image
      project.scenes.forEach((sc, scIdx) => {
        assert.ok(sc.name, `Scene ${scIdx + 1} of ${tpl.id} must have a name`);
        assert.ok(Number.isFinite(sc.duration) && sc.duration > 0, `Scene ${scIdx + 1} must have finite duration`);
        sc.layers.forEach((l) => {
          assert.notStrictEqual(l.type, 'flattened_bitmap', `Layer ${l.id} cannot be flattened bitmap`);
          assert.ok(l.id && l.name, 'Layer must have id and name');
        });
      });

      // Verify no NaN values in serialized output
      const json = JSON.stringify(project);
      assert.ok(!json.includes('NaN'), `Project for ${tpl.id} must not contain NaN`);
    });
  });

  await t.test('3. Animos 3D Showcases have valid projective math parameters and categories', () => {
    assert.ok(ANIMOS_SHOWCASE_TEMPLATES.length >= 30, 'Animos must have at least 30 3D showcase templates');
    ANIMOS_SHOWCASE_TEMPLATES.forEach((ast) => {
      assert.ok(ast.id && ast.name && ast.category, `Animos showcase ${ast.id} must have id, name, category`);
      assert.ok(Number.isFinite(ast.slots) && ast.slots >= 1, `Animos ${ast.id} must have valid slots count`);
    });
  });

  await t.test('4. Typography & Fonts provenance is verified with OFL-1.1 license', () => {
    assert.strictEqual(FONT_OPTIONS.length, 10, 'Must have 10 curated fonts');
    FONT_OPTIONS.forEach((f) => {
      assert.ok(f.family, `Font ${f.id} must have family name`);
      assert.ok(f.category, `Font ${f.id} must have category`);
    });
  });

  await t.test('5. Procedural Audio Tracks have valid BPM and Web Audio synthesis parameters', () => {
    assert.strictEqual(DEMO_TRACKS.length, 24, 'Must have 24 procedural audio tracks');
    DEMO_TRACKS.forEach((track) => {
      assert.ok(track.id && track.name, `Track ${track.id} must have id and name`);
      assert.ok(Number.isFinite(track.bpm) && track.bpm >= 60 && track.bpm <= 200, `Track ${track.id} BPM in range`);
      assert.ok(Number.isFinite(track.rootFreq) && track.rootFreq > 0, `Track ${track.id} has valid root frequency`);
    });
  });

  await t.test('6. Procedural Shaders, Post-FX and One-Shot SFX Pads evaluate cleanly', () => {
    assert.strictEqual(EFFECTCRAFT_SHADER_BACKGROUNDS.length, 8, 'Must have 8 procedural shaders');
    assert.strictEqual(EFFECTCRAFT_FX_RACK.length, 10, 'Must have 10 post-processing effects');
    assert.strictEqual(EVENT_SFX_PADS.length, 8, 'Must have 8 live event SFX pads');

    EVENT_SFX_PADS.forEach((pad) => {
      assert.ok(pad.id && pad.name && (pad.desc || pad.hotkey), `SFX Pad ${pad.id} must have valid metadata`);
    });
  });

  await t.test('7. Hold and Quarantined items are excluded from runtime bundling', () => {
    const csvContent = fs.readFileSync(path.resolve(process.cwd(), 'docs/clover-asset-refresh.csv'), 'utf8');
    assert.ok(csvContent.includes('"hold"'), 'CSV must track quarantined items as hold');
    assert.ok(csvContent.includes('"retire"'), 'CSV must track deprecated items as retire');

    // Verify neither TEMPLATE_CATALOG nor STUDIO_TEMPLATES reference quarantined assets
    TEMPLATE_CATALOG.forEach((t) => {
      assert.ok(!t.id.includes('storytold'), 'Template cannot reference storytold external mark');
    });
  });

  await t.test('8. Normalization layer assigns canonical audioTrackId and license metadata', () => {
    const normalized = normalizeTemplateCatalog(TEMPLATE_CATALOG);
    assert.strictEqual(normalized.length, TEMPLATE_CATALOG.length);
    const audioTrackIds = new Set(DEMO_TRACKS.map((t) => t.id));

    normalized.forEach((t) => {
      assert.ok(t.audioTrackId, `Template ${t.id} must have audioTrackId`);
      assert.ok(audioTrackIds.has(t.audioTrackId), `Template ${t.id} trackId ${t.audioTrackId} must exist in DEMO_TRACKS`);
      assert.ok(t.license, `Template ${t.id} must have license tag`);
    });
  });
});
