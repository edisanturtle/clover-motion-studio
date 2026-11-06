/**
 * @file assetRegistry.js
 * @description Local Media & Asset Registry Manager (Fase 2)
 * Manages portable asset manifests, cancellable import queues, thumbnail generation,
 * missing asset detection, and offline relinking without server transmission.
 */

/**
 * Creates a validated Asset Record entity.
 * @param {object} init
 * @returns {object} AssetRecord
 */
export function createAssetRecord(init = {}) {
  const now = Date.now();
  return {
    id: init.id || `asset_${now}_${Math.random().toString(36).slice(2, 7)}`,
    name: init.name || 'Untitled Asset',
    type: init.type || 'image', // 'image' | 'audio' | 'font' | 'video'
    mimeType: init.mimeType || 'application/octet-stream',
    size: Number(init.size) || 0,
    hash: init.hash || null,
    dataUrl: init.dataUrl || null,
    thumbnail: init.thumbnail || null,
    status: init.status || 'loaded', // 'loaded' | 'missing' | 'importing'
    license: init.license || 'local-user', // 'OFL-1.1' | 'local-user' | 'permissive'
    createdAt: init.createdAt || now,
    updatedAt: now,
  };
}

/**
 * Reads a local browser File into an Asset Record with Base64 data and thumbnail.
 * Supports abort signals for cancellable imports.
 * @param {File} file
 * @param {object} options - { onProgress, signal, license }
 * @returns {Promise<object>} AssetRecord
 */
export function importLocalFileToAsset(file, { onProgress, signal, license = 'local-user' } = {}) {
  return new Promise((resolve, reject) => {
    if (!file) {
      return reject(new Error('No file provided for asset import'));
    }

    if (signal?.aborted) {
      return reject(new Error('Asset import aborted by user'));
    }

    const reader = new FileReader();

    if (signal) {
      signal.addEventListener('abort', () => {
        reader.abort();
        reject(new Error('Asset import aborted by user'));
      });
    }

    reader.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    reader.onerror = () => {
      reject(new Error(`Failed to read file "${file.name}"`));
    };

    reader.onload = async () => {
      try {
        const dataUrl = reader.result;
        const type = file.type.startsWith('image/')
          ? 'image'
          : file.type.startsWith('audio/')
          ? 'audio'
          : file.type.startsWith('video/')
          ? 'video'
          : file.name.endsWith('.ttf') || file.name.endsWith('.otf') || file.name.endsWith('.woff2')
          ? 'font'
          : 'image';

        // Generate lightweight thumbnail for images
        let thumbnail = null;
        if (type === 'image' && typeof document !== 'undefined') {
          thumbnail = await generateImageThumbnail(dataUrl, 120, 120);
        }

        const asset = createAssetRecord({
          name: file.name,
          type,
          mimeType: file.type || 'application/octet-stream',
          size: file.size,
          dataUrl,
          thumbnail: thumbnail || dataUrl,
          status: 'loaded',
          license,
        });

        resolve(asset);
      } catch (err) {
        reject(err);
      }
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Generates an offscreen canvas thumbnail without polluting the DOM.
 */
function generateImageThumbnail(dataUrl, maxWidth = 120, maxHeight = 120) {
  return new Promise((resolve) => {
    if (typeof Image === 'undefined') return resolve(null);
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ratio = Math.min(maxWidth / img.width, maxHeight / img.height, 1);
        canvas.width = Math.round(img.width * ratio);
        canvas.height = Math.round(img.height * ratio);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const thumbUrl = canvas.toDataURL('image/jpeg', 0.8);
        resolve(thumbUrl);
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = dataUrl;
  });
}

/**
 * Registers an asset in the project manifest idempotently.
 * @param {object} project
 * @param {object} asset
 * @returns {object} Updated Project
 */
export function registerAssetInProject(project, asset) {
  if (!project || !asset || !asset.id) return project;
  const assets = { ...(project.assets || {}) };
  assets[asset.id] = asset;
  return {
    ...project,
    assets,
    updatedAt: Date.now(),
  };
}

/**
 * Relinks an existing asset ID to a newly supplied File source.
 * Preserves all layer mappings throughout the project.
 * @param {object} project
 * @param {string} assetId
 * @param {File} newFile
 * @returns {Promise<object>} Updated Project with relinked asset
 */
export async function relinkAssetInProject(project, assetId, newFile) {
  if (!project || !project.assets || !project.assets[assetId]) {
    throw new Error(`Asset ID "${assetId}" does not exist in project`);
  }

  const updatedAsset = await importLocalFileToAsset(newFile, {
    license: project.assets[assetId].license,
  });

  // Keep the same assetId so all layers referencing it remain valid!
  updatedAsset.id = assetId;

  return registerAssetInProject(project, updatedAsset);
}

/**
 * Verifies all asset references across scenes and layers in a project.
 * Detects missing or corrupted assets.
 * @param {object} project
 * @returns {{ verifiedCount: number, missingAssets: string[] }}
 */
export function verifyProjectAssets(project) {
  const assets = project?.assets || {};
  const missingAssets = [];
  let verifiedCount = 0;

  (project?.scenes || []).forEach((scene) => {
    // Check scene media slots
    (scene.mediaSlots || []).forEach((slot) => {
      if (typeof slot === 'string' && slot.startsWith('asset_')) {
        if (!assets[slot] || assets[slot].status === 'missing' || !assets[slot].dataUrl) {
          missingAssets.push(slot);
        } else {
          verifiedCount++;
        }
      }
    });

    // Check layer image/media sources
    (scene.layers || []).forEach((layer) => {
      if (layer.assetId) {
        if (!assets[layer.assetId] || assets[layer.assetId].status === 'missing' || !assets[layer.assetId].dataUrl) {
          missingAssets.push(layer.assetId);
        } else {
          verifiedCount++;
        }
      }
    });
  });

  return {
    verifiedCount,
    missingAssets: Array.from(new Set(missingAssets)),
  };
}
