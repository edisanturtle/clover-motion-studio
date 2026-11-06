/**
 * @file models.js
 * @description Core Domain Entities and Invariants (Hexagonal Architecture)
 * Inspired by Golang domain models with strict type guarantees, immutability,
 * and zero external presentation dependencies.
 */

/**
 * Pure numeric coercion with fallback, preventing NaN poisoning.
 * @param {any} val
 * @param {number} fallback
 * @returns {number}
 */
export function toNum(val, fallback) {
  if (val === undefined || val === null || val === '') return fallback;
  const n = Number(val);
  return Number.isNaN(n) ? fallback : n;
}

/**
 * Creates a validated, fully initialized ShowcaseConfig value object.
 */
export function createShowcaseConfig(init = {}) {
  return {
    templateId: init.templateId || 'none',
    slots: Math.max(3, Math.min(16, toNum(init.slots, 8))),
    cardSize: Math.max(12, Math.min(85, toNum(init.cardSize, 26))),
    cardAspect: init.cardAspect || '1:1',
    cornerRadius: Math.max(0, Math.min(24, toNum(init.cornerRadius, 3))),
    tilt: Math.max(-60, Math.min(60, toNum(init.tilt, -18))),
    ringWidth: Math.max(20, Math.min(120, toNum(init.ringWidth, 68))),
    ringDepth: Math.max(15, Math.min(90, toNum(init.ringDepth, 48))),
    backFade: Math.max(0, Math.min(100, toNum(init.backFade, 55))),
    shadowEnabled: init.shadowEnabled !== false,
    audioReactive: init.audioReactive !== false,
    bgGradient: init.bgGradient || 'none',
    offsetX: Math.max(-50, Math.min(50, toNum(init.offsetX, 0))),
    offsetY: Math.max(-50, Math.min(50, toNum(init.offsetY, 0))),

    // Advanced customization & transitions.dev effects
    motionCurve: init.motionCurve || 'transitions', // 'transitions' | 'spring' | 'elastic' | 'anticipate' | 'bounce' | 'linear'
    motionSpeed: Math.max(0.25, Math.min(3.0, toNum(init.motionSpeed, 1.0))),
    glareIntensity: Math.max(0, Math.min(100, toNum(init.glareIntensity, 60))),
    glassmorphism: Boolean(init.glassmorphism),
    borderGlow: Boolean(init.borderGlow),
    borderGlowColor: init.borderGlowColor || '#22c55e',
    depthOfField: Boolean(init.depthOfField),
    floatingLevitation: init.floatingLevitation !== false,
    spreadGap: Math.max(0, Math.min(40, toNum(init.spreadGap, 6))),
    cardCurvature: Math.max(-100, Math.min(100, toNum(init.cardCurvature, 0))),
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
    posterLayout: init.posterLayout || 'swiss',
    shaderBg: init.shaderBg || 'none',
    shaderOpacity: Math.max(0, Math.min(1, toNum(init.shaderOpacity, 0.85))),
    fxRack: init.fxRack ? { ...init.fxRack } : {},
    layers: Array.isArray(init.layers) ? init.layers.map((l) => ({ ...l })) : [],
    showcase: init.showcase ? createShowcaseConfig(init.showcase) : null,

    // Per-scene audio & sound
    audioTrackId: init.audioTrackId ?? null, // null inherits project audio track
    audioVolume: Math.max(0, Math.min(1, toNum(init.audioVolume, 1.0))),
    sfxOnEnter: init.sfxOnEnter || 'none',
    customAudioName: init.customAudioName || null,

    // Per-scene motion & kinetics
    motionPreset: init.motionPreset || 'none',
    motionCurve: init.motionCurve || 'transitions',
    motionSpeed: Math.max(0.25, Math.min(3.0, toNum(init.motionSpeed, 1.0))),

    // Per-scene graphic & media assets
    mediaSlots: Array.isArray(init.mediaSlots) ? [...init.mediaSlots] : [],

    // Timeline Markers
    markers: Array.isArray(init.markers) ? init.markers.map((m) => createMarker(m)) : [],
  };
}

/**
 * Creates a validated Keyframe value object (Fase 4).
 * @param {object} init
 * @returns {object}
 */
