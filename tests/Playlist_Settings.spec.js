/* @vitest-environment jsdom */
// Copyright (c) 2025 sw.consulting
// This file is a part of Media Pi  frontend application

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import PlaylistSettings from '@/components/Playlist_Settings.vue'

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
        props: ['headers', 'items', 'loading', 'loadingText', 'noDataText'],
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
})
