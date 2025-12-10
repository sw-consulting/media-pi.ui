/* @vitest-environment jsdom */
// Copyright (c) 2025 sw.consulting
// This file is a part of Media Pi frontend application

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'

import DeviceManagement from '@/components/Device_Management.vue'

const statusesRef = ref([])

const getDeviceById = vi.fn(() => ({
  id: 1,
  name: 'Device 1',
  deviceStatus: { deviceId: 1, isOnline: true }
}))
const getDeviceStatusById = vi.fn(() => Promise.resolve({ deviceId: 1, isOnline: true }))
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
    getDeviceById,
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

    await wrapper.find('button.button.secondary').trigger('click')
    expect(routerGo).toHaveBeenCalledWith(-1)
  })
})
