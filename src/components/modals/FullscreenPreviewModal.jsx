'use client';

import React, { useEffect, useRef } from 'react';
import { Play, Pause, SkipBack, Repeat, Maximize2, X } from 'lucide-react';
import ModalDialog from '../common/ModalDialog';
import { ASPECT_RATIOS } from '../../constants/fonts';
import { renderSceneToCanvas } from '../../engine/canvasRenderer';
import { formatTimecode } from '../../utils/timecode';

export default function FullscreenPreviewModal({
  open,
  onClose,
  project,
  activeScene,
  localTime,
  isPlaying,
  loopPlayback = true,
  setLoopPlayback,
  audioSignals,
  onTogglePlay,
  onRestart,
  onSeekLocalTime,
}) {
  const canvasRef = useRef(null);
  const scrubberRef = useRef(null);
  const dim = ASPECT_RATIOS[project.ratio] || ASPECT_RATIOS['4:5'];
  const duration = activeScene?.duration || 12;
  const fps = project?.fps || 30;
  const playheadPct = Math.min(100, Math.max(0, (localTime / duration) * 100));

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
    });
  }, [open, activeScene, dim.width, dim.height, localTime, audioSignals]);

  const handleScrub = (e) => {
    const el = scrubberRef.current;
    if (!el || !onSeekLocalTime) return;
    const rect = el.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    onSeekLocalTime(ratio * duration);
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
      ariaLabel="Fullscreen Preview"
      maxWidth="max-w-[98vw]"
    >
      <div className="flex flex-col h-[94vh] bg-[#080808] select-none relative">
        {/* Top Bar (Screenshot 49) */}
        <div className="px-5 py-3 flex items-center justify-between relative z-20">
          <div className="flex items-center gap-3 text-xs">
            <span className="text-neutral-400">Preview</span>
            <span className="font-bold text-white">{project.name}</span>
          </div>

          <div className="flex items-center gap-2 relative">
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

            {/* Floating Canvas Zoom Hint Pill (Screenshot 49) */}
            <div className="hidden md:block absolute right-0 top-11 px-3 py-1.5 rounded-lg bg-[#1c1c1c] border border-neutral-700/80 text-[11px] text-neutral-300 whitespace-nowrap shadow-xl">
              Canvas: + / - to zoom, 0 to fit, arrow keys to scroll
            </div>
          </div>
        </div>

        {/* Center Canvas Stage */}
        <div className="flex-1 flex items-center justify-center p-4 overflow-hidden">
          <canvas
            ref={canvasRef}
            width={dim.width}
            height={dim.height}
            className="max-h-full max-w-full object-contain shadow-[0_20px_70px_rgba(0,0,0,0.9)]"
          />
        </div>

        {/* Bottom Transport Bar (Screenshot 49) */}
        <div className="px-6 py-3 flex items-center justify-center gap-3 border-t border-neutral-900 bg-[#0c0c0c]">
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
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#222222] hover:bg-neutral-700 border border-neutral-700 text-xs font-semibold text-white transition-colors"
          >
            {isPlaying ? (
              <>
                <Pause className="w-3.5 h-3.5 fill-current" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Play demo</span>
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

          <span className="text-[11px] font-mono text-neutral-400 ml-2">
            {formatTimecode(localTime, fps)}
          </span>

          <div
            ref={scrubberRef}
            onPointerDown={handleScrub}
            className="w-64 sm:w-96 h-6 relative flex items-center justify-between cursor-pointer px-1"
          >
            {Array.from({ length: 42 }).map((_, idx) => {
              const pct = (idx / 41) * 100;
              const isPassed = pct <= playheadPct;
              const isMajor = idx % 6 === 0;
              return (
                <div
                  key={idx}
                  className={`w-px ${isMajor ? 'h-3' : 'h-1.5'} ${
                    isPassed ? 'bg-neutral-300' : 'bg-neutral-700'
                  }`}
                />
              );
            })}
            <div
              style={{ left: `${playheadPct}%` }}
              className="absolute top-0.5 bottom-0.5 w-0.5 bg-white pointer-events-none"
            />
          </div>

          <span className="text-[11px] font-mono text-neutral-400">
            {formatTimecode(duration, fps)}
          </span>
        </div>
      </div>
    </ModalDialog>
  );
}
