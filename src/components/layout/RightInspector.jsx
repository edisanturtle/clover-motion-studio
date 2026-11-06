'use client';

import React, { useState, useRef } from 'react';
import {
  Type,
  Sliders,
  Lock,
  Unlock,
  AlignLeft,
  AlignCenter,
  AlignRight,
  ChevronDown,
  ChevronRight,
  Film,
  Upload,
  Plus,
  Activity,
} from 'lucide-react';
import { FONT_OPTIONS } from '../../constants/fonts';
import {
  MOTION_PRESETS,
  MOTION_EASING_OPTIONS,
  MOTION_DIRECTIONS,
  MOTION_TARGETS,
} from '../../constants/motionPresets';
import { GRAPHIC_SHAPES, MOTION_GRAPHICS_ASSETS } from '../../constants/graphicAssets';
import { solveSpring } from '../../utils/timecode';

function SpringCurvePreview({ stiffness = 200, damping = 13, overshoot = 1.2 }) {
  const points = [];
  const w = 240;
  const h = 54;
  for (let i = 0; i <= 60; i++) {
    const t = (i / 60) * 1.5;
    const yVal = solveSpring(t, { stiffness, damping, mass: 1 });
    const px = (i / 60) * (w - 16) + 8;
    const py = (h - 12) - Math.min(1.4, Math.max(-0.4, yVal)) * (h - 26);
    points.push(`${px.toFixed(1)},${py.toFixed(1)}`);
  }
  return (
    <div className="rounded-lg bg-[#141414] border border-neutral-800 p-2.5 space-y-1">
      <div className="flex items-center justify-between text-[10px] text-neutral-400">
        <span className="font-mono text-[#4ade80]">Spring Response Curve</span>
        <span className="font-mono text-[9px] text-neutral-500">t: 0..1.5s</span>
      </div>
      <svg className="w-full h-12 overflow-visible" viewBox={`0 0 ${w} ${h}`}>
        <line x1="8" y1={h - 12} x2={w - 8} y2={h - 12} stroke="#333" strokeDasharray="2,2" strokeWidth="1" />
        <line x1="8" y1={14} x2={w - 8} y2={14} stroke="#22c55e" strokeDasharray="3,3" strokeWidth="1" opacity="0.4" />
        <polyline fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points={points.join(' ')} />
      </svg>
    </div>
  );
}

