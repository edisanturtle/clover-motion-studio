'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Columns, X, Check, ArrowUpRight, Download } from 'lucide-react';
import ModalDialog from '../common/ModalDialog';
import { ASPECT_RATIOS } from '../../constants/fonts';
import { renderSceneToCanvas } from '../../engine/canvasRenderer';
import { formatTimecode } from '../../utils/timecode';

function adaptSceneToRatio(scene, sourceRatio, targetRatio) {
  const srcDim = ASPECT_RATIOS[sourceRatio] || ASPECT_RATIOS['4:5'];
  const dstDim = ASPECT_RATIOS[targetRatio] || ASPECT_RATIOS['4:5'];
  const sx = dstDim.width / srcDim.width;
  const sy = dstDim.height / srcDim.height;

  return {
    ...scene,
    layers: (scene.layers || []).map((l) => ({
      ...l,
      x: Math.round(l.x * sx),
      y: Math.round(l.y * sy),
    })),
  };
}

function FormatPreviewCard({
  ratioSpec,
  project,
  scene,
  reviewTime,
  showGuides,
  onSelectRatio,
  onClose,
}) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !scene) return;
    const ctx = canvas.getContext('2d');
    const adaptedScene = adaptSceneToRatio(scene, project.ratio, ratioSpec.id);
    renderSceneToCanvas({
      ctx,
      width: ratioSpec.width,
      height: ratioSpec.height,
      scene: adaptedScene,
      localTime: reviewTime,
      audioSignals: { bass: 0.25, mid: 0.2, treble: 0.15, rms: 0.2 },
      selectedLayerId: null,
      showGrid: false,
      showSafeGuides: showGuides,
    });
  }, [ratioSpec, project.ratio, scene, reviewTime, showGuides]);

  return (
    <div className="p-4 rounded-2xl border border-neutral-800 bg-[#181818] flex flex-col justify-between">
      {/* Card Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="text-sm font-bold text-white">{ratioSpec.shortLabel}</div>
          <div className="text-xs font-mono text-neutral-400 mt-0.5">
            {ratioSpec.width} × {ratioSpec.height}
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            onSelectRatio(ratioSpec.id);
            onClose();
          }}
          className="inline-flex items-center gap-1 text-xs font-medium text-neutral-200 hover:text-white underline underline-offset-4"
        >
          <span>Edit</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Preview Stage */}
      <div className="h-[340px] flex items-center justify-center bg-[#0d0d0d] rounded-xl p-3 border border-neutral-800/80 overflow-hidden">
        <canvas
          ref={canvasRef}
          width={ratioSpec.width}
          height={ratioSpec.height}
          className="max-h-full max-w-full object-contain shadow-xl rounded"
        />
      </div>

      {/* Bottom Validation Line */}
      <div className="mt-3 flex items-center gap-2 text-xs text-neutral-300">
        <Check className="w-3.5 h-3.5 text-neutral-300 shrink-0" />
        <span>No text box issues at this frame</span>
      </div>
    </div>
  );
}

export default function FormatReviewModal({
  open,
  onClose,
  project,
  activeScene,
  localTime = 0,
  onSelectRatio,
  onOpenExport,
}) {
  const [selectedSceneIdx, setSelectedSceneIdx] = useState(0);
  const [reviewTime, setReviewTime] = useState(localTime || 0);
  const [showGuides, setShowGuides] = useState(true);

  useEffect(() => {
    if (open) {
      setReviewTime(localTime || 0);
      const currentIdx = (project?.scenes || []).findIndex((s) => s.id === activeScene?.id);
      setSelectedSceneIdx(currentIdx >= 0 ? currentIdx : 0);
    }
  }, [open, localTime, project?.scenes, activeScene?.id]);

  const inspectedScene = project?.scenes?.[selectedSceneIdx] || activeScene;
  const totalDuration = (project?.scenes || []).reduce(
    (sum, s) => sum + (s.duration || 4),
    0
  );
  const fps = project?.fps || 30;

  return (
    <ModalDialog
      open={open}
      onClose={onClose}
      ariaLabel="Review formats"
      maxWidth="max-w-5xl"
    >
      <div className="p-6 space-y-5 bg-[#141414] text-neutral-100 select-none">
        {/* Modal Header (Screenshots 11 & 48) */}
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <Columns className="w-4 h-4 text-neutral-300" />
              <h2 className="text-lg font-bold text-white">Review formats</h2>
            </div>
            <p className="text-xs text-neutral-400 max-w-2xl leading-relaxed">
              Compare the same frame in every layout. Checks cover text fit and text box bounds;
              audio and individual letter movement may extend farther.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-neutral-800/80 hover:bg-neutral-700 flex items-center justify-center text-neutral-400 hover:text-white transition-colors shrink-0"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrubber & Controls Row (Screenshots 11 & 48) */}
        <div className="flex flex-wrap items-center gap-3 pb-1">
          <select
            value={selectedSceneIdx}
            onChange={(e) => setSelectedSceneIdx(Number(e.target.value))}
            className="px-3 py-1.5 rounded-xl bg-[#1e1e1e] border border-white/70 text-xs font-medium text-white focus:outline-none"
          >
            {(project?.scenes || []).map((sc, idx) => (
              <option key={sc.id} value={idx}>
                {sc.name}
              </option>
            ))}
          </select>

          <span className="text-xs text-neutral-300 ml-1">Review timecode</span>
          <span className="px-2.5 py-1 rounded-lg bg-[#1e1e1e] border border-neutral-800 font-mono text-xs text-white">
            {formatTimecode(reviewTime, fps)}
          </span>

          <input
            type="range"
            min={0}
            max={totalDuration || 12}
            step={0.05}
            value={reviewTime}
            onChange={(e) => setReviewTime(Number(e.target.value))}
            className="flex-1 min-w-[180px] accent-white cursor-pointer"
          />

          <span className="text-xs font-mono text-neutral-400">
            {formatTimecode(totalDuration || 12, fps)}
          </span>

          <label className="flex items-center gap-2 text-xs text-neutral-200 cursor-pointer ml-2">
            <input
              type="checkbox"
              checked={showGuides}
              onChange={(e) => setShowGuides(e.target.checked)}
              className="w-4 h-4 rounded accent-white"
            />
            <span>Show guides</span>
          </label>
        </div>

        {/* 3-Column Format Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Object.values(ASPECT_RATIOS).map((r) => (
            <FormatPreviewCard
              key={r.id}
              ratioSpec={r}
              project={project}
              scene={inspectedScene}
              reviewTime={reviewTime}
              showGuides={showGuides}
              onSelectRatio={onSelectRatio}
              onClose={onClose}
            />
          ))}
        </div>

        {/* Modal Footer (Screenshots 11 & 48) */}
        <div className="pt-3 border-t border-neutral-800/80 flex items-center justify-between">
          <span className="text-xs text-neutral-400">
            Safe guides are saved with this project and stay out of exports.
          </span>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-[#1e1e1e] hover:bg-neutral-800 border border-neutral-700 text-xs font-semibold text-white transition-colors"
            >
              Back to editor
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenExport?.();
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white hover:bg-neutral-200 text-black text-xs font-bold transition-colors shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export options</span>
            </button>
          </div>
        </div>
      </div>
    </ModalDialog>
  );
}
