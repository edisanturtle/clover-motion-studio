'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Search,
  Star,
  FolderOpen,
  X,
  ArrowUpRight,
  Check,
  ArrowLeft,
  CheckCircle2,
} from 'lucide-react';
import ModalDialog from '../common/ModalDialog';
import { BrandLogo } from '../common/BrandLogo';
import {
  STUDIO_TEMPLATES,
  TEMPLATE_CATEGORIES,
  PURPOSE_FILTERS,
} from '../../constants/templateCatalog';
import { POSTER_LAYOUT_BLUEPRINTS } from '../../constants/graphicAssets';
import { ASPECT_RATIOS } from '../../constants/fonts';
import { buildProjectFromTemplate } from '../../utils/projectBuilder';
import { renderSceneToCanvas } from '../../engine/canvasRenderer';
import LiveTemplatePreviewInspector from './LiveTemplatePreviewInspector';

function StaticTemplateCardThumb({ template }) {
  const canvasRef = useRef(null);
  const project = useMemo(() => buildProjectFromTemplate(template, '4:5'), [template]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !project.scenes[1]) return;
    const ctx = canvas.getContext('2d');
    renderSceneToCanvas({
      ctx,
      width: 1080,
      height: 1350,
      scene: project.scenes[1] || project.scenes[0],
      localTime: 1.2,
      audioSignals: { bass: 0.25, mid: 0.2, treble: 0.15, rms: 0.2 },
      selectedLayerId: null,
      showGrid: false,
      showSafeGuides: false,
    });
  }, [project]);

  return (
    <canvas
      ref={canvasRef}
      width={1080}
      height={1350}
      className="w-full h-full object-contain block"
    />
  );
}

function PosterLayoutVisualCard({ layout, isSelected, isFav, onToggleFav, onSelect }) {
  return (
    <div
      onClick={onSelect}
      className={`group rounded-2xl overflow-hidden border transition-all cursor-pointer flex flex-col bg-[#161616] ${
        isSelected
          ? 'border-white ring-1 ring-white shadow-[0_0_30px_rgba(255,255,255,0.08)]'
          : 'border-neutral-800/90 hover:border-neutral-600'
      }`}
    >
      {/* Visual Poster Artwork Stage (Screenshot 18) */}
      <div className="relative h-[250px] bg-[#0b0b0b] flex items-center justify-center p-3 overflow-hidden">
        {/* Top-left POSTER LAYOUTS badge */}
        <span className="absolute top-3 left-3 z-10 px-2.5 py-1 rounded-md bg-[#1a1a1a]/90 border border-white/15 text-[10px] font-mono uppercase tracking-wider text-neutral-200 backdrop-blur-sm">
          {layout.tag || 'POSTER LAYOUTS'}
        </span>

        {/* Top-right Favorite Star */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleFav(layout.id, e);
          }}
          className={`absolute top-3 right-3 z-10 w-8 h-8 rounded-full border flex items-center justify-center transition-colors backdrop-blur-sm ${
            isFav
              ? 'bg-amber-500/20 border-amber-400 text-amber-300'
              : 'bg-[#1a1a1a]/80 border-white/15 text-neutral-300 hover:text-white'
          }`}
        >
          <Star className={`w-3.5 h-3.5 ${isFav ? 'fill-amber-300' : ''}`} />
        </button>

        {/* Poster Sheet Preview */}
        <div
          className="h-full aspect-[4/5] shadow-xl relative overflow-hidden flex flex-col items-center justify-between p-5 text-center"
          style={{ backgroundColor: layout.bg || '#f3efe6', color: layout.ink || '#171717' }}
        >
          {/* Tilted geometric wireframe border inside poster (Screenshot 18) */}
          <div
            className="absolute inset-4 border-[6px] pointer-events-none opacity-65"
            style={{
              borderColor: layout.accent || '#e2a398',
              transform: 'rotate(-7deg) scale(0.92)',
            }}
          />
          <div
            className="absolute inset-6 border pointer-events-none opacity-45"
            style={{
              borderColor: layout.accent || '#e2a398',
              transform: 'rotate(5deg) scale(0.96)',
            }}
          />

          <div className="z-10 mt-6">
            <div className="text-lg font-extrabold tracking-tight uppercase leading-none">
              {layout.name}
            </div>
            <div className="text-[8px] font-mono uppercase tracking-wider mt-2 max-w-[140px] leading-snug opacity-85">
              {layout.desc}
            </div>
          </div>

          {/* Bottom decorative motif ✳ ▤ ✳ */}
          <div
            className="z-10 flex items-center gap-2 text-xs font-mono mb-1"
            style={{ color: layout.accent || '#e2a398' }}
          >
            <span>✳</span>
            <span className="w-3 h-2.5 border border-current inline-block" />
            <span>✳</span>
          </div>
        </div>
      </div>

      {/* Card Footer */}
      <div className="p-3.5 border-t border-neutral-800/80 bg-[#161616] flex items-center justify-between">
        <div>
          <div className="text-sm font-bold text-white">{layout.name}</div>
          <div className="text-xs text-neutral-400 mt-0.5 line-clamp-1">{layout.desc}</div>
        </div>
        <span className="text-xs font-mono text-neutral-500 shrink-0 ml-2">
          {layout.number}
        </span>
      </div>
    </div>
  );
}

