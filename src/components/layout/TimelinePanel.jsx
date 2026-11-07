'use client';

import React, { useState, useRef } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Repeat,
  Plus,
  Trash2,
  ChevronRight,
  ChevronDown,
  Type,
  Sparkles,
  SlidersHorizontal,
  ArrowUpDown,
  Search,
  Copy,
  Clipboard,
  Flag,
  Activity,
  Waves,
  Magnet,
  Check,
} from 'lucide-react';
import { formatTimecode, getSceneTimeRanges } from '../../utils/timecode';
import { timebaseToTimecode, frameStepTime, snapTimeToFrame } from '../../core/domain/timebase';
import { evaluateLayerKeyframes } from '../../engine/canvasRenderer';

const PROPERTY_LABELS = {
  posX: 'Position X',
  posY: 'Position Y',
  scale: 'Scale',
  rotation: 'Rotation',
  opacity: 'Opacity',
};

const BEZIER_PRESETS = {
  smooth: { label: 'Smooth', coords: [0.25, 0.1, 0.25, 1.0] },
  snappy: { label: 'Snappy', coords: [0.22, 1.0, 0.36, 1.0] },
  anticipate: { label: 'Anticipate', coords: [0.36, 0.0, 0.66, -0.56] },
  overshoot: { label: 'Overshoot', coords: [0.34, 1.56, 0.64, 1.0] },
  ease: { label: 'CSS Ease', coords: [0.25, 0.1, 0.25, 1.0] },
  easeIn: { label: 'Ease In', coords: [0.42, 0.0, 1.0, 1.0] },
  easeOut: { label: 'Ease Out', coords: [0.0, 0.0, 0.58, 1.0] },
  easeInOut: { label: 'Ease In Out', coords: [0.42, 0.0, 0.58, 1.0] },
};

const safeNum = (v, fallback) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);

