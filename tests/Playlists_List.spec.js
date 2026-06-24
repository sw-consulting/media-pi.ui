/* @vitest-environment jsdom */
// Copyright (c) 2025 sw.consulting
// This file is a part of Media Pi  frontend application

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref, nextTick } from 'vue'
import PlaylistsList from '@/components/Playlists_List.vue'

const routerPush = vi.hoisted(() => vi.fn())

let currentUser

const makeAuthStore = () => ({
  user: currentUser,
  playlists_per_page: 10,
  playlists_search: '',
  playlists_sort_by: [],
  playlists_page: 1
})

const accountsStore = {
  accounts: ref([]),
  loading: ref(false),
  error: ref(null),
  getAll: vi.fn(async () => accountsStore.accounts.value)
}

const playlistsStore = {
  playlists: ref([]),
  loading: ref(false),
  error: ref(null),
  getAllByAccount: vi.fn(async () => playlistsStore.playlists.value),
  remove: vi.fn(async () => ({}))
}

const alertStore = {
  alert: ref(null),
  success: vi.fn((message) => { alertStore.alert.value = { message, type: 'alert-success' } }),
  error: vi.fn((message) => { alertStore.alert.value = { message, type: 'alert-danger' } }),
  clear: vi.fn()
}

const confirmation = { confirmDelete: vi.fn(async () => true) }

