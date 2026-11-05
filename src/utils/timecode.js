// SMPTE Timecode Formatter & Cubic Easing Helpers

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

export function evaluateEasing(type = 'easeOutCubic', rawT = 0) {
  const t = Math.max(0, Math.min(1, rawT));
  switch (type) {
    case 'linear':
      return t;
    case 'easeInOutCubic':
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    case 'easeOutBack': {
      const c1 = 1.70158;
      const c3 = c1 + 1;
      return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    }
    case 'easeOutCubic':
    default:
      return 1 - Math.pow(1 - t, 3);
  }
}
