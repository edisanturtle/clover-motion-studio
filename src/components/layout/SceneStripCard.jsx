'use client';

import React, { useEffect, useRef } from 'react';
import { ASPECT_RATIOS } from '../../constants/fonts';
import { renderSceneToCanvas } from '../../engine/canvasRenderer';

export default function SceneStripCard({
  scene,
  index,
  ratio = '4:5',
  isActive,
  onSelect,
}) {
  const thumbRef = useRef(null);
  const dim = ASPECT_RATIOS[ratio] || ASPECT_RATIOS['4:5'];

  useEffect(() => {
    const canvas = thumbRef.current;
    if (!canvas || !scene) return;
    const ctx = canvas.getContext('2d');
    renderSceneToCanvas({
      ctx,
      width: dim.width,
      height: dim.height,
      scene,
      localTime: 0.8,
      audioSignals: { bass: 0.2, mid: 0.18, treble: 0.15, rms: 0.18 },
      selectedLayerId: null,
      showGrid: false,
      showSafeGuides: false,
    });
  }, [scene, dim.width, dim.height]);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`h-14 px-2.5 rounded-xl border flex items-center gap-3 text-left transition ${
        isActive
          ? 'bg-[#1c1c1c] border-white shadow-sm'
          : 'bg-[#181818] border-neutral-800/90 hover:border-neutral-700'
      }`}
    >
      <div className="w-8 h-10 rounded bg-black overflow-hidden flex items-center justify-center shrink-0 border border-neutral-700/60">
        <canvas
          ref={thumbRef}
          width={dim.width}
          height={dim.height}
          className="max-w-full max-h-full w-auto h-auto object-contain"
        />
      </div>
      <div className="min-w-0">
        <div className="text-xs font-semibold text-white truncate">
          <span className="text-neutral-400 font-mono mr-1.5">
            {String(index + 1).padStart(2, '0')}
          </span>
          {scene?.name || `Scene ${index + 1}`}
        </div>
        <div className="text-[11px] font-mono text-neutral-400">
          {scene?.duration || 4} s
        </div>
      </div>
    </button>
  );
}
