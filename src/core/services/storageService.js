/**
 * @file storageService.js
 * @description Local Storage Persistence, Atomic Save, Recovery Journal & Recent Projects (Fase 2)
 * Ensures non-destructive persistence, crash recovery, and offline project management.
 */

import { migrateProjectSchema, serializeProject, deserializeProject, validateProjectSchema } from '../domain/projectSchema.js';

export const STORAGE_PROJECTS_KEY = 'clover_motion_saved_projects_v1';
export const STORAGE_RECENT_KEY = 'clover_motion_recent_projects_v1';
export const STORAGE_STAGING_KEY = 'clover_motion_staging_project_v1';
export const STORAGE_JOURNAL_KEY = 'clover_motion_recovery_journal_v1';
export const STORAGE_LAYOUT_PREFS_KEY = 'clover_motion_layout_prefs_v1';

export const DEFAULT_LAYOUT_PREFS = {
  leftSidebarWidth: 280,
  rightInspectorWidth: 280,
  timelineHeight: 240,
  leftDrawerOpen: true,
  rightPanelOpen: true,
  timelineExpanded: true,
  isFocusMode: false,
};

/**
 * Loads layout preferences independently from project content.
 * @returns {typeof DEFAULT_LAYOUT_PREFS}
 */
export function loadLayoutPreferences() {
  const storage =
    typeof window !== 'undefined' && window.localStorage
      ? window.localStorage
      : typeof globalThis !== 'undefined' && globalThis.localStorage
      ? globalThis.localStorage
      : null;
  if (!storage) return { ...DEFAULT_LAYOUT_PREFS };

  try {
    const raw = storage.getItem(STORAGE_LAYOUT_PREFS_KEY);
    if (!raw) return { ...DEFAULT_LAYOUT_PREFS };
    const parsed = JSON.parse(raw);
    return {
      leftSidebarWidth:
        typeof parsed.leftSidebarWidth === 'number' && Number.isFinite(parsed.leftSidebarWidth)
          ? Math.max(220, Math.min(420, parsed.leftSidebarWidth))
          : DEFAULT_LAYOUT_PREFS.leftSidebarWidth,
      rightInspectorWidth:
        typeof parsed.rightInspectorWidth === 'number' && Number.isFinite(parsed.rightInspectorWidth)
          ? Math.max(240, Math.min(450, parsed.rightInspectorWidth))
          : DEFAULT_LAYOUT_PREFS.rightInspectorWidth,
      timelineHeight:
        typeof parsed.timelineHeight === 'number' && Number.isFinite(parsed.timelineHeight)
          ? Math.max(140, Math.min(480, parsed.timelineHeight))
          : DEFAULT_LAYOUT_PREFS.timelineHeight,
      leftDrawerOpen:
        typeof parsed.leftDrawerOpen === 'boolean' ? parsed.leftDrawerOpen : DEFAULT_LAYOUT_PREFS.leftDrawerOpen,
      rightPanelOpen:
        typeof parsed.rightPanelOpen === 'boolean' ? parsed.rightPanelOpen : DEFAULT_LAYOUT_PREFS.rightPanelOpen,
      timelineExpanded:
        typeof parsed.timelineExpanded === 'boolean' ? parsed.timelineExpanded : DEFAULT_LAYOUT_PREFS.timelineExpanded,
      isFocusMode:
        typeof parsed.isFocusMode === 'boolean' ? parsed.isFocusMode : DEFAULT_LAYOUT_PREFS.isFocusMode,
    };
  } catch (err) {
    console.warn('Failed to load layout preferences:', err);
    return { ...DEFAULT_LAYOUT_PREFS };
  }
}

/**
 * Persists layout preferences independently without polluting project schemas.
 * @param {object} prefs
 */
export function saveLayoutPreferences(prefs) {
  const storage =
    typeof window !== 'undefined' && window.localStorage
      ? window.localStorage
      : typeof globalThis !== 'undefined' && globalThis.localStorage
      ? globalThis.localStorage
      : null;
  if (!storage || !prefs) return;

  try {
    storage.setItem(STORAGE_LAYOUT_PREFS_KEY, JSON.stringify(prefs));
  } catch (err) {
    console.warn('Failed to save layout preferences:', err);
  }
}

/**
 * Loads all saved projects from localStorage safely.
 * @returns {Array<object>}
 */