export default function TimelinePanel({
  project,
  activeScene,
  activeSceneIndex = 0,
  setActiveSceneIndex,
  selectedLayer,
  selectedLayerId,
  setSelectedLayerId,
  localTime,
  currentGlobalTime = 0,
  totalProjectDuration = 60,
  playbackScope = 'all',
  setPlaybackScope,
  isPlaying,
  loopPlayback,
  setLoopPlayback,
  timelineExpanded = true,
  setTimelineExpanded,
  timelineHeight = 240,
  onResizeTimeline,
  onTogglePlay,
  onRestart,
  onSeekLocalTime,
  onSeekGlobalTime,
  onAddKeyframe,
  onUpdateKeyframe,
  onDuplicateKeyframes,
  onPasteKeyframes,
  onDeleteKeyframe,
  onClearLayerKeyframes,
  onUpdateSceneDuration,
  onChangeFps,
  onAddScene,
  onAddMarker,
  onDeleteMarker,
}) {
  const [viewMode, setViewMode] = useState('keyframes'); // 'keyframes' | 'graph'
  const [activeProp, setActiveProp] = useState('posX'); // 'posX' | 'posY' | 'scale' | 'rotation' | 'opacity'
  const [toolsOpen, setToolsOpen] = useState(false);
  const [snapToBeats, setSnapToBeats] = useState(true);
  const [markers, setMarkers] = useState([]);
  const [copiedKeyframes, setCopiedKeyframes] = useState([]);
  const [selectedKeyframeIds, setSelectedKeyframeIds] = useState([]);
  const [expandedLayerIds, setExpandedLayerIds] = useState({});
  const [timelineZoom, setTimelineZoom] = useState('fit'); // 'fit' | '2x' | '4x'
  const [trackHeight, setTrackHeight] = useState('compact'); // 'compact' | 'tall'
  const trackAreaRef = useRef(null);

  if (!activeScene) return null;

  const isFullVideo = playbackScope === 'all' && (project?.scenes?.length || 1) > 1;
  const duration = activeScene.duration || 4;
  const effectiveTotalDuration = totalProjectDuration || (project?.scenes || []).reduce(
    (acc, sc) => acc + (sc.duration || 4),
    0
  );
  const displayDuration = safeNum(isFullVideo ? effectiveTotalDuration : duration, 4);
  const effectiveCurrentTime = isFullVideo ? (currentGlobalTime ?? localTime) : localTime;
  const sceneRanges = getSceneTimeRanges(project?.scenes || []);

  const fps = project?.fps || 30;
  const totalFrames = Math.round(displayDuration * fps);

  // Keyframe Selection & Multi-select Helpers (Fase 4)
  const handleSelectKeyframe = (kfId, e) => {
    e.stopPropagation();
    if (e.shiftKey) {
      setSelectedKeyframeIds((prev) =>
        prev.includes(kfId) ? prev.filter((id) => id !== kfId) : [...prev, kfId]
      );
    } else {
      setSelectedKeyframeIds([kfId]);
    }
  };

  const handleDeleteSelectedKeyframes = () => {
    if (!selectedLayer || !selectedKeyframeIds.length) return;
    selectedKeyframeIds.forEach((id) => onDeleteKeyframe?.(selectedLayer.id, id));
    setSelectedKeyframeIds([]);
  };

  const handleDuplicateSelectedKeyframes = () => {
    if (!selectedLayer || !selectedKeyframeIds.length) return;
    if (onDuplicateKeyframes) {
      onDuplicateKeyframes(selectedLayer.id, selectedKeyframeIds);
    } else {
      const targets = (selectedLayer.keyframes || []).filter((k) => selectedKeyframeIds.includes(k.id));
      const dups = targets.map((k) => ({
        ...k,
        id: `kf_dup_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        time: Math.min(duration, Number((k.time + 0.5).toFixed(2))),
      }));
      onPasteKeyframes?.(selectedLayer.id, dups, 0);
    }
  };

  const handleSnapSelectedKeyframes = () => {
    if (!selectedLayer || !selectedKeyframeIds.length) return;
    (selectedLayer.keyframes || []).forEach((k) => {
      if (selectedKeyframeIds.includes(k.id)) {
        const snappedTime = snapTimeToFrame(k.time, fps);
        onUpdateKeyframe?.(selectedLayer.id, k.id, { time: snappedTime });
      }
    });
  };

  const handleCopySelectedKeyframes = () => {
    if (!selectedLayer) return;
    if (selectedKeyframeIds.length > 0) {
      const targets = (selectedLayer.keyframes || []).filter((k) => selectedKeyframeIds.includes(k.id));
      setCopiedKeyframes(targets);
    } else if (selectedLayer.keyframes?.length) {
      setCopiedKeyframes([...selectedLayer.keyframes]);
    }
  };

  // Count total keyframes across project scenes (or active scene)
  const totalKeyframes = (project?.scenes || [activeScene]).reduce(
    (sum, sc) =>
      sum +
      (sc.layers || []).reduce((acc, l) => acc + (l.keyframes?.length || 0), 0),
    0
  );

  const handleTrackScrub = (e) => {
    const el = trackAreaRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    if (isFullVideo && onSeekGlobalTime) {
      onSeekGlobalTime(ratio * displayDuration);
    } else if (onSeekLocalTime) {
      onSeekLocalTime(ratio * displayDuration);
    }
  };

  const toggleLayerExpanded = (layerId, e) => {
    e.stopPropagation();
    setExpandedLayerIds((prev) => ({
      ...prev,
      [layerId]: prev[layerId] === undefined ? false : !prev[layerId],
    }));
  };

  // Generate 9 evenly spaced timecode ruler ticks
  const rulerTicks = Array.from({ length: 9 }, (_, i) => (displayDuration / 8) * i);
  const playheadPercent = Math.min(100, Math.max(0, (effectiveCurrentTime / displayDuration) * 100));

  // Helper to get layer percentage value for display
  const getPropertyDisplayPercent = (layer, prop) => {
    const evaluated = evaluateLayerKeyframes(layer, localTime);
    if (prop === 'posX') return `${Math.round(((evaluated.posX || 540) / 1080) * 100)} %`;
    if (prop === 'posY') return `${Math.round(((evaluated.posY || 675) / 1350) * 100)} %`;
    if (prop === 'scale') return `${Math.round((evaluated.scale ?? 1) * 100)} %`;
    if (prop === 'opacity') return `${Math.round((evaluated.opacity ?? 1) * 100)} %`;
    if (prop === 'rotation') return `${Math.round(evaluated.rotation || 0)} °`;
    return '0 %';
  };

  const handleCopyKeyframes = () => {
    if (selectedLayer?.keyframes?.length) {
      setCopiedKeyframes([...selectedLayer.keyframes]);
    }
  };

  const handleAddMarker = () => {
    setMarkers((prev) => [
      ...prev,
      { id: `mk_${Date.now()}`, time: localTime, label: `M${prev.length + 1}` },
    ]);
  };

  return (
    <div className="px-2.5 pb-2 bg-[#0e0e0e] shrink-0 select-none space-y-2">
      {/* Proportional Horizontal Scenes Bar in Advanced Mode (Screenshots 15, 31-35) */}
      {(project?.scenes?.length || 0) > 1 && (
        <div className="h-11 bg-[#161616] border border-neutral-800/80 rounded-2xl px-3.5 flex items-center gap-3 overflow-hidden">
          <span className="text-xs font-semibold text-neutral-300 shrink-0 flex items-center gap-1.5">
            <span>Scenes</span>
            <span className="text-[10px] font-mono text-neutral-500">({project.scenes.length})</span>
          </span>
          <div className="flex-1 flex items-center gap-2 h-7 overflow-x-auto custom-scrollbar min-w-0 py-0.5">
            {project.scenes.map((sc, idx) => {
              const active = idx === activeSceneIndex;
              const num = String(idx + 1).padStart(2, '0');
              const flexWeight = Math.max(1, sc.duration || 2);
              return (
                <button
                  key={sc.id}
                  type="button"
                  onClick={() => setActiveSceneIndex?.(idx)}
                  style={{ flex: flexWeight }}
                  className={`h-full min-w-[120px] max-w-[240px] px-3 rounded-lg border flex items-center justify-between gap-1.5 text-xs transition-all shrink-0 ${
                    active
                      ? 'bg-[#159947]/20 border-[#22c55e] text-white font-semibold shadow-sm'
                      : 'bg-[#1b1b1b] border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-700'
                  }`}
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="font-mono text-[10px] text-neutral-400 shrink-0">{num}</span>
                    <span className="truncate">{sc.name}</span>
                  </div>
                  <span className="text-[10px] font-mono text-neutral-500 shrink-0">{sc.duration || 4}s</span>
                </button>
              );
            })}
            {onAddScene && (
              <button
                type="button"
                onClick={onAddScene}
                className="h-full px-2.5 rounded-lg border border-dashed border-neutral-700 hover:border-[#22c55e] bg-[#1a1a1a] hover:bg-[#202020] text-neutral-400 hover:text-white flex items-center gap-1 text-[11px] font-semibold shrink-0 transition-colors"
                title="Add a new scene"
              >
                <Plus className="w-3 h-3 text-[#4ade80]" />
                <span className="whitespace-nowrap">Add</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main Timeline Card */}
      <section
        style={timelineExpanded ? { height: `${timelineHeight}px` } : undefined}
        className="bg-[#141414] border border-neutral-800/80 rounded-2xl flex flex-col overflow-hidden relative select-none shrink-0 transition-[height] duration-75"
      >
        {/* Resize handle splitter on top */}
        {timelineExpanded && onResizeTimeline ? (
          <div
            onPointerDown={(e) => {
              e.preventDefault();
              const startY = e.clientY;
              const startH = timelineHeight;
              const onMove = (ev) => {
                const deltaY = startY - ev.clientY; // dragging upwards expands height
                const nextH = Math.max(140, Math.min(480, startH + deltaY));
                onResizeTimeline(nextH);
              };
              const onUp = () => {
                window.removeEventListener('pointermove', onMove);
                window.removeEventListener('pointerup', onUp);
              };
              window.addEventListener('pointermove', onMove);
              window.addEventListener('pointerup', onUp);
            }}
            className="w-full h-2 cursor-row-resize hover:bg-[#22c55e]/50 flex items-center justify-center absolute top-0 left-0 right-0 z-30 transition-colors group select-none"
            title="Drag to resize timeline height"
          >
            <div className="w-10 h-0.5 rounded-full bg-neutral-600 group-hover:bg-[#4ade80]" />
          </div>
        ) : (
          /* Subtle top pill handle */
          <div className="w-full flex justify-center pt-1 pb-0.5">
            <div className="w-8 h-1 rounded-full bg-neutral-700/70" />
          </div>
        )}

        {/* =========================================================
            COLLAPSED TIMELINE BAR (Screenshots 36–47)
           ========================================================= */}
        {!timelineExpanded ? (
          <div className="h-9 px-3.5 pb-1 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setTimelineExpanded?.(true)}
              className="flex items-center gap-2 text-xs font-semibold text-white hover:text-neutral-200"
            >
              <ChevronRight className="w-3.5 h-3.5 text-neutral-400" />
              <span>Timeline</span>
              <span className="px-1.5 py-0.5 rounded bg-[#242424] border border-neutral-700 text-[10px] font-mono text-neutral-300">
                {totalKeyframes}
              </span>
            </button>

            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-neutral-400">Duration</span>
              <input
                type="number"
                min={1}
                max={120}
                value={safeNum(displayDuration, 4)}
                onChange={(e) =>
                  onUpdateSceneDuration(
                    Math.max(1, Math.min(120, Number(e.target.value) || 4))
                  )
                }
                className="w-12 px-1.5 py-0.5 rounded bg-[#202020] border border-neutral-800 text-center font-mono text-white text-[11px]"
              />
              <span className="text-neutral-400 font-mono text-[11px]">s</span>
            </div>
          </div>
        ) : (
          /* =========================================================
              EXPANDED TIMELINE PANEL (Screenshots 15, 17, 19, 32, 33, 34, 35)
             ========================================================= */
          <>
            {/* Row 1: Top Transport, Timecode & Duration Header */}
            <div className="h-9 px-3.5 border-b border-neutral-800/80 flex items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setTimelineExpanded?.(false)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-white hover:text-neutral-200"
                >
                  <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
                  <span>Timeline</span>
                  <span className="px-1.5 py-0.5 rounded bg-[#242424] border border-neutral-700 text-[10px] font-mono text-neutral-300">
                    {totalKeyframes}
                  </span>
                </button>

                <div className="h-3.5 w-px bg-neutral-800 mx-1" />

                {/* Step / Transport Controls */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onSeekLocalTime(frameStepTime(localTime, -1, fps, duration))}
                    className="p-1 rounded hover:bg-neutral-800 text-neutral-400 hover:text-white"
                    title="Previous frame (press ,)"
                    aria-label="Previous frame"
                  >
                    <SkipBack className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onSeekLocalTime(frameStepTime(localTime, 1, fps, duration))}
                    className="p-1 rounded hover:bg-neutral-800 text-neutral-400 hover:text-white"
                    title="Next frame (press .)"
                    aria-label="Next frame"
                  >
                    <SkipForward className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={onRestart}
                    className="p-1 rounded hover:bg-neutral-800 text-neutral-400 hover:text-white"
                    title="Jump to start"
                    aria-label="Jump to start"
                  >
                    <SkipBack className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={onTogglePlay}
                    aria-label={isPlaying ? 'Pause playback' : 'Start playback'}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#242424] hover:bg-neutral-700 border border-neutral-700 text-xs font-semibold text-white transition-colors ml-0.5"
                  >
                    {isPlaying ? (
                      <>
                        <Pause className="w-3 h-3 fill-current" />
                        <span>Pause</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3 h-3 fill-current" />
                        <span>Play demo</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setLoopPlayback((v) => !v)}
                    className={`p-1 rounded transition-colors ${
                      loopPlayback
                        ? 'text-white bg-neutral-800'
                        : 'text-neutral-500 hover:text-white'
                    }`}
                    title="Toggle loop"
                    aria-label="Toggle loop playback"
                  >
                    <Repeat className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="h-3.5 w-px bg-neutral-800 mx-1" />

                {/* Scope Switcher in Timeline Header */}
                <div className="flex items-center bg-[#202020] p-0.5 rounded-lg border border-neutral-800 text-[10px] font-semibold">
                  <button
                    type="button"
                    onClick={() => setPlaybackScope?.('all')}
                    className={`px-2 py-0.5 rounded flex items-center gap-1 transition-all ${
                      playbackScope === 'all'
                        ? 'bg-[#159947] text-white shadow-sm'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                    title={`Full Video mode (${Math.round(effectiveTotalDuration)}s)`}
                  >
                    <span>Full Video</span>
                    <span className="text-[9px] font-mono opacity-80">
                      {Math.round(effectiveTotalDuration)}s
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPlaybackScope?.('scene')}
                    className={`px-2 py-0.5 rounded flex items-center gap-1 transition-all ${
                      playbackScope === 'scene'
                        ? 'bg-[#2a2a2a] text-white shadow-sm'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                    title="Active scene only"
                  >
                    <span>Scene 0{activeSceneIndex + 1}</span>
                  </button>
                </div>

                <div className="h-3.5 w-px bg-neutral-800 mx-1" />

                {/* Canonical Project Clock Timecode Display */}
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-neutral-400">Timecode</span>
                  <span className="px-2 py-0.5 rounded bg-[#202020] border border-neutral-800 font-mono text-[11px] text-[#4ade80]">
                    {timebaseToTimecode(effectiveCurrentTime, fps)}
                  </span>
                </div>

                {/* Duration Input */}
                <div className="flex items-center gap-1.5 text-xs ml-2">
                  <span className="text-neutral-400">Duration</span>
                  <input
                    type="number"
                    min={1}
                    max={120}
                    value={safeNum(displayDuration, 4)}
                    onChange={(e) =>
                      onUpdateSceneDuration(
                        Math.max(1, Math.min(120, Number(e.target.value) || 4))
                      )
                    }
                    className="w-12 px-1.5 py-0.5 rounded bg-[#202020] border border-neutral-800 text-center font-mono text-white text-[11px]"
                  />
                  <span className="text-neutral-400 font-mono text-[11px]">s</span>
                  <span className="text-neutral-500 font-mono text-[11px] ml-1">
                    {totalFrames} frames
                  </span>
                </div>
              </div>
            </div>

            {/* Row 2: Keyframes | Value graph + Property Selector + Add Keyframe + Tools */}
            <div className="h-9 px-3.5 border-b border-neutral-800/80 flex items-center justify-between gap-2 shrink-0 bg-[#141414]">
              <div className="flex items-center gap-2">
                <div className="flex items-center bg-[#202020] p-0.5 rounded-lg border border-neutral-800">
                  <button
                    type="button"
                    onClick={() => setViewMode('keyframes')}
                    className={`px-2.5 py-0.5 rounded-md text-xs font-medium transition-colors ${
                      viewMode === 'keyframes'
                        ? 'bg-[#159947]/25 text-[#4ade80] border border-[#22c55e]/60 shadow-sm'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    Keyframes
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('graph')}
                    className={`px-2.5 py-0.5 rounded-md text-xs font-medium transition-colors ${
                      viewMode === 'graph'
                        ? 'bg-[#159947]/25 text-[#4ade80] border border-[#22c55e]/60 shadow-sm'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    Value graph
                  </button>
                </div>

                <select
                  value={activeProp}
                  onChange={(e) => setActiveProp(e.target.value)}
                  className="px-2.5 py-1 rounded-lg bg-[#202020] border border-neutral-800 text-xs text-white focus:outline-none"
                >
                  <option value="posX">Position X</option>
                  <option value="posY">Position Y</option>
                  <option value="scale">Scale</option>
                  <option value="rotation">Rotation</option>
                  <option value="opacity">Opacity</option>
                </select>

                <button
                  type="button"
                  disabled={!selectedLayer}
                  onClick={() => onAddKeyframe(activeProp)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#202020] hover:bg-neutral-800 disabled:opacity-40 border border-neutral-800 text-xs font-medium text-neutral-200 hover:text-white transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add keyframe</span>
                </button>

                {/* Keyframe Multi-selection Action Pill */}
                {selectedKeyframeIds.length > 0 && (
                  <div className="flex items-center gap-1 pl-1.5 border-l border-neutral-800 animate-fade-in">
                    <span className="text-[10px] font-mono text-[#4ade80] px-1.5 py-0.5 rounded bg-[#159947]/20 border border-[#22c55e]/30">
                      {selectedKeyframeIds.length} sel
                    </span>
                    <button
                      type="button"
                      onClick={handleDuplicateSelectedKeyframes}
                      className="p-1 rounded bg-[#202020] hover:bg-neutral-800 border border-neutral-800 text-neutral-300 hover:text-white"
                      title="Duplicate selected keyframes (Ctrl/Cmd+D)"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={handleSnapSelectedKeyframes}
                      className="p-1 rounded bg-[#202020] hover:bg-neutral-800 border border-neutral-800 text-neutral-300 hover:text-white"
                      title="Snap selected keyframes to frame grid"
                    >
                      <Magnet className="w-3 h-3 text-[#22c55e]" />
                    </button>
                    <button
                      type="button"
                      onClick={handleDeleteSelectedKeyframes}
                      className="p-1 rounded bg-[#202020] hover:bg-red-950/60 border border-neutral-800 text-neutral-400 hover:text-red-400"
                      title="Delete selected keyframes (Delete / Backspace)"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>

              <div>
                <button
                  type="button"
                  onClick={() => setToolsOpen((v) => !v)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium transition-colors ${
                    toolsOpen
                      ? 'bg-[#282828] border-white/60 text-white'
                      : 'bg-[#202020] border-neutral-800 text-neutral-300 hover:text-white'
                  }`}
                >
                  <SlidersHorizontal className="w-3 h-3" />
                  <span>Tools</span>
                  {toolsOpen ? (
                    <ChevronDown className="w-3 h-3 text-neutral-400" />
                  ) : (
                    <ChevronRight className="w-3 h-3 text-neutral-400" />
                  )}
                </button>
              </div>
            </div>

            {/* Expanded Tools Bars (Screenshot 35) */}
            {toolsOpen && (
              <div className="bg-[#121212] border-b border-neutral-800/80 divide-y divide-neutral-800/70 text-xs">
                {/* Expanded Toolbar Row A */}
                <div className="h-9 px-3.5 flex items-center justify-between">
                  <div className="w-32" />
                  <div className="flex items-center gap-1.5">
                    <select
                      value={fps}
                      onChange={(e) => onChangeFps?.(Number(e.target.value) || 30)}
                      className="px-2 py-1 rounded-lg bg-[#1e1e1e] border border-neutral-800 text-xs text-white focus:outline-none"
                    >
                      <option value={24}>24 fps</option>
                      <option value={30}>30 fps</option>
                      <option value={60}>60 fps</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => setTrackHeight((h) => (h === 'compact' ? 'tall' : 'compact'))}
                      className={`p-1.5 rounded-lg border transition-colors ${
                        trackHeight === 'tall'
                          ? 'bg-[#159947]/30 border-[#22c55e]/50 text-white'
                          : 'bg-[#1e1e1e] border-neutral-800 text-neutral-400 hover:text-white'
                      }`}
                      title={`Toggle track height (${trackHeight})`}
                    >
                      <ArrowUpDown className="w-3.5 h-3.5" />
                    </button>
                    <select
                      value={timelineZoom}
                      onChange={(e) => setTimelineZoom(e.target.value)}
                      className="px-2 py-1 rounded-lg bg-[#1e1e1e] border border-neutral-800 text-xs text-white focus:outline-none"
                    >
                      <option value="fit">Fit</option>
                      <option value="2x">200%</option>
                      <option value="4x">400%</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleCopyKeyframes}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#1e1e1e] hover:bg-neutral-800 border border-neutral-800 text-xs text-neutral-200 hover:text-white"
                    >
                      <Copy className="w-3 h-3" />
                      <span>Copy</span>
                    </button>
                    <button
                      type="button"
                      disabled={copiedKeyframes.length === 0}
                      onClick={() => {
                        if (selectedLayer && copiedKeyframes.length) {
                          onPasteKeyframes?.(selectedLayer.id, copiedKeyframes, localTime);
                        }
                      }}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#1e1e1e] hover:bg-neutral-800 disabled:opacity-40 border border-neutral-800 text-xs text-neutral-300"
                    >
                      <Clipboard className="w-3 h-3" />
                      <span>Paste</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => selectedLayer && onClearLayerKeyframes(selectedLayer.id)}
                      className="p-1.5 rounded-lg bg-[#1e1e1e] hover:bg-neutral-800 border border-neutral-800 text-neutral-400 hover:text-white"
                      title="Curve & keyframe options"
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Expanded Toolbar Row B: Beats & markers (Screenshot 35) */}
                <div className="h-9 px-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setToolsOpen(false)}
                      className="flex items-center gap-1 text-xs font-medium text-neutral-200 hover:text-white transition-colors"
                      title="Collapse beats & markers toolbar"
                    >
                      <ChevronDown className="w-3.5 h-3.5 text-neutral-400 rotate-180" />
                      <span>Beats & markers</span>
                    </button>

                    <div className="flex items-center gap-2 ml-2">
                      <span className="text-xs text-neutral-300">Snap to beats</span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={snapToBeats}
                        onClick={() => setSnapToBeats((v) => !v)}
                        className={`w-8 h-4 rounded-full transition-colors p-0.5 ${
                          snapToBeats ? 'bg-white' : 'bg-neutral-700'
                        }`}
                      >
                        <div
                          className={`w-3 h-3 rounded-full transition-transform ${
                            snapToBeats
                              ? 'translate-x-4 bg-black'
                              : 'translate-x-0 bg-neutral-300'
                          }`}
                        />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={handleAddMarker}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#1e1e1e] hover:bg-neutral-800 border border-neutral-800 text-xs text-neutral-200"
                    >
                      <Flag className="w-3 h-3 text-neutral-400" />
                      <span>Add marker at {formatTimecode(localTime, fps)}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        // Generate beat markers based on BPM (e.g. 120 BPM = 0.5s intervals)
                        const bpm = project?.bpm || 120;
                        const beatInterval = 60 / bpm;
                        const newMarkers = [];
                        let t = 0;
                        let count = 1;
                        while (t < duration) {
                          newMarkers.push({
                            id: `beat_${count}_${Date.now()}`,
                            time: Number(t.toFixed(2)),
                            label: `B${count}`,
                          });
                          t += beatInterval;
                          count++;
                        }
                        setMarkers(newMarkers);
                      }}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#1e1e1e] hover:bg-neutral-800 border border-neutral-800 text-xs text-neutral-200"
                    >
                      <Activity className="w-3 h-3 text-[#22c55e]" />
                      <span>Find beats</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (!selectedLayer) return;
                        // Automatically generate beat-synced keyframe pulses on the selected layer
                        const bpm = project?.bpm || 120;
                        const beatInterval = 60 / bpm;
                        const generatedKfs = [];
                        let t = 0;
                        const baseVal =
                          activeProp === 'scale' ? 1.0 : activeProp === 'opacity' ? 1.0 : 0;
                        const peakVal =
                          activeProp === 'scale' ? 1.25 : activeProp === 'opacity' ? 0.35 : 30;

                        while (t < duration) {
                          generatedKfs.push({
                            id: `kf_beat_up_${t}_${Date.now()}`,
                            time: Number(t.toFixed(2)),
                            prop: activeProp,
                            value: peakVal,
                            easing: 'easeOutCubic',
                          });
                          const downTime = Math.min(duration, t + beatInterval * 0.4);
                          generatedKfs.push({
                            id: `kf_beat_down_${downTime}_${Date.now()}`,
                            time: Number(downTime.toFixed(2)),
                            prop: activeProp,
                            value: baseVal,
                            easing: 'easeInOutQuad',
                          });
                          t += beatInterval;
                        }
                        onPasteKeyframes?.(selectedLayer.id, generatedKfs, 0);
                      }}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#1e1e1e] hover:bg-neutral-800 border border-neutral-800 text-xs text-neutral-200"
                    >
                      <Waves className="w-3 h-3 text-[#4ade80]" />
                      <span>Animate beats</span>
                    </button>
                  </div>

                  <span className="text-[11px] font-mono text-neutral-500">
                    Alt-drag bypasses beat snapping
                  </span>
                </div>
              </div>
            )}

            {/* Row 3: Timecode Ruler Header (LAYERS / PROPERTIES or VALUE / TIME) */}
            <div className="h-7 flex border-b border-neutral-800/80 text-[10px] font-mono text-neutral-500 shrink-0 bg-[#121212]">
              <div className="w-56 px-3.5 flex items-center border-r border-neutral-800/80 uppercase tracking-wider shrink-0">
                {viewMode === 'keyframes' ? 'LAYERS / PROPERTIES' : 'VALUE / TIME'}
              </div>
              <div
                ref={trackAreaRef}
                onPointerDown={handleTrackScrub}
                className="flex-1 relative flex items-center justify-between px-3 cursor-pointer"
              >
                {rulerTicks.map((tVal, idx) => {
                  const isCurrent = Math.abs(localTime - tVal) < displayDuration * 0.05;
                  return (
                    <span
                      key={idx}
                      className={`px-1.5 py-0.5 rounded ${
                        isCurrent ? 'bg-white text-black font-bold' : 'text-neutral-500'
                      }`}
                    >
                      {formatTimecode(tVal, fps).replace(/^00:/, '')}
                    </span>
                  );
                })}

                {/* User Markers */}
                {(activeScene?.markers || markers).map((mk) => {
                  const leftPct = Math.min(100, Math.max(0, (mk.time / duration) * 100));
                  return (
                    <div
                      key={mk.id}
                      style={{ left: `${leftPct}%` }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSeekLocalTime(mk.time);
                      }}
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        if (onDeleteMarker) onDeleteMarker(mk.id);
                        else setMarkers((prev) => prev.filter((m) => m.id !== mk.id));
                      }}
                      className="absolute top-0 bottom-0 w-1 -translate-x-1/2 z-20 cursor-pointer group"
                      title={`${mk.label} at ${mk.time.toFixed(2)}s (Click to seek, double click to delete)`}
                    >
                      <div
                        style={{ backgroundColor: mk.color || '#f59e0b' }}
                        className="w-full h-full opacity-75 group-hover:opacity-100"
                      />
                      <div className="hidden group-hover:flex absolute -top-4 left-1/2 -translate-x-1/2 px-1 py-0.5 rounded bg-black border border-neutral-700 text-[9px] font-mono text-amber-300 whitespace-nowrap shadow-lg">
                        {mk.label}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* =========================================================
                VIEW MODE 1: KEYFRAMES TRACK LIST (Screenshots 15, 17, 19, 32)
               ========================================================= */}
            {viewMode === 'keyframes' ? (
              <div className="max-h-36 overflow-y-auto custom-scrollbar divide-y divide-neutral-800/40 relative">
                {(activeScene.layers || []).map((layer, layerIdx) => {
                  const isSelected = layer.id === selectedLayerId;
                  const kfs = layer.keyframes || [];
                  const isExpanded =
                    expandedLayerIds[layer.id] !== undefined
                      ? expandedLayerIds[layer.id]
                      : isSelected && kfs.length > 0 && layerIdx === 0;

                  // Distinct properties animated on this layer (or default Position Y & Opacity when expanded)
                  const animatedProps = Array.from(
                    new Set(kfs.map((k) => k.prop).filter(Boolean))
                  );
                  const subPropsToShow =
                    animatedProps.length > 0 ? animatedProps : ['posY', 'opacity'];

                  // Clip bar width proportional to scene duration over displayDuration
                  const clipWidthPct = Math.min(
                    100,
                    Math.max(15, (duration / displayDuration) * 100)
                  );
                  const sceneFrames = Math.round(duration * fps);

                  return (
                    <React.Fragment key={layer.id}>
                      {/* Main Layer Row */}
                      <div
                        onClick={() => setSelectedLayerId(layer.id)}
                        className={`h-8 flex items-center cursor-pointer transition-colors ${
                          isSelected ? 'bg-[#102418]' : 'hover:bg-neutral-900/60'
                        }`}
                      >
                        {/* Left Column: Chevron + Icon + Layer Name + Keyframe Count */}
                        <div className="w-56 px-3.5 h-full flex items-center justify-between border-r border-neutral-800/80 shrink-0">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <button
                              type="button"
                              onClick={(e) => toggleLayerExpanded(layer.id, e)}
                              className="p-0.5 text-neutral-400 hover:text-white shrink-0"
                            >
                              {isExpanded ? (
                                <ChevronDown className="w-3 h-3" />
                              ) : (
                                <ChevronRight className="w-3 h-3" />
                              )}
                            </button>
                            {layer.type === 'text' ? (
                              <Type className="w-3 h-3 text-neutral-400 shrink-0" />
                            ) : (
                              <Sparkles className="w-3 h-3 text-neutral-400 shrink-0" />
                            )}
                            <span className="text-xs font-medium text-neutral-200 truncate">
                              {layer.name}
                            </span>
                          </div>
                          <span className="px-1.5 py-0.5 rounded bg-[#222222] text-[10px] font-mono text-neutral-400">
                            {kfs.length}
                          </span>
                        </div>

                        {/* Right Column: Clip Duration Bar & Keyframe Diamonds */}
                        <div
                          onPointerDown={handleTrackScrub}
                          className="flex-1 h-full relative px-2 flex items-center"
                        >
                          <div
                            style={{ width: `${clipWidthPct}%` }}
                            className={`h-5 rounded-md border flex items-center px-2 relative ${
                              isSelected
                                ? 'bg-[#159947]/25 border-[#22c55e]/80'
                                : 'bg-[#222222] border-neutral-700/70'
                            }`}
                          >
                            {/* Left/Right clip trim handles when selected */}
                            {isSelected && (
                              <>
                                <span className="w-1 h-3 rounded-full bg-white/80 mr-1.5 shrink-0" />
                                <span className="text-[10px] font-mono text-neutral-300">
                                  {sceneFrames}f
                                </span>
                                <span className="w-1 h-3 rounded-full bg-white/80 ml-auto shrink-0" />
                              </>
                            )}
                            {!isSelected && (
                              <span className="text-[10px] font-mono text-neutral-400">
                                {sceneFrames}f
                              </span>
                            )}

                            {/* Keyframe markers inside clip bar */}
                            {kfs.map((kf) => {
                              const leftPct = Math.min(
                                98,
                                Math.max(2, (kf.time / duration) * 100)
                              );
                              return (
                                <button
                                  key={kf.id}
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onSeekLocalTime(kf.time);
                                  }}
                                  onDoubleClick={(e) => {
                                    e.stopPropagation();
                                    onDeleteKeyframe(layer.id, kf.id);
                                  }}
                                  style={{ left: `${leftPct}%` }}
                                  className="absolute -translate-x-1/2 w-2 h-2 rotate-45 bg-white border border-black shadow z-10 hover:scale-125 transition-transform"
                                  title={`${kf.prop}: ${kf.value} @ ${kf.time.toFixed(2)}s`}
                                />
                              );
                            })}
                          </div>

                          {/* Playhead vertical line */}
                          <div
                            style={{ left: `${playheadPercent * (clipWidthPct / 100)}%` }}
                            className="absolute top-0 bottom-0 w-px bg-white pointer-events-none z-20"
                          />
                        </div>
                      </div>

                      {/* Expanded Property Sub-Rows (Screenshot 32: Position Y 38% ◆, Opacity 0% ◆) */}
                      {isExpanded &&
                        subPropsToShow.map((propKey) => {
                          const propKfs = kfs
                            .filter((k) => k.prop === propKey)
                            .sort((a, b) => a.time - b.time);

                          return (
                            <div
                              key={`${layer.id}_${propKey}`}
                              className="h-7 flex items-center bg-[#121214] text-xs"
                            >
                              <div className="w-56 pl-8 pr-3 h-full flex items-center justify-between border-r border-neutral-800/80 shrink-0">
                                <span className="text-[11px] text-neutral-300 truncate">
                                  {PROPERTY_LABELS[propKey] || propKey}
                                </span>
                                <div className="flex items-center gap-2 shrink-0">
                                  <span className="text-[11px] font-mono text-neutral-400">
                                    {getPropertyDisplayPercent(layer, propKey)}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedLayerId(layer.id);
                                      onAddKeyframe(propKey);
                                    }}
                                    className="w-2.5 h-2.5 rotate-45 bg-white hover:bg-[#22c55e] transition-colors"
                                    title={`Add ${PROPERTY_LABELS[propKey] || propKey} keyframe at playhead`}
                                  />
                                </div>
                              </div>

                              <div
                                onPointerDown={handleTrackScrub}
                                className="flex-1 h-full relative px-2 flex items-center"
                              >
                                <div
                                  style={{ width: `${clipWidthPct}%` }}
                                  className="h-full relative flex items-center"
                                >
                                  {/* Capsule connecting keyframe spans */}
                                  {propKfs.length >= 2 && (
                                    <div
                                      style={{
                                        left: `${Math.max(0, (propKfs[0].time / duration) * 100)}%`,
                                        width: `${Math.min(
                                          100,
                                          ((propKfs[propKfs.length - 1].time - propKfs[0].time) /
                                            duration) *
                                            100
                                        )}%`,
                                      }}
                                      className="absolute h-3 rounded-full bg-neutral-700/60 border border-neutral-500/60"
                                    />
                                  )}

                                  {propKfs.map((kf) => {
                                    const leftPct = Math.min(
                                      98,
                                      Math.max(2, (kf.time / duration) * 100)
                                    );
                                    const isKfSelected = selectedKeyframeIds.includes(kf.id);
                                    return (
                                      <button
                                        key={kf.id}
                                        type="button"
                                        onClick={(e) => {
                                          handleSelectKeyframe(kf.id, e);
                                          onSeekLocalTime(kf.time);
                                        }}
                                        onPointerDown={(e) => {
                                          e.stopPropagation();
                                          handleSelectKeyframe(kf.id, e);
                                          const startClientX = e.clientX;
                                          const origTime = kf.time;
                                          const handleMove = (ev) => {
                                            const dx = ev.clientX - startClientX;
                                            const timeDelta = (dx / 600) * duration;
                                            let newTime = Math.max(
                                              0,
                                              Math.min(duration, Number((origTime + timeDelta).toFixed(3)))
                                            );
                                            if (snapToBeats && !ev.altKey) {
                                              newTime = snapTimeToFrame(newTime, fps);
                                            }
                                            onUpdateKeyframe?.(layer.id, kf.id, { time: newTime });
                                          };
                                          const handleUp = () => {
                                            window.removeEventListener('pointermove', handleMove);
                                            window.removeEventListener('pointerup', handleUp);
                                          };
                                          window.addEventListener('pointermove', handleMove);
                                          window.addEventListener('pointerup', handleUp);
                                        }}
                                        onDoubleClick={(e) => {
                                          e.stopPropagation();
                                          onDeleteKeyframe?.(layer.id, kf.id);
                                        }}
                                        style={{ left: `${leftPct}%` }}
                                        className={`absolute -translate-x-1/2 w-2.5 h-2.5 rounded-full z-10 cursor-ew-resize transition-all ${
                                          isKfSelected
                                            ? 'bg-[#22c55e] border-2 border-white ring-2 ring-[#22c55e]/60 scale-125'
                                            : 'bg-white border border-black hover:scale-125'
                                        }`}
                                        title={`${PROPERTY_LABELS[kf.prop] || kf.prop}: ${kf.value} @ ${kf.time.toFixed(2)}s (${kf.interpolation || kf.easing || 'ease'})`}
                                      />
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </React.Fragment>
                  );
                })}
              </div>
            ) : (
              /* =========================================================
                  VIEW MODE 2: VALUE GRAPH (Screenshots 33 & 34)
                 ========================================================= */
              <div className="flex flex-col bg-[#111111]">
                {/* Graph Header Sub-bar (Screenshot 33 & 34) */}
                <div className="h-8 px-3.5 border-b border-neutral-800/80 flex items-center justify-between text-xs bg-[#151515]">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white">
                      {selectedLayer ? selectedLayer.name : 'Title'}
                    </span>
                    <select
                      value={activeProp}
                      onChange={(e) => setActiveProp(e.target.value)}
                      className="px-2 py-0.5 rounded bg-[#222222] border border-neutral-700 text-xs text-white focus:outline-none"
                    >
                      <option value="posX">Position X</option>
                      <option value="posY">Position Y</option>
                      <option value="scale">Scale</option>
                      <option value="rotation">Rotation</option>
                      <option value="opacity">Opacity</option>
                    </select>
                  </div>
                  <span className="text-[11px] text-neutral-400">
                    Value over time · audio offsets are evaluated at the playhead
                  </span>
                </div>

                {/* Value Graph Plot Area (Screenshot 34) */}
                <div
                  onPointerDown={handleTrackScrub}
                  className="h-32 relative flex flex-col justify-between px-4 py-2 cursor-crosshair overflow-hidden"
                >
                  <div className="text-[11px] font-mono text-neutral-300 z-10">
                    {selectedLayer ? selectedLayer.name : 'Title'} &nbsp;
                    {PROPERTY_LABELS[activeProp]} · %
                  </div>

                  {/* Y-Axis Ticks & Dynamic Value Curve */}
                  {(() => {
                    const samples = 48;
                    const points = [];
                    let minVal = Infinity;
                    let maxVal = -Infinity;

                    for (let i = 0; i <= samples; i++) {
                      const t = (i / samples) * duration;
                      const evalState = evaluateLayerKeyframes(selectedLayer || {}, t);
                      let v = 0;
                      if (activeProp === 'scale') v = evalState.scale ?? 1;
                      else if (activeProp === 'opacity') v = evalState.opacity ?? 1;
                      else if (activeProp === 'rotation') v = evalState.rotation || 0;
                      else if (activeProp === 'posY') v = evalState.posY || 675;
                      else v = evalState.posX || 540;

                      if (v < minVal) minVal = v;
                      if (v > maxVal) maxVal = v;
                      points.push({ t, v });
                    }

                    if (minVal === maxVal) {
                      minVal -= 1;
                      maxVal += 1;
                    }
                    const valRange = maxVal - minVal;

                    const pathD = points
                      .map((pt, idx) => {
                        const xPct = (pt.t / duration) * 100;
                        const yPct = 100 - ((pt.v - minVal) / valRange) * 80 - 10;
                        return `${idx === 0 ? 'M' : 'L'} ${xPct.toFixed(1)} ${yPct.toFixed(1)}`;
                      })
                      .join(' ');

                    return (
                      <div className="flex-1 flex items-center relative my-1">
                        <div className="w-12 h-full flex flex-col justify-between text-[10px] font-mono text-neutral-400 pr-2 text-right border-r border-neutral-700/80 shrink-0">
                          <span>{maxVal >= 10 ? Math.round(maxVal) : maxVal.toFixed(1)}</span>
                          <span>{((maxVal + minVal) / 2).toFixed(1)}</span>
                          <span>{minVal >= 10 ? Math.round(minVal) : minVal.toFixed(1)}</span>
                        </div>

                        <div className="flex-1 h-full relative">
                          {[0, 25, 50, 75, 100].map((pct) => (
                            <div
                              key={pct}
                              style={{ top: `${pct}%` }}
                              className="absolute left-0 right-0 h-px bg-neutral-800/80"
                            />
                          ))}

                          {/* Dynamic SVG Value Curve across Time */}
                          <svg
                            className="w-full h-full overflow-visible"
                            viewBox="0 0 100 100"
                            preserveAspectRatio="none"
                          >
                            <path
                              d={pathD}
                              fill="none"
                              stroke="#22c55e"
                              strokeWidth="2.5"
                              vectorEffect="non-scaling-stroke"
                            />
                            {/* Keyframe Nodes on Curve (Click to select & edit interpolation) */}
                            {(selectedLayer?.keyframes || [])
                              .filter((k) => k.prop === activeProp)
                              .map((k) => {
                                const kx = (k.time / duration) * 100;
                                const ky = 100 - ((k.value - minVal) / valRange) * 80 - 10;
                                const isKfSelected = selectedKeyframeIds.includes(k.id);
                                return (
                                  <circle
                                    key={k.id}
                                    cx={`${kx}%`}
                                    cy={`${ky}%`}
                                    r={isKfSelected ? 5.5 : 4}
                                    fill={isKfSelected ? '#22c55e' : '#ffffff'}
                                    stroke={isKfSelected ? '#ffffff' : '#159947'}
                                    strokeWidth={isKfSelected ? 2.5 : 2}
                                    className="cursor-pointer hover:scale-125 transition-transform"
                                    onClick={(e) => {
                                      handleSelectKeyframe(k.id, e);
                                      onSeekLocalTime(k.time);
                                    }}
                                  >
                                    <title>{`${k.prop}: ${k.value} @ ${k.time.toFixed(2)}s (${k.interpolation || k.easing || 'ease'})`}</title>
                                  </circle>
                                );
                              })}
                          </svg>

                          {/* Vertical Playhead Line */}
                          <div
                            style={{ left: `${playheadPercent}%` }}
                            className="absolute top-0 bottom-0 w-0.5 bg-white pointer-events-none z-10"
                          />
                        </div>
                      </div>
                    );
                  })()}

                  <div className="text-[10px] font-mono text-neutral-500 pl-12">
                    Click keyframe nodes on curve to edit Bézier interpolation or time/value.
                  </div>
                </div>

                {/* Keyframe Curve & Bézier Inspector Sub-Bar (Fase 4) */}
                {(() => {
                  const activeKf =
                    (selectedLayer?.keyframes || []).find((k) => selectedKeyframeIds.includes(k.id)) ||
                    (selectedLayer?.keyframes || []).find((k) => k.prop === activeProp);

                  if (!activeKf) {
                    return (
                      <div className="h-8 px-4 border-t border-neutral-800/80 bg-[#161616] flex items-center justify-between text-[11px] text-neutral-500 font-mono">
                        <span>No keyframe selected on {PROPERTY_LABELS[activeProp] || activeProp}</span>
                        <button
                          type="button"
                          onClick={() => onAddKeyframe(activeProp)}
                          className="px-2 py-0.5 rounded bg-[#222222] hover:bg-[#282828] text-neutral-300 hover:text-white border border-neutral-700"
                        >
                          + Add keyframe at {localTime.toFixed(2)}s
                        </button>
                      </div>
                    );
                  }

                  const interp = activeKf.interpolation || activeKf.easing || 'easeOutCubic';
                  const bz = activeKf.bezier || [0.25, 0.1, 0.25, 1.0];

                  return (
                    <div className="px-3.5 py-2 border-t border-neutral-800/80 bg-[#141414] flex flex-wrap items-center justify-between gap-3 text-xs">
                      {/* Left: Time & Value Numeric Inputs */}
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5 font-mono">
                          <span className="text-[11px] text-neutral-400">Time:</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            max={duration}
                            value={Number.isFinite(activeKf.time) ? activeKf.time : 0}
                            onChange={(e) =>
                              onUpdateKeyframe?.(selectedLayer.id, activeKf.id, {
                                time: Math.max(0, Number(Number(e.target.value || 0).toFixed(3))),
                              })
                            }
                            className="w-14 px-1.5 py-0.5 rounded bg-[#202020] border border-neutral-700 text-center text-white text-[11px]"
                          />
                          <span className="text-[10px] text-neutral-500">s</span>
                        </div>

                        <div className="flex items-center gap-1.5 font-mono">
                          <span className="text-[11px] text-neutral-400">Value:</span>
                          <input
                            type="number"
                            step="1"
                            value={Number.isFinite(activeKf.value) ? activeKf.value : 0}
                            onChange={(e) =>
                              onUpdateKeyframe?.(selectedLayer.id, activeKf.id, {
                                value: Number(e.target.value) || 0,
                              })
                            }
                            className="w-16 px-1.5 py-0.5 rounded bg-[#202020] border border-neutral-700 text-center text-white text-[11px]"
                          />
                        </div>

                        <div className="h-4 w-px bg-neutral-800 mx-1" />

                        {/* Interpolation Selector */}
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] text-neutral-400">Curve:</span>
                          <select
                            value={interp}
                            onChange={(e) => {
                              const val = e.target.value;
                              onUpdateKeyframe?.(selectedLayer.id, activeKf.id, {
                                interpolation: val,
                                easing: val,
                                ...(val === 'bezier' && !activeKf.bezier
                                  ? { bezier: [0.25, 0.1, 0.25, 1.0] }
                                  : {}),
                              });
                            }}
                            className="px-2 py-0.5 rounded bg-[#202020] border border-neutral-700 text-xs text-white focus:outline-none"
                          >
                            <option value="linear">Linear</option>
                            <option value="ease">Ease (CSS)</option>
                            <option value="easeIn">Ease In</option>
                            <option value="easeOut">Ease Out</option>
                            <option value="easeInOut">Ease In Out</option>
                            <option value="bezier">Custom Bézier</option>
                            <option value="easeOutCubic">Cubic Ease Out</option>
                            <option value="easeInOutCubic">Cubic Ease In Out</option>
                            <option value="easeOutBack">Back Ease (Overshoot)</option>
                          </select>
                        </div>
                      </div>

                      {/* Right: Custom Bézier Handles & Presets when 'bezier' is active */}
                      {interp === 'bezier' && (
                        <div className="flex items-center gap-2 animate-fade-in">
                          <div className="flex items-center gap-1">
                            {Object.entries(BEZIER_PRESETS).slice(0, 4).map(([pKey, pVal]) => (
                              <button
                                key={pKey}
                                type="button"
                                onClick={() =>
                                  onUpdateKeyframe?.(selectedLayer.id, activeKf.id, {
                                    interpolation: 'bezier',
                                    easing: 'bezier',
                                    bezier: pVal.coords,
                                  })
                                }
                                className="px-1.5 py-0.5 rounded bg-[#202020] hover:bg-[#282828] border border-neutral-800 hover:border-neutral-700 text-[10px] text-neutral-300"
                              >
                                {pVal.label}
                              </button>
                            ))}
                          </div>

                          {/* Bézier Coordinate Inputs [cp1x, cp1y, cp2x, cp2y] */}
                          <div className="flex items-center gap-1 font-mono text-[10px] text-neutral-400">
                            <span>[</span>
                            {[0, 1, 2, 3].map((idx) => (
                              <input
                                key={idx}
                                type="number"
                                step="0.05"
                                value={Number.isFinite(bz[idx]) ? bz[idx] : 0}
                                onChange={(e) => {
                                  const nextBz = [...bz];
                                  nextBz[idx] = Number(e.target.value) || 0;
                                  onUpdateKeyframe?.(selectedLayer.id, activeKf.id, {
                                    interpolation: 'bezier',
                                    easing: 'bezier',
                                    bezier: nextBz,
                                  });
                                }}
                                className="w-10 px-1 py-0.5 rounded bg-[#1a1a1a] border border-neutral-700 text-center text-white"
                              />
                            ))}
                            <span>]</span>
                          </div>

                          {/* Mini SVG Bézier curve preview */}
                          <svg className="w-8 h-6 bg-[#1a1a1a] border border-neutral-700 rounded" viewBox="0 0 100 100">
                            <path
                              d={`M 0 100 C ${bz[0] * 100} ${100 - bz[1] * 100}, ${bz[2] * 100} ${100 - bz[3] * 100}, 100 0`}
                              fill="none"
                              stroke="#22c55e"
                              strokeWidth="4"
                            />
                          </svg>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Bottom Helper / Keyframe Step Footer Bar (Screenshots 15, 17, 32, 33) */}
            <div className="h-7 px-3.5 border-t border-neutral-800/80 bg-[#121212] flex items-center gap-2 text-[11px] text-neutral-400">
              {totalKeyframes > 0 ? (
                <>
                  <div className="flex items-center gap-1 text-neutral-500">
                    <button
                      type="button"
                      onClick={() => onSeekLocalTime(Math.max(0, localTime - 0.25))}
                      className="hover:text-white p-0.5"
                      title="Previous keyframe"
                    >
                      <SkipBack className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onSeekLocalTime(Math.min(duration, localTime + 0.25))}
                      className="hover:text-white p-0.5"
                      title="Next keyframe"
                    >
                      <SkipForward className="w-3 h-3" />
                    </button>
                  </div>
                  <span className="truncate">
                    Shift-click or drag an area to select keys. Ctrl/Cmd+A selects visible keys;
                    Ctrl/Cmd+D duplicates after the selection.
                  </span>
                </>
              ) : (
                <span>Choose a property above to start animating.</span>
              )}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
