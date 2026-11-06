'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Film,
  Clapperboard,
  Play,
  Pause,
  RotateCcw,
  Clock,
  Download,
  Scissors,
  Trash2,
  Plus,
  Eye,
  EyeOff,
  Volume2,
  VolumeX,
  Sliders,
  Crop,
  Layers,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Maximize2,
  FileVideo,
  Monitor,
  Subtitles,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  FolderOpen,
  Info,
} from 'lucide-react';
import { formatTimecode } from '../../utils/timecode';
import { ASPECT_RATIOS } from '../../constants/fonts';
import {
  preflightVideoAsset,
  diagnoseMediaError,
  KNOWN_DECODER_PROFILES,
  NORMAL_SIZE_CEILING_BYTES,
  LARGE_MEDIA_THRESHOLD_BYTES,
} from '../../core/services/videoDecoderPreflight.js';
import {
  SUPPORTED_TRANSITIONS,
  SUPPORTED_BLEND_MODES,
} from '../../core/domain/videoModels.js';
import {
  renderVideoClipToCanvas,
  evaluateActiveVideoClipsAtTime,
} from '../../core/services/videoService.js';

const safeNum = (v, fallback) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);

export default function VideoWorkspaceView({
  project,
  activeSceneIndex,
  setActiveSceneIndex,
  isPlaying,
  onTogglePlay,
  onRestart,
  localTime = 0,
  currentGlobalTime = 0,
  totalProjectDuration = 12,
  onSeekLocalTime,
  onAddVideoTrack,
  onDeleteVideoTrack,
  onUpdateVideoTrack,
  onAddVideoClip,
  onUpdateVideoClip,
  onSplitVideoClip,
  onTrimVideoClip,
  onRippleDeleteVideoClip,
  onUpdateClipTransform,
  onUpdateClipCrop,
  onSetClipTransition,
  onUpdateClipCaptions,
  onImportVideoFile,
  onSwitchToAnimate,
  onOpenExport,
}) {
  const [selectedClipId, setSelectedClipId] = useState(null);
  const [selectedTrackId, setSelectedTrackId] = useState(null);
  const [sourceInPoint, setSourceInPoint] = useState(0);
  const [sourceOutPoint, setSourceOutPoint] = useState(4.0);
  const [sourcePlayhead, setSourcePlayhead] = useState(0);
  const [isSourcePlaying, setIsSourcePlaying] = useState(false);
  const [preflightResult, setPreflightResult] = useState(null);
  const [preflightModalOpen, setPreflightModalOpen] = useState(false);
  const [isGeneratingProxy, setIsGeneratingProxy] = useState(false);
  const [activeInspectorTab, setActiveInspectorTab] = useState('transform'); // 'transform' | 'crop' | 'transitions' | 'captions' | 'codec'

  const fileInputRef = useRef(null);
  const programCanvasRef = useRef(null);
  const sourceVideoRef = useRef(null);

  const videoTracks = project?.videoTracks || [];
  const dim = ASPECT_RATIOS[project?.ratio] || ASPECT_RATIOS['4:5'];

  // Identify currently selected clip across tracks
  let selectedClip = null;
  let selectedParentTrack = null;
  for (const track of videoTracks) {
    const found = track.clips?.find((c) => c.id === selectedClipId);
    if (found) {
      selectedClip = found;
      selectedParentTrack = track;
      break;
    }
  }

  // Fallback to select first clip if none selected
  useEffect(() => {
    if (!selectedClipId && videoTracks[0]?.clips?.length > 0) {
      setSelectedClipId(videoTracks[0].clips[0].id);
      setSelectedTrackId(videoTracks[0].id);
    }
  }, [selectedClipId, videoTracks]);

  // Program Canvas Render Loop
  useEffect(() => {
    const canvas = programCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. Dark background
    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 2. Composite video tracks
    const activeClips = evaluateActiveVideoClipsAtTime(videoTracks, localTime);
    if (activeClips.length > 0) {
      for (const state of activeClips) {
        renderVideoClipToCanvas({
          ctx,
          width: canvas.width,
          height: canvas.height,
          clip: state.clip,
          sourceElement: null, // Renders high-contrast video plate in simulator
          transitionIn: state.transitionIn,
          transitionOut: state.transitionOut,
          activeCaption: state.activeCaption,
        });
      }
    } else {
      // Empty slate
      ctx.fillStyle = '#1e293b';
      ctx.font = '13px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('NO VIDEO CLIP AT PLAYHEAD', canvas.width / 2, canvas.height / 2);
    }

    // 3. Composite Scene Graphic/Text Overlays
    const activeScene = project?.scenes?.[activeSceneIndex] || project?.scenes?.[0];
    if (activeScene?.layers) {
      for (const layer of activeScene.layers) {
        if (layer.visible === false) continue;
        ctx.save();
        ctx.fillStyle = layer.color || '#ffffff';
        ctx.font = `bold ${Math.round(canvas.height * 0.045)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const posX = canvas.width / 2 + (layer.x || 0);
        const posY = canvas.height * 0.35 + (layer.y || 0);
        ctx.fillText(layer.text || layer.name || 'Graphic Overlay', posX, posY);
        ctx.restore();
      }
    }

    ctx.restore();
  }, [videoTracks, localTime, activeSceneIndex, project]);

  // File Upload Preflight Flow
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Run Preflight Verification
    const inspection = preflightVideoAsset(file);
    setPreflightResult(inspection);

    if (!inspection.ok) {
      // Trigger preflight refusal modal with diagnostic explanation
      setPreflightModalOpen(true);
      return;
    }

    if (onImportVideoFile) {
      onImportVideoFile(file);
    } else if (onAddVideoClip && videoTracks[0]) {
      // Add as local video clip directly
      const duration = 6.0;
      onAddVideoClip(videoTracks[0].id, {
        name: file.name,
        sourceDuration: duration,
        duration: duration,
        trimIn: 0,
        trimOut: duration,
        codec: inspection.details?.supportedDecoders?.[0] || 'H.264 High',
      });
    }

    e.target.value = '';
  };

  // Add Synthetic Calibrated Test Video Plate
  const handleAddSampleTestVideo = () => {
    if (!videoTracks[0]) {
      if (onAddVideoTrack) onAddVideoTrack('Video Track 1');
      return;
    }

    const targetTrack = videoTracks[0];
    const existingCount = targetTrack.clips?.length || 0;
    const startOffset = existingCount > 0
      ? (targetTrack.clips[existingCount - 1].startTime + targetTrack.clips[existingCount - 1].duration)
      : 0;

    const testClip = {
      name: `Swiss Drone Cut 0${existingCount + 1}.mp4`,
      startTime: startOffset,
      duration: 4.5,
      sourceDuration: 12.0,
      trimIn: 1.0,
      trimOut: 5.5,
      codec: 'avc1.64001F (H.264 High)',
      transitionIn: { type: existingCount === 0 ? 'fadeToBlack' : 'crossfade', duration: 0.6 },
      transitionOut: { type: 'crossfade', duration: 0.6 },
      captions: [
        {
          id: 'cap_1',
          startTime: 1.2,
          endTime: 4.0,
          text: 'ZÜRICH CREATIVE LABS · 47.3769° N',
          position: 'bottom',
        },
      ],
    };

    if (onAddVideoClip) {
      onAddVideoClip(targetTrack.id, testClip);
    }
  };

  // Proxy Generation Simulation
  const handleGenerateProxy = () => {
    if (!selectedClip) return;
    setIsGeneratingProxy(true);
    setTimeout(() => {
      setIsGeneratingProxy(false);
      if (onUpdateVideoClip) {
        onUpdateVideoClip(selectedClip.id, {
          hasProxy: true,
          proxyUrl: 'blob:proxy-360p-cached',
        });
      }
    }, 600);
  };

  return (
    <div className="flex-1 flex flex-col bg-[#0e0e0e] text-neutral-100 min-w-0 min-h-0 overflow-y-auto custom-scrollbar p-6 space-y-6">
      {/* Top Banner: Fase 7 Video Workstation */}
      <div className="bg-[#151515] border border-neutral-800 rounded-2xl p-5 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-full bg-gradient-to-l from-[#159947]/15 to-transparent pointer-events-none" />

        <div className="flex items-start justify-between gap-4 relative z-10 flex-wrap">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-[#159947]/20 text-[#4ade80] border border-[#22c55e]/40">
                Fase 7 · Video Editing Essentials
              </span>
              <span className="text-xs text-neutral-400 font-mono">
                Source/Program Dual-Monitor · WebCodecs & Canvas Compositing
              </span>
            </div>

            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2.5">
              <Film className="w-5 h-5 text-[#22c55e]" />
              <span>Multi-Track Video Compositor & Sequence Editor</span>
            </h2>

            <p className="text-xs text-neutral-300 leading-relaxed">
              Import local video with strict codec preflight, accurate frame seeking, non-destructive split/trim/ripple, transitions, still/text overlays, and broadcast captions.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="video/mp4,video/webm,video/ogg,video/quicktime,.mp4,.webm,.mov"
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3.5 py-2 rounded-xl bg-[#1c1c1c] hover:bg-neutral-800 border border-neutral-700 text-neutral-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <FolderOpen className="w-3.5 h-3.5 text-[#4ade80]" />
              <span>Import Video</span>
            </button>
            <button
              type="button"
              onClick={handleAddSampleTestVideo}
              className="px-3.5 py-2 rounded-xl bg-[#159947] hover:bg-[#19b353] border border-[#22c55e]/40 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-lg shadow-[#159947]/20"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Test Video Plate</span>
            </button>
            <button
              type="button"
              onClick={onOpenExport}
              className="px-3.5 py-2 rounded-xl bg-[#1c1c1c] hover:bg-neutral-800 border border-neutral-700 text-neutral-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-[#4ade80]" />
              <span>Export</span>
            </button>
          </div>
        </div>
      </div>

      {/* Preflight Refusal Modal */}
      {preflightModalOpen && preflightResult && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#181818] border border-red-500/50 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-400">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <div>
                <h3 className="text-base font-bold text-white">Video Preflight Refusal</h3>
                <span className="text-[11px] font-mono text-red-400">{preflightResult.code}</span>
              </div>
            </div>

            <div className="bg-[#121212] border border-neutral-800 rounded-xl p-4 space-y-2 text-xs text-neutral-300">
              <p className="font-semibold text-neutral-200">Rejection Reason:</p>
              <p className="leading-relaxed text-red-300">{preflightResult.reason}</p>

              <p className="font-semibold text-neutral-200 pt-2">Recommended Solution:</p>
              <p className="leading-relaxed text-neutral-400">{preflightResult.recommendation}</p>
            </div>

            <div className="space-y-1.5 text-[11px] font-mono text-neutral-400 bg-neutral-900/60 p-3 rounded-lg">
              <div>File Name: {preflightResult.details?.fileName}</div>
              <div>Detected Container: {preflightResult.details?.detectedContainer || 'Unknown'}</div>
              <div>Memory Ceiling: 500 MB</div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPreflightModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-semibold"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DUAL-MONITOR SECTION: Source Preview (Left) vs Program Master Preview (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT MONITOR: SOURCE PREVIEW */}
        <div className="bg-[#141414] border border-neutral-800/80 rounded-2xl p-4 flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileVideo className="w-4 h-4 text-neutral-400" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Source Monitor: {selectedClip?.name || 'Raw Media Clip'}
              </h3>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 border border-neutral-700">
              {selectedClip?.codec || 'H.264 Baseline'}
            </span>
          </div>

          {/* Source Monitor Viewport Box */}
          <div className="aspect-video bg-black rounded-xl border border-neutral-800 relative flex items-center justify-center overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/60 pointer-events-none" />
            <div className="text-center space-y-2 p-4">
              <Film className="w-10 h-10 text-neutral-600 mx-auto" />
              <div className="text-xs font-mono font-bold text-neutral-300">
                {selectedClip?.name || 'No Clip Selected'}
              </div>
              <div className="text-[11px] font-mono text-neutral-500">
                Trim In: {selectedClip ? `${selectedClip.trimIn}s` : '0.0s'} · Trim Out: {selectedClip ? `${selectedClip.trimOut}s` : '4.0s'}
              </div>
            </div>

            {/* In / Out Visual Boundary Indicator */}
            <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between text-[10px] font-mono text-[#4ade80] bg-black/60 px-3 py-1 rounded-lg backdrop-blur-sm border border-neutral-800">
              <span>Mark In: {sourceInPoint.toFixed(2)}s</span>
              <span>Span: {(sourceOutPoint - sourceInPoint).toFixed(2)}s</span>
              <span>Mark Out: {sourceOutPoint.toFixed(2)}s</span>
            </div>
          </div>

          {/* Source Monitor Transport Controls */}
          <div className="flex items-center justify-between gap-2 pt-1">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setIsSourcePlaying(!isSourcePlaying)}
                className="p-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200"
                title="Play/Pause Source"
              >
                {isSourcePlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
              </button>
              <button
                type="button"
                onClick={() => setSourceInPoint(sourcePlayhead)}
                className="px-2.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-[11px] font-mono text-neutral-300"
                title="Set In Point ([)"
              >
                Mark In [
              </button>
              <button
                type="button"
                onClick={() => setSourceOutPoint(sourcePlayhead)}
                className="px-2.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-[11px] font-mono text-neutral-300"
                title="Set Out Point (])"
              >
                Mark Out ]
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                if (videoTracks[0] && onAddVideoClip) {
                  onAddVideoClip(videoTracks[0].id, {
                    name: `${selectedClip?.name || 'Clip'} (Subclip)`,
                    trimIn: sourceInPoint,
                    trimOut: sourceOutPoint,
                    duration: Math.max(0.5, sourceOutPoint - sourceInPoint),
                  });
                }
              }}
              className="px-3 py-1.5 rounded-lg bg-[#159947] hover:bg-[#19b353] text-white text-xs font-semibold flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Insert to Timeline</span>
            </button>
          </div>
        </div>

        {/* RIGHT MONITOR: PROGRAM MASTER PREVIEW */}
        <div className="bg-[#141414] border border-neutral-800/80 rounded-2xl p-4 flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Monitor className="w-4 h-4 text-[#22c55e]" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Program Master Monitor: Timeline Playhead
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#159947]/20 text-[#4ade80] border border-[#22c55e]/40">
                {formatTimecode(localTime)}
              </span>
              <span className="text-[10px] font-mono text-neutral-400">
                {dim.width} × {dim.height} ({project?.ratio || '4:5'})
              </span>
            </div>
          </div>

          {/* Program Master Canvas Viewport */}
          <div className="aspect-video bg-black rounded-xl border border-neutral-800 relative flex items-center justify-center overflow-hidden">
            <canvas
              ref={programCanvasRef}
              width={640}
              height={360}
              className="w-full h-full object-contain"
            />
          </div>

          {/* Program Transport Controls */}
          <div className="flex items-center justify-between gap-2 pt-1">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={onTogglePlay}
                className="px-3 py-1.5 rounded-lg bg-[#159947] hover:bg-[#19b353] text-white text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-[#159947]/20"
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                <span>{isPlaying ? 'Pause' : 'Play Timeline'}</span>
              </button>
              <button
                type="button"
                onClick={onRestart}
                className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300"
                title="Restart"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono text-neutral-400">
              <span>Duration:</span>
              <span className="text-white font-bold">{totalProjectDuration}s</span>
            </div>
          </div>
        </div>
      </div>

      {/* MULTI-TRACK VIDEO TIMELINE & EDITING STRIP */}
      <div className="bg-[#141414] border border-neutral-800/80 rounded-2xl p-5 space-y-4">
        {/* Timeline Action Bar */}
        <div className="flex items-center justify-between flex-wrap gap-2 border-b border-neutral-800/80 pb-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (selectedClip && onSplitVideoClip) {
                  onSplitVideoClip(selectedClip.id, localTime);
                }
              }}
              className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-semibold flex items-center gap-1.5"
              title="Split clip at active playhead (C / Razor)"
            >
              <Scissors className="w-3.5 h-3.5 text-[#4ade80]" />
              <span>Split at Playhead</span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (selectedClip && onRippleDeleteVideoClip) {
                  onRippleDeleteVideoClip(selectedClip.id);
                }
              }}
              className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-red-950/40 text-neutral-200 hover:text-red-300 border border-transparent hover:border-red-800/50 text-xs font-semibold flex items-center gap-1.5"
              title="Delete clip and close timeline gap automatically"
            >
              <Trash2 className="w-3.5 h-3.5 text-red-400" />
              <span>Ripple Delete</span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (onAddVideoTrack) onAddVideoTrack(`Video Track ${videoTracks.length + 1}`);
              }}
              className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-semibold flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5 text-neutral-400" />
              <span>Add Video Track</span>
            </button>
          </div>

          <div className="flex items-center gap-3 text-xs font-mono text-neutral-400">
            <span>Playhead Scrub:</span>
            <input
              type="range"
              min={0}
              max={Math.max(1, safeNum(totalProjectDuration, 1))}
              step={0.033}
              value={safeNum(localTime, 0)}
              onChange={(e) => onSeekLocalTime && onSeekLocalTime(Number(e.target.value))}
              className="w-48 accent-[#159947]"
            />
            <span className="text-[#4ade80] font-bold">{safeNum(localTime, 0).toFixed(2)}s</span>
          </div>
        </div>

        {/* Video Tracks Arranger List */}
        <div className="space-y-3">
          {videoTracks.map((track, tIdx) => (
            <div
              key={track.id || tIdx}
              className={`p-3.5 rounded-xl border transition-all ${
                selectedTrackId === track.id
                  ? 'bg-[#181818] border-neutral-700'
                  : 'bg-[#121212] border-neutral-800/60'
              }`}
            >
              {/* Track Header */}
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded bg-neutral-800 text-[10px] font-mono text-neutral-300 flex items-center justify-center font-bold">
                    V{tIdx + 1}
                  </span>
                  <span className="text-xs font-bold text-white">{track.name}</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => onUpdateVideoTrack && onUpdateVideoTrack(track.id, { visible: !track.visible })}
                    className={`p-1.5 rounded-md ${track.visible ? 'text-neutral-400 hover:text-white' : 'text-neutral-600 bg-neutral-900'}`}
                    title={track.visible ? 'Hide track' : 'Show track'}
                  >
                    {track.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdateVideoTrack && onUpdateVideoTrack(track.id, { muted: !track.muted })}
                    className={`p-1.5 rounded-md ${track.muted ? 'text-red-400 bg-red-950/30' : 'text-neutral-400 hover:text-white'}`}
                    title={track.muted ? 'Unmute video audio' : 'Mute video audio'}
                  >
                    {track.muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Clip Blocks on Track */}
              <div className="relative h-14 bg-black/40 rounded-lg border border-neutral-800/80 p-1 flex items-center gap-2 overflow-x-auto custom-scrollbar">
                {(track.clips || []).map((clip) => {
                  const isSelected = selectedClipId === clip.id;
                  return (
                    <div
                      key={clip.id}
                      onClick={() => {
                        setSelectedClipId(clip.id);
                        setSelectedTrackId(track.id);
                      }}
                      className={`h-full min-w-[150px] px-3 py-1.5 rounded-md border flex flex-col justify-between cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-[#159947]/20 border-[#22c55e] text-white shadow-md shadow-[#159947]/20'
                          : 'bg-[#1a1a1a] border-neutral-800 hover:border-neutral-700 text-neutral-300'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[11px] font-semibold truncate">
                        <span className="truncate">{clip.name}</span>
                        {clip.hasProxy && (
                          <span className="text-[9px] font-mono px-1 rounded bg-[#22c55e]/20 text-[#4ade80]">
                            PROXY
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between text-[10px] font-mono text-neutral-400">
                        <span>{clip.duration}s</span>
                        {clip.transitionIn?.type !== 'none' && (
                          <span className="text-[#4ade80]">[{clip.transitionIn.type}]</span>
                        )}
                        {clip.captions?.length > 0 && (
                          <span className="text-amber-400">[CC]</span>
                        )}
                      </div>
                    </div>
                  );
                })}

                {(!track.clips || track.clips.length === 0) && (
                  <div className="w-full text-center text-[11px] font-mono text-neutral-600">
                    Track empty · Click "Add Test Video Plate" or drag video file
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* VIDEO CLIP INSPECTOR & CONTROLS */}
      {selectedClip && (
        <div className="bg-[#141414] border border-neutral-800/80 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-800/80 pb-3 flex-wrap gap-2">
            <div className="flex items-center gap-2.5">
              <Sliders className="w-4 h-4 text-[#4ade80]" />
              <h3 className="text-sm font-bold text-white">Clip Inspector: {selectedClip.name}</h3>
            </div>

            {/* Inspector Sub-tabs */}
            <div className="flex items-center gap-1 bg-neutral-900 p-1 rounded-xl border border-neutral-800">
              <button
                type="button"
                onClick={() => setActiveInspectorTab('transform')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  activeInspectorTab === 'transform' ? 'bg-[#159947] text-white' : 'text-neutral-400 hover:text-white'
                }`}
              >
                Transform
              </button>
              <button
                type="button"
                onClick={() => setActiveInspectorTab('crop')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  activeInspectorTab === 'crop' ? 'bg-[#159947] text-white' : 'text-neutral-400 hover:text-white'
                }`}
              >
                Crop
              </button>
              <button
                type="button"
                onClick={() => setActiveInspectorTab('transitions')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  activeInspectorTab === 'transitions' ? 'bg-[#159947] text-white' : 'text-neutral-400 hover:text-white'
                }`}
              >
                Transitions
              </button>
              <button
                type="button"
                onClick={() => setActiveInspectorTab('captions')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  activeInspectorTab === 'captions' ? 'bg-[#159947] text-white' : 'text-neutral-400 hover:text-white'
                }`}
              >
                Captions
              </button>
              <button
                type="button"
                onClick={() => setActiveInspectorTab('codec')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  activeInspectorTab === 'codec' ? 'bg-[#159947] text-white' : 'text-neutral-400 hover:text-white'
                }`}
              >
                Codec & Proxy
              </button>
            </div>
          </div>

          {/* TAB 1: TRANSFORM & BLEND */}
          {activeInspectorTab === 'transform' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-[#181818] p-3.5 rounded-xl border border-neutral-800/80 space-y-2">
                <span className="text-[11px] font-mono text-neutral-400 uppercase">Position & Offset</span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="text-[10px] text-neutral-500">X (px)</label>
                    <input
                      type="number"
                      value={safeNum(selectedClip.transform?.x, 0)}
                      onChange={(e) => onUpdateClipTransform && onUpdateClipTransform(selectedClip.id, { x: Number(e.target.value) })}
                      className="w-full bg-[#111] border border-neutral-700 rounded-lg px-2 py-1 text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-neutral-500">Y (px)</label>
                    <input
                      type="number"
                      value={safeNum(selectedClip.transform?.y, 0)}
                      onChange={(e) => onUpdateClipTransform && onUpdateClipTransform(selectedClip.id, { y: Number(e.target.value) })}
                      className="w-full bg-[#111] border border-neutral-700 rounded-lg px-2 py-1 text-white font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-[#181818] p-3.5 rounded-xl border border-neutral-800/80 space-y-2">
                <span className="text-[11px] font-mono text-neutral-400 uppercase">Scale & Rotation</span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="text-[10px] text-neutral-500">Scale ({safeNum(selectedClip.transform?.scale, 1.0)}x)</label>
                    <input
                      type="range"
                      min={0.2}
                      max={3.0}
                      step={0.05}
                      value={safeNum(selectedClip.transform?.scale, 1.0)}
                      onChange={(e) => onUpdateClipTransform && onUpdateClipTransform(selectedClip.id, { scale: Number(e.target.value) })}
                      className="w-full accent-[#159947]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-neutral-500">Rot ({safeNum(selectedClip.transform?.rotation, 0)}°)</label>
                    <input
                      type="range"
                      min={-180}
                      max={180}
                      step={5}
                      value={safeNum(selectedClip.transform?.rotation, 0)}
                      onChange={(e) => onUpdateClipTransform && onUpdateClipTransform(selectedClip.id, { rotation: Number(e.target.value) })}
                      className="w-full accent-[#159947]"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-[#181818] p-3.5 rounded-xl border border-neutral-800/80 space-y-2">
                <span className="text-[11px] font-mono text-neutral-400 uppercase">Opacity & Blend Mode</span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="text-[10px] text-neutral-500">Opacity ({Math.round(safeNum(selectedClip.transform?.opacity, 1) * 100)}%)</label>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={safeNum(selectedClip.transform?.opacity, 1)}
                      onChange={(e) => onUpdateClipTransform && onUpdateClipTransform(selectedClip.id, { opacity: Number(e.target.value) })}
                      className="w-full accent-[#159947]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-neutral-500">Blend Mode</label>
                    <select
                      value={selectedClip.transform?.blendMode || 'source-over'}
                      onChange={(e) => onUpdateClipTransform && onUpdateClipTransform(selectedClip.id, { blendMode: e.target.value })}
                      className="w-full bg-[#111] border border-neutral-700 rounded-lg px-2 py-1 text-white font-mono text-xs"
                    >
                      {SUPPORTED_BLEND_MODES.map((mode) => (
                        <option key={mode} value={mode}>{mode}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: NON-DESTRUCTIVE CROP */}
          {activeInspectorTab === 'crop' && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {['top', 'bottom', 'left', 'right'].map((side) => (
                <div key={side} className="bg-[#181818] p-3.5 rounded-xl border border-neutral-800/80 space-y-2">
                  <div className="flex justify-between text-[11px] font-mono">
                    <span className="text-neutral-400 uppercase">Crop {side}</span>
                    <span className="text-[#4ade80] font-bold">{safeNum(selectedClip.crop?.[side], 0)}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={80}
                    step={1}
                    value={safeNum(selectedClip.crop?.[side], 0)}
                    onChange={(e) => onUpdateClipCrop && onUpdateClipCrop(selectedClip.id, { [side]: Number(e.target.value) })}
                    className="w-full accent-[#159947]"
                  />
                </div>
              ))}
            </div>
          )}

          {/* TAB 3: TRANSITIONS */}
          {activeInspectorTab === 'transitions' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-[#181818] p-4 rounded-xl border border-neutral-800/80 space-y-3">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#4ade80]" />
                  <span>Transition In (Entry)</span>
                </span>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="text-[10px] text-neutral-500">Effect Type</label>
                    <select
                      value={selectedClip.transitionIn?.type || 'none'}
                      onChange={(e) => onSetClipTransition && onSetClipTransition(selectedClip.id, 'in', {
                        ...selectedClip.transitionIn,
                        type: e.target.value,
                      })}
                      className="w-full bg-[#111] border border-neutral-700 rounded-lg px-2 py-1.5 text-white font-mono text-xs"
                    >
                      {SUPPORTED_TRANSITIONS.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-neutral-500">Duration ({safeNum(selectedClip.transitionIn?.duration, 0.5)}s)</label>
                    <input
                      type="range"
                      min={0.1}
                      max={2.0}
                      step={0.1}
                      value={safeNum(selectedClip.transitionIn?.duration, 0.5)}
                      onChange={(e) => onSetClipTransition && onSetClipTransition(selectedClip.id, 'in', {
                        ...selectedClip.transitionIn,
                        duration: Number(e.target.value),
                      })}
                      className="w-full accent-[#159947]"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-[#181818] p-4 rounded-xl border border-neutral-800/80 space-y-3">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#4ade80]" />
                  <span>Transition Out (Exit)</span>
                </span>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="text-[10px] text-neutral-500">Effect Type</label>
                    <select
                      value={selectedClip.transitionOut?.type || 'none'}
                      onChange={(e) => onSetClipTransition && onSetClipTransition(selectedClip.id, 'out', {
                        ...selectedClip.transitionOut,
                        type: e.target.value,
                      })}
                      className="w-full bg-[#111] border border-neutral-700 rounded-lg px-2 py-1.5 text-white font-mono text-xs"
                    >
                      {SUPPORTED_TRANSITIONS.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-neutral-500">Duration ({safeNum(selectedClip.transitionOut?.duration, 0.5)}s)</label>
                    <input
                      type="range"
                      min={0.1}
                      max={2.0}
                      step={0.1}
                      value={safeNum(selectedClip.transitionOut?.duration, 0.5)}
                      onChange={(e) => onSetClipTransition && onSetClipTransition(selectedClip.id, 'out', {
                        ...selectedClip.transitionOut,
                        duration: Number(e.target.value),
                      })}
                      className="w-full accent-[#159947]"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: CAPTIONS / SUBTITLES */}
          {activeInspectorTab === 'captions' && (
            <div className="bg-[#181818] p-4 rounded-xl border border-neutral-800/80 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Subtitles className="w-3.5 h-3.5 text-[#4ade80]" />
                  <span>Broadcast Caption Cues ({selectedClip.captions?.length || 0})</span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const newCues = [
                      ...(selectedClip.captions || []),
                      {
                        id: `cap_${Date.now()}`,
                        startTime: selectedClip.trimIn,
                        endTime: selectedClip.trimIn + 2.5,
                        text: 'Swiss Modernist Typography Cue',
                        position: 'bottom',
                      },
                    ];
                    if (onUpdateClipCaptions) onUpdateClipCaptions(selectedClip.id, newCues);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-[#159947] hover:bg-[#19b353] text-white text-[11px] font-semibold flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Caption Cue</span>
                </button>
              </div>

              <div className="space-y-2">
                {(selectedClip.captions || []).map((cue, cIdx) => (
                  <div key={cue.id || cIdx} className="bg-[#121212] p-3 rounded-lg border border-neutral-800 flex items-center gap-3">
                    <input
                      type="text"
                      value={cue.text}
                      onChange={(e) => {
                        const updated = [...(selectedClip.captions || [])];
                        updated[cIdx] = { ...cue, text: e.target.value };
                        if (onUpdateClipCaptions) onUpdateClipCaptions(selectedClip.id, updated);
                      }}
                      className="flex-1 bg-[#181818] border border-neutral-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                      placeholder="Enter subtitle text..."
                    />
                    <select
                      value={cue.position || 'bottom'}
                      onChange={(e) => {
                        const updated = [...(selectedClip.captions || [])];
                        updated[cIdx] = { ...cue, position: e.target.value };
                        if (onUpdateClipCaptions) onUpdateClipCaptions(selectedClip.id, updated);
                      }}
                      className="bg-[#181818] border border-neutral-700 rounded-lg px-2 py-1.5 text-xs text-white font-mono"
                    >
                      <option value="bottom">Bottom</option>
                      <option value="top">Top</option>
                      <option value="center">Center</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => {
                        const updated = (selectedClip.captions || []).filter((_, idx) => idx !== cIdx);
                        if (onUpdateClipCaptions) onUpdateClipCaptions(selectedClip.id, updated);
                      }}
                      className="p-1.5 text-red-400 hover:text-red-300"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}

                {(!selectedClip.captions || selectedClip.captions.length === 0) && (
                  <div className="text-center text-xs text-neutral-500 py-3 font-mono">
                    No active caption cues on this clip.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 5: CODEC & PROXY */}
          {activeInspectorTab === 'codec' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-[#181818] p-4 rounded-xl border border-neutral-800/80 space-y-2">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#4ade80]" />
                  <span>Decoder Preflight Status</span>
                </span>
                <div className="space-y-1.5 text-xs font-mono text-neutral-400">
                  <div className="flex justify-between">
                    <span>Codec Profile:</span>
                    <span className="text-white font-semibold">{selectedClip.codec || 'H.264 Baseline'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Acceleration:</span>
                    <span className="text-[#4ade80]">Hardware (GPU Accelerated)</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Direct Decode Ceiling:</span>
                    <span className="text-white">100 MB Optimal / 500 MB Hard Max</span>
                  </div>
                </div>
              </div>

              <div className="bg-[#181818] p-4 rounded-xl border border-neutral-800/80 space-y-2 flex flex-col justify-between">
                <div>
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#4ade80]" />
                    <span>360p Preview Proxy</span>
                  </span>
                  <p className="text-[11px] text-neutral-400 mt-1">
                    Generates a lightweight proxy buffer for zero-latency frame scrubbing on low-spec hardware.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleGenerateProxy}
                  disabled={isGeneratingProxy || selectedClip.hasProxy}
                  className={`w-full py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                    selectedClip.hasProxy
                      ? 'bg-neutral-800 text-[#4ade80] border border-[#22c55e]/30 cursor-default'
                      : 'bg-[#159947] hover:bg-[#19b353] text-white shadow-lg shadow-[#159947]/20'
                  }`}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isGeneratingProxy ? 'animate-spin' : ''}`} />
                  <span>
                    {isGeneratingProxy
                      ? 'Generating 360p Proxy...'
                      : selectedClip.hasProxy
                      ? '✓ 360p Proxy Active'
                      : 'Generate 360p Proxy'}
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
