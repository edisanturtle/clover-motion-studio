'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Lock,
  Plus,
  RotateCw,
  MoreHorizontal,
  ArrowUpRight,
  X,
  Trash2,
  Copy,
  Edit2,
  Download,
  Upload,
  Search,
  FolderOpen,
  LayoutGrid,
  CheckCircle2,
  Clock,
  Sparkles,
  Music,
} from 'lucide-react';
import ModalDialog from '../common/ModalDialog';
import { ASPECT_RATIOS } from '../../constants/fonts';
import { renderSceneToCanvas } from '../../engine/canvasRenderer';
import { createSampleAnimationProject } from '../../fixtures/sampleAnimationProject';
import { createSampleAudioReactiveProject } from '../../fixtures/sampleAudioReactiveProject';

function ProjectVisualCard({
  proj,
  isCurrentOnCanvas,
  onLoadProject,
  onDeleteSavedProject,
  onDuplicateProject,
  onRenameProject,
  onExportProjectJson,
  onClose,
}) {
  const canvasRef = useRef(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameVal, setRenameVal] = useState(proj.name || 'Untitled Project');
  const dim = ASPECT_RATIOS[proj.ratio] || ASPECT_RATIOS['4:5'];
  const scene = proj.scenes?.[1] || proj.scenes?.[0];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !scene) return;
    const ctx = canvas.getContext('2d');
    renderSceneToCanvas({
      ctx,
      width: dim.width,
      height: dim.height,
      scene,
      localTime: 1.0,
      audioSignals: { bass: 0.2, mid: 0.2, treble: 0.15, rms: 0.2 },
      selectedLayerId: null,
      showGrid: false,
      showSafeGuides: false,
    });
  }, [scene, dim.width, dim.height]);

  const handleFinishRename = (e) => {
    e?.stopPropagation();
    setIsRenaming(false);
    if (renameVal.trim() && renameVal !== proj.name && onRenameProject) {
      onRenameProject(proj.id, renameVal.trim());
    }
  };

  return (
    <div
      onClick={() => {
        if (isRenaming) return;
        onLoadProject(proj);
        onClose();
      }}
      className="group rounded-2xl bg-[#181818] border border-neutral-800/90 hover:border-neutral-600 transition-all cursor-pointer flex flex-col overflow-hidden shadow-lg"
    >
      {/* Visual Thumbnail Stage */}
      <div className="h-44 bg-[#0b0b0b] p-3 flex items-center justify-center relative overflow-hidden">
        <canvas
          ref={canvasRef}
          width={dim.width}
          height={dim.height}
          className="max-h-full max-w-full object-contain shadow-lg rounded"
        />

        {isCurrentOnCanvas && (
          <span className="absolute bottom-2.5 left-2.5 px-2.5 py-1 rounded-md bg-[#159947]/95 border border-[#22c55e]/40 text-[10px] font-semibold text-white shadow">
            On canvas
          </span>
        )}
      </div>

      {/* Card Body */}
      <div className="p-3.5 flex-1 flex flex-col justify-between space-y-3">
        <div>
          <div className="flex items-start justify-between gap-2 relative">
            {isRenaming ? (
              <input
                type="text"
                value={renameVal}
                autoFocus
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => setRenameVal(e.target.value)}
                onBlur={handleFinishRename}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleFinishRename(e);
                  if (e.key === 'Escape') {
                    setRenameVal(proj.name);
                    setIsRenaming(false);
                  }
                }}
                className="w-full bg-[#111111] border border-[#22c55e] rounded px-2 py-0.5 text-xs text-white outline-none font-bold"
              />
            ) : (
              <div className="text-xs font-bold text-white truncate group-hover:text-[#4ade80] transition-colors">
                {proj.name}
              </div>
            )}

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen((v) => !v);
              }}
              className="p-1 rounded-lg bg-[#222222] hover:bg-neutral-700 border border-neutral-700 text-neutral-300 hover:text-white shrink-0"
              aria-label="Project actions"
            >
              <MoreHorizontal className="w-3.5 h-3.5" />
            </button>

            {menuOpen && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute right-0 top-7 w-44 rounded-xl bg-[#222222] border border-neutral-700 shadow-2xl py-1 z-30 text-xs text-neutral-200"
              >
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    setIsRenaming(true);
                  }}
                  className="w-full px-3 py-1.5 text-left hover:bg-neutral-800 flex items-center gap-2"
                >
                  <Edit2 className="w-3 h-3 text-neutral-400" />
                  <span>Rename project</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onDuplicateProject?.(proj);
                  }}
                  className="w-full px-3 py-1.5 text-left hover:bg-neutral-800 flex items-center gap-2"
                >
                  <Copy className="w-3 h-3 text-neutral-400" />
                  <span>Duplicate</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onExportProjectJson?.(proj);
                  }}
                  className="w-full px-3 py-1.5 text-left hover:bg-neutral-800 flex items-center gap-2"
                >
                  <Download className="w-3 h-3 text-neutral-400" />
                  <span>Export JSON</span>
                </button>
                <div className="h-px bg-neutral-700 my-1" />
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onDeleteSavedProject(proj.id);
                  }}
                  className="w-full px-3 py-1.5 text-left text-red-400 hover:bg-neutral-800 flex items-center gap-2"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Move to trash</span>
                </button>
              </div>
            )}
          </div>

          <div className="text-[11px] font-mono text-neutral-400 mt-1 flex items-center gap-2">
            <span>{dim.width} × {dim.height}</span>
            <span>·</span>
            <span>{proj.ratio || '4:5'}</span>
            <span>·</span>
            <span>{proj.scenes?.length || 0} scenes</span>
          </div>
        </div>

        <div className="pt-2 border-b border-neutral-700/80 pb-1 flex items-center justify-between text-xs font-medium text-neutral-200 group-hover:text-white">
          <span>Continue editing</span>
          <ArrowUpRight className="w-3.5 h-3.5 text-[#4ade80]" />
        </div>
      </div>
    </div>
  );
}

