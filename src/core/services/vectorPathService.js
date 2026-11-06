/**
 * @file vectorPathService.js
 * @description Vector Path & Bézier Curve Geometry Service (Fase 9)
 * Handles cubic/quadratic Bézier evaluation, canvas path rendering,
 * gradient fill generators, strokes, and vector boolean composition.
 */

/**
 * Solves a point on a cubic Bézier curve at parameter t in [0, 1].
 * Formula: B(t) = (1-t)³·P0 + 3·(1-t)²·t·P1 + 3·(1-t)·t²·P2 + t³·P3
 * @param {object} p0 - {x, y}
 * @param {object} p1 - {x, y} (control point 1)
 * @param {object} p2 - {x, y} (control point 2)
 * @param {object} p3 - {x, y} (end point)
 * @param {number} t - [0..1]
 * @returns {{ x: number, y: number }}
 */
export function evaluateCubicBezierPoint(p0, p1, p2, p3, t) {
  const clampedT = Math.max(0, Math.min(1, t));
  const u = 1 - clampedT;
  const tt = clampedT * clampedT;
  const uu = u * u;
  const uuu = uu * u;
  const ttt = tt * clampedT;

  const x = uuu * p0.x + 3 * uu * clampedT * p1.x + 3 * u * tt * p2.x + ttt * p3.x;
  const y = uuu * p0.y + 3 * uu * clampedT * p1.y + 3 * u * tt * p2.y + ttt * p3.y;

  return {
    x: Number(x.toFixed(3)),
    y: Number(y.toFixed(3)),
  };
}

/**
 * Solves a point on a quadratic Bézier curve at parameter t in [0, 1].
 * Formula: B(t) = (1-t)²·P0 + 2·(1-t)·t·P1 + t²·P2
 * @param {object} p0 - {x, y}
 * @param {object} p1 - {x, y} (control point)
 * @param {object} p2 - {x, y} (end point)
 * @param {number} t - [0..1]
 * @returns {{ x: number, y: number }}
 */
export function evaluateQuadraticBezierPoint(p0, p1, p2, t) {
  const clampedT = Math.max(0, Math.min(1, t));
  const u = 1 - clampedT;
  const x = u * u * p0.x + 2 * u * clampedT * p1.x + clampedT * clampedT * p2.x;
  const y = u * u * p0.y + 2 * u * clampedT * p1.y + clampedT * clampedT * p2.y;

  return {
    x: Number(x.toFixed(3)),
    y: Number(y.toFixed(3)),
  };
}

/**
 * Constructs a CanvasGradient from a gradient definition object.
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} fillDef - Linear or Radial gradient object or solid string
 * @param {number} width
 * @param {number} height
 * @returns {CanvasGradient | string}
 */
export function createFillStyle(ctx, fillDef, width = 200, height = 200) {
  if (typeof fillDef === 'string') {
    return fillDef;
  }

  if (fillDef?.type === 'linear') {
    if (!ctx || typeof ctx.createLinearGradient !== 'function') {
      return fillDef.stops?.[0]?.color || '#159947';
    }
    const angleRad = (((fillDef.angle || 0) - 90) * Math.PI) / 180;
    const x1 = Math.cos(angleRad) * (-width / 2);
    const y1 = Math.sin(angleRad) * (-height / 2);
    const x2 = Math.cos(angleRad) * (width / 2);
    const y2 = Math.sin(angleRad) * (height / 2);

    const grad = ctx.createLinearGradient(x1, y1, x2, y2);
    (fillDef.stops || [{ offset: 0, color: '#fff' }, { offset: 1, color: '#000' }]).forEach((s) => {
      grad.addColorStop(s.offset, s.color);
    });
    return grad;
  }

  if (fillDef?.type === 'radial') {
    if (!ctx || typeof ctx.createRadialGradient !== 'function') {
      return fillDef.stops?.[0]?.color || '#159947';
    }
    const cx = (fillDef.cx ?? 0.5) * width - width / 2;
    const cy = (fillDef.cy ?? 0.5) * height - height / 2;
    const r = (fillDef.r ?? 0.5) * Math.max(width, height);

    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    (fillDef.stops || [{ offset: 0, color: '#fff' }, { offset: 1, color: '#000' }]).forEach((s) => {
      grad.addColorStop(s.offset, s.color);
    });
    return grad;
  }

  return '#159947';
}

/**
 * Renders a VectorPath layer onto a Canvas2D rendering context.
 * Supports cubic/quadratic Bézier curves, gradient fills, and styled strokes.
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} pathLayer
 */