export function createKeyframe(init = {}) {
  const interp = init.interpolation || init.easing || 'easeOutCubic';
  return {
    id: init.id || `kf_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    time: Math.max(0, toNum(init.time, 0)),
    prop: init.prop || 'posX', // 'posX' | 'posY' | 'scale' | 'rotation' | 'opacity'
    value: toNum(init.value, 0),
    interpolation: interp, // 'linear' | 'ease' | 'easeIn' | 'easeOut' | 'easeInOut' | 'bezier' | named easing
    easing: interp,
    bezier: Array.isArray(init.bezier) && init.bezier.length === 4
      ? [toNum(init.bezier[0], 0.25), toNum(init.bezier[1], 0.1), toNum(init.bezier[2], 0.25), toNum(init.bezier[3], 1.0)]
      : [0.25, 0.1, 0.25, 1.0], // default smooth cubic bezier
  };
}

/**
 * Creates a validated Timeline Marker entity (Fase 4).
 * @param {object} init
 * @returns {object}
 */
export function createMarker(init = {}) {
  return {
    id: init.id || `mk_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    time: Math.max(0, toNum(init.time, 0)),
    label: init.label || 'Marker',
    color: init.color || '#f59e0b',
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
    x: toNum(init.x, 50),
    y: toNum(init.y, 50),
    fontSize: toNum(init.fontSize, 64),
    fontFamily: init.fontFamily || "'Space Grotesk', sans-serif",
    fontWeight: init.fontWeight || '700',
    color: init.color || '#ffffff',
    align: init.align || 'center',
    letterSpacing: toNum(init.letterSpacing, 0),
    lineHeight: toNum(init.lineHeight, 1.1),
    opacity: Math.max(0, Math.min(1, toNum(init.opacity, 1))),
    rotation: toNum(init.rotation, 0),
    scale: toNum(init.scale, 1),
    visible: init.visible !== false,
    locked: Boolean(init.locked),
    groupId: init.groupId || null,
    motionPreset: init.motionPreset || 'none',
    motionSpeed: toNum(init.motionSpeed, 1),
    motionStiffness: toNum(init.motionStiffness, 200),
    motionDamping: toNum(init.motionDamping, 14),
    motionOvershoot: toNum(init.motionOvershoot, 1.1),
    motionWaveform: init.motionWaveform || 'spring',
    charAnimate: Boolean(init.charAnimate),
    keyframes: Array.isArray(init.keyframes) ? [...init.keyframes] : [],
    audioReactive: Boolean(init.audioReactive),
    audioSignal: init.audioSignal || 'bass',
    audioIntensity: toNum(init.audioIntensity ?? init.audioSensitivity, 40),
    audioSensitivity: toNum(init.audioSensitivity ?? init.audioIntensity, 40),
    audioTarget: init.audioTarget || 'scale',
    audioMinRange: typeof init.audioMinRange === 'number' && !Number.isNaN(init.audioMinRange) ? init.audioMinRange : null,
    audioMaxRange: typeof init.audioMaxRange === 'number' && !Number.isNaN(init.audioMaxRange) ? init.audioMaxRange : null,
    audioSmoothing: Math.max(0, Math.min(1, toNum(init.audioSmoothing, 0.2))),
    audioCurve: init.audioCurve || 'linear',
  };
}

/**
 * Creates a validated Primitive Shape Layer entity.
 */
