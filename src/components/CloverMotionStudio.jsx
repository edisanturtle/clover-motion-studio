'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { STUDIO_TEMPLATES } from '../constants/templateCatalog';
import { DEMO_TRACKS } from '../constants/audioTracks';
import { ASPECT_RATIOS } from '../constants/fonts.js';
import { COLOR_PALETTES } from '../constants/motionPresets';
import { EFFECTCRAFT_FX_RACK } from '../constants/effectCraftEffects';
import { buildProjectFromTemplate } from '../utils/projectBuilder';
import { ProceduralAudioEngine } from '../engine/audioEngine';
import {
  formatTimecode,
  getGlobalProjectDuration,
  mapGlobalTimeToScene,
  mapSceneTimeToGlobal,
} from '../utils/timecode';
import {
  addScene,
  duplicateScene,
  deleteScene,
  updateSceneProp,
  updateShowcaseConfig,
  updateSceneAudio,
  updateSceneMotion,
  updateSceneDesign,
  updateSceneMediaSlots,
  updateLayer,
  reorderLayers,
  addTextLayerToScene,
  addShapeLayerToScene,
  addVectorPathLayerToScene,
  addImageLayerToScene,
  deleteLayersFromScene,
  duplicateLayersInScene,
  groupLayersInScene,
  ungroupLayersInScene,
  alignLayersInScene,
  distributeLayersInScene,
  reorderLayersZ,
  duplicateKeyframesInLayer,
  addMarkerToScene,
  deleteMarkerFromScene,
  addAudioTrackToProject,
  deleteAudioTrackFromProject,
  updateAudioTrackInProject,
  addAudioClipToTrackInProject,
  updateAudioClipInProject,
  trimAudioClipInProject,
  splitAudioClipInProject,
  deleteAudioClipFromProject,
  updateMasterDspInProject,
  addVideoTrackToProject,
  deleteVideoTrackFromProject,
  updateVideoTrackInProject,
  addVideoClipToTrackInProject,
  updateVideoClipInProject,
  splitVideoClipInProject,
  trimVideoClipInProject,
  rippleDeleteVideoClipInProject,
  updateVideoClipTransformInProject,
  updateVideoClipCropInProject,
  setVideoClipTransitionInProject,
  updateVideoClipCaptionsInProject,
  setLayerFormatOverrideInProject,
  removeLayerFormatOverrideInProject,
} from '../core/services/projectService';
import {
  validateAudioFile,
  extractWaveformPeaks,
  generateSyntheticTestAudio,
  synthesizeSynthNoteBuffer,
} from '../core/services/audioService';
import {
  createAudioClip,
  createAudioTrack,
} from '../core/domain/audioModels';
import { frameStepTime } from '../core/domain/timebase';
import { createSampleAnimationProject } from '../fixtures/sampleAnimationProject';

import TopHeaderBar from './layout/TopHeaderBar';
import LeftSidebar from './layout/LeftSidebar';
import CanvasViewport from './layout/CanvasViewport';
import RightInspector from './layout/RightInspector';
import TimelinePanel from './layout/TimelinePanel';
import BottomAudioBar from './layout/BottomAudioBar';
import VideoWorkspaceView from './workspace/VideoWorkspaceView';
import AudioWorkspaceView from './workspace/AudioWorkspaceView';

import TemplateLibraryModal from './modals/TemplateLibraryModal';
import FormatReviewModal from './modals/FormatReviewModal';
import ExportModal from './modals/ExportModal';
import MyProjectsModal from './modals/MyProjectsModal';
import FullscreenPreviewModal from './modals/FullscreenPreviewModal';
import HelpShortcutsModal from './modals/HelpShortcutsModal';
import BrandKitsModal from './modals/BrandKitsModal';
import MotionTemplatesModal from './modals/MotionTemplatesModal';
import { Sliders } from 'lucide-react';
import {
  atomicSaveProject,
  saveAsProject,
  loadSavedProjects,
  recordRecoveryJournal,
  checkRecoveryJournal,
  clearRecoveryJournal,
  loadLayoutPreferences,
  saveLayoutPreferences,
} from '../core/services/storageService';
import { saveProjectAsCustomTemplate } from '../core/services/templateService';
import { computeBufferHash, generateExportManifest } from '../core/services/exportManifestService';
import { runExportPreflight } from '../core/services/exportPreflightService';
import {
  migrateProjectSchema,
  serializeProject,
  deserializeProject,
  ensureStableIds,
  CURRENT_SCHEMA_VERSION,
} from '../core/domain/projectSchema';
import {
  createAssetRecord,
  importLocalFileToAsset,
  registerAssetInProject,
  relinkAssetInProject,
  verifyProjectAssets,
} from '../core/services/assetRegistry';
import {
  encodeWavPcm,
  renderPngSequence,
  exportNativeProjectBundle,
} from '../core/services/exportEngine';
import {
  createExportItem,
  addExportItem,
  updateExportItem,
  cancelExportItem,
  retryExportItem,
  appendExportLog,
  createBatchVariantItems,
  EXPORT_STATUS,
} from '../core/services/exportQueueService';
import {
  exportToSvg,
  exportToLottie,
  exportToOtio,
} from '../core/services/interchangeService';

const STORAGE_KEY = 'clover_motion_saved_projects_v1';

