import { evaluateEasing } from '../utils/timecode';

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

export function evaluateLayerKeyframes(layer, localTime) {
  const result = {
    posX: layer.x,
    posY: layer.y,
    scale: layer.scale ?? 1,
    rotation: layer.rotation ?? 0,
    opacity: layer.opacity ?? 1,
  };

  if (!layer.keyframes || layer.keyframes.length === 0) {
    return result;
  }

  const props = ['posX', 'posY', 'scale', 'rotation', 'opacity'];
  props.forEach((prop) => {
    const kfs = layer.keyframes
      .filter((k) => k.prop === prop)
      .sort((a, b) => a.time - b.time);
    if (kfs.length === 0) return;
    if (localTime <= kfs[0].time) {
      result[prop] = kfs[0].value;
      return;
    }
    if (localTime >= kfs[kfs.length - 1].time) {
      result[prop] = kfs[kfs.length - 1].value;
      return;
    }
    for (let i = 0; i < kfs.length - 1; i++) {
      const k0 = kfs[i];
      const k1 = kfs[i + 1];
      if (localTime >= k0.time && localTime <= k1.time) {
        const span = Math.max(0.0001, k1.time - k0.time);
        const rawT = (localTime - k0.time) / span;
        const easedT = evaluateEasing(k1.easing || 'easeOutCubic', rawT);
        result[prop] = k0.value + (k1.value - k0.value) * easedT;
        break;
      }
    }
  });

  return result;
}

export function renderSceneToCanvas({
  ctx,
  width,
  height,
  scene,
  localTime = 0,
  audioSignals = { bass: 0, mid: 0, treble: 0, rms: 0 },
  selectedLayerId = null,
  showGrid = false,
  showSafeGuides = false,
}) {
  if (!ctx || !scene) return;

  ctx.save();
  ctx.clearRect(0, 0, width, height);

  // 1. Background Fill
  ctx.fillStyle = scene.bg || '#101935';
  ctx.fillRect(0, 0, width, height);

  // 2. Template Generative Background / System Decor
  drawTemplateDecor(ctx, width, height, scene, localTime, audioSignals);

  // 3. Optional Swiss Layout Grid Overlay (4x4 modular grid matching Screenshot 23)
  if (showGrid || (scene.gridStyle && scene.gridStyle !== 'none' && scene.decorStyle !== 'hangulGrid')) {
    drawLayoutGrid(ctx, width, height, scene.gridStyle || 'swiss', scene.palette, showGrid);
  }

  // 4. Render Scene Layers (Bottom to Top)
  const layers = scene.layers || [];
  layers.forEach((layer) => {
    if (layer.visible === false) return;
    const kfState = evaluateLayerKeyframes(layer, localTime);

    let dx = 0;
    let dy = 0;
    let dScale = 0;
    let dRot = 0;
    let dAlpha = 0;

    if (layer.audioReactive) {
      const sigVal = audioSignals[layer.audioSignal || 'bass'] || 0;
      const intensity = (layer.audioIntensity ?? 40) / 100;
      const target = layer.audioTarget || 'scale';
      if (target === 'scale') dScale = sigVal * intensity * 0.35;
      else if (target === 'posY') dy = -sigVal * intensity * 65;
      else if (target === 'posX') dx = sigVal * intensity * 55;
      else if (target === 'rotation') dRot = sigVal * intensity * 35;
      else if (target === 'opacity') dAlpha = -sigVal * intensity * 0.4;
    }

    const finalState = {
      x: kfState.posX + dx,
      y: kfState.posY + dy,
      scale: Math.max(0.05, kfState.scale + dScale),
      rotation: kfState.rotation + dRot,
      opacity: Math.max(0, Math.min(1, kfState.opacity + dAlpha)),
    };

    if (layer.type === 'graphic') {
      renderGraphicLayer(ctx, layer, finalState, localTime, audioSignals, scene.palette, width, height);
    } else if (layer.type === 'text') {
      renderTextLayer(ctx, layer, finalState, localTime, audioSignals, scene.palette);
    }

    if (selectedLayerId && layer.id === selectedLayerId) {
      drawSelectionBox(ctx, layer, finalState);
    }
  });

  // 5. Safe Area Guides Overlay (Screenshots 11 & 48)
  if (showSafeGuides) {
    drawSafeAreaGuides(ctx, width, height, scene.bg);
  }

  ctx.restore();
}

