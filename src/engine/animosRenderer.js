/**
 * @file animosRenderer.js
 * @description Pure HTML5 2D Canvas 3D/Perspective Card Showcase Renderer
 * reverse-engineered from Animos Editor (https://animos.app/editor) and enhanced
 * with transitions.dev Jakub Antalik motion physics, card tilt glare, and banner stacking.
 * Supports 32 showcase templates across 9 categories with C1-continuous periodic math.
 */

import {
  DEFAULT_SHOWCASE_CARDS,
  ANIMOS_BG_GRADIENTS,
} from '../constants/animosTemplates.js';
import { solveCubicBezier, transitionsDevEase } from '../utils/timecode.js';

const imageCache = new Map();

function getLoadedImage(dataUrl) {
  if (!dataUrl || typeof window === 'undefined') return null;
  if (imageCache.has(dataUrl)) {
    const entry = imageCache.get(dataUrl);
    return entry.complete ? entry : null;
  }
  const img = new window.Image();
  img.crossOrigin = 'anonymous';
  img.src = dataUrl;
  imageCache.set(dataUrl, img);
  return img.complete ? img : null;
}

function drawRoundedRectPath(ctx, x, y, w, h, r) {
  const radius = Math.max(0, Math.min(r, Math.min(w, h) / 2));
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

/**
 * Draws the content of a showcase card with transitions.dev specular glare
 * and depth shading.
 */
function drawShowcaseCardContent(
  ctx,
  slotIndex,
  cardW,
  cardH,
  cornerRadiusPx,
  mediaSlots = [],
  depthNorm = 1.0,
  glareAngle = 0
) {
  const customSlot = mediaSlots?.[slotIndex];
  const fallback = DEFAULT_SHOWCASE_CARDS[slotIndex % DEFAULT_SHOWCASE_CARDS.length];

  ctx.save();
  drawRoundedRectPath(ctx, -cardW / 2, -cardH / 2, cardW, cardH, cornerRadiusPx);
  ctx.clip();

  const customImg = customSlot?.dataUrl ? getLoadedImage(customSlot.dataUrl) : null;
  if (customImg && customImg.width > 0 && customImg.height > 0) {
    // Center-weighted cover crop
    const zoom = customSlot.zoom || 1;
    const panX = customSlot.panX || 0;
    const panY = customSlot.panY || 0;
    const imgRatio = customImg.width / customImg.height;
    const boxRatio = cardW / cardH;
    let drawW = cardW * zoom;
    let drawH = cardH * zoom;
    if (imgRatio > boxRatio) {
      drawW = cardH * imgRatio * zoom;
    } else {
      drawH = (cardW / imgRatio) * zoom;
    }
    ctx.drawImage(
      customImg,
      -drawW / 2 + panX * cardW * 0.25,
      -drawH / 2 + panY * cardH * 0.25,
      drawW,
      drawH
    );
  } else {
    // Vibrant procedural design showcase card
    ctx.fillStyle = customSlot?.bg || fallback.bg;
    ctx.fillRect(-cardW / 2, -cardH / 2, cardW, cardH);

    // Subtle geometric motif inside card
    ctx.save();
    ctx.strokeStyle = fallback.accent;
    ctx.fillStyle = fallback.accent;
    ctx.globalAlpha = 0.25;
    ctx.lineWidth = Math.max(1.5, cardW * 0.012);

    const motif = fallback.motif;
    if (motif === 'rings') {
      for (let i = 1; i <= 3; i++) {
        ctx.beginPath();
        ctx.arc(cardW * 0.18, -cardH * 0.1, cardW * 0.14 * i, 0, Math.PI * 2);
        ctx.stroke();
      }
    } else if (motif === 'grid') {
      const step = cardW / 5;
      for (let gx = -cardW / 2; gx <= cardW / 2; gx += step) {
        ctx.beginPath();
        ctx.moveTo(gx, -cardH / 2);
        ctx.lineTo(gx, cardH / 2);
        ctx.stroke();
      }
      for (let gy = -cardH / 2; gy <= cardH / 2; gy += step) {
        ctx.beginPath();
        ctx.moveTo(-cardW / 2, gy);
        ctx.lineTo(cardW / 2, gy);
        ctx.stroke();
      }
    } else if (motif === 'waves' || motif === 'pleats') {
      for (let i = 0; i < 6; i++) {
        const bx = -cardW * 0.35 + i * (cardW * 0.14);
        ctx.fillRect(bx, -cardH * 0.35, cardW * 0.06, cardH * 0.45);
      }
    } else if (motif === 'prism' || motif === 'orbit') {
      ctx.beginPath();
      ctx.arc(0, -cardH * 0.06, Math.min(cardW, cardH) * 0.26, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillRect(-cardW * 0.06, -cardH * 0.3, cardW * 0.12, cardH * 0.4);
      ctx.fillRect(-cardW * 0.26, -cardH * 0.14, cardW * 0.52, cardH * 0.12);
    }
    ctx.restore();

    // Top-left slot number pill
    const pad = cardW * 0.08;
    ctx.fillStyle = fallback.accent;
    ctx.font = `700 ${Math.max(10, Math.round(cardW * 0.055))}px 'JetBrains Mono', monospace`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(
      customSlot?.subtitle || fallback.subtitle,
      -cardW / 2 + pad,
      -cardH / 2 + pad
    );

    // Bottom-left bold title
    ctx.fillStyle = fallback.ink;
    ctx.font = `800 ${Math.max(12, Math.round(cardW * 0.1))}px 'Space Grotesk', sans-serif`;
    ctx.textBaseline = 'bottom';
    ctx.fillText(
      customSlot?.title || fallback.title,
      -cardW / 2 + pad,
      cardH / 2 - pad
    );
  }

  // Transitions.dev Specular Glare (Screen blend light sheen tracking 3D tilt)
  const gx = Math.cos(glareAngle) * cardW * 0.35;
  const gy = Math.sin(glareAngle) * cardH * 0.35;
  const glareGrad = ctx.createRadialGradient(
    gx, gy, 0,
    gx, gy, Math.max(cardW, cardH) * 0.95
  );
  glareGrad.addColorStop(0, 'rgba(255, 255, 255, 0.24)');
  glareGrad.addColorStop(0.45, 'rgba(255, 255, 255, 0.06)');
  glareGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = glareGrad;
  ctx.fill();

  // Depth occlusion (farther cards are gently dimmed for natural photographic depth)
  if (depthNorm < 0.95) {
    const dimAlpha = Math.max(0, Math.min(0.55, (1 - depthNorm) * 0.5));
    ctx.fillStyle = `rgba(0, 0, 0, ${dimAlpha.toFixed(3)})`;
    ctx.fillRect(-cardW / 2, -cardH / 2, cardW, cardH);
  }

  // Subtle inner card bevel border
  drawRoundedRectPath(ctx, -cardW / 2, -cardH / 2, cardW, cardH, cornerRadiusPx);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.20)';
  ctx.lineWidth = Math.max(1, cardW * 0.008);
  ctx.stroke();

  ctx.restore();
}

function getCardAspectMultiplier(aspect = '1:1') {
  switch (aspect) {
    case '16:9':
    case '16:9 Wide':
      return { w: 1.35, h: 0.76 };
    case '9:16':
    case '9:16 Story':
      return { w: 0.76, h: 1.35 };
    case '4:5':
    case '4:5 Feed':
      return { w: 0.88, h: 1.1 };
    case '3:4':
    case '3:4 Poster':
      return { w: 0.86, h: 1.15 };
    case '1:1':
    default:
      return { w: 1, h: 1 };
  }
}

function renderAnimosBackground(ctx, width, height, gradientId) {
  const gSpec = ANIMOS_BG_GRADIENTS.find((g) => g.id === gradientId);
  if (!gSpec || gSpec.id === 'none') return;

  const grad = ctx.createLinearGradient(0, 0, width, height);
  gSpec.stops.forEach((s) => grad.addColorStop(s.at, s.color));
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);
}

