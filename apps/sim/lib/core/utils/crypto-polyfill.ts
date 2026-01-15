/**
 * Polyfill for crypto.randomUUID() for browsers/environments that don't support it
 * This ensures compatibility across different environments
 */

/**
 * Generate a RFC4122 version 4 compliant UUID
 * Falls back to a custom implementation if crypto.randomUUID is not available
 */
export function generateUUID(): string {
  // Check if native crypto.randomUUID is available
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  // Fallback implementation for environments without crypto.randomUUID
  // This implementation is compliant with RFC4122 version 4
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

/**
 * Initialize the polyfill by patching crypto.randomUUID if it doesn't exist
 * Call this early in your application bootstrap
 */
export function initCryptoPolyfill(): void {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID !== 'function') {
    // @ts-expect-error - Adding polyfill to crypto object
    crypto.randomUUID = generateUUID
  }
}
