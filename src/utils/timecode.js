// SMPTE Timecode Formatter, Physics-Based Spring Solver & Motion Curves
// Inspired by Framer Motion, FilmCraft Transition Geometry & Swiss Kinetic Typography

export function formatTimecode(seconds = 0, fps = 30) {
  const safeSec = Math.max(0, Number(seconds) || 0);
  const totalFrames = Math.round(safeSec * fps);
  const ff = totalFrames % fps;
  const totalWholeSeconds = Math.floor(totalFrames / fps);
  const ss = totalWholeSeconds % 60;
  const mm = Math.floor(totalWholeSeconds / 60);
  return `00:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}:${String(ff).padStart(2, '0')}`;
}

export function framesToTimecode(frame, fps = 30) {
  return formatTimecode(frame / fps, fps);
}

/**
 * Analytical Damped Harmonic Oscillator (Spring Physics Solver)
 * Solves m*x'' + c*x' + k*(x - 1) = 0 with x(0) = 0, x'(0) = initialVelocity
 * @param {number} t - Elapsed normalized time in seconds or progress (0..1+)
 * @param {object} params - { stiffness, damping, mass, initialVelocity }
 * @returns {number} Spring position from 0 towards 1
 */
export function solveSpring(t, {
  stiffness = 180,
  damping = 14,
  mass = 1,
  initialVelocity = 0,
} = {}) {
  if (t <= 0) return 0;
  const k = Math.max(1, stiffness);
  const c = Math.max(0.1, damping);
  const m = Math.max(0.01, mass);

  const w0 = Math.sqrt(k / m); // Undamped angular frequency
  const zeta = c / (2 * Math.sqrt(k * m)); // Damping ratio

  if (zeta < 1) {
    // Underdamped (oscillates and settles with natural bounce)
    const wd = w0 * Math.sqrt(1 - zeta * zeta); // Damped frequency
    const envelope = Math.exp(-zeta * w0 * t);
    const b = (initialVelocity - zeta * w0 * (-1)) / wd;
    // x(t) = 1 - e^(-zeta*w0*t) * (cos(wd*t) + ((zeta*w0 - v0)/wd)*sin(wd*t))
    return 1 - envelope * (Math.cos(wd * t) + ((zeta * w0 - initialVelocity) / wd) * Math.sin(wd * t));
  } else if (Math.abs(zeta - 1) < 1e-4) {
    // Critically damped (fastest settle without overshoot)
    const envelope = Math.exp(-w0 * t);
    return 1 - envelope * (1 + (w0 - initialVelocity) * t);
  } else {
    // Overdamped (sluggish, no overshoot)
    const r1 = -w0 * (zeta - Math.sqrt(zeta * zeta - 1));
    const r2 = -w0 * (zeta + Math.sqrt(zeta * zeta - 1));
    const c1 = (initialVelocity - r2 * (-1)) / (r1 - r2);
    const c2 = -1 - c1;
    return 1 + c1 * Math.exp(r1 * t) + c2 * Math.exp(r2 * t);
  }
}

/**
 * High-precision Cubic-Bezier Solver (Newton-Raphson with bisection fallback)
 * Matches transitions.dev Jakub Antalik curves & CSS cubic-bezier specification.
 */
export function solveCubicBezier(t, x1, y1, x2, y2) {
  if (t <= 0) return 0;
  if (t >= 1) return 1;

  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;

  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;

  function sampleCurveX(u) {
    return ((ax * u + bx) * u + cx) * u;
  }
  function sampleCurveY(u) {
    return ((ay * u + by) * u + cy) * u;
  }
  function sampleCurveDerivativeX(u) {
    return (3 * ax * u + 2 * bx) * u + cx;
  }

  // Newton-Raphson iteration
  let u = t;
  for (let i = 0; i < 8; i++) {
    const x = sampleCurveX(u) - t;
    if (Math.abs(x) < 1e-6) return sampleCurveY(u);
    const d2 = sampleCurveDerivativeX(u);
    if (Math.abs(d2) < 1e-6) break;
    u -= x / d2;
  }

  // Bisection fallback if Newton diverges
  let u0 = 0;
  let u1 = 1;
  u = t;
  while (u0 < u1) {
    const x = sampleCurveX(u);
    if (Math.abs(x - t) < 1e-6) return sampleCurveY(u);
    if (t > x) u0 = u;
    else u1 = u;
    u = (u1 - u0) * 0.5 + u0;
  }
  return sampleCurveY(u);
}

/**
 * Transitions.dev Signature Timing Function
 * --p-ease: cubic-bezier(0.22, 1, 0.36, 1)
 */
export function transitionsDevEase(t) {
  return solveCubicBezier(t, 0.22, 1.0, 0.36, 1.0);
}

/**
 * Comprehensive Cubic, Exponential, Back, Bounce & Spring Easing Evaluator
 */
