/* @vitest-environment jsdom */
// Copyright (c) 2025 sw.consulting
// This file is a part of Media Pi frontend application

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'

import DeviceManagement from '@/components/Device_Management.vue'

vi.mock('@sw-consulting/tooling.ui.kit', () => ({
  ActionButton: { 
    name: 'ActionButton', 
    inheritAttrs: false,
    props: ['item', 'icon', 'iconSize', 'tooltipText', 'disabled'], 
    emits: ['click'], 
    template: '<button v-bind="$attrs" class="action-btn" :disabled="disabled" @click="$emit(\'click\')"><slot /></button>' 
  }
}))

const statusesRef = ref([])
const deviceRef = ref({
  id: 1,
  name: 'Device 1',
  deviceStatus: { deviceId: 1, isOnline: true }
})

const getById = vi.fn(() => {
  deviceRef.value = {
    id: 1,
    name: 'Device 1',
    deviceStatus: { deviceId: 1, isOnline: true }
  }
  return Promise.resolve(deviceRef.value)
})
const getDeviceStatusById = vi.fn(() => {
  const status = { deviceId: 1, isOnline: true }
  statusesRef.value = [status]
  return Promise.resolve(status)
})
const reloadSystem = vi.fn(() => Promise.resolve())
const rebootSystem = vi.fn(() => Promise.resolve())
const shutdownSystem = vi.fn(() => Promise.resolve())
const configurationResponse = {
  playlist: { source: '', destination: '' },
  schedule: {
    playlist: ['00:00'],
    video: ['00:00'],
    rest: [{ start: '00:00', stop: '00:00' }]
  },
  audio: { output: 'hdmi' }
}
const getConfiguration = vi.fn(() => Promise.resolve(configurationResponse))
const updateConfiguration = vi.fn(() => Promise.resolve())
const getServiceStatus = vi.fn(() => Promise.resolve({
  playbackServiceStatus: false,
  playlistUploadServiceStatus: false,
  yaDiskMountStatus: false
}))
const startPlayback = vi.fn(() => Promise.resolve())
const stopPlayback = vi.fn(() => Promise.resolve())
const startUpload = vi.fn(() => Promise.resolve())
const stopUpload = vi.fn(() => Promise.resolve())
const alertError = vi.fn()
const alertSuccess = vi.fn()
const alertClear = vi.fn()
const routerGo = vi.fn()

vi.mock('pinia', async () => {
  const actual = await vi.importActual('pinia')
  return {
    ...actual,
    storeToRefs: (store) => store.__mockRefs
  }
})

vi.mock('vue-router', () => ({
  useRouter: () => ({ go: routerGo })
}))

vi.mock('@/components/FieldArrayWithButtons.vue', () => ({
  default: {
    props: ['name', 'label', 'hideLabel', 'fieldType', 'fieldProps', 'placeholder', 'defaultValue', 'hasError', 'disabled'],
    template: '<div class="field-array-stub"><slot name="field" :field-name="name"></slot></div>'
  }
}))

vi.mock('@/stores/devices.store.js', () => ({
  useDevicesStore: () => ({
    __mockRefs: {
      device: deviceRef,
      loading: ref(false)
    },
    getById,
    reloadSystem,
    rebootSystem,
    shutdownSystem,
    getConfiguration,
    updateConfiguration,
    getServiceStatus,
    startPlayback,
    stopPlayback,
    startUpload,
    stopUpload
  })
}))

vi.mock('@/stores/device.statuses.store.js', () => ({
  useDeviceStatusesStore: () => ({
    __mockRefs: {
      statuses: statusesRef
    },
    getById: getDeviceStatusById
  })
}))

vi.mock('@/stores/alert.store.js', () => ({
  useAlertStore: () => ({
    error: alertError,
    success: alertSuccess,
    clear: alertClear,
    __mockRefs: {
      alert: ref(null)
    }
  })
}))

