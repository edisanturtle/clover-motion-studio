/**
 * @file models.js
 * @description Core Domain Entities and Invariants (Hexagonal Architecture)
 * Inspired by Golang domain models with strict type guarantees, immutability,
 * and zero external presentation dependencies.
 */

/**
 * Creates a validated, fully initialized ShowcaseConfig value object.
 */
export function createShowcaseConfig(init = {}) {
  return {
    templateId: init.templateId || 'none',
    slots: Math.max(3, Math.min(16, Number(init.slots) || 8)),
    cardSize: Math.max(12, Math.min(85, Number(init.cardSize) || 26)),
    cardAspect: init.cardAspect || '1:1',
    cornerRadius: Math.max(0, Math.min(24, Number(init.cornerRadius) ?? 3)),
    tilt: Math.max(-60, Math.min(60, Number(init.tilt) ?? -18)),
    ringWidth: Math.max(20, Math.min(120, Number(init.ringWidth) || 68)),
    ringDepth: Math.max(15, Math.min(90, Number(init.ringDepth) || 48)),
    backFade: Math.max(0, Math.min(100, Number(init.backFade) ?? 55)),
    shadowEnabled: init.shadowEnabled !== false,
    audioReactive: init.audioReactive !== false,
    bgGradient: init.bgGradient || 'none',
    offsetX: Math.max(-50, Math.min(50, Number(init.offsetX) || 0)),
    offsetY: Math.max(-50, Math.min(50, Number(init.offsetY) || 0)),

    // Advanced customization & transitions.dev effects
    motionCurve: init.motionCurve || 'transitions', // 'transitions' | 'spring' | 'elastic' | 'anticipate' | 'bounce' | 'linear'
    motionSpeed: Math.max(0.25, Math.min(3.0, Number(init.motionSpeed) || 1.0)),
    glareIntensity: Math.max(0, Math.min(100, Number(init.glareIntensity) ?? 60)),
    glassmorphism: Boolean(init.glassmorphism),
    borderGlow: Boolean(init.borderGlow),
    borderGlowColor: init.borderGlowColor || '#22c55e',
    depthOfField: Boolean(init.depthOfField),
    floatingLevitation: init.floatingLevitation !== false,
    spreadGap: Math.max(0, Math.min(40, Number(init.spreadGap) || 6)),
    cardCurvature: Math.max(-100, Math.min(100, Number(init.cardCurvature) || 0)),
  };
}

/**
 * Creates a validated Scene entity.
 */
export function createScene(init = {}, fallbackName = 'Scene 1') {
  return {
    id: init.id || `scene_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name: init.name || fallbackName,
    duration: Math.max(1, Math.min(60, Number(init.duration) || 4)),
    bg: init.bg || '#101935',
    palette: Array.isArray(init.palette) && init.palette.length > 0
      ? [...init.palette]
      : ['#101935', '#f5f1e6', '#5983ff', '#e57c66', '#6bb39b', '#c299d0'],
    transition: init.transition || 'Cut',
    gridStyle: init.gridStyle || 'none',
    decorStyle: init.decorStyle || 'none',
    shaderBg: init.shaderBg || 'none',
    shaderOpacity: Math.max(0, Math.min(1, Number(init.shaderOpacity) ?? 0.85)),
    fxRack: init.fxRack ? { ...init.fxRack } : {},
    layers: Array.isArray(init.layers) ? init.layers.map((l) => ({ ...l })) : [],
    showcase: init.showcase ? createShowcaseConfig(init.showcase) : null,
  };
}

/**
 * Creates a new Text Layer entity with responsive coordinate bounds.
 */
export function createTextLayer(init = {}) {
  return {
    id: init.id || `layer_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    type: 'text',
    name: init.name || 'Text Layer',
    text: init.text || 'NEW HEADLINE',
    x: Number(init.x) || 50,
    y: Number(init.y) || 50,
    fontSize: Number(init.fontSize) || 64,
    fontFamily: init.fontFamily || "'Space Grotesk', sans-serif",
    fontWeight: init.fontWeight || '700',
    color: init.color || '#ffffff',
    align: init.align || 'center',
    letterSpacing: Number(init.letterSpacing) || 0,
    lineHeight: Number(init.lineHeight) || 1.1,
    opacity: Number(init.opacity) ?? 1,
    rotation: Number(init.rotation) || 0,
    scale: Number(init.scale) || 1,
    visible: init.visible !== false,
    locked: Boolean(init.locked),
    motionPreset: init.motionPreset || 'none',
    motionSpeed: Number(init.motionSpeed) || 1,
    motionStiffness: Number(init.motionStiffness) || 200,
    motionDamping: Number(init.motionDamping) || 14,
    motionOvershoot: Number(init.motionOvershoot) || 1.1,
    motionWaveform: init.motionWaveform || 'spring',
    charAnimate: Boolean(init.charAnimate),
    keyframes: Array.isArray(init.keyframes) ? [...init.keyframes] : [],
    audioReactive: Boolean(init.audioReactive),
    audioSignal: init.audioSignal || 'bass',
    audioIntensity: Number(init.audioIntensity) || 40,
    audioTarget: init.audioTarget || 'scale',
  };
}