export function evaluateEasing(type = 'easeOutCubic', rawT = 0, options = {}) {
  const t = Math.max(0, Math.min(1, rawT));
  switch (type) {
    case 'transitions':
    case 'transitionsDev':
    case 'bannerStack':
    case 'cardTilt':
      return solveCubicBezier(t, 0.22, 1.0, 0.36, 1.0);

    case 'linear':
      return t;

    case 'easeInQuad':
      return t * t;

    case 'easeOutQuad':
      return t * (2 - t);

    case 'easeInOutQuad':
      return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

    case 'easeOutCubic':
      return 1 - Math.pow(1 - t, 3);

    case 'easeInOutCubic':
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    case 'easeOutQuart':
      return 1 - Math.pow(1 - t, 4);

    case 'easeInOutQuart':
      return t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2;

    case 'easeOutExpo':
      return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);

    case 'easeInOutExpo':
      return t === 0
        ? 0
        : t === 1
        ? 1
        : t < 0.5
        ? Math.pow(2, 20 * t - 10) / 2
        : (2 - Math.pow(2, -20 * t + 10)) / 2;

    case 'easeOutBack': {
      const c1 = options.overshoot ?? 1.70158;
      const c3 = c1 + 1;
      return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    }

    case 'easeOutBackOvershoot': {
      const c1 = (options.overshoot ?? 1.4) * 2.5;
      const c3 = c1 + 1;
      return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    }

    case 'anticipate': {
      if (t < 0.25) {
        const p = t / 0.25;
        return -0.15 * Math.sin(p * Math.PI);
      }
      const p = (t - 0.25) / 0.75;
      return 1 - Math.pow(1 - p, 4);
    }

    case 'bounceOut': {
      const n1 = 7.5625;
      const d1 = 2.75;
      let p = t;
      if (p < 1 / d1) {
        return n1 * p * p;
      } else if (p < 2 / d1) {
        p -= 1.5 / d1;
        return n1 * p * p + 0.75;
      } else if (p < 2.5 / d1) {
        p -= 2.25 / d1;
        return n1 * p * p + 0.9375;
      } else {
        p -= 2.625 / d1;
        return n1 * p * p + 0.984375;
      }
    }

    case 'elasticOut': {
      if (t === 0) return 0;
      if (t === 1) return 1;
      const c4 = (2 * Math.PI) / 3;
      return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
    }

    case 'spring':
    default: {
      const stiffness = options.stiffness ?? 180;
      const damping = options.damping ?? 14;
      const mass = options.mass ?? 1;
      return solveSpring(t * 1.5, { stiffness, damping, mass });
    }
  }
}

/**
 * Continuous Elastic Harmonic Motion Waveform
 * Computes organic periodic motion with spring-damped elasticity
 * without phase-wrapping seams or derivative discontinuities.
 */
export function evaluatePeriodicSpring(phase, {
  stiffness = 180,
  damping = 14,
  overshoot = 1.0,
  waveform = 'spring',
} = {}) {
  // Normalize phase to 0..2*PI
  const tau = Math.PI * 2;
  const cycle = ((phase % tau) + tau) % tau;

  if (waveform === 'spring') {
    // Continuous harmonic spring formulation:
    // Fundamental sine + 2nd harmonic with damping phase shift + 3rd harmonic
    // Damping factor smoothly tempers the upper harmonic
    const dampNorm = Math.max(0.3, Math.min(2.0, damping / 14));
    const h1 = Math.sin(cycle);
    const h2 = (0.24 / dampNorm) * Math.sin(cycle * 2 - Math.PI * 0.25);
    const h3 = (0.08 / dampNorm) * Math.sin(cycle * 3);
    const combined = (h1 + h2 + h3) / (1 + 0.24 / dampNorm + 0.08 / dampNorm);
    return combined * overshoot;
  }

  if (waveform === 'elastic') {
    // Organic squash and stretch with elastic bounce
    const rawSin = Math.sin(cycle);
    const harmonic = Math.sin(cycle * 3) * 0.22 - Math.sin(cycle * 5) * 0.06;
    return (rawSin + harmonic) * overshoot;
  }

  if (waveform === 'anticipate') {
    // Continuous anticipation: wind-up before snap
    const sin1 = Math.sin(cycle);
    const windup = 0.32 * Math.sin(cycle * 2 - Math.PI * 0.5);
    return (sin1 + windup) * overshoot;
  }

  if (waveform === 'bounce') {
    // Smooth cyclic bounce with zero discontinuity
    const bounce = Math.abs(Math.sin(cycle));
    const smoothed = Math.pow(bounce, 0.85);
    return (smoothed * 1.6 - 0.8) * overshoot;
  }

  if (waveform === 'transitions' || waveform === 'transitionsDev') {
    // Jakub Antalik transitions.dev cubic-bezier(0.22, 1, 0.36, 1) cyclic oscillation
    const half = cycle / Math.PI; // 0..2
    if (half < 1) {
      return (solveCubicBezier(half, 0.22, 1.0, 0.36, 1.0) * 2 - 1) * overshoot;
    } else {
      return (1 - solveCubicBezier(half - 1, 0.22, 1.0, 0.36, 1.0) * 2) * overshoot;
    }
  }

  // Smooth harmonic sine default
  return Math.sin(cycle) * overshoot;
}
