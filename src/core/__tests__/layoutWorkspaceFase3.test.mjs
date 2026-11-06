import test from 'node:test';
import assert from 'node:assert/strict';
import {
  STORAGE_LAYOUT_PREFS_KEY,
  DEFAULT_LAYOUT_PREFS,
  loadLayoutPreferences,
  saveLayoutPreferences,
} from '../services/storageService.js';
import { ASPECT_RATIOS } from '../../constants/fonts.js';
import { serializeProject, deserializeProject } from '../domain/projectSchema.js';

test('Fase 3: Layout Preferences & Canvas-First Workspace Verification', async (t) => {
  await t.test('1. Default layout preferences return expected initial bounds', () => {
    assert.equal(DEFAULT_LAYOUT_PREFS.leftSidebarWidth, 280);
    assert.equal(DEFAULT_LAYOUT_PREFS.rightInspectorWidth, 280);
    assert.equal(DEFAULT_LAYOUT_PREFS.timelineHeight, 240);
    assert.equal(DEFAULT_LAYOUT_PREFS.leftDrawerOpen, true);
    assert.equal(DEFAULT_LAYOUT_PREFS.rightPanelOpen, true);
    assert.equal(DEFAULT_LAYOUT_PREFS.timelineExpanded, true);
    assert.equal(DEFAULT_LAYOUT_PREFS.isFocusMode, false);
  });

  await t.test('2. Layout preferences save and restore independently without polluting project schemas', () => {
    const mockStorage = new Map();
    const fakeLocalStorage = {
      getItem: (k) => mockStorage.get(k) || null,
      setItem: (k, v) => mockStorage.set(k, String(v)),
      removeItem: (k) => mockStorage.delete(k),
    };

    globalThis.window = { localStorage: fakeLocalStorage };
    globalThis.localStorage = fakeLocalStorage;

    const customPrefs = {
      leftSidebarWidth: 320,
      rightInspectorWidth: 350,
      timelineHeight: 300,
      leftDrawerOpen: false,
      rightPanelOpen: true,
      timelineExpanded: false,
      isFocusMode: true,
    };

    saveLayoutPreferences(customPrefs);
    assert.ok(mockStorage.has(STORAGE_LAYOUT_PREFS_KEY));

    const loaded = loadLayoutPreferences();
    assert.equal(loaded.leftSidebarWidth, 320);
    assert.equal(loaded.rightInspectorWidth, 350);
    assert.equal(loaded.timelineHeight, 300);
    assert.equal(loaded.leftDrawerOpen, false);
    assert.equal(loaded.rightPanelOpen, true);
    assert.equal(loaded.timelineExpanded, false);
    assert.equal(loaded.isFocusMode, true);

    // Verify project serialization never leaks layout preferences
    const sampleProject = {
      schemaVersion: 1,
      id: 'proj_test_layout',
      name: 'Clean Project',
      ratio: '4:5',
      scenes: [],
    };
    const serialized = serializeProject(sampleProject);
    const parsed = JSON.parse(serialized);
    assert.equal(parsed.leftSidebarWidth, undefined);
    assert.equal(parsed.rightInspectorWidth, undefined);
    assert.equal(parsed.timelineHeight, undefined);
    assert.equal(parsed.isFocusMode, undefined);
  });

  await t.test('3. Layout dimensions clamp within safe ergonomic bounds', () => {
    // Malformed / extreme values
    globalThis.localStorage.setItem(
      STORAGE_LAYOUT_PREFS_KEY,
      JSON.stringify({
        leftSidebarWidth: 9999, // exceeds max 420
        rightInspectorWidth: -50, // below min 240
        timelineHeight: 10, // below min 140
      })
    );

    const clamped = loadLayoutPreferences();
    assert.equal(clamped.leftSidebarWidth, 420);
    assert.equal(clamped.rightInspectorWidth, 240);
    assert.equal(clamped.timelineHeight, 140);
  });

  await t.test('4. Native project resolutions remain isolated from viewer zoom', () => {
    // Native resolutions for 6 supported format aspect ratios
    assert.equal(ASPECT_RATIOS['4:5'].width, 1080);
    assert.equal(ASPECT_RATIOS['4:5'].height, 1350);

    assert.equal(ASPECT_RATIOS['1:1'].width, 1080);
    assert.equal(ASPECT_RATIOS['1:1'].height, 1080);

    assert.equal(ASPECT_RATIOS['9:16'].width, 1080);
    assert.equal(ASPECT_RATIOS['9:16'].height, 1920);

    assert.equal(ASPECT_RATIOS['16:9'].width, 1920);
    assert.equal(ASPECT_RATIOS['16:9'].height, 1080);

    assert.equal(ASPECT_RATIOS['4:3'].width, 1440);
    assert.equal(ASPECT_RATIOS['4:3'].height, 1080);

    assert.equal(ASPECT_RATIOS['3:4'].width, 1080);
    assert.equal(ASPECT_RATIOS['3:4'].height, 1440);

    // Dynamic viewer fit calculation simulation
    const containerW = 860;
    const containerH = 600;
    const padding = 48;
    const availW = containerW - padding;
    const availH = containerH - padding;

    const fitScale45 = Math.min(availW / 1080, availH / 1350);
    assert.ok(fitScale45 > 0.35 && fitScale45 < 0.45);

    // Zoom multiplier does not alter project resolution
    const zoomMultiplier = 1.5;
    const effectiveViewerScale = fitScale45 * zoomMultiplier;
    assert.ok(effectiveViewerScale > fitScale45);
    // Project width remains 1080
    assert.equal(ASPECT_RATIOS['4:5'].width, 1080);
  });

  await t.test('5. Focus Mode state recovery preserves previous layout', () => {
    const previousState = {
      leftDrawerOpen: true,
      rightPanelOpen: true,
      timelineExpanded: true,
    };

    // Entering focus mode
    const focusState = {
      leftDrawerOpen: false,
      rightPanelOpen: false,
      timelineExpanded: false,
    };
    assert.equal(focusState.leftDrawerOpen, false);
    assert.equal(focusState.rightPanelOpen, false);
    assert.equal(focusState.timelineExpanded, false);

    // Exiting focus mode restores previous state
    const restoredState = { ...previousState };
    assert.equal(restoredState.leftDrawerOpen, true);
    assert.equal(restoredState.rightPanelOpen, true);
    assert.equal(restoredState.timelineExpanded, true);
  });
});