export default function CloverMotionStudio() {
  const initialTemplate =
    STUDIO_TEMPLATES.find((t) => t.id === 'tpl_shutter') || STUDIO_TEMPLATES[0];

  const [project, setProject] = useState(() =>
    migrateProjectSchema(buildProjectFromTemplate(initialTemplate, '1:1'))
  );
  const [history, setHistory] = useState([]);
  const [future, setFuture] = useState([]);
  const [projectSavedStatus, setProjectSavedStatus] = useState('Saved to your account');
  const [showReadyBanner, setShowReadyBanner] = useState(false);
  const [recoveredSession, setRecoveredSession] = useState(null);

  const [editorMode, setEditorMode] = useState('quick'); // 'quick' | 'advanced'
  const [advancedSubMode, setAdvancedSubMode] = useState('motion'); // 'design' | 'motion'
  const [leftDrawerOpen, setLeftDrawerOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [timelineExpanded, setTimelineExpanded] = useState(true);
  const [leftSidebarWidth, setLeftSidebarWidth] = useState(280);
  const [rightInspectorWidth, setRightInspectorWidth] = useState(280);
  const [timelineHeight, setTimelineHeight] = useState(240);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const savedLayoutBeforeFocusRef = useRef({
    leftDrawerOpen: true,
    rightPanelOpen: true,
    timelineExpanded: true,
  });

  const [activeSceneIndex, setActiveSceneIndex] = useState(1); // Default to 'Poster' scene
  const [selectedLayerId, setSelectedLayerId] = useState(null);
  const [selectedLayerIds, setSelectedLayerIds] = useState([]);

  const handleSetSelectedLayerId = (id) => {
    setSelectedLayerId(id);
    setSelectedLayerIds(id ? [id] : []);
  };

  const handleSetSelectedLayerIds = (ids) => {
    const list = Array.isArray(ids) ? ids : [];
    setSelectedLayerIds(list);
    setSelectedLayerId(list[0] || null);
  };

  // Playback & Time State
  const [isPlaying, setIsPlaying] = useState(false);
  const [loopPlayback, setLoopPlayback] = useState(true);
  const [playbackScope, setPlaybackScope] = useState('all'); // 'all' (Master 60s Full Video) | 'scene' (Single Scene Loop)
  const [localTime, setLocalTime] = useState(0);

  // Overlays & Canvas HUD
  const [showGrid, setShowGrid] = useState(false);
  const [showSafeGuides, setShowSafeGuides] = useState(false);

  // Audio State
  const [volume, setVolume] = useState(0.75);
  const [isMuted, setIsMuted] = useState(false);
  const [micActive, setMicActive] = useState(false);
  const [audioSignals, setAudioSignals] = useState({
    bass: 0,
    mid: 0,
    treble: 0,
    rms: 0,
  });
  const [spectrum, setSpectrum] = useState(() => new Array(32).fill(0.08));

  // Fase 5: Local Audio Import Progress & Error State
  const [audioImportProgress, setAudioImportProgress] = useState(null); // null or 0..100
  const [audioImportStatus, setAudioImportStatus] = useState('');
  const [audioImportError, setAudioImportError] = useState(null);
  const audioFileReaderRef = useRef(null);

  // Modals State
  const [templatesModalOpen, setTemplatesModalOpen] = useState(false);
  const [templateLibraryInitialTab, setTemplateLibraryInitialTab] = useState('templates');
  const [formatReviewOpen, setFormatReviewOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [myProjectsOpen, setMyProjectsOpen] = useState(false);
  const [fullscreenOpen, setFullscreenOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [brandKitsOpen, setBrandKitsOpen] = useState(false);
  const [motionTemplatesOpen, setMotionTemplatesOpen] = useState(false);

  // Custom Fonts & Saved Projects
  const [customFonts, setCustomFonts] = useState([]);
  const [savedProjects, setSavedProjects] = useState([]);

  // Export Video Recording State (Fase 11)
  const [isRecording, setIsRecording] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportQueue, setExportQueue] = useState([]);
  const [exportError, setExportError] = useState(null);
  const [lastExportReceipt, setLastExportReceipt] = useState(null);

  const canvasRef = useRef(null);
  const audioEngineRef = useRef(null);
  const activeRecorderRef = useRef(null);
  const exportTimerRef = useRef(null);
  const exportOptionsRef = useRef(null);

  const activeScene = project.scenes[activeSceneIndex] || project.scenes[0];
  const selectedLayer =
    activeScene?.layers?.find((l) => l.id === selectedLayerId) || null;

  const totalProjectDuration = getGlobalProjectDuration(project.scenes);
  const currentGlobalTime = mapSceneTimeToGlobal(project.scenes, activeSceneIndex, localTime);

  // Initialize Audio Engine, Load Saved Projects & Check Crash Recovery Journal
  useEffect(() => {
    audioEngineRef.current = new ProceduralAudioEngine();
    try {
      const saved = loadSavedProjects();
      setSavedProjects(saved);

      const recovery = checkRecoveryJournal();
      if (recovery.hasRecovery && recovery.project) {
        setRecoveredSession(recovery);
      }
    } catch {
      // ignore storage errors
    }
    return () => {
      audioEngineRef.current?.stop();
    };
  }, []);

  // Load layout preferences from localStorage on mount
  useEffect(() => {
    try {
      const prefs = loadLayoutPreferences();
      if (prefs) {
        if (typeof prefs.leftSidebarWidth === 'number') setLeftSidebarWidth(prefs.leftSidebarWidth);
        if (typeof prefs.rightInspectorWidth === 'number') setRightInspectorWidth(prefs.rightInspectorWidth);
        if (typeof prefs.timelineHeight === 'number') setTimelineHeight(prefs.timelineHeight);
        if (typeof prefs.leftDrawerOpen === 'boolean') setLeftDrawerOpen(prefs.leftDrawerOpen);
        if (typeof prefs.rightPanelOpen === 'boolean') setRightPanelOpen(prefs.rightPanelOpen);
        if (typeof prefs.timelineExpanded === 'boolean') setTimelineExpanded(prefs.timelineExpanded);
        if (typeof prefs.isFocusMode === 'boolean') setIsFocusMode(prefs.isFocusMode);
      }
    } catch {
      // ignore layout storage errors
    }
  }, []);

  // Persist layout preferences whenever user resizes or toggles panels
  useEffect(() => {
    saveLayoutPreferences({
      leftSidebarWidth,
      rightInspectorWidth,
      timelineHeight,
      leftDrawerOpen,
      rightPanelOpen,
      timelineExpanded,
      isFocusMode,
    });
  }, [
    leftSidebarWidth,
    rightInspectorWidth,
    timelineHeight,
    leftDrawerOpen,
    rightPanelOpen,
    timelineExpanded,
    isFocusMode,
  ]);

  // Select default headline layer and sync per-scene audio/SFX when switching scenes
  useEffect(() => {
    if (activeScene?.layers?.length) {
      const titleLayer =
        activeScene.layers.find((l) => l.role === 'title') || activeScene.layers[0];
      setSelectedLayerId(titleLayer.id);
    }

    if (!project?.scenes || !project.scenes[activeSceneIndex]) return;
    const curScene = project.scenes[activeSceneIndex];
    const targetTrackId = curScene.audioTrackId || project.audioTrackId || 'funk';

    if (isPlaying && curScene.sfxOnEnter && curScene.sfxOnEnter !== 'none') {
      audioEngineRef.current?.triggerSfx(curScene.sfxOnEnter);
    }

    if (isPlaying) {
      if (targetTrackId === 'none' || targetTrackId === 'mute') {
        audioEngineRef.current?.setMuted(true);
      } else {
        if (!isMuted) audioEngineRef.current?.setMuted(false);
        const currentAudioTrack = audioEngineRef.current?.currentTrack;
        if (currentAudioTrack?.id !== targetTrackId) {
          const track = DEMO_TRACKS.find((t) => t.id === targetTrackId) || DEMO_TRACKS[0];
          if (track) {
            audioEngineRef.current?.setTrack(track);
          }
        }
      }
    }
  }, [activeSceneIndex, isPlaying, project.audioTrackId, project.id, isMuted]);

  // Commit state change with Undo History
  const updateProjectWithHistory = useCallback((updater) => {
    setProject((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      setHistory((h) => [...h.slice(-24), prev]);
      setFuture([]);
      setProjectSavedStatus('Unsaved changes');
      return next;
    });
  }, []);

  const handleUndo = useCallback(() => {
    setHistory((h) => {
      if (h.length === 0) return h;
      const previous = h[h.length - 1];
      setFuture((f) => [project, ...f]);
      setProject(previous);
      return h.slice(0, -1);
    });
  }, [project]);

  const handleRedo = useCallback(() => {
    setFuture((f) => {
      if (f.length === 0) return f;
      const next = f[0];
      setHistory((h) => [...h, project]);
      setProject(next);
      return f.slice(1);
    });
  }, [project]);

  const handleSaveCurrentProject = useCallback(() => {
    setProjectSavedStatus('Saving...');
    try {
      atomicSaveProject(project);
      setSavedProjects(loadSavedProjects());
      setTimeout(() => {
        setProjectSavedStatus('Saved to your account');
      }, 400);
    } catch (err) {
      console.error('Save failed:', err);
      setProjectSavedStatus('Unsaved changes');
    }
  }, [project]);

  const handleSaveAsProject = useCallback((newName) => {
    try {
      const saved = saveAsProject(project, newName);
      setSavedProjects(loadSavedProjects());
      updateProjectWithHistory(saved);
      setProjectSavedStatus('Saved to your account');
    } catch (err) {
      console.error('Save As failed:', err);
    }
  }, [project, updateProjectWithHistory]);

  const handleSaveAsTemplate = useCallback(() => {
    const tplName = window.prompt('Save Current Project as Template:', `${project.name} Template`);
    if (!tplName || !tplName.trim()) return;
    try {
      const savedTpl = saveProjectAsCustomTemplate(project, {
        name: tplName.trim(),
        author: 'You',
        license: 'local-user',
        category: 'User Custom',
        source: 'User Studio Project',
      });
      setProjectSavedStatus(`Saved as template "${savedTpl.name}"`);
      setShowReadyBanner(true);
      setTimeout(() => setShowReadyBanner(false), 3000);
    } catch (err) {
      alert(`Failed to save template: ${err.message}`);
    }
  }, [project]);

  const handleDeleteSavedProject = useCallback((id) => {
    setSavedProjects((prev) => {
      const next = prev.filter((p) => p.id !== id);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const handleDuplicateProject = useCallback((proj) => {
    const copy = {
      ...proj,
      id: `proj_${Date.now()}`,
      name: `${proj.name} (Copy)`,
      updatedAt: Date.now(),
    };
    setSavedProjects((prev) => {
      const next = [copy, ...prev.slice(0, 19)];
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  const handleRenameProject = useCallback((id, newName) => {
    setSavedProjects((prev) => {
      const next = prev.map((p) => (p.id === id ? { ...p, name: newName } : p));
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
    if (project.id === id) {
      setProject((prev) => ({ ...prev, name: newName }));
    }
  }, [project.id]);

  // Animation & Audio FFT Loop
  useEffect(() => {
    if (!isPlaying) return;
    let rafId;
    let lastTs = performance.now();
    let lastAudioTs = 0;

    const tick = (now) => {
      // Clamp dt to avoid huge time jumps if tab was backgrounded
      const rawDt = (now - lastTs) / 1000;
      const dt = Math.min(0.1, Math.max(0.001, rawDt));
      lastTs = now;

      // Throttle audio FFT analysis state updates to ~32Hz to keep 60/120fps motion silky smooth
      if (now - lastAudioTs > 30) {
        lastAudioTs = now;
        if (audioEngineRef.current) {
          const analysis = audioEngineRef.current.getAnalysis();
          setAudioSignals({
            bass: analysis.bass,
            mid: analysis.mid,
            treble: analysis.treble,
            rms: analysis.rms,
            amplitude: analysis.amplitude || analysis.rms,
            transient: analysis.transient || 0,
            beat: analysis.beat || 0,
          });
          setSpectrum(analysis.bars);
        }
      }

      const sceneDur = activeScene?.duration || 4;
      const totalScenes = project.scenes?.length || 1;

      setLocalTime((prev) => {
        const next = prev + dt;
        if (next >= sceneDur) {
          if (playbackScope === 'all' && totalScenes > 1) {
            const nextIdx = activeSceneIndex + 1;
            if (nextIdx < totalScenes) {
              // Seamless continuous transition to next scene in the master timeline
              const excess = Math.max(0, next - sceneDur);
              setActiveSceneIndex(nextIdx);
              const nextScene = project.scenes[nextIdx];
              if (nextScene?.sfxOnEnter && nextScene.sfxOnEnter !== 'none') {
                audioEngineRef.current?.triggerSfx(nextScene.sfxOnEnter);
              }
              if (nextScene?.audioTrackId && nextScene.audioTrackId !== 'none') {
                const targetTrack = DEMO_TRACKS.find((t) => t.id === nextScene.audioTrackId);
                if (targetTrack) audioEngineRef.current?.start(targetTrack);
              }
              return excess;
            } else {
              // Reached end of entire multi-scene video (e.g. 60s total)
              if (loopPlayback) {
                setActiveSceneIndex(0);
                const firstScene = project.scenes[0];
                if (firstScene?.sfxOnEnter && firstScene.sfxOnEnter !== 'none') {
                  audioEngineRef.current?.triggerSfx(firstScene.sfxOnEnter);
                }
                if (firstScene?.audioTrackId && firstScene.audioTrackId !== 'none') {
                  const targetTrack = DEMO_TRACKS.find((t) => t.id === firstScene.audioTrackId);
                  if (targetTrack) audioEngineRef.current?.start(targetTrack);
                }
                return 0;
              } else {
                setIsPlaying(false);
                audioEngineRef.current?.stop();
                return sceneDur;
              }
            }
          }

          // Single Scene Mode
          return loopPlayback ? 0 : sceneDur;
        }
        return next;
      });

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [isPlaying, activeScene?.duration, loopPlayback, playbackScope, project.scenes, activeSceneIndex]);

  // Playback Controls
  const handleTogglePlay = useCallback(() => {
    setIsPlaying((prev) => {
      const next = !prev;
      const targetTrackId = activeScene?.audioTrackId || project.audioTrackId || 'funk';
      const track =
        DEMO_TRACKS.find((t) => t.id === targetTrackId) || DEMO_TRACKS[0];
      if (next) {
        audioEngineRef.current?.start(track);
        audioEngineRef.current?.scheduleClipPlayback(project.audioTracks || [], localTime);
        if (activeScene?.sfxOnEnter && activeScene.sfxOnEnter !== 'none') {
          audioEngineRef.current?.triggerSfx(activeScene.sfxOnEnter);
        }
      } else {
        audioEngineRef.current?.stop();
      }
      return next;
    });
  }, [activeScene?.audioTrackId, activeScene?.sfxOnEnter, project.audioTrackId, project.audioTracks, localTime]);

  const handleRestart = useCallback(() => {
    if (playbackScope === 'all') {
      setActiveSceneIndex(0);
      setLocalTime(0);
      const firstScene = project.scenes[0];
      if (firstScene?.sfxOnEnter && firstScene.sfxOnEnter !== 'none') {
        audioEngineRef.current?.triggerSfx(firstScene.sfxOnEnter);
      }
    } else {
      setLocalTime(0);
      if (activeScene?.sfxOnEnter && activeScene.sfxOnEnter !== 'none') {
        audioEngineRef.current?.triggerSfx(activeScene.sfxOnEnter);
      }
    }
  }, [playbackScope, project.scenes, activeScene?.sfxOnEnter]);

  const handleSeekGlobalTime = useCallback((globalTime) => {
    const res = mapGlobalTimeToScene(project.scenes, globalTime);
    setActiveSceneIndex(res.sceneIndex);
    setLocalTime(res.localTime);
  }, [project.scenes]);

  // Generate Random Harmonious Palette (Respecting Locked Swatches)
  const handleGeneratePalette = useCallback(() => {
    updateProjectWithHistory((prev) => {
      const randomPal =
        COLOR_PALETTES[Math.floor(Math.random() * COLOR_PALETTES.length)].colors;
      const currentPal = prev.palette || randomPal;
      const locks = prev.lockedSwatches || [false, false, false, false, false, false];
      const nextPalette = currentPal.map((hex, i) =>
        locks[i] ? hex : randomPal[i % randomPal.length] || hex
      );
      return {
        ...prev,
        palette: nextPalette,
        scenes: prev.scenes.map((sc) => ({
          ...sc,
          bg: nextPalette[0],
          palette: nextPalette,
          layers: sc.layers.map((l) => {
            if (l.type === 'text' && l.role === 'title') {
              return { ...l, color: nextPalette[1] };
            }
            if (l.type === 'graphic') {
              return { ...l, color: nextPalette[2], secondaryColor: nextPalette[1] };
            }
            return l;
          }),
        })),
      };
    });
  }, [updateProjectWithHistory]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const onKeyDown = (e) => {
      const tag = e.target?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select' || e.target?.isContentEditable) return;

      if (e.code === 'Space' && !e.shiftKey) {
        e.preventDefault();
        handleTogglePlay();
      } else if (e.code === 'Space' && e.shiftKey) {
        e.preventDefault();
        handleGeneratePalette();
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSaveCurrentProject();
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'o') {
        e.preventDefault();
        setMyProjectsOpen(true);
      } else if (e.key.toLowerCase() === 'g') {
        setShowGrid((v) => !v);
      } else if (e.key.toLowerCase() === 'f') {
        setFullscreenOpen((v) => !v);
      } else if (e.key === '?') {
        setHelpOpen((v) => !v);
      } else if (e.key === ',') {
        e.preventDefault();
        setLocalTime((t) => frameStepTime(t, -1, project.fps || 30, activeScene?.duration || 4));
      } else if (e.key === '.') {
        e.preventDefault();
        setLocalTime((t) => frameStepTime(t, 1, project.fps || 30, activeScene?.duration || 4));
      } else if (editorMode === 'advanced' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        if (e.key === '1') setAdvancedSubMode('design');
        else if (e.key === '2') setAdvancedSubMode('animate');
        else if (e.key === '3') setAdvancedSubMode('video');
        else if (e.key === '4') setAdvancedSubMode('audio');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleTogglePlay, handleGeneratePalette, handleUndo, handleRedo, handleSaveCurrentProject, editorMode]);

  // Debounced Autosave to localStorage & Crash Recovery Journal
  useEffect(() => {
    if (projectSavedStatus !== 'Unsaved changes') return;
    recordRecoveryJournal(project);
    const timer = setTimeout(() => {
      try {
        setProjectSavedStatus('Saving...');
        atomicSaveProject(project);
        setSavedProjects(loadSavedProjects());
        setTimeout(() => {
          setProjectSavedStatus('Saved locally');
        }, 400);
      } catch {
        setProjectSavedStatus('Unsaved changes');
      }
    }, 2500);
    return () => clearTimeout(timer);
  }, [project, projectSavedStatus]);

  // Browser BeforeUnload Unsaved Changes Safety
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (projectSavedStatus === 'Unsaved changes') {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [projectSavedStatus]);

  // Template & Aspect Ratio Selection
  const handleSelectTemplate = (template, targetRatio = project.ratio) => {
    const newProj = buildProjectFromTemplate(template, targetRatio);
    updateProjectWithHistory(newProj);
    setActiveSceneIndex(Math.min(1, newProj.scenes.length - 1));
    setLocalTime(0);
    setProjectSavedStatus('Saving...');
    setShowReadyBanner(true);
    setTimeout(() => {
      setProjectSavedStatus('Saved to your account');
    }, 1200);
    setTimeout(() => {
      setShowReadyBanner(false);
    }, 5000);
    const track =
      DEMO_TRACKS.find((t) => t.id === newProj.audioTrackId) || DEMO_TRACKS[0];
    if (isPlaying) {
      audioEngineRef.current?.start(track);
    }
  };

  // Start a Blank / Sound Check Project ("New project")
  const handleNewProject = () => {
    const soundCheckTemplate =
      STUDIO_TEMPLATES.find((t) => t.id === 'tpl_soundcheck') || STUDIO_TEMPLATES[0];
    const newProj = buildProjectFromTemplate(soundCheckTemplate, '4:5');
    updateProjectWithHistory(newProj);
    setEditorMode('advanced');
    setAdvancedSubMode('motion');
    setActiveSceneIndex(0);
    setLocalTime(0);
    setProjectSavedStatus('New project');
  };

  const handleToggleFocusMode = useCallback(() => {
    setIsFocusMode((prev) => {
      const next = !prev;
      if (next) {
        // Entering focus mode: save current state and collapse sidebars & timeline
        savedLayoutBeforeFocusRef.current = {
          leftDrawerOpen,
          rightPanelOpen,
          timelineExpanded,
        };
        setLeftDrawerOpen(false);
        setRightPanelOpen(false);
        setTimelineExpanded(false);
      } else {
        // Exiting focus mode: restore saved layout
        setLeftDrawerOpen(savedLayoutBeforeFocusRef.current.leftDrawerOpen);
        setRightPanelOpen(savedLayoutBeforeFocusRef.current.rightPanelOpen);
        setTimelineExpanded(savedLayoutBeforeFocusRef.current.timelineExpanded);
      }
      return next;
    });
  }, [leftDrawerOpen, rightPanelOpen, timelineExpanded]);

  const handleResetWorkspaceLayout = () => {
    setLeftSidebarWidth(280);
    setRightInspectorWidth(280);
    setTimelineHeight(240);
    setLeftDrawerOpen(true);
    setRightPanelOpen(true);
    setTimelineExpanded(true);
    setIsFocusMode(false);
    saveLayoutPreferences({
      leftSidebarWidth: 280,
      rightInspectorWidth: 280,
      timelineHeight: 240,
      leftDrawerOpen: true,
      rightPanelOpen: true,
      timelineExpanded: true,
      isFocusMode: false,
    });
  };

  const handleLeftResizeStart = (e) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = leftSidebarWidth;

    const onMove = (ev) => {
      const delta = ev.clientX - startX;
      setLeftSidebarWidth(Math.max(220, Math.min(420, startW + delta)));
    };

    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const handleRightResizeStart = (e) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = rightInspectorWidth;

    const onMove = (ev) => {
      const delta = startX - ev.clientX; // dragging left expands right inspector
      setRightInspectorWidth(Math.max(240, Math.min(450, startW + delta)));
    };

    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  // Keyboard shortcut listener for Focus Mode (F), Sidebar (Cmd+B), Inspector (Cmd+I)
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      const tag = e.target?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select' || e.target?.isContentEditable) {
        return;
      }

      // 'F' or 'f' toggles Focus Mode
      if ((e.key === 'f' || e.key === 'F') && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        handleToggleFocusMode();
      }

      // 'Escape' exits Focus Mode if active
      if (e.key === 'Escape' && isFocusMode) {
        e.preventDefault();
        handleToggleFocusMode();
      }

      // 'Cmd/Ctrl + B' toggles left sidebar drawer
      if ((e.key === 'b' || e.key === 'B') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setLeftDrawerOpen((v) => !v);
      }

      // 'Cmd/Ctrl + I' toggles right inspector
      if ((e.key === 'i' || e.key === 'I') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setRightPanelOpen((v) => !v);
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [handleToggleFocusMode, isFocusMode]);

  const handleChangeRatio = (newRatio) => {
    updateProjectWithHistory((prev) => ({
      ...prev,
      ratio: newRatio,
      baseRatio: prev.baseRatio || prev.ratio || '4:5',
    }));
  };

  // Quick Copy Global Update Across All Scenes
  const handleUpdateQuickCopy = (roleKey, value) => {
    updateProjectWithHistory((prev) => ({
      ...prev,
      quickCopy: {
        ...prev.quickCopy,
        [roleKey]: value,
      },
      scenes: prev.scenes.map((sc) => ({
        ...sc,
        layers: sc.layers.map((l) =>
          l.type === 'text' && l.role === roleKey ? { ...l, text: value } : l
        ),
      })),
    }));
  };

  const handleEnableQuickEdit = () => {
    updateProjectWithHistory((prev) => ({
      ...prev,
      quickEditLinked: true,
    }));
  };

  // Apply Poster Layout Blueprint
  const handleApplyPosterLayout = (blueprint) => {
    const dim = ASPECT_RATIOS[project.ratio] || ASPECT_RATIOS['4:5'];
    const sx = dim.width / 1080;
    const sy = dim.height / 1350;

    updateProjectWithHistory((prev) => ({
      ...prev,
      palette: blueprint.bg
        ? [blueprint.bg, blueprint.ink || '#111111', blueprint.accent || '#16a34a', ...(prev.palette || []).slice(3)]
        : prev.palette,
      scenes: prev.scenes.map((sc) => ({
        ...sc,
        bg: blueprint.bg || sc.bg,
        layers: sc.layers.map((l) => {
          if (l.role === 'title') {
            return {
              ...l,
              align: blueprint.titleAlign,
              x: Math.round(blueprint.titlePos.x * sx),
              y: Math.round(blueprint.titlePos.y * sy),
              fontSize: blueprint.titlePos.fontSize,
              color: blueprint.ink || l.color,
            };
          }
          if (l.role === 'subtitle') {
            return {
              ...l,
              align: blueprint.titleAlign,
              x: Math.round(blueprint.subPos.x * sx),
              y: Math.round(blueprint.subPos.y * sy),
              fontSize: blueprint.subPos.fontSize,
              color: blueprint.ink || l.color,
            };
          }
          if (l.role === 'date' || l.role === 'cta') {
            return {
              ...l,
              x: Math.round(blueprint.metaPos.x * sx),
              y: Math.round(blueprint.metaPos.y * sy),
              color: blueprint.ink || l.color,
            };
          }
          return l;
        }),
      })),
    }));
  };

  // Apply Graphic Template from LeftSidebar Graphics tab (Screenshots 36 & 37)
  const handleApplyGraphicTemplate = (graphicTpl) => {
    updateProjectWithHistory((prev) => ({
      ...prev,
      palette: [graphicTpl.bg, '#ffffff', ...(graphicTpl.colors || [])],
      scenes: prev.scenes.map((sc, idx) => {
        if (idx !== activeSceneIndex) return sc;
        return {
          ...sc,
          bg: graphicTpl.bg,
          decorStyle: graphicTpl.previewType || graphicTpl.id,
          palette: [graphicTpl.bg, '#ffffff', ...(graphicTpl.colors || [])],
          layers: sc.layers.map((l) =>
            l.type === 'graphic'
              ? {
                  ...l,
                  name: graphicTpl.name,
                  assetId: graphicTpl.previewType || graphicTpl.id,
                  color: graphicTpl.colors?.[0] || l.color,
                  secondaryColor: graphicTpl.colors?.[1] || l.secondaryColor,
                }
              : l
          ),
        };
      }),
    }));
  };

  // Apply Brand Kit from BrandKitsModal (Screenshot 41)
  const handleApplyBrandKit = (kitConfig) => {
    updateProjectWithHistory((prev) => ({
      ...prev,
      palette: kitConfig.applyGraphicPalette
        ? [
            kitConfig.paperColor,
            kitConfig.inkColor,
            kitConfig.secondaryColor,
            kitConfig.primaryColor,
            kitConfig.secondaryColor,
            kitConfig.primaryColor,
          ]
        : prev.palette,
      scenes: prev.scenes.map((sc, idx) => {
        if (kitConfig.targetScope === 'scene' && idx !== activeSceneIndex) {
          return sc;
        }
        return {
          ...sc,
          bg: kitConfig.applyPaperColor ? kitConfig.paperColor : sc.bg,
          palette: kitConfig.applyGraphicPalette
            ? [
                kitConfig.paperColor,
                kitConfig.inkColor,
                kitConfig.secondaryColor,
                kitConfig.primaryColor,
                kitConfig.secondaryColor,
                kitConfig.primaryColor,
              ]
            : sc.palette,
          layers: sc.layers.map((l) => {
            if (l.type === 'text') {
              const isHeading = l.role === 'title' || (l.fontSize || 0) >= 60;
              return {
                ...l,
                color: kitConfig.applyTextColors ? kitConfig.inkColor : l.color,
                fontFamily: kitConfig.applyTypefaces
                  ? isHeading
                    ? kitConfig.headingFont
                    : kitConfig.bodyFont
                  : l.fontFamily,
                fontWeight: kitConfig.applyTypefaces
                  ? isHeading
                    ? kitConfig.headingWeight
                    : kitConfig.bodyWeight
                  : l.fontWeight,
              };
            }
            return {
              ...l,
              color: kitConfig.applyGraphicPalette ? kitConfig.secondaryColor : l.color,
            };
          }),
        };
      }),
    }));
  };

  // Apply Motion Template from MotionTemplatesModal
  const handleApplyMotionTemplate = (motionConfig = {}) => {
    if (selectedLayer) {
      handleUpdateLayer(selectedLayer.id, {
        ...motionConfig,
        charAnimate: true,
      });
    } else {
      handleSelectSceneMotionPreset(motionConfig.motionPreset);
    }
  };

  const handleToggleLockSwatch = (idx) => {
    updateProjectWithHistory((prev) => {
      const nextLocks = [...(prev.lockedSwatches || [false, false, false, false, false, false])];
      nextLocks[idx] = !nextLocks[idx];
      return { ...prev, lockedSwatches: nextLocks };
    });
  };

  const handleApplyPalette = (colors, scope = 'scene') => {
    updateProjectWithHistory((prev) => {
      if (scope === 'scene') {
        return {
          ...prev,
          scenes: prev.scenes.map((sc, idx) => {
            if (idx !== activeSceneIndex) return sc;
            return {
              ...sc,
              bg: colors[0],
              palette: [...colors],
              layers: sc.layers.map((l) => {
                if (l.type === 'text') return { ...l, color: colors[1] };
                if (l.type === 'graphic')
                  return { ...l, color: colors[2] || colors[1], secondaryColor: colors[3] || colors[0] };
                return l;
              }),
            };
          }),
        };
      }
      return {
        ...prev,
        palette: [...colors],
        scenes: prev.scenes.map((sc) => ({
          ...sc,
          bg: colors[0],
          palette: [...colors],
          layers: sc.layers.map((l) => {
            if (l.type === 'text') return { ...l, color: colors[1] };
            if (l.type === 'graphic')
              return { ...l, color: colors[2] || colors[1], secondaryColor: colors[3] || colors[0] };
            return l;
          }),
        })),
      };
    });
  };

  // Layer & Scene Mutators
  const handleUpdateLayer = (layerId, patch) => {
    updateProjectWithHistory((prev) => {
      // Find current layer
      const activeSc = prev.scenes[activeSceneIndex];
      const curLayer = activeSc?.layers?.find((l) => l.id === layerId);
      const isRoleText = curLayer?.type === 'text' && curLayer?.role && patch.text !== undefined;
      const shouldSyncAllScenes = isRoleText && (prev.quickEditLinked !== false);

      return {
        ...prev,
        quickCopy: isRoleText
          ? {
              ...prev.quickCopy,
              [curLayer.role]: patch.text,
            }
          : prev.quickCopy,
        scenes: prev.scenes.map((sc, idx) => {
          if (!shouldSyncAllScenes && idx !== activeSceneIndex) {
            return sc;
          }
          return {
            ...sc,
            layers: sc.layers.map((l) => {
              if (idx === activeSceneIndex && l.id === layerId) {
                return { ...l, ...patch };
              }
              if (shouldSyncAllScenes && l.type === 'text' && l.role === curLayer.role) {
                return { ...l, text: patch.text };
              }
              return l;
            }),
          };
        }),
      };
    });
  };

  const handleSelectSceneMotionPreset = (presetId, scope = 'scene') => {
    updateProjectWithHistory((prev) => ({
      ...prev,
      scenes: prev.scenes.map((sc, idx) =>
        (scope !== 'all' && idx !== activeSceneIndex)
          ? sc
          : {
              ...sc,
              motionPreset: presetId,
              layers: sc.layers.map((l) =>
                l.type === 'text' ? { ...l, motionPreset: presetId } : l
              ),
            }
      ),
    }));
  };

  const handleSelectSceneAudio = (trackId, sfxOnEnter = undefined, volumeVal = undefined) => {
    updateProjectWithHistory((prev) =>
      updateSceneAudio(prev, activeSceneIndex, {
        ...(trackId !== undefined && { audioTrackId: trackId }),
        ...(sfxOnEnter !== undefined && { sfxOnEnter }),
        ...(volumeVal !== undefined && { audioVolume: volumeVal }),
      })
    );
    if (trackId && trackId !== 'none' && trackId !== 'mute') {
      const track = DEMO_TRACKS.find((t) => t.id === trackId) || DEMO_TRACKS[0];
      if (track && isPlaying) audioEngineRef.current?.setTrack(track);
    }
    if (sfxOnEnter && sfxOnEnter !== 'none') {
      audioEngineRef.current?.triggerSfx(sfxOnEnter);
    }
  };

  const handleAddTextLayer = (text = 'NEW HEADLINE', fontSize = 96) => {
    const dim = ASPECT_RATIOS[project.ratio] || ASPECT_RATIOS['4:5'];
    const newId = `layer_text_${Date.now()}`;
    const newLayer = {
      id: newId,
      type: 'text',
      role: 'custom',
      name: text.slice(0, 18),
      text,
      fontFamily: "'Space Grotesk', sans-serif",
      fontSize,
      fontWeight: 700,
      lineHeight: 0.95,
      letterSpacing: -1,
      align: 'center',
      color: project.palette?.[1] || '#ffffff',
      x: Math.round(dim.width / 2),
      y: Math.round(dim.height / 2),
      width: 720,
      scale: 1,
      rotation: 0,
      opacity: 1,
      motionPreset: 'kineticWave',
      motionSpeed: 1,
      stagger: 0.04,
      charAnimate: true,
      audioReactive: true,
      audioSignal: 'bass',
      audioTarget: 'scale',
      audioIntensity: 35,
      visible: true,
      locked: false,
      keyframes: [],
    };

    updateProjectWithHistory((prev) => ({
      ...prev,
      scenes: prev.scenes.map((sc, idx) =>
        idx !== activeSceneIndex ? sc : { ...sc, layers: [...sc.layers, newLayer] }
      ),
    }));
    setSelectedLayerId(newId);
  };

  const handleAddGraphicLayer = (assetId, label = 'Graphic') => {
    const dim = ASPECT_RATIOS[project.ratio] || ASPECT_RATIOS['4:5'];
    const newId = `layer_gfx_${Date.now()}`;
    const newLayer = {
      id: newId,
      type: 'graphic',
      name: label,
      assetId,
      x: Math.round(dim.width / 2),
      y: Math.round(dim.height / 2),
      size: 380,
      scale: 1,
      rotation: 0,
      opacity: 0.9,
      color: project.palette?.[2] || '#22c55e',
      secondaryColor: project.palette?.[1] || '#ffffff',
      strokeWidth: 3,
      audioReactive: true,
      audioSignal: 'bass',
      audioTarget: 'scale',
      audioIntensity: 45,
      visible: true,
      locked: false,
      keyframes: [],
    };

    updateProjectWithHistory((prev) => ({
      ...prev,
      scenes: prev.scenes.map((sc, idx) =>
        idx !== activeSceneIndex ? sc : { ...sc, layers: [...sc.layers, newLayer] }
      ),
    }));
    setSelectedLayerId(newId);
  };

  const handleDeleteLayer = (layerId) => {
    updateProjectWithHistory((prev) => ({
      ...prev,
      scenes: prev.scenes.map((sc, idx) =>
        idx !== activeSceneIndex
          ? sc
          : { ...sc, layers: sc.layers.filter((l) => l.id !== layerId) }
      ),
    }));
    if (selectedLayerId === layerId) setSelectedLayerId(null);
  };

  const handleDuplicateLayer = (layerId) => {
    const target = activeScene?.layers?.find((l) => l.id === layerId);
    if (!target) return;
    const copyId = `${target.id}_copy_${Date.now()}`;
    const copyLayer = {
      ...JSON.parse(JSON.stringify(target)),
      id: copyId,
      name: `${target.name} Copy`,
      x: (target.x || 540) + 24,
      y: (target.y || 675) + 24,
    };
    updateProjectWithHistory((prev) => ({
      ...prev,
      scenes: prev.scenes.map((sc, idx) =>
        idx !== activeSceneIndex ? sc : { ...sc, layers: [...sc.layers, copyLayer] }
      ),
    }));
    setSelectedLayerId(copyId);
  };

  const handleMoveLayerOrder = (layerId, direction) => {
    updateProjectWithHistory((prev) => ({
      ...prev,
      scenes: prev.scenes.map((sc, idx) => {
        if (idx !== activeSceneIndex) return sc;
        const list = [...sc.layers];
        const pos = list.findIndex((l) => l.id === layerId);
        if (pos === -1) return sc;
        const swapPos = direction === 'up' ? pos + 1 : pos - 1;
        if (swapPos < 0 || swapPos >= list.length) return sc;
        const temp = list[pos];
        list[pos] = list[swapPos];
        list[swapPos] = temp;
        return { ...sc, layers: list };
      }),
    }));
  };

  const handleAddShapeLayer = (shapeType = 'rectangle', options = {}) => {
    const dim = ASPECT_RATIOS[project.ratio] || ASPECT_RATIOS['4:5'];
    let createdId = null;
    updateProjectWithHistory((prev) => {
      const res = addShapeLayerToScene(prev, activeSceneIndex, shapeType, {
        x: Math.round(dim.width / 2),
        y: Math.round(dim.height / 2),
        fill: project.palette?.[2] || '#159947',
        stroke: project.palette?.[1] || '#22c55e',
        ...options,
      });
      createdId = res.newLayerId;
      return res.project;
    });
    if (createdId) {
      handleSetSelectedLayerId(createdId);
    }
  };

  const handleAddVectorPathLayer = (presetType = 'diamond', options = {}) => {
    const dim = ASPECT_RATIOS[project.ratio] || ASPECT_RATIOS['4:5'];
    let createdId = null;
    updateProjectWithHistory((prev) => {
      const res = addVectorPathLayerToScene(prev, activeSceneIndex, {
        pathType: presetType,
        name: `Vector ${presetType.charAt(0).toUpperCase() + presetType.slice(1)}`,
        x: Math.round(dim.width / 2),
        y: Math.round(dim.height / 2),
        width: 320,
        height: 320,
        fill: project.palette?.[2] || '#159947',
        stroke: project.palette?.[1] || '#22c55e',
        strokeWidth: 4,
        ...options,
      });
      createdId = res.newLayerId;
      return res;
    });
    if (createdId) {
      handleSetSelectedLayerId(createdId);
    }
  };

  const handleAddImageLayer = (imageOptions = {}) => {
    const dim = ASPECT_RATIOS[project.ratio] || ASPECT_RATIOS['4:5'];
    let createdId = null;
    updateProjectWithHistory((prev) => {
      const res = addImageLayerToScene(prev, activeSceneIndex, {
        x: Math.round(dim.width / 2),
        y: Math.round(dim.height / 2),
        ...imageOptions,
      });
      createdId = res.newLayerId;
      return res.project;
    });
    if (createdId) {
      handleSetSelectedLayerId(createdId);
    }
  };

  const handleAlignLayers = (layerIds, alignType) => {
    const dim = ASPECT_RATIOS[project.ratio] || ASPECT_RATIOS['4:5'];
    updateProjectWithHistory((prev) =>
      alignLayersInScene(prev, activeSceneIndex, layerIds, alignType, dim.width, dim.height)
    );
  };

  const handleDistributeLayers = (layerIds, axis) => {
    updateProjectWithHistory((prev) =>
      distributeLayersInScene(prev, activeSceneIndex, layerIds, axis)
    );
  };

  const handleGroupLayers = (layerIds) => {
    updateProjectWithHistory((prev) => {
      const res = groupLayersInScene(prev, activeSceneIndex, layerIds);
      return res.project;
    });
  };

  const handleUngroupLayers = (layerIds) => {
    updateProjectWithHistory((prev) =>
      ungroupLayersInScene(prev, activeSceneIndex, layerIds)
    );
  };

  const handleReorderZ = (layerIds, action) => {
    updateProjectWithHistory((prev) =>
      reorderLayersZ(prev, activeSceneIndex, layerIds, action)
    );
  };

  const handleDeleteSelectedLayers = (layerIds) => {
    updateProjectWithHistory((prev) =>
      deleteLayersFromScene(prev, activeSceneIndex, layerIds)
    );
    handleSetSelectedLayerIds([]);
  };

  const handleDuplicateSelectedLayers = (layerIds) => {
    let duplicated = [];
    updateProjectWithHistory((prev) => {
      const res = duplicateLayersInScene(prev, activeSceneIndex, layerIds);
      duplicated = res.duplicatedIds || [];
      return res.project;
    });
    if (duplicated.length > 0) {
      handleSetSelectedLayerIds(duplicated);
    }
  };

  const handleBatchUpdateLayers = (patchesMap) => {
    updateProjectWithHistory((prev) => ({
      ...prev,
      scenes: prev.scenes.map((sc, idx) => {
        if (idx !== activeSceneIndex) return sc;
        return {
          ...sc,
          layers: (sc.layers || []).map((l) =>
            patchesMap.has(l.id) ? { ...l, ...patchesMap.get(l.id) } : l
          ),
        };
      }),
    }));
  };

  // Scene Management (Hexagonal Architecture Domain Services)
  const handleAddScene = () => {
    updateProjectWithHistory((prev) => addScene(prev, activeSceneIndex));
    setActiveSceneIndex(project.scenes.length);
  };

  const handleDuplicateScene = (idx) => {
    updateProjectWithHistory((prev) => duplicateScene(prev, idx));
  };

  const handleDeleteScene = (idx) => {
    if (project.scenes.length <= 1) return;
    updateProjectWithHistory((prev) => deleteScene(prev, idx));
    setActiveSceneIndex((prev) => Math.max(0, prev - 1));
  };

  const handleUpdateSceneProp = (key, val) => {
    updateProjectWithHistory((prev) => updateSceneProp(prev, activeSceneIndex, key, val));
  };

  const handleChangeFps = (newFps) => {
    updateProjectWithHistory((prev) => ({
      ...prev,
      fps: newFps,
    }));
  };

  // Timeline Keyframe Management
  const handleAddKeyframe = (prop) => {
    if (!selectedLayer) return;
    const rawVal =
      prop === 'posX'
        ? selectedLayer.x
        : prop === 'posY'
        ? selectedLayer.y
        : prop === 'scale'
        ? selectedLayer.scale ?? 1
        : prop === 'rotation'
        ? selectedLayer.rotation ?? 0
        : selectedLayer.opacity ?? 1;

    const defaultVal =
      typeof rawVal === 'number' && Number.isFinite(rawVal)
        ? rawVal
        : prop === 'scale' || prop === 'opacity'
        ? 1
        : 0;

    const kfTime = Number(localTime.toFixed(2));
    const newKf = {
      id: `kf_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      time: kfTime,
      prop,
      value: defaultVal,
      easing: 'easeOutCubic',
      interpolation: 'easeOutCubic',
    };

    const currentKfs = selectedLayer.keyframes || [];
    const existingIdx = currentKfs.findIndex(
      (k) => k.prop === prop && Math.abs(k.time - kfTime) < 0.001
    );

    let nextKfs;
    if (existingIdx >= 0) {
      nextKfs = currentKfs.map((k, idx) =>
        idx === existingIdx ? { ...k, value: defaultVal } : k
      );
    } else {
      nextKfs = [...currentKfs, newKf].sort((a, b) => a.time - b.time);
    }

    handleUpdateLayer(selectedLayer.id, {
      keyframes: nextKfs,
    });
  };

  const handleUpdateKeyframe = (layerId, kfId, patch) => {
    const layer = activeScene?.layers?.find((l) => l.id === layerId);
    if (!layer) return;
    handleUpdateLayer(layerId, {
      keyframes: (layer.keyframes || []).map((k) => (k.id === kfId ? { ...k, ...patch } : k)),
    });
  };

  const handlePasteKeyframes = (layerId, keyframesToPaste, timeOffset = localTime) => {
    const layer = activeScene?.layers?.find((l) => l.id === layerId);
    if (!layer || !keyframesToPaste?.length) return;
    const minOrigTime = Math.min(...keyframesToPaste.map((k) => k.time));
    const shifted = keyframesToPaste.map((k) => ({
      ...k,
      id: `kf_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      time: Math.max(0, Number((timeOffset + (k.time - minOrigTime)).toFixed(2))),
    }));
    handleUpdateLayer(layerId, {
      keyframes: [...(layer.keyframes || []), ...shifted],
    });
  };

  const handleDeleteKeyframe = (layerId, kfId) => {
    const layer = activeScene?.layers?.find((l) => l.id === layerId);
    if (!layer) return;
    handleUpdateLayer(layerId, {
      keyframes: (layer.keyframes || []).filter((k) => k.id !== kfId),
    });
  };

  const handleDuplicateKeyframes = (layerId, keyframeIds) => {
    updateProjectWithHistory((prev) =>
      duplicateKeyframesInLayer(prev, activeSceneIndex, layerId, keyframeIds, 0.5)
    );
  };

  const handleClearLayerKeyframes = (layerId) => {
    handleUpdateLayer(layerId, { keyframes: [] });
  };

  const handleAddMarker = (markerData) => {
    updateProjectWithHistory((prev) =>
      addMarkerToScene(prev, activeSceneIndex, markerData)
    );
  };

  const handleDeleteMarker = (markerId) => {
    updateProjectWithHistory((prev) =>
      deleteMarkerFromScene(prev, activeSceneIndex, markerId)
    );
  };

  // Custom Font & Image Upload
  const handleUploadCustomFont = async (file) => {
    try {
      const fontName = file.name.replace(/\.[^/.]+$/, '');
      const buffer = await file.arrayBuffer();
      const face = new FontFace(fontName, buffer);
      await face.load();
      document.fonts.add(face);
      const fontEntry = {
        id: `custom_${Date.now()}`,
        name: fontName,
        family: `'${fontName}', sans-serif`,
        category: 'Custom',
      };
      setCustomFonts((prev) => [...prev, fontEntry]);
      if (selectedLayer?.type === 'text') {
        handleUpdateLayer(selectedLayer.id, { fontFamily: fontEntry.family });
      }
    } catch (err) {
      console.error('Failed to load custom font:', err);
    }
  };

  const handleUploadCustomImage = async (file) => {
    try {
      const assetRecord = await importLocalFileToAsset(file);
      const url = assetRecord.dataUrl || URL.createObjectURL(file);
      const img = new window.Image();
      img.onload = () => {
        const dim = ASPECT_RATIOS[project.ratio] || ASPECT_RATIOS['4:5'];
        const aspect = (img.naturalWidth || 300) / (img.naturalHeight || 300);
        const w = 400;
        const h = Math.round(400 / aspect);

        if (selectedLayer && (selectedLayer.type === 'graphic' || selectedLayer.type === 'image')) {
          handleUpdateLayer(selectedLayer.id, {
            type: 'image',
            customImageElement: img,
            assetId: assetRecord.id,
            src: url,
            name: file.name.slice(0, 24),
            width: w,
            height: h,
          });
        } else {
          updateProjectWithHistory((prev) => {
            const withAsset = registerAssetInProject(prev, assetRecord);
            const res = addImageLayerToScene(withAsset, activeSceneIndex, {
              name: file.name.slice(0, 24),
              assetId: assetRecord.id,
              src: url,
              width: w,
              height: h,
              x: Math.round(dim.width / 2),
              y: Math.round(dim.height / 2),
              customImageElement: img,
            });
            handleSetSelectedLayerId(res.newLayerId);
            return res.project;
          });
        }
      };
      img.src = url;
    } catch (err) {
      console.error('Failed to import local image asset:', err);
    }
  };

  // Audio Handlers
  const handleSelectTrack = (trackId) => {
    updateProjectWithHistory((prev) => ({
      ...prev,
      audioTrackId: trackId,
      customAudioName: null,
    }));
    const track = DEMO_TRACKS.find((t) => t.id === trackId) || DEMO_TRACKS[0];
    audioEngineRef.current?.setTrack(track);
  };

  const handleUploadAudioFile = async (file) => {
    setAudioImportError(null);
    const validation = validateAudioFile(file);
    if (!validation.valid) {
      setAudioImportError(validation.error);
      return;
    }

    setAudioImportProgress(10);
    setAudioImportStatus(`Reading ${file.name}...`);

    try {
      const reader = new FileReader();
      audioFileReaderRef.current = reader;

      const arrayBuffer = await new Promise((resolve, reject) => {
        reader.onprogress = (e) => {
          if (e.lengthComputable) {
            const pct = Math.round((e.loaded / e.total) * 35) + 10;
            setAudioImportProgress(pct);
          }
        };
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Failed to read audio file from disk'));
        reader.onabort = () => reject(new Error('Import cancelled by user'));
        reader.readAsArrayBuffer(file);
      });

      setAudioImportProgress(50);
      setAudioImportStatus('Decoding audio samples with Web Audio API...');

      const assetId = `asset_audio_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const decodedBuffer = await audioEngineRef.current?.loadClipAudioBuffer(assetId, arrayBuffer);

      if (!decodedBuffer) {
        throw new Error('Web Audio decoder could not process this audio format');
      }

      setAudioImportProgress(80);
      setAudioImportStatus('Generating downsampled waveform peak cache...');

      const peaks = extractWaveformPeaks(decodedBuffer, 120);

      const assetRecord = createAssetRecord({
        id: assetId,
        type: 'audio',
        name: file.name,
        size: file.size,
        format: validation.format,
        duration: decodedBuffer.duration,
        sampleRate: decodedBuffer.sampleRate,
        channels: decodedBuffer.numberOfChannels,
      });

      setAudioImportProgress(95);
      setAudioImportStatus('Attaching clip to audio track...');

      updateProjectWithHistory((prev) => {
        let withAsset = registerAssetInProject(prev, assetRecord);
        let tracks = withAsset.audioTracks || [];
        if (tracks.length === 0) {
          tracks = [createAudioTrack({}, 'Audio Track 1')];
          withAsset = { ...withAsset, audioTracks: tracks };
        }
        const targetTrackId = tracks[0].id;
        const clipData = {
          assetId,
          name: file.name,
          trackTime: localTime || 0,
          trimIn: 0,
          trimOut: decodedBuffer.duration,
          duration: decodedBuffer.duration,
          waveformPeaks: peaks,
        };
        const updated = addAudioClipToTrackInProject(withAsset, targetTrackId, clipData);
        if (isPlaying) {
          audioEngineRef.current?.scheduleClipPlayback(updated.audioTracks, localTime);
        }
        return updated;
      });

      setAudioImportProgress(100);
      setAudioImportStatus('Import complete!');
      setTimeout(() => {
        setAudioImportProgress(null);
        setAudioImportStatus('');
      }, 500);
    } catch (err) {
      if (err.message !== 'Import cancelled by user') {
        setAudioImportError(err.message || 'An error occurred during audio import');
      }
      setAudioImportProgress(null);
      setAudioImportStatus('');
    } finally {
      audioFileReaderRef.current = null;
    }
  };

  const handleCancelImport = () => {
    if (audioFileReaderRef.current) {
      audioFileReaderRef.current.abort();
      audioFileReaderRef.current = null;
    }
    setAudioImportProgress(null);
    setAudioImportStatus('');
  };

  const handleGenerateTestTone = async () => {
    setAudioImportError(null);
    try {
      const tone = generateSyntheticTestAudio(440, 3.0, 48000);
      const assetId = `asset_tone_440hz_${Date.now()}`;
      await audioEngineRef.current?.loadClipAudioBuffer(assetId, tone.buffer);

      const assetRecord = createAssetRecord({
        id: assetId,
        type: 'audio',
        name: '440Hz Concert A (3.0s Sine)',
        size: tone.buffer.byteLength,
        format: 'WAV',
        duration: tone.duration,
        sampleRate: tone.sampleRate,
        channels: tone.channels,
      });

      updateProjectWithHistory((prev) => {
        let withAsset = registerAssetInProject(prev, assetRecord);
        let tracks = withAsset.audioTracks || [];
        if (tracks.length === 0) {
          tracks = [createAudioTrack({}, 'Audio Track 1')];
          withAsset = { ...withAsset, audioTracks: tracks };
        }
        const targetTrackId = tracks[0].id;
        const clipData = {
          assetId,
          name: '440Hz Concert A (3.0s Sine)',
          trackTime: localTime || 0,
          trimIn: 0,
          trimOut: 3.0,
          duration: 3.0,
          waveformPeaks: tone.peaks,
        };
        const updated = addAudioClipToTrackInProject(withAsset, targetTrackId, clipData);
        if (isPlaying) {
          audioEngineRef.current?.scheduleClipPlayback(updated.audioTracks, localTime);
        }
        return updated;
      });
    } catch (err) {
      setAudioImportError(`Failed to generate test tone: ${err.message}`);
    }
  };

  const handleGenerateSynthNote = async (synthConfig = {}) => {
    setAudioImportError(null);
    try {
      const note = synthesizeSynthNoteBuffer(synthConfig, 48000);
      const assetId = `asset_synth_${(note.note || 'a4').toLowerCase()}_${Date.now()}`;
      await audioEngineRef.current?.loadClipAudioBuffer(assetId, note.buffer);

      // Play immediate auditory feedback preview
      audioEngineRef.current?.triggerSynthNote?.(synthConfig);

      const assetRecord = createAssetRecord({
        id: assetId,
        type: 'audio',
        name: `Synth Note ${note.note} (${note.waveform} · ADSR)`,
        size: note.buffer.byteLength,
        format: 'WAV',
        duration: note.duration,
        sampleRate: note.sampleRate,
        channels: note.channels,
      });

      updateProjectWithHistory((prev) => {
        let withAsset = registerAssetInProject(prev, assetRecord);
        let tracks = withAsset.audioTracks || [];
        if (tracks.length === 0) {
          tracks = [createAudioTrack({}, 'Audio Track 1')];
          withAsset = { ...withAsset, audioTracks: tracks };
        }
        const targetTrackId = tracks[0].id;
        const clipData = {
          assetId,
          name: `Synth ${note.note} (${note.waveform})`,
          trackTime: localTime || 0,
          trimIn: 0,
          trimOut: note.duration,
          duration: note.duration,
          waveformPeaks: note.peaks,
        };
        const updated = addAudioClipToTrackInProject(withAsset, targetTrackId, clipData);
        if (isPlaying) {
          audioEngineRef.current?.scheduleClipPlayback(updated.audioTracks, localTime);
        }
        return updated;
      });
    } catch (err) {
      console.error('Failed to generate synth note:', err);
      setAudioImportError(`Failed to generate synth note: ${err.message}`);
    }
  };


  const handleRelinkClipAudio = async (clipId, file) => {
    setAudioImportError(null);
    const validation = validateAudioFile(file);
    if (!validation.valid) {
      setAudioImportError(validation.error);
      return;
    }
    try {
      const arrayBuffer = await file.arrayBuffer();
      let targetAssetId = null;
      for (const t of project.audioTracks || []) {
        const found = (t.clips || []).find((c) => c.id === clipId);
        if (found) {
          targetAssetId = found.assetId;
          break;
        }
      }
      if (!targetAssetId) return;

      const decoded = await audioEngineRef.current?.loadClipAudioBuffer(targetAssetId, arrayBuffer);
      if (decoded) {
        setProject((prev) => ({ ...prev }));
      }
    } catch (err) {
      setAudioImportError(`Failed to relink audio file: ${err.message}`);
    }
  };

  const handleAddAudioTrack = () => {
    updateProjectWithHistory((prev) => addAudioTrackToProject(prev));
  };

  const handleDeleteAudioTrack = (trackId) => {
    updateProjectWithHistory((prev) => deleteAudioTrackFromProject(prev, trackId));
  };

  const handleUpdateAudioTrack = (trackId, patch) => {
    updateProjectWithHistory((prev) => {
      const next = updateAudioTrackInProject(prev, trackId, patch);
      if (isPlaying) {
        audioEngineRef.current?.scheduleClipPlayback(next.audioTracks || [], localTime);
      }
      return next;
    });
  };

  const handleUpdateAudioClip = (clipId, patch) => {
    updateProjectWithHistory((prev) => {
      const next = updateAudioClipInProject(prev, clipId, patch);
      if (isPlaying) {
        audioEngineRef.current?.scheduleClipPlayback(next.audioTracks || [], localTime);
      }
      return next;
    });
  };

  const handleTrimAudioClip = (clipId, trimIn, trimOut) => {
    updateProjectWithHistory((prev) => {
      const next = trimAudioClipInProject(prev, clipId, trimIn, trimOut);
      if (isPlaying) {
        audioEngineRef.current?.scheduleClipPlayback(next.audioTracks || [], localTime);
      }
      return next;
    });
  };

  const handleSplitAudioClip = (clipId, splitTime) => {
    updateProjectWithHistory((prev) => {
      const next = splitAudioClipInProject(prev, clipId, splitTime);
      if (isPlaying) {
        audioEngineRef.current?.scheduleClipPlayback(next.audioTracks || [], localTime);
      }
      return next;
    });
  };

  const handleDeleteAudioClip = (clipId) => {
    updateProjectWithHistory((prev) => {
      const next = deleteAudioClipFromProject(prev, clipId);
      if (isPlaying) {
        audioEngineRef.current?.scheduleClipPlayback(next.audioTracks || [], localTime);
      }
      return next;
    });
  };

  // Video Track & Clip Handlers (Fase 7)
  const handleAddVideoTrack = (name) => {
    updateProjectWithHistory((prev) => addVideoTrackToProject(prev, name));
  };

  const handleDeleteVideoTrack = (trackId) => {
    updateProjectWithHistory((prev) => deleteVideoTrackFromProject(prev, trackId));
  };

  const handleUpdateVideoTrack = (trackId, patch) => {
    updateProjectWithHistory((prev) => updateVideoTrackInProject(prev, trackId, patch));
  };

  const handleAddVideoClip = (trackId, clipData) => {
    updateProjectWithHistory((prev) => addVideoClipToTrackInProject(prev, trackId, clipData));
  };

  const handleUpdateVideoClip = (clipId, patch) => {
    updateProjectWithHistory((prev) => updateVideoClipInProject(prev, clipId, patch));
  };

  const handleSplitVideoClip = (clipId, splitTime) => {
    updateProjectWithHistory((prev) => splitVideoClipInProject(prev, clipId, splitTime));
  };

  const handleTrimVideoClip = (clipId, trimIn, trimOut) => {
    updateProjectWithHistory((prev) => trimVideoClipInProject(prev, clipId, trimIn, trimOut));
  };

  const handleRippleDeleteVideoClip = (clipId) => {
    updateProjectWithHistory((prev) => rippleDeleteVideoClipInProject(prev, clipId));
  };

  const handleUpdateClipTransform = (clipId, transformPatch) => {
    updateProjectWithHistory((prev) => updateVideoClipTransformInProject(prev, clipId, transformPatch));
  };

  const handleUpdateClipCrop = (clipId, cropPatch) => {
    updateProjectWithHistory((prev) => updateVideoClipCropInProject(prev, clipId, cropPatch));
  };

  const handleSetClipTransition = (clipId, edge, transition) => {
    updateProjectWithHistory((prev) => setVideoClipTransitionInProject(prev, clipId, edge, transition));
  };

  const handleUpdateClipCaptions = (clipId, captions) => {
    updateProjectWithHistory((prev) => updateVideoClipCaptionsInProject(prev, clipId, captions));
  };

  const handleForgetCustomAudio = () => {
    updateProjectWithHistory((prev) => ({
      ...prev,
      customAudioName: null,
    }));
    const track =
      DEMO_TRACKS.find((t) => t.id === project.audioTrackId) || DEMO_TRACKS[0];
    audioEngineRef.current?.setTrack(track);
  };

  const handleToggleMic = async () => {
    if (micActive) {
      audioEngineRef.current?.disableMicrophone();
      setMicActive(false);
    } else {
      const ok = await audioEngineRef.current?.enableMicrophone();
      if (ok) {
        setMicActive(true);
        setIsPlaying(true);
      }
    }
  };

  const handleToggleMute = () => {
    setIsMuted((prev) => {
      const next = !prev;
      audioEngineRef.current?.setMuted(next);
      return next;
    });
  };

  const handleChangeVolume = (val) => {
    setVolume(val);
    setIsMuted(val === 0);
    audioEngineRef.current?.setVolume(val);
  };

  // Animos 3D Showcase & Media Slots Handlers
  const handleUpdateShowcase = (patch, scope = 'scene') => {
    updateProjectWithHistory((prev) =>
      updateShowcaseConfig(prev, activeSceneIndex, patch, scope === 'all')
    );
    // Auto start playback if paused so the user immediately sees the 3D motion preview!
    if (!isPlaying && patch.templateId && patch.templateId !== 'none') {
      setIsPlaying(true);
      const targetTrackId = activeScene?.audioTrackId || project.audioTrackId || 'funk';
      const track =
        DEMO_TRACKS.find((t) => t.id === targetTrackId) || DEMO_TRACKS[0];
      audioEngineRef.current?.start(track);
    }
  };

  const handleUploadMediaSlots = (files, scope = 'scene') => {
    files.forEach((file) => {
      const url = URL.createObjectURL(file);
      const img = new window.Image();
      img.onload = () => {
        const newSlot = {
          id: `slot_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          title: file.name.replace(/\.[^/.]+$/, '').slice(0, 18),
          subtitle: 'UPLOADED MEDIA',
          imageElement: img,
        };
        updateProjectWithHistory((prev) => {
          if (scope === 'all') {
            const nextGlobal = [...(prev.mediaSlots || []), newSlot];
            return {
              ...prev,
              mediaSlots: nextGlobal,
              scenes: prev.scenes.map((sc) => ({
                ...sc,
                mediaSlots: [...(sc.mediaSlots || []), newSlot],
              })),
            };
          }
          return {
            ...prev,
            scenes: prev.scenes.map((sc, idx) =>
              idx !== activeSceneIndex
                ? sc
                : { ...sc, mediaSlots: [...(sc.mediaSlots || []), newSlot] }
            ),
          };
        });
      };
      img.src = url;
    });
  };

  const handleClearMediaSlots = (scope = 'scene') => {
    updateProjectWithHistory((prev) => {
      if (scope === 'all') {
        return {
          ...prev,
          mediaSlots: [],
          scenes: prev.scenes.map((sc) => ({ ...sc, mediaSlots: [] })),
        };
      }
      return {
        ...prev,
        scenes: prev.scenes.map((sc, idx) =>
          idx !== activeSceneIndex ? sc : { ...sc, mediaSlots: [] }
        ),
      };
    });
  };

  // EffectCraft Procedural Shader & Post-Processing FX Rack Handlers
  const handleUpdateShaderBg = (shaderId, scope = 'scene') => {
    updateProjectWithHistory((prev) =>
      updateSceneDesign(prev, activeSceneIndex, { shaderBg: shaderId }, scope === 'all')
    );
  };

  const handleToggleFxRack = (fxId, scope = 'scene') => {
    const fxDef = EFFECTCRAFT_FX_RACK.find((f) => f.id === fxId);
    updateProjectWithHistory((prev) => {
      const targetScene = prev.scenes[activeSceneIndex];
      const sourceFx = (scope === 'all' ? prev.fxRack : targetScene?.fxRack) || {};
      const current = sourceFx[fxId] || {
        enabled: false,
        intensity: fxDef?.defaultIntensity ?? 50,
        secondary: fxDef?.defaultSecondary ?? 50,
        audioReactive: false,
        audioBand: 'bass',
      };
      const patched = { [fxId]: { ...current, enabled: !current.enabled } };
      return updateSceneDesign(prev, activeSceneIndex, { fxRack: patched }, scope === 'all');
    });
  };

  const handleUpdateFxParam = (fxId, patch, scope = 'scene') => {
    const fxDef = EFFECTCRAFT_FX_RACK.find((f) => f.id === fxId);
    updateProjectWithHistory((prev) => {
      const targetScene = prev.scenes[activeSceneIndex];
      const sourceFx = (scope === 'all' ? prev.fxRack : targetScene?.fxRack) || {};
      const current = sourceFx[fxId] || {
        enabled: true,
        intensity: fxDef?.defaultIntensity ?? 50,
        secondary: fxDef?.defaultSecondary ?? 50,
        audioReactive: false,
        audioBand: 'bass',
      };
      const patched = { [fxId]: { ...current, ...patch } };
      return updateSceneDesign(prev, activeSceneIndex, { fxRack: patched }, scope === 'all');
    });
  };

  // Master Sound DSP & Live Event SFX Triggers
  const handleUpdateAudioDsp = (patch) => {
    updateProjectWithHistory((prev) => {
      const nextDsp = { ...(prev.audioDsp || {}), ...patch };
      audioEngineRef.current?.setDspParams(nextDsp);
      return {
        ...prev,
        audioDsp: nextDsp,
      };
    });
  };

  // Fase 8 Layout Overrides Handler
  const handleSetLayerFormatOverride = (layerId, formatRatio, layoutPatch) => {
    updateProjectWithHistory((prev) => {
      const activeSc = prev.scenes[activeSceneIndex];
      if (!activeSc) return prev;
      return setLayerFormatOverrideInProject(prev, activeSc.id, layerId, formatRatio, layoutPatch);
    });
  };

  const handleRemoveLayerFormatOverride = (layerId, formatRatio) => {
    updateProjectWithHistory((prev) => {
      const activeSc = prev.scenes[activeSceneIndex];
      if (!activeSc) return prev;
      return removeLayerFormatOverrideInProject(prev, activeSc.id, layerId, formatRatio);
    });
  };

  const handleTriggerSfx = (sfxId) => {
    audioEngineRef.current?.triggerSoundEffect(sfxId);
  };

  // Export & Project Persistence
  const handleExportPNG = async (options = {}) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ratioToUse = options.ratioOverride || options.ratio || project.ratio;
    const scaleFactor = options.resolutionScale === 'double' ? 2 : options.resolutionScale === 'half' ? 0.5 : 1;
    const isTransparent = Boolean(options.transparentBg);

    // Sequence Export (ZIP / numbered frames)
    if (options.format === 'zip') {
      try {
        setIsRecording(true);
        setExportProgress(0);
        const seqFps = options.fps || project.fps || 30;
        const res = await renderPngSequence({
          project,
          sceneIndex: activeSceneIndex,
          rangeIn: options.rangeIn || 0,
          rangeOut: options.rangeOut || (activeScene?.duration || 4),
          fps: seqFps,
          ratio: ratioToUse,
          scaleFactor,
          transparentBg: isTransparent,
          onProgress: ({ progress }) => setExportProgress(progress),
        });

        // Trigger download for the primary representative frame
        if (res.frames.length > 0) {
          const firstFrame = res.frames[0];
          const a = document.createElement('a');
          a.href = firstFrame.dataUrl;
          a.download = `${project.name.toLowerCase().replace(/\s+/g, '-')}-seq-frame-00001.png`;
          a.click();
        }
      } catch (err) {
        console.error('Sequence export error:', err);
      } finally {
        setIsRecording(false);
        setExportProgress(0);
      }
      return;
    }

    // Still Frame Export
    if (scaleFactor === 1 && !options.ratioOverride && !isTransparent) {
      const url = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project.name.toLowerCase().replace(/\s+/g, '-')}-${ratioToUse.replace(':', 'x')}.png`;
      a.click();
      return;
    }

    // Render scaled or ratio-overridden export canvas
    const targetDim = ASPECT_RATIOS[ratioToUse] || ASPECT_RATIOS['4:5'];
    const outW = Math.round(targetDim.width * scaleFactor);
    const outH = Math.round(targetDim.height * scaleFactor);
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = outW;
    exportCanvas.height = outH;
    const exportCtx = exportCanvas.getContext('2d');
    exportCtx.scale(scaleFactor, scaleFactor);

    if (isTransparent) {
      exportCtx.clearRect(0, 0, targetDim.width, targetDim.height);
    }

    renderSceneToCanvas({
      ctx: exportCtx,
      width: targetDim.width,
      height: targetDim.height,
      scene: activeScene,
      localTime,
      audioSignals,
      selectedLayerId: null,
      showGrid: false,
      showSafeGuides: false,
      project,
    });

    const url = exportCanvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.name.toLowerCase().replace(/\s+/g, '-')}-${ratioToUse.replace(':', 'x')}${scaleFactor !== 1 ? `@${scaleFactor}x` : ''}${isTransparent ? '-transparent' : ''}.png`;
    a.click();
  };

  const handleExportAudio = (options = {}) => {
    try {
      const sampleRate = options.audioSampleRate || 48000;
      const duration = options.rangeOut && options.rangeIn !== undefined
        ? Math.max(0.5, options.rangeOut - options.rangeIn)
        : (activeScene?.duration || 4);
      const numSamples = Math.floor(sampleRate * duration);

      // Generate synthesized 2-channel stereo audio PCM
      const left = new Float32Array(numSamples);
      const right = new Float32Array(numSamples);
      const bpm = project.bpm || 120;
      const beatInterval = 60 / bpm;

      for (let i = 0; i < numSamples; i++) {
        const t = i / sampleRate;
        const beatPos = (t % beatInterval) / beatInterval;
        const env = Math.exp(-beatPos * 9);
        const wave = Math.sin(2 * Math.PI * 220 * t) * 0.45 * env;
        left[i] = wave;
        right[i] = wave;
      }

      const { blob } = encodeWavPcm({
        channelData: [left, right],
        sampleRate,
      });

      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${project.name.toLowerCase().replace(/\s+/g, '-')}-audio.wav`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Audio export error:', err);
    }
  };

  const handleBatchEnqueue = (ratios = ['4:5', '1:1', '9:16'], baseOptions = {}) => {
    const items = createBatchVariantItems(project, ratios, baseOptions);
    setExportQueue((prev) => [...prev, ...items]);
  };

  const handleCancelQueueItem = (itemId) => {
    setExportQueue((prev) => cancelExportItem(prev, itemId));
  };

  const handleRetryQueueItem = (itemId) => {
    setExportQueue((prev) => retryExportItem(prev, itemId));
  };

  const handleExportJSON = (targetProject = project) => {
    const jsonStr = serializeProject(targetProject);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(targetProject.name || 'project').toLowerCase().replace(/\s+/g, '-')}_v${CURRENT_SCHEMA_VERSION}.clovermotion.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportProjectJson = async (file) => {
    if (!file) return;
    try {
      const text = await file.text();
      const imported = deserializeProject(text);
      updateProjectWithHistory(imported);
      setActiveSceneIndex(0);
      setLocalTime(0);
      setProjectSavedStatus('Saved locally');
    } catch (err) {
      console.error('Invalid project JSON:', err);
      alert(`Could not load project: ${err.message}`);
    }
  };

  const handleExportSvg = () => {
    try {
      const svgDoc = exportToSvg(project, activeSceneIndex);
      const blob = new Blob([svgDoc], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project.name.toLowerCase().replace(/\s+/g, '-')}-scene.svg`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('SVG export error:', err);
    }
  };

  const handleExportLottie = () => {
    try {
      const lottieDoc = exportToLottie(project, activeSceneIndex);
      const blob = new Blob([JSON.stringify(lottieDoc, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project.name.toLowerCase().replace(/\s+/g, '-')}-lottie.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Lottie export error:', err);
    }
  };

  const handleExportOtio = () => {
    try {
      const otioDoc = exportToOtio(project);
      const blob = new Blob([JSON.stringify(otioDoc, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project.name.toLowerCase().replace(/\s+/g, '-')}.otio`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('OTIO export error:', err);
    }
  };

  const handleCancelExport = () => {
    if (exportTimerRef.current) {
      clearInterval(exportTimerRef.current);
      exportTimerRef.current = null;
    }
    if (activeRecorderRef.current) {
      try {
        if (activeRecorderRef.current.state === 'recording') {
          activeRecorderRef.current.stop();
        }
        if (activeRecorderRef.current.stream) {
          activeRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
        }
      } catch {}
      activeRecorderRef.current = null;
    }
    setIsRecording(false);
    setExportProgress(0);
    setExportError('Export was cancelled by user.');
    if (isPlaying) handleTogglePlay();
  };

  const handleRetryExport = () => {
    setExportError(null);
    if (exportOptionsRef.current) {
      handleExportVideo(exportOptionsRef.current);
    }
  };

  const handleExportVideo = async (exportOptions = {}) => {
    const canvas = canvasRef.current;
    if (!canvas || isRecording) return;
    exportOptionsRef.current = exportOptions;
    setExportError(null);

    // 1. Run Preflight Inspection before recording (Fase 11)
    const preflight = runExportPreflight({
      project,
      format: exportOptions.format || 'webm',
      ratio: exportOptions.ratio || project.ratio || '4:5',
      fps: exportOptions.fps || project.fps || 30,
      rangeIn: exportOptions.rangeIn || 0,
      rangeOut: exportOptions.rangeOut,
      codec: exportOptions.codec,
      includeAudio: exportOptions.includeAudio,
      transparentBg: exportOptions.transparentBg,
    });

    if (!preflight.passed) {
      setExportError(`Export blocked by preflight errors: ${preflight.errors.join('; ')}`);
      return;
    }

    try {
      const fps = exportOptions.fps || project.fps || 30;
      const canvasStream = canvas.captureStream(fps);
      let combinedStream = canvasStream;

      // Merge Web Audio synthesizer stream if includeAudio is true
      if (exportOptions.includeAudio !== false && audioEngineRef.current) {
        const audioStream = audioEngineRef.current.getAudioStream();
        if (audioStream && audioStream.getAudioTracks().length > 0) {
          const audioTrack = audioStream.getAudioTracks()[0];
          combinedStream = new MediaStream([
            ...canvasStream.getVideoTracks(),
            audioTrack,
          ]);
        }
      }

      const mimeType = exportOptions.codec && MediaRecorder.isTypeSupported(exportOptions.codec)
        ? exportOptions.codec
        : MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : 'video/webm';

      const recorder = new MediaRecorder(combinedStream, { mimeType });
      activeRecorderRef.current = recorder;
      const chunks = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };

      recorder.onerror = (e) => {
        console.error('MediaRecorder error:', e);
        setExportError(e.error?.message || 'MediaRecorder failed during video encoding');
        setIsRecording(false);
        setExportProgress(0);
        activeRecorderRef.current = null;
      };

      recorder.onstop = async () => {
        if (chunks.length === 0) {
          setIsRecording(false);
          setExportProgress(0);
          activeRecorderRef.current = null;
          return;
        }

        const blob = new Blob(chunks, { type: mimeType });
        const sha256 = await computeBufferHash(blob);
        const receipt = generateExportManifest({
          project,
          exportOptions,
          fileSizeBytes: blob.size,
          sha256,
          preflightSummary: preflight,
        });

        setLastExportReceipt(receipt);

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const ext = exportOptions.format === 'mp4' ? 'mp4' : 'webm';
        a.download = receipt.filename || `${project.name.toLowerCase().replace(/\s+/g, '-')}.${ext}`;
        a.click();
        URL.revokeObjectURL(url);

        setIsRecording(false);
        setExportProgress(1.0);
        activeRecorderRef.current = null;
      };

      const exportScope = exportOptions.exportScope || playbackScope;
      let totalSeconds = 4;
      if (exportOptions.rangeOut && exportOptions.rangeIn !== undefined) {
        totalSeconds = Math.max(0.5, exportOptions.rangeOut - exportOptions.rangeIn);
      } else {
        const isExportAll = exportScope === 'all' && (project.scenes?.length || 1) > 1;
        totalSeconds = isExportAll
          ? getGlobalProjectDuration(project.scenes)
          : (activeScene?.duration || 4);
      }
      const totalMs = totalSeconds * 1000;

      setIsRecording(true);
      if (exportScope === 'all') {
        setActiveSceneIndex(0);
      }
      setLocalTime(exportOptions.rangeIn || 0);
      if (!isPlaying) handleTogglePlay();
      recorder.start();

      const startTs = performance.now();
      exportTimerRef.current = setInterval(() => {
        const elapsed = performance.now() - startTs;
        setExportProgress(Math.min(1, elapsed / totalMs));
        if (elapsed >= totalMs) {
          if (exportTimerRef.current) {
            clearInterval(exportTimerRef.current);
            exportTimerRef.current = null;
          }
          if (recorder.state === 'recording') recorder.stop();
        }
      }, 100);
    } catch (err) {
      console.error('Video export error:', err);
      setExportError(err.message || 'Video export initialization failed');
      setIsRecording(false);
      activeRecorderRef.current = null;
    }
  };

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-[#0e0e0e] text-neutral-100">
      {/* Top Studio Header Bar */}
      <TopHeaderBar
        project={project}
        projectSavedStatus={projectSavedStatus}
        showReadyBanner={showReadyBanner}
        onDismissReadyBanner={() => setShowReadyBanner(false)}
        editorMode={editorMode}
        setEditorMode={setEditorMode}
        advancedSubMode={advancedSubMode}
        setAdvancedSubMode={setAdvancedSubMode}
        leftDrawerOpen={leftDrawerOpen}
        onToggleLeftDrawer={() => setLeftDrawerOpen((v) => !v)}
        rightPanelOpen={rightPanelOpen}
        onToggleRightPanel={() => setRightPanelOpen((v) => !v)}
        onResetWorkspaceLayout={handleResetWorkspaceLayout}
        isFocusMode={isFocusMode}
        onToggleFocusMode={handleToggleFocusMode}
        onOpenTemplates={() => {
          setTemplateLibraryInitialTab('templates');
          setTemplatesModalOpen(true);
        }}
        onOpenNewPoster={() => {
          setTemplateLibraryInitialTab('posters');
          setTemplatesModalOpen(true);
        }}
        onOpenBrandKits={() => setBrandKitsOpen(true)}
        onOpenMotionTemplates={() => setMotionTemplatesOpen(true)}
        onSaveProject={handleSaveCurrentProject}
        onSaveAsTemplate={handleSaveAsTemplate}
        onNewProject={handleNewProject}
        onDownloadProjectJson={handleExportJSON}
        onImportProjectJson={handleImportProjectJson}
        canUndo={history.length > 0}
        canRedo={future.length > 0}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onOpenFullscreen={() => setFullscreenOpen(true)}
        onOpenFormatReview={() => setFormatReviewOpen(true)}
        onOpenExport={() => setExportModalOpen(true)}
        onOpenMyProjects={() => setMyProjectsOpen(true)}
        onOpenHelp={() => setHelpOpen(true)}
        onSaveAs={handleSaveAsProject}
      />

      {/* Crash Recovery Notification Toast Banner */}
      {recoveredSession && (
        <div className="absolute left-1/2 -translate-x-1/2 top-14 z-50 flex items-center gap-3 px-4 py-2.5 rounded-xl bg-[#1c1c1c] border border-amber-500/50 text-xs text-neutral-200 shadow-2xl animate-fade-in">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
          <span>
            Crash recovery session found for &ldquo;<strong className="text-white">{recoveredSession.projectName}</strong>&rdquo;
          </span>
          <button
            type="button"
            onClick={() => {
              updateProjectWithHistory(recoveredSession.project);
              setRecoveredSession(null);
              clearRecoveryJournal();
            }}
            className="px-2.5 py-1 rounded-lg bg-[#159947] hover:bg-[#19b353] text-white font-semibold text-[11px] transition-colors"
          >
            Restore Session
          </button>
          <button
            type="button"
            onClick={() => {
              setRecoveredSession(null);
              clearRecoveryJournal();
            }}
            className="px-2 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white text-[11px] transition-colors"
          >
            Discard
          </button>
        </div>
      )}

      {/* Main Studio Workspace Split: Left Sidebar + Center/Right Column */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Full-Height Left Sidebar (Collapsible to 48px icon rail in both modes) */}
        <LeftSidebar
          editorMode={editorMode}
          project={project}
          projectSavedStatus={projectSavedStatus}
          activeScene={activeScene}
          activeSceneIndex={activeSceneIndex}
          setActiveSceneIndex={setActiveSceneIndex}
          selectedLayer={selectedLayer}
          selectedLayerId={selectedLayerId}
          setSelectedLayerId={handleSetSelectedLayerId}
          selectedLayerIds={selectedLayerIds}
          setSelectedLayerIds={handleSetSelectedLayerIds}
          sidebarWidth={leftSidebarWidth}
          leftDrawerOpen={leftDrawerOpen}
          onToggleDrawer={() => setLeftDrawerOpen((v) => !v)}
          onEnsureDrawerOpen={() => setLeftDrawerOpen(true)}
          onUpdateQuickCopy={handleUpdateQuickCopy}
          onEnableQuickEdit={handleEnableQuickEdit}
          onApplyPalette={handleApplyPalette}
          onSelectSceneMotionPreset={handleSelectSceneMotionPreset}
          onAddScene={handleAddScene}
          onDuplicateScene={handleDuplicateScene}
          onDeleteScene={handleDeleteScene}
          onUpdateSceneProp={handleUpdateSceneProp}
          onChangeRatio={handleChangeRatio}
          onAddTextLayer={handleAddTextLayer}
          onAddShapeLayer={handleAddShapeLayer}
          onAddVectorPathLayer={handleAddVectorPathLayer}
          onAddGraphicLayer={handleAddGraphicLayer}
          onApplyGraphicTemplate={handleApplyGraphicTemplate}
          onGroupLayers={handleGroupLayers}
          onUngroupLayers={handleUngroupLayers}
          onReorderZ={handleReorderZ}
          onDeleteSelectedLayers={handleDeleteSelectedLayers}
          onDuplicateSelectedLayers={handleDuplicateSelectedLayers}
          onUpdateLayer={handleUpdateLayer}
          onDeleteLayer={handleDeleteLayer}
          onDuplicateLayer={handleDuplicateLayer}
          onMoveLayerOrder={handleMoveLayerOrder}
          onUploadCustomImage={handleUploadCustomImage}
          onUpdateShowcase={handleUpdateShowcase}
          onUploadMediaSlots={handleUploadMediaSlots}
          onClearMediaSlots={handleClearMediaSlots}
          onUpdateShaderBg={handleUpdateShaderBg}
          onToggleFxRack={handleToggleFxRack}
          onUpdateFxParam={handleUpdateFxParam}
          onSelectSceneAudio={handleSelectSceneAudio}
          onTriggerSfx={handleTriggerSfx}
          onOpenTemplates={() => {
            setTemplateLibraryInitialTab('templates');
            setTemplatesModalOpen(true);
          }}
          onOpenBrandKits={() => setBrandKitsOpen(true)}
          onOpenFormatReview={() => setFormatReviewOpen(true)}
          onTogglePlay={handleTogglePlay}
          onOpenExport={() => setExportModalOpen(true)}
          onOpenHelp={() => setHelpOpen(true)}
          onOpenMyProjects={() => setMyProjectsOpen(true)}
          onSaveProject={handleSaveCurrentProject}
          onNewProject={handleNewProject}
        />

        {/* Left Sidebar Drag-to-Resize Splitter */}
        {leftDrawerOpen && (
          <div
            onPointerDown={handleLeftResizeStart}
            className="w-1.5 hover:w-2 bg-transparent hover:bg-[#22c55e]/50 cursor-col-resize transition-all shrink-0 z-20 group relative flex items-center justify-center select-none"
            title="Drag to resize sidebar width"
          >
            <div className="w-0.5 h-8 rounded-full bg-neutral-700/80 group-hover:bg-[#4ade80]" />
          </div>
        )}

        {/* Right Workspace Column: Workspace Specific View or Canvas + Inspector + Timeline */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
          {editorMode === 'advanced' && advancedSubMode === 'video' ? (
            <VideoWorkspaceView
              project={project}
              activeSceneIndex={activeSceneIndex}
              setActiveSceneIndex={setActiveSceneIndex}
              isPlaying={isPlaying}
              onTogglePlay={handleTogglePlay}
              onRestart={handleRestart}
              localTime={localTime}
              currentGlobalTime={currentGlobalTime}
              totalProjectDuration={totalProjectDuration}
              onSeekLocalTime={(t) => setLocalTime(t)}
              onAddVideoTrack={handleAddVideoTrack}
              onDeleteVideoTrack={handleDeleteVideoTrack}
              onUpdateVideoTrack={handleUpdateVideoTrack}
              onAddVideoClip={handleAddVideoClip}
              onUpdateVideoClip={handleUpdateVideoClip}
              onSplitVideoClip={handleSplitVideoClip}
              onTrimVideoClip={handleTrimVideoClip}
              onRippleDeleteVideoClip={handleRippleDeleteVideoClip}
              onUpdateClipTransform={handleUpdateClipTransform}
              onUpdateClipCrop={handleUpdateClipCrop}
              onSetClipTransition={handleSetClipTransition}
              onUpdateClipCaptions={handleUpdateClipCaptions}
              onSwitchToAnimate={() => setAdvancedSubMode('animate')}
              onOpenFormatReview={() => setFormatReviewOpen(true)}
              onOpenExport={() => setExportModalOpen(true)}
            />
          ) : editorMode === 'advanced' && advancedSubMode === 'audio' ? (
            <AudioWorkspaceView
              project={project}
              activeScene={activeScene}
              isPlaying={isPlaying}
              onTogglePlay={handleTogglePlay}
              onRestart={handleRestart}
              localTime={localTime}
              onSeekLocalTime={(t) => {
                setLocalTime(t);
                if (isPlaying) {
                  audioEngineRef.current?.seekClips(t, project.audioTracks || []);
                }
              }}
              volume={volume}
              isMuted={isMuted}
              micActive={micActive}
              spectrum={spectrum}
              onSelectTrack={handleSelectTrack}
              onSelectSceneAudio={handleSelectSceneAudio}
              onUploadAudioFile={handleUploadAudioFile}
              onForgetCustomAudio={handleForgetCustomAudio}
              onToggleMic={handleToggleMic}
              onToggleMute={handleToggleMute}
              onChangeVolume={handleChangeVolume}
              onUpdateAudioDsp={handleUpdateAudioDsp}
              onTriggerSfx={handleTriggerSfx}
              onReturnToCanvas={() => setAdvancedSubMode('animate')}
              audioEngineRef={audioEngineRef}
              onAddAudioTrack={handleAddAudioTrack}
              onDeleteAudioTrack={handleDeleteAudioTrack}
              onUpdateAudioTrack={handleUpdateAudioTrack}
              onUpdateAudioClip={handleUpdateAudioClip}
              onTrimAudioClip={handleTrimAudioClip}
              onSplitAudioClip={handleSplitAudioClip}
              onDeleteAudioClip={handleDeleteAudioClip}
              onGenerateTestTone={handleGenerateTestTone}
              onGenerateSynthNote={handleGenerateSynthNote}
              onRelinkClipAudio={handleRelinkClipAudio}
              importProgress={audioImportProgress}
              importStatusText={audioImportStatus}
              importError={audioImportError}
              onCancelImport={handleCancelImport}
              onClearImportError={() => setAudioImportError(null)}
            />
          ) : (
            <>
              <div className="flex-1 flex min-h-0 overflow-hidden">
                <CanvasViewport
                  canvasRef={canvasRef}
                  project={project}
                  activeScene={activeScene}
                  activeSceneIndex={activeSceneIndex}
                  setActiveSceneIndex={setActiveSceneIndex}
                  localTime={localTime}
                  isPlaying={isPlaying}
                  audioSignals={audioSignals}
                  selectedLayerId={selectedLayerId}
                  setSelectedLayerId={handleSetSelectedLayerId}
                  selectedLayerIds={selectedLayerIds}
                  setSelectedLayerIds={handleSetSelectedLayerIds}
                  onUpdateLayer={handleUpdateLayer}
                  onBatchUpdateLayers={handleBatchUpdateLayers}
                  showGrid={showGrid}
                  setShowGrid={setShowGrid}
                  showSafeGuides={showSafeGuides}
                  setShowSafeGuides={setShowSafeGuides}
                  editorMode={editorMode}
                  onChangeRatio={handleChangeRatio}
                  onGeneratePalette={handleGeneratePalette}
                  onToggleLockSwatch={handleToggleLockSwatch}
                  onAddScene={handleAddScene}
                  playbackScope={playbackScope}
                  setPlaybackScope={setPlaybackScope}
                  totalProjectDuration={totalProjectDuration}
                  currentGlobalTime={currentGlobalTime}
                  isFocusMode={isFocusMode}
                  onToggleFocusMode={handleToggleFocusMode}
                />

                {editorMode === 'advanced' && rightPanelOpen && (
                  <>
                    {/* Right Inspector Drag-to-Resize Splitter */}
                    <div
                      onPointerDown={handleRightResizeStart}
                      className="w-1.5 hover:w-2 bg-transparent hover:bg-[#22c55e]/50 cursor-col-resize transition-all shrink-0 z-20 group relative flex items-center justify-center select-none"
                      title="Drag to resize inspector width"
                    >
                      <div className="w-0.5 h-8 rounded-full bg-neutral-700/80 group-hover:bg-[#4ade80]" />
                    </div>

                    <RightInspector
                      inspectorWidth={rightInspectorWidth}
                      onClose={() => setRightPanelOpen(false)}
                      selectedLayer={selectedLayer}
                      selectedLayerIds={selectedLayerIds}
                      activeScene={activeScene}
                      activeSceneIndex={activeSceneIndex}
                      project={project}
                      audioSignals={audioSignals}
                      onUpdateLayer={handleUpdateLayer}
                      onAlignLayers={handleAlignLayers}
                      onDistributeLayers={handleDistributeLayers}
                      onGroupLayers={handleGroupLayers}
                      onUngroupLayers={handleUngroupLayers}
                      onReorderZ={handleReorderZ}
                      onDeleteSelectedLayers={handleDeleteSelectedLayers}
                      onDuplicateSelectedLayers={handleDuplicateSelectedLayers}
                      onUpdateSceneProp={handleUpdateSceneProp}
                      onSelectSceneAudio={handleSelectSceneAudio}
                      onTriggerSfx={handleTriggerSfx}
                      onUploadCustomFont={handleUploadCustomFont}
                      onUploadCustomImage={handleUploadCustomImage}
                      onOpenMotionTemplates={() => setMotionTemplatesOpen(true)}
                      customFonts={customFonts}
                      advancedSubMode={advancedSubMode}
                      onSetLayerFormatOverride={handleSetLayerFormatOverride}
                      onRemoveLayerFormatOverride={handleRemoveLayerFormatOverride}
                    />
                  </>
                )}

                {/* Collapsed Inspector Dock Button */}
                {editorMode === 'advanced' && !rightPanelOpen && (
                  <button
                    type="button"
                    onClick={() => setRightPanelOpen(true)}
                    title="Open Properties Inspector (⌘I)"
                    aria-label="Open Properties Inspector"
                    className="w-6 h-20 my-auto rounded-l-xl bg-[#141414] hover:bg-[#1c1c1c] border-y border-l border-neutral-800 flex flex-col items-center justify-center gap-1 text-neutral-400 hover:text-white transition-colors z-20 shadow-lg shrink-0"
                  >
                    <Sliders className="w-3.5 h-3.5 text-[#4ade80]" />
                    <span className="text-[9px] font-mono [writing-mode:vertical-rl] tracking-widest text-neutral-400">INSPECT</span>
                  </button>
                )}
              </div>

              {/* Multi-Track Keyframe Timeline (Advanced Design/Animate Mode) */}
              {editorMode === 'advanced' && (
                <TimelinePanel
                  project={project}
                  activeScene={activeScene}
                  activeSceneIndex={activeSceneIndex}
                  setActiveSceneIndex={setActiveSceneIndex}
                  selectedLayer={selectedLayer}
                  selectedLayerId={selectedLayerId}
                  setSelectedLayerId={setSelectedLayerId}
                  localTime={localTime}
                  isPlaying={isPlaying}
                  loopPlayback={loopPlayback}
                  setLoopPlayback={setLoopPlayback}
                  playbackScope={playbackScope}
                  setPlaybackScope={setPlaybackScope}
                  totalProjectDuration={totalProjectDuration}
                  currentGlobalTime={currentGlobalTime}
                  timelineExpanded={timelineExpanded}
                  setTimelineExpanded={setTimelineExpanded}
                  timelineHeight={timelineHeight}
                  onResizeTimeline={setTimelineHeight}
                  onTogglePlay={handleTogglePlay}
                  onRestart={handleRestart}
                  onSeekLocalTime={setLocalTime}
                  onSeekGlobalTime={handleSeekGlobalTime}
                  onAddKeyframe={handleAddKeyframe}
                  onUpdateKeyframe={handleUpdateKeyframe}
                  onDuplicateKeyframes={handleDuplicateKeyframes}
                  onPasteKeyframes={handlePasteKeyframes}
                  onDeleteKeyframe={handleDeleteKeyframe}
                  onClearLayerKeyframes={handleClearLayerKeyframes}
                  onUpdateSceneDuration={(dur) => handleUpdateSceneProp('duration', dur)}
                  onChangeFps={handleChangeFps}
                  onAddScene={handleAddScene}
                  onAddMarker={handleAddMarker}
                  onDeleteMarker={handleDeleteMarker}
                />
              )}
            </>
          )}

          {/* Bottom Procedural Sound & FFT Spectrum Bar */}
          <BottomAudioBar
            project={project}
            activeScene={activeScene}
            activeSceneIndex={activeSceneIndex}
            editorMode={editorMode}
            timelineExpanded={timelineExpanded}
            isPlaying={isPlaying}
            loopPlayback={loopPlayback}
            setLoopPlayback={setLoopPlayback}
            playbackScope={playbackScope}
            setPlaybackScope={setPlaybackScope}
            localTime={localTime}
            currentGlobalTime={currentGlobalTime}
            sceneDuration={activeScene?.duration || 12}
            totalProjectDuration={totalProjectDuration}
            volume={volume}
            isMuted={isMuted}
            micActive={micActive}
            spectrum={spectrum}
            onSelectTrack={handleSelectTrack}
            onSelectSceneAudio={handleSelectSceneAudio}
            onUploadAudioFile={handleUploadAudioFile}
            onForgetCustomAudio={handleForgetCustomAudio}
            onToggleMic={handleToggleMic}
            onToggleMute={handleToggleMute}
            onChangeVolume={handleChangeVolume}
            onUpdateAudioDsp={handleUpdateAudioDsp}
            onTriggerSfx={handleTriggerSfx}
            onTogglePlay={handleTogglePlay}
            onRestart={handleRestart}
            onSeekLocalTime={setLocalTime}
            onSeekGlobalTime={handleSeekGlobalTime}
          />
        </div>
      </div>

      {/* Modal Dialogs */}
      <TemplateLibraryModal
        open={templatesModalOpen}
        onClose={() => setTemplatesModalOpen(false)}
        initialMode={templateLibraryInitialTab}
        activeTemplateId={project.templateId}
        onSelectTemplate={handleSelectTemplate}
        onApplyPosterLayout={handleApplyPosterLayout}
        onOpenMyProjects={() => setMyProjectsOpen(true)}
        audioEngineRef={audioEngineRef}
      />

      <FormatReviewModal
        open={formatReviewOpen}
        onClose={() => setFormatReviewOpen(false)}
        project={project}
        activeScene={activeScene}
        localTime={localTime}
        onSelectRatio={handleChangeRatio}
        onOpenExport={() => setExportModalOpen(true)}
      />

      <ExportModal
        open={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        project={project}
        activeScene={activeScene}
        playbackScope={playbackScope}
        totalProjectDuration={totalProjectDuration}
        isRecording={isRecording}
        exportProgress={exportProgress}
        exportError={exportError}
        lastExportReceipt={lastExportReceipt}
        onCancelExport={handleCancelExport}
        onRetryExport={handleRetryExport}
        onExportPNG={handleExportPNG}
        onExportVideo={handleExportVideo}
        onExportAudio={handleExportAudio}
        onExportJSON={handleExportJSON}
        onExportSvg={handleExportSvg}
        onExportLottie={handleExportLottie}
        onExportOtio={handleExportOtio}
        onOpenFormatReview={() => setFormatReviewOpen(true)}
        onChangeRatio={handleChangeRatio}
        exportQueue={exportQueue}
        onCancelQueueItem={handleCancelQueueItem}
        onRetryQueueItem={handleRetryQueueItem}
        onBatchEnqueue={handleBatchEnqueue}
      />

      <MyProjectsModal
        open={myProjectsOpen}
        onClose={() => setMyProjectsOpen(false)}
        currentProject={project}
        savedProjects={savedProjects}
        onSaveCurrentProject={handleSaveCurrentProject}
        onLoadProject={(proj) => {
          updateProjectWithHistory(proj);
          setActiveSceneIndex(0);
        }}
        onDeleteSavedProject={handleDeleteSavedProject}
        onNewProject={handleNewProject}
        onDuplicateProject={handleDuplicateProject}
        onRenameProject={handleRenameProject}
        onExportProjectJson={handleExportJSON}
        onImportProjectJson={handleImportProjectJson}
      />

      <FullscreenPreviewModal
        open={fullscreenOpen}
        onClose={() => setFullscreenOpen(false)}
        project={project}
        activeScene={activeScene}
        activeSceneIndex={activeSceneIndex}
        setActiveSceneIndex={setActiveSceneIndex}
        localTime={localTime}
        currentGlobalTime={currentGlobalTime}
        totalProjectDuration={totalProjectDuration}
        playbackScope={playbackScope}
        setPlaybackScope={setPlaybackScope}
        isPlaying={isPlaying}
        loopPlayback={loopPlayback}
        setLoopPlayback={setLoopPlayback}
        audioSignals={audioSignals}
        onTogglePlay={handleTogglePlay}
        onRestart={handleRestart}
        onSeekLocalTime={setLocalTime}
        onSeekGlobalTime={handleSeekGlobalTime}
        onTriggerSfx={handleTriggerSfx}
      />

      <HelpShortcutsModal
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
      />

      <BrandKitsModal
        open={brandKitsOpen}
        onClose={() => setBrandKitsOpen(false)}
        project={project}
        activeScene={activeScene}
        onApplyBrandKit={handleApplyBrandKit}
        onUploadCustomFont={handleUploadCustomFont}
      />

      <MotionTemplatesModal
        open={motionTemplatesOpen}
        onClose={() => setMotionTemplatesOpen(false)}
        project={project}
        activeScene={activeScene}
        selectedLayer={selectedLayer}
        onApplyMotionTemplate={handleApplyMotionTemplate}
      />
    </div>
  );
}
