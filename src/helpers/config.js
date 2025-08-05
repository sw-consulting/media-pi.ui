// Copyright (c) 2025 sw.consulting
// Licensed under the MIT License.
// This file is a part of Mediapi frontend application

// Create a config object that checks runtime first, then build-time, then fallback
export const config = {
  apiUrl: window.RUNTIME_CONFIG?.apiUrl ||
          import.meta.env.VITE_API_URL ||
          'http://localhost:8080/api',
  enableLog: window.RUNTIME_CONFIG?.enableLog ||
             import.meta.env.VITE_ENABLE_LOG ||
             true
}

// Export individual config values for backward compatibility
export const apiUrl = config.apiUrl
export const enableLog = config.enableLog
