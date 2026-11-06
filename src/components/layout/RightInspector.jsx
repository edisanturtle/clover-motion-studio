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
  Music,
  Zap,
  Box,
  Palette,
  Sparkles,
  Square,
  Circle,
  MoveUp,
  MoveDown,
  ChevronsUp,
  ChevronsDown,
  Trash2,
  Group,
  Ungroup,
  Layers,
  Check,
  Copy,
} from 'lucide-react';
import { FONT_OPTIONS } from '../../constants/fonts';
import {
  MOTION_PRESETS,
  MOTION_EASING_OPTIONS,
  MOTION_DIRECTIONS,
  MOTION_TARGETS,
} from '../../constants/motionPresets';
import { GRAPHIC_SHAPES, MOTION_GRAPHICS_ASSETS } from '../../constants/graphicAssets';
import { DEMO_TRACKS } from '../../constants/audioTracks';
import { EVENT_SFX_PADS, EFFECTCRAFT_SHADER_BACKGROUNDS } from '../../constants/effectCraftEffects';
import { ANIMOS_SHOWCASE_TEMPLATES } from '../../constants/animosTemplates';
import { solveSpring } from '../../utils/timecode';

const safeNum = (v, fallback) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);

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
  selectedLayerIds = [],
  activeScene,
  activeSceneIndex = 0,
  project,
  audioSignals = { bass: 0, mid: 0, treble: 0, rms: 0 },
  onUpdateLayer,
  onBatchUpdateLayers,
  onAlignLayers,
  onDistributeLayers,
  onGroupLayers,
  onUngroupLayers,
  onReorderZ,
  onDeleteSelectedLayers,
  onDuplicateSelectedLayers,
  onUpdateSceneProp,
  onSelectSceneAudio,
  onTriggerSfx,
  onUploadCustomFont,
  onUploadCustomImage,
  onOpenMotionTemplates,
  customFonts = [],
  advancedSubMode = 'design',
  onSetLayerFormatOverride,
  onRemoveLayerFormatOverride,
}) {
  const [activeTab, setActiveTab] = useState(advancedSubMode || 'design'); // 'design' | 'motion' | 'audio'
  const [selectedOverrideRatio, setSelectedOverrideRatio] = useState('9:16');

  // Keep activeTab in sync when user toggles Design / Animate / Audio in top header
  React.useEffect(() => {
    if (!advancedSubMode) return;
    if (advancedSubMode === 'design') {
      setActiveTab('design');
    } else if (advancedSubMode === 'motion' || advancedSubMode === 'animate') {
      setActiveTab('motion');
    } else if (advancedSubMode === 'audio') {
      setActiveTab('audio');
    }
  }, [advancedSubMode]);
  const [wordsOpen, setWordsOpen] = useState(true);
  const [textAnimOpen, setTextAnimOpen] = useState(false);
  const [graphicMappingsCount, setGraphicMappingsCount] = useState(0);
  const fontFileRef = useRef(null);
  const imgFileRef = useRef(null);
  const replaceImgFileRef = useRef(null);

  const allFonts = [...customFonts, ...FONT_OPTIONS];

  // Resolve multiple selection vs single selection
  const effectiveSelectedIds = Array.isArray(selectedLayerIds) && selectedLayerIds.length > 0
    ? selectedLayerIds
    : selectedLayer ? [selectedLayer.id] : [];

  const selectedLayersList = (activeScene?.layers || []).filter((l) => effectiveSelectedIds.includes(l.id));
  const isMultiSelection = selectedLayersList.length > 1;

  // Clover Studio signature brand palette swatches
  const CLOVER_BRAND_PALETTE = [
    '#159947', // Clover Green Primary
    '#22c55e', // Active Signal Green
    '#16a34a', // Emerald Accent
    '#4ade80', // Mint Glow
    '#ffffff', // Crisp White
    '#111111', // Matte Studio Black
    '#2563eb', // Vivid Royal Blue
    '#e11d48', // Swiss Crimson
    '#f59e0b', // Studio Amber
    '#06b6d4', // Cyan
  ];

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
      {/* Top Header: Multi-selection / Shape / Image / Text / Graphic / Scene properties */}
      <div className="p-3.5 border-b border-neutral-800/80 space-y-3 shrink-0">
        <div className="flex items-center justify-between text-xs text-neutral-300 font-medium">
          <span>
            {isMultiSelection
              ? `Multi-selection (${selectedLayersList.length} items)`
              : selectedLayer
              ? selectedLayer.type === 'shape'
                ? 'Shape Properties'
                : selectedLayer.type === 'image'
                ? 'Image Asset Properties'
                : isGraphic
                ? 'Graphic properties'
                : 'Text properties'
              : 'Scene properties'}
          </span>
          {isMultiSelection ? (
            <Layers className="w-3.5 h-3.5 text-[#4ade80]" />
          ) : selectedLayer?.type === 'text' ? (
            <Type className="w-3.5 h-3.5 text-neutral-400" />
          ) : selectedLayer?.type === 'shape' ? (
            <Square className="w-3.5 h-3.5 text-neutral-400" />
          ) : (
            <Sliders className="w-3.5 h-3.5 text-neutral-400" />
          )}
        </div>

        {/* Layer Name Input + Lock Icon (Single Selection) */}
        {!isMultiSelection && selectedLayer && (
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

        {/* Segmented Sub-tabs: Design | Motion | Audio (Active only for single layer) */}
        {!isMultiSelection && selectedLayer && (
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
        )}
      </div>

      {/* Scrollable Inspector Body */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-3.5 space-y-4">
        {isMultiSelection ? (
          /* Multi-Selection Panel */
          <div className="space-y-4">
            <div className="p-3.5 rounded-2xl bg-[#1a1a1a] border border-[#22c55e]/30 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-[#4ade80]" />
                  <span>{selectedLayersList.length} Layers Selected</span>
                </span>
                <span className="px-1.5 py-0.5 rounded bg-[#159947]/20 text-[10px] font-mono text-[#4ade80]">
                  MULTI
                </span>
              </div>

              {/* Group / Ungroup & Duplicate & Delete Buttons */}
              <div className="grid grid-cols-2 gap-1.5 pt-1">
                {selectedLayersList.some((l) => l.groupId) ? (
                  <button
                    type="button"
                    onClick={() => onUngroupLayers?.(effectiveSelectedIds)}
                    className="py-1.5 px-2.5 rounded-lg bg-[#222] hover:bg-neutral-800 border border-neutral-700 text-xs font-medium text-white flex items-center justify-center gap-1.5"
                  >
                    <Ungroup className="w-3.5 h-3.5 text-amber-400" />
                    <span>Ungroup</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => onGroupLayers?.(effectiveSelectedIds)}
                    className="py-1.5 px-2.5 rounded-lg bg-[#222] hover:bg-neutral-800 border border-neutral-700 text-xs font-medium text-white flex items-center justify-center gap-1.5"
                  >
                    <Group className="w-3.5 h-3.5 text-[#4ade80]" />
                    <span>Group</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => onDuplicateSelectedLayers?.(effectiveSelectedIds)}
                  className="py-1.5 px-2.5 rounded-lg bg-[#222] hover:bg-neutral-800 border border-neutral-700 text-xs font-medium text-white flex items-center justify-center gap-1.5"
                >
                  <Copy className="w-3.5 h-3.5 text-blue-400" />
                  <span>Duplicate</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => onDeleteSelectedLayers?.(effectiveSelectedIds)}
                className="w-full py-1.5 px-2.5 rounded-lg bg-red-950/40 hover:bg-red-900/60 border border-red-800/60 text-xs font-medium text-red-300 flex items-center justify-center gap-1.5 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5 text-red-400" />
                <span>Delete Selected ({selectedLayersList.length})</span>
              </button>
            </div>

            {/* Alignment Toolbar */}
            <div className="p-3.5 rounded-2xl bg-[#1a1a1a] border border-neutral-800 space-y-2.5">
              <span className="text-xs font-semibold text-white">Align Selection</span>
              <div className="grid grid-cols-3 gap-1 bg-[#202020] p-1 rounded-xl border border-neutral-800 text-[11px]">
                <button
                  type="button"
                  onClick={() => onAlignLayers?.(effectiveSelectedIds, 'left')}
                  className="py-1 px-1 rounded-lg bg-[#181818] hover:bg-neutral-700 text-neutral-300 hover:text-white flex items-center justify-center gap-1"
                  title="Align left edges"
                >
                  <AlignLeft className="w-3 h-3" />
                  <span>Left</span>
                </button>
                <button
                  type="button"
                  onClick={() => onAlignLayers?.(effectiveSelectedIds, 'center')}
                  className="py-1 px-1 rounded-lg bg-[#181818] hover:bg-neutral-700 text-neutral-300 hover:text-white flex items-center justify-center gap-1"
                  title="Align horizontal centers"
                >
                  <AlignCenter className="w-3 h-3" />
                  <span>Center</span>
                </button>
                <button
                  type="button"
                  onClick={() => onAlignLayers?.(effectiveSelectedIds, 'right')}
                  className="py-1 px-1 rounded-lg bg-[#181818] hover:bg-neutral-700 text-neutral-300 hover:text-white flex items-center justify-center gap-1"
                  title="Align right edges"
                >
                  <AlignRight className="w-3 h-3" />
                  <span>Right</span>
                </button>
                <button
                  type="button"
                  onClick={() => onAlignLayers?.(effectiveSelectedIds, 'top')}
                  className="py-1 px-1 rounded-lg bg-[#181818] hover:bg-neutral-700 text-neutral-300 hover:text-white flex items-center justify-center gap-1"
                  title="Align top edges"
                >
                  <span>Top</span>
                </button>
                <button
                  type="button"
                  onClick={() => onAlignLayers?.(effectiveSelectedIds, 'middle')}
                  className="py-1 px-1 rounded-lg bg-[#181818] hover:bg-neutral-700 text-neutral-300 hover:text-white flex items-center justify-center gap-1"
                  title="Align vertical middles"
                >
                  <span>Middle</span>
                </button>
                <button
                  type="button"
                  onClick={() => onAlignLayers?.(effectiveSelectedIds, 'bottom')}
                  className="py-1 px-1 rounded-lg bg-[#181818] hover:bg-neutral-700 text-neutral-300 hover:text-white flex items-center justify-center gap-1"
                  title="Align bottom edges"
                >
                  <span>Bottom</span>
                </button>
              </div>
            </div>

            {/* Distribution Toolbar */}
            {selectedLayersList.length >= 3 && (
              <div className="p-3.5 rounded-2xl bg-[#1a1a1a] border border-neutral-800 space-y-2.5">
                <span className="text-xs font-semibold text-white">Distribute Evenly</span>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => onDistributeLayers?.(effectiveSelectedIds, 'horizontal')}
                    className="py-1.5 px-2 rounded-lg bg-[#202020] hover:bg-neutral-700 border border-neutral-700 text-xs font-medium text-white flex items-center justify-center gap-1"
                  >
                    <span>Horizontal</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onDistributeLayers?.(effectiveSelectedIds, 'vertical')}
                    className="py-1.5 px-2 rounded-lg bg-[#202020] hover:bg-neutral-700 border border-neutral-700 text-xs font-medium text-white flex items-center justify-center gap-1"
                  >
                    <span>Vertical</span>
                  </button>
                </div>
              </div>
            )}

            {/* Z-Order Stack Toolbar */}
            <div className="p-3.5 rounded-2xl bg-[#1a1a1a] border border-neutral-800 space-y-2.5">
              <span className="text-xs font-semibold text-white">Z-Order Hierarchy</span>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => onReorderZ?.(effectiveSelectedIds, 'bringToFront')}
                  className="py-1.5 px-2 rounded-lg bg-[#202020] hover:bg-neutral-700 border border-neutral-700 text-xs font-medium text-white flex items-center justify-center gap-1"
                  title="Bring to very front of canvas stack"
                >
                  <ChevronsUp className="w-3.5 h-3.5 text-[#4ade80]" />
                  <span>To Front</span>
                </button>
                <button
                  type="button"
                  onClick={() => onReorderZ?.(effectiveSelectedIds, 'bringForward')}
                  className="py-1.5 px-2 rounded-lg bg-[#202020] hover:bg-neutral-700 border border-neutral-700 text-xs font-medium text-white flex items-center justify-center gap-1"
                  title="Bring forward one level"
                >
                  <MoveUp className="w-3.5 h-3.5 text-neutral-300" />
                  <span>Forward</span>
                </button>
                <button
                  type="button"
                  onClick={() => onReorderZ?.(effectiveSelectedIds, 'sendBackward')}
                  className="py-1.5 px-2 rounded-lg bg-[#202020] hover:bg-neutral-700 border border-neutral-700 text-xs font-medium text-white flex items-center justify-center gap-1"
                  title="Send backward one level"
                >
                  <MoveDown className="w-3.5 h-3.5 text-neutral-300" />
                  <span>Backward</span>
                </button>
                <button
                  type="button"
                  onClick={() => onReorderZ?.(effectiveSelectedIds, 'sendToBack')}
                  className="py-1.5 px-2 rounded-lg bg-[#202020] hover:bg-neutral-700 border border-neutral-700 text-xs font-medium text-white flex items-center justify-center gap-1"
                  title="Send to very back of canvas stack"
                >
                  <ChevronsDown className="w-3.5 h-3.5 text-amber-400" />
                  <span>To Back</span>
                </button>
              </div>
            </div>
          </div>
        ) : !selectedLayer ? (
          <div className="space-y-4">
            {activeScene ? (
              <div className="space-y-4">
                {/* Scene Identity & Duration */}
                <div className="p-3.5 rounded-2xl bg-[#1a1a1a] border border-neutral-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[#4ade80]">Active Scene</span>
                    <span className="text-[10px] font-mono text-neutral-400">{activeScene.duration || 4}s total</span>
                  </div>
                  <div>
                    <label className="block text-[10px] text-neutral-400 mb-1">Scene Name</label>
                    <input
                      type="text"
                      value={activeScene.name || ''}
                      onChange={(e) => onUpdateSceneProp?.('name', e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-[#222] border border-neutral-700 text-xs font-semibold text-white focus:outline-none focus:border-[#22c55e]"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-neutral-300">Duration</label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min={1}
                        max={60}
                        value={activeScene.duration || 4}
                        onChange={(e) => onUpdateSceneProp?.('duration', Number(e.target.value) || 2)}
                        className="w-14 px-2 py-1 rounded-lg bg-[#222] border border-neutral-700 text-xs font-mono text-right text-white focus:outline-none focus:border-[#22c55e]"
                      />
                      <span className="text-xs font-mono text-neutral-400">s</span>
                    </div>
                  </div>
                </div>

                {/* Per-Scene Independent Sound & Entrance SFX */}
                <div className="p-3.5 rounded-2xl bg-[#1a1a1a] border border-neutral-800 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Music className="w-3.5 h-3.5 text-[#4ade80]" />
                      <span className="text-xs font-semibold text-white">Scene Sound</span>
                    </div>
                    <span className="px-1.5 py-0.5 rounded bg-[#159947]/20 text-[9px] font-mono text-[#4ade80]">
                      {activeScene.audioTrackId ? 'CUSTOM' : 'INHERITED'}
                    </span>
                  </div>

                  <div>
                    <label className="block text-[10px] text-neutral-400 mb-1">Audio Track</label>
                    <select
                      value={activeScene.audioTrackId || ''}
                      onChange={(e) => onSelectSceneAudio?.(e.target.value || null)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-[#222] border border-neutral-700 text-xs text-white focus:outline-none focus:border-[#22c55e]"
                    >
                      <option value="">Inherit Project Track ({project?.audioTrackId || 'funk'})</option>
                      <option value="mute">Mute (Silent)</option>
                      <optgroup label="Procedural Tracks">
                        {DEMO_TRACKS.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name} ({t.genre} · {t.bpm} BPM)
                          </option>
                        ))}
                      </optgroup>
                    </select>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[10px] text-neutral-400">Scene Entrance SFX</label>
                      {activeScene.sfxOnEnter && activeScene.sfxOnEnter !== 'none' && (
                        <button
                          type="button"
                          onClick={() => onTriggerSfx?.(activeScene.sfxOnEnter)}
                          className="text-[10px] text-[#4ade80] hover:underline flex items-center gap-0.5"
                        >
                          <Zap className="w-2.5 h-2.5" />
                          <span>Test</span>
                        </button>
                      )}
                    </div>
                    <select
                      value={activeScene.sfxOnEnter || 'none'}
                      onChange={(e) => onSelectSceneAudio?.(activeScene.audioTrackId, e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-[#222] border border-neutral-700 text-xs text-white focus:outline-none focus:border-[#22c55e]"
                    >
                      <option value="none">None</option>
                      {EVENT_SFX_PADS.map((pad) => (
                        <option key={pad.id} value={pad.id}>
                          {pad.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Per-Scene Kinetic Motion Preset */}
                <div className="p-3.5 rounded-2xl bg-[#1a1a1a] border border-neutral-800 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Film className="w-3.5 h-3.5 text-[#4ade80]" />
                      <span className="text-xs font-semibold text-white">Scene Kinetic Motion</span>
                    </div>
                    <span className="text-[10px] font-mono text-[#4ade80]">
                      {activeScene.motionPreset || 'default'}
                    </span>
                  </div>

                  <select
                    value={activeScene.motionPreset || 'none'}
                    onChange={(e) => onUpdateSceneProp?.('motionPreset', e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-[#222] border border-neutral-700 text-xs text-white focus:outline-none focus:border-[#22c55e]"
                  >
                    <option value="none">None (Static Typography)</option>
                    {MOTION_PRESETS.filter((p) => p.id !== 'none').map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>

                  <SpringCurvePreview
                    stiffness={activeScene.motionStiffness || 200}
                    damping={activeScene.motionDamping || 14}
                    overshoot={1.2}
                  />
                </div>

                {/* Per-Scene 3D Cards Showcase Preview */}
                <div className="p-3.5 rounded-2xl bg-[#1a1a1a] border border-neutral-800 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Box className="w-3.5 h-3.5 text-[#4ade80]" />
                      <span className="text-xs font-semibold text-white">Scene 3D Cards</span>
                    </div>
                    <span className="px-1.5 py-0.5 rounded bg-[#159947]/20 text-[9px] font-mono text-[#4ade80]">
                      {activeScene.showcase?.templateId && activeScene.showcase.templateId !== 'none'
                        ? activeScene.showcase.templateId
                        : 'OFF'}
                    </span>
                  </div>

                  <select
                    value={activeScene.showcase?.templateId || 'none'}
                    onChange={(e) =>
                      onUpdateSceneProp?.('showcase', {
                        ...(activeScene.showcase || {}),
                        templateId: e.target.value,
                      })
                    }
                    className="w-full px-2.5 py-1.5 rounded-lg bg-[#222] border border-neutral-700 text-xs text-white focus:outline-none focus:border-[#22c55e]"
                  >
                    <option value="none">None · Typography Only</option>
                    {ANIMOS_SHOWCASE_TEMPLATES.map((tpl) => (
                      <option key={tpl.id} value={tpl.id}>
                        {tpl.name} ({tpl.slots} slots)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Per-Scene Shader Background & Colors */}
                <div className="p-3.5 rounded-2xl bg-[#1a1a1a] border border-neutral-800 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-[#4ade80]" />
                      <span className="text-xs font-semibold text-white">Shader & Background</span>
                    </div>
                    <span className="text-[10px] font-mono text-[#4ade80]">
                      {activeScene.shaderBg || 'none'}
                    </span>
                  </div>

                  <select
                    value={activeScene.shaderBg || 'none'}
                    onChange={(e) => onUpdateSceneProp?.('shaderBg', e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-[#222] border border-neutral-700 text-xs text-white focus:outline-none focus:border-[#22c55e]"
                  >
                    {EFFECTCRAFT_SHADER_BACKGROUNDS.map((sh) => (
                      <option key={sh.id} value={sh.id}>
                        {sh.name}
                      </option>
                    ))}
                  </select>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs text-neutral-300">Background Color</span>
                    <input
                      type="color"
                      value={activeScene.bg || '#101935'}
                      onChange={(e) => onUpdateSceneProp?.('bg', e.target.value)}
                      className="w-8 h-6 rounded cursor-pointer bg-transparent border-0"
                    />
                  </div>

                  {/* 6-Color Palette Swatches */}
                  {Array.isArray(activeScene.palette) && (
                    <div className="pt-2 border-t border-neutral-800">
                      <span className="text-[10px] text-neutral-400 block mb-1.5">Scene Palette Swatches</span>
                      <div className="flex items-center gap-1.5">
                        {activeScene.palette.map((col, idx) => (
                          <div key={idx} className="relative w-6 h-6 rounded-lg overflow-hidden border border-white/20">
                            <input
                              type="color"
                              value={col}
                              onChange={(e) => {
                                const nextPalette = [...activeScene.palette];
                                nextPalette[idx] = e.target.value;
                                onUpdateSceneProp?.('palette', nextPalette);
                              }}
                              className="w-8 h-8 -top-1 -left-1 absolute cursor-pointer opacity-0"
                            />
                            <div className="w-full h-full" style={{ backgroundColor: col }} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-xs text-neutral-400 leading-relaxed">
                Select any text or graphic layer on the canvas to inspect its design, motion, and audio reactivity.
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
                            Size ({safeNum(selectedLayer.fontSize, 96)}px)
                          </label>
                          <input
                            type="range"
                            min={14}
                            max={280}
                            value={safeNum(selectedLayer.fontSize, 96)}
                            onChange={(e) =>
                              onUpdateLayer(selectedLayer.id, {
                                fontSize: Number(e.target.value) || 96,
                              })
                            }
                            className="w-full accent-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-neutral-400 mb-1">
                            Line Height ({safeNum(selectedLayer.lineHeight, 1).toFixed(2)})
                          </label>
                          <input
                            type="range"
                            min={0.75}
                            max={1.8}
                            step={0.02}
                            value={safeNum(selectedLayer.lineHeight, 1)}
                            onChange={(e) =>
                              onUpdateLayer(selectedLayer.id, {
                                lineHeight: Number(e.target.value) || 1,
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
                            value={safeNum(selectedLayer.letterSpacing, 0)}
                            onChange={(e) =>
                              onUpdateLayer(selectedLayer.id, {
                                letterSpacing: Number(e.target.value) || 0,
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

                      {/* Brand Palette Swatches for Text Fill */}
                      <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                        {CLOVER_BRAND_PALETTE.map((hex, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => onUpdateLayer(selectedLayer.id, { color: hex })}
                            style={{ backgroundColor: hex }}
                            className={`w-5 h-5 rounded-md border transition-transform hover:scale-110 ${
                              selectedLayer.color === hex ? 'border-white ring-1 ring-white/50 scale-105' : 'border-neutral-700/80'
                            }`}
                            title={`Apply brand color ${hex}`}
                          />
                        ))}
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
                              <span className="text-[10px] text-neutral-400">Width ({safeNum(selectedLayer.strokeWidth, 2)}px)</span>
                              <input
                                type="range"
                                min={1}
                                max={8}
                                value={safeNum(selectedLayer.strokeWidth, 2)}
                                onChange={(e) => onUpdateLayer(selectedLayer.id, { strokeWidth: Number(e.target.value) || 2 })}
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
                              <span className="text-[10px] text-neutral-400">Blur ({safeNum(selectedLayer.shadowBlur, 14)}px)</span>
                              <input
                                type="range"
                                min={2}
                                max={36}
                                value={safeNum(selectedLayer.shadowBlur, 14)}
                                onChange={(e) => onUpdateLayer(selectedLayer.id, { shadowBlur: Number(e.target.value) || 14 })}
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
                ) : selectedLayer.type === 'shape' ? (
                  /* Primitive Shape Layer Controls */
                  <div className="space-y-3.5">
                    <div className="flex items-center justify-between text-xs font-semibold text-white">
                      <span>Primitive Shape</span>
                      <Square className="w-3.5 h-3.5 text-[#4ade80]" />
                    </div>

                    <div>
                      <label className="block text-[10px] text-neutral-400 mb-1">Shape Type</label>
                      <select
                        value={selectedLayer.shapeType || 'rectangle'}
                        onChange={(e) => onUpdateLayer(selectedLayer.id, { shapeType: e.target.value })}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-[#202020] border border-neutral-700 text-xs font-semibold text-white focus:outline-none"
                      >
                        <option value="rectangle">Rectangle</option>
                        <option value="circle">Circle / Ellipse</option>
                        <option value="pill">Pill / Capsule</option>
                        <option value="triangle">Triangle</option>
                        <option value="star">Star (5-Point)</option>
                        <option value="line">Rule Line</option>
                      </select>
                    </div>

                    {/* Dimensions: Width & Height */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] text-neutral-400 mb-1">Width (px)</label>
                        <input
                          type="number"
                          min={4}
                          max={2400}
                          value={Math.round(safeNum(selectedLayer.width || selectedLayer.size, 200))}
                          onChange={(e) => onUpdateLayer(selectedLayer.id, { width: Math.max(4, Number(e.target.value) || 200) })}
                          className="w-full px-2 py-1.5 rounded-lg bg-[#202020] border border-neutral-800 text-xs font-mono text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-neutral-400 mb-1">Height (px)</label>
                        <input
                          type="number"
                          min={4}
                          max={2400}
                          value={Math.round(safeNum(selectedLayer.height || selectedLayer.size, 200))}
                          onChange={(e) => onUpdateLayer(selectedLayer.id, { height: Math.max(4, Number(e.target.value) || 200) })}
                          className="w-full px-2 py-1.5 rounded-lg bg-[#202020] border border-neutral-800 text-xs font-mono text-white"
                        />
                      </div>
                    </div>

                    {/* Corner Radius (for rectangle / pill) */}
                    {['rectangle', 'pill'].includes(selectedLayer.shapeType || 'rectangle') && (
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[10px] text-neutral-400">Corner Radius ({safeNum(selectedLayer.cornerRadius, 0)}px)</label>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={120}
                          value={safeNum(selectedLayer.cornerRadius, 0)}
                          onChange={(e) => onUpdateLayer(selectedLayer.id, { cornerRadius: Number(e.target.value) || 0 })}
                          className="w-full accent-[#159947]"
                        />
                      </div>
                    )}

                    {/* Fill Color & Brand Palette Quick Swatches */}
                    {selectedLayer.shapeType !== 'line' && (
                      <div className="space-y-2 pt-2 border-t border-neutral-800">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-neutral-300 font-medium">Fill Color</span>
                          <input
                            type="color"
                            value={selectedLayer.fill || selectedLayer.color || '#159947'}
                            onChange={(e) => onUpdateLayer(selectedLayer.id, { fill: e.target.value, color: e.target.value })}
                            className="w-7 h-7 rounded cursor-pointer bg-transparent border-0"
                          />
                        </div>

                        {/* Brand Swatches */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {CLOVER_BRAND_PALETTE.map((hex, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => onUpdateLayer(selectedLayer.id, { fill: hex, color: hex })}
                              style={{ backgroundColor: hex }}
                              className={`w-5 h-5 rounded-md border transition-transform hover:scale-110 ${
                                (selectedLayer.fill || selectedLayer.color) === hex ? 'border-white ring-1 ring-white/50 scale-105' : 'border-neutral-700/80'
                              }`}
                              title={`Apply brand color ${hex}`}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Stroke Outline */}
                    <div className="space-y-2 pt-2 border-t border-neutral-800">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-neutral-300 font-medium">Stroke Outline</span>
                        <input
                          type="color"
                          value={selectedLayer.stroke || '#22c55e'}
                          onChange={(e) => onUpdateLayer(selectedLayer.id, { stroke: e.target.value })}
                          className="w-7 h-7 rounded cursor-pointer bg-transparent border-0"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-neutral-400 shrink-0">Width ({safeNum(selectedLayer.strokeWidth, 0)}px)</span>
                        <input
                          type="range"
                          min={0}
                          max={24}
                          value={safeNum(selectedLayer.strokeWidth, 0)}
                          onChange={(e) => onUpdateLayer(selectedLayer.id, { strokeWidth: Number(e.target.value) || 0 })}
                          className="flex-1 accent-[#159947]"
                        />
                      </div>
                    </div>
                  </div>
                ) : selectedLayer.type === 'image' ? (
                  /* Local SVG & Image Asset Controls */
                  <div className="space-y-3.5">
                    <div className="flex items-center justify-between text-xs font-semibold text-white">
                      <span>Image / SVG Asset</span>
                      <button
                        type="button"
                        onClick={() => replaceImgFileRef.current?.click()}
                        className="text-[10px] font-mono text-[#4ade80] hover:underline flex items-center gap-1"
                      >
                        <Upload className="w-2.5 h-2.5" /> Replace
                      </button>
                      <input
                        ref={replaceImgFileRef}
                        type="file"
                        accept=".svg,.png,.jpg,.jpeg,.webp"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file && onUploadCustomImage) onUploadCustomImage(file);
                          e.target.value = '';
                        }}
                        className="hidden"
                      />
                    </div>

                    {/* Dimensions: Width & Height */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] text-neutral-400 mb-1">Width (px)</label>
                        <input
                          type="number"
                          min={10}
                          max={2400}
                          value={Math.round(safeNum(selectedLayer.width, 300))}
                          onChange={(e) => onUpdateLayer(selectedLayer.id, { width: Math.max(10, Number(e.target.value) || 300) })}
                          className="w-full px-2 py-1.5 rounded-lg bg-[#202020] border border-neutral-800 text-xs font-mono text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-neutral-400 mb-1">Height (px)</label>
                        <input
                          type="number"
                          min={10}
                          max={2400}
                          value={Math.round(safeNum(selectedLayer.height, 300))}
                          onChange={(e) => onUpdateLayer(selectedLayer.id, { height: Math.max(10, Number(e.target.value) || 300) })}
                          className="w-full px-2 py-1.5 rounded-lg bg-[#202020] border border-neutral-800 text-xs font-mono text-white"
                        />
                      </div>
                    </div>

                    {/* Corner Radius */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[10px] text-neutral-400">Corner Radius ({safeNum(selectedLayer.cornerRadius, 0)}px)</label>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={120}
                        value={safeNum(selectedLayer.cornerRadius, 0)}
                        onChange={(e) => onUpdateLayer(selectedLayer.id, { cornerRadius: Number(e.target.value) || 0 })}
                        className="w-full accent-[#159947]"
                      />
                    </div>

                    {/* Border Stroke */}
                    <div className="space-y-2 pt-2 border-t border-neutral-800">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-neutral-300 font-medium">Border Stroke</span>
                        <input
                          type="color"
                          value={selectedLayer.stroke || '#ffffff'}
                          onChange={(e) => onUpdateLayer(selectedLayer.id, { stroke: e.target.value })}
                          className="w-7 h-7 rounded cursor-pointer bg-transparent border-0"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-neutral-400 shrink-0">Width ({safeNum(selectedLayer.strokeWidth, 0)}px)</span>
                        <input
                          type="range"
                          min={0}
                          max={24}
                          value={safeNum(selectedLayer.strokeWidth, 0)}
                          onChange={(e) => onUpdateLayer(selectedLayer.id, { strokeWidth: Number(e.target.value) || 0 })}
                          className="flex-1 accent-[#159947]"
                        />
                      </div>
                    </div>
                  </div>
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
                        Size ({safeNum(selectedLayer.size, 360)}px)
                      </label>
                      <input
                        type="range"
                        min={60}
                        max={900}
                        value={safeNum(selectedLayer.size, 360)}
                        onChange={(e) =>
                          onUpdateLayer(selectedLayer.id, { size: Number(e.target.value) || 360 })
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
                        Scale ({Math.round(safeNum(selectedLayer.scale, 1) * 100)}%)
                      </label>
                      <input
                        type="range"
                        min={0.1}
                        max={3.0}
                        step={0.05}
                        value={safeNum(selectedLayer.scale, 1)}
                        onChange={(e) =>
                          onUpdateLayer(selectedLayer.id, { scale: Number(e.target.value) || 1 })
                        }
                        className="w-full accent-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-neutral-400 mb-1">
                        Rot ({Math.round(safeNum(selectedLayer.rotation, 0))}°)
                      </label>
                      <input
                        type="range"
                        min={-180}
                        max={180}
                        step={1}
                        value={safeNum(selectedLayer.rotation, 0)}
                        onChange={(e) =>
                          onUpdateLayer(selectedLayer.id, { rotation: Number(e.target.value) || 0 })
                        }
                        className="w-full accent-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-neutral-400 mb-1">
                        Alpha ({Math.round(safeNum(selectedLayer.opacity, 1) * 100)}%)
                      </label>
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.05}
                        value={safeNum(selectedLayer.opacity, 1)}
                        onChange={(e) =>
                          onUpdateLayer(selectedLayer.id, { opacity: Number(e.target.value) || 0 })
                        }
                        className="w-full accent-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Multi-Format Layout Overrides (Fase 8) */}
                <div className="pt-3 border-t border-neutral-800/80 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-white">Format Overrides</span>
                    <span className="text-[10px] font-mono text-[#4ade80]">
                      Base: {project?.ratio || '4:5'}
                    </span>
                  </div>
                  <div className="text-[11px] text-neutral-400">
                    Set format-specific positions without mutating base or other ratio layouts.
                  </div>
                  <div className="grid grid-cols-6 gap-1">
                    {['9:16', '1:1', '4:5', '16:9', '4:3', '3:4'].map((fmt) => {
                      const hasOverride = Boolean(selectedLayer.formatOverrides?.[fmt]);
                      return (
                        <button
                          key={fmt}
                          type="button"
                          onClick={() => setSelectedOverrideRatio(fmt)}
                          aria-label={`Format ${fmt}${hasOverride ? ' (Overridden)' : ''}`}
                          className={`py-1 rounded text-[10px] font-mono font-semibold transition-colors flex flex-col items-center gap-0.5 ${
                            selectedOverrideRatio === fmt
                              ? 'bg-[#159947] text-white border border-[#22c55e]'
                              : hasOverride
                              ? 'bg-[#159947]/20 text-[#4ade80] border border-[#22c55e]/40'
                              : 'bg-[#202020] hover:bg-neutral-700 text-neutral-300 border border-neutral-800'
                          }`}
                        >
                          <span>{fmt}</span>
                          {hasOverride && <span className="w-1 h-1 rounded-full bg-[#4ade80]" />}
                        </button>
                      );
                    })}
                  </div>

                  {selectedOverrideRatio && (
                    <div className="p-2.5 rounded-xl bg-[#181818] border border-neutral-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-medium text-white">
                          Ratio: {selectedOverrideRatio}
                        </span>
                        {selectedLayer.formatOverrides?.[selectedOverrideRatio] ? (
                          <button
                            type="button"
                            onClick={() => onRemoveLayerFormatOverride?.(selectedLayer.id, selectedOverrideRatio)}
                            className="text-[10px] font-semibold text-red-400 hover:text-red-300"
                          >
                            Clear Override
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              onSetLayerFormatOverride?.(selectedLayer.id, selectedOverrideRatio, {
                                x: selectedLayer.x || 0,
                                y: selectedLayer.y || 0,
                                scale: selectedLayer.scale || 1.0,
                              })
                            }
                            className="text-[10px] font-semibold text-[#4ade80] hover:underline"
                          >
                            + Add Override
                          </button>
                        )}
                      </div>
                      {selectedLayer.formatOverrides?.[selectedOverrideRatio] && (
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[10px] text-neutral-400 mb-0.5">X Pos</label>
                            <input
                              type="number"
                              value={Math.round(safeNum(selectedLayer.formatOverrides[selectedOverrideRatio].x, safeNum(selectedLayer.x, 0)))}
                              onChange={(e) =>
                                onSetLayerFormatOverride?.(selectedLayer.id, selectedOverrideRatio, {
                                  x: Number(e.target.value) || 0,
                                })
                              }
                              className="w-full px-2 py-1 rounded bg-[#222] border border-neutral-700 text-xs font-mono text-white"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] text-neutral-400 mb-0.5">Y Pos</label>
                            <input
                              type="number"
                              value={Math.round(safeNum(selectedLayer.formatOverrides[selectedOverrideRatio].y, safeNum(selectedLayer.y, 0)))}
                              onChange={(e) =>
                                onSetLayerFormatOverride?.(selectedLayer.id, selectedOverrideRatio, {
                                  y: Number(e.target.value) || 0,
                                })
                              }
                              className="w-full px-2 py-1 rounded bg-[#222] border border-neutral-700 text-xs font-mono text-white"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Canvas Alignment Toolbar for Single Layer */}
                <div className="pt-3 border-t border-neutral-800/80 space-y-2">
                  <div className="text-xs font-semibold text-white">Align to Canvas</div>
                  <div className="grid grid-cols-3 gap-1 bg-[#202020] p-1 rounded-xl border border-neutral-800 text-[11px]">
                    <button
                      type="button"
                      onClick={() => onAlignLayers?.([selectedLayer.id], 'left')}
                      className="py-1 px-1 rounded-lg bg-[#181818] hover:bg-neutral-700 text-neutral-300 hover:text-white flex items-center justify-center gap-1"
                    >
                      <AlignLeft className="w-3 h-3" />
                      <span>Left</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onAlignLayers?.([selectedLayer.id], 'center')}
                      className="py-1 px-1 rounded-lg bg-[#181818] hover:bg-neutral-700 text-neutral-300 hover:text-white flex items-center justify-center gap-1"
                    >
                      <AlignCenter className="w-3 h-3" />
                      <span>Center</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onAlignLayers?.([selectedLayer.id], 'right')}
                      className="py-1 px-1 rounded-lg bg-[#181818] hover:bg-neutral-700 text-neutral-300 hover:text-white flex items-center justify-center gap-1"
                    >
                      <AlignRight className="w-3 h-3" />
                      <span>Right</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onAlignLayers?.([selectedLayer.id], 'top')}
                      className="py-1 px-1 rounded-lg bg-[#181818] hover:bg-neutral-700 text-neutral-300 hover:text-white flex items-center justify-center gap-1"
                    >
                      <span>Top</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onAlignLayers?.([selectedLayer.id], 'middle')}
                      className="py-1 px-1 rounded-lg bg-[#181818] hover:bg-neutral-700 text-neutral-300 hover:text-white flex items-center justify-center gap-1"
                    >
                      <span>Middle</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onAlignLayers?.([selectedLayer.id], 'bottom')}
                      className="py-1 px-1 rounded-lg bg-[#181818] hover:bg-neutral-700 text-neutral-300 hover:text-white flex items-center justify-center gap-1"
                    >
                      <span>Bottom</span>
                    </button>
                  </div>
                </div>

                {/* Z-Order Stack Controls for Single Layer */}
                <div className="pt-3 border-t border-neutral-800/80 space-y-2">
                  <div className="text-xs font-semibold text-white">Stack Order</div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => onReorderZ?.([selectedLayer.id], 'bringToFront')}
                      className="py-1.5 px-2 rounded-lg bg-[#202020] hover:bg-neutral-700 border border-neutral-800 text-xs font-medium text-white flex items-center justify-center gap-1"
                    >
                      <ChevronsUp className="w-3.5 h-3.5 text-[#4ade80]" />
                      <span>To Front</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onReorderZ?.([selectedLayer.id], 'bringForward')}
                      className="py-1.5 px-2 rounded-lg bg-[#202020] hover:bg-neutral-700 border border-neutral-800 text-xs font-medium text-white flex items-center justify-center gap-1"
                    >
                      <MoveUp className="w-3.5 h-3.5 text-neutral-300" />
                      <span>Forward</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onReorderZ?.([selectedLayer.id], 'sendBackward')}
                      className="py-1.5 px-2 rounded-lg bg-[#202020] hover:bg-neutral-700 border border-neutral-800 text-xs font-medium text-white flex items-center justify-center gap-1"
                    >
                      <MoveDown className="w-3.5 h-3.5 text-neutral-300" />
                      <span>Backward</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onReorderZ?.([selectedLayer.id], 'sendToBack')}
                      className="py-1.5 px-2 rounded-lg bg-[#202020] hover:bg-neutral-700 border border-neutral-800 text-xs font-medium text-white flex items-center justify-center gap-1"
                    >
                      <ChevronsDown className="w-3.5 h-3.5 text-amber-400" />
                      <span>To Back</span>
                    </button>
                  </div>
                </div>

                {/* Group Status if grouped */}
                {selectedLayer.groupId && (
                  <div className="pt-3 border-t border-neutral-800/80 flex items-center justify-between">
                    <span className="text-xs text-neutral-400 flex items-center gap-1">
                      <Group className="w-3.5 h-3.5 text-[#4ade80]" />
                      <span>Grouped</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => onUngroupLayers?.([selectedLayer.id])}
                      className="px-2 py-1 rounded bg-[#202020] hover:bg-neutral-700 text-xs text-amber-400 flex items-center gap-1"
                    >
                      <Ungroup className="w-3 h-3" />
                      <span>Ungroup</span>
                    </button>
                  </div>
                )}
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
                        {safeNum(selectedLayer.motionStiffness, 200)}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={60}
                      max={450}
                      step={10}
                      value={safeNum(selectedLayer.motionStiffness, 200)}
                      onChange={(e) =>
                        onUpdateLayer(selectedLayer.id, {
                          motionStiffness: Number(e.target.value) || 200,
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
                        {safeNum(selectedLayer.motionDamping, 13)}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={5}
                      max={35}
                      step={1}
                      value={safeNum(selectedLayer.motionDamping, 13)}
                      onChange={(e) =>
                        onUpdateLayer(selectedLayer.id, {
                          motionDamping: Number(e.target.value) || 13,
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
                        {Math.round(safeNum(selectedLayer.motionOvershoot, 1.2) * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={2.5}
                      step={0.1}
                      value={safeNum(selectedLayer.motionOvershoot, 1.2)}
                      onChange={(e) =>
                        onUpdateLayer(selectedLayer.id, {
                          motionOvershoot: Number(e.target.value) || 1.2,
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
                        {safeNum(selectedLayer.motionSpeed, 1).toFixed(1)}×
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0.2}
                      max={3.5}
                      step={0.1}
                      value={safeNum(selectedLayer.motionSpeed, 1)}
                      onChange={(e) =>
                        onUpdateLayer(selectedLayer.id, {
                          motionSpeed: Number(e.target.value) || 1,
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
                        {Math.round(safeNum(selectedLayer.stagger, 0.04) * 1000)} ms
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={0.15}
                      step={0.005}
                      value={safeNum(selectedLayer.stagger, 0.04)}
                      onChange={(e) =>
                        onUpdateLayer(selectedLayer.id, {
                          stagger: Number(e.target.value) || 0.04,
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
                        <div className="p-3 rounded-xl bg-[#202020] border border-neutral-800 space-y-3">
                          <div className="flex items-center justify-between pb-1.5 border-b border-neutral-800">
                            <div className="flex items-center gap-1.5">
                              <Activity className="w-3.5 h-3.5 text-[#4ade80]" />
                              <span className="text-[11px] font-semibold text-neutral-200">Reactivity Active</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                onUpdateLayer(selectedLayer.id, { audioReactive: false });
                                setGraphicMappingsCount(0);
                              }}
                              className="text-[10px] text-red-400 hover:text-red-300 transition-colors"
                            >
                              Remove
                            </button>
                          </div>

                          {/* Live Reactive Signal Meter */}
                          <div className="bg-[#141414] p-2 rounded-lg border border-neutral-800 space-y-1">
                            <div className="flex justify-between text-[10px] text-neutral-400">
                              <span>Signal Level ({selectedLayer.audioSignal || 'bass'})</span>
                              <span className="font-mono text-[#4ade80]">
                                {Math.round((audioSignals[selectedLayer.audioSignal || 'bass'] || audioSignals.rms || 0) * 100)}%
                              </span>
                            </div>
                            <div className="h-1.5 w-full bg-neutral-800 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-[#159947] to-[#4ade80] transition-all duration-75"
                                style={{
                                  width: `${Math.min(100, Math.max(5, (audioSignals[selectedLayer.audioSignal || 'bass'] || audioSignals.rms || 0) * 100))}%`,
                                }}
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-[10px] text-neutral-400 mb-1">
                              Signal Source
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
                              <option value="bass">Bass (20–160 Hz Sub-Punch)</option>
                              <option value="mid">Mids (160–2000 Hz Body/Vocal)</option>
                              <option value="treble">Treble (2–16 kHz Highs/Air)</option>
                              <option value="rms">Overall Amplitude (RMS)</option>
                              <option value="transient">Transient Attack / Beat Pulse</option>
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
                              <option value="scale">Scale (Size Modulation)</option>
                              <option value="posY">Vertical Position (Y Bounce)</option>
                              <option value="posX">Horizontal Position (X Jitter)</option>
                              <option value="rotation">Rotation (Spin Tilt)</option>
                              <option value="opacity">Opacity (Pulse Shimmer)</option>
                              <option value="strokeWidth">Stroke Width (Border Thump)</option>
                            </select>
                          </div>

                          {/* Sensitivity & Response Curve */}
                          <div className="grid grid-cols-2 gap-2.5">
                            <div>
                              <div className="flex justify-between text-[10px] text-neutral-400 mb-1">
                                <span>Sensitivity</span>
                                <span className="font-mono text-[#4ade80]">
                                  {safeNum(selectedLayer.audioSensitivity ?? selectedLayer.audioIntensity, 45)}%
                                </span>
                              </div>
                              <input
                                type="range"
                                min={0}
                                max={100}
                                value={safeNum(selectedLayer.audioSensitivity ?? selectedLayer.audioIntensity, 45)}
                                onChange={(e) =>
                                  onUpdateLayer(selectedLayer.id, {
                                    audioSensitivity: Number(e.target.value) || 0,
                                    audioIntensity: Number(e.target.value) || 0,
                                    audioReactive: true,
                                  })
                                }
                                className="w-full accent-[#22c55e]"
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] text-neutral-400 mb-1">
                                Response Curve
                              </label>
                              <select
                                value={selectedLayer.audioCurve || 'linear'}
                                onChange={(e) =>
                                  onUpdateLayer(selectedLayer.id, {
                                    audioCurve: e.target.value,
                                    audioReactive: true,
                                  })
                                }
                                className="w-full px-2 py-1 rounded-lg bg-[#161616] border border-neutral-700 text-[11px] text-white"
                              >
                                <option value="linear">Linear (1:1)</option>
                                <option value="easeOut">Ease Out (Dynamic)</option>
                                <option value="exponential">Exponential (Punchy)</option>
                                <option value="stepped">Stepped (Cut Threshold)</option>
                              </select>
                            </div>
                          </div>

                          {/* Min and Max Output Range */}
                          <div className="grid grid-cols-2 gap-2.5 pt-1">
                            <div>
                              <label className="block text-[10px] text-neutral-400 mb-1">
                                Min Range
                              </label>
                              <input
                                type="number"
                                step="0.1"
                                placeholder={selectedLayer.audioTarget === 'scale' ? '1.0' : '0'}
                                value={Number.isFinite(selectedLayer.audioMinRange) ? selectedLayer.audioMinRange : ''}
                                onChange={(e) => {
                                  const parsed = parseFloat(e.target.value);
                                  onUpdateLayer(selectedLayer.id, {
                                    audioMinRange: e.target.value === '' || Number.isNaN(parsed) ? null : parsed,
                                    audioReactive: true,
                                  });
                                }}
                                className="w-full px-2 py-1 rounded-lg bg-[#161616] border border-neutral-700 text-xs text-white font-mono"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] text-neutral-400 mb-1">
                                Max Range
                              </label>
                              <input
                                type="number"
                                step="0.1"
                                placeholder={selectedLayer.audioTarget === 'scale' ? '1.5' : '50'}
                                value={Number.isFinite(selectedLayer.audioMaxRange) ? selectedLayer.audioMaxRange : ''}
                                onChange={(e) => {
                                  const parsed = parseFloat(e.target.value);
                                  onUpdateLayer(selectedLayer.id, {
                                    audioMaxRange: e.target.value === '' || Number.isNaN(parsed) ? null : parsed,
                                    audioReactive: true,
                                  });
                                }}
                                className="w-full px-2 py-1 rounded-lg bg-[#161616] border border-neutral-700 text-xs text-white font-mono"
                              />
                            </div>
                          </div>

                          {/* Smoothing Factor */}
                          <div>
                            <div className="flex justify-between text-[10px] text-neutral-400 mb-1">
                              <span>Attack / Release Smoothing</span>
                              <span className="font-mono text-neutral-300">
                                {Math.round(safeNum(selectedLayer.audioSmoothing, 0.2) * 100)}%
                              </span>
                            </div>
                            <input
                              type="range"
                              min={0}
                              max={1}
                              step={0.05}
                              value={safeNum(selectedLayer.audioSmoothing, 0.2)}
                              onChange={(e) => {
                                const parsed = parseFloat(e.target.value);
                                onUpdateLayer(selectedLayer.id, {
                                  audioSmoothing: Number.isNaN(parsed) ? 0.2 : parsed,
                                  audioReactive: true,
                                });
                              }}
                              className="w-full accent-[#22c55e]"
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
                        {/* Live Reactive Signal Meter */}
                        <div className="bg-[#141414] p-2 rounded-lg border border-neutral-800 space-y-1">
                          <div className="flex justify-between text-[10px] text-neutral-400">
                            <span>Signal Level ({selectedLayer.audioSignal || 'bass'})</span>
                            <span className="font-mono text-[#4ade80]">
                              {Math.round((audioSignals[selectedLayer.audioSignal || 'bass'] || audioSignals.rms || 0) * 100)}%
                            </span>
                          </div>
                          <div className="h-1.5 w-full bg-neutral-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-[#159947] to-[#4ade80] transition-all duration-75"
                              style={{
                                width: `${Math.min(100, Math.max(5, (audioSignals[selectedLayer.audioSignal || 'bass'] || audioSignals.rms || 0) * 100))}%`,
                              }}
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] text-neutral-400 mb-1">
                            Frequency Band / Signal
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
                            <option value="bass">Bass (20–160 Hz Sub-Kick)</option>
                            <option value="mid">Mids (160–2000 Hz Vocal/Body)</option>
                            <option value="treble">Treble (2–16 kHz Highs/Air)</option>
                            <option value="rms">Overall Amplitude (RMS)</option>
                            <option value="transient">Transient Attack / Beat Pulse</option>
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
                            <option value="scale">Scale (Size Modulation)</option>
                            <option value="posY">Vertical Position (Y Bounce)</option>
                            <option value="posX">Horizontal Position (X Jitter)</option>
                            <option value="rotation">Rotation (Spin Tilt)</option>
                            <option value="opacity">Opacity (Pulse Shimmer)</option>
                            <option value="strokeWidth">Stroke Width</option>
                          </select>
                        </div>

                        {/* Sensitivity & Response Curve */}
                        <div className="grid grid-cols-2 gap-2.5">
                          <div>
                            <div className="flex justify-between text-[10px] text-neutral-400 mb-1">
                              <span>Sensitivity</span>
                              <span className="font-mono text-[#4ade80]">
                                {safeNum(selectedLayer.audioSensitivity ?? selectedLayer.audioIntensity, 45)}%
                              </span>
                            </div>
                            <input
                              type="range"
                              min={0}
                              max={100}
                              value={safeNum(selectedLayer.audioSensitivity ?? selectedLayer.audioIntensity, 45)}
                              onChange={(e) =>
                                onUpdateLayer(selectedLayer.id, {
                                  audioSensitivity: Number(e.target.value) || 0,
                                  audioIntensity: Number(e.target.value) || 0,
                                })
                              }
                              className="w-full accent-[#22c55e]"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] text-neutral-400 mb-1">
                              Response Curve
                            </label>
                            <select
                              value={selectedLayer.audioCurve || 'linear'}
                              onChange={(e) =>
                                onUpdateLayer(selectedLayer.id, {
                                  audioCurve: e.target.value,
                                })
                              }
                              className="w-full px-2 py-1.5 rounded-lg bg-[#202020] border border-neutral-700/80 text-[11px] text-white"
                            >
                              <option value="linear">Linear (1:1)</option>
                              <option value="easeOut">Ease Out (Dynamic)</option>
                              <option value="exponential">Exponential (Punchy)</option>
                              <option value="stepped">Stepped (Cut)</option>
                            </select>
                          </div>
                        </div>

                        {/* Min and Max Range */}
                        <div className="grid grid-cols-2 gap-2.5">
                          <div>
                            <label className="block text-[10px] text-neutral-400 mb-1">
                              Min Range
                            </label>
                            <input
                              type="number"
                              step="0.1"
                              placeholder={selectedLayer.audioTarget === 'scale' ? '1.0' : '0'}
                              value={Number.isFinite(selectedLayer.audioMinRange) ? selectedLayer.audioMinRange : ''}
                              onChange={(e) => {
                                const parsed = parseFloat(e.target.value);
                                onUpdateLayer(selectedLayer.id, {
                                  audioMinRange: e.target.value === '' || Number.isNaN(parsed) ? null : parsed,
                                });
                              }}
                              className="w-full px-2 py-1 rounded-lg bg-[#202020] border border-neutral-700/80 text-xs text-white font-mono"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] text-neutral-400 mb-1">
                              Max Range
                            </label>
                            <input
                              type="number"
                              step="0.1"
                              placeholder={selectedLayer.audioTarget === 'scale' ? '1.5' : '50'}
                              value={Number.isFinite(selectedLayer.audioMaxRange) ? selectedLayer.audioMaxRange : ''}
                              onChange={(e) => {
                                const parsed = parseFloat(e.target.value);
                                onUpdateLayer(selectedLayer.id, {
                                  audioMaxRange: e.target.value === '' || Number.isNaN(parsed) ? null : parsed,
                                });
                              }}
                              className="w-full px-2 py-1 rounded-lg bg-[#202020] border border-neutral-700/80 text-xs text-white font-mono"
                            />
                          </div>
                        </div>

                        {/* Smoothing Factor */}
                        <div>
                          <div className="flex justify-between text-[10px] text-neutral-400 mb-1">
                            <span>Attack / Release Smoothing</span>
                            <span className="font-mono text-neutral-300">
                              {Math.round(safeNum(selectedLayer.audioSmoothing, 0.2) * 100)}%
                            </span>
                          </div>
                          <input
                            type="range"
                            min={0}
                            max={1}
                            step={0.05}
                            value={safeNum(selectedLayer.audioSmoothing, 0.2)}
                            onChange={(e) => {
                              const parsed = parseFloat(e.target.value);
                              onUpdateLayer(selectedLayer.id, {
                                audioSmoothing: Number.isNaN(parsed) ? 0.2 : parsed,
                              });
                            }}
                            className="w-full accent-[#22c55e]"
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
