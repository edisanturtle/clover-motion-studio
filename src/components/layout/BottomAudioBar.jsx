'use client';

import React, { useRef, useState, useEffect } from 'react';
import {
  Volume2,
  VolumeX,
  Upload,
  Play,
  Pause,
  SkipBack,
  Repeat,
  HardDrive,
  Trash2,
  Activity,
  ChevronDown,
  ChevronUp,
  Check,
} from 'lucide-react';
import {
  DEMO_TRACKS,
  RECOMMENDED_AUDIO_BY_USE,
  AUDIO_GROUPS,
} from '../../constants/audioTracks';
import { formatTimecode } from '../../utils/timecode';

export default function BottomAudioBar({
  project,
  editorMode,
  timelineExpanded = true,
  isPlaying,
  loopPlayback,
  setLoopPlayback,
  localTime,
  sceneDuration,
  volume,
  isMuted,
  micActive,
  spectrum,
  onSelectTrack,
  onUploadAudioFile,
  onForgetCustomAudio,
  onToggleMic,
  onToggleMute,
  onChangeVolume,
  onTogglePlay,
  onRestart,
  onSeekLocalTime,
}) {
  const fileInputRef = useRef(null);
  const storagePopoverRef = useRef(null);
  const trackMenuRef = useRef(null);
  const scrubberRef = useRef(null);
  const [storageOpen, setStorageOpen] = useState(false);
  const [trackMenuOpen, setTrackMenuOpen] = useState(false);
  const [rememberAudio, setRememberAudio] = useState(false);

  const currentTrack =
    DEMO_TRACKS.find((t) => t.id === project.audioTrackId) || DEMO_TRACKS[0];

  useEffect(() => {
    const handleOutside = (e) => {
      if (storagePopoverRef.current && !storagePopoverRef.current.contains(e.target)) {
        setStorageOpen(false);
      }
      if (trackMenuRef.current && !trackMenuRef.current.contains(e.target)) {
        setTrackMenuOpen(false);
      }
    };
    window.addEventListener('mousedown', handleOutside);
    return () => window.removeEventListener('mousedown', handleOutside);
  }, []);

  const handleScrub = (e) => {
    const el = scrubberRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    onSeekLocalTime(ratio * (sceneDuration || 12));
  };

  // Group spectrum into 3 bands (BASS, MIDS, TREBLE)
  const bassBars = (spectrum || []).slice(0, 10);
  const midBars = (spectrum || []).slice(10, 20);
  const trebleBars = (spectrum || []).slice(20, 30);

  const playheadPct = Math.min(100, Math.max(0, (localTime / (sceneDuration || 12)) * 100));
  const showTransportInBottomBar = editorMode === 'quick' || !timelineExpanded;

  const triggerLabel = micActive
    ? 'Microphone'
    : project.customAudioName
    ? `File · ${project.customAudioName}`
    : `Demo · ${currentTrack.name}`;

  const subLabel = micActive
    ? 'Live audio input'
    : project.customAudioName
    ? 'Uploaded audio'
    : `${currentTrack.name} · ${currentTrack.bpm} BPM`;

  return (
    <div className="bg-[#0e0e0e] px-2.5 pb-1.5 shrink-0 select-none">
      {/* Main Audio Bar Card */}
      <footer className="h-14 bg-[#161616] border border-neutral-800/80 rounded-2xl px-4 flex items-center justify-between gap-4 relative z-20">
        {/* Left: Categorized Audio Selector Popover, Upload, Device Storage & Transport */}
        <div className="flex items-center gap-2 shrink-0">
          <Activity className="w-4 h-4 text-neutral-400 shrink-0" />

          {/* Custom Categorized Audio Track Selector Menu (Screenshots 29 & 30) */}
          <div className="relative" ref={trackMenuRef}>
            <div className="flex flex-col">
              <button
                type="button"
                onClick={() => setTrackMenuOpen((v) => !v)}
                className={`flex items-center justify-between gap-2 text-xs font-semibold text-white transition-colors ${
                  editorMode === 'quick'
                    ? 'px-2.5 py-1 rounded-lg bg-[#202020] border border-neutral-700/80 min-w-[148px]'
                    : 'px-1.5 py-0.5 rounded hover:bg-neutral-800/70'
                }`}
              >
                <span className="truncate max-w-[130px]">{triggerLabel}</span>
                <ChevronDown className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
              </button>
              <span className="text-[10px] font-mono text-neutral-500 pl-1.5 mt-0.5">
                {subLabel}
              </span>
            </div>

            {trackMenuOpen && (
              <div className="absolute left-0 bottom-14 w-64 rounded-2xl bg-[#1c1c1c] border border-neutral-700/90 shadow-2xl z-50 flex flex-col overflow-hidden">
                <div className="flex justify-center py-1 text-neutral-500 border-b border-neutral-800/60">
                  <ChevronUp className="w-3.5 h-3.5" />
                </div>

                <div className="max-h-[340px] overflow-y-auto custom-scrollbar py-1.5 text-xs">
                  {/* Section 1: Your audio */}
                  <div className="px-3.5 py-1 text-[11px] font-medium text-neutral-400">
                    Your audio
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setTrackMenuOpen(false);
                      fileInputRef.current?.click();
                    }}
                    className="w-full px-3.5 py-1.5 text-left text-white hover:bg-neutral-800 flex items-center justify-between"
                  >
                    <span>Audio file</span>
                    {project.customAudioName && <Check className="w-3.5 h-3.5 text-white" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTrackMenuOpen(false);
                      onToggleMic();
                    }}
                    className="w-full px-3.5 py-1.5 text-left text-white hover:bg-neutral-800 flex items-center justify-between"
                  >
                    <span>Microphone</span>
                    {micActive && <Check className="w-3.5 h-3.5 text-white" />}
                  </button>

                  <div className="my-1.5 border-t border-neutral-800" />

                  {/* Section 2: Recommended · by use */}
                  <div className="px-3.5 py-1 text-[11px] font-medium text-neutral-400">
                    Recommended · by use
                  </div>
                  {RECOMMENDED_AUDIO_BY_USE.map((rec) => {
                    const tr = DEMO_TRACKS.find((t) => t.id === rec.id);
                    if (!tr) return null;
                    const active =
                      !micActive && !project.customAudioName && project.audioTrackId === tr.id;
                    return (
                      <button
                        key={rec.id}
                        type="button"
                        title={tr.detail}
                        onClick={() => {
                          onSelectTrack(tr.id);
                          setTrackMenuOpen(false);
                        }}
                        className="w-full px-3.5 py-1.5 text-left hover:bg-neutral-800 flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-medium text-white truncate">{tr.name}</div>
                          {rec.use && (
                            <div className="text-[10px] text-neutral-400 truncate">{rec.use}</div>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-[11px] font-mono text-neutral-400">
                            {tr.bpm} BPM
                          </span>
                          {active && <Check className="w-3.5 h-3.5 text-[#22c55e]" />}
                        </div>
                      </button>
                    );
                  })}

                  {/* Remaining Groups: More · Grooves, More · Atmospheres, etc. */}
                  {AUDIO_GROUPS.map((grp) => {
                    const groupTracks = DEMO_TRACKS.filter(
                      (t) =>
                        t.group === grp.id &&
                        !RECOMMENDED_AUDIO_BY_USE.some((r) => r.id === t.id)
                    );
                    if (groupTracks.length === 0) return null;
                    return (
                      <React.Fragment key={grp.id}>
                        <div className="my-1.5 border-t border-neutral-800" />
                        <div className="px-3.5 py-1 text-[11px] font-medium text-neutral-400">
                          {grp.label}
                        </div>
                        {groupTracks.map((tr) => {
                          const active =
                            !micActive &&
                            !project.customAudioName &&
                            project.audioTrackId === tr.id;
                          return (
                            <button
                              key={tr.id}
                              type="button"
                              title={tr.detail}
                              onClick={() => {
                                onSelectTrack(tr.id);
                                setTrackMenuOpen(false);
                              }}
                              className="w-full px-3.5 py-1.5 text-left hover:bg-neutral-800 flex items-center justify-between gap-2"
                            >
                              <span className="text-xs font-medium text-white truncate">
                                {tr.name}
                              </span>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <span className="text-[11px] font-mono text-neutral-400">
                                  {tr.bpm} BPM
                                </span>
                                {active && <Check className="w-3.5 h-3.5 text-[#22c55e]" />}
                              </div>
                            </button>
                          );
                        })}
                      </React.Fragment>
                    );
                  })}
                </div>

                <div className="flex justify-center py-1 text-neutral-500 border-t border-neutral-800/60">
                  <ChevronDown className="w-3.5 h-3.5" />
                </div>
              </div>
            )}
          </div>

          {/* Upload Audio Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-2 rounded-lg bg-[#202020] hover:bg-neutral-800 border border-neutral-800 text-neutral-300 hover:text-white transition-colors"
            title="Upload custom audio (.mp3, .wav, .ogg)"
          >
            <Upload className="w-3.5 h-3.5" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onUploadAudioFile(file);
              e.target.value = '';
            }}
            className="hidden"
          />

          {/* Audio on this device Popover (Screenshot 28) */}
          <div className="relative" ref={storagePopoverRef}>
            <button
              type="button"
              onClick={() => setStorageOpen((v) => !v)}
              className={`p-2 rounded-lg border transition-colors ${
                storageOpen
                  ? 'bg-[#2a2a2a] border-white text-white'
                  : 'bg-[#202020] border-neutral-800 text-neutral-400 hover:text-white'
              }`}
              title="Audio on this device"
            >
              <HardDrive className="w-3.5 h-3.5" />
            </button>

            {storageOpen && (
              <div className="absolute left-0 bottom-12 w-72 rounded-2xl bg-[#202020] border border-neutral-700/90 shadow-2xl p-4 z-50 space-y-3">
                <div>
                  <div className="text-xs font-bold text-white">Audio on this device</div>
                  <div className="text-[11px] text-neutral-400 mt-0.5">
                    Audio is available for this session.
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs font-medium text-neutral-200">
                    Remember this audio
                  </span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={rememberAudio}
                    onClick={() => setRememberAudio((v) => !v)}
                    className={`w-9 h-5 rounded-full transition-colors p-0.5 ${
                      rememberAudio ? 'bg-white' : 'bg-neutral-700'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full transition-transform ${
                        rememberAudio
                          ? 'translate-x-4 bg-black'
                          : 'translate-x-0 bg-neutral-300'
                      }`}
                    />
                  </button>
                </div>

                <p className="text-[11px] text-neutral-400 leading-relaxed">
                  Saved audio reopens in this browser. It stays on your device and is excluded from
                  project JSON. Older files may be removed when storage is full.
                </p>

                <button
                  type="button"
                  onClick={() => {
                    onForgetCustomAudio?.();
                    setStorageOpen(false);
                  }}
                  className="w-full py-2 px-3 rounded-xl bg-[#2a2a2a] hover:bg-neutral-700 border border-neutral-700 flex items-center justify-center gap-2 text-xs text-neutral-300 hover:text-white transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Forget local copy</span>
                </button>
              </div>
            )}
          </div>

          {/* Transport Controls (Shown in Quick Editor or when Timeline is collapsed — Screenshots 8, 26, 36–47) */}
          {showTransportInBottomBar && (
            <div className="flex items-center gap-1.5 ml-1">
              <button
                type="button"
                onClick={onRestart}
                className="p-2 rounded-lg bg-[#202020] hover:bg-neutral-800 border border-neutral-800 text-neutral-300 hover:text-white"
                title="Jump to start"
              >
                <SkipBack className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={onTogglePlay}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#242424] hover:bg-neutral-700 border border-neutral-700 text-xs font-semibold text-white transition-colors"
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
                    : 'bg-[#202020] border-neutral-800 text-neutral-400 hover:text-white'
                }`}
                title="Loop"
              >
                <Repeat className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Center: Interactive Tick-Mark Waveform Scrubber */}
        <div className="flex-1 flex items-center gap-3 min-w-0 max-w-2xl mx-auto">
          <span className="text-[11px] font-mono text-neutral-400 shrink-0">
            {editorMode === 'quick'
              ? `${localTime.toFixed(1)} s`
              : formatTimecode(localTime, project.fps || 30)}
          </span>

          <div
            ref={scrubberRef}
            onPointerDown={handleScrub}
            className="flex-1 h-7 relative flex items-center justify-between cursor-pointer px-1"
          >
            {Array.from({ length: 48 }).map((_, idx) => {
              const pct = (idx / 47) * 100;
              const isPassed = pct <= playheadPct;
              const isMajor = idx % 6 === 0;
              return (
                <div
                  key={idx}
                  className={`w-px transition-colors ${
                    isMajor ? 'h-3' : 'h-1.5'
                  } ${isPassed ? 'bg-[#22c55e]' : 'bg-neutral-700'}`}
                />
              );
            })}

            {/* Playhead Indicator Bar */}
            <div
              style={{ left: `${playheadPct}%` }}
              className="absolute top-1 bottom-1 w-0.5 bg-[#22c55e] shadow-[0_0_6px_rgba(34,197,94,0.9)] pointer-events-none"
            />
          </div>

          <span className="text-[11px] font-mono text-neutral-400 shrink-0">
            {editorMode === 'quick'
              ? `${(sceneDuration || 12).toFixed(1)} s`
              : formatTimecode(sceneDuration || 12, project.fps || 30)}
          </span>
        </div>

        {/* Right: 3-Band Visualizer (BASS | MIDS | TREBLE — shown only in Advanced Mode) + Volume */}
        <div className="flex items-center gap-4 shrink-0">
          {editorMode === 'advanced' && (
            <div className="hidden lg:flex items-center gap-3">
              {[
                { label: 'BASS', bars: bassBars },
                { label: 'MIDS', bars: midBars },
                { label: 'TREBLE', bars: trebleBars },
              ].map((band) => (
                <div key={band.label} className="flex items-center gap-1.5">
                  <span className="text-[10px] font-mono text-neutral-500 uppercase">
                    {band.label}
                  </span>
                  <div className="flex items-end gap-0.5 h-3.5">
                    {Array.from({ length: 10 }).map((_, i) => {
                      const val = band.bars[i] ?? 0.15;
                      const hPct = Math.max(20, Math.min(100, Math.round(val * 100)));
                      return (
                        <div
                          key={i}
                          style={{ height: `${hPct}%` }}
                          className={`w-0.5 rounded-full transition-all duration-75 ${
                            val > 0.35 ? 'bg-[#22c55e]' : 'bg-neutral-700'
                          }`}
                        />
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Mute & Volume Slider */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onToggleMute}
              className="text-neutral-400 hover:text-white transition-colors"
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-4 h-4 text-red-400" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.02}
              value={isMuted ? 0 : volume}
              onChange={(e) => onChangeVolume(Number(e.target.value))}
              className="w-20 accent-[#16a34a] cursor-pointer"
            />
          </div>
        </div>
      </footer>

      {/* Bottom-most Privacy & Shortcut Hints Footer Bar */}
      <div className="h-5 px-2 pt-1 flex items-center justify-between text-[10px] font-mono text-neutral-500">
        <span>Audio stays on your device · Saved projects are private</span>
        <div className="flex items-center gap-3">
          <span>
            <strong className="text-neutral-400">F</strong> preview
          </span>
          <span>/</span>
          <span>
            <strong className="text-neutral-400">SPACE</strong> play / pause
          </span>
          <span>/</span>
          <span>
            <strong className="text-neutral-400">⌘ Z</strong> undo
          </span>
        </div>
      </div>
    </div>
  );
}
