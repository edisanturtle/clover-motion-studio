/**
 * @file interchangeCapabilityService.js
 * @description Format Interchange Capability Matrix & Lossy Preflight Service (Fase 11)
 * Maps supported interchange formats against their technical owners, acceptance specifications,
 * and attribute fidelity (supported, lossy, unsupported) with preflight diagnostics.
 */

export const INTERCHANGE_FORMATS = {
  SVG: {
    id: 'svg',
    name: 'Scalable Vector Graphics (SVG 2.0)',
    owner: 'W3C SVG Working Group',
    specUrl: 'https://www.w3.org/TR/SVG2/',
    fileExtension: '.svg',
    mimeType: 'image/svg+xml',
    capabilities: {
      vectorGeometry: 'supported',
      textTypography: 'supported',
      gradientFills: 'supported',
      blendModes: 'supported',
      shapePrimitives: 'supported',
      keyframeMotion: 'unsupported',
      videoClips: 'unsupported',
      audioTracks: 'unsupported',
      proceduralShaders: 'unsupported',
      dspMaster: 'unsupported',
    },
  },
  LOTTIE: {
    id: 'lottie',
    name: 'Lottie Animation JSON',
    owner: 'Lottie Animation Community / Linux Foundation',
    specUrl: 'https://lottie.github.io/lottie-spec/',
    fileExtension: '.json',
    mimeType: 'application/json',
    capabilities: {
      vectorGeometry: 'supported',
      textTypography: 'supported',
      gradientFills: 'supported',
      blendModes: 'lossy',
      shapePrimitives: 'supported',
      keyframeMotion: 'supported',
      videoClips: 'unsupported',
      audioTracks: 'unsupported',
      proceduralShaders: 'unsupported',
      dspMaster: 'unsupported',
    },
  },
  OTIO: {
    id: 'otio',
    name: 'OpenTimelineIO (OTIO)',
    owner: 'Academy Software Foundation (ASWF)',
    specUrl: 'https://opentimelineio.readthedocs.io/',
    fileExtension: '.otio',
    mimeType: 'application/json',
    capabilities: {
      vectorGeometry: 'unsupported',
      textTypography: 'lossy', // Markers / title tracks only
      gradientFills: 'unsupported',
      blendModes: 'unsupported',
      shapePrimitives: 'unsupported',
      keyframeMotion: 'unsupported',
      videoClips: 'supported',
      audioTracks: 'supported',
      proceduralShaders: 'unsupported',
      dspMaster: 'unsupported',
    },
  },
  CLOVER_BUNDLE: {
    id: 'clovermotion',
    name: 'Clover Motion Native Bundle',
    owner: 'Clover Motion Core Team',
    specUrl: 'docs/architecture-decision-record.md',
    fileExtension: '.clovermotion.json',
    mimeType: 'application/json',
    capabilities: {
      vectorGeometry: 'supported',
      textTypography: 'supported',
      gradientFills: 'supported',
      blendModes: 'supported',
      shapePrimitives: 'supported',
      keyframeMotion: 'supported',
      videoClips: 'supported',
      audioTracks: 'supported',
      proceduralShaders: 'supported',
      dspMaster: 'supported',
    },
  },
};

/**
 * Preflights a project for export to a target interchange format.
 * Emits warnings for any lossy or unsupported attributes.
 *
 * @param {object} project
 * @param {'svg' | 'lottie' | 'otio' | 'clovermotion'} formatId
 * @returns {{ supported: boolean, warnings: string[], droppedAttributes: string[], formatInfo: object }}
 */
export function preflightInterchange(project, formatId) {
  const formatKey = String(formatId || '').toUpperCase();
  const format = INTERCHANGE_FORMATS[formatKey] || INTERCHANGE_FORMATS[formatId];

  if (!format) {
    return {
      supported: false,
      warnings: [`Unsupported or unvetted interchange format: "${formatId}". Integration excluded from release.`],
      droppedAttributes: ['all'],
      formatInfo: null,
    };
  }

  const warnings = [];
  const droppedAttributes = [];
  const caps = format.capabilities;

  if (!project || !Array.isArray(project.scenes)) {
    return { supported: true, warnings: [], droppedAttributes: [], formatInfo: format };
  }

  // Check Audio & DSP presence
  const hasAudio = (project.audioTracks && project.audioTracks.length > 0) || project.audioTrackId;
  if (hasAudio && caps.audioTracks === 'unsupported') {
    warnings.push(`Target format "${format.name}" does not support audio tracks. Soundtrack and DSP will be omitted.`);
    droppedAttributes.push('audioTracks');
  }

  // Check Video tracks presence
  const hasVideo = project.videoTracks && project.videoTracks.length > 0 && project.videoTracks.some((t) => t.clips?.length > 0);
  if (hasVideo && caps.videoClips === 'unsupported') {
    warnings.push(`Target format "${format.name}" does not support video media tracks. Video clips will be omitted.`);
    droppedAttributes.push('videoClips');
  }

  // Check Procedural Shaders & FX Rack
  let hasShaders = false;
  let hasKeyframes = false;
  for (const scene of project.scenes) {
    if (scene.backgroundShader && scene.backgroundShader !== 'none') hasShaders = true;
    if (scene.fxRack && Object.keys(scene.fxRack).length > 0) hasShaders = true;
    if (scene.effects && scene.effects.length > 0) hasShaders = true;
    for (const layer of scene.layers || []) {
      if (Array.isArray(layer.keyframes) && layer.keyframes.length > 0) hasKeyframes = true;
      if (layer.effects && layer.effects.length > 0) hasShaders = true;
    }
  }

  if (hasShaders && caps.proceduralShaders === 'unsupported') {
    warnings.push(
      `Target format "${format.name}" does not support procedural canvas shaders or FX Rack. Shaders will be flattened or bypassed.`
    );
    droppedAttributes.push('proceduralShaders');
  }

  if (hasKeyframes && caps.keyframeMotion === 'unsupported') {
    warnings.push(
      `Target format "${format.name}" is a static format and does not preserve animation keyframes. Only the current frame will be exported.`
    );
    droppedAttributes.push('keyframeMotion');
  }

  return {
    supported: true,
    warnings,
    droppedAttributes,
    formatInfo: format,
  };
}