export function loadSavedProjects() {
  if (typeof window === 'undefined' || !window.localStorage) return [];
  try {
    const raw = localStorage.getItem(STORAGE_PROJECTS_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    if (!Array.isArray(list)) return [];
    return list.map((p) => migrateProjectSchema(p));
  } catch (err) {
    console.warn('Failed to load saved projects from localStorage:', err);
    return [];
  }
}

/**
 * Loads recent projects metadata for the Project Browser.
 * @returns {Array<object>}
 */
export function loadRecentProjects() {
  if (typeof window === 'undefined' || !window.localStorage) return [];
  try {
    const raw = localStorage.getItem(STORAGE_RECENT_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

/**
 * Executes a two-phase Atomic Save to prevent corrupting stored projects if a write fails.
 * 1. Write to Staging Key.
 * 2. Parse & Validate Staged Payload.
 * 3. Commit into Saved Projects Array.
 * 4. Update Recent Projects Index.
 * 5. Clear Recovery Journal for this project.
 * 
 * @param {object} project
 * @returns {{ success: boolean, project: object }}
 */
export function atomicSaveProject(project) {
  if (!project) throw new Error('Cannot save null project');

  const normalized = migrateProjectSchema(project);
  normalized.updatedAt = Date.now();

  const validation = validateProjectSchema(normalized);
  if (!validation.valid) {
    throw new Error(`Project validation failed: ${validation.errors.join('; ')}`);
  }

  const jsonPayload = serializeProject(normalized);

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      // Phase 1: Write to staging
      localStorage.setItem(STORAGE_STAGING_KEY, jsonPayload);

      // Phase 2: Verify staged integrity
      const stagedRaw = localStorage.getItem(STORAGE_STAGING_KEY);
      if (!stagedRaw || stagedRaw !== jsonPayload) {
        throw new Error('Staging verification mismatch: LocalStorage write failed');
      }

      // Phase 3: Commit to main storage
      const currentList = loadSavedProjects();
      const existingIdx = currentList.findIndex((p) => p.id === normalized.id);
      let nextList;
      if (existingIdx >= 0) {
        nextList = [...currentList];
        nextList[existingIdx] = normalized;
      } else {
        nextList = [normalized, ...currentList.slice(0, 24)];
      }
      localStorage.setItem(STORAGE_PROJECTS_KEY, JSON.stringify(nextList));

      // Phase 4: Update Recent Projects Index
      updateRecentIndex(normalized);

      // Phase 5: Clean up staging and clear recovery journal
      localStorage.removeItem(STORAGE_STAGING_KEY);
      clearRecoveryJournal();

      return { success: true, project: normalized };
    } catch (err) {
      console.error('Atomic save failed:', err);
      throw err;
    }
  }

  return { success: true, project: normalized };
}

/**
 * Updates the compact recent projects index.
 */
function updateRecentIndex(project) {
  try {
    const recents = loadRecentProjects();
    const item = {
      id: project.id,
      name: project.name,
      ratio: project.ratio,
      scenesCount: project.scenes?.length || 0,
      updatedAt: project.updatedAt || Date.now(),
    };
    const filtered = recents.filter((r) => r.id !== project.id);
    const nextRecents = [item, ...filtered.slice(0, 11)];
    localStorage.setItem(STORAGE_RECENT_KEY, JSON.stringify(nextRecents));
  } catch {
    // ignore quota errors
  }
}

/**
 * Creates a distinct duplicate project with a new persistent ID and name.
 * @param {object} project
 * @param {string} newName
 * @returns {object} Newly saved project
 */
export function saveAsProject(project, newName) {
  const now = Date.now();
  const cleanName = (newName && newName.trim()) || `${project.name || 'Project'} (Save As)`;
  const duplicated = {
    ...project,
    id: `proj_${now}_${Math.random().toString(36).slice(2, 7)}`,
    name: cleanName,
    createdAt: now,
    updatedAt: now,
  };

  const res = atomicSaveProject(duplicated);
  return res.project;
}

/**
 * Writes an incremental crash recovery journal entry.
 * @param {object} project
 */
export function recordRecoveryJournal(project) {
  if (typeof window === 'undefined' || !window.localStorage || !project) return;
  try {
    const journalEntry = {
      timestamp: Date.now(),
      projectId: project.id,
      projectName: project.name,
      payload: serializeProject(project),
    };
    localStorage.setItem(STORAGE_JOURNAL_KEY, JSON.stringify(journalEntry));
  } catch {
    // Ignore quota errors in background journal
  }
}

/**
 * Inspects localStorage for an uncommitted crash recovery journal.
 * @param {string} currentProjectId
 * @returns {{ hasRecovery: boolean, project?: object, timestamp?: number, projectName?: string }}
 */
export function checkRecoveryJournal(currentProjectId = null) {
  if (typeof window === 'undefined' || !window.localStorage) return { hasRecovery: false };
  try {
    const raw = localStorage.getItem(STORAGE_JOURNAL_KEY);
    if (!raw) return { hasRecovery: false };
    const entry = JSON.parse(raw);
    if (!entry || !entry.payload) return { hasRecovery: false };

    const recovered = deserializeProject(entry.payload);
    return {
      hasRecovery: true,
      project: recovered,
      timestamp: entry.timestamp,
      projectName: entry.projectName || recovered.name,
    };
  } catch (err) {
    console.warn('Failed to parse recovery journal:', err);
    return { hasRecovery: false };
  }
}

/**
 * Clears the recovery journal once changes are safely committed.
 */
export function clearRecoveryJournal() {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    localStorage.removeItem(STORAGE_JOURNAL_KEY);
  } catch {}
}
