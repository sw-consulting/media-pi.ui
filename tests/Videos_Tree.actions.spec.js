// Copyright (c) 2025 sw.consulting
// Tests for Videos_Tree action visibility and handlers
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import VideosTree from '@/components/Videos_Tree.vue'

// Reactive mock stores -------------------------------------------------
let currentUser
const makeAuthStore = (user) => ({ user })

const accountsStore = {
  accounts: ref([]),
  getAll: vi.fn().mockImplementation(async () => accountsStore.accounts.value),
  getByManager: vi.fn().mockImplementation(async () => accountsStore.accounts.value.filter(a => currentUser?.accountIds?.includes(a.id)))
}

const videosStore = {
  getAllByAccount: vi.fn().mockResolvedValue([]),
  update: vi.fn().mockResolvedValue({ id: 101 }),
  uploadFile: vi.fn().mockResolvedValue({}),
  remove: vi.fn().mockResolvedValue({}),
}

const alertStore = { error: vi.fn(), clear: vi.fn() }
const confirmation = { confirmDelete: vi.fn().mockResolvedValue(true) }

// Mocks ----------------------------------------------------------------
vi.mock('@/stores/accounts.store.js', () => ({ useAccountsStore: () => accountsStore }))
vi.mock('@/stores/videos.store.js', () => ({ useVideosStore: () => videosStore }))
vi.mock('@/stores/auth.store.js', () => ({ useAuthStore: () => makeAuthStore(currentUser) }))
vi.mock('@/stores/alert.store.js', () => ({ useAlertStore: () => alertStore }))
vi.mock('@/helpers/confirmation.js', () => ({ useConfirmation: () => confirmation }))
vi.mock('@fortawesome/vue-fontawesome', () => ({
  FontAwesomeIcon: { name: 'font-awesome-icon', render: () => null }
}))
// User helpers mock: roles[1] = admin, roles[11] = manager
vi.mock('@/helpers/user.helpers.js', () => ({
  isAdministrator: (u) => Array.isArray(u?.roles) && u.roles.includes(1),
  isManager: (u) => Array.isArray(u?.roles) && u.roles.includes(11),
  canManageAccountById: (u, accountId) => {
    if (!u) return false
    if (Array.isArray(u.roles) && u.roles.includes(1)) return true
    return Array.isArray(u.accountIds) && u.accountIds.includes(accountId)
  }
}))

// Stub ActionButton separately to emit click --------------------------
vi.mock('@sw-consulting/tooling.ui.kit', () => ({
  ActionButton: {
    name: 'ActionButton',
    props: ['item', 'icon', 'tooltipText'],
    emits: ['click'],
    template: '<button class="action-btn" @click="$emit(\'click\')"></button>'
  }
}))

// Helper to mount component with recursive treeview stub --------------
const mountTree = async () => {
  const wrapper = mount(VideosTree, {
    global: {
      stubs: {
        'v-card': { template: '<div><slot /></div>' },
        'v-card-text': { template: '<div><slot /></div>' },
        'v-progress-linear': { template: '<div />' },
        'v-progress-circular': { template: '<div />' },
        'v-alert': { template: '<div />' },
        'v-btn': { template: '<button><slot /></button>' },
        // Recursive treeview stub to render children and slots
        'v-treeview': {
          props: ['items', 'loadChildren'],
          template: `
            <div class="treeview-root">
              <template v-for="item in items">
                <div class="tree-item" :data-id="item.id">
                  <slot name="prepend" :item="item" />
                  <slot name="append" :item="item" />
                </div>
                <template v-for="child in item.children || []">
                  <div class="tree-item child" :data-id="child.id">
                    <slot name="prepend" :item="child" />
                    <slot name="append" :item="child" />
                  </div>
                  <template v-for="grand in child.children || []">
                    <div class="tree-item grandchild" :data-id="grand.id">
                      <slot name="prepend" :item="grand" />
                      <slot name="append" :item="grand" />
                    </div>
                  </template>
                </template>
              </template>
            </div>`
        }
      }
    }
  })
  await Promise.resolve()
  // Force open account nodes to ensure append slot logic for actions runs
  wrapper.vm.openedNodes = accountsStore.accounts.value.map(a => `account-${a.id}`)
  // Explicitly invoke loadAccounts to simulate mounted behavior
  if (typeof wrapper.vm.loadAccounts === 'function') {
    await wrapper.vm.loadAccounts()
  }
  await wrapper.vm.$nextTick()
  return wrapper
}

// Tests ----------------------------------------------------------------
describe('Videos_Tree.vue actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    accountsStore.accounts.value = [
      { id: 1, name: 'Account A' },
      { id: 2, name: 'Account B' }
    ]
    videosStore.getAllByAccount.mockResolvedValue([])
  })

  it('shows upload buttons for administrator on all account nodes', async () => {
    currentUser = { roles: [1], accountIds: [1, 2] }
    const wrapper = await mountTree()
    await wrapper.vm.$nextTick()
    // Expect one button per managed account (plus no video buttons)
    const buttons = wrapper.findAll('.action-btn')
    expect(buttons.length).toBe(2)
  })

  it('shows upload button for manager only on their accounts', async () => {
    currentUser = { roles: [11], accountIds: [1] }
    const wrapper = await mountTree()
    await wrapper.vm.$nextTick()
    const buttons = wrapper.findAll('.action-btn')
    expect(buttons.length).toBe(1)
  })

  it('does not show upload button for user without permissions', async () => {
    currentUser = { roles: [], accountIds: [] }
    const wrapper = await mountTree()
    const buttons = wrapper.findAll('.action-btn')
    expect(buttons.length).toBe(0)
  })

  it('calls remove on deleteVideo', async () => {
    currentUser = { roles: [1], accountIds: [1] }
    videosStore.getAllByAccount.mockResolvedValue([{ id: 200, name: 'Video 200', accountId: 1 }])
    const wrapper = await mountTree()
    // Manually invoke the internal delete logic to avoid deep tree interaction complexity
    await wrapper.vm.deleteVideo({ video: { id: 200, accountId: 1, name: 'Video 200' } })
    expect(videosStore.remove).toHaveBeenCalledWith(200)
  })
})
