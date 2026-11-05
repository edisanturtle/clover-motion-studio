'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { STUDIO_TEMPLATES } from '../constants/templateCatalog';
import { DEMO_TRACKS } from '../constants/audioTracks';
import { ASPECT_RATIOS } from '../constants/fonts';
import { COLOR_PALETTES } from '../constants/motionPresets';
import { buildProjectFromTemplate } from '../utils/projectBuilder';
import { ProceduralAudioEngine } from '../engine/audioEngine';

import TopHeaderBar from './layout/TopHeaderBar';
import LeftSidebar from './layout/LeftSidebar';
import CanvasViewport from './layout/CanvasViewport';
import RightInspector from './layout/RightInspector';
import TimelinePanel from './layout/TimelinePanel';
import BottomAudioBar from './layout/BottomAudioBar';

import TemplateLibraryModal from './modals/TemplateLibraryModal';
import FormatReviewModal from './modals/FormatReviewModal';
import ExportModal from './modals/ExportModal';
import MyProjectsModal from './modals/MyProjectsModal';
import FullscreenPreviewModal from './modals/FullscreenPreviewModal';
import HelpShortcutsModal from './modals/HelpShortcutsModal';
import BrandKitsModal from './modals/BrandKitsModal';
import MotionTemplatesModal from './modals/MotionTemplatesModal';

const STORAGE_KEY = 'clover_motion_saved_projects_v1';

