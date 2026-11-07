/**
 * @file videoService.js
 * @description Video Timeline & Editing Operations Engine (Fase 7)
 * Implements non-destructive split, trim, ripple delete, transform, crop,
 * transitions (crossfade, fadeToBlack, wipe, slide), audio sync, captioning,
 * and deterministic offscreen canvas frame compositing.
 */

import { createVideoClip } from '../domain/videoModels.js';

/**
 * Splits a video clip into two continuous adjacent clips at splitTime.
 * Non-destructive: preserves underlying asset trim continuity.
 * @param {object} track
 * @param {string} clipId
 * @param {number} splitTime - Global timeline time in seconds
 * @returns {object} Updated track with split clips
 */
export function splitVideoClip(track, clipId, splitTime) {
  if (!track || !Array.isArray(track.clips)) return track;

  const clipIndex = track.clips.findIndex((c) => c.id === clipId);
  if (clipIndex === -1) return track;

  const clip = track.clips[clipIndex];
  const clipStart = clip.startTime;
  const clipEnd = clip.startTime + clip.duration;

  // Split point must fall strictly within clip boundary
  if (splitTime <= clipStart + 0.05 || splitTime >= clipEnd - 0.05) {
    return track;
  }

  const leftDuration = Number((splitTime - clipStart).toFixed(3));
  const rightDuration = Number((clip.duration - leftDuration).toFixed(3));
  const leftTrimOut = Number((clip.trimIn + leftDuration * clip.speed).toFixed(3));

  const leftClip = createVideoClip({
    ...clip,
    duration: leftDuration,
    trimOut: leftTrimOut,
    transitionOut: { type: 'none', duration: 0 },
  });

  const rightClip = createVideoClip({
    ...clip,
    id: undefined, // generates new stable clip ID
    name: `${clip.name} (Part 2)`,
    startTime: Number(splitTime.toFixed(3)),
    duration: rightDuration,
    trimIn: leftTrimOut,
    trimOut: clip.trimOut,
    transitionIn: { type: 'none', duration: 0 },
  });

  const updatedClips = [...track.clips];
  updatedClips.splice(clipIndex, 1, leftClip, rightClip);

  return {
    ...track,
    clips: updatedClips,
    updatedAt: Date.now(),
  };
}

/**
 * Trims a clip's in-point and out-point non-destructively, updating duration.
 * @param {object} track
 * @param {string} clipId
 * @param {number} newTrimIn
 * @param {number} newTrimOut
 * @returns {object} Updated track
 */
export function trimVideoClip(track, clipId, newTrimIn, newTrimOut) {
  if (!track || !Array.isArray(track.clips)) return track;

  const clipIndex = track.clips.findIndex((c) => c.id === clipId);
  if (clipIndex === -1) return track;

  const clip = track.clips[clipIndex];
  const sourceDuration = clip.sourceDuration || 60;

  const clampedIn = Math.max(0, Math.min(sourceDuration - 0.1, Number(newTrimIn) || 0));
  const clampedOut = Math.max(clampedIn + 0.1, Math.min(sourceDuration, Number(newTrimOut) || sourceDuration));
  const newDuration = Number(((clampedOut - clampedIn) / clip.speed).toFixed(3));

  const updatedClip = createVideoClip({
    ...clip,
    trimIn: Number(clampedIn.toFixed(3)),
    trimOut: Number(clampedOut.toFixed(3)),
    duration: newDuration,
  });

  const updatedClips = [...track.clips];
  updatedClips[clipIndex] = updatedClip;

  return {
    ...track,
    clips: updatedClips,
    updatedAt: Date.now(),
  };
}

/**
 * Ripple Deletes a clip: removes the target clip and shifts all subsequent clips
 * to the left by the deleted clip's duration, closing the timeline gap automatically.
 * @param {object} track
 * @param {string} clipId
 * @returns {object} Updated track with gap closed
 */
export function rippleDeleteVideoClip(track, clipId) {
  if (!track || !Array.isArray(track.clips)) return track;

  const clipIndex = track.clips.findIndex((c) => c.id === clipId);
  if (clipIndex === -1) return track;

  const targetClip = track.clips[clipIndex];
  const gapDuration = targetClip.duration;
  const targetStartTime = targetClip.startTime;

  const updatedClips = track.clips
    .filter((c) => c.id !== clipId)
    .map((c) => {
      if (c.startTime > targetStartTime) {
        return createVideoClip({
          ...c,
          startTime: Number(Math.max(0, c.startTime - gapDuration).toFixed(3)),
        });
      }
      return c;
    });

  return {
    ...track,
    clips: updatedClips,
    updatedAt: Date.now(),
  };
}

