'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  LayoutGrid,
  Save,
  MoreHorizontal,
  Undo2,
  Redo2,
  Maximize2,
  Columns,
  Download,
  ChevronRight,
  RotateCcw,
  Upload,
  CheckCircle2,
  X,
  PanelLeft,
  PanelRight,
  Palette,
  Film,
  Copy,
  FilePlus,
  FolderOpen,
  HelpCircle,
  Music,
  Clapperboard,
} from 'lucide-react';
import { BrandLogo } from '../common/BrandLogo';

export default function TopHeaderBar({
  project,
  projectSavedStatus = 'Saved to your account',
  showReadyBanner = false,
  onDismissReadyBanner,
  editorMode,
  setEditorMode,
  advancedSubMode,
  setAdvancedSubMode,
  leftDrawerOpen = true,
  onToggleLeftDrawer,
  rightPanelOpen = true,
  onToggleRightPanel,
  onResetWorkspaceLayout,
  onOpenTemplates,
  onOpenNewPoster,
  onOpenBrandKits,
  onOpenMotionTemplates,
  onSaveProject,
  onSaveAsTemplate,
  onNewProject,
  onDownloadProjectJson,
  onImportProjectJson,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onOpenFullscreen,
  onOpenFormatReview,
  onOpenExport,
  onOpenMyProjects,
  onOpenHelp,
  onSaveAs,
}) {
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const moreRef = useRef(null);
  const jsonInputRef = useRef(null);

  useEffect(() => {
    const handleOutside = (e) => {
      if (moreRef.current && !moreRef.current.contains(e.target)) {
        setMoreMenuOpen(false);
      }
    };
    window.addEventListener('mousedown', handleOutside);
    return () => window.removeEventListener('mousedown', handleOutside);
  }, []);

  const isSaving = projectSavedStatus === 'Saving...';
  const isUnsaved = projectSavedStatus === 'Unsaved changes';

  return (
    <header className="h-12 bg-[#141414] border-b border-neutral-800/80 px-3.5 flex items-center justify-between select-none shrink-0 z-30 relative">
      {/* Left: Brand & Project Title */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onOpenTemplates}
          className="focus:outline-none hover:opacity-90 transition-opacity shrink-0"
          title="Open Template Library"
        >
          <BrandLogo />
        </button>

        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[14px] font-bold text-white truncate max-w-[240px]">
            {project.name}
          </span>
          <span className="flex items-center gap-1.5 text-[11px] text-neutral-400 shrink-0">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isSaving
                  ? 'bg-amber-400 animate-pulse'
                  : isUnsaved
                  ? 'bg-amber-400'
                  : 'bg-emerald-400'
              }`}
            />
            {projectSavedStatus}
          </span>
        </div>
      </div>

      {/* Center floating ready banner (Screenshot 8) */}
      {showReadyBanner && (
        <div className="absolute left-1/2 -translate-x-1/2 top-1.5 z-40 flex items-center gap-2.5 px-4 py-2 rounded-xl bg-[#1c1c1c] border border-[#22c55e]/40 text-xs text-neutral-200 shadow-2xl">
          <CheckCircle2 className="w-4 h-4 text-[#22c55e] shrink-0" />
          <span className="font-medium">Your template is ready. Preview it or export.</span>
          <button
            type="button"
            onClick={onDismissReadyBanner}
            className="text-neutral-500 hover:text-white ml-1"
            aria-label="Dismiss notification"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Right: Mode Switchers, Workspace Toggles & Global Actions */}
      <div className="flex items-center gap-1.5">
        {/* Quick editor | Advanced Switcher */}
        <div className="flex items-center bg-[#1c1c1c] p-0.5 rounded-lg border border-neutral-800">
          <button
            type="button"
            onClick={() => setEditorMode('quick')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
              editorMode === 'quick'
                ? 'bg-[#159947] text-white shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Quick editor
          </button>
          <button
            type="button"
            onClick={() => setEditorMode('advanced')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
              editorMode === 'advanced'
                ? 'bg-[#159947] text-white shadow-sm ring-1 ring-[#22c55e]/50'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Advanced
          </button>
        </div>

        {/* Design | Motion sub-mode + 3 Workspace Panel Toggles (Screenshots 34, 44, 45, 46) */}
        {editorMode === 'advanced' && (
          <>
            {/* 4 Workspace Navigation Tabs: Design | Animate | Video | Audio */}
            <div className="flex items-center bg-[#1c1c1c] p-0.5 rounded-lg border border-neutral-800">
              <button
                type="button"
                onClick={() => setAdvancedSubMode('design')}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  advancedSubMode === 'design'
                    ? 'bg-[#159947]/25 text-[#4ade80] border border-[#22c55e]/40 shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
                title="Design Workspace (1)"
              >
                Design
              </button>
              <button
                type="button"
                onClick={() => setAdvancedSubMode('animate')}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  advancedSubMode === 'animate' || advancedSubMode === 'motion'
                    ? 'bg-[#159947]/25 text-[#4ade80] border border-[#22c55e]/40 shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
                title="Animate Workspace (2)"
              >
                Animate
              </button>
              <button
                type="button"
                onClick={() => setAdvancedSubMode('video')}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  advancedSubMode === 'video'
                    ? 'bg-[#159947]/25 text-[#4ade80] border border-[#22c55e]/40 shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
                title="Video Workspace (3)"
              >
                Video
              </button>
              <button
                type="button"
                onClick={() => setAdvancedSubMode('audio')}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  advancedSubMode === 'audio'
                    ? 'bg-[#159947]/25 text-[#4ade80] border border-[#22c55e]/40 shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
                title="Audio DSP Workspace (4)"
              >
                Audio
              </button>
            </div>

            {/* 3 Workspace Panel Toggles (Left Drawer, Right Properties Panel, Reset Layout) */}
            <div className="hidden md:flex items-center gap-1 ml-0.5">
              <button
                type="button"
                onClick={onToggleLeftDrawer}
                className={`p-1.5 rounded-lg border transition-colors ${
                  leftDrawerOpen
                    ? 'bg-[#159947]/20 border-[#22c55e]/60 text-[#4ade80]'
                    : 'bg-[#1c1c1c] border-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-800'
                }`}
                title={leftDrawerOpen ? 'Hide left panel' : 'Show left panel'}
                aria-label={leftDrawerOpen ? 'Hide left panel' : 'Show left panel'}
              >
                <PanelLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={onToggleRightPanel}
                className={`p-1.5 rounded-lg border transition-colors ${
                  rightPanelOpen
                    ? 'bg-[#159947]/20 border-[#22c55e]/60 text-[#4ade80]'
                    : 'bg-[#1c1c1c] border-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-800'
                }`}
                title={rightPanelOpen ? 'Hide properties panel' : 'Show properties panel'}
                aria-label={rightPanelOpen ? 'Hide properties panel' : 'Show properties panel'}
              >
                <PanelRight className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={onResetWorkspaceLayout}
                className="p-1.5 rounded-lg bg-[#1c1c1c] border border-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
                title="Reset workspace layout"
                aria-label="Reset workspace layout"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </>
        )}

        {/* My Projects Browser */}
        <button
          type="button"
          onClick={onOpenMyProjects}
          className="p-1.5 rounded-lg bg-[#1c1c1c] border border-neutral-800 text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors"
          title="Project Browser"
          aria-label="Project Browser"
        >
          <FolderOpen className="w-3.5 h-3.5" />
        </button>

        {/* Browse Templates icon button */}
        <button
          type="button"
          onClick={onOpenTemplates}
          className="p-1.5 rounded-lg bg-[#1c1c1c] border border-neutral-800 text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors"
          title="Template library"
          aria-label="Template library"
        >
          <LayoutGrid className="w-3.5 h-3.5" />
        </button>

        {/* Save icon button */}
        <button
          type="button"
          onClick={onSaveProject}
          className="p-1.5 rounded-lg bg-[#1c1c1c] border border-neutral-800 text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors"
          title="Save project (⌘S)"
          aria-label="Save project"
        >
          <Save className="w-3.5 h-3.5" />
        </button>

        {/* Help & Shortcuts button */}
        <button
          type="button"
          onClick={onOpenHelp}
          className="p-1.5 rounded-lg bg-[#1c1c1c] border border-neutral-800 text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors"
          title="Help & Shortcuts (?)"
          aria-label="Help and keyboard shortcuts"
        >
          <HelpCircle className="w-3.5 h-3.5" />
        </button>

        {/* More (...) menu matching Screenshot 47 */}
        <div className="relative" ref={moreRef}>
          <button
            type="button"
            onClick={() => setMoreMenuOpen((v) => !v)}
            className={`p-1.5 rounded-lg border transition-colors ${
              moreMenuOpen
                ? 'bg-[#262626] border-white/70 text-white'
                : 'bg-[#1c1c1c] border-neutral-800 text-neutral-300 hover:text-white hover:bg-neutral-800'
            }`}
            title="More options"
            aria-label="More options"
          >
            <MoreHorizontal className="w-3.5 h-3.5" />
          </button>

          {moreMenuOpen && (
            <div className="absolute right-0 mt-2 w-56 rounded-xl bg-[#1c1c1c] border border-neutral-700/90 shadow-2xl py-1.5 z-50 text-xs text-neutral-200">
              <button
                type="button"
                onClick={() => {
                  setMoreMenuOpen(false);
                  onOpenNewPoster?.();
                }}
                className="w-full px-3.5 py-2 text-left hover:bg-neutral-800 flex items-center gap-2.5"
              >
                <FilePlus className="w-3.5 h-3.5 text-neutral-400" />
                <span>New poster</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setMoreMenuOpen(false);
                  onOpenMyProjects?.();
                }}
                className="w-full px-3.5 py-2 text-left hover:bg-neutral-800 flex items-center gap-2.5"
              >
                <FolderOpen className="w-3.5 h-3.5 text-neutral-400" />
                <span>My Projects (Browser)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setMoreMenuOpen(false);
                  onOpenHelp?.();
                }}
                className="w-full px-3.5 py-2 text-left hover:bg-neutral-800 flex items-center gap-2.5"
              >
                <HelpCircle className="w-3.5 h-3.5 text-neutral-400" />
                <span>Help &amp; shortcuts (?)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setMoreMenuOpen(false);
                  onOpenTemplates?.();
                }}
                className="w-full px-3.5 py-2 text-left hover:bg-neutral-800 flex items-center gap-2.5"
              >
                <Film className="w-3.5 h-3.5 text-neutral-400" />
                <span>New from template</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setMoreMenuOpen(false);
                  onOpenBrandKits?.();
                }}
                className="w-full px-3.5 py-2 text-left hover:bg-neutral-800 flex items-center gap-2.5"
              >
                <Palette className="w-3.5 h-3.5 text-neutral-400" />
                <span>Brand kits</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setMoreMenuOpen(false);
                  onOpenFormatReview?.();
                }}
                className="w-full px-3.5 py-2 text-left hover:bg-neutral-800 flex items-center gap-2.5"
              >
                <Columns className="w-3.5 h-3.5 text-neutral-400" />
                <span>Review formats</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setMoreMenuOpen(false);
                  onOpenMotionTemplates?.();
                }}
                className="w-full px-3.5 py-2 text-left hover:bg-neutral-800 flex items-center gap-2.5"
              >
                <Film className="w-3.5 h-3.5 text-neutral-400" />
                <span>Motion templates</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setMoreMenuOpen(false);
                  onResetWorkspaceLayout?.();
                }}
                className="w-full px-3.5 py-2 text-left hover:bg-neutral-800 flex items-center gap-2.5"
              >
                <RotateCcw className="w-3.5 h-3.5 text-neutral-400" />
                <span>Reset workspace layout</span>
              </button>
              <button
                type="button"
                disabled={!canUndo}
                onClick={() => {
                  setMoreMenuOpen(false);
                  onUndo?.();
                }}
                className="w-full px-3.5 py-2 text-left hover:bg-neutral-800 disabled:opacity-40 flex items-center gap-2.5"
              >
                <Undo2 className="w-3.5 h-3.5 text-neutral-400" />
                <span>Undo</span>
              </button>
              <button
                type="button"
                disabled={!canRedo}
                onClick={() => {
                  setMoreMenuOpen(false);
                  onRedo?.();
                }}
                className="w-full px-3.5 py-2 text-left hover:bg-neutral-800 disabled:opacity-40 flex items-center gap-2.5"
              >
                <Redo2 className="w-3.5 h-3.5 text-neutral-400" />
                <span>Redo</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setMoreMenuOpen(false);
                  jsonInputRef.current?.click();
                }}
                className="w-full px-3.5 py-2 text-left hover:bg-neutral-800 flex items-center gap-2.5"
              >
                <Upload className="w-3.5 h-3.5 text-neutral-400" />
                <span>Import project JSON</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setMoreMenuOpen(false);
                  onDownloadProjectJson?.();
                }}
                className="w-full px-3.5 py-2 text-left hover:bg-neutral-800 flex items-center gap-2.5"
              >
                <Download className="w-3.5 h-3.5 text-neutral-400" />
                <span>Download project JSON</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setMoreMenuOpen(false);
                  onSaveAsTemplate?.();
                }}
                className="w-full px-3.5 py-2 text-left hover:bg-neutral-800 flex items-center gap-2.5"
              >
                <Copy className="w-3.5 h-3.5 text-neutral-400" />
                <span>Save as template</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setMoreMenuOpen(false);
                  const newName = window.prompt('Save project as:', `${project.name} (Copy)`);
                  if (newName && newName.trim()) {
                    onSaveAs?.(newName.trim());
                  }
                }}
                className="w-full px-3.5 py-2 text-left hover:bg-neutral-800 flex items-center gap-2.5"
              >
                <FilePlus className="w-3.5 h-3.5 text-neutral-400" />
                <span>Save As... (Duplicate)</span>
              </button>
            </div>
          )}
          <input
            ref={jsonInputRef}
            type="file"
            accept=".json"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file && onImportProjectJson) onImportProjectJson(file);
              e.target.value = '';
            }}
            className="hidden"
          />
        </div>

        <div className="h-4 w-px bg-neutral-800 mx-0.5" />

        {/* Undo / Redo */}
        <button
          type="button"
          onClick={onUndo}
          disabled={!canUndo}
          className="p-1.5 rounded-lg bg-[#1c1c1c] border border-neutral-800 text-neutral-300 hover:text-white disabled:opacity-35 transition-colors"
          title="Undo (⌘Z)"
          aria-label="Undo"
        >
          <Undo2 className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={onRedo}
          disabled={!canRedo}
          className="p-1.5 rounded-lg bg-[#1c1c1c] border border-neutral-800 text-neutral-300 hover:text-white disabled:opacity-35 transition-colors"
          title="Redo (⇧⌘Z)"
          aria-label="Redo"
        >
          <Redo2 className="w-3.5 h-3.5" />
        </button>

        {/* Fullscreen Preview */}
        <button
          type="button"
          onClick={onOpenFullscreen}
          className="p-1.5 rounded-lg bg-[#1c1c1c] border border-neutral-800 text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors"
          title="Fullscreen Preview (F)"
          aria-label="Fullscreen stage preview"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>

        {/* Review formats (3-column icon right before Export, matching Screenshots 11, 26, 34, 48) */}
        <button
          type="button"
          onClick={onOpenFormatReview}
          className="p-1.5 rounded-lg bg-[#1c1c1c] border border-neutral-800 text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors"
          title="Review formats"
          aria-label="Review multi-format layouts"
        >
          <Columns className="w-3.5 h-3.5" />
        </button>

        {/* Export Button */}
        <button
          type="button"
          onClick={onOpenExport}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#159947] hover:bg-[#19b353] border border-[#22c55e]/35 text-white font-semibold text-xs transition-colors shadow-[0_2px_10px_rgba(21,153,71,0.28)] ml-0.5"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export</span>
          <ChevronRight className="w-3.5 h-3.5 -mr-0.5" />
        </button>
      </div>
    </header>
  );
}
