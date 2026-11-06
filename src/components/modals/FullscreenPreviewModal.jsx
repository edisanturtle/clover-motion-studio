'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause, SkipBack, Repeat, Maximize2, X, Eye, EyeOff, Zap } from 'lucide-react';
import ModalDialog from '../common/ModalDialog';
import { ASPECT_RATIOS } from '../../constants/fonts';
import { EVENT_SFX_PADS } from '../../constants/effectCraftEffects';
import { renderSceneToCanvas } from '../../engine/canvasRenderer';
import { formatTimecode } from '../../utils/timecode';

export default function FullscreenPreviewModal({
  open,
  onClose,
  project,
  activeScene,
  activeSceneIndex = 0,
  setActiveSceneIndex,
  localTime,
  currentGlobalTime = 0,
  totalProjectDuration = 60,
  playbackScope = 'all',
  setPlaybackScope,
  isPlaying,
  loopPlayback = true,
  setLoopPlayback,
  audioSignals,
  onTogglePlay,
  onRestart,
  onSeekLocalTime,
  onSeekGlobalTime,
  onTriggerSfx,
}) {
  const canvasRef = useRef(null);
  const scrubberRef = useRef(null);
  const [cleanStageMode, setCleanStageMode] = useState(false);

  const dim = ASPECT_RATIOS[project.ratio] || ASPECT_RATIOS['4:5'];
  const duration = activeScene?.duration || 12;
  const isFullVideo = playbackScope === 'all' && (project?.scenes?.length || 1) > 1;
  const effectiveDuration = isFullVideo ? (totalProjectDuration || 60) : duration;
  const effectiveCurrentTime = isFullVideo ? (currentGlobalTime ?? localTime) : localTime;
  const fps = project?.fps || 30;
  const playheadPct = Math.min(100, Math.max(0, (effectiveCurrentTime / effectiveDuration) * 100));

  useEffect(() => {
    if (!open || !activeScene) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    renderSceneToCanvas({
      ctx,
      width: dim.width,
      height: dim.height,
      scene: activeScene,
      localTime,
      audioSignals,
      selectedLayerId: null,
      showGrid: false,
      showSafeGuides: false,
      project,
    });
  }, [open, activeScene, project, dim.width, dim.height, localTime, audioSignals]);

  const handleScrub = (e) => {
    const el = scrubberRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    if (isFullVideo && onSeekGlobalTime) {
      onSeekGlobalTime(ratio * effectiveDuration);
    } else if (onSeekLocalTime) {
      onSeekLocalTime(ratio * effectiveDuration);
    }
  };

  const handleBrowserFullscreen = () => {
    if (typeof document !== 'undefined' && document.documentElement.requestFullscreen) {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      } else {
        document.exitFullscreen?.().catch(() => {});
      }
    }
  };

  return (
    <ModalDialog
      open={open}
      onClose={onClose}
      ariaLabel="Fullscreen & Live Event Stage Preview"
      maxWidth="max-w-[98vw]"
    >
      <div className="flex flex-col h-[94vh] bg-[#080808] select-none relative">
        {/* Top Bar (Hidden when Clean Stage Projector Mode is active) */}
        {!cleanStageMode ? (
          <div className="px-5 py-3 flex items-center justify-between relative z-20">
            <div className="flex items-center gap-3 text-xs">
              <span className="px-2 py-0.5 rounded bg-[#159947]/20 border border-[#22c55e]/50 text-[#4ade80] font-mono text-[10px] uppercase">
                Live Stage & Preview
              </span>
              <span className="font-bold text-white">{project.name}</span>
              <span className="font-mono text-neutral-500">
                {dim.width}×{dim.height}
              </span>
            </div>

            <div className="flex items-center gap-2 relative">
              <button
                type="button"
                onClick={() => setCleanStageMode(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#181818] hover:bg-neutral-800 border border-[#22c55e]/60 text-xs font-semibold text-[#4ade80] transition-colors"
                title="Hide all UI chrome for HDMI / LED Wall projection"
              >
                <EyeOff className="w-3.5 h-3.5" />
                <span>Clean Stage Output</span>
              </button>

              <button
                type="button"
                onClick={handleBrowserFullscreen}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#181818] hover:bg-neutral-800 border-2 border-white text-xs font-semibold text-white transition-colors"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span>Fullscreen</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#181818] hover:bg-neutral-800 border border-neutral-700 text-xs font-medium text-neutral-200 hover:text-white transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                <span>Back to editor</span>
                <span className="px-1.5 py-0.5 rounded bg-neutral-800 text-[10px] font-mono text-neutral-400">
                  Esc
                </span>
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setCleanStageMode(false)}
            className="absolute top-3 right-3 z-30 opacity-20 hover:opacity-100 px-2.5 py-1 rounded-lg bg-black/80 border border-neutral-700 text-[11px] text-white flex items-center gap-1.5 transition-opacity"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Show Stage Controls</span>
          </button>
        )}

        {/* Center Canvas Stage */}
        <div className="flex-1 flex items-center justify-center p-2 overflow-hidden">
          <canvas
            ref={canvasRef}
            width={dim.width}
            height={dim.height}
            className="max-h-full max-w-full object-contain shadow-[0_20px_70px_rgba(0,0,0,0.9)]"
          />
        </div>

        {/* Bottom Transport & Live Event SFX Trigger Bar */}
        {!cleanStageMode && (
          <div className="px-6 py-3 flex flex-wrap items-center justify-between gap-4 border-t border-neutral-900 bg-[#0c0c0c]">
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onRestart}
                className="p-2 rounded-lg bg-[#1a1a1a] hover:bg-neutral-800 border border-neutral-800 text-neutral-300 hover:text-white"
                title="Restart"
              >
                <SkipBack className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={onTogglePlay}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#159947] hover:bg-[#19b353] border border-[#22c55e]/40 text-xs font-semibold text-white transition-colors"
              >
                {isPlaying ? (
                  <>
                    <Pause className="w-3.5 h-3.5 fill-current" />
                    <span>Pause</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Play Stage</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setLoopPlayback?.((v) => !v)}
                className={`p-2 rounded-lg border transition-colors ${
                  loopPlayback
                    ? 'bg-neutral-800 border-neutral-600 text-white'
                    : 'bg-[#1a1a1a] border-neutral-800 text-neutral-400 hover:text-white'
                }`}
                title="Loop"
              >
                <Repeat className="w-3.5 h-3.5" />
              </button>

              {/* Scope Switcher */}
              <div className="flex items-center bg-[#181818] p-0.5 rounded-lg border border-neutral-800 text-[10px] font-semibold ml-1">
                <button
                  type="button"
                  onClick={() => setPlaybackScope?.('all')}
                  className={`px-2 py-1 rounded flex items-center gap-1 transition-all ${
                    playbackScope === 'all'
                      ? 'bg-[#159947] text-white shadow-sm'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                  title={`Play entire continuous video (${Math.round(effectiveDuration)}s)`}
                >
                  <span>Full Video</span>
                  <span className="text-[9px] font-mono opacity-80">
                    {Math.round(effectiveDuration)}s
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setPlaybackScope?.('scene')}
                  className={`px-2 py-1 rounded flex items-center gap-1 transition-all ${
                    playbackScope === 'scene'
                      ? 'bg-[#2a2a2a] text-white shadow-sm'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                  title="Loop active scene only"
                >
                  <span>Scene 0{activeSceneIndex + 1}</span>
                </button>
              </div>
            </div>

            {/* Scrubber */}
            <div className="flex items-center gap-3">
              <span className="text-[11px] font-mono text-neutral-300">
                {formatTimecode(effectiveCurrentTime, fps)}
              </span>

              <div
                ref={scrubberRef}
                onPointerDown={handleScrub}
                className="w-48 sm:w-80 h-6 relative flex items-center justify-between cursor-pointer px-1"
              >
                {Array.from({ length: 42 }).map((_, idx) => {
                  const pct = (idx / 41) * 100;
                  const isPassed = pct <= playheadPct;
                  const isMajor = idx % 6 === 0;
                  return (
                    <div
                      key={idx}
                      className={`w-px ${isMajor ? 'h-3' : 'h-1.5'} ${
                        isPassed ? 'bg-[#22c55e]' : 'bg-neutral-700'
                      }`}
                    />
                  );
                })}
                <div
                  style={{ left: `${playheadPct}%` }}
                  className="absolute top-0.5 bottom-0.5 w-1 bg-[#22c55e] rounded-full shadow-[0_0_8px_rgba(34,197,94,0.95)] pointer-events-none"
                />
              </div>

              <span className="text-[11px] font-mono text-neutral-400">
                {formatTimecode(effectiveDuration, fps)}
              </span>
            </div>

            {/* Live Stage Quick SFX Pads */}
            <div className="hidden xl:flex items-center gap-1.5">
              <span className="text-[10px] font-mono text-neutral-500 flex items-center gap-1 mr-1">
                <Zap className="w-3 h-3 text-[#4ade80]" />
                SFX:
              </span>
              {EVENT_SFX_PADS.slice(0, 4).map((sfx) => (
                <button
                  key={sfx.id}
                  type="button"
                  onClick={() => onTriggerSfx?.(sfx.id)}
                  className="px-2 py-1 rounded-lg bg-[#1a1a1a] hover:bg-[#159947]/30 border border-neutral-800 hover:border-[#22c55e] text-[10px] font-mono text-neutral-200 transition-colors"
                >
                  {sfx.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </ModalDialog>
  );
}
