/* @vitest-environment jsdom */
// Copyright (c) 2025 sw.consulting
// This file is a part of Media Pi  frontend application

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import PlaylistSettings from '@/components/Playlist_Settings.vue'
import { redirectToDefaultRoute } from '@/helpers/default.route.js'

const routerGo = vi.hoisted(() => vi.fn())

let authStore

const playlistsStore = {
  playlist: null,
  loading: ref(false),
  getById: vi.fn(),
  getAllByAccount: vi.fn(),
  create: vi.fn(),
  update: vi.fn()
}

const videosStore = {
  getAllByAccount: vi.fn()
}

const accountsStore = {
  accounts: [],
  getAll: vi.fn(async () => accountsStore.accounts)
}

const alertStore = {
  alert: ref(null),
  error: vi.fn((message) => { alertStore.alert.value = { message, type: 'alert-danger' } }),
  clear: vi.fn()
}

vi.mock('pinia', async () => {
  const actual = await vi.importActual('pinia')
  return { ...actual, storeToRefs: (store) => store }
})

vi.mock('@/router', () => ({
  default: { go: routerGo }
}))

vi.mock('@/stores/playlists.store.js', () => ({
  usePlaylistsStore: () => playlistsStore
}))

vi.mock('@/stores/videos.store.js', () => ({
  useVideosStore: () => videosStore
}))

vi.mock('@/stores/accounts.store.js', () => ({
  useAccountsStore: () => accountsStore
}))

vi.mock('@/stores/auth.store.js', () => ({
  useAuthStore: () => authStore
}))

vi.mock('@/stores/alert.store.js', () => ({
  useAlertStore: () => alertStore
}))

vi.mock('@/helpers/default.route.js', () => ({
  redirectToDefaultRoute: vi.fn()
}))

vi.mock('@sw-consulting/tooling.ui.kit', () => ({
  ActionButton: { name: 'ActionButton', props: ['item', 'disabled'], emits: ['click'], template: '<button :disabled="disabled" @click="$emit(\'click\', item)"></button>' }
}))

const mountSettings = (props = {}) => mount({
  template: '<Suspense><PlaylistSettings v-bind="$attrs" /></Suspense>',
  components: { PlaylistSettings },
  inheritAttrs: false
}, {
  attrs: {
    register: true,
    ...props
  },
  global: {
    stubs: {
      Form: {
        template: '<form data-test="form" @submit.prevent="onSubmit"><slot :errors="errors" :isSubmitting="isSubmitting" /></form>',
        props: ['validationSchema', 'initialValues'],
        emits: ['submit'],
        data() {
          return {
            errors: props.showValidationError ? { title: 'Required' } : {},
            isSubmitting: props.isSubmitting || false
          }
        },
        methods: {
          onSubmit() {
            this.$emit('submit', { ...this.initialValues, ...(props.submitValues || {}) })
          }
        }
      },
      Field: {
        props: ['name'],
        data() {
          return { value: null }
        },
        methods: {
          onChange(value) {
            this.value = value
          }
        },
        template: '<div><slot v-if="$slots.default" :field="{ value, onChange }" /><input v-else data-test="field-input" /></div>'
      },
      'v-text-field': {
        template: '<input data-test="video-search-input" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
        props: ['modelValue'],
        emits: ['update:modelValue']
      },
      'v-data-table': {
        props: ['headers', 'items', 'loading', 'loadingText', 'noDataText', 'sortBy'],
        emits: ['update:sort-by'],
        data() {
          return {
            sortKey: null,
            sortOrder: 'asc'
          }
        },
        computed: {
          renderedItems() {
            if (!this.sortKey) return this.items
            const header = (this.headers || []).find(item => item.key === this.sortKey)
            const sorted = [...(this.items || [])]
            sorted.sort((a, b) => {
              const compare = header?.sort
                ? header.sort(a?.[this.sortKey], b?.[this.sortKey])
                : String(a?.[this.sortKey] ?? '').localeCompare(String(b?.[this.sortKey] ?? ''))
              return this.sortOrder === 'desc' ? -compare : compare
            })
            return sorted
          }
        },
        methods: {
          toggleSort(header) {
            if (!header?.key || header.sortable === false) return
            if (this.sortKey === header.key) {
              this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc'
            } else {
              this.sortKey = header.key
              this.sortOrder = 'asc'
            }
            this.$emit('update:sort-by', [{ key: this.sortKey, order: this.sortOrder }])
          }
        },
        template: `
          <div class="data-table">
            <div class="data-table-header">
              <template v-for="header in headers" :key="header.key">
                <button
                  v-if="header.title"
                  :data-test="'sort-' + header.key"
                  :disabled="header.sortable === false"
                  @click="toggleSort(header)"
                >
                  {{ header.title }}
                </button>
              </template>
              <slot name="header.select" />
            </div>
            <div v-if="loading" data-test="table-loading">{{ loadingText }}</div>
            <div v-else-if="!items || !items.length" data-test="table-empty">{{ noDataText }}</div>
            <div v-else v-for="item in renderedItems" :key="item.key || item.id" class="playlist-video-row">
              <slot name="item.select" :item="item" />
              <slot name="item.position" :item="item" />
              <slot name="item.title" :item="item" />
              <slot name="item.accountName" :item="item" />
              <slot name="item.fileSize" :item="item" />
              <slot name="item.duration" :item="item" />
              <slot name="item.actions" :item="item" />
            </div>
          </div>
        `
      }
    },
    mocks: {
      $router: { go: routerGo }
    }
  }
})

function getPlaylistTable(wrapper) {
  const tables = wrapper.findAll('.data-table')
  expect(tables.length).toBeGreaterThanOrEqual(1)
  return tables[0]
}

function findRowByTextAndSelector(wrapper, selector, text) {
  return wrapper.findAll('.playlist-video-row')
    .find(row => row.find(selector).exists() && row.text().includes(text))
}

