'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  Columns,
  X,
  Check,
  ArrowUpRight,
  Download,
  AlertTriangle,
  Info,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import ModalDialog from '../common/ModalDialog';
import { ASPECT_RATIOS } from '../../constants/fonts';
import { renderSceneToCanvas } from '../../engine/canvasRenderer';
import { formatTimecode } from '../../utils/timecode';
import { resolveSceneForFormat } from '../../core/domain/layoutVariants.js';
import { checkProjectFormatVariants } from '../../core/services/formatPreflightChecker.js';

function FormatPreviewCard({
  ratioSpec,
  project,
  scene,
  reviewTime,
  showGuides,
  preflightResult,
  onSelectRatio,
  onClose,
}) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !scene) return;
    const ctx = canvas.getContext('2d');
    const resolvedScene = resolveSceneForFormat(scene, ratioSpec.id, project?.ratio || '4:5');
    renderSceneToCanvas({
      ctx,
      width: ratioSpec.width,
      height: ratioSpec.height,
      scene: resolvedScene,
      localTime: reviewTime,
      audioSignals: { bass: 0.25, mid: 0.2, treble: 0.15, rms: 0.2 },
      selectedLayerId: null,
      showGrid: false,
      showSafeGuides: showGuides,
      project: { ...project, ratio: ratioSpec.id },
    });
  }, [ratioSpec, project, scene, reviewTime, showGuides]);

  const ratioIssues = preflightResult?.issues || [];
  const hasErrors = ratioIssues.some((i) => i.severity === 'error');
  const hasWarnings = ratioIssues.some((i) => i.severity === 'warning');

  return (
    <div className="p-4 rounded-2xl border border-neutral-800 bg-[#181818] flex flex-col justify-between space-y-3">
      {/* Card Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm font-bold text-white flex items-center gap-1.5">
            <span>{ratioSpec.shortLabel}</span>
            {project?.ratio === ratioSpec.id && (
              <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-[#159947]/20 text-[#4ade80] border border-[#22c55e]/30">
                Active
              </span>
            )}
          </div>
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
          className="inline-flex items-center gap-1 text-xs font-medium text-[#4ade80] hover:text-white underline underline-offset-4"
        >
          <span>Edit Layout</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Preview Stage */}
      <div className="h-[320px] flex items-center justify-center bg-[#0d0d0d] rounded-xl p-3 border border-neutral-800/80 overflow-hidden relative">
        <canvas
          ref={canvasRef}
          width={ratioSpec.width}
          height={ratioSpec.height}
          className="max-h-full max-w-full object-contain shadow-2xl rounded"
        />
      </div>

      {/* Duration Preflight Validation Status */}
      <div className="pt-1">
        {ratioIssues.length === 0 ? (
          <div className="flex items-center gap-1.5 text-xs text-[#4ade80]">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#22c55e] shrink-0" />
            <span>0 layout issues across full duration</span>
          </div>
        ) : (
          <div className="space-y-1">
            <div className={`flex items-center gap-1.5 text-xs font-semibold ${hasErrors ? 'text-red-400' : 'text-amber-400'}`}>
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>{ratioIssues.length} advisory issue(s) across duration</span>
            </div>
            <p className="text-[11px] text-neutral-400 truncate">
              {ratioIssues[0]?.message}
            </p>
          </div>
        )}
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
  const [showFullDiagnostics, setShowFullDiagnostics] = useState(false);

  useEffect(() => {
    if (open) {
      setReviewTime(localTime || 0);
      const currentIdx = (project?.scenes || []).findIndex((s) => s.id === activeScene?.id);
      setSelectedSceneIdx(currentIdx >= 0 ? currentIdx : 0);
    }
  }, [open, localTime, project?.scenes, activeScene?.id]);

  // Execute duration-spanning preflight inspection across all 6 aspect ratios
  const preflightReport = useMemo(() => {
    if (!project) return null;
    return checkProjectFormatVariants(project);
  }, [project]);

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
      maxWidth="max-w-6xl"
    >
      <div className="p-6 space-y-5 bg-[#141414] text-neutral-100 select-none">
        {/* Modal Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <Columns className="w-4 h-4 text-[#22c55e]" />
              <h2 className="text-lg font-bold text-white">Review Responsive Formats & Variants</h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#159947]/20 text-[#4ade80] border border-[#22c55e]/40">
                6 Aspect Ratios
              </span>
            </div>
            <p className="text-xs text-neutral-400 max-w-2xl leading-relaxed">
              Compare your animated scenes across all 6 standardized layouts (9:16, 1:1, 4:5, 16:9, 4:3, 3:4).
              Our duration-spanning preflight checker verifies bounds, text overflow, and off-canvas motion trajectories throughout the full timeline.
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

        {/* Scrubber & Controls Row */}
        <div className="flex flex-wrap items-center gap-3 bg-[#1a1a1a] p-3 rounded-xl border border-neutral-800">
          <select
            value={selectedSceneIdx}
            onChange={(e) => setSelectedSceneIdx(Number(e.target.value))}
            className="px-3 py-1.5 rounded-xl bg-[#141414] border border-neutral-700 text-xs font-medium text-white focus:outline-none"
          >
            {(project?.scenes || []).map((sc, idx) => (
              <option key={sc.id} value={idx}>
                {sc.name || `Scene ${idx + 1}`}
              </option>
            ))}
          </select>

          <span className="text-xs text-neutral-300 ml-1">Timeline Playhead:</span>
          <span className="px-2.5 py-1 rounded-lg bg-[#141414] border border-neutral-700 font-mono text-xs text-[#4ade80]">
            {formatTimecode(reviewTime, fps)}
          </span>

          <input
            type="range"
            min={0}
            max={totalDuration || 12}
            step={0.033}
            value={Number.isFinite(reviewTime) ? reviewTime : 0}
            onChange={(e) => setReviewTime(Number(e.target.value) || 0)}
            className="flex-1 min-w-[180px] accent-[#159947] cursor-pointer"
          />

          <span className="text-xs font-mono text-neutral-400">
            {formatTimecode(totalDuration || 12, fps)}
          </span>

          <label className="flex items-center gap-2 text-xs text-neutral-200 cursor-pointer ml-2">
            <input
              type="checkbox"
              checked={showGuides}
              onChange={(e) => setShowGuides(e.target.checked)}
              className="w-4 h-4 rounded accent-[#159947]"
            />
            <span>Show Safe Guides</span>
          </label>

          <button
            type="button"
            onClick={() => setShowFullDiagnostics(!showFullDiagnostics)}
            className="px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold flex items-center gap-1 transition-colors"
          >
            <span>Diagnostics Log ({preflightReport?.totalIssuesCount || 0})</span>
            {showFullDiagnostics ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Full Diagnostics Log Drawer */}
        {showFullDiagnostics && (
          <div className="bg-[#181818] border border-neutral-800 rounded-xl p-4 max-h-48 overflow-y-auto custom-scrollbar space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-white border-b border-neutral-800 pb-2">
              <span>Duration Preflight Checker Results</span>
              <span className="text-neutral-400 font-mono">{preflightReport?.summary}</span>
            </div>
            {preflightReport?.totalIssuesCount === 0 ? (
              <p className="text-xs text-[#4ade80] py-2">
                ✓ Clean pass: All 6 formats maintain 100% boundary and safe-area compliance along the entire timeline.
              </p>
            ) : (
              <div className="space-y-1.5">
                {Object.values(preflightReport?.resultsPerRatio || {}).flatMap((r) => r.issues).map((issue, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-xs text-neutral-300 bg-neutral-900/60 p-2 rounded-lg">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-neutral-800 text-neutral-200">
                      {issue.ratio}
                    </span>
                    <span className="text-neutral-400 font-mono">[{issue.time.toFixed(2)}s]</span>
                    <span className="flex-1">{issue.message}</span>
                    <span className={`text-[10px] font-bold uppercase ${issue.severity === 'error' ? 'text-red-400' : 'text-amber-400'}`}>
                      {issue.severity}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 6-Column Format Cards Grid (3 cols on desktop) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.values(ASPECT_RATIOS).map((r) => (
            <FormatPreviewCard
              key={r.id}
              ratioSpec={r}
              project={project}
              scene={inspectedScene}
              reviewTime={reviewTime}
              showGuides={showGuides}
              preflightResult={preflightReport?.resultsPerRatio?.[r.id]}
              onSelectRatio={onSelectRatio}
              onClose={onClose}
            />
          ))}
        </div>

        {/* Modal Footer */}
        <div className="pt-3 border-t border-neutral-800/80 flex items-center justify-between flex-wrap gap-2">
          <span className="text-xs text-neutral-400">
            Per-format overrides are non-destructive and preserve linked base text/motion properties.
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
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#159947] hover:bg-[#19b353] text-white text-xs font-bold transition-colors shadow-lg shadow-[#159947]/20"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Multi-Format</span>
            </button>
          </div>
        </div>
      </div>
    </ModalDialog>
  );
}
