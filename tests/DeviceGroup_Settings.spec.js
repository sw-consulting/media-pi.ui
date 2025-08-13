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
import DeviceGroupSettings from '@/components/DeviceGroup_Settings.vue'

library.add(faCheckDouble, faXmark)

let authStore
const deviceGroupsStore = {
  group: null,
  loading: false,
  error: null,
  getById: vi.fn(),
  add: vi.fn(),
  update: vi.fn()
}
const alertStore = {
  error: vi.fn(),
  success: vi.fn(),
  clear: vi.fn()
}

vi.mock('pinia', async () => {
  const actual = await vi.importActual('pinia')
  return { ...actual, storeToRefs: (store) => store }
})

vi.mock('@/router', () => {
  const mockGo = vi.fn()
  return {
    default: {
      go: mockGo
    }
  }
})

vi.mock('@/stores/auth.store.js', () => ({
  useAuthStore: () => authStore
}))

vi.mock('@/stores/device.groups.store.js', () => ({
  useDeviceGroupsStore: () => deviceGroupsStore
}))

vi.mock('@/stores/alert.store.js', () => ({
  useAlertStore: () => alertStore
}))

vi.mock('@/helpers/default.route.js', () => ({
  redirectToDefaultRoute: vi.fn()
}))

const mountSettings = (props = {}) => mount({
  template: '<Suspense><DeviceGroupSettings v-bind="$attrs" /></Suspense>',
  components: { DeviceGroupSettings },
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
        template: '<div data-testid="form" @submit="onSubmit"><slot :errors="{}" :isSubmitting="false" /></div>',
        props: ['validation-schema', 'initial-values'],
        emits: ['submit'],
        methods: {
          onSubmit () {
            this.$emit('submit', { name: 'Test Group' })
          }
        }
      },
      Field: { template: '<input />', props: ['name', 'type'] }
    },
    components: {
      'font-awesome-icon': FontAwesomeIcon
    }
  }
})

describe('DeviceGroup_Settings.vue', () => {
  beforeEach(() => {
    authStore = {
      isAdministrator: true,
      isManager: false
    }
    deviceGroupsStore.group = null
    deviceGroupsStore.loading = false
    deviceGroupsStore.error = null
    deviceGroupsStore.getById = vi.fn().mockResolvedValue()
    deviceGroupsStore.add = vi.fn().mockResolvedValue()
    deviceGroupsStore.update = vi.fn().mockResolvedValue()
    vi.clearAllMocks()
  })

  it('renders form for creating new group', async () => {
    const wrapper = mountSettings({ register: true, accountId: 5 })
    await flushPromises()

    expect(wrapper.find('[data-testid="form"]').exists()).toBe(true)
    expect(deviceGroupsStore.getById).not.toHaveBeenCalled()
  })

  it('loads group data when editing', async () => {
    deviceGroupsStore.group = {
      id: 1,
      name: 'Test Group'
    }

    const wrapper = mountSettings({ register: false, id: 1 })
    await flushPromises()

    expect(deviceGroupsStore.getById).toHaveBeenCalledWith(1)
    expect(wrapper.find('[data-testid="form"]').exists()).toBe(true)
  })

  it('handles form submission for creating group', async () => {
    const wrapper = mountSettings({ register: true, accountId: 5 })
    await flushPromises()

    const form = wrapper.find('[data-testid="form"]')
    await form.trigger('submit')
    await flushPromises()

    expect(deviceGroupsStore.add).toHaveBeenCalledWith({
      name: 'Test Group',
      accountId: 5
    })
  })

  it('handles form submission for updating group', async () => {
    deviceGroupsStore.group = {
      id: 1,
      name: 'Existing Group'
    }

    const wrapper = mountSettings({ register: false, id: 1 })
    await flushPromises()

    const form = wrapper.find('[data-testid="form"]')
    await form.trigger('submit')
    await flushPromises()

    expect(deviceGroupsStore.update).toHaveBeenCalledWith(1, {
      name: 'Test Group'
    })
  })

  it('handles group not found error', async () => {
    deviceGroupsStore.group = null

    mountSettings({ register: false, id: 999 })
    await flushPromises()

    expect(alertStore.error).toHaveBeenCalledWith('Ошибка загрузки группы устройств: Группа устройств с ID 999 не найдена')
  })

  it('handles create error', async () => {
    deviceGroupsStore.add = vi.fn().mockRejectedValue({ message: 'Group name already exists' })

    const wrapper = mountSettings({ register: true })
    await flushPromises()

    const form = wrapper.find('[data-testid="form"]')
    await form.trigger('submit')
    await flushPromises()

    expect(alertStore.error).toHaveBeenCalledWith('Ошибка при создании группы устройств: Group name already exists')
  })
})

