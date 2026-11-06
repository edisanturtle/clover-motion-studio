/**
 * @file videoDecoderPreflight.js
 * @description Video Codec & Decoder Preflight Inspection Service (Fase 7)
 * Probes browser decoder capabilities, enforces memory safety limits for large media,
 * and provides truthful preflight refusal reasons for unsupported codecs and containers.
 */

export const NORMAL_SIZE_CEILING_BYTES = 100 * 1024 * 1024; // 100MB
export const LARGE_MEDIA_THRESHOLD_BYTES = 500 * 1024 * 1024; // 500MB (Hard ceiling for direct decode)

export const KNOWN_DECODER_PROFILES = [
  {
    id: 'h264_baseline',
    name: 'H.264 / AVC Baseline (avc1.42E01E)',
    mime: 'video/mp4; codecs="avc1.42E01E, mp4a.40.2"',
    tier: 'universal',
    hardwareAccelerated: true,
    description: 'Universal compatibility across mobile, desktop, and embedded browsers.',
  },
  {
    id: 'h264_high',
    name: 'H.264 / AVC High Profile L4.1 (avc1.64001F)',
    mime: 'video/mp4; codecs="avc1.64001F, mp4a.40.2"',
    tier: 'universal',
    hardwareAccelerated: true,
    description: 'Standard 1080p HD broadcast profile with CABAC entropy encoding.',
  },
  {
    id: 'vp8',
    name: 'VP8 / WebM',
    mime: 'video/webm; codecs="vp8, vorbis"',
    tier: 'standard',
    hardwareAccelerated: true,
    description: 'Open WebM legacy video standard.',
  },
  {
    id: 'vp9',
    name: 'VP9 Profile 0 (WebM / MP4)',
    mime: 'video/webm; codecs="vp9, opus"',
    tier: 'standard',
    hardwareAccelerated: true,
    description: 'High-efficiency open web video codec.',
  },
  {
    id: 'av1',
    name: 'AV1 (av01.0.05M.08)',
    mime: 'video/mp4; codecs="av01.0.05M.08, mp4a.40.2"',
    tier: 'modern',
    hardwareAccelerated: true,
    description: 'Next-gen royalty-free video standard for web delivery.',
  },
  {
    id: 'hevc',
    name: 'H.265 / HEVC (hvc1 / hev1)',
    mime: 'video/mp4; codecs="hvc1.1.6.L93.B0, mp4a.40.2"',
    tier: 'conditional',
    hardwareAccelerated: true,
    description: 'Hardware dependent. Supported natively on macOS/Safari and modern hardware-accelerated Windows.',
  },
];

export const UNSUPPORTED_PROPRIETARY_CODECS = [
  {
    pattern: /\.(mov)$/i,
    name: 'Apple ProRes / Avid DNxHD (MOV)',
    code: 'ERR_UNSUPPORTED_INTERMEDIATE_CODEC',
    reason: 'ProRes and DNxHD are professional camera intermediate codecs requiring specialized native decoders not available in standard browser HTML5 engines.',
    recommendation: 'Transcode to H.264 (MP4) or VP9 (WebM) with 8-bit color before importing into browser studio.',
  },
  {
    pattern: /\.(avi)$/i,
    name: 'Legacy AVI Container',
    code: 'ERR_LEGACY_CONTAINER_AVI',
    reason: 'The Audio Video Interleave (AVI) container lacks streaming index headers required for HTML5 video element seeking.',
    recommendation: 'Remux or transcode into an MP4 (H.264) container using ffmpeg or Handbrake.',
  },
  {
    pattern: /\.(flv|wmv)$/i,
    name: 'Flash / Windows Media',
    code: 'ERR_DEPRECATED_CONTAINER',
    reason: 'Proprietary legacy container format deprecated across modern web standards.',
    recommendation: 'Convert to standard MP4 (H.264 / AAC).',
  },
];

/**
 * Checks if the runtime environment (browser) can decode a given MIME/codec string.
 * @param {string} mimeType
 * @returns {string} 'probably' | 'maybe' | ''
 */
export function checkBrowserDecoderSupport(mimeType) {
  if (typeof document === 'undefined') {
    // Node.js or SSR environment fallback
    if (mimeType.includes('avc1') || mimeType.includes('vp8') || mimeType.includes('vp9') || mimeType.includes('av01')) {
      return 'probably';
    }
    if (mimeType.includes('hvc1') || mimeType.includes('hev1')) {
      return 'maybe';
    }
    return '';
  }

  const testEl = document.createElement('video');
  try {
    return testEl.canPlayType(mimeType) || '';
  } catch {
    return '';
  }
}

/**
 * Preflight inspection of a candidate video file prior to import.
 * Enforces memory safety ceilings, codec capabilities, and rejection diagnostics.
 * @param {File | object} file
 * @returns {object} PreflightResult { ok, status, code, reason, recommendation, details }
 */
