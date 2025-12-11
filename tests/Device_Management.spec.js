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
const getAudio = vi.fn(() => Promise.resolve({ output: 'hdmi' }))
const updateAudio = vi.fn(() => Promise.resolve())
const getPlaylist = vi.fn(() => Promise.resolve({ source: '', destination: '' }))
const updatePlaylist = vi.fn(() => Promise.resolve())
const getSchedule = vi.fn(() => Promise.resolve({
  playlist: ['00:00'],
  video: ['00:00'],
  rest: [{ start: '00:00', stop: '00:00' }]
}))
const updateSchedule = vi.fn(() => Promise.resolve())
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
    getAudio,
    updateAudio,
    getPlaylist,
    updatePlaylist,
    getSchedule,
    updateSchedule,
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
    expect(getAudio).toHaveBeenCalledTimes(1)
    expect(getPlaylist).toHaveBeenCalledTimes(1)
    expect(getSchedule).toHaveBeenCalledTimes(1)
    expect(getServiceStatus).toHaveBeenCalledTimes(1)
    expect(wrapper.find('.management-title').text()).toContain('Управление устройством')
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

  it('loads audio settings successfully', async () => {
    mount(DeviceManagement, {
      props: { deviceId: 1 },
      global: {
        stubs: {
          'font-awesome-icon': { template: '<i />' }
        }
      }
    })

    await flushPromises()

    // Verify audio settings loaded
    expect(getAudio).toHaveBeenCalledTimes(1)
    expect(getAudio).toHaveBeenCalledWith(1)
  })

  it('saves all settings including audio successfully', async () => {
    const wrapper = mount(DeviceManagement, {
      props: { deviceId: 1 },
      global: {
        stubs: {
          'font-awesome-icon': { template: '<i />' }
        }
      }
    })

    await flushPromises()

    // Trigger save all settings
    await wrapper.find('[data-test="system-save"]').trigger('click')
    await flushPromises()

    expect(updateAudio).toHaveBeenCalledTimes(1)
    expect(updateAudio).toHaveBeenCalledWith(1, { output: 'hdmi' })
    expect(updatePlaylist).toHaveBeenCalledTimes(1)
    // Each individual save shows its own success message
    expect(alertSuccess).toHaveBeenCalledWith('Настройки аудио сохранены')
    expect(alertSuccess).toHaveBeenCalledWith('Настройки плей-листа сохранены')
  })

  it('handles audio settings update error', async () => {
    getAudio.mockRejectedValueOnce(new Error('Network error'))

    mount(DeviceManagement, {
      props: { deviceId: 1 },
      global: {
        stubs: {
          'font-awesome-icon': { template: '<i />' }
        }
      }
    })

    await flushPromises()

    expect(alertError).toHaveBeenCalledWith('Не удалось загрузить настройки аудио: Network error')
  })

  it('handles audio settings save error', async () => {
    updateAudio.mockRejectedValueOnce(new Error('Save failed'))

    const wrapper = mount(DeviceManagement, {
      props: { deviceId: 1 },
      global: {
        stubs: {
          'font-awesome-icon': { template: '<i />' }
        }
      }
    })

    await flushPromises()

    // Trigger save all settings
    await wrapper.find('[data-test="system-save"]').trigger('click')
    await flushPromises()

    expect(alertError).toHaveBeenCalledWith('Не удалось сохранить настройки аудио: Save failed')
  })

  it('loads playlist settings successfully', async () => {
    mount(DeviceManagement, {
      props: { deviceId: 1 },
      global: {
        stubs: {
          'font-awesome-icon': { template: '<i />' }
        }
      }
    })

    await flushPromises()

    // Verify playlist settings loaded
    expect(getPlaylist).toHaveBeenCalledTimes(1)
    expect(getPlaylist).toHaveBeenCalledWith(1)
  })

  it('handles playlist settings update error', async () => {
    getPlaylist.mockRejectedValueOnce(new Error('Network error'))

    mount(DeviceManagement, {
      props: { deviceId: 1 },
      global: {
        stubs: {
          'font-awesome-icon': { template: '<i />' }
        }
      }
    })

    await flushPromises()

    expect(alertError).toHaveBeenCalledWith('Не удалось загрузить настройки плей-листа: Network error')
  })

  it('handles playlist settings save error', async () => {
    updatePlaylist.mockRejectedValueOnce(new Error('Save failed'))

    const wrapper = mount(DeviceManagement, {
      props: { deviceId: 1 },
      global: {
        stubs: {
          'font-awesome-icon': { template: '<i />' }
        }
      }
    })

    await flushPromises()

    // Trigger save all settings
    await wrapper.find('[data-test="system-save"]').trigger('click')
    await flushPromises()

    expect(alertError).toHaveBeenCalledWith('Не удалось сохранить настройки плей-листа: Save failed')
  })

  it('loads schedule settings successfully', async () => {
    mount(DeviceManagement, {
      props: { deviceId: 1 },
      global: {
        stubs: {
          'font-awesome-icon': { template: '<i />' }
        }
      }
    })

    await flushPromises()

    // Verify schedule settings loaded
    expect(getSchedule).toHaveBeenCalledTimes(1)
    expect(getSchedule).toHaveBeenCalledWith(1)
  })

  it('handles schedule settings update error', async () => {
    getSchedule.mockRejectedValueOnce(new Error('Network error'))

    mount(DeviceManagement, {
      props: { deviceId: 1 },
      global: {
        stubs: {
          'font-awesome-icon': { template: '<i />' }
        }
      }
    })

    await flushPromises()

    expect(alertError).toHaveBeenCalledWith('Не удалось загрузить настройки таймеров: Network error')
  })

  it('handles schedule settings save error through saveAll', async () => {
    updateSchedule.mockRejectedValueOnce(new Error('Save failed'))

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

    // Trigger save all settings
    await wrapper.find('[data-test="system-save"]').trigger('click')
    await flushPromises()

    // The audio and playlist should still succeed even if schedule fails
    expect(alertSuccess).toHaveBeenCalledWith('Настройки аудио сохранены')
    expect(alertSuccess).toHaveBeenCalledWith('Настройки плей-листа сохранены')
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

    // Trigger read all settings
    await wrapper.find('[data-test="system-read"]').trigger('click')
    await flushPromises()

    expect(getAudio).toHaveBeenCalledTimes(1)
    expect(getPlaylist).toHaveBeenCalledTimes(1)
    expect(getSchedule).toHaveBeenCalledTimes(1)
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

  it('handles partial save failures through saveAll', async () => {
    updatePlaylist.mockRejectedValueOnce(new Error('Playlist save failed'))

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

    // Trigger save all settings
    await wrapper.find('[data-test="system-save"]').trigger('click')
    await flushPromises()

    // Individual save function shows its own error
    expect(alertError).toHaveBeenCalledWith('Не удалось сохранить настройки плей-листа: Playlist save failed')
    // Audio should succeed
    expect(alertSuccess).toHaveBeenCalledWith('Настройки аудио сохранены')
  })
})
