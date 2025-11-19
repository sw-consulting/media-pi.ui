/**
 * Configuration Module
 * This file is a part of Media Pi frontend application
 * 
 * Provides centralized configuration management for the Media Pi frontend application.
 * Supports runtime configuration through RUNTIME_CONFIG global variable and build-time
 * configuration through Vite environment variables.
 * 
 * Configuration Priority (highest to lowest):
 * 1. Runtime configuration (window.RUNTIME_CONFIG)
 * 2. Build-time environment variables (import.meta.env.VITE_*)
 * 3. Default fallback values
 * 
 * This approach allows for flexible deployment scenarios where configuration
 * can be modified without rebuilding the application.
 * 
 * @module Config
 * @author Maxim Samsonov
 * @since 2025
 */

/**
 * Main configuration object containing all application settings
 * 
 * @type {Object}
 * @property {string} apiUrl - Base URL for API endpoints
 * @property {boolean} enableLog - Whether to enable console logging
 */
export const config = {
  // API endpoint configuration with fallback chain
  apiUrl: window.RUNTIME_CONFIG?.apiUrl ||          // Runtime config (highest priority)
          import.meta.env.VITE_API_URL ||           // Build-time env variable
          'http://localhost:8080/api',              // Default fallback

  // Logging configuration with fallback chain
  enableLog: window.RUNTIME_CONFIG?.enableLog ||   // Runtime config (highest priority)
             import.meta.env.VITE_ENABLE_LOG ||    // Build-time env variable
             true                                  // Default fallback (enabled)
}

/**
 * API base URL for making HTTP requests
 * @type {string}
 * @example
 * // Usage in fetch calls
 * fetch(`${apiUrl}/users`)
 */
export const apiUrl = config.apiUrl

/**
 * Global logging enablement flag
 * @type {boolean}
 * @example
 * // Conditional logging
 * if (enableLog) {
 *   console.log('Debug information')
 * }
 */
export const enableLog = true // config.enableLog

/**
 * System operation timeout constants (in milliseconds)
 * @type {Object}
 */
/**
 * Helper to return the first valid numeric configuration value from the provided list.
 * @param {...any} values
 * @returns {number}
 */
function getNumberConfig (...values) {
  for (let i = 0; i < values.length; i++) {
    const val = values[i]
    if (val !== undefined && val !== null) {
      const num = Number(val)
      if (!Number.isNaN(num)) {
        return num
      }
    }
  }

  return 0
}

export const timeouts = {
  // Timeout after reboot operation before refreshing status
  reboot: getNumberConfig(
    window.RUNTIME_CONFIG?.timeouts?.reboot,
    import.meta.env.VITE_REBOOT_TIMEOUT
  ) || 30000, // 30 seconds

  // Timeout after shutdown operation before refreshing status
  shutdown: getNumberConfig(
    window.RUNTIME_CONFIG?.timeouts?.shutdown,
    import.meta.env.VITE_SHUTDOWN_TIMEOUT
  ) || 5000, // 5 seconds

  // Timeout after apply operation before refreshing status
  apply: getNumberConfig(
    window.RUNTIME_CONFIG?.timeouts?.apply,
    import.meta.env.VITE_APPLY_TIMEOUT
  ) || 10000 // 10 seconds
}