export default function MyProjectsModal({
  open,
  onClose,
  currentProject,
  savedProjects = [],
  onSaveCurrentProject,
  onLoadProject,
  onDeleteSavedProject,
  onNewProject,
  onImportProjectJson,
  onExportProjectJson,
  onDuplicateProject,
  onRenameProject,
}) {
  const [activeTab, setActiveTab] = useState('projects'); // 'projects' | 'templates' | 'trash'
  const [searchQuery, setSearchQuery] = useState('');
  const jsonUploadRef = useRef(null);

  // Combine and de-duplicate savedProjects with current active project
  const allProjects = useMemo(() => {
    if (!currentProject) return savedProjects;
    const exists = savedProjects.some((p) => p.id === currentProject.id);
    return exists ? savedProjects : [currentProject, ...savedProjects];
  }, [currentProject, savedProjects]);

  // Filter projects by search query
  const filteredProjects = useMemo(() => {
    if (!searchQuery.trim()) return allProjects;
    const q = searchQuery.toLowerCase();
    return allProjects.filter((p) =>
      p.name?.toLowerCase().includes(q) || p.ratio?.toLowerCase().includes(q)
    );
  }, [allProjects, searchQuery]);

  return (
    <ModalDialog
      open={open}
      onClose={onClose}
      ariaLabel="My Projects Browser"
      maxWidth="max-w-4xl"
    >
      <div className="flex flex-col max-h-[86vh] bg-[#141414] text-neutral-100 select-none overflow-hidden rounded-2xl border border-neutral-800 shadow-2xl">
        {/* Top Header */}
        <div className="px-6 pt-6 pb-4 flex items-start justify-between gap-4 shrink-0">
          <div>
            <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-[0.18em] text-[#4ade80] mb-1">
              <Lock className="w-3 h-3 text-[#22c55e]" />
              <span>PRIVATE LOCAL WORKSPACE</span>
            </div>
            <h2 className="text-2xl font-extrabold text-white tracking-tight">Project Browser</h2>
            <p className="text-xs text-neutral-400 mt-1">
              Manage your Swiss designs, create blank projects, or import saved files.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                const sample = createSampleAudioReactiveProject();
                onLoadProject?.(sample);
                onClose();
              }}
              className="px-3 py-2 rounded-xl bg-[#159947]/20 hover:bg-[#159947]/30 border border-[#22c55e]/40 text-[#4ade80] text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
              title="Load editable sample audio-reactive project (Bass -> Scale, Mids -> Rotation, Transient -> Opacity)"
            >
              <Music className="w-3.5 h-3.5 text-[#4ade80]" />
              <span>Audio Dynamics</span>
            </button>

            <button
              type="button"
              onClick={() => {
                const sample = createSampleAnimationProject();
                onLoadProject?.(sample);
                onClose();
              }}
              className="px-3 py-2 rounded-xl bg-[#159947]/20 hover:bg-[#159947]/30 border border-[#22c55e]/40 text-[#4ade80] text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
              title="Load editable sample animation project"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#4ade80]" />
              <span>Sample Animation</span>
            </button>

            <button
              type="button"
              onClick={() => jsonUploadRef.current?.click()}
              className="px-3 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
              title="Import Project JSON file"
            >
              <Upload className="w-3.5 h-3.5 text-[#4ade80]" />
              <span>Import JSON</span>
            </button>
            <input
              ref={jsonUploadRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file && onImportProjectJson) {
                  onImportProjectJson(file);
                }
                e.target.value = '';
              }}
            />

            <button
              type="button"
              onClick={() => {
                onNewProject?.();
                onClose();
              }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#159947] hover:bg-[#19b353] border border-[#22c55e]/35 text-white text-xs font-bold transition-colors shadow-[0_2px_12px_rgba(21,153,71,0.3)]"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Project</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-neutral-800/80 hover:bg-neutral-700 flex items-center justify-center text-neutral-400 hover:text-white transition-colors ml-1"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Sub-navigation & Search Row */}
        <div className="px-6 pb-4 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex items-center bg-[#1c1c1c] p-1 rounded-xl border border-neutral-800 self-stretch sm:self-auto">
            {[
              { id: 'projects', label: `Projects (${allProjects.length})` },
              { id: 'templates', label: 'Custom Templates (0)' },
              { id: 'trash', label: 'Trash (0)' },
            ].map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    active
                      ? 'bg-[#159947] text-white shadow-sm'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-60">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#1c1c1c] border border-neutral-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-neutral-500 outline-none focus:border-[#22c55e]/60 transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={onSaveCurrentProject}
              className="p-2 rounded-xl bg-[#1c1c1c] hover:bg-neutral-800 border border-neutral-800 text-neutral-300 hover:text-white transition-colors shrink-0"
              title="Sync & save current project"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* 3-Column Visual Project Cards Grid */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-6 pb-6 min-h-0">
          {activeTab === 'projects' ? (
            filteredProjects.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {filteredProjects.map((proj, idx) => (
                  <ProjectVisualCard
                    key={proj.id || idx}
                    proj={proj}
                    isCurrentOnCanvas={proj.id === currentProject?.id}
                    onLoadProject={onLoadProject}
                    onDeleteSavedProject={onDeleteSavedProject}
                    onDuplicateProject={onDuplicateProject}
                    onRenameProject={onRenameProject}
                    onExportProjectJson={onExportProjectJson}
                    onClose={onClose}
                  />
                ))}
              </div>
            ) : (
              <div className="py-16 text-center text-xs text-neutral-400 border border-dashed border-neutral-800 rounded-2xl space-y-3">
                <FolderOpen className="w-8 h-8 text-neutral-600 mx-auto" />
                <div className="space-y-1">
                  <p className="font-semibold text-white">No projects found</p>
                  <p className="text-neutral-500 max-w-sm mx-auto">
                    {searchQuery
                      ? `No projects matching "${searchQuery}". Clear your search query or start a new project.`
                      : 'You do not have any saved projects yet. Click "New Project" to start designing.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onNewProject?.();
                    onClose();
                  }}
                  className="px-4 py-2 rounded-xl bg-[#159947] hover:bg-[#19b353] text-white font-semibold text-xs transition-colors inline-flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create First Project</span>
                </button>
              </div>
            )
          ) : (
            <div className="py-16 text-center text-xs text-neutral-500 border border-dashed border-neutral-800 rounded-2xl space-y-2">
              <LayoutGrid className="w-8 h-8 text-neutral-700 mx-auto" />
              <p className="font-medium text-neutral-400">
                {activeTab === 'templates'
                  ? 'Custom user templates appear here. Save any project as a template from the top menu.'
                  : 'Trash is empty.'}
              </p>
            </div>
          )}
        </div>

        {/* Bottom Footer */}
        <div className="px-6 py-3.5 border-t border-neutral-800/80 bg-[#141414] flex items-center justify-between text-xs shrink-0">
          <div className="flex items-center gap-2 text-neutral-300">
            <Lock className="w-3.5 h-3.5 text-[#22c55e]" />
            <span className="font-mono text-[11px]">Storage: Browser LocalStorage (Offline-First)</span>
          </div>
          <span className="text-neutral-400 text-[11px] font-mono">
            {allProjects.length} {allProjects.length === 1 ? 'project' : 'projects'} saved
          </span>
        </div>
      </div>
    </ModalDialog>
  );
}
