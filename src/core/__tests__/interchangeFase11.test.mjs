/**
 * @file interchangeFase11.test.mjs
 * @description Automated Acceptance Test Suite for Fase 11:
 * Format Interchange (SVG, Lottie, OTIO), Capability Mapping & Lossy Warnings,
 * Round-trip Fixtures, Permission-Scoped Privacy Gate, Sandboxed Plugins, and Keychain Vault.
 */

import assert from 'node:assert/strict';
import {
  INTERCHANGE_FORMATS,
  preflightInterchange,
} from '../services/interchangeCapabilityService.js';
import {
  exportToSvg,
  importFromSvg,
  exportToLottie,
  exportToOtio,
} from '../services/interchangeService.js';
import {
  isServicePermitted,
  validateAndAuthorizeTransfer,
  SERVICE_COMPLIANCE_STATUS,
} from '../services/privacyConsentService.js';
import { credentialVault } from '../services/keychainVault.js';
import {
  pluginHost,
  PLUGIN_PERMISSIONS,
} from '../services/sandboxedPluginHost.js';
import {
  createDefaultProject,
} from '../domain/projectSchema.js';
import {
  addVectorPathLayerToScene,
  addTextLayerToScene,
  addShapeLayerToScene,
  addVideoTrackToProject,
  addVideoClipToTrackInProject,
} from '../services/projectService.js';

let passedTests = 0;
let failedTests = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(err);
    failedTests++;
  }
}

async function runAsyncTest(name, fn) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(err);
    failedTests++;
  }
}

console.log('\n=== Starting Fase 11 Acceptance Test Suite (Interchange, Privacy & Sandboxing) ===\n');

// -------------------------------------------------------------
// Test 1: Interchange Capability Mapping & Technical Ownership
// -------------------------------------------------------------
runTest('1. Interchange Capability Map & Technical Ownership Specs', () => {
  // SVG Spec
  assert.equal(INTERCHANGE_FORMATS.SVG.owner, 'W3C SVG Working Group');
  assert.equal(INTERCHANGE_FORMATS.SVG.capabilities.vectorGeometry, 'supported');
  assert.equal(INTERCHANGE_FORMATS.SVG.capabilities.audioTracks, 'unsupported');

  // Lottie Spec
  assert.equal(INTERCHANGE_FORMATS.LOTTIE.owner, 'Lottie Animation Community / Linux Foundation');
  assert.equal(INTERCHANGE_FORMATS.LOTTIE.capabilities.keyframeMotion, 'supported');
  assert.equal(INTERCHANGE_FORMATS.LOTTIE.capabilities.proceduralShaders, 'unsupported');

  // OTIO Spec
  assert.equal(INTERCHANGE_FORMATS.OTIO.owner, 'Academy Software Foundation (ASWF)');
  assert.equal(INTERCHANGE_FORMATS.OTIO.capabilities.videoClips, 'supported');
  assert.equal(INTERCHANGE_FORMATS.OTIO.capabilities.audioTracks, 'supported');
});

// -------------------------------------------------------------
// Test 2: Lossy Attribute Warnings & Preflight Diagnostics
// -------------------------------------------------------------
runTest('2. Lossy Attribute Warnings for Omitted Project Features', () => {
  let project = createDefaultProject('Complex Motion Project');
  project.scenes[0].backgroundShader = 'auroraVeil';
  project.scenes[0].duration = 5.0;

  // Add video track and clip
  project = addVideoTrackToProject(project, 'Video 1');
  const trackId = project.videoTracks[0].id;
  project = addVideoClipToTrackInProject(project, trackId, { start: 0, duration: 4, src: 'hero.mp4' });

  // Preflight for SVG: drops audio, video, keyframe motion, procedural shaders
  const svgCheck = preflightInterchange(project, 'svg');
  assert.equal(svgCheck.supported, true);
  assert.ok(svgCheck.warnings.some((w) => w.includes('audio tracks')));
  assert.ok(svgCheck.warnings.some((w) => w.includes('procedural canvas shaders')));
  assert.ok(svgCheck.droppedAttributes.includes('audioTracks'));
  assert.ok(svgCheck.droppedAttributes.includes('proceduralShaders'));

  // Preflight for unvetted / unknown format: strictly excluded
  const unvettedCheck = preflightInterchange(project, 'unvetted_proprietary_format');
  assert.equal(unvettedCheck.supported, false);
  assert.ok(unvettedCheck.warnings.some((w) => w.includes('excluded from release')));
});

