/* @vitest-environment jsdom */
// Copyright (c) 2026 sw.consulting
// This file is a part of Media Pi frontend application

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { reactive, ref } from 'vue'

import ScreenshotsList from '@/components/Screenshots_List.vue'

const authStore = reactive({
  screenshots_page: 1,
  screenshots_per_page: 100,
  screenshots_sort_by: [{ key: 'id', order: 'asc' }]
})

const screenshotsRef = ref([])
const screenshotsLoadingRef = ref(false)
const totalCountRef = ref(0)
const alertRef = ref(null)

const getAllByDevice = vi.fn(async () => screenshotsRef.value)
const openScreenshot = vi.fn(async () => ({}))
const removeScreenshot = vi.fn(async () => true)
const clearAlert = vi.fn()
const pushMock = vi.fn()
const confirmDelete = vi.fn(async () => true)

vi.mock('pinia', async () => {
  const actual = await vi.importActual('pinia')
  return {
    ...actual,
    storeToRefs: (store) => store.__mockRefs || {}
  }
})

vi.mock('@/stores/screenshots.store.js', () => ({
  useScreenshotsStore: () => ({
    __mockRefs: {
      screenshots: screenshotsRef,
      loading: screenshotsLoadingRef,
      totalCount: totalCountRef
    },
    getAllByDevice,
    open: openScreenshot,
    remove: removeScreenshot
  })
}))

vi.mock('@/stores/auth.store.js', () => ({
  useAuthStore: () => authStore
}))

vi.mock('@/stores/alert.store.js', () => ({
  useAlertStore: () => ({
    __mockRefs: {
      alert: alertRef
    },
    error: vi.fn((message) => {
      alertRef.value = { type: 'error', message }
    }),
    clear: clearAlert
  })
}))

vi.mock('@/helpers/confirmation.js', () => ({
  useConfirmation: () => ({
    confirmDelete
  })
}))

vi.mock('@/helpers/media.format.js', () => ({
  formatFileSize: vi.fn((value) => `${value} B`)
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: pushMock
  })
}))

vi.mock('@sw-consulting/tooling.ui.kit', () => ({
  ActionButton: {
    name: 'ActionButton',
    props: ['item', 'icon', 'tooltipText', 'disabled'],
    emits: ['click'],
    template: '<button :data-icon="icon" :disabled="disabled" @click="$emit(\'click\')"><slot /></button>'
  }
}))

const globalStubs = {
  'v-card': { template: '<div><slot /></div>' },
  'v-data-table-server': {
    props: ['items'],
    template: `
      <div class="table-server-stub">
        <div v-for="item in items" :key="item.id" class="table-row">
          <slot name="item.actions" :item="item"></slot>
          <slot name="item.time_created" :item="item"></slot>
          <slot name="item.originalFilename" :item="item"></slot>
          <slot name="item.fileSizeBytes" :item="item"></slot>
        </div>
      </div>
    `
  }
}

describe('Screenshots_List.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authStore.screenshots_page = 1
    authStore.screenshots_per_page = 100
    authStore.screenshots_sort_by = [{ key: 'id', order: 'asc' }]
    screenshotsRef.value = [{ id: 5, originalFilename: 'shot.jpg', fileSizeBytes: 128, timeCreated: '2026-04-15T10:00:00Z' }]
    screenshotsLoadingRef.value = false
    totalCountRef.value = 1
    alertRef.value = null
  })

  it('loads screenshots on mount for the provided device', async () => {
    mount(ScreenshotsList, {
      props: { deviceId: 7 },
      global: { stubs: globalStubs }
    })

    await flushPromises()

    expect(getAllByDevice).toHaveBeenCalledWith(7, { from: null, to: null })
  })

  it('applies date filters', async () => {
    const wrapper = mount(ScreenshotsList, {
      props: { deviceId: 7 },
      global: { stubs: globalStubs }
    })

    await flushPromises()
    getAllByDevice.mockClear()

    await wrapper.find('#screenshots-filter-from').setValue('2026-04-14T10:15')
    await wrapper.find('#screenshots-filter-to').setValue('2026-04-15T11:45')
    await wrapper.find('[data-test="apply-screenshots-filter"]').trigger('click')
    await flushPromises()

    expect(getAllByDevice).toHaveBeenCalledWith(7, {
      from: '2026-04-14T10:15',
      to: '2026-04-15T11:45'
    })
  })

  it('opens screenshot from row action', async () => {
    const wrapper = mount(ScreenshotsList, {
      props: { deviceId: 7 },
      global: { stubs: globalStubs }
    })

    await flushPromises()
    await wrapper.find('[data-test="open-screenshot-button"]').trigger('click')

    expect(openScreenshot).toHaveBeenCalledWith(5)
  })

  it('deletes screenshot after confirmation', async () => {
    const wrapper = mount(ScreenshotsList, {
      props: { deviceId: 7 },
      global: { stubs: globalStubs }
    })

    await flushPromises()
    await wrapper.find('[data-test="delete-screenshot-button"]').trigger('click')
    await flushPromises()

    expect(confirmDelete).toHaveBeenCalledWith('shot.jpg', 'снимок')
    expect(removeScreenshot).toHaveBeenCalledWith(5)
  })

  it('navigates back to device management', async () => {
    const wrapper = mount(ScreenshotsList, {
      props: { deviceId: 7 },
      global: { stubs: globalStubs }
    })

    await flushPromises()
    await wrapper.find('[data-test="back-to-device-button"]').trigger('click')

    expect(pushMock).toHaveBeenCalledWith('/device/manage/7')
  })
})
