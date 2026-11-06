'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  Grid,
  SlidersHorizontal,
  Palette,
  MousePointer,
  Hand,
  Shuffle,
  Lock,
  Link2,
  Plus,
} from 'lucide-react';
import { ASPECT_RATIOS } from '../../constants/fonts';
import { renderSceneToCanvas, getLayerBoundingBox } from '../../engine/canvasRenderer';
import SceneStripCard from './SceneStripCard';

function isLightHex(hex) {
  const clean = String(hex || '#101935').replace('#', '');
  if (clean.length !== 6) return false;
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 150;
}

export default function CanvasViewport({
  canvasRef,
  project,
  activeScene,
  activeSceneIndex,
  setActiveSceneIndex,
  localTime,
  isPlaying,
  audioSignals,
  selectedLayerId,
  setSelectedLayerId,
  selectedLayerIds = null,
  setSelectedLayerIds = null,
  onUpdateLayer,
  onBatchUpdateLayers,
  showGrid,
  setShowGrid,
  showSafeGuides,
  setShowSafeGuides,
  editorMode,
  onChangeRatio,
  onGeneratePalette,
  onToggleLockSwatch,
  onAddScene,
  playbackScope = 'all',
  setPlaybackScope,
  totalProjectDuration = 60,
  currentGlobalTime = 0,
}) {
  const containerRef = useRef(null);
  const colorsRef = useRef(null);
  const settingsRef = useRef(null);
  const [zoomMultiplier, setZoomMultiplier] = useState(1.0); // 1.0 = Fit
  const [zoomMode, setZoomMode] = useState('fit'); // 'fit' | 'custom'
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [activeTool, setActiveTool] = useState('select'); // 'select' | 'pan'
  const [isSpaceDown, setIsSpaceDown] = useState(false);
  const [dragState, setDragState] = useState(null);
  const [marqueeBox, setMarqueeBox] = useState(null);
  const [activeSnapGuides, setActiveSnapGuides] = useState(null);
  const [colorsOpen, setColorsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showCenterCrosshair, setShowCenterCrosshair] = useState(false);

  // Normalize selected IDs (array)
  const effectiveSelectedIds = Array.isArray(selectedLayerIds)
    ? selectedLayerIds
    : selectedLayerId ? [selectedLayerId] : [];

  const updateSelection = useCallback((ids) => {
    if (setSelectedLayerIds) setSelectedLayerIds(ids);
    if (setSelectedLayerId) setSelectedLayerId(ids[0] || null);
  }, [setSelectedLayerIds, setSelectedLayerId]);

  const dim = ASPECT_RATIOS[project.ratio] || ASPECT_RATIOS['4:5'];

  // Compute base fit scale based on ratio and mode
  const baseFitScale =
    project.ratio === '9:16'
      ? editorMode === 'quick'
        ? 0.25
        : 0.22
      : project.ratio === '16:9'
      ? editorMode === 'quick'
        ? 0.34
        : 0.30
      : project.ratio === '4:3'
      ? editorMode === 'quick'
        ? 0.36
        : 0.32
      : project.ratio === '1:1'
      ? editorMode === 'quick'
        ? 0.42
        : 0.36
      : editorMode === 'quick'
      ? 0.35
      : 0.31;

  const effectiveCanvasScale = baseFitScale * (zoomMode === 'fit' ? 1.0 : zoomMultiplier);

  useEffect(() => {
    const handleOutside = (e) => {
      if (colorsRef.current && !colorsRef.current.contains(e.target)) {
        setColorsOpen(false);
      }
      if (settingsRef.current && !settingsRef.current.contains(e.target)) {
        setSettingsOpen(false);
      }
    };
    window.addEventListener('mousedown', handleOutside);
    return () => window.removeEventListener('mousedown', handleOutside);
  }, []);

  // Render Canvas on every state / frame update
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !activeScene) return;
    const ctx = canvas.getContext('2d');
    renderSceneToCanvas({
      ctx,
      width: dim.width,
      height: dim.height,
      scene: activeScene,
      localTime,
      audioSignals,
      selectedLayerId,
      selectedLayerIds: effectiveSelectedIds,
      activeSnapGuides,
      showGrid,
      showSafeGuides,
      showCenterCrosshair,
      project,
    });
  }, [
    canvasRef,
    dim.width,
    dim.height,
    activeScene,
    localTime,
    audioSignals,
    selectedLayerId,
    effectiveSelectedIds,
    activeSnapGuides,
    showGrid,
    showSafeGuides,
    showCenterCrosshair,
    project,
  ]);

  // Pointer Hit Testing & Interactive Dragging on Canvas (Move, Resize, Rotate, Marquee, Pan)
  const getCanvasCoords = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = dim.width / rect.width;
    const scaleY = dim.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  // Keyboard shortcut listener for Zoom (+/-/0), Nudge (Arrows), Space Pan, and Tool Switch
  useEffect(() => {
    const handleKeyDown = (e) => {
      const tag = e.target?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        setIsSpaceDown(true);
      } else if (e.key === 'v' || e.key === 'V') {
        setActiveTool('select');
      } else if (e.key === 'h' || e.key === 'H') {
        setActiveTool('pan');
      } else if (e.key === '=' || e.key === '+') {
        e.preventDefault();
        stepZoom(0.1);
      } else if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        stepZoom(-0.1);
      } else if (e.key === '0') {
        e.preventDefault();
        resetZoomFit();
      } else if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        if (!effectiveSelectedIds.length || !activeScene) return;
        e.preventDefault();
        const dist = e.shiftKey ? 10 : 2;
        let dx = 0;
        let dy = 0;
        if (e.key === 'ArrowUp') dy = -dist;
        if (e.key === 'ArrowDown') dy = dist;
        if (e.key === 'ArrowLeft') dx = -dist;
        if (e.key === 'ArrowRight') dx = dist;

        effectiveSelectedIds.forEach((id) => {
          const target = (activeScene.layers || []).find((l) => l.id === id);
          if (target && !target.locked) {
            onUpdateLayer(id, {
              x: Math.round(target.x + dx),
              y: Math.round(target.y + dy),
            });
          }
        });
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (effectiveSelectedIds.length && onUpdateLayer) {
          effectiveSelectedIds.forEach((id) => {
            const target = (activeScene?.layers || []).find((l) => l.id === id);
            if (target && target.role !== 'title') {
              onUpdateLayer(id, { visible: false });
            }
          });
        }
      }
    };

    const handleKeyUp = (e) => {
      if (e.code === 'Space') {
        setIsSpaceDown(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [effectiveSelectedIds, activeScene, onUpdateLayer]);

  const handlePointerDown = (e) => {
    if (!activeScene) return;

    // Pan Mode (Middle Mouse Button, Pan Tool, or Holding Space)
    if (activeTool === 'pan' || isSpaceDown || e.button === 1) {
      setDragState({
        mode: 'pan',
        startX: e.clientX,
        startY: e.clientY,
        origPanX: panOffset.x,
        origPanY: panOffset.y,
      });
      return;
    }

    const pt = getCanvasCoords(e);

    // 1. Single selection transform handles (Rotation or Resize)
    if (effectiveSelectedIds.length === 1) {
      const curLayer = (activeScene.layers || []).find((l) => l.id === effectiveSelectedIds[0]);
      if (curLayer && !curLayer.locked) {
        const box = getLayerBoundingBox(curLayer);
        const halfW = (box.width * (curLayer.scale ?? 1)) / 2;
        const halfH = (box.height * (curLayer.scale ?? 1)) / 2;

        // Top rotation handle
        const rotHandleX = curLayer.x;
        const rotHandleY = curLayer.y - halfH - 48;
        if (Math.hypot(pt.x - rotHandleX, pt.y - rotHandleY) <= 24) {
          setDragState({
            mode: 'rotate',
            layerId: curLayer.id,
            centerX: curLayer.x,
            centerY: curLayer.y,
            origRotation: curLayer.rotation || 0,
            startAngle: Math.atan2(pt.y - curLayer.y, pt.x - curLayer.x),
          });
          return;
        }

        // 4 corner resize handles
        const corners = [
          { name: 'tl', x: curLayer.x - halfW, y: curLayer.y - halfH },
          { name: 'tr', x: curLayer.x + halfW, y: curLayer.y - halfH },
          { name: 'br', x: curLayer.x + halfW, y: curLayer.y + halfH },
          { name: 'bl', x: curLayer.x - halfW, y: curLayer.y + halfH },
        ];
        for (const c of corners) {
          if (Math.hypot(pt.x - c.x, pt.y - c.y) <= 20) {
            setDragState({
              mode: 'resize',
              layerId: curLayer.id,
              centerX: curLayer.x,
              centerY: curLayer.y,
              origScale: curLayer.scale ?? 1,
              startDist: Math.hypot(pt.x - curLayer.x, pt.y - curLayer.y),
            });
            return;
          }
        }
      }
    }

    // 2. Layer Hit Testing (Top to Bottom)
    const layers = [...(activeScene.layers || [])].reverse();
    let hitLayer = null;

    for (const layer of layers) {
      if (layer.visible === false || layer.locked) continue;
      const box = getLayerBoundingBox(layer);
      const halfW = (box.width * (layer.scale ?? 1)) / 2 + 16;
      const halfH = (box.height * (layer.scale ?? 1)) / 2 + 16;
      if (
        pt.x >= layer.x - halfW &&
        pt.x <= layer.x + halfW &&
        pt.y >= layer.y - halfH &&
        pt.y <= layer.y + halfH
      ) {
        hitLayer = layer;
        break;
      }
    }

    if (hitLayer) {
      let nextSelectedIds = [];
      if (e.shiftKey) {
        // Toggle selection with Shift
        if (effectiveSelectedIds.includes(hitLayer.id)) {
          nextSelectedIds = effectiveSelectedIds.filter((id) => id !== hitLayer.id);
        } else {
          nextSelectedIds = [...effectiveSelectedIds, hitLayer.id];
        }
      } else {
        // Normal click: if clicked layer is already part of selection, maintain it; otherwise select only this layer
        if (effectiveSelectedIds.includes(hitLayer.id)) {
          nextSelectedIds = effectiveSelectedIds;
        } else {
          nextSelectedIds = [hitLayer.id];
        }
      }

      updateSelection(nextSelectedIds);

      // Start drag move for all currently selected layers
      const initialPositions = new Map();
      (activeScene.layers || []).forEach((l) => {
        if (nextSelectedIds.includes(l.id) && !l.locked) {
          initialPositions.set(l.id, { x: l.x, y: l.y });
        }
      });

      setDragState({
        mode: 'move',
        primaryLayerId: hitLayer.id,
        initialPositions,
        startX: pt.x,
        startY: pt.y,
      });
    } else {
      // Empty canvas click
      if (!e.shiftKey) {
        updateSelection([]);
      }
      // Start marquee selection drag
      setDragState({
        mode: 'marquee',
        startX: pt.x,
        startY: pt.y,
      });
      setMarqueeBox({
        startX: pt.x,
        startY: pt.y,
        currentX: pt.x,
        currentY: pt.y,
      });
    }
  };

  const handlePointerMove = (e) => {
    if (!dragState) return;

    if (dragState.mode === 'pan') {
      const dx = e.clientX - dragState.startX;
      const dy = e.clientY - dragState.startY;
      setPanOffset({
        x: dragState.origPanX + dx,
        y: dragState.origPanY + dy,
      });
      return;
    }

    const pt = getCanvasCoords(e);

    if (dragState.mode === 'rotate') {
      const curAngle = Math.atan2(pt.y - dragState.centerY, pt.x - dragState.centerX);
      const diffDeg = ((curAngle - dragState.startAngle) * 180) / Math.PI;
      const nextRot = Math.round((dragState.origRotation + diffDeg) % 360);
      onUpdateLayer(dragState.layerId, { rotation: nextRot });
    } else if (dragState.mode === 'resize') {
      const curDist = Math.hypot(pt.x - dragState.centerX, pt.y - dragState.centerY);
      const ratio = curDist / (dragState.startDist || 1);
      const nextScale = Math.max(0.1, Math.min(5.0, Math.round(dragState.origScale * ratio * 100) / 100));
      onUpdateLayer(dragState.layerId, { scale: nextScale });
    } else if (dragState.mode === 'move') {
      let dx = pt.x - dragState.startX;
      let dy = pt.y - dragState.startY;

      // Magnetic snap check on primary layer
      const primaryInit = dragState.initialPositions.get(dragState.primaryLayerId);
      const snapGuides = {};
      if (primaryInit) {
        const targetX = primaryInit.x + dx;
        const targetY = primaryInit.y + dy;
        const centerX = dim.width / 2;
        const centerY = dim.height / 2;

        if (Math.abs(targetX - centerX) < 14) {
          dx = centerX - primaryInit.x;
          snapGuides.x = centerX;
        }
        if (Math.abs(targetY - centerY) < 14) {
          dy = centerY - primaryInit.y;
          snapGuides.y = centerY;
        }
      }

      setActiveSnapGuides(Object.keys(snapGuides).length > 0 ? snapGuides : null);

      // Update all selected layers synchronously
      dragState.initialPositions.forEach((initPos, layerId) => {
        onUpdateLayer(layerId, {
          x: Math.round(initPos.x + dx),
          y: Math.round(initPos.y + dy),
        });
      });
    } else if (dragState.mode === 'marquee') {
      setMarqueeBox({
        startX: dragState.startX,
        startY: dragState.startY,
        currentX: pt.x,
        currentY: pt.y,
      });
    }
  };

  const handlePointerUp = (e) => {
    if (dragState?.mode === 'marquee' && marqueeBox) {
      const minX = Math.min(marqueeBox.startX, marqueeBox.currentX);
      const maxX = Math.max(marqueeBox.startX, marqueeBox.currentX);
      const minY = Math.min(marqueeBox.startY, marqueeBox.currentY);
      const maxY = Math.max(marqueeBox.startY, marqueeBox.currentY);

      if (maxX - minX > 8 || maxY - minY > 8) {
        // Find all visible, unlocked layers inside the marquee box
        const hitIds = (activeScene.layers || [])
          .filter((l) => {
            if (l.visible === false || l.locked) return false;
            const box = getLayerBoundingBox(l);
            const halfW = (box.width * (l.scale ?? 1)) / 2;
            const halfH = (box.height * (l.scale ?? 1)) / 2;
            const lMinX = l.x - halfW;
            const lMaxX = l.x + halfW;
            const lMinY = l.y - halfH;
            const lMaxY = l.y + halfH;
            return lMaxX >= minX && lMinX <= maxX && lMaxY >= minY && lMinY <= maxY;
          })
          .map((l) => l.id);

        if (hitIds.length > 0) {
          updateSelection(hitIds);
        }
      }
      setMarqueeBox(null);
    }

    setActiveSnapGuides(null);
    setDragState(null);
  };

  const stepZoom = (delta) => {
    setZoomMode('custom');
    setZoomMultiplier((prev) => {
      const next = Math.round((prev + delta) * 100) / 100;
      return Math.max(0.2, Math.min(4.0, next));
    });
  };

  const resetZoomFit = () => {
    setZoomMode('fit');
    setZoomMultiplier(1.0);
    setPanOffset({ x: 0, y: 0 });
  };

  // Wheel zoom (mouse wheel with Ctrl / trackpad pinch gesture) & pan
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e) => {
      // Check if user is pinching trackpad (e.ctrlKey === true) or holding Ctrl/Cmd or scrolling mouse
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const zoomDelta = -e.deltaY * 0.008;
        setZoomMode('custom');
        setZoomMultiplier((prev) => {
          const next = Math.round((prev + zoomDelta) * 100) / 100;
          return Math.max(0.2, Math.min(4.0, next));
        });
      } else if (e.altKey) {
        // Alt + wheel for mouse wheel zoom without trackpad pinch
        e.preventDefault();
        const zoomDelta = e.deltaY < 0 ? 0.1 : -0.1;
        stepZoom(zoomDelta);
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, []);

  return (
    <div className="flex-1 flex flex-col bg-[#0e0e0e] min-w-0 min-h-0 overflow-hidden select-none p-2.5 gap-2.5">
      {/* Main Rounded Canvas Panel Card */}
      <div className="flex-1 flex flex-col bg-[#161616] border border-neutral-800/80 rounded-2xl min-h-0 overflow-hidden relative">
        {/* Top Bar Inside Canvas Card */}
        <div className="h-11 px-4 flex items-center justify-between border-b border-neutral-800/60 shrink-0 z-20">
          <span className="text-xs font-medium text-neutral-300">Canvas</span>

          {editorMode === 'quick' ? (
            /* Quick Editor Mode: Segmented Aspect Ratio Switcher + Pointer Icon */
            <div className="flex items-center gap-1.5">
              <div className="flex items-center bg-[#202020] p-0.5 rounded-lg border border-neutral-800">
                {Object.values(ASPECT_RATIOS).map((r) => {
                  const active = project.ratio === r.id;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => onChangeRatio(r.id)}
                      className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                        active
                          ? 'bg-[#159947] text-white font-semibold shadow-sm'
                          : 'text-neutral-400 hover:text-white'
                      }`}
                    >
                      {r.shortLabel}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-1 bg-[#202020] p-0.5 rounded-lg border border-neutral-800">
                <button
                  type="button"
                  onClick={() => setActiveTool('select')}
                  className={`p-1.5 rounded-md transition-colors ${
                    activeTool === 'select'
                      ? 'bg-[#159947] text-white shadow-sm'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                  title="Select tool (V)"
                >
                  <MousePointer className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTool('pan')}
                  className={`p-1.5 rounded-md transition-colors ${
                    activeTool === 'pan'
                      ? 'bg-[#159947] text-white shadow-sm'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                  title="Hand / Pan tool (H or hold Space)"
                >
                  <Hand className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : (
            /* Advanced Mode: Ratio Dropdown + Grid + Link/Snap + Sliders + Colors + Tools */
            <div className="flex items-center gap-1.5">
              <select
                value={project.ratio}
                onChange={(e) => onChangeRatio(e.target.value)}
                className="px-2.5 py-1 rounded-lg bg-[#202020] border border-neutral-800 text-xs font-medium text-neutral-200 focus:outline-none focus:border-neutral-600"
              >
                <option value="4:5">4:5 · Feed Portrait</option>
                <option value="1:1">1:1 · Square</option>
                <option value="9:16">9:16 · Story / Totem</option>
                <option value="16:9">16:9 · Stage / YouTube</option>
                <option value="4:3">4:3 · Exhibition Booth</option>
                <option value="3:4">3:4 · Event Poster</option>
              </select>

              <button
                type="button"
                onClick={() => setShowGrid((v) => !v)}
                title="Show layout grid"
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium transition-colors ${
                  showGrid
                    ? 'bg-[#159947]/20 border-[#22c55e] text-[#4ade80]'
                    : 'bg-[#202020] border-neutral-800 text-neutral-300 hover:text-white'
                }`}
              >
                <Grid className="w-3.5 h-3.5" />
                <span>Grid</span>
              </button>

              <button
                type="button"
                onClick={() => setShowSafeGuides((v) => !v)}
                className={`p-1.5 rounded-lg border transition-colors ${
                  showSafeGuides
                    ? 'bg-[#159947]/20 border-[#22c55e]/70 text-[#4ade80]'
                    : 'bg-[#202020] border-neutral-800 text-neutral-400 hover:text-white'
                }`}
                title="Snap & alignment guides"
                aria-label="Snap and safe alignment guides"
              >
                <Link2 className="w-3.5 h-3.5" />
              </button>

              {/* Canvas Settings Popover */}
              <div className="relative" ref={settingsRef}>
                <button
                  type="button"
                  onClick={() => setSettingsOpen((v) => !v)}
                  className={`p-1.5 rounded-lg border transition-colors ${
                    settingsOpen
                      ? 'bg-[#2a2a2a] border-white text-white'
                      : 'bg-[#202020] border-neutral-800 text-neutral-400 hover:text-white'
                  }`}
                  title="Canvas Viewport & Guide Settings"
                  aria-label="Canvas Viewport & Guide Settings"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                </button>

                {settingsOpen && (
                  <div className="absolute right-0 mt-2 w-64 rounded-xl bg-[#1c1c1c] border border-neutral-700/90 shadow-2xl p-3 z-50 text-xs text-neutral-200 space-y-2.5">
                    <div className="font-semibold text-white border-b border-neutral-800 pb-1.5 flex items-center justify-between">
                      <span>Canvas Settings</span>
                      <span className="text-[10px] font-mono text-[#4ade80]">Viewport</span>
                    </div>

                    {/* Toggle Safe Area Guides */}
                    <label className="flex items-center justify-between cursor-pointer py-0.5">
                      <span className="text-neutral-300">Safe Area (90% / 93%)</span>
                      <input
                        type="checkbox"
                        checked={showSafeGuides}
                        onChange={(e) => setShowSafeGuides(e.target.checked)}
                        className="rounded accent-[#159947]"
                      />
                    </label>

                    {/* Toggle Grid */}
                    <label className="flex items-center justify-between cursor-pointer py-0.5">
                      <span className="text-neutral-300">Modular Layout Grid</span>
                      <input
                        type="checkbox"
                        checked={showGrid}
                        onChange={(e) => setShowGrid(e.target.checked)}
                        className="rounded accent-[#159947]"
                      />
                    </label>

                    {/* Toggle Center Crosshair */}
                    <label className="flex items-center justify-between cursor-pointer py-0.5">
                      <span className="text-neutral-300">Center Crosshair</span>
                      <input
                        type="checkbox"
                        checked={showCenterCrosshair}
                        onChange={(e) => setShowCenterCrosshair(e.target.checked)}
                        className="rounded accent-[#159947]"
                      />
                    </label>

                    {/* Quick Preset Zoom Buttons */}
                    <div className="pt-2 border-t border-neutral-800 flex items-center justify-between">
                      <span className="text-[11px] text-neutral-400">Zoom scale</span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setZoomMode('fit');
                            setZoomMultiplier(1.0);
                            setPanOffset({ x: 0, y: 0 });
                          }}
                          className={`px-2 py-0.5 rounded text-[10px] font-mono ${
                            zoomMode === 'fit'
                              ? 'bg-[#159947] text-white font-bold'
                              : 'bg-[#252525] text-neutral-400 hover:text-white'
                          }`}
                        >
                          Fit
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setZoomMode('custom');
                            setZoomMultiplier(1.0);
                          }}
                          className={`px-2 py-0.5 rounded text-[10px] font-mono ${
                            zoomMode === 'custom' && Math.abs(zoomMultiplier - 1.0) < 0.05
                              ? 'bg-[#159947] text-white font-bold'
                              : 'bg-[#252525] text-neutral-400 hover:text-white'
                          }`}
                        >
                          100%
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setZoomMode('custom');
                            setZoomMultiplier(1.5);
                          }}
                          className={`px-2 py-0.5 rounded text-[10px] font-mono ${
                            zoomMode === 'custom' && Math.abs(zoomMultiplier - 1.5) < 0.05
                              ? 'bg-[#159947] text-white font-bold'
                              : 'bg-[#252525] text-neutral-400 hover:text-white'
                          }`}
                        >
                          150%
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Colors Popover */}
              <div className="relative" ref={colorsRef}>
                <button
                  type="button"
                  onClick={() => setColorsOpen((v) => !v)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium transition-colors ${
                    colorsOpen
                      ? 'bg-[#2a2a2a] border-white text-white'
                      : 'bg-[#202020] border-neutral-800 text-neutral-300 hover:text-white'
                  }`}
                >
                  <Palette className="w-3.5 h-3.5" />
                  <span>Colors</span>
                </button>

                {colorsOpen && (
                  <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-[#1f1f1f] border border-neutral-700/90 shadow-2xl p-4 z-50">
                    <div className="text-center">
                      <div className="text-xs font-medium text-neutral-300 mb-2">Background</div>
                      <div
                        className="w-24 h-9 mx-auto rounded-lg border border-white/20 shadow-inner mb-3"
                        style={{ backgroundColor: activeScene?.bg || project.palette?.[0] || '#f4f1ea' }}
                      />
                    </div>

                    <button
                      type="button"
                      onClick={onGeneratePalette}
                      className="w-full py-2 px-3 rounded-xl bg-[#2b2b2b] hover:bg-[#343434] border border-neutral-600/80 flex items-center justify-center gap-2 text-xs font-semibold text-white transition-colors mb-3.5"
                    >
                      <Shuffle className="w-3.5 h-3.5" />
                      <span>Generate colors</span>
                    </button>

                    <div className="grid grid-cols-6 gap-1.5 mb-2.5">
                      {(project.palette || []).slice(0, 6).map((hex, idx) => {
                        const locked = project.lockedSwatches?.[idx];
                        const lightSwatch = isLightHex(hex);
                        const adaptiveTextClass = lightSwatch ? 'text-black' : 'text-white';
                        const tooltipLabel =
                          idx === 0
                            ? `background · ${String(hex).toUpperCase()} · Click to lock`
                            : `palette color ${idx} · ${String(hex).toUpperCase()} · Click to lock`;

                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => onToggleLockSwatch(idx)}
                            className={`h-8 rounded-md relative flex items-center justify-center transition-transform hover:scale-105 ${
                              locked || idx === 0
                                ? 'border-2 border-white shadow-sm'
                                : 'border border-white/20'
                            }`}
                            style={{ backgroundColor: hex }}
                            title={tooltipLabel}
                          >
                            {idx === 0 && !locked && (
                              <span className={`text-[10px] font-extrabold tracking-tight ${adaptiveTextClass}`}>
                                BG
                              </span>
                            )}
                            {locked && (
                              <Lock className={`w-3.5 h-3.5 ${adaptiveTextClass}`} />
                            )}
                          </button>
                        );
                      })}
                    </div>

                    <p className="text-[11px] text-neutral-400">
                      Click a swatch to keep its color.
                    </p>
                  </div>
                )}
              </div>

              {/* Tool Selection: Pointer & Hand */}
              <div className="flex items-center gap-1 bg-[#202020] p-0.5 rounded-lg border border-neutral-800">
                <button
                  type="button"
                  onClick={() => setActiveTool('select')}
                  className={`p-1.5 rounded-md transition-colors ${
                    activeTool === 'select'
                      ? 'bg-[#159947] text-white shadow-sm'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                  title="Select tool (V)"
                >
                  <MousePointer className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTool('pan')}
                  className={`p-1.5 rounded-md transition-colors ${
                    activeTool === 'pan'
                      ? 'bg-[#159947] text-white shadow-sm'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                  title="Hand / Pan tool (H or hold Space)"
                >
                  <Hand className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Center Interactive Stage with Zoom, Pan & Marquee */}
        <div
          ref={containerRef}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className={`flex-1 flex items-center justify-center overflow-auto relative p-4 ${
            activeTool === 'pan' || isSpaceDown ? 'cursor-grab active:cursor-grabbing' : ''
          }`}
        >
          <div
            style={{
              width: Math.round(dim.width * effectiveCanvasScale),
              height: Math.round(dim.height * effectiveCanvasScale),
              transform: `translate(${panOffset.x}px, ${panOffset.y}px)`,
            }}
            className="relative shadow-[0_20px_60px_rgba(0,0,0,0.75)] ring-1 ring-white/10 shrink-0 select-none"
          >
            <canvas
              ref={canvasRef}
              width={dim.width}
              height={dim.height}
              onPointerDown={handlePointerDown}
              className={`w-full h-full block ${
                activeTool === 'pan' || isSpaceDown
                  ? 'cursor-grab'
                  : effectiveSelectedIds.length > 0
                  ? 'cursor-move'
                  : 'cursor-default'
              }`}
            />
            {/* Visual Marquee Selection Overlay Box */}
            {marqueeBox && (
              <div
                style={{
                  left: Math.min(marqueeBox.startX, marqueeBox.currentX) * effectiveCanvasScale,
                  top: Math.min(marqueeBox.startY, marqueeBox.currentY) * effectiveCanvasScale,
                  width: Math.abs(marqueeBox.currentX - marqueeBox.startX) * effectiveCanvasScale,
                  height: Math.abs(marqueeBox.currentY - marqueeBox.startY) * effectiveCanvasScale,
                }}
                className="absolute pointer-events-none border border-[#22c55e] bg-[#22c55e]/15 z-30"
              />
            )}
          </div>
        </div>

        {/* Bottom Status Bar Inside Canvas Card */}
        <div className="h-8 px-4 flex items-center justify-between text-[11px] font-mono text-neutral-400 shrink-0">
          <span>
            {isPlaying ? 'Playing' : 'Paused'} · Frame at {localTime.toFixed(3)} s
          </span>
          <span>
            {dim.width} × {dim.height} px
          </span>
          <div
            className="flex items-center gap-2"
            title="Canvas: Pinch trackpad / Alt+Wheel to zoom, + / - / 0, arrow keys to nudge, hold Space to pan"
          >
            {(panOffset.x !== 0 || panOffset.y !== 0) && (
              <button
                type="button"
                onClick={() => setPanOffset({ x: 0, y: 0 })}
                className="px-1.5 py-0.5 rounded bg-neutral-800 text-[10px] text-[#4ade80] hover:bg-neutral-700 transition-colors"
                title="Reset pan offset"
              >
                Reset Pan
              </button>
            )}
            <button
              type="button"
              onClick={() => stepZoom(-0.1)}
              className="hover:text-white px-1 transition-colors"
              title="Zoom out (-)"
              aria-label="Zoom out"
            >
              -
            </button>
            <button
              type="button"
              onClick={resetZoomFit}
              className="text-neutral-300 hover:text-white px-1 font-sans text-xs transition-colors"
              title="Reset zoom to Fit (0)"
              aria-label="Reset zoom to fit"
            >
              {zoomMode === 'fit' ? 'Fit' : `${zoomMultiplier.toFixed(1)}×`}
            </button>
            <button
              type="button"
              onClick={() => stepZoom(0.1)}
              className="hover:text-white px-1 transition-colors"
              title="Zoom in (+)"
              aria-label="Zoom in"
            >
              +
            </button>
          </div>
        </div>
      </div>

      {/* Horizontal Scenes Strip (Below Canvas in Quick Editor Mode — Screenshots 8, 9, 10, 26) */}
      {editorMode === 'quick' && (
        <div className="h-[84px] bg-[#161616] border border-neutral-800/80 rounded-2xl px-4 flex items-center gap-3 shrink-0 overflow-hidden">
          <div className="flex flex-col gap-1 shrink-0 mr-1">
            <span className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
              <span>Scenes</span>
              <span className="text-[10px] font-mono text-neutral-500">({project.scenes.length})</span>
            </span>
            <button
              type="button"
              onClick={() => setPlaybackScope?.(playbackScope === 'all' ? 'scene' : 'all')}
              className={`px-2 py-0.5 rounded text-[10px] font-semibold flex items-center gap-1 transition-all ${
                playbackScope === 'all'
                  ? 'bg-[#159947]/25 border border-[#22c55e]/60 text-[#4ade80]'
                  : 'bg-[#202020] border border-neutral-700 text-neutral-400'
              }`}
              title="Click to toggle Full Video sequence vs Single Scene"
            >
              <span>{playbackScope === 'all' ? '🎞️ Full Video' : '🎬 Single Scene'}</span>
            </button>
          </div>
          <div className="flex-1 flex items-center gap-2.5 overflow-x-auto custom-scrollbar py-2 min-w-0">
            {project.scenes.map((sc, idx) => (
              <div key={sc.id} className="shrink-0 min-w-[140px] max-w-[200px] flex-1">
                <SceneStripCard
                  scene={sc}
                  project={project}
                  index={idx}
                  ratio={project.ratio}
                  isActive={idx === activeSceneIndex}
                  onSelect={() => setActiveSceneIndex(idx)}
                />
              </div>
            ))}
            <button
              type="button"
              onClick={onAddScene}
              className="h-14 px-3.5 rounded-xl border border-dashed border-neutral-700 hover:border-[#22c55e] bg-[#1a1a1a] hover:bg-[#202020] text-neutral-400 hover:text-white flex items-center gap-2 text-xs font-semibold shrink-0 transition-all group"
              title="Add a new scene to project"
            >
              <div className="w-5 h-5 rounded-md bg-[#252525] group-hover:bg-[#159947] flex items-center justify-center transition-colors">
                <Plus className="w-3.5 h-3.5 text-neutral-300 group-hover:text-white" />
              </div>
              <span className="whitespace-nowrap">Add Scene</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