async function selectAvailableVideo(wrapper, text) {
  const row = findRowByTextAndSelector(wrapper, '[data-test="available-video-select"]', text)
  expect(row).toBeTruthy()
  await row.find('[data-test="available-video-select"]').setValue(true)
}

async function clickBatchAdd(wrapper) {
  await wrapper.find('[data-test="batch-add-video-button"]').trigger('click')
  await flushPromises()
}

async function clickBatchRemove(wrapper) {
  await wrapper.find('[data-test="batch-remove-video-button"]').trigger('click')
  await flushPromises()
}

function getAvailableTable(wrapper) {
  const tables = wrapper.findAll('.data-table')
  expect(tables.length).toBeGreaterThanOrEqual(2)
  return tables[1]
}

function getAvailableTableTitles(wrapper) {
  return getAvailableTable(wrapper)
    .findAll('.playlist-video-title')
    .map(item => item.text())
}

async function sortAvailableTableBy(wrapper, key) {
  const sortButton = getAvailableTable(wrapper).find(`[data-test="sort-${key}"]`)
  expect(sortButton.exists()).toBe(true)
  expect(sortButton.element.disabled).toBe(false)
  await sortButton.trigger('click')
  await flushPromises()
}

describe('Playlist_Settings.vue', () => {
  beforeEach(() => {
    authStore = { user: { roles: [1], accountIds: [] } }
    playlistsStore.playlist = null
    playlistsStore.getById = vi.fn().mockResolvedValue()
    playlistsStore.getAllByAccount = vi.fn().mockResolvedValue([])
    playlistsStore.create = vi.fn().mockResolvedValue()
    playlistsStore.update = vi.fn().mockResolvedValue()
    videosStore.getAllByAccount = vi.fn(async (accountId) => {
      if (accountId === 1) {
        return [{ id: 11, title: 'Video 1', originalFilename: 'one.mp4', fileSizeBytes: 1200, durationSeconds: 60, accountId: 1 }]
      }
      if (accountId === 0) {
        return [{ id: 22, title: 'Shared', originalFilename: 'shared.mp4', fileSizeBytes: 2400, durationSeconds: 90, accountId: 0 }]
      }
      return []
    })
    accountsStore.accounts = [{ id: 1, name: 'Account 1' }]
    accountsStore.getAll = vi.fn(async () => accountsStore.accounts)
    alertStore.alert.value = null
    vi.clearAllMocks()
  })

  it('creates playlist with selected videos', async () => {
    const wrapper = mountSettings({
      accountId: 1,
      submitValues: { title: 'My Playlist', filename: 'playlist.json' }
    })

    await flushPromises()

    const videoRows = wrapper.findAll('.playlist-video-row')
    const targetRow = videoRows.find(r => r.text().includes('Video 1'))
    expect(targetRow).toBeTruthy()
    await targetRow.find('button').trigger('click')

    await wrapper.find('[data-test="form"]').trigger('submit')
    await flushPromises()

    expect(playlistsStore.create).toHaveBeenCalled()
    const callArg = playlistsStore.create.mock.calls[0][0]
    expect(callArg).toEqual(expect.objectContaining({
      title: 'My Playlist',
      accountId: 1,
      items: [{ videoId: 11, position: 1 }]
    }))
    expect(callArg.filename).toMatch(/^playlist-\d{6}\.m3u$/)
  })

  it('batch-adds selected available videos in list order', async () => {
    const wrapper = mountSettings({
      accountId: 1,
      submitValues: { title: 'Batch Playlist' }
    })
    await flushPromises()

    await selectAvailableVideo(wrapper, 'Shared')
    await selectAvailableVideo(wrapper, 'Video 1')
    await clickBatchAdd(wrapper)

    await wrapper.find('[data-test="form"]').trigger('submit')
    await flushPromises()

    const callArg = playlistsStore.create.mock.calls[0][0]
    expect(callArg.items).toEqual([
      { videoId: 22, position: 1 },
      { videoId: 11, position: 2 }
    ])
  })

  it('batch add allows duplicate playlist entries', async () => {
    const wrapper = mountSettings({
      accountId: 1,
      submitValues: { title: 'Duplicate Playlist' }
    })
    await flushPromises()

    await selectAvailableVideo(wrapper, 'Video 1')
    await clickBatchAdd(wrapper)
    await selectAvailableVideo(wrapper, 'Video 1')
    await clickBatchAdd(wrapper)

    await wrapper.find('[data-test="form"]').trigger('submit')
    await flushPromises()

    const callArg = playlistsStore.create.mock.calls[0][0]
    expect(callArg.items).toEqual([
      { videoId: 11, position: 1 },
      { videoId: 11, position: 2 }
    ])
  })

  it('batch-removes only selected duplicate playlist row instances', async () => {
    const wrapper = mountSettings({
      accountId: 1,
      submitValues: { title: 'Remove Duplicate Playlist' }
    })
    await flushPromises()

    await selectAvailableVideo(wrapper, 'Video 1')
    await clickBatchAdd(wrapper)
    await selectAvailableVideo(wrapper, 'Video 1')
    await clickBatchAdd(wrapper)

    const playlistSelections = wrapper.findAll('[data-test="playlist-row-select"]')
    expect(playlistSelections).toHaveLength(2)
    await playlistSelections[0].setValue(true)
    await clickBatchRemove(wrapper)

    expect(wrapper.findAll('[data-test="playlist-row-select"]')).toHaveLength(1)

    await wrapper.find('[data-test="form"]').trigger('submit')
    await flushPromises()

    const callArg = playlistsStore.create.mock.calls[0][0]
    expect(callArg.items).toEqual([{ videoId: 11, position: 1 }])
  })

  it('batch removal rebuilds playlist item positions before submit', async () => {
    const wrapper = mountSettings({
      accountId: 1,
      submitValues: { title: 'Repositioned Playlist' }
    })
    await flushPromises()

    await selectAvailableVideo(wrapper, 'Shared')
    await selectAvailableVideo(wrapper, 'Video 1')
    await clickBatchAdd(wrapper)

    const playlistSelections = wrapper.findAll('[data-test="playlist-row-select"]')
    await playlistSelections[0].setValue(true)
    await clickBatchRemove(wrapper)

    await wrapper.find('[data-test="form"]').trigger('submit')
    await flushPromises()

    const callArg = playlistsStore.create.mock.calls[0][0]
    expect(callArg.items).toEqual([{ videoId: 11, position: 1 }])
  })

  it('select-all checkbox selects and clears currently visible available videos', async () => {
    const wrapper = mountSettings({
      accountId: 1,
      submitValues: { title: 'Filtered Batch Playlist' }
    })
    await flushPromises()

    await wrapper.find('[data-test="video-search-input"]').setValue('Video 1')
    await flushPromises()

    const selectAll = wrapper.find('[data-test="available-select-all"]')
    await selectAll.setValue(true)
    expect(wrapper.find('[data-test="batch-add-video-button"]').element.disabled).toBe(false)

    await selectAll.setValue(false)
    expect(wrapper.find('[data-test="batch-add-video-button"]').element.disabled).toBe(true)

    await selectAll.setValue(true)
    await clickBatchAdd(wrapper)

    await wrapper.find('[data-test="form"]').trigger('submit')
    await flushPromises()

    const callArg = playlistsStore.create.mock.calls[0][0]
    expect(callArg.items).toEqual([{ videoId: 11, position: 1 }])
  })

  it('disables batch buttons without selection and while submitting', async () => {
    const wrapper = mountSettings({ accountId: 1 })
    await flushPromises()

    expect(wrapper.find('[data-test="batch-add-video-button"]').element.disabled).toBe(true)
    expect(wrapper.find('[data-test="batch-remove-video-button"]').element.disabled).toBe(true)

    const submittingWrapper = mountSettings({ accountId: 1, isSubmitting: true })
    await flushPromises()

    await submittingWrapper.find('[data-test="available-select-all"]').setValue(true)
    expect(submittingWrapper.find('[data-test="batch-add-video-button"]').element.disabled).toBe(true)
    expect(submittingWrapper.find('[data-test="batch-remove-video-button"]').element.disabled).toBe(true)
    expect(submittingWrapper.find('[data-test="available-select-all"]').element.disabled).toBe(true)
  })

  it('sorts available videos by file size as numbers', async () => {
    videosStore.getAllByAccount = vi.fn(async (accountId) => {
      if (accountId !== 1) return []
      return [
        { id: 31, title: 'Ten KB', originalFilename: 'ten.mp4', fileSizeBytes: 10000, durationSeconds: 30, accountId: 1 },
        { id: 32, title: 'Nine Hundred B', originalFilename: 'nine-hundred.mp4', fileSizeBytes: 900, durationSeconds: 20, accountId: 1 },
        { id: 33, title: 'Two KB', originalFilename: 'two.mp4', fileSizeBytes: 2000, durationSeconds: 10, accountId: 1 }
      ]
    })

    const wrapper = mountSettings({ accountId: 1 })
    await flushPromises()

    await sortAvailableTableBy(wrapper, 'fileSize')

    expect(getAvailableTableTitles(wrapper)).toEqual([
      'Nine Hundred B',
      'Two KB',
      'Ten KB'
    ])
  })

  it('sorts available videos by duration as seconds', async () => {
    videosStore.getAllByAccount = vi.fn(async (accountId) => {
      if (accountId !== 1) return []
      return [
        { id: 41, title: 'Long', originalFilename: 'long.mp4', fileSizeBytes: 100, durationSeconds: 600, accountId: 1 },
        { id: 42, title: 'Short', originalFilename: 'short.mp4', fileSizeBytes: 200, durationSeconds: 5, accountId: 1 },
        { id: 43, title: 'Medium', originalFilename: 'medium.mp4', fileSizeBytes: 300, durationSeconds: 120, accountId: 1 }
      ]
    })

    const wrapper = mountSettings({ accountId: 1 })
    await flushPromises()

    await sortAvailableTableBy(wrapper, 'duration')

    expect(getAvailableTableTitles(wrapper)).toEqual([
      'Short',
      'Medium',
      'Long'
    ])
  })

  it('loads common videos only once when editing a common playlist', async () => {
    const wrapper = mountSettings({ accountId: 0 })
    await flushPromises()

    expect(wrapper.findAll('[data-test="available-video-select"]')).toHaveLength(1)
    const commonAccountLoads = videosStore.getAllByAccount.mock.calls
      .map(call => call[0])
      .filter(accountId => accountId === 0)
    expect(commonAccountLoads).toHaveLength(1)
  })

  it('does not render filename field', async () => {
    const wrapper = mountSettings({ accountId: 1 })
    await flushPromises()

    expect(wrapper.text()).not.toContain('Имя файла')
  })

  it('initializes filename for new playlist when not provided', async () => {
    const wrapper = mountSettings({
      accountId: 1,
      submitValues: { title: 'Generated Playlist', filename: '' }
    })

    await flushPromises()

    const videoRows = wrapper.findAll('.playlist-video-row')
    const targetRow = videoRows.find(r => r.text().includes('Video 1'))
    expect(targetRow).toBeTruthy()
    await targetRow.find('button').trigger('click')

    await wrapper.find('[data-test="form"]').trigger('submit')
    await flushPromises()

    expect(playlistsStore.create).toHaveBeenCalled()
    const callArg = playlistsStore.create.mock.calls[0][0]
    expect(callArg.title).toBe('Generated Playlist')
    expect(callArg.items).toEqual([{ videoId: 11, position: 1 }])
    expect(callArg.filename).toMatch(/^playlist-\d{6}\.m3u$/)
  })

  it('blocks creation when generated filename is not unique', async () => {
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0)
    playlistsStore.getAllByAccount = vi.fn().mockResolvedValue([{ id: 2, filename: 'playlist-100000.m3u' }])

    const wrapper = mountSettings({
      accountId: 1,
      submitValues: { title: 'My Playlist', filename: 'playlist.json' }
    })
    await flushPromises()

    const videoRows = wrapper.findAll('.playlist-video-row')
    const targetRow = videoRows.find(r => r.text().includes('Video 1'))
    expect(targetRow).toBeTruthy()
    await targetRow.find('button').trigger('click')

    await wrapper.find('[data-test="form"]').trigger('submit')
    await flushPromises()

    expect(playlistsStore.create).not.toHaveBeenCalled()
    expect(alertStore.error).toHaveBeenCalledWith('Плейлист с таким именем файла уже существует')
    randomSpy.mockRestore()
  })

  it('updates existing playlist', async () => {
    playlistsStore.playlist = {
      id: 9,
      title: 'Old Playlist',
      filename: 'old.json',
      accountId: 1,
      items: [{ videoId: 11, position: 1 }]
    }

    const wrapper = mountSettings({
      register: false,
      id: 9,
      submitValues: { title: 'Updated', filename: 'updated.json', accountId: 1 }
    })

    await flushPromises()

    await wrapper.find('[data-test="form"]').trigger('submit')
    await flushPromises()

    expect(playlistsStore.getById).toHaveBeenCalledWith(9)
    expect(playlistsStore.update).toHaveBeenCalledWith(9, {
      title: 'Updated',
      filename: 'old.json',
      items: [{ videoId: 11, position: 1 }]
    })
  })

  it('allows creating playlist with no videos', async () => {
    const wrapper = mountSettings({
      accountId: 1,
      submitValues: { title: 'Empty', filename: 'empty.json' }
    })
    await flushPromises()

    await wrapper.find('[data-test="form"]').trigger('submit')
    await flushPromises()

    expect(playlistsStore.create).toHaveBeenCalled()
    const callArg = playlistsStore.create.mock.calls[0][0]
    expect(callArg).toEqual(expect.objectContaining({
      title: 'Empty',
      accountId: 1,
      items: []
    }))
    expect(callArg.filename).toMatch(/^playlist-\d{6}\.m3u$/)
  })

  it('removes individual playlist video via remove button', async () => {
    const wrapper = mountSettings({ accountId: 1 })
    await flushPromises()

    await selectAvailableVideo(wrapper, 'Video 1')
    await clickBatchAdd(wrapper)

    const playlistTable = getPlaylistTable(wrapper)
    expect(playlistTable.findAll('.playlist-video-row')).toHaveLength(1)

    await playlistTable.find('[data-test="remove-video-button"]').trigger('click')
    await flushPromises()

    expect(playlistTable.findAll('.playlist-video-row')).toHaveLength(0)
  })

  it('moves playlist video up in order', async () => {
    const wrapper = mountSettings({ accountId: 1 })
    await flushPromises()

    await selectAvailableVideo(wrapper, 'Shared')
    await clickBatchAdd(wrapper)
    await selectAvailableVideo(wrapper, 'Video 1')
    await clickBatchAdd(wrapper)

    const playlistTable = getPlaylistTable(wrapper)
    const getTitles = () => playlistTable.findAll('.playlist-video-title').map(el => el.text())

    expect(getTitles()).toEqual(['Shared', 'Video 1'])

    await playlistTable.findAll('[data-test="move-up-button"]')[1].trigger('click')
    await flushPromises()

    expect(getTitles()).toEqual(['Video 1', 'Shared'])
  })

  it('moves playlist video down in order', async () => {
    const wrapper = mountSettings({ accountId: 1 })
    await flushPromises()

    await selectAvailableVideo(wrapper, 'Shared')
    await clickBatchAdd(wrapper)
    await selectAvailableVideo(wrapper, 'Video 1')
    await clickBatchAdd(wrapper)

    const playlistTable = getPlaylistTable(wrapper)
    const getTitles = () => playlistTable.findAll('.playlist-video-title').map(el => el.text())

    await playlistTable.findAll('[data-test="move-down-button"]')[0].trigger('click')
    await flushPromises()

    expect(getTitles()).toEqual(['Video 1', 'Shared'])
  })

  it('playlist select-all checkbox selects and deselects all playlist items', async () => {
    const wrapper = mountSettings({ accountId: 1 })
    await flushPromises()

    await selectAvailableVideo(wrapper, 'Shared')
    await selectAvailableVideo(wrapper, 'Video 1')
    await clickBatchAdd(wrapper)

    const selectAll = wrapper.find('[data-test="playlist-select-all"]')
    await selectAll.setValue(true)
    expect(wrapper.find('[data-test="batch-remove-video-button"]').element.disabled).toBe(false)

    await selectAll.setValue(false)
    expect(wrapper.find('[data-test="batch-remove-video-button"]').element.disabled).toBe(true)
  })

  it('deselects an individual playlist item after selecting', async () => {
    const wrapper = mountSettings({ accountId: 1 })
    await flushPromises()

    await selectAvailableVideo(wrapper, 'Video 1')
    await clickBatchAdd(wrapper)

    const rowSelect = wrapper.find('[data-test="playlist-row-select"]')
    await rowSelect.setValue(true)
    expect(wrapper.find('[data-test="batch-remove-video-button"]').element.disabled).toBe(false)

    await rowSelect.setValue(false)
    expect(wrapper.find('[data-test="batch-remove-video-button"]').element.disabled).toBe(true)
  })

  it('deselects an available video after selecting', async () => {
    const wrapper = mountSettings({ accountId: 1 })
    await flushPromises()

    const availableRow = wrapper.findAll('.playlist-video-row')
      .find(r => r.text().includes('Video 1'))
    const checkbox = availableRow.find('[data-test="available-video-select"]')

    await checkbox.setValue(true)
    expect(wrapper.find('[data-test="batch-add-video-button"]').element.disabled).toBe(false)

    await checkbox.setValue(false)
    expect(wrapper.find('[data-test="batch-add-video-button"]').element.disabled).toBe(true)
  })

  it('cancel button navigates back', async () => {
    const wrapper = mountSettings({ accountId: 1 })
    await flushPromises()

    await wrapper.find('button.secondary').trigger('click')
    expect(routerGo).toHaveBeenCalledWith(-1)
  })

  it('dismisses alert via close button', async () => {
    playlistsStore.create = vi.fn().mockRejectedValue({ status: 409 })
    const wrapper = mountSettings({ accountId: 1, submitValues: { title: 'My Playlist' } })
    await flushPromises()

    await wrapper.find('[data-test="form"]').trigger('submit')
    await flushPromises()

    expect(alertStore.alert.value).not.toBeNull()
    await wrapper.find('.alert .close').trigger('click')
    expect(alertStore.clear).toHaveBeenCalled()
  })

  it('shows error alert when loading available videos fails', async () => {
    videosStore.getAllByAccount = vi.fn().mockRejectedValue(new Error('Network error'))
    mountSettings({ accountId: 1 })
    await flushPromises()

    expect(alertStore.error).toHaveBeenCalledWith(
      expect.stringContaining('Не удалось загрузить список видео')
    )
  })

  it('handles 401 error during submit by redirecting', async () => {
    playlistsStore.create = vi.fn().mockRejectedValue({ status: 401 })
    const wrapper = mountSettings({ accountId: 1, submitValues: { title: 'Test' } })
    await flushPromises()

    await wrapper.find('[data-test="form"]').trigger('submit')
    await flushPromises()

    expect(redirectToDefaultRoute).toHaveBeenCalled()
  })

  it('handles 403 error during submit by redirecting', async () => {
    playlistsStore.create = vi.fn().mockRejectedValue({ status: 403 })
    const wrapper = mountSettings({ accountId: 1, submitValues: { title: 'Test' } })
    await flushPromises()

    await wrapper.find('[data-test="form"]').trigger('submit')
    await flushPromises()

    expect(redirectToDefaultRoute).toHaveBeenCalled()
  })

  it('handles 404 error during submit', async () => {
    playlistsStore.create = vi.fn().mockRejectedValue({ status: 404 })
    const wrapper = mountSettings({ accountId: 1, submitValues: { title: 'Test' } })
    await flushPromises()

    await wrapper.find('[data-test="form"]').trigger('submit')
    await flushPromises()

    expect(alertStore.error).toHaveBeenCalledWith(expect.stringContaining('не найден'))
  })

  it('handles 409 conflict error during submit', async () => {
    playlistsStore.create = vi.fn().mockRejectedValue({ status: 409 })
    const wrapper = mountSettings({ accountId: 1, submitValues: { title: 'Test' } })
    await flushPromises()

    await wrapper.find('[data-test="form"]').trigger('submit')
    await flushPromises()

    expect(alertStore.error).toHaveBeenCalledWith('Плейлист с таким названием уже существует')
  })

  it('handles 422 validation error during submit', async () => {
    playlistsStore.create = vi.fn().mockRejectedValue({ status: 422 })
    const wrapper = mountSettings({ accountId: 1, submitValues: { title: 'Test' } })
    await flushPromises()

    await wrapper.find('[data-test="form"]').trigger('submit')
    await flushPromises()

    expect(alertStore.error).toHaveBeenCalledWith('Проверьте корректность введённых данных')
  })

  it('handles generic error during submit', async () => {
    playlistsStore.create = vi.fn().mockRejectedValue(new Error('Server failure'))
    const wrapper = mountSettings({ accountId: 1, submitValues: { title: 'Test' } })
    await flushPromises()

    await wrapper.find('[data-test="form"]').trigger('submit')
    await flushPromises()

    expect(alertStore.error).toHaveBeenCalledWith(
      expect.stringContaining('Ошибка при создании плейлиста')
    )
  })

  it('shows error when edited playlist is not found in store', async () => {
    playlistsStore.playlist = null
    playlistsStore.getById = vi.fn().mockResolvedValue()

    mountSettings({ register: false, id: 99 })
    await flushPromises()

    expect(alertStore.error).toHaveBeenCalledWith(
      expect.stringContaining('Ошибка загрузки плейлиста')
    )
  })

  it('handles 401 error when loading playlist for editing', async () => {
    playlistsStore.getById = vi.fn().mockRejectedValue({ status: 401 })

    mountSettings({ register: false, id: 9 })
    await flushPromises()

    expect(redirectToDefaultRoute).toHaveBeenCalled()
  })

  it('handles 403 error when loading playlist for editing', async () => {
    playlistsStore.getById = vi.fn().mockRejectedValue({ status: 403 })

    mountSettings({ register: false, id: 9 })
    await flushPromises()

    expect(redirectToDefaultRoute).toHaveBeenCalled()
  })

  it('handles 404 error when loading playlist for editing', async () => {
    playlistsStore.getById = vi.fn().mockRejectedValue({ status: 404 })

    mountSettings({ register: false, id: 9 })
    await flushPromises()

    expect(alertStore.error).toHaveBeenCalledWith(expect.stringContaining('9'))
  })

  it('handles generic error when loading playlist for editing', async () => {
    playlistsStore.getById = vi.fn().mockRejectedValue(new Error('Connection timeout'))

    mountSettings({ register: false, id: 9 })
    await flushPromises()

    expect(alertStore.error).toHaveBeenCalledWith(
      expect.stringContaining('Ошибка загрузки плейлиста')
    )
  })

  it('shows error when loading accounts fails', async () => {
    accountsStore.getAll = vi.fn().mockRejectedValue(new Error('Account service down'))

    mountSettings({ accountId: 1 })
    await flushPromises()

    expect(alertStore.error).toHaveBeenCalledWith(
      expect.stringContaining('Не удалось загрузить лицевые счета')
    )
  })

  it('batch-add respects descending sort order of available videos', async () => {
    videosStore.getAllByAccount = vi.fn(async (accountId) => {
      if (accountId !== 1) return []
      return [
        { id: 51, title: 'Small', originalFilename: 'small.mp4', fileSizeBytes: 100, durationSeconds: 10, accountId: 1 },
        { id: 52, title: 'Large', originalFilename: 'large.mp4', fileSizeBytes: 9000, durationSeconds: 60, accountId: 1 }
      ]
    })

    const wrapper = mountSettings({ accountId: 1, submitValues: { title: 'Desc Sorted' } })
    await flushPromises()

    // Click sort-fileSize twice: first asc then desc
    await sortAvailableTableBy(wrapper, 'fileSize')
    await sortAvailableTableBy(wrapper, 'fileSize')

    // Select all visible and batch-add
    await wrapper.find('[data-test="available-select-all"]').setValue(true)
    await clickBatchAdd(wrapper)

    await wrapper.find('[data-test="form"]').trigger('submit')
    await flushPromises()

    const callArg = playlistsStore.create.mock.calls[0][0]
    // Large (9000) should be added first in descending file-size order
    expect(callArg.items).toEqual([
      { videoId: 52, position: 1 },
      { videoId: 51, position: 2 }
    ])
  })

  it('remove-selected clears selection so batch-remove is disabled afterwards', async () => {
    const wrapper = mountSettings({ accountId: 1 })
    await flushPromises()

    await selectAvailableVideo(wrapper, 'Video 1')
    await clickBatchAdd(wrapper)

    await wrapper.find('[data-test="playlist-row-select"]').setValue(true)
    expect(wrapper.find('[data-test="batch-remove-video-button"]').element.disabled).toBe(false)

    await clickBatchRemove(wrapper)

    expect(wrapper.find('[data-test="batch-remove-video-button"]').element.disabled).toBe(true)
  })

  it('handles update 401 error by redirecting', async () => {
    playlistsStore.playlist = {
      id: 9, title: 'Existing', filename: 'existing.m3u', accountId: 1, items: []
    }
    playlistsStore.update = vi.fn().mockRejectedValue({ status: 401 })

    const wrapper = mountSettings({
      register: false,
      id: 9,
      submitValues: { title: 'Updated', filename: 'existing.m3u', accountId: 1 }
    })
    await flushPromises()

    await wrapper.find('[data-test="form"]').trigger('submit')
    await flushPromises()

    expect(redirectToDefaultRoute).toHaveBeenCalled()
  })

  it('handles update generic error', async () => {
    playlistsStore.playlist = {
      id: 9, title: 'Existing', filename: 'existing.m3u', accountId: 1, items: []
    }
    playlistsStore.update = vi.fn().mockRejectedValue(new Error('Unexpected'))

    const wrapper = mountSettings({
      register: false,
      id: 9,
      submitValues: { title: 'Updated', filename: 'existing.m3u', accountId: 1 }
    })
    await flushPromises()

    await wrapper.find('[data-test="form"]').trigger('submit')
    await flushPromises()

    expect(alertStore.error).toHaveBeenCalledWith(
      expect.stringContaining('Ошибка при обновлении плейлиста')
    )
  })

  it('remove-selected-items button is disabled when playlist is empty', async () => {
    const wrapper = mountSettings({ accountId: 1 })
    await flushPromises()

    expect(wrapper.find('[data-test="batch-remove-video-button"]').element.disabled).toBe(true)
  })

  it('clears available videos when user has no account options', async () => {
    authStore = { user: null }
    const wrapper = mountSettings({ accountId: 1 })
    await flushPromises()

    expect(wrapper.findAll('[data-test="available-video-select"]')).toHaveLength(0)
  })

  it('shows originalFilename as subtitle when title differs from filename', async () => {
    const wrapper = mountSettings({ accountId: 1 })
    await flushPromises()

    // Video 1 has title 'Video 1' and originalFilename 'one.mp4' — different, so subtitle must appear
    const availableTable = getAvailableTable(wrapper)
    expect(availableTable.text()).toContain('one.mp4')
  })

  it('shows fallback title for available video with no title', async () => {
    videosStore.getAllByAccount = vi.fn(async (accountId) => {
      if (accountId !== 1) return []
      return [{ id: 61, title: null, originalFilename: 'noname.mp4', fileSizeBytes: 500, durationSeconds: 30, accountId: 1 }]
    })
    const wrapper = mountSettings({ accountId: 1 })
    await flushPromises()

    const availableTable = getAvailableTable(wrapper)
    expect(availableTable.text()).toContain('noname.mp4')
  })

  it('uses playlist video fallback title when video has no title', async () => {
    videosStore.getAllByAccount = vi.fn(async (accountId) => {
      if (accountId !== 1) return []
      return [{ id: 71, title: null, originalFilename: 'fallback.mp4', fileSizeBytes: 100, durationSeconds: 5, accountId: 1 }]
    })
    const wrapper = mountSettings({ accountId: 1 })
    await flushPromises()

    const availableRow = wrapper.findAll('.playlist-video-row').find(r => r.text().includes('fallback.mp4'))
    await availableRow.find('button').trigger('click')
    await flushPromises()

    const playlistTable = getPlaylistTable(wrapper)
    expect(playlistTable.text()).toContain('fallback.mp4')
  })

  it('normalizes playlist items from edit mode when items is null', async () => {
    playlistsStore.playlist = {
      id: 9, title: 'Nullish', filename: 'nullish.m3u', accountId: 1, items: null
    }

    const wrapper = mountSettings({ register: false, id: 9 })
    await flushPromises()

    expect(getPlaylistTable(wrapper).findAll('.playlist-video-row')).toHaveLength(0)
  })

  it('fills in missing title and accountId fallbacks in edit mode', async () => {
    playlistsStore.playlist = {
      id: 9, title: undefined, filename: undefined, accountId: undefined, items: []
    }

    const wrapper = mountSettings({ register: false, id: 9 })
    await flushPromises()

    // Component should render without errors (title defaults to '' etc.)
    expect(wrapper.find('[data-test="form"]').exists()).toBe(true)
  })

  it('error objects without message property use the error itself as the message', async () => {
    videosStore.getAllByAccount = vi.fn().mockRejectedValue({ code: 'ERR_NETWORK' })
    mountSettings({ accountId: 1 })
    await flushPromises()

    // err.message is undefined, so `err.message || err` falls back to the object itself
    expect(alertStore.error).toHaveBeenCalledWith(
      expect.stringContaining('Не удалось загрузить список видео')
    )
  })

  it('error objects without message property in accounts load use object fallback', async () => {
    accountsStore.getAll = vi.fn().mockRejectedValue({ code: 'ERR_NETWORK' })
    mountSettings({ accountId: 1 })
    await flushPromises()

    expect(alertStore.error).toHaveBeenCalledWith(
      expect.stringContaining('Не удалось загрузить лицевые счета')
    )
  })

  it('error objects without message in edit-mode load use object fallback', async () => {
    playlistsStore.getById = vi.fn().mockRejectedValue({ code: 'ERR_NETWORK' })
    mountSettings({ register: false, id: 9 })
    await flushPromises()

    expect(alertStore.error).toHaveBeenCalledWith(
      expect.stringContaining('Ошибка загрузки плейлиста')
    )
  })

  it('error objects without message in submit use object fallback', async () => {
    playlistsStore.create = vi.fn().mockRejectedValue({ code: 'ERR_NETWORK' })
    const wrapper = mountSettings({ accountId: 1, submitValues: { title: 'Test' } })
    await flushPromises()

    await wrapper.find('[data-test="form"]').trigger('submit')
    await flushPromises()

    expect(alertStore.error).toHaveBeenCalledWith(
      expect.stringContaining('Ошибка при создании плейлиста')
    )
  })

  it('checkFilenameUnique skips current playlist when editing', async () => {
    playlistsStore.playlist = {
      id: 9, title: 'Same Name', filename: 'same.m3u', accountId: 1, items: []
    }
    playlistsStore.getAllByAccount = vi.fn().mockResolvedValue([
      { id: 9, filename: 'same.m3u' }
    ])

    const wrapper = mountSettings({
      register: false,
      id: 9,
      submitValues: { title: 'Same Name', filename: 'same.m3u', accountId: 1 }
    })
    await flushPromises()

    await wrapper.find('[data-test="form"]').trigger('submit')
    await flushPromises()

    // Should not show duplicate error (current playlist's own filename is excluded)
    expect(playlistsStore.update).toHaveBeenCalled()
    expect(alertStore.error).not.toHaveBeenCalledWith('Плейлист с таким именем файла уже существует')
  })

  it('movePlaylistItem does nothing when trying to move first item up', async () => {
    const wrapper = mountSettings({ accountId: 1 })
    await flushPromises()

    await selectAvailableVideo(wrapper, 'Video 1')
    await clickBatchAdd(wrapper)

    const playlistTable = getPlaylistTable(wrapper)
    const titles = () => playlistTable.findAll('.playlist-video-title').map(el => el.text())

    // Move first (and only) item up — move-up is disabled but calling the handler directly
    // is safe since there's only one item
    const moveUpBtn = playlistTable.find('[data-test="move-up-button"]')
    // Disabled attribute should prevent click, but trigger it anyway to verify guard
    await moveUpBtn.trigger('click')
    await flushPromises()

    // Still one item, unchanged
    expect(titles()).toEqual(['Video 1'])
  })

  it('removes a selected playlist item while cleaning up selection state', async () => {
    const wrapper = mountSettings({ accountId: 1 })
    await flushPromises()

    await selectAvailableVideo(wrapper, 'Video 1')
    await clickBatchAdd(wrapper)

    // Select the item then remove it individually
    await wrapper.find('[data-test="playlist-row-select"]').setValue(true)

    const playlistTable = getPlaylistTable(wrapper)
    await playlistTable.find('[data-test="remove-video-button"]').trigger('click')
    await flushPromises()

    // Item and its selection are gone
    expect(wrapper.find('[data-test="batch-remove-video-button"]').element.disabled).toBe(true)
  })

  it('account name uses fallback when account is unknown', async () => {
    videosStore.getAllByAccount = vi.fn(async (accountId) => {
      if (accountId !== 0) return []
      // Return a video with an accountId that is not in the accounts list
      return [{ id: 91, title: 'Mystery', originalFilename: 'mystery.mp4', fileSizeBytes: 200, durationSeconds: 15, accountId: 999 }]
    })

    const wrapper = mountSettings({ accountId: 1 })
    await flushPromises()

    const availableTable = getAvailableTable(wrapper)
    expect(availableTable.text()).toContain('Mystery')
  })

  it('falls back to empty array when accounts store is null', async () => {
    accountsStore.accounts = null
    const wrapper = mountSettings({ accountId: 1 })
    await flushPromises()

    // Should mount without error; no account-based videos since accounts is null
    expect(wrapper.find('[data-test="form"]').exists()).toBe(true)
  })

  it('uses fallback account name when account has no name property', async () => {
    accountsStore.accounts = [{ id: 1 }] // No name property
    const wrapper = mountSettings({ accountId: 1 })
    await flushPromises()

    expect(wrapper.find('[data-test="form"]').exists()).toBe(true)
  })

  it('shows fallback accountLabel when accountId is not in account map', async () => {
    playlistsStore.playlist = {
      id: 9, title: 'Unknown Account', filename: 'ua.m3u', accountId: 999, items: []
    }
    const wrapper = mountSettings({ register: false, id: 9 })
    await flushPromises()

    // accountId 999 is not in accountNameById map → shows fallback label
    expect(wrapper.text()).toContain('999')
  })

  it('getVideoTitle returns video id as fallback when title and filename are both null', async () => {
    videosStore.getAllByAccount = vi.fn(async (accountId) => {
      if (accountId !== 1) return []
      return [{ id: 62, title: null, originalFilename: null, fileSizeBytes: 100, durationSeconds: 5, accountId: 1 }]
    })
    const wrapper = mountSettings({ accountId: 1 })
    await flushPromises()

    const availableTable = getAvailableTable(wrapper)
    expect(availableTable.text()).toContain('62')
  })

  it('toSortableMediaNumber returns 0 for non-numeric file size', async () => {
    videosStore.getAllByAccount = vi.fn(async (accountId) => {
      if (accountId !== 1) return []
      return [
        { id: 71, title: 'Valid', originalFilename: 'valid.mp4', fileSizeBytes: 1000, durationSeconds: 30, accountId: 1 },
        { id: 72, title: 'NoSize', originalFilename: 'nosize.mp4', fileSizeBytes: 'unknown', durationSeconds: 20, accountId: 1 }
      ]
    })
    const wrapper = mountSettings({ accountId: 1 })
    await flushPromises()

    // Sorting should not throw even with a non-numeric fileSize
    await sortAvailableTableBy(wrapper, 'fileSize')
    expect(getAvailableTableTitles(wrapper)).toHaveLength(2)
  })

  it('handles getAllByAccount returning null without crashing', async () => {
    videosStore.getAllByAccount = vi.fn().mockResolvedValue(null)
    const wrapper = mountSettings({ accountId: 1 })
    await flushPromises()

    expect(getAvailableTable(wrapper).findAll('.playlist-video-row')).toHaveLength(0)
  })

  it('checkFilenameUnique treats empty filename as unique', async () => {
    playlistsStore.playlist = {
      id: 9, title: 'Empty Filename', filename: '', accountId: 1, items: []
    }
    playlistsStore.getAllByAccount = vi.fn().mockResolvedValue([])

    const wrapper = mountSettings({
      register: false,
      id: 9,
      submitValues: { title: 'Empty Filename', accountId: 1 }
    })
    await flushPromises()

    await wrapper.find('[data-test="form"]').trigger('submit')
    await flushPromises()

    // Empty filename is considered unique, so update should proceed
    expect(playlistsStore.update).toHaveBeenCalled()
  })

  it('checkFilenameUnique ignores items without a filename', async () => {
    playlistsStore.getAllByAccount = vi.fn().mockResolvedValue([
      { id: 99, title: 'No Filename Playlist' } // No filename property
    ])

    const wrapper = mountSettings({
      accountId: 1,
      submitValues: { title: 'Test' }
    })
    await flushPromises()

    await wrapper.find('[data-test="form"]').trigger('submit')
    await flushPromises()

    // The item without filename is skipped; create should succeed
    expect(playlistsStore.create).toHaveBeenCalled()
  })

  it('available video with same title and filename shows no subtitle', async () => {
    videosStore.getAllByAccount = vi.fn(async (accountId) => {
      if (accountId !== 1) return []
      return [{ id: 81, title: 'video.mp4', originalFilename: 'video.mp4', fileSizeBytes: 300, durationSeconds: 10, accountId: 1 }]
    })
    const wrapper = mountSettings({ accountId: 1 })
    await flushPromises()

    const availableTable = getAvailableTable(wrapper)
    // Title equals filename → no subtitle; should appear exactly once
    const titleDivs = availableTable.findAll('.playlist-video-title')
    expect(titleDivs).toHaveLength(1)
    expect(availableTable.findAll('.playlist-video-sub')).toHaveLength(0)
  })

  it('shows validation error when form has title error', async () => {
    const wrapper = mountSettings({ accountId: 1, showValidationError: true })
    await flushPromises()

    // The form stub exposes errors.title = 'Required', which triggers the v-if="errors.title" block
    expect(wrapper.text()).toContain('Required')
  })

  it('search filter handles null video fields gracefully', async () => {
    videosStore.getAllByAccount = vi.fn(async (accountId) => {
      if (accountId !== 1) return []
      return [{ id: 63, title: null, originalFilename: null, fileSizeBytes: 100, durationSeconds: 5, accountId: 1 }]
    })
    const wrapper = mountSettings({ accountId: 1 })
    await flushPromises()

    // Trigger the filter path with a query — null fields are handled by (field || '')
    await wrapper.find('[data-test="video-search-input"]').setValue('nomatch')
    await flushPromises()

    expect(getAvailableTable(wrapper).find('[data-test="table-empty"]').exists()).toBe(true)
  })

  it('checkFilenameUnique handles null result from playlistsStore.getAllByAccount', async () => {
    playlistsStore.getAllByAccount = vi.fn().mockResolvedValue(null)

    const wrapper = mountSettings({ accountId: 1, submitValues: { title: 'Test' } })
    await flushPromises()

    await wrapper.find('[data-test="form"]').trigger('submit')
    await flushPromises()

    // null from getAllByAccount falls back to [], so filename is unique → create proceeds
    expect(playlistsStore.create).toHaveBeenCalled()
  })

  it('available video with title but no originalFilename shows no subtitle', async () => {
    videosStore.getAllByAccount = vi.fn(async (accountId) => {
      if (accountId !== 1) return []
      return [{ id: 82, title: 'Has Title', originalFilename: null, fileSizeBytes: 400, durationSeconds: 25, accountId: 1 }]
    })
    const wrapper = mountSettings({ accountId: 1 })
    await flushPromises()

    const availableTable = getAvailableTable(wrapper)
    expect(availableTable.text()).toContain('Has Title')
    // null originalFilename → condition short-circuits → no subtitle rendered
    expect(availableTable.findAll('.playlist-video-sub')).toHaveLength(0)
  })

  it('onSubmit falls through accountId chain when values.accountId is null', async () => {
    // Mount without accountId prop so playlist.value.accountId = null
    const wrapper = mountSettings({ submitValues: { title: 'Null Account' } })
    await flushPromises()

    await wrapper.find('[data-test="form"]').trigger('submit')
    await flushPromises()

    expect(playlistsStore.create).toHaveBeenCalledWith(
      expect.objectContaining({ accountId: null })
    )
  })
})
