// Kinetic Motion Presets, Physics Parameters & Curated Color Palettes
// Inspired by Behance Motion Showcase, FilmCraft & Swiss Typography Standards

export const MOTION_PRESETS = [
  {
    id: 'none',
    name: 'None (Static)',
    category: 'basic',
    desc: 'Follows manual keyframes and audio reactivity only.',
  },
  {
    id: 'kineticSpringHop',
    name: 'Physics Spring Hop',
    category: 'physics',
    desc: 'Buttery-smooth spring bounce with organic squash & stretch inertia.',
    defaultParams: { stiffness: 220, damping: 12, overshoot: 1.4, waveform: 'spring' },
  },
  {
    id: 'magneticSnap',
    name: 'Magnetic Snap',
    category: 'physics',
    desc: 'High-velocity entry with magnetic overshoot and snappy settle.',
    defaultParams: { stiffness: 280, damping: 16, overshoot: 1.2, waveform: 'spring' },
  },
  {
    id: 'staggerCascade',
    name: 'Cascade Domino',
    category: 'kinetic',
    desc: 'Fluid vertical waterfall cascade across glyphs with physics settle.',
    defaultParams: { stiffness: 190, damping: 14, overshoot: 1.1, waveform: 'spring' },
  },
  {
    id: 'editorialRise',
    name: 'Editorial Swiss Rise',
    category: 'editorial',
    desc: 'Elegant high-inertia vertical rise with smooth exponential easing.',
    defaultParams: { stiffness: 140, damping: 18, overshoot: 0.8, waveform: 'elastic' },
  },
  {
    id: 'splitReveal',
    name: 'Split Tilt Reveal',
    category: 'kinetic',
    desc: 'Dynamic angular tilt and upward pop with rotational settle.',
    defaultParams: { stiffness: 210, damping: 13, overshoot: 1.3, waveform: 'anticipate' },
  },
  {
    id: 'kineticVortex',
    name: 'Vortex Depth Spin',
    category: 'kinetic',
    desc: '3D depth perspective roll and spiral twist converging into place.',
    defaultParams: { stiffness: 180, damping: 14, overshoot: 1.2, waveform: 'anticipate' },
  },
  {
    id: 'liquidWave',
    name: 'Liquid Kinetic Wave',
    category: 'organic',
    desc: 'Continuous fluid harmonic wave across individual characters with velocity coupling.',
    defaultParams: { stiffness: 160, damping: 12, overshoot: 1.0, waveform: 'elastic' },
  },
  {
    id: 'variableStretch',
    name: 'Variable Axis Stretch',
    category: 'organic',
    desc: 'Horizontal and vertical elastic breathing with organic harmonic balance.',
    defaultParams: { stiffness: 170, damping: 15, overshoot: 1.15, waveform: 'elastic' },
  },
  {
    id: 'pendulumSwing',
    name: 'Pendulum Gravity Swing',
    category: 'physics',
    desc: 'Damped gravitational oscillation with realistic angular momentum.',
    defaultParams: { stiffness: 130, damping: 9, overshoot: 1.5, waveform: 'elastic' },
  },
  {
    id: 'audioShockwave',
    name: 'Bass Audio Shockwave',
    category: 'reactive',
    desc: 'Explosive scale pops and letter dispersion driven by master sub-bass transients.',
    defaultParams: { stiffness: 260, damping: 11, overshoot: 1.6, waveform: 'spring' },
  },
  {
    id: 'stompPop',
    name: 'Stomp Pop',
    category: 'kinetic',
    desc: 'Punchy rhythmic scale pop per glyph locked to audio tempo.',
    defaultParams: { stiffness: 240, damping: 15, overshoot: 1.3, waveform: 'bounce' },
  },
  {
    id: 'shutterSlice',
    name: 'Shutter Slice',
    category: 'kinetic',
    desc: 'Stepped vertical shutter reveal across letters.',
    defaultParams: { stiffness: 200, damping: 20, overshoot: 0.9, waveform: 'spring' },
  },
  {
    id: 'spiralOrbit',
    name: 'Orbital Drift',
    category: 'organic',
    desc: 'Circular orbital trajectory per character.',
    defaultParams: { stiffness: 150, damping: 14, overshoot: 1.0, waveform: 'elastic' },
  },
  {
    id: 'typewriterTick',
    name: 'Typewriter Strobe',
    category: 'editorial',
    desc: 'Stepped mechanical character strobe.',
    defaultParams: { stiffness: 300, damping: 30, overshoot: 0.5, waveform: 'anticipate' },
  },
  {
    id: 'fadeScale',
    name: 'Soft Pulse Fade',
    category: 'basic',
    desc: 'Gentle atmospheric opacity breathing.',
    defaultParams: { stiffness: 120, damping: 20, overshoot: 0.7, waveform: 'elastic' },
  },
  {
    id: 'glitchJitter',
    name: 'Signal Glitch',
    category: 'reactive',
    desc: 'High-frequency horizontal signal jitter with chromatic snap.',
    defaultParams: { stiffness: 350, damping: 25, overshoot: 1.5, waveform: 'bounce' },
  },
];

