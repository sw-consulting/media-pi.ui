import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref, nextTick } from 'vue'
import VideosList from '@/components/Videos_List.vue'

let currentUser

const makeAuthStore = () => ({ user: currentUser })

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
  uploadFile: vi.fn(async () => ({})),
  remove: vi.fn(async () => ({}))
}

const alertStore = {
  alert: ref(null),
  error: vi.fn((message) => { alertStore.alert.value = { message } }),
  clear: vi.fn()
}

const confirmation = { confirmDelete: vi.fn(async () => true) }

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
  'v-data-table': { props: ['items'], template: '<div class="data-table"><slot name="item.actions" v-for="item in items" :item="item" /></div>' },
  'v-text-field': { props: ['modelValue'], emits: ['update:modelValue'], template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />' },
  'v-progress-linear': { template: '<div />' },
  'v-progress-circular': { template: '<div />' },
  'v-alert': { template: '<div />' }
}

describe('Videos_List.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    accountsStore.accounts.value = []
    videosStore.videos.value = []
    currentUser = { roles: [1], accountIds: [] }
  })

  it('loads videos for default and changed account selection', async () => {
    accountsStore.accounts.value = [{ id: 5, name: 'Five' }]
    const wrapper = mount(VideosList, { global: { stubs: globalStubs } })

    await flushPromises()
    expect(accountsStore.getAll).toHaveBeenCalled()
    expect(videosStore.getAllByAccount).toHaveBeenCalledWith(null)

    wrapper.vm.selectedAccountId = 5
    await nextTick()
    await flushPromises()
    expect(videosStore.getAllByAccount).toHaveBeenCalledWith(5)
  })

  it('blocks upload when user lacks permissions', async () => {
    currentUser = { roles: [], accountIds: [] }
    const wrapper = mount(VideosList, { global: { stubs: globalStubs } })
    await flushPromises()
    const file = new File(['x'], 'test.mp4', { type: 'video/mp4' })
    await wrapper.vm.uploadVideo(file)
    expect(videosStore.uploadFile).not.toHaveBeenCalled()
  })

  it('deletes video after confirmation for administrator', async () => {
    videosStore.videos.value = [{ id: 9, title: 'Clip', accountId: null }]
    const wrapper = mount(VideosList, { global: { stubs: globalStubs } })
    await flushPromises()
    await wrapper.vm.deleteVideo(videosStore.videos.value[0])
    expect(videosStore.remove).toHaveBeenCalledWith(9)
  })
})

