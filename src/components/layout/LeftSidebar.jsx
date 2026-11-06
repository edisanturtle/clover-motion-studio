'use client';

import React, { useState, useRef } from 'react';
import {
  Type,
  Palette,
  Sparkles,
  Layers,
  LayoutGrid,
  HelpCircle,
  FolderOpen,
  Plus,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Trash2,
  Copy,
  Clapperboard,
  Sliders,
  Check,
  CheckCircle2,
  Link2,
  Image as ImageIcon,
  ArrowUp,
  ArrowDown,
  Columns,
  Box,
  Wand2,
  Upload,
  Music,
  Volume2,
  Zap,
  Square,
  Circle,
  Group,
  Ungroup,
  ChevronsUp,
  ChevronsDown,
  PanelLeft,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { FONT_OPTIONS } from '../../constants/fonts';
import { COLOR_PALETTES, MOTION_PRESETS } from '../../constants/motionPresets';
import { GRAPHIC_TEMPLATES } from '../../constants/graphicAssets';
import { DEMO_TRACKS } from '../../constants/audioTracks';
import {
  ANIMOS_CATEGORIES,
  ANIMOS_SHOWCASE_TEMPLATES,
  ANIMOS_BG_GRADIENTS,
} from '../../constants/animosTemplates';
import {
  EFFECTCRAFT_FX_RACK,
  EFFECTCRAFT_SHADER_BACKGROUNDS,
  EVENT_SFX_PADS,
} from '../../constants/effectCraftEffects';
import { formatTimecode } from '../../utils/timecode';

const safeNum = (v, fallback) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);

function ScopeBanner({ targetScope, setTargetScope, activeSceneIndex, activeSceneName }) {
  return (
    <div className="flex items-center justify-between bg-[#141414] px-2.5 py-1.5 rounded-xl border border-neutral-800/90 mb-3 shadow-inner">
      <div className="flex items-center gap-1.5 min-w-0">
        <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider shrink-0">Scope:</span>
        <span className="text-[11px] font-semibold text-[#4ade80] truncate">
          {targetScope === 'scene' ? `Scene ${activeSceneIndex + 1} (${activeSceneName || 'Active'})` : 'All Scenes'}
        </span>
      </div>
      <div className="flex items-center bg-[#1c1c1c] p-0.5 rounded-lg border border-neutral-800 shrink-0">
        <button
          type="button"
          onClick={() => setTargetScope('scene')}
          className={`px-2 py-0.5 rounded text-[10px] font-medium transition-all ${
            targetScope === 'scene'
              ? 'bg-[#159947] text-white font-semibold shadow-sm'
              : 'text-neutral-400 hover:text-white'
          }`}
          title="Apply modifications only to the currently selected scene"
        >
          🎬 Scene Only
        </button>
        <button
          type="button"
          onClick={() => setTargetScope('all')}
          className={`px-2 py-0.5 rounded text-[10px] font-medium transition-all ${
            targetScope === 'all'
              ? 'bg-[#159947] text-white font-semibold shadow-sm'
              : 'text-neutral-400 hover:text-white'
          }`}
          title="Sync modifications across all scenes in this project"
        >
          🌐 All Scenes
        </button>
      </div>
    </div>
  );
}

function GraphicTemplateThumbnail({ template, isActive }) {
  const bg = template.bg || '#08183a';
  const c0 = template.colors?.[0] || '#1e5af6';
  const c1 = template.colors?.[1] || '#6fa8ff';
  const c2 = template.colors?.[2] || '#dbeafe';

  return (
    <div
      className="w-full h-24 rounded-lg overflow-hidden relative border border-neutral-800/80 mb-2"
      style={{ backgroundColor: bg }}
    >
      {template.previewType === 'pleats' && (
        <div className="w-full h-full flex">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="flex-1 h-full"
              style={{
                background: `linear-gradient(90deg, ${bg} 0%, ${c0} 55%, ${c1} 90%, ${c2} 100%)`,
              }}
            />
          ))}
        </div>
      )}
      {template.previewType === 'prism' && (
        <div
          className="w-full h-full"
          style={{
            background: `conic-gradient(from 45deg at 50% 55%, ${bg}, ${c0}, ${c2}, ${bg}, ${c1}, ${bg})`,
          }}
        />
      )}
      {template.previewType === 'bands' && (
        <div className="w-full h-full flex flex-col justify-center gap-1 p-2">
          {Array.from({ length: 8 }).map((_, r) => (
            <div key={r} className="flex gap-1 h-1.5">
              {Array.from({ length: 6 }).map((__, c) => (
                <div
                  key={c}
                  className="flex-1 rounded-[1px]"
                  style={{
                    backgroundColor: (r + c) % 2 === 0 ? c1 : c0,
                    opacity: ((r * 3 + c) % 4) * 0.25 + 0.25,
                  }}
                />
              ))}
            </div>
          ))}
        </div>
      )}
      {template.previewType === 'modular' && (
        <div className="w-full h-full grid grid-cols-8 grid-rows-4 gap-1 p-2.5">
          {Array.from({ length: 32 }).map((_, i) => (
            <div
              key={i}
              className={i % 2 === 0 ? 'rounded-full' : 'rounded-[2px]'}
              style={{
                backgroundColor: template.colors[i % template.colors.length],
              }}
            />
          ))}
        </div>
      )}
      {!['pleats', 'prism', 'bands', 'modular'].includes(template.previewType) && (
        <div
          className="w-full h-full flex items-center justify-center"
          style={{
            background: `radial-gradient(circle at 50% 50%, ${c1}, ${c0}, ${bg})`,
          }}
        >
          <span className="font-mono text-xs font-bold tracking-widest text-white/80 uppercase">
            {template.name}
          </span>
        </div>
      )}

      {isActive && (
        <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-white text-black flex items-center justify-center shadow">
          <Check className="w-3 h-3 stroke-[2.5]" />
        </span>
      )}
    </div>
  );
}

