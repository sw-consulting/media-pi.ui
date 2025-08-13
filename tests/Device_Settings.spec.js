// Copyright (c) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.
//
// This file is a part of Media Pi frontend application

import { library } from '@fortawesome/fontawesome-svg-core'
import { faCheckDouble, faXmark } from '@fortawesome/free-solid-svg-icons'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import DeviceSettings from '@/components/Device_Settings.vue'

library.add(faCheckDouble, faXmark)

let authStore
const devicesStore = {
  device: null,
  loading: false,
  getById: vi.fn(),
  register: vi.fn(),
  update: vi.fn()
}
const alertStore = {
  alert: null,
  error: vi.fn(),
  clear: vi.fn()
}

vi.mock('pinia', async () => {
  const actual = await vi.importActual('pinia')
  return { ...actual, storeToRefs: (store) => store }
})

vi.mock('@/router', () => ({
  default: { go: vi.fn() },
  $router: { go: vi.fn() }
}))

vi.mock('@/stores/auth.store.js', () => ({
  useAuthStore: () => authStore
}))

vi.mock('@/stores/devices.store.js', () => ({
  useDevicesStore: () => devicesStore
}))

vi.mock('@/stores/alert.store.js', () => ({
  useAlertStore: () => alertStore
}))

vi.mock('@/helpers/default.route.js', () => ({
  redirectToDefaultRoute: vi.fn()
}))

const mountSettings = (props = {}) => mount({
  template: '<Suspense><DeviceSettings v-bind="$attrs" /></Suspense>',
  components: { DeviceSettings },
  inheritAttrs: false
}, {
  attrs: {
    register: false,
    id: 1,
    accountId: 1,
    ...props
  },
  global: {
    stubs: {
      Form: {
        template: `
          <div data-testid="form" @submit="onSubmit">
            <slot :errors="errors" :isSubmitting="isSubmitting" />
          </div>
        `,
        props: ['validation-schema', 'initial-values'],
        emits: ['submit'],
        data() {
          return {
            errors: props.showValidationError ? { name: 'Необходимо указать имя', ipAddress: 'Необходимо указать IP адрес' } : {},
            isSubmitting: props.isSubmitting || false
          }
        },
        methods: {
          onSubmit() {
            this.$emit('submit', { name: props.submitName || 'Test Device', ipAddress: props.submitIp || '1.2.3.4' })
          }
        }
      },
      Field: {
        template: '<input />',
        props: ['name', 'type', 'disabled', 'class', 'placeholder']
      }
    },
    components: {
      'font-awesome-icon': FontAwesomeIcon
    }
  }
})

beforeEach(() => {
  authStore = { isAdministrator: true, isEngineer: false, isManager: false, user: { id: 1 } }
  devicesStore.device = null
  devicesStore.getById.mockReset()
  devicesStore.register.mockReset()
  devicesStore.update.mockReset()
  alertStore.error.mockReset()
})

describe('Device_Settings.vue', () => {
  it('submits create form and calls register and update', async () => {
    devicesStore.register.mockResolvedValue({ id: 5 })
    devicesStore.update.mockResolvedValue()

    const wrapper = mountSettings({ register: true, accountId: 3 })
    await flushPromises()

    const form = wrapper.find('[data-testid="form"]')
    await form.trigger('submit')
    await flushPromises()

    expect(devicesStore.register).toHaveBeenCalled()
    expect(devicesStore.update).toHaveBeenCalledWith(5, expect.objectContaining({ name: 'Test Device', ipAddress: '1.2.3.4', accountId: 3 }))
  })

  it('loads device and submits update', async () => {
    devicesStore.device = { id: 1, name: 'Old', ipAddress: '0.0.0.0', accountId: null }
    devicesStore.getById.mockResolvedValue()
    devicesStore.update.mockResolvedValue()

    const wrapper = mountSettings({ register: false, id: 1 })
    await flushPromises()

    const form = wrapper.find('[data-testid="form"]')
    await form.trigger('submit')
    await flushPromises()

    expect(devicesStore.getById).toHaveBeenCalledWith(1)
    expect(devicesStore.update).toHaveBeenCalledWith(1, expect.objectContaining({ name: 'Test Device', ipAddress: '1.2.3.4' }))
  })

  it('redirects when creating without permission', async () => {
    const { redirectToDefaultRoute } = await import('@/helpers/default.route.js')
    authStore.isAdministrator = false
    authStore.isEngineer = false

    mountSettings({ register: true, accountId: 5 })
    await flushPromises()

    expect(redirectToDefaultRoute).toHaveBeenCalled()
  })

  it('redirects engineer editing device with account', async () => {
    const { redirectToDefaultRoute } = await import('@/helpers/default.route.js')
    authStore.isAdministrator = false
    authStore.isEngineer = true
    devicesStore.device = { id: 1, name: 'Old', ipAddress: '0.0.0.0', accountId: 2 }
    devicesStore.getById.mockResolvedValue()

    mountSettings({ register: false, id: 1 })
    await flushPromises()

    expect(redirectToDefaultRoute).toHaveBeenCalled()
  })
})