export default function TemplateLibraryModal({
  open,
  onClose,
  initialMode = 'templates',
  activeTemplateId,
  onSelectTemplate,
  onApplyPosterLayout,
  onOpenMyProjects,
  audioEngineRef,
}) {
  const [libraryTab, setLibraryTab] = useState(initialMode); // 'templates' | 'posters'
  const [wizardStep, setWizardStep] = useState(1); // 1 = Choose, 2 = Personalize
  const [activeCategory, setActiveCategory] = useState('start_here');
  const [purposeFilter, setPurposeFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState('curated');
  const [searchQuery, setSearchQuery] = useState('');
  const [favorites, setFavorites] = useState(['tpl_shutter']);
  const [previewRatio, setPreviewRatio] = useState('1:1');

  useEffect(() => {
    if (open) {
      setLibraryTab(initialMode || 'templates');
      setWizardStep(1);
    }
  }, [open, initialMode]);

  const visibleTemplates = useMemo(
    () => STUDIO_TEMPLATES.filter((t) => !t.hiddenInCatalog),
    []
  );

  const [inspectedTemplate, setInspectedTemplate] = useState(
    () => visibleTemplates.find((t) => t.id === 'tpl_shutter') || visibleTemplates[0]
  );

  const [draftCopy, setDraftCopy] = useState(() => ({
    ...(visibleTemplates.find((t) => t.id === 'tpl_shutter')?.defaultText ||
      visibleTemplates[0].defaultText),
  }));

  useEffect(() => {
    if (inspectedTemplate?.defaultText) {
      setDraftCopy({ ...inspectedTemplate.defaultText });
    }
  }, [inspectedTemplate]);

  const templateWithDraft = useMemo(() => {
    if (!inspectedTemplate) return visibleTemplates[0];
    if (wizardStep === 1) return inspectedTemplate;
    return {
      ...inspectedTemplate,
      defaultText: {
        ...inspectedTemplate.defaultText,
        ...draftCopy,
      },
    };
  }, [inspectedTemplate, draftCopy, wizardStep, visibleTemplates]);

  const toggleFavorite = (id, e) => {
    e.stopPropagation();
    setFavorites((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const filteredTemplates = useMemo(() => {
    let list = visibleTemplates.filter((t) => {
      if (activeCategory === 'favorites' && !favorites.includes(t.id)) return false;
      if (activeCategory !== 'all' && activeCategory !== 'favorites') {
        const cats = t.categories || [t.category];
        if (!cats.includes(activeCategory)) return false;
      }
      if (purposeFilter !== 'all' && t.purpose !== purposeFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          t.name.toLowerCase().includes(q) ||
          t.purpose.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q)
        );
      }
      return true;
    });

    if (sortOrder === 'az') {
      list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortOrder === 'duration') {
      list = [...list].sort((a, b) => b.duration - a.duration);
    }
    return list;
  }, [visibleTemplates, activeCategory, favorites, purposeFilter, searchQuery, sortOrder]);

  const totalDuration = inspectedTemplate?.scenes?.reduce(
    (acc, s) => acc + s.duration,
    0
  );

  const handleUseFinalTemplate = () => {
    onSelectTemplate(templateWithDraft, previewRatio);
    setWizardStep(1);
    onClose();
  };

  return (
    <ModalDialog
      open={open}
      onClose={() => {
        setWizardStep(1);
        onClose();
      }}
      ariaLabel="Clover Motion Template Library"
      maxWidth="max-w-[1260px]"
    >
      <div className="flex flex-col h-[88vh] max-h-[860px] bg-[#141414] text-neutral-100 select-none">
        {/* Top Modal Header */}
        <div className="px-6 pt-5 pb-3.5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <BrandLogo />
            <div>
              <h2 className="text-base font-bold text-white leading-tight">
                {libraryTab === 'posters'
                  ? 'Poster layouts'
                  : wizardStep === 1
                  ? 'Template library'
                  : 'Personalize your design'}
              </h2>
              <p className="text-xs text-neutral-400">
                Type, shape and sound. Ready when you are.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => {
                onClose();
                if (onOpenMyProjects) onOpenMyProjects();
              }}
              className="flex items-center gap-2 text-xs text-neutral-200 hover:text-white underline underline-offset-4 transition-colors"
            >
              <FolderOpen className="w-3.5 h-3.5 text-neutral-400" />
              <span>My Projects</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setWizardStep(1);
                onClose();
              }}
              className="w-8 h-8 rounded-full bg-neutral-800/80 hover:bg-neutral-700 border border-neutral-700/80 flex items-center justify-center text-neutral-300 hover:text-white transition-colors"
              aria-label="Close Template Library"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Sub-header Bar: Left Tabs (Templates · 27 | Poster layouts) & Right 3-Step Indicator */}
        <div className="px-6 pb-3.5 border-b border-neutral-800/80 flex items-center justify-between shrink-0">
          <div className="flex items-center bg-[#1c1c1c] p-1 rounded-xl border border-neutral-800">
            <button
              type="button"
              onClick={() => {
                setLibraryTab('templates');
                setWizardStep(1);
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                libraryTab === 'templates'
                  ? 'bg-[#159947] text-white shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Templates · {visibleTemplates.length}
            </button>
            <button
              type="button"
              onClick={() => {
                setLibraryTab('posters');
                setWizardStep(1);
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                libraryTab === 'posters'
                  ? 'bg-[#159947] text-white shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Poster layouts
            </button>
          </div>

          {/* 3-Step Wizard Indicator: (1) Choose  (2) Personalize  (3) Preview & export */}
          <div className="hidden md:flex items-center gap-5 text-xs">
            <button
              type="button"
              onClick={() => setWizardStep(1)}
              className="flex items-center gap-2"
            >
              {wizardStep > 1 ? (
                <span className="w-5 h-5 rounded-full border border-[#22c55e]/60 text-[#4ade80] flex items-center justify-center">
                  <Check className="w-3 h-3" />
                </span>
              ) : (
                <span className="w-5 h-5 rounded-full bg-[#159947] text-white font-bold flex items-center justify-center text-[11px]">
                  1
                </span>
              )}
              <span
                className={
                  wizardStep === 1 ? 'text-white font-semibold' : 'text-neutral-400'
                }
              >
                Choose
              </span>
            </button>

            <button
              type="button"
              onClick={() => setWizardStep(2)}
              className="flex items-center gap-2"
            >
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${
                  wizardStep === 2
                    ? 'bg-[#159947] text-white'
                    : 'border border-neutral-700 text-neutral-500'
                }`}
              >
                2
              </span>
              <span
                className={
                  wizardStep === 2 ? 'text-white font-semibold' : 'text-neutral-500'
                }
              >
                Personalize
              </span>
            </button>

            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full border border-neutral-700 text-neutral-500 flex items-center justify-center text-[11px]">
                3
              </span>
              <span className="text-neutral-500">Preview & export</span>
            </div>
          </div>
        </div>

        {/* Main Body Split: Left Column + Right Live Preview Inspector */}
        <div className="flex-1 flex min-h-0 overflow-hidden">
          {wizardStep === 1 ? (
            /* =========================================================
               STEP 1: CHOOSE TEMPLATE OR POSTER LAYOUT
               ========================================================= */
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-5">
              {/* Hero Banner + Right Spotlight Callout */}
              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
                <div className="max-w-md">
                  <div className="text-[11px] font-mono uppercase tracking-[0.2em] text-neutral-400 mb-1.5">
                    THE MOTION LIBRARY
                  </div>
                  <h1 className="text-4xl font-extrabold text-white tracking-tight">
                    Make your next move.
                  </h1>
                  <p className="text-sm text-neutral-400 mt-2 leading-relaxed">
                    Complete designs with motion, sound and every size you need.
                  </p>
                </div>

                {/* Featured Callout Box */}
                <div
                  onClick={() => {
                    setLibraryTab('templates');
                    setActiveCategory('kinetic_type');
                  }}
                  className="w-full lg:w-72 p-4 rounded-2xl bg-[#1a1a1a] border border-neutral-800 hover:border-neutral-600 cursor-pointer transition-all shrink-0"
                >
                  <div className="text-[10px] font-mono uppercase tracking-widest text-neutral-400">
                    NEW / KINETIC TYPE
                  </div>
                  <div className="text-base font-bold text-white mt-1.5 leading-snug">
                    Letters in motion.
                    <br />
                    Four designs.
                  </div>
                  <div className="flex items-center justify-between text-xs text-neutral-300 mt-3 pt-2 border-t border-neutral-800/80">
                    <span>
                      {libraryTab === 'posters'
                        ? 'Explore kinetic type'
                        : 'Explore 4 designs'}
                    </span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>

              {/* Search Bar + All purposes + Curated order */}
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="relative flex-1 min-w-[240px]">
                  <Search className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search designs, styles or occasions"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#1a1a1a] border border-neutral-800 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-600"
                  />
                </div>

                <select
                  value={purposeFilter}
                  onChange={(e) => setPurposeFilter(e.target.value)}
                  className="px-3.5 py-2.5 rounded-xl bg-[#1a1a1a] border border-neutral-800 text-xs text-neutral-200 focus:outline-none focus:border-neutral-600"
                >
                  {PURPOSE_FILTERS.map((pf) => (
                    <option key={pf} value={pf}>
                      {pf === 'all' ? 'All purposes' : pf}
                    </option>
                  ))}
                </select>

                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                  className="px-3.5 py-2.5 rounded-xl bg-[#1a1a1a] border border-neutral-800 text-xs text-neutral-200 focus:outline-none focus:border-neutral-600"
                >
                  <option value="curated">Curated order</option>
                  <option value="az">Alphabetical (A–Z)</option>
                  <option value="duration">Duration</option>
                </select>
              </div>

              {/* Category Filter Pills */}
              <div className="flex items-center gap-2 flex-wrap">
                {TEMPLATE_CATEGORIES.map((cat) => {
                  const active = activeCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setActiveCategory(cat.id)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                        active
                          ? 'bg-[#159947] text-white border-[#22c55e] shadow-sm'
                          : 'bg-[#1a1a1a] text-neutral-300 border-neutral-800 hover:border-neutral-700 hover:text-white'
                      }`}
                    >
                      {cat.label}
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => setActiveCategory('favorites')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all border flex items-center gap-1.5 ${
                    activeCategory === 'favorites'
                      ? 'bg-[#159947] text-white border-[#22c55e] shadow-sm'
                      : 'bg-[#1a1a1a] text-neutral-300 border-neutral-800 hover:border-neutral-700 hover:text-white'
                  }`}
                >
                  <Star className="w-3.5 h-3.5" />
                  <span>Favorites</span>
                </button>
              </div>

              {/* Subtitle Count Line */}
              <div className="text-xs text-neutral-400">
                {libraryTab === 'templates' ? (
                  <>
                    {filteredTemplates.length} designs ·{' '}
                    {activeCategory === 'start_here'
                      ? 'A good place to start'
                      : activeCategory === 'kinetic_type'
                      ? 'Cutout, variable and circular type'
                      : activeCategory === 'graphic_systems'
                      ? 'Swiss grids, modular blocks and optical rhythms'
                      : activeCategory === 'expert_collection'
                      ? 'Multi-act 16-second compositions'
                      : activeCategory === 'studio_collection'
                      ? 'Signature generative light & sculptural motion'
                      : 'Complete studio collection'}
                  </>
                ) : (
                  <>{POSTER_LAYOUT_BLUEPRINTS.length} designs · Original editable compositions</>
                )}
              </div>

              {/* Grid of Template Cards or Poster Layouts (Screenshot 18) */}
              {libraryTab === 'templates' ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filteredTemplates.map((tpl) => {
                      const isInspected = inspectedTemplate?.id === tpl.id;
                      const isFav = favorites.includes(tpl.id);
                      const dur = tpl.scenes.reduce((a, b) => a + b.duration, 0);

                      return (
                        <div
                          key={tpl.id}
                          onClick={() => setInspectedTemplate(tpl)}
                          onDoubleClick={() => {
                            setInspectedTemplate(tpl);
                            setWizardStep(2);
                          }}
                          className={`group rounded-2xl overflow-hidden border transition-all cursor-pointer flex flex-col bg-[#161616] ${
                            isInspected
                              ? 'border-[#22c55e] ring-1 ring-[#22c55e] shadow-[0_0_30px_rgba(34,197,94,0.14)]'
                              : 'border-neutral-800/90 hover:border-neutral-600'
                          }`}
                        >
                          <div className="relative h-[250px] bg-[#0b0b0b] flex items-center justify-center p-3 overflow-hidden">
                            <span className="absolute top-3 left-3 z-10 px-2.5 py-1 rounded-md bg-[#1a1a1a]/90 border border-white/15 text-[10px] font-mono uppercase tracking-wider text-neutral-200 backdrop-blur-sm">
                              {tpl.badge}
                            </span>

                            <button
                              type="button"
                              onClick={(e) => toggleFavorite(tpl.id, e)}
                              className={`absolute top-3 right-3 z-10 w-8 h-8 rounded-full border flex items-center justify-center transition-colors backdrop-blur-sm ${
                                isFav
                                  ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                                  : 'bg-[#1a1a1a]/80 border-white/15 text-neutral-300 hover:text-white'
                              }`}
                            >
                              <Star className={`w-3.5 h-3.5 ${isFav ? 'fill-amber-300' : ''}`} />
                            </button>

                            <div className="h-full aspect-[4/5] shadow-xl overflow-hidden">
                              <StaticTemplateCardThumb template={tpl} />
                            </div>

                            <span
                              className={`absolute bottom-3 right-3 z-10 w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                                isInspected
                                  ? 'bg-[#159947] text-white shadow-md'
                                  : 'bg-[#1a1a1a]/90 border border-white/15 text-neutral-300 group-hover:text-white'
                              }`}
                            >
                              {isInspected ? (
                                <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                              ) : (
                                <ArrowUpRight className="w-3.5 h-3.5" />
                              )}
                            </span>
                          </div>

                          <div className="p-3.5 border-t border-neutral-800/80 bg-[#161616]">
                            <div className="text-sm font-bold text-white">{tpl.name}</div>
                            <div className="text-xs text-neutral-400 mt-0.5">{tpl.purpose}</div>
                            <div className="text-[11px] font-mono text-neutral-500 mt-2">
                              {dur} s · {tpl.scenes.length} scenes · 3 sizes
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <p className="text-xs text-neutral-500 pt-2">
                    Every design includes editable text, original sound and Feed, Square and Story
                    compositions.
                  </p>
                </>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {POSTER_LAYOUT_BLUEPRINTS.map((layout) => (
                    <PosterLayoutVisualCard
                      key={layout.id}
                      layout={layout}
                      isSelected={false}
                      isFav={favorites.includes(layout.id)}
                      onToggleFav={toggleFavorite}
                      onSelect={() => {
                        onApplyPosterLayout(layout);
                        onClose();
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* =========================================================
               STEP 2: PERSONALIZE YOUR DESIGN (Screenshots 6 & 7)
               ========================================================= */
            <div className="flex-1 overflow-y-auto custom-scrollbar p-8 max-w-2xl space-y-6">
              <div>
                <div className="text-[11px] font-mono uppercase tracking-[0.2em] text-neutral-400 mb-2">
                  MAKE IT YOURS / 02
                </div>
                <h1 className="text-4xl font-extrabold text-white tracking-tight leading-tight">
                  Your words.
                  <br />
                  Your design.
                </h1>
                <p className="text-sm text-neutral-400 mt-2">
                  Changes update every scene and size.
                </p>
              </div>

              <div className="space-y-5">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-white">
                      Display text (required)
                    </label>
                    <span className="text-xs font-mono text-neutral-400">
                      {(draftCopy.title || '').length} chars
                    </span>
                  </div>
                  <textarea
                    rows={3}
                    value={draftCopy.title || ''}
                    onChange={(e) =>
                      setDraftCopy((prev) => ({ ...prev, title: e.target.value }))
                    }
                    className="w-full px-4 py-3 rounded-xl bg-[#1c1c1c] border-2 border-white text-base font-semibold text-white focus:outline-none resize-y"
                  />
                  <p className="text-xs text-neutral-400 mt-1.5">
                    A short headline works best. Line breaks are welcome.
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-white">
                      Supporting headline
                    </label>
                    <span className="text-xs font-mono text-neutral-400">
                      {(draftCopy.subtitle || '').length} chars
                    </span>
                  </div>
                  <textarea
                    rows={3}
                    value={draftCopy.subtitle || ''}
                    onChange={(e) =>
                      setDraftCopy((prev) => ({ ...prev, subtitle: e.target.value }))
                    }
                    className="w-full px-4 py-3 rounded-xl bg-[#1c1c1c] border border-neutral-700/80 text-sm text-white focus:outline-none focus:border-white resize-y"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold text-white">Date & time</label>
                      <span className="text-xs font-mono text-neutral-400">
                        {(draftCopy.date || '').length} chars
                      </span>
                    </div>
                    <input
                      type="text"
                      value={draftCopy.date || ''}
                      onChange={(e) =>
                        setDraftCopy((prev) => ({ ...prev, date: e.target.value }))
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#1c1c1c] border border-neutral-700/80 text-xs text-white focus:outline-none focus:border-white"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold text-white">
                        Venue or website
                      </label>
                      <span className="text-xs font-mono text-neutral-400">
                        {(draftCopy.location || '').length} chars
                      </span>
                    </div>
                    <input
                      type="text"
                      value={draftCopy.location || ''}
                      onChange={(e) =>
                        setDraftCopy((prev) => ({ ...prev, location: e.target.value }))
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#1c1c1c] border border-neutral-700/80 text-xs text-white focus:outline-none focus:border-white"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-white">Call to action</label>
                    <span className="text-xs font-mono text-neutral-400">
                      {(draftCopy.cta || '').length} chars
                    </span>
                  </div>
                  <textarea
                    rows={2}
                    value={draftCopy.cta || ''}
                    onChange={(e) =>
                      setDraftCopy((prev) => ({ ...prev, cta: e.target.value }))
                    }
                    className="w-full px-4 py-2.5 rounded-xl bg-[#1c1c1c] border border-neutral-700/80 text-xs text-white focus:outline-none focus:border-white resize-y"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-white">
                      Brand or creator
                    </label>
                    <span className="text-xs font-mono text-neutral-400">
                      {(draftCopy.brand || '').length} chars
                    </span>
                  </div>
                  <input
                    type="text"
                    value={draftCopy.brand || ''}
                    onChange={(e) =>
                      setDraftCopy((prev) => ({ ...prev, brand: e.target.value }))
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#1c1c1c] border border-neutral-700/80 text-xs text-white focus:outline-none focus:border-white"
                  />
                </div>

                <div className="p-4 rounded-xl bg-[#1a1a1a] border border-neutral-800 flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-neutral-300 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-semibold text-white">
                      Text fits in all three sizes
                    </div>
                    <div className="text-xs text-neutral-400 mt-0.5">
                      Checks text size and overflow across every scene.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Right Pane: Live Template Preview Inspector */}
          {inspectedTemplate && (
            <div className="w-[380px] border-l border-neutral-800/80 p-5 overflow-y-auto custom-scrollbar shrink-0 bg-[#141414]">
              <LiveTemplatePreviewInspector
                template={templateWithDraft}
                previewRatio={previewRatio}
                setPreviewRatio={setPreviewRatio}
                audioEngineRef={audioEngineRef}
              />
            </div>
          )}
        </div>

        {/* Bottom Sticky Footer Bar */}
        <div className="px-6 py-3.5 border-t border-neutral-800/80 bg-[#141414] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 text-xs">
            <span className="font-bold text-white">
              {inspectedTemplate?.purpose || 'Product launch'}
            </span>
            <span className="font-mono text-neutral-400">
              {totalDuration} s · {inspectedTemplate?.scenes?.length || 3} scenes ·{' '}
              {Object.keys(ASPECT_RATIOS).length} sizes
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            {wizardStep === 1 ? (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-[#1e1e1e] hover:bg-neutral-800 border border-neutral-700 text-xs font-semibold text-neutral-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => setWizardStep(2)}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-[#159947] hover:bg-[#19b353] border border-[#22c55e]/35 text-white text-xs font-bold transition-colors shadow-[0_2px_12px_rgba(21,153,71,0.3)]"
                >
                  <ArrowUpRight className="w-4 h-4" />
                  <span>Personalize template</span>
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setWizardStep(1)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#1e1e1e] hover:bg-neutral-800 border border-neutral-700 text-xs font-semibold text-neutral-200 transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back</span>
                </button>
                <button
                  type="button"
                  onClick={handleUseFinalTemplate}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-[#159947] hover:bg-[#19b353] border border-[#22c55e]/35 text-white text-xs font-bold transition-colors shadow-[0_2px_12px_rgba(21,153,71,0.3)]"
                >
                  <ArrowUpRight className="w-4 h-4" />
                  <span>Use template</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </ModalDialog>
  );
}