export function renderVectorPathToCanvas(ctx, pathLayer) {
  if (!ctx || !pathLayer || !Array.isArray(pathLayer.commands)) return;

  ctx.save();

  // Apply layer transform
  ctx.translate(pathLayer.x || 0, pathLayer.y || 0);
  if (pathLayer.rotation) {
    ctx.rotate((pathLayer.rotation * Math.PI) / 180);
  }
  if (pathLayer.scale && pathLayer.scale !== 1) {
    ctx.scale(pathLayer.scale, pathLayer.scale);
  }
  ctx.globalAlpha = Math.max(0, Math.min(1, pathLayer.opacity ?? 1));
  ctx.globalCompositeOperation = pathLayer.blendMode || 'source-over';

  // Build Canvas 2D Path
  ctx.beginPath();
  const cmds = pathLayer.commands;
  for (let i = 0; i < cmds.length; i++) {
    const cmd = cmds[i];
    switch (cmd.type) {
      case 'M':
        ctx.moveTo(cmd.x, cmd.y);
        break;
      case 'L':
        ctx.lineTo(cmd.x, cmd.y);
        break;
      case 'C':
        ctx.bezierCurveTo(cmd.cp1x, cmd.cp1y, cmd.cp2x, cmd.cp2y, cmd.x, cmd.y);
        break;
      case 'Q':
        ctx.quadraticCurveTo(cmd.cpx, cmd.cpy, cmd.x, cmd.y);
        break;
      case 'Z':
        ctx.closePath();
        break;
      default:
        break;
    }
  }

  if (pathLayer.closed) {
    ctx.closePath();
  }

  // 1. Fill Path (Linear/Radial Gradient or Solid)
  if (pathLayer.fill && pathLayer.fill !== 'none') {
    ctx.fillStyle = createFillStyle(ctx, pathLayer.fill);
    ctx.fill(pathLayer.fillRule || 'nonzero');
  }

  // 2. Stroke Path (Cap, Join, Dash Array)
  if (pathLayer.stroke && (pathLayer.stroke.width || 0) > 0 && pathLayer.stroke.color !== 'none') {
    ctx.strokeStyle = pathLayer.stroke.color || '#22c55e';
    ctx.lineWidth = pathLayer.stroke.width || 1;
    ctx.lineCap = pathLayer.stroke.cap || 'round';
    ctx.lineJoin = pathLayer.stroke.join || 'round';
    if (Array.isArray(pathLayer.stroke.dash) && pathLayer.stroke.dash.length > 0) {
      ctx.setLineDash(pathLayer.stroke.dash);
    } else {
      ctx.setLineDash([]);
    }
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Computes bounding box [minX, minY, maxX, maxY] for a vector path.
 * @param {object} pathLayer
 * @returns {{ minX: number, minY: number, maxX: number, maxY: number, width: number, height: number }}
 */
export function getVectorPathBounds(pathLayer) {
  const cmds = pathLayer?.commands || [];
  if (cmds.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const cmd of cmds) {
    if (typeof cmd.x === 'number') {
      minX = Math.min(minX, cmd.x);
      maxX = Math.max(maxX, cmd.x);
    }
    if (typeof cmd.y === 'number') {
      minY = Math.min(minY, cmd.y);
      maxY = Math.max(maxY, cmd.y);
    }
  }

  if (minX === Infinity) {
    minX = 0; minY = 0; maxX = 0; maxY = 0;
  }

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

/**
 * Executes vector boolean composition simulation (union, subtract, intersect).
 * @param {object} pathA
 * @param {object} pathB
 * @param {'union' | 'subtract' | 'intersect'} operation
 * @returns {object} Resulting composite path definition
 */
export function booleanPathOperation(pathA, pathB, operation = 'union') {
  if (!pathA) return pathB;
  if (!pathB) return pathA;

  const combinedCommands = [
    ...(pathA.commands || []),
    ...(pathB.commands || []),
  ];

  let fillRule = 'nonzero';
  let blendMode = 'source-over';

  if (operation === 'subtract') {
    // In canvas vector mathematics, subtract uses evenodd fill rule or destination-out
    fillRule = 'evenodd';
    blendMode = 'destination-out';
  } else if (operation === 'intersect') {
    blendMode = 'source-in';
  } else if (operation === 'union') {
    fillRule = 'nonzero';
    blendMode = 'source-over';
  }

  return {
    ...pathA,
    id: `bool_${operation}_${Date.now()}`,
    name: `${pathA.name} [${operation}] ${pathB.name}`,
    commands: combinedCommands,
    fillRule,
    blendMode,
    booleanOp: operation,
  };
}
