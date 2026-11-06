/**
 * @file privacyConsentService.js
 * @description Cloud, Collaboration & AI Privacy Consent Gatekeeper (Fase 11)
 * Enforces strict user consent, permission-scoped data transfer, destination disclosure,
 * and automatic quarantining of services with unvetted licensing or security audits.
 */

// Registry of approved vs quarantined services
export const SERVICE_COMPLIANCE_STATUS = {
  // Verified offline and audited open services
  LOCAL_EXPORT: {
    id: 'local_export',
    name: 'Local Browser Exporter',
    provider: 'Local Device Runtime',
    destination: 'file://localhost',
    clearedForRelease: true,
    licenseAuditStatus: 'VERIFIED_MIT',
    securityAuditStatus: 'VERIFIED_OFFLINE',
  },
  IPFS_DECENTRALIZED_STORAGE: {
    id: 'ipfs_vault',
    name: 'Decentralized IPFS Storage',
    provider: 'InterPlanetary File System',
    destination: 'https://ipfs.io',
    clearedForRelease: true,
    licenseAuditStatus: 'VERIFIED_APACHE2_MIT',
    securityAuditStatus: 'VERIFIED_PERMISSION_SCOPED',
  },
  // Quarantined / Unvetted Services (Excluded from Release per Fase 11 Policy)
  UNVETTED_AI_CLOUD_RELAY: {
    id: 'unvetted_ai_relay',
    name: 'Unvetted 3rd-Party AI Cloud Relay',
    provider: 'External Cloud Host',
    destination: 'https://api.unvetted-ai-relay.com',
    clearedForRelease: false,
    licenseAuditStatus: 'PENDING_VENDOR_AGREEMENT',
    securityAuditStatus: 'FAILED_UNENCRYPTED_TELEMETRY',
    quarantineReason: 'Licensing & security audit pending. Integration strictly excluded from release.',
  },
  UNVETTED_ANALYTICS_TRACKER: {
    id: 'unvetted_tracker',
    name: 'Third-Party Analytics Beacon',
    provider: 'Unknown Ad Network',
    destination: 'https://tracker.untrusted.net',
    clearedForRelease: false,
    licenseAuditStatus: 'NON_COMPLIANT_GDPR',
    securityAuditStatus: 'FAILED_TRACKING_INJECTION',
    quarantineReason: 'Violates offline-first privacy directive. Quarantined.',
  },
};

/**
 * Checks if a service is cleared for release.
 * @param {string} serviceId
 * @returns {{ allowed: boolean, reason?: string, service?: object }}
 */
export function isServicePermitted(serviceId) {
  const service = SERVICE_COMPLIANCE_STATUS[serviceId?.toUpperCase()] ||
    Object.values(SERVICE_COMPLIANCE_STATUS).find((s) => s.id === serviceId);

  if (!service) {
    return {
      allowed: false,
      reason: `Unknown or unregistered service "${serviceId}". Excluded from release.`,
    };
  }

  if (!service.clearedForRelease) {
    return {
      allowed: false,
      reason: service.quarantineReason || 'Security/licensing audit incomplete. Excluded from release.',
      service,
    };
  }

  return {
    allowed: true,
    service,
  };
}

/**
 * Validates transfer consent before any network or cloud payload is dispatched.
 *
 * @param {object} manifest
 * @param {string} manifest.serviceId
 * @param {string} manifest.providerName
 * @param {string} manifest.destinationUrl
 * @param {string} manifest.purpose
 * @param {string[]} manifest.dataCategories - e.g. ['scene_metadata', 'project_schema']
 * @param {boolean} manifest.userConsented - User explicitly clicked authorize
 * @param {number} [manifest.payloadBytes=0]
 * @returns {{ authorized: boolean, transferId: string, timestamp: string }}
 */
export function validateAndAuthorizeTransfer(manifest) {
  if (!manifest) {
    throw new Error('Transfer blocked: No transfer manifest provided.');
  }

  // 1. Verify Service Clearance
  const clearance = isServicePermitted(manifest.serviceId);
  if (!clearance.allowed) {
    throw new Error(`Transfer blocked by security policy: ${clearance.reason}`);
  }

  // 2. Enforce Transparent Destination & Provider Disclosures
  if (!manifest.destinationUrl || !manifest.providerName) {
    throw new Error('Transfer blocked: Destination URL and Provider Name must be explicitly disclosed.');
  }

  // 3. Strict User Consent Check
  if (manifest.userConsented !== true) {
    throw new Error(
      `Transfer blocked: Explicit user consent is strictly required before transmitting project or media data to ${manifest.providerName} (${manifest.destinationUrl}).`
    );
  }

  // 4. Data Category Scoping
  if (!Array.isArray(manifest.dataCategories) || manifest.dataCategories.length === 0) {
    throw new Error('Transfer blocked: Data categories must be explicitly scoped (zero open-ended transfers allowed).');
  }

  const transferId = `xfer_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  return {
    authorized: true,
    transferId,
    timestamp: new Date().toISOString(),
    provider: manifest.providerName,
    destination: manifest.destinationUrl,
    categories: manifest.dataCategories,
  };
}
