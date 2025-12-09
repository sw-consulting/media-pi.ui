// Global test setup to silence repeated Vue warnings (e.g. unresolved font-awesome-icon) and provide common stubs.
// This file is loaded by vitest via setupFiles.

import { vi } from 'vitest'
import { config } from '@vue/test-utils'
<<<<<<< HEAD
=======

// Suppress specific component resolution warnings
const originalWarn = console.warn
console.warn = (...args) => {
  const msg = args[0]
  if (typeof msg === 'string' && (
    msg.includes('Failed to resolve component: font-awesome-icon') ||
    msg.includes('Failed to resolve component: v-tooltip') ||
    msg.includes('<Suspense> is an experimental feature')
  )) {
    return // ignore noisy warnings
  }
  originalWarn(...args)
}
>>>>>>> 1ba0dca2e01cb765bdbd79a0fb46e186c0e877ec

// Provide a global stub for font-awesome-icon to avoid resolution warnings
const fontAwesomeIconStub = { name: 'font-awesome-icon', render: () => null }
vi.mock('@fortawesome/vue-fontawesome', () => ({
  FontAwesomeIcon: fontAwesomeIconStub
}))
config.global.components = {
  ...(config.global.components || {}),
  'font-awesome-icon': fontAwesomeIconStub
}

<<<<<<< HEAD
=======
// Vue warnHandler is not reliably available in test env; relying on console.warn override only.

// Provide a global stub for v-tooltip to avoid repeated unresolved component warnings
config.global.stubs = {
  ...(config.global.stubs || {}),
  'v-tooltip': { template: '<div><slot name="activator" v-bind="props"></slot><slot /></div>' }
}
>>>>>>> 1ba0dca2e01cb765bdbd79a0fb46e186c0e877ec
