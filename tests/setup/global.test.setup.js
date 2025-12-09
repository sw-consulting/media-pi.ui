// Global test setup to silence repeated Vue warnings (e.g. unresolved font-awesome-icon) and provide common stubs.
// This file is loaded by vitest via setupFiles.

import { vi } from 'vitest'
import { config } from '@vue/test-utils'

// Provide a global stub for font-awesome-icon to avoid resolution warnings
const fontAwesomeIconStub = { name: 'font-awesome-icon', render: () => null }
vi.mock('@fortawesome/vue-fontawesome', () => ({
  FontAwesomeIcon: fontAwesomeIconStub
}))

const tooltipStub = {
  name: 'v-tooltip',
  template: '<div><slot name="activator" :props="{}"></slot><slot /></div>'
}

config.global.components = {
  ...(config.global.components || {}),
  'font-awesome-icon': fontAwesomeIconStub,
  'v-tooltip': tooltipStub
}

