/* @vitest-environment jsdom */
// Copyright (c) 2025 sw.consulting
// This file is a part of Media Pi  frontend application

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'

import DeviceStatusDialog from '@/components/Device_Status_Dialog.vue'

const statusesRef = ref([])
const loadingRef = ref(false)

const getById = vi.hoisted(() => vi.fn(() => Promise.resolve(null)))
const getDeviceById = vi.hoisted(() => vi.fn())

let deviceData

vi.mock('pinia', async () => {
  const actual = await vi.importActual('pinia')
  return {
    ...actual,
    storeToRefs: (store) => store.__mockRefs
  }
})

vi.mock('@/stores/devices.store.js', () => ({
  useDevicesStore: () => ({
    getDeviceById
  })
}))

vi.mock('@/stores/device.statuses.store.js', () => ({
  useDeviceStatusesStore: () => ({
    __mockRefs: {
      statuses: statusesRef,
      loading: loadingRef
    },
    getById
  })
}))

vi.mock('@/components/Services_List.vue', () => ({
  default: {
    name: 'ServicesList',
    props: {
      deviceId: { type: Number, required: true },
      accessible: { type: Boolean, default: false },
      open: { type: Boolean, default: false }
    },
    template: '<div class="services-stub" :data-device="deviceId" :data-accessible="accessible" :data-open="open"></div>'
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
  'font-awesome-icon': true
}

describe('Device_Status_Dialog.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    statusesRef.value = []
    loadingRef.value = false
    deviceData = {
      id: 1,
      name: 'Test device',
      ipAddress: '127.0.0.1',
      deviceStatus: {
        deviceId: 1,
        isOnline: false,
        lastChecked: '2025-01-01T00:00:00Z',
        connectLatencyMs: 0,
        totalLatencyMs: 0
      }
    }
    getDeviceById.mockImplementation((id) => (id === 1 ? deviceData : null))
    getById.mockResolvedValue(deviceData.deviceStatus)
  })

  it('passes online accessibility to services list when status is online', () => {
    statusesRef.value = [
      {
        deviceId: 1,
        isOnline: true,
        lastChecked: '2025-01-02T00:00:00Z',
        connectLatencyMs: 5,
        totalLatencyMs: 12
      }
    ]

    const wrapper = mount(DeviceStatusDialog, {
      props: { modelValue: true, deviceId: 1 },
      global: { stubs: globalStubs }
    })

    const services = wrapper.findComponent({ name: 'ServicesList' })
    expect(services.exists()).toBe(true)
    expect(services.props('deviceId')).toBe(1)
    expect(services.props('accessible')).toBe(true)
    expect(services.props('open')).toBe(true)
  })

  it('passes offline accessibility to services list when device is offline', () => {
    deviceData.deviceStatus.isOnline = false
    statusesRef.value = []

    const wrapper = mount(DeviceStatusDialog, {
      props: { modelValue: true, deviceId: 1 },
      global: { stubs: globalStubs }
    })

    const services = wrapper.findComponent({ name: 'ServicesList' })
    expect(services.exists()).toBe(true)
    expect(services.props('accessible')).toBe(false)
  })
})