/**
 * Updates video clip transform parameters.
 * @param {object} track
 * @param {string} clipId
 * @param {object} patch
 * @returns {object}
 */
export function updateVideoClipTransform(track, clipId, patch = {}) {
  if (!track || !Array.isArray(track.clips)) return track;

  const updatedClips = track.clips.map((c) => {
    if (c.id === clipId) {
      return createVideoClip({
        ...c,
        transform: {
          ...c.transform,
          ...patch,
        },
      });
    }
    return c;
  });

  return { ...track, clips: updatedClips, updatedAt: Date.now() };
}

/**
 * Updates video clip crop boundaries (percentages 0..90).
 * @param {object} track
 * @param {string} clipId
 * @param {object} cropPatch
 * @returns {object}
 */
export function updateVideoClipCrop(track, clipId, cropPatch = {}) {
  if (!track || !Array.isArray(track.clips)) return track;

  const updatedClips = track.clips.map((c) => {
    if (c.id === clipId) {
      return createVideoClip({
        ...c,
        crop: {
          ...c.crop,
          ...cropPatch,
        },
      });
    }
    return c;
  });

  return { ...track, clips: updatedClips, updatedAt: Date.now() };
}

/**
 * Sets transition for clip entry (in) or exit (out).
 * @param {object} track
 * @param {string} clipId
 * @param {'in' | 'out'} edge
 * @param {{ type: string, duration: number }} transition
 * @returns {object}
 */
export function setVideoClipTransition(track, clipId, edge, transition = {}) {
  if (!track || !Array.isArray(track.clips)) return track;

  const updatedClips = track.clips.map((c) => {
    if (c.id === clipId) {
      return createVideoClip({
        ...c,
        ...(edge === 'in' ? { transitionIn: transition } : { transitionOut: transition }),
      });
    }
    return c;
  });

  return { ...track, clips: updatedClips, updatedAt: Date.now() };
}

/**
 * Evaluates active video clips and transition progress across all tracks at a given timeline time.
 * @param {Array<object>} videoTracks
 * @param {number} currentTime - Global time in seconds
 * @returns {Array<object>} List of active clip evaluation states
 */
export function evaluateActiveVideoClipsAtTime(videoTracks, currentTime = 0) {
  if (!Array.isArray(videoTracks)) return [];

  const activeStates = [];

  for (const track of videoTracks) {
    if (!track.visible || track.muted) continue;

    for (const clip of track.clips || []) {
      const clipStart = clip.startTime;
      const clipEnd = clip.startTime + clip.duration;

      if (currentTime >= clipStart && currentTime < clipEnd) {
        const offsetInClip = currentTime - clipStart;
        const sourceTime = clip.trimIn + offsetInClip * clip.speed;

        // Transition In Progress (0.0 -> 1.0)
        let transitionInFactor = 1.0;
        if (clip.transitionIn && clip.transitionIn.type !== 'none' && clip.transitionIn.duration > 0) {
          transitionInFactor = Math.min(1.0, offsetInClip / clip.transitionIn.duration);
        }

        // Transition Out Progress (1.0 -> 0.0)
        let transitionOutFactor = 1.0;
        const remainingTime = clipEnd - currentTime;
        if (clip.transitionOut && clip.transitionOut.type !== 'none' && clip.transitionOut.duration > 0) {
          transitionOutFactor = Math.min(1.0, remainingTime / clip.transitionOut.duration);
        }

        // Check for active caption cue
        const activeCaption = (clip.captions || []).find(
          (cue) => sourceTime >= cue.startTime && sourceTime <= cue.endTime
        );

        activeStates.push({
          track,
          clip,
          sourceTime,
          transitionIn: {
            type: clip.transitionIn?.type || 'none',
            factor: transitionInFactor,
          },
          transitionOut: {
            type: clip.transitionOut?.type || 'none',
            factor: transitionOutFactor,
          },
          activeCaption: activeCaption || null,
        });
      }
    }
  }

  return activeStates;
}

/**
 * Renders an active video clip frame onto a target 2D canvas context with
 * transform, crop, transition effects, and caption overlay.
 * @param {object} params
 */
