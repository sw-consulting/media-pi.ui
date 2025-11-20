/* @vitest-environment jsdom */
// Copyright (c) 2025 sw.consulting
// This file is a part of Media Pi  frontend application

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'

import DeviceManagementDialog from '@/components/Device_Management_Dialog.vue'

const statusesRef = ref([])

const getDeviceById = vi.hoisted(() => vi.fn())
const getDeviceStatusById = vi.hoisted(() => vi.fn(() => Promise.resolve()))
const reloadSystem = vi.hoisted(() => vi.fn(() => Promise.resolve()))
const rebootSystem = vi.hoisted(() => vi.fn(() => Promise.resolve()))
const shutdownSystem = vi.hoisted(() => vi.fn(() => Promise.resolve()))
const getAudio = vi.hoisted(() => vi.fn(() => Promise.resolve({ output: 'hdmi' })))
const updateAudio = vi.hoisted(() => vi.fn(() => Promise.resolve()))
const getPlaylist = vi.hoisted(() => vi.fn(() => Promise.resolve({ source: '', destination: '' })))
const updatePlaylist = vi.hoisted(() => vi.fn(() => Promise.resolve()))
const getSchedule = vi.hoisted(() => vi.fn(() => Promise.resolve({
  playlist: ['00:00'],
  video: ['00:00'],
  rest: [{ start: '00:00', stop: '00:00' }]
})))
const updateSchedule = vi.hoisted(() => vi.fn(() => Promise.resolve()))
const getServiceStatus = vi.hoisted(() => vi.fn(() => Promise.resolve({
  playbackServiceStatus: false,
  playlistUploadServiceStatus: false,
  yaDiskMountStatus: false
})))
const startPlayback = vi.hoisted(() => vi.fn(() => Promise.resolve()))
const stopPlayback = vi.hoisted(() => vi.fn(() => Promise.resolve()))
const startUpload = vi.hoisted(() => vi.fn(() => Promise.resolve()))
const stopUpload = vi.hoisted(() => vi.fn(() => Promise.resolve()))
const alertError = vi.hoisted(() => vi.fn())
const alertSuccess = vi.hoisted(() => vi.fn())

vi.mock('pinia', async () => {
  const actual = await vi.importActual('pinia')
  return {
    ...actual,
    storeToRefs: (store) => store.__mockRefs
  }
})

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
    __mockRefs: {
      alert: ref(null)
    }
  })
}))

vi.mock('@/helpers/config.js', () => ({
  timeouts: {
    apply: 10000,
    reboot: 30000,
    shutdown: 5000
  }
}))

const globalStubs = {
  'v-dialog': {
    props: ['modelValue'],
    emits: ['update:modelValue'],
    template: '<div class="v-dialog"><slot /></div>'
  },
  'v-card': { template: '<div class="v-card"><slot /></div>' },
  'v-card-title': { template: '<div class="v-card-title"><slot /></div>' },
  'v-card-text': { template: '<div class="v-card-text"><slot /></div>' },
  'v-card-actions': { template: '<div class="v-card-actions"><slot /></div>' },
  'v-spacer': { template: '<div class="v-spacer"></div>' },
  'v-tooltip': { template: '<div class="v-tooltip"><slot /></div>' }
}

