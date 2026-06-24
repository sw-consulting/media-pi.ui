import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { reactive, ref, nextTick } from 'vue'
import VideosList from '@/components/Videos_List.vue'

/* global File, AbortSignal */

let currentUser

const authStore = reactive({
  user: null,
  videos_per_page: 10,
  videos_search: '',
  videos_sort_by: [],
  videos_page: 1
})
const makeAuthStore = () => {
  authStore.user = currentUser
  return authStore
}

const accountsStore = {
  accounts: ref([]),
  loading: ref(false),
  error: ref(null),
  getAll: vi.fn(async () => accountsStore.accounts.value),
  getSubscriptions: vi.fn(async () => ({ subscriptions: [], availableCategories: [] }))
}

const categoriesStore = {
  categories: ref([]),
  loading: ref(false),
  error: ref(null),
  getAll: vi.fn(async () => categoriesStore.categories.value)
}

const videosStore = {
  videos: ref([]),
  videoPreview: ref(null),
  loading: ref(false),
  error: ref(null),
  getAllByAccount: vi.fn(async () => videosStore.videos.value),
  open: vi.fn(async (id) => {
    videosStore.videoPreview.value = {
      id,
      filename: `video-${id}.mp4`,
      streamUrl: `http://localhost:8080/api/videos/${id}/file?playbackToken=token-${id}`
    }
    return videosStore.videoPreview.value
  }),
  update: vi.fn(async () => ({})),
  uploadFile: vi.fn(async () => ({})),
  uploadFiles: vi.fn(async () => ({})),
  remove: vi.fn(async () => ({})),
  removeBatch: vi.fn(async () => ({ requestedCount: 0, deletedIds: [], failures: [] })),
  updateCategoryBatch: vi.fn(async () => ({ requestedCount: 0, updatedIds: [], failures: [] }))
}

const alertStore = {
  alert: ref(null),
  success: vi.fn((message) => { alertStore.alert.value = { message, type: 'alert-success' } }),
  error: vi.fn((message) => { alertStore.alert.value = { message } }),
  clear: vi.fn()
}

const confirmation = {
  confirmDelete: vi.fn(async () => true),
  confirmAction: vi.fn(async () => true)
}

const router = vi.hoisted(() => ({
  push: vi.fn()
}))

vi.mock('@/stores/accounts.store.js', () => ({ useAccountsStore: () => accountsStore }))
vi.mock('@/stores/categories.store.js', () => ({ useCategoriesStore: () => categoriesStore }))
vi.mock('@/stores/videos.store.js', () => ({ useVideosStore: () => videosStore }))
vi.mock('@/stores/auth.store.js', () => ({ useAuthStore: () => makeAuthStore() }))
vi.mock('@/stores/alert.store.js', () => ({ useAlertStore: () => alertStore }))
vi.mock('@/helpers/confirmation.js', () => ({ useConfirmation: () => confirmation }))
vi.mock('@/router', () => ({ default: router }))
vi.mock('@sw-consulting/tooling.ui.kit', () => ({
  ActionButton: { name: 'ActionButton', props: ['item', 'icon', 'tooltipText', 'disabled'], emits: ['click'], template: '<button :data-icon="icon" :data-tooltip="tooltipText" :disabled="disabled" @click="$emit(\'click\', item)"><slot /></button>' }
}))
vi.mock('@/helpers/user.helpers.js', () => ({
  isAdministrator: (u) => Array.isArray(u?.roles) && u.roles.includes(1),
  isManager: (u) => Array.isArray(u?.roles) && u.roles.includes(11),
  canManageAccountById: (u, accountId) => !!(Array.isArray(u?.roles) && u.roles.includes(1)) || (Array.isArray(u?.accountIds) && u.accountIds.includes(accountId))
}))

function createDuplicateOriginalFilenameError(message) {
  const error = new Error(message)
  error.status = 409
  error.data = {
    msg: message,
    reason: 'duplicateOriginalFilename'
  }
  return error
}

