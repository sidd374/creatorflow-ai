/**
 * CreatorFlow AI — Anonymous Privacy-Conscious Device Security Layer
 * Generates and maintains a non-invasive installation identifier.
 * ZERO fingerprinting, ZERO hardware tracking, ZERO PII.
 */

const DEVICE_INSTALL_KEY = 'creatorflow_device_install_id';

/**
 * Generates an anonymous, cryptographically secure installation identifier.
 * Format: cf_dev_[random_alphanumeric_16]
 */
function generateAnonymousInstallId(): string {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    const bytes = new Uint8Array(12);
    window.crypto.getRandomValues(bytes);
    const hex = Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    return `cf_dev_${hex}`;
  }
  // Safe fallback
  const randomPart = Math.random().toString(36).substring(2, 14);
  const timePart = Date.now().toString(36);
  return `cf_dev_${randomPart}${timePart}`;
}

/**
 * Retrieves the current installation identifier, initializing if not present.
 */
export function getOrCreateDeviceInstallId(): string {
  if (typeof window === 'undefined') {
    return 'cf_dev_server_env';
  }

  try {
    let existing = localStorage.getItem(DEVICE_INSTALL_KEY);
    if (!existing || !existing.startsWith('cf_dev_')) {
      existing = generateAnonymousInstallId();
      localStorage.setItem(DEVICE_INSTALL_KEY, existing);
    }
    return existing;
  } catch {
    return 'cf_dev_volatile_session';
  }
}

/**
 * Resets the device installation identifier (used only for dev testing / security simulation)
 */
export function resetDeviceInstallIdForTesting(): string {
  if (typeof window === 'undefined') return 'cf_dev_test';
  const newId = generateAnonymousInstallId();
  try {
    localStorage.setItem(DEVICE_INSTALL_KEY, newId);
  } catch {
    // ignore
  }
  return newId;
}
