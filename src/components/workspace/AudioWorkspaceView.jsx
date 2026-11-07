'use client';

import React, { useRef, useState, useMemo } from 'react';
import {
  Music,
  Volume2,
  VolumeX,
  Mic,
  MicOff,
  Play,
  Pause,
  RotateCcw,
  Sliders,
  Zap,
  Upload,
  Radio,
  Sparkles,
  ArrowLeft,
  Plus,
  Scissors,
  Repeat,
  Trash2,
  AlertCircle,
  X,
  RefreshCw,
  Clock,
  Activity,
  Layers,
  ChevronRight,
  Download,
} from 'lucide-react';
import { DEMO_TRACKS } from '../../constants/audioTracks';
import { EVENT_SFX_PADS } from '../../constants/effectCraftEffects';
import { formatTimecode } from '../../utils/timecode';
import { calculateBeatGrid, snapTimeToBeat, renderAudioMixdownWav, downloadWavBlob } from '../../core/services/audioService';

const safeNum = (v, fallback) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);

export default function AudioWorkspaceView({
  project,
  activeScene,
  isPlaying,
  onTogglePlay,
  onRestart,
  localTime = 0,
  onSeekLocalTime,
  volume = 0.75,
  isMuted = false,
  micActive = false,
  spectrum = [],
  onSelectTrack,
  onSelectSceneAudio,
  onUploadAudioFile,
  onForgetCustomAudio,
  onToggleMic,
  onToggleMute,
  onChangeVolume,
  onUpdateAudioDsp,
  onTriggerSfx,
  onReturnToCanvas,
  // Fase 5 Multi-Track Handlers
  audioEngineRef,
  onAddAudioTrack,
  onDeleteAudioTrack,
  onUpdateAudioTrack,
  onUpdateAudioClip,
  onTrimAudioClip,
  onSplitAudioClip,
  onDeleteAudioClip,
  onGenerateTestTone,
  onRelinkClipAudio,
  // Import Progress & Error State
  importProgress = null, // null or 0..100
  importStatusText = '',
  importError = null,
  onCancelImport,
  onClearImportError,
}) {
  const audioFileInputRef = useRef(null);
  const relinkInputRef = useRef(null);
  const [selectedClipId, setSelectedClipId] = useState(null);
  const [relinkingClipId, setRelinkingClipId] = useState(null);
  const [snapToBeat, setSnapToBeat] = useState(true);
  const [dspTab, setDspTab] = useState('eq'); // 'eq' | 'space' | 'sfx' | 'presets'

  const curTrackId = activeScene?.audioTrackId || project.audioTrackId || 'funk';
  const curTrack = DEMO_TRACKS.find((t) => t.id === curTrackId) || DEMO_TRACKS[0];

  const bpm = typeof project?.audioDsp?.bpm === 'number' && Number.isFinite(project.audioDsp.bpm) && project.audioDsp.bpm > 0 ? project.audioDsp.bpm : 120;
  const masterDsp = project?.audioDsp || {};
  const audioTracks = project?.audioTracks || [];

  // Find currently selected clip across tracks
  const selectedClip = useMemo(() => {
    if (!selectedClipId) return null;
    for (const track of audioTracks) {
      const found = (track.clips || []).find((c) => c.id === selectedClipId);
      if (found) return { clip: found, trackId: track.id };
    }
    return null;
  }, [audioTracks, selectedClipId]);

  // Compute beat grid (4/4 time signature)
  const sequenceDuration = Math.max(12, activeScene?.duration || 12);
  const beatGrid = useMemo(() => {
    return calculateBeatGrid(bpm, sequenceDuration);
  }, [bpm, sequenceDuration]);

  // Check which clips are missing decoded buffers in the Web Audio engine
  const isClipMissing = (clip) => {
    if (!audioEngineRef?.current) return false;
    return !audioEngineRef.current.hasClipBuffer(clip.assetId);
  };

  const handleTimelineClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    let targetTime = ratio * sequenceDuration;
    if (snapToBeat) {
      targetTime = snapTimeToBeat(targetTime, bpm, 1);
    }
    targetTime = Math.max(0, Math.min(sequenceDuration, targetTime));
    onSeekLocalTime?.(targetTime);
  };

  return (
    <div className="flex-1 flex flex-col bg-[#111111] text-neutral-100 min-w-0 min-h-0 overflow-y-auto custom-scrollbar p-6 space-y-6">
      {/* Top Header Banner: Web Audio DSP Console */}
      <div className="bg-[#181818] border border-neutral-800 rounded-2xl p-5 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-full bg-gradient-to-l from-[#159947]/10 to-transparent pointer-events-none" />

        <div className="flex items-start justify-between gap-4 relative z-10">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-[#159947]/20 text-[#4ade80] border border-[#22c55e]/40 flex items-center gap-1.5">
                <Radio className="w-3 h-3 animate-pulse" />
                <span>Web Audio DSP Subsystem · ADR 006 Active</span>
              </span>
              <span className="text-xs text-neutral-400 font-mono">
                48 kHz / 32-bit Float Internal Processing
              </span>
            </div>

            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2.5">
              <Music className="w-5 h-5 text-[#22c55e]" />
              <span>Multi-Track Audio Engine, DSP Mixer & Sound Studio</span>
            </h2>

            <p className="text-xs text-neutral-300 leading-relaxed">
              Non-destructive local audio import, multi-track clip arrangement, sub-bass low-shelf EQ, dub echo delay, algorithmic reverb, and 440Hz test tone sync verification.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                const mixdown = renderAudioMixdownWav(project, audioEngineRef?.current, sequenceDuration);
                const safeName = (project.name || 'clover-motion').toLowerCase().replace(/[^a-z0-9_-]/g, '-');
                downloadWavBlob(mixdown.buffer, `${safeName}-audio-mixdown.wav`);
              }}
              className="px-3.5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
              title="Render and download full project audio mixdown as 16-bit 48kHz stereo WAV"
            >
              <Download className="w-3.5 h-3.5 text-[#4ade80]" />
              <span>Export WAV</span>
            </button>
            <button
              type="button"
              onClick={onReturnToCanvas}
              className="px-3.5 py-2 rounded-xl bg-[#1c1c1c] hover:bg-neutral-800 border border-neutral-700 text-neutral-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-[#4ade80]" />
              <span>Back to Canvas View</span>
            </button>
            <button
              type="button"
              onClick={onRestart}
              className="p-2 rounded-xl bg-[#1c1c1c] hover:bg-neutral-800 border border-neutral-700 text-neutral-300 hover:text-white transition-colors"
              title="Restart Playhead to 00:00:00"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={onTogglePlay}
              className="px-4 py-2 rounded-xl bg-[#159947] hover:bg-[#19b353] border border-[#22c55e]/40 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-lg shadow-[#159947]/20"
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
              <span>{isPlaying ? 'Pause Audio' : 'Play Audio'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Import Progress & Error Banners */}
      {importProgress !== null && (
        <div className="bg-[#181818] border border-[#22c55e]/40 rounded-2xl p-4 shadow-lg space-y-2">
          <div className="flex items-center justify-between text-xs font-medium">
            <div className="flex items-center gap-2 text-white">
              <RefreshCw className="w-3.5 h-3.5 text-[#4ade80] animate-spin" />
              <span>{importStatusText || 'Importing local audio...'}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-[#4ade80]">{importProgress}%</span>
              {onCancelImport && (
                <button
                  type="button"
                  onClick={onCancelImport}
                  className="px-2 py-0.5 rounded text-[11px] bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
          <div className="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#159947] to-[#4ade80] transition-all duration-150"
              style={{ width: `${Math.max(5, Math.min(100, importProgress))}%` }}
            />
          </div>
        </div>
      )}

      {importError && (
        <div className="bg-red-950/40 border border-red-500/50 rounded-2xl p-4 flex items-start justify-between gap-3 text-red-200 text-xs shadow-lg">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-red-300">Audio Import Error</div>
              <div className="text-red-300/80 mt-0.5">{importError}</div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClearImportError}
            className="p-1 rounded text-red-400 hover:text-white hover:bg-red-900/50 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Real-Time 32-Band FFT Spectrum Analyzer Display */}
      <div className="bg-[#141414] border border-neutral-800/80 rounded-2xl p-5 space-y-3 shadow-inner">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#4ade80]" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
              Live 32-Band FFT Spectrum Analyzer & Master Signal
            </h3>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-mono text-neutral-400 flex items-center gap-1.5">
              <Clock className="w-3 h-3 text-[#22c55e]" />
              <span>{formatTimecode(localTime, project?.fps || 30)}</span>
            </span>
            <span className="text-[11px] font-mono text-neutral-400">
              {curTrack?.name || 'Procedural'} · {bpm} BPM
            </span>
          </div>
        </div>

        <div className="h-24 bg-[#0a0a0a] rounded-xl border border-neutral-800/80 p-3 flex items-end gap-1.5 overflow-hidden">
          {(spectrum && spectrum.length ? spectrum : new Array(32).fill(0.08)).map((val, idx) => {
            const heightPercent = Math.max(6, Math.min(100, Math.round(val * 100)));
            return (
              <div
                key={idx}
                className="flex-1 bg-gradient-to-t from-[#159947] via-[#22c55e] to-[#86efac] rounded-t-sm transition-all duration-75"
                style={{ height: `${heightPercent}%` }}
                title={`Band ${idx + 1}: ${heightPercent}%`}
              />
            );
          })}
        </div>
      </div>

      {/* ======================================================== */}
      {/* SECTION 1: Multi-Track Timeline & Audio Clip Arranger   */}
      {/* ======================================================== */}
      <div className="bg-[#161616] border border-neutral-800/80 rounded-2xl p-5 space-y-4 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-800 pb-3">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#4ade80]" />
            <h3 className="text-sm font-bold text-white">Multi-Track Audio Timeline & Clip Arranger</h3>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-neutral-800 text-neutral-300">
              {audioTracks.length} {audioTracks.length === 1 ? 'Track' : 'Tracks'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Snap to Beat Toggle */}
            <button
              type="button"
              onClick={() => setSnapToBeat((v) => !v)}
              className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                snapToBeat
                  ? 'bg-[#159947]/20 border-[#22c55e]/50 text-[#4ade80]'
                  : 'bg-neutral-800 border-neutral-700 text-neutral-400'
              }`}
              title="Snap clips and playhead to musical 4/4 beat grid"
            >
              <Activity className="w-3 h-3" />
              <span>Beat Snap ({bpm} BPM)</span>
            </button>

            {/* Generate 440Hz Test Tone Button (Instant Offline Verification) */}
            <button
              type="button"
              onClick={onGenerateTestTone}
              className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
              title="Generate a 440Hz Concert A offline PCM sine wave test tone"
            >
              <Zap className="w-3 h-3 text-amber-400" />
              <span>+ 440Hz Test Tone</span>
            </button>

            {/* Import Local Audio File */}
            <button
              type="button"
              onClick={() => audioFileInputRef.current?.click()}
              className="px-3 py-1.5 rounded-lg bg-[#159947] hover:bg-[#19b353] border border-[#22c55e]/40 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
              title="Import local WAV, MP3, OGG, FLAC file without upload"
            >
              <Upload className="w-3 h-3" />
              <span>Import Audio</span>
            </button>
            <input
              ref={audioFileInputRef}
              type="file"
              accept="audio/*,.wav,.mp3,.ogg,.aac,.flac,.m4a"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file && onUploadAudioFile) onUploadAudioFile(file);
                e.target.value = '';
              }}
            />

            {/* Hidden Relink File Input */}
            <input
              ref={relinkInputRef}
              type="file"
              accept="audio/*,.wav,.mp3,.ogg,.aac,.flac,.m4a"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file && relinkingClipId && onRelinkClipAudio) {
                  onRelinkClipAudio(relinkingClipId, file);
                }
                setRelinkingClipId(null);
                e.target.value = '';
              }}
            />

            {/* Add Audio Track Button */}
            <button
              type="button"
              onClick={() => onAddAudioTrack?.()}
              className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-3 h-3 text-[#4ade80]" />
              <span>Add Track</span>
            </button>
          </div>
        </div>

        {/* Tracks Arrangement Container */}
        <div className="space-y-3">
          {audioTracks.map((track, trackIdx) => (
            <div
              key={track.id}
              className="bg-[#141414] border border-neutral-800 rounded-xl overflow-hidden flex flex-col sm:flex-row min-h-[96px]"
            >
              {/* Left Track Control Header */}
              <div className="w-full sm:w-56 bg-[#181818] border-b sm:border-b-0 sm:border-r border-neutral-800 p-3 flex flex-col justify-between shrink-0 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-xs text-white truncate max-w-[120px]">
                    {track.name || `Track ${trackIdx + 1}`}
                  </div>
                  <div className="flex items-center gap-1">
                    {/* Mute Button */}
                    <button
                      type="button"
                      onClick={() => onUpdateAudioTrack?.(track.id, { mute: !track.mute })}
                      className={`w-6 h-6 rounded flex items-center justify-center font-bold text-[10px] transition-colors ${
                        track.mute
                          ? 'bg-red-500 text-white font-mono'
                          : 'bg-neutral-800 text-neutral-400 hover:text-white'
                      }`}
                      title="Mute track"
                    >
                      M
                    </button>
                    {/* Solo Button */}
                    <button
                      type="button"
                      onClick={() => onUpdateAudioTrack?.(track.id, { solo: !track.solo })}
                      className={`w-6 h-6 rounded flex items-center justify-center font-bold text-[10px] transition-colors ${
                        track.solo
                          ? 'bg-amber-500 text-black font-mono font-bold'
                          : 'bg-neutral-800 text-neutral-400 hover:text-white'
                      }`}
                      title="Solo track"
                    >
                      S
                    </button>
                    {/* Delete Track */}
                    {audioTracks.length > 1 && (
                      <button
                        type="button"
                        onClick={() => onDeleteAudioTrack?.(track.id)}
                        className="w-6 h-6 rounded flex items-center justify-center text-neutral-500 hover:text-red-400 hover:bg-neutral-800 transition-colors"
                        title="Delete track"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Track Sliders: Volume & Pan */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between text-[10px] text-neutral-400 font-mono">
                    <span>Vol: {Math.round(safeNum(track.volume, 1) * 100)}%</span>
                    <span>Pan: {safeNum(track.pan, 0) === 0 ? 'C' : (safeNum(track.pan, 0) > 0 ? `R${Math.round(safeNum(track.pan, 0) * 100)}` : `L${Math.round(-safeNum(track.pan, 0) * 100)}`)}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.02"
                    value={safeNum(track.volume, 1)}
                    onChange={(e) => onUpdateAudioTrack?.(track.id, { volume: parseFloat(e.target.value) })}
                    className="w-full accent-[#22c55e] h-1 bg-neutral-800 rounded-lg cursor-pointer"
                  />
                  <input
                    type="range"
                    min="-1"
                    max="1"
                    step="0.05"
                    value={safeNum(track.pan, 0)}
                    onChange={(e) => onUpdateAudioTrack?.(track.id, { pan: parseFloat(e.target.value) })}
                    className="w-full accent-[#22c55e] h-1 bg-neutral-800 rounded-lg cursor-pointer"
                  />
                </div>
              </div>

              {/* Right Track Timeline Canvas / Lane */}
              <div
                className="flex-1 relative bg-[#0e0e0e] min-h-[96px] cursor-pointer overflow-hidden select-none"
                onClick={handleTimelineClick}
              >
                {/* 4/4 Beat Grid Guidelines */}
                {beatGrid.bars.map((barTime, bIdx) => {
                  const leftPct = (barTime / sequenceDuration) * 100;
                  if (leftPct > 100) return null;
                  return (
                    <div
                      key={`bar_${bIdx}`}
                      className="absolute top-0 bottom-0 border-l border-neutral-700/60 pointer-events-none z-0"
                      style={{ left: `${leftPct}%` }}
                    >
                      <span className="text-[9px] font-mono text-neutral-600 pl-1 select-none">
                        B{bIdx + 1}
                      </span>
                    </div>
                  );
                })}

                {/* Render Audio Clips in this Track */}
                {(track.clips || []).map((clip) => {
                  const clipLeftPct = ((clip.trackTime || 0) / sequenceDuration) * 100;
                  const clipWidthPct = Math.max(2, ((clip.duration || 1) / sequenceDuration) * 100);
                  const isSelected = selectedClipId === clip.id;
                  const isMissing = isClipMissing(clip);

                  return (
                    <div
                      key={clip.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedClipId(clip.id);
                      }}
                      className={`absolute top-2 bottom-2 rounded-lg p-2 flex flex-col justify-between transition-all cursor-move z-10 shadow-md ${
                        isSelected
                          ? 'border-2 border-[#22c55e] bg-[#159947]/30 text-white'
                          : isMissing
                          ? 'border border-amber-500/70 bg-amber-950/40 text-amber-200'
                          : 'border border-[#22c55e]/40 bg-[#162a1e] hover:bg-[#1a3825] text-neutral-100'
                      }`}
                      style={{
                        left: `${Math.max(0, clipLeftPct)}%`,
                        width: `${Math.min(100 - clipLeftPct, clipWidthPct)}%`,
                      }}
                      title={`${clip.name} · ${clip.duration}s · Gain: ${Math.round((clip.gain ?? 1) * 100)}%`}
                    >
                      {/* Clip Header */}
                      <div className="flex items-center justify-between text-[11px] font-bold truncate">
                        <span className="truncate">{clip.name}</span>
                        {isMissing ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setRelinkingClipId(clip.id);
                              relinkInputRef.current?.click();
                            }}
                            className="px-1.5 py-0.5 rounded text-[9px] bg-amber-500 text-black font-semibold hover:bg-amber-400 shrink-0"
                            title="Missing audio buffer. Click to relink file locally."
                          >
                            Relink
                          </button>
                        ) : (
                          <span className="font-mono text-[9px] opacity-75 shrink-0 pl-1">
                            {clip.duration.toFixed(1)}s
                          </span>
                        )}
                      </div>

                      {/* Visual Waveform Peak Bars */}
                      <div className="h-6 flex items-center gap-0.5 overflow-hidden my-0.5 pointer-events-none">
                        {(clip.waveformPeaks && clip.waveformPeaks.length
                          ? clip.waveformPeaks
                          : new Array(60).fill(0.1)
                        ).map((peak, pIdx) => {
                          const barH = Math.max(12, Math.min(100, Math.round(peak * 100)));
                          return (
                            <div
                              key={pIdx}
                              className={`flex-1 rounded-sm ${
                                isSelected
                                  ? 'bg-[#4ade80]'
                                  : isMissing
                                  ? 'bg-amber-400'
                                  : 'bg-[#22c55e]/70'
                              }`}
                              style={{ height: `${barH}%` }}
                            />
                          );
                        })}
                      </div>

                      {/* Clip Sub-Tags: Loop / Fade */}
                      <div className="flex items-center justify-between text-[9px] font-mono text-neutral-400">
                        <span>{clip.loop ? '🔁 Loop' : 'Once'}</span>
                        <span>
                          {clip.fadeIn > 0 ? `In: ${clip.fadeIn.toFixed(1)}s ` : ''}
                          {clip.fadeOut > 0 ? `Out: ${clip.fadeOut.toFixed(1)}s` : ''}
                        </span>
                      </div>
                    </div>
                  );
                })}

                {/* Red Playhead Vertical Bar */}
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-red-500 pointer-events-none z-20 shadow-lg shadow-red-500/50"
                  style={{
                    left: `${Math.min(100, Math.max(0, (localTime / sequenceDuration) * 100))}%`,
                  }}
                >
                  <div className="w-2.5 h-2.5 bg-red-500 rounded-full -ml-1 -mt-0.5 shadow-md" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Selected Clip Inspector Drawer */}
        {selectedClip && (
          <div className="bg-[#181818] border border-[#22c55e]/30 rounded-xl p-4 mt-3 space-y-4 shadow-xl">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-800 pb-2.5">
              <div className="flex items-center gap-2">
                <Music className="w-4 h-4 text-[#4ade80]" />
                <span className="text-xs font-bold text-white">
                  Clip Inspector: <span className="text-[#4ade80]">{selectedClip.clip.name}</span>
                </span>
                <span className="text-[10px] font-mono text-neutral-400">
                  [{selectedClip.clip.duration.toFixed(2)}s @ {selectedClip.clip.trackTime.toFixed(2)}s]
                </span>
              </div>

              <div className="flex items-center gap-2">
                {/* Split at Playhead */}
                <button
                  type="button"
                  onClick={() => onSplitAudioClip?.(selectedClip.clip.id, localTime)}
                  className="px-2.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  title="Split clip non-destructively at current playhead"
                >
                  <Scissors className="w-3 h-3 text-[#4ade80]" />
                  <span>Split at Playhead ({formatTimecode(localTime, project?.fps || 30)})</span>
                </button>

                {/* Loop Toggle */}
                <button
                  type="button"
                  onClick={() =>
                    onUpdateAudioClip?.(selectedClip.clip.id, { loop: !selectedClip.clip.loop })
                  }
                  className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                    selectedClip.clip.loop
                      ? 'bg-[#159947]/20 border-[#22c55e]/50 text-[#4ade80]'
                      : 'bg-neutral-800 border-neutral-700 text-neutral-400'
                  }`}
                >
                  <Repeat className="w-3 h-3" />
                  <span>{selectedClip.clip.loop ? 'Looping' : 'No Loop'}</span>
                </button>

                {/* Delete Clip */}
                <button
                  type="button"
                  onClick={() => {
                    onDeleteAudioClip?.(selectedClip.clip.id);
                    setSelectedClipId(null);
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-red-950/40 hover:bg-red-900/60 border border-red-500/50 text-red-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Delete Clip</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedClipId(null)}
                  className="p-1 rounded text-neutral-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Clip Parameter Controls (Trim In/Out, Gain, Pan, Fades) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-1">
              {/* Trim In & Trim Out */}
              <div className="space-y-1 bg-[#141414] p-3 rounded-lg border border-neutral-800">
                <div className="flex justify-between text-xs text-neutral-300">
                  <span>Trim In</span>
                  <span className="font-mono text-[#4ade80]">{safeNum(selectedClip.clip.trimIn, 0).toFixed(2)}s</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max={Math.max(0, safeNum(selectedClip.clip.trimOut, 1) - 0.1)}
                  step="0.05"
                  value={safeNum(selectedClip.clip.trimIn, 0)}
                  onChange={(e) =>
                    onTrimAudioClip?.(
                      selectedClip.clip.id,
                      parseFloat(e.target.value),
                      safeNum(selectedClip.clip.trimOut, 1)
                    )
                  }
                  className="w-full accent-[#22c55e] h-1.5 bg-neutral-800 rounded-lg cursor-pointer"
                />

                <div className="flex justify-between text-xs text-neutral-300 pt-2">
                  <span>Trim Out</span>
                  <span className="font-mono text-[#4ade80]">{safeNum(selectedClip.clip.trimOut, 1).toFixed(2)}s</span>
                </div>
                <input
                  type="range"
                  min={safeNum(selectedClip.clip.trimIn, 0) + 0.1}
                  max={safeNum(selectedClip.clip.trimIn, 0) + 20}
                  step="0.05"
                  value={safeNum(selectedClip.clip.trimOut, 1)}
                  onChange={(e) =>
                    onTrimAudioClip?.(
                      selectedClip.clip.id,
                      safeNum(selectedClip.clip.trimIn, 0),
                      parseFloat(e.target.value)
                    )
                  }
                  className="w-full accent-[#22c55e] h-1.5 bg-neutral-800 rounded-lg cursor-pointer"
                />
              </div>

              {/* Clip Gain */}
              <div className="space-y-1 bg-[#141414] p-3 rounded-lg border border-neutral-800">
                <div className="flex justify-between text-xs text-neutral-300">
                  <span>Clip Gain</span>
                  <span className="font-mono text-[#4ade80]">
                    {Math.round(safeNum(selectedClip.clip.gain, 1) * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="2.0"
                  step="0.05"
                  value={safeNum(selectedClip.clip.gain, 1)}
                  onChange={(e) =>
                    onUpdateAudioClip?.(selectedClip.clip.id, { gain: parseFloat(e.target.value) })
                  }
                  className="w-full accent-[#22c55e] h-1.5 bg-neutral-800 rounded-lg cursor-pointer"
                />
                <span className="text-[10px] text-neutral-500 block pt-1">
                  Volume multiplier up to 200% (+6dB)
                </span>
              </div>

              {/* Stereo Pan */}
              <div className="space-y-1 bg-[#141414] p-3 rounded-lg border border-neutral-800">
                <div className="flex justify-between text-xs text-neutral-300">
                  <span>Clip Stereo Pan</span>
                  <span className="font-mono text-[#4ade80]">
                    {safeNum(selectedClip.clip.pan, 0) === 0
                      ? 'Center'
                      : safeNum(selectedClip.clip.pan, 0) > 0
                      ? `R ${Math.round(safeNum(selectedClip.clip.pan, 0) * 100)}`
                      : `L ${Math.round(-safeNum(selectedClip.clip.pan, 0) * 100)}`}
                  </span>
                </div>
                <input
                  type="range"
                  min="-1"
                  max="1"
                  step="0.05"
                  value={safeNum(selectedClip.clip.pan, 0)}
                  onChange={(e) =>
                    onUpdateAudioClip?.(selectedClip.clip.id, { pan: parseFloat(e.target.value) })
                  }
                  className="w-full accent-[#22c55e] h-1.5 bg-neutral-800 rounded-lg cursor-pointer"
                />
                <span className="text-[10px] text-neutral-500 block pt-1">
                  Full left (-100%) to full right (+100%)
                </span>
              </div>

              {/* Fade In & Fade Out */}
              <div className="space-y-1 bg-[#141414] p-3 rounded-lg border border-neutral-800">
                <div className="flex justify-between text-xs text-neutral-300">
                  <span>Fade In</span>
                  <span className="font-mono text-[#4ade80]">
                    {safeNum(selectedClip.clip.fadeIn, 0).toFixed(1)}s
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max={Math.max(0.5, safeNum(selectedClip.clip.duration, 2) / 2)}
                  step="0.1"
                  value={safeNum(selectedClip.clip.fadeIn, 0)}
                  onChange={(e) =>
                    onUpdateAudioClip?.(selectedClip.clip.id, { fadeIn: parseFloat(e.target.value) })
                  }
                  className="w-full accent-[#22c55e] h-1.5 bg-neutral-800 rounded-lg cursor-pointer"
                />

                <div className="flex justify-between text-xs text-neutral-300 pt-2">
                  <span>Fade Out</span>
                  <span className="font-mono text-[#4ade80]">
                    {safeNum(selectedClip.clip.fadeOut, 0).toFixed(1)}s
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max={Math.max(0.5, safeNum(selectedClip.clip.duration, 2) / 2)}
                  step="0.1"
                  value={safeNum(selectedClip.clip.fadeOut, 0)}
                  onChange={(e) =>
                    onUpdateAudioClip?.(selectedClip.clip.id, { fadeOut: parseFloat(e.target.value) })
                  }
                  className="w-full accent-[#22c55e] h-1.5 bg-neutral-800 rounded-lg cursor-pointer"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* SECTION 1.5: 16-Step Procedural Sequencer & One-Shot Sampler */}
      {/* ======================================================== */}
      <div className="bg-[#161616] border border-neutral-800/80 rounded-2xl p-5 space-y-4 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-800 pb-3">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-[#4ade80]" />
            <h3 className="text-sm font-bold text-white">16-Step Procedural Synthesizer & One-Shot Sampler</h3>
            <span className="text-[10px] font-mono text-neutral-400">
              Synchronized to Master Timeline Clock
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-neutral-300">
              <span className="text-neutral-400">Tempo:</span>
              <span className="font-mono text-[#4ade80] font-bold">{safeNum(bpm, 126)} BPM</span>
            </div>
            <input
              type="range"
              min="40"
              max="220"
              value={safeNum(bpm, 126)}
              onChange={(e) => onUpdateAudioDsp?.({ bpm: Math.max(40, Math.min(220, Number(e.target.value) || 126)) })}
              className="w-24 accent-[#22c55e] h-1.5 bg-neutral-800 rounded-lg cursor-pointer"
            />
          </div>
        </div>

        {/* 16-Step LED Sequencer Visualizer */}
        <div className="space-y-2">
          <div className="flex justify-between text-[11px] font-mono text-neutral-400">
            <span>16-Step Beat Grid</span>
            <span className="text-[#4ade80]">
              Active Step: {Math.floor((localTime % ((60 / bpm) * 4)) / ((60 / bpm) / 4)) + 1} / 16
            </span>
          </div>
          <div className="grid grid-cols-8 sm:grid-cols-16 gap-1.5">
            {Array.from({ length: 16 }).map((_, stepIdx) => {
              const currentStep = Math.floor((localTime % ((60 / bpm) * 4)) / ((60 / bpm) / 4));
              const isActive = isPlaying && currentStep === stepIdx;
              const isDownbeat = stepIdx % 4 === 0;

              return (
                <div
                  key={stepIdx}
                  className={`h-9 rounded-lg flex flex-col items-center justify-between py-1 transition-all ${
                    isActive
                      ? 'bg-[#22c55e] text-black shadow-lg shadow-[#22c55e]/50 font-bold scale-105'
                      : isDownbeat
                      ? 'bg-[#222222] border border-[#22c55e]/30 text-neutral-200'
                      : 'bg-[#181818] border border-neutral-800 text-neutral-500'
                  }`}
                >
                  <span className="text-[9px] font-mono">{stepIdx + 1}</span>
                  <div
                    className={`w-1.5 h-1.5 rounded-full ${
                      isActive ? 'bg-black' : isDownbeat ? 'bg-[#22c55e]/60' : 'bg-neutral-700'
                    }`}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Sampler One-Shot Trigger Buttons from Audio Clips */}
        {audioTracks.some((t) => t.clips && t.clips.length > 0) && (
          <div className="pt-2 space-y-2 border-t border-neutral-800/80">
            <span className="text-[11px] font-mono text-neutral-400 uppercase tracking-wider block">
              One-Shot Clip Sampler Triggers
            </span>
            <div className="flex flex-wrap gap-2">
              {audioTracks.flatMap((t) => t.clips || []).map((clip) => (
                <button
                  key={clip.id}
                  type="button"
                  onClick={() => {
                    if (audioEngineRef?.current) {
                      audioEngineRef.current.scheduleClipPlayback(
                        [{ ...audioTracks[0], clips: [{ ...clip, trackTime: localTime }] }],
                        localTime
                      );
                    }
                  }}
                  className="px-3 py-1.5 rounded-lg bg-[#202020] hover:bg-[#159947]/20 border border-neutral-800 hover:border-[#22c55e]/50 text-neutral-200 text-xs font-semibold flex items-center gap-1.5 transition-colors active:scale-95"
                >
                  <Music className="w-3 h-3 text-[#4ade80]" />
                  <span>{clip.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* SECTION 2: Master DSP Processing Rack & Live FX Controls */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Master DSP Rack Controls */}
        <div className="bg-[#161616] border border-neutral-800/80 rounded-2xl p-5 space-y-5">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-[#4ade80]" />
              <h3 className="text-sm font-bold text-white">Master DSP Audio Processing Chain</h3>
            </div>
            <button
              type="button"
              onClick={onToggleMute}
              className={`p-1.5 rounded-lg border text-xs flex items-center gap-1.5 transition-colors ${
                isMuted
                  ? 'bg-red-500/20 border-red-500/40 text-red-400'
                  : 'bg-neutral-800 border-neutral-700 text-neutral-300'
              }`}
            >
              {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
              <span>{isMuted ? 'Muted' : 'Audible'}</span>
            </button>
          </div>

          {/* Master Volume & Pan */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-neutral-300">Master Volume</span>
                <span className="text-[#4ade80] font-mono">{Math.round(safeNum(volume, 0.8) * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={safeNum(volume, 0.8)}
                onChange={(e) => onChangeVolume?.(parseFloat(e.target.value))}
                className="w-full accent-[#22c55e] h-1.5 bg-neutral-800 rounded-lg cursor-pointer"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-neutral-300">Master Stereo Pan</span>
                <span className="text-[#4ade80] font-mono">
                  {safeNum(masterDsp.pan, 0) === 0 ? 'Center' : safeNum(masterDsp.pan, 0) > 0 ? `R${Math.round(safeNum(masterDsp.pan, 0) * 100)}` : `L${Math.round(-safeNum(masterDsp.pan, 0) * 100)}`}
                </span>
              </div>
              <input
                type="range"
                min="-1"
                max="1"
                step="0.05"
                value={safeNum(masterDsp.pan, 0)}
                onChange={(e) => onUpdateAudioDsp?.({ pan: parseFloat(e.target.value) })}
                className="w-full accent-[#22c55e] h-1.5 bg-neutral-800 rounded-lg cursor-pointer"
              />
            </div>
          </div>

          {/* DSP 3-Band Parametric EQ (Bass, Mid, Treble) & Lowpass */}
          <div className="space-y-3 pt-2">
            <span className="text-xs font-mono font-bold text-neutral-400 uppercase tracking-wider">
              3-Band Parametric Mastering EQ & Lowpass Filter
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Sub-Bass */}
              <div className="bg-[#1a1a1a] p-3 rounded-xl border border-neutral-800 space-y-1.5">
                <div className="flex justify-between text-[11px] font-mono">
                  <span className="text-neutral-400">Sub-Bass (110Hz)</span>
                  <span className="text-[#4ade80]">
                    {safeNum(masterDsp.bassGain, 0) > 0 ? `+${safeNum(masterDsp.bassGain, 0)}` : safeNum(masterDsp.bassGain, 0)} dB
                  </span>
                </div>
                <input
                  type="range"
                  min="-12"
                  max="18"
                  step="1"
                  value={safeNum(masterDsp.bassGain, 0)}
                  onChange={(e) => onUpdateAudioDsp?.({ bassGain: parseFloat(e.target.value) })}
                  className="w-full accent-[#22c55e] h-1 bg-neutral-800 rounded-lg cursor-pointer"
                />
              </div>

              {/* Mid */}
              <div className="bg-[#1a1a1a] p-3 rounded-xl border border-neutral-800 space-y-1.5">
                <div className="flex justify-between text-[11px] font-mono">
                  <span className="text-neutral-400">Mid (1.4kHz)</span>
                  <span className="text-[#4ade80]">
                    {safeNum(masterDsp.midGain, 0) > 0 ? `+${safeNum(masterDsp.midGain, 0)}` : safeNum(masterDsp.midGain, 0)} dB
                  </span>
                </div>
                <input
                  type="range"
                  min="-12"
                  max="12"
                  step="1"
                  value={safeNum(masterDsp.midGain, 0)}
                  onChange={(e) => onUpdateAudioDsp?.({ midGain: parseFloat(e.target.value) })}
                  className="w-full accent-[#22c55e] h-1 bg-neutral-800 rounded-lg cursor-pointer"
                />
              </div>

              {/* Treble */}
              <div className="bg-[#1a1a1a] p-3 rounded-xl border border-neutral-800 space-y-1.5">
                <div className="flex justify-between text-[11px] font-mono">
                  <span className="text-neutral-400">Treble (7.5kHz)</span>
                  <span className="text-[#4ade80]">
                    {safeNum(masterDsp.trebleGain, 0) > 0 ? `+${safeNum(masterDsp.trebleGain, 0)}` : safeNum(masterDsp.trebleGain, 0)} dB
                  </span>
                </div>
                <input
                  type="range"
                  min="-12"
                  max="15"
                  step="1"
                  value={safeNum(masterDsp.trebleGain, 0)}
                  onChange={(e) => onUpdateAudioDsp?.({ trebleGain: parseFloat(e.target.value) })}
                  className="w-full accent-[#22c55e] h-1 bg-neutral-800 rounded-lg cursor-pointer"
                />
              </div>

              {/* Lowpass Filter */}
              <div className="bg-[#1a1a1a] p-3 rounded-xl border border-neutral-800 space-y-1.5">
                <div className="flex justify-between text-[11px] font-mono">
                  <span className="text-neutral-400">Lowpass Cutoff</span>
                  <span className="text-[#4ade80]">
                    {Math.round(safeNum(masterDsp.lowpassFreq, 20000))} Hz
                  </span>
                </div>
                <input
                  type="range"
                  min="200"
                  max="20000"
                  step="200"
                  value={safeNum(masterDsp.lowpassFreq, 20000)}
                  onChange={(e) => onUpdateAudioDsp?.({ lowpassFreq: parseFloat(e.target.value) })}
                  className="w-full accent-[#22c55e] h-1 bg-neutral-800 rounded-lg cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Dub Echo Delay & Reverb Impulse */}
          <div className="space-y-3 pt-2">
            <span className="text-xs font-mono font-bold text-neutral-400 uppercase tracking-wider">
              Dub Echo Delay & Algorithmic Chamber Reverb
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Delay */}
              <div className="bg-[#1a1a1a] p-3.5 rounded-xl border border-neutral-800 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-neutral-300 font-medium">Dub Echo Wet Mix</span>
                  <span className="text-[#4ade80] font-mono">
                    {Math.round(safeNum(masterDsp.delayMix, 0) * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="0.85"
                  step="0.05"
                  value={safeNum(masterDsp.delayMix, 0)}
                  onChange={(e) => onUpdateAudioDsp?.({ delayMix: parseFloat(e.target.value) })}
                  className="w-full accent-[#22c55e] h-1 bg-neutral-800 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-neutral-500 font-mono">
                  <span>Ping-pong feedback: 36%</span>
                  <span>Tempo synced</span>
                </div>
              </div>

              {/* Reverb */}
              <div className="bg-[#1a1a1a] p-3.5 rounded-xl border border-neutral-800 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-neutral-300 font-medium">Chamber Reverb Wet Mix</span>
                  <span className="text-[#4ade80] font-mono">
                    {Math.round(safeNum(masterDsp.reverbMix, 0) * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="0.85"
                  step="0.05"
                  value={safeNum(masterDsp.reverbMix, 0)}
                  onChange={(e) => onUpdateAudioDsp?.({ reverbMix: parseFloat(e.target.value) })}
                  className="w-full accent-[#22c55e] h-1 bg-neutral-800 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-neutral-500 font-mono">
                  <span>Decay: {(masterDsp.reverbDecay ?? 1.8).toFixed(1)}s</span>
                  <span>Stereo convolution</span>
                </div>
              </div>
            </div>
          </div>

          {/* Mic FFT Reactive Input (Safely opt-in only) */}
          <div className="pt-2 flex items-center justify-between border-t border-neutral-800 pt-3">
            <div className="text-xs text-neutral-400">
              Microphone input is inactive until explicitly turned on:
            </div>
            <button
              type="button"
              onClick={onToggleMic}
              className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                micActive
                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                  : 'bg-neutral-800 border-neutral-700 text-neutral-300 hover:text-white'
              }`}
              title="Toggle Live Microphone FFT Reactive Input"
            >
              {micActive ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
              <span>{micActive ? 'Mic Active' : 'Mic Off'}</span>
            </button>
          </div>
        </div>

        {/* Right: 8 Live One-Shot SFX Event Trigger Pads & 24 Synth Presets */}
        <div className="bg-[#161616] border border-neutral-800/80 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-[#4ade80]" />
              <h3 className="text-sm font-bold text-white">8 Live Event SFX Trigger Pads</h3>
            </div>
            <span className="text-[10px] font-mono text-neutral-400">
              Low-latency Web Audio One-Shots
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {EVENT_SFX_PADS.map((pad, idx) => (
              <button
                key={pad.id}
                type="button"
                onClick={() => onTriggerSfx?.(pad.id)}
                className="group p-3.5 rounded-xl bg-[#1c1c1c] hover:bg-[#159947]/20 border border-neutral-800 hover:border-[#22c55e]/60 flex flex-col items-center justify-between gap-2 transition-all active:scale-95 shadow-sm"
              >
                <span className="w-6 h-6 rounded-md bg-neutral-800 group-hover:bg-[#159947] text-neutral-300 group-hover:text-white flex items-center justify-center font-mono text-xs font-bold transition-colors">
                  {idx + 1}
                </span>
                <span className="text-xs font-bold text-neutral-200 group-hover:text-white text-center">
                  {pad.name}
                </span>
                <span className="text-[10px] font-mono text-neutral-500 group-hover:text-[#4ade80]">
                  {pad.freq}Hz
                </span>
              </button>
            ))}
          </div>

          {/* 24 Synth Tracks Palette */}
          <div className="pt-3 space-y-2">
            <span className="text-xs font-mono font-bold text-neutral-400 uppercase tracking-wider">
              24 Procedural Synth Tracks
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-56 overflow-y-auto custom-scrollbar pr-1">
              {DEMO_TRACKS.map((t) => {
                const isSelected = curTrackId === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      onSelectTrack?.(t.id);
                      onSelectSceneAudio?.(t.id);
                    }}
                    className={`p-2.5 rounded-lg text-left border transition-all text-xs flex flex-col justify-between ${
                      isSelected
                        ? 'bg-[#159947]/20 border-[#22c55e]/60 text-[#4ade80] shadow-sm'
                        : 'bg-[#141414] border-neutral-800 hover:border-neutral-700 text-neutral-300 hover:text-white'
                    }`}
                  >
                    <div className="font-bold truncate">{t.name}</div>
                    <div className="text-[10px] text-neutral-500 font-mono mt-1 flex justify-between">
                      <span>{t.bpm} BPM</span>
                      <span>{t.genre || 'Synth'}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
