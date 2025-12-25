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
        template: '<form data-test="form" @submit.prevent="onSubmit"><slot :errors="errors" :isSubmitting="false" /></form>',
        props: ['validationSchema', 'initialValues'],
        emits: ['submit'],
        data() {
          return { errors: props.showValidationError ? { title: 'Required' } : {} }
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
      'v-text-field': { template: '<input />', props: ['modelValue'] }
    },
    mocks: {
      $router: { go: routerGo }
    }
  }
})

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

    expect(playlistsStore.create).toHaveBeenCalledWith({
      title: 'My Playlist',
      filename: 'playlist.json',
      accountId: 1,
      items: [{ videoId: 11, position: 1 }]
    })
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

  it('blocks creation when filename is not unique', async () => {
    playlistsStore.getAllByAccount = vi.fn().mockResolvedValue([{ id: 2, filename: 'playlist.json' }])

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
      filename: 'updated.json',
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

    expect(playlistsStore.create).toHaveBeenCalledWith({
      title: 'Empty',
      filename: 'empty.json',
      accountId: 1,
      items: []
    })
  })
})
