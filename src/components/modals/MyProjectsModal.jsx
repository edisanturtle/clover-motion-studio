'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Lock,
  Plus,
  RotateCw,
  MoreHorizontal,
  ArrowUpRight,
  X,
  Trash2,
} from 'lucide-react';
import ModalDialog from '../common/ModalDialog';
import { ASPECT_RATIOS } from '../../constants/fonts';
import { renderSceneToCanvas } from '../../engine/canvasRenderer';

function ProjectVisualCard({
  proj,
  isCurrentOnCanvas,
  onLoadProject,
  onDeleteSavedProject,
  onClose,
}) {
  const canvasRef = useRef(null);
  const [menuOpen, setMenuOpen] = useState(false);
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

  return (
    <div
      onClick={() => {
        onLoadProject(proj);
        onClose();
      }}
      className="group rounded-2xl bg-[#181818] border border-neutral-800/90 hover:border-neutral-600 transition-all cursor-pointer flex flex-col overflow-hidden"
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
            <div className="text-xs font-bold text-white truncate">{proj.name}</div>
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
                className="absolute right-0 top-7 w-36 rounded-xl bg-[#222222] border border-neutral-700 shadow-xl py-1 z-20 text-xs"
              >
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

          <div className="text-[11px] font-mono text-neutral-400 mt-1">
            {dim.width} × {dim.height} · Nov 5
          </div>
        </div>

        <div className="pt-2 border-b border-neutral-700/80 pb-1 flex items-center justify-between text-xs font-medium text-neutral-200 group-hover:text-white">
          <span>Continue editing</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
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
}) {
  const [activeTab, setActiveTab] = useState('projects'); // 'projects' | 'templates' | 'trash'

  // Include current project at the front if not already saved
  const displayedProjects = React.useMemo(() => {
    if (!currentProject) return savedProjects;
    const exists = savedProjects.some((p) => p.id === currentProject.id);
    return exists ? savedProjects : [currentProject, ...savedProjects];
  }, [currentProject, savedProjects]);

  return (
    <ModalDialog
      open={open}
      onClose={onClose}
      ariaLabel="My Projects"
      maxWidth="max-w-4xl"
    >
      <div className="flex flex-col max-h-[86vh] bg-[#141414] text-neutral-100 select-none overflow-hidden">
        {/* Top Header (Screenshot 16) */}
        <div className="px-6 pt-6 pb-4 flex items-start justify-between gap-4 shrink-0">
          <div>
            <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-[0.18em] text-neutral-400 mb-1">
              <Lock className="w-3 h-3" />
              <span>PRIVATE WORKSPACE</span>
            </div>
            <h2 className="text-2xl font-extrabold text-white tracking-tight">My Projects</h2>
            <p className="text-xs text-neutral-400 mt-1">
              Open a design or start from a saved template.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                onNewProject?.();
                onClose();
              }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#159947] hover:bg-[#19b353] border border-[#22c55e]/35 text-white text-xs font-bold transition-colors shadow-[0_2px_12px_rgba(21,153,71,0.3)]"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New project</span>
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

        {/* Sub-navigation Row: Projects | Templates | Trash + Refresh (Screenshot 16) */}
        <div className="px-6 pb-4 flex items-center justify-between shrink-0">
          <div className="flex items-center bg-[#1c1c1c] p-1 rounded-xl border border-neutral-800">
            {[
              { id: 'projects', label: 'Projects' },
              { id: 'templates', label: 'Templates' },
              { id: 'trash', label: 'Trash' },
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

          <button
            type="button"
            onClick={onSaveCurrentProject}
            className="p-2 rounded-xl bg-[#1c1c1c] hover:bg-neutral-800 border border-neutral-800 text-neutral-300 hover:text-white transition-colors"
            title="Sync & save current project"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* 3-Column Visual Project Cards Grid */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-6 pb-6 min-h-0">
          {activeTab === 'projects' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {displayedProjects.map((proj, idx) => (
                <ProjectVisualCard
                  key={proj.id || idx}
                  proj={proj}
                  isCurrentOnCanvas={idx === 0}
                  onLoadProject={onLoadProject}
                  onDeleteSavedProject={onDeleteSavedProject}
                  onClose={onClose}
                />
              ))}
            </div>
          ) : (
            <div className="py-12 text-center text-xs text-neutral-500 border border-dashed border-neutral-800 rounded-2xl">
              {activeTab === 'templates'
                ? 'Saved custom templates appear here. Use "Save as template" in the menu to add one.'
                : 'Trash is empty.'}
            </div>
          )}
        </div>

        {/* Bottom Footer (Screenshot 16) */}
        <div className="px-6 py-3.5 border-t border-neutral-800/80 bg-[#141414] flex items-center justify-between text-xs shrink-0">
          <div className="flex items-center gap-2 text-neutral-300">
            <Lock className="w-3.5 h-3.5 text-neutral-400" />
            <span>Edi Santoso</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-neutral-300 hover:text-white underline underline-offset-4"
          >
            Sign out
          </button>
        </div>
      </div>
    </ModalDialog>
  );
}
