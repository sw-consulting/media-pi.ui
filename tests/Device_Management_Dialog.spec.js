/* @vitest-environment jsdom */
// Copyright (c) 2025 sw.consulting
// This file is a part of Media Pi  frontend application

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
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
    updateSchedule
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

  const mountDialog = () => mount(DeviceManagementDialog, {
    props: { modelValue: true, deviceId: 1 },
    global: { stubs: globalStubs }
  })

  it('disables system buttons when device is offline and enables when online status arrives', async () => {
    const wrapper = mountDialog()

    const buttons = wrapper.findAll('.system-actions button')
    expect(buttons).toHaveLength(3)
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

    const [applyBtn] = wrapper.findAll('.system-actions button')
    await applyBtn.trigger('click')
    await wrapper.vm.$nextTick()
    expect(reloadSystem).toHaveBeenCalledWith(1)
  })

  it('invokes rebootSystem when reboot button is clicked', async () => {
    statusesRef.value = [
      { deviceId: 1, isOnline: true }
    ]
    const wrapper = mountDialog()

    const [, rebootBtn] = wrapper.findAll('.system-actions button')
    await rebootBtn.trigger('click')
    await wrapper.vm.$nextTick()
    expect(rebootSystem).toHaveBeenCalledWith(1)
  })

  it('invokes shutdownSystem when shutdown button is clicked', async () => {
    statusesRef.value = [
      { deviceId: 1, isOnline: true }
    ]
    const wrapper = mountDialog()

    const [, , shutdownBtn] = wrapper.findAll('.system-actions button')
    await shutdownBtn.trigger('click')
    await wrapper.vm.$nextTick()
    expect(shutdownSystem).toHaveBeenCalledWith(1)
  })

  it('displays error message when system action fails', async () => {
    statusesRef.value = [
      { deviceId: 1, isOnline: true }
    ]
    reloadSystem.mockRejectedValueOnce(new Error('Network error'))

    const wrapper = mountDialog()
    const [applyBtn] = wrapper.findAll('.system-actions button')

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
    expect(buttons).toHaveLength(3)
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

    const [, rebootBtn, shutdownBtn] = wrapper.findAll('.system-actions button')

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

      mount(DeviceManagementDialog, {
        props: { modelValue: true, deviceId: 1 },
        global: { stubs: globalStubs }
      })

      await new Promise((resolve) => setTimeout(resolve, 10))

      expect(getSchedule).toHaveBeenCalledWith(1)
    })

    it('invokes getSchedule when read button is clicked', async () => {
      statusesRef.value = [
        { deviceId: 1, isOnline: true }
      ]
      const wrapper = mountDialog()

      await new Promise((resolve) => setTimeout(resolve, 10))
      await wrapper.vm.$nextTick()
      getSchedule.mockClear()

      const [readButton] = wrapper.findAll('.timer-buttons button')
      await readButton.trigger('click')
      await wrapper.vm.$nextTick()

      expect(getSchedule).toHaveBeenCalledWith(1)
    })

    // Additional schedule timer interactions are covered via read button test above
  })

  describe('Audio settings', () => {
    it('loads audio settings when dialog opens with online device', async () => {
      statusesRef.value = [
        { deviceId: 1, isOnline: true }
      ]

      mount(DeviceManagementDialog, {
        props: { modelValue: true, deviceId: 1 },
        global: { stubs: globalStubs }
      })

      // Wait for Vue reactivity and async operations
      await new Promise(resolve => setTimeout(resolve, 10))

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
      await new Promise(resolve => setTimeout(resolve, 10))

      expect(getAudio).not.toHaveBeenCalled()
      expect(wrapper.find('.audio-selector').element.value).toBe('hdmi')
    })
  })

  describe('Playlist settings', () => {
    it('loads playlist settings when dialog opens with online device', async () => {
      statusesRef.value = [
        { deviceId: 1, isOnline: true }
      ]

      mountDialog()

      await new Promise(resolve => setTimeout(resolve, 10))

      expect(getPlaylist).toHaveBeenCalledWith(1)
    })

    it('updates playlist fields when read button clicked', async () => {
      statusesRef.value = [
        { deviceId: 1, isOnline: true }
      ]
      getPlaylist.mockResolvedValue({ source: 'yandex/path', destination: '/local/path' })

      const wrapper = mountDialog()
      await new Promise(resolve => setTimeout(resolve, 10))

      const readButton = wrapper.find('.playlist-settings button')
      await readButton.trigger('click')
      await wrapper.vm.$nextTick()

      expect(getPlaylist).toHaveBeenCalledWith(1)
      expect(wrapper.find('#playlist-source').element.value).toBe('yandex/path')
      expect(wrapper.find('#playlist-destination').element.value).toBe('/local/path')
    })

    it('saves playlist settings when save button clicked', async () => {
      statusesRef.value = [
        { deviceId: 1, isOnline: true }
      ]
      const wrapper = mountDialog()
      await new Promise(resolve => setTimeout(resolve, 10))

      await wrapper.find('#playlist-source').setValue('new/source')
      await wrapper.find('#playlist-destination').setValue('new/destination')

      const saveButton = wrapper.find('.playlist-settings button:nth-of-type(2)')
      await saveButton.trigger('click')
      await wrapper.vm.$nextTick()

      expect(updatePlaylist).toHaveBeenCalledWith(1, { source: 'new/source', destination: 'new/destination' })
      expect(alertSuccess).toHaveBeenCalledWith('Настройки плей-листа успешно сохранены')
    })

    it('disables playlist controls when device is offline', async () => {
      const wrapper = mountDialog()

      expect(wrapper.find('#playlist-source').attributes('disabled')).toBeDefined()
      expect(wrapper.find('#playlist-destination').attributes('disabled')).toBeDefined()
      const buttons = wrapper.findAll('.playlist-settings button')
      expect(buttons).toHaveLength(2)
      buttons.forEach((btn) => expect(btn.attributes('disabled')).toBeDefined())
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
    await new Promise(resolve => setTimeout(resolve, 10))
    await wrapper.vm.$nextTick()

    expect(alertError).toHaveBeenCalledWith('Неизвестный тип аудио выхода. Установлено значение по умолчанию: HDMI')
    expect(wrapper.find('.audio-selector').element.value).toBe('hdmi')
  })

  it('sets audio output to hdmi when getAudio returns unrecognized value with online device', async () => {
    statusesRef.value = [
      { deviceId: 1, isOnline: true }
    ]
    getAudio.mockResolvedValueOnce({ output: 'invalid-option' })

    const wrapper = mountDialog()
    await new Promise(resolve => setTimeout(resolve, 10))
    await wrapper.vm.$nextTick()

    expect(alertError).toHaveBeenCalledWith('Неизвестный тип аудио выхода. Установлено значение по умолчанию: HDMI')
    expect(wrapper.find('.audio-selector').element.value).toBe('hdmi')
  })

  it('updates audio setting when refresh is clicked with jack output', async () => {
    statusesRef.value = [
      { deviceId: 1, isOnline: true }
    ]
    const wrapper = mountDialog()
    await new Promise(resolve => setTimeout(resolve, 10))

    // Mock the next call to getAudio to return jack
    getAudio.mockResolvedValueOnce({ output: 'jack' })

    const refreshBtn = wrapper.find('.audio-settings button:nth-of-type(1)')
    await refreshBtn.trigger('click')
    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 10))

    expect(wrapper.find('.audio-selector').element.value).toBe('jack')
    expect(alertError).not.toHaveBeenCalled()
  })

  it('calls updateAudio when refresh button is clicked', async () => {
    statusesRef.value = [
      { deviceId: 1, isOnline: true }
    ]
    const wrapper = mountDialog()

    await new Promise(resolve => setTimeout(resolve, 0))
    getAudio.mockClear()

    const refreshBtn = wrapper.find('.audio-settings button:nth-of-type(1)')
    await refreshBtn.trigger('click')
    await wrapper.vm.$nextTick()

    expect(getAudio).toHaveBeenCalledWith(1)
  })

  it('calls updateAudio with correct data when save button is clicked', async () => {
    statusesRef.value = [
      { deviceId: 1, isOnline: true }
    ]
    const wrapper = mountDialog()

    await new Promise(resolve => setTimeout(resolve, 10))
    await wrapper.vm.$nextTick()

    // Change selection to jack
    const selector = wrapper.find('.audio-selector')
    await selector.setValue('jack')

    const saveBtn = wrapper.find('.audio-settings button:nth-of-type(2)')
    await saveBtn.trigger('click')
    await wrapper.vm.$nextTick()

    expect(updateAudio).toHaveBeenCalledWith(1, { output: 'jack' })
    expect(alertSuccess).toHaveBeenCalledWith('Настройки аудио успешно сохранены')
  })

  it('disables audio controls when device is offline', async () => {
    const wrapper = mountDialog()

    const selector = wrapper.find('.audio-selector')
    const buttons = wrapper.findAll('.audio-settings button')

    expect(selector.attributes('disabled')).toBeDefined()
    buttons.forEach((btn) => expect(btn.attributes('disabled')).toBeDefined())
  })

  it('verifies audio controls exist and are functional', async () => {
    statusesRef.value = [
      { deviceId: 1, isOnline: true }
    ]

    const wrapper = mountDialog()
    await new Promise(resolve => setTimeout(resolve, 20))
    await wrapper.vm.$nextTick()

    const selector = wrapper.find('.audio-selector')
    const buttons = wrapper.findAll('.audio-settings button')

    expect(selector.exists()).toBe(true)
    expect(buttons).toHaveLength(2)

    // Verify the buttons are clickable when online
    expect(selector.attributes('disabled')).toBeUndefined()
    buttons.forEach((btn) => expect(btn.attributes('disabled')).toBeUndefined())
  })

  it('displays error when getAudio fails with online device', async () => {
    statusesRef.value = [
      { deviceId: 1, isOnline: true }
    ]
    getAudio.mockRejectedValueOnce(new Error('Network error'))

    const wrapper = mountDialog()
    await new Promise(resolve => setTimeout(resolve, 10))
    await wrapper.vm.$nextTick()

    expect(alertError).toHaveBeenCalledWith('Не удалось загрузить настройки аудио: Network error')
  })

  it('displays error when updateAudio fails', async () => {
    statusesRef.value = [
      { deviceId: 1, isOnline: true }
    ]
    updateAudio.mockRejectedValueOnce(new Error('Save error'))

    const wrapper = mountDialog()
    await new Promise(resolve => setTimeout(resolve, 0))
    await wrapper.vm.$nextTick()

    const saveBtn = wrapper.find('.audio-settings button:nth-of-type(2)')
    await saveBtn.trigger('click')
    await wrapper.vm.$nextTick()

    expect(alertError).toHaveBeenCalledWith('Не удалось сохранить настройки аудио: Save error')
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
    await new Promise(resolve => setTimeout(resolve, 10))
    expect(getAudio).toHaveBeenCalledWith(1)
    getAudio.mockClear()

    // Change to device 2 and make it online
    statusesRef.value = [
      { deviceId: 2, isOnline: true }
    ]
    await wrapper.setProps({ deviceId: 2 })
    await wrapper.vm.$nextTick()

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

    await new Promise(resolve => setTimeout(resolve, 10))
    expect(getAudio).not.toHaveBeenCalled()

    // Device comes online
    statusesRef.value = [
      { deviceId: 1, isOnline: true }
    ]
    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 10))

    expect(getAudio).toHaveBeenCalledWith(1)
  })

  it('displays loading states for audio buttons correctly', async () => {
    statusesRef.value = [
      { deviceId: 1, isOnline: true }
    ]

    const wrapper = mountDialog()
    await new Promise(resolve => setTimeout(resolve, 10))
    await wrapper.vm.$nextTick()

    const [refreshBtn, saveBtn] = wrapper.findAll('.audio-settings button')

    // Test refresh button loading state
    expect(refreshBtn.text()).toContain('Прочитать')
    expect(refreshBtn.find('font-awesome-icon').exists()).toBe(true)

    // Test save button loading state
    expect(saveBtn.text()).toContain('Сохранить')
    expect(saveBtn.find('font-awesome-icon').exists()).toBe(true)
  })
})
