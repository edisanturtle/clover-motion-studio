'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Download,
  Image as ImageIcon,
  Film,
  Music,
  FolderArchive,
  X,
  Check,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronRight,
  RotateCcw,
  Ban,
  Clock,
  Layers,
  Sparkles,
  Code2,
  Clapperboard,
} from 'lucide-react';
import ModalDialog from '../common/ModalDialog';
import { ASPECT_RATIOS } from '../../constants/fonts';
import { SOCIAL_AND_EVENT_EXPORT_PRESETS } from '../../constants/effectCraftEffects';
import { renderSceneToCanvas } from '../../engine/canvasRenderer';
import { runExportPreflight } from '../../core/services/exportPreflightService';
import { preflightInterchange } from '../../core/services/interchangeCapabilityService';
import { EXPORT_STATUS } from '../../core/services/exportQueueService';

export default function ExportModal({
  open,
  onClose,
  project,
  activeScene,
  playbackScope = 'all',
  totalProjectDuration,
  isRecording,
  exportProgress,
  onExportPNG,
  onExportVideo,
  onExportAudio,
  onExportJSON,
  onExportSvg,
  onExportLottie,
  onExportOtio,
  onOpenFormatReview,
  onChangeRatio,
  exportQueue = [],
  onCancelQueueItem,
  onRetryQueueItem,
  onBatchEnqueue,
}) {
  const [selectedFormat, setSelectedFormat] = useState('webm'); // 'png' | 'zip' | 'mp4' | 'webm' | 'audio' | 'bundle'
  const [compositionRatio, setCompositionRatio] = useState(project?.ratio || '4:5');
  const [resolutionScale, setResolutionScale] = useState('original');
  const [fps, setFps] = useState(project?.fps || 30);
  const [includeAudio, setIncludeAudio] = useState(true);
  const [audioSampleRate, setAudioSampleRate] = useState(48000);
  const [audioBitrate, setAudioBitrate] = useState(192);
  const [transparentBg, setTransparentBg] = useState(false);
  const [selectedCodec, setSelectedCodec] = useState('video/webm;codecs=vp9');
  const [rangeMode, setRangeMode] = useState('all'); // 'all' | 'scene' | 'custom'
  const [rangeIn, setRangeIn] = useState(0);
  const [rangeOut, setRangeOut] = useState(4);
  const [moreOptionsOpen, setMoreOptionsOpen] = useState(false);
  const [preflightOpen, setPreflightOpen] = useState(true);
  const [batchQueueOpen, setBatchQueueOpen] = useState(false);
  const [queueViewerOpen, setQueueViewerOpen] = useState(false);
  const [selectedLogItemId, setSelectedLogItemId] = useState(null);
  const previewCanvasRef = useRef(null);

  const totalDuration = (project?.scenes || []).reduce(
    (sum, s) => sum + (s.duration || 4),
    0
  );

  useEffect(() => {
    if (open && project) {
      if (project.ratio) setCompositionRatio(project.ratio);
      if (project.fps) setFps(project.fps);
      setRangeIn(0);
      setRangeOut(rangeMode === 'scene' ? (activeScene?.duration || 4) : totalDuration);
    }
  }, [open, project, activeScene, rangeMode, totalDuration]);

  const dim = ASPECT_RATIOS[compositionRatio] || ASPECT_RATIOS['4:5'];

  // Calculate effective export in/out range
  const effectiveIn = rangeMode === 'custom' ? Number(rangeIn) : 0;
  const effectiveOut = rangeMode === 'custom'
    ? Number(rangeOut)
    : rangeMode === 'scene'
    ? (activeScene?.duration || 4)
    : totalDuration;
  const effectiveDuration = Math.max(0, effectiveOut - effectiveIn);
  const totalFrames = Math.max(1, Math.floor(effectiveDuration * fps));

  // Preflight Verification (Fase 10 & 11)
  const preflightResult = useMemo(() => {
    if (!project) return { passed: true, errors: [], warnings: [], diagnostics: {} };
    const basePreflight = runExportPreflight({
      project,
      format: selectedFormat,
      ratio: compositionRatio,
      fps,
      rangeIn: effectiveIn,
      rangeOut: effectiveOut,
      codec: selectedCodec,
      includeAudio,
    });

    if (['svg', 'lottie', 'otio'].includes(selectedFormat)) {
      const interchangeCheck = preflightInterchange(project, selectedFormat);
      return {
        ...basePreflight,
        warnings: [...basePreflight.warnings, ...interchangeCheck.warnings],
      };
    }

    return basePreflight;
  }, [project, selectedFormat, compositionRatio, fps, effectiveIn, effectiveOut, selectedCodec, includeAudio]);

  // Preview canvas render
  useEffect(() => {
    const canvas = previewCanvasRef.current;
    if (!canvas || !activeScene || !open) return;
    const ctx = canvas.getContext('2d');
    renderSceneToCanvas({
      ctx,
      width: dim.width,
      height: dim.height,
      scene: activeScene,
      localTime: 1.5,
      audioSignals: { bass: 0.25, mid: 0.2, treble: 0.15, rms: 0.2 },
      selectedLayerId: null,
      showGrid: false,
      showSafeGuides: false,
      project,
    });
  }, [open, activeScene, project, dim.width, dim.height]);

  const handlePrimaryExport = () => {
    if (!preflightResult.passed) {
      alert(`Export blocked by preflight errors:\n\n${preflightResult.errors.join('\n')}`);
      return;
    }

    const exportOptions = {
      format: selectedFormat,
      ratio: compositionRatio,
      resolutionScale,
      fps,
      includeAudio,
      audioSampleRate,
      audioBitrate,
      transparentBg,
      codec: selectedCodec,
      rangeIn: effectiveIn,
      rangeOut: effectiveOut,
      exportScope: rangeMode,
    };

    if (selectedFormat === 'png') {
      onExportPNG?.(exportOptions);
    } else if (selectedFormat === 'zip') {
      onExportPNG?.({ ...exportOptions, format: 'zip' });
    } else if (selectedFormat === 'audio') {
      onExportAudio?.(exportOptions);
    } else if (selectedFormat === 'bundle') {
      onExportJSON?.(project);
    } else if (selectedFormat === 'svg') {
      onExportSvg?.(exportOptions);
    } else if (selectedFormat === 'lottie') {
      onExportLottie?.(exportOptions);
    } else if (selectedFormat === 'otio') {
      onExportOtio?.(exportOptions);
    } else {
      onExportVideo?.(exportOptions);
    }
  };

  const formatButtonLabels = {
    png: 'Export PNG Still',
    mp4: 'Export MP4 Video',
    webm: 'Export WebM Video',
    zip: 'Export PNG Sequence',
    audio: 'Export WAV Audio',
    bundle: 'Export Project Bundle',
    svg: 'Export W3C SVG 2.0',
    lottie: 'Export Lottie JSON',
    otio: 'Export OpenTimelineIO',
  };

  return (
    <ModalDialog
      open={open}
      onClose={onClose}
      ariaLabel="Ready to share"
      maxWidth="max-w-5xl"
    >
      <div className="flex flex-col max-h-[90vh] bg-[#141414] text-neutral-100 select-none overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 pt-5 pb-3 flex items-start justify-between shrink-0 border-b border-neutral-800/80">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-extrabold text-white tracking-tight">
                Export Studio & Multi-Format Dispatch
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#159947]/20 border border-[#22c55e]/30 text-[#4ade80]">
                Fase 10 Verified
              </span>
            </div>
            <p className="text-xs text-neutral-400 mt-0.5">
              Deterministic frame evaluator · Lossless color & alpha · Preflight diagnostics
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-neutral-800/80 hover:bg-neutral-700 flex items-center justify-center text-neutral-400 hover:text-white transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 2-Column Main Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-5 grid grid-cols-1 md:grid-cols-12 gap-5 min-h-0">
          {/* Left Column: Poster Summary Card & Preflight Live Feed (5 cols) */}
          <div className="md:col-span-5 flex flex-col space-y-4">
            <div className="p-4 rounded-2xl bg-[#181818] border border-neutral-800 space-y-3">
              <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-neutral-400 flex items-center justify-between">
                <span>PREVIEW / POSTER FRAME</span>
                <span className="text-[#4ade80] font-bold">{compositionRatio}</span>
              </div>

              <div className="h-[220px] rounded-xl bg-[#0d0d0d] border border-neutral-800/80 flex items-center justify-center p-2 overflow-hidden">
                <canvas
                  ref={previewCanvasRef}
                  width={dim.width}
                  height={dim.height}
                  className="max-h-full max-w-full object-contain shadow-xl rounded"
                />
              </div>

              <div className="text-sm font-bold text-white truncate">
                {project?.name || 'Untitled Project'}
              </div>

              <div className="space-y-1.5 pt-2 border-t border-neutral-800/80 text-[11px]">
                <div className="flex items-center justify-between">
                  <span className="text-neutral-400">Target Resolution</span>
                  <span className="font-mono text-neutral-200">
                    {resolutionScale === 'double' ? `${dim.width * 2} × ${dim.height * 2} (2×)` : resolutionScale === 'half' ? `${Math.round(dim.width / 2)} × ${Math.round(dim.height / 2)} (0.5×)` : `${dim.width} × ${dim.height} (1×)`}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-neutral-400">Duration & Frames</span>
                  <span className="font-mono text-neutral-200">
                    {effectiveDuration.toFixed(2)}s · {totalFrames} frames @ {fps}fps
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-neutral-400">Audio Master</span>
                  <span className="font-mono text-neutral-200">
                    {includeAudio ? `${audioSampleRate}Hz · ${audioBitrate}kbps` : 'Muted'}
                  </span>
                </div>
              </div>
            </div>

            {/* Preflight Diagnostics Box */}
            <div className="p-3.5 rounded-2xl bg-[#181818] border border-neutral-800 space-y-2">
              <div
                className="flex items-center justify-between cursor-pointer"
                onClick={() => setPreflightOpen((v) => !v)}
              >
                <div className="flex items-center gap-1.5">
                  {preflightResult.passed ? (
                    preflightResult.warnings.length === 0 ? (
                      <CheckCircle2 className="w-4 h-4 text-[#22c55e]" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                    )
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-500" />
                  )}
                  <span className="text-xs font-bold text-white">Preflight Inspection</span>
                </div>
                <div className="flex items-center gap-1">
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                      !preflightResult.passed
                        ? 'bg-red-500/20 text-red-400'
                        : preflightResult.warnings.length > 0
                        ? 'bg-amber-500/20 text-amber-300'
                        : 'bg-[#159947]/20 text-[#4ade80]'
                    }`}
                  >
                    {!preflightResult.passed
                      ? `${preflightResult.errors.length} Errors`
                      : preflightResult.warnings.length > 0
                      ? `${preflightResult.warnings.length} Warnings`
                      : 'All Checks Clear'}
                  </span>
                  {preflightOpen ? <ChevronDown className="w-3.5 h-3.5 text-neutral-400" /> : <ChevronRight className="w-3.5 h-3.5 text-neutral-400" />}
                </div>
              </div>

              {preflightOpen && (
                <div className="text-[11px] space-y-1.5 pt-1">
                  {preflightResult.errors.map((err, idx) => (
                    <div key={idx} className="p-2 rounded-lg bg-red-950/40 border border-red-800/60 text-red-300 flex items-start gap-1.5 leading-snug">
                      <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                      <span>{err}</span>
                    </div>
                  ))}
                  {preflightResult.warnings.map((warn, idx) => (
                    <div key={idx} className="p-2 rounded-lg bg-amber-950/30 border border-amber-800/50 text-amber-200 flex items-start gap-1.5 leading-snug">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                      <span>{warn}</span>
                    </div>
                  ))}
                  {preflightResult.passed && preflightResult.warnings.length === 0 && (
                    <p className="text-neutral-400 text-[10px]">
                      ✓ No missing assets, no font faults, no audio clipping, safe text bounds, valid timing range.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Formats, Range, Settings, Batch & Queue (7 cols) */}
          <div className="md:col-span-7 space-y-4">
            {/* 3×3 Format Grid */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'webm', title: 'WebM Video', subtitle: 'VP9 · Opus', icon: Film, rec: true },
                { id: 'mp4', title: 'MP4 Video', subtitle: 'H.264 · AAC', icon: Film },
                { id: 'png', title: 'Still PNG', subtitle: 'Current frame', icon: ImageIcon },
                { id: 'zip', title: 'PNG Sequence', subtitle: 'Every frame ZIP', icon: FolderArchive },
                { id: 'audio', title: 'Audio Only', subtitle: 'Lossless WAV', icon: Music },
                { id: 'bundle', title: 'Project Bundle', subtitle: '.clovermotion.json', icon: Layers },
                { id: 'svg', title: 'W3C SVG', subtitle: 'Vector · Open Standard', icon: Code2 },
                { id: 'lottie', title: 'Lottie JSON', subtitle: 'Vector Web/App Motion', icon: Sparkles },
                { id: 'otio', title: 'OpenTimelineIO', subtitle: 'NLE Editorial Cut (ASWF)', icon: Clapperboard },
              ].map((item) => {
                const Icon = item.icon;
                const active = selectedFormat === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedFormat(item.id)}
                    className={`p-3 rounded-xl border text-left transition-all relative flex flex-col justify-between min-h-[92px] ${
                      active
                        ? 'bg-[#202020] border-white shadow-sm'
                        : 'bg-[#181818] border-neutral-800 hover:border-neutral-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <Icon className="w-4 h-4 text-neutral-300" />
                      {active && <Check className="w-3.5 h-3.5 text-white" />}
                    </div>
                    <div className="mt-2">
                      <div className="text-xs font-bold text-white">{item.title}</div>
                      <div className="text-[10px] text-neutral-400 truncate">{item.subtitle}</div>
                    </div>
                    {item.rec && (
                      <span className="text-[9px] font-mono text-[#4ade80] font-semibold mt-1">Recommended</span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Range Selection Bar */}
            <div className="p-3.5 rounded-2xl bg-[#1c1c1c] border border-neutral-800 space-y-2.5">
              <div className="flex items-center justify-between text-xs font-semibold text-neutral-300">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#4ade80]" />
                  <span>Timeline Export Range</span>
                </span>
                <span className="font-mono text-[#4ade80] text-[10px]">
                  {effectiveDuration.toFixed(2)}s · {totalFrames} frames
                </span>
              </div>

              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: 'all', label: 'Full Project', desc: `${totalDuration.toFixed(1)}s (all scenes)` },
                  { id: 'scene', label: 'Active Scene', desc: `${activeScene?.duration || 4}s (${activeScene?.name || 'Scene 1'})` },
                  { id: 'custom', label: 'Custom Range', desc: 'Custom In / Out' },
                ].map((mode) => (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => setRangeMode(mode.id)}
                    className={`p-2 rounded-xl border text-left transition-all ${
                      rangeMode === mode.id
                        ? 'bg-[#159947]/20 border-[#22c55e] text-white shadow-sm'
                        : 'bg-[#141414] border-neutral-800 text-neutral-400 hover:text-white'
                    }`}
                  >
                    <div className="text-[11px] font-bold text-white">{mode.label}</div>
                    <div className="text-[9px] text-neutral-400 truncate mt-0.5">{mode.desc}</div>
                  </button>
                ))}
              </div>

              {rangeMode === 'custom' && (
                <div className="grid grid-cols-2 gap-3 pt-1 border-t border-neutral-800/80">
                  <div>
                    <label className="block text-[10px] text-neutral-400 font-mono mb-1">IN POINT (SEC)</label>
                    <input
                      type="number"
                      min={0}
                      max={effectiveOut - 0.1}
                      step={0.1}
                      value={Number.isFinite(rangeIn) ? rangeIn : 0}
                      onChange={(e) => setRangeIn(Math.max(0, Number(e.target.value) || 0))}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-[#141414] border border-neutral-700 text-xs text-white font-mono focus:outline-none focus:border-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-neutral-400 font-mono mb-1">OUT POINT (SEC)</label>
                    <input
                      type="number"
                      min={effectiveIn + 0.1}
                      max={totalDuration}
                      step={0.1}
                      value={Number.isFinite(rangeOut) ? rangeOut : (totalDuration || 12)}
                      onChange={(e) => setRangeOut(Math.max(effectiveIn + 0.1, Number(e.target.value) || (effectiveIn + 0.1)))}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-[#141414] border border-neutral-700 text-xs text-white font-mono focus:outline-none focus:border-white"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Resolution, FPS & Aspect Ratio Controls */}
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[11px] font-semibold text-neutral-300 mb-1">Aspect Ratio</label>
                <select
                  value={compositionRatio}
                  onChange={(e) => {
                    setCompositionRatio(e.target.value);
                    onChangeRatio?.(e.target.value);
                  }}
                  className="w-full px-2.5 py-2 rounded-xl bg-[#1c1c1c] border border-neutral-700/80 text-xs text-white focus:outline-none focus:border-white"
                >
                  <option value="4:5">Feed · 4:5 (1080×1350)</option>
                  <option value="1:1">Square · 1:1 (1080×1080)</option>
                  <option value="9:16">Story / Reel · 9:16 (1080×1920)</option>
                  <option value="16:9">Landscape · 16:9 (1920×1080)</option>
                  <option value="4:3">Booth · 4:3 (1440×1080)</option>
                  <option value="3:4">Poster · 3:4 (1080×1440)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-neutral-300 mb-1">Resolution</label>
                <select
                  value={resolutionScale}
                  onChange={(e) => setResolutionScale(e.target.value)}
                  className="w-full px-2.5 py-2 rounded-xl bg-[#1c1c1c] border border-neutral-700/80 text-xs text-white focus:outline-none focus:border-white"
                >
                  <option value="original">Native (1.0×)</option>
                  <option value="half">Draft (0.5×)</option>
                  <option value="double">Ultra HD (2.0×)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-neutral-300 mb-1">Frame Rate</label>
                <select
                  value={fps}
                  onChange={(e) => setFps(Number(e.target.value) || 30)}
                  className="w-full px-2.5 py-2 rounded-xl bg-[#1c1c1c] border border-neutral-700/80 text-xs text-white focus:outline-none focus:border-white font-mono"
                >
                  <option value={24}>24 fps (Cinema)</option>
                  <option value={30}>30 fps (Web / Social)</option>
                  <option value={60}>60 fps (Smooth Motion)</option>
                </select>
              </div>
            </div>

            {/* Audio, Alpha & Codec Options */}
            <div className="p-3.5 rounded-2xl bg-[#181818] border border-neutral-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-xs">
                  <div className="font-semibold text-white">Include Sound & DSP</div>
                  <div className="text-[10px] text-neutral-400">Synchronized master audio track & one-shots</div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={includeAudio}
                  onClick={() => setIncludeAudio((v) => !v)}
                  className={`w-9 h-5 rounded-full transition-colors p-0.5 ${
                    includeAudio ? 'bg-[#159947]' : 'bg-neutral-700'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full transition-transform ${
                      includeAudio ? 'translate-x-4 bg-white' : 'translate-x-0 bg-neutral-300'
                    }`}
                  />
                </button>
              </div>

              {(selectedFormat === 'png' || selectedFormat === 'zip') && (
                <div className="flex items-center justify-between pt-2 border-t border-neutral-800/80">
                  <div className="text-xs">
                    <div className="font-semibold text-white">Transparent Alpha Background</div>
                    <div className="text-[10px] text-neutral-400">Leave background clear for overlays & logos</div>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={transparentBg}
                    onClick={() => setTransparentBg((v) => !v)}
                    className={`w-9 h-5 rounded-full transition-colors p-0.5 ${
                      transparentBg ? 'bg-[#159947]' : 'bg-neutral-700'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full transition-transform ${
                        transparentBg ? 'translate-x-4 bg-white' : 'translate-x-0 bg-neutral-300'
                      }`}
                    />
                  </button>
                </div>
              )}

              {(selectedFormat === 'webm' || selectedFormat === 'mp4') && (
                <div className="pt-2 border-t border-neutral-800/80 space-y-1.5">
                  <label className="block text-[11px] font-semibold text-neutral-300">Video Codec</label>
                  <select
                    value={selectedCodec}
                    onChange={(e) => setSelectedCodec(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-[#141414] border border-neutral-700 text-xs text-white focus:outline-none focus:border-white font-mono"
                  >
                    <option value="video/webm;codecs=vp9">VP9 (High Quality · video/webm)</option>
                    <option value="video/webm;codecs=vp8">VP8 (Fast / Compatible · video/webm)</option>
                    <option value="video/mp4;codecs=avc1">H.264 / AVC1 (Universal · video/mp4)</option>
                  </select>
                </div>
              )}
            </div>

            {/* Batch Variants Accordion */}
            <div className="rounded-xl border border-neutral-800 bg-[#181818] overflow-hidden">
              <button
                type="button"
                onClick={() => setBatchQueueOpen((v) => !v)}
                className="w-full px-4 py-2.5 flex items-center justify-between text-xs font-semibold text-white hover:bg-neutral-800/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-[#4ade80]" />
                  <span>1-Click Batch Variant Queue (4:5 + 1:1 + 9:16)</span>
                </div>
                {batchQueueOpen ? <ChevronDown className="w-3.5 h-3.5 text-neutral-400" /> : <ChevronRight className="w-3.5 h-3.5 text-neutral-400" />}
              </button>
              {batchQueueOpen && (
                <div className="px-4 pb-3 pt-1 border-t border-neutral-800/80 text-xs text-neutral-400 space-y-2">
                  <p className="text-[11px]">
                    Enqueues Feed (4:5), Square (1:1), and Story (9:16) renders sequentially using format overrides.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      onBatchEnqueue?.(['4:5', '1:1', '9:16'], {
                        format: selectedFormat,
                        resolutionScale,
                        fps,
                        includeAudio,
                        transparentBg,
                        rangeIn: effectiveIn,
                        rangeOut: effectiveOut,
                      });
                      setQueueViewerOpen(true);
                    }}
                    className="w-full py-2 px-3 rounded-lg bg-[#222222] hover:bg-neutral-800 border border-neutral-700 text-white font-semibold flex items-center justify-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5 text-[#4ade80]" />
                    <span>Enqueue 3 Platform Variants</span>
                  </button>
                </div>
              )}
            </div>

            {/* Export Queue & Diagnostics Log Panel */}
            {exportQueue.length > 0 && (
              <div className="rounded-xl border border-neutral-800 bg-[#181818] overflow-hidden">
                <button
                  type="button"
                  onClick={() => setQueueViewerOpen((v) => !v)}
                  className="w-full px-4 py-2.5 flex items-center justify-between text-xs font-semibold text-white hover:bg-neutral-800/50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-blue-400" />
                    <span>Render Queue & Logs ({exportQueue.length} items)</span>
                  </div>
                  {queueViewerOpen ? <ChevronDown className="w-3.5 h-3.5 text-neutral-400" /> : <ChevronRight className="w-3.5 h-3.5 text-neutral-400" />}
                </button>
                {queueViewerOpen && (
                  <div className="px-4 pb-3 pt-2 border-t border-neutral-800/80 space-y-2 text-xs">
                    {exportQueue.map((item) => (
                      <div key={item.id} className="p-2.5 rounded-lg bg-[#141414] border border-neutral-800 space-y-1.5">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-bold text-white truncate max-w-[200px]">{item.name}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono uppercase ${
                            item.status === EXPORT_STATUS.COMPLETED
                              ? 'bg-[#159947]/20 text-[#4ade80]'
                              : item.status === EXPORT_STATUS.FAILED
                              ? 'bg-red-500/20 text-red-400'
                              : item.status === EXPORT_STATUS.CANCELLED
                              ? 'bg-neutral-800 text-neutral-400'
                              : 'bg-blue-500/20 text-blue-300'
                          }`}>
                            {item.status}
                          </span>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full h-1.5 rounded-full bg-neutral-800 overflow-hidden">
                          <div
                            className="h-full bg-[#22c55e] transition-all duration-150"
                            style={{ width: `${Math.round(item.progress * 100)}%` }}
                          />
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-neutral-400 font-mono">
                          <span>Frame {item.currentFrame}/{item.totalFrames || '-'}</span>
                          <div className="flex items-center gap-1.5">
                            {item.status === EXPORT_STATUS.PROCESSING && (
                              <button
                                type="button"
                                onClick={() => onCancelQueueItem?.(item.id)}
                                className="text-red-400 hover:text-red-300 flex items-center gap-0.5"
                              >
                                <Ban className="w-3 h-3" /> Cancel
                              </button>
                            )}
                            {(item.status === EXPORT_STATUS.FAILED || item.status === EXPORT_STATUS.CANCELLED) && (
                              <button
                                type="button"
                                onClick={() => onRetryQueueItem?.(item.id)}
                                className="text-amber-400 hover:text-amber-300 flex items-center gap-0.5"
                              >
                                <RotateCcw className="w-3 h-3" /> Retry
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => setSelectedLogItemId(selectedLogItemId === item.id ? null : item.id)}
                              className="text-neutral-400 hover:text-white underline"
                            >
                              Logs
                            </button>
                          </div>
                        </div>

                        {selectedLogItemId === item.id && (
                          <div className="mt-1.5 p-2 rounded bg-black/60 font-mono text-[9px] text-neutral-300 max-h-24 overflow-y-auto space-y-0.5 custom-scrollbar">
                            {(item.logs || []).map((l, lIdx) => (
                              <div key={lIdx} className="leading-tight">
                                <span className="text-neutral-500">{l.timestamp.split('T')[1].slice(0, 8)}</span> {l.message}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Bottom Sticky Footer */}
        <div className="px-6 py-3.5 border-t border-neutral-800/80 bg-[#141414] flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[#1e1e1e] hover:bg-neutral-800 border border-neutral-700 text-xs font-semibold text-white transition-colors"
          >
            Close
          </button>

          <div className="flex items-center gap-3">
            {isRecording && (
              <div className="flex items-center gap-2 text-xs font-semibold text-amber-400 font-mono">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Rendering {Math.round(exportProgress * 100)}%</span>
              </div>
            )}

            <button
              type="button"
              disabled={isRecording || !preflightResult.passed}
              onClick={handlePrimaryExport}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#159947] hover:bg-[#19b353] border border-[#22c55e]/35 disabled:opacity-50 text-white text-xs font-bold transition-colors shadow-[0_2px_12px_rgba(21,153,71,0.3)]"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{formatButtonLabels[selectedFormat] || 'Export Video'}</span>
            </button>
          </div>
        </div>
      </div>
    </ModalDialog>
  );
}
