// Copyright (c) 2025 sw.consulting
// This file is a part of Media Pi  frontend application

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'

import PlaylistsTree from '@/components/Playlists_Tree.vue'

let currentUser

const accountsStore = {
  accounts: ref([]),
  getAll: vi.fn(),
  getByManager: vi.fn()
}

const playlistsStore = {
  getAllByAccount: vi.fn(),
  remove: vi.fn()
}

const alertStore = { error: vi.fn(), clear: vi.fn() }
const confirmation = { confirmDelete: vi.fn().mockResolvedValue(true) }

vi.mock('@/stores/accounts.store.js', () => ({
  useAccountsStore: () => accountsStore
}))

vi.mock('@/stores/playlists.store.js', () => ({
  usePlaylistsStore: () => playlistsStore
}))

vi.mock('@/stores/auth.store.js', () => ({
  useAuthStore: () => ({ user: currentUser })
}))

vi.mock('@/stores/alert.store.js', () => ({
  useAlertStore: () => alertStore
}))

vi.mock('@/helpers/confirmation.js', () => ({
  useConfirmation: () => confirmation
}))

vi.mock('@fortawesome/vue-fontawesome', () => ({
  FontAwesomeIcon: { name: 'font-awesome-icon', render: () => null }
}))

vi.mock('@/components/Playlists_Settings.vue', () => ({
  default: {
    name: 'PlaylistsSettings',
    props: ['register', 'id', 'accountId'],
    emits: ['saved', 'cancel'],
    template: '<div class="settings-stub"></div>'
  }
}))

vi.mock('@/components/ActionButton.vue', () => ({
  default: {
    name: 'ActionButton',
    props: ['item', 'icon', 'tooltipText'],
    emits: ['click'],
    template: '<button class="action-button" @click="$emit(\'click\')"></button>'
  }
}))

vi.mock('@/helpers/user.helpers.js', () => ({
  isAdministrator: (user) => Array.isArray(user?.roles) && user.roles.includes(1),
  isManager: (user) => Array.isArray(user?.roles) && user.roles.includes(11),
  canManageAccountById: (user, accountId) => {
    if (!user) return false
    if (Array.isArray(user.roles) && user.roles.includes(1)) return true
    return Array.isArray(user.accountIds) && user.accountIds.includes(accountId)
  }
}))

const mountTree = async () => {
  const wrapper = mount(PlaylistsTree, {
    global: {
      stubs: {
        'v-card': { template: '<div><slot /></div>' },
        'v-card-text': { template: '<div><slot /></div>' },
        'v-progress-linear': { template: '<div />' },
        'v-progress-circular': { template: '<div />' },
        'v-alert': { template: '<div><slot /><slot name="append" /></div>' },
        'v-btn': { template: '<button><slot /></button>' },
        'v-dialog': { template: '<div><slot /><slot name="default" /></div>' },
        'v-treeview': {
          props: ['items', 'loadChildren'],
          template: `
            <div class="treeview">
              <div v-for="item in items" :key="item.id" class="tree-item">
                <slot name="prepend" :item="item" />
                <slot name="append" :item="item" />
              </div>
            </div>`
        }
      }
    }
  })
  await flushPromises()
  return wrapper
}

describe('Playlists_Tree.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    accountsStore.accounts.value = []
    accountsStore.getAll.mockImplementation(async () => accountsStore.accounts.value)
    accountsStore.getByManager.mockImplementation(async () => accountsStore.accounts.value)
    playlistsStore.getAllByAccount.mockResolvedValue([])
    playlistsStore.remove.mockResolvedValue({})
    alertStore.error.mockReset()
    confirmation.confirmDelete.mockResolvedValue(true)
    currentUser = { roles: [1], accountIds: [1, 2] }
  })

  it('creates tree items for accessible accounts', async () => {
    accountsStore.accounts.value = [
      { id: 1, name: 'Account 1' },
      { id: 2, name: 'Account 2' }
    ]

    const wrapper = await mountTree()
    const items = wrapper.vm.treeItems
    expect(items[0].children).toHaveLength(2)
  })

  it('opens dialog in create mode for managed account', async () => {
    accountsStore.accounts.value = [{ id: 1, name: 'Account 1' }]
    const wrapper = await mountTree()

    wrapper.vm.openCreatePlaylist(1)
    expect(wrapper.vm.dialogState.open).toBe(true)
    expect(wrapper.vm.dialogState.register).toBe(true)
  })

  it('deletes playlist after confirmation', async () => {
    accountsStore.accounts.value = [{ id: 1, name: 'Account 1' }]
    confirmation.confirmDelete.mockResolvedValue(true)
    const wrapper = await mountTree()

    await wrapper.vm.deletePlaylist({ playlist: { id: 42, accountId: 1, title: 'Test' } })
    expect(playlistsStore.remove).toHaveBeenCalledWith(42)
  })

  it('reloads account playlists after save', async () => {
    accountsStore.accounts.value = [{ id: 1, name: 'Account 1' }]
    playlistsStore.getAllByAccount.mockResolvedValueOnce([])
    const wrapper = await mountTree()

    await wrapper.vm.handleSaved({ accountId: 1 })
    expect(playlistsStore.getAllByAccount).toHaveBeenCalledWith(1)
  })
})
