/**
 * @file videoEditingFase7.test.mjs
 * @description Comprehensive Acceptance Test Suite for Fase 7 Video Editing & Compositing
 * Verifies codec preflight inspection, large media memory boundaries, decoder errors,
 * track/clip editing (split, trim, ripple delete), transform/crop, transitions,
 * captioning, accurate seeking, and Schema V1 serialization.
 */

import assert from 'node:assert';
import {
  preflightVideoAsset,
  diagnoseMediaError,
  checkBrowserDecoderSupport,
  NORMAL_SIZE_CEILING_BYTES,
  LARGE_MEDIA_THRESHOLD_BYTES,
} from '../services/videoDecoderPreflight.js';
import {
  createVideoClip,
  createVideoTrack,
} from '../domain/videoModels.js';
import {
  splitVideoClip,
  trimVideoClip,
  rippleDeleteVideoClip,
  updateVideoClipTransform,
  updateVideoClipCrop,
  setVideoClipTransition,
  evaluateActiveVideoClipsAtTime,
} from '../services/videoService.js';
import {
  serializeProject,
  deserializeProject,
  validateProjectSchema,
} from '../domain/projectSchema.js';
import { createSampleVideoProject } from '../../fixtures/sampleVideoProject.js';

console.log('🧪 Starting Fase 7 Video Editing & Compositing Acceptance Suite...\n');

// -------------------------------------------------------------
// Test 1: Video Codec & Decoder Preflight Matrix
// -------------------------------------------------------------
console.log('Test 1: Video Codec & Decoder Preflight Matrix...');
{
  // 1a. Standard MP4 (H.264)
  const validMp4 = { name: 'broll_footage.mp4', size: 45 * 1024 * 1024, type: 'video/mp4' };
  const resMp4 = preflightVideoAsset(validMp4);
  assert.strictEqual(resMp4.ok, true, 'Standard MP4 must be accepted');
  assert.strictEqual(resMp4.status, 'approved', 'Standard MP4 should be approved');
  assert.strictEqual(resMp4.code, 'APPROVED_OPTIMAL', 'Optimal status code');

  // 1b. Standard WebM (VP9)
  const validWebm = { name: 'kinetic_art.webm', size: 30 * 1024 * 1024, type: 'video/webm' };
  const resWebm = preflightVideoAsset(validWebm);
  assert.strictEqual(resWebm.ok, true, 'Standard WebM must be accepted');

  // 1c. Apple ProRes Incompatible MOV
  const proresFile = { name: 'camera_master_prores422.mov', size: 80 * 1024 * 1024, type: 'video/quicktime' };
  const resProres = preflightVideoAsset(proresFile);
  assert.strictEqual(resProres.ok, false, 'Apple ProRes MOV must be rejected by preflight');
  assert.strictEqual(resProres.code, 'ERR_UNSUPPORTED_INTERMEDIATE_CODEC', 'Exact error code for ProRes');
  assert.ok(resProres.reason.includes('ProRes and DNxHD'), 'Informative diagnostic reason');
  assert.ok(resProres.recommendation.includes('Transcode to H.264'), 'Actionable solution');

  // 1d. Legacy AVI container
  const aviFile = { name: 'old_render.avi', size: 60 * 1024 * 1024, type: 'video/x-msvideo' };
  const resAvi = preflightVideoAsset(aviFile);
  assert.strictEqual(resAvi.ok, false, 'Legacy AVI container must be rejected');
  assert.strictEqual(resAvi.code, 'ERR_LEGACY_CONTAINER_AVI', 'Exact error code for AVI');

  console.log('  ✓ Codec preflight matrix approves standard decoders and rejects intermediate/legacy codecs.');
}