export default function LeftSidebar({
  editorMode,
  project,
  projectSavedStatus = 'Saved to your account',
  activeScene,
  activeSceneIndex,
  setActiveSceneIndex,
  selectedLayer,
  selectedLayerId,
  setSelectedLayerId,
  selectedLayerIds = null,
  setSelectedLayerIds = null,
  sidebarWidth = 280,
  leftDrawerOpen = true,
  onToggleDrawer,
  onEnsureDrawerOpen,
  onUpdateQuickCopy,
  onEnableQuickEdit,
  onApplyPalette,
  onSelectSceneMotionPreset,
  onAddScene,
  onDuplicateScene,
  onDeleteScene,
  onUpdateSceneProp,
  onChangeRatio,
  onAddTextLayer,
  onAddShapeLayer,
  onAddGraphicLayer,
  onApplyGraphicTemplate,
  onGroupLayers,
  onUngroupLayers,
  onReorderZ,
  onDeleteSelectedLayers,
  onDuplicateSelectedLayers,
  onUpdateLayer,
  onDeleteLayer,
  onDuplicateLayer,
  onMoveLayerOrder,
  onUploadCustomImage,
  onUpdateShowcase,
  onUploadMediaSlots,
  onClearMediaSlots,
  onUpdateShaderBg,
  onToggleFxRack,
  onUpdateFxParam,
  onSelectSceneAudio,
  onTriggerSfx,
  onOpenTemplates,
  onOpenBrandKits,
  onOpenFormatReview,
  onTogglePlay,
  onOpenExport,
  onOpenHelp,
  onOpenMyProjects,
  onSaveProject,
  onNewProject,
}) {
  const [quickTab, setQuickTab] = useState('content'); // 'content' | 'showcase' | 'fx' | 'style' | 'motion' | 'scenes'
  const [advTab, setAdvTab] = useState('content'); // 'content' | 'showcase' | 'fx' | 'text' | 'graphics' | 'motion' | 'style' | 'layers'
  const [targetScope, setTargetScope] = useState('scene'); // 'scene' | 'all'
  const [animosCategory, setAnimosCategory] = useState('all');
  const imageUploadRef = useRef(null);
  const mediaSlotUploadRef = useRef(null);

  const effectiveSelectedIds = Array.isArray(selectedLayerIds) && selectedLayerIds.length > 0
    ? selectedLayerIds
    : selectedLayerId ? [selectedLayerId] : [];

  const handleSelectLayerInList = (layerId, e) => {
    if (e?.shiftKey) {
      if (effectiveSelectedIds.includes(layerId)) {
        const next = effectiveSelectedIds.filter((id) => id !== layerId);
        if (setSelectedLayerIds) setSelectedLayerIds(next);
        if (setSelectedLayerId) setSelectedLayerId(next[0] || null);
      } else {
        const next = [...effectiveSelectedIds, layerId];
        if (setSelectedLayerIds) setSelectedLayerIds(next);
        if (setSelectedLayerId) setSelectedLayerId(next[0] || null);
      }
    } else {
      if (setSelectedLayerIds) setSelectedLayerIds([layerId]);
      if (setSelectedLayerId) setSelectedLayerId(layerId);
    }
  };

  const quickNavItems = [
    { id: 'content', label: 'Content', icon: Sliders },
    { id: 'showcase', label: '3D Cards', icon: Box },
    { id: 'fx', label: 'FX Rack', icon: Wand2 },
    { id: 'style', label: 'Style', icon: Palette },
    { id: 'motion', label: 'Motion', icon: Clapperboard },
    { id: 'scenes', label: 'Scenes', icon: Columns },
  ];

  const advNavItems = [
    { id: 'content', label: 'Quick Edit', icon: Sliders },
    { id: 'showcase', label: '3D Showcase (Animos)', icon: Box },
    { id: 'fx', label: 'FX & Shaders (EffectCraft)', icon: Wand2 },
    { id: 'text', label: 'Typography', icon: Type },
    { id: 'graphics', label: 'Graphics', icon: LayoutGrid },
    { id: 'motion', label: 'Scenes', icon: Clapperboard },
    { id: 'style', label: 'Brand Kits', icon: Palette },
    { id: 'layers', label: 'Layers', icon: Layers },
  ];

  const navItems = editorMode === 'quick' ? quickNavItems : advNavItems;
  const currentTab = editorMode === 'quick' ? quickTab : advTab;

  const handleSelectTab = (id) => {
    if (editorMode === 'quick') {
      setQuickTab(id);
    } else {
      setAdvTab(id);
      if (!leftDrawerOpen && onEnsureDrawerOpen) {
        onEnsureDrawerOpen();
      }
      if (id === 'style' && onOpenBrandKits) {
        onOpenBrandKits();
      }
    }
  };

  // Compute start/end timecodes for scenes list (Screenshot 40)
  const sceneTimings = [];
  let runningSec = 0;
  (project.scenes || []).forEach((sc) => {
    const start = runningSec;
    const end = runningSec + (sc.duration || 4);
    sceneTimings.push({ start, end });
    runningSec = end;
  });

  const sceneCount = project.scenes?.length || 1;
  const isCollapsed = !leftDrawerOpen;

  return (
    <aside
      style={isCollapsed ? { width: '48px' } : { width: `${sidebarWidth}px` }}
      className="bg-[#141414] border-r border-neutral-800/80 flex flex-col shrink-0 select-none h-full overflow-hidden transition-[width] duration-150 relative"
    >
      {/* Upper Split: Left Icon Rail + Right Inspector Content */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Vertical Left Icon Rail */}
        <div
          className={`${
            isCollapsed ? 'w-12' : editorMode === 'quick' ? 'w-14' : 'w-12'
          } bg-[#111111] border-r border-neutral-800/80 flex flex-col items-center py-2.5 gap-1.5 shrink-0`}
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = currentTab === item.id && !isCollapsed;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelectTab(item.id)}
                title={item.label}
                aria-label={item.label}
                className={`${
                  editorMode === 'quick' && !isCollapsed
                    ? 'w-12 py-1.5 flex flex-col items-center gap-0.5 rounded-xl'
                    : 'w-9 h-9 flex items-center justify-center rounded-xl'
                } transition-colors ${
                  active
                    ? 'bg-[#159947]/20 text-[#4ade80] border border-[#22c55e]/60 shadow-sm'
                    : 'text-neutral-500 hover:text-neutral-200 hover:bg-neutral-900'
                }`}
              >
                <Icon className="w-4 h-4" />
                {editorMode === 'quick' && !isCollapsed && (
                  <span className="text-[9px] font-medium leading-none">{item.label}</span>
                )}
              </button>
            );
          })}

          {onToggleDrawer && (
            <button
              type="button"
              onClick={onToggleDrawer}
              title={leftDrawerOpen ? 'Collapse sidebar' : 'Expand sidebar'}
              aria-label={leftDrawerOpen ? 'Collapse sidebar' : 'Expand sidebar'}
              className="mt-auto mb-1 p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800/80 transition-colors"
            >
              <PanelLeft className={`w-4 h-4 ${leftDrawerOpen ? 'text-[#4ade80]' : 'text-neutral-400'}`} />
            </button>
          )}
        </div>

        {/* Tab Content Area (Hidden when collapsed) */}
        {!isCollapsed && (
          <div className="flex-1 flex flex-col min-w-0 overflow-y-auto custom-scrollbar p-3.5">
            {/* =========================================================
                ADVANCED MODE: TAB 1 — QUICK EDIT (Screenshots 17, 31, 45)
               ========================================================= */}
            {editorMode === 'advanced' && currentTab === 'content' && (
              <div className="space-y-4">
                <div>
                  <div className="flex items-center gap-2 text-white font-semibold text-xs mb-1">
                    <Sliders className="w-3.5 h-3.5 text-neutral-400" />
                    <span>Quick Edit</span>
                  </div>
                  <p className="text-[11px] text-neutral-400 leading-relaxed">
                    Edit the title, subtitle, date, location and call to action in one place.
                  </p>
                </div>

                {!project.quickEditLinked ? (
                  <div className="space-y-3 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        onEnableQuickEdit?.();
                        if (activeScene?.layers?.length > 0) {
                          const titleLayer =
                            activeScene.layers.find((l) => l.role === 'title') ||
                            activeScene.layers[0];
                          setSelectedLayerId(titleLayer.id);
                        }
                      }}
                      className="w-full py-2.5 px-4 rounded-xl bg-[#159947] hover:bg-[#19b353] border border-[#22c55e]/35 text-white font-semibold text-xs transition-colors shadow-sm"
                    >
                      Set up Quick Edit
                    </button>
                    <p className="text-[11px] text-neutral-400 leading-relaxed">
                      Starts with matching text in this scene. Choose which other layers to link.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 pt-1">
                    {[
                      { key: 'title', label: 'Title', multiline: true, rows: 2 },
                      { key: 'subtitle', label: 'Subtitle', multiline: false },
                      { key: 'date', label: 'Edition', multiline: false },
                      { key: 'location', label: 'Location', multiline: false },
                      { key: 'cta', label: 'Call to action', multiline: false },
                      { key: 'brand', label: 'Brand or creator', multiline: false },
                    ].map((field) => {
                      const val = project.quickCopy?.[field.key] || '';
                      return (
                        <div key={field.key}>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-[11px] font-semibold text-neutral-200">
                              {field.label}
                            </label>
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#1f1f1f] border border-neutral-800 text-[10px] font-mono text-neutral-400">
                              <Link2 className="w-2.5 h-2.5" />
                              {sceneCount}
                            </span>
                          </div>
                          {field.multiline ? (
                            <textarea
                              rows={field.rows || 2}
                              value={val}
                              onChange={(e) => onUpdateQuickCopy(field.key, e.target.value)}
                              className="w-full px-2.5 py-2 rounded-lg bg-[#1c1c1c] border border-neutral-700/80 text-xs font-medium text-white focus:outline-none focus:border-white transition-colors resize-none"
                            />
                          ) : (
                            <input
                              type="text"
                              value={val}
                              onChange={(e) => onUpdateQuickCopy(field.key, e.target.value)}
                              className="w-full px-2.5 py-1.5 rounded-lg bg-[#1c1c1c] border border-neutral-700/80 text-xs text-white focus:outline-none focus:border-white transition-colors"
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* =========================================================
                QUICK EDITOR MODE: TAB 1 — CONTENT (Screenshots 8 & 14)
               ========================================================= */}
            {editorMode === 'quick' && currentTab === 'content' && (
              <div className="space-y-4">
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-widest text-neutral-500">
                    {project.purpose || 'MODULAR TYPE POSTER'}
                  </div>
                  <h2 className="text-lg font-bold text-white mt-0.5">Make it yours</h2>
                  <p className="text-xs text-neutral-400 mt-0.5 leading-relaxed">
                    Edit once. Your text updates across all scenes and sizes.
                  </p>
                </div>

                <div className="space-y-3.5">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-medium text-neutral-300">
                        Display text (required)
                      </label>
                      <span className="text-[10px] font-mono text-neutral-500">
                        {(project.quickCopy?.title || '').length} chars
                      </span>
                    </div>
                    <textarea
                      rows={2}
                      value={project.quickCopy?.title || ''}
                      onChange={(e) => onUpdateQuickCopy('title', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-[#1c1c1c] border border-neutral-700 text-sm font-semibold text-white focus:outline-none focus:border-white transition-colors resize-none"
                      placeholder="Headline..."
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-medium text-neutral-300">
                        Supporting headline
                      </label>
                      <span className="text-[10px] font-mono text-neutral-500">
                        {(project.quickCopy?.subtitle || '').length} chars
                      </span>
                    </div>
                    <textarea
                      rows={2}
                      value={project.quickCopy?.subtitle || ''}
                      onChange={(e) => onUpdateQuickCopy('subtitle', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-[#1c1c1c] border border-neutral-800 text-xs text-white focus:outline-none focus:border-neutral-500 transition-colors resize-none"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-medium text-neutral-300">Date & time</label>
                      <span className="text-[10px] font-mono text-neutral-500">
                        {(project.quickCopy?.date || '').length} chars
                      </span>
                    </div>
                    <input
                      type="text"
                      value={project.quickCopy?.date || ''}
                      onChange={(e) => onUpdateQuickCopy('date', e.target.value)}
                      className="w-full px-2.5 py-2 rounded-lg bg-[#1c1c1c] border border-neutral-800 text-xs text-white focus:outline-none focus:border-neutral-500"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-medium text-neutral-300">
                        Venue or website
                      </label>
                      <span className="text-[10px] font-mono text-neutral-500">
                        {(project.quickCopy?.location || '').length} chars
                      </span>
                    </div>
                    <input
                      type="text"
                      value={project.quickCopy?.location || ''}
                      onChange={(e) => onUpdateQuickCopy('location', e.target.value)}
                      className="w-full px-2.5 py-2 rounded-lg bg-[#1c1c1c] border border-neutral-800 text-xs text-white focus:outline-none focus:border-neutral-500"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-medium text-neutral-300">Call to action</label>
                      <span className="text-[10px] font-mono text-neutral-500">
                        {(project.quickCopy?.cta || '').length} chars
                      </span>
                    </div>
                    <textarea
                      rows={2}
                      value={project.quickCopy?.cta || ''}
                      onChange={(e) => onUpdateQuickCopy('cta', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-[#1c1c1c] border border-neutral-800 text-xs text-white focus:outline-none focus:border-neutral-500 resize-none"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-medium text-neutral-300">
                        Brand or creator
                      </label>
                      <span className="text-[10px] font-mono text-neutral-500">
                        {(project.quickCopy?.brand || '').length} chars
                      </span>
                    </div>
                    <input
                      type="text"
                      value={project.quickCopy?.brand || ''}
                      onChange={(e) => onUpdateQuickCopy('brand', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-[#1c1c1c] border border-neutral-800 text-xs text-white focus:outline-none focus:border-neutral-500"
                    />
                  </div>

                  {/* Bottom Action Controls in Quick Editor Content Tab (Screenshot 14) */}
                  <div className="pt-2 space-y-2.5">
                    <button
                      type="button"
                      onClick={onOpenBrandKits}
                      className="w-full py-2.5 px-3 rounded-xl bg-[#1c1c1c] hover:bg-neutral-800 border border-neutral-700/80 text-xs font-semibold text-white transition-colors"
                    >
                      Apply a brand kit
                    </button>

                    <div className="p-3 rounded-xl bg-[#191919] border border-neutral-800 flex items-start gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-[#22c55e] shrink-0 mt-0.5" />
                      <div>
                        <div className="text-xs font-semibold text-white">
                          Text fits in all three sizes
                        </div>
                        <div className="text-[11px] text-neutral-400 mt-0.5 leading-relaxed">
                          Checks text size and overflow across every scene.
                        </div>
                      </div>
                    </div>

                    <div>
                      <button
                        type="button"
                        onClick={onOpenFormatReview}
                        className="text-xs font-medium text-[#4ade80] hover:text-[#86efac] underline underline-offset-4"
                      >
                        Review all sizes
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={onTogglePlay}
                      className="w-full py-2.5 px-3 rounded-xl bg-[#1c1c1c] hover:bg-neutral-800 border border-neutral-700/80 text-xs font-semibold text-white transition-colors"
                    >
                      Preview animation
                    </button>

                    <button
                      type="button"
                      onClick={onOpenExport}
                      className="w-full py-2.5 px-3 rounded-xl bg-[#159947] hover:bg-[#19b353] border border-[#22c55e]/35 text-white text-xs font-semibold transition-colors shadow-sm"
                    >
                      Export
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* =========================================================
                TAB: 3D SHOWCASE (ANIMOS ENGINE)
               ========================================================= */}
            {currentTab === 'showcase' && (() => {
              const currentShowcase = (targetScope === 'scene' && activeScene?.showcase)
                ? activeScene.showcase
                : (project.showcase || {});
              const currentMediaSlots = (targetScope === 'scene' && activeScene?.mediaSlots && activeScene.mediaSlots.length > 0)
                ? activeScene.mediaSlots
                : (project.mediaSlots || []);
              const isActiveShowcase = currentShowcase.templateId && currentShowcase.templateId !== 'none';

              return (
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between">
                    <div className="text-[10px] font-mono uppercase tracking-widest text-[#4ade80]">
                      ANIMOS 3D SHOWCASE ENGINE
                    </div>
                    <span className="px-1.5 py-0.5 rounded bg-[#159947]/20 border border-[#22c55e]/40 text-[10px] font-mono text-[#4ade80]">
                      {isActiveShowcase ? 'ACTIVE' : 'OFF'}
                    </span>
                  </div>
                  <h2 className="text-sm font-bold text-white mt-0.5">3D & Perspective Cards</h2>
                  <p className="text-[11px] text-neutral-400 mt-0.5 leading-relaxed">
                    Add interactive 3D rings, globes, spirals, tunnels & isometric card decks behind or around your typography.
                  </p>
                </div>

                {/* Scope Selector Banner */}
                <ScopeBanner
                  targetScope={targetScope}
                  setTargetScope={setTargetScope}
                  activeSceneIndex={activeSceneIndex}
                  activeSceneName={activeScene?.name}
                />

                {/* Media Slots Uploader Bar (Matching Animos Editor "Media · N slots") */}
                <div className="p-2.5 rounded-xl bg-[#1a1a1a] border border-neutral-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-white">
                      Media · {currentShowcase.slots || 8} slots {targetScope === 'scene' ? '(Scene)' : '(Global)'}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {currentMediaSlots.length > 0 && (
                        <button
                          type="button"
                          onClick={() => onClearMediaSlots?.(targetScope)}
                          className="text-[10px] text-neutral-400 hover:text-red-400 underline"
                        >
                          Reset default
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => mediaSlotUploadRef.current?.click()}
                        className="px-2 py-1 rounded-lg bg-[#159947] hover:bg-[#19b353] text-[11px] font-semibold text-white flex items-center gap-1 transition-colors"
                      >
                        <Upload className="w-3 h-3" />
                        <span>Upload media</span>
                      </button>
                    </div>
                  </div>
                  <input
                    ref={mediaSlotUploadRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []);
                      if (files.length > 0 && onUploadMediaSlots) {
                        onUploadMediaSlots(files, targetScope);
                      }
                      e.target.value = '';
                    }}
                    className="hidden"
                  />
                  <div className="text-[10px] text-neutral-400">
                    {currentMediaSlots.length > 0
                      ? `${currentMediaSlots.length} custom image(s) loaded into this scene's 3D cards`
                      : 'Using 12 procedural Clover Studio showcase cards. Upload PNG/JPG to replace.'}
                  </div>
                </div>

                {/* Category Filter Pills */}
                <div className="flex flex-wrap gap-1">
                  {ANIMOS_CATEGORIES.map((cat) => {
                    const active = animosCategory === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setAnimosCategory(cat.id)}
                        className={`px-2 py-1 rounded-lg text-[10px] font-medium transition-colors ${
                          active
                            ? 'bg-[#159947] text-white font-semibold'
                            : 'bg-[#1c1c1c] text-neutral-400 hover:text-white border border-neutral-800'
                        }`}
                      >
                        {cat.label}
                      </button>
                    );
                  })}
                </div>

                {/* Showcase Template Cards */}
                <div className="space-y-1.5 max-h-[250px] overflow-y-auto custom-scrollbar pr-1">
                  <button
                    type="button"
                    onClick={() => onUpdateShowcase?.({ templateId: 'none' }, targetScope)}
                    className={`w-full px-3 py-2 rounded-xl border text-left flex items-center justify-between transition-all ${
                      !currentShowcase?.templateId || currentShowcase.templateId === 'none'
                        ? 'bg-[#1f1f1f] border-white text-white'
                        : 'bg-[#181818] border-neutral-800/90 text-neutral-400 hover:text-white'
                    }`}
                  >
                    <span className="text-xs font-semibold">None · Typography & Vector Only</span>
                    {(!currentShowcase?.templateId || currentShowcase.templateId === 'none') && (
                      <Check className="w-3.5 h-3.5 text-[#22c55e]" />
                    )}
                  </button>

                  {ANIMOS_SHOWCASE_TEMPLATES.filter(
                    (tpl) => animosCategory === 'all' || tpl.category === animosCategory
                  ).map((tpl) => {
                    const isSelected = currentShowcase?.templateId === tpl.id;
                    return (
                      <button
                        key={tpl.id}
                        type="button"
                        onClick={() =>
                          onUpdateShowcase?.({
                            templateId: tpl.id,
                            slots: tpl.slots || 8,
                            cardSize: tpl.defaults?.cardSize ?? 24,
                            cardAspect: tpl.defaults?.cardAspect ?? '1:1',
                            cornerRadius: tpl.defaults?.cornerRadius ?? 3,
                            tilt: tpl.defaults?.tilt ?? -18,
                            ringWidth: tpl.defaults?.ringWidth ?? 68,
                            ringDepth: tpl.defaults?.ringDepth ?? 48,
                            backFade: tpl.defaults?.backFade ?? 55,
                          }, targetScope)
                        }
                        className={`w-full p-2.5 rounded-xl border text-left transition-all ${
                          isSelected
                            ? 'bg-[#159947]/20 border-[#22c55e] text-white shadow-sm'
                            : 'bg-[#181818] border-neutral-800/90 text-neutral-300 hover:border-neutral-700'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-xs font-bold text-white truncate">{tpl.name}</span>
                          <div className="flex items-center gap-1 shrink-0">
                            <span className="px-1.5 py-0.5 rounded bg-neutral-900 border border-neutral-700 text-[9px] font-mono text-[#4ade80]">
                              {tpl.isNew ? 'NEW' : tpl.category}
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-neutral-900 text-[9px] font-mono text-neutral-400">
                              {tpl.slots} slots
                            </span>
                          </div>
                        </div>
                        <div className="text-[11px] text-neutral-400 mt-0.5 line-clamp-1">
                          {tpl.desc || tpl.description}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Animos 3D Controls (shown when a showcase template is active) */}
                {currentShowcase?.templateId && currentShowcase.templateId !== 'none' && (
                  <div className="space-y-3.5 pt-3 border-t border-neutral-800">
                    <div className="flex items-center justify-between">
                      <div className="text-[10px] font-mono uppercase tracking-widest text-neutral-400">
                        SHOWCASE GEOMETRY & CAMERA
                      </div>
                      <span className="text-[10px] font-mono text-[#4ade80]">Transitions.dev 3D</span>
                    </div>

                    {/* Vertical Position (Y Offset) — Solves typography overlap */}
                    <div>
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="text-neutral-300">Vertical Framing (Y-Offset)</span>
                        <span className="font-mono text-neutral-400">
                          {safeNum(currentShowcase.offsetY, 0)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min={-40}
                        max={40}
                        value={safeNum(currentShowcase.offsetY, 0)}
                        onChange={(e) =>
                          onUpdateShowcase?.({ offsetY: Number(e.target.value) || 0 }, targetScope)
                        }
                        className="w-full accent-[#16a34a]"
                      />
                      <div className="flex gap-1.5 mt-1.5">
                        {[
                          { label: 'Above Title', val: -22 },
                          { label: 'Center', val: 0 },
                          { label: 'Below Title', val: 24 },
                        ].map((pos) => (
                          <button
                            key={pos.label}
                            type="button"
                            onClick={() => onUpdateShowcase?.({ offsetY: pos.val }, targetScope)}
                            className={`flex-1 py-1 rounded-md text-[10px] font-medium border transition-colors ${
                              (currentShowcase.offsetY ?? 0) === pos.val
                                ? 'bg-[#159947]/20 border-[#22c55e] text-[#4ade80]'
                                : 'bg-[#1a1a1a] border-neutral-800 text-neutral-400 hover:text-white'
                            }`}
                          >
                            {pos.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Card Size */}
                    <div>
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="text-neutral-300">Card Size</span>
                        <span className="font-mono text-neutral-400">
                          {safeNum(currentShowcase.cardSize, 24)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min={12}
                        max={65}
                        value={safeNum(currentShowcase.cardSize, 24)}
                        onChange={(e) =>
                          onUpdateShowcase?.({ cardSize: Number(e.target.value) || 24 }, targetScope)
                        }
                        className="w-full accent-[#16a34a]"
                      />
                    </div>

                    {/* Card Spacing Gap */}
                    <div>
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="text-neutral-300">Card Spread Spacing</span>
                        <span className="font-mono text-neutral-400">
                          {safeNum(currentShowcase.spreadGap, 6)}px
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={32}
                        value={safeNum(currentShowcase.spreadGap, 6)}
                        onChange={(e) =>
                          onUpdateShowcase?.({ spreadGap: Number(e.target.value) || 0 }, targetScope)
                        }
                        className="w-full accent-[#16a34a]"
                      />
                    </div>

                    {/* Motion Curve & Speed Customization */}
                    <div className="space-y-2 pt-2 border-t border-neutral-800/80">
                      <div className="text-[11px] font-semibold text-white">Motion Dynamics & Curves</div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] text-neutral-400 mb-1">
                            Easing Curve
                          </label>
                          <select
                            value={currentShowcase.motionCurve || 'transitions'}
                            onChange={(e) =>
                              onUpdateShowcase?.({ motionCurve: e.target.value }, targetScope)
                            }
                            className="w-full px-2 py-1.5 rounded-lg bg-[#1c1c1c] border border-neutral-700 text-xs text-white"
                          >
                            <option value="transitions">Transitions.dev Fluid</option>
                            <option value="spring">Physics Spring</option>
                            <option value="elastic">Elastic Rubber</option>
                            <option value="anticipate">Anticipate Snap</option>
                            <option value="linear">Linear Drift</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] text-neutral-400 mb-1">
                            Motion Speed ({safeNum(currentShowcase.motionSpeed, 1.0)}×)
                          </label>
                          <select
                            value={safeNum(currentShowcase.motionSpeed, 1.0)}
                            onChange={(e) =>
                              onUpdateShowcase?.({ motionSpeed: Number(e.target.value) || 1.0 }, targetScope)
                            }
                            className="w-full px-2 py-1.5 rounded-lg bg-[#1c1c1c] border border-neutral-700 text-xs text-white"
                          >
                            <option value={0.5}>0.5× Slow</option>
                            <option value={0.75}>0.75× Calm</option>
                            <option value={1.0}>1.0× Normal</option>
                            <option value={1.25}>1.25× Brisk</option>
                            <option value={1.5}>1.5× Dynamic</option>
                            <option value={2.0}>2.0× Rapid</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Aspect & Backdrop */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] text-neutral-400 mb-1">
                          Card Aspect
                        </label>
                        <select
                          value={currentShowcase.cardAspect || '1:1'}
                          onChange={(e) =>
                            onUpdateShowcase?.({ cardAspect: e.target.value }, targetScope)
                          }
                          className="w-full px-2 py-1.5 rounded-lg bg-[#1c1c1c] border border-neutral-700 text-xs text-white"
                        >
                          <option value="1:1">1:1 Square</option>
                          <option value="16:9">16:9 Wide</option>
                          <option value="4:3">4:3 Classic</option>
                          <option value="3:4">3:4 Portrait</option>
                          <option value="9:16">9:16 Tall</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] text-neutral-400 mb-1">
                          Backdrop Glow
                        </label>
                        <select
                          value={currentShowcase.bgGradient || 'none'}
                          onChange={(e) =>
                            onUpdateShowcase?.({ bgGradient: e.target.value }, targetScope)
                          }
                          className="w-full px-2 py-1.5 rounded-lg bg-[#1c1c1c] border border-neutral-700 text-xs text-white"
                        >
                          <option value="none">Scene BG</option>
                          {ANIMOS_BG_GRADIENTS.map((g) => (
                            <option key={g.id} value={g.id}>
                              {g.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Camera Tilt */}
                    <div>
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="text-neutral-300">Camera Tilt</span>
                        <span className="font-mono text-neutral-400">
                          {safeNum(currentShowcase.tilt, -18)}°
                        </span>
                      </div>
                      <input
                        type="range"
                        min={-60}
                        max={60}
                        value={safeNum(currentShowcase.tilt, -18)}
                        onChange={(e) =>
                          onUpdateShowcase?.({ tilt: Number(e.target.value) || 0 }, targetScope)
                        }
                        className="w-full accent-[#16a34a]"
                      />
                    </div>

                    {/* Depth Fade */}
                    <div>
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="text-neutral-300">Depth Fade</span>
                        <span className="font-mono text-neutral-400">
                          {safeNum(currentShowcase.backFade, 55)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={90}
                        value={safeNum(currentShowcase.backFade, 55)}
                        onChange={(e) =>
                          onUpdateShowcase?.({ backFade: Number(e.target.value) || 0 }, targetScope)
                        }
                        className="w-full accent-[#16a34a]"
                      />
                    </div>

                    {/* Card Visual Effects Rack */}
                    <div className="space-y-2.5 pt-2 border-t border-neutral-800/80">
                      <div className="text-[11px] font-semibold text-white">Card Effects & Styling</div>

                      {/* Glare Intensity */}
                      <div>
                        <div className="flex justify-between text-[10px] mb-1">
                          <span className="text-neutral-400">Transitions.dev Glare Sheen</span>
                          <span className="font-mono text-neutral-400">
                            {safeNum(currentShowcase.glareIntensity, 60)}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={safeNum(currentShowcase.glareIntensity, 60)}
                          onChange={(e) =>
                            onUpdateShowcase?.({ glareIntensity: Number(e.target.value) || 0 }, targetScope)
                          }
                          className="w-full accent-[#16a34a]"
                        />
                      </div>

                      {/* Glassmorphism Toggle */}
                      <label className="flex items-center justify-between cursor-pointer py-1">
                        <div>
                          <span className="text-xs text-neutral-300 block">Frosted Glass (Acrylic)</span>
                          <span className="text-[10px] text-neutral-500 block">Translucent glass card body</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={Boolean(currentShowcase.glassmorphism)}
                          onChange={(e) =>
                            onUpdateShowcase?.({ glassmorphism: e.target.checked }, targetScope)
                          }
                          className="rounded accent-[#159947]"
                        />
                      </label>

                      {/* Border Glow Toggle */}
                      <div className="space-y-1.5 py-1">
                        <label className="flex items-center justify-between cursor-pointer">
                          <div>
                            <span className="text-xs text-neutral-300 block">Neon Border Glow</span>
                            <span className="text-[10px] text-neutral-500 block">Outer luminous neon outline</span>
                          </div>
                          <input
                            type="checkbox"
                            checked={Boolean(currentShowcase.borderGlow)}
                            onChange={(e) =>
                              onUpdateShowcase?.({ borderGlow: e.target.checked }, targetScope)
                            }
                            className="rounded accent-[#159947]"
                          />
                        </label>
                        {currentShowcase.borderGlow && (
                          <div className="flex items-center gap-2 pl-1">
                            <span className="text-[10px] text-neutral-400">Glow Color:</span>
                            {['#22c55e', '#38bdf8', '#f43f5e', '#fbbf24', '#c084fc'].map((col) => (
                              <button
                                key={col}
                                type="button"
                                onClick={() => onUpdateShowcase?.({ borderGlowColor: col }, targetScope)}
                                style={{ backgroundColor: col }}
                                className={`w-4 h-4 rounded-full border ${
                                  (currentShowcase.borderGlowColor || '#22c55e') === col
                                    ? 'border-white scale-110 shadow-sm'
                                    : 'border-transparent opacity-70 hover:opacity-100'
                                }`}
                              />
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Depth of Field Toggle */}
                      <label className="flex items-center justify-between cursor-pointer py-1">
                        <div>
                          <span className="text-xs text-neutral-300 block">Cinematic Depth Blur (DOF)</span>
                          <span className="text-[10px] text-neutral-500 block">Defocuses distant background cards</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={Boolean(currentShowcase.depthOfField)}
                          onChange={(e) =>
                            onUpdateShowcase?.({ depthOfField: e.target.checked }, targetScope)
                          }
                          className="rounded accent-[#159947]"
                        />
                      </label>

                      {/* Weightless Floating Levitation */}
                      <label className="flex items-center justify-between cursor-pointer py-1">
                        <div>
                          <span className="text-xs text-neutral-300 block">Weightless Levitation</span>
                          <span className="text-[10px] text-neutral-500 block">Harmonic floating sine inertia</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={currentShowcase.floatingLevitation !== false}
                          onChange={(e) =>
                            onUpdateShowcase?.({ floatingLevitation: e.target.checked }, targetScope)
                          }
                          className="rounded accent-[#159947]"
                        />
                      </label>

                      {/* Audio Reactive Pulse */}
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-xs text-neutral-300">Audio Reactive Pulse</span>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={currentShowcase.audioReactive !== false}
                          onClick={() =>
                            onUpdateShowcase?.({
                              audioReactive: currentShowcase.audioReactive === false,
                            }, targetScope)
                          }
                          className={`w-9 h-5 rounded-full transition-colors p-0.5 ${
                            currentShowcase.audioReactive !== false
                              ? 'bg-[#159947]'
                              : 'bg-neutral-700'
                          }`}
                        >
                          <div
                            className={`w-4 h-4 rounded-full bg-white transition-transform ${
                              currentShowcase.audioReactive !== false
                                ? 'translate-x-4'
                                : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              );
            })()}

            {/* =========================================================
                TAB: FX RACK & SHADERS (EFFECTCRAFT ENGINE)
               ========================================================= */}
            {currentTab === 'fx' && (() => {
              const currentShader = (targetScope === 'scene' && activeScene?.shaderBg !== undefined ? activeScene.shaderBg : null) || project.shaderBg || 'none';
              const currentFxRack = (targetScope === 'scene' && activeScene?.fxRack ? activeScene.fxRack : null) || project.fxRack || {};

              return (
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between">
                    <div className="text-[10px] font-mono uppercase tracking-widest text-[#4ade80]">
                      EFFECTCRAFT POST-FX & SHADERS
                    </div>
                    <span className="px-1.5 py-0.5 rounded bg-[#159947]/20 border border-[#22c55e]/40 text-[10px] font-mono text-[#4ade80]">
                      {currentShader !== 'none' || Object.values(currentFxRack).some((f) => f?.enabled)
                        ? 'ACTIVE'
                        : 'READY'}
                    </span>
                  </div>
                  <h2 className="text-sm font-bold text-white mt-0.5">Shaders & FX Rack</h2>
                  <p className="text-[11px] text-neutral-400 mt-0.5 leading-relaxed">
                    Layer generative shader backgrounds and real-time post-processing effects synced to audio.
                  </p>
                </div>

                {/* Scope Selector Banner */}
                <ScopeBanner
                  targetScope={targetScope}
                  setTargetScope={setTargetScope}
                  activeSceneIndex={activeSceneIndex}
                  activeSceneName={activeScene?.name}
                />

                {/* Procedural Shader Backgrounds */}
                <div className="space-y-2 pb-3 border-b border-neutral-800">
                  <div className="text-xs font-semibold text-white">
                    Procedural Shader Background {targetScope === 'scene' ? '(This Scene)' : '(All Scenes)'}
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {EFFECTCRAFT_SHADER_BACKGROUNDS.map((sh) => {
                      const active = currentShader === sh.id;
                      return (
                        <button
                          key={sh.id}
                          type="button"
                          onClick={() => onUpdateShaderBg?.(sh.id, targetScope)}
                          className={`p-2 rounded-xl border text-left transition-all ${
                            active
                              ? 'bg-[#159947]/20 border-[#22c55e] text-white'
                              : 'bg-[#1a1a1a] border-neutral-800/90 text-neutral-300 hover:border-neutral-700'
                          }`}
                        >
                          <div className="flex items-center gap-1.5">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: sh.previewColors?.[1] || '#22c55e' }}
                            />
                            <span className="text-[11px] font-semibold truncate">{sh.name}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Stackable Post-Processing FX Rack */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-white">
                      Master FX Rack (10 Effects)
                    </span>
                    <span className="text-[10px] font-mono text-[#4ade80]">
                      {
                        Object.values(currentFxRack || {}).filter((fx) => fx?.enabled)
                          .length
                      }{' '}
                      active
                    </span>
                  </div>

                  <div className="space-y-2">
                    {EFFECTCRAFT_FX_RACK.map((fxDef) => {
                      const state = currentFxRack?.[fxDef.id] || {
                        enabled: false,
                        intensity: fxDef.defaultIntensity,
                        secondary: fxDef.defaultSecondary,
                        audioReactive: false,
                        audioBand: 'bass',
                      };
                      return (
                        <div
                          key={fxDef.id}
                          className={`p-2.5 rounded-xl border transition-all ${
                            state.enabled
                              ? 'bg-[#159947]/15 border-[#22c55e]/70'
                              : 'bg-[#181818] border-neutral-800/90'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-white truncate">
                                {fxDef.name}
                              </div>
                              <div className="text-[10px] text-neutral-400 truncate">
                                {fxDef.description}
                              </div>
                            </div>
                            <button
                              type="button"
                              role="switch"
                              aria-checked={!!state.enabled}
                              onClick={() => onToggleFxRack?.(fxDef.id, targetScope)}
                              className={`w-9 h-5 rounded-full transition-colors p-0.5 shrink-0 ${
                                state.enabled ? 'bg-[#159947]' : 'bg-neutral-700'
                              }`}
                            >
                              <div
                                className={`w-4 h-4 rounded-full bg-white transition-transform ${
                                  state.enabled ? 'translate-x-4' : 'translate-x-0'
                                }`}
                              />
                            </button>
                          </div>

                          {state.enabled && (
                            <div className="mt-2.5 pt-2 border-t border-neutral-800/80 space-y-2">
                              <div>
                                <div className="flex justify-between text-[10px] text-neutral-300 mb-0.5">
                                  <span>Intensity</span>
                                  <span className="font-mono">
                                    {safeNum(state.intensity, fxDef.defaultIntensity ?? 50)}%
                                  </span>
                                </div>
                                <input
                                  type="range"
                                  min={0}
                                  max={100}
                                  value={safeNum(state.intensity, fxDef.defaultIntensity ?? 50)}
                                  onChange={(e) =>
                                    onUpdateFxParam?.(fxDef.id, {
                                      intensity: Number(e.target.value) || 0,
                                    }, targetScope)
                                  }
                                  className="w-full accent-[#16a34a]"
                                />
                              </div>

                              <div>
                                <div className="flex justify-between text-[10px] text-neutral-300 mb-0.5">
                                  <span>{fxDef.secondaryLabel || 'Parameter'}</span>
                                  <span className="font-mono">
                                    {safeNum(state.secondary, fxDef.defaultSecondary ?? 30)}
                                  </span>
                                </div>
                                <input
                                  type="range"
                                  min={fxDef.secondaryMin ?? 0}
                                  max={fxDef.secondaryMax ?? 100}
                                  value={safeNum(state.secondary, fxDef.defaultSecondary ?? 30)}
                                  onChange={(e) =>
                                    onUpdateFxParam?.(fxDef.id, {
                                      secondary: Number(e.target.value) || 0,
                                    }, targetScope)
                                  }
                                  className="w-full accent-[#16a34a]"
                                />
                              </div>

                              <div className="flex items-center justify-between pt-0.5">
                                <span className="text-[10px] text-neutral-300">
                                  Audio Reactive (Bass Pulse)
                                </span>
                                <input
                                  type="checkbox"
                                  checked={!!state.audioReactive}
                                  onChange={(e) =>
                                    onUpdateFxParam?.(fxDef.id, {
                                      audioReactive: e.target.checked,
                                    }, targetScope)
                                  }
                                  className="accent-[#16a34a]"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
              );
            })()}

            {/* =========================================================
                TAB: STYLE / BRAND KITS
               ========================================================= */}
            {currentTab === 'style' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[10px] font-mono uppercase tracking-widest text-neutral-500">
                      COLOR & BRANDING
                    </div>
                    <h2 className="text-sm font-bold text-white mt-0.5">Color Palettes</h2>
                  </div>
                  <button
                    type="button"
                    onClick={onOpenBrandKits}
                    className="px-2.5 py-1 rounded-lg bg-[#222] hover:bg-neutral-700 border border-neutral-700 text-[11px] font-medium text-white transition-colors"
                  >
                    Brand kits ↗
                  </button>
                </div>

                {/* Scope Selector Banner */}
                <ScopeBanner
                  targetScope={targetScope}
                  setTargetScope={setTargetScope}
                  activeSceneIndex={activeSceneIndex}
                  activeSceneName={activeScene?.name}
                />

                <div className="space-y-2">
                  {COLOR_PALETTES.map((pal) => (
                    <button
                      key={pal.id}
                      type="button"
                      onClick={() => onApplyPalette(pal.colors, targetScope)}
                      className="w-full p-2.5 rounded-xl bg-[#1c1c1c] hover:bg-neutral-800/80 border border-neutral-800 hover:border-neutral-700 flex items-center justify-between transition-all"
                    >
                      <span className="text-xs font-medium text-neutral-200">{pal.name}</span>
                      <div className="flex items-center gap-1">
                        {pal.colors.slice(0, 5).map((hex, i) => (
                          <span
                            key={i}
                            className="w-4 h-4 rounded-full border border-white/15"
                            style={{ backgroundColor: hex }}
                          />
                        ))}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* =========================================================
                QUICK EDITOR: MOTION TAB
               ========================================================= */}
            {editorMode === 'quick' && currentTab === 'motion' && (
              <div className="space-y-4">
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-widest text-neutral-500">
                    KINETIC BEHAVIOR
                  </div>
                  <h2 className="text-sm font-bold text-white mt-0.5">Motion Presets</h2>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {MOTION_PRESETS.filter((p) => p.id !== 'none').map((preset) => {
                    const isSelected = selectedLayer?.motionPreset === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => onSelectSceneMotionPreset(preset.id)}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          isSelected
                            ? 'bg-white/10 border-white text-white'
                            : 'bg-[#1c1c1c] border-neutral-800/90 text-neutral-300 hover:border-neutral-700'
                        }`}
                      >
                        <div className="text-xs font-semibold">{preset.name}</div>
                        <div className="text-[11px] text-neutral-500 mt-0.5">{preset.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* =========================================================
                ADVANCED MODE: TAB 4 — SCENES (Screenshots 38, 39, 40)
                & QUICK EDITOR: SCENES TAB
               ========================================================= */}
            {((editorMode === 'advanced' && currentTab === 'motion') ||
              (editorMode === 'quick' && currentTab === 'scenes')) && (
              <div className="space-y-5">
                {/* Top Scene Properties (Screenshot 38) */}
                {activeScene && (
                  <div className="space-y-3 pb-4 border-b border-neutral-800/80">
                    <div>
                      <label className="block text-[11px] text-neutral-400 mb-1">Scene name</label>
                      <input
                        type="text"
                        value={activeScene.name || ''}
                        onChange={(e) => onUpdateSceneProp?.('name', e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-[#1c1c1c] border border-neutral-700/80 text-xs font-medium text-white focus:outline-none focus:border-white"
                      />
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <label className="text-[11px] text-neutral-400">Duration</label>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          min={1}
                          max={60}
                          value={safeNum(activeScene.duration, 4)}
                          onChange={(e) =>
                            onUpdateSceneProp?.(
                              'duration',
                              Math.max(1, Math.min(60, Number(e.target.value) || 2))
                            )
                          }
                          className="w-16 px-2 py-1 rounded-lg bg-[#1c1c1c] border border-neutral-700/80 text-xs font-mono text-right text-white focus:outline-none focus:border-white"
                        />
                        <span className="text-xs font-mono text-neutral-400">s</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] text-neutral-400 mb-1">
                        Artwork transition
                      </label>
                      <select
                        value={activeScene.transition || 'Cut'}
                        onChange={(e) => onUpdateSceneProp?.('transition', e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-[#1c1c1c] border border-neutral-700/80 text-xs text-white focus:outline-none focus:border-white"
                      >
                        <option value="Cut">Cut</option>
                        <option value="Fade · 150 ms">Fade · 150 ms</option>
                        <option value="Fade · 300 ms">Fade · 300 ms</option>
                        <option value="Wipe Left · 200 ms">Wipe Left · 200 ms</option>
                        <option value="Zoom Blur · 250 ms">Zoom Blur · 250 ms</option>
                        <option value="Iris Circle · 300 ms">Iris Circle · 300 ms</option>
                        <option value="Glitch Slice · 200 ms">Glitch Slice · 200 ms</option>
                      </select>
                    </div>

                    {/* Per-Scene Dedicated Sound & Music */}
                    <div className="pt-2 border-t border-neutral-800/80 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Music className="w-3.5 h-3.5 text-[#4ade80]" />
                          <span className="text-xs font-semibold text-white">Scene Sound & Audio</span>
                        </div>
                        <span className="text-[10px] font-mono text-[#4ade80]">Independent</span>
                      </div>

                      <div>
                        <label className="block text-[10px] text-neutral-400 mb-1">Audio Track</label>
                        <select
                          value={activeScene.audioTrackId || ''}
                          onChange={(e) => onSelectSceneAudio?.(e.target.value || null)}
                          className="w-full px-2 py-1.5 rounded-lg bg-[#1c1c1c] border border-neutral-700/80 text-xs text-white focus:outline-none focus:border-white"
                        >
                          <option value="">Inherit Project Track ({project.audioTrackId || 'funk'})</option>
                          <option value="mute">Mute Scene (Silent)</option>
                          <optgroup label="Procedural Tracks">
                            {DEMO_TRACKS.map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.name} ({t.genre} · {t.bpm} BPM)
                              </option>
                            ))}
                          </optgroup>
                        </select>
                      </div>

                      {/* Scene Entrance SFX Trigger */}
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
                              <span>Test SFX</span>
                            </button>
                          )}
                        </div>
                        <select
                          value={activeScene.sfxOnEnter || 'none'}
                          onChange={(e) => onSelectSceneAudio?.(activeScene.audioTrackId, e.target.value)}
                          className="w-full px-2 py-1.5 rounded-lg bg-[#1c1c1c] border border-neutral-700/80 text-xs text-white focus:outline-none focus:border-white"
                        >
                          <option value="none">None (No entrance SFX)</option>
                          {EVENT_SFX_PADS.map((pad) => (
                            <option key={pad.id} value={pad.id}>
                              {pad.label} ({pad.desc})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Per-Scene Kinetic Motion Preset */}
                    <div className="pt-2 border-t border-neutral-800/80 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-white">Scene Kinetic Motion</span>
                        <span className="text-[10px] font-mono text-[#4ade80]">
                          {activeScene.motionPreset || 'default'}
                        </span>
                      </div>

                      <select
                        value={activeScene.motionPreset || 'none'}
                        onChange={(e) => onUpdateSceneProp?.('motionPreset', e.target.value)}
                        className="w-full px-2 py-1.5 rounded-lg bg-[#1c1c1c] border border-neutral-700/80 text-xs text-white focus:outline-none focus:border-white"
                      >
                        <option value="none">None (Static Typography)</option>
                        {MOTION_PRESETS.filter((p) => p.id !== 'none').map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} — {p.desc}
                          </option>
                        ))}
                      </select>

                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <div>
                          <label className="block text-[10px] text-neutral-400 mb-0.5">Motion Curve</label>
                          <select
                            value={activeScene.motionCurve || 'transitions'}
                            onChange={(e) => onUpdateSceneProp?.('motionCurve', e.target.value)}
                            className="w-full px-2 py-1 rounded-lg bg-[#1c1c1c] border border-neutral-700/80 text-[11px] text-white"
                          >
                            <option value="transitions">transitions.dev</option>
                            <option value="spring">Spring Snap</option>
                            <option value="elastic">Elastic Rubber</option>
                            <option value="anticipate">Anticipate Back</option>
                            <option value="linear">Linear</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] text-neutral-400 mb-0.5">
                            Speed ({safeNum(activeScene.motionSpeed, 1.0)}×)
                          </label>
                          <input
                            type="range"
                            min={0.5}
                            max={2.0}
                            step={0.1}
                            value={safeNum(activeScene.motionSpeed, 1.0)}
                            onChange={(e) => onUpdateSceneProp?.('motionSpeed', Number(e.target.value) || 1.0)}
                            className="w-full accent-[#16a34a] mt-1"
                          />
                        </div>
                      </div>
                    </div>

                    <p className="text-[11px] text-neutral-500 leading-relaxed pt-1">
                      Each scene can have its own independent sound track, entrance SFX, kinetic motion, and 3D card layout.
                    </p>
                  </div>
                )}

                {/* Middle Section: Format versions (Screenshot 39) */}
                <div className="space-y-2.5 pb-4 border-b border-neutral-800/80">
                  <div className="flex items-center gap-2 text-xs font-semibold text-white">
                    <Layers className="w-3.5 h-3.5 text-neutral-400" />
                    <span>Format versions</span>
                  </div>
                  <p className="text-[11px] text-neutral-400 leading-relaxed">
                    Share text and assets. Adjust position and size separately for each format.
                  </p>

                  <div className="space-y-2 pt-1">
                    {[
                      { id: '4:5', name: 'Feed (Social)', dims: '1080 × 1350', aspect: 'w-8 h-10' },
                      { id: '1:1', name: 'Square (Post)', dims: '1080 × 1080', aspect: 'w-9 h-9' },
                      { id: '9:16', name: 'Story / Totem', dims: '1080 × 1920', aspect: 'w-6 h-11' },
                      { id: '16:9', name: 'Stage LED / YouTube', dims: '1920 × 1080', aspect: 'w-11 h-6' },
                      { id: '4:3', name: 'Exhibition Screen', dims: '1440 × 1080', aspect: 'w-10 h-8' },
                      { id: '3:4', name: 'Event Poster', dims: '1080 × 1440', aspect: 'w-8 h-11' },
                    ].map((fmt) => {
                      const active = project.ratio === fmt.id;
                      return (
                        <button
                          key={fmt.id}
                          type="button"
                          onClick={() => onChangeRatio?.(fmt.id)}
                          className={`w-full p-2.5 rounded-xl border flex items-center gap-3 text-left transition-all ${
                            active
                              ? 'bg-[#1f1f1f] border-white text-white shadow-sm'
                              : 'bg-[#181818] border-neutral-800/90 text-neutral-300 hover:border-neutral-700'
                          }`}
                        >
                          <div className="w-12 h-12 rounded-lg bg-[#0e0e0e] border border-neutral-800 flex items-center justify-center shrink-0">
                            <div
                              className={`${fmt.aspect} rounded-[2px] border border-white/25 flex items-center justify-center`}
                              style={{ backgroundColor: activeScene?.bg || '#101935' }}
                            >
                              <div className="w-3 h-0.5 bg-white/70" />
                            </div>
                          </div>
                          <div>
                            <div className="text-xs font-semibold text-white">{fmt.name}</div>
                            <div className="text-[11px] font-mono text-neutral-400 mt-0.5">
                              {fmt.dims}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Bottom Section: Scene sequence cards (Screenshot 40) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-white">Scenes</span>
                    <button
                      type="button"
                      onClick={onAddScene}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[#1c1c1c] hover:bg-neutral-800 border border-neutral-700 text-[11px] text-white"
                    >
                      <Plus className="w-3 h-3" /> Add
                    </button>
                  </div>

                  {project.scenes.map((sc, idx) => {
                    const active = idx === activeSceneIndex;
                    const timing = sceneTimings[idx] || { start: 0, end: sc.duration || 4 };
                    return (
                      <div
                        key={sc.id}
                        onClick={() => setActiveSceneIndex(idx)}
                        className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-center gap-3 ${
                          active
                            ? 'bg-[#1f1f1f] border-white text-white'
                            : 'bg-[#181818] border-neutral-800/90 text-neutral-300 hover:border-neutral-700'
                        }`}
                      >
                        <div
                          className="w-12 h-14 rounded-lg border border-white/15 shrink-0 flex flex-col items-center justify-center p-1 overflow-hidden"
                          style={{ backgroundColor: sc.bg || '#101935' }}
                        >
                          <div className="w-6 h-0.5 bg-white/80 mb-0.5" />
                          <div className="w-4 h-0.5 bg-white/50" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold text-white truncate">{sc.name}</div>
                          <div className="text-[11px] font-mono text-neutral-400 mt-0.5">
                            {formatTimecode(timing.start, project.fps || 30)}
                          </div>
                          <div className="text-[11px] font-mono text-neutral-500">
                            {formatTimecode(timing.end, project.fps || 30)}
                          </div>
                        </div>
                        {project.scenes.length > 1 && (
                          <div className="flex flex-col gap-1">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDuplicateScene(idx);
                              }}
                              className="p-1 rounded hover:bg-neutral-800 text-neutral-400 hover:text-white"
                              title="Duplicate scene"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteScene(idx);
                              }}
                              className="p-1 rounded hover:bg-neutral-800 text-neutral-400 hover:text-red-400"
                              title="Delete scene"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* =========================================================
                ADVANCED MODE: TAB 2 — TYPOGRAPHY
               ========================================================= */}
            {editorMode === 'advanced' && currentTab === 'text' && (
              <div className="space-y-4">
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-widest text-neutral-500">
                    TYPOGRAPHY
                  </div>
                  <h2 className="text-sm font-bold text-white mt-0.5">Add Text Layer</h2>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  <button
                    type="button"
                    onClick={() => onAddTextLayer('HEADLINE', 120)}
                    className="w-full p-3 rounded-xl bg-[#1c1c1c] hover:bg-neutral-800 border border-neutral-800 text-left transition-colors"
                  >
                    <div className="text-sm font-bold text-white">+ Add Display Headline</div>
                    <div className="text-[11px] text-neutral-500">120px Bold Display</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => onAddTextLayer('SUBTITLE COPY', 36)}
                    className="w-full p-3 rounded-xl bg-[#1c1c1c] hover:bg-neutral-800 border border-neutral-800 text-left transition-colors"
                  >
                    <div className="text-xs font-semibold text-white">+ Add Supporting Copy</div>
                    <div className="text-[11px] text-neutral-500">36px Editorial Sans</div>
                  </button>
                </div>

                <div className="pt-2 border-t border-neutral-800">
                  <div className="text-[10px] font-mono uppercase tracking-widest text-neutral-500 mb-2">
                    AVAILABLE TYPEFACES
                  </div>
                  <div className="space-y-1.5">
                    {FONT_OPTIONS.map((font) => (
                      <button
                        key={font.id}
                        type="button"
                        onClick={() => {
                          if (selectedLayer?.type === 'text') {
                            onUpdateLayer(selectedLayer.id, { fontFamily: font.family });
                          } else {
                            // Find the active scene's headline / title layer or first text layer
                            const titleLayer =
                              (activeScene?.layers || []).find((l) => l.type === 'text' && l.role === 'title') ||
                              (activeScene?.layers || []).find((l) => l.type === 'text');
                            if (titleLayer) {
                              setSelectedLayerId(titleLayer.id);
                              onUpdateLayer(titleLayer.id, { fontFamily: font.family });
                            }
                          }
                        }}
                        className="w-full px-3 py-2 rounded-lg bg-[#1c1c1c] hover:bg-neutral-800 border border-neutral-800/80 flex items-center justify-between text-left"
                      >
                        <span
                          className="text-xs text-white truncate"
                          style={{ fontFamily: font.family }}
                        >
                          {font.name}
                        </span>
                        <span className="text-[10px] font-mono text-neutral-500">
                          {font.category}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* =========================================================
                ADVANCED MODE: TAB 3 — GRAPHICS (Screenshots 36 & 37 + Vector Primitives)
               ========================================================= */}
            {editorMode === 'advanced' && currentTab === 'graphics' && (
              <div className="space-y-4">
                {/* Vector Primitive Shapes (Fase 3: Primitive Shapes) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">Primitive Shapes</span>
                    <span className="text-[10px] font-mono text-[#4ade80]">Vector</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { id: 'rectangle', label: 'Rectangle', icon: Square },
                      { id: 'circle', label: 'Circle', icon: Circle },
                      { id: 'pill', label: 'Pill', icon: '💊' },
                      { id: 'triangle', label: 'Triangle', icon: '▲' },
                      { id: 'star', label: 'Star', icon: '★' },
                      { id: 'line', label: 'Rule Line', icon: '—' },
                    ].map((sh) => (
                      <button
                        key={sh.id}
                        type="button"
                        onClick={() => onAddShapeLayer?.(sh.id)}
                        className="p-2.5 rounded-xl bg-[#1c1c1c] hover:bg-neutral-800 border border-neutral-700/80 hover:border-[#22c55e] flex flex-col items-center justify-center gap-1 text-neutral-300 hover:text-white transition-all group shadow-sm"
                      >
                        <span className="text-sm group-hover:scale-110 transition-transform">
                          {typeof sh.icon === 'string' ? sh.icon : <sh.icon className="w-3.5 h-3.5 text-[#4ade80]" />}
                        </span>
                        <span className="text-[10px] font-medium">{sh.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-2 border-t border-neutral-800 space-y-2">
                  <p className="text-xs text-neutral-300 leading-relaxed">
                    Graphic templates & Swiss kinetic layouts.
                  </p>

                  <div className="space-y-2.5">
                    {GRAPHIC_TEMPLATES.map((gt) => {
                      const isActive =
                        activeScene?.decorStyle === gt.id ||
                        selectedLayer?.assetId === gt.id;
                      return (
                        <button
                          key={gt.id}
                          type="button"
                          onClick={() => {
                            if (onApplyGraphicTemplate) {
                              onApplyGraphicTemplate(gt);
                            } else {
                              onAddGraphicLayer(gt.id, gt.name);
                            }
                          }}
                          className={`w-full p-2.5 rounded-xl border text-left transition-all ${
                            isActive
                              ? 'bg-[#159947]/15 border-[#22c55e] shadow-sm'
                              : 'bg-[#1a1a1a] border-neutral-800/90 hover:border-neutral-700'
                          }`}
                        >
                          <GraphicTemplateThumbnail template={gt} isActive={isActive} />
                          <div className="flex items-end justify-between gap-2">
                            <div>
                              <div className="text-xs font-bold text-white">{gt.name}</div>
                              <div className="text-[11px] text-neutral-400 mt-0.5">{gt.detail}</div>
                            </div>
                            <span className="text-[11px] font-mono text-neutral-500 shrink-0">
                              {gt.tag}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* =========================================================
                ADVANCED MODE: TAB 6 — LAYERS / STACK (Screenshots 42 & 43)
               ========================================================= */}
            {editorMode === 'advanced' && currentTab === 'layers' && (
              <div className="flex flex-col h-full justify-between space-y-3">
                <div className="space-y-3">
                  {/* Top Import SVG / Image button */}
                  <button
                    type="button"
                    onClick={() => imageUploadRef.current?.click()}
                    className="w-full py-2 px-3 rounded-xl bg-[#1c1c1c] hover:bg-neutral-800 border border-neutral-700/80 flex items-center justify-center gap-2 text-xs font-medium text-neutral-200 hover:text-white transition-colors"
                  >
                    <ImageIcon className="w-3.5 h-3.5 text-neutral-400" />
                    <span>Import SVG / image</span>
                  </button>
                  <input
                    ref={imageUploadRef}
                    type="file"
                    accept=".svg,.png,.jpg,.jpeg,.webp"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file && onUploadCustomImage) onUploadCustomImage(file);
                      e.target.value = '';
                    }}
                    className="hidden"
                  />

                  {/* Selection status bar */}
                  <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-[#1a1a1a] border border-neutral-800/80 text-[11px]">
                    <div className="flex items-center gap-1.5 text-neutral-500">
                      <Layers className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-neutral-300">
                        {effectiveSelectedIds.length > 0
                          ? `${effectiveSelectedIds.length} selected`
                          : '0 selected'}
                      </span>
                      {effectiveSelectedIds.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            if (setSelectedLayerIds) setSelectedLayerIds([]);
                            if (setSelectedLayerId) setSelectedLayerId(null);
                          }}
                          className="text-neutral-300 hover:text-white underline underline-offset-2"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>

                  <p className="text-[11px] text-neutral-400 leading-relaxed">
                    Shift-click to select several. Drag empty canvas to select an area.
                  </p>

                  {/* Stack Header with count badge & quick add buttons */}
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white">Stack</span>
                      <span className="px-1.5 py-0.5 rounded bg-[#222222] border border-neutral-700/80 text-[10px] font-mono text-neutral-300">
                        {activeScene?.layers?.length || 0}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => onAddTextLayer('NEW TEXT', 72)}
                        className="px-2 py-1 rounded-lg bg-[#1c1c1c] hover:bg-neutral-800 border border-neutral-700/80 text-[11px] font-semibold text-neutral-200 hover:text-white flex items-center gap-0.5"
                        title="Add text layer"
                      >
                        <Type className="w-3 h-3" />
                        <span>+</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onAddShapeLayer?.('rectangle')}
                        className="px-2 py-1 rounded-lg bg-[#1c1c1c] hover:bg-neutral-800 border border-neutral-700/80 text-[11px] font-semibold text-neutral-200 hover:text-white flex items-center gap-0.5"
                        title="Add shape layer"
                      >
                        <Square className="w-3 h-3" />
                        <span>+</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onAddGraphicLayer('swissCross', 'Graphic')}
                        className="px-2 py-1 rounded-lg bg-[#1c1c1c] hover:bg-neutral-800 border border-neutral-700/80 text-[11px] font-semibold text-neutral-200 hover:text-white flex items-center gap-0.5"
                        title="Add graphic template"
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>+</span>
                      </button>
                    </div>
                  </div>

                  {/* Layer Stack Items */}
                  <div className="space-y-1">
                    {[...(activeScene?.layers || [])].reverse().map((layer) => {
                      const active = effectiveSelectedIds.includes(layer.id);
                      return (
                        <div
                          key={layer.id}
                          onClick={(e) => handleSelectLayerInList(layer.id, e)}
                          className={`px-2.5 py-2 rounded-xl border flex items-center justify-between cursor-pointer transition-colors ${
                            active
                              ? 'bg-[#159947]/20 border-[#22c55e]/70 text-white'
                              : 'bg-[#181818] border-neutral-800/80 text-neutral-300 hover:border-neutral-700'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            {layer.type === 'text' ? (
                              <Type className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                            ) : layer.type === 'shape' ? (
                              <Square className="w-3.5 h-3.5 text-[#4ade80] shrink-0" />
                            ) : layer.type === 'image' ? (
                              <ImageIcon className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                            ) : (
                              <Sparkles className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                            )}
                            <span className="text-xs font-medium truncate">{layer.name}</span>
                            {layer.groupId && (
                              <span className="px-1 py-0.2 rounded bg-neutral-800 border border-neutral-700 text-[9px] font-mono text-[#4ade80]">
                                G
                              </span>
                            )}
                          </div>
                          <div
                            className="flex items-center gap-1 shrink-0"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={() =>
                                onUpdateLayer(layer.id, { locked: !layer.locked })
                              }
                              className="p-1 text-neutral-500 hover:text-white"
                              title={layer.locked ? 'Unlock layer' : 'Lock layer'}
                            >
                              {layer.locked ? (
                                <Lock className="w-3 h-3 text-amber-400" />
                              ) : (
                                <Unlock className="w-3 h-3" />
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                onUpdateLayer(layer.id, {
                                  visible: layer.visible === false ? true : false,
                                })
                              }
                              className="p-1 text-neutral-500 hover:text-white"
                              title={layer.visible === false ? 'Show layer' : 'Hide layer'}
                            >
                              {layer.visible === false ? (
                                <EyeOff className="w-3 h-3 text-neutral-600" />
                              ) : (
                                <Eye className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Bottom 4-button Layer Action Bar (Screenshot 43) */}
                <div className="pt-2 border-t border-neutral-800/80 grid grid-cols-4 gap-1.5">
                  <button
                    type="button"
                    disabled={effectiveSelectedIds.length === 0}
                    onClick={() => {
                      if (effectiveSelectedIds.length > 1 && onDuplicateSelectedLayers) {
                        onDuplicateSelectedLayers(effectiveSelectedIds);
                      } else if (effectiveSelectedIds[0]) {
                        onDuplicateLayer?.(effectiveSelectedIds[0]);
                      }
                    }}
                    className="py-2 rounded-lg bg-[#1c1c1c] hover:bg-neutral-800 disabled:opacity-40 border border-neutral-800 flex items-center justify-center text-neutral-300 hover:text-white"
                    title="Duplicate layer(s)"
                    aria-label="Duplicate selected layer(s)"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={effectiveSelectedIds.length === 0}
                    onClick={() => {
                      if (onReorderZ) {
                        onReorderZ(effectiveSelectedIds, 'bringForward');
                      } else if (effectiveSelectedIds[0]) {
                        onMoveLayerOrder?.(effectiveSelectedIds[0], 'up');
                      }
                    }}
                    className="py-2 rounded-lg bg-[#1c1c1c] hover:bg-neutral-800 disabled:opacity-40 border border-neutral-800 flex items-center justify-center text-neutral-300 hover:text-white"
                    title="Move layer up"
                    aria-label="Move selected layer up"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={effectiveSelectedIds.length === 0}
                    onClick={() => {
                      if (onReorderZ) {
                        onReorderZ(effectiveSelectedIds, 'sendBackward');
                      } else if (effectiveSelectedIds[0]) {
                        onMoveLayerOrder?.(effectiveSelectedIds[0], 'down');
                      }
                    }}
                    className="py-2 rounded-lg bg-[#1c1c1c] hover:bg-neutral-800 disabled:opacity-40 border border-neutral-800 flex items-center justify-center text-neutral-300 hover:text-white"
                    title="Move layer down"
                    aria-label="Move selected layer down"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={effectiveSelectedIds.length === 0}
                    onClick={() => {
                      if (effectiveSelectedIds.length > 1 && onDeleteSelectedLayers) {
                        onDeleteSelectedLayers(effectiveSelectedIds);
                      } else if (effectiveSelectedIds[0]) {
                        onDeleteLayer?.(effectiveSelectedIds[0]);
                      }
                    }}
                    className="py-2 rounded-lg bg-[#1c1c1c] hover:bg-neutral-800 disabled:opacity-40 border border-neutral-800 flex items-center justify-center text-neutral-300 hover:text-red-400"
                    title="Delete layer(s)"
                    aria-label="Delete selected layer(s)"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Pinned Action Links (Hidden when collapsed to 48px icon rail) */}
      {!isCollapsed && (
        <div className="p-3 border-t border-neutral-800/80 bg-[#141414] space-y-2 shrink-0">
          <button
            type="button"
            onClick={onOpenTemplates}
            className="w-full py-2 px-3 rounded-xl bg-[#1c1c1c] hover:bg-neutral-800 border border-neutral-700/80 flex items-center justify-center gap-2 text-xs font-medium text-neutral-200 hover:text-white transition-colors"
          >
            <LayoutGrid className="w-3.5 h-3.5 text-neutral-400" />
            <span>Browse templates</span>
          </button>

          <div className="space-y-1.5 pt-0.5 text-xs">
            <button
              type="button"
              onClick={onOpenHelp}
              className="w-full text-left text-neutral-400 hover:text-white transition-colors py-0.5"
            >
              Help & shortcuts
            </button>

            <button
              type="button"
              onClick={onOpenMyProjects}
              className="w-full flex items-center gap-2 text-left text-neutral-300 hover:text-white transition-colors py-0.5 font-medium"
            >
              <FolderOpen className="w-3.5 h-3.5 text-neutral-400" />
              <span>My Projects</span>
            </button>

            {editorMode === 'advanced' && (
              <>
                <div className="text-[11px] text-neutral-500 pt-0.5">
                  {projectSavedStatus === 'New project' ? (
                    <button
                      type="button"
                      onClick={onNewProject}
                      className="text-neutral-400 hover:text-white transition-colors"
                    >
                      New project
                    </button>
                  ) : (
                    <span>{projectSavedStatus}</span>
                  )}
                </div>
                <div>
                  <button
                    type="button"
                    onClick={onSaveProject}
                    className="text-xs font-medium text-neutral-300 hover:text-white underline underline-offset-4 transition-colors"
                  >
                    {projectSavedStatus === 'New project' ? 'Save to My Projects' : 'Save now'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </aside>
  );
}
