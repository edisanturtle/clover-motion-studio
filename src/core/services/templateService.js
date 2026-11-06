/**
 * @file templateService.js
 * @description Template Registry, Search, Filter & Save-As-Template Service (Fase 8)
 * Manages versioned templates with license/source metadata, multi-ratio support,
 * custom template persistence, and template cloning.
 */

import { TEMPLATE_CATALOG } from '../../constants/templateCatalog.js';

export const CUSTOM_TEMPLATES_STORAGE_KEY = 'clover_motion_custom_templates_v1';

export const TEMPLATE_LICENSES = [
  { id: 'all', name: 'All Licenses' },
  { id: 'MIT', name: 'MIT License (Permissive)' },
  { id: 'CC-BY-4.0', name: 'Creative Commons CC-BY 4.0' },
  { id: 'OFL-1.1', name: 'SIL Open Font License 1.1' },
  { id: 'local-user', name: 'Local User / Proprietary' },
];

/**
 * Enriches catalog templates with standardized version and license metadata.
 * @param {Array<object>} catalog
 * @returns {Array<object>}
 */
export function normalizeTemplateCatalog(catalog = TEMPLATE_CATALOG) {
  return catalog.map((tpl) => ({
    ...tpl,
    templateVersion: 1,
    license: tpl.license || 'MIT',
    author: tpl.author || 'Clover Motion Studio',
    source: tpl.source || 'clover.motion official',
    supportedRatios: tpl.supportedRatios || ['4:5', '1:1', '9:16', '16:9', '4:3', '3:4'],
    tags: Array.isArray(tpl.tags) ? tpl.tags : [tpl.purpose, tpl.category, tpl.motionPreset].filter(Boolean),
  }));
}

/**
 * Searches and filters templates by query string, category, ratio, and license.
 *
 * @param {Array<object>} catalog
 * @param {object} filters - { query, category, ratio, license }
 * @returns {Array<object>} Filtered templates
 */
export function searchAndFilterTemplates(catalog, { query = '', category = 'All', ratio = 'all', license = 'all' } = {}) {
  const normalized = normalizeTemplateCatalog(catalog);
  const q = String(query || '').trim().toLowerCase();

  return normalized.filter((item) => {
    // 1. Text Query Search
    if (q) {
      const matchName = item.name?.toLowerCase().includes(q);
      const matchDesc = item.desc?.toLowerCase().includes(q);
      const matchPurpose = item.purpose?.toLowerCase().includes(q);
      const matchAuthor = item.author?.toLowerCase().includes(q);
      const matchTags = item.tags?.some((t) => t.toLowerCase().includes(q));
      if (!matchName && !matchDesc && !matchPurpose && !matchAuthor && !matchTags) {
        return false;
      }
    }

    // 2. Category Filter
    if (category && category !== 'All') {
      if (item.category !== category && item.collection !== category) {
        return false;
      }
    }

    // 3. Ratio Filter
    if (ratio && ratio !== 'all') {
      if (!item.supportedRatios?.includes(ratio)) {
        return false;
      }
    }

    // 4. License Filter
    if (license && license !== 'all') {
      if (item.license !== license) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Converts a project into a versioned reusable template and saves to localStorage.
 *
 * @param {object} project
 * @param {object} metadata - { name, category, license, author, purpose, desc }
 * @returns {object} Created custom template
 */
export function saveProjectAsCustomTemplate(project, metadata = {}) {
  if (!project) throw new Error('Cannot create template from null project');

  const now = Date.now();
  const id = `tpl_user_${now}_${Math.random().toString(36).slice(2, 7)}`;
  const templateName = metadata.name || `${project.name || 'Custom Project'} Template`;

  const newTemplate = {
    id,
    templateVersion: 1,
    name: templateName,
    purpose: metadata.purpose || 'Custom motion template',
    badge: 'USER',
    category: metadata.category || 'User Custom',
    collection: 'My Templates',
    author: metadata.author || 'Local User',
    license: metadata.license || 'local-user',
    source: 'User Studio Project',
    supportedRatios: ['4:5', '1:1', '9:16', '16:9', '4:3', '3:4'],
    durationSec: project.scenes?.reduce((acc, s) => acc + (s.duration || 4), 0) || 12,
    scenesCount: project.scenes?.length || 1,
    sizesCount: 6,
    bg: project.scenes?.[0]?.bg || '#101935',
    palette: project.palette || ['#101935', '#f5f1e6', '#5983ff'],
    desc: metadata.desc || `User custom template saved from "${project.name}" on ${new Date(now).toLocaleDateString()}`,
    scenes: (project.scenes || []).map((sc) => ({ ...sc })),
    videoTracks: (project.videoTracks || []).map((vt) => ({ ...vt })),
    audioTracks: (project.audioTracks || []).map((at) => ({ ...at })),
    tags: Array.isArray(metadata.tags) ? metadata.tags : ['custom', 'user', project.ratio || '4:5'],
    createdAt: now,
    updatedAt: now,
  };

  // Persist to local storage if running in browser
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const existing = loadCustomTemplates();
      const updated = [newTemplate, ...existing];
      window.localStorage.setItem(CUSTOM_TEMPLATES_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to persist custom template to localStorage:', e);
    }
  }

  return newTemplate;
}

/**
 * Duplicates an existing template into an editable clone with independent ID.
 *
 * @param {object} template
 * @param {string} newName
 * @returns {object} Cloned template
 */
export function duplicateTemplate(template, newName = null) {
  if (!template) throw new Error('Cannot duplicate null template');

  const now = Date.now();
  const cloneId = `tpl_copy_${now}_${Math.random().toString(36).slice(2, 6)}`;

  return {
    ...template,
    id: cloneId,
    name: newName || `${template.name} (Copy)`,
    badge: 'USER',
    author: 'Local User',
    license: 'local-user',
    source: `Duplicated from ${template.name}`,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Loads user saved custom templates from localStorage.
 * @returns {Array<object>}
 */
export function loadCustomTemplates() {
  if (typeof window === 'undefined' || !window.localStorage) return [];
  try {
    const raw = window.localStorage.getItem(CUSTOM_TEMPLATES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Deletes a custom template from localStorage.
 * @param {string} templateId
 * @returns {boolean} Success
 */
export function deleteCustomTemplate(templateId) {
  if (typeof window === 'undefined' || !window.localStorage) return false;
  try {
    const existing = loadCustomTemplates();
    const filtered = existing.filter((t) => t.id !== templateId);
    window.localStorage.setItem(CUSTOM_TEMPLATES_STORAGE_KEY, JSON.stringify(filtered));
    return true;
  } catch {
    return false;
  }
}