// -------------------------------------------------------------
// Test 2: Large Media & Decoder Error Diagnostics Mapping
// -------------------------------------------------------------
console.log('\nTest 2: Large Media Memory Boundaries & Decoder Diagnostics...');
{
  // 2a. Warning on media between 100MB and 500MB
  const largeFile = { name: 'drone_4k_shot.mp4', size: 250 * 1024 * 1024, type: 'video/mp4' };
  const resLarge = preflightVideoAsset(largeFile);
  assert.strictEqual(resLarge.ok, true, 'Large file under 500MB is accepted with warning');
  assert.strictEqual(resLarge.status, 'warning', 'Status must be warning');
  assert.strictEqual(resLarge.code, 'WARN_LARGE_MEDIA_PROXY_RECOMMENDED');
  assert.strictEqual(resLarge.details.needsProxy, true, 'Flags that proxy is recommended');

  // 2b. Hard ceiling rejection for files exceeding 500MB
  const massiveFile = { name: 'raw_film_reel.mp4', size: 650 * 1024 * 1024, type: 'video/mp4' };
  const resMassive = preflightVideoAsset(massiveFile);
  assert.strictEqual(resMassive.ok, false, 'File exceeding 500MB must be rejected to prevent browser crash');
  assert.strictEqual(resMassive.code, 'ERR_OVERSIZED_MEDIA_CEILING');
  assert.ok(resMassive.reason.includes('500 MB browser RAM safety ceiling'));

  // 2c. HTML5 MediaError Diagnostics Mapping
  const decodeErr = diagnoseMediaError({ code: 3 }, 'test_clip.mp4');
  assert.strictEqual(decodeErr.code, 'MEDIA_ERR_DECODE');
  assert.ok(decodeErr.message.includes('corrupted GOP boundaries'));

  const unsupportedErr = diagnoseMediaError({ code: 4 }, 'unsupported.mp4');
  assert.strictEqual(unsupportedErr.code, 'MEDIA_ERR_SRC_NOT_SUPPORTED');

  console.log('  ✓ Large media thresholds (100MB/500MB) and MediaError diagnostics verified.');
}

// -------------------------------------------------------------
// Test 3: Video Track & Clip Domain Model Invariants
// -------------------------------------------------------------
console.log('\nTest 3: Video Track & Clip Domain Invariants...');
{
  const clip = createVideoClip({
    name: 'Intro Cut',
    startTime: 2.0,
    duration: 5.0,
    sourceDuration: 20.0,
    trimIn: 1.5,
    trimOut: 6.5,
    speed: 1.0,
    transform: { scale: 1.25, opacity: 0.9, blendMode: 'screen' },
    crop: { top: 10, bottom: 10, left: 5, right: 5 },
    transitionIn: { type: 'crossfade', duration: 0.8 },
  });

  assert.ok(clip.id.startsWith('clip_v_'), 'Stable video clip ID assigned');
  assert.strictEqual(clip.startTime, 2.0);
  assert.strictEqual(clip.duration, 5.0);
  assert.strictEqual(clip.trimIn, 1.5);
  assert.strictEqual(clip.trimOut, 6.5);
  assert.strictEqual(clip.transform.scale, 1.25);
  assert.strictEqual(clip.transform.blendMode, 'screen');
  assert.strictEqual(clip.crop.top, 10);
  assert.strictEqual(clip.transitionIn.type, 'crossfade');

  const track = createVideoTrack({ clips: [clip] }, 'V1 · Main');
  assert.ok(track.id.startsWith('track_v_'), 'Stable video track ID assigned');
  assert.strictEqual(track.clips.length, 1);
  assert.strictEqual(track.clips[0].trackId, track.id);

  console.log('  ✓ Video clip and track entities satisfy domain constraints.');
}

// -------------------------------------------------------------
// Test 4: Accurate Sub-Second Seeking & Time Alignment
// -------------------------------------------------------------
console.log('\nTest 4: Accurate Sub-Second Seeking & Clip Selection...');
{
  const track = createVideoTrack({
    clips: [
      createVideoClip({ id: 'clip_v_1', startTime: 0.0, duration: 4.0, trimIn: 1.0, trimOut: 5.0, speed: 1.0 }),
      createVideoClip({ id: 'clip_v_2', startTime: 4.0, duration: 6.0, trimIn: 0.0, trimOut: 6.0, speed: 1.0 }),
    ],
  });

  // Evaluate at t = 2.5s (inside clip_v_1)
  const activeAt2_5 = evaluateActiveVideoClipsAtTime([track], 2.5);
  assert.strictEqual(activeAt2_5.length, 1);
  assert.strictEqual(activeAt2_5[0].clip.id, 'clip_v_1');
  assert.strictEqual(activeAt2_5[0].sourceTime, 3.5, 'sourceTime = trimIn (1.0) + (2.5 - 0.0) = 3.5s');

  // Evaluate at t = 5.5s (inside clip_v_2)
  const activeAt5_5 = evaluateActiveVideoClipsAtTime([track], 5.5);
  assert.strictEqual(activeAt5_5.length, 1);
  assert.strictEqual(activeAt5_5[0].clip.id, 'clip_v_2');
  assert.strictEqual(activeAt5_5[0].sourceTime, 1.5, 'sourceTime = trimIn (0.0) + (5.5 - 4.0) = 1.5s');

  // Evaluate beyond all clips
  const activeAt15 = evaluateActiveVideoClipsAtTime([track], 15.0);
  assert.strictEqual(activeAt15.length, 0, 'No active clips beyond track bounds');

  console.log('  ✓ Sub-second timeline evaluation maps accurately to source playback timestamps.');
}