export const MOTION_EASING_OPTIONS = [
  { id: 'spring', label: 'Physics Spring (Bouncy & Damped)' },
  { id: 'easeOutExpo', label: 'Exponential Out (Fast Decel)' },
  { id: 'easeInOutCubic', label: 'Swiss S-Curve (Smooth)' },
  { id: 'anticipate', label: 'Anticipate (Pull Back & Launch)' },
  { id: 'bounceOut', label: 'Gravitational Bounce' },
  { id: 'elasticOut', label: 'Rubber Elastic' },
  { id: 'easeOutBackOvershoot', label: 'Heavy Overshoot Snap' },
  { id: 'linear', label: 'Linear (Constant)' },
];

export const MOTION_DIRECTIONS = [
  { id: 'vertical', label: 'Vertical (Y-Axis)' },
  { id: 'horizontal', label: 'Horizontal (X-Axis)' },
  { id: 'radial', label: 'Radial (Scale & Push)' },
  { id: 'diagonal', label: 'Diagonal (45°)' },
  { id: 'skew', label: 'Dynamic Skew' },
];

export const MOTION_TARGETS = [
  { id: 'char', label: 'Per Character' },
  { id: 'word', label: 'Per Word' },
  { id: 'line', label: 'Whole Line' },
];

export const COLOR_PALETTES = [
  {
    id: 'pal_clover_motion',
    name: 'Clover Motion Signature',
    colors: ['#0b1911', '#f5f5f5', '#159947', '#22c55e', '#86efac', '#14532d'],
  },
  {
    id: 'pal_shutter',
    name: 'Shutter Navy',
    colors: ['#101935', '#f5f1e6', '#5983ff', '#e57c66', '#6bb39b', '#c299d0'],
  },
  {
    id: 'pal_hangul',
    name: 'Hangul Graph Paper',
    colors: ['#f7f6f2', '#111111', '#0f9f78', '#ff5c39', '#16a34a', '#eab308'],
  },
  {
    id: 'pal_cobalt',
    name: 'Cobalt Playground',
    colors: ['#0044ff', '#ffffff', '#93c5fd', '#dbeafe', '#1e3a8a', '#60a5fa'],
  },
  {
    id: 'pal_mint_orchid',
    name: 'Mint & Orchid Studio',
    colors: ['#aae67f', '#15803d', '#10b981', '#18181b', '#c084fc', '#d1fae5'],
  },
  {
    id: 'pal_plum_acid',
    name: 'Plum & Acid Signal',
    colors: ['#1e1424', '#c084fc', '#aae67f', '#ffffff', '#9333ea', '#d1fae5'],
  },
  {
    id: 'pal_split',
    name: 'Night Shift Volt',
    colors: ['#111719', '#e2ff32', '#f7f7f2', '#4d7c0f', '#38bdf8', '#a3e635'],
  },
  {
    id: 'pal_paper',
    name: 'Terracotta Paper Stack',
    colors: ['#c55b43', '#faf3e6', '#294c44', '#1c1917', '#e7b5ac', '#f4a261'],
  },
  {
    id: 'pal_prism',
    name: 'Prism Radio Obsidian',
    colors: ['#050507', '#ffffff', '#2563eb', '#60a5fa', '#dbeafe', '#f59e0b'],
  },
];
