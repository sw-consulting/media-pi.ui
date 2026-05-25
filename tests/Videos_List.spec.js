import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref, nextTick } from 'vue'
import VideosList from '@/components/Videos_List.vue'

/* global File, AbortSignal */

let currentUser

const makeAuthStore = () => ({
  user: currentUser,
  videos_per_page: 10,
  videos_search: '',
  videos_sort_by: [],
  videos_page: 1
})

const accountsStore = {
  accounts: ref([]),
  loading: ref(false),
  error: ref(null),
  getAll: vi.fn(async () => accountsStore.accounts.value)
}

const videosStore = {
  videos: ref([]),
  loading: ref(false),
  error: ref(null),
  getAllByAccount: vi.fn(async () => videosStore.videos.value),
  update: vi.fn(async () => ({})),
  uploadFile: vi.fn(async () => ({})),
  uploadFiles: vi.fn(async () => ({})),
  remove: vi.fn(async () => ({})),
  removeBatch: vi.fn(async () => ({ requestedCount: 0, deletedIds: [], failures: [] }))
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

vi.mock('@/stores/accounts.store.js', () => ({ useAccountsStore: () => accountsStore }))
vi.mock('@/stores/videos.store.js', () => ({ useVideosStore: () => videosStore }))
vi.mock('@/stores/auth.store.js', () => ({ useAuthStore: () => makeAuthStore() }))
vi.mock('@/stores/alert.store.js', () => ({ useAlertStore: () => alertStore }))
vi.mock('@/helpers/confirmation.js', () => ({ useConfirmation: () => confirmation }))
vi.mock('@sw-consulting/tooling.ui.kit', () => ({
  ActionButton: { name: 'ActionButton', props: ['item', 'icon', 'tooltipText', 'disabled'], emits: ['click'], template: '<button :disabled="disabled" @click="$emit(\'click\')"><slot /></button>' }
}))
vi.mock('@/helpers/user.helpers.js', () => ({
  isAdministrator: (u) => Array.isArray(u?.roles) && u.roles.includes(1),
  isManager: (u) => Array.isArray(u?.roles) && u.roles.includes(11),
  canManageAccountById: (u, accountId) => !!(Array.isArray(u?.roles) && u.roles.includes(1)) || (Array.isArray(u?.accountIds) && u.accountIds.includes(accountId))
}))

const globalStubs = {
  'v-card': { template: '<div><slot /></div>' },
  'v-select': {
    props: ['items', 'modelValue'],
    emits: ['update:modelValue'],
    methods: {
      emitValue(event) {
        const value = event?.target?.value
        this.$emit('update:modelValue', value === 'null' ? null : Number(value))
      }
    },
    template: '<select @change="emitValue"><option v-for="item in items" :key="item.value" :value="item.value">{{ item.title }}</option></select>'
  },
  'v-data-table': {
    props: ['items', 'modelValue', 'showSelect'],
    emits: ['update:modelValue'],
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
      <div class="data-table" :data-show-select="showSelect ? 'true' : 'false'">
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
        </div>
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
    videosStore.videos.value = []
    currentUser = { roles: [1], accountIds: [] }
    accountsStore.getAll.mockImplementation(async () => accountsStore.accounts.value)
    videosStore.getAllByAccount.mockImplementation(async () => videosStore.videos.value)
    videosStore.update.mockImplementation(async () => ({}))
    videosStore.uploadFile.mockImplementation(async () => ({}))
    videosStore.uploadFiles.mockImplementation(async () => ({}))
    videosStore.remove.mockImplementation(async () => ({}))
    videosStore.removeBatch.mockImplementation(async () => ({ requestedCount: 0, deletedIds: [], failures: [] }))
    alertStore.success.mockImplementation((message) => { alertStore.alert.value = { message, type: 'alert-success' } })
    alertStore.error.mockImplementation((message) => { alertStore.alert.value = { message } })
    alertStore.clear.mockImplementation(() => {})
    confirmation.confirmDelete.mockImplementation(async () => true)
    confirmation.confirmAction.mockImplementation(async () => true)
  })

  it('loads videos for default and changed account selection', async () => {
    accountsStore.accounts.value = [{ id: 5, name: 'Five' }]
    const wrapper = mount(VideosList, { global: { stubs: globalStubs } })

    await flushPromises()
    expect(accountsStore.getAll).toHaveBeenCalled()
    expect(videosStore.getAllByAccount).toHaveBeenCalledWith(5)

    wrapper.vm.selectedAccountId = 0
    await nextTick()
    await flushPromises()
    expect(videosStore.getAllByAccount).toHaveBeenCalledWith(0)
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

    resolveUpload({})
    await uploadPromise
    await flushPromises()

    expect(wrapper.find('[data-test="upload-progress"]').exists()).toBe(false)
    expect(videosStore.getAllByAccount.mock.calls.length).toBe(callsBeforeUpload + 1)
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
      failures: [{ id: 19, reason: 'notFound', message: 'Не удалось найти видеофайл [id=19]' }]
    })

    const wrapper = mount(VideosList, { global: { stubs: globalStubs } })
    await flushPromises()
    wrapper.vm.selectedVideoIds = [18, 19]
    await wrapper.vm.deleteSelectedVideos()
    await flushPromises()

    expect(alertStore.error).toHaveBeenCalledWith(expect.stringContaining('Удалено видеофайлов: 1. Не удалось удалить: 1.'))
    expect(alertStore.error).toHaveBeenCalledWith(expect.stringContaining('Не удалось найти видеофайл [id=19]'))
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

  it('edits video title inline and saves on Enter', async () => {
    videosStore.videos.value = [{ id: 1, title: 'Old', accountId: null }]
    const wrapper = mount(VideosList, { global: { stubs: globalStubs } })
    await flushPromises()

    await wrapper.find('[data-test="edit-video-button"]').trigger('click')
    const input = wrapper.find('[data-test="edit-title-input"]')
    await input.setValue('New Title')
    await input.trigger('keydown', { key: 'Enter' })
    await flushPromises()

    expect(videosStore.update).toHaveBeenCalledWith(1, { title: 'New Title' })
    expect(wrapper.find('[data-test="edit-title-input"]').exists()).toBe(false)
  })

  it('cancels editing on Escape without saving', async () => {
    videosStore.videos.value = [{ id: 2, title: 'Stay', accountId: null }]
    const wrapper = mount(VideosList, { global: { stubs: globalStubs } })
    await flushPromises()

    await wrapper.find('[data-test="edit-video-button"]').trigger('click')
    const input = wrapper.find('[data-test="edit-title-input"]')
    await input.setValue('Ignored')
    await input.trigger('keydown', { key: 'Escape' })
    await flushPromises()

    expect(videosStore.update).not.toHaveBeenCalled()
    expect(wrapper.find('[data-test="edit-title-input"]').exists()).toBe(false)
  })

  it('does not cancel on Escape while saving', async () => {
    videosStore.videos.value = [{ id: 3, title: 'Original', accountId: null }]
    let resolveUpdate
    videosStore.update.mockImplementation(() => new Promise(resolve => { resolveUpdate = resolve }))

    const wrapper = mount(VideosList, { global: { stubs: globalStubs } })
    await flushPromises()

    await wrapper.find('[data-test="edit-video-button"]').trigger('click')
    const input = wrapper.find('[data-test="edit-title-input"]')
    await input.setValue('Modified')
    
    // Start save operation (Enter key)
    await input.trigger('keydown', { key: 'Enter' })
    await nextTick()
    
    // Attempt to cancel while saving (Escape key)
    await input.trigger('keydown', { key: 'Escape' })
    await nextTick()
    
    // Should still be in edit mode
    expect(wrapper.find('[data-test="edit-title-input"]').exists()).toBe(true)
    
    // Complete the save
    resolveUpdate()
    await flushPromises()
    
    // Now should exit edit mode
    expect(wrapper.find('[data-test="edit-title-input"]').exists()).toBe(false)
  })

  it('disables cancel button while saving', async () => {
    videosStore.videos.value = [{ id: 4, title: 'Test', accountId: null }]
    let resolveUpdate
    videosStore.update.mockImplementation(() => new Promise(resolve => { resolveUpdate = resolve }))

    const wrapper = mount(VideosList, { global: { stubs: globalStubs } })
    await flushPromises()

    await wrapper.find('[data-test="edit-video-button"]').trigger('click')
    const input = wrapper.find('[data-test="edit-title-input"]')
    await input.setValue('New Value')
    
    // Cancel button should be enabled before save
    let cancelButton = wrapper.find('[data-test="cancel-title-button"]')
    expect(cancelButton.element.disabled).toBe(false)
    
    // Start save operation
    await wrapper.find('[data-test="save-title-button"]').trigger('click')
    await nextTick()
    
    // Cancel button should be disabled during save
    cancelButton = wrapper.find('[data-test="cancel-title-button"]')
    expect(cancelButton.element.disabled).toBe(true)
    
    // Complete the save
    resolveUpdate()
    await flushPromises()
    
    // Edit mode should be exited
    expect(wrapper.find('[data-test="edit-title-input"]').exists()).toBe(false)
  })

  it('shows error and does not save when title is empty', async () => {
    videosStore.videos.value = [{ id: 5, title: 'Original', accountId: null }]
    const wrapper = mount(VideosList, { global: { stubs: globalStubs } })
    await flushPromises()

    await wrapper.find('[data-test="edit-video-button"]').trigger('click')
    const input = wrapper.find('[data-test="edit-title-input"]')
    
    // Try to save with empty title
    await input.setValue('')
    await wrapper.find('[data-test="save-title-button"]').trigger('click')
    await flushPromises()

    // Should show error and not call update
    expect(alertStore.error).toHaveBeenCalledWith('Название не может быть пустым')
    expect(videosStore.update).not.toHaveBeenCalled()
    
    // Should still be in edit mode
    expect(wrapper.find('[data-test="edit-title-input"]').exists()).toBe(true)
  })

  it('shows error and does not save when title is only whitespace', async () => {
    videosStore.videos.value = [{ id: 6, title: 'Original', accountId: null }]
    const wrapper = mount(VideosList, { global: { stubs: globalStubs } })
    await flushPromises()

    await wrapper.find('[data-test="edit-video-button"]').trigger('click')
    const input = wrapper.find('[data-test="edit-title-input"]')
    
    // Try to save with whitespace-only title
    await input.setValue('   ')
    await wrapper.find('[data-test="save-title-button"]').trigger('click')
    await flushPromises()

    // Should show error and not call update
    expect(alertStore.error).toHaveBeenCalledWith('Название не может быть пустым')
    expect(videosStore.update).not.toHaveBeenCalled()
    
    // Should still be in edit mode
    expect(wrapper.find('[data-test="edit-title-input"]').exists()).toBe(true)
  })

  it('shows error and preserves editing state when update fails', async () => {
    videosStore.videos.value = [{ id: 7, title: 'Original', accountId: null }]
    const errorMessage = 'Network error'
    videosStore.update.mockRejectedValue(new Error(errorMessage))

    const wrapper = mount(VideosList, { global: { stubs: globalStubs } })
    await flushPromises()

    await wrapper.find('[data-test="edit-video-button"]').trigger('click')
    const input = wrapper.find('[data-test="edit-title-input"]')
    await input.setValue('New Title')
    
    await wrapper.find('[data-test="save-title-button"]').trigger('click')
    await flushPromises()

    // Should show error message
    expect(alertStore.error).toHaveBeenCalledWith('Не удалось обновить название: ' + errorMessage)
    
    // Should still be in edit mode
    expect(wrapper.find('[data-test="edit-title-input"]').exists()).toBe(true)
    
    // Input should still have the edited value
    expect(input.element.value).toBe('New Title')
  })

  it('prevents editing when user lacks permissions', async () => {
    currentUser = { roles: [], accountIds: [99] }
    videosStore.videos.value = [{ id: 8, title: 'Video', accountId: 42 }]
    
    const wrapper = mount(VideosList, { global: { stubs: globalStubs } })
    await flushPromises()

    // Edit button should be disabled for videos user cannot manage
    const editButton = wrapper.find('[data-test="edit-video-button"]')
    expect(editButton.exists()).toBe(true)
    expect(editButton.element.disabled).toBe(true)
  })

  it('allows editing when user is administrator', async () => {
    currentUser = { roles: [1], accountIds: [] }
    videosStore.videos.value = [{ id: 9, title: 'Video', accountId: 42 }]
    
    const wrapper = mount(VideosList, { global: { stubs: globalStubs } })
    await flushPromises()

    // Edit button should exist for administrators
    expect(wrapper.find('[data-test="edit-video-button"]').exists()).toBe(true)
  })

  it('allows editing when user has matching accountId', async () => {
    currentUser = { roles: [], accountIds: [42] }
    videosStore.videos.value = [{ id: 10, title: 'Video', accountId: 42 }]
    
    const wrapper = mount(VideosList, { global: { stubs: globalStubs } })
    await flushPromises()

    // Edit button should exist for users with matching accountId
    expect(wrapper.find('[data-test="edit-video-button"]').exists()).toBe(true)
  })

  it('cancels editing when video is removed from list', async () => {
    videosStore.videos.value = [{ id: 11, title: 'Video to Remove', accountId: null }]
    const wrapper = mount(VideosList, { global: { stubs: globalStubs } })
    await flushPromises()

    // Start editing
    await wrapper.find('[data-test="edit-video-button"]').trigger('click')
    expect(wrapper.find('[data-test="edit-title-input"]').exists()).toBe(true)

    // Remove the video from the list
    videosStore.videos.value = []
    await nextTick()
    await flushPromises()

    // Should no longer be in edit mode
    expect(wrapper.find('[data-test="edit-title-input"]').exists()).toBe(false)
  })
})
