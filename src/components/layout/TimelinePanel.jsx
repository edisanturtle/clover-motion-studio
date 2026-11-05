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
} from 'lucide-react';
import { formatTimecode } from '../../utils/timecode';
import { evaluateLayerKeyframes } from '../../engine/canvasRenderer';

const PROPERTY_LABELS = {
  posX: 'Position X',
  posY: 'Position Y',
  scale: 'Scale',
  rotation: 'Rotation',
  opacity: 'Opacity',
};

export default function TimelinePanel({
  project,
  activeScene,
  activeSceneIndex = 0,
  setActiveSceneIndex,
  selectedLayer,
  selectedLayerId,
  setSelectedLayerId,
  localTime,
  isPlaying,
  loopPlayback,
  setLoopPlayback,
  timelineExpanded = true,
  setTimelineExpanded,
  onTogglePlay,
  onRestart,
  onSeekLocalTime,
  onAddKeyframe,
  onDeleteKeyframe,
  onClearLayerKeyframes,
  onUpdateSceneDuration,
  onChangeFps,
}) {
  const [viewMode, setViewMode] = useState('keyframes'); // 'keyframes' | 'graph'
  const [activeProp, setActiveProp] = useState('posX'); // 'posX' | 'posY' | 'scale' | 'rotation' | 'opacity'
  const [toolsOpen, setToolsOpen] = useState(false);
  const [snapToBeats, setSnapToBeats] = useState(true);
  const [markers, setMarkers] = useState([]);
  const [copiedKeyframes, setCopiedKeyframes] = useState([]);
  const [expandedLayerIds, setExpandedLayerIds] = useState({});
  const trackAreaRef = useRef(null);

  if (!activeScene) return null;

  const duration = activeScene.duration || 4;
  const totalProjectDuration = (project?.scenes || []).reduce(
    (acc, sc) => acc + (sc.duration || 4),
    0
  );
  const displayDuration =
    (project?.scenes?.length || 1) > 1 ? totalProjectDuration : duration;
  const fps = project?.fps || 30;
  const totalFrames = Math.round(displayDuration * fps);

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
    onSeekLocalTime(ratio * duration);
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
  const playheadPercent = Math.min(100, Math.max(0, (localTime / duration) * 100));

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
        <div className="h-11 bg-[#161616] border border-neutral-800/80 rounded-2xl px-3.5 flex items-center gap-3">
          <span className="text-xs font-medium text-neutral-300 shrink-0">Scenes</span>
          <div className="flex-1 flex items-center gap-2 h-7">
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
                  className={`h-full px-3 rounded-lg border flex items-center gap-1.5 text-xs transition-all overflow-hidden ${
                    active
                      ? 'bg-[#159947]/20 border-[#22c55e] text-white font-semibold shadow-sm'
                      : 'bg-[#1b1b1b] border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-700'
                  }`}
                >
                  <span className="font-mono text-[10px] text-neutral-400 shrink-0">{num}</span>
                  <span className="truncate">{sc.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Timeline Card */}
      <section className="bg-[#161616] border border-neutral-800/80 rounded-2xl flex flex-col overflow-hidden relative">
        {/* Subtle top pill handle (Screenshot 34) */}
        <div className="w-full flex justify-center pt-1 pb-0.5">
          <div className="w-8 h-1 rounded-full bg-neutral-700/70" />
        </div>

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
                value={displayDuration}
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
                    onClick={() => onSeekLocalTime(Math.max(0, localTime - 1 / fps))}
                    className="p-1 rounded hover:bg-neutral-800 text-neutral-400 hover:text-white"
                    title="Previous frame"
                  >
                    <SkipBack className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onSeekLocalTime(Math.min(duration, localTime + 1 / fps))}
                    className="p-1 rounded hover:bg-neutral-800 text-neutral-400 hover:text-white"
                    title="Next frame"
                  >
                    <SkipForward className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={onRestart}
                    className="p-1 rounded hover:bg-neutral-800 text-neutral-400 hover:text-white"
                    title="Jump to start"
                  >
                    <SkipBack className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={onTogglePlay}
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
                  >
                    <Repeat className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="h-3.5 w-px bg-neutral-800 mx-1" />

                {/* Timecode Display */}
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-neutral-400">Timecode</span>
                  <span className="px-2 py-0.5 rounded bg-[#202020] border border-neutral-800 font-mono text-[11px] text-white">
                    {formatTimecode(localTime, fps)}
                  </span>
                </div>

                {/* Duration Input */}
                <div className="flex items-center gap-1.5 text-xs ml-2">
                  <span className="text-neutral-400">Duration</span>
                  <input
                    type="number"
                    min={1}
                    max={120}
                    value={displayDuration}
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
                      onChange={(e) => onChangeFps?.(Number(e.target.value))}
                      className="px-2 py-1 rounded-lg bg-[#1e1e1e] border border-neutral-800 text-xs text-white focus:outline-none"
                    >
                      <option value={24}>24 fps</option>
                      <option value={30}>30 fps</option>
                      <option value={60}>60 fps</option>
                    </select>
                    <button
                      type="button"
                      className="p-1.5 rounded-lg bg-[#1e1e1e] border border-neutral-800 text-neutral-400 hover:text-white"
                      title="Vertical zoom"
                    >
                      <ArrowUpDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      className="p-1.5 rounded-lg bg-[#1e1e1e] border border-neutral-800 text-neutral-400 hover:text-white"
                      title="Zoom timeline"
                    >
                      <Search className="w-3.5 h-3.5" />
                    </button>
                    <select
                      defaultValue="fit"
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
                      onClick={() => onAddKeyframe(activeProp)}
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
                      className="flex items-center gap-1 text-xs font-medium text-neutral-200"
                    >
                      <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
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
                      onClick={handleAddMarker}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#1e1e1e] hover:bg-neutral-800 border border-neutral-800 text-xs text-neutral-200"
                    >
                      <Activity className="w-3 h-3 text-neutral-400" />
                      <span>Find beats</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onAddKeyframe(activeProp)}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#1e1e1e] hover:bg-neutral-800 border border-neutral-800 text-xs text-neutral-200"
                    >
                      <Waves className="w-3 h-3 text-neutral-400" />
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
                {markers.map((mk) => {
                  const leftPct = Math.min(100, Math.max(0, (mk.time / duration) * 100));
                  return (
                    <div
                      key={mk.id}
                      style={{ left: `${leftPct}%` }}
                      className="absolute top-0 bottom-0 w-0.5 bg-amber-400 z-20"
                      title={mk.label}
                    />
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
                                    return (
                                      <button
                                        key={kf.id}
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          onSeekLocalTime(kf.time);
                                        }}
                                        style={{ left: `${leftPct}%` }}
                                        className="absolute -translate-x-1/2 w-2 h-2 rounded-full bg-white border border-black z-10"
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

                  {/* Y-Axis Ticks & Horizontal Grid Lines */}
                  <div className="flex-1 flex items-center relative my-1">
                    <div className="w-10 h-full flex flex-col justify-between text-[10px] font-mono text-neutral-500 pr-2 text-right border-r border-neutral-700/80 shrink-0">
                      <span>17</span>
                      <span>16.5</span>
                      <span>16</span>
                      <span>15.5</span>
                      <span>15</span>
                    </div>

                    <div className="flex-1 h-full relative">
                      {[0, 25, 50, 75, 100].map((pct) => (
                        <div
                          key={pct}
                          style={{ top: `${pct}%` }}
                          className="absolute left-0 right-0 h-px bg-neutral-800/80"
                        />
                      ))}

                      {/* Clover Green Value Line across Time */}
                      <svg className="w-full h-full overflow-visible" preserveAspectRatio="none">
                        <line
                          x1="0%"
                          y1="50%"
                          x2="100%"
                          y2="50%"
                          stroke="#22c55e"
                          strokeWidth="2"
                        />
                      </svg>

                      {/* Vertical Playhead Line */}
                      <div
                        style={{ left: `${playheadPercent}%` }}
                        className="absolute top-0 bottom-0 w-0.5 bg-white pointer-events-none"
                      />
                    </div>
                  </div>

                  <div className="text-[10px] font-mono text-neutral-500 pl-12">
                    Drag keys to edit time and value. Shift-click or drag an area to select several.
                  </div>
                </div>
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