/**
 * Main Animos 3D Showcase Render Pipeline
 * Computes deterministic perspective projection and transitions.dev motion curves.
 */
export function renderAnimosShowcase({
  ctx,
  width,
  height,
  showcaseConfig,
  mediaSlots = [],
  localTime = 0,
  duration = 12,
  audioSignals = { bass: 0, mid: 0, treble: 0, rms: 0 },
}) {
  if (!showcaseConfig || !showcaseConfig.templateId || showcaseConfig.templateId === 'none') {
    return;
  }

  const tplId = showcaseConfig.templateId;
  const u = Math.min(width, height) / 100;
  const cx = width / 2 + (showcaseConfig.offsetX || 0) * u;
  const cy = height / 2 + (showcaseConfig.offsetY || 0) * u;

  // Audio-reactive pulse boost
  const bassBoost = showcaseConfig.audioReactive
    ? 1 + (audioSignals?.bass || 0) * 0.12
    : 1;

  const baseSize = (showcaseConfig.cardSize || 26) * u * bassBoost;
  const aspectMult = getCardAspectMultiplier(showcaseConfig.cardAspect || '1:1');
  const cardW = baseSize * aspectMult.w;
  const cardH = baseSize * aspectMult.h;
  const cornerRadiusPx = (showcaseConfig.cornerRadius ?? 3) * u;
  const slotCount = Math.max(3, Math.min(16, showcaseConfig.slots || 8));
  const safeDuration = Math.max(2, duration || 12);
  const progress = (localTime % safeDuration) / safeDuration;
  const tau = Math.PI * 2;
  const tiltRad = ((showcaseConfig.tilt ?? -18) * Math.PI) / 180;
  const backFade = (showcaseConfig.backFade ?? 55) / 100;
  const focalLength = 900; // Camera focal length for natural perspective

  // Optional Animos gradient backdrop
  if (showcaseConfig.bgGradient && showcaseConfig.bgGradient !== 'none') {
    renderAnimosBackground(ctx, width, height, showcaseConfig.bgGradient);
  }

  const drawCardsList = [];

  // =========================================================================
  // 1. 3D RINGS, GLOBES, ORBITS & BELTS (Continuous 360° Cylindrical & Spherical Math)
  // =========================================================================
  if (
    tplId === 'showcase-stream' ||
    tplId === 'cover-ring' ||
    tplId === 'orbit-showcase' ||
    tplId === 'orbit-bloom' ||
    tplId === 'sweep-ring' ||
    tplId === 'bloom-belt' ||
    tplId === 'lens-orbit'
  ) {
    const rx = width * ((showcaseConfig.ringWidth || 68) / 200);
    const rz = Math.min(width, height) * ((showcaseConfig.ringDepth || 48) / 200);

    for (let i = 0; i < slotCount; i++) {
      const angle = (i / slotCount) * tau + progress * tau;
      const x3 = Math.sin(angle) * rx;
      const z3 = Math.cos(angle) * rz;
      const y3 = -z3 * Math.sin(tiltRad);

      // True perspective division
      const pScale = focalLength / (focalLength + z3);
      const depthNorm = (z3 / rz + 1) / 2; // 0 (back) .. 1 (front)
      const alpha = 1 - (1 - depthNorm) * backFade;

      const rot =
        tplId === 'orbit-bloom'
          ? Math.sin(angle) * 0.28
          : Math.sin(angle) * (tiltRad * 0.32);

      const squeezeX =
        tplId === 'showcase-stream' || tplId === 'cover-ring'
          ? Math.max(0.35, 0.5 + 0.5 * Math.abs(Math.cos(angle * 0.5)))
          : 1;

      drawCardsList.push({
        slotIndex: i,
        x: cx + x3 * pScale,
        y: cy + y3 * pScale,
        z: z3,
        scaleX: pScale * squeezeX,
        scaleY: pScale,
        rotation: rot,
        alpha,
        depthNorm,
        glareAngle: angle,
      });
    }
  }

  // =========================================================================
  // 2. SPHERE WALL & CARD GLOBE (Natural 3D Dome / Geodesic Sphere)
  // =========================================================================
  else if (tplId === 'sphere-globe' || tplId === 'sphere-wall') {
    const isWall = tplId === 'sphere-wall';
    const rows = 3;
    const cols = Math.ceil(slotCount / rows);
    const radius = Math.min(width, height) * (isWall ? 0.44 : 0.36);
    let idx = 0;

    for (let r = 0; r < rows; r++) {
      const lat = ((r - (rows - 1) / 2) / rows) * (isWall ? 0.75 : 1.15);
      for (let c = 0; c < cols; c++) {
        // Continuous rotation around dome
        const lon = (c / cols) * tau + progress * tau + (isWall ? 0 : r * 0.35);
        const ringR = Math.cos(lat) * radius;
        const x3 = Math.sin(lon) * ringR;
        const z3 = Math.cos(lon) * ringR;
        const y3 = Math.sin(lat) * radius + z3 * Math.sin(tiltRad * 0.4);

        const pScale = focalLength / (focalLength + z3);
        const depthNorm = (z3 / radius + 1) / 2;

        // Front-facing priority for Wall (hide cards completely behind the camera dome)
        const wallAlpha = isWall ? Math.max(0, Math.cos(lon)) : 1;
        const alpha = Math.max(0, Math.min(1, (0.35 + depthNorm * 0.65) * wallAlpha));

        drawCardsList.push({
          slotIndex: (idx++) % slotCount,
          x: cx + x3 * pScale,
          y: cy + y3 * pScale,
          z: z3,
          scaleX: pScale * Math.max(0.3, Math.abs(Math.cos(lon * 0.7)) * 0.6 + 0.4),
          scaleY: pScale,
          rotation: Math.sin(lon) * 0.12,
          alpha,
          depthNorm,
          glareAngle: lon,
        });
      }
    }
  }

  // =========================================================================
  // 3. SPIRAL STREAM (Continuous 3D Logarithmic DNA Helix)
  // =========================================================================
  else if (tplId === 'spiral-stream') {
    const totalCards = Math.max(slotCount, 12);
    const rx = width * 0.28;
    const spanH = height * 0.72;

    for (let i = 0; i < totalCards; i++) {
      const norm = ((i / totalCards + progress) % 1);
      const angle = norm * tau * 2.2;
      const x3 = Math.sin(angle) * rx;
      const z3 = Math.cos(angle) * (rx * 0.75);
      const y3 = (norm - 0.5) * spanH;

      const pScale = focalLength / (focalLength + z3);
      const depthNorm = (z3 / (rx * 0.75) + 1) / 2;
      // Smooth sinusoidal envelope at top and bottom to avoid snapping
      const edgeEnvelope = Math.sin(norm * Math.PI);

      drawCardsList.push({
        slotIndex: i % slotCount,
        x: cx + x3 * pScale,
        y: cy + y3 * pScale,
        z: z3,
        scaleX: pScale * 0.9,
        scaleY: pScale * 0.9,
        rotation: Math.cos(angle) * 0.16,
        alpha: edgeEnvelope * (0.3 + depthNorm * 0.7),
        depthNorm,
        glareAngle: angle,
      });
    }
  }

  // =========================================================================
  // 4. 3D CARD TUNNEL & PERSPECTIVE TUNNEL (Wormhole Fly-through)
  // =========================================================================
  else if (tplId === 'card-tunnel' || tplId === 'perspective-tunnel-3d') {
    for (let i = 0; i < slotCount; i++) {
      const zNorm = ((i / slotCount + progress) % 1);
      const ringAngle = i * 1.57 + progress * tau * 0.2;
      const dist = Math.pow(zNorm, 2.0);
      const spreadR = Math.min(width, height) * 0.42 * dist;
      const floatY = Math.sin(localTime * 2.2 + i * 0.7) * 6 * (u / 10);

      // Smooth envelope so cards fade in at vanishing point and fade out at camera lens
      const edgeAlpha = Math.sin(zNorm * Math.PI);
      const scale = 0.22 + dist * 1.15;

      drawCardsList.push({
        slotIndex: i,
        x: cx + Math.cos(ringAngle) * spreadR,
        y: cy + Math.sin(ringAngle) * spreadR + floatY,
        z: (1 - zNorm) * 200,
        scaleX: scale,
        scaleY: scale,
        rotation: Math.sin(ringAngle) * 0.08,
        alpha: edgeAlpha,
        depthNorm: zNorm,
        glareAngle: ringAngle,
      });
    }
  }

  // =========================================================================
  // 5. FAN SHUFFLE & DEPTH STACK FAN (Jakub Antalik / Transitions.dev Poker Fan)
  // Symmetrical organic fan arc with continuous spring physics
  // =========================================================================
  else if (tplId === 'fan-shuffle' || tplId === 'depth-stack-fan') {
    const total = Math.max(4, slotCount);
    // Smooth breathing fan spread using transitions.dev cubic curve
    const cycleNorm = ((progress * 2) % 1);
    const breathe = 0.75 + 0.25 * Math.sin(progress * tau);
    const maxFanAngle = 0.42 * breathe;
    const fanRadius = height * 0.75;

    for (let i = 0; i < total; i++) {
      // Symmetrical normalized position from center: -1 .. 0 .. +1
      const norm = (i - (total - 1) / 2) / Math.max(1, (total - 1) / 2);
      const angle = norm * maxFanAngle;
      const xOffset = Math.sin(angle) * fanRadius;
      const yOffset = (1 - Math.cos(angle)) * fanRadius * 0.65;
      const floatOffset = Math.sin(localTime * 2.0 + i * 0.5) * 5 * (u / 10);

      // Center card pops slightly higher in z-depth
      const zDepth = 100 - Math.abs(norm) * 30 + i * 2;
      const depthNorm = 1 - Math.abs(norm) * 0.25;

      // Realistic 3D card tilt: cards angled away have gentle perspective foreshortening
      const cardTiltScaleX = 0.92 * Math.cos(norm * 0.22);
      const cardTiltScaleY = 0.92;

      drawCardsList.push({
        slotIndex: i % slotCount,
        x: cx + xOffset,
        y: cy + yOffset + floatOffset,
        z: zDepth,
        scaleX: cardTiltScaleX,
        scaleY: cardTiltScaleY,
        rotation: angle,
        alpha: 1,
        depthNorm,
        glareAngle: -angle + Math.PI * 0.25,
      });
    }
  }

  // =========================================================================
  // 6. CARD TOSS (Smooth Ballistic Toss & Catch Physics)
  // =========================================================================
  else if (tplId === 'card-toss') {
    for (let i = 0; i < slotCount; i++) {
      // Shift phase per card so each card tosses in sequence
      const tossPhase = ((progress * slotCount + i) % slotCount) / slotCount;
      const arc = Math.sin(tossPhase * Math.PI);
      const easeArc = Math.pow(arc, 1.4); // Ballistic hang time at apex

      const tossX = (tossPhase - 0.5) * width * 0.48;
      const tossY = -easeArc * height * 0.38 + 20 * u;
      const tossRot = (tossPhase - 0.5) * 0.32;
      const pScale = 0.85 + easeArc * 0.3;

      // Fade in at launch and fade out at catch to eliminate snapping
      const alpha = Math.sin(tossPhase * Math.PI);

      drawCardsList.push({
        slotIndex: i,
        x: cx + tossX,
        y: cy + tossY,
        z: easeArc * 140,
        scaleX: pScale,
        scaleY: pScale,
        rotation: tossRot,
        alpha,
        depthNorm: easeArc,
        glareAngle: tossRot,
      });
    }
  }

  // =========================================================================
  // 7. VORTEX SPIN (Conical 3D Swirl)
  // =========================================================================
  else if (tplId === 'vortex-spin') {
    for (let i = 0; i < slotCount; i++) {
      const angle = (i / slotCount) * tau + progress * tau;
      const spiralNorm = ((i / slotCount + progress * 0.5) % 1);
      const spiralR = (width * 0.36) * (0.35 + 0.65 * spiralNorm);
      const x3 = Math.sin(angle) * spiralR;
      const z3 = Math.cos(angle) * (spiralR * 0.6);
      const y3 = (spiralNorm - 0.5) * height * 0.5;

      const pScale = focalLength / (focalLength + z3);
      const depthNorm = (z3 / (width * 0.25) + 1) / 2;
      const edgeEnvelope = Math.sin(spiralNorm * Math.PI);

      drawCardsList.push({
        slotIndex: i,
        x: cx + x3 * pScale,
        y: cy + y3 * pScale,
        z: z3,
        scaleX: pScale * 0.88,
        scaleY: pScale * 0.88,
        rotation: angle * 0.15,
        alpha: edgeEnvelope * (0.35 + depthNorm * 0.65),
        depthNorm,
        glareAngle: angle,
      });
    }
  }

  // =========================================================================
  // 8. FLYBY ROLODEX & DECK PEEL & CENTER STAGE (3D Vertical Revolving Drum)
  // =========================================================================
  else if (
    tplId === 'flyby-rolodex' ||
    tplId === 'center-stage' ||
    tplId === 'deck-peel' ||
    tplId === 'diagonal-wipe'
  ) {
    const ry = height * 0.38;
    const rz = 140;

    for (let i = 0; i < slotCount; i++) {
      const angle = (i / slotCount) * tau + progress * tau;
      const y3 = -Math.sin(angle) * ry;
      const z3 = Math.cos(angle) * rz;

      const pScale = focalLength / (focalLength + z3);
      const depthNorm = (z3 / rz + 1) / 2;
      // Vertical foreshortening as cards rotate away from camera
      const cosA = Math.cos(angle);
      const faceVisible = cosA > -0.2;
      const alpha = faceVisible ? Math.max(0.12, depthNorm) : 0;

      drawCardsList.push({
        slotIndex: i,
        x: cx,
        y: cy + y3 * pScale,
        z: z3,
        scaleX: pScale * 1.05,
        scaleY: pScale * Math.max(0.35, Math.abs(cosA) * 0.85 + 0.15),
        rotation: 0,
        alpha,
        depthNorm,
        glareAngle: angle,
      });
    }
  }

  // =========================================================================
  // 9. ISOMETRIC STAIRWAY & CASCADE (Architectural Stepped Deck)
  // =========================================================================
  else if (
    tplId === 'iso-cascade' ||
    tplId === 'iso-focus' ||
    tplId === 'iso-orbit' ||
    tplId === 'stairway' ||
    tplId === 'cascade-deck'
  ) {
    const skewRad = ((showcaseConfig.skew || 28) * Math.PI) / 180;
    const spanCount = Math.max(slotCount, 7);

    for (let i = 0; i < spanCount; i++) {
      const norm = ((i / spanCount + progress) % 1);
      const centered = norm - 0.5; // -0.5 .. +0.5
      const distFromCenter = Math.abs(centered * 2);

      const spotlightBoost =
        tplId === 'iso-focus' ? Math.max(0, 1 - distFromCenter * 2.2) * 0.35 : 0;
      const floatOffset = Math.sin(localTime * 2.0 + i) * 5 * (u / 10);

      const x = cx + centered * width * 0.62;
      const y = cy + centered * height * 0.45 - spotlightBoost * 50 * u + floatOffset;
      // Seamless envelope fade at conveyor boundaries
      const edgeAlpha = Math.sin(norm * Math.PI);

      drawCardsList.push({
        slotIndex: i % slotCount,
        x,
        y,
        z: (1 - distFromCenter) * 120,
        scaleX: (0.84 + spotlightBoost) * Math.cos(skewRad * 0.4),
        scaleY: 0.84 + spotlightBoost,
        skewY: Math.sin(skewRad * 0.32),
        rotation: -0.18,
        alpha: edgeAlpha * (1 - Math.pow(distFromCenter, 2.0) * 0.45),
        depthNorm: 1 - distFromCenter * 0.5,
        glareAngle: -0.4,
      });
    }
  }

  // =========================================================================
  // 10. CURVED CAROUSEL FLOW & COVER FLOW (Cylindrical Arc & Apple Cover Flow)
  // =========================================================================
  else if (
    tplId === 'curved-carousel-flow' ||
    tplId === 'cover-flow' ||
    tplId === 'focus-slider' ||
    tplId === 'hero-reel'
  ) {
    for (let i = 0; i < slotCount; i++) {
      let rel = ((i - progress * slotCount) % slotCount);
      if (rel > slotCount / 2) rel -= slotCount;
      if (rel < -slotCount / 2) rel += slotCount;
      const absRel = Math.abs(rel);
      const isCenter = absRel < 0.6;
      const sideSign = Math.sign(rel);

      if (tplId === 'curved-carousel-flow') {
        const angle = (rel / (slotCount * 0.46)) * Math.PI * 0.5;
        const arcX = Math.sin(angle) * (width * 0.42);
        const arcZ = Math.cos(angle) * 120;
        const floatOffset = Math.sin(localTime * 2.0 + i * 0.8) * 6 * (u / 10);
        const pScale = focalLength / (focalLength + (120 - arcZ));

        drawCardsList.push({
          slotIndex: i,
          x: cx + arcX,
          y: cy + floatOffset + (1 - Math.cos(angle)) * height * 0.1,
          z: arcZ,
          scaleX: pScale * (0.88 + 0.12 * Math.cos(angle)),
          scaleY: pScale,
          rotation: -sideSign * Math.sin(Math.abs(angle)) * 0.14,
          alpha: Math.max(0.2, arcZ / 120),
          depthNorm: arcZ / 120,
          glareAngle: angle,
        });
      } else {
        // Apple Cover Flow / Hero Reel with smooth perspective tilt
        const spreadX = rel * cardW * 0.65 + sideSign * Math.min(1, absRel) * cardW * 0.25;
        const scale = isCenter ? 1.2 : Math.max(0.6, 0.94 - absRel * 0.12);
        const squeezeX = isCenter ? 1 : 0.72;
        const floatOffset = Math.sin(localTime * 1.8 + i) * 5 * (u / 10);

        drawCardsList.push({
          slotIndex: i,
          x: cx + spreadX,
          y: cy + (tplId === 'focus-slider' ? Math.sin(rel * 1.4) * 20 * u : 0) + floatOffset,
          z: 120 - absRel * 25,
          scaleX: scale * squeezeX,
          scaleY: scale,
          rotation: isCenter ? 0 : -sideSign * 0.12,
          alpha: Math.max(0.2, 1 - absRel * 0.22),
          depthNorm: Math.max(0.3, 1 - absRel * 0.2),
          glareAngle: isCenter ? 0 : -sideSign * 0.4,
        });
      }
    }
  }

  // =========================================================================
  // 11. TICKER TILT, GRID DIVE, FEED SCROLL & SPOTLIGHT ZOOM
  // Seamless edge envelopes eliminate all jumping and popping
  // =========================================================================
  else if (
    tplId === 'ticker-tilt' ||
    tplId === 'grid-dive' ||
    tplId === 'feed-scroll' ||
    tplId === 'spotlight-zoom'
  ) {
    const cols = 3;
    const rows = 3;
    const gapPx = (showcaseConfig.gap ?? 4) * u;
    const isTilt = tplId === 'ticker-tilt';

    for (let r = 0; r < rows; r++) {
      const dir = r % 2 === 0 ? 1 : -1;
      for (let c = 0; c < cols; c++) {
        const idx = (r * cols + c) % slotCount;
        const rawOffset = ((progress * dir + c / cols) % 1 + 1) % 1;
        const centeredX = rawOffset - 0.5; // -0.5 .. +0.5
        const rowOffset = r - (rows - 1) / 2;

        const gx = centeredX * (cols * (cardW + gapPx));
        const gy = rowOffset * (cardH + gapPx);
        // Perspective depth scale per row
        const perspectiveScale = isTilt ? 0.85 + (r / rows) * 0.32 : 1;
        // Edge envelope fade eliminates jumping when items loop around
        const edgeEnvelope = Math.sin(rawOffset * Math.PI);

        drawCardsList.push({
          slotIndex: idx,
          x: cx + gx * perspectiveScale,
          y: cy + gy * perspectiveScale,
          z: r * 15,
          scaleX: perspectiveScale,
          scaleY: perspectiveScale * (isTilt ? 0.88 : 1),
          rotation: isTilt ? -0.12 : 0,
          alpha: edgeEnvelope * 0.95,
          depthNorm: 0.7 + (r / rows) * 0.3,
          glareAngle: -0.3,
        });
      }
    }
  }

  // =========================================================================
  // 12. NATURAL ROBUST FALLBACK (Continuous Harmonic Spread)
  // Zero phase jumping; all items strictly bound within seamless envelopes
  // =========================================================================
  else {
    for (let i = 0; i < slotCount; i++) {
      const phase = ((progress + i / slotCount) % 1);
      const arc = Math.sin(phase * Math.PI);
      const spreadNorm = (i - (slotCount - 1) / 2) / Math.max(1, (slotCount - 1) / 2);
      const x = cx + spreadNorm * width * 0.36;
      const y = cy + Math.sin(progress * tau + i * 0.8) * 12 * (u / 10);
      const scale = 0.85 + 0.15 * Math.cos(progress * tau + i);

      drawCardsList.push({
        slotIndex: i,
        x,
        y,
        z: 50 + arc * 50,
        scaleX: scale,
        scaleY: scale,
        rotation: spreadNorm * 0.08,
        alpha: 0.85 + 0.15 * arc,
        depthNorm: 0.8 + 0.2 * arc,
        glareAngle: 0,
      });
    }
  }

  // Sort back-to-front by z depth
  drawCardsList.sort((a, b) => a.z - b.z);

  // Draw each card with depth-aware lighting and shadows
  for (const item of drawCardsList) {
    if (item.alpha <= 0.01) continue;

    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, item.alpha));
    ctx.translate(item.x, item.y);
    if (item.rotation) ctx.rotate(item.rotation);
    if (item.skewY) ctx.transform(1, item.skewY, 0, 1, 0, 0);
    ctx.scale(item.scaleX, item.scaleY);

    // Natural multi-tier drop shadow matching transitions.dev depth scale
    if (showcaseConfig.shadowEnabled !== false) {
      ctx.save();
      const shadowBlur = (16 + (item.depthNorm || 0.5) * 18) * (u / 10);
      const shadowY = (8 + (item.depthNorm || 0.5) * 12) * (u / 10);
      ctx.shadowColor = `rgba(0, 0, 0, ${(0.35 + (item.depthNorm || 0.5) * 0.25).toFixed(3)})`;
      ctx.shadowBlur = shadowBlur;
      ctx.shadowOffsetY = shadowY;
      drawRoundedRectPath(ctx, -cardW / 2, -cardH / 2, cardW, cardH, cornerRadiusPx);
      ctx.fillStyle = '#000000';
      ctx.fill();
      ctx.restore();
    }

    drawShowcaseCardContent(
      ctx,
      item.slotIndex,
      cardW,
      cardH,
      cornerRadiusPx,
      mediaSlots,
      item.depthNorm ?? 1.0,
      item.glareAngle ?? 0
    );

    ctx.restore();
  }
}
