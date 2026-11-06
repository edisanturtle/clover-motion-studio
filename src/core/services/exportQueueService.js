/**
 * @file exportQueueService.js
 * @description Export Queue, Batch Processing & Diagnostic Logging Service (Fase 10)
 * Manages asynchronous export tasks with progress tracking, non-blocking cancellation,
 * error retries, and detailed per-frame diagnostic logs.
 */

export const EXPORT_STATUS = {
  QUEUED: 'queued',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
};

/**
 * Creates a validated Export Task Queue Item.
 * @param {object} init
 * @returns {object} ExportQueueItem
 */
export function createExportItem(init = {}) {
  const id = init.id || `export_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const now = Date.now();

  return {
    id,
    name: init.name || 'Untitled Export',
    format: init.format || 'webm', // 'png' | 'zip' | 'webm' | 'mp4' | 'audio' | 'bundle'
    ratio: init.ratio || '4:5',
    resolutionScale: init.resolutionScale || 'original', // 'half' (0.5x) | 'original' (1x) | 'double' (2x)
    fps: Number(init.fps) || 30,
    rangeIn: Number(init.rangeIn) || 0,
    rangeOut: init.rangeOut !== undefined && init.rangeOut !== null ? Number(init.rangeOut) : null,
    includeAudio: init.includeAudio !== false,
    transparentBg: Boolean(init.transparentBg),
    codec: init.codec || 'video/webm;codecs=vp9',
    status: init.status || EXPORT_STATUS.QUEUED,
    progress: Number(init.progress) || 0, // 0.0 to 1.0
    currentFrame: Number(init.currentFrame) || 0,
    totalFrames: Number(init.totalFrames) || 0,
    createdAt: init.createdAt || now,
    startedAt: init.startedAt || null,
    completedAt: init.completedAt || null,
    elapsedMs: Number(init.elapsedMs) || 0,
    error: init.error || null,
    logs: Array.isArray(init.logs) ? [...init.logs] : [
      { timestamp: new Date(now).toISOString(), message: 'Export task queued.', level: 'info' },
    ],
  };
}

/**
 * Appends a new export item to the queue.
 * @param {Array<object>} queue
 * @param {object} itemData
 * @returns {Array<object>}
 */
export function addExportItem(queue = [], itemData = {}) {
  const item = createExportItem(itemData);
  return [...queue, item];
}

/**
 * Updates an export item in the queue by ID.
 * @param {Array<object>} queue
 * @param {string} itemId
 * @param {object} patch
 * @returns {Array<object>}
 */
export function updateExportItem(queue = [], itemId, patch = {}) {
  return queue.map((item) => {
    if (item.id === itemId) {
      return {
        ...item,
        ...patch,
      };
    }
    return item;
  });
}

/**
 * Appends a timestamped log entry to an export item.
 * @param {Array<object>} queue
 * @param {string} itemId
 * @param {string} message
 * @param {'info' | 'warn' | 'error' | 'success'} [level='info']
 * @returns {Array<object>}
 */
export function appendExportLog(queue = [], itemId, message, level = 'info') {
  const timestamp = new Date().toISOString();
  return queue.map((item) => {
    if (item.id === itemId) {
      return {
        ...item,
        logs: [...item.logs, { timestamp, message, level }],
      };
    }
    return item;
  });
}

/**
 * Cancels an active or queued export item cleanly.
 * @param {Array<object>} queue
 * @param {string} itemId
 * @returns {Array<object>}
 */
export function cancelExportItem(queue = [], itemId) {
  const timestamp = new Date().toISOString();
  return queue.map((item) => {
    if (item.id === itemId) {
      if (item.status === EXPORT_STATUS.COMPLETED) return item;
      return {
        ...item,
        status: EXPORT_STATUS.CANCELLED,
        completedAt: Date.now(),
        logs: [
          ...item.logs,
          { timestamp, message: 'Export cancelled by user.', level: 'warn' },
        ],
      };
    }
    return item;
  });
}

/**
 * Resets a failed or cancelled export item to retry from the beginning.
 * @param {Array<object>} queue
 * @param {string} itemId
 * @returns {Array<object>}
 */
export function retryExportItem(queue = [], itemId) {
  const timestamp = new Date().toISOString();
  return queue.map((item) => {
    if (item.id === itemId) {
      return {
        ...item,
        status: EXPORT_STATUS.QUEUED,
        progress: 0,
        currentFrame: 0,
        startedAt: null,
        completedAt: null,
        elapsedMs: 0,
        error: null,
        logs: [
          ...item.logs,
          { timestamp, message: 'Export task re-queued for retry.', level: 'info' },
        ],
      };
    }
    return item;
  });
}

/**
 * Removes completed, failed, or cancelled export items from the queue.
 * @param {Array<object>} queue
 * @returns {Array<object>}
 */
export function clearCompletedItems(queue = []) {
  return queue.filter((item) => item.status === EXPORT_STATUS.PROCESSING || item.status === EXPORT_STATUS.QUEUED);
}

/**
 * Generates batch variant export queue items for multiple social/event aspect ratios.
 *
 * @param {object} project
 * @param {string[]} [ratios=['4:5', '1:1', '9:16']]
 * @param {object} [baseOptions={}]
 * @returns {Array<object>} Array of ExportQueueItems
 */
export function createBatchVariantItems(project, ratios = ['4:5', '1:1', '9:16'], baseOptions = {}) {
  const projName = project?.name || 'Project';
  return ratios.map((ratio) => {
    const ratioClean = ratio.replace(':', 'x');
    return createExportItem({
      ...baseOptions,
      name: `${projName} [${ratio}]`,
      ratio,
      format: baseOptions.format || 'png',
      resolutionScale: baseOptions.resolutionScale || 'original',
      fps: baseOptions.fps || project?.fps || 30,
      includeAudio: baseOptions.includeAudio !== false,
      transparentBg: Boolean(baseOptions.transparentBg),
    });
  });
}
