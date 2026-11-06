/**
 * @file animosRenderer.js
 * @description Pure HTML5 2D Canvas 3D/Perspective Card Showcase Renderer
 * reverse-engineered from Animos Editor (https://animos.app/editor).
 * Supports 3D Rings, Curved Sphere Walls, Globes, Spirals, Tunnels, Rolodex,
 * Isometric Stacks, Orbits, Cover Flow, Tilted Marquee Grids, and Card Toss.
 */

import {
  DEFAULT_SHOWCASE_CARDS,
  ANIMOS_BG_GRADIENTS,
} from '../constants/animosTemplates';

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

function drawShowcaseCardContent(ctx, slotIndex, cardW, cardH, cornerRadiusPx, mediaSlots = []) {
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

  // Subtle inner card border
  drawRoundedRectPath(ctx, -cardW / 2, -cardH / 2, cardW, cardH, cornerRadiusPx);
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.lineWidth = Math.max(1, cardW * 0.008);
  ctx.stroke();

  ctx.restore();
}

function getCardAspectMultiplier(aspectStr) {
  switch (aspectStr) {
    case '16:9':
      return { w: 1.32, h: 0.75 };
    case '9:16':
      return { w: 0.75, h: 1.32 };
    case '4:5':
      return { w: 0.88, h: 1.1 };
    case '3:4':
      return { w: 0.85, h: 1.14 };
    case '4:3':
      return { w: 1.15, h: 0.86 };
    default:
      return { w: 1.0, h: 1.0 };
  }
}

