'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  RotateCw,
  X,
  Plus,
  Upload,
  Save,
  ArrowUpRight,
  Trash2,
} from 'lucide-react';
import ModalDialog from '../common/ModalDialog';
import { ASPECT_RATIOS, FONT_OPTIONS } from '../../constants/fonts';
import { renderSceneToCanvas } from '../../engine/canvasRenderer';

const DEFAULT_KITS = [
  {
    id: 'kit_clover',
    name: 'CLOVER MOTION · Signature Brand',
    primary: '#22c55e',
    secondary: '#159947',
    ink: '#f5f5f5',
    paper: '#0b1911',
    headingFont: "'Space Grotesk', sans-serif",
    headingWeight: 900,
    bodyFont: "'JetBrains Mono', monospace",
    bodyWeight: 500,
  },
  {
    id: 'kit_default',
    name: 'MEET YOUR NEXT · Product launch brand',
    primary: '#f6eddb',
    secondary: '#a9baf0',
    ink: '#f6eddb',
    paper: '#141e37',
    headingFont: "'Space Grotesk', sans-serif",
    headingWeight: 900,
    bodyFont: "'JetBrains Mono', monospace",
    bodyWeight: 500,
  },
  {
    id: 'kit_swiss',
    name: 'SWISS ARCHIVE · Editorial Grid',
    primary: '#ff4d2d',
    secondary: '#16a34a',
    ink: '#111111',
    paper: '#f4f1ea',
    headingFont: "'Syne', sans-serif",
    headingWeight: 800,
    bodyFont: "'JetBrains Mono', monospace",
    bodyWeight: 500,
  },
];

