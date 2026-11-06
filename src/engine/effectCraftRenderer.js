/**
 * @file effectCraftRenderer.js
 * @description Real-time HTML5 2D Canvas implementation of EffectCraft's
 * Procedural Background Shaders (crates/engine/presets/backgrounds.json)
 * and Post-Processing FX Rack (crates/effects/ & crates/gpu/src/shaders/).
 */

/**
 * Render EffectCraft procedural background shader
 */
export function renderEffectCraftShaderBg({
  ctx,
  width,
  height,
  shaderId,
  localTime = 0,
  audioSignals = { bass: 0, mid: 0, treble: 0, rms: 0 },
  palette = [],
}) {
  if (!shaderId || shaderId === 'none') return;

  const bass = audioSignals?.bass || 0;
  const mid = audioSignals?.mid || 0;
  const treble = audioSignals?.treble || 0;
  const rms = audioSignals?.rms || 0;

  ctx.save();

  switch (shaderId) {
    case 'auroraVeil': {
      // Deep night base
      const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
      bgGrad.addColorStop(0, '#030d08');
      bgGrad.addColorStop(0.6, '#071c12');
      bgGrad.addColorStop(1, '#04090c');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Multi-ribbon glowing aurora curtains
      ctx.globalCompositeOperation = 'screen';
      const ribbonColors = [
        palette?.[2] || '#159947',
        palette?.[3] || '#22c55e',
        '#38bdf8',
        '#a855f7',
      ];
      for (let r = 0; r < 4; r++) {
        ctx.beginPath();
        const baseY = height * (0.28 + r * 0.14);
        ctx.moveTo(0, height);
        for (let x = 0; x <= width; x += 24) {
          const nx = x / width;
          const wave =
            Math.sin(nx * 4.5 + localTime * (0.9 + r * 0.2) + r) * (height * 0.08) +
            Math.cos(nx * 9.0 - localTime * 1.3 + r * 2) * (height * 0.04 * (1 + bass));
          ctx.lineTo(x, baseY + wave);
        }
        ctx.lineTo(width, height);
        ctx.closePath();

        const rGrad = ctx.createLinearGradient(0, baseY - height * 0.15, 0, height);
        rGrad.addColorStop(0, ribbonColors[r % ribbonColors.length] + '99');
        rGrad.addColorStop(0.5, ribbonColors[r % ribbonColors.length] + '22');
        rGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = rGrad;
        ctx.fill();
      }
      break;
    }

    case 'pastelPlasma': {
      // Colorama multi-sine interference plasma field
      ctx.fillStyle = '#090b14';
      ctx.fillRect(0, 0, width, height);
      ctx.globalCompositeOperation = 'screen';

      const blobs = [
        { color: palette?.[2] || '#159947', speedX: 0.7, speedY: 0.5, phase: 0 },
        { color: '#6366f1', speedX: -0.6, speedY: 0.8, phase: 1.8 },
        { color: '#ec4899', speedX: 0.5, speedY: -0.7, phase: 3.4 },
        { color: '#22c55e', speedX: -0.8, speedY: -0.5, phase: 4.9 },
      ];

      blobs.forEach((b, i) => {
        const bx =
          width * (0.5 + 0.34 * Math.sin(localTime * b.speedX + b.phase));
        const by =
          height * (0.5 + 0.34 * Math.cos(localTime * b.speedY + b.phase));
        const rad = Math.max(width, height) * (0.48 + (i % 2 === 0 ? bass * 0.15 : mid * 0.12));
        const g = ctx.createRadialGradient(bx, by, rad * 0.05, bx, by, rad);
        g.addColorStop(0, b.color + 'cc');
        g.addColorStop(0.55, b.color + '44');
        g.addColorStop(1, 'transparent');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, width, height);
      });
      break;
    }

    case 'magmaFlow': {
      ctx.fillStyle = '#120604';
      ctx.fillRect(0, 0, width, height);

      const bands = 14;
      for (let i = 0; i < bands; i++) {
        const yCenter = (i / bands) * height;
        ctx.beginPath();
        for (let x = 0; x <= width; x += 20) {
          const nx = x / width;
          const dy =
            Math.sin(nx * 6 + localTime * 1.4 + i * 0.6) * (28 + bass * 42) +
            Math.cos(nx * 12 - localTime * 0.9 + i) * 14;
          if (x === 0) ctx.moveTo(x, yCenter + dy);
          else ctx.lineTo(x, yCenter + dy);
        }
        ctx.strokeStyle =
          i % 3 === 0 ? '#fde04788' : i % 2 === 0 ? '#ff4d2daa' : '#9a341288';
        ctx.lineWidth = 6 + (i % 3) * 4;
        ctx.stroke();
      }
      break;
    }

    case 'voronoiCrystals': {
      ctx.fillStyle = '#060d18';
      ctx.fillRect(0, 0, width, height);

      const cols = 6;
      const rows = 7;
      const cellW = width / cols;
      const cellH = height / rows;
      const pts = [];

      for (let r = -1; r <= rows + 1; r++) {
        for (let c = -1; c <= cols + 1; c++) {
          const seed = (r * 13 + c * 29) & 0xff;
          const jx = Math.sin(localTime * 1.1 + seed) * cellW * 0.36;
          const jy = Math.cos(localTime * 0.9 + seed * 1.3) * cellH * 0.36;
          pts.push({
            x: (c + 0.5) * cellW + jx,
            y: (r + 0.5) * cellH + jy,
            seed,
          });
        }
      }

      // Faceted Delaunay/Voronoi crystal mesh
      ctx.lineWidth = 1.5;
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i];
        for (let j = i + 1; j < pts.length; j++) {
          const q = pts[j];
          const d = Math.hypot(p.x - q.x, p.y - q.y);
          if (d < Math.max(cellW, cellH) * 1.28) {
            const alpha = Math.max(0.06, 1 - d / (Math.max(cellW, cellH) * 1.28));
            ctx.strokeStyle = `rgba(56, 189, 248, ${(alpha * (0.35 + treble * 0.4)).toFixed(2)})`;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.stroke();
          }
        }
      }
      break;
    }

    case 'cyberGrid': {
      // Synthwave 3D perspective horizon grid
      const skyGrad = ctx.createLinearGradient(0, 0, 0, height * 0.55);
      skyGrad.addColorStop(0, '#040609');
      skyGrad.addColorStop(0.75, '#0b1f14');
      skyGrad.addColorStop(1, '#159947');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, width, height);

      // Glowing horizon sun
      const horizonY = height * 0.52;
      const sunR = Math.min(width, height) * (0.18 + bass * 0.04);
      const sunGrad = ctx.createLinearGradient(0, horizonY - sunR, 0, horizonY + sunR * 0.3);
      sunGrad.addColorStop(0, '#4ade80');
      sunGrad.addColorStop(0.6, '#159947');
      sunGrad.addColorStop(1, '#052e16');
      ctx.fillStyle = sunGrad;
      ctx.beginPath();
      ctx.arc(width / 2, horizonY - sunR * 0.15, sunR, 0, Math.PI * 2);
      ctx.fill();

      // Floor dark fill
      ctx.fillStyle = '#050807';
      ctx.fillRect(0, horizonY, width, height - horizonY);

      // Perspective radiating lines
      ctx.strokeStyle = '#22c55e88';
      ctx.lineWidth = 2;
      const numRays = 18;
      for (let i = -numRays; i <= numRays; i++) {
        ctx.beginPath();
        ctx.moveTo(width / 2 + i * (width * 0.015), horizonY);
        ctx.lineTo(width / 2 + i * (width * 0.14), height);
        ctx.stroke();
      }

      // Scrolling horizontal perspective bars
      const phase = (localTime * 1.4) % 1;
      for (let j = 0; j < 12; j++) {
        const t = (j + phase) / 12;
        const y = horizonY + Math.pow(t, 2.2) * (height - horizonY);
        ctx.strokeStyle = `rgba(34, 197, 94, ${(0.15 + t * 0.75).toFixed(2)})`;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
      break;
    }

    case 'particleWorld': {
      ctx.fillStyle = '#06080c';
      ctx.fillRect(0, 0, width, height);

      const count = 90;
      const cx = width / 2;
      const cy = height / 2;
      const maxR = Math.hypot(width, height) * 0.55;

      for (let i = 0; i < count; i++) {
        const depth = ((i / count + localTime * 0.18) % 1);
        const angle = i * 2.39996 + localTime * (0.35 + (i % 5) * 0.05);
        const r = Math.pow(depth, 1.4) * maxR;
        const px = cx + Math.cos(angle) * r;
        const py = cy + Math.sin(angle) * r;
        const sz = (1.5 + depth * 7) * (1 + bass * 0.6);

        ctx.fillStyle =
          i % 3 === 0 ? '#22c55e' : i % 3 === 1 ? '#38bdf8' : '#f8fafc';
        ctx.globalAlpha = Math.sin(depth * Math.PI) * 0.85;
        ctx.beginPath();
        ctx.arc(px, py, sz, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }

    case 'audioSpectrumRing': {
      // Polar Audio Spectrum & Waveform (ec.generate.audiospectrum)
      ctx.fillStyle = '#050c08';
      ctx.fillRect(0, 0, width, height);

      const cx = width / 2;
      const cy = height / 2;
      const baseR = Math.min(width, height) * (0.24 + bass * 0.04);
      const bands = 64;

      for (let i = 0; i < bands; i++) {
        const angle = (i / bands) * Math.PI * 2 - Math.PI / 2;
        const wave =
          Math.abs(Math.sin(i * 0.35 + localTime * 4)) * (0.25 + bass * 0.75) +
          Math.abs(Math.cos(i * 0.7 - localTime * 6)) * (0.15 + mid * 0.55);
        const barLen = Math.min(width, height) * 0.16 * wave;

        const x1 = cx + Math.cos(angle) * baseR;
        const y1 = cy + Math.sin(angle) * baseR;
        const x2 = cx + Math.cos(angle) * (baseR + barLen);
        const y2 = cy + Math.sin(angle) * (baseR + barLen);

        ctx.strokeStyle = i % 2 === 0 ? '#22c55e' : '#86efac';
        ctx.lineWidth = Math.max(3, (Math.min(width, height) * 0.008));
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }

      // Inner pulsing core ring
      ctx.strokeStyle = '#159947';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, cy, baseR * (0.92 - rms * 0.06), 0, Math.PI * 2);
      ctx.stroke();
      break;
    }

    default:
      break;
  }

  ctx.restore();
}

