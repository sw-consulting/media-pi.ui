// Copyright (c) 2025 sw.consulting
// This file is a part of Media Pi backend

async function loadConfig() {
  try {
    const response = await fetch('/config.json')
    const runtimeConfig = await response.json()
    window.RUNTIME_CONFIG = runtimeConfig
    return runtimeConfig
  } catch (error) {
    console.error('Failed to load runtime config:', error)
    window.RUNTIME_CONFIG = {} // Set empty object as fallback
    return {}
  }
}

// Initialize the application
function initializeApplication() {
  // Import CSS and app modules
  import('@/assets/main.css')
  
  import('./init.app.js').then(({ initializeApp }) => {
    initializeApp()
  })
}

// Load config first, then initialize app
loadConfig()
  .then(() => {
    initializeApplication()
  })
  .catch((error) => {
    console.error('Failed to initialize app after config load:', error)
    // Still try to initialize the app even if config loading failed
    initializeApplication()
  })