function drawTemplateDecor(ctx, width, height, scene, t, audio) {
  const style = scene.decorStyle;
  const pal = scene.palette || ['#101935', '#f5f1e6', '#5983ff', '#e57c66', '#6bb39b', '#c299d0'];
  const bass = audio?.bass || 0;

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

function renderGraphicLayer(ctx, layer, state, t, audio, palette, canvasWidth = 1080, canvasHeight = 1350) {
  // Background-handled decor assets should not draw duplicate geometry unless selected
  if (
    ['hangulGrid', 'patternBlocks', 'soundcheckBlocks', 'paperSheets', 'splitBars', 'fieldCutout', 'diagonalStripes', 'pressStack'].includes(
      layer.assetId
    )
  ) {
    return;
  }

  ctx.save();
  ctx.globalAlpha = state.opacity;
  ctx.translate(state.x, state.y);
  ctx.rotate((state.rotation * Math.PI) / 180);
  ctx.scale(state.scale, state.scale);

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

function renderTextLayer(ctx, layer, state, t, audio, palette) {
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

  const lines = String(layer.text).split('\n');
  const lineHeightPx = fontSize * (layer.lineHeight || 1.0);
  const totalHeight = lines.length * lineHeightPx;
  const startY = -totalHeight / 2 + lineHeightPx / 2;

  const preset = layer.motionPreset || 'none';
  const speed = layer.motionSpeed ?? 1;
  const stagger = layer.stagger ?? 0.04;

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

  lines.forEach((line, lineIdx) => {
    const lineY = startY + lineIdx * lineHeightPx;

    if (!layer.charAnimate || preset === 'none') {
      let offY = 0;
      let offX = 0;
      let alpha = state.opacity;
      if (preset === 'slideUp') {
        offY = Math.sin(t * 2.5 * speed + lineIdx * 0.4) * 8;
      } else if (preset === 'fadeScale') {
        alpha = state.opacity * (0.85 + 0.15 * Math.sin(t * 3 * speed + lineIdx));
      } else if (preset === 'glitchJitter') {
        offX = Math.sin(t * 22 * speed + lineIdx) > 0.85 ? (Math.random() - 0.5) * 14 : 0;
      }

      ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
      ctx.fillStyle = layer.color || '#ffffff';
      ctx.textAlign = layer.align || 'center';
      const alignX =
        layer.align === 'left'
          ? -(layer.width || 600) / 2
          : layer.align === 'right'
          ? (layer.width || 600) / 2
          : 0;
      ctx.fillText(line, alignX + offX, lineY + offY);
      return;
    }

    // Per-character kinetic animation
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

      let cx = 0;
      let cy = 0;
      let cScaleX = 1;
      let cScaleY = 1;
      let cRot = 0;
      let cAlpha = state.opacity;

      switch (preset) {
        case 'kineticWave':
          cy = Math.sin(phase) * (fontSize * 0.11);
          break;
        case 'stompPop':
          cScaleX = 1 + Math.max(0, Math.sin(phase)) * 0.14;
          cScaleY = cScaleX;
          break;
        case 'liquidDrift':
          cx = Math.cos(phase * 0.8) * 10;
          cy = Math.sin(phase) * 8;
          cRot = Math.sin(phase * 0.6) * 0.06;
          break;
        case 'shutterSlice':
          cy = Math.round(Math.sin(phase) * 3) * 4;
          break;
        case 'elasticStretch':
          cScaleX = 1 + Math.sin(phase) * 0.18;
          cScaleY = 1 - Math.sin(phase) * 0.1;
          break;
        case 'spiralOrbit':
          cx = Math.cos(phase) * 8;
          cy = Math.sin(phase) * 8;
          break;
        case 'pendulumSwing':
          cRot = Math.sin(phase) * 0.14;
          break;
        case 'typewriterTick':
          cAlpha = Math.sin(phase) > -0.6 ? state.opacity : 0.15;
          break;
        default:
          break;
      }

      ctx.save();
      ctx.translate(charCenterX + cx, lineY + cy);
      ctx.rotate(cRot);
      ctx.scale(cScaleX, cScaleY);
      ctx.globalAlpha = Math.max(0, Math.min(1, cAlpha));
      ctx.textAlign = 'center';

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

export function getLayerBoundingBox(layer) {
  if (layer.type === 'graphic') {
    const s = (layer.size || 300) * (layer.scale || 1);
    return { width: s, height: s };
  }
  const lines = String(layer.text || '').split('\n');
  const fs = (layer.fontSize || 96) * (layer.scale || 1);
  const w = Math.max(layer.width || 420, fs * 2.5);
  const h = Math.max(fs * 1.15, lines.length * fs * (layer.lineHeight || 1.05));
  return { width: w, height: h };
}

function drawSelectionBox(ctx, layer, state) {
  const { width, height } = getLayerBoundingBox(layer);
  ctx.save();
  ctx.translate(state.x, state.y);
  ctx.rotate((state.rotation * Math.PI) / 180);

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