vi.mock('@/stores/accounts.store.js', () => ({ useAccountsStore: () => accountsStore }))
vi.mock('@/stores/playlists.store.js', () => ({ usePlaylistsStore: () => playlistsStore }))
vi.mock('@/stores/auth.store.js', () => ({ useAuthStore: () => makeAuthStore() }))
vi.mock('@/stores/alert.store.js', () => ({ useAlertStore: () => alertStore }))
vi.mock('@/helpers/confirmation.js', () => ({ useConfirmation: () => confirmation }))
vi.mock('@/router', () => ({ default: { push: routerPush } }))
vi.mock('@sw-consulting/tooling.ui.kit', () => ({
  ActionButton: { name: 'ActionButton', props: ['item', 'icon', 'tooltipText', 'disabled'], emits: ['click'], template: '<button :disabled="disabled" @click="$emit(\'click\', item)"></button>' }
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
    props: ['items', 'headers', 'noDataText', 'noResultsText'],
    template: `
      <div class="data-table">
        <div v-for="header in headers" :key="header.key" :data-test="'table-header-' + header.key">{{ header.title }}</div>
        <div v-if="!items.length" data-test="table-empty">{{ noDataText }}</div>
        <div v-for="item in items" :key="item.id">
          <slot name="item.updatedAtSortKey" :item="item" />
          <slot name="item.totalFileSizeBytes" :item="item" />
          <slot name="item.totalDurationSeconds" :item="item" />
          <slot name="item.actions" :item="item" />
        </div>
      </div>
    `
  },
  'v-text-field': { props: ['modelValue'], emits: ['update:modelValue'], template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />' }
}

describe('Playlists_List.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    accountsStore.accounts.value = []
    playlistsStore.playlists.value = []
    currentUser = { roles: [1], accountIds: [] }
  })

  it('loads playlists for default and changed account selection', async () => {
    accountsStore.accounts.value = [
      { id: 5, name: 'Five' },
      { id: 6, name: 'Six' }
    ]
    const wrapper = mount(PlaylistsList, { global: { stubs: globalStubs } })

    await flushPromises()
    expect(accountsStore.getAll).toHaveBeenCalled()
    expect(playlistsStore.getAllByAccount).toHaveBeenCalledWith(5)

    wrapper.vm.selectedAccountId = 6
    await nextTick()
    await flushPromises()
    expect(playlistsStore.getAllByAccount).toHaveBeenCalledWith(6)
  })

  it('routes to create playlist', async () => {
    accountsStore.accounts.value = [ { id: 5, name: 'Five' } ]
    const wrapper = mount(PlaylistsList, { global: { stubs: globalStubs } })
    await flushPromises()
    await wrapper.find('[data-test="create-playlist-button"]').trigger('click')
    expect(routerPush).toHaveBeenCalledWith({ path: '/playlist/create', query: { accountId: 5 } })
  })

  it('routes to edit playlist', async () => {
    playlistsStore.playlists.value = [{ id: 1, title: 'Playlist', filename: 'list.json' }]
    const wrapper = mount(PlaylistsList, { global: { stubs: globalStubs } })
    await flushPromises()
    await wrapper.find('[data-test="edit-playlist-button"]').trigger('click')
    expect(routerPush).toHaveBeenCalledWith('/playlist/edit/1')
  })

  it('deletes playlist after confirmation', async () => {
    playlistsStore.playlists.value = [{ id: 9, title: 'Playlist', filename: 'list.json' }]
    const wrapper = mount(PlaylistsList, { global: { stubs: globalStubs } })
    await flushPromises()
    await wrapper.find('[data-test="delete-playlist-button"]').trigger('click')
    expect(playlistsStore.remove).toHaveBeenCalledWith(9)
  })

  it('formats file size and duration slots', async () => {
    playlistsStore.playlists.value = [{ id: 2, totalFileSizeBytes: 1024, totalDurationSeconds: 65 }]
    const wrapper = mount(PlaylistsList, { global: { stubs: globalStubs } })
    await flushPromises()
    expect(wrapper.text()).toContain('1.0 КБ')
    expect(wrapper.text()).toContain('1:05')
  })

  it('renders updated playlist timestamp column', async () => {
    playlistsStore.playlists.value = [{
      id: 2,
      updatedAt: '2026-06-24T12:15:30',
      createdAt: '2026-06-23T10:00:00'
    }]
    const wrapper = mount(PlaylistsList, { global: { stubs: globalStubs } })
    await flushPromises()

    expect(wrapper.find('[data-test="table-header-updatedAtSortKey"]').text()).toBe('Создан/Изменён')
    expect(wrapper.text()).toContain('24.06.2026')
    expect(wrapper.text()).toContain('12:15:30')
  })

  it('falls back to created timestamp when updatedAt is missing', async () => {
    playlistsStore.playlists.value = [{
      id: 3,
      updatedAt: null,
      createdAt: '2026-06-23T10:05:40'
    }]
    const wrapper = mount(PlaylistsList, { global: { stubs: globalStubs } })
    await flushPromises()

    expect(wrapper.text()).toContain('23.06.2026')
    expect(wrapper.text()).toContain('10:05:40')
  })

  it('matches playlist search against formatted timestamp', async () => {
    const wrapper = mount(PlaylistsList, { global: { stubs: globalStubs } })
    await flushPromises()

    expect(wrapper.vm.filterPlaylists(null, '24.06.2026', {
      raw: {
        title: 'Playlist',
        filename: 'playlist.m3u',
        updatedAt: '2026-06-24T12:15:30'
      }
    })).toBe(true)
    expect(wrapper.vm.filterPlaylists(null, '25.06.2026', {
      raw: {
        title: 'Playlist',
        filename: 'playlist.m3u',
        updatedAt: '2026-06-24T12:15:30'
      }
    })).toBe(false)
  })

  it('matches playlist search against formatted total file size', async () => {
    const wrapper = mount(PlaylistsList, { global: { stubs: globalStubs } })
    await flushPromises()
    const item = {
      raw: {
        title: 'Playlist',
        filename: 'playlist.m3u',
        totalFileSizeBytes: 1024,
        totalDurationSeconds: 65,
        videoCount: 1
      }
    }

    expect(wrapper.vm.filterPlaylists(null, '1024', item)).toBe(true)
    expect(wrapper.vm.filterPlaylists(null, '1.0 кб', item)).toBe(true)
    expect(wrapper.vm.filterPlaylists(null, '1.0кб', item)).toBe(true)
    expect(wrapper.vm.filterPlaylists(null, '2.0 кб', item)).toBe(false)
  })

  it('disables create-playlist-button when account list is empty', async () => {
    // accountsStore.accounts.value is already [] from beforeEach
    const wrapper = mount(PlaylistsList, { global: { stubs: globalStubs } })
    await flushPromises()
    const btn = wrapper.find('[data-test="create-playlist-button"]')
    expect(btn.attributes('disabled')).toBeDefined()
    expect(wrapper.find('[data-test="table-empty"]').text()).toBe('Нет плейлистов')
  })
})
