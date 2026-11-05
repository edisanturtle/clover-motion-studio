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
import { MOTION_PRESETS } from '../../constants/motionPresets';
import { GRAPHIC_SHAPES, MOTION_GRAPHICS_ASSETS } from '../../constants/graphicAssets';

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
}) {
  const [activeTab, setActiveTab] = useState('design'); // 'design' | 'motion' | 'audio'
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

                {/* Transform Controls */}
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
                </div>
              </div>
            )}

            {/* =========================================================
                TAB 2: MOTION (Screenshot 20)
               ========================================================= */}
            {activeTab === 'motion' && (
              <div className="space-y-4">
                <button
                  type="button"
                  onClick={() => onOpenMotionTemplates?.()}
                  className="w-full py-2.5 px-3 rounded-xl bg-[#222222] hover:bg-neutral-800 border border-neutral-700/80 flex items-center justify-center gap-2 text-xs font-semibold text-white transition-colors"
                >
                  <Film className="w-3.5 h-3.5 text-neutral-300" />
                  <span>Motion templates</span>
                </button>

                {/* Accordion 1: Words & letters (Expanded by default in Screenshot 20) */}
                <div className="space-y-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setWordsOpen((v) => !v)}
                    className="w-full flex items-center justify-between text-xs font-semibold text-white"
                  >
                    <span>Words & letters</span>
                    {wordsOpen ? (
                      <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-neutral-400" />
                    )}
                  </button>

                  {wordsOpen && (
                    <div className="flex items-center justify-between py-1">
                      <span className="text-xs text-neutral-300">Animate words or letters</span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={!!selectedLayer.charAnimate}
                        onClick={() =>
                          onUpdateLayer(selectedLayer.id, {
                            charAnimate: !selectedLayer.charAnimate,
                          })
                        }
                        className={`w-9 h-5 rounded-full transition-colors p-0.5 ${
                          selectedLayer.charAnimate ? 'bg-white' : 'bg-neutral-700'
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded-full transition-transform ${
                            selectedLayer.charAnimate
                              ? 'translate-x-4 bg-black'
                              : 'translate-x-0 bg-neutral-300'
                          }`}
                        />
                      </button>
                    </div>
                  )}
                </div>

                {/* Accordion 2: Text animation (Collapsed by default in Screenshot 20) */}
                <div className="space-y-3 pt-3 border-t border-neutral-800/80">
                  <button
                    type="button"
                    onClick={() => setTextAnimOpen((v) => !v)}
                    className="w-full flex items-center justify-between text-xs font-semibold text-white"
                  >
                    <span>Text animation</span>
                    {textAnimOpen ? (
                      <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-neutral-400" />
                    )}
                  </button>

                  {textAnimOpen && (
                    <div className="space-y-3 pt-1">
                      <select
                        value={selectedLayer.motionPreset || 'none'}
                        onChange={(e) =>
                          onUpdateLayer(selectedLayer.id, { motionPreset: e.target.value })
                        }
                        className="w-full px-2.5 py-2 rounded-lg bg-[#202020] border border-neutral-700/80 text-xs text-white focus:outline-none"
                      >
                        {MOTION_PRESETS.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>

                      <div>
                        <div className="flex justify-between text-[11px] text-neutral-400 mb-1">
                          <span>Speed</span>
                          <span className="font-mono">
                            {(selectedLayer.motionSpeed ?? 1).toFixed(1)}×
                          </span>
                        </div>
                        <input
                          type="range"
                          min={0.2}
                          max={3}
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
                    </div>
                  )}
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

                      {graphicMappingsCount === 0 ? (
                        <p className="text-xs text-neutral-400 leading-relaxed">
                          Add a mapping, then choose a signal and the property it changes.
                        </p>
                      ) : (
                        <div className="p-3 rounded-xl bg-[#202020] border border-neutral-800 space-y-2.5">
                          <div>
                            <label className="block text-[10px] text-neutral-400 mb-1">
                              Signal
                            </label>
                            <select
                              value={selectedLayer.audioSignal || 'bass'}
                              onChange={(e) =>
                                onUpdateLayer(selectedLayer.id, {
                                  audioSignal: e.target.value,
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
                        onChange={(e) =>
                          onUpdateLayer(selectedLayer.id, {
                            audioResponseMode: e.target.value,
                          })
                        }
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