vi.mock('@/helpers/config.js', () => ({
  timeouts: {
    apply: 50,
    reboot: 50,
    shutdown: 50
  }
}))

describe('Device_Management.vue', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    statusesRef.value = []
  })

  it('loads device data and settings on mount', async () => {
    const wrapper = mount(DeviceManagement, {
      props: { deviceId: 1 },
      global: {
        stubs: {
          'font-awesome-icon': { template: '<i />' }
        }
      }
    })

    await flushPromises()

    expect(getDeviceStatusById).toHaveBeenCalledTimes(1)
    expect(getConfiguration).toHaveBeenCalledTimes(1)
    expect(getConfiguration).toHaveBeenCalledWith(1)
    expect(getServiceStatus).toHaveBeenCalledTimes(1)
    const headerText = wrapper.get('h1.primary-heading span').text()
    expect(headerText).toContain('Device 1')
  })

  it('triggers apply operation and refreshes status', async () => {
    const wrapper = mount(DeviceManagement, {
      props: { deviceId: 1 },
      global: {
        stubs: {
          'font-awesome-icon': { template: '<i />' }
        }
      }
    })

    await flushPromises()
    expect(reloadSystem).not.toHaveBeenCalled()

    await wrapper.find('[data-test="system-apply"]').trigger('click')
    await flushPromises()

    expect(reloadSystem).toHaveBeenCalledTimes(1)

    await vi.runAllTimersAsync()
    await flushPromises()

    expect(getDeviceStatusById).toHaveBeenCalledTimes(2)
  })

  it('uses router navigation button', async () => {
    const wrapper = mount(DeviceManagement, {
      props: { deviceId: 1 },
      global: {
        stubs: {
          'font-awesome-icon': { template: '<i />' }
        }
      }
    })

    const backButton = wrapper.find('.action-btn')
    expect(backButton.exists()).toBe(true)
    
    await backButton.trigger('click')
    expect(routerGo).toHaveBeenCalledWith(-1)
  })

  it('saves all settings using combined endpoint', async () => {
    vi.useRealTimers()
    const wrapper = mount(DeviceManagement, {
      props: { deviceId: 1 },
      global: {
        stubs: {
          'font-awesome-icon': { template: '<i />' }
        }
      }
    })

    await flushPromises()

    await wrapper.vm.saveAllSettings()
    await flushPromises()

    expect(updateConfiguration).toHaveBeenCalledTimes(1)
    expect(updateConfiguration).toHaveBeenCalledWith(1, expect.objectContaining({ audio: { output: 'hdmi' } }))
    expect(alertSuccess).toHaveBeenCalledWith('Все настройки сохранены')
  })

  it('handles configuration load error on readAll', async () => {
    getConfiguration.mockRejectedValueOnce(new Error('Network error'))

    mount(DeviceManagement, {
      props: { deviceId: 1 },
      global: {
        stubs: {
          'font-awesome-icon': { template: '<i />' }
        }
      }
    })

    await flushPromises()

    expect(alertError).toHaveBeenCalledWith('Не удалось загрузить настройки конфигурации: Network error')
  })

  it('handles configuration save error', async () => {
    vi.useRealTimers()
    updateConfiguration.mockRejectedValueOnce(new Error('Save failed'))

    const wrapper = mount(DeviceManagement, {
      props: { deviceId: 1 },
      global: {
        stubs: {
          'font-awesome-icon': { template: '<i />' }
        }
      }
    })

    await flushPromises()

    await wrapper.vm.saveAllSettings()
    await flushPromises()

    expect(alertError).toHaveBeenCalledWith('Не удалось сохранить настройки: Save failed')
  })

  it('reads all settings on demand', async () => {
    const wrapper = mount(DeviceManagement, {
      props: { deviceId: 1 },
      global: {
        stubs: {
          'font-awesome-icon': { template: '<i />' }
        }
      }
    })

    await flushPromises()
    vi.clearAllMocks()

    await wrapper.find('[data-test="system-read"]').trigger('click')
    await flushPromises()

    expect(getConfiguration).toHaveBeenCalledTimes(1)
    expect(getConfiguration).toHaveBeenCalledWith(1)
    expect(getServiceStatus).toHaveBeenCalledTimes(1)
  })

  it('starts playback service successfully', async () => {
    const wrapper = mount(DeviceManagement, {
      props: { deviceId: 1 },
      global: {
        stubs: {
          'font-awesome-icon': { template: '<i />' }
        }
      }
    })

    await flushPromises()

    // Trigger start playback
    await wrapper.find('[data-test="service-action-playback"]').trigger('click')
    await flushPromises()

    expect(startPlayback).toHaveBeenCalledTimes(1)
    expect(startPlayback).toHaveBeenCalledWith(1)

    await vi.runAllTimersAsync()
    await flushPromises()

    // Verify service status is refreshed after operation
    expect(getServiceStatus).toHaveBeenCalledTimes(2)
  })

  it('stops playback service successfully', async () => {
    getServiceStatus.mockResolvedValue({
      playbackServiceStatus: true,
      playlistUploadServiceStatus: false,
      yaDiskMountStatus: false
    })

    const wrapper = mount(DeviceManagement, {
      props: { deviceId: 1 },
      global: {
        stubs: {
          'font-awesome-icon': { template: '<i />' }
        }
      }
    })

    await flushPromises()

    // Trigger stop playback
    await wrapper.find('[data-test="service-action-playback"]').trigger('click')
    await flushPromises()

    expect(stopPlayback).toHaveBeenCalledTimes(1)
    expect(stopPlayback).toHaveBeenCalledWith(1)

    await vi.runAllTimersAsync()
    await flushPromises()

    // Verify service status is refreshed after operation
    expect(getServiceStatus).toHaveBeenCalledTimes(2)
  })

  it('starts upload service successfully', async () => {
    const wrapper = mount(DeviceManagement, {
      props: { deviceId: 1 },
      global: {
        stubs: {
          'font-awesome-icon': { template: '<i />' }
        }
      }
    })

    await flushPromises()

    // Trigger start upload
    await wrapper.find('[data-test="service-action-upload"]').trigger('click')
    await flushPromises()

    expect(startUpload).toHaveBeenCalledTimes(1)
    expect(startUpload).toHaveBeenCalledWith(1)

    await vi.runAllTimersAsync()
    await flushPromises()

    // Verify service status is refreshed after operation
    expect(getServiceStatus).toHaveBeenCalledTimes(2)
  })

  it('stops upload service successfully', async () => {
    getServiceStatus.mockResolvedValue({
      playbackServiceStatus: false,
      playlistUploadServiceStatus: true,
      yaDiskMountStatus: false
    })

    const wrapper = mount(DeviceManagement, {
      props: { deviceId: 1 },
      global: {
        stubs: {
          'font-awesome-icon': { template: '<i />' }
        }
      }
    })

    await flushPromises()

    // Trigger stop upload
    await wrapper.find('[data-test="service-action-upload"]').trigger('click')
    await flushPromises()

    expect(stopUpload).toHaveBeenCalledTimes(1)
    expect(stopUpload).toHaveBeenCalledWith(1)

    await vi.runAllTimersAsync()
    await flushPromises()

    // Verify service status is refreshed after operation
    expect(getServiceStatus).toHaveBeenCalledTimes(2)
  })

  it('handles service operation errors', async () => {
    startPlayback.mockRejectedValueOnce(new Error('Service error'))

    const wrapper = mount(DeviceManagement, {
      props: { deviceId: 1 },
      global: {
        stubs: {
          'font-awesome-icon': { template: '<i />' }
        }
      }
    })

    await flushPromises()

    // Trigger start playback
    await wrapper.find('[data-test="service-action-playback"]').trigger('click')
    await flushPromises()

    expect(alertError).toHaveBeenCalledWith('Service error')
  })

})