export function createShapeLayer(init = {}) {
  const shapeType = init.shapeType || 'rectangle'; // 'rectangle' | 'circle' | 'pill' | 'triangle' | 'star' | 'line'
  const defaultNames = {
    rectangle: 'Rectangle Shape',
    circle: 'Circle Shape',
    pill: 'Pill Shape',
    triangle: 'Triangle Shape',
    star: 'Star Shape',
    line: 'Rule Line',
  };

  return {
    id: init.id || `layer_shape_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    type: 'shape',
    name: init.name || defaultNames[shapeType] || 'Shape Layer',
    shapeType,
    x: toNum(init.x, 50),
    y: toNum(init.y, 50),
    width: Math.max(2, toNum(init.width, shapeType === 'line' ? 320 : 200)),
    height: Math.max(2, toNum(init.height, shapeType === 'line' ? 4 : 200)),
    size: toNum(init.size, 200),
    color: init.color || init.fill || '#159947',
    fill: init.fill || init.color || '#159947',
    stroke: init.stroke || '#22c55e',
    strokeWidth: Math.max(0, toNum(init.strokeWidth, 0)),
    cornerRadius: Math.max(0, Math.min(100, toNum(init.cornerRadius, shapeType === 'pill' ? 50 : 0))),
    opacity: Math.max(0, Math.min(1, toNum(init.opacity, 1))),
    rotation: toNum(init.rotation, 0),
    scale: toNum(init.scale, 1),
    visible: init.visible !== false,
    locked: Boolean(init.locked),
    groupId: init.groupId || null,
    keyframes: Array.isArray(init.keyframes) ? [...init.keyframes] : [],
    audioReactive: Boolean(init.audioReactive),
    audioSignal: init.audioSignal || 'bass',
    audioIntensity: toNum(init.audioIntensity ?? init.audioSensitivity, 35),
    audioSensitivity: toNum(init.audioSensitivity ?? init.audioIntensity, 35),
    audioTarget: init.audioTarget || 'scale',
    audioMinRange: typeof init.audioMinRange === 'number' && !Number.isNaN(init.audioMinRange) ? init.audioMinRange : null,
    audioMaxRange: typeof init.audioMaxRange === 'number' && !Number.isNaN(init.audioMaxRange) ? init.audioMaxRange : null,
    audioSmoothing: Math.max(0, Math.min(1, toNum(init.audioSmoothing, 0.2))),
    audioCurve: init.audioCurve || 'linear',
  };
}

/**
 * Creates a validated Local Image / SVG Asset Layer entity.
 */
export function createImageLayer(init = {}) {
  return {
    id: init.id || `layer_img_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    type: 'image',
    name: init.name || 'Imported Image',
    assetId: init.assetId || null,
    src: init.src || init.dataUrl || null,
    x: toNum(init.x, 50),
    y: toNum(init.y, 50),
    width: Math.max(10, toNum(init.width, 300)),
    height: Math.max(10, toNum(init.height, 300)),
    cornerRadius: Math.max(0, Math.min(100, toNum(init.cornerRadius, 0))),
    stroke: init.stroke || '#ffffff',
    strokeWidth: Math.max(0, toNum(init.strokeWidth, 0)),
    opacity: Math.max(0, Math.min(1, toNum(init.opacity, 1))),
    rotation: toNum(init.rotation, 0),
    scale: toNum(init.scale, 1),
    visible: init.visible !== false,
    locked: Boolean(init.locked),
    groupId: init.groupId || null,
    keyframes: Array.isArray(init.keyframes) ? [...init.keyframes] : [],
    audioReactive: Boolean(init.audioReactive),
    audioSignal: init.audioSignal || 'treble',
    audioIntensity: toNum(init.audioIntensity ?? init.audioSensitivity, 20),
    audioSensitivity: toNum(init.audioSensitivity ?? init.audioIntensity, 20),
    audioTarget: init.audioTarget || 'scale',
    audioMinRange: typeof init.audioMinRange === 'number' && !Number.isNaN(init.audioMinRange) ? init.audioMinRange : null,
    audioMaxRange: typeof init.audioMaxRange === 'number' && !Number.isNaN(init.audioMaxRange) ? init.audioMaxRange : null,
    audioSmoothing: Math.max(0, Math.min(1, toNum(init.audioSmoothing, 0.2))),
    visible: init.visible !== false,
    locked: Boolean(init.locked),
    groupId: init.groupId || null,
    keyframes: Array.isArray(init.keyframes) ? [...init.keyframes] : [],
    audioReactive: Boolean(init.audioReactive),
    audioSignal: init.audioSignal || 'treble',
    audioIntensity: Number(init.audioIntensity ?? init.audioSensitivity) || 20,
    audioSensitivity: Number(init.audioSensitivity ?? init.audioIntensity) || 20,
    audioTarget: init.audioTarget || 'scale',
    audioMinRange: typeof init.audioMinRange === 'number' ? init.audioMinRange : null,
    audioMaxRange: typeof init.audioMaxRange === 'number' ? init.audioMaxRange : null,
    audioSmoothing: Math.max(0, Math.min(1, Number(init.audioSmoothing) || 0.2)),
    audioCurve: init.audioCurve || 'linear',
  };
}