export function renderVideoClipToCanvas({
  ctx,
  width,
  height,
  clip,
  sourceElement,
  transitionIn,
  transitionOut,
  activeCaption,
}) {
  if (!ctx) return;

  ctx.save();

  // 1. Calculate Crop Rectangles
  const crop = clip.crop || { top: 0, bottom: 0, left: 0, right: 0 };
  const cropL = (crop.left / 100) * width;
  const cropR = width - (crop.right / 100) * width;
  const cropT = (crop.top / 100) * height;
  const cropB = height - (crop.bottom / 100) * height;
  const cropW = Math.max(1, cropR - cropL);
  const cropH = Math.max(1, cropB - cropT);

  // Apply non-destructive crop clipping path
  ctx.beginPath();
  ctx.rect(cropL, cropT, cropW, cropH);
  ctx.clip();

  // 2. Calculate Effective Alpha & Transition Modulations
  const transform = clip.transform || {};
  let effectiveAlpha = transform.opacity !== undefined ? transform.opacity : 1.0;
  let wipeProgress = 1.0;
  let slideOffsetY = 0;

  // Evaluate In Transition
  if (transitionIn?.type === 'crossfade') {
    effectiveAlpha *= transitionIn.factor;
  } else if (transitionIn?.type === 'fadeToBlack') {
    effectiveAlpha *= Math.pow(transitionIn.factor, 1.5);
  } else if (transitionIn?.type === 'wipeLeft') {
    wipeProgress = transitionIn.factor;
  } else if (transitionIn?.type === 'slideUp') {
    slideOffsetY = (1 - transitionIn.factor) * height * 0.5;
  }

  // Evaluate Out Transition
  if (transitionOut?.type === 'crossfade') {
    effectiveAlpha *= transitionOut.factor;
  } else if (transitionOut?.type === 'fadeToBlack') {
    effectiveAlpha *= Math.pow(transitionOut.factor, 1.5);
  }

  ctx.globalAlpha = Math.max(0, Math.min(1.0, effectiveAlpha));
  ctx.globalCompositeOperation = transform.blendMode || 'source-over';

  // Apply Wipe Transition Clip Mask if active
  if (transitionIn?.type === 'wipeLeft' && wipeProgress < 1.0) {
    ctx.beginPath();
    ctx.rect(cropL, cropT, cropW * wipeProgress, cropH);
    ctx.clip();
  } else if (transitionIn?.type === 'wipeRight' && wipeProgress < 1.0) {
    ctx.beginPath();
    ctx.rect(cropR - cropW * wipeProgress, cropT, cropW * wipeProgress, cropH);
    ctx.clip();
  }

  // 3. Apply Transform Matrix (Position, Rotation, Scale, Slide)
  const cx = width / 2 + (transform.x || 0);
  const cy = height / 2 + (transform.y || 0) + slideOffsetY;
  const scale = transform.scale || 1.0;
  const rotationRad = ((transform.rotation || 0) * Math.PI) / 180;

  ctx.translate(cx, cy);
  if (rotationRad !== 0) ctx.rotate(rotationRad);
  if (scale !== 1.0) ctx.scale(scale, scale);

  // 4. Draw Video Media Source or High-Contrast Placeholder
  if (sourceElement && (sourceElement.readyState >= 2 || sourceElement.tagName === 'CANVAS' || sourceElement.tagName === 'IMG')) {
    try {
      ctx.drawImage(sourceElement, -width / 2, -height / 2, width, height);
    } catch {
      drawFallbackVideoPlate(ctx, width, height, clip);
    }
  } else {
    drawFallbackVideoPlate(ctx, width, height, clip);
  }

  ctx.restore();

  // 5. Draw Active Caption Overlay (Top of Video Plate)
  if (activeCaption && activeCaption.text) {
    drawCaptionOverlay(ctx, width, height, activeCaption);
  }
}

/**
 * Draws a clean high-contrast video placeholder when media element is decoding or buffering.
 */
function drawFallbackVideoPlate(ctx, width, height, clip) {
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(-width / 2, -height / 2, width, height);

  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 4;
  ctx.strokeRect(-width / 2 + 10, -height / 2 + 10, width - 20, height - 20);

  ctx.fillStyle = '#94a3b8';
  ctx.font = 'bold 20px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(clip.name || 'VIDEO TRACK CLIP', 0, -12);

  ctx.font = '12px monospace';
  ctx.fillStyle = '#64748b';
  ctx.fillText(`Codec: ${clip.codec || 'H.264'} · Dur: ${clip.duration}s`, 0, 16);
}

/**
 * Draws professional broadcast caption cue overlay onto canvas.
 */
