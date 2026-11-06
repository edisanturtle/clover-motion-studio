'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Film, Play, Pause, RotateCcw, X, Check, ArrowUpRight } from 'lucide-react';
import ModalDialog from '../common/ModalDialog';
import { MOTION_PRESETS } from '../../constants/motionPresets';
import { ASPECT_RATIOS } from '../../constants/fonts';
import { renderSceneToCanvas } from '../../engine/canvasRenderer';

export default function MotionTemplatesModal({
  open,
  onClose,
  project,
  activeScene,
  selectedLayer,
  onApplyMotionTemplate,
}) {
  const [selectedPresetId, setSelectedPresetId] = useState(
    selectedLayer?.motionPreset && selectedLayer.motionPreset !== 'none'
      ? selectedLayer.motionPreset
      : 'kineticWave'
  );
  const [speed, setSpeed] = useState(selectedLayer?.motionSpeed ?? 1);
  const [stagger, setStagger] = useState(selectedLayer?.stagger ?? 0.04);
  const [previewPlaying, setPreviewPlaying] = useState(true);
  const [previewTime, setPreviewTime] = useState(0);
  const canvasRef = useRef(null);

  const dim = ASPECT_RATIOS[project?.ratio] || ASPECT_RATIOS['4:5'];
  const presets = MOTION_PRESETS.filter((p) => p.id !== 'none');

  useEffect(() => {
    if (!open || !previewPlaying) return;
    let rafId;
    let last = performance.now();
    const tick = (now) => {
      const dt = (now - last) / 1000;
      last = now;
      setPreviewTime((t) => (t + dt) % 4);
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [open, previewPlaying]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !activeScene || !open) return;
    const ctx = canvas.getContext('2d');

    const previewScene = {
      ...activeScene,
      layers: (activeScene.layers || []).map((l) =>
        !selectedLayer || l.id === selectedLayer.id || l.role === 'title'
          ? {
              ...l,
              motionPreset: selectedPresetId,
              motionSpeed: speed,
              stagger,
              charAnimate: true,
            }
          : l
      ),
    };

    renderSceneToCanvas({
      ctx,
      width: dim.width,
      height: dim.height,
      scene: previewScene,
      localTime: previewTime,
      audioSignals: { bass: 0.25, mid: 0.2, treble: 0.15, rms: 0.2 },
      selectedLayerId: null,
      showGrid: false,
      showSafeGuides: false,
    });
  }, [open, activeScene, selectedLayer, selectedPresetId, speed, stagger, previewTime, dim]);

  return (
    <ModalDialog
      open={open}
      onClose={onClose}
      ariaLabel="Motion templates"
      maxWidth="max-w-4xl"
    >
      <div className="flex flex-col max-h-[86vh] bg-[#141414] text-neutral-100 select-none overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-neutral-800/80 flex items-start justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <Film className="w-4 h-4 text-neutral-300" />
            <div>
              <h2 className="text-lg font-bold text-white">Motion templates</h2>
              <p className="text-xs text-neutral-400">
                Apply authored entrance, loop, and kinetic letter animations.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-neutral-800/80 hover:bg-neutral-700 flex items-center justify-center text-neutral-400 hover:text-white transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 grid grid-cols-1 md:grid-cols-12 gap-5 min-h-0">
          {/* Left: Preset Cards */}
          <div className="md:col-span-7 space-y-2.5">
            <div className="text-xs font-bold text-white mb-2">Choose motion behavior</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {presets.map((preset) => {
                const active = preset.id === selectedPresetId;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setSelectedPresetId(preset.id)}
                    className={`p-3.5 rounded-2xl border text-left transition-all flex items-start justify-between gap-2 ${
                      active
                        ? 'bg-[#222222] border-white text-white shadow-sm'
                        : 'bg-[#181818] border-neutral-800 text-neutral-300 hover:border-neutral-700'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold text-white">{preset.name}</div>
                      <div className="text-[11px] text-neutral-400 mt-1 leading-relaxed">
                        {preset.desc}
                      </div>
                    </div>
                    {active && <Check className="w-4 h-4 text-white shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right: Live Motion Preview & Timing Controls */}
          <div className="md:col-span-5 space-y-4 border-l border-neutral-800/70 pl-5 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="text-xs font-bold text-white">Live motion preview</div>
              <div className="h-64 rounded-2xl bg-[#0b0b0b] border border-neutral-800 p-3 flex items-center justify-center overflow-hidden">
                <canvas
                  ref={canvasRef}
                  width={dim.width}
                  height={dim.height}
                  className="max-h-full max-w-full object-contain shadow-xl rounded"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPreviewPlaying((v) => !v)}
                  className="p-2 rounded-lg bg-[#202020] hover:bg-neutral-800 border border-neutral-700 text-white"
                >
                  {previewPlaying ? (
                    <Pause className="w-3.5 h-3.5" />
                  ) : (
                    <Play className="w-3.5 h-3.5" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewTime(0)}
                  className="p-2 rounded-lg bg-[#202020] hover:bg-neutral-800 border border-neutral-700 text-neutral-300 hover:text-white"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
                <span className="text-[11px] font-mono text-neutral-400 ml-auto">
                  Muted preview · repeats 4.0 s loop
                </span>
              </div>

              <div className="space-y-3 pt-2 border-t border-neutral-800/80">
                <div>
                  <div className="flex justify-between text-xs text-neutral-300 mb-1">
                    <span>Speed</span>
                    <span className="font-mono">{speed.toFixed(1)}×</span>
                  </div>
                  <input
                    type="range"
                    min={0.2}
                    max={3}
                    step={0.1}
                    value={Number.isFinite(speed) ? speed : 1.0}
                    onChange={(e) => setSpeed(Number(e.target.value) || 1.0)}
                    className="w-full accent-white"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs text-neutral-300 mb-1">
                    <span>Letter Stagger</span>
                    <span className="font-mono">{Math.round((Number.isFinite(stagger) ? stagger : 0.04) * 1000)} ms</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={0.15}
                    step={0.005}
                    value={Number.isFinite(stagger) ? stagger : 0.04}
                    onChange={(e) => setStagger(Number(e.target.value) || 0.04)}
                    className="w-full accent-white"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-neutral-800/80 bg-[#141414] flex items-center justify-end gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[#1e1e1e] hover:bg-neutral-800 border border-neutral-700 text-xs font-semibold text-white transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              const found = MOTION_PRESETS.find((p) => p.id === selectedPresetId);
              const patch = {
                motionPreset: selectedPresetId,
                motionSpeed: speed,
                stagger,
              };
              if (found?.defaultParams) {
                patch.motionStiffness = found.defaultParams.stiffness;
                patch.motionDamping = found.defaultParams.damping;
                patch.motionOvershoot = found.defaultParams.overshoot;
                patch.motionWaveform = found.defaultParams.waveform;
              }
              onApplyMotionTemplate?.(patch);
              onClose();
            }}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-[#159947] hover:bg-[#19b353] border border-[#22c55e]/35 text-white text-xs font-bold transition-colors shadow-[0_2px_12px_rgba(21,153,71,0.3)]"
          >
            <span>Apply motion template</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </ModalDialog>
  );
}
