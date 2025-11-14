/* @vitest-environment jsdom */
// Copyright (c) 2025 sw.consulting
// This file is a part of Media Pi  frontend application

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'

import DeviceManagementDialog from '@/components/Device_Management_Dialog.vue'

const statusesRef = ref([])

const getDeviceById = vi.hoisted(() => vi.fn())
const getDeviceStatusById = vi.hoisted(() => vi.fn(() => Promise.resolve()))
const reloadSystem = vi.hoisted(() => vi.fn(() => Promise.resolve()))
const rebootSystem = vi.hoisted(() => vi.fn(() => Promise.resolve()))
const shutdownSystem = vi.hoisted(() => vi.fn(() => Promise.resolve()))
const alertError = vi.hoisted(() => vi.fn())

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
    shutdownSystem
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
    __mockRefs: {
      alert: ref(null)
    }
  })
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
  'v-spacer': { template: '<div class="v-spacer"></div>' }
}

describe('Device_Management_Dialog.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    alertError.mockReset()
    getDeviceStatusById.mockReset()
    statusesRef.value = []
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

    const refreshedButtons = wrapper.findAll('.system-actions button')
    refreshedButtons.forEach((btn) => expect(btn.attributes('disabled')).toBeUndefined())
  })

  it('invokes corresponding store actions when buttons are clicked', async () => {
    statusesRef.value = [
      { deviceId: 1, isOnline: true }
    ]
    const wrapper = mountDialog()

    const [applyBtn, rebootBtn, shutdownBtn] = wrapper.findAll('.system-actions button')

    await applyBtn.trigger('click')
    expect(reloadSystem).toHaveBeenCalledWith(1)

    await rebootBtn.trigger('click')
    expect(rebootSystem).toHaveBeenCalledWith(1)

    await shutdownBtn.trigger('click')
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

  it('fetches device status 5 seconds after reboot and shutdown operations', async () => {
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

    // Test reboot button
    await rebootBtn.trigger('click')
    expect(rebootSystem).toHaveBeenCalledWith(1)
    expect(getDeviceStatusById).not.toHaveBeenCalled()

    // Fast-forward 5 seconds
    await vi.advanceTimersByTimeAsync(5000)

    expect(getDeviceStatusById).toHaveBeenCalledWith(1)
    getDeviceStatusById.mockClear()

    // Test shutdown button
    await shutdownBtn.trigger('click')
    expect(shutdownSystem).toHaveBeenCalledWith(1)
    expect(getDeviceStatusById).not.toHaveBeenCalled()

    // Fast-forward 5 seconds
    await vi.advanceTimersByTimeAsync(5000)

    expect(getDeviceStatusById).toHaveBeenCalledWith(1)

    vi.useRealTimers()
  }, 10000)
})
