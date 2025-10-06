/* @vitest-environment jsdom */
// Copyright (c) 2025 sw.consulting
// This file is a part of Media Pi  frontend application

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'

import ServicesList from '@/components/Services_List.vue'

const servicesRef = ref([])
const loadingRef = ref(false)
const errorRef = ref(null)

const listServices = vi.hoisted(() => vi.fn(() => Promise.resolve()))
const startService = vi.hoisted(() => vi.fn(() => Promise.resolve({ ok: true, result: 'started' })))
const stopService = vi.hoisted(() => vi.fn(() => Promise.resolve({ ok: true, result: 'stopped' })))
const restartService = vi.hoisted(() => vi.fn(() => Promise.resolve({ ok: true, result: 'restarted' })))
const enableService = vi.hoisted(() => vi.fn(() => Promise.resolve({ ok: true, enabled: true })))
const disableService = vi.hoisted(() => vi.fn(() => Promise.resolve({ ok: true, enabled: false })))

vi.mock('pinia', async () => {
  const actual = await vi.importActual('pinia')
  return {
    ...actual,
    storeToRefs: () => ({
      services: servicesRef,
      loading: loadingRef,
      error: errorRef
    })
  }
})

vi.mock('@/stores/devices.store.js', () => ({
  useDevicesStore: () => ({
    listServices,
    startService,
    stopService,
    restartService,
    enableService,
    disableService
  })
}))

const globalStubs = {
  'v-card': { template: '<div class="v-card"><slot /></div>' },
  'v-data-table': {
    props: ['items', 'headers', 'itemKey', 'sortBy', 'itemsPerPage', 'hideDefaultFooter'],
    template: `
      <div class="data-table">
        <div v-for="item in items" :key="item.key" class="service-row">
          <slot name="item.actions" :item="item"></slot>
          <div class="unit">{{ item.unit }}</div>
          <div class="active">{{ item.active }}</div>
          <div class="sub">{{ item.sub }}</div>
          <div class="error">{{ item.error }}</div>
        </div>
      </div>
    `
  },
  'v-tooltip': {
    template: '<div><slot name="activator" :props="{}"></slot><slot /></div>'
  },
  'font-awesome-icon': true
}

describe('Services_List.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    servicesRef.value = []
    loadingRef.value = false
    errorRef.value = null
    listServices.mockResolvedValue(undefined)
    startService.mockResolvedValue({ ok: true, result: 'started' })
    stopService.mockResolvedValue({ ok: true, result: 'stopped' })
    restartService.mockResolvedValue({ ok: true, result: 'restarted' })
    enableService.mockResolvedValue({ ok: true, enabled: true })
    disableService.mockResolvedValue({ ok: true, enabled: false })
  })

  it('fetches services when device is accessible and dialog is open', async () => {
    mount(ServicesList, {
      props: { deviceId: 5, accessible: true, open: true },
      global: { stubs: globalStubs }
    })

    await flushPromises()

    expect(listServices).toHaveBeenCalledWith(5)
  })

  it('does not fetch services when device is inaccessible', async () => {
    mount(ServicesList, {
      props: { deviceId: 5, accessible: false, open: true },
      global: { stubs: globalStubs }
    })

    await flushPromises()

    expect(listServices).not.toHaveBeenCalled()
  })

  it('renders formatted service information', async () => {
    servicesRef.value = [
      { unit: 'mpd.service', active: { Value: 'active' }, sub: { Value: 'running' }, error: null }
    ]

    const wrapper = mount(ServicesList, {
      props: { deviceId: 7, accessible: true, open: true },
      global: { stubs: globalStubs }
    })

    await flushPromises()

    expect(wrapper.html()).toContain('mpd.service')
    expect(wrapper.html()).toContain('active')
    expect(wrapper.html()).toContain('running')
    expect(wrapper.html()).not.toContain('Службы не найдены')
  })

  it('invokes service actions with proper arguments', async () => {
    servicesRef.value = [
      { unit: 'mpd.service', active: 'active', sub: 'running', error: null }
    ]

    const wrapper = mount(ServicesList, {
      props: { deviceId: 9, accessible: true, open: true },
      global: { stubs: globalStubs }
    })

    await flushPromises()
    listServices.mockClear()

    await wrapper.find('button.start-service').trigger('click')
    await flushPromises()
    expect(startService).toHaveBeenCalledWith(9, 'mpd.service')
    expect(listServices).toHaveBeenCalledTimes(1)

    listServices.mockClear()
    await wrapper.find('button.stop-service').trigger('click')
    await flushPromises()
    expect(stopService).toHaveBeenCalledWith(9, 'mpd.service')
    expect(listServices).toHaveBeenCalledTimes(1)

    listServices.mockClear()
    await wrapper.find('button.restart-service').trigger('click')
    await flushPromises()
    expect(restartService).toHaveBeenCalledWith(9, 'mpd.service')
    expect(listServices).toHaveBeenCalledTimes(1)

    listServices.mockClear()
    await wrapper.find('button.enable-service').trigger('click')
    await flushPromises()
    expect(enableService).toHaveBeenCalledWith(9, 'mpd.service')
    expect(listServices).toHaveBeenCalledTimes(1)

    listServices.mockClear()
    await wrapper.find('button.disable-service').trigger('click')
    await flushPromises()
    expect(disableService).toHaveBeenCalledWith(9, 'mpd.service')
    expect(listServices).toHaveBeenCalledTimes(1)
  })

  it('fetches services when accessibility changes to true', async () => {
    const wrapper = mount(ServicesList, {
      props: { deviceId: 11, accessible: false, open: true },
      global: { stubs: globalStubs }
    })

    await flushPromises()
    expect(listServices).not.toHaveBeenCalled()

    await wrapper.setProps({ accessible: true })
    await flushPromises()

    expect(listServices).toHaveBeenCalledWith(11)
  })

  it('shows offline message when device is not accessible', async () => {
    const wrapper = mount(ServicesList, {
      props: { deviceId: 13, accessible: false, open: true },
      global: { stubs: globalStubs }
    })

    expect(wrapper.text()).toContain('Список служб доступен, когда устройство находится онлайн')
  })
})