// -------------------------------------------------------------
// Test 5: Non-Destructive Clip Splitting at Playhead
// -------------------------------------------------------------
console.log('\nTest 5: Non-Destructive Clip Splitting at Playhead...');
{
  const initialClip = createVideoClip({
    id: 'clip_v_master',
    name: 'Long_Broll.mp4',
    startTime: 0.0,
    duration: 10.0,
    sourceDuration: 30.0,
    trimIn: 2.0,
    trimOut: 12.0,
    speed: 1.0,
  });

  const track = createVideoTrack({ clips: [initialClip] });

  // Split at t = 4.0s
  const splitTrack = splitVideoClip(track, 'clip_v_master', 4.0);
  assert.strictEqual(splitTrack.clips.length, 2, 'Track should now contain two continuous clips');

  const [left, right] = splitTrack.clips;
  assert.strictEqual(left.startTime, 0.0);
  assert.strictEqual(left.duration, 4.0, 'Left clip duration is 4.0s');
  assert.strictEqual(left.trimIn, 2.0);
  assert.strictEqual(left.trimOut, 6.0, 'Left trimOut ends at 2.0 + 4.0 = 6.0s');

  assert.strictEqual(right.startTime, 4.0, 'Right clip starts at split point 4.0s');
  assert.strictEqual(right.duration, 6.0, 'Right clip duration is 10.0 - 4.0 = 6.0s');
  assert.strictEqual(right.trimIn, 6.0, 'Right trimIn seamlessly picks up from 6.0s');
  assert.strictEqual(right.trimOut, 12.0, 'Right trimOut preserves original end point');

  console.log('  ✓ Clip split operates non-destructively with 100% boundary and trim continuity.');
}

// -------------------------------------------------------------
// Test 6: Non-Destructive Clip Trimming In/Out
// -------------------------------------------------------------
console.log('\nTest 6: Non-Destructive Clip Trimming In/Out...');
{
  const clip = createVideoClip({
    id: 'clip_v_trim_target',
    startTime: 1.0,
    duration: 8.0,
    sourceDuration: 20.0,
    trimIn: 0.0,
    trimOut: 8.0,
    speed: 1.0,
  });

  const track = createVideoTrack({ clips: [clip] });
  const trimmedTrack = trimVideoClip(track, 'clip_v_trim_target', 2.0, 7.0);

  const trimmed = trimmedTrack.clips[0];
  assert.strictEqual(trimmed.trimIn, 2.0);
  assert.strictEqual(trimmed.trimOut, 7.0);
  assert.strictEqual(trimmed.duration, 5.0, 'Duration auto-computed: 7.0 - 2.0 = 5.0s');

  console.log('  ✓ Clip trimming modifies source in/out boundaries without degrading duration accuracy.');
}

// -------------------------------------------------------------
// Test 7: Ripple Delete with Automatic Gap Closure
// -------------------------------------------------------------
console.log('\nTest 7: Ripple Delete with Automatic Gap Closure...');
{
  const clipA = createVideoClip({ id: 'clip_v_A', startTime: 0.0, duration: 3.0 });
  const clipB = createVideoClip({ id: 'clip_v_B', startTime: 3.0, duration: 4.0 });
  const clipC = createVideoClip({ id: 'clip_v_C', startTime: 7.0, duration: 5.0 });

  const track = createVideoTrack({ clips: [clipA, clipB, clipC] });

  // Ripple Delete Clip B (duration 4.0s)
  const rippledTrack = rippleDeleteVideoClip(track, 'clip_v_B');
  assert.strictEqual(rippledTrack.clips.length, 2, 'Clip B must be removed');

  const [resA, resC] = rippledTrack.clips;
  assert.strictEqual(resA.id, 'clip_v_A');
  assert.strictEqual(resA.startTime, 0.0, 'Clip A remains unchanged');

  assert.strictEqual(resC.id, 'clip_v_C');
  assert.strictEqual(resC.startTime, 3.0, 'Clip C shifted left by exactly 4.0s (7.0 - 4.0 = 3.0s)');

  console.log('  ✓ Ripple delete automatically closes timeline gap seamlessly.');
}

