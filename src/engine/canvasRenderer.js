import { evaluateEasing, evaluatePeriodicSpring, solveSpring, solveCubicBezier } from '../utils/timecode.js';
import { renderAnimosShowcase } from './animosRenderer.js';
import { renderEffectCraftShaderBg, applyEffectCraftRack } from './effectCraftRenderer.js';
import { evaluateLayerKeyframes } from '../core/services/animationEngine.js';
import { evaluateAudioReactiveMapping } from '../core/services/audioAnalysisService.js';
import {
  evaluateActiveVideoClipsAtTime,
  renderVideoClipToCanvas,
} from '../core/services/videoService.js';
import { resolveLayerForFormat } from '../core/domain/layoutVariants.js';
import { renderVectorPathToCanvas } from '../core/services/vectorPathService.js';
import { applyEffectStackToCanvas } from '../core/services/effectStackService.js';

export { evaluateLayerKeyframes };

// Cache an offscreen canvas for per-glyph pattern clipping
let glyphScratchCanvas = null;
function getGlyphScratchCanvas(w, h) {
  if (typeof document === 'undefined') return null;
  if (!glyphScratchCanvas) {
    glyphScratchCanvas = document.createElement('canvas');
  }
  if (glyphScratchCanvas.width < w || glyphScratchCanvas.height < h) {
    glyphScratchCanvas.width = Math.max(w, 512);
    glyphScratchCanvas.height = Math.max(h, 512);
  }
  return glyphScratchCanvas;
}

export function renderSceneToCanvas({
  ctx,
  width,
  height,
  scene,
  localTime = 0,
  audioSignals = { bass: 0, mid: 0, treble: 0, rms: 0 },
  selectedLayerId = null,
  selectedLayerIds = null,
  activeSnapGuides = null,
  showGrid = false,
  showSafeGuides = false,
  showCenterCrosshair = false,
  project = null,
}) {
  if (!ctx || !scene) return;

  ctx.save();
  ctx.clearRect(0, 0, width, height);

  // 1. Background Fill
  ctx.fillStyle = scene.bg || '#101935';
  ctx.fillRect(0, 0, width, height);

  // 1b. EffectCraft Procedural Shader Background (if active on scene or project)
  const shaderBgId = scene.shaderBg || project?.shaderBg || 'none';
  if (shaderBgId && shaderBgId !== 'none') {
    renderEffectCraftShaderBg({
      ctx,
      width,
      height,
      shaderId: shaderBgId,
      localTime,
      audioSignals,
      palette: scene.palette,
      opacity: scene.shaderOpacity ?? project?.shaderOpacity ?? 0.85,
    });
  }

  // 2. Template Generative Background / System Decor
  drawTemplateDecor(ctx, width, height, scene, localTime, audioSignals);

  // 2b. Animos 3D & Perspective Showcase Engine (if enabled on scene or project)
  const showcaseConfig = (scene.showcase !== undefined && scene.showcase !== null)
    ? scene.showcase
    : project?.showcase;
  if (showcaseConfig && showcaseConfig.templateId && showcaseConfig.templateId !== 'none') {
    renderAnimosShowcase({
      ctx,
      width,
      height,
      showcaseConfig,
      mediaSlots: (scene.mediaSlots && scene.mediaSlots.length > 0)
        ? scene.mediaSlots
        : (project?.mediaSlots && project.mediaSlots.length > 0)
        ? project.mediaSlots
        : [],
      localTime,
      duration: scene.duration || project?.duration || 12,
      audioSignals,
      palette: scene.palette || project?.palette,
    });
  }

  // 2c. Video Tracks Compositing & Transition Rendering (Fase 7)
  if (project?.videoTracks && project.videoTracks.length > 0) {
    const activeVideoClips = evaluateActiveVideoClipsAtTime(project.videoTracks, localTime);
    for (const activeState of activeVideoClips) {
      const asset = project.assets?.[activeState.clip.assetId];
      // In browser runtime, an asset may hold an HTMLVideoElement or image proxy
      const sourceElement = asset?.videoElement || asset?.imageElement || null;

      renderVideoClipToCanvas({
        ctx,
        width,
        height,
        clip: activeState.clip,
        sourceElement,
        transitionIn: activeState.transitionIn,
        transitionOut: activeState.transitionOut,
        activeCaption: activeState.activeCaption,
      });
    }
  }

  // 3. Optional Swiss Layout Grid Overlay (4x4 modular grid matching Screenshot 23)
  if (showGrid || (scene.gridStyle && scene.gridStyle !== 'none' && scene.decorStyle !== 'hangulGrid')) {
    drawLayoutGrid(ctx, width, height, scene.gridStyle || 'swiss', scene.palette, showGrid);
  }

  // 4. Render Scene Layers (Bottom to Top)
  const currentRatio = project?.ratio || '4:5';
  const baseRatio = project?.baseRatio || '4:5';
  const rawLayers = scene.layers || [];
  const layers = rawLayers.map((l) => resolveLayerForFormat(l, currentRatio, baseRatio));
  const activeSelectedIds = new Set(
    Array.isArray(selectedLayerIds) && selectedLayerIds.length > 0
      ? selectedLayerIds
      : selectedLayerId ? [selectedLayerId] : []
  );
  const selectedLayersForHud = [];

  layers.forEach((layer) => {
    if (layer.visible === false) return;
    const kfState = evaluateLayerKeyframes(layer, localTime);

    let dx = 0;
    let dy = 0;
    let dScale = 0;
    let dRot = 0;
    let dAlpha = 0;

    if (layer.audioReactive) {
      const audioMod = evaluateAudioReactiveMapping(layer, audioSignals);
      dx = audioMod.dx;
      dy = audioMod.dy;
      dScale = audioMod.dScale;
      dRot = audioMod.dRot;
      dAlpha = audioMod.dAlpha;
    }

    const finalState = {
      x: kfState.posX + dx,
      y: kfState.posY + dy,
      scale: Math.max(0.05, kfState.scale + dScale),
      rotation: kfState.rotation + dRot,
      opacity: Math.max(0, Math.min(1, kfState.opacity + dAlpha)),
    };

    ctx.save();
    if (layer.blendMode) {
      ctx.globalCompositeOperation = layer.blendMode;
    }

    if (layer.type === 'graphic') {
      renderGraphicLayer(ctx, layer, finalState, localTime, audioSignals, scene.palette, width, height, scene);
    } else if (layer.type === 'text') {
      renderTextLayer(ctx, layer, finalState, localTime, audioSignals, scene.palette, scene);
    } else if (layer.type === 'shape') {
      renderShapeLayer(ctx, layer, finalState, localTime, audioSignals, scene.palette, width, height, scene);
    } else if (layer.type === 'image') {
      renderImageLayer(ctx, layer, finalState, localTime, audioSignals, scene.palette, width, height, scene);
    } else if (layer.type === 'vectorPath') {
      ctx.save();
      ctx.translate(width / 2 + finalState.x, height / 2 + finalState.y);
      if (finalState.rotation) ctx.rotate((finalState.rotation * Math.PI) / 180);
      if (finalState.scale !== 1) ctx.scale(finalState.scale, finalState.scale);
      renderVectorPathToCanvas(ctx, { ...layer, x: 0, y: 0, opacity: finalState.opacity });
      ctx.restore();
    }

    ctx.restore();

    if (activeSelectedIds.has(layer.id)) {
      selectedLayersForHud.push({ layer, state: finalState });
    }
  });

  // 4b. EffectCraft Post-Processing FX Rack (applied to rendered composition before editor HUD)
  const fxRack = scene.fxRack || project?.fxRack;
  if (fxRack && Object.keys(fxRack).length > 0) {
    applyEffectCraftRack({
      ctx,
      width,
      height,
      fxRack,
      localTime,
      audioSignals,
    });
  }

  // 4c. Non-Destructive Layer & Scene Effect Stack (Fase 9)
  const effectStack = scene.effects || project?.effects;
  if (effectStack && effectStack.length > 0) {
    applyEffectStackToCanvas({
      ctx,
      width,
      height,
      effects: effectStack,
      localTime,
      audioSignals,
    });
  }

  // 4d. Editor Selection Box HUD (drawn after FX Rack so handles stay crisp)
  if (selectedLayersForHud.length === 1) {
    drawSelectionBox(ctx, selectedLayersForHud[0].layer, selectedLayersForHud[0].state);
  } else if (selectedLayersForHud.length > 1) {
    drawMultiSelectionBox(ctx, selectedLayersForHud);
  }

  // 4d. Magnetic Alignment Snap Guides
  if (activeSnapGuides) {
    drawActiveSnapGuides(ctx, width, height, activeSnapGuides);
  }

  // 5. Safe Area Guides Overlay (Screenshots 11 & 48)
  if (showSafeGuides) {
    drawSafeAreaGuides(ctx, width, height, scene.bg);
  }

  // 5b. Center Alignment Crosshair Overlay
  if (showCenterCrosshair) {
    drawCenterCrosshair(ctx, width, height, scene.bg);
  }

  ctx.restore();
}

