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
} from 'lucide-react';
import { FONT_OPTIONS } from '../../constants/fonts';
import { COLOR_PALETTES, MOTION_PRESETS } from '../../constants/motionPresets';
import { GRAPHIC_TEMPLATES } from '../../constants/graphicAssets';
import {
  ANIMOS_CATEGORIES,
  ANIMOS_SHOWCASE_TEMPLATES,
  ANIMOS_BG_GRADIENTS,
} from '../../constants/animosTemplates';
import {
  EFFECTCRAFT_FX_RACK,
  EFFECTCRAFT_SHADER_BACKGROUNDS,
} from '../../constants/effectCraftEffects';
import { formatTimecode } from '../../utils/timecode';

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
  leftDrawerOpen = true,
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
  onAddGraphicLayer,
  onApplyGraphicTemplate,
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
  const [animosCategory, setAnimosCategory] = useState('all');
  const imageUploadRef = useRef(null);
  const mediaSlotUploadRef = useRef(null);

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
  const isCollapsedInAdvanced = editorMode === 'advanced' && !leftDrawerOpen;

  return (
    <aside
      className={`${
        isCollapsedInAdvanced ? 'w-12' : editorMode === 'quick' ? 'w-[348px]' : 'w-[288px]'
      } bg-[#141414] border-r border-neutral-800/80 flex flex-col shrink-0 select-none h-full overflow-hidden transition-[width] duration-150`}
    >
      {/* Upper Split: Left Icon Rail + Right Inspector Content */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Vertical Left Icon Rail */}
        <div
          className={`${
            editorMode === 'quick' ? 'w-[66px]' : 'w-12'
          } bg-[#111111] border-r border-neutral-800/80 flex flex-col items-center py-2.5 gap-1.5 shrink-0`}
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = currentTab === item.id && !isCollapsedInAdvanced;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelectTab(item.id)}
                title={item.label}
                className={`${
                  editorMode === 'quick'
                    ? 'w-14 py-2 flex flex-col items-center gap-1 rounded-xl'
                    : 'w-9 h-9 flex items-center justify-center rounded-xl'
                } transition-colors ${
                  active
                    ? 'bg-[#159947]/20 text-[#4ade80] border border-[#22c55e]/60 shadow-sm'
                    : 'text-neutral-500 hover:text-neutral-200 hover:bg-neutral-900'
                }`}
              >
                <Icon className="w-4 h-4" />
                {editorMode === 'quick' && (
                  <span className="text-[10px] font-medium leading-none">{item.label}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Tab Content Area (Hidden when collapsed in Advanced mode — Screenshot 44) */}
        {!isCollapsedInAdvanced && (
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
            {currentTab === 'showcase' && (
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between">
                    <div className="text-[10px] font-mono uppercase tracking-widest text-[#4ade80]">
                      ANIMOS 3D SHOWCASE ENGINE
                    </div>
                    <span className="px-1.5 py-0.5 rounded bg-[#159947]/20 border border-[#22c55e]/40 text-[10px] font-mono text-[#4ade80]">
                      {(project.showcase?.templateId && project.showcase.templateId !== 'none')
                        ? 'ACTIVE'
                        : 'OFF'}
                    </span>
                  </div>
                  <h2 className="text-sm font-bold text-white mt-0.5">3D & Perspective Cards</h2>
                  <p className="text-[11px] text-neutral-400 mt-0.5 leading-relaxed">
                    Add interactive 3D rings, globes, spirals, tunnels & isometric card decks behind or around your typography.
                  </p>
                </div>

                {/* Media Slots Uploader Bar (Matching Animos Editor "Media · N slots") */}
                <div className="p-2.5 rounded-xl bg-[#1a1a1a] border border-neutral-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-white">
                      Media · {project.showcase?.slots || 8} slots
                    </span>
                    <div className="flex items-center gap-1.5">
                      {(project.mediaSlots?.length || 0) > 0 && (
                        <button
                          type="button"
                          onClick={onClearMediaSlots}
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
                        onUploadMediaSlots(files);
                      }
                      e.target.value = '';
                    }}
                    className="hidden"
                  />
                  <div className="text-[10px] text-neutral-400">
                    {(project.mediaSlots?.length || 0) > 0
                      ? `${project.mediaSlots.length} custom image(s) loaded into 3D cards`
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
                    onClick={() => onUpdateShowcase?.({ templateId: 'none' })}
                    className={`w-full px-3 py-2 rounded-xl border text-left flex items-center justify-between transition-all ${
                      !project.showcase?.templateId || project.showcase.templateId === 'none'
                        ? 'bg-[#1f1f1f] border-white text-white'
                        : 'bg-[#181818] border-neutral-800/90 text-neutral-400 hover:text-white'
                    }`}
                  >
                    <span className="text-xs font-semibold">None · Typography & Vector Only</span>
                    {(!project.showcase?.templateId || project.showcase.templateId === 'none') && (
                      <Check className="w-3.5 h-3.5 text-[#22c55e]" />
                    )}
                  </button>

                  {ANIMOS_SHOWCASE_TEMPLATES.filter(
                    (tpl) => animosCategory === 'all' || tpl.category === animosCategory
                  ).map((tpl) => {
                    const isSelected = project.showcase?.templateId === tpl.id;
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
                          })
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
                              {tpl.badge}
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-neutral-900 text-[9px] font-mono text-neutral-400">
                              {tpl.slots} slots
                            </span>
                          </div>
                        </div>
                        <div className="text-[11px] text-neutral-400 mt-0.5 line-clamp-1">
                          {tpl.description}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Animos 3D Controls (shown when a showcase template is active) */}
                {project.showcase?.templateId && project.showcase.templateId !== 'none' && (
                  <div className="space-y-3 pt-3 border-t border-neutral-800">
                    <div className="text-[10px] font-mono uppercase tracking-widest text-neutral-400">
                      SHOWCASE GEOMETRY & CAMERA
                    </div>

                    <div>
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="text-neutral-300">Card Size</span>
                        <span className="font-mono text-neutral-400">
                          {project.showcase.cardSize ?? 24}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min={10}
                        max={52}
                        value={project.showcase.cardSize ?? 24}
                        onChange={(e) =>
                          onUpdateShowcase?.({ cardSize: Number(e.target.value) })
                        }
                        className="w-full accent-[#16a34a]"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] text-neutral-400 mb-1">
                          Card Aspect
                        </label>
                        <select
                          value={project.showcase.cardAspect || '1:1'}
                          onChange={(e) =>
                            onUpdateShowcase?.({ cardAspect: e.target.value })
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
                          value={project.showcase.bgGradient || 'none'}
                          onChange={(e) =>
                            onUpdateShowcase?.({ bgGradient: e.target.value })
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

                    <div>
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="text-neutral-300">Camera Tilt</span>
                        <span className="font-mono text-neutral-400">
                          {project.showcase.tilt ?? -18}°
                        </span>
                      </div>
                      <input
                        type="range"
                        min={-60}
                        max={60}
                        value={project.showcase.tilt ?? -18}
                        onChange={(e) =>
                          onUpdateShowcase?.({ tilt: Number(e.target.value) })
                        }
                        className="w-full accent-[#16a34a]"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="text-neutral-300">Depth Fade</span>
                        <span className="font-mono text-neutral-400">
                          {project.showcase.backFade ?? 55}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={90}
                        value={project.showcase.backFade ?? 55}
                        onChange={(e) =>
                          onUpdateShowcase?.({ backFade: Number(e.target.value) })
                        }
                        className="w-full accent-[#16a34a]"
                      />
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-xs text-neutral-300">Audio Reactive Pulse</span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={project.showcase.audioReactive !== false}
                        onClick={() =>
                          onUpdateShowcase?.({
                            audioReactive: project.showcase.audioReactive === false,
                          })
                        }
                        className={`w-9 h-5 rounded-full transition-colors p-0.5 ${
                          project.showcase.audioReactive !== false
                            ? 'bg-[#159947]'
                            : 'bg-neutral-700'
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded-full bg-white transition-transform ${
                            project.showcase.audioReactive !== false
                              ? 'translate-x-4'
                              : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* =========================================================
                TAB: FX RACK & SHADERS (EFFECTCRAFT ENGINE)
               ========================================================= */}
            {currentTab === 'fx' && (
              <div className="space-y-4">
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-widest text-[#4ade80]">
                    EFFECTCRAFT POST-FX & SHADERS
                  </div>
                  <h2 className="text-sm font-bold text-white mt-0.5">Shaders & FX Rack</h2>
                  <p className="text-[11px] text-neutral-400 mt-0.5 leading-relaxed">
                    Layer generative shader backgrounds and real-time post-processing effects synced to audio.
                  </p>
                </div>

                {/* Procedural Shader Backgrounds */}
                <div className="space-y-2 pb-3 border-b border-neutral-800">
                  <div className="text-xs font-semibold text-white">
                    Procedural Shader Background
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {EFFECTCRAFT_SHADER_BACKGROUNDS.map((sh) => {
                      const active = (project.shaderBg || 'none') === sh.id;
                      return (
                        <button
                          key={sh.id}
                          type="button"
                          onClick={() => onUpdateShaderBg?.(sh.id)}
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
                        Object.values(project.fxRack || {}).filter((fx) => fx?.enabled)
                          .length
                      }{' '}
                      active
                    </span>
                  </div>

                  <div className="space-y-2">
                    {EFFECTCRAFT_FX_RACK.map((fxDef) => {
                      const state = project.fxRack?.[fxDef.id] || {
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
                              onClick={() => onToggleFxRack?.(fxDef.id)}
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
                                    {state.intensity ?? fxDef.defaultIntensity}%
                                  </span>
                                </div>
                                <input
                                  type="range"
                                  min={0}
                                  max={100}
                                  value={state.intensity ?? fxDef.defaultIntensity}
                                  onChange={(e) =>
                                    onUpdateFxParam?.(fxDef.id, {
                                      intensity: Number(e.target.value),
                                    })
                                  }
                                  className="w-full accent-[#16a34a]"
                                />
                              </div>

                              <div>
                                <div className="flex justify-between text-[10px] text-neutral-300 mb-0.5">
                                  <span>{fxDef.secondaryLabel}</span>
                                  <span className="font-mono">
                                    {state.secondary ?? fxDef.defaultSecondary}
                                  </span>
                                </div>
                                <input
                                  type="range"
                                  min={fxDef.secondaryMin}
                                  max={fxDef.secondaryMax}
                                  value={state.secondary ?? fxDef.defaultSecondary}
                                  onChange={(e) =>
                                    onUpdateFxParam?.(fxDef.id, {
                                      secondary: Number(e.target.value),
                                    })
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
                                    })
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
            )}

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

                <div className="space-y-2">
                  {COLOR_PALETTES.map((pal) => (
                    <button
                      key={pal.id}
                      type="button"
                      onClick={() => onApplyPalette(pal.colors)}
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
                          value={activeScene.duration || 4}
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
                      </select>
                    </div>

                    <p className="text-[11px] text-neutral-500 leading-relaxed">
                      Share text and motion. Colors belong to each scene.
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
                ADVANCED MODE: TAB 3 — GRAPHICS (Screenshots 36 & 37)
               ========================================================= */}
            {editorMode === 'advanced' && currentTab === 'graphics' && (
              <div className="space-y-3.5">
                <p className="text-xs text-neutral-300 leading-relaxed">
                  Choose a graphic template. Type templates also arrange the text.
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
                        {selectedLayerId ? '1 selected' : '0 selected'}
                      </span>
                      {selectedLayerId && (
                        <button
                          type="button"
                          onClick={() => setSelectedLayerId(null)}
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
                        onClick={() => onAddGraphicLayer('swissCross', 'Graphic')}
                        className="px-2 py-1 rounded-lg bg-[#1c1c1c] hover:bg-neutral-800 border border-neutral-700/80 text-[11px] font-semibold text-neutral-200 hover:text-white flex items-center gap-0.5"
                        title="Add graphic layer"
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>+</span>
                      </button>
                    </div>
                  </div>

                  {/* Layer Stack Items */}
                  <div className="space-y-1">
                    {[...(activeScene?.layers || [])].reverse().map((layer) => {
                      const active = layer.id === selectedLayerId;
                      return (
                        <div
                          key={layer.id}
                          onClick={() => setSelectedLayerId(layer.id)}
                          className={`px-2.5 py-2 rounded-xl border flex items-center justify-between cursor-pointer transition-colors ${
                            active
                              ? 'bg-[#159947]/20 border-[#22c55e]/70 text-white'
                              : 'bg-[#181818] border-neutral-800/80 text-neutral-300 hover:border-neutral-700'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            {layer.type === 'text' ? (
                              <Type className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                            ) : (
                              <Sparkles className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                            )}
                            <span className="text-xs font-medium truncate">{layer.name}</span>
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
                    disabled={!selectedLayerId}
                    onClick={() => selectedLayerId && onDuplicateLayer?.(selectedLayerId)}
                    className="py-2 rounded-lg bg-[#1c1c1c] hover:bg-neutral-800 disabled:opacity-40 border border-neutral-800 flex items-center justify-center text-neutral-300 hover:text-white"
                    title="Duplicate layer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={!selectedLayerId}
                    onClick={() => selectedLayerId && onMoveLayerOrder?.(selectedLayerId, 'up')}
                    className="py-2 rounded-lg bg-[#1c1c1c] hover:bg-neutral-800 disabled:opacity-40 border border-neutral-800 flex items-center justify-center text-neutral-300 hover:text-white"
                    title="Move layer up"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={!selectedLayerId}
                    onClick={() => selectedLayerId && onMoveLayerOrder?.(selectedLayerId, 'down')}
                    className="py-2 rounded-lg bg-[#1c1c1c] hover:bg-neutral-800 disabled:opacity-40 border border-neutral-800 flex items-center justify-center text-neutral-300 hover:text-white"
                    title="Move layer down"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={!selectedLayerId}
                    onClick={() => selectedLayerId && onDeleteLayer?.(selectedLayerId)}
                    className="py-2 rounded-lg bg-[#1c1c1c] hover:bg-neutral-800 disabled:opacity-40 border border-neutral-800 flex items-center justify-center text-neutral-300 hover:text-red-400"
                    title="Delete layer"
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
      {!isCollapsedInAdvanced && (
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
