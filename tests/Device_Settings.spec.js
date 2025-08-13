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

  // New tests for better coverage

  describe('permission checks', () => {
    it('allows engineers to create devices', async () => {
      authStore.isAdministrator = false
      authStore.isEngineer = true
      authStore.isManager = false

      const wrapper = mountSettings({ register: true })
      await flushPromises()

      expect(wrapper.find('h1').text()).toBe('Новое устройство')
    })

    it('allows managers to edit devices', async () => {
      authStore.isAdministrator = false
      authStore.isEngineer = false
      authStore.isManager = true
      devicesStore.device = { id: 1, name: 'Device', ipAddress: '1.2.3.4', accountId: 1 }
      devicesStore.getById.mockResolvedValue()

      const wrapper = mountSettings({ register: false, id: 1 })
      await flushPromises()

      expect(wrapper.find('h1').text()).toBe('Настройки устройства')
    })

    it('allows engineers to edit unassigned devices', async () => {
      authStore.isAdministrator = false
      authStore.isEngineer = true
      authStore.isManager = false
      devicesStore.device = { id: 1, name: 'Device', ipAddress: '1.2.3.4', accountId: null }
      devicesStore.getById.mockResolvedValue()

      const wrapper = mountSettings({ register: false, id: 1 })
      await flushPromises()

      expect(wrapper.find('h1').text()).toBe('Настройки устройства')
    })
  })

  describe('device loading errors', () => {
    it('handles device not found error during load', async () => {
      devicesStore.device = null
      devicesStore.getById.mockResolvedValue()

      mountSettings({ register: false, id: 1 })
      await flushPromises()

      expect(alertStore.error).toHaveBeenCalledWith('Ошибка загрузки устройства: Устройство с ID 1 не найдено')
    })

    it('handles 401/403 errors during load', async () => {
      const { redirectToDefaultRoute } = await import('@/helpers/default.route.js')
      const error = { status: 401 }
      devicesStore.getById.mockRejectedValue(error)

      mountSettings({ register: false, id: 1 })
      await flushPromises()

      expect(redirectToDefaultRoute).toHaveBeenCalled()
    })

    it('handles 404 errors during load', async () => {
      const error = { status: 404 }
      devicesStore.getById.mockRejectedValue(error)

      mountSettings({ register: false, id: 1 })
      await flushPromises()

      expect(alertStore.error).toHaveBeenCalledWith('Устройство с ID 1 не найдено')
    })

    it('handles other errors during load', async () => {
      const error = { message: 'Network error' }
      devicesStore.getById.mockRejectedValue(error)

      mountSettings({ register: false, id: 1 })
      await flushPromises()

      expect(alertStore.error).toHaveBeenCalledWith('Ошибка загрузки устройства: Network error')
    })

    it('handles errors without status property during load', async () => {
      const error = new Error('Network error')
      devicesStore.getById.mockRejectedValue(error)

      mountSettings({ register: false, id: 1 })
      await flushPromises()

      expect(alertStore.error).toHaveBeenCalledWith('Ошибка загрузки устройства: Network error')
    })

    it('handles axios-style errors during load', async () => {
      const error = { status: 404, response: { status: 404, data: { message: 'Not found' } } }
      devicesStore.getById.mockRejectedValue(error)

      mountSettings({ register: false, id: 1 })
      await flushPromises()

      expect(alertStore.error).toHaveBeenCalledWith('Устройство с ID 1 не найдено')
    })
  })

  describe('form submission errors', () => {
    it('handles 401/403 errors during create', async () => {
      const { redirectToDefaultRoute } = await import('@/helpers/default.route.js')
      devicesStore.register.mockResolvedValue({ id: 5 })
      devicesStore.update.mockRejectedValue({ status: 401 })

      const wrapper = mountSettings({ register: true })
      await flushPromises()

      const form = wrapper.find('[data-testid="form"]')
      await form.trigger('submit')
      await flushPromises()

      expect(redirectToDefaultRoute).toHaveBeenCalled()
    })

    it('handles 404 errors during update', async () => {
      devicesStore.device = { id: 1, name: 'Device', ipAddress: '1.2.3.4' }
      devicesStore.getById.mockResolvedValue()
      devicesStore.update.mockRejectedValue({ status: 404 })

      const wrapper = mountSettings({ register: false, id: 1 })
      await flushPromises()

      const form = wrapper.find('[data-testid="form"]')
      await form.trigger('submit')
      await flushPromises()

      expect(alertStore.error).toHaveBeenCalledWith('Устройство с ID 1 не найдено')
    })

    it('handles 409 conflict errors during submission', async () => {
      devicesStore.register.mockResolvedValue({ id: 5 })
      devicesStore.update.mockRejectedValue({ status: 409 })

      const wrapper = mountSettings({ register: true })
      await flushPromises()

      const form = wrapper.find('[data-testid="form"]')
      await form.trigger('submit')
      await flushPromises()

      expect(alertStore.error).toHaveBeenCalledWith('Устройство с таким IP адресом уже существует')
    })

    it('handles 422 validation errors during submission', async () => {
      devicesStore.device = { id: 1, name: 'Device', ipAddress: '1.2.3.4' }
      devicesStore.getById.mockResolvedValue()
      devicesStore.update.mockRejectedValue({ status: 422 })

      const wrapper = mountSettings({ register: false, id: 1 })
      await flushPromises()

      const form = wrapper.find('[data-testid="form"]')
      await form.trigger('submit')
      await flushPromises()

      expect(alertStore.error).toHaveBeenCalledWith('Проверьте корректность введённых данных')
    })

    it('handles other errors during create submission', async () => {
      devicesStore.register.mockResolvedValue({ id: 5 })
      devicesStore.update.mockRejectedValue({ message: 'Server error' })

      const wrapper = mountSettings({ register: true })
      await flushPromises()

      const form = wrapper.find('[data-testid="form"]')
      await form.trigger('submit')
      await flushPromises()

      expect(alertStore.error).toHaveBeenCalledWith('Ошибка при создании устройства: Server error')
    })

    it('handles other errors during update submission', async () => {
      devicesStore.device = { id: 1, name: 'Device', ipAddress: '1.2.3.4' }
      devicesStore.getById.mockResolvedValue()
      devicesStore.update.mockRejectedValue({ message: 'Server error' })

      const wrapper = mountSettings({ register: false, id: 1 })
      await flushPromises()

      const form = wrapper.find('[data-testid="form"]')
      await form.trigger('submit')
      await flushPromises()

      expect(alertStore.error).toHaveBeenCalledWith('Ошибка при обновлении устройства: Server error')
    })

    it('handles errors without message during submission', async () => {
      devicesStore.register.mockResolvedValue({ id: 5 })
      devicesStore.update.mockRejectedValue({ status: 500 })

      const wrapper = mountSettings({ register: true })
      await flushPromises()

      const form = wrapper.find('[data-testid="form"]')
      await form.trigger('submit')
      await flushPromises()

      expect(alertStore.error).toHaveBeenCalledWith('Ошибка при создании устройства: [object Object]')
    })
  })

  describe('form rendering and behavior', () => {
    it('displays correct title for create mode', async () => {
      const wrapper = mountSettings({ register: true })
      await flushPromises()

      expect(wrapper.find('h1').text()).toBe('Новое устройство')
    })

    it('displays correct title for edit mode', async () => {
      devicesStore.device = { id: 1, name: 'Device', ipAddress: '1.2.3.4' }
      devicesStore.getById.mockResolvedValue()

      const wrapper = mountSettings({ register: false, id: 1 })
      await flushPromises()

      expect(wrapper.find('h1').text()).toBe('Настройки устройства')
    })

    it('displays correct button text for create mode', async () => {
      const wrapper = mountSettings({ register: true })
      await flushPromises()

      expect(wrapper.text()).toContain('Создать')
    })

    it('displays correct button text for edit mode', async () => {
      devicesStore.device = { id: 1, name: 'Device', ipAddress: '1.2.3.4' }
      devicesStore.getById.mockResolvedValue()

      const wrapper = mountSettings({ register: false, id: 1 })
      await flushPromises()

      expect(wrapper.text()).toContain('Сохранить')
    })

    it('shows validation errors', async () => {
      const wrapper = mountSettings({ showValidationError: true })
      await flushPromises()

      expect(wrapper.text()).toContain('Необходимо указать имя')
      expect(wrapper.text()).toContain('Необходимо указать IP адрес')
    })

    it('shows loading state when devicesStore loading is true', async () => {
      devicesStore.loading = true

      const wrapper = mountSettings({ register: true })
      await flushPromises()

      expect(wrapper.text()).toContain('Сохранение...')
    })

    it('shows alert message', async () => {
      alertStore.alert = { type: 'alert-success', message: 'Device saved successfully' }

      const wrapper = mountSettings({ register: true })
      await flushPromises()

      expect(wrapper.text()).toContain('Device saved successfully')
    })

    it('clears alert when close button is clicked', async () => {
      alertStore.alert = { type: 'alert-success', message: 'Test alert' }

      const wrapper = mountSettings({ register: true })
      await flushPromises()

      const closeButton = wrapper.find('.close')
      await closeButton.trigger('click')

      expect(alertStore.clear).toHaveBeenCalled()
    })

    it('trims input values before submission', async () => {
      devicesStore.register.mockResolvedValue({ id: 5 })
      devicesStore.update.mockResolvedValue()

      const wrapper = mountSettings({ 
        register: true, 
        submitName: '  Test Device  ', 
        submitIp: '  1.2.3.4  ' 
      })
      await flushPromises()

      const form = wrapper.find('[data-testid="form"]')
      await form.trigger('submit')
      await flushPromises()

      expect(devicesStore.update).toHaveBeenCalledWith(5, expect.objectContaining({ 
        name: 'Test Device', 
        ipAddress: '1.2.3.4' 
      }))
    })

    it('submits without accountId when not provided', async () => {
      devicesStore.register.mockResolvedValue({ id: 5 })
      devicesStore.update.mockResolvedValue()

      const wrapper = mountSettings({ register: true, accountId: undefined })
      await flushPromises()

      const form = wrapper.find('[data-testid="form"]')
      await form.trigger('submit')
      await flushPromises()

      expect(devicesStore.update).toHaveBeenCalledWith(5, expect.objectContaining({ 
        name: 'Test Device', 
        ipAddress: '1.2.3.4'
      }))
      expect(devicesStore.update).toHaveBeenCalledWith(5, expect.not.objectContaining({ 
        accountId: expect.anything()
      }))
    })
  })
})