function drawCenterCrosshair(ctx, width, height, bgHex) {
  ctx.save();
  const isLight = isLightHex(bgHex || '#101935');
  ctx.strokeStyle = isLight ? 'rgba(21, 153, 71, 0.75)' : 'rgba(74, 222, 128, 0.75)';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);

  const cx = width / 2;
  const cy = height / 2;
  const arm = Math.min(width, height) * 0.12;

  ctx.beginPath();
  ctx.moveTo(cx - arm, cy);
  ctx.lineTo(cx + arm, cy);
  ctx.moveTo(cx, cy - arm);
  ctx.lineTo(cx, cy + arm);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx, cy, 14, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawTemplateDecor(ctx, width, height, scene, t, audio) {
  const style = scene.decorStyle;
  const pal = scene.palette || ['#101935', '#f5f1e6', '#5983ff', '#e57c66', '#6bb39b', '#c299d0'];
  const bass = audio?.bass || 0;
  const cx = width / 2;
  const cy = height / 2;

  ctx.save();

  switch (style) {
    case 'hangulGrid': {
      // Fine graph paper grid on white poster (#f7f6f2)
      ctx.strokeStyle = 'rgba(17, 17, 17, 0.06)';
      ctx.lineWidth = 1;
      const step = Math.round(width / 24);
      for (let x = 0; x <= width; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y <= height; y += step) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
      break;
    }

    case 'patternBlocks': {
      // Right-half optical geometric pattern playground on cobalt blue (#0044ff) (Screenshot 1)
      const splitX = Math.round(width * 0.48);
      const rightW = width - splitX;
      const colW = rightW / 2;
      const rowH = height / 4;

      // Module 1 (Top-Left of right half): Diagonal blue/white op-art hatching
      ctx.save();
      ctx.beginPath();
      ctx.rect(splitX, 0, colW, rowH * 1.4);
      ctx.clip();
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(splitX, 0, colW, rowH * 1.4);
      ctx.strokeStyle = pal[0] || '#0044ff';
      ctx.lineWidth = 6;
      const stripeOffset = (t * 24) % 18;
      for (let i = -height; i < rightW + height; i += 18) {
        ctx.beginPath();
        ctx.moveTo(splitX + i + stripeOffset, 0);
        ctx.lineTo(splitX + i - rowH * 1.4 + stripeOffset, rowH * 1.4);
        ctx.stroke();
      }
      ctx.restore();

      // Module 2 (Top-Right): Fine vertical optical stripes
      ctx.save();
      ctx.fillStyle = pal[0] || '#0044ff';
      ctx.fillRect(splitX + colW, 0, colW, rowH * 2.1);
      ctx.fillStyle = '#ffffff';
      const stripeCount = 18;
      const sw = colW / stripeCount;
      for (let i = 0; i < stripeCount; i++) {
        if (i % 2 === 0) {
          ctx.fillRect(splitX + colW + i * sw, 0, sw * 0.58, rowH * 2.1);
        }
      }
      ctx.restore();

      // Module 3 (Middle-Left of right half): Op-art checkerboard + stepped blocks
      const m3Y = rowH * 1.4;
      const m3H = rowH * 1.5;
      const cells = 10;
      const cellW = colW / cells;
      const cellH = m3H / 12;
      for (let r = 0; r < 12; r++) {
        for (let c = 0; c < cells; c++) {
          const on = (r + c + Math.floor(t * 2)) % 2 === 0;
          ctx.fillStyle = on ? '#ffffff' : pal[0] || '#0044ff';
          ctx.fillRect(splitX + c * cellW, m3Y + r * cellH, cellW + 0.5, cellH + 0.5);
        }
      }

      // Module 4 (Middle-Right): Diagonal opposite hatching & halftone dots
      const m4Y = rowH * 2.1;
      const m4H = rowH * 0.8;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(splitX + colW, m4Y, colW, m4H);
      ctx.fillStyle = pal[0] || '#0044ff';
      const dotCols = 8;
      const dotRows = 6;
      for (let r = 0; r < dotRows; r++) {
        for (let c = 0; c < dotCols; c++) {
          ctx.beginPath();
          ctx.arc(
            splitX + colW + (c + 0.5) * (colW / dotCols),
            m4Y + (r + 0.5) * (m4H / dotRows),
            Math.min(colW / dotCols, m4H / dotRows) * 0.32,
            0,
            Math.PI * 2
          );
          ctx.fill();
        }
      }

      // Module 5 (Bottom-Right full span): High-contrast vertical barcode array
      const m5Y = rowH * 2.9;
      const m5H = height - m5Y;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(splitX, m5Y, rightW, m5H);
      ctx.fillStyle = pal[0] || '#0044ff';
      let bx = splitX + 8;
      let idx = 0;
      while (bx < width - 8) {
        const bw = [4, 10, 3, 14, 6, 8, 4, 12][idx % 8];
        const gap = [6, 4, 8, 5, 7][idx % 5];
        ctx.fillRect(bx, m5Y, bw, m5H);
        bx += bw + gap;
        idx++;
      }
      break;
    }

    case 'shutterBars': {
      // If individual Shutter 1..4 layers are not present in this scene, draw the 4 vertical lines
      const hasIndividualShutters = (scene.layers || []).some(
        (l) => l.assetId === 'shutterPillarSingle' && l.visible !== false
      );
      if (!hasIndividualShutters) {
        const colors = [pal[2] || '#5983ff', pal[3] || '#e57c66', pal[4] || '#6bb39b', pal[5] || '#c299d0'];
        const spacing = width * 0.145;
        const startX = width / 2 - spacing * 1.5;
        for (let i = 0; i < 4; i++) {
          const x = startX + i * spacing;
          const len = height * 0.42 + Math.sin(t * 2.5 + i) * 35 + bass * 55;
          ctx.strokeStyle = colors[i % colors.length];
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(x, height / 2 - len / 2);
          ctx.lineTo(x, height / 2 + len / 2);
          ctx.stroke();
        }
      }
      break;
    }

    case 'splitBars': {
      // 3 bold vertical neon bars on right (Screenshot 2: Split Signal)
      const barColors = [pal[1] || '#e2ff32', pal[2] || '#f7f7f2', pal[1] || '#e2ff32'];
      const barW = width * 0.032;
      const gap = width * 0.032;
      const rightStart = width * 0.64;
      for (let i = 0; i < 3; i++) {
        const h = height * (0.42 - i * 0.06) + Math.sin(t * 4 + i) * 28 + bass * 50;
        const topY = height * 0.22 + (i === 1 ? height * 0.09 : 0);
        ctx.fillStyle = barColors[i];
        ctx.fillRect(rightStart + i * (barW + gap), topY, barW, h);
      }
      break;
    }

    case 'paperSheets': {
      // Angled overlapping paper sheets in center (Screenshot 2: Paper Stack)
      const cx = width / 2;
      const cy = height / 2;
      const sheetW = width * 0.52;
      const sheetH = width * 0.52;
      const angles = [-0.11, 0.07, -0.015];
      const sheetColors = [pal[4] || '#1c1917', pal[3] || '#294c44', pal[1] || '#faf3e6'];
      for (let i = 0; i < 3; i++) {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(angles[i] + Math.sin(t * 1.5 + i) * 0.015);
        ctx.fillStyle = sheetColors[i];
        ctx.shadowColor = 'rgba(0,0,0,0.22)';
        ctx.shadowBlur = 24;
        ctx.fillRect(-sheetW / 2, -sheetH / 2, sheetW, sheetH);
        ctx.restore();
      }
      break;
    }

    case 'prism':
    case 'prismBurst':
    case 'pleats':
    case 'ribbons': {
      // Radial metallic blue crystal burst (Screenshot 2: Prism Radio)
      const cx = width * 0.52;
      const cy = height * 0.58;
      const rays = 26;
      for (let i = 0; i < rays; i++) {
        const angle = (i / rays) * Math.PI * 2 + t * 0.22;
        const rOuter = width * (0.16 + ((i * 7) % 5) * 0.045) + bass * 50;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(angle);
        const grad = ctx.createLinearGradient(0, 0, rOuter, 0);
        grad.addColorStop(0, '#050507');
        grad.addColorStop(0.55, pal[2] || '#2563eb');
        grad.addColorStop(0.88, pal[3] || '#60a5fa');
        grad.addColorStop(1, '#dbeafe');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(rOuter, -16);
        ctx.lineTo(rOuter * 1.08, 0);
        ctx.lineTo(rOuter, 16);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
      break;
    }

    case 'fieldCutout': {
      // Architectural black cutout blocks above and below headline (Screenshot 5: Field Shift)
      ctx.fillStyle = pal[1] || '#121212';
      const shift = Math.sin(t * 2.2) * 18;
      // Top cutout blocks
      ctx.fillRect(width * 0.34 + shift, height * 0.23, width * 0.24, height * 0.048);
      ctx.fillRect(width * 0.62 - shift, height * 0.19, width * 0.22, height * 0.042);
      // Middle-left & right notch blocks near headline
      ctx.fillRect(width * 0.14, height * 0.54, width * 0.22, height * 0.045);
      // Bottom architectural blocks
      ctx.fillRect(width * 0.44 - shift, height * 0.72, width * 0.36, height * 0.055);
      ctx.fillRect(width * 0.26 + shift, height * 0.81, width * 0.22, height * 0.045);
      break;
    }

    case 'diagonalStripes': {
      // Small green dot badge below VOID INDEX (Screenshot 5: Cutout Credits)
      ctx.fillStyle = pal[2] || '#1f5e3b';
      ctx.beginPath();
      ctx.arc(width * 0.5, height * 0.71, width * 0.022, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'pressStack': {
      // Subtle right-margin horizontal tick marks + ghosts of PRESS in lighter weights (Screenshot 5)
      ctx.strokeStyle = pal[1] || '#171a0e';
      ctx.lineWidth = 2;
      const rightX = width * 0.86;
      for (let i = 0; i < 6; i++) {
        const y = height * 0.28 + i * (height * 0.085);
        ctx.beginPath();
        ctx.moveTo(rightX, y);
        ctx.lineTo(rightX + width * 0.05, y);
        ctx.stroke();
      }
      break;
    }

    case 'orbitRings':
    case 'contourRings': {
      const cx = width / 2;
      const cy = height / 2;
      for (let i = 1; i <= 7; i++) {
        ctx.strokeStyle = i % 2 === 0 ? pal[2] || '#ff4d2d' : pal[3] || '#38bdf8';
        ctx.lineWidth = i === 3 ? 4 : 1.5;
        ctx.beginPath();
        ctx.ellipse(
          cx,
          cy,
          width * 0.07 * i + bass * 24,
          height * 0.05 * i + Math.sin(t * 2 + i) * 14,
          t * 0.25 + i * 0.2,
          0,
          Math.PI * 2
        );
        ctx.stroke();
      }
      break;
    }

    case 'silkWaves': {
      for (let w = 0; w < 9; w++) {
        ctx.strokeStyle = w % 2 === 0 ? pal[2] || '#c084fc' : pal[3] || '#38bdf8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let x = 0; x <= width; x += 20) {
          const y =
            height * 0.25 +
            w * 70 +
            Math.sin(x * 0.008 + t * 2.5 + w * 0.5) * (35 + bass * 45);
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      break;
    }

    case 'soundcheckBlocks': {
      // Authentic Sound check starter layout (Screenshot 17)
      const ruleY = Math.round(height * 0.378);
      ctx.strokeStyle = pal[1] || '#111111';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(width * 0.065, ruleY);
      ctx.lineTo(width * 0.935, ruleY);
      ctx.stroke();

      // Technical labels under rule (middle)
      ctx.fillStyle = pal[1] || '#111111';
      ctx.font = `600 ${Math.round(width * 0.017)}px 'JetBrains Mono', monospace`;
      ctx.textAlign = 'left';
      ctx.fillText('KICK / TYPE', width * 0.45, ruleY + height * 0.022);
      ctx.fillText('SNARE / SHAPE', width * 0.45, ruleY + height * 0.039);

      // 12-column alternating graphic matrix (circles vs horizontal bar stacks)
      const cols = 12;
      const matrixLeft = width * 0.065;
      const matrixW = width * 0.87;
      const colSpan = matrixW / cols;
      const matrixTop = Math.round(height * 0.435);
      const matrixBottom = Math.round(height * 0.91);
      const matrixH = matrixBottom - matrixTop;

      const circleColors = [
        pal[2] || '#087dcc',
        pal[3] || '#e55c3c',
        pal[1] || '#14213d',
        '#c7c5be',
        pal[4] || '#2a9d8f',
      ];

      for (let c = 0; c < cols; c++) {
        const colX = matrixLeft + c * colSpan;
        const colCenter = colX + colSpan * 0.5;

        if (c % 2 === 0) {
          // Column of stacked circles
          const circleCount = 10;
          const cellH = matrixH / circleCount;
          const baseR = Math.min(colSpan, cellH) * 0.42;
          for (let r = 0; r < circleCount; r++) {
            const cy = matrixTop + (r + 0.5) * cellH;
            const pulse = 1 + Math.sin(t * 3 + c * 0.7 + r * 0.5) * 0.04 + bass * 0.12;
            ctx.fillStyle = circleColors[(c * 3 + r) % circleColors.length];
            ctx.beginPath();
            ctx.arc(colCenter, cy, baseR * pulse, 0, Math.PI * 2);
            ctx.fill();
          }
        } else {
          // Column of horizontal bar/stripe modules
          const groupCount = 10;
          const cellH = matrixH / groupCount;
          const barW = colSpan * 0.84;
          for (let r = 0; r < groupCount; r++) {
            const groupTop = matrixTop + r * cellH + cellH * 0.08;
            const groupH = cellH * 0.84;
            const color = circleColors[(c * 2 + r + 1) % circleColors.length];
            ctx.fillStyle = color;

            if ((r + c) % 3 === 0) {
              // Solid pill block
              ctx.fillRect(colCenter - barW / 2, groupTop, barW, groupH * 0.78);
            } else {
              // 4 thin horizontal stripes
              const stripes = 4;
              const sh = groupH / (stripes * 1.7);
              for (let s = 0; s < stripes; s++) {
                ctx.fillRect(
                  colCenter - barW / 2,
                  groupTop + s * (groupH / stripes),
                  barW,
                  sh
                );
              }
            }
          }
        }
      }

      // Bottom-left micro-footer captions
      ctx.fillStyle = pal[1] || '#111111';
      ctx.font = `600 ${Math.round(width * 0.015)}px 'JetBrains Mono', monospace`;
      ctx.textAlign = 'left';
      ctx.fillText('DEMO / 01', matrixLeft, height * 0.935);
      ctx.fillText('PLAY TO START', matrixLeft, height * 0.952);
      ctx.fillText('CLOVER MOTION / 60S', matrixLeft, height * 0.969);
      break;
    }

    case 'modular':
    case 'swissGrid':
    case 'bauhausBlocks': {
      const cols = 4;
      const rows = 5;
      const mx = width * 0.08;
      const my = height * 0.14;
      const cw = (width * 0.84) / cols;
      const ch = (height * 0.72) / rows;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const x = mx + c * cw;
          const y = my + r * ch;
          ctx.strokeStyle = 'rgba(255,255,255,0.16)';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(x + 4, y + 4, cw - 8, ch - 8);
          if ((r + c) % 3 === 0) {
            const pulse = 0.55 + Math.sin(t * 2.4 + r + c) * 0.25 + bass * 0.2;
            ctx.fillStyle = pal[2 + ((r + c) % 3)] || '#22c55e';
            ctx.globalAlpha = 0.35;
            ctx.fillRect(x + 8, y + 8, (cw - 16) * pulse, ch - 16);
            ctx.globalAlpha = 1;
          }
        }
      }
      break;
    }

    case 'gradient': {
      const grad = ctx.createRadialGradient(
        cx + Math.cos(t * 0.8) * width * 0.18,
        cy + Math.sin(t * 0.6) * height * 0.18,
        width * 0.05,
        cx,
        cy,
        width * 0.65
      );
      grad.addColorStop(0, pal[2] || '#22c55e');
      grad.addColorStop(0.5, pal[3] || '#38bdf8');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.save();
      ctx.globalAlpha = 0.52 + bass * 0.2;
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
      break;
    }

    case 'kinetic':
    case 'kineticBars': {
      const count = 9;
      const barH = (height * 0.64) / count;
      for (let i = 0; i < count; i++) {
        const y = height * 0.18 + i * barH;
        const w = width * (0.28 + 0.45 * Math.abs(Math.sin(t * 1.8 + i * 0.55)) + bass * 0.18);
        ctx.fillStyle = i % 2 === 0 ? pal[2] || '#22c55e' : pal[3] || '#38bdf8';
        ctx.globalAlpha = 0.28;
        ctx.fillRect(i % 2 === 0 ? width * 0.08 : width * 0.92 - w, y + 4, w, barH * 0.52);
      }
      ctx.globalAlpha = 1;
      break;
    }

    case 'scanner':
    case 'audioWaveformRing': {
      const rings = 36;
      const baseR = Math.min(width, height) * 0.27;
      ctx.save();
      ctx.translate(cx, cy);
      for (let i = 0; i < rings; i++) {
        const ang = (i / rings) * Math.PI * 2 + t * 0.35;
        const len = 18 + Math.abs(Math.sin(t * 4 + i * 0.4)) * 46 + bass * 55;
        ctx.strokeStyle = i % 2 === 0 ? pal[2] || '#38bdf8' : pal[3] || '#22c55e';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(Math.cos(ang) * baseR, Math.sin(ang) * baseR);
        ctx.lineTo(Math.cos(ang) * (baseR + len), Math.sin(ang) * (baseR + len));
        ctx.stroke();
      }
      ctx.restore();
      break;
    }

    case 'sculpture':
    case 'radialBurst': {
      ctx.save();
      ctx.translate(cx, cy);
      const planes = 8;
      for (let i = 0; i < planes; i++) {
        ctx.save();
        ctx.rotate((i * Math.PI) / planes + t * 0.25);
        ctx.strokeStyle = i % 2 === 0 ? pal[2] || '#22c55e' : pal[1] || '#ffffff';
        ctx.lineWidth = 2.5;
        const rx = width * (0.14 + (i % 3) * 0.06);
        const ry = height * 0.28;
        ctx.strokeRect(-rx / 2, -ry / 2, rx, ry);
        ctx.restore();
      }
      ctx.restore();
      break;
    }

    case 'halftoneGrid':
    case 'checkerboard': {
      const cols = 10;
      const rows = 12;
      const cellW = (width * 0.8) / cols;
      const cellH = (height * 0.72) / rows;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const x = width * 0.1 + c * cellW;
          const y = height * 0.14 + r * cellH;
          if (style === 'checkerboard') {
            if ((r + c) % 2 === 0) {
              ctx.fillStyle = 'rgba(255,255,255,0.08)';
              ctx.fillRect(x, y, cellW, cellH);
            }
          } else {
            const rad = (Math.sin(t * 2.5 + r * 0.4 + c * 0.4) * 0.35 + 0.55) * (cellW * 0.32);
            ctx.fillStyle = pal[2] || '#22c55e';
            ctx.globalAlpha = 0.35;
            ctx.beginPath();
            ctx.arc(x + cellW / 2, y + cellH / 2, Math.max(2, rad), 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
          }
        }
      }
      break;
    }

    default:
      break;
  }

  ctx.restore();
}

function drawLayoutGrid(ctx, width, height, gridStyle, palette, isExplicitGridToggle) {
  ctx.save();

  if (isExplicitGridToggle) {
    // 4x4 modular grid with margins and gutters (Screenshot 23)
    const marginX = width * 0.065;
    const marginY = height * 0.055;
    const gutter = width * 0.022;
    const cols = 4;
    const rows = 4;
    const cellW = (width - marginX * 2 - gutter * (cols - 1)) / cols;
    const cellH = (height - marginY * 2 - gutter * (rows - 1)) / rows;

    ctx.strokeStyle = 'rgba(120, 120, 120, 0.28)';
    ctx.lineWidth = 1.5;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = marginX + c * (cellW + gutter);
        const y = marginY + r * (cellH + gutter);
        ctx.strokeRect(x, y, cellW, cellH);
      }
    }
    ctx.restore();
    return;
  }

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  if (palette && palette[0] && isLightHex(palette[0])) {
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.08)';
  }
  ctx.lineWidth = 1;

  const pad = 64;
  if (gridStyle === 'swiss') {
    ctx.strokeRect(pad, pad, width - pad * 2, height - pad * 2);
    for (let i = 1; i < 4; i++) {
      const x = pad + ((width - pad * 2) / 4) * i;
      ctx.beginPath();
      ctx.moveTo(x, pad);
      ctx.lineTo(x, height - pad);
      ctx.stroke();
    }
  } else if (gridStyle === 'modular') {
    const cols = 6;
    const rows = 8;
    const cw = (width - pad * 2) / cols;
    const ch = (height - pad * 2) / rows;
    for (let c = 0; c <= cols; c++) {
      ctx.beginPath();
      ctx.moveTo(pad + c * cw, pad);
      ctx.lineTo(pad + c * cw, height - pad);
      ctx.stroke();
    }
    for (let r = 0; r <= rows; r++) {
      ctx.beginPath();
      ctx.moveTo(pad, pad + r * ch);
      ctx.lineTo(width - pad, pad + r * ch);
      ctx.stroke();
    }
  }

  ctx.restore();
}