/**
 * Apply EffectCraft Post-Processing FX Rack filters over the composited canvas
 */
export function applyEffectCraftRack({
  ctx,
  width,
  height,
  fxRack = {},
  localTime = 0,
  audioSignals = { bass: 0, mid: 0, treble: 0, rms: 0 },
}) {
  if (!fxRack || typeof fxRack !== 'object') return;

  const canvas = ctx.canvas;
  const bass = audioSignals?.bass || 0;
  const mid = audioSignals?.mid || 0;
  const treble = audioSignals?.treble || 0;
  const rms = audioSignals?.rms || 0;

  // 1. Temporal Echo Trails (ec.time.echo)
  if (fxRack.echoTrails?.enabled) {
    const intensity = (fxRack.echoTrails.intensity ?? 50) / 100;
    const mod = fxRack.echoTrails.audioReactive ? 1 + rms * 0.8 : 1;
    const copies = 3;
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    for (let c = 1; c <= copies; c++) {
      ctx.globalAlpha = Math.min(0.45, (intensity * 0.25) / c);
      const offset = c * 8 * intensity * mod;
      ctx.drawImage(
        canvas,
        Math.cos(localTime * 3 + c) * offset,
        Math.sin(localTime * 3 + c) * offset,
        width,
        height
      );
    }
    ctx.restore();
  }

  // 2. Kaleida Symmetry (ec.stylize.cckaleida)
  if (fxRack.kaleidoscope?.enabled) {
    const intensity = (fxRack.kaleidoscope.intensity ?? 50) / 100;
    ctx.save();
    ctx.globalAlpha = Math.min(0.75, intensity * 0.7);
    ctx.globalCompositeOperation = 'lighten';
    ctx.translate(width / 2, height / 2);
    ctx.scale(-1, 1);
    ctx.drawImage(canvas, -width / 2, -height / 2, width, height);
    ctx.restore();
  }

  // 3. Bloom & Neon Glow (ec.stylize.glow)
  if (fxRack.glow?.enabled) {
    const intensity = (fxRack.glow.intensity ?? 55) / 100;
    const boost = fxRack.glow.audioReactive ? 1 + bass * 0.7 : 1;
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = Math.min(0.85, intensity * 0.55 * boost);
    ctx.filter = `blur(${Math.round(14 * intensity * boost)}px) brightness(1.25)`;
    ctx.drawImage(canvas, 0, 0, width, height);
    ctx.filter = 'none';
    ctx.restore();
  }

  // 4. Chromatic Aberration (ec.vr.chromatic)
  if (fxRack.chromatic?.enabled) {
    const intensity = (fxRack.chromatic.intensity ?? 45) / 100;
    const boost = fxRack.chromatic.audioReactive ? 1 + treble * 1.2 : 1;
    const shift = Math.max(2, Math.round(width * 0.012 * intensity * boost));

    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = Math.min(0.65, 0.38 * intensity * boost);
    ctx.drawImage(canvas, -shift, 0, width, height);
    ctx.drawImage(canvas, shift, 0, width, height);
    ctx.restore();
  }

  // 5. VHS & Digital Glitch (ec.vr.glitch)
  if (fxRack.vhsGlitch?.enabled) {
    const intensity = (fxRack.vhsGlitch.intensity ?? 50) / 100;
    const boost = fxRack.vhsGlitch.audioReactive ? 1 + bass * 1.4 : 1;
    const slices = Math.max(3, Math.round(8 * intensity));

    ctx.save();
    for (let s = 0; s < slices; s++) {
      const seed = Math.sin(localTime * 18 + s * 7.3);
      if (Math.abs(seed) > 0.35) {
        const sy = Math.floor(((s + Math.abs(seed)) / slices) * height);
        const sh = Math.floor((height / slices) * (0.25 + Math.abs(seed) * 0.45));
        const dx = seed * width * 0.045 * intensity * boost;
        ctx.drawImage(canvas, 0, sy, width, sh, dx, sy, width, sh);

        // Glitch color bar accent
        ctx.fillStyle = s % 2 === 0 ? 'rgba(34, 197, 94, 0.14)' : 'rgba(244, 63, 94, 0.14)';
        ctx.fillRect(0, sy, width, Math.max(2, sh * 0.25));
      }
    }
    ctx.restore();
  }

  // 6. Pixel Sort & Smear (ec.distort.ccsmear)
  if (fxRack.pixelSort?.enabled) {
    const intensity = (fxRack.pixelSort.intensity ?? 45) / 100;
    const boost = fxRack.pixelSort.audioReactive ? 1 + bass * 0.9 : 1;
    const streakCount = 16;
    ctx.save();
    ctx.globalAlpha = Math.min(0.7, intensity * 0.65);
    for (let i = 0; i < streakCount; i++) {
      const sx = Math.floor(((i + 0.5) / streakCount) * width);
      const sw = Math.max(4, Math.floor((width / streakCount) * 0.45));
      const sy = Math.floor(height * (0.2 + 0.5 * Math.abs(Math.sin(i * 2.1 + localTime))));
      const sh = Math.floor(height * 0.28 * intensity * boost);
      ctx.drawImage(canvas, sx, sy, sw, 3, sx, sy, sw, sh);
    }
    ctx.restore();
  }

  // 7. Halftone & Bayer Dither (ec.sim.ballaction)
  if (fxRack.halftoneDither?.enabled) {
    const intensity = (fxRack.halftoneDither.intensity ?? 40) / 100;
    const spacing = Math.max(10, Math.round(22 - intensity * 10));
    const dotR = Math.max(1.5, spacing * 0.26 * intensity);

    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.36)';
    for (let y = spacing / 2; y < height; y += spacing) {
      const rowShift = (Math.floor(y / spacing) % 2) * (spacing / 2);
      for (let x = spacing / 2 + rowShift; x < width; x += spacing) {
        ctx.beginPath();
        ctx.arc(x, y, dotR, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  // 8. ASCII Cyber Matrix Overlay (ec.text.numbers)
  if (fxRack.asciiMatrix?.enabled) {
    const intensity = (fxRack.asciiMatrix.intensity ?? 45) / 100;
    const boost = fxRack.asciiMatrix.audioReactive ? 1 + treble * 0.8 : 1;
    const chars = ['0', '1', '+', '*', '#', 'C', 'M', '◈', ':'];
    const step = 36;

    ctx.save();
    ctx.font = `700 14px 'JetBrains Mono', monospace`;
    ctx.fillStyle = `rgba(34, 197, 94, ${Math.min(0.75, intensity * 0.65 * boost).toFixed(2)})`;
    for (let x = 18; x < width; x += step) {
      const colSpeed = 1 + (x % 5) * 0.4;
      const headY = ((localTime * 180 * colSpeed + x * 17) % height);
      for (let k = 0; k < 5; k++) {
        const cy = (headY - k * step + height) % height;
        const ch = chars[(Math.floor(localTime * 10) + x + k) % chars.length];
        ctx.globalAlpha = (1 - k / 5) * intensity * 0.75;
        ctx.fillText(ch, x, cy);
      }
    }
    ctx.restore();
  }

  // 9. CRT Scanlines & Phosphor Grille (ec.stylize.ccblockload)
  if (fxRack.crtScanlines?.enabled) {
    const intensity = (fxRack.crtScanlines.intensity ?? 45) / 100;
    const pitch = 6;
    ctx.save();
    ctx.fillStyle = `rgba(0, 0, 0, ${(intensity * 0.48).toFixed(2)})`;
    for (let y = 0; y < height; y += pitch) {
      ctx.fillRect(0, y, width, 2);
    }
    ctx.restore();
  }

  // 10. 35mm Film Grain & Cinema Vignette (ec.noise.addgrain & ec.stylize.ccvignette)
  if (fxRack.vignetteGrain?.enabled) {
    const intensity = (fxRack.vignetteGrain.intensity ?? 40) / 100;
    ctx.save();

    // Radial lens vignette
    const vGrad = ctx.createRadialGradient(
      width / 2,
      height / 2,
      Math.min(width, height) * 0.28,
      width / 2,
      height / 2,
      Math.max(width, height) * 0.72
    );
    vGrad.addColorStop(0, 'rgba(0,0,0,0)');
    vGrad.addColorStop(1, `rgba(0,0,0,${Math.min(0.85, intensity * 0.85).toFixed(2)})`);
    ctx.fillStyle = vGrad;
    ctx.fillRect(0, 0, width, height);

    // Subtle procedural film grain specks
    const specks = Math.round(180 * intensity);
    for (let i = 0; i < specks; i++) {
      const gx = ((Math.sin(localTime * 43.7 + i * 12.9898) * 43758.5453) % 1 + 1) % 1 * width;
      const gy = ((Math.cos(localTime * 31.3 + i * 78.233) * 23421.631) % 1 + 1) % 1 * height;
      ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.16)';
      ctx.fillRect(gx, gy, 2, 2);
    }

    ctx.restore();
  }
}