export function preflightVideoAsset(file) {
  if (!file) {
    return {
      ok: false,
      status: 'rejected',
      code: 'ERR_NO_FILE',
      reason: 'No video file provided for preflight verification.',
      recommendation: 'Select a valid local video file from your file system.',
      details: {},
    };
  }

  const fileName = file.name || 'untitled.mp4';
  const fileSize = Number(file.size) || 0;
  const fileMime = file.type || '';
  const ext = (fileName.split('.').pop() || '').toLowerCase();

  // 1. Inspect for explicitly unsupported proprietary formats
  for (const proprietary of UNSUPPORTED_PROPRIETARY_CODECS) {
    if (proprietary.pattern.test(fileName)) {
      return {
        ok: false,
        status: 'rejected',
        code: proprietary.code,
        reason: proprietary.reason,
        recommendation: proprietary.recommendation,
        details: { fileName, fileSize, ext, detectedContainer: ext },
      };
    }
  }

  // 2. Validate container extension
  const validExtensions = ['mp4', 'm4v', 'webm', 'ogg', 'ogv'];
  if (!validExtensions.includes(ext) && !fileMime.startsWith('video/')) {
    return {
      ok: false,
      status: 'rejected',
      code: 'ERR_UNSUPPORTED_CONTAINER',
      reason: `Container format ".${ext}" is not a recognized HTML5 video container.`,
      recommendation: 'Please provide an MP4 (H.264/AAC) or WebM (VP9/Opus) video file.',
      details: { fileName, fileSize, ext },
    };
  }

  // 3. Memory Safety & Large Media Budget Planning
  if (fileSize > LARGE_MEDIA_THRESHOLD_BYTES) {
    const sizeMb = (fileSize / (1024 * 1024)).toFixed(1);
    return {
      ok: false,
      status: 'rejected',
      code: 'ERR_OVERSIZED_MEDIA_CEILING',
      reason: `File size (${sizeMb} MB) exceeds the 500 MB browser RAM safety ceiling. Ingesting uncompressed video of this magnitude directly into browser memory risks crashing the browser tab.`,
      recommendation: 'Generate a 720p or 360p lightweight proxy file (< 100 MB) for real-time timeline editing.',
      details: { fileName, fileSize, sizeMb, ceilingMb: 500 },
    };
  }

  // 4. Test decoder support across standard profiles
  const matchingProfiles = KNOWN_DECODER_PROFILES.map((profile) => {
    const support = checkBrowserDecoderSupport(profile.mime);
    return {
      ...profile,
      supported: support === 'probably' || support === 'maybe',
      confidence: support,
    };
  });

  const supportedList = matchingProfiles.filter((p) => p.supported);
  if (supportedList.length === 0) {
    return {
      ok: false,
      status: 'rejected',
      code: 'ERR_NO_SUPPORTED_DECODER',
      reason: 'Your browser environment does not report native hardware or software decoding support for standard web video codecs.',
      recommendation: 'Ensure hardware acceleration is enabled in your browser settings, or convert media to H.264 Baseline.',
      details: { fileName, testedProfiles: matchingProfiles },
    };
  }

  // 5. Size tier warnings (100MB - 500MB)
  if (fileSize > NORMAL_SIZE_CEILING_BYTES) {
    const sizeMb = (fileSize / (1024 * 1024)).toFixed(1);
    return {
      ok: true,
      status: 'warning',
      code: 'WARN_LARGE_MEDIA_PROXY_RECOMMENDED',
      reason: `Media file is large (${sizeMb} MB). Real-time 60fps scrubbing may exhibit frame drops on baseline hardware without a proxy.`,
      recommendation: 'A 360p preview proxy will be generated in background cache for ultra-responsive scrubbing.',
      details: {
        fileName,
        fileSize,
        sizeMb,
        needsProxy: true,
        supportedDecoders: supportedList.map((p) => p.name),
      },
    };
  }

  // 6. Optimal & Approved
  return {
    ok: true,
    status: 'approved',
    code: 'APPROVED_OPTIMAL',
    reason: 'Video file passes all container, codec capability, and memory safety checks.',
    recommendation: 'Ready for non-destructive timeline editing.',
    details: {
      fileName,
      fileSize,
      sizeMb: (fileSize / (1024 * 1024)).toFixed(2),
      needsProxy: false,
      supportedDecoders: supportedList.map((p) => p.name),
    },
  };
}

/**
 * Maps standard HTML5 MediaError error codes to explicit developer diagnostics.
 * @param {MediaError | object} error
 * @param {string} sourceName
 * @returns {object} Diagnostic description
 */
export function diagnoseMediaError(error, sourceName = 'video') {
  const code = error?.code || 0;
  switch (code) {
    case 1: // MEDIA_ERR_ABORTED
      return {
        code: 'MEDIA_ERR_ABORTED',
        title: 'Playback Aborted',
        message: `Video loading for "${sourceName}" was aborted by the user or browser process.`,
        actionable: 'Retry import or check if the tab was suspended.',
      };
    case 2: // MEDIA_ERR_NETWORK
      return {
        code: 'MEDIA_ERR_NETWORK',
        title: 'Network / File Read Failure',
        message: `A read failure occurred while loading the video blob for "${sourceName}".`,
        actionable: 'Ensure the local file is still accessible on disk.',
      };
    case 3: // MEDIA_ERR_DECODE
      return {
        code: 'MEDIA_ERR_DECODE',
        title: 'Hardware / Software Decoder Error',
        message: `An error occurred while decoding the bitstream for "${sourceName}". The video may have corrupted GOP boundaries or an unsupported chroma subsampling profile (e.g. 4:2:2 / 4:4:4 10-bit).`,
        actionable: 'Transcode to 8-bit YUV420p H.264 profile.',
      };
    case 4: // MEDIA_ERR_SRC_NOT_SUPPORTED
      return {
        code: 'MEDIA_ERR_SRC_NOT_SUPPORTED',
        title: 'Format / Codec Not Supported',
        message: `The browser cannot decode the container or bitstream for "${sourceName}".`,
        actionable: 'Convert container to MP4 (H.264 / AAC) or WebM (VP9 / Opus).',
      };
    default:
      return {
        code: 'MEDIA_ERR_UNKNOWN',
        title: 'Unknown Media Error',
        message: error?.message || `An unexplained error occurred while playing "${sourceName}".`,
        actionable: 'Check browser console and media capabilities.',
      };
  }
}