export function renderAnimosBackground(ctx, width, height, gradientId) {
  if (!gradientId || gradientId === 'none') return;
  const gSpec =
    ANIMOS_BG_GRADIENTS.find((g) => g.id === gradientId) || ANIMOS_BG_GRADIENTS[0];

  let grad;
  if (gSpec.radial) {
    grad = ctx.createRadialGradient(
      width / 2,
      height / 2,
      width * 0.05,
      width / 2,
      height / 2,
      Math.max(width, height) * 0.7
    );
  } else {
    const rad = ((gSpec.angle || 135) * Math.PI) / 180;
    const cx = width / 2;
    const cy = height / 2;
    const len = Math.hypot(width, height) / 2;
    grad = ctx.createLinearGradient(
      cx - Math.cos(rad) * len,
      cy - Math.sin(rad) * len,
      cx + Math.cos(rad) * len,
      cy + Math.sin(rad) * len
    );
  }

  gSpec.stops.forEach((s) => grad.addColorStop(s.at, s.color));
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);
}

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
    ? 1 + (audioSignals?.bass || 0) * 0.14
    : 1;

  const baseSize = (showcaseConfig.cardSize || 26) * u * bassBoost;
  const aspectMult = getCardAspectMultiplier(showcaseConfig.cardAspect || '1:1');
  const cardW = baseSize * aspectMult.w;
  const cardH = baseSize * aspectMult.h;
  const cornerRadiusPx = (showcaseConfig.cornerRadius ?? 3) * u;
  const slotCount = Math.max(3, Math.min(16, showcaseConfig.slots || 8));
  const progress = ((localTime % Math.max(2, duration)) / Math.max(2, duration));
  const tau = Math.PI * 2;
  const tiltRad = ((showcaseConfig.tilt ?? -18) * Math.PI) / 180;
  const backFade = (showcaseConfig.backFade ?? 55) / 100;

  // Optional Animos gradient backdrop
  if (showcaseConfig.bgGradient && showcaseConfig.bgGradient !== 'none') {
    renderAnimosBackground(ctx, width, height, showcaseConfig.bgGradient);
  }

  const drawCardsList = [];

  // 1. 3D Rings, Globes, Orbits & Spirals
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
      const depthNorm = (Math.cos(angle) + 1) / 2; // 0 (back) .. 1 (front)
      const scale = 0.58 + depthNorm * 0.52;
      const alpha = 1 - (1 - depthNorm) * backFade;
      const rot =
        tplId === 'orbit-bloom'
          ? Math.sin(angle) * 0.35
          : Math.sin(angle) * (tiltRad * 0.35);
      const squeezeX =
        tplId === 'showcase-stream' || tplId === 'cover-ring'
          ? Math.max(0.28, 0.45 + 0.55 * Math.abs(Math.cos(angle * 0.5)))
          : 1;

      drawCardsList.push({
        slotIndex: i,
        x: cx + x3,
        y: cy + y3,
        z: z3,
        scaleX: scale * squeezeX,
        scaleY: scale,
        rotation: rot,
        alpha,
      });
    }
  } else if (tplId === 'sphere-globe' || tplId === 'sphere-wall') {
    const rows = 3;
    const cols = Math.ceil(slotCount / rows);
    const radius = Math.min(width, height) * 0.36;
    let idx = 0;
    for (let r = 0; r < rows; r++) {
      const lat = ((r - (rows - 1) / 2) / rows) * 1.15;
      for (let c = 0; c < cols; c++) {
        const lon = (c / cols) * tau + progress * tau + r * 0.4;
        const ringR = Math.cos(lat) * radius;
        const x3 = Math.sin(lon) * ringR;
        const z3 = Math.cos(lon) * ringR;
        const y3 = Math.sin(lat) * radius + z3 * Math.sin(tiltRad * 0.5);
        const depthNorm = (z3 / radius + 1) / 2;
        const scale = 0.52 + depthNorm * 0.55;
        const squeezeX = Math.max(0.25, Math.abs(Math.cos(lon * 0.65)) * 0.7 + 0.3);
        drawCardsList.push({
          slotIndex: idx++,
          x: cx + x3,
          y: cy + y3,
          z: z3,
          scaleX: scale * squeezeX,
          scaleY: scale,
          rotation: Math.sin(lon) * 0.12,
          alpha: 0.3 + depthNorm * 0.7,
        });
      }
    }
  } else if (tplId === 'spiral-stream') {
    const totalCards = Math.max(slotCount, 12);
    const rx = width * 0.28;
    const spanH = height * 0.78;
    for (let i = 0; i < totalCards; i++) {
      const norm = ((i / totalCards + progress) % 1);
      const angle = norm * tau * 2.5;
      const x3 = Math.sin(angle) * rx;
      const z3 = Math.cos(angle) * (rx * 0.7);
      const y3 = (norm - 0.5) * spanH;
      const depthNorm = (Math.cos(angle) + 1) / 2;
      const edgeFade = Math.sin(norm * Math.PI);
      drawCardsList.push({
        slotIndex: i % slotCount,
        x: cx + x3,
        y: cy + y3,
        z: z3,
        scaleX: (0.55 + depthNorm * 0.45),
        scaleY: (0.55 + depthNorm * 0.45),
        rotation: Math.cos(angle) * 0.18,
        alpha: Math.max(0.1, edgeFade * (0.4 + depthNorm * 0.6)),
      });
    }
  } else if (tplId === 'card-tunnel') {
    for (let i = 0; i < slotCount; i++) {
      const zNorm = ((i / slotCount + progress) % 1);
      const ringAngle = (i * 1.57) + progress * tau * 0.25;
      const dist = Math.pow(zNorm, 1.65);
      const spreadR = Math.min(width, height) * 0.42 * dist;
      drawCardsList.push({
        slotIndex: i,
        x: cx + Math.cos(ringAngle) * spreadR,
        y: cy + Math.sin(ringAngle) * spreadR,
        z: dist * 100,
        scaleX: 0.2 + dist * 1.15,
        scaleY: 0.2 + dist * 1.15,
        rotation: Math.sin(ringAngle) * 0.08,
        alpha: Math.sin(zNorm * Math.PI),
      });
    }
  } else if (
    tplId === 'iso-cascade' ||
    tplId === 'iso-focus' ||
    tplId === 'iso-orbit' ||
    tplId === 'stairway'
  ) {
    // Isometric sheared stack / diagonal ribbon
    const skewRad = ((showcaseConfig.skew || 32) * Math.PI) / 180;
    for (let i = 0; i < slotCount; i++) {
      const norm = ((i / slotCount + progress) % 1) - 0.5;
      const distFromCenter = Math.abs(norm * 2);
      const spotlightBoost =
        tplId === 'iso-focus' ? Math.max(0, 1 - distFromCenter * 2.2) * 0.38 : 0;
      const x = cx + norm * width * 0.65;
      const y = cy + norm * height * 0.48 - spotlightBoost * 60 * u;
      drawCardsList.push({
        slotIndex: i,
        x,
        y,
        z: (1 - distFromCenter) * 100,
        scaleX: (0.82 + spotlightBoost) * Math.cos(skewRad * 0.45),
        scaleY: 0.82 + spotlightBoost,
        skewY: Math.sin(skewRad * 0.35),
        rotation: -0.22,
        alpha: 1 - Math.pow(distFromCenter, 2.2) * 0.65,
      });
    }
  } else if (tplId === 'cover-flow' || tplId === 'focus-slider' || tplId === 'hero-reel') {
    for (let i = 0; i < slotCount; i++) {
      let rel = ((i - progress * slotCount) % slotCount);
      if (rel > slotCount / 2) rel -= slotCount;
      if (rel < -slotCount / 2) rel += slotCount;
      const absRel = Math.abs(rel);
      const isCenter = absRel < 0.65;
      const sideSign = Math.sign(rel);
      const spreadX = rel * cardW * 0.68 + sideSign * Math.min(1, absRel) * cardW * 0.22;
      const scale = isCenter ? 1.22 : Math.max(0.55, 0.92 - absRel * 0.1);
      const squeezeX = isCenter ? 1 : 0.68;
      drawCardsList.push({
        slotIndex: i,
        x: cx + spreadX,
        y: cy + (tplId === 'focus-slider' ? Math.sin(rel * 1.4) * 24 * u : 0),
        z: 100 - absRel * 20,
        scaleX: scale * squeezeX,
        scaleY: scale,
        rotation: isCenter ? 0 : -sideSign * 0.08,
        alpha: Math.max(0.15, 1 - absRel * 0.22),
      });
    }
  } else if (
    tplId === 'ticker-tilt' ||
    tplId === 'grid-dive' ||
    tplId === 'feed-scroll' ||
    tplId === 'spotlight-zoom'
  ) {
    // 3×3 or 3×4 perspective tilted marquee grid
    const cols = 3;
    const rows = 3;
    const gapPx = (showcaseConfig.gap ?? 4) * u;
    for (let r = 0; r < rows; r++) {
      const dir = r % 2 === 0 ? 1 : -1;
      for (let c = 0; c < cols; c++) {
        const idx = (r * cols + c) % slotCount;
        const scrollOffset = ((progress * dir + c / cols) % 1 + 1) % 1 - 0.5;
        const rowOffset = r - (rows - 1) / 2;
        const gx = scrollOffset * (cols * (cardW + gapPx));
        const gy = rowOffset * (cardH + gapPx);
        const perspectiveScale = tplId === 'ticker-tilt' ? 0.85 + (r / rows) * 0.3 : 1;
        drawCardsList.push({
          slotIndex: idx,
          x: cx + gx * perspectiveScale,
          y: cy + gy * perspectiveScale,
          z: r * 10,
          scaleX: perspectiveScale,
          scaleY: perspectiveScale * (tplId === 'ticker-tilt' ? 0.86 : 1),
          rotation: tplId === 'ticker-tilt' ? -0.14 : 0,
          alpha: 0.95,
        });
      }
    }
  } else {
    // Multiscene / Stack / Fan / Card Toss / Rolodex / Vortex fallback
    for (let i = 0; i < slotCount; i++) {
      const phase = ((progress + i / slotCount) % 1);
      const arc = Math.sin(phase * Math.PI);
      const spreadNorm = (i - (slotCount - 1) / 2) / Math.max(1, slotCount - 1);
      const fanAngle = spreadNorm * 0.55 * Math.sin(progress * tau);
      const x = cx + spreadNorm * width * 0.42 * (0.4 + 0.6 * arc);
      const y = cy + (0.5 - arc) * height * 0.32;
      const scale = 0.72 + arc * 0.38;
      drawCardsList.push({
        slotIndex: i,
        x,
        y,
        z: arc * 100 + i,
        scaleX: scale,
        scaleY: scale,
        rotation: fanAngle,
        alpha: 0.35 + arc * 0.65,
      });
    }
  }

  // Sort back-to-front by z
  drawCardsList.sort((a, b) => a.z - b.z);

  // Draw each card
  for (const item of drawCardsList) {
    if (item.alpha <= 0.02) continue;
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, item.alpha));
    ctx.translate(item.x, item.y);
    if (item.rotation) ctx.rotate(item.rotation);
    if (item.skewY) ctx.transform(1, item.skewY, 0, 1, 0, 0);
    ctx.scale(item.scaleX, item.scaleY);

    // Optional card shadow
    if (showcaseConfig.shadowEnabled !== false) {
      ctx.save();
      ctx.shadowColor = 'rgba(0, 0, 0, 0.48)';
      ctx.shadowBlur = 24 * (u / 10);
      ctx.shadowOffsetY = 10 * (u / 10);
      drawRoundedRectPath(ctx, -cardW / 2, -cardH / 2, cardW, cardH, cornerRadiusPx);
      ctx.fillStyle = '#000000';
      ctx.fill();
      ctx.restore();
    }

    drawShowcaseCardContent(ctx, item.slotIndex, cardW, cardH, cornerRadiusPx, mediaSlots);
    ctx.restore();
  }
}
