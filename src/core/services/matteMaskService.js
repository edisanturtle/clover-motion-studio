/**
 * @file matteMaskService.js
 * @description Alpha & Luminance Matte Masking Service (Fase 9)
 * Applies non-destructive track mattes and stencil masks using Canvas 2D
 * globalCompositeOperation and pixel-level luminance transformations.
 */

/**
 * Converts image RGB data into alpha channel using Rec. 709 luminance weights.
 * Y = 0.2126*R + 0.7152*G + 0.0722*B
 * @param {ImageData} imageData
 * @param {boolean} isInverted
 * @returns {ImageData}
 */
export function convertLuminanceToAlpha(imageData, isInverted = false) {
  if (!imageData || !imageData.data) return imageData;
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    data[i + 3] = isInverted ? Math.round(255 - lum) : Math.round(lum);
  }
  return imageData;
}

/**
 * Applies a mask source onto a target canvas context.
 *
 * @param {CanvasRenderingContext2D} targetCtx - Context of target layer to be masked
 * @param {HTMLCanvasElement | CanvasImageSource} maskCanvas - Mask graphic source
 * @param {'alpha' | 'inverted' | 'luminance' | 'invertedLuminance'} maskType
 * @param {number} width
 * @param {number} height
 */
export function applyMatteMaskToCanvas(targetCtx, maskCanvas, maskType = 'alpha', width, height) {
  if (!targetCtx || !maskCanvas) return;

  targetCtx.save();

  if (maskType === 'alpha') {
    // Standard Alpha Mask: keep only pixels where mask has alpha
    targetCtx.globalCompositeOperation = 'destination-in';
    targetCtx.drawImage(maskCanvas, 0, 0, width, height);
  } else if (maskType === 'inverted') {
    // Inverted Alpha Mask: punch hole where mask has alpha
    targetCtx.globalCompositeOperation = 'destination-out';
    targetCtx.drawImage(maskCanvas, 0, 0, width, height);
  } else if (maskType === 'luminance' || maskType === 'invertedLuminance') {
    // Luminance Matte: convert RGB luminance into alpha channel
    try {
      const maskCtx = maskCanvas.getContext ? maskCanvas.getContext('2d') : null;
      if (maskCtx) {
        const maskImageData = maskCtx.getImageData(0, 0, width, height);
        convertLuminanceToAlpha(maskImageData, maskType === 'invertedLuminance');
        maskCtx.putImageData(maskImageData, 0, 0);
        targetCtx.globalCompositeOperation = 'destination-in';
        targetCtx.drawImage(maskCanvas, 0, 0, width, height);
      } else {
        // Fallback to destination-in
        targetCtx.globalCompositeOperation = 'destination-in';
        targetCtx.drawImage(maskCanvas, 0, 0, width, height);
      }
    } catch {
      targetCtx.globalCompositeOperation = 'destination-in';
      targetCtx.drawImage(maskCanvas, 0, 0, width, height);
    }
  }

  targetCtx.restore();
}
