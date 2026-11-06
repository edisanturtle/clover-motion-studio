'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Download,
  Image as ImageIcon,
  Film,
  X,
  Check,
  CheckCircle2,
  Loader2,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import ModalDialog from '../common/ModalDialog';
import { ASPECT_RATIOS } from '../../constants/fonts';
import { SOCIAL_AND_EVENT_EXPORT_PRESETS } from '../../constants/effectCraftEffects';
import { renderSceneToCanvas } from '../../engine/canvasRenderer';

export default function ExportModal({
  open,
  onClose,
  project,
  activeScene,
  isRecording,
  exportProgress,
  onExportPNG,
  onExportVideo,
  onExportJSON,
  onOpenFormatReview,
  onChangeRatio,
}) {
  const [selectedFormat, setSelectedFormat] = useState('webm'); // 'png' | 'mp4' | 'webm' | 'zip'
  const [compositionRatio, setCompositionRatio] = useState(project?.ratio || '4:5');
  const [resolutionScale, setResolutionScale] = useState('original');
  const [includeAudio, setIncludeAudio] = useState(true);
  const [moreOptionsOpen, setMoreOptionsOpen] = useState(false);
  const [batchQueueOpen, setBatchQueueOpen] = useState(false);
  const previewCanvasRef = useRef(null);

  useEffect(() => {
    if (open && project?.ratio) {
      setCompositionRatio(project.ratio);
    }
  }, [open, project?.ratio]);

  const dim = ASPECT_RATIOS[compositionRatio] || ASPECT_RATIOS['4:5'];
  const totalDuration = (project?.scenes || []).reduce(
    (sum, s) => sum + (s.duration || 4),
    0
  );
  const fps = project?.fps || 30;
  const totalFrames = Math.round(totalDuration * fps);

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
    if (selectedFormat === 'png') {
      onExportPNG({ resolutionScale });
    } else if (selectedFormat === 'zip') {
      // Sequence export: download frames
      onExportPNG({ resolutionScale, format: 'zip' });
    } else {
      onExportVideo({
        format: selectedFormat,
        resolutionScale,
        includeAudio,
      });
    }
  };

  const formatButtonLabels = {
    png: 'Export PNG',
    mp4: 'Export MP4',
    webm: 'Export WebM',
    zip: 'Export ZIP',
  };

  return (
    <ModalDialog
      open={open}
      onClose={onClose}
      ariaLabel="Ready to share"
      maxWidth="max-w-4xl"
    >
      <div className="flex flex-col max-h-[88vh] bg-[#141414] text-neutral-100 select-none overflow-hidden">
        {/* Modal Header (Screenshots 12 & 13) */}
        <div className="px-6 pt-6 pb-4 flex items-start justify-between shrink-0">
          <div>
            <h2 className="text-2xl font-extrabold text-white tracking-tight">
              Ready to share.
            </h2>
            <p className="text-xs text-neutral-400 mt-1">
              Choose your file. Your editable project stays with you.
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
        <div className="flex-1 overflow-y-auto custom-scrollbar px-6 pb-6 grid grid-cols-1 md:grid-cols-12 gap-5 min-h-0">
          {/* Left Column: Poster Summary Card (5 cols) */}
          <div className="md:col-span-5 p-4 rounded-2xl bg-[#181818] border border-neutral-800 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-neutral-400">
                YOUR DESIGN / POSTER FRAME
              </div>

              <div className="h-[260px] rounded-xl bg-[#0d0d0d] border border-neutral-800/80 flex items-center justify-center p-3 overflow-hidden">
                <canvas
                  ref={previewCanvasRef}
                  width={dim.width}
                  height={dim.height}
                  className="max-h-full max-w-full object-contain shadow-xl rounded"
                />
              </div>

              <div className="text-sm font-bold text-white pt-1 truncate">
                {project?.name || 'Untitled Project'}
              </div>
            </div>

            <div className="space-y-2 pt-3 border-t border-neutral-800/80 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-neutral-400">Canvas</span>
                <span className="font-mono text-neutral-200">
                  {dim.width} × {dim.height}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-400">Duration</span>
                <span className="font-mono text-neutral-200">
                  {totalDuration.toFixed(2)} s
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-400">Frame rate</span>
                <span className="font-mono text-neutral-200">{fps} fps</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-400">Sound</span>
                <span className="font-mono text-neutral-200">
                  {includeAudio ? 'Included' : 'Muted'}
                </span>
              </div>
            </div>
          </div>

          {/* Right Column: Export Format & Settings (7 cols) */}
          <div className="md:col-span-7 space-y-4">
            {/* 2×2 Format Selector Grid (Screenshot 12) */}
            <div className="grid grid-cols-2 gap-3">
              {[
                {
                  id: 'png',
                  title: 'Still image',
                  subtitle: 'PNG · current frame',
                  icon: ImageIcon,
                },
                {
                  id: 'mp4',
                  title: 'MP4 video',
                  subtitle: 'H.264 · AAC audio',
                  icon: Film,
                },
                {
                  id: 'webm',
                  title: 'WebM video',
                  subtitle: 'Every frame · Opus audio',
                  icon: Film,
                  recommended: true,
                },
                {
                  id: 'zip',
                  title: 'PNG sequence',
                  subtitle: 'Lossless frames · ZIP',
                  icon: ImageIcon,
                },
              ].map((item) => {
                const Icon = item.icon;
                const active = selectedFormat === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedFormat(item.id)}
                    className={`p-3.5 rounded-2xl border text-left transition-all relative flex flex-col justify-between min-h-[112px] ${
                      active
                        ? 'bg-[#202020] border-white shadow-sm'
                        : 'bg-[#181818] border-neutral-800 hover:border-neutral-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <Icon className="w-4 h-4 text-neutral-300" />
                      {active && <Check className="w-4 h-4 text-white" />}
                    </div>

                    <div className="mt-3">
                      <div className="text-sm font-bold text-white">{item.title}</div>
                      <div className="text-xs text-neutral-400 mt-0.5">{item.subtitle}</div>
                    </div>

                    {item.recommended && (
                      <div className="mt-2">
                        <span className="inline-block px-2 py-0.5 rounded-md bg-[#2a2a2a] border border-neutral-700 text-[10px] font-medium text-neutral-200">
                          Recommended
                        </span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            <div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenFormatReview?.();
                }}
                className="text-xs font-medium text-neutral-200 hover:text-white underline underline-offset-4"
              >
                Review formats before export
              </button>
            </div>

            {/* Social Media & Event Venue Destination Presets */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-neutral-300">
                  Publish Destination · Social Media & Event Screens
                </label>
                <span className="text-[10px] font-mono text-[#4ade80]">1-Click Preset</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto custom-scrollbar pr-1">
                {SOCIAL_AND_EVENT_EXPORT_PRESETS.map((preset) => {
                  const active = compositionRatio === preset.ratio;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => {
                        setCompositionRatio(preset.ratio);
                        onChangeRatio?.(preset.ratio);
                      }}
                      className={`p-2 rounded-xl border text-left transition-all ${
                        active
                          ? 'bg-[#159947]/20 border-[#22c55e] text-white'
                          : 'bg-[#181818] border-neutral-800 text-neutral-300 hover:border-neutral-700'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[11px] font-bold text-white truncate">
                          {preset.name}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-neutral-900 text-[9px] font-mono text-[#4ade80] shrink-0">
                          {preset.group}
                        </span>
                      </div>
                      <div className="text-[10px] font-mono text-neutral-400 mt-0.5">
                        {preset.ratio} · {preset.width}×{preset.height} · {preset.fps}fps
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Composition version & Resolution Dropdowns */}
            <div className="space-y-3 pt-1">
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                  Composition version
                </label>
                <select
                  value={compositionRatio}
                  onChange={(e) => {
                    setCompositionRatio(e.target.value);
                    onChangeRatio?.(e.target.value);
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#1c1c1c] border border-neutral-700/80 text-xs text-white focus:outline-none focus:border-white"
                >
                  <option value="4:5">Feed · 4:5 (1080 × 1350)</option>
                  <option value="1:1">Square · 1:1 (1080 × 1080)</option>
                  <option value="9:16">Story / Event Totem · 9:16 (1080 × 1920)</option>
                  <option value="16:9">Stage LED Wall / YouTube · 16:9 (1920 × 1080)</option>
                  <option value="4:3">Exhibition Booth · 4:3 (1440 × 1080)</option>
                  <option value="3:4">Event Digital Poster · 3:4 (1080 × 1440)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                  Resolution
                </label>
                <select
                  value={resolutionScale}
                  onChange={(e) => setResolutionScale(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#1c1c1c] border border-neutral-700/80 text-xs text-white focus:outline-none focus:border-white"
                >
                  <option value="original">
                    {dim.width} × {dim.height} · Original
                  </option>
                  <option value="half">
                    {Math.round(dim.width / 2)} × {Math.round(dim.height / 2)} · Draft (0.5×)
                  </option>
                  <option value="double">
                    {dim.width * 2} × {dim.height * 2} · Ultra HD (2×)
                  </option>
                </select>
              </div>
            </div>

            {/* Include audio toggle + frames summary (Screenshot 13) */}
            <div className="pt-2 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-white">Include audio</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={includeAudio}
                  onClick={() => setIncludeAudio((v) => !v)}
                  className={`w-10 h-5 rounded-full transition-colors p-0.5 ${
                    includeAudio ? 'bg-[#159947]' : 'bg-neutral-700'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full transition-transform ${
                      includeAudio
                        ? 'translate-x-5 bg-white'
                        : 'translate-x-0 bg-neutral-300'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between text-xs text-neutral-400">
                <span>{totalDuration.toFixed(2)} seconds</span>
                <span className="font-mono">{totalFrames} frames</span>
              </div>
            </div>

            {/* More export options accordion */}
            <div className="rounded-xl border border-neutral-800 bg-[#181818] overflow-hidden">
              <button
                type="button"
                onClick={() => setMoreOptionsOpen((v) => !v)}
                className="w-full px-4 py-3 flex items-center justify-between text-xs font-semibold text-white hover:bg-neutral-800/50 transition-colors"
              >
                <span>More export options</span>
                {moreOptionsOpen ? (
                  <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-neutral-400" />
                )}
              </button>
              {moreOptionsOpen && (
                <div className="px-4 pb-3.5 pt-1 border-t border-neutral-800/80 space-y-2 text-xs">
                  <button
                    type="button"
                    onClick={onExportJSON}
                    className="w-full py-2 px-3 rounded-lg bg-[#222222] hover:bg-neutral-700 text-left flex items-center justify-between text-neutral-200"
                  >
                    <span>Download editable project JSON (.json)</span>
                    <Download className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            <div className="border-t border-neutral-800/80 pt-3 space-y-1">
              <div className="flex items-center gap-2 text-xs font-semibold text-white">
                {isRecording ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                    <span>Rendering video ({Math.round(exportProgress * 100)}%)...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-[#22c55e]" />
                    <span>Ready to render</span>
                  </>
                )}
              </div>
              <div className="text-xs font-mono text-neutral-400 pl-6">
                {dim.width} × {dim.height} · {totalDuration.toFixed(3)} s · {totalFrames} frames
              </div>
            </div>

            {/* Batch export and render queue accordion */}
            <div className="rounded-xl border border-neutral-800 bg-[#181818] overflow-hidden">
              <button
                type="button"
                onClick={() => setBatchQueueOpen((v) => !v)}
                className="w-full px-4 py-3 flex items-center justify-between text-xs font-semibold text-white hover:bg-neutral-800/50 transition-colors"
              >
                <span>Batch export and render queue</span>
                {batchQueueOpen ? (
                  <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-neutral-400" />
                )}
              </button>
              {batchQueueOpen && (
                <div className="px-4 pb-3.5 pt-1 border-t border-neutral-800/80 text-xs text-neutral-400 space-y-2.5">
                  <p>Queue Feed (4:5), Square (1:1), and Story (9:16) renders sequentially in one click.</p>
                  <button
                    type="button"
                    onClick={() => {
                      ['4:5', '1:1', '9:16'].forEach((r, idx) => {
                        setTimeout(() => {
                          onExportPNG({ ratioOverride: r, resolutionScale });
                        }, idx * 600);
                      });
                    }}
                    className="w-full py-2 px-3 rounded-lg bg-[#222222] hover:bg-neutral-800 border border-neutral-700 text-white font-semibold flex items-center justify-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Batch Export (4:5 + 1:1 + 9:16 PNGs)</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Sticky Footer Bar */}
        <div className="px-6 py-4 border-t border-neutral-800/80 bg-[#141414] flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[#1e1e1e] hover:bg-neutral-800 border border-neutral-700 text-xs font-semibold text-white transition-colors"
          >
            Close
          </button>

          <button
            type="button"
            disabled={isRecording}
            onClick={handlePrimaryExport}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#159947] hover:bg-[#19b353] border border-[#22c55e]/35 disabled:opacity-50 text-white text-xs font-bold transition-colors shadow-[0_2px_12px_rgba(21,153,71,0.3)]"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{formatButtonLabels[selectedFormat] || 'Export WebM'}</span>
          </button>
        </div>
      </div>
    </ModalDialog>
  );
}