// -------------------------------------------------------------
// Test 8: Transform, Crop & Transitions Parameter Updates
// -------------------------------------------------------------
console.log('\nTest 8: Transform, Crop & Transitions Parameters...');
{
  const clip = createVideoClip({ id: 'clip_v_fx' });
  const track = createVideoTrack({ clips: [clip] });

  // Update transform
  const trackTransformed = updateVideoClipTransform(track, 'clip_v_fx', {
    x: 50,
    y: -30,
    scale: 1.5,
    rotation: 45,
    blendMode: 'multiply',
  });
  const tClip = trackTransformed.clips[0];
  assert.strictEqual(tClip.transform.x, 50);
  assert.strictEqual(tClip.transform.y, -30);
  assert.strictEqual(tClip.transform.scale, 1.5);
  assert.strictEqual(tClip.transform.rotation, 45);
  assert.strictEqual(tClip.transform.blendMode, 'multiply');

  // Update crop
  const trackCropped = updateVideoClipCrop(trackTransformed, 'clip_v_fx', {
    top: 15,
    bottom: 15,
  });
  assert.strictEqual(trackCropped.clips[0].crop.top, 15);
  assert.strictEqual(trackCropped.clips[0].crop.bottom, 15);

  // Set transition in
  const trackTransitioned = setVideoClipTransition(trackCropped, 'clip_v_fx', 'in', {
    type: 'wipeLeft',
    duration: 0.75,
  });
  assert.strictEqual(trackTransitioned.clips[0].transitionIn.type, 'wipeLeft');
  assert.strictEqual(trackTransitioned.clips[0].transitionIn.duration, 0.75);

  console.log('  ✓ Transform, non-destructive crop, and transition edge parameters verified.');
}

// -------------------------------------------------------------
// Test 9: Text/Shape/Still Overlays Compositing & Caption Alignment
// -------------------------------------------------------------
console.log('\nTest 9: Text/Shape/Still Overlays Compositing & Captions...');
{
  const sampleProject = createSampleVideoProject();
  assert.ok(sampleProject.scenes[0].layers.length >= 2, 'Scene contains graphic & text layers');
  assert.ok(sampleProject.videoTracks[0].clips.length >= 2, 'Project has video clips');

  const clip1 = sampleProject.videoTracks[0].clips[0];
  assert.ok(clip1.captions.length > 0, 'Clip 1 has caption cue');
  assert.strictEqual(clip1.captions[0].text, 'ZÜRICH CREATIVE LABS · 47.3769° N');

  // Evaluate at t = 2.0s where caption is active
  const activeAt2 = evaluateActiveVideoClipsAtTime(sampleProject.videoTracks, 2.0);
  assert.strictEqual(activeAt2.length, 1);
  assert.ok(activeAt2[0].activeCaption !== null, 'Active caption cue found at t = 2.0s');
  assert.strictEqual(activeAt2[0].activeCaption.text, 'ZÜRICH CREATIVE LABS · 47.3769° N');

  // Transition In Factor: at t = 0.4s with transitionIn duration 0.8s
  const activeAt0_4 = evaluateActiveVideoClipsAtTime(sampleProject.videoTracks, 0.4);
  assert.strictEqual(activeAt0_4[0].transitionIn.factor, 0.5, 'Transition in factor is exactly 50%');

  console.log('  ✓ Still/text overlay structure and broadcast caption cue synchronization verified.');
}

// -------------------------------------------------------------
// Test 10: Project Schema V1 Serialization & Save/Reopen Round-Trip
// -------------------------------------------------------------
console.log('\nTest 10: Project Schema V1 Serialization & Save/Reopen Round-Trip...');
{
  const original = createSampleVideoProject();
  const serialized = serializeProject(original);
  assert.strictEqual(typeof serialized, 'string', 'Serialized output is a valid JSON string');

  const reopened = deserializeProject(serialized);
  const validation = validateProjectSchema(reopened);
  assert.strictEqual(validation.valid, true, 'Reopened project passes Schema V1 validation');

  // Verify videoTracks integrity preserved
  assert.strictEqual(reopened.videoTracks.length, 1);
  assert.strictEqual(reopened.videoTracks[0].clips.length, 2);

  const c1 = reopened.videoTracks[0].clips[0];
  assert.strictEqual(c1.id, 'clip_v_sample_1');
  assert.strictEqual(c1.duration, 5.0);
  assert.strictEqual(c1.crop.top, 5);
  assert.strictEqual(c1.transitionIn.type, 'fadeToBlack');
  assert.strictEqual(c1.captions[0].text, 'ZÜRICH CREATIVE LABS · 47.3769° N');

  console.log('  ✓ Full project save -> serialize -> deserialize round-trip losslessly verified.');
}

console.log('\n🎉 ALL 10 FASE 7 VIDEO TESTS PASSED SUCCESSFULLY!\n');