function renderGraphicLayer(ctx, layer, state, t, audio, palette, canvasWidth = 1080, canvasHeight = 1350, scene = null) {
  // Background-handled decor assets should not draw duplicate geometry unless selected
  if (
    ['hangulGrid', 'patternBlocks', 'soundcheckBlocks', 'paperSheets', 'splitBars', 'fieldCutout', 'diagonalStripes', 'pressStack'].includes(
      layer.assetId
    )
  ) {
    return;
  }

  // Physics spring & kinetic motion calculation for graphic layers (inherits scene motion if layer preset is none)
  let gx = 0;
  let gy = 0;
  let gScale = 1;
  let gRot = 0;
  const activeGraphicPreset = (layer.motionPreset && layer.motionPreset !== 'none')
    ? layer.motionPreset
    : (scene?.motionPreset && scene.motionPreset !== 'none')
    ? scene.motionPreset
    : null;

  if (activeGraphicPreset) {
    const gSpeed = layer.motionSpeed ?? scene?.motionSpeed ?? 1;
    const gStiff = layer.motionStiffness ?? 180;
    const gDamp = layer.motionDamping ?? 14;
    const gOvershoot = layer.motionOvershoot ?? 1.2;
    const gPhase = t * 3.2 * gSpeed;
    const gSpring = evaluatePeriodicSpring(gPhase, {
      stiffness: gStiff,
      damping: gDamp,
      overshoot: gOvershoot,
      waveform: layer.motionWaveform || 'spring',
    });

    switch (activeGraphicPreset) {
      case 'kineticSpringHop':
        gy = -Math.abs(gSpring) * 26;
        gScale = 1 + gSpring * 0.14;
        break;
      case 'magneticSnap':
        gy = gSpring * 18;
        gScale = 1 + Math.max(0, gSpring) * 0.16;
        break;
      case 'pendulumSwing':
        gRot = gSpring * 0.22;
        break;
      case 'stompPop':
        gScale = 1 + Math.max(0, gSpring) * 0.22;
        break;
      case 'liquidWave':
        gx = Math.cos(gPhase * 0.7) * 14;
        gy = gSpring * 14;
        gRot = Math.sin(gPhase * 0.5) * 0.08;
        break;
      case 'kineticVortex':
        gRot = (t * 1.5 * gSpeed) % (Math.PI * 2);
        gScale = 0.92 + 0.12 * gSpring;
        break;
      case 'audioShockwave':
        gScale = 1 + (audio?.bass || 0) * 0.38 + gSpring * 0.08;
        break;
      case 'variableStretch':
        gScale = 1 + gSpring * 0.16;
        break;
      default:
        gy = gSpring * 12;
        break;
    }
  }

  ctx.save();
  ctx.globalAlpha = state.opacity;
  ctx.translate(state.x + gx, state.y + gy);
  ctx.rotate(((state.rotation + (gRot * 180) / Math.PI) * Math.PI) / 180);
  ctx.scale(state.scale * gScale, state.scale * gScale);

  const r = (layer.size || 300) / 2;
  const color = layer.color || palette?.[2] || '#5983ff';
  const sec = layer.secondaryColor || palette?.[1] || '#ffffff';

  if (layer.customImageElement) {
    ctx.drawImage(layer.customImageElement, -r, -r, r * 2, r * 2);
    ctx.restore();
    return;
  }

  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = layer.strokeWidth || 3;

  switch (layer.assetId) {
    case 'shutterPillarSingle': {
      // Single vertical shutter line
      const halfH = r * 1.05 + (audio?.bass || 0) * 28;
      ctx.strokeStyle = color;
      ctx.lineWidth = layer.strokeWidth || 4;
      ctx.beginPath();
      ctx.moveTo(0, -halfH);
      ctx.lineTo(0, halfH);
      ctx.stroke();
      break;
    }

    case 'shutterBars': {
      // Subtle stage frame for Reveal stage
      break;
    }

    case 'pleats': {
      // Blue Pleat vertical folds (Screenshot 36)
      const cols = 14;
      const w = r * 2.2;
      const h = r * 2.2;
      const colW = w / cols;
      for (let i = 0; i < cols; i++) {
        const x = -w / 2 + i * colW;
        const grad = ctx.createLinearGradient(x, 0, x + colW, 0);
        grad.addColorStop(0, '#071430');
        grad.addColorStop(0.55, color);
        grad.addColorStop(1, '#dbeafe');
        ctx.fillStyle = grad;
        ctx.fillRect(x, -h / 2, colW - 1, h);
      }
      break;
    }

    case 'bands': {
      // Signal Bands horizontal uneven pixel bands (Screenshot 37)
      const rows = 16;
      const w = r * 2.2;
      const h = r * 2.2;
      const rowH = h / rows;
      for (let i = 0; i < rows; i++) {
        const y = -h / 2 + i * rowH;
        const segs = 6;
        const segW = w / segs;
        for (let s = 0; s < segs; s++) {
          ctx.fillStyle = (i + s) % 2 === 0 ? color : sec;
          const barH = rowH * (0.35 + ((i * 3 + s) % 4) * 0.18);
          ctx.fillRect(-w / 2 + s * segW + 2, y, segW - 4, barH);
        }
      }
      break;
    }

    case 'starburst8':
    case 'starburst16': {
      const points = layer.assetId === 'starburst16' ? 16 : 8;
      ctx.beginPath();
      for (let i = 0; i < points * 2; i++) {
        const rad = i % 2 === 0 ? r : r * 0.38;
        const angle = (i * Math.PI) / points + t * 0.4;
        const px = Math.cos(angle) * rad;
        const py = Math.sin(angle) * rad;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();
      break;
    }

    case 'concentricRings': {
      for (let i = 1; i <= 5; i++) {
        ctx.beginPath();
        ctx.arc(0, 0, (r / 5) * i, 0, Math.PI * 2);
        ctx.stroke();
      }
      break;
    }

    case 'wireframeGlobe': {
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.stroke();
      for (let i = 1; i <= 3; i++) {
        ctx.beginPath();
        ctx.ellipse(0, 0, r * (i / 3.5), r, t * 0.2, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(0, 0, r, r * (i / 3.5), t * 0.2, 0, Math.PI * 2);
        ctx.stroke();
      }
      break;
    }

    case 'mg_equalizer': {
      const bars = 24;
      const bw = (r * 2) / bars;
      for (let i = 0; i < bars; i++) {
        const bh =
          (Math.abs(Math.sin(t * 4 + i * 0.45)) * 0.65 + (audio?.bass || 0.2) * 0.5) * r * 1.4;
        ctx.fillStyle = i % 2 === 0 ? color : sec;
        ctx.fillRect(-r + i * bw, r * 0.6 - bh, bw * 0.72, bh);
      }
      break;
    }

    case 'mg_oscilloscope': {
      ctx.beginPath();
      for (let x = -r; x <= r; x += 8) {
        const y =
          Math.sin(x * 0.035 + t * 6) * (r * 0.35 + (audio?.mid || 0.2) * r * 0.45);
        if (x === -r) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      break;
    }

    case 'mg_radar': {
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.stroke();
      const angle = t * 2.2;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
      ctx.stroke();
      break;
    }

    case 'halftoneMatrix': {
      const dots = 7;
      const step = (r * 2) / dots;
      for (let y = 0; y < dots; y++) {
        for (let x = 0; x < dots; x++) {
          const px = -r + (x + 0.5) * step;
          const py = -r + (y + 0.5) * step;
          const dist = Math.hypot(px, py) / r;
          const dotR = Math.max(1.5, (1 - dist * 0.7) * (step * 0.38) * (1 + (audio?.bass || 0) * 0.4));
          ctx.beginPath();
          ctx.arc(px, py, dotR, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      break;
    }

    case 'checkerBlock': {
      const grid = 6;
      const sz = (r * 2) / grid;
      for (let y = 0; y < grid; y++) {
        for (let x = 0; x < grid; x++) {
          if ((x + y) % 2 === 0) {
            ctx.fillStyle = color;
            ctx.fillRect(-r + x * sz, -r + y * sz, sz, sz);
          } else {
            ctx.fillStyle = sec;
            ctx.fillRect(-r + x * sz + 2, -r + y * sz + 2, sz - 4, sz - 4);
          }
        }
      }
      break;
    }

    case 'diagonalHazard': {
      const stripes = 8;
      const sw = (r * 2) / stripes;
      ctx.save();
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.clip();
      for (let i = -stripes; i < stripes * 2; i++) {
        ctx.fillStyle = i % 2 === 0 ? color : sec;
        ctx.beginPath();
        ctx.moveTo(i * sw - r, -r);
        ctx.lineTo(i * sw + sw - r, -r);
        ctx.lineTo(i * sw + sw - r - r * 1.5, r);
        ctx.lineTo(i * sw - r - r * 1.5, r);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
      break;
    }

    case 'prismRays': {
      const rays = 24;
      for (let i = 0; i < rays; i++) {
        const ang = (i / rays) * Math.PI * 2 + t * 0.4;
        const len = r * (0.4 + 0.6 * Math.sin(t * 3 + i * 0.8) * 0.5 + 0.5);
        ctx.strokeStyle = i % 2 === 0 ? color : sec;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(ang) * len, Math.sin(ang) * len);
        ctx.stroke();
      }
      break;
    }

    case 'barcodeBlock': {
      const bars = 22;
      const totalW = r * 2;
      let curX = -r;
      for (let i = 0; i < bars; i++) {
        const bw = Math.max(2, (((i * 7 + 3) % 9) / 9) * (totalW / bars) * 1.5);
        ctx.fillStyle = i % 2 === 0 ? color : sec;
        ctx.fillRect(curX, -r * 0.6, bw, r * 1.2);
        curX += bw + 3;
        if (curX > r) break;
      }
      break;
    }

    case 'shutterPillars': {
      const cols = 5;
      const cw = (r * 2) / cols;
      for (let i = 0; i < cols; i++) {
        const x = -r + (i + 0.5) * cw;
        const h = r * 1.8 * (0.6 + 0.4 * Math.sin(t * 2 + i * 0.9));
        ctx.strokeStyle = color;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(x, -h / 2);
        ctx.lineTo(x, h / 2);
        ctx.stroke();
      }
      break;
    }

    case 'paperCards': {
      const cards = 3;
      for (let i = 0; i < cards; i++) {
        ctx.save();
        ctx.rotate((i - 1) * 0.12 + Math.sin(t * 1.5 + i) * 0.05);
        ctx.fillStyle = i === 1 ? color : sec;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.fillRect(-r * 0.8, -r * 0.8, r * 1.6, r * 1.6);
        ctx.strokeRect(-r * 0.8, -r * 0.8, r * 1.6, r * 1.6);
        ctx.restore();
      }
      break;
    }

    case 'RegistrationMark': {
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-r, 0);
      ctx.lineTo(r, 0);
      ctx.moveTo(0, -r);
      ctx.lineTo(0, r);
      ctx.stroke();
      break;
    }

    case 'cornerBrackets': {
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      const bLen = r * 0.35;
      // Top-left
      ctx.beginPath();
      ctx.moveTo(-r, -r + bLen);
      ctx.lineTo(-r, -r);
      ctx.lineTo(-r + bLen, -r);
      ctx.stroke();
      // Top-right
      ctx.beginPath();
      ctx.moveTo(r - bLen, -r);
      ctx.lineTo(r, -r);
      ctx.lineTo(r, -r + bLen);
      ctx.stroke();
      // Bottom-right
      ctx.beginPath();
      ctx.moveTo(r, r - bLen);
      ctx.lineTo(r, r);
      ctx.lineTo(r - bLen, r);
      ctx.stroke();
      // Bottom-left
      ctx.beginPath();
      ctx.moveTo(-r + bLen, r);
      ctx.lineTo(-r, r);
      ctx.lineTo(-r, r - bLen);
      ctx.stroke();
      break;
    }

    case 'sineWaveGrid': {
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      const waves = 5;
      for (let w = 0; w < waves; w++) {
        const offY = -r * 0.7 + (w / (waves - 1)) * (r * 1.4);
        ctx.beginPath();
        for (let x = -r; x <= r; x += 6) {
          const y = offY + Math.sin(x * 0.04 + t * 4 + w * 0.8) * (14 + (audio?.mid || 0) * 16);
          if (x === -r) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      break;
    }

    case 'mg_pendulum': {
      const count = 9;
      for (let i = 0; i < count; i++) {
        const ang = Math.sin(t * 3 + i * 0.35) * 0.8;
        const len = r * 1.6;
        const bx = Math.sin(ang) * len * 0.5;
        const by = -r * 0.8 + Math.cos(ang) * len * 0.5;
        ctx.strokeStyle = sec;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, -r * 0.8);
        ctx.lineTo(bx, by);
        ctx.stroke();
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(bx, by, 7 + (audio?.bass || 0) * 4, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }

    case 'mg_tickerRing': {
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.85, 0, Math.PI * 2);
      ctx.stroke();
      const ticks = 32;
      for (let i = 0; i < ticks; i++) {
        const ang = (i / ticks) * Math.PI * 2 + t * 0.5;
        const isMajor = i % 4 === 0;
        const inner = r * (isMajor ? 0.7 : 0.78);
        const outer = r * 0.85;
        ctx.lineWidth = isMajor ? 2.5 : 1.5;
        ctx.beginPath();
        ctx.moveTo(Math.cos(ang) * inner, Math.sin(ang) * inner);
        ctx.lineTo(Math.cos(ang) * outer, Math.sin(ang) * outer);
        ctx.stroke();
      }
      break;
    }

    case 'mg_pulseMatrix': {
      const sz = 5;
      const step = (r * 2) / sz;
      for (let y = 0; y < sz; y++) {
        for (let x = 0; x < sz; x++) {
          const val = Math.sin(t * 5 + x * 0.8 + y * 0.8) * 0.5 + 0.5 + (audio?.bass || 0) * 0.5;
          ctx.fillStyle = val > 0.65 ? color : sec;
          const boxSize = step * 0.65 * Math.min(1.2, val);
          ctx.fillRect(-r + (x + 0.5) * step - boxSize / 2, -r + (y + 0.5) * step - boxSize / 2, boxSize, boxSize);
        }
      }
      break;
    }

    case 'mg_scanline': {
      ctx.fillStyle = color;
      const count = 18;
      const h = (r * 2) / count;
      for (let i = 0; i < count; i++) {
        if (i % 2 === 0) {
          ctx.globalAlpha = 0.6 + Math.sin(t * 8 + i) * 0.3;
          ctx.fillRect(-r, -r + i * h, r * 2, h * 0.7);
        }
      }
      ctx.globalAlpha = 1;
      const scanY = -r + (((t * 1.5) % 1) * (r * 2));
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-r, scanY, r * 2, 3);
      break;
    }

    case 'mg_lissajous': {
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (let a = 0; a <= Math.PI * 2; a += 0.05) {
        const lx = Math.sin(a * 3 + t * 2) * r * 0.85;
        const ly = Math.sin(a * 2 + t * 1.4) * r * 0.85;
        if (a === 0) ctx.moveTo(lx, ly);
        else ctx.lineTo(lx, ly);
      }
      ctx.stroke();
      break;
    }

    case 'swissCross':
    default: {
      const arm = r * 0.28;
      ctx.strokeRect(-arm, -r, arm * 2, r * 2);
      ctx.strokeRect(-r, -arm, r * 2, arm * 2);
      break;
    }
  }

  ctx.restore();
}

function drawPatternClippedChar(ctx, ch, drawX, drawY, fontStr, patternStyle, charGlobalIndex) {
  const metrics = ctx.measureText(ch);
  const cw = Math.ceil(Math.max(metrics.width * 1.35, 180));
  const chH = Math.ceil(cw * 1.25);
  const scratch = getGlyphScratchCanvas(cw, chH);

  if (!scratch) {
    ctx.fillText(ch, drawX, drawY);
    return;
  }

  const sctx = scratch.getContext('2d');
  sctx.save();
  sctx.clearRect(0, 0, cw, chH);

  // 1. Draw solid glyph mask in center of scratch canvas
  sctx.font = fontStr;
  sctx.textAlign = 'center';
  sctx.textBaseline = 'middle';
  sctx.fillStyle = '#000000';
  const cx = cw / 2;
  const cy = chH / 2;
  sctx.fillText(ch, cx, cy);

  // 2. Composite pattern strictly inside the glyph alpha mask ('source-in')
  sctx.globalCompositeOperation = 'source-in';

  if (patternStyle === 'hangulModular') {
    // 4 Hangul syllables:
    // 0 (글): Teal/green geometric weave
    // 1 (자): Coral/orange cross & dot pattern
    // 2 (놀): Teal/green checker/diamond weave
    // 3 (이): Blue/cyan dot & cross grid
    const variant = charGlobalIndex % 4;
    if (variant === 0 || variant === 2) {
      // White base with dense teal/green geometric pattern cells
      sctx.fillStyle = '#e8f5f0';
      sctx.fillRect(0, 0, cw, chH);
      const step = 12;
      for (let py = 0; py < chH; py += step) {
        for (let px = 0; px < cw; px += step) {
          const r = Math.floor(py / step);
          const c = Math.floor(px / step);
          if ((r + c) % 2 === 0) {
            sctx.fillStyle = '#0f9f78';
            sctx.fillRect(px + 1, py + 1, step - 2, step - 2);
          } else {
            sctx.fillStyle = '#14b88a';
            sctx.beginPath();
            sctx.arc(px + step / 2, py + step / 2, step * 0.26, 0, Math.PI * 2);
            sctx.fill();
          }
        }
      }
    } else if (variant === 1) {
      // Coral/orange modular cross/checker pattern
      sctx.fillStyle = '#fff1ed';
      sctx.fillRect(0, 0, cw, chH);
      const step = 12;
      sctx.fillStyle = '#ff5c39';
      for (let py = 0; py < chH; py += step) {
        for (let px = 0; px < cw; px += step) {
          sctx.fillRect(px + 2, py + 2, step - 4, step - 4);
        }
      }
    } else {
      // Cyan/blue modular grid pattern
      sctx.fillStyle = '#eef4ff';
      sctx.fillRect(0, 0, cw, chH);
      const step = 12;
      for (let py = 0; py < chH; py += step) {
        for (let px = 0; px < cw; px += step) {
          const r = Math.floor(py / step);
          const c = Math.floor(px / step);
          sctx.fillStyle = (r + c) % 2 === 0 ? '#1957f5' : '#38bdf8';
          sctx.beginPath();
          sctx.arc(px + step / 2, py + step / 2, step * 0.38, 0, Math.PI * 2);
          sctx.fill();
        }
      }
    }
  } else if (patternStyle === 'diagonalOlive') {
    // Cutout Credits: Diagonal olive/forest green stripes masked inside VOID INDEX (Screenshot 5)
    sctx.fillStyle = '#1f5e3b';
    sctx.fillRect(0, 0, cw, chH);
    sctx.strokeStyle = '#99b898';
    sctx.lineWidth = 7;
    for (let i = -chH; i < cw + chH; i += 16) {
      sctx.beginPath();
      sctx.moveTo(i, 0);
      sctx.lineTo(i - chH, chH);
      sctx.stroke();
    }
  }

  sctx.restore();

  // 3. Draw clipped glyph back onto main canvas
  ctx.drawImage(scratch, 0, 0, cw, chH, drawX - cx, drawY - cy, cw, chH);
}

function renderTextLayer(ctx, layer, state, t, audio, palette, scene = null) {
  if (!layer.text) return;

  ctx.save();
  ctx.translate(state.x, state.y);
  ctx.rotate((state.rotation * Math.PI) / 180);
  ctx.scale(state.scale, state.scale);

  const fontSize = layer.fontSize || 96;
  const fontWeight = layer.fontWeight || 700;
  const fontFamily = layer.fontFamily || "'Space Grotesk', sans-serif";
  const fontStr = `${fontWeight} ${fontSize}px ${fontFamily}`;
  ctx.font = fontStr;
  ctx.textBaseline = 'middle';

  // Apply optional text transform (VectorCraft / DesignCraft rules)
  let rawText = String(layer.text);
  if (layer.textTransform === 'uppercase') {
    rawText = rawText.toUpperCase();
  } else if (layer.textTransform === 'lowercase') {
    rawText = rawText.toLowerCase();
  } else if (layer.textTransform === 'capitalize') {
    rawText = rawText.replace(/\b\w/g, (c) => c.toUpperCase());
  }

  const lines = rawText.split('\n');
  const lineHeightPx = fontSize * (layer.lineHeight || 1.0);
  const totalHeight = lines.length * lineHeightPx;
  const startY = -totalHeight / 2 + lineHeightPx / 2;

  const preset = (layer.motionPreset && layer.motionPreset !== 'none')
    ? layer.motionPreset
    : (scene?.motionPreset && scene.motionPreset !== 'none')
    ? scene.motionPreset
    : 'none';
  const speed = layer.motionSpeed ?? scene?.motionSpeed ?? 1;
  const stagger = layer.stagger ?? 0.04;
  const stiffness = layer.motionStiffness ?? 200;
  const damping = layer.motionDamping ?? 13;
  const overshoot = layer.motionOvershoot ?? 1.2;
  const waveform = layer.motionWaveform || 'spring';
  const direction = layer.motionDirection || 'vertical';
  const target = layer.motionTarget || (layer.charAnimate ? 'char' : 'line');

  // Optional left editorial accent rule (Hangul Modules left column)
  if (layer.leftAccentColor) {
    ctx.save();
    ctx.strokeStyle = layer.leftAccentColor;
    ctx.lineWidth = 4;
    const ruleX = layer.align === 'left' ? -(layer.width || 300) / 2 - 16 : -180;
    ctx.beginPath();
    ctx.moveTo(ruleX, -totalHeight / 2 - 4);
    ctx.lineTo(ruleX, totalHeight / 2 + 4);
    ctx.stroke();
    ctx.restore();
  }

  // Optional small patterned square ornament next to Supporting headline in Hangul Modules
  if (layer.topRightBadgeColor) {
    ctx.save();
    const boxSize = 24;
    const bx = layer.align === 'left' ? -(layer.width || 280) / 2 + 135 : 80;
    const by = -totalHeight / 2 - 2;
    ctx.fillStyle = layer.topRightBadgeColor;
    ctx.fillRect(bx, by, boxSize, boxSize);
    ctx.fillStyle = '#ffffff';
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        if ((r + c) % 2 === 1) {
          ctx.fillRect(bx + 3 + c * 6, by + 3 + r * 6, 4, 4);
        }
      }
    }
    ctx.restore();
  }

  let globalCharCounter = 0;

  // Helper to compute spring-driven transformation for a segment (character, word, or whole line)
  const computeSpringTransform = (phase, segmentIdx, totalSegments) => {
    const springVal = evaluatePeriodicSpring(phase, {
      stiffness,
      damping,
      overshoot,
      waveform,
    });

    let cx = 0;
    let cy = 0;
    let cScaleX = 1;
    let cScaleY = 1;
    let cRot = 0;
    let cAlpha = state.opacity;

    switch (preset) {
      case 'kineticSpringHop': {
        // Squash & stretch physics jump
        cy = -Math.abs(springVal) * (fontSize * 0.22) * overshoot;
        if (springVal >= 0) {
          cScaleY = 1 + springVal * 0.18;
          cScaleX = 1 - springVal * 0.08;
        } else {
          cScaleY = 1 - Math.abs(springVal) * 0.14;
          cScaleX = 1 + Math.abs(springVal) * 0.12;
        }
        break;
      }

      case 'magneticSnap': {
        if (direction === 'horizontal') {
          cx = springVal * (fontSize * 0.22) * overshoot;
        } else {
          cy = springVal * (fontSize * 0.22) * overshoot;
        }
        cScaleX = 1 + Math.max(0, springVal) * 0.16;
        cScaleY = cScaleX;
        break;
      }

      case 'staggerCascade': {
        cy = springVal * (fontSize * 0.24) * overshoot;
        cRot = springVal * 0.06;
        break;
      }

      case 'editorialRise': {
        cy = springVal * (fontSize * 0.14);
        cAlpha = state.opacity * Math.min(1, Math.max(0.2, 0.7 + 0.3 * springVal));
        break;
      }

      case 'splitReveal': {
        cy = springVal * (fontSize * 0.18);
        cRot = springVal * 0.10;
        break;
      }

      case 'kineticVortex': {
        cx = Math.sin(phase) * 12 * overshoot;
        cy = Math.cos(phase) * 12 * overshoot;
        cRot = phase * 0.15;
        cScaleX = 0.88 + 0.15 * springVal;
        cScaleY = cScaleX;
        break;
      }

      case 'liquidWave':
      case 'kineticWave': {
        cy = springVal * (fontSize * 0.13);
        cx = Math.cos(phase * 0.7) * 8;
        cRot = Math.sin(phase * 0.5) * 0.04;
        break;
      }

      case 'variableStretch':
      case 'elasticStretch': {
        cScaleX = 1 + springVal * 0.20;
        cScaleY = 1 - springVal * 0.12;
        break;
      }

      case 'pendulumSwing': {
        cRot = springVal * 0.22 * overshoot;
        cx = Math.sin(cRot) * (fontSize * 0.2);
        break;
      }

      case 'audioShockwave': {
        const bass = audio?.bass || 0;
        cy = -bass * 28 * overshoot + springVal * 5;
        cScaleX = 1 + bass * 0.32 + Math.max(0, springVal) * 0.12;
        cScaleY = cScaleX;
        cRot = ((segmentIdx % 2 === 0 ? 1 : -1) * bass * 0.1);
        break;
      }

      case 'stompPop': {
        cScaleX = 1 + Math.max(0, springVal) * 0.22;
        cScaleY = cScaleX;
        break;
      }

      case 'shutterSlice': {
        cy = Math.round(springVal * 2.5) * 6;
        break;
      }

      case 'spiralOrbit': {
        cx = Math.cos(phase) * 10 * overshoot;
        cy = Math.sin(phase) * 10 * overshoot;
        break;
      }

      case 'typewriterTick': {
        cAlpha = springVal > -0.3 ? state.opacity : 0.15;
        break;
      }

      case 'fadeScale': {
        cAlpha = state.opacity * (0.8 + 0.2 * springVal);
        cScaleX = 0.96 + 0.04 * springVal;
        cScaleY = cScaleX;
        break;
      }

      case 'glitchJitter': {
        cx = Math.sin(phase * 7) > 0.8 ? (Math.random() - 0.5) * 18 * overshoot : 0;
        cy = Math.sin(phase * 5) > 0.85 ? (Math.random() - 0.5) * 8 : 0;
        break;
      }

      case 'slideUp': {
        cy = springVal * (fontSize * 0.15);
        break;
      }

      default:
        break;
    }

    return { cx, cy, cScaleX, cScaleY, cRot, cAlpha };
  };

  lines.forEach((line, lineIdx) => {
    const lineY = startY + lineIdx * lineHeightPx;

    // 1. Whole-line mode (or preset 'none')
    if (target === 'line' || preset === 'none') {
      let offY = 0;
      let offX = 0;
      let scaleY = 1;
      let scaleX = 1;
      let rot = 0;
      let alpha = state.opacity;

      if (preset !== 'none') {
        const linePhase = t * 3.2 * speed - lineIdx * stagger * 6;
        const res = computeSpringTransform(linePhase, lineIdx, lines.length);
        offX = res.cx;
        offY = res.cy;
        scaleX = res.cScaleX;
        scaleY = res.cScaleY;
        rot = res.cRot;
        alpha = res.cAlpha;
      }

      ctx.save();
      ctx.translate(offX, lineY + offY);
      if (rot !== 0) ctx.rotate(rot);
      if (scaleX !== 1 || scaleY !== 1) ctx.scale(scaleX, scaleY);
      ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
      ctx.fillStyle = layer.color || '#ffffff';
      ctx.textAlign = layer.align || 'center';
      const alignX =
        layer.align === 'left'
          ? -(layer.width || 600) / 2
          : layer.align === 'right'
          ? (layer.width || 600) / 2
          : 0;

      // Optional Drop Shadow / Glow (LightCraft)
      if (layer.shadowEnabled) {
        ctx.shadowColor = layer.shadowColor || 'rgba(0, 0, 0, 0.65)';
        ctx.shadowBlur = layer.shadowBlur ?? 14;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 4;
      }

      // Optional Stroke Outline (VectorCraft)
      if (layer.strokeEnabled && (layer.strokeWidth || 2) > 0) {
        ctx.save();
        ctx.strokeStyle = layer.strokeColor || '#000000';
        ctx.lineWidth = (layer.strokeWidth || 2) * 2;
        ctx.lineJoin = 'round';
        ctx.strokeText(line, alignX, 0);
        ctx.restore();
      }

      ctx.fillText(line, alignX, 0);
      ctx.restore();
      return;
    }

    // 2. Word-by-word mode
    if (target === 'word') {
      const words = line.split(/(\s+)/); // Preserves spaces
      const tracking = layer.letterSpacing ?? 0;
      const wordWidths = words.map((w) => ctx.measureText(w).width + tracking);
      const totalLineWidth = wordWidths.reduce((acc, w) => acc + w, 0) - tracking;

      let cursorX = -totalLineWidth / 2;
      if (layer.align === 'left') cursorX = -(layer.width || 700) / 2;
      else if (layer.align === 'right') cursorX = (layer.width || 700) / 2 - totalLineWidth;

      let wordCounter = 0;
      words.forEach((w, wIdx) => {
        const ww = wordWidths[wIdx];
        const isSpace = /^\s+$/.test(w);
        if (!isSpace) {
          const wordCenterX = cursorX + ww / 2;
          const phase = t * 3.2 * speed - (lineIdx * 3 + wordCounter) * stagger * 5;
          const { cx, cy, cScaleX, cScaleY, cRot, cAlpha } = computeSpringTransform(phase, wordCounter, words.length);

          ctx.save();
          ctx.translate(wordCenterX + cx, lineY + cy);
          ctx.rotate(cRot);
          ctx.scale(cScaleX, cScaleY);
          ctx.globalAlpha = Math.max(0, Math.min(1, cAlpha));
          ctx.textAlign = 'center';

          if (layer.shadowEnabled) {
            ctx.shadowColor = layer.shadowColor || 'rgba(0, 0, 0, 0.65)';
            ctx.shadowBlur = layer.shadowBlur ?? 14;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 4;
          }

          if (layer.strokeEnabled && (layer.strokeWidth || 2) > 0) {
            ctx.save();
            ctx.strokeStyle = layer.strokeColor || '#000000';
            ctx.lineWidth = (layer.strokeWidth || 2) * 2;
            ctx.lineJoin = 'round';
            ctx.strokeText(w, 0, 0);
            ctx.restore();
          }

          ctx.fillStyle = layer.color || '#ffffff';
          ctx.fillText(w, 0, 0);
          ctx.restore();
          wordCounter++;
        }
        cursorX += ww;
      });
      return;
    }

    // 3. Per-character kinetic animation (default char mode)
    const chars = Array.from(line);
    const tracking = layer.letterSpacing ?? 0;
    const charWidths = chars.map((ch) => ctx.measureText(ch).width + tracking);
    const totalLineWidth = charWidths.reduce((acc, w) => acc + w, 0) - tracking;

    let cursorX = -totalLineWidth / 2;
    if (layer.align === 'left') cursorX = -(layer.width || 700) / 2;
    else if (layer.align === 'right') cursorX = (layer.width || 700) / 2 - totalLineWidth;

    chars.forEach((ch, charIdx) => {
      const cw = charWidths[charIdx];
      const charCenterX = cursorX + cw / 2;
      const phase = t * 3.2 * speed - (lineIdx * 4 + charIdx) * stagger * 4;

      const { cx, cy, cScaleX, cScaleY, cRot, cAlpha } = computeSpringTransform(phase, charIdx, chars.length);

      ctx.save();
      ctx.translate(charCenterX + cx, lineY + cy);
      ctx.rotate(cRot);
      ctx.scale(cScaleX, cScaleY);
      ctx.globalAlpha = Math.max(0, Math.min(1, cAlpha));
      ctx.textAlign = 'center';

      if (layer.shadowEnabled) {
        ctx.shadowColor = layer.shadowColor || 'rgba(0, 0, 0, 0.65)';
        ctx.shadowBlur = layer.shadowBlur ?? 14;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 4;
      }

      if (layer.strokeEnabled && (layer.strokeWidth || 2) > 0) {
        ctx.save();
        ctx.strokeStyle = layer.strokeColor || '#000000';
        ctx.lineWidth = (layer.strokeWidth || 2) * 2;
        ctx.lineJoin = 'round';
        ctx.strokeText(ch, 0, 0);
        ctx.restore();
      }

      if (layer.patternFill === 'hangulModular' || layer.patternFill === 'diagonalOlive') {
        const isWhitespace = !ch.trim();
        if (!isWhitespace) {
          drawPatternClippedChar(ctx, ch, 0, 0, fontStr, layer.patternFill, globalCharCounter);
          globalCharCounter++;
        }
      } else {
        ctx.fillStyle = layer.color || '#ffffff';
        ctx.fillText(ch, 0, 0);
      }

      ctx.restore();
      cursorX += cw;
    });
  });

  ctx.restore();
}

/**
 * Procedural & Vector Primitive Shapes Renderer (Fase 3: Rectangle, Circle, Pill, Triangle, Star, Line)
 */
function renderShapeLayer(ctx, layer, state, t, audio, palette, canvasWidth = 1080, canvasHeight = 1350, scene = null) {
  ctx.save();
  ctx.globalAlpha = state.opacity;
  ctx.translate(state.x, state.y);
  ctx.rotate((state.rotation * Math.PI) / 180);
  ctx.scale(state.scale, state.scale);

  const w = layer.width || layer.size || 200;
  const h = layer.height || layer.size || 200;
  const fill = layer.fill || layer.color || '#159947';
  const stroke = layer.stroke || '#22c55e';
  const strokeW = Number(layer.strokeWidth) || 0;
  const cornerR = Number(layer.cornerRadius) || 0;
  const shapeType = layer.shapeType || 'rectangle';

  if (layer.shadowEnabled) {
    ctx.shadowColor = layer.shadowColor || 'rgba(0, 0, 0, 0.45)';
    ctx.shadowBlur = layer.shadowBlur ?? 16;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 4;
  }

  ctx.beginPath();
  switch (shapeType) {
    case 'circle': {
      const rx = w / 2;
      const ry = h / 2;
      ctx.ellipse(0, 0, Math.max(1, rx), Math.max(1, ry), 0, 0, Math.PI * 2);
      break;
    }
    case 'pill': {
      const r = Math.min(w, h) / 2;
      if (ctx.roundRect) {
        ctx.roundRect(-w / 2, -h / 2, w, h, r);
      } else {
        ctx.rect(-w / 2, -h / 2, w, h);
      }
      break;
    }
    case 'triangle': {
      ctx.moveTo(0, -h / 2);
      ctx.lineTo(w / 2, h / 2);
      ctx.lineTo(-w / 2, h / 2);
      ctx.closePath();
      break;
    }
    case 'star': {
      const points = 5;
      const outerR = Math.min(w, h) / 2;
      const innerR = outerR * 0.4;
      for (let i = 0; i < points * 2; i++) {
        const rad = i % 2 === 0 ? outerR : innerR;
        const angle = (i * Math.PI) / points - Math.PI / 2;
        const px = Math.cos(angle) * rad;
        const py = Math.sin(angle) * rad;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      break;
    }
    case 'line': {
      ctx.moveTo(-w / 2, 0);
      ctx.lineTo(w / 2, 0);
      break;
    }
    case 'rectangle':
    default: {
      if (cornerR > 0 && ctx.roundRect) {
        ctx.roundRect(-w / 2, -h / 2, w, h, Math.min(cornerR, Math.min(w, h) / 2));
      } else {
        ctx.rect(-w / 2, -h / 2, w, h);
      }
      break;
    }
  }

  if (shapeType !== 'line' && fill && fill !== 'none' && fill !== 'transparent') {
    ctx.fillStyle = fill;
    ctx.fill();
  }

  if (shapeType === 'line' || (strokeW > 0 && stroke && stroke !== 'none')) {
    ctx.strokeStyle = shapeType === 'line' ? fill : stroke;
    ctx.lineWidth = shapeType === 'line' ? Math.max(1, h || strokeW || 3) : strokeW;
    ctx.lineCap = 'round';
    ctx.stroke();
  }

  ctx.restore();
}

// Module-level pooled image cache for local SVG & PNG asset layers
const localAssetImageCache = new Map();

function getCachedImageElement(src) {
  if (!src) return null;
  let cached = localAssetImageCache.get(src);
  if (!cached && typeof Image !== 'undefined') {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = src;
    cached = img;
    localAssetImageCache.set(src, cached);
  }
  return cached;
}

/**
 * Local SVG & PNG Media Asset Layer Renderer (Fase 3: Local Image Import)
 */
function renderImageLayer(ctx, layer, state, t, audio, palette, canvasWidth = 1080, canvasHeight = 1350, scene = null) {
  ctx.save();
  ctx.globalAlpha = state.opacity;
  ctx.translate(state.x, state.y);
  ctx.rotate((state.rotation * Math.PI) / 180);
  ctx.scale(state.scale, state.scale);

  const w = layer.width || 300;
  const h = layer.height || 300;
  const cornerR = Number(layer.cornerRadius) || 0;
  const strokeW = Number(layer.strokeWidth) || 0;
  const stroke = layer.stroke || '#ffffff';

  const img = layer.customImageElement || getCachedImageElement(layer.src || layer.dataUrl);

  if (img && img.complete && img.naturalWidth > 0) {
    ctx.save();
    ctx.beginPath();
    if (cornerR > 0 && ctx.roundRect) {
      ctx.roundRect(-w / 2, -h / 2, w, h, Math.min(cornerR, Math.min(w, h) / 2));
    } else {
      ctx.rect(-w / 2, -h / 2, w, h);
    }
    ctx.clip();
    ctx.drawImage(img, -w / 2, -h / 2, w, h);
    ctx.restore();
  } else {
    // Elegant fallback placeholder while decoding
    ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(-w / 2, -h / 2, w, h);
    ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.fillStyle = '#999999';
    ctx.font = "14px 'Space Grotesk', sans-serif";
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(layer.name || 'Image Layer', 0, 0);
  }

  if (strokeW > 0) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = strokeW;
    ctx.beginPath();
    if (cornerR > 0 && ctx.roundRect) {
      ctx.roundRect(-w / 2, -h / 2, w, h, Math.min(cornerR, Math.min(w, h) / 2));
    } else {
      ctx.rect(-w / 2, -h / 2, w, h);
    }
    ctx.stroke();
  }

  ctx.restore();
}

export function getLayerBoundingBox(layer) {
  if (!layer) return { width: 100, height: 100 };
  const rawScale = typeof layer.scale === 'number' && Number.isFinite(layer.scale) && layer.scale > 0 ? layer.scale : 1;
  const scale = rawScale;

  if (layer.type === 'shape') {
    const rawW = typeof layer.width === 'number' && Number.isFinite(layer.width) ? layer.width : (typeof layer.size === 'number' && Number.isFinite(layer.size) ? layer.size : 200);
    const rawH = typeof layer.height === 'number' && Number.isFinite(layer.height) ? layer.height : (typeof layer.size === 'number' && Number.isFinite(layer.size) ? layer.size : 200);
    return { width: Math.max(10, rawW * scale), height: Math.max(10, rawH * scale) };
  }
  if (layer.type === 'vectorPath') {
    const rawW = typeof layer.width === 'number' && Number.isFinite(layer.width) ? layer.width : 300;
    const rawH = typeof layer.height === 'number' && Number.isFinite(layer.height) ? layer.height : 300;
    return { width: Math.max(10, rawW * scale), height: Math.max(10, rawH * scale) };
  }
  if (layer.type === 'image') {
    const rawW = typeof layer.width === 'number' && Number.isFinite(layer.width) ? layer.width : 300;
    const rawH = typeof layer.height === 'number' && Number.isFinite(layer.height) ? layer.height : 300;
    return { width: Math.max(10, rawW * scale), height: Math.max(10, rawH * scale) };
  }
  if (layer.type === 'graphic') {
    const rawS = typeof layer.size === 'number' && Number.isFinite(layer.size) ? layer.size : 300;
    const s = Math.max(10, rawS * scale);
    return { width: s, height: s };
  }
  const lines = String(layer.text || '').split('\n');
  const fs = (typeof layer.fontSize === 'number' && Number.isFinite(layer.fontSize) ? layer.fontSize : 96) * scale;
  const rawW = typeof layer.width === 'number' && Number.isFinite(layer.width) ? layer.width : 420;
  const lh = typeof layer.lineHeight === 'number' && Number.isFinite(layer.lineHeight) ? layer.lineHeight : 1.05;
  const w = Math.max(rawW, fs * 2.5);
  const h = Math.max(fs * 1.15, lines.length * fs * lh);
  return { width: Math.max(10, w), height: Math.max(10, h) };
}

function drawSelectionBox(ctx, layer, state) {
  const { width, height } = getLayerBoundingBox(layer);
  const safeX = Number.isFinite(state?.x) ? state.x : 0;
  const safeY = Number.isFinite(state?.y) ? state.y : 0;
  const safeRot = Number.isFinite(state?.rotation) ? state.rotation : 0;

  ctx.save();
  ctx.translate(safeX, safeY);
  ctx.rotate((safeRot * Math.PI) / 180);

  // Crisp white selection outline
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.setLineDash([]);
  ctx.strokeRect(-width / 2 - 12, -height / 2 - 12, width + 24, height + 24);

  // Floating dark rounded pill label at top-left (Screenshots 8, 17, 19, 34, 36)
  const labelText = layer.name || (layer.type === 'text' ? 'Title' : 'Graphic');
  ctx.font = "600 18px 'Plus Jakarta Sans', sans-serif";
  const textWidth = ctx.measureText(labelText).width;
  const pillW = textWidth + 24;
  const pillH = 32;
  const pillX = -width / 2 - 4;
  const pillY = -height / 2 - 4 - pillH;

  ctx.fillStyle = 'rgba(15, 15, 18, 0.92)';
  ctx.beginPath();
  if (ctx.roundRect) {
    ctx.roundRect(pillX, pillY, pillW, pillH, 8);
  } else {
    ctx.rect(pillX, pillY, pillW, pillH);
  }
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(labelText, pillX + 12, pillY + pillH / 2 + 1);

  // Top rotation stem & circular rotation button (↻)
  const rotY = -height / 2 - 48;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, -height / 2 - 12);
  ctx.lineTo(0, rotY + 14);
  ctx.stroke();

  ctx.fillStyle = '#141418';
  ctx.beginPath();
  ctx.arc(0, rotY, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Little rotation arc inside handle
  ctx.beginPath();
  ctx.arc(0, rotY, 6, -Math.PI * 0.7, Math.PI * 0.6);
  ctx.stroke();

  // 8 square resize handles (corners + midpoints)
  const hs = 11;
  const pts = [
    [-width / 2 - 12, -height / 2 - 12],
    [0, -height / 2 - 12],
    [width / 2 + 12, -height / 2 - 12],
    [-width / 2 - 12, 0],
    [width / 2 + 12, 0],
    [-width / 2 - 12, height / 2 + 12],
    [0, height / 2 + 12],
    [width / 2 + 12, height / 2 + 12],
  ];
  pts.forEach(([px, py]) => {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(px - hs / 2, py - hs / 2, hs, hs);
    ctx.strokeStyle = '#111111';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(px - hs / 2, py - hs / 2, hs, hs);
  });

  ctx.restore();
}

/**
 * Multi-Selection Bounding Box & Group Overlay (Fase 3: Multi-Selection)
 */
function drawMultiSelectionBox(ctx, layersWithStates) {
  if (!layersWithStates || layersWithStates.length < 2) return;
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  layersWithStates.forEach(({ layer, state }) => {
    const box = getLayerBoundingBox(layer);
    const halfW = box.width / 2;
    const halfH = box.height / 2;
    minX = Math.min(minX, state.x - halfW);
    maxX = Math.max(maxX, state.x + halfW);
    minY = Math.min(minY, state.y - halfH);
    maxY = Math.max(maxY, state.y + halfH);
  });

  const pad = 12;
  const boxX = minX - pad;
  const boxY = minY - pad;
  const boxW = maxX - minX + pad * 2;
  const boxH = maxY - minY + pad * 2;

  ctx.save();
  ctx.strokeStyle = '#22c55e';
  ctx.lineWidth = 1.8;
  ctx.setLineDash([8, 6]);
  ctx.strokeRect(boxX, boxY, boxW, boxH);
  ctx.setLineDash([]);

  // Handles at 4 corners
  const corners = [
    [boxX, boxY],
    [boxX + boxW, boxY],
    [boxX + boxW, boxY + boxH],
    [boxX, boxY + boxH],
  ];
  corners.forEach(([cx, cy]) => {
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#159947';
    ctx.lineWidth = 2;
    ctx.fillRect(cx - 6, cy - 6, 12, 12);
    ctx.strokeRect(cx - 6, cy - 6, 12, 12);
  });

  // Floating label pill: "N layers selected"
  const label = `${layersWithStates.length} layers selected`;
  ctx.font = "600 16px 'Plus Jakarta Sans', sans-serif";
  const tw = ctx.measureText(label).width;
  const pillW = tw + 24;
  const pillH = 30;
  const pillX = boxX;
  const pillY = boxY - pillH - 6;

  ctx.fillStyle = 'rgba(21, 153, 71, 0.95)';
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(pillX, pillY, pillW, pillH, 6);
  else ctx.rect(pillX, pillY, pillW, pillH);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, pillX + 12, pillY + pillH / 2 + 1);
  ctx.restore();
}

/**
 * Active Snap Alignment Guidelines (Fase 3: Snap to Center & Edges)
 */
function drawActiveSnapGuides(ctx, width, height, guides) {
  if (!guides) return;
  ctx.save();
  ctx.strokeStyle = '#4ade80';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([6, 4]);

  if (typeof guides.x === 'number') {
    ctx.beginPath();
    ctx.moveTo(guides.x, 0);
    ctx.lineTo(guides.x, height);
    ctx.stroke();
  }
  if (typeof guides.y === 'number') {
    ctx.beginPath();
    ctx.moveTo(0, guides.y);
    ctx.lineTo(width, guides.y);
    ctx.stroke();
  }
  ctx.restore();
}

function drawSafeAreaGuides(ctx, width, height, bgHex) {
  ctx.save();
  const isLight = isLightHex(bgHex || '#101935');
  ctx.strokeStyle = isLight ? 'rgba(20, 20, 20, 0.55)' : 'rgba(255, 255, 255, 0.55)';
  ctx.lineWidth = 2;
  ctx.setLineDash([10, 8]);
  const marginX = Math.round(width * 0.065);
  const marginY = Math.round(height * 0.065);
  ctx.strokeRect(marginX, marginY, width - marginX * 2, height - marginY * 2);

  // Inner secondary dashed guide (Screenshots 11 & 48)
  ctx.lineWidth = 1.2;
  ctx.setLineDash([6, 6]);
  const innerX = Math.round(width * 0.09);
  const innerY = Math.round(height * 0.09);
  ctx.strokeRect(innerX, innerY, width - innerX * 2, height - innerY * 2);
  ctx.restore();
}

function isLightHex(hex) {
  const clean = String(hex).replace('#', '');
  if (clean.length !== 6) return false;
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 150;
}
