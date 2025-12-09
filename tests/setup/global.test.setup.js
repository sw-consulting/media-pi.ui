// Global test setup to silence repeated Vue warnings (e.g. unresolved font-awesome-icon) and provide common stubs.
// This file is loaded by vitest via setupFiles.

import { vi } from 'vitest'
import { config } from '@vue/test-utils'

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

// Provide a global stub for font-awesome-icon to avoid resolution warnings
vi.mock('@fortawesome/vue-fontawesome', () => ({
  FontAwesomeIcon: { name: 'font-awesome-icon', render: () => null }
}))

// Vue warnHandler is not reliably available in test env; relying on console.warn override only.

// Provide a global stub for v-tooltip to avoid repeated unresolved component warnings
config.global.stubs = {
  ...(config.global.stubs || {}),
  'v-tooltip': { template: '<div><slot name="activator" :props="{}"></slot><slot /></div>' }
}