export default function RightInspector({
  selectedLayer,
  activeScene,
  audioSignals = { bass: 0, mid: 0, treble: 0, rms: 0 },
  onUpdateLayer,
  onUpdateSceneProp,
  onUploadCustomFont,
  onUploadCustomImage,
  onOpenMotionTemplates,
  customFonts = [],
  advancedSubMode = 'design',
}) {
  const [activeTab, setActiveTab] = useState(advancedSubMode || 'design'); // 'design' | 'motion' | 'audio'

  // Keep activeTab in sync when user toggles Design / Motion in top header
  React.useEffect(() => {
    if (advancedSubMode && (advancedSubMode === 'design' || advancedSubMode === 'motion')) {
      setActiveTab(advancedSubMode);
    }
  }, [advancedSubMode]);
  const [wordsOpen, setWordsOpen] = useState(true);
  const [textAnimOpen, setTextAnimOpen] = useState(false); // Collapsed by default per Screenshot 20
  const [graphicMappingsCount, setGraphicMappingsCount] = useState(0);
  const fontFileRef = useRef(null);
  const imgFileRef = useRef(null);

  const allFonts = [...customFonts, ...FONT_OPTIONS];
  const isGraphic = selectedLayer?.type === 'graphic';

  // Compute live 0..100 percentages for the 5 signal meter bars in Graphic Audio tab (Screenshot 36)
  const meterAmplitude = Math.round(Math.max(12, Math.min(100, (audioSignals.rms || 0.18) * 100)));
  const meterBass = Math.round(Math.max(15, Math.min(100, (audioSignals.bass || 0.22) * 100)));
  const meterMids = Math.round(Math.max(14, Math.min(100, (audioSignals.mid || 0.2) * 100)));
  const meterTreble = Math.round(Math.max(12, Math.min(100, (audioSignals.treble || 0.16) * 100)));
  const meterTransients = Math.round(
    Math.max(18, Math.min(100, Math.max(audioSignals.bass || 0.2, audioSignals.treble || 0.18) * 95))
  );

  return (
    <aside className="w-[300px] bg-[#161616] border-l border-neutral-800/80 flex flex-col shrink-0 select-none h-full overflow-hidden">
      {/* Top Header: Text properties / Graphic properties */}
      <div className="p-3.5 border-b border-neutral-800/80 space-y-3 shrink-0">
        <div className="flex items-center justify-between text-xs text-neutral-300 font-medium">
          <span>
            {selectedLayer
              ? isGraphic
                ? 'Graphic properties'
                : 'Text properties'
              : 'Scene properties'}
          </span>
          {selectedLayer?.type === 'text' ? (
            <Type className="w-3.5 h-3.5 text-neutral-400" />
          ) : (
            <Sliders className="w-3.5 h-3.5 text-neutral-400" />
          )}
        </div>

        {/* Layer Name Input + Lock Icon */}
        {selectedLayer && (
          <div className="flex items-center gap-1.5">
            <input
              type="text"
              value={selectedLayer.name || ''}
              onChange={(e) => onUpdateLayer(selectedLayer.id, { name: e.target.value })}
              className="flex-1 px-3 py-1.5 rounded-lg bg-[#202020] border border-neutral-700/80 text-xs font-medium text-white focus:outline-none focus:border-neutral-500"
            />
            <button
              type="button"
              onClick={() =>
                onUpdateLayer(selectedLayer.id, { locked: !selectedLayer.locked })
              }
              className="p-2 rounded-lg bg-[#202020] border border-neutral-700/80 text-neutral-400 hover:text-white transition-colors"
              title={selectedLayer.locked ? 'Unlock layer' : 'Lock layer'}
            >
              {selectedLayer.locked ? (
                <Lock className="w-3.5 h-3.5 text-amber-400" />
              ) : (
                <Unlock className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        )}

        {/* Segmented Sub-tabs: Design | Motion | Audio */}
        <div className="grid grid-cols-3 bg-[#202020] p-0.5 rounded-lg border border-neutral-800">
          {[
            { id: 'design', label: 'Design' },
            { id: 'motion', label: 'Motion' },
            { id: 'audio', label: 'Audio' },
          ].map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`py-1 rounded-md text-xs font-medium transition-colors ${
                  active
                    ? 'bg-[#159947]/25 text-[#4ade80] border border-[#22c55e]/60 shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Scrollable Inspector Body */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-3.5 space-y-4">
        {!selectedLayer ? (
          <div className="space-y-4">
            <div className="text-xs text-neutral-400 leading-relaxed">
              Select any text or graphic layer on the canvas to inspect its design, motion, and audio reactivity.
            </div>
            {activeScene && (
              <div className="p-3 rounded-xl bg-[#1e1e1e] border border-neutral-800 space-y-3">
                <div className="text-xs font-semibold text-white">Scene Background</div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-neutral-400">Paper Color</span>
                  <input
                    type="color"
                    value={activeScene.bg || '#f4f1ea'}
                    onChange={(e) => onUpdateSceneProp('bg', e.target.value)}
                    className="w-8 h-6 rounded cursor-pointer bg-transparent border-0"
                  />
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* =========================================================
                TAB 1: DESIGN (Screenshot 21)
               ========================================================= */}
            {activeTab === 'design' && (
              <div className="space-y-4">
                {selectedLayer.type === 'text' ? (
                  <>
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between text-xs font-semibold text-white">
                        <span>Text & typeface</span>
                        <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
                      </div>

                      <textarea
                        rows={3}
                        value={selectedLayer.text || ''}
                        onChange={(e) =>
                          onUpdateLayer(selectedLayer.id, { text: e.target.value })
                        }
                        className="w-full px-3 py-2.5 rounded-xl bg-[#202020] border border-neutral-700/80 text-xs font-medium text-white focus:outline-none focus:border-neutral-500 resize-y"
                      />

                      <div className="flex items-center justify-between text-[11px] text-neutral-400 px-0.5">
                        <span>Whole text</span>
                        <span className="px-1.5 py-0.5 rounded bg-[#202020] border border-neutral-800 font-mono text-[10px]">
                          I
                        </span>
                      </div>
                    </div>

                    <div className="space-y-3 pt-2 border-t border-neutral-800/80">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] text-neutral-400">Typeface</label>
                        <button
                          type="button"
                          onClick={() => fontFileRef.current?.click()}
                          className="text-[10px] font-mono text-neutral-300 hover:text-white underline flex items-center gap-1"
                        >
                          <Upload className="w-2.5 h-2.5" /> Import font
                        </button>
                        <input
                          ref={fontFileRef}
                          type="file"
                          accept=".ttf,.otf,.woff,.woff2"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) onUploadCustomFont(file);
                            e.target.value = '';
                          }}
                          className="hidden"
                        />
                      </div>

                      <select
                        value={selectedLayer.fontFamily}
                        onChange={(e) =>
                          onUpdateLayer(selectedLayer.id, { fontFamily: e.target.value })
                        }
                        className="w-full px-2.5 py-2 rounded-lg bg-[#202020] border border-neutral-700/80 text-xs text-white focus:outline-none"
                      >
                        {allFonts.map((f) => (
                          <option key={f.id} value={f.family}>
                            {f.name} ({f.category})
                          </option>
                        ))}
                      </select>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] text-neutral-400 mb-1">
                            Size ({selectedLayer.fontSize}px)
                          </label>
                          <input
                            type="range"
                            min={14}
                            max={280}
                            value={selectedLayer.fontSize || 96}
                            onChange={(e) =>
                              onUpdateLayer(selectedLayer.id, {
                                fontSize: Number(e.target.value),
                              })
                            }
                            className="w-full accent-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-neutral-400 mb-1">
                            Line Height ({(selectedLayer.lineHeight || 1).toFixed(2)})
                          </label>
                          <input
                            type="range"
                            min={0.75}
                            max={1.8}
                            step={0.02}
                            value={selectedLayer.lineHeight || 1}
                            onChange={(e) =>
                              onUpdateLayer(selectedLayer.id, {
                                lineHeight: Number(e.target.value),
                              })
                            }
                            className="w-full accent-white"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] text-neutral-400 mb-1">
                            Weight ({selectedLayer.fontWeight || 700})
                          </label>
                          <select
                            value={selectedLayer.fontWeight || 700}
                            onChange={(e) =>
                              onUpdateLayer(selectedLayer.id, {
                                fontWeight: Number(e.target.value),
                              })
                            }
                            className="w-full px-2 py-1.5 rounded-lg bg-[#202020] border border-neutral-700/80 text-xs font-mono text-white"
                          >
                            <option value={300}>300 - Light</option>
                            <option value={400}>400 - Regular</option>
                            <option value={500}>500 - Medium</option>
                            <option value={600}>600 - SemiBold</option>
                            <option value={700}>700 - Bold</option>
                            <option value={800}>800 - ExtraBold</option>
                            <option value={900}>900 - Black</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] text-neutral-400 mb-1">
                            Tracking ({(selectedLayer.letterSpacing || 0)}px)
                          </label>
                          <input
                            type="range"
                            min={-6}
                            max={32}
                            step={1}
                            value={selectedLayer.letterSpacing || 0}
                            onChange={(e) =>
                              onUpdateLayer(selectedLayer.id, {
                                letterSpacing: Number(e.target.value),
                              })
                            }
                            className="w-full accent-white"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <div className="flex items-center gap-1 bg-[#202020] p-0.5 rounded-lg border border-neutral-800">
                          {[
                            { id: 'left', icon: AlignLeft },
                            { id: 'center', icon: AlignCenter },
                            { id: 'right', icon: AlignRight },
                          ].map((al) => {
                            const Icon = al.icon;
                            const active = (selectedLayer.align || 'center') === al.id;
                            return (
                              <button
                                key={al.id}
                                type="button"
                                onClick={() =>
                                  onUpdateLayer(selectedLayer.id, { align: al.id })
                                }
                                className={`p-1.5 rounded-md ${
                                  active
                                    ? 'bg-neutral-700 text-white'
                                    : 'text-neutral-400 hover:text-white'
                                }`}
                              >
                                <Icon className="w-3.5 h-3.5" />
                              </button>
                            );
                          })}
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-neutral-400">Color</span>
                          <input
                            type="color"
                            value={selectedLayer.color || '#111111'}
                            onChange={(e) =>
                              onUpdateLayer(selectedLayer.id, { color: e.target.value })
                            }
                            className="w-7 h-7 rounded cursor-pointer bg-transparent border-0"
                          />
                        </div>
                      </div>

                      {/* Text Transform, Stroke & Shadow (VectorCraft & LightCraft Styling) */}
                      <div className="space-y-2.5 pt-2 border-t border-neutral-800">
                        {/* Text Case Transform */}
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-neutral-400">Case Transform</span>
                          <div className="flex items-center gap-1 bg-[#181818] p-0.5 rounded-lg border border-neutral-800 text-[10px]">
                            {[
                              { id: 'none', label: 'Raw' },
                              { id: 'uppercase', label: 'AA' },
                              { id: 'capitalize', label: 'Aa' },
                              { id: 'lowercase', label: 'aa' },
                            ].map((tc) => (
                              <button
                                key={tc.id}
                                type="button"
                                onClick={() => onUpdateLayer(selectedLayer.id, { textTransform: tc.id })}
                                className={`px-2 py-0.5 rounded font-mono ${
                                  (selectedLayer.textTransform || 'none') === tc.id
                                    ? 'bg-[#159947] text-white font-bold'
                                    : 'text-neutral-400 hover:text-white'
                                }`}
                              >
                                {tc.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Text Stroke / Outline */}
                        <div className="space-y-1.5">
                          <label className="flex items-center justify-between cursor-pointer">
                            <span className="text-[11px] text-neutral-300">Text Stroke Outline</span>
                            <input
                              type="checkbox"
                              checked={Boolean(selectedLayer.strokeEnabled)}
                              onChange={(e) => onUpdateLayer(selectedLayer.id, { strokeEnabled: e.target.checked })}
                              className="rounded accent-[#159947]"
                            />
                          </label>
                          {selectedLayer.strokeEnabled && (
                            <div className="flex items-center gap-2 pl-1">
                              <span className="text-[10px] text-neutral-400">Width ({selectedLayer.strokeWidth || 2}px)</span>
                              <input
                                type="range"
                                min={1}
                                max={8}
                                value={selectedLayer.strokeWidth || 2}
                                onChange={(e) => onUpdateLayer(selectedLayer.id, { strokeWidth: Number(e.target.value) })}
                                className="flex-1 accent-[#16a34a]"
                              />
                              <input
                                type="color"
                                value={selectedLayer.strokeColor || '#000000'}
                                onChange={(e) => onUpdateLayer(selectedLayer.id, { strokeColor: e.target.value })}
                                className="w-5 h-5 rounded cursor-pointer bg-transparent border-0 shrink-0"
                              />
                            </div>
                          )}
                        </div>

                        {/* Text Glow / Drop Shadow */}
                        <div className="space-y-1.5">
                          <label className="flex items-center justify-between cursor-pointer">
                            <span className="text-[11px] text-neutral-300">Drop Shadow / Glow</span>
                            <input
                              type="checkbox"
                              checked={Boolean(selectedLayer.shadowEnabled)}
                              onChange={(e) => onUpdateLayer(selectedLayer.id, { shadowEnabled: e.target.checked })}
                              className="rounded accent-[#159947]"
                            />
                          </label>
                          {selectedLayer.shadowEnabled && (
                            <div className="flex items-center gap-2 pl-1">
                              <span className="text-[10px] text-neutral-400">Blur ({selectedLayer.shadowBlur || 14}px)</span>
                              <input
                                type="range"
                                min={2}
                                max={36}
                                value={selectedLayer.shadowBlur || 14}
                                onChange={(e) => onUpdateLayer(selectedLayer.id, { shadowBlur: Number(e.target.value) })}
                                className="flex-1 accent-[#16a34a]"
                              />
                              <input
                                type="color"
                                value={selectedLayer.shadowColor || '#000000'}
                                onChange={(e) => onUpdateLayer(selectedLayer.id, { shadowColor: e.target.value })}
                                className="w-5 h-5 rounded cursor-pointer bg-transparent border-0 shrink-0"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  /* Graphic Layer Design Controls */
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-white">Graphic Shape</label>
                      <button
                        type="button"
                        onClick={() => imgFileRef.current?.click()}
                        className="text-[10px] font-mono text-neutral-300 hover:text-white underline flex items-center gap-1"
                      >
                        <Upload className="w-2.5 h-2.5" /> Upload SVG/PNG
                      </button>
                      <input
                        ref={imgFileRef}
                        type="file"
                        accept=".svg,.png,.jpg,.jpeg,.webp"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) onUploadCustomImage(file);
                          e.target.value = '';
                        }}
                        className="hidden"
                      />
                    </div>

                    <select
                      value={selectedLayer.assetId || 'swissCross'}
                      onChange={(e) =>
                        onUpdateLayer(selectedLayer.id, { assetId: e.target.value })
                      }
                      className="w-full px-2.5 py-2 rounded-lg bg-[#202020] border border-neutral-700/80 text-xs text-white focus:outline-none"
                    >
                      <optgroup label="Vector Primitives">
                        {GRAPHIC_SHAPES.map((g) => (
                          <option key={g.id} value={g.id}>
                            {g.name}
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="Kinetic HUD & Audio">
                        {MOTION_GRAPHICS_ASSETS.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name}
                          </option>
                        ))}
                      </optgroup>
                    </select>

                    <div>
                      <label className="block text-[10px] text-neutral-400 mb-1">
                        Size ({selectedLayer.size || 360}px)
                      </label>
                      <input
                        type="range"
                        min={60}
                        max={900}
                        value={selectedLayer.size || 360}
                        onChange={(e) =>
                          onUpdateLayer(selectedLayer.id, { size: Number(e.target.value) })
                        }
                        className="w-full accent-white"
                      />
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-xs text-neutral-400">Primary Color</span>
                      <input
                        type="color"
                        value={selectedLayer.color || '#16a34a'}
                        onChange={(e) =>
                          onUpdateLayer(selectedLayer.id, { color: e.target.value })
                        }
                        className="w-7 h-7 rounded cursor-pointer bg-transparent border-0"
                      />
                    </div>
                  </div>
                )}

                {/* Transform Controls (Position, Scale, Rotation, Opacity) */}
                <div className="pt-3 border-t border-neutral-800/80 space-y-2.5">
                  <div className="text-xs font-semibold text-white">Transform</div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-neutral-400 mb-1">Pos X</label>
                      <input
                        type="number"
                        value={Math.round(selectedLayer.x || 0)}
                        onChange={(e) =>
                          onUpdateLayer(selectedLayer.id, { x: Number(e.target.value) })
                        }
                        className="w-full px-2.5 py-1.5 rounded-lg bg-[#202020] border border-neutral-800 text-xs font-mono text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-neutral-400 mb-1">Pos Y</label>
                      <input
                        type="number"
                        value={Math.round(selectedLayer.y || 0)}
                        onChange={(e) =>
                          onUpdateLayer(selectedLayer.id, { y: Number(e.target.value) })
                        }
                        className="w-full px-2.5 py-1.5 rounded-lg bg-[#202020] border border-neutral-800 text-xs font-mono text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-1">
                    <div>
                      <label className="block text-[10px] text-neutral-400 mb-1">
                        Scale ({Math.round((selectedLayer.scale ?? 1) * 100)}%)
                      </label>
                      <input
                        type="range"
                        min={0.1}
                        max={3.0}
                        step={0.05}
                        value={selectedLayer.scale ?? 1}
                        onChange={(e) =>
                          onUpdateLayer(selectedLayer.id, { scale: Number(e.target.value) })
                        }
                        className="w-full accent-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-neutral-400 mb-1">
                        Rot ({Math.round(selectedLayer.rotation || 0)}°)
                      </label>
                      <input
                        type="range"
                        min={-180}
                        max={180}
                        step={1}
                        value={selectedLayer.rotation || 0}
                        onChange={(e) =>
                          onUpdateLayer(selectedLayer.id, { rotation: Number(e.target.value) })
                        }
                        className="w-full accent-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-neutral-400 mb-1">
                        Alpha ({Math.round((selectedLayer.opacity ?? 1) * 100)}%)
                      </label>
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.05}
                        value={selectedLayer.opacity ?? 1}
                        onChange={(e) =>
                          onUpdateLayer(selectedLayer.id, { opacity: Number(e.target.value) })
                        }
                        className="w-full accent-white"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* =========================================================
                TAB 2: MOTION (Behance & Swiss Physics Dynamics)
               ========================================================= */}
            {activeTab === 'motion' && (
              <div className="space-y-4">
                <button
                  type="button"
                  onClick={() => onOpenMotionTemplates?.()}
                  className="w-full py-2.5 px-3 rounded-xl bg-[#222222] hover:bg-neutral-800 border border-neutral-700/80 flex items-center justify-center gap-2 text-xs font-semibold text-white transition-colors"
                >
                  <Film className="w-3.5 h-3.5 text-[#4ade80]" />
                  <span>Browse Motion Templates</span>
                </button>

                {/* Motion Preset Selector */}
                <div className="space-y-2 pt-1">
                  <label className="block text-xs font-semibold text-white">
                    Motion Preset
                  </label>
                  <select
                    value={selectedLayer.motionPreset || 'none'}
                    onChange={(e) => {
                      const found = MOTION_PRESETS.find((p) => p.id === e.target.value);
                      const patch = { motionPreset: e.target.value };
                      if (found?.defaultParams) {
                        patch.motionStiffness = found.defaultParams.stiffness;
                        patch.motionDamping = found.defaultParams.damping;
                        patch.motionOvershoot = found.defaultParams.overshoot;
                        patch.motionWaveform = found.defaultParams.waveform;
                      }
                      onUpdateLayer(selectedLayer.id, patch);
                    }}
                    className="w-full px-2.5 py-2 rounded-lg bg-[#202020] border border-neutral-700/80 text-xs text-white focus:outline-none"
                  >
                    {MOTION_PRESETS.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.category})
                      </option>
                    ))}
                  </select>
                  {selectedLayer.motionPreset && selectedLayer.motionPreset !== 'none' && (
                    <p className="text-[11px] text-neutral-400 italic">
                      {MOTION_PRESETS.find((p) => p.id === selectedLayer.motionPreset)?.desc}
                    </p>
                  )}
                </div>

                {/* Live Spring Curve Visualizer */}
                {selectedLayer.motionPreset && selectedLayer.motionPreset !== 'none' && (
                  <SpringCurvePreview
                    stiffness={selectedLayer.motionStiffness ?? 200}
                    damping={selectedLayer.motionDamping ?? 13}
                    overshoot={selectedLayer.motionOvershoot ?? 1.2}
                  />
                )}

                {/* Targeting Scope (Text vs Graphic) */}
                {!isGraphic && (
                  <div className="space-y-2 pt-2 border-t border-neutral-800/80">
                    <label className="block text-xs font-semibold text-white">
                      Animation Targeting
                    </label>
                    <div className="grid grid-cols-3 gap-1 p-0.5 bg-[#181818] rounded-lg border border-neutral-800 text-xs">
                      {MOTION_TARGETS.map((tgt) => {
                        const active = (selectedLayer.motionTarget || (selectedLayer.charAnimate ? 'char' : 'line')) === tgt.id;
                        return (
                          <button
                            key={tgt.id}
                            type="button"
                            onClick={() =>
                              onUpdateLayer(selectedLayer.id, {
                                motionTarget: tgt.id,
                                charAnimate: tgt.id !== 'line',
                              })
                            }
                            className={`py-1.5 rounded-md text-[11px] font-medium transition-colors ${
                              active
                                ? 'bg-[#282828] text-white shadow-sm'
                                : 'text-neutral-400 hover:text-neutral-200'
                            }`}
                          >
                            {tgt.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Physics Engine Controls */}
                <div className="space-y-3 pt-2 border-t border-neutral-800/80">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-white">Physics Dynamics</span>
                    <span className="text-[10px] font-mono text-[#4ade80]">Framer / Swiss Engine</span>
                  </div>

                  {/* Waveform Selector */}
                  <div>
                    <label className="block text-[11px] text-neutral-400 mb-1">
                      Dynamics Curve
                    </label>
                    <select
                      value={selectedLayer.motionWaveform || 'spring'}
                      onChange={(e) =>
                        onUpdateLayer(selectedLayer.id, { motionWaveform: e.target.value })
                      }
                      className="w-full px-2.5 py-1.5 rounded-lg bg-[#202020] border border-neutral-700/80 text-xs text-white focus:outline-none"
                    >
                      <option value="spring">Physics Spring (Damped Harmonic)</option>
                      <option value="elastic">Elastic Rubber (Squash & Stretch)</option>
                      <option value="anticipate">Anticipate (Wind Up & Fire)</option>
                      <option value="bounce">Gravitational Impact Bounce</option>
                      <option value="sine">Smooth Harmonic Sine</option>
                    </select>
                  </div>

                  {/* Direction Selector */}
                  <div>
                    <label className="block text-[11px] text-neutral-400 mb-1">
                      Kinetic Direction
                    </label>
                    <select
                      value={selectedLayer.motionDirection || 'vertical'}
                      onChange={(e) =>
                        onUpdateLayer(selectedLayer.id, { motionDirection: e.target.value })
                      }
                      className="w-full px-2.5 py-1.5 rounded-lg bg-[#202020] border border-neutral-700/80 text-xs text-white focus:outline-none"
                    >
                      {MOTION_DIRECTIONS.map((dir) => (
                        <option key={dir.id} value={dir.id}>
                          {dir.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Spring Stiffness Slider */}
                  <div>
                    <div className="flex justify-between text-[11px] text-neutral-400 mb-1">
                      <span>Stiffness (k)</span>
                      <span className="font-mono text-neutral-300">
                        {selectedLayer.motionStiffness ?? 200}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={60}
                      max={450}
                      step={10}
                      value={selectedLayer.motionStiffness ?? 200}
                      onChange={(e) =>
                        onUpdateLayer(selectedLayer.id, {
                          motionStiffness: Number(e.target.value),
                        })
                      }
                      className="w-full accent-[#22c55e]"
                    />
                  </div>

                  {/* Spring Damping Slider */}
                  <div>
                    <div className="flex justify-between text-[11px] text-neutral-400 mb-1">
                      <span>Damping (ζ)</span>
                      <span className="font-mono text-neutral-300">
                        {selectedLayer.motionDamping ?? 13}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={5}
                      max={35}
                      step={1}
                      value={selectedLayer.motionDamping ?? 13}
                      onChange={(e) =>
                        onUpdateLayer(selectedLayer.id, {
                          motionDamping: Number(e.target.value),
                        })
                      }
                      className="w-full accent-[#22c55e]"
                    />
                  </div>

                  {/* Overshoot & Bounce Slider */}
                  <div>
                    <div className="flex justify-between text-[11px] text-neutral-400 mb-1">
                      <span>Overshoot & Bounce</span>
                      <span className="font-mono text-neutral-300">
                        {Math.round((selectedLayer.motionOvershoot ?? 1.2) * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={2.5}
                      step={0.1}
                      value={selectedLayer.motionOvershoot ?? 1.2}
                      onChange={(e) =>
                        onUpdateLayer(selectedLayer.id, {
                          motionOvershoot: Number(e.target.value),
                        })
                      }
                      className="w-full accent-[#22c55e]"
                    />
                  </div>

                  {/* Speed Multiplier Slider */}
                  <div>
                    <div className="flex justify-between text-[11px] text-neutral-400 mb-1">
                      <span>Speed</span>
                      <span className="font-mono text-neutral-300">
                        {(selectedLayer.motionSpeed ?? 1).toFixed(1)}×
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0.2}
                      max={3.5}
                      step={0.1}
                      value={selectedLayer.motionSpeed ?? 1}
                      onChange={(e) =>
                        onUpdateLayer(selectedLayer.id, {
                          motionSpeed: Number(e.target.value),
                        })
                      }
                      className="w-full accent-white"
                    />
                  </div>

                  {/* Stagger Delay Slider */}
                  <div>
                    <div className="flex justify-between text-[11px] text-neutral-400 mb-1">
                      <span>Stagger Delay</span>
                      <span className="font-mono text-neutral-300">
                        {Math.round((selectedLayer.stagger ?? 0.04) * 1000)} ms
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={0.15}
                      step={0.005}
                      value={selectedLayer.stagger ?? 0.04}
                      onChange={(e) =>
                        onUpdateLayer(selectedLayer.id, {
                          stagger: Number(e.target.value),
                        })
                      }
                      className="w-full accent-white"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* =========================================================
                TAB 3: AUDIO (Screenshot 19 for Text, Screenshot 36 for Graphic)
               ========================================================= */}
            {activeTab === 'audio' && (
              <>
                {isGraphic ? (
                  /* Graphic Layer Audio Tab (Screenshot 36) */
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <Activity className="w-4 h-4 text-neutral-300 mb-1" />
                      <div className="text-sm font-bold text-white">Audio response</div>
                      <p className="text-xs text-neutral-400 leading-relaxed">
                        Choose a signal and the property it changes.
                      </p>
                    </div>

                    {/* 5 Live Signal Meter Bars (Screenshot 36) */}
                    <div className="space-y-3 pt-1">
                      {[
                        { label: 'Amplitude', pct: meterAmplitude },
                        { label: 'Bass', pct: meterBass },
                        { label: 'Mids', pct: meterMids },
                        { label: 'Treble', pct: meterTreble },
                        { label: 'Transients', pct: meterTransients },
                      ].map((meter) => (
                        <div key={meter.label} className="space-y-1.5">
                          <div className="text-xs text-neutral-200">{meter.label}</div>
                          <div className="w-full h-1.5 rounded-full bg-[#242424] overflow-hidden">
                            <div
                              className="h-full bg-[#22c55e] rounded-full transition-all duration-100"
                              style={{ width: `${meter.pct}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Audio Mappings Section */}
                    <div className="pt-4 border-t border-neutral-800/80 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white">Audio mappings</span>
                        <button
                          type="button"
                          onClick={() => {
                            setGraphicMappingsCount((c) => c + 1);
                            onUpdateLayer(selectedLayer.id, { audioReactive: true });
                          }}
                          className="w-7 h-7 rounded-lg bg-[#202020] hover:bg-neutral-800 border border-neutral-700/80 flex items-center justify-center text-neutral-300 hover:text-white transition-colors"
                          title="Add audio mapping"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {(!selectedLayer.audioReactive && graphicMappingsCount === 0) ? (
                        <p className="text-xs text-neutral-400 leading-relaxed">
                          Add a mapping, then choose a signal and the property it changes.
                        </p>
                      ) : (
                        <div className="p-3 rounded-xl bg-[#202020] border border-neutral-800 space-y-2.5">
                          <div className="flex items-center justify-between pb-1 border-b border-neutral-800">
                            <span className="text-[11px] font-semibold text-neutral-200">Reactivity active</span>
                            <button
                              type="button"
                              onClick={() => {
                                onUpdateLayer(selectedLayer.id, { audioReactive: false });
                                setGraphicMappingsCount(0);
                              }}
                              className="text-[10px] text-red-400 hover:text-red-300"
                            >
                              Remove
                            </button>
                          </div>
                          <div>
                            <label className="block text-[10px] text-neutral-400 mb-1">
                              Signal
                            </label>
                            <select
                              value={selectedLayer.audioSignal || 'bass'}
                              onChange={(e) =>
                                onUpdateLayer(selectedLayer.id, {
                                  audioSignal: e.target.value,
                                  audioReactive: true,
                                })
                              }
                              className="w-full px-2.5 py-1.5 rounded-lg bg-[#161616] border border-neutral-700 text-xs text-white"
                            >
                              <option value="rms">Amplitude</option>
                              <option value="bass">Bass</option>
                              <option value="mid">Mids</option>
                              <option value="treble">Treble</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-[10px] text-neutral-400 mb-1">
                              Target Property
                            </label>
                            <select
                              value={selectedLayer.audioTarget || 'scale'}
                              onChange={(e) =>
                                onUpdateLayer(selectedLayer.id, {
                                  audioTarget: e.target.value,
                                  audioReactive: true,
                                })
                              }
                              className="w-full px-2.5 py-1.5 rounded-lg bg-[#161616] border border-neutral-700 text-xs text-white"
                            >
                              <option value="scale">Scale</option>
                              <option value="posY">Vertical Position (Y)</option>
                              <option value="posX">Horizontal Position (X)</option>
                              <option value="rotation">Rotation</option>
                              <option value="opacity">Opacity</option>
                            </select>
                          </div>

                          <div>
                            <div className="flex justify-between text-[11px] text-neutral-400 mb-1">
                              <span>Intensity</span>
                              <span className="font-mono">
                                {selectedLayer.audioIntensity ?? 45}%
                              </span>
                            </div>
                            <input
                              type="range"
                              min={0}
                              max={100}
                              value={selectedLayer.audioIntensity ?? 45}
                              onChange={(e) =>
                                onUpdateLayer(selectedLayer.id, {
                                  audioIntensity: Number(e.target.value),
                                  audioReactive: true,
                                })
                              }
                              className="w-full accent-white"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  /* Text Layer Audio Tab (Screenshot 19) */
                  <div className="space-y-4">
                    <div className="flex items-center justify-between text-xs font-semibold text-white">
                      <span>Audio reactivity</span>
                      <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-xs text-neutral-200">React to audio</span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={!!selectedLayer.audioReactive}
                        onClick={() =>
                          onUpdateLayer(selectedLayer.id, {
                            audioReactive: !selectedLayer.audioReactive,
                          })
                        }
                        className={`w-9 h-5 rounded-full transition-colors p-0.5 ${
                          selectedLayer.audioReactive ? 'bg-white' : 'bg-neutral-700'
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded-full transition-transform ${
                            selectedLayer.audioReactive
                              ? 'translate-x-4 bg-black'
                              : 'translate-x-0 bg-neutral-300'
                          }`}
                        />
                      </button>
                    </div>

                    <p className="text-[11px] text-neutral-400 leading-relaxed">
                      Choose audio in the bottom bar. These mappings affect only &ldquo;
                      {(selectedLayer.name || 'headline').toLowerCase()}&rdquo;.
                    </p>

                    <div className="space-y-2 pt-1">
                      <label className="block text-xs font-semibold text-white">Response</label>
                      <select
                        value={selectedLayer.audioResponseMode || 'custom'}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === 'pulse') {
                            onUpdateLayer(selectedLayer.id, {
                              audioResponseMode: 'pulse',
                              audioReactive: true,
                              audioSignal: 'bass',
                              audioTarget: 'scale',
                              audioIntensity: 55,
                            });
                          } else if (val === 'bounce') {
                            onUpdateLayer(selectedLayer.id, {
                              audioResponseMode: 'bounce',
                              audioReactive: true,
                              audioSignal: 'bass',
                              audioTarget: 'posY',
                              audioIntensity: 60,
                            });
                          } else if (val === 'shimmer') {
                            onUpdateLayer(selectedLayer.id, {
                              audioResponseMode: 'shimmer',
                              audioReactive: true,
                              audioSignal: 'treble',
                              audioTarget: 'opacity',
                              audioIntensity: 50,
                            });
                          } else {
                            onUpdateLayer(selectedLayer.id, { audioResponseMode: 'custom' });
                          }
                        }}
                        className="w-full px-3 py-2 rounded-lg bg-[#202020] border border-neutral-700/80 text-xs text-white focus:outline-none"
                      >
                        <option value="custom">Custom mappings</option>
                        <option value="pulse">Beat pulse (Bass → Scale)</option>
                        <option value="bounce">Vertical bounce (Bass → Y)</option>
                        <option value="shimmer">High shimmer (Treble → Opacity)</option>
                      </select>
                    </div>

                    {selectedLayer.audioReactive && (
                      <div className="space-y-3 pt-2 border-t border-neutral-800/80">
                        <div>
                          <label className="block text-[10px] text-neutral-400 mb-1">
                            Frequency Band
                          </label>
                          <select
                            value={selectedLayer.audioSignal || 'bass'}
                            onChange={(e) =>
                              onUpdateLayer(selectedLayer.id, {
                                audioSignal: e.target.value,
                              })
                            }
                            className="w-full px-2.5 py-2 rounded-lg bg-[#202020] border border-neutral-700/80 text-xs text-white"
                          >
                            <option value="bass">Bass (20–160 Hz)</option>
                            <option value="mid">Mids (160–2000 Hz)</option>
                            <option value="treble">Treble (2–16 kHz)</option>
                            <option value="rms">Overall Amplitude</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] text-neutral-400 mb-1">
                            Target Property
                          </label>
                          <select
                            value={selectedLayer.audioTarget || 'scale'}
                            onChange={(e) =>
                              onUpdateLayer(selectedLayer.id, {
                                audioTarget: e.target.value,
                              })
                            }
                            className="w-full px-2.5 py-2 rounded-lg bg-[#202020] border border-neutral-700/80 text-xs text-white"
                          >
                            <option value="scale">Scale</option>
                            <option value="posY">Position Y</option>
                            <option value="posX">Position X</option>
                            <option value="rotation">Rotation</option>
                            <option value="opacity">Opacity</option>
                          </select>
                        </div>

                        <div>
                          <div className="flex justify-between text-[11px] text-neutral-400 mb-1">
                            <span>Intensity</span>
                            <span className="font-mono">
                              {selectedLayer.audioIntensity ?? 45}%
                            </span>
                          </div>
                          <input
                            type="range"
                            min={0}
                            max={100}
                            value={selectedLayer.audioIntensity ?? 45}
                            onChange={(e) =>
                              onUpdateLayer(selectedLayer.id, {
                                audioIntensity: Number(e.target.value),
                              })
                            }
                            className="w-full accent-white"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </aside>
  );
}
