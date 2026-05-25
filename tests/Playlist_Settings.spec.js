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
        return [{ id: 11, title: 'Video 1', originalFilename: 'one.mp4', fileSize: 1200, duration: 60, accountId: 1 }]
      }
      if (accountId === 0) {
        return [{ id: 22, title: 'Shared', originalFilename: 'shared.mp4', fileSize: 2400, duration: 90, accountId: 0 }]
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