export default function BrandKitsModal({
  open,
  onClose,
  project,
  activeScene,
  onApplyBrandKit,
  onUploadCustomFont,
}) {
  const [kits, setKits] = useState(DEFAULT_KITS);
  const [selectedKitId, setSelectedKitId] = useState('kit_default');
  const [showTrash, setShowTrash] = useState(false);

  const [kitName, setKitName] = useState('MEET YOUR NEXT · Product launch bra');
  const [primaryColor, setPrimaryColor] = useState('#f6eddb');
  const [secondaryColor, setSecondaryColor] = useState('#a9baf0');
  const [inkColor, setInkColor] = useState('#f6eddb');
  const [paperColor, setPaperColor] = useState('#141e37');
  const [headingFont, setHeadingFont] = useState("'Space Grotesk', sans-serif");
  const [headingWeight, setHeadingWeight] = useState(900);
  const [bodyFont, setBodyFont] = useState("'JetBrains Mono', monospace");
  const [bodyWeight, setBodyWeight] = useState(500);

  const [targetScope, setTargetScope] = useState('scene'); // 'scene' | 'project'
  const [applyTypefaces, setApplyTypefaces] = useState(true);
  const [applyTextColors, setApplyTextColors] = useState(true);
  const [applyGraphicPalette, setApplyGraphicPalette] = useState(true);
  const [applyPaperColor, setApplyPaperColor] = useState(true);

  const previewCanvasRef = useRef(null);
  const fontInputRef = useRef(null);
  const logoInputRef = useRef(null);

  const dim = ASPECT_RATIOS[project?.ratio] || ASPECT_RATIOS['4:5'];

  // Capture current scene colors when modal opens
  useEffect(() => {
    if (open && activeScene) {
      setKitName(`${project?.name || 'Studio'} brand`);
      setPaperColor(activeScene.bg || '#141e37');
      const pal = activeScene.palette || project?.palette || [];
      if (pal[1]) setInkColor(pal[1]);
      if (pal[1]) setPrimaryColor(pal[1]);
      if (pal[2]) setSecondaryColor(pal[2]);
    }
  }, [open, activeScene, project?.name, project?.palette]);

  // Live preview of the kit on the right canvas
  useEffect(() => {
    const canvas = previewCanvasRef.current;
    if (!canvas || !activeScene || !open) return;
    const ctx = canvas.getContext('2d');

    const previewScene = {
      ...activeScene,
      bg: applyPaperColor ? paperColor : activeScene.bg,
      palette: applyGraphicPalette
        ? [paperColor, inkColor, secondaryColor, primaryColor, secondaryColor, primaryColor]
        : activeScene.palette,
      layers: (activeScene.layers || []).map((l) => {
        if (l.type === 'text') {
          const isHeading = l.role === 'title' || (l.fontSize || 0) >= 60;
          return {
            ...l,
            color: applyTextColors ? inkColor : l.color,
            fontFamily: applyTypefaces
              ? isHeading
                ? headingFont
                : bodyFont
              : l.fontFamily,
            fontWeight: applyTypefaces
              ? isHeading
                ? Number(headingWeight)
                : Number(bodyWeight)
              : l.fontWeight,
          };
        }
        return {
          ...l,
          color: applyGraphicPalette ? secondaryColor : l.color,
        };
      }),
    };

    renderSceneToCanvas({
      ctx,
      width: dim.width,
      height: dim.height,
      scene: previewScene,
      localTime: 1.0,
      audioSignals: { bass: 0.2, mid: 0.2, treble: 0.15, rms: 0.2 },
      selectedLayerId: null,
      showGrid: false,
      showSafeGuides: false,
    });
  }, [
    open,
    activeScene,
    dim.width,
    dim.height,
    primaryColor,
    secondaryColor,
    inkColor,
    paperColor,
    headingFont,
    headingWeight,
    bodyFont,
    bodyWeight,
    applyTypefaces,
    applyTextColors,
    applyGraphicPalette,
    applyPaperColor,
  ]);

  const handleCaptureScene = () => {
    if (!activeScene) return;
    const pal = activeScene.palette || project?.palette || [];
    setPaperColor(activeScene.bg || '#141e37');
    setInkColor(pal[1] || '#f6eddb');
    setPrimaryColor(pal[1] || '#f6eddb');
    setSecondaryColor(pal[2] || '#a9baf0');
  };

  const handleSaveKit = () => {
    const newKit = {
      id: `kit_${Date.now()}`,
      name: kitName || 'Untitled Brand Kit',
      primary: primaryColor,
      secondary: secondaryColor,
      ink: inkColor,
      paper: paperColor,
      headingFont,
      headingWeight,
      bodyFont,
      bodyWeight,
    };
    setKits((prev) => [newKit, ...prev]);
    setSelectedKitId(newKit.id);
  };

  const handleApplyToScene = () => {
    onApplyBrandKit?.({
      primaryColor,
      secondaryColor,
      inkColor,
      paperColor,
      headingFont,
      headingWeight: Number(headingWeight),
      bodyFont,
      bodyWeight: Number(bodyWeight),
      targetScope,
      applyTypefaces,
      applyTextColors,
      applyGraphicPalette,
      applyPaperColor,
    });
    onClose();
  };

  return (
    <ModalDialog
      open={open}
      onClose={onClose}
      ariaLabel="Brand kits"
      maxWidth="max-w-5xl"
    >
      <div className="flex flex-col max-h-[88vh] bg-[#141414] text-neutral-100 select-none overflow-hidden">
        {/* Modal Header (Screenshot 41) */}
        <div className="px-6 pt-5 pb-4 border-b border-neutral-800/80 flex items-start justify-between gap-4 shrink-0">
          <div>
            <h2 className="text-xl font-bold text-white">Brand kits</h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              Keep type, color and a logo ready for your next composition.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCaptureScene}
              className="p-2 rounded-xl bg-[#1e1e1e] hover:bg-neutral-800 border border-neutral-700 text-neutral-300 hover:text-white transition-colors"
              title="Refresh from current scene"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-neutral-800/80 hover:bg-neutral-700 flex items-center justify-center text-neutral-400 hover:text-white transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 3-Column Modal Body (Screenshot 41) */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 grid grid-cols-1 md:grid-cols-12 gap-5 min-h-0">
          {/* Column 1: Your kits (3 cols) */}
          <div className="md:col-span-3 space-y-3 border-r border-neutral-800/70 pr-4">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-white">Your kits</span>
              <button
                type="button"
                onClick={() => setShowTrash((v) => !v)}
                className="text-neutral-400 hover:text-white underline underline-offset-4"
              >
                {showTrash ? 'Active kits' : 'Trash'}
              </button>
            </div>

            <button
              type="button"
              onClick={handleCaptureScene}
              className="w-full py-2.5 px-3 rounded-xl bg-[#202020] hover:bg-neutral-800 border border-neutral-700/80 flex items-center justify-center gap-2 text-xs font-semibold text-white transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Capture this scene</span>
            </button>

            <div className="space-y-2 pt-1">
              {kits.map((kit) => {
                const active = kit.id === selectedKitId;
                return (
                  <button
                    key={kit.id}
                    type="button"
                    onClick={() => {
                      setSelectedKitId(kit.id);
                      setKitName(kit.name);
                      setPrimaryColor(kit.primary);
                      setSecondaryColor(kit.secondary);
                      setInkColor(kit.ink);
                      setPaperColor(kit.paper);
                      setHeadingFont(kit.headingFont);
                      setHeadingWeight(kit.headingWeight);
                      setBodyFont(kit.bodyFont);
                      setBodyWeight(kit.bodyWeight);
                    }}
                    className={`w-full p-2.5 rounded-xl border text-left transition-all ${
                      active
                        ? 'bg-[#222222] border-white text-white'
                        : 'bg-[#181818] border-neutral-800 text-neutral-300 hover:border-neutral-700'
                    }`}
                  >
                    <div className="text-xs font-semibold truncate">{kit.name}</div>
                    <div className="flex items-center gap-1 mt-2">
                      {[kit.paper, kit.ink, kit.primary, kit.secondary].map((hex, i) => (
                        <span
                          key={i}
                          className="w-4 h-4 rounded border border-white/20"
                          style={{ backgroundColor: hex }}
                        />
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Column 2: Kit Name, Colors, Type & Logo (5 cols) */}
          <div className="md:col-span-5 space-y-5 pr-2">
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                Kit name
              </label>
              <input
                type="text"
                value={kitName}
                onChange={(e) => setKitName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#1e1e1e] border border-neutral-700/80 text-xs font-medium text-white focus:outline-none focus:border-white"
              />
            </div>

            {/* 2×2 Colors Grid */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-white">Colors</div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Primary', val: primaryColor, set: setPrimaryColor },
                  { label: 'Secondary', val: secondaryColor, set: setSecondaryColor },
                  { label: 'Ink', val: inkColor, set: setInkColor },
                  { label: 'Paper', val: paperColor, set: setPaperColor },
                ].map((c) => (
                  <div key={c.label}>
                    <label className="block text-[11px] text-neutral-400 mb-1">
                      {c.label}
                    </label>
                    <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-[#1e1e1e] border border-neutral-700/80">
                      <input
                        type="color"
                        value={c.val || '#ffffff'}
                        onChange={(e) => c.set(e.target.value)}
                        className="w-5 h-5 rounded cursor-pointer bg-transparent border-0 shrink-0"
                      />
                      <input
                        type="text"
                        value={c.val || ''}
                        onChange={(e) => c.set(e.target.value)}
                        className="w-full bg-transparent text-xs font-mono text-white focus:outline-none"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Type Section */}
            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white">Type</span>
                <button
                  type="button"
                  onClick={() => fontInputRef.current?.click()}
                  className="flex items-center gap-1 text-xs text-neutral-300 hover:text-white underline underline-offset-4"
                >
                  <Upload className="w-3 h-3" />
                  <span>Import font</span>
                </button>
                <input
                  ref={fontInputRef}
                  type="file"
                  accept=".ttf,.otf,.woff,.woff2"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file && onUploadCustomFont) onUploadCustomFont(file);
                    e.target.value = '';
                  }}
                  className="hidden"
                />
              </div>

              <div>
                <label className="block text-[11px] text-neutral-400 mb-1">Heading</label>
                <div className="grid grid-cols-3 gap-2">
                  <select
                    value={headingFont}
                    onChange={(e) => setHeadingFont(e.target.value)}
                    className="col-span-2 px-2.5 py-2 rounded-xl bg-[#1e1e1e] border border-neutral-700/80 text-xs text-white focus:outline-none"
                  >
                    {FONT_OPTIONS.map((f) => (
                      <option key={f.id} value={f.family}>
                        {f.category} · {f.name}
                      </option>
                    ))}
                  </select>
                  <select
                    value={headingWeight}
                    onChange={(e) => setHeadingWeight(Number(e.target.value) || 700)}
                    className="px-2.5 py-2 rounded-xl bg-[#1e1e1e] border border-neutral-700/80 text-xs font-mono text-white focus:outline-none"
                  >
                    <option value={700}>700</option>
                    <option value={800}>800</option>
                    <option value={900}>900</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-neutral-400 mb-1">Body</label>
                <div className="grid grid-cols-3 gap-2">
                  <select
                    value={bodyFont}
                    onChange={(e) => setBodyFont(e.target.value)}
                    className="col-span-2 px-2.5 py-2 rounded-xl bg-[#1e1e1e] border border-neutral-700/80 text-xs text-white focus:outline-none"
                  >
                    {FONT_OPTIONS.map((f) => (
                      <option key={f.id} value={f.family}>
                        {f.category} · {f.name}
                      </option>
                    ))}
                  </select>
                  <select
                    value={bodyWeight}
                    onChange={(e) => setBodyWeight(Number(e.target.value) || 400)}
                    className="px-2.5 py-2 rounded-xl bg-[#1e1e1e] border border-neutral-700/80 text-xs font-mono text-white focus:outline-none"
                  >
                    <option value={400}>400</option>
                    <option value={500}>500</option>
                    <option value={600}>600</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Logo Section */}
            <div className="pt-2 border-t border-neutral-800/80 flex items-center justify-between">
              <span className="text-xs font-bold text-white">Logo</span>
              <button
                type="button"
                onClick={() => logoInputRef.current?.click()}
                className="flex items-center gap-1 text-xs text-neutral-300 hover:text-white underline underline-offset-4"
              >
                <Upload className="w-3 h-3" />
                <span>Import</span>
              </button>
              <input
                ref={logoInputRef}
                type="file"
                accept=".svg,.png,.webp"
                className="hidden"
              />
            </div>
          </div>

          {/* Column 3: On your canvas live preview (4 cols) */}
          <div className="md:col-span-4 space-y-3 border-l border-neutral-800/70 pl-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-white">On your canvas</span>
                <span className="font-mono text-[11px] text-neutral-400">Paused frame</span>
              </div>

              <div className="h-56 rounded-2xl bg-[#0b0b0b] border border-neutral-800 p-3 flex items-center justify-center overflow-hidden">
                <canvas
                  ref={previewCanvasRef}
                  width={dim.width}
                  height={dim.height}
                  className="max-h-full max-w-full object-contain shadow-xl rounded"
                />
              </div>

              <select
                value={targetScope}
                onChange={(e) => setTargetScope(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#1e1e1e] border border-neutral-700/80 text-xs text-white focus:outline-none"
              >
                <option value="scene">Current scene</option>
                <option value="project">All scenes in project</option>
              </select>

              <div className="grid grid-cols-2 gap-2.5 pt-1 text-xs">
                <label className="flex items-center gap-2 text-neutral-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={applyTypefaces}
                    onChange={(e) => setApplyTypefaces(e.target.checked)}
                    className="w-4 h-4 rounded accent-white"
                  />
                  <span>Typefaces & weights</span>
                </label>

                <label className="flex items-center gap-2 text-neutral-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={applyTextColors}
                    onChange={(e) => setApplyTextColors(e.target.checked)}
                    className="w-4 h-4 rounded accent-white"
                  />
                  <span>Text & outline color</span>
                </label>

                <label className="flex items-center gap-2 text-neutral-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={applyGraphicPalette}
                    onChange={(e) => setApplyGraphicPalette(e.target.checked)}
                    className="w-4 h-4 rounded accent-white"
                  />
                  <span>Graphic palette</span>
                </label>

                <label className="flex items-center gap-2 text-neutral-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={applyPaperColor}
                    onChange={(e) => setApplyPaperColor(e.target.checked)}
                    className="w-4 h-4 rounded accent-white"
                  />
                  <span>Paper & frame color</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer (Screenshot 41) */}
        <div className="px-6 py-4 border-t border-neutral-800/80 bg-[#141414] flex items-center justify-between shrink-0">
          <span className="text-xs font-mono text-neutral-400">
            Kit draft · Private to your account
          </span>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleSaveKit}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1e1e1e] hover:bg-neutral-800 border border-neutral-700 text-xs font-semibold text-white transition-colors"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save kit</span>
            </button>

            <button
              type="button"
              onClick={handleApplyToScene}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-[#159947] hover:bg-[#19b353] border border-[#22c55e]/35 text-white text-xs font-bold transition-colors shadow-[0_2px_12px_rgba(21,153,71,0.3)]"
            >
              <span>Apply to scene</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </ModalDialog>
  );
}