// -------------------------------------------------------------
// Test 3: W3C SVG 2.0 Vector Export Structure
// -------------------------------------------------------------
runTest('3. W3C SVG 2.0 Vector Document Export Structure', () => {
  let project = createDefaultProject('Swiss Brand Poster');
  const sceneId = project.scenes[0].id;

  // Add Vector Path Layer with Bézier curve
  project = addVectorPathLayerToScene(project, sceneId, {
    id: 'layer_diamond_path',
    name: 'Swiss Diamond',
    commands: [
      { type: 'M', x: 0, y: -50 },
      { type: 'L', x: 50, y: 0 },
      { type: 'L', x: 0, y: 50 },
      { type: 'L', x: -50, y: 0 },
      { type: 'Z' },
    ],
    fill: '#159947',
    stroke: { color: '#22c55e', width: 2, cap: 'round', join: 'round' },
  });

  // Add Text Layer
  const txtRes = addTextLayerToScene(project, 0, {
    id: 'layer_swiss_text',
    text: 'HELVETICA MOTION',
    fontSize: 64,
  });
  project = txtRes.project;

  const svgOutput = exportToSvg(project, 0);

  assert.ok(svgOutput.startsWith('<?xml version="1.0" encoding="UTF-8"?>'));
  assert.ok(svgOutput.includes('<svg xmlns="http://www.w3.org/2000/svg"'));
  assert.ok(svgOutput.includes('d="M 0 -50 L 50 0 L 0 50 L -50 0 Z"'));
  assert.ok(svgOutput.includes('fill="#159947"'));
  assert.ok(svgOutput.includes('stroke="#22c55e"'));
  assert.ok(svgOutput.includes('>HELVETICA MOTION</text>'));
});

