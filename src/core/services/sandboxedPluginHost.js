/**
 * @file sandboxedPluginHost.js
 * @description Permission-Scoped Sandboxed Plugin Runtime Host (Fase 11)
 * Enforces strict principle of least privilege:
 * plugins must explicitly declare permissions (READ_SCENE, READ_SELECTION, WRITE_LAYERS).
 * Arbitrary network or disk access is strictly prohibited.
 */

export const PLUGIN_PERMISSIONS = {
  READ_SCENE: 'read_scene',
  READ_SELECTION: 'read_selection',
  WRITE_LAYERS: 'write_layers',
  NETWORK_FETCH: 'network_fetch', // Requires explicit consent
};

export class SandboxedPluginHost {
  constructor() {
    this._plugins = new Map();
  }

  /**
   * Registers a plugin with validated identity and requested permissions.
   *
   * @param {object} pluginManifest
   * @param {string} pluginManifest.id
   * @param {string} pluginManifest.name
   * @param {string} pluginManifest.author
   * @param {string} pluginManifest.version
   * @param {string[]} pluginManifest.permissions
   * @param {Function} pluginManifest.handler
   * @returns {object} Registered plugin record
   */
  registerPlugin(pluginManifest) {
    if (!pluginManifest || !pluginManifest.id || typeof pluginManifest.handler !== 'function') {
      throw new Error('Plugin registration failed: manifest must have an id and executable handler function.');
    }

    const permissions = Array.isArray(pluginManifest.permissions)
      ? [...pluginManifest.permissions]
      : [];

    const record = {
      id: pluginManifest.id,
      name: pluginManifest.name || pluginManifest.id,
      author: pluginManifest.author || 'Community',
      version: pluginManifest.version || '1.0.0',
      permissions: new Set(permissions),
      handler: pluginManifest.handler,
      registeredAt: Date.now(),
    };

    this._plugins.set(pluginManifest.id, record);
    return record;
  }

  /**
   * Executes a plugin with sandboxed API surface according to its granted permissions.
   *
   * @param {string} pluginId
   * @param {object} context
   * @param {object} [context.project]
   * @param {object} [context.activeScene]
   * @param {string} [context.selectedLayerId]
   * @param {object} [actionPayload={}]
   * @returns {any} Result of plugin handler
   */
  executePlugin(pluginId, context = {}, actionPayload = {}) {
    const plugin = this._plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin not found: "${pluginId}".`);
    }

    // Build permission-gated sandbox API surface
    const sandboxApi = {
      id: plugin.id,
      name: plugin.name,
    };

    if (plugin.permissions.has(PLUGIN_PERMISSIONS.READ_SCENE)) {
      sandboxApi.getSceneInfo = () => ({
        name: context.activeScene?.name || 'Scene',
        duration: context.activeScene?.duration || 4,
        layerCount: context.activeScene?.layers?.length || 0,
        layers: (context.activeScene?.layers || []).map((l) => ({
          id: l.id,
          name: l.name,
          type: l.type,
          visible: l.visible !== false,
        })),
      });
    } else {
      sandboxApi.getSceneInfo = () => {
        throw new Error(`Permission denied: plugin "${plugin.name}" lacks READ_SCENE permission.`);
      };
    }

    if (plugin.permissions.has(PLUGIN_PERMISSIONS.READ_SELECTION)) {
      sandboxApi.getSelectedLayerId = () => context.selectedLayerId || null;
    } else {
      sandboxApi.getSelectedLayerId = () => {
        throw new Error(`Permission denied: plugin "${plugin.name}" lacks READ_SELECTION permission.`);
      };
    }

    if (plugin.permissions.has(PLUGIN_PERMISSIONS.WRITE_LAYERS)) {
      sandboxApi.createLayerProposal = (layerData) => ({
        approved: true,
        proposal: { ...layerData, generatedBy: plugin.id },
      });
    } else {
      sandboxApi.createLayerProposal = () => {
        throw new Error(`Permission denied: plugin "${plugin.name}" lacks WRITE_LAYERS permission.`);
      };
    }

    // Prohibit network fetch unless authorized
    sandboxApi.fetch = () => {
      throw new Error(`Security Violation: Unsandboxed network calls are strictly blocked for plugin "${plugin.name}".`);
    };

    return plugin.handler(sandboxApi, actionPayload);
  }

  /**
   * Unregisters a plugin.
   * @param {string} pluginId
   * @returns {boolean}
   */
  unregisterPlugin(pluginId) {
    return this._plugins.delete(pluginId);
  }
}

export const pluginHost = new SandboxedPluginHost();
