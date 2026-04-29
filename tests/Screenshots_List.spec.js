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
const deviceRef = ref({ id: 7, name: 'Device 7' })
const deviceLoadingRef = ref(false)
const alertRef = ref(null)

const getAllByDevice = vi.fn(async () => screenshotsRef.value)
const getDeviceById = vi.fn(async (id) => {
  deviceRef.value = { id, name: `Device ${id}` }
  return deviceRef.value
})
const createScreenshot = vi.fn(async () => ({}))
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
    create: createScreenshot,
    open: openScreenshot,
    remove: removeScreenshot
  })
}))

vi.mock('@/stores/devices.store.js', () => ({
  useDevicesStore: () => ({
    __mockRefs: {
      device: deviceRef,
      loading: deviceLoadingRef
    },
    getById: getDeviceById
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
    emits: ['update:items-per-page', 'update:page', 'update:sort-by'],
    template: `
      <div class="table-server-stub">
        <div v-for="item in items" :key="item.id" class="table-row">
          <slot name="item.actions" :item="item"></slot>
          <slot name="item.time_created" :item="item"></slot>
          <slot name="item.originalFilename" :item="item"></slot>
          <slot name="item.fileSizeBytes" :item="item"></slot>
        </div>
        <button data-test="emit-per-page" @click="$emit('update:items-per-page', 25)"></button>
        <button data-test="emit-page" @click="$emit('update:page', 2)"></button>
        <button data-test="emit-sort" @click="$emit('update:sort-by', [{key:'id',order:'desc'}])"></button>
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
    deviceRef.value = { id: 7, name: 'Device 7' }
    deviceLoadingRef.value = false
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

  it('renders device name in the header', async () => {
    const wrapper = mount(ScreenshotsList, {
      props: { deviceId: 7 },
      global: { stubs: globalStubs }
    })

    await flushPromises()

    expect(getDeviceById).toHaveBeenCalledWith(7)
    expect(wrapper.get('h1.primary-heading').text()).toContain('Фотографии устройства Device 7')
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
    await wrapper.find('[data-test="open-photo-button"]').trigger('click')

    expect(openScreenshot).toHaveBeenCalledWith(5)
  })

  it('takes a photo and reloads the list', async () => {
    const wrapper = mount(ScreenshotsList, {
      props: { deviceId: 7 },
      global: { stubs: globalStubs }
    })

    await flushPromises()
    getAllByDevice.mockClear()

    await wrapper.find('[data-test="take-photo-button"]').trigger('click')
    await flushPromises()

    expect(createScreenshot).toHaveBeenCalledWith(7)
    expect(getAllByDevice).toHaveBeenCalledWith(7, { from: null, to: null })
  })

  it('keeps buttons disabled while taking a photo', async () => {
    let resolveCreate
    const pendingCreate = new Promise((resolve) => {
      resolveCreate = resolve
    })
    createScreenshot.mockImplementationOnce(() => {
      screenshotsLoadingRef.value = true
      return pendingCreate
    })

    const wrapper = mount(ScreenshotsList, {
      props: { deviceId: 7 },
      global: { stubs: globalStubs }
    })

    await flushPromises()

    const takePromise = wrapper.find('[data-test="take-photo-button"]').trigger('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[data-test="take-photo-button"]').attributes('disabled')).toBeDefined()
    expect(wrapper.find('[data-test="back-to-device-button"]').attributes('disabled')).toBeDefined()
    expect(wrapper.find('[data-test="apply-screenshots-filter"]').attributes('disabled')).toBeDefined()
    expect(wrapper.find('[data-test="clear-screenshots-filter"]').attributes('disabled')).toBeDefined()
    expect(wrapper.find('[data-test="open-photo-button"]').attributes('disabled')).toBeDefined()
    expect(wrapper.find('[data-test="delete-photo-button"]').attributes('disabled')).toBeDefined()

    screenshotsLoadingRef.value = false
    resolveCreate({})
    await takePromise
    await flushPromises()
  })

  it('shows error alert when taking a photo fails', async () => {
    createScreenshot.mockRejectedValueOnce(new Error('camera failed'))

    const wrapper = mount(ScreenshotsList, {
      props: { deviceId: 7 },
      global: { stubs: globalStubs }
    })

    await flushPromises()
    await wrapper.find('[data-test="take-photo-button"]').trigger('click')
    await flushPromises()

    expect(alertRef.value?.message).toContain('Не удалось сделать фотографию')
    expect(alertRef.value?.message).toContain('camera failed')
  })

  it('deletes screenshot after confirmation', async () => {
    const wrapper = mount(ScreenshotsList, {
      props: { deviceId: 7 },
      global: { stubs: globalStubs }
    })

    await flushPromises()
    await wrapper.find('[data-test="delete-photo-button"]').trigger('click')
    await flushPromises()

    expect(confirmDelete).toHaveBeenCalledWith('shot.jpg', 'фотографию')
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

  it('shows error alert when loading screenshots fails', async () => {
    getAllByDevice.mockRejectedValueOnce(new Error('fetch failed'))

    mount(ScreenshotsList, {
      props: { deviceId: 7 },
      global: { stubs: globalStubs }
    })

    await flushPromises()
    expect(alertRef.value?.message).toContain('Не удалось загрузить фотографии')
  })

  it('shows error alert when opening screenshot fails', async () => {
    openScreenshot.mockRejectedValueOnce(new Error('open failed'))

    const wrapper = mount(ScreenshotsList, {
      props: { deviceId: 7 },
      global: { stubs: globalStubs }
    })

    await flushPromises()
    await wrapper.find('[data-test="open-photo-button"]').trigger('click')
    await flushPromises()

    expect(alertRef.value?.message).toContain('Не удалось открыть фотографию')
  })

  it('does not delete when confirmation is cancelled', async () => {
    confirmDelete.mockResolvedValueOnce(false)

    const wrapper = mount(ScreenshotsList, {
      props: { deviceId: 7 },
      global: { stubs: globalStubs }
    })

    await flushPromises()
    await wrapper.find('[data-test="delete-photo-button"]').trigger('click')
    await flushPromises()

    expect(removeScreenshot).not.toHaveBeenCalled()
  })

  it('shows error alert when deleting screenshot fails', async () => {
    removeScreenshot.mockRejectedValueOnce(new Error('delete failed'))

    const wrapper = mount(ScreenshotsList, {
      props: { deviceId: 7 },
      global: { stubs: globalStubs }
    })

    await flushPromises()
    await wrapper.find('[data-test="delete-photo-button"]').trigger('click')
    await flushPromises()

    expect(alertRef.value?.message).toContain('Не удалось удалить фотографию')
  })

  it('decrements screenshots_page and returns when list becomes empty on page > 1', async () => {
    authStore.screenshots_page = 2

    removeScreenshot.mockImplementationOnce(async () => {
      screenshotsRef.value = []
      return true
    })

    const wrapper = mount(ScreenshotsList, {
      props: { deviceId: 7 },
      global: { stubs: globalStubs }
    })

    await flushPromises()
    await wrapper.find('[data-test="delete-photo-button"]').trigger('click')
    await flushPromises()

    expect(authStore.screenshots_page).toBe(1)
  })

  it('resets screenshots_page to 1 without directly reloading when applyFilters called on page > 1', async () => {
    authStore.screenshots_page = 3

    const wrapper = mount(ScreenshotsList, {
      props: { deviceId: 7 },
      global: { stubs: globalStubs }
    })

    await flushPromises()
    getAllByDevice.mockClear()

    await wrapper.find('[data-test="apply-screenshots-filter"]').trigger('click')
    await flushPromises()

    expect(authStore.screenshots_page).toBe(1)
  })

  it('clears filter inputs and reloads screenshots when clearFilters is clicked', async () => {
    const wrapper = mount(ScreenshotsList, {
      props: { deviceId: 7 },
      global: { stubs: globalStubs }
    })

    await flushPromises()
    await wrapper.find('#screenshots-filter-from').setValue('2026-04-14T10:15')
    await wrapper.find('#screenshots-filter-to').setValue('2026-04-15T11:45')
    getAllByDevice.mockClear()

    await wrapper.find('[data-test="clear-screenshots-filter"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('#screenshots-filter-from').element.value).toBe('')
    expect(wrapper.find('#screenshots-filter-to').element.value).toBe('')
    expect(getAllByDevice).toHaveBeenCalledWith(7, { from: null, to: null })
  })

  it('shows "Нет скриншотов" when list is empty and not loading', async () => {
    screenshotsRef.value = []
    totalCountRef.value = 0

    const wrapper = mount(ScreenshotsList, {
      props: { deviceId: 7 },
      global: { stubs: globalStubs }
    })

    await flushPromises()
    expect(wrapper.text()).toContain('Нет скриншотов')
  })

  it('clears the alert when component is unmounted', async () => {
    const wrapper = mount(ScreenshotsList, {
      props: { deviceId: 7 },
      global: { stubs: globalStubs }
    })

    await flushPromises()
    wrapper.unmount()

    expect(clearAlert).toHaveBeenCalled()
  })

  it('displays alert message when alert store has an error', async () => {
    alertRef.value = { type: 'alert-danger', message: 'Something went wrong' }

    const wrapper = mount(ScreenshotsList, {
      props: { deviceId: 7 },
      global: { stubs: globalStubs }
    })

    await flushPromises()
    expect(wrapper.text()).toContain('Something went wrong')
  })

  it('clears alert when the dismiss button is clicked', async () => {
    alertRef.value = { type: 'alert-danger', message: 'An error' }

    const wrapper = mount(ScreenshotsList, {
      props: { deviceId: 7 },
      global: { stubs: globalStubs }
    })

    await flushPromises()
    await wrapper.find('.btn.close').trigger('click')

    expect(clearAlert).toHaveBeenCalled()
  })

  it('renders em-dash for items without originalFilename', async () => {
    screenshotsRef.value = [{ id: 5, fileSizeBytes: 128, timeCreated: '2026-04-15T10:00:00Z' }]

    const wrapper = mount(ScreenshotsList, {
      props: { deviceId: 7 },
      global: { stubs: globalStubs }
    })

    await flushPromises()
    expect(wrapper.text()).toContain('—')
  })

  it('uses item id in confirmDelete when originalFilename is missing', async () => {
    screenshotsRef.value = [{ id: 9, fileSizeBytes: 0, timeCreated: null }]

    const wrapper = mount(ScreenshotsList, {
      props: { deviceId: 7 },
      global: { stubs: globalStubs }
    })

    await flushPromises()
    await wrapper.find('[data-test="delete-photo-button"]').trigger('click')
    await flushPromises()

    expect(confirmDelete).toHaveBeenCalledWith('фотография #9', 'фотографию')
  })

  it('renders em-dash for formatDate when timeCreated is null', async () => {
    screenshotsRef.value = [{ id: 5, originalFilename: 'f.jpg', fileSizeBytes: 128, timeCreated: null }]

    const wrapper = mount(ScreenshotsList, {
      props: { deviceId: 7 },
      global: { stubs: globalStubs }
    })

    await flushPromises()
    const timeCell = wrapper.find('.table-row')
    expect(timeCell.text()).toContain('—')
  })

  it('renders raw string for formatDate when timeCreated is not a valid date', async () => {
    screenshotsRef.value = [{ id: 5, originalFilename: 'f.jpg', fileSizeBytes: 128, timeCreated: 'not-a-date' }]

    const wrapper = mount(ScreenshotsList, {
      props: { deviceId: 7 },
      global: { stubs: globalStubs }
    })

    await flushPromises()
    expect(wrapper.text()).toContain('not-a-date')
  })

  it('skips loadScreenshots in watch when deviceId becomes falsy', async () => {
    const wrapper = mount(ScreenshotsList, {
      props: { deviceId: 7 },
      global: { stubs: globalStubs }
    })

    await flushPromises()
    getAllByDevice.mockClear()

    await wrapper.setProps({ deviceId: 0 })
    await flushPromises()

    expect(getAllByDevice).not.toHaveBeenCalled()
  })

  it('falls back to raw error object in load error message when err has no message', async () => {
    getAllByDevice.mockRejectedValueOnce('string-error')

    mount(ScreenshotsList, {
      props: { deviceId: 7 },
      global: { stubs: globalStubs }
    })

    await flushPromises()
    expect(alertRef.value?.message).toContain('string-error')
  })

  it('falls back to raw error object in open error message when err has no message', async () => {
    openScreenshot.mockRejectedValueOnce('open-string-error')

    const wrapper = mount(ScreenshotsList, {
      props: { deviceId: 7 },
      global: { stubs: globalStubs }
    })

    await flushPromises()
    await wrapper.find('[data-test="open-photo-button"]').trigger('click')
    await flushPromises()

    expect(alertRef.value?.message).toContain('open-string-error')
  })

  it('falls back to raw error object in delete error message when err has no message', async () => {
    removeScreenshot.mockRejectedValueOnce('delete-string-error')

    const wrapper = mount(ScreenshotsList, {
      props: { deviceId: 7 },
      global: { stubs: globalStubs }
    })

    await flushPromises()
    await wrapper.find('[data-test="delete-photo-button"]').trigger('click')
    await flushPromises()

    expect(alertRef.value?.message).toContain('delete-string-error')
  })

  it('updates screenshots_per_page when data table emits update:items-per-page', async () => {
    const wrapper = mount(ScreenshotsList, {
      props: { deviceId: 7 },
      global: { stubs: globalStubs }
    })

    await flushPromises()
    await wrapper.find('[data-test="emit-per-page"]').trigger('click')
    await flushPromises()

    expect(authStore.screenshots_per_page).toBe(25)
  })

  it('updates screenshots_page when data table emits update:page', async () => {
    const wrapper = mount(ScreenshotsList, {
      props: { deviceId: 7 },
      global: { stubs: globalStubs }
    })

    await flushPromises()
    await wrapper.find('[data-test="emit-page"]').trigger('click')
    await flushPromises()

    expect(authStore.screenshots_page).toBe(2)
  })

  it('updates screenshots_sort_by when data table emits update:sort-by', async () => {
    const wrapper = mount(ScreenshotsList, {
      props: { deviceId: 7 },
      global: { stubs: globalStubs }
    })

    await flushPromises()
    await wrapper.find('[data-test="emit-sort"]').trigger('click')
    await flushPromises()

    expect(authStore.screenshots_sort_by).toEqual([{ key: 'id', order: 'desc' }])
  })
})
