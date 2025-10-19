// Tests for video upload creation path using new uploadFile(file, accountId, title) API
/* global File */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import VideosTree from '@/components/Videos_Tree.vue'

let currentUser
const makeAuthStore = (u) => ({ user: u })

const accountsStore = {
  accounts: ref([]),
  getAll: vi.fn(async () => accountsStore.accounts.value)
}

const videosStore = {
  getAllByAccount: vi.fn().mockResolvedValue([]),
  uploadFile: vi.fn().mockResolvedValue({ id: 777 }),
  update: vi.fn(), // should not be called
  remove: vi.fn()
}

const alertStore = { error: vi.fn() }
const confirmation = { confirmDelete: vi.fn() }

vi.mock('@/stores/accounts.store.js', () => ({ useAccountsStore: () => accountsStore }))
vi.mock('@/stores/videos.store.js', () => ({ useVideosStore: () => videosStore }))
vi.mock('@/stores/auth.store.js', () => ({ useAuthStore: () => makeAuthStore(currentUser) }))
vi.mock('@/stores/alert.store.js', () => ({ useAlertStore: () => alertStore }))
vi.mock('@/helpers/confirmation.js', () => ({ useConfirmation: () => confirmation }))
vi.mock('@fortawesome/vue-fontawesome', () => ({ FontAwesomeIcon: { name: 'font-awesome-icon', render: () => null } }))
vi.mock('@/helpers/user.helpers.js', () => ({
  isAdministrator: (u) => Array.isArray(u?.roles) && u.roles.includes(1),
  isManager: (u) => Array.isArray(u?.roles) && u.roles.includes(11),
  canManageAccountById: (u, id) => u?.roles?.includes(1) || (Array.isArray(u?.accountIds) && u.accountIds.includes(id))
}))
vi.mock('@/components/ActionButton.vue', () => ({
  default: { name: 'ActionButton', props: ['item','icon','tooltipText'], emits: ['click'], template: '<button class="action-btn" @click="$emit(\'click\')"></button>' }
}))

const mountTree = async () => {
  const wrapper = mount(VideosTree, {
    global: { stubs: { 'v-card': { template: '<div><slot /></div>' }, 'v-card-text': { template: '<div><slot /></div>' }, 'v-progress-linear': { template: '<div />' }, 'v-progress-circular': { template: '<div />' }, 'v-alert': { template: '<div />' }, 'v-btn': { template: '<button><slot /></button>' }, 'v-treeview': { props:['items'], template: '<div><template v-for="item in items"><slot name="append" :item="item" /><div v-for="child in item.children"><slot name="append" :item="child" /></div></template></div>' } } }
  })
  wrapper.vm.openedNodes = accountsStore.accounts.value.map(a => `account-${a.id}`)
  await wrapper.vm.loadAccounts?.()
  await wrapper.vm.$nextTick()
  return wrapper
}

describe('Videos_Tree.vue upload create API (new signature)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    accountsStore.accounts.value = [ { id: 5, name: 'Account Five' } ]
  })

  it('calls uploadFile(file, accountId, title) for administrator', async () => {
    currentUser = { roles: [1], accountIds: [5] }
    const wrapper = await mountTree()
    const fakeFile = new File(['data'], 'admin-video.mp4', { type: 'video/mp4' })
    await wrapper.vm.uploadVideoForAccount(5, fakeFile)
    expect(videosStore.uploadFile).toHaveBeenCalledWith(fakeFile, 5, 'admin-video')
    expect(videosStore.update).not.toHaveBeenCalled()
  })

  it('calls uploadFile(file, accountId, title) for manager with access', async () => {
    currentUser = { roles: [11], accountIds: [5] }
    const wrapper = await mountTree()
    const fakeFile = new File(['data'], 'manager-video.mp4', { type: 'video/mp4' })
    await wrapper.vm.uploadVideoForAccount(5, fakeFile)
    expect(videosStore.uploadFile).toHaveBeenCalledWith(fakeFile, 5, 'manager-video')
    expect(videosStore.update).not.toHaveBeenCalled()
  })

  it('does not call uploadFile for user without permission', async () => {
    currentUser = { roles: [], accountIds: [] }
    const wrapper = await mountTree()
    const fakeFile = new File(['data'], 'nope.mp4', { type: 'video/mp4' })
    await wrapper.vm.uploadVideoForAccount(5, fakeFile)
    expect(videosStore.uploadFile).not.toHaveBeenCalled()
  })
})