// -------------------------------------------------------------
// Test 4: SVG Vector Round-Trip Import Fixture
// -------------------------------------------------------------
runTest('4. SVG Import & Clean Reconstruction of Geometric Layers', () => {
  const sampleSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1080" width="1080" height="1080">
  <path id="path_imported_1" d="M 10 20 L 100 200 C 120 220 150 250 180 300 Z" fill="#159947" stroke="#22c55e" stroke-width="3" />
  <text id="text_imported_2" font-size="52" fill="#ffffff">ZURICH DESIGN</text>
</svg>`;

  const importedScene = importFromSvg(sampleSvg);

  assert.equal(importedScene.name, 'Imported SVG Scene');
  assert.equal(importedScene.layers.length, 2);

  // Validate Path Layer Reconstruction
  const pathLayer = importedScene.layers.find((l) => l.type === 'vectorPath');
  assert.ok(pathLayer, 'Must reconstruct vectorPath layer');
  assert.equal(pathLayer.fill, '#159947');
  assert.equal(pathLayer.stroke.color, '#22c55e');
  assert.equal(pathLayer.stroke.width, 3);
  assert.equal(pathLayer.commands.length, 4);
  assert.equal(pathLayer.commands[0].type, 'M');
  assert.equal(pathLayer.commands[1].type, 'L');
  assert.equal(pathLayer.commands[2].type, 'C');
  assert.equal(pathLayer.commands[2].cp1x, 120);
  assert.equal(pathLayer.commands[3].type, 'Z');

  // Validate Text Layer Reconstruction
  const textLayer = importedScene.layers.find((l) => l.type === 'text');
  assert.ok(textLayer, 'Must reconstruct text layer');
  assert.equal(textLayer.text, 'ZURICH DESIGN');
  assert.equal(textLayer.fontSize, 52);
});

// -------------------------------------------------------------
// Test 5: Lottie Animation JSON Schema Compliance
// -------------------------------------------------------------
runTest('5. Lottie Bodymovin JSON Schema Compliance (v5.5.2)', () => {
  const project = createDefaultProject('Lottie Export Spec');
  project.scenes[0].duration = 3.0;

  const shapeRes = addShapeLayerToScene(project, 0, {
    name: 'Swiss Box',
    width: 320,
    height: 240,
    cornerRadius: 16,
  });
  const projectWithShape = shapeRes.project;

  const lottie = exportToLottie(projectWithShape, 0);

  assert.equal(lottie.v, '5.5.2', 'Lottie specification version must be 5.5.2');
  assert.equal(lottie.fr, 30, 'Frame rate must match project fps');
  assert.equal(lottie.ip, 0, 'In point must be frame 0');
  assert.equal(lottie.op, 90, 'Out point must be 3.0s * 30fps = 90 frames');
  assert.ok(Array.isArray(lottie.layers), 'Must have layers array');
  assert.equal(lottie.layers.length, projectWithShape.scenes[0].layers.length);

  const lottieLayer = lottie.layers[lottie.layers.length - 1];
  assert.equal(lottieLayer.ty, 4, 'Must be shape layer type 4');
  assert.ok(lottieLayer.ks, 'Must have transform keyframe set (ks)');
  assert.ok(Array.isArray(lottieLayer.shapes), 'Must have vector shapes');
});

// -------------------------------------------------------------
// Test 6: OpenTimelineIO (OTIO) Editorial Cut Interchange
// -------------------------------------------------------------
runTest('6. OpenTimelineIO (OTIO) Schema & Rational Time Preservation', () => {
  let project = createDefaultProject('NLE Editorial Timeline');
  project.fps = 30;

  // Add video track and clips
  project = addVideoTrackToProject(project, 'Main Storyboard');
  const trackId = project.videoTracks[0].id;
  project = addVideoClipToTrackInProject(project, trackId, {
    name: 'Scene 1 Cut',
    start: 0,
    duration: 2.5,
    src: 'scene1.mp4',
  });
  project = addVideoClipToTrackInProject(project, trackId, {
    name: 'Scene 2 Cut',
    start: 2.5,
    duration: 3.5,
    src: 'scene2.mp4',
  });

  const otioDoc = exportToOtio(project);

  assert.equal(otioDoc.OTIO_SCHEMA, 'Timeline.1');
  assert.equal(otioDoc.global_start_time.rate, 30);
  assert.equal(otioDoc.global_start_time.value, 0);

  const videoTrack = otioDoc.tracks.children.find((t) => t.kind === 'Video');
  assert.ok(videoTrack);
  assert.equal(videoTrack.children.length, 2);

  // Clip 1: 2.5s @ 30fps = 75 frames
  assert.equal(videoTrack.children[0].name, 'Scene 1 Cut');
  assert.equal(videoTrack.children[0].source_range.duration.value, 75);
  assert.equal(videoTrack.children[0].source_range.duration.rate, 30);

  // Clip 2: 3.5s @ 30fps = 105 frames
  assert.equal(videoTrack.children[1].name, 'Scene 2 Cut');
  assert.equal(videoTrack.children[1].source_range.duration.value, 105);
});

// -------------------------------------------------------------
// Test 7: Permission-Scoped Privacy & User Consent Enforcement
// -------------------------------------------------------------
runTest('7. Privacy Gate Enforcing Strict User Consent & Disclosures', () => {
  // Case A: Transfer attempt without explicit user consent -> STRICT REJECTION
  assert.throws(
    () => {
      validateAndAuthorizeTransfer({
        serviceId: 'ipfs_vault',
        providerName: 'InterPlanetary File System',
        destinationUrl: 'https://ipfs.io/api/v0/add',
        purpose: 'Publish decentralized portfolio artifact',
        dataCategories: ['rendered_png_bytes'],
        userConsented: false, // User clicked Deny or did not opt-in!
      });
    },
    /Explicit user consent is strictly required/,
    'Must strictly block transfer when user consent is false'
  );

  // Case B: Transfer attempt with missing destination disclosure -> REJECTION
  assert.throws(
    () => {
      validateAndAuthorizeTransfer({
        serviceId: 'ipfs_vault',
        providerName: 'InterPlanetary File System',
        destinationUrl: '', // Hidden destination!
        dataCategories: ['project_schema'],
        userConsented: true,
      });
    },
    /Destination URL and Provider Name must be explicitly disclosed/,
    'Must reject transfers with undisclosed destinations'
  );

  // Case C: Fully disclosed and explicitly authorized transfer -> SUCCESS
  const authResult = validateAndAuthorizeTransfer({
    serviceId: 'ipfs_vault',
    providerName: 'InterPlanetary File System',
    destinationUrl: 'https://ipfs.io/api/v0/add',
    purpose: 'Publish decentralized portfolio artifact',
    dataCategories: ['rendered_png_bytes'],
    userConsented: true,
  });

  assert.equal(authResult.authorized, true);
  assert.ok(authResult.transferId.startsWith('xfer_'));
  assert.equal(authResult.destination, 'https://ipfs.io/api/v0/add');
});

// -------------------------------------------------------------
// Test 8: Quarantining of Unvetted Services (License/Security Gating)
// -------------------------------------------------------------
runTest('8. Quarantined & Unvetted Services Strict Exclusion Gate', () => {
  // Verified service passes clearance
  const verifiedCheck = isServicePermitted('ipfs_vault');
  assert.equal(verifiedCheck.allowed, true);

  // Unvetted 3rd-party AI relay with pending license/security audit is strictly BLOCKED
  const unvettedAiCheck = isServicePermitted('unvetted_ai_relay');
  assert.equal(unvettedAiCheck.allowed, false);
  assert.ok(unvettedAiCheck.reason.includes('excluded from release'));

  // Attempting to initiate transfer to quarantined service throws immediately
  assert.throws(
    () => {
      validateAndAuthorizeTransfer({
        serviceId: 'unvetted_ai_relay',
        providerName: 'External Cloud Host',
        destinationUrl: 'https://api.unvetted-ai-relay.com',
        dataCategories: ['project_layers'],
        userConsented: true, // Even if user consented, unvetted service is blocked by policy!
      });
    },
    /Transfer blocked by security policy/,
    'Quarantined services must be strictly blocked regardless of user flags'
  );
});

// -------------------------------------------------------------
// Test 9: Sandboxed Plugin Host & Principle of Least Privilege
// -------------------------------------------------------------
runTest('9. Sandboxed Plugin Host Permission Boundaries', () => {
  // Register read-only plugin
  pluginHost.registerPlugin({
    id: 'swiss_audit_plugin',
    name: 'Swiss Typography Auditor',
    author: 'Clover Motion Guild',
    version: '1.0.0',
    permissions: [PLUGIN_PERMISSIONS.READ_SCENE],
    handler(api) {
      const sceneInfo = api.getSceneInfo();
      return { layerCount: sceneInfo.layerCount };
    },
  });

  const mockContext = {
    activeScene: { name: 'Audit Scene', duration: 4, layers: [{ id: 'l1', name: 'Header' }] },
  };

  // Execution with granted permission succeeds
  const result = pluginHost.executePlugin('swiss_audit_plugin', mockContext);
  assert.equal(result.layerCount, 1);

  // Register rogue plugin attempting unauthorized write
  pluginHost.registerPlugin({
    id: 'rogue_plugin',
    name: 'Rogue Mutator',
    permissions: [PLUGIN_PERMISSIONS.READ_SELECTION], // No write permission!
    handler(api) {
      return api.createLayerProposal({ name: 'Injected' });
    },
  });

  // Attempting write without WRITE_LAYERS permission throws
  assert.throws(
    () => {
      pluginHost.executePlugin('rogue_plugin', mockContext);
    },
    /Permission denied: plugin "Rogue Mutator" lacks WRITE_LAYERS permission/,
    'Must enforce strict permission boundaries on sandboxed plugins'
  );
});

// -------------------------------------------------------------
// Test 10: Secure Credential Vault (OS Keychain Abstraction)
// -------------------------------------------------------------
await runAsyncTest('10. OS Keychain Credential Vault Encryption & Zeroing', async () => {
  const service = 'clover_auth_vault';
  const account = 'edisantoso';
  const secretToken = 'sk_live_clover_swiss_98472948273948';

  // Store secret
  await credentialVault.storeSecret(service, account, secretToken);
  assert.equal(credentialVault.hasSecret(service, account), true);

  // Retrieve and verify decryption
  const retrieved = await credentialVault.retrieveSecret(service, account);
  assert.equal(retrieved, secretToken, 'Decrypted secret must match original token');

  // Delete secret
  credentialVault.deleteSecret(service, account);
  assert.equal(credentialVault.hasSecret(service, account), false);

  // Store another secret and test wipeAllSecrets
  await credentialVault.storeSecret(service, account, 'token_to_wipe');
  credentialVault.wipeAllSecrets();
  assert.equal(credentialVault.hasSecret(service, account), false);
  const wiped = await credentialVault.retrieveSecret(service, account);
  assert.equal(wiped, null, 'Wiped vault must yield null');
});

console.log(`\n========================================`);
console.log(`Fase 11 Test Results: ${passedTests} Passed, ${failedTests} Failed`);
console.log(`========================================\n`);

if (failedTests > 0) {
  process.exit(1);
}
