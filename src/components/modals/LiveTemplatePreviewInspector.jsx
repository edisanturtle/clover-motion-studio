'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Check, Pause, Play, RotateCcw, Volume2 } from 'lucide-react';
import { ASPECT_RATIOS } from '../../constants/fonts';
import { DEMO_TRACKS } from '../../constants/audioTracks';
import { formatTimecode } from '../../utils/timecode';
import { buildProjectFromTemplate } from '../../utils/projectBuilder';
import { renderSceneToCanvas } from '../../engine/canvasRenderer';

export default function LiveTemplatePreviewInspector({
  template,
  previewRatio = '1:1',
  setPreviewRatio,
  audioEngineRef,
}) {
  const previewCanvasRef = useRef(null);
  const [sceneIdx, setSceneIdx] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [soundOn, setSoundOn] = useState(false);
  const [localTime, setLocalTime] = useState(5.0);

  const previewProj = useMemo(
    () => buildProjectFromTemplate(template, previewRatio),
    [template, previewRatio]
  );

  const dim = ASPECT_RATIOS[previewRatio] || ASPECT_RATIOS['1:1'];
  const safeSceneIdx = Math.min(sceneIdx, (previewProj.scenes?.length || 1) - 1);
  const activeSc = previewProj.scenes?.[safeSceneIdx] || previewProj.scenes?.[0];
  const totalDuration = (template.scenes || []).reduce((a, b) => a + b.duration, 0);

  const trackMeta =
    DEMO_TRACKS.find((d) => d.id === template.audioTrackId) || DEMO_TRACKS[0];

  useEffect(() => {
    setSceneIdx(Math.min(1, (template.scenes?.length || 1) - 1));
    setLocalTime(5.0);
  }, [template.id, template.scenes?.length]);

  useEffect(() => {
    if (!isPlaying) return;
    let rafId;
    let last = performance.now();
    const tick = (now) => {
      const dt = (now - last) / 1000;
      last = now;
      setLocalTime((t) => (t + dt) % (totalDuration || 12));
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [isPlaying, totalDuration]);

  useEffect(() => {
    const canvas = previewCanvasRef.current;
    if (!canvas || !activeSc) return;
    const ctx = canvas.getContext('2d');
    renderSceneToCanvas({
      ctx,
      width: dim.width,
      height: dim.height,
      scene: activeSc,
      localTime,
      audioSignals: { bass: 0.25, mid: 0.2, treble: 0.15, rms: 0.2 },
      selectedLayerId: null,
      showGrid: false,
      showSafeGuides: false,
    });
  }, [activeSc, dim.width, dim.height, localTime]);

  const handleToggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    if (next) {
      audioEngineRef?.current?.start(trackMeta);
      setIsPlaying(true);
    } else {
      audioEngineRef?.current?.stop();
    }
  };

  return (
    <div className="p-4 rounded-2xl bg-[#181818] border border-neutral-800 space-y-3.5 text-xs">
      {/* Header Metadata (Screenshots 1–5) */}
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-wider text-neutral-400">
            {template.badge === 'START HERE'
              ? 'READY-MADE DESIGN'
              : (template.category || 'READY-MADE DESIGN').replace(/_/g, ' ').toUpperCase()}
          </div>
          <h3 className="text-xl font-bold text-white mt-0.5">{template.name}</h3>
          <div className="text-neutral-400">{template.purpose}</div>
        </div>
        <div className="text-right font-mono text-[11px] text-neutral-400">
          <div>{totalDuration} s</div>
          <div>{template.scenes?.length || 3} scenes</div>
        </div>
      </div>

      {/* Format Switcher Segmented Control: Feed · 4:5 | Square · 1:1 | Story · 9:16 */}
      <div className="grid grid-cols-3 bg-[#111111] p-1 rounded-xl border border-neutral-800">
        {Object.values(ASPECT_RATIOS).map((fp) => {
          const act = fp.id === previewRatio;
          return (
            <button
              type="button"
              key={fp.id}
              onClick={() => setPreviewRatio(fp.id)}
              className={`py-1.5 rounded-lg font-medium transition ${
                act
                  ? 'bg-[#159947] text-white font-semibold shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              {fp.shortLabel}
            </button>
          );
        })}
      </div>

      {/* Live Canvas Preview Stage */}
      <div className="h-64 bg-[#050505] rounded-xl flex items-center justify-center p-3 overflow-hidden border border-neutral-800/80">
        <canvas
          ref={previewCanvasRef}
          width={dim.width}
          height={dim.height}
          className="max-h-full max-w-full w-auto h-auto object-contain shadow-2xl"
        />
      </div>

      {/* Transport Scrubber Row */}
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={() => setIsPlaying((v) => !v)}
          className="text-neutral-300 hover:text-white p-1"
          title="Play / Pause preview"
        >
          {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
        </button>
        <button
          type="button"
          onClick={() => setLocalTime(0)}
          className="text-neutral-400 hover:text-white p-1"
          title="Restart"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
        <input
          type="range"
          min={0}
          max={totalDuration || 12}
          step={0.1}
          value={Number.isFinite(localTime) ? localTime : 0}
          onChange={(e) => setLocalTime(Number(e.target.value) || 0)}
          className="flex-1 accent-[#16a34a] cursor-pointer"
        />
        <span className="font-mono text-[10px] text-neutral-400">
          {formatTimecode(localTime, 30)}
        </span>
      </div>

      {/* Scene Selector Pills (Screenshot 2 & 7) */}
      <div
        className={`grid gap-2 ${
          (template.scenes?.length || 3) === 4 ? 'grid-cols-4' : 'grid-cols-3'
        }`}
      >
        {(template.scenes || []).map((sc, idx) => {
          const act = idx === safeSceneIdx;
          return (
            <button
              type="button"
              key={sc.id || sc.name}
              onClick={() => {
                setSceneIdx(idx);
                setLocalTime(1.0);
              }}
              className={`p-2.5 rounded-xl border text-left transition ${
                act
                  ? 'bg-[#159947]/20 border-[#22c55e] text-white'
                  : 'bg-[#121212] border-neutral-800 text-neutral-400 hover:text-white'
              }`}
            >
              <div className="font-semibold truncate">{sc.name}</div>
              <div className="font-mono text-[10px] text-neutral-400 mt-0.5">
                {sc.duration} s
              </div>
            </button>
          );
        })}
      </div>

      {/* Hear Sound Row (Screenshot 2 & 7) */}
      <div className="flex items-center justify-between pt-1">
        <button
          type="button"
          onClick={handleToggleSound}
          className={`px-3 py-1.5 rounded-xl border font-medium flex items-center gap-1.5 transition ${
            soundOn
              ? 'bg-white text-black border-white font-semibold'
              : 'bg-[#121212] border-neutral-700 text-neutral-200 hover:border-neutral-500'
          }`}
        >
          <Volume2 className="w-3.5 h-3.5" />
          <span>{soundOn ? 'Sound on' : 'Hear sound'}</span>
        </button>
        <span className="text-[11px] text-neutral-400 font-mono">
          {trackMeta.name} · {trackMeta.bpm} BPM
        </span>
      </div>

      {/* Description & Editable Checkmark */}
      <p className="text-[11px] text-neutral-400 leading-relaxed">
        {template.description}
      </p>
      <div className="text-[11px] text-neutral-300 flex items-center gap-1.5 pt-0.5">
        <Check className="w-3.5 h-3.5 text-neutral-300" />
        <span>Text, motion, sound. All editable.</span>
      </div>
    </div>
  );
}
