/**
 * @file vectorPathModels.js
 * @description Vector Path, Bézier Nodes, and Gradient Domain Models (Fase 9)
 * Standardizes non-destructive vector paths with cubic/quadratic Bézier commands,
 * strokes, fills (linear/radial gradients), and boolean composition.
 */

/**
 * Creates a validated Vector Path Node with Bézier control points.
 * @param {object} init
 * @returns {object} PathNode
 */
export function createPathNode(init = {}) {
  const id = init.id || `node_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  return {
    id,
    x: Number(init.x) || 0,
    y: Number(init.y) || 0,
    type: init.type || 'smooth', // 'corner' | 'smooth' | 'bezier'
    cp1: init.cp1 ? { x: Number(init.cp1.x) || 0, y: Number(init.cp1.y) || 0 } : null,
    cp2: init.cp2 ? { x: Number(init.cp2.x) || 0, y: Number(init.cp2.y) || 0 } : null,
  };
}

/**
 * Creates a validated VectorPath Layer entity.
 * @param {object} init
 * @returns {object} VectorPathLayer
 */
export function createVectorPathLayer(init = {}) {
  const now = Date.now();
  const id = init.id && String(init.id).startsWith('layer_path_')
    ? init.id
    : `layer_path_${now}_${Math.random().toString(36).slice(2, 7)}`;

  // Default path commands: Swiss geometric diamond polygon
  const defaultCommands = [
    { type: 'M', x: 0, y: -100 },
    { type: 'C', cp1x: 55, cp1y: -100, cp2x: 100, cp2y: -55, x: 100, y: 0 },
    { type: 'C', cp1x: 100, cp1y: 55, cp2x: 55, cp2y: 100, x: 0, y: 100 },
    { type: 'C', cp1x: -55, cp1y: 100, cp2x: -100, cp2y: 55, x: -100, y: 0 },
    { type: 'C', cp1x: -100, cp1y: -55, cp2x: -55, cp2y: -100, x: 0, y: -100 },
    { type: 'Z' },
  ];

  const commands = Array.isArray(init.commands) && init.commands.length > 0
    ? [...init.commands]
    : defaultCommands;

  const nodes = Array.isArray(init.nodes)
    ? init.nodes.map(createPathNode)
    : [
        createPathNode({ x: 0, y: -100, type: 'smooth' }),
        createPathNode({ x: 100, y: 0, type: 'smooth' }),
        createPathNode({ x: 0, y: 100, type: 'smooth' }),
        createPathNode({ x: -100, y: 0, type: 'smooth' }),
      ];

  const stroke = {
    color: init.stroke?.color || '#22c55e',
    width: Math.max(0, Number(init.stroke?.width !== undefined ? init.stroke.width : 3)),
    cap: ['round', 'butt', 'square'].includes(init.stroke?.cap) ? init.stroke.cap : 'round',
    join: ['round', 'bevel', 'miter'].includes(init.stroke?.join) ? init.stroke.join : 'round',
    dash: Array.isArray(init.stroke?.dash) ? [...init.stroke.dash] : [],
  };

  const fill = init.fill || {
    type: 'linear',
    angle: 45,
    stops: [
      { offset: 0, color: '#159947' },
      { offset: 1, color: '#052e16' },
    ],
  };

  return {
    id,
    type: 'vectorPath',
    pathType: init.pathType || 'diamond',
    name: init.name || 'Vector Path Layer',
    x: Number(init.x) || 0,
    y: Number(init.y) || 0,
    width: Number(init.width) || 300,
    height: Number(init.height) || 300,
    commands,
    nodes,
    closed: init.closed !== false,
    fill,
    stroke,
    fillRule: ['nonzero', 'evenodd'].includes(init.fillRule) ? init.fillRule : 'nonzero',
    booleanOp: ['none', 'union', 'subtract', 'intersect'].includes(init.booleanOp) ? init.booleanOp : 'none',
    mask: {
      type: ['none', 'alpha', 'inverted', 'luminance'].includes(init.mask?.type) ? init.mask.type : 'none',
      maskLayerId: init.mask?.maskLayerId || null,
    },
    blendMode: init.blendMode || 'source-over',
    opacity: Math.max(0, Math.min(1, init.opacity !== undefined ? Number(init.opacity) : 1)),
    rotation: Number(init.rotation) || 0,
    scale: Number(init.scale) || 1,
    visible: init.visible !== false,
    locked: Boolean(init.locked),
    effects: Array.isArray(init.effects) ? [...init.effects] : [],
    keyframes: Array.isArray(init.keyframes) ? [...init.keyframes] : [],
    audioReactive: Boolean(init.audioReactive),
    createdAt: init.createdAt || now,
    updatedAt: now,
  };
}
