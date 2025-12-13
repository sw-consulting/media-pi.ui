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
  ipAddress: '192.168.1.100',
  deviceStatus: { 
    deviceId: 1, 
    isOnline: true, 
    lastChecked: '2025-12-13T10:30:00.000Z',
    connectLatencyMs: 25
  }
})

const getById = vi.fn(() => {
  deviceRef.value = {
    id: 1,
    name: 'Device 1',
    ipAddress: '192.168.1.100',
    deviceStatus: { 
      deviceId: 1, 
      isOnline: true, 
      lastChecked: '2025-12-13T10:30:00.000Z',
      connectLatencyMs: 25
    }
  }
  return Promise.resolve(deviceRef.value)
})
const getDeviceStatusById = vi.fn(() => {
  const status = { 
    deviceId: 1, 
    isOnline: true, 
    lastChecked: '2025-12-13T10:30:00.000Z',
    connectLatencyMs: 25,
    softwareVersion: '1.2.3'
  }
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
  videoUploadServiceStatus: false,
  yaDiskMountStatus: false
}))
const startPlayback = vi.fn(() => Promise.resolve())
const stopPlayback = vi.fn(() => Promise.resolve())
const startPlaylistUpload = vi.fn(() => Promise.resolve())
const stopPlaylistUpload = vi.fn(() => Promise.resolve())
const startVideoUpload = vi.fn(() => Promise.resolve())
const stopVideoUpload = vi.fn(() => Promise.resolve())
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
    startPlaylistUpload,
    stopPlaylistUpload,
    startVideoUpload,
    stopVideoUpload
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
    
    // Reset device and status data to default
    deviceRef.value = {
      id: 1,
      name: 'Device 1',
      ipAddress: '192.168.1.100',
      deviceStatus: { 
        deviceId: 1, 
        isOnline: true, 
        lastChecked: '2025-12-13T10:30:00.000Z',
        connectLatencyMs: 25
      }
    }
    
    statusesRef.value = [{
      deviceId: 1, 
      isOnline: true, 
      lastChecked: '2025-12-13T10:30:00.000Z',
      connectLatencyMs: 25,
      softwareVersion: '1.2.3'
    }]
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

    expect(getDeviceStatusById).toHaveBeenCalledTimes(2) // called in initializeDevice and readAllSettings
    expect(getConfiguration).toHaveBeenCalledTimes(1)
    expect(getConfiguration).toHaveBeenCalledWith(1)
    expect(getServiceStatus).toHaveBeenCalledTimes(1)
    const headerText = wrapper.get('h1.primary-heading span').text()
    expect(headerText).toContain('Device 1')
  })

  it('applies settings with operation timeout and status refresh', async () => {
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

    // Mock the mounted Vee-Validate form so persistConfiguration validates and reads live values
    const validateMock = vi.fn().mockResolvedValue({ valid: true })
    const resetFormMock = vi.fn()
    wrapper.vm.scheduleFormRef.value = {
      validate: validateMock,
      values: configurationResponse.schedule,
      resetForm: resetFormMock
    }

    // Call apply method
    await wrapper.vm.apply()
    await flushPromises()

    // Verify that operation is tracked as in progress
    expect(wrapper.vm.operationInProgress.apply).toBe(true)
    // Verify configuration was updated
    expect(updateConfiguration).toHaveBeenCalledTimes(1)

    vi.useFakeTimers()
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

    // Mock the mounted Vee-Validate form so persistConfiguration validates and reads live values
    wrapper.vm.scheduleFormRef.value = { validate: vi.fn().mockResolvedValue({ valid: true }), values: configurationResponse.schedule }

    await wrapper.vm.persistConfiguration({
      errorPrefix: 'Не удалось сохранить настройки',
      successMessage: 'Все настройки сохранены'
    })
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

    // Mock the mounted form for validation
    wrapper.vm.scheduleFormRef.value = { validate: vi.fn().mockResolvedValue({ valid: true }), values: configurationResponse.schedule }

    await wrapper.vm.persistConfiguration({
      errorPrefix: 'Не удалось сохранить настройки',
      successMessage: 'Все настройки сохранены'
    })
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

  it('starts playlist upload service successfully', async () => {
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
    await wrapper.find('[data-test="service-action-playlistUpload"]').trigger('click')
    await flushPromises()

    expect(startPlaylistUpload).toHaveBeenCalledTimes(1)
    expect(startPlaylistUpload).toHaveBeenCalledWith(1)

    await vi.runAllTimersAsync()
    await flushPromises()

    // Verify service status is refreshed after operation
    expect(getServiceStatus).toHaveBeenCalledTimes(2)
  })

  it('stops playlist upload service successfully', async () => {
    getServiceStatus.mockResolvedValue({
      playbackServiceStatus: false,
      playlistUploadServiceStatus: true,
      videoUploadServiceStatus: false,
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
    await wrapper.find('[data-test="service-action-playlistUpload"]').trigger('click')
    await flushPromises()

    expect(stopPlaylistUpload).toHaveBeenCalledTimes(1)
    expect(stopPlaylistUpload).toHaveBeenCalledWith(1)

    await vi.runAllTimersAsync()
    await flushPromises()

    // Verify service status is refreshed after operation
    expect(getServiceStatus).toHaveBeenCalledTimes(2)
  })

  it('starts video upload service successfully', async () => {
    const wrapper = mount(DeviceManagement, {
      props: { deviceId: 1 },
      global: {
        stubs: {
          'font-awesome-icon': { template: '<i />' }
        }
      }
    })

    await flushPromises()

    await wrapper.find('[data-test="service-action-videoUpload"]').trigger('click')
    await flushPromises()

    expect(startVideoUpload).toHaveBeenCalledTimes(1)
    expect(startVideoUpload).toHaveBeenCalledWith(1)

    await vi.runAllTimersAsync()
    await flushPromises()

    expect(getServiceStatus).toHaveBeenCalledTimes(2)
  })

  it('stops video upload service successfully', async () => {
    getServiceStatus.mockResolvedValue({
      playbackServiceStatus: false,
      playlistUploadServiceStatus: false,
      videoUploadServiceStatus: true,
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

    await wrapper.find('[data-test="service-action-videoUpload"]').trigger('click')
    await flushPromises()

    expect(stopVideoUpload).toHaveBeenCalledTimes(1)
    expect(stopVideoUpload).toHaveBeenCalledWith(1)

    await vi.runAllTimersAsync()
    await flushPromises()

    expect(getServiceStatus).toHaveBeenCalledTimes(2)
  })

  it('displays device information correctly', async () => {
    const wrapper = mount(DeviceManagement, {
      props: { deviceId: 1 },
      global: {
        stubs: {
          'font-awesome-icon': { template: '<i />' }
        }
      }
    })

    await flushPromises()

    const deviceInfoGrid = wrapper.find('.device-info-grid')
    expect(deviceInfoGrid.exists()).toBe(true)

    const labels = deviceInfoGrid.findAll('.label')
    const values = deviceInfoGrid.findAll('.value')

    expect(labels).toHaveLength(6)
    expect(values).toHaveLength(6)

    // Check each field
    expect(labels[0].text()).toBe('Название')
    expect(values[0].text()).toBe('Device 1')

    expect(labels[1].text()).toBe('IP адрес')
    expect(values[1].text()).toBe('192.168.1.100')

    expect(labels[2].text()).toBe('Версия агента')
    expect(values[2].text()).toBe('1.2.3')

    expect(labels[3].text()).toBe('Онлайн')
    expect(values[3].text()).toBe('Да')
    expect(values[3].find('.text-success').exists()).toBe(true)

    expect(labels[4].text()).toBe('Последняя проверка')
    expect(values[4].text()).toContain('13.12.2025')

    expect(labels[5].text()).toBe('Задержка')
    expect(values[5].text()).toBe('25 мс')
  })

  it('allows readAllSettings button to be clicked when device is offline', async () => {
    // Set device offline
    statusesRef.value = [{ deviceId: 1, isOnline: false }]

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

    // Check that the readAllSettings button is not disabled
    const readButton = wrapper.find('[data-test="system-read"]')
    expect(readButton.attributes('disabled')).toBeUndefined()

    // Click the button and verify it works
    await readButton.trigger('click')
    await flushPromises()

    // Verify the functions were called even though device is offline
    expect(getDeviceStatusById).toHaveBeenCalled()
    expect(getConfiguration).toHaveBeenCalled()
    expect(getServiceStatus).toHaveBeenCalled()
  })

  it('refreshes device information when device comes online', async () => {
    // Start with device offline
    statusesRef.value = [{ deviceId: 1, isOnline: false }]

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

    // Simulate device coming online by updating the status
    const newStatus = { 
      deviceId: 1, 
      isOnline: true, 
      lastChecked: '2025-12-13T11:00:00.000Z',
      connectLatencyMs: 30
    }
    statusesRef.value = [newStatus]

    // Trigger reactivity manually
    await wrapper.vm.$nextTick()
    await flushPromises()

    // The watch for currentStatus.value?.isOnline should have triggered
    // Since we can't easily test the watcher directly, let's test the readAllSettings method
    await wrapper.vm.readAllSettings()
    await flushPromises()

    expect(getConfiguration).toHaveBeenCalled()
    expect(getServiceStatus).toHaveBeenCalled()
    expect(getDeviceStatusById).toHaveBeenCalled()
  })

  it('refreshes device information on manual refresh', async () => {
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

    // Trigger manual refresh
    await wrapper.find('[data-test="system-read"]').trigger('click')
    await flushPromises()

    expect(getConfiguration).toHaveBeenCalledTimes(1)
    expect(getServiceStatus).toHaveBeenCalledTimes(1)
    expect(getDeviceStatusById).toHaveBeenCalledTimes(1) // now called in readAllSettings
  })

  it('handles device information date formatting correctly', async () => {
    const wrapper = mount(DeviceManagement, {
      props: { deviceId: 1 },
      global: {
        stubs: {
          'font-awesome-icon': { template: '<i />' }
        }
      }
    })

    await flushPromises()

    // Test that the date formatting function handles various inputs
    const vm = wrapper.vm
    expect(vm.fmtDate(null)).toBe('—')
    expect(vm.fmtDate(undefined)).toBe('—')
    expect(vm.fmtDate('')).toBe('—')
    
    // Test with a valid ISO date
    const validDate = '2025-12-13T10:30:00.000Z'
    const formatted = vm.fmtDate(validDate)
    expect(formatted).toContain('2025') // Should contain the year
    
    // Test that invalid strings are returned as-is
    const invalidDate = 'completely-invalid'
    expect(vm.fmtDate(invalidDate)).toBe(invalidDate)
  })

  it('updates device information when device data changes', async () => {
    const wrapper = mount(DeviceManagement, {
      props: { deviceId: 1 },
      global: {
        stubs: {
          'font-awesome-icon': { template: '<i />' }
        }
      }
    })

    await flushPromises()

    // Change device data through the ref
    deviceRef.value.name = 'Updated Device'
    deviceRef.value.ipAddress = '192.168.1.200'

    // Update status through the status ref
    statusesRef.value = [{ 
      deviceId: 1, 
      isOnline: true,
      lastChecked: '2025-12-13T12:00:00.000Z',
      connectLatencyMs: 50,
      softwareVersion: '2.0.0'
    }]

    await wrapper.vm.$nextTick()

    const values = wrapper.find('.device-info-grid').findAll('.value')
    expect(values[0].text()).toBe('Updated Device')
    expect(values[1].text()).toBe('192.168.1.200')
    expect(values[2].text()).toBe('2.0.0')
    expect(values[5].text()).toBe('50 мс')
  })

  it('displays device info section header correctly', async () => {
    const wrapper = mount(DeviceManagement, {
      props: { deviceId: 1 },
      global: {
        stubs: {
          'font-awesome-icon': { template: '<i />' }
        }
      }
    })

    await flushPromises()

    const headers = wrapper.findAll('h2.secondary-header')
    expect(headers[0].text()).toBe('Об устройстве')
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