const globalStubs = {
  VideoViewDialog: {
    name: 'VideoViewDialog',
    props: ['modelValue', 'video', 'title'],
    emits: ['update:modelValue', 'playback-error'],
    template: '<div v-if="modelValue" data-test="video-view-dialog" :data-title="title" :data-src="video && video.streamUrl"><button data-test="trigger-video-playback-error" @click="$emit(\'playback-error\', \'Стриминг этого видеофайла не поддерживается браузером.\')"></button></div>'
  },
  ModalWindow: {
    name: 'ModalWindow',
    props: ['modelValue', 'title'],
    emits: ['update:modelValue', 'confirm', 'cancel'],
    template: '<div v-if="modelValue" v-bind="$attrs" tabindex="0" @keydown.enter="$emit(\'confirm\')" @keydown.esc="$emit(\'cancel\')"><slot /><slot name="actions" /></div>'
  },
  'v-card': { template: '<div><slot /></div>' },
  'v-select': {
    props: ['items', 'modelValue'],
    emits: ['update:modelValue'],
    methods: {
      emitValue(event) {
        const value = event?.target?.value
        const numeric = Number(value)
        this.$emit('update:modelValue', value === 'null' ? null : (Number.isNaN(numeric) ? value : numeric))
      }
    },
    template: '<select @change="emitValue"><option v-for="item in items" :key="item.value" :value="item.value">{{ item.title }}</option></select>'
  },
  'v-data-table': {
    props: ['items', 'modelValue', 'showSelect', 'headers', 'noDataText', 'noResultsText'],
    emits: ['update:modelValue', 'update:itemsPerPage', 'update:page', 'update:sortBy'],
    computed: {
      hasCategoryColumn() {
        return Array.isArray(this.headers) && this.headers.some(header => header.key === 'categoryTitle')
      }
    },
    methods: {
      toggleItem(id, checked) {
        const selected = Array.isArray(this.modelValue) ? [...this.modelValue] : []
        const next = checked
          ? [...new Set([...selected, id])]
          : selected.filter(value => value !== id)
        this.$emit('update:modelValue', next)
      }
    },
    template: `
      <div class="data-table" :data-show-select="showSelect ? 'true' : 'false'" :data-has-category-column="hasCategoryColumn ? 'true' : 'false'">
        <div v-if="!items.length" data-test="table-empty">{{ noDataText }}</div>
        <div v-for="item in items" :key="item.id">
          <input
            v-if="showSelect"
            data-test="video-row-select"
            type="checkbox"
            :checked="Array.isArray(modelValue) && modelValue.includes(item.id)"
            @change="toggleItem(item.id, $event.target.checked)"
          />
          <slot name="item.actions" :item="item" />
          <slot name="item.title" :item="item" />
          <slot v-if="hasCategoryColumn" name="item.categoryTitle" :item="item" />
          <slot name="item.fileSize" :item="item" />
        </div>
        <button data-test="trigger-items-per-page" @click="$emit('update:itemsPerPage', 5)" />
        <button data-test="trigger-page" @click="$emit('update:page', 2)" />
        <button data-test="trigger-sort-by" @click="$emit('update:sortBy', [{key:'title',order:'asc'}])" />
      </div>
    `
  },
  'v-text-field': { props: ['modelValue'], emits: ['update:modelValue'], template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />' },
  'v-progress-linear': {
    props: ['modelValue', 'indeterminate'],
    template: `<div class="progress-linear" :data-model-value="modelValue" :data-indeterminate="indeterminate ? 'true' : 'false'" />`
  },
  'v-progress-circular': {
    props: ['modelValue', 'indeterminate'],
    template: `<div class="progress-circular" :data-model-value="modelValue" :data-indeterminate="indeterminate ? 'true' : 'false'"><slot /></div>`
  },
  'v-btn': {
    props: ['color', 'variant'],
    emits: ['click'],
    template: `<button :data-color="color" :data-variant="variant" @click="$emit('click')"><slot /></button>`
  },
  'v-alert': { template: '<div />' }
}

describe('Videos_List.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    accountsStore.accounts.value = []
    categoriesStore.categories.value = []
    videosStore.videos.value = []
    videosStore.videoPreview.value = null
    currentUser = { roles: [1], accountIds: [] }
    authStore.user = currentUser
    authStore.videos_per_page = 10
    authStore.videos_search = ''
    authStore.videos_sort_by = []
    authStore.videos_page = 1
    accountsStore.getAll.mockImplementation(async () => accountsStore.accounts.value)
    accountsStore.getSubscriptions.mockImplementation(async () => ({ subscriptions: [], availableCategories: [] }))
    categoriesStore.getAll.mockImplementation(async () => categoriesStore.categories.value)
    videosStore.getAllByAccount.mockImplementation(async () => videosStore.videos.value)
    videosStore.open.mockImplementation(async (id) => {
      videosStore.videoPreview.value = {
        id,
        filename: `video-${id}.mp4`,
        streamUrl: `http://localhost:8080/api/videos/${id}/file?playbackToken=token-${id}`
      }
      return videosStore.videoPreview.value
    })
    videosStore.update.mockImplementation(async () => ({}))
    videosStore.uploadFile.mockImplementation(async () => ({}))
    videosStore.uploadFiles.mockImplementation(async () => ({}))
    videosStore.remove.mockImplementation(async () => ({}))
    videosStore.removeBatch.mockImplementation(async () => ({ requestedCount: 0, deletedIds: [], failures: [] }))
    videosStore.updateCategoryBatch.mockImplementation(async () => ({ requestedCount: 0, updatedIds: [], failures: [] }))
    alertStore.success.mockImplementation((message) => { alertStore.alert.value = { message, type: 'alert-success' } })
    alertStore.error.mockImplementation((message) => { alertStore.alert.value = { message } })
    alertStore.clear.mockImplementation(() => {})
    confirmation.confirmDelete.mockImplementation(async () => true)
    confirmation.confirmAction.mockImplementation(async () => true)
    router.push.mockClear()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders as a top-level list by default', async () => {
    const wrapper = mount(VideosList, { global: { stubs: globalStubs } })
    await flushPromises()

    const heading = wrapper.find('[data-test="videos-list-heading"]')

    expect(wrapper.classes()).not.toContain('videos-list-embedded')
    expect(heading.exists()).toBe(true)
    expect(heading.element.tagName).toBe('H1')
    expect(heading.classes()).toContain('primary-heading')
    expect(wrapper.find('[data-test="videos-list-subheading"]').exists()).toBe(false)
    expect(wrapper.find('hr.hr').exists()).toBe(true)
    expect(wrapper.find('.videos-list-subsection-divider').exists()).toBe(false)
  })

  it('renders embedded mode as a subordinate subsection', async () => {
    alertStore.alert.value = { message: 'Video alert', type: 'alert-danger' }

    const wrapper = mount(VideosList, {
      props: {
        title: 'Видеофайлы',
        embedded: true,
        fixedScope: 'category:9'
      },
      global: { stubs: globalStubs }
    })
    await flushPromises()

    const heading = wrapper.find('[data-test="videos-list-subheading"]')

    expect(wrapper.classes()).toContain('videos-list-embedded')
    expect(heading.exists()).toBe(true)
    expect(heading.element.tagName).toBe('H2')
    expect(heading.classes()).toContain('secondary-heading')
    expect(heading.text()).toBe('Видеофайлы')
    expect(wrapper.find('[data-test="videos-list-heading"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="videos-list-subtitle"]').exists()).toBe(false)
    expect(wrapper.find('hr.hr').exists()).toBe(false)
    expect(wrapper.find('.videos-list-subsection-divider').exists()).toBe(true)
    expect(wrapper.find('.videos-list-card-embedded').exists()).toBe(true)
    expect(wrapper.find('.alert-dismissable').exists()).toBe(false)
  })

  it('runs the embedded action hook before editing a video', async () => {
    videosStore.videos.value = [{ id: 3, title: 'Clip', accountId: 0, categoryId: 9 }]
    const beforeEmbeddedAction = vi.fn(async () => false)

    const wrapper = mount(VideosList, {
      props: {
        embedded: true,
        fixedScope: 'category:9',
        beforeEmbeddedAction
      },
      global: { stubs: globalStubs }
    })
    await flushPromises()

    await wrapper.find('[data-test="edit-video-button"]').trigger('click')
    await flushPromises()

    expect(beforeEmbeddedAction).toHaveBeenCalled()
    expect(router.push).not.toHaveBeenCalled()
  })

  it('formats video file size with the shared formatter', async () => {
    videosStore.videos.value = [{
      id: 13,
      title: 'Formatted Clip',
      accountId: 0,
      categoryId: 9,
      fileSizeBytes: 1048576,
      fileSize: '1.00 Мб'
    }]

    const wrapper = mount(VideosList, {
      props: {
        embedded: true,
        fixedScope: 'category:9'
      },
      global: { stubs: globalStubs }
    })
    await flushPromises()

    expect(wrapper.text()).toContain('1.0 МБ')
    expect(wrapper.text()).not.toContain('1.00 Мб')
  })

  it('runs the embedded action hook before deleting a video', async () => {
    videosStore.videos.value = [{ id: 4, title: 'Clip', accountId: 0, categoryId: 9 }]
    const beforeEmbeddedAction = vi.fn(async () => false)

    const wrapper = mount(VideosList, {
      props: {
        embedded: true,
        fixedScope: 'category:9',
        beforeEmbeddedAction
      },
      global: { stubs: globalStubs }
    })
    await flushPromises()

    await wrapper.find('[data-test="delete-video-button"]').trigger('click')
    await flushPromises()

    expect(beforeEmbeddedAction).toHaveBeenCalled()
    expect(confirmation.confirmDelete).not.toHaveBeenCalled()
    expect(videosStore.remove).not.toHaveBeenCalled()
  })

  it('runs the embedded action hook before opening the upload picker', async () => {
    const beforeEmbeddedAction = vi.fn(async () => false)

    const wrapper = mount(VideosList, {
      props: {
        embedded: true,
        fixedScope: 'category:9',
        beforeEmbeddedAction
      },
      global: { stubs: globalStubs }
    })
    await flushPromises()

    const fileInput = wrapper.find('input[type="file"]').element
    fileInput.click = vi.fn()

    await wrapper.find('[data-test="upload-video-button"]').trigger('click')
    await flushPromises()

    expect(beforeEmbeddedAction).toHaveBeenCalled()
    expect(fileInput.click).not.toHaveBeenCalled()
  })

  it('resolves a pending fixed scope before opening the upload picker', async () => {
    let wrapper
    let resolveRefresh
    videosStore.videos.value = [{ id: 99, title: 'Stale common video', accountId: 0, categoryId: 0 }]
    videosStore.getAllByAccount.mockImplementationOnce(() => new Promise(resolve => {
      resolveRefresh = resolve
    }))
    const beforeEmbeddedAction = vi.fn(async () => {
      await wrapper.setProps({
        fixedScope: 'category:44',
        pendingFixedScope: false
      })
      return true
    })

    wrapper = mount(VideosList, {
      props: {
        embedded: true,
        pendingFixedScope: true,
        beforeEmbeddedAction
      },
      global: { stubs: globalStubs }
    })
    await flushPromises()

    expect(accountsStore.getAll).not.toHaveBeenCalled()
    expect(videosStore.getAllByAccount).not.toHaveBeenCalled()
    expect(wrapper.find('select').exists()).toBe(false)
    expect(wrapper.find('[data-test="table-empty"]').exists()).toBe(true)
    expect(wrapper.text()).not.toContain('Stale common video')
    expect(wrapper.find('[data-test="upload-video-button"]').element.disabled).toBe(false)

    const fileInput = wrapper.find('input[type="file"]')
    const clickSpy = vi.spyOn(fileInput.element, 'click').mockImplementation(() => {})

    await wrapper.find('[data-test="upload-video-button"]').trigger('click')
    await flushPromises()

    expect(beforeEmbeddedAction).toHaveBeenCalled()
    expect(videosStore.getAllByAccount).toHaveBeenCalledWith(0, { categoryId: 44 })
    expect(wrapper.find('[data-test="table-empty"]').exists()).toBe(true)
    expect(wrapper.text()).not.toContain('Stale common video')
    expect(clickSpy).toHaveBeenCalled()

    videosStore.videos.value = [{ id: 100, title: 'Fresh category video', accountId: 0, categoryId: 44 }]
    resolveRefresh(videosStore.videos.value)
    await flushPromises()

    expect(wrapper.text()).toContain('Fresh category video')
  })

  it('ignores a late fixed-scope refresh after the fixed scope changes', async () => {
    const pendingCategoryRefreshes = []
    const pendingCommonRefreshes = []
    videosStore.getAllByAccount.mockImplementation((accountId, options) => new Promise(resolve => {
      if (options?.categoryId === 44) {
        pendingCategoryRefreshes.push(resolve)
        return
      }
      pendingCommonRefreshes.push(resolve)
    }))

    const wrapper = mount(VideosList, {
      props: { fixedScope: 'category:44' },
      global: { stubs: globalStubs }
    })
    await flushPromises()

    expect(videosStore.getAllByAccount).toHaveBeenCalledWith(0, { categoryId: 44 })
    expect(wrapper.find('[data-test="table-empty"]').exists()).toBe(true)

    await wrapper.setProps({ fixedScope: 'common:all' })
    await flushPromises()

    expect(videosStore.getAllByAccount).toHaveBeenCalledWith(0, {})

    videosStore.videos.value = [{ id: 201, title: 'Late category video', accountId: 0, categoryId: 44 }]
    pendingCategoryRefreshes.forEach(resolve => resolve(videosStore.videos.value))
    await flushPromises()

    expect(wrapper.vm.loadedFixedScope).toBeNull()
    expect(wrapper.find('[data-test="table-empty"]').exists()).toBe(true)
    expect(wrapper.text()).not.toContain('Late category video')

    videosStore.videos.value = [{ id: 202, title: 'Latest common video', accountId: 0, categoryId: 0 }]
    pendingCommonRefreshes.forEach(resolve => resolve(videosStore.videos.value))
    await flushPromises()

    expect(wrapper.vm.loadedFixedScope).toBe('common:all')
    expect(wrapper.text()).toContain('Latest common video')
  })

  it('clears loadedFixedScope when selectedScope becomes null for a fixed scope', async () => {
    const wrapper = mount(VideosList, {
      props: { fixedScope: 'common:all' },
      global: { stubs: globalStubs }
    })
    await flushPromises()

    wrapper.vm.loadedFixedScope = 'common:all'
    wrapper.vm.selectedScope = null

    await expect(wrapper.vm.refreshVideos()).resolves.toBe(true)
    expect(wrapper.vm.loadedFixedScope).toBeNull()
  })

  it('runs the embedded action hook before opening batch category dialog', async () => {
    videosStore.videos.value = [{ id: 5, title: 'Clip', accountId: 0, categoryId: 9 }]
    const beforeEmbeddedAction = vi.fn(async () => false)

    const wrapper = mount(VideosList, {
      props: {
        embedded: true,
        fixedScope: 'category:9',
        beforeEmbeddedAction
      },
      global: { stubs: globalStubs }
    })
    await flushPromises()

    wrapper.vm.selectedVideoIds = [5]
    await nextTick()

    await wrapper.find('[data-test="batch-category-video-button"]').trigger('click')
    await flushPromises()

    expect(beforeEmbeddedAction).toHaveBeenCalled()
    expect(wrapper.vm.batchCategoryDialog).toBe(false)
  })

  it('runs the embedded action hook before batch deleting videos', async () => {
    videosStore.videos.value = [{ id: 6, title: 'Clip', accountId: 0, categoryId: 9 }]
    const beforeEmbeddedAction = vi.fn(async () => false)

    const wrapper = mount(VideosList, {
      props: {
        embedded: true,
        fixedScope: 'category:9',
        beforeEmbeddedAction
      },
      global: { stubs: globalStubs }
    })
    await flushPromises()

    wrapper.vm.selectedVideoIds = [6]
    await nextTick()

    await wrapper.find('[data-test="batch-delete-video-button"]').trigger('click')
    await flushPromises()

    expect(beforeEmbeddedAction).toHaveBeenCalled()
    expect(confirmation.confirmAction).not.toHaveBeenCalled()
    expect(videosStore.removeBatch).not.toHaveBeenCalled()
  })

  it('loads videos for default and changed account selection', async () => {
    accountsStore.accounts.value = [{ id: 5, name: 'Five' }]
    videosStore.videos.value = [{ id: 1, title: 'Account video', accountId: 5, categoryId: 0 }]
    const wrapper = mount(VideosList, { global: { stubs: globalStubs } })

    await flushPromises()
    expect(accountsStore.getAll).toHaveBeenCalled()
    expect(videosStore.getAllByAccount).toHaveBeenCalledWith(5, {})
    expect(wrapper.vm.showCategoryColumn).toBe(false)
    expect(wrapper.find('.data-table').attributes('data-has-category-column')).toBe('false')

    wrapper.vm.selectedScope = 'common:all'
    await nextTick()
    await flushPromises()
    expect(videosStore.getAllByAccount).toHaveBeenCalledWith(0, {})
    expect(wrapper.vm.showCategoryColumn).toBe(true)
    expect(wrapper.find('.data-table').attributes('data-has-category-column')).toBe('true')
  })

  it('loads and uploads using selected category scope', async () => {
    categoriesStore.categories.value = [{ id: 4, title: 'News' }]
    videosStore.videos.value = [{ id: 2, title: 'Category video', accountId: 0, categoryId: 4 }]
    const wrapper = mount(VideosList, { global: { stubs: globalStubs } })
    await flushPromises()

    wrapper.vm.selectedScope = 'category:4'
    await nextTick()
    await flushPromises()

    expect(videosStore.getAllByAccount).toHaveBeenCalledWith(0, { categoryId: 4 })
    expect(wrapper.vm.showCategoryColumn).toBe(true)
    expect(wrapper.find('.data-table').attributes('data-has-category-column')).toBe('true')

    const file = new File(['x'], 'test.mp4', { type: 'video/mp4' })
    await wrapper.vm.uploadVideos([file])

    expect(videosStore.uploadFiles).toHaveBeenCalledWith(
      [file],
      0,
      {
        categoryId: 4,
        onUploadProgress: expect.any(Function),
        signal: expect.any(AbortSignal)
      }
    )
  })

  it('filters category scopes for non-admin users but keeps common files without category', async () => {
    currentUser = { roles: [11], accountIds: [2] }
    authStore.user = currentUser
    accountsStore.accounts.value = [{ id: 2, name: 'Managed' }]
    categoriesStore.categories.value = [
      { id: 4, title: 'Free', free: true },
      { id: 5, title: 'Subscribed', free: false },
      { id: 6, title: 'Hidden', free: false }
    ]
    accountsStore.getSubscriptions.mockResolvedValue({
      subscriptions: [{ categoryId: 5, categoryTitle: 'Subscribed', categoryFree: false }],
      availableCategories: []
    })

    const wrapper = mount(VideosList, { global: { stubs: globalStubs } })
    await flushPromises()

    const optionTexts = wrapper.findAll('select').at(0).findAll('option').map(option => option.text())

    expect(accountsStore.getSubscriptions).toHaveBeenCalledWith(2)
    expect(optionTexts).toEqual([
      'Managed',
      'Общие видеофайлы',
      '↳ Без категории',
      '↳ Free',
      '↳ Subscribed'
    ])
    expect(optionTexts).not.toContain('↳ Hidden')
  })

  it('filters common videos at file level for non-admin users', async () => {
    currentUser = { roles: [11], accountIds: [2] }
    authStore.user = currentUser
    accountsStore.accounts.value = [{ id: 2, name: 'Managed' }]
    categoriesStore.categories.value = [
      { id: 4, title: 'Free', free: true },
      { id: 5, title: 'Subscribed', free: false },
      { id: 6, title: 'Hidden', free: false }
    ]
    accountsStore.getSubscriptions.mockResolvedValue({
      subscriptions: [{ categoryId: 5, categoryTitle: 'Subscribed', categoryFree: false }],
      availableCategories: []
    })
    videosStore.getAllByAccount.mockImplementation(async (accountId, options = {}) => {
      const items = accountId === 0 && options.availableForAccountId === 2
        ? [
            { id: 10, title: 'No category', accountId: 0, categoryId: 0 },
            { id: 11, title: 'Free category', accountId: 0, categoryId: 4 },
            { id: 12, title: 'Subscribed category', accountId: 0, categoryId: 5 },
            { id: 13, title: 'Hidden category', accountId: 0, categoryId: 6 }
          ]
        : []
      videosStore.videos.value = items
      return items
    })

    const wrapper = mount(VideosList, { global: { stubs: globalStubs } })
    await flushPromises()

    wrapper.vm.selectedScope = 'common:all'
    await nextTick()
    await flushPromises()

    expect(videosStore.getAllByAccount).toHaveBeenCalledWith(0, { availableForAccountId: 2 })
    expect(wrapper.text()).toContain('No category')
    expect(wrapper.text()).toContain('Free category')
    expect(wrapper.text()).toContain('Subscribed category')
    expect(wrapper.text()).not.toContain('Hidden category')
  })

  it('shows dash for account-linked video category labels', async () => {
    videosStore.videos.value = [{ id: 3, title: 'Account video', accountId: 5, categoryId: 0 }]
    const wrapper = mount(VideosList, {
      props: { fixedScope: 'common:all' },
      global: { stubs: globalStubs }
    })
    await flushPromises()

    expect(wrapper.find('[data-test="video-category-label"]').text()).toBe('-')
  })

  it('navigates to edit view for per-video changes', async () => {
    videosStore.videos.value = [{ id: 30, title: 'Common', accountId: 0, categoryId: 0 }]
    const wrapper = mount(VideosList, { global: { stubs: globalStubs } })
    await flushPromises()

    await wrapper.find('[data-test="edit-video-button"]').trigger('click')

    expect(router.push).toHaveBeenCalledWith('/video/edit/30')
  })

  it('batch updates selected video category', async () => {
    videosStore.videos.value = [
      { id: 31, title: 'First', accountId: 0, categoryId: 0 },
      { id: 32, title: 'Second', accountId: 0, categoryId: 0 }
    ]
    videosStore.updateCategoryBatch = vi.fn(async () => ({ requestedCount: 2, updatedIds: [31, 32], failures: [] }))
    const wrapper = mount(VideosList, { global: { stubs: globalStubs } })
    await flushPromises()

    wrapper.vm.selectedVideoIds = [31, 32]
    wrapper.vm.batchCategoryId = 4
    await wrapper.vm.updateSelectedVideoCategory()

    expect(videosStore.updateCategoryBatch).toHaveBeenCalledWith([31, 32], 4)
    expect(alertStore.success).toHaveBeenCalledWith('Обновлено видеофайлов: 2')
  })

  it('lists affected playlists before retrying batch category update with force cleanup', async () => {
    videosStore.videos.value = [{ id: 31, title: 'First', accountId: 0, categoryId: 0 }]
    videosStore.updateCategoryBatch = vi.fn()
      .mockRejectedValueOnce({
        status: 409,
        data: {
          affectedPlaylistCount: 1,
          affectedItemCount: 2,
          affectedVideoCount: 1,
          affectedPlaylists: [
            {
              playlistId: 11,
              title: 'Morning',
              filename: 'morning.m3u',
              accountId: 1,
              accountName: 'Cafe',
              removedItemCount: 2
            }
          ]
        }
      })
      .mockResolvedValueOnce({ requestedCount: 1, updatedIds: [31], failures: [] })
    const wrapper = mount(VideosList, { global: { stubs: globalStubs } })
    await flushPromises()

    wrapper.vm.selectedVideoIds = [31]
    wrapper.vm.batchCategoryId = 4
    await wrapper.vm.updateSelectedVideoCategory()
    await flushPromises()

    expect(videosStore.updateCategoryBatch).toHaveBeenCalledWith([31], 4)
    expect(wrapper.find('[data-test="playlist-impact-list"]').text()).toContain('Cafe / Morning')
    expect(wrapper.find('[data-test="playlist-impact-list"]').text()).toContain('morning.m3u')

    await wrapper.find('[data-test="confirm-playlist-impact-button"]').trigger('click')
    await flushPromises()

    expect(videosStore.updateCategoryBatch).toHaveBeenLastCalledWith([31], 4, {
      forcePlaylistCleanup: true
    })
  })

  it('opens category batch modal from the header action', async () => {
    videosStore.videos.value = [{ id: 33, title: 'First', accountId: 0, categoryId: 0 }]
    const wrapper = mount(VideosList, { global: { stubs: globalStubs } })
    await flushPromises()

    wrapper.vm.selectedVideoIds = [33]
    await nextTick()
    await wrapper.find('[data-test="batch-category-video-button"]').trigger('click')

    expect(wrapper.vm.batchCategoryDialog).toBe(true)
    expect(wrapper.find('[data-test="batch-category-dialog"]').exists()).toBe(true)
  })

  it('applies batch category update with Enter in category dialog', async () => {
    videosStore.videos.value = [{ id: 34, title: 'First', accountId: 0, categoryId: 0 }]
    const wrapper = mount(VideosList, { global: { stubs: globalStubs } })
    await flushPromises()

    wrapper.vm.selectedVideoIds = [34]
    wrapper.vm.batchCategoryId = 3
    wrapper.vm.batchCategoryDialog = true
    await nextTick()

    await wrapper.find('[data-test="batch-category-dialog"]').trigger('keydown', { key: 'Enter' })
    await flushPromises()

    expect(videosStore.updateCategoryBatch).toHaveBeenCalledWith([34], 3)
  })

  it('closes batch category dialog with Escape', async () => {
    videosStore.videos.value = [{ id: 35, title: 'First', accountId: 0, categoryId: 0 }]
    const wrapper = mount(VideosList, { global: { stubs: globalStubs } })
    await flushPromises()

    wrapper.vm.selectedVideoIds = [35]
    wrapper.vm.batchCategoryDialog = true
    await nextTick()

    await wrapper.find('[data-test="batch-category-dialog"]').trigger('keydown', { key: 'Escape' })
    await nextTick()

    expect(wrapper.vm.batchCategoryDialog).toBe(false)
  })

  it('blocks upload when user lacks permissions', async () => {
    currentUser = { roles: [], accountIds: [] }
    const wrapper = mount(VideosList, { global: { stubs: globalStubs } })
    await flushPromises()
    const file = new File(['x'], 'test.mp4', { type: 'video/mp4' })
    await wrapper.vm.uploadVideos([file])
    expect(videosStore.uploadFiles).not.toHaveBeenCalled()
  })

  it('uploads file when user has permissions', async () => {
    currentUser = { roles: [1], accountIds: [] }
    const wrapper = mount(VideosList, { global: { stubs: globalStubs } })
    await flushPromises()
    const file = new File(['x'], 'test.mp4', { type: 'video/mp4' })
    await wrapper.vm.uploadVideos([file])
    expect(videosStore.uploadFiles).toHaveBeenCalledWith(
      [file],
      0,
      {
        onUploadProgress: expect.any(Function),
        signal: expect.any(AbortSignal)
      }
    )
  })

  it('uploads multiple selected files when user has permissions', async () => {
    currentUser = { roles: [1], accountIds: [] }
    const wrapper = mount(VideosList, { global: { stubs: globalStubs } })
    await flushPromises()
    const file1 = new File(['x'], 'first.mp4', { type: 'video/mp4' })
    const file2 = new File(['y'], 'second.mp4', { type: 'video/mp4' })

    await wrapper.vm.onFileChange({ target: { files: [file1, file2] } })

    expect(videosStore.uploadFiles).toHaveBeenCalledWith(
      [file1, file2],
      0,
      {
        onUploadProgress: expect.any(Function),
        signal: expect.any(AbortSignal)
      }
    )
  })

  it('shows total upload progress and disables actions while upload is pending', async () => {
    videosStore.videos.value = [{ id: 1, title: 'Clip', accountId: 0 }]
    let resolveUpload
    let onUploadProgress
    videosStore.uploadFiles.mockImplementation((_files, _accountId, options) => {
      onUploadProgress = options.onUploadProgress
      return new Promise(resolve => {
        resolveUpload = resolve
      })
    })

    const wrapper = mount(VideosList, { global: { stubs: globalStubs } })
    await flushPromises()
    const callsBeforeUpload = videosStore.getAllByAccount.mock.calls.length

    const file = new File(['x'], 'test.mp4', { type: 'video/mp4' })
    const uploadPromise = wrapper.vm.uploadVideos([file])
    await nextTick()

    expect(wrapper.find('[data-test="upload-progress"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="upload-progress-label"]').text()).toBe('Загрузка видеофайлов')
    expect(wrapper.find('[data-test="upload-progress-text"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="upload-video-button"]').element.disabled).toBe(true)
    expect(wrapper.find('[data-test="batch-delete-video-button"]').element.disabled).toBe(true)
    expect(wrapper.find('select').element.disabled).toBe(true)
    expect(wrapper.find('[data-test="edit-video-button"]').element.disabled).toBe(true)
    expect(wrapper.find('[data-test="delete-video-button"]').element.disabled).toBe(true)
    expect(wrapper.find('[data-test="cancel-upload-button"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="cancel-upload-button"]').attributes('data-color')).toBe('orange-darken-3')
    expect(wrapper.find('[data-test="cancel-upload-button"]').attributes('data-variant')).toBe('text')

    onUploadProgress({ lengthComputable: false, loaded: 10, total: null, percentage: null })
    await nextTick()

    let progressSpinner = wrapper.find('[data-test="upload-progress-spinner"]')
    expect(wrapper.find('[data-test="upload-progress-label"]').text()).toBe('Загрузка видеофайлов')
    expect(wrapper.find('[data-test="upload-progress-text"]').exists()).toBe(false)
    expect(progressSpinner.attributes('data-indeterminate')).toBe('true')

    onUploadProgress({ lengthComputable: true, loaded: 42, total: 100, percentage: 42 })
    await nextTick()

    progressSpinner = wrapper.find('[data-test="upload-progress-spinner"]')
    expect(wrapper.find('[data-test="upload-progress-label"]').text()).toBe('Загрузка видеофайлов')
    expect(wrapper.find('[data-test="upload-progress-text"]').exists()).toBe(false)
    expect(progressSpinner.text()).toBe('42%')
    expect(progressSpinner.attributes('data-model-value')).toBe('42')
    expect(progressSpinner.attributes('data-indeterminate')).toBe('false')

    onUploadProgress({ lengthComputable: true, loaded: 100, total: 100, percentage: 100 })
    await nextTick()

    progressSpinner = wrapper.find('[data-test="upload-progress-spinner"]')
    expect(wrapper.find('[data-test="upload-progress-label"]').text()).toBe('Обработка видеофайлов')
    expect(wrapper.find('[data-test="upload-progress-text"]').text()).toBe('Файлы загружены. Идёт обработка на сервере...')
    expect(wrapper.find('[data-test="cancel-upload-button"]').exists()).toBe(false)
    expect(progressSpinner.text()).toBe('')
    expect(progressSpinner.attributes('data-indeterminate')).toBe('true')

    resolveUpload({})
    await uploadPromise
    await flushPromises()

    expect(wrapper.find('[data-test="upload-progress"]').exists()).toBe(false)
    expect(videosStore.getAllByAccount.mock.calls.length).toBe(callsBeforeUpload + 1)
  })

  it('shows duplicate upload conflict and closes upload progress', async () => {
    const duplicateMessage = 'В выбранном разделе уже есть видеофайл с именем "test.mp4"'
    videosStore.uploadFiles.mockRejectedValueOnce(createDuplicateOriginalFilenameError(duplicateMessage))
    const wrapper = mount(VideosList, { global: { stubs: globalStubs } })
    await flushPromises()

    const file = new File(['x'], 'test.mp4', { type: 'video/mp4' })
    const uploadPromise = wrapper.vm.uploadVideos([file])
    await nextTick()

    expect(wrapper.find('[data-test="upload-progress"]').exists()).toBe(true)

    await uploadPromise
    await flushPromises()

    expect(alertStore.error).toHaveBeenCalledWith(duplicateMessage)
    expect(alertStore.error).not.toHaveBeenCalledWith(expect.stringContaining('Не удалось загрузить видеофайлы'))
    expect(wrapper.find('[data-test="upload-progress"]').exists()).toBe(false)
  })

  it('shows a refresh phase after upload completes while the list reloads', async () => {
    let refreshCall = 0
    let resolveRefresh
    videosStore.getAllByAccount.mockImplementation(() => {
      refreshCall += 1
      if (refreshCall === 1) return Promise.resolve(videosStore.videos.value)
      return new Promise(resolve => {
        resolveRefresh = () => resolve(videosStore.videos.value)
      })
    })
    videosStore.uploadFiles.mockResolvedValue({})

    const wrapper = mount(VideosList, { global: { stubs: globalStubs } })
    await flushPromises()

    const uploadPromise = wrapper.vm.uploadVideos([new File(['x'], 'test.mp4', { type: 'video/mp4' })])
    await flushPromises()

    expect(wrapper.find('[data-test="upload-progress"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="upload-progress-label"]').text()).toBe('Обновление списка видеофайлов')
    expect(wrapper.find('[data-test="upload-progress-text"]').text()).toBe('Получаем обновлённую информацию...')
    expect(wrapper.find('[data-test="upload-progress-spinner"]').attributes('data-indeterminate')).toBe('true')
    expect(wrapper.find('[data-test="cancel-upload-button"]').exists()).toBe(false)

    resolveRefresh()
    await uploadPromise
    await flushPromises()

    expect(wrapper.find('[data-test="upload-progress"]').exists()).toBe(false)
  })

  it('cancels an in-progress upload without refreshing or showing an error', async () => {
    let rejectUpload
    let uploadSignal
    videosStore.uploadFiles.mockImplementation((_files, _accountId, options) => {
      uploadSignal = options.signal
      return new Promise((_resolve, reject) => {
        rejectUpload = reject
        options.signal.addEventListener('abort', () => {
          const error = new Error('Загрузка отменена')
          error.name = 'AbortError'
          reject(error)
        })
      })
    })

    const wrapper = mount(VideosList, { global: { stubs: globalStubs } })
    await flushPromises()
    const callsBeforeUpload = videosStore.getAllByAccount.mock.calls.length

    const file = new File(['x'], 'test.mp4', { type: 'video/mp4' })
    const uploadPromise = wrapper.vm.uploadVideos([file])
    await nextTick()

    await wrapper.find('[data-test="cancel-upload-button"]').trigger('click')
    await uploadPromise
    await flushPromises()

    expect(uploadSignal.aborted).toBe(true)
    expect(rejectUpload).toEqual(expect.any(Function))
    expect(wrapper.find('[data-test="upload-progress"]').exists()).toBe(false)
    expect(alertStore.error).not.toHaveBeenCalled()
    expect(videosStore.getAllByAccount.mock.calls.length).toBe(callsBeforeUpload)
  })

  it('cancels an in-progress upload with Escape', async () => {
    let uploadSignal
    videosStore.uploadFiles.mockImplementation((_files, _accountId, options) => {
      uploadSignal = options.signal
      return new Promise((_resolve, reject) => {
        options.signal.addEventListener('abort', () => {
          const error = new Error('Загрузка отменена')
          error.name = 'AbortError'
          reject(error)
        })
      })
    })

    const wrapper = mount(VideosList, { global: { stubs: globalStubs } })
    await flushPromises()

    const file = new File(['x'], 'test.mp4', { type: 'video/mp4' })
    const uploadPromise = wrapper.vm.uploadVideos([file])
    await nextTick()

    await wrapper.find('[data-test="upload-progress"]').trigger('keydown', { key: 'Escape' })
    await uploadPromise
    await flushPromises()

    expect(uploadSignal.aborted).toBe(true)
    expect(wrapper.find('[data-test="upload-progress"]').exists()).toBe(false)
    expect(alertStore.error).not.toHaveBeenCalled()
  })

  it('allows selecting multiple files in the hidden file input', async () => {
    const wrapper = mount(VideosList, { global: { stubs: globalStubs } })
    await flushPromises()
    expect(wrapper.find('input[type="file"]').attributes('multiple')).toBeDefined()
  })

  it('deletes video after confirmation for administrator', async () => {
    videosStore.videos.value = [{ id: 9, title: 'Clip', accountId: null }]
    const wrapper = mount(VideosList, { global: { stubs: globalStubs } })
    await flushPromises()
    await wrapper.vm.deleteVideo(videosStore.videos.value[0])
    expect(videosStore.remove).toHaveBeenCalledWith(9)
  })

  it('enables table selection for a manageable current list', async () => {
    currentUser = { roles: [], accountIds: [42] }
    accountsStore.accounts.value = [{ id: 42, name: 'Account 42' }]
    videosStore.videos.value = [
      { id: 12, title: 'First', accountId: 42 },
      { id: 13, title: 'Second', accountId: 42 }
    ]

    const wrapper = mount(VideosList, { global: { stubs: globalStubs } })
    await flushPromises()

    expect(wrapper.find('.data-table').attributes('data-show-select')).toBe('true')
    expect(wrapper.find('[data-test="batch-delete-video-button"]').element.disabled).toBe(true)

    await wrapper.find('[data-test="video-row-select"]').setValue(true)
    await nextTick()

    expect(wrapper.vm.selectedVideoIds).toEqual([12])
    expect(wrapper.find('[data-test="batch-delete-video-button"]').element.disabled).toBe(false)
  })

  it('keeps batch category update disabled when an account scope is selected', async () => {
    currentUser = { roles: [], accountIds: [42] }
    accountsStore.accounts.value = [{ id: 42, name: 'Account 42' }]
    videosStore.videos.value = [{ id: 12, title: 'First', accountId: 42 }]

    const wrapper = mount(VideosList, { global: { stubs: globalStubs } })
    await flushPromises()

    await wrapper.find('[data-test="video-row-select"]').setValue(true)
    await nextTick()

    expect(wrapper.vm.selectedScope).toBe('account:42')
    expect(wrapper.find('[data-test="batch-delete-video-button"]').element.disabled).toBe(false)
    expect(wrapper.find('[data-test="batch-category-video-button"]').element.disabled).toBe(true)
  })

  it('disables table selection for a non-manageable current list', async () => {
    currentUser = { roles: [], accountIds: [42] }
    videosStore.videos.value = [{ id: 14, title: 'Common', accountId: 0 }]

    const wrapper = mount(VideosList, { global: { stubs: globalStubs } })
    await flushPromises()

    expect(wrapper.find('.data-table').attributes('data-show-select')).toBe('false')
    expect(wrapper.find('[data-test="video-row-select"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="batch-delete-video-button"]').element.disabled).toBe(true)
  })

  it('deletes selected videos after confirmation', async () => {
    videosStore.videos.value = [
      { id: 15, title: 'First', accountId: 0 },
      { id: 16, title: 'Second', accountId: 0 }
    ]
    videosStore.removeBatch.mockResolvedValueOnce({ requestedCount: 2, deletedIds: [15, 16], failures: [] })

    const wrapper = mount(VideosList, { global: { stubs: globalStubs } })
    await flushPromises()
    wrapper.vm.selectedVideoIds = [15, 16]
    await wrapper.vm.deleteSelectedVideos()
    await flushPromises()

    expect(confirmation.confirmAction).toHaveBeenCalledWith('Удалить выбранные видеофайлы (2)?', expect.objectContaining({
      confirmationText: 'Удалить'
    }))
    expect(videosStore.removeBatch).toHaveBeenCalledWith([15, 16])
    expect(wrapper.vm.selectedVideoIds).toEqual([])
    expect(alertStore.success).toHaveBeenCalledWith('Удалено видеофайлов: 2')
  })

  it('does not batch delete when confirmation is cancelled', async () => {
    videosStore.videos.value = [{ id: 17, title: 'First', accountId: 0 }]
    confirmation.confirmAction.mockResolvedValueOnce(false)

    const wrapper = mount(VideosList, { global: { stubs: globalStubs } })
    await flushPromises()
    wrapper.vm.selectedVideoIds = [17]
    await wrapper.vm.deleteSelectedVideos()

    expect(videosStore.removeBatch).not.toHaveBeenCalled()
  })

  it('shows a concise summary for partial batch delete results', async () => {
    videosStore.videos.value = [
      { id: 18, title: 'First', accountId: 0 },
      { id: 19, title: 'Second', accountId: 0 }
    ]
    videosStore.removeBatch.mockResolvedValueOnce({
      requestedCount: 2,
      deletedIds: [18],
      failures: [{ id: 19, reason: 'notFound', message: 'Видеофайл с ID 19 не найден' }]
    })

    const wrapper = mount(VideosList, { global: { stubs: globalStubs } })
    await flushPromises()
    wrapper.vm.selectedVideoIds = [18, 19]
    await wrapper.vm.deleteSelectedVideos()
    await flushPromises()

    expect(alertStore.error).toHaveBeenCalledWith(expect.stringContaining('Удалено видеофайлов: 1. Не удалось удалить: 1.'))
    expect(alertStore.error).toHaveBeenCalledWith(expect.stringContaining('Видеофайл с ID 19 не найден'))
  })

  it('does not hide batch delete refresh failures with a delete summary', async () => {
    videosStore.videos.value = [
      { id: 20, title: 'First', accountId: 0 },
      { id: 21, title: 'Second', accountId: 0 }
    ]
    videosStore.removeBatch.mockResolvedValueOnce({ requestedCount: 2, deletedIds: [20, 21], failures: [] })

    const wrapper = mount(VideosList, { global: { stubs: globalStubs } })
    await flushPromises()
    alertStore.success.mockClear()
    alertStore.error.mockClear()
    videosStore.getAllByAccount.mockRejectedValueOnce(new Error('refresh failed'))

    wrapper.vm.selectedVideoIds = [20, 21]
    await wrapper.vm.deleteSelectedVideos()
    await flushPromises()

    expect(videosStore.removeBatch).toHaveBeenCalledWith([20, 21])
    expect(alertStore.error).toHaveBeenCalledWith('Не удалось загрузить информацию о видеофайлах: refresh failed')
    expect(alertStore.success).not.toHaveBeenCalled()
    expect(alertStore.error).not.toHaveBeenCalledWith('Удалено видеофайлов: 2')
  })

  it('disables edit navigation when user lacks permissions', async () => {
    currentUser = { roles: [], accountIds: [99] }
    videosStore.videos.value = [{ id: 8, title: 'Video', accountId: 42 }]
    
    const wrapper = mount(VideosList, { global: { stubs: globalStubs } })
    await flushPromises()

    // Edit button should be disabled for videos user cannot manage
    const editButton = wrapper.find('[data-test="edit-video-button"]')
    expect(editButton.exists()).toBe(true)
    expect(editButton.element.disabled).toBe(true)
  })

  it('allows edit navigation when user is administrator', async () => {
    currentUser = { roles: [1], accountIds: [] }
    videosStore.videos.value = [{ id: 9, title: 'Video', accountId: 42 }]
    
    const wrapper = mount(VideosList, { global: { stubs: globalStubs } })
    await flushPromises()

    expect(wrapper.find('[data-test="edit-video-button"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="edit-video-button"]').element.disabled).toBe(false)
  })

  it('allows edit navigation when user has matching accountId', async () => {
    currentUser = { roles: [], accountIds: [42] }
    videosStore.videos.value = [{ id: 10, title: 'Video', accountId: 42 }]
    
    const wrapper = mount(VideosList, { global: { stubs: globalStubs } })
    await flushPromises()

    expect(wrapper.find('[data-test="edit-video-button"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="edit-video-button"]').element.disabled).toBe(false)
  })

  it('filterVideos returns true for empty or null query', async () => {
    const wrapper = mount(VideosList, { global: { stubs: globalStubs } })
    await flushPromises()
    const item = { raw: { title: 'Clip', originalFilename: 'clip.mp4', fileSize: '100MB', duration: '1:00', accountDisplay: 'Acc', categoryId: null } }
    expect(wrapper.vm.filterVideos(null, '', item)).toBe(true)
    expect(wrapper.vm.filterVideos(null, null, item)).toBe(true)
    expect(wrapper.vm.filterVideos(null, undefined, item)).toBe(true)
  })

  it('filterVideos returns false for null or missing item', async () => {
    const wrapper = mount(VideosList, { global: { stubs: globalStubs } })
    await flushPromises()
    expect(wrapper.vm.filterVideos(null, 'query', null)).toBe(false)
    expect(wrapper.vm.filterVideos(null, 'query', {})).toBe(false)
  })

  it('filterVideos matches by title, filename, fileSize, duration, and accountDisplay', async () => {
    const wrapper = mount(VideosList, { global: { stubs: globalStubs } })
    await flushPromises()
    const item = { raw: { title: 'MyClip', originalFilename: 'video.mp4', fileSizeBytes: 1024, fileSize: '512MB', duration: '3:45', accountDisplay: 'Station-1', categoryId: null } }
    expect(wrapper.vm.filterVideos(null, 'myclip', item)).toBe(true)
    expect(wrapper.vm.filterVideos(null, 'video.mp4', item)).toBe(true)
    expect(wrapper.vm.filterVideos(null, '512', item)).toBe(true)
    expect(wrapper.vm.filterVideos(null, '1024', item)).toBe(true)
    expect(wrapper.vm.filterVideos(null, '1.0 кб', item)).toBe(true)
    expect(wrapper.vm.filterVideos(null, '1.0кб', item)).toBe(true)
    expect(wrapper.vm.filterVideos(null, '3:45', item)).toBe(true)
    expect(wrapper.vm.filterVideos(null, 'station', item)).toBe(true)
    expect(wrapper.vm.filterVideos(null, 'nomatch_xyz', item)).toBe(false)
  })

  it('filterVideos matches by category title', async () => {
    categoriesStore.categories.value = [{ id: 7, title: 'Nature Docs' }]
    const wrapper = mount(VideosList, { global: { stubs: globalStubs } })
    await flushPromises()
    const item = { raw: { title: null, originalFilename: null, fileSize: null, duration: null, accountDisplay: null, categoryId: 7 } }
    expect(wrapper.vm.filterVideos(null, 'nature', item)).toBe(true)
    expect(wrapper.vm.filterVideos(null, 'nomatch_xyz', item)).toBe(false)
  })

  it('does not navigate to edit view when user has no permission', async () => {
    currentUser = { roles: [], accountIds: [] }
    videosStore.videos.value = [{ id: 41, title: 'Locked', accountId: 42 }]
    const wrapper = mount(VideosList, { global: { stubs: globalStubs } })
    await flushPromises()

    await wrapper.vm.editVideo(videosStore.videos.value[0])
    await nextTick()

    expect(router.push).not.toHaveBeenCalled()
  })

  it('skips upload when no files are provided', async () => {
    const wrapper = mount(VideosList, { global: { stubs: globalStubs } })
    await flushPromises()

    await wrapper.vm.uploadVideos([])
    expect(videosStore.uploadFiles).not.toHaveBeenCalled()

    await wrapper.vm.uploadVideos(null)
    expect(videosStore.uploadFiles).not.toHaveBeenCalled()
  })

  it('shows error on non-abort upload failure', async () => {
    videosStore.uploadFiles.mockRejectedValueOnce(new Error('network error'))
    const wrapper = mount(VideosList, { global: { stubs: globalStubs } })
    await flushPromises()

    const file = new File(['x'], 'test.mp4', { type: 'video/mp4' })
    await wrapper.vm.uploadVideos([file])
    await flushPromises()

    expect(alertStore.error).toHaveBeenCalledWith('Не удалось загрузить видеофайлы: network error')
  })

  it('does not delete video when confirmation is cancelled', async () => {
    videosStore.videos.value = [{ id: 43, title: 'NotDeleted', accountId: null }]
    confirmation.confirmDelete.mockResolvedValueOnce(false)
    const wrapper = mount(VideosList, { global: { stubs: globalStubs } })
    await flushPromises()

    await wrapper.vm.deleteVideo(videosStore.videos.value[0])
    expect(videosStore.remove).not.toHaveBeenCalled()
  })

  it('does not delete video when user has no permission', async () => {
    currentUser = { roles: [], accountIds: [] }
    videosStore.videos.value = [{ id: 44, title: 'Protected', accountId: 42 }]
    const wrapper = mount(VideosList, { global: { stubs: globalStubs } })
    await flushPromises()

    await wrapper.vm.deleteVideo(videosStore.videos.value[0])
    expect(videosStore.remove).not.toHaveBeenCalled()
    expect(confirmation.confirmDelete).not.toHaveBeenCalled()
  })

  it('shows error when deleteVideo fails', async () => {
    videosStore.videos.value = [{ id: 45, title: 'Clip', accountId: null }]
    videosStore.remove.mockRejectedValueOnce(new Error('delete failed'))
    const wrapper = mount(VideosList, { global: { stubs: globalStubs } })
    await flushPromises()

    await wrapper.vm.deleteVideo(videosStore.videos.value[0])
    await flushPromises()

    expect(alertStore.error).toHaveBeenCalledWith('Не удалось удалить видеофайл: delete failed')
  })

  it('shows error summary for partial batch category update failures', async () => {
    videosStore.videos.value = [
      { id: 50, title: 'First', accountId: 0, categoryId: 0 },
      { id: 51, title: 'Second', accountId: 0, categoryId: 0 }
    ]
    videosStore.updateCategoryBatch.mockResolvedValueOnce({
      requestedCount: 2,
      updatedIds: [50],
      failures: [{ id: 51, message: 'Не удалось обновить категорию видеофайла с ID 51' }]
    })
    const wrapper = mount(VideosList, { global: { stubs: globalStubs } })
    await flushPromises()

    wrapper.vm.selectedVideoIds = [50, 51]
    wrapper.vm.batchCategoryId = 3
    await wrapper.vm.updateSelectedVideoCategory()
    await flushPromises()

    expect(alertStore.error).toHaveBeenCalledWith(expect.stringContaining('Обновлено видеофайлов: 1. Не удалось обновить: 1.'))
    expect(alertStore.error).toHaveBeenCalledWith(expect.stringContaining('Не удалось обновить категорию видеофайла с ID 51'))
  })

  it('shows duplicate filename failures in partial batch category update summary', async () => {
    const duplicateMessage = 'В выбранном разделе уже есть видеофайл с именем "public.mp4"'
    videosStore.videos.value = [
      { id: 50, title: 'First', accountId: 0, categoryId: 0 },
      { id: 51, title: 'Second', accountId: 0, categoryId: 0 }
    ]
    videosStore.updateCategoryBatch.mockResolvedValueOnce({
      requestedCount: 2,
      updatedIds: [50],
      failures: [{ id: 51, reason: 'duplicateOriginalFilename', message: duplicateMessage }]
    })
    const wrapper = mount(VideosList, { global: { stubs: globalStubs } })
    await flushPromises()

    wrapper.vm.selectedVideoIds = [50, 51]
    wrapper.vm.batchCategoryId = 3
    await wrapper.vm.updateSelectedVideoCategory()
    await flushPromises()

    expect(alertStore.error).toHaveBeenCalledWith(expect.stringContaining(duplicateMessage))
  })

  it('uses failure id when message is absent in batch category summary', async () => {
    videosStore.videos.value = [
      { id: 52, title: 'A', accountId: 0 },
      { id: 53, title: 'B', accountId: 0 }
    ]
    videosStore.updateCategoryBatch.mockResolvedValueOnce({
      requestedCount: 2,
      updatedIds: [52],
      failures: [{ id: 53 }]
    })
    const wrapper = mount(VideosList, { global: { stubs: globalStubs } })
    await flushPromises()

    wrapper.vm.selectedVideoIds = [52, 53]
    wrapper.vm.batchCategoryId = 3
    await wrapper.vm.updateSelectedVideoCategory()
    await flushPromises()

    expect(alertStore.error).toHaveBeenCalledWith(expect.stringContaining('видеофайл с ID 53'))
  })

  it('shows truncated message for batch category update with more than 3 failures', async () => {
    videosStore.videos.value = Array.from({ length: 5 }, (_, i) => ({ id: 60 + i, title: `V${i}`, accountId: 0 }))
    videosStore.updateCategoryBatch.mockResolvedValueOnce({
      requestedCount: 5,
      updatedIds: [],
      failures: [
        { id: 60, message: 'err1' },
        { id: 61, message: 'err2' },
        { id: 62, message: 'err3' },
        { id: 63, message: 'err4' },
        { id: 64, message: 'err5' }
      ]
    })
    const wrapper = mount(VideosList, { global: { stubs: globalStubs } })
    await flushPromises()

    wrapper.vm.selectedVideoIds = [60, 61, 62, 63, 64]
    wrapper.vm.batchCategoryId = 3
    await wrapper.vm.updateSelectedVideoCategory()
    await flushPromises()

    expect(alertStore.error).toHaveBeenCalledWith(expect.stringContaining('ещё 2'))
  })

  it('shows error when updateSelectedVideoCategory throws', async () => {
    videosStore.videos.value = [{ id: 70, title: 'Video', accountId: 0 }]
    videosStore.updateCategoryBatch.mockRejectedValueOnce(new Error('batch failed'))
    const wrapper = mount(VideosList, { global: { stubs: globalStubs } })
    await flushPromises()

    wrapper.vm.selectedVideoIds = [70]
    wrapper.vm.batchCategoryId = 3
    await wrapper.vm.updateSelectedVideoCategory()
    await flushPromises()

    expect(alertStore.error).toHaveBeenCalledWith('Не удалось обновить категории видеофайлов: batch failed')
  })

  it('shows duplicate category update conflict without playlist cleanup', async () => {
    const duplicateMessage = 'В выбранном разделе уже есть видеофайл с именем "public.mp4"'
    videosStore.videos.value = [{ id: 70, title: 'Video', accountId: 0 }]
    videosStore.updateCategoryBatch.mockRejectedValueOnce(createDuplicateOriginalFilenameError(duplicateMessage))
    const wrapper = mount(VideosList, { global: { stubs: globalStubs } })
    await flushPromises()

    wrapper.vm.selectedVideoIds = [70]
    wrapper.vm.batchCategoryId = 3
    await wrapper.vm.updateSelectedVideoCategory()
    await flushPromises()

    expect(alertStore.error).toHaveBeenCalledWith(duplicateMessage)
    expect(wrapper.find('[data-test="playlist-impact-list"]').exists()).toBe(false)
  })

  it('does not show batch category update summary when refresh fails', async () => {
    videosStore.videos.value = [{ id: 71, title: 'Video', accountId: 0 }]
    videosStore.updateCategoryBatch.mockResolvedValueOnce({ requestedCount: 1, updatedIds: [71], failures: [] })
    const wrapper = mount(VideosList, { global: { stubs: globalStubs } })
    await flushPromises()

    alertStore.success.mockClear()
    videosStore.getAllByAccount.mockRejectedValueOnce(new Error('refresh failed'))
    wrapper.vm.selectedVideoIds = [71]
    wrapper.vm.batchCategoryId = 3
    await wrapper.vm.updateSelectedVideoCategory()
    await flushPromises()

    expect(alertStore.success).not.toHaveBeenCalled()
  })

  it('uses failure id when message is absent in batch delete summary', async () => {
    videosStore.videos.value = [
      { id: 80, title: 'A', accountId: 0 },
      { id: 81, title: 'B', accountId: 0 }
    ]
    videosStore.removeBatch.mockResolvedValueOnce({
      requestedCount: 2,
      deletedIds: [80],
      failures: [{ id: 81 }]
    })
    const wrapper = mount(VideosList, { global: { stubs: globalStubs } })
    await flushPromises()

    wrapper.vm.selectedVideoIds = [80, 81]
    await wrapper.vm.deleteSelectedVideos()
    await flushPromises()

    expect(alertStore.error).toHaveBeenCalledWith(expect.stringContaining('видеофайл с ID 81'))
  })

  it('shows truncated message for batch delete with more than 3 failures', async () => {
    videosStore.videos.value = Array.from({ length: 5 }, (_, i) => ({ id: 90 + i, title: `V${i}`, accountId: 0 }))
    videosStore.removeBatch.mockResolvedValueOnce({
      requestedCount: 5,
      deletedIds: [],
      failures: [
        { id: 90, message: 'err1' },
        { id: 91, message: 'err2' },
        { id: 92, message: 'err3' },
        { id: 93, message: 'err4' },
        { id: 94, message: 'err5' }
      ]
    })
    const wrapper = mount(VideosList, { global: { stubs: globalStubs } })
    await flushPromises()

    wrapper.vm.selectedVideoIds = [90, 91, 92, 93, 94]
    await wrapper.vm.deleteSelectedVideos()
    await flushPromises()

    expect(alertStore.error).toHaveBeenCalledWith(expect.stringContaining('ещё 2'))
  })

  it('uses local pagination state and skips account load when fixedScope is provided', async () => {
    categoriesStore.categories.value = [{ id: 5, title: 'Sports' }]
    const wrapper = mount(VideosList, {
      props: { fixedScope: 'common:all' },
      global: { stubs: globalStubs }
    })
    await flushPromises()

    expect(accountsStore.getAll).not.toHaveBeenCalled()
    expect(videosStore.getAllByAccount).toHaveBeenCalledWith(0, {})

    wrapper.vm.tableItemsPerPage = 25
    expect(wrapper.vm.tableItemsPerPage).toBe(25)

    wrapper.vm.tableSearch = 'hello'
    expect(wrapper.vm.tableSearch).toBe('hello')

    wrapper.vm.tableSortBy = [{ key: 'title', order: 'asc' }]
    expect(wrapper.vm.tableSortBy).toEqual([{ key: 'title', order: 'asc' }])

    wrapper.vm.tablePage = 3
    expect(wrapper.vm.tablePage).toBe(3)
  })

  it('keeps fixed-scope pagination local in embedded mode', async () => {
    const wrapper = mount(VideosList, {
      props: { fixedScope: 'category:5', embedded: true },
      global: { stubs: globalStubs }
    })
    await flushPromises()

    expect(accountsStore.getAll).not.toHaveBeenCalled()
    expect(videosStore.getAllByAccount).toHaveBeenCalledWith(0, { categoryId: 5 })

    wrapper.vm.tableItemsPerPage = 15
    wrapper.vm.tableSearch = 'clip'
    wrapper.vm.tableSortBy = [{ key: 'title', order: 'asc' }]
    wrapper.vm.tablePage = 4

    expect(wrapper.vm.tableItemsPerPage).toBe(15)
    expect(wrapper.vm.tableSearch).toBe('clip')
    expect(wrapper.vm.tableSortBy).toEqual([{ key: 'title', order: 'asc' }])
    expect(wrapper.vm.tablePage).toBe(4)
  })

  it('uses authStore pagination state when fixedScope is not set', async () => {
    const wrapper = mount(VideosList, { global: { stubs: globalStubs } })
    await flushPromises()

    wrapper.vm.tableSearch = 'test'
    await wrapper.find('[data-test="trigger-items-per-page"]').trigger('click')
    await wrapper.find('[data-test="trigger-page"]').trigger('click')
    await wrapper.find('[data-test="trigger-sort-by"]').trigger('click')
    await nextTick()

    expect(wrapper.vm.tableItemsPerPage).toBe(5)
    expect(wrapper.vm.tableSearch).toBe('test')
    expect(wrapper.vm.tableSortBy).toEqual([{ key: 'title', order: 'asc' }])
    expect(wrapper.vm.tablePage).toBe(2)
  })

  it('triggers file upload dialog when upload button is clicked', async () => {
    const wrapper = mount(VideosList, { global: { stubs: globalStubs } })
    await flushPromises()

    const fileInput = wrapper.find('input[type="file"]')
    const clickSpy = vi.spyOn(fileInput.element, 'click').mockImplementation(() => {})

    await wrapper.find('[data-test="upload-video-button"]').trigger('click')

    expect(clickSpy).toHaveBeenCalled()
  })

  it('shows error when deleteSelectedVideos throws', async () => {
    videosStore.videos.value = [{ id: 100, title: 'Video', accountId: 0 }]
    videosStore.removeBatch.mockRejectedValueOnce(new Error('batch error'))
    const wrapper = mount(VideosList, { global: { stubs: globalStubs } })
    await flushPromises()

    wrapper.vm.selectedVideoIds = [100]
    await wrapper.vm.deleteSelectedVideos()
    await flushPromises()

    expect(alertStore.error).toHaveBeenCalledWith('Не удалось удалить видеофайлы: batch error')
  })

  it('shows error when onMounted reference data load fails', async () => {
    categoriesStore.getAll.mockRejectedValueOnce(new Error('load error'))
    mount(VideosList, { global: { stubs: globalStubs } })
    await flushPromises()

    expect(alertStore.error).toHaveBeenCalledWith('Не удалось загрузить справочники видеофайлов: load error')
  })

  it('treats upload progress with undefined percentage as indeterminate', async () => {
    let onUploadProgress
    videosStore.uploadFiles.mockImplementation((_files, _accountId, options) => {
      onUploadProgress = options.onUploadProgress
      return new Promise(() => {})
    })

    const wrapper = mount(VideosList, { global: { stubs: globalStubs } })
    await flushPromises()

    const file = new File(['x'], 'test.mp4', { type: 'video/mp4' })
    wrapper.vm.uploadVideos([file])
    await nextTick()

    onUploadProgress({ lengthComputable: true, percentage: undefined })
    await nextTick()

    expect(wrapper.find('[data-test="upload-progress-spinner"]').attributes('data-indeterminate')).toBe('true')
  })

  it('selects first available scope when current scope is not in options', async () => {
    accountsStore.accounts.value = [{ id: 10, name: 'Alpha' }, { id: 20, name: 'Beta' }]
    const wrapper = mount(VideosList, { global: { stubs: globalStubs } })
    await flushPromises()

    expect(wrapper.vm.selectedScope).toBe('account:10')
  })

  it('sets selectedScope to null when no scope options are available', async () => {
    currentUser = null
    const wrapper = mount(VideosList, { global: { stubs: globalStubs } })
    await flushPromises()

    expect(wrapper.vm.selectedScope).toBeNull()
    expect(wrapper.find('[data-test="table-empty"]').text()).toBe('Нет видеофайлов')
  })

  it('canManageVideo returns false for null or undefined item', async () => {
    const wrapper = mount(VideosList, { global: { stubs: globalStubs } })
    await flushPromises()
    expect(wrapper.vm.canManageVideo(null)).toBe(false)
    expect(wrapper.vm.canManageVideo(undefined)).toBe(false)
  })

  it('uses fallback title when deleting video with no title or filename', async () => {
    videosStore.videos.value = [{ id: 110, accountId: null }]
    const wrapper = mount(VideosList, { global: { stubs: globalStubs } })
    await flushPromises()

    await wrapper.vm.deleteVideo(videosStore.videos.value[0])
    await flushPromises()

    expect(confirmation.confirmDelete).toHaveBeenCalledWith('видеофайл', 'видеофайл')
    expect(videosStore.remove).toHaveBeenCalledWith(110)
  })

  it('uses err object directly when error has no message in refresh', async () => {
    videosStore.getAllByAccount.mockRejectedValueOnce(new Error())
    const wrapper = mount(VideosList, { global: { stubs: globalStubs } })
    await flushPromises()

    wrapper.vm.selectedScope = 'common:all'
    await nextTick()
    await flushPromises()

    expect(alertStore.error).toHaveBeenCalledWith(expect.stringContaining('Не удалось загрузить информацию о видеофайлах'))
  })

  it('uses err object directly when onMounted load error has no message', async () => {
    categoriesStore.getAll.mockRejectedValueOnce(new Error())
    mount(VideosList, { global: { stubs: globalStubs } })
    await flushPromises()

    expect(alertStore.error).toHaveBeenCalledWith(expect.stringContaining('Не удалось загрузить справочники видеофайлов'))
  })

  it('uses err object directly when upload error has no message', async () => {
    videosStore.uploadFiles.mockRejectedValueOnce(new Error())
    const wrapper = mount(VideosList, { global: { stubs: globalStubs } })
    await flushPromises()

    const file = new File(['x'], 'test.mp4', { type: 'video/mp4' })
    await wrapper.vm.uploadVideos([file])
    await flushPromises()

    expect(alertStore.error).toHaveBeenCalledWith(expect.stringContaining('Не удалось загрузить видеофайлы'))
  })

  it('uses err object directly when deleteSelectedVideos error has no message', async () => {
    videosStore.videos.value = [{ id: 121, title: 'V', accountId: 0 }]
    videosStore.removeBatch.mockRejectedValueOnce(new Error())
    const wrapper = mount(VideosList, { global: { stubs: globalStubs } })
    await flushPromises()

    wrapper.vm.selectedVideoIds = [121]
    await wrapper.vm.deleteSelectedVideos()
    await flushPromises()

    expect(alertStore.error).toHaveBeenCalledWith(expect.stringContaining('Не удалось удалить видеофайлы'))
  })

  it('uses err object directly when updateSelectedVideoCategory error has no message', async () => {
    videosStore.videos.value = [{ id: 122, title: 'V', accountId: 0 }]
    videosStore.updateCategoryBatch.mockRejectedValueOnce(new Error())
    const wrapper = mount(VideosList, { global: { stubs: globalStubs } })
    await flushPromises()

    wrapper.vm.selectedVideoIds = [122]
    wrapper.vm.batchCategoryId = 3
    await wrapper.vm.updateSelectedVideoCategory()
    await flushPromises()

    expect(alertStore.error).toHaveBeenCalledWith(expect.stringContaining('Не удалось обновить категории видеофайлов'))
  })

  it('handles null result from removeBatch gracefully', async () => {
    videosStore.videos.value = [{ id: 130, title: 'V', accountId: 0 }]
    videosStore.removeBatch.mockResolvedValueOnce(null)
    const wrapper = mount(VideosList, { global: { stubs: globalStubs } })
    await flushPromises()

    wrapper.vm.selectedVideoIds = [130]
    await wrapper.vm.deleteSelectedVideos()
    await flushPromises()

    expect(alertStore.success).toHaveBeenCalledWith('Удалено видеофайлов: 1')
  })

  it('handles null result from updateCategoryBatch gracefully', async () => {
    videosStore.videos.value = [{ id: 131, title: 'V', accountId: 0 }]
    videosStore.updateCategoryBatch.mockResolvedValueOnce(null)
    const wrapper = mount(VideosList, { global: { stubs: globalStubs } })
    await flushPromises()

    wrapper.vm.selectedVideoIds = [131]
    wrapper.vm.batchCategoryId = 3
    await wrapper.vm.updateSelectedVideoCategory()
    await flushPromises()

    expect(alertStore.success).toHaveBeenCalledWith('Обновлено видеофайлов: 1')
  })

  it('returns early from updateSelectedVideoCategory when ids are empty', async () => {
    const wrapper = mount(VideosList, { global: { stubs: globalStubs } })
    await flushPromises()

    wrapper.vm.selectedVideoIds = []
    await wrapper.vm.updateSelectedVideoCategory()

    expect(videosStore.updateCategoryBatch).not.toHaveBeenCalled()
  })

  it('returns early from updateSelectedVideoCategory when batchCategoryId is not a number', async () => {
    videosStore.videos.value = [{ id: 132, title: 'V', accountId: 0 }]
    const wrapper = mount(VideosList, { global: { stubs: globalStubs } })
    await flushPromises()

    wrapper.vm.selectedVideoIds = [132]
    wrapper.vm.batchCategoryId = 'not-a-number'
    await wrapper.vm.updateSelectedVideoCategory()

    expect(videosStore.updateCategoryBatch).not.toHaveBeenCalled()
  })

  it('returns early from deleteSelectedVideos when ids are empty', async () => {
    const wrapper = mount(VideosList, { global: { stubs: globalStubs } })
    await flushPromises()

    wrapper.vm.selectedVideoIds = []
    await wrapper.vm.deleteSelectedVideos()

    expect(confirmation.confirmAction).not.toHaveBeenCalled()
  })

  it('deletes selected videos via button click in the table row', async () => {
    videosStore.videos.value = [{ id: 140, title: 'Clickable', accountId: null }]
    const wrapper = mount(VideosList, { global: { stubs: globalStubs } })
    await flushPromises()

    await wrapper.find('[data-test="delete-video-button"]').trigger('click')
    await flushPromises()

    expect(videosStore.remove).toHaveBeenCalledWith(140)
  })

  it('opens selected video in the playback dialog from the row film button', async () => {
    videosStore.videos.value = [{ id: 141, title: 'Watchable', accountId: null }]
    const wrapper = mount(VideosList, { global: { stubs: globalStubs } })
    await flushPromises()

    const openButton = wrapper.find('[data-test="open-video-button"]')
    expect(openButton.attributes('data-icon')).toBe('fa-solid fa-film')

    await openButton.trigger('click')
    await flushPromises()

    expect(alertStore.clear).toHaveBeenCalled()
    expect(alertStore.clear.mock.invocationCallOrder[0]).toBeLessThan(videosStore.open.mock.invocationCallOrder[0])
    expect(videosStore.open).toHaveBeenCalledWith(141)
    const dialog = wrapper.find('[data-test="video-view-dialog"]')
    expect(dialog.exists()).toBe(true)
    expect(dialog.attributes('data-title')).toBe('Watchable')
    expect(dialog.attributes('data-src')).toBe('http://localhost:8080/api/videos/141/file?playbackToken=token-141')

    await wrapper.find('[data-test="trigger-video-playback-error"]').trigger('click')

    expect(alertStore.error).toHaveBeenCalledWith('Стриминг этого видеофайла не поддерживается браузером.')
  })

  it('shows an alert when opening video preview fails', async () => {
    videosStore.videos.value = [{ id: 142, title: 'Broken', accountId: null }]
    videosStore.open.mockRejectedValueOnce(new Error('preview failed'))
    const wrapper = mount(VideosList, { global: { stubs: globalStubs } })
    await flushPromises()

    await wrapper.find('[data-test="open-video-button"]').trigger('click')
    await flushPromises()

    expect(alertStore.error).toHaveBeenCalledWith('Не удалось открыть видеофайл: preview failed')
    expect(wrapper.find('[data-test="video-view-dialog"]').exists()).toBe(false)
  })

  it('clears the alert when close button is clicked', async () => {
    alertStore.alert.value = { message: 'some error', type: 'alert-danger' }
    const wrapper = mount(VideosList, { global: { stubs: globalStubs } })
    await flushPromises()

    const closeBtn = wrapper.find('.btn-link.close')
    await closeBtn.trigger('click')

    expect(alertStore.clear).toHaveBeenCalled()
  })

  it('updates selectedScope via select element change', async () => {
    accountsStore.accounts.value = [{ id: 5, name: 'Five' }]
    categoriesStore.categories.value = [{ id: 3, title: 'Sports' }]
    const wrapper = mount(VideosList, { global: { stubs: globalStubs } })
    await flushPromises()

    const selects = wrapper.findAll('select')
    const scopeSelect = selects[0]
    await scopeSelect.setValue('common:all')

    expect(wrapper.vm.selectedScope).toBe('common:all')
  })

  it('updates batchCategoryId via select element change', async () => {
    categoriesStore.categories.value = [{ id: 4, title: 'News' }]
    videosStore.videos.value = [{ id: 141, title: 'V', accountId: 0, categoryId: 0 }]
    const wrapper = mount(VideosList, { global: { stubs: globalStubs } })
    await flushPromises()

    wrapper.vm.selectedVideoIds = [141]
    wrapper.vm.openBatchCategoryDialog()
    await nextTick()

    const vSelects = wrapper.findAllComponents(globalStubs['v-select'])
    await vSelects[1].vm.$emit('update:modelValue', 4)
    await nextTick()

    expect(wrapper.vm.batchCategoryId).toBe(4)
  })

  it('updates tableSearch via text field input', async () => {
    videosStore.videos.value = [{ id: 142, title: 'Searchable', accountId: null }]
    const wrapper = mount(VideosList, {
      props: { fixedScope: 'common:all' },
      global: { stubs: globalStubs }
    })
    await flushPromises()

    const input = wrapper.find('input:not([type="file"]):not([type="checkbox"])')
    await input.setValue('findme')

    expect(wrapper.vm.tableSearch).toBe('findme')
  })

  it('updates data table items-per-page, page, and sort-by via v-model bindings', async () => {
    videosStore.videos.value = [{ id: 144, title: 'V', accountId: 0 }]
    const wrapper = mount(VideosList, {
      props: { fixedScope: 'common:all' },
      global: { stubs: globalStubs }
    })
    await flushPromises()

    await wrapper.find('[data-test="trigger-items-per-page"]').trigger('click')
    await wrapper.find('[data-test="trigger-page"]').trigger('click')
    await wrapper.find('[data-test="trigger-sort-by"]').trigger('click')
    await nextTick()

    expect(wrapper.vm.tableItemsPerPage).toBe(5)
    expect(wrapper.vm.tablePage).toBe(2)
    expect(wrapper.vm.tableSortBy).toEqual([{ key: 'title', order: 'asc' }])
  })

  it('categorySaving flag blocks closing the batch category dialog', async () => {
    videosStore.videos.value = [{ id: 150, title: 'V', accountId: 0, categoryId: 0 }]
    let resolveUpdate
    videosStore.updateCategoryBatch.mockImplementation(() => new Promise(resolve => { resolveUpdate = resolve }))
    const wrapper = mount(VideosList, { global: { stubs: globalStubs } })
    await flushPromises()

    wrapper.vm.selectedVideoIds = [150]
    wrapper.vm.batchCategoryId = 3
    wrapper.vm.batchCategoryDialog = true
    const first = wrapper.vm.updateSelectedVideoCategory()
    await nextTick()

    wrapper.vm.closeBatchCategoryDialog()
    await nextTick()

    expect(wrapper.vm.batchCategoryDialog).toBe(true)

    resolveUpdate({ requestedCount: 1, updatedIds: [150], failures: [] })
    await first
    await flushPromises()
  })
})