describe('Device_Management_Dialog.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    alertError.mockReset()
    alertSuccess.mockReset()
    getDeviceStatusById.mockReset()
    reloadSystem.mockReset()
    rebootSystem.mockReset()
    shutdownSystem.mockReset()
    getAudio.mockReset()
    updateAudio.mockReset()
    getPlaylist.mockReset()
    updatePlaylist.mockReset()
    getSchedule.mockReset()
    updateSchedule.mockReset()
    getServiceStatus.mockReset()
    startPlayback.mockReset()
    stopPlayback.mockReset()
    startUpload.mockReset()
    stopUpload.mockReset()
    statusesRef.value = []
    getAudio.mockResolvedValue({ output: 'hdmi' })
    updateAudio.mockResolvedValue()
    getPlaylist.mockResolvedValue({ source: '', destination: '' })
    updatePlaylist.mockResolvedValue()
    getSchedule.mockResolvedValue({
      playlist: ['00:00'],
      video: ['00:00'],
      rest: [{ start: '00:00', stop: '00:00' }]
    })
    updateSchedule.mockResolvedValue()
    getServiceStatus.mockResolvedValue({
      playbackServiceStatus: false,
      playlistUploadServiceStatus: false,
      yaDiskMountStatus: false
    })
    startPlayback.mockResolvedValue()
    stopPlayback.mockResolvedValue()
    startUpload.mockResolvedValue()
    stopUpload.mockResolvedValue()
    getDeviceById.mockImplementation((id) => (
      id === 1
        ? {
            id,
            deviceStatus: {
              deviceId: id,
              isOnline: false
            }
          }
        : null
    ))
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllTimers()
  })

  const mountDialog = () => mount(DeviceManagementDialog, {
    props: { modelValue: true, deviceId: 1 },
    global: { stubs: globalStubs }
  })

  const settleWrapper = async (wrapper, delay = 20) => {
    await new Promise((resolve) => setTimeout(resolve, delay))
    await wrapper.vm.$nextTick()
  }

  const waitForOperationsToFinish = async (wrapper) => {
    let attempts = 0
    while (wrapper.vm.hasAnyOperationInProgress && attempts < 10) {
      await settleWrapper(wrapper)
      attempts += 1
    }
    if (attempts >= 10 && wrapper.vm.hasAnyOperationInProgress) {
      throw new Error('waitForOperationsToFinish: Operations did not finish within expected time')
    }
  }

  it('disables system buttons when device is offline and enables when online status arrives', async () => {
    const wrapper = mountDialog()

    const buttons = wrapper.findAll('.system-actions button')
    expect(buttons).toHaveLength(5)
    buttons.forEach((btn) => expect(btn.attributes('disabled')).toBeDefined())

    statusesRef.value = [
      { deviceId: 1, isOnline: true }
    ]
    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 0))
    await wrapper.vm.$nextTick()

    const refreshedButtons = wrapper.findAll('.system-actions button')
    refreshedButtons.forEach((btn) => expect(btn.attributes('disabled')).toBeUndefined())
  })

  it('invokes reloadSystem when apply button is clicked', async () => {
    statusesRef.value = [
      { deviceId: 1, isOnline: true }
    ]
    const wrapper = mountDialog()

    const applyBtn = wrapper.find('[data-test="system-apply"]')
    await applyBtn.trigger('click')
    await wrapper.vm.$nextTick()
    expect(reloadSystem).toHaveBeenCalledWith(1)
  })

  it('invokes rebootSystem when reboot button is clicked', async () => {
    statusesRef.value = [
      { deviceId: 1, isOnline: true }
    ]
    const wrapper = mountDialog()

    const rebootBtn = wrapper.find('[data-test="system-reboot"]')
    await rebootBtn.trigger('click')
    await wrapper.vm.$nextTick()
    expect(rebootSystem).toHaveBeenCalledWith(1)
  })

  it('invokes shutdownSystem when shutdown button is clicked', async () => {
    statusesRef.value = [
      { deviceId: 1, isOnline: true }
    ]
    const wrapper = mountDialog()

    const shutdownBtn = wrapper.find('[data-test="system-shutdown"]')
    await shutdownBtn.trigger('click')
    await wrapper.vm.$nextTick()
    expect(shutdownSystem).toHaveBeenCalledWith(1)
  })

  it('reads all panels when global read button is clicked', async () => {
    statusesRef.value = [
      { deviceId: 1, isOnline: true }
    ]
    const wrapper = mountDialog()

    await settleWrapper(wrapper)
    getServiceStatus.mockClear()
    getAudio.mockClear()
    getPlaylist.mockClear()
    getSchedule.mockClear()

    const readBtn = wrapper.find('[data-test="system-read"]')
    await readBtn.trigger('click')
    await wrapper.vm.$nextTick()
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(getServiceStatus).toHaveBeenCalledWith(1)
    expect(getAudio).toHaveBeenCalledWith(1)
    expect(getPlaylist).toHaveBeenCalledWith(1)
    expect(getSchedule).toHaveBeenCalledWith(1)
  })

  it('saves all panels when global save button is clicked', async () => {
    statusesRef.value = [
      { deviceId: 1, isOnline: true }
    ]
    const wrapper = mountDialog()
    await settleWrapper(wrapper)
    await waitForOperationsToFinish(wrapper)

    await wrapper.find('#playlist-source').setValue('new/source')
    await wrapper.find('#playlist-destination').setValue('new/destination')
    await wrapper.find('.audio-selector').setValue('jack')

    updateAudio.mockClear()
    updatePlaylist.mockClear()
    updateSchedule.mockClear()

    const saveBtn = wrapper.find('[data-test="system-save"]')
    await saveBtn.trigger('click')
    await wrapper.vm.$nextTick()
    await waitForOperationsToFinish(wrapper)

    expect(updateAudio).toHaveBeenCalledWith(1, { output: 'jack' })
    expect(updatePlaylist).toHaveBeenCalledWith(1, { source: 'new/source', destination: 'new/destination' })
    expect(updateSchedule).toHaveBeenCalledWith(1, {
      playlist: ['00:00'],
      video: ['00:00'],
      rest: [{ start: '00:00', stop: '00:00' }]
    })
  })

  it('displays error message when system action fails', async () => {
    statusesRef.value = [
      { deviceId: 1, isOnline: true }
    ]
    reloadSystem.mockRejectedValueOnce(new Error('Network error'))

    const wrapper = mountDialog()
    await settleWrapper(wrapper)
    const applyBtn = wrapper.find('[data-test="system-apply"]')

    await applyBtn.trigger('click')
    await wrapper.vm.$nextTick()

    expect(alertError).toHaveBeenCalledWith('Network error')
  })

  it('emits update when close button clicked', async () => {
    const wrapper = mountDialog()

    await wrapper.find('button.button-o-c.primary:last-of-type').trigger('click')

    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    expect(wrapper.emitted('update:modelValue').pop()).toEqual([false])
  })

  it('initializes device status when dialog opens', async () => {
    mount(DeviceManagementDialog, {
      props: { modelValue: true, deviceId: 1 },
      global: { stubs: globalStubs }
    })

    // Wait for Vue reactivity and async operations
    await new Promise(resolve => setTimeout(resolve, 0))

    expect(getDeviceStatusById).toHaveBeenCalledWith(1)
  })

  it('fetches device status when deviceId changes while dialog is open', async () => {
    const wrapper = mount(DeviceManagementDialog, {
      props: { modelValue: true, deviceId: 1 },
      global: { stubs: globalStubs }
    })

    // Wait for initial mount and clear the mock
    await new Promise(resolve => setTimeout(resolve, 0))
    expect(getDeviceStatusById).toHaveBeenCalledWith(1)
    getDeviceStatusById.mockClear()

    await wrapper.setProps({ deviceId: 2 })

    expect(getDeviceStatusById).toHaveBeenCalledWith(2)
  })

  describe('Service management', () => {
    it('loads and displays service statuses when dialog opens with online device', async () => {
      statusesRef.value = [
        { deviceId: 1, isOnline: true }
      ]
      getServiceStatus.mockResolvedValue({
        playbackServiceStatus: true,
        playlistUploadServiceStatus: false,
        yaDiskMountStatus: true
      })

      const wrapper = mountDialog()

      await new Promise((resolve) => setTimeout(resolve, 15))
      await wrapper.vm.$nextTick()

      expect(getServiceStatus).toHaveBeenCalledWith(1)
      const statuses = wrapper.findAll('.service-status')
      expect(statuses).toHaveLength(3)
      expect(statuses[0].text()).toBe('Запущено')
      expect(statuses[1].text()).toBe('Остановлена')
      expect(statuses[2].text()).toBe('Смонтирован')
    })

    it('invokes startPlayback and refreshes status when playback is stopped', async () => {
      statusesRef.value = [
        { deviceId: 1, isOnline: true }
      ]

      const wrapper = mountDialog()

      await settleWrapper(wrapper)
      await waitForOperationsToFinish(wrapper)
      vi.useFakeTimers()
      getServiceStatus.mockClear()

      const button = wrapper.find('[data-test="service-action-playback"]')
      expect(button.text()).toContain('Запустить')

      await button.trigger('click')
      await wrapper.vm.$nextTick()
      await vi.advanceTimersByTimeAsync(3000)
      await wrapper.vm.$nextTick()

      expect(startPlayback).toHaveBeenCalledWith(1)
      expect(getServiceStatus).toHaveBeenCalledWith(1)
    })

    it('invokes stopPlayback and refreshes status when playback is running', async () => {
      statusesRef.value = [
        { deviceId: 1, isOnline: true }
      ]
      getServiceStatus.mockResolvedValue({
        playbackServiceStatus: true,
        playlistUploadServiceStatus: false,
        yaDiskMountStatus: false
      })

      const wrapper = mountDialog()

      await settleWrapper(wrapper)
      await waitForOperationsToFinish(wrapper)
      vi.useFakeTimers()
      getServiceStatus.mockClear()

      const button = wrapper.find('[data-test="service-action-playback"]')
      expect(button.text()).toContain('Остановить')

      await button.trigger('click')
      await wrapper.vm.$nextTick()
      await vi.advanceTimersByTimeAsync(3000)
      await wrapper.vm.$nextTick()

      expect(stopPlayback).toHaveBeenCalledWith(1)
      expect(getServiceStatus).toHaveBeenCalledWith(1)
    })

    it('disables service controls when device is offline', () => {
      const wrapper = mountDialog()
      const buttons = wrapper.findAll('.service-settings button')
      expect(buttons.length).toBeGreaterThan(0)
      buttons.forEach((btn) => expect(btn.attributes('disabled')).toBeDefined())
    })
  })

  it('disables system buttons when no status data is available', async () => {
    // Mock getDeviceById to return null (no cached status)
    getDeviceById.mockImplementation(() => null)
    // Clear any existing status data
    statusesRef.value = []

    const wrapper = mount(DeviceManagementDialog, {
      props: { modelValue: true, deviceId: 1 },
      global: { stubs: globalStubs }
    })

    const buttons = wrapper.findAll('.system-actions button')
    expect(buttons).toHaveLength(5)
    buttons.forEach((btn) => expect(btn.attributes('disabled')).toBeDefined())
  })

  it('fetches device status after reboot and shutdown operations with proper timeouts', async () => {
    vi.useFakeTimers()

    statusesRef.value = [
      { deviceId: 1, isOnline: true }
    ]
    const wrapper = mount(DeviceManagementDialog, {
      props: { modelValue: true, deviceId: 1 },
      global: { stubs: globalStubs }
    })

    // Wait for initial status fetch
    await vi.runOnlyPendingTimersAsync()
    getDeviceStatusById.mockClear()

    const rebootBtn = wrapper.find('[data-test="system-reboot"]')
    const shutdownBtn = wrapper.find('[data-test="system-shutdown"]')

    // Test reboot button (30 second timeout)
    await rebootBtn.trigger('click')
    await wrapper.vm.$nextTick()
    expect(rebootSystem).toHaveBeenCalledWith(1)
    expect(getDeviceStatusById).not.toHaveBeenCalled()

    // Fast-forward 30 seconds for reboot
    await vi.advanceTimersByTimeAsync(30000)
    await wrapper.vm.$nextTick()

    expect(getDeviceStatusById).toHaveBeenCalledWith(1)
    getDeviceStatusById.mockClear()

    // Test shutdown button (5 second timeout)
    await shutdownBtn.trigger('click')
    await wrapper.vm.$nextTick()
    expect(shutdownSystem).toHaveBeenCalledWith(1)
    expect(getDeviceStatusById).not.toHaveBeenCalled()

    // Fast-forward 5 seconds for shutdown
    await vi.advanceTimersByTimeAsync(5000)
    await wrapper.vm.$nextTick()

    expect(getDeviceStatusById).toHaveBeenCalledWith(1)

    vi.useRealTimers()
  }, 10000)

  describe('Schedule timer settings', () => {
    it('loads schedule settings when dialog opens with online device', async () => {
      statusesRef.value = [
        { deviceId: 1, isOnline: true }
      ]

      const wrapper = mount(DeviceManagementDialog, {
        props: { modelValue: true, deviceId: 1 },
        global: { stubs: globalStubs }
      })

      await settleWrapper(wrapper)

      expect(getSchedule).toHaveBeenCalledWith(1)
    })
  })

  describe('Audio settings', () => {
    it('loads audio settings when dialog opens with online device', async () => {
      statusesRef.value = [
        { deviceId: 1, isOnline: true }
      ]

      const wrapper = mount(DeviceManagementDialog, {
        props: { modelValue: true, deviceId: 1 },
        global: { stubs: globalStubs }
      })

      // Wait for Vue reactivity and async operations
      await settleWrapper(wrapper)

      expect(getAudio).toHaveBeenCalledWith(1)
    })

    it('sets default audio settings when dialog opens with offline device', async () => {
      statusesRef.value = [
        { deviceId: 1, isOnline: false }
      ]

      const wrapper = mount(DeviceManagementDialog, {
        props: { modelValue: true, deviceId: 1 },
        global: { stubs: globalStubs }
      })

      // Wait for Vue reactivity and async operations
      await settleWrapper(wrapper)

      expect(getAudio).not.toHaveBeenCalled()
      expect(wrapper.find('.audio-selector').element.value).toBe('hdmi')
    })
  })

  describe('Playlist settings', () => {
    it('loads playlist settings when dialog opens with online device', async () => {
      statusesRef.value = [
        { deviceId: 1, isOnline: true }
      ]

      const wrapper = mountDialog()
      await settleWrapper(wrapper)

      expect(getPlaylist).toHaveBeenCalledWith(1)
    })

    it('disables playlist controls when device is offline', async () => {
      const wrapper = mountDialog()

      expect(wrapper.find('#playlist-source').attributes('disabled')).toBeDefined()
      expect(wrapper.find('#playlist-destination').attributes('disabled')).toBeDefined()
    })
  })

  it('displays audio selector with correct options', async () => {
    statusesRef.value = [
      { deviceId: 1, isOnline: true }
    ]
    const wrapper = mountDialog()

    await wrapper.vm.$nextTick()

    const audioSelector = wrapper.find('.audio-selector')
    expect(audioSelector.exists()).toBe(true)

    const options = audioSelector.findAll('option')
    expect(options).toHaveLength(2)
    expect(options[0].text()).toBe('HDMI audio')
    expect(options[0].attributes('value')).toBe('hdmi')
    expect(options[1].text()).toBe("3.5'' jack audio")
    expect(options[1].attributes('value')).toBe('jack')
  })

  it('sets audio output to hdmi when getAudio returns unknown with online device', async () => {
    statusesRef.value = [
      { deviceId: 1, isOnline: true }
    ]
    getAudio.mockResolvedValueOnce({ output: 'unknown' })

    const wrapper = mountDialog()
    await settleWrapper(wrapper)

    expect(alertError).toHaveBeenCalledWith('Неизвестный тип аудио выхода. Установлено значение по умолчанию: HDMI')
    expect(wrapper.find('.audio-selector').element.value).toBe('hdmi')
  })

  it('sets audio output to hdmi when getAudio returns unrecognized value with online device', async () => {
    statusesRef.value = [
      { deviceId: 1, isOnline: true }
    ]
    getAudio.mockResolvedValueOnce({ output: 'invalid-option' })

    const wrapper = mountDialog()
    await settleWrapper(wrapper)

    expect(alertError).toHaveBeenCalledWith('Неизвестный тип аудио выхода. Установлено значение по умолчанию: HDMI')
    expect(wrapper.find('.audio-selector').element.value).toBe('hdmi')
  })

  it('disables audio controls when device is offline', async () => {
    const wrapper = mountDialog()

    const selector = wrapper.find('.audio-selector')

    expect(selector.attributes('disabled')).toBeDefined()
  })

  it('verifies audio selector exists and is functional when device is online', async () => {
    statusesRef.value = [
      { deviceId: 1, isOnline: true }
    ]

    const wrapper = mountDialog()
    await settleWrapper(wrapper, 20)

    const selector = wrapper.find('.audio-selector')

    expect(selector.exists()).toBe(true)

    // Verify the buttons are clickable when online
    expect(selector.attributes('disabled')).toBeUndefined()
  })

  it('displays error when getAudio fails with online device', async () => {
    statusesRef.value = [
      { deviceId: 1, isOnline: true }
    ]
    getAudio.mockRejectedValueOnce(new Error('Network error'))

    const wrapper = mountDialog()
    await settleWrapper(wrapper)

    expect(alertError).toHaveBeenCalledWith('Не удалось загрузить настройки аудио: Network error')
  })

  it('refreshes audio settings when deviceId changes with online device', async () => {
    statusesRef.value = [
      { deviceId: 1, isOnline: true }
    ]
    const wrapper = mount(DeviceManagementDialog, {
      props: { modelValue: true, deviceId: 1 },
      global: { stubs: globalStubs }
    })

    // Wait for initial load and clear the mock
    await settleWrapper(wrapper)
    expect(getAudio).toHaveBeenCalledWith(1)
    getAudio.mockClear()

    // Change to device 2 and make it online
    statusesRef.value = [
      { deviceId: 2, isOnline: true }
    ]
    await wrapper.setProps({ deviceId: 2 })
    await settleWrapper(wrapper)

    expect(getAudio).toHaveBeenCalledWith(2)
  })

  it('loads audio settings when device comes online', async () => {
    // Start with offline device
    statusesRef.value = [
      { deviceId: 1, isOnline: false }
    ]
    const wrapper = mount(DeviceManagementDialog, {
      props: { modelValue: true, deviceId: 1 },
      global: { stubs: globalStubs }
    })

    await settleWrapper(wrapper)
    expect(getAudio).not.toHaveBeenCalled()

    // Device comes online
    statusesRef.value = [
      { deviceId: 1, isOnline: true }
    ]
    await wrapper.vm.$nextTick()
    await settleWrapper(wrapper)

    expect(getAudio).toHaveBeenCalledWith(1)
  })
})