export function drawCaptionOverlay(ctx, width, height, caption) {
  const text = caption.text;
  if (!text) return;

  ctx.save();
  const fontSize = caption.style?.fontSize || Math.round(height * 0.038);
  ctx.font = `600 ${fontSize}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const textMetrics = ctx.measureText(text);
  const padX = fontSize * 0.8;
  const padY = fontSize * 0.4;
  const boxW = textMetrics.width + padX * 2;
  const boxH = fontSize + padY * 2;

  let posY = height - boxH - height * 0.08;
  if (caption.position === 'top') {
    posY = height * 0.1;
  } else if (caption.position === 'center') {
    posY = (height - boxH) / 2;
  }

  const posX = (width - boxW) / 2;

  // Background Box with rounded corners
  ctx.fillStyle = caption.style?.bg || 'rgba(0, 0, 0, 0.78)';
  const radius = 8;
  ctx.beginPath();
  ctx.moveTo(posX + radius, posY);
  ctx.lineTo(posX + boxW - radius, posY);
  ctx.quadraticCurveTo(posX + boxW, posY, posX + boxW, posY + radius);
  ctx.lineTo(posX + boxW, posY + boxH - radius);
  ctx.quadraticCurveTo(posX + boxW, posY + boxH, posX + boxW - radius, posY + boxH);
  ctx.lineTo(posX + radius, posY + boxH);
  ctx.quadraticCurveTo(posX, posY + boxH, posX, posY + boxH - radius);
  ctx.lineTo(posX, posY + radius);
  ctx.quadraticCurveTo(posX, posY, posX + radius, posY);
  ctx.closePath();
  ctx.fill();

  // Caption Typography
  ctx.fillStyle = caption.style?.color || '#ffffff';
  ctx.fillText(text, width / 2, posY + boxH / 2);

  ctx.restore();
}

/**
 * Accurately seeks an HTMLVideoElement to targetTime without race conditions.
 * @param {HTMLVideoElement} videoEl
 * @param {number} targetTime
 * @returns {Promise<void>}
 */
export function seekVideoElementAccurately(videoEl, targetTime) {
  return new Promise((resolve) => {
    if (!videoEl || typeof videoEl.currentTime !== 'number') {
      return resolve();
    }

    const clampedTime = Math.max(0, Math.min(videoEl.duration || 3600, targetTime));
    if (Math.abs(videoEl.currentTime - clampedTime) < 0.001) {
      return resolve();
    }

    let timeoutId = null;
    const onSeeked = () => {
      videoEl.removeEventListener('seeked', onSeeked);
      if (timeoutId) clearTimeout(timeoutId);
      resolve();
    };

    videoEl.addEventListener('seeked', onSeeked, { once: true });
    videoEl.currentTime = clampedTime;

    // Safety timeout in case seeked doesn't fire immediately
    timeoutId = setTimeout(() => {
      videoEl.removeEventListener('seeked', onSeeked);
      resolve();
    }, 150);
  });
}

/**
 * Generates a validated synthetic test video clip for headless testing and zero-dependency verification (Fase 9).
 * Emulates SMPTE color bar calibration pattern and caption timing.
 * 
 * @param {object} options
 * @returns {object} VideoClip entity
 */
export function generateSyntheticTestVideoClip(options = {}) {
  const duration = Math.max(1.0, Number(options.duration) || 6.0);
  const clipId = options.id || `clip_v_test_${Date.now()}`;
  return createVideoClip({
    id: clipId,
    name: options.name || 'SMPTE Calibration & Motion Pattern (Procedural)',
    assetId: options.assetId || 'asset_smpte_test_pattern',
    trackId: options.trackId || 'track_v_1',
    startTime: options.startTime !== undefined ? Number(options.startTime) : 0,
    duration,
    sourceDuration: Math.max(duration, Number(options.sourceDuration) || duration),
    trimIn: options.trimIn !== undefined ? Number(options.trimIn) : 0,
    trimOut: options.trimOut !== undefined ? Number(options.trimOut) : (Math.max(duration, Number(options.sourceDuration) || duration)),
    speed: options.speed || 1.0,
    transform: {
      x: 0,
      y: 0,
      scale: 1.0,
      rotation: 0,
      opacity: 1.0,
      blendMode: 'source-over',
    },
    crop: { top: 0, bottom: 0, left: 0, right: 0 },
    transitionIn: { type: options.transitionIn || 'crossfade', duration: 0.5 },
    transitionOut: { type: options.transitionOut || 'fadeToBlack', duration: 0.5 },
    captions: [
      {
        id: 'cap_calib_1',
        startTime: 0.5,
        endTime: Math.min(3.5, duration),
        text: 'Clover Motion Calibration · 1080p 30fps Rec.709',
        position: 'bottom',
      },
    ],
    codec: 'avc1.64001F',
  });
}