describe('Videos_List.vue - playlist impact and v-model coverage', () => {
  beforeEach(() => {
    currentUser = { id: 1, roles: [1], accountIds: [], isAdministrator: true }
    authStore.user = currentUser
    authStore.videos_per_page = 10
    authStore.videos_search = ''
    authStore.videos_sort_by = []
    authStore.videos_page = 1
    videosStore.videos.value = [{ id: 31, title: 'First', accountId: 0, categoryId: 0 }]
    categoriesStore.categories.value = [{ id: 3, title: 'Sports' }, { id: 4, title: 'News' }]
    videosStore.updateCategoryBatch = vi.fn().mockResolvedValue({ requestedCount: 1, updatedIds: [31], failures: [] })
    vi.clearAllMocks()
  })

  it('cancelPlaylistCleanup closes impact dialog when not saving', async () => {
    videosStore.updateCategoryBatch = vi.fn()
      .mockRejectedValueOnce({
        status: 409,
        data: {
          affectedPlaylistCount: 1,
          affectedItemCount: 1,
          affectedVideoCount: 1,
          affectedPlaylists: [
            { playlistId: 11, title: 'Morning', filename: 'morning.m3u', accountId: 1, accountName: 'Cafe', removedItemCount: 1 }
          ]
        }
      })

    const wrapper = mount(VideosList, { global: { stubs: globalStubs } })
    await flushPromises()

    wrapper.vm.selectedVideoIds = [31]
    wrapper.vm.batchCategoryId = 4
    await wrapper.vm.updateSelectedVideoCategory()
    await flushPromises()

    expect(wrapper.find('[data-test="playlist-impact-list"]').exists()).toBe(true)

    await wrapper.find('[data-test="cancel-playlist-impact-button"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-test="playlist-impact-list"]').exists()).toBe(false)
    expect(videosStore.updateCategoryBatch).toHaveBeenCalledTimes(1)
  })

  it('cancelPlaylistCleanup does nothing while categorySaving is true', async () => {
    let resolveUpdate
    videosStore.updateCategoryBatch = vi.fn()
      .mockRejectedValueOnce({
        status: 409,
        data: {
          affectedPlaylistCount: 1,
          affectedItemCount: 1,
          affectedVideoCount: 1,
          affectedPlaylists: [
            { playlistId: 11, title: 'Morning', filename: 'morning.m3u', accountId: 1, accountName: 'Cafe', removedItemCount: 1 }
          ]
        }
      })
      .mockReturnValueOnce(new Promise(resolve => { resolveUpdate = resolve }))

    const wrapper = mount(VideosList, { global: { stubs: globalStubs } })
    await flushPromises()

    wrapper.vm.selectedVideoIds = [31]
    wrapper.vm.batchCategoryId = 4
    await wrapper.vm.updateSelectedVideoCategory()
    await flushPromises()

    expect(wrapper.find('[data-test="playlist-impact-list"]').exists()).toBe(true)

    // Trigger confirm (starts saving, sets categorySaving=true)
    await wrapper.find('[data-test="confirm-playlist-impact-button"]').trigger('click')
    // Emit cancel directly from PlaylistAccessImpactDialog to test cancelPlaylistCleanup guard
    const impactDialog = wrapper.findComponent({ name: 'PlaylistAccessImpactDialog' })
    await impactDialog.vm.$emit('cancel')
    await flushPromises()

    // Dialog still showing because cancelPlaylistCleanup guard blocked it
    expect(wrapper.find('[data-test="playlist-impact-list"]').exists()).toBe(true)

    resolveUpdate({ requestedCount: 1, updatedIds: [31], failures: [] })
    await flushPromises()
  })

  it('shows duplicate filename error when playlist cleanup confirmation fails', async () => {
    const duplicateMessage = 'В выбранном разделе уже есть видеофайл с таким именем [filename = morning.mp4]'
    videosStore.updateCategoryBatch = vi.fn()
      .mockRejectedValueOnce({
        status: 409,
        data: {
          affectedPlaylistCount: 1,
          affectedItemCount: 1,
          affectedVideoCount: 1,
          affectedPlaylists: [
            { playlistId: 11, title: 'Morning', filename: 'morning.m3u', accountId: 1, accountName: 'Cafe', removedItemCount: 1 }
          ]
        }
      })
      .mockRejectedValueOnce(createDuplicateOriginalFilenameError(duplicateMessage))

    const wrapper = mount(VideosList, { global: { stubs: globalStubs } })
    await flushPromises()

    wrapper.vm.selectedVideoIds = [31]
    wrapper.vm.batchCategoryId = 4
    await wrapper.vm.updateSelectedVideoCategory()
    await flushPromises()
    await wrapper.find('[data-test="confirm-playlist-impact-button"]').trigger('click')
    await flushPromises()

    expect(alertStore.error).toHaveBeenCalledWith(duplicateMessage)
    expect(alertStore.error).not.toHaveBeenCalledWith(expect.stringContaining('Не удалось обновить категории видеофайлов'))
  })

  it('shows generic error when playlist cleanup confirmation fails', async () => {
    videosStore.updateCategoryBatch = vi.fn()
      .mockRejectedValueOnce({
        status: 409,
        data: {
          affectedPlaylistCount: 1,
          affectedItemCount: 1,
          affectedVideoCount: 1,
          affectedPlaylists: [
            { playlistId: 11, title: 'Morning', filename: 'morning.m3u', accountId: 1, accountName: 'Cafe', removedItemCount: 1 }
          ]
        }
      })
      .mockRejectedValueOnce(new Error('boom'))

    const wrapper = mount(VideosList, { global: { stubs: globalStubs } })
    await flushPromises()

    wrapper.vm.selectedVideoIds = [31]
    wrapper.vm.batchCategoryId = 4
    await wrapper.vm.updateSelectedVideoCategory()
    await flushPromises()
    await wrapper.find('[data-test="confirm-playlist-impact-button"]').trigger('click')
    await flushPromises()

    expect(alertStore.error).toHaveBeenCalledWith('Не удалось обновить категории видеофайлов: boom')
  })

  it('v-model on batchCategoryDialog closes it on update:modelValue false', async () => {
    const wrapper = mount(VideosList, { global: { stubs: globalStubs } })
    await flushPromises()

    wrapper.vm.selectedVideoIds = [31]
    await nextTick()
    await wrapper.find('[data-test="batch-category-video-button"]').trigger('click')
    await flushPromises()

    expect(wrapper.vm.batchCategoryDialog).toBe(true)

    const batchDialog = wrapper.findComponent({ name: 'ModalWindow' })
    await batchDialog.vm.$emit('update:modelValue', false)
    await flushPromises()

    expect(wrapper.vm.batchCategoryDialog).toBe(false)
  })

  it('v-model on PlaylistAccessImpactDialog closes it on update:modelValue false', async () => {
    videosStore.updateCategoryBatch = vi.fn()
      .mockRejectedValueOnce({
        status: 409,
        data: {
          affectedPlaylistCount: 1,
          affectedItemCount: 1,
          affectedVideoCount: 1,
          affectedPlaylists: [
            { playlistId: 11, title: 'Morning', filename: 'morning.m3u', accountId: 1, accountName: 'Cafe', removedItemCount: 1 }
          ]
        }
      })

    const wrapper = mount(VideosList, { global: { stubs: globalStubs } })
    await flushPromises()

    wrapper.vm.selectedVideoIds = [31]
    wrapper.vm.batchCategoryId = 4
    await wrapper.vm.updateSelectedVideoCategory()
    await flushPromises()

    expect(wrapper.find('[data-test="playlist-impact-list"]').exists()).toBe(true)

    const impactDialog = wrapper.findComponent({ name: 'PlaylistAccessImpactDialog' })
    await impactDialog.vm.$emit('update:modelValue', false)
    await flushPromises()

    expect(wrapper.find('[data-test="playlist-impact-list"]').exists()).toBe(false)
  })
})