export default function CloverMotionStudio() {
  const initialTemplate =
    STUDIO_TEMPLATES.find((t) => t.id === 'tpl_shutter') || STUDIO_TEMPLATES[0];

  const [project, setProject] = useState(() =>
    buildProjectFromTemplate(initialTemplate, '1:1')
  );
  const [history, setHistory] = useState([]);
  const [future, setFuture] = useState([]);
  const [projectSavedStatus, setProjectSavedStatus] = useState('Saved to your account');
  const [showReadyBanner, setShowReadyBanner] = useState(false);

  const [editorMode, setEditorMode] = useState('quick'); // 'quick' | 'advanced'
  const [advancedSubMode, setAdvancedSubMode] = useState('motion'); // 'design' | 'motion'
  const [leftDrawerOpen, setLeftDrawerOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [timelineExpanded, setTimelineExpanded] = useState(true);

  const [activeSceneIndex, setActiveSceneIndex] = useState(1); // Default to 'Poster' scene
  const [selectedLayerId, setSelectedLayerId] = useState(null);

  // Playback & Time State
  const [isPlaying, setIsPlaying] = useState(false);
  const [loopPlayback, setLoopPlayback] = useState(true);
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

  // Modals State (Open Template Library on initial launch)
  const [templatesModalOpen, setTemplatesModalOpen] = useState(true);
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

  // Export Video Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  const canvasRef = useRef(null);
  const audioEngineRef = useRef(null);

  const activeScene = project.scenes[activeSceneIndex] || project.scenes[0];
  const selectedLayer =
    activeScene?.layers?.find((l) => l.id === selectedLayerId) || null;

  // Initialize Audio Engine & Load Saved Projects from localStorage
  useEffect(() => {
    audioEngineRef.current = new ProceduralAudioEngine();
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        setSavedProjects(JSON.parse(raw));
      }
    } catch {
      // ignore storage errors
    }
    return () => {
      audioEngineRef.current?.stop();
    };
  }, []);

  // Select default headline layer when switching scenes
  useEffect(() => {
    if (activeScene?.layers?.length) {
      const titleLayer =
        activeScene.layers.find((l) => l.role === 'title') || activeScene.layers[0];
      setSelectedLayerId(titleLayer.id);
    }
  }, [activeSceneIndex, project.id]); // eslint-disable-line react-hooks/exhaustive-deps

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

  // Animation & Audio FFT Loop
  useEffect(() => {
    if (!isPlaying) return;
    let rafId;
    let lastTs = performance.now();

    const tick = (now) => {
      const dt = (now - lastTs) / 1000;
      lastTs = now;

      if (audioEngineRef.current) {
        const analysis = audioEngineRef.current.getAnalysis();
        setAudioSignals({
          bass: analysis.bass,
          mid: analysis.mid,
          treble: analysis.treble,
          rms: analysis.rms,
        });
        setSpectrum(analysis.bars);
      }

      const sceneDur = activeScene?.duration || 4;
      setLocalTime((prev) => {
        const next = prev + dt;
        if (next >= sceneDur) {
          return loopPlayback ? 0 : sceneDur;
        }
        return next;
      });

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [isPlaying, activeScene?.duration, loopPlayback]);

  // Playback Controls
  const handleTogglePlay = useCallback(() => {
    setIsPlaying((prev) => {
      const next = !prev;
      const track =
        DEMO_TRACKS.find((t) => t.id === project.audioTrackId) || DEMO_TRACKS[0];
      if (next) {
        audioEngineRef.current?.start(track);
      } else {
        audioEngineRef.current?.stop();
      }
      return next;
    });
  }, [project.audioTrackId]);

  const handleRestart = useCallback(() => {
    setLocalTime(0);
  }, []);

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
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

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
      } else if (e.key.toLowerCase() === 'g') {
        setShowGrid((v) => !v);
      } else if (e.key.toLowerCase() === 'f') {
        setFullscreenOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleTogglePlay, handleGeneratePalette, handleUndo, handleRedo]);

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

  const handleResetWorkspaceLayout = () => {
    setLeftDrawerOpen(true);
    setRightPanelOpen(true);
    setTimelineExpanded(true);
  };

  const handleChangeRatio = (newRatio) => {
    const oldDim = ASPECT_RATIOS[project.ratio] || ASPECT_RATIOS['4:5'];
    const newDim = ASPECT_RATIOS[newRatio] || ASPECT_RATIOS['4:5'];
    const sx = newDim.width / oldDim.width;
    const sy = newDim.height / oldDim.height;

    updateProjectWithHistory((prev) => ({
      ...prev,
      ratio: newRatio,
      scenes: prev.scenes.map((sc) => ({
        ...sc,
        layers: sc.layers.map((l) => ({
          ...l,
          x: Math.round(l.x * sx),
          y: Math.round(l.y * sy),
        })),
      })),
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
  const handleApplyMotionTemplate = ({ motionPreset, motionSpeed, stagger }) => {
    if (selectedLayer) {
      handleUpdateLayer(selectedLayer.id, {
        motionPreset,
        motionSpeed,
        stagger,
        charAnimate: true,
      });
    } else {
      handleSelectSceneMotionPreset(motionPreset);
    }
  };

  const handleToggleLockSwatch = (idx) => {
    setProject((prev) => {
      const nextLocks = [...(prev.lockedSwatches || [false, false, false, false, false, false])];
      nextLocks[idx] = !nextLocks[idx];
      return { ...prev, lockedSwatches: nextLocks };
    });
  };

  const handleApplyPalette = (colors) => {
    updateProjectWithHistory((prev) => ({
      ...prev,
      palette: colors,
      scenes: prev.scenes.map((sc) => ({
        ...sc,
        bg: colors[0],
        palette: colors,
        layers: sc.layers.map((l) => {
          if (l.type === 'text') return { ...l, color: colors[1] };
          if (l.type === 'graphic')
            return { ...l, color: colors[2], secondaryColor: colors[1] };
          return l;
        }),
      })),
    }));
  };

  // Layer & Scene Mutators
  const handleUpdateLayer = (layerId, patch) => {
    updateProjectWithHistory((prev) => ({
      ...prev,
      scenes: prev.scenes.map((sc, idx) =>
        idx !== activeSceneIndex
          ? sc
          : {
              ...sc,
              layers: sc.layers.map((l) =>
                l.id === layerId ? { ...l, ...patch } : l
              ),
            }
      ),
    }));
  };

  const handleSelectSceneMotionPreset = (presetId) => {
    updateProjectWithHistory((prev) => ({
      ...prev,
      scenes: prev.scenes.map((sc, idx) =>
        idx !== activeSceneIndex
          ? sc
          : {
              ...sc,
              layers: sc.layers.map((l) =>
                l.type === 'text' ? { ...l, motionPreset: presetId } : l
              ),
            }
      ),
    }));
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

  // Scene Management
  const handleAddScene = () => {
    updateProjectWithHistory((prev) => {
      const source = prev.scenes[prev.scenes.length - 1] || prev.scenes[0];
      const cloned = JSON.parse(JSON.stringify(source));
      cloned.id = `scene_${Date.now()}`;
      cloned.name = `Scene ${prev.scenes.length + 1}`;
      return { ...prev, scenes: [...prev.scenes, cloned] };
    });
    setActiveSceneIndex(project.scenes.length);
  };

  const handleDuplicateScene = (idx) => {
    updateProjectWithHistory((prev) => {
      const cloned = JSON.parse(JSON.stringify(prev.scenes[idx]));
      cloned.id = `scene_${Date.now()}`;
      cloned.name = `${cloned.name} Copy`;
      const nextScenes = [...prev.scenes];
      nextScenes.splice(idx + 1, 0, cloned);
      return { ...prev, scenes: nextScenes };
    });
  };

  const handleDeleteScene = (idx) => {
    if (project.scenes.length <= 1) return;
    updateProjectWithHistory((prev) => ({
      ...prev,
      scenes: prev.scenes.filter((_, i) => i !== idx),
    }));
    setActiveSceneIndex((prev) => Math.max(0, prev - 1));
  };

  const handleUpdateSceneProp = (key, val) => {
    updateProjectWithHistory((prev) => ({
      ...prev,
      scenes: prev.scenes.map((sc, idx) =>
        idx !== activeSceneIndex ? sc : { ...sc, [key]: val }
      ),
    }));
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
    const defaultVal =
      prop === 'posX'
        ? selectedLayer.x
        : prop === 'posY'
        ? selectedLayer.y
        : prop === 'scale'
        ? selectedLayer.scale ?? 1
        : prop === 'rotation'
        ? selectedLayer.rotation ?? 0
        : selectedLayer.opacity ?? 1;

    const newKf = {
      id: `kf_${Date.now()}`,
      time: Number(localTime.toFixed(2)),
      prop,
      value: defaultVal,
      easing: 'easeOutCubic',
    };

    handleUpdateLayer(selectedLayer.id, {
      keyframes: [...(selectedLayer.keyframes || []), newKf],
    });
  };

  const handleDeleteKeyframe = (layerId, kfId) => {
    const layer = activeScene?.layers?.find((l) => l.id === layerId);
    if (!layer) return;
    handleUpdateLayer(layerId, {
      keyframes: (layer.keyframes || []).filter((k) => k.id !== kfId),
    });
  };

  const handleClearLayerKeyframes = (layerId) => {
    handleUpdateLayer(layerId, { keyframes: [] });
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

  const handleUploadCustomImage = (file) => {
    const url = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      if (selectedLayer?.type === 'graphic') {
        handleUpdateLayer(selectedLayer.id, {
          customImageElement: img,
          name: file.name.slice(0, 20),
        });
      } else {
        const dim = ASPECT_RATIOS[project.ratio] || ASPECT_RATIOS['4:5'];
        const newId = `layer_img_${Date.now()}`;
        const newLayer = {
          id: newId,
          type: 'graphic',
          name: file.name.slice(0, 20),
          assetId: 'customImage',
          customImageElement: img,
          x: Math.round(dim.width / 2),
          y: Math.round(dim.height / 2),
          size: 460,
          scale: 1,
          rotation: 0,
          opacity: 1,
          color: '#ffffff',
          secondaryColor: '#ffffff',
          strokeWidth: 2,
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
      }
    };
    img.src = url;
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

  const handleUploadAudioFile = (file) => {
    audioEngineRef.current?.loadAudioFile(file);
    updateProjectWithHistory((prev) => ({
      ...prev,
      customAudioName: file.name,
    }));
    setIsPlaying(true);
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

  // Export & Project Persistence
  const handleExportPNG = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.name.toLowerCase().replace(/\s+/g, '-')}-${project.ratio.replace(':', 'x')}.png`;
    a.click();
  };

  const handleExportJSON = () => {
    const json = JSON.stringify(project, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.name.toLowerCase().replace(/\s+/g, '-')}.clovermotion.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportProjectJson = async (file) => {
    try {
      const text = await file.text();
      const imported = JSON.parse(text);
      if (imported && Array.isArray(imported.scenes)) {
        updateProjectWithHistory(imported);
        setActiveSceneIndex(0);
      }
    } catch (err) {
      console.error('Invalid project JSON:', err);
    }
  };

  const handleExportVideo = () => {
    const canvas = canvasRef.current;
    if (!canvas || isRecording) return;
    try {
      const stream = canvas.captureStream(30);
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : 'video/webm';
      const recorder = new MediaRecorder(stream, { mimeType });
      const chunks = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${project.name.toLowerCase().replace(/\s+/g, '-')}.webm`;
        a.click();
        URL.revokeObjectURL(url);
        setIsRecording(false);
        setExportProgress(0);
      };

      setIsRecording(true);
      setLocalTime(0);
      if (!isPlaying) handleTogglePlay();
      recorder.start();

      const totalMs = (activeScene?.duration || 4) * 1000;
      const startTs = performance.now();
      const progInterval = setInterval(() => {
        const elapsed = performance.now() - startTs;
        setExportProgress(Math.min(1, elapsed / totalMs));
        if (elapsed >= totalMs) {
          clearInterval(progInterval);
          if (recorder.state === 'recording') recorder.stop();
        }
      }, 100);
    } catch (err) {
      console.error('Video export error:', err);
      setIsRecording(false);
    }
  };

  const handleSaveCurrentProject = () => {
    setProjectSavedStatus('Saving...');
    setSavedProjects((prev) => {
      const copy = { ...project, id: `saved_${Date.now()}` };
      const next = [copy, ...prev.slice(0, 19)];
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore quota errors
      }
      return next;
    });
    setTimeout(() => {
      setProjectSavedStatus('Saved to your account');
    }, 600);
  };

  const handleDeleteSavedProject = (id) => {
    setSavedProjects((prev) => {
      const next = prev.filter((p) => p.id !== id);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
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
        onSaveAsTemplate={handleSaveCurrentProject}
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
      />

      {/* Main Studio Workspace Split: Left Sidebar + Center/Right Column */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Full-Height Left Sidebar (Collapsible to 48px icon rail in Advanced Mode) */}
        <LeftSidebar
          editorMode={editorMode}
          project={project}
          projectSavedStatus={projectSavedStatus}
          activeScene={activeScene}
          activeSceneIndex={activeSceneIndex}
          setActiveSceneIndex={setActiveSceneIndex}
          selectedLayer={selectedLayer}
          selectedLayerId={selectedLayerId}
          setSelectedLayerId={setSelectedLayerId}
          leftDrawerOpen={leftDrawerOpen}
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
          onAddGraphicLayer={handleAddGraphicLayer}
          onApplyGraphicTemplate={handleApplyGraphicTemplate}
          onUpdateLayer={handleUpdateLayer}
          onDeleteLayer={handleDeleteLayer}
          onDuplicateLayer={handleDuplicateLayer}
          onMoveLayerOrder={handleMoveLayerOrder}
          onUploadCustomImage={handleUploadCustomImage}
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

        {/* Right Workspace Column: Canvas + RightInspector + Timeline + BottomAudioBar */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
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
              setSelectedLayerId={setSelectedLayerId}
              onUpdateLayer={handleUpdateLayer}
              showGrid={showGrid}
              setShowGrid={setShowGrid}
              showSafeGuides={showSafeGuides}
              setShowSafeGuides={setShowSafeGuides}
              editorMode={editorMode}
              onChangeRatio={handleChangeRatio}
              onGeneratePalette={handleGeneratePalette}
              onToggleLockSwatch={handleToggleLockSwatch}
            />

            {editorMode === 'advanced' && rightPanelOpen && (
              <RightInspector
                selectedLayer={selectedLayer}
                activeScene={activeScene}
                audioSignals={audioSignals}
                onUpdateLayer={handleUpdateLayer}
                onUpdateSceneProp={handleUpdateSceneProp}
                onUploadCustomFont={handleUploadCustomFont}
                onUploadCustomImage={handleUploadCustomImage}
                onOpenMotionTemplates={() => setMotionTemplatesOpen(true)}
                customFonts={customFonts}
              />
            )}
          </div>

          {/* Multi-Track Keyframe Timeline & Proportional Scenes Bar (Advanced Mode) */}
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
              timelineExpanded={timelineExpanded}
              setTimelineExpanded={setTimelineExpanded}
              onTogglePlay={handleTogglePlay}
              onRestart={handleRestart}
              onSeekLocalTime={setLocalTime}
              onAddKeyframe={handleAddKeyframe}
              onDeleteKeyframe={handleDeleteKeyframe}
              onClearLayerKeyframes={handleClearLayerKeyframes}
              onUpdateSceneDuration={(dur) => handleUpdateSceneProp('duration', dur)}
              onChangeFps={handleChangeFps}
            />
          )}

          {/* Bottom Procedural Sound & FFT Spectrum Bar */}
          <BottomAudioBar
            project={project}
            editorMode={editorMode}
            timelineExpanded={timelineExpanded}
            isPlaying={isPlaying}
            loopPlayback={loopPlayback}
            setLoopPlayback={setLoopPlayback}
            localTime={localTime}
            sceneDuration={activeScene?.duration || 12}
            volume={volume}
            isMuted={isMuted}
            micActive={micActive}
            spectrum={spectrum}
            onSelectTrack={handleSelectTrack}
            onUploadAudioFile={handleUploadAudioFile}
            onForgetCustomAudio={handleForgetCustomAudio}
            onToggleMic={handleToggleMic}
            onToggleMute={handleToggleMute}
            onChangeVolume={handleChangeVolume}
            onTogglePlay={handleTogglePlay}
            onRestart={handleRestart}
            onSeekLocalTime={setLocalTime}
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
        isRecording={isRecording}
        exportProgress={exportProgress}
        onExportPNG={handleExportPNG}
        onExportVideo={handleExportVideo}
        onExportJSON={handleExportJSON}
        onOpenFormatReview={() => setFormatReviewOpen(true)}
        onChangeRatio={handleChangeRatio}
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
      />

      <FullscreenPreviewModal
        open={fullscreenOpen}
        onClose={() => setFullscreenOpen(false)}
        project={project}
        activeScene={activeScene}
        localTime={localTime}
        isPlaying={isPlaying}
        loopPlayback={loopPlayback}
        setLoopPlayback={setLoopPlayback}
        audioSignals={audioSignals}
        onTogglePlay={handleTogglePlay}
        onRestart={handleRestart}
        onSeekLocalTime={setLocalTime}
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
