/* @vitest-environment jsdom */
// Copyright (c) 2025 sw.consulting
// This file is a part of Media Pi frontend application

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import SubscriptionsList from '@/components/Subscriptions_List.vue'

const routerPush = vi.hoisted(() => vi.fn())

let authStore
const accountsStore = {
  accounts: ref([]),
  subscriptions: ref({ subscriptions: [], availableCategories: [] }),
  loading: ref(false),
  error: ref(null),
  getAll: vi.fn(),
  getSubscriptions: vi.fn(),
  deleteSubscription: vi.fn()
}
const alertStore = {
  alert: ref(null),
  error: vi.fn((message) => { alertStore.alert.value = { message, type: 'alert-danger' } }),
  clear: vi.fn()
}
const confirmation = {
  confirmDelete: vi.fn(async () => true)
}

vi.mock('pinia', async () => {
  const actual = await vi.importActual('pinia')
  return { ...actual, storeToRefs: (store) => store }
})

vi.mock('@/router', () => ({ default: { push: routerPush } }))
vi.mock('@/stores/accounts.store.js', () => ({ useAccountsStore: () => accountsStore }))
vi.mock('@/stores/auth.store.js', () => ({ useAuthStore: () => authStore }))
vi.mock('@/stores/alert.store.js', () => ({ useAlertStore: () => alertStore }))
vi.mock('@/helpers/confirmation.js', () => ({ useConfirmation: () => confirmation }))
vi.mock('@sw-consulting/tooling.ui.kit', () => ({
  ActionButton: {
    name: 'ActionButton',
    props: ['item', 'icon', 'tooltipText', 'disabled'],
    emits: ['click'],
    template: '<button :data-icon="icon" :data-tooltip="tooltipText" :disabled="disabled" @click="$emit(\'click\', item)"></button>'
  }
}))

const globalStubs = {
  'v-card': { template: '<div v-bind="$attrs"><slot /></div>' },
  'v-text-field': {
    props: ['modelValue', 'density'],
    emits: ['update:modelValue'],
    template: '<input data-test="subscription-search" :data-density="density" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />'
  },
  'v-data-table': {
    props: ['items', 'headers', 'customFilter', 'itemValue', 'noDataText', 'noResultsText', 'density'],
    template: `
      <div class="data-table" :data-density="density">
        <div v-if="!items.length" data-test="table-empty">{{ noDataText }}</div>
        <div
          v-for="item in items"
          :key="item.subscriptionRowId"
          class="data-row"
          data-test="subscription-row"
          :data-row-id="item.subscriptionRowId"
        >
          <slot name="item.actions" :item="item" />
          <span v-if="item.accountName" data-test="subscription-account">{{ item.accountName }}</span>
          <span data-test="subscription-category">{{ item.categoryTitle }}</span>
          <span data-test="subscription-start">{{ item.startDateFormatted }}</span>
          <span data-test="subscription-end">{{ item.endDateFormatted }}</span>
          <span v-if="customFilter" :data-test="'filter-' + item.categoryId">{{ customFilter(null, item.categoryTitle, { raw: item }) }}</span>
        </div>
      </div>
    `
  },
  PlaylistAccessImpactDialog: {
    props: ['modelValue', 'impact', 'saving'],
    emits: ['confirm', 'cancel', 'update:modelValue'],
    template: `
      <div v-if="modelValue" data-test="playlist-impact-dialog">
        <button data-test="confirm-playlist-impact-button" @click="$emit('confirm')"></button>
        <button data-test="cancel-playlist-impact-button" @click="$emit('cancel')"></button>
      </div>
    `
  }
}

function mountList(props = {}) {
  return mount(SubscriptionsList, {
    props: { accountId: 1, ...props },
    global: { stubs: globalStubs }
  })
}

describe('Subscriptions_List.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authStore = {
      isAdministrator: true,
      subscriptions_per_page: 10,
      subscriptions_search: '',
      subscriptions_sort_by: [],
      subscriptions_page: 1
    }
    accountsStore.subscriptions.value = {
      subscriptions: [],
      availableCategories: []
    }
    accountsStore.accounts.value = []
    accountsStore.loading.value = false
    accountsStore.error.value = null
    accountsStore.getAll = vi.fn(async () => accountsStore.accounts.value)
    accountsStore.getSubscriptions = vi.fn(async () => accountsStore.subscriptions.value)
    accountsStore.deleteSubscription = vi.fn(async () => accountsStore.subscriptions.value)
    alertStore.alert.value = null
    confirmation.confirmDelete = vi.fn(async () => true)
  })

  it('loads and renders paid subscriptions only', async () => {
    accountsStore.subscriptions.value = {
      subscriptions: [
        { categoryId: 7, categoryTitle: 'Premium', categoryFree: false, startDate: '2026-06-01', endDate: '2026-06-30' },
        { categoryId: 8, categoryTitle: 'Free', categoryFree: true, startDate: '2026-06-01', endDate: '2026-06-30' }
      ],
      availableCategories: [
        { id: 9, title: 'Sports', free: false }
      ]
    }

    const wrapper = mountList()
    await flushPromises()

    expect(accountsStore.getSubscriptions).toHaveBeenCalledWith(1)
    expect(wrapper.text()).toContain('Premium')
    expect(wrapper.text()).not.toContain('Free')
    expect(wrapper.find('[data-test="subscription-start"]').text()).toBe('01.06.2026')
    expect(wrapper.find('[data-test="subscription-end"]').text()).toBe('30.06.2026')
    expect(wrapper.find('[data-test="filter-7"]').text()).toBe('true')
  })

  it('uses Vuetify empty text for an empty subscription list', async () => {
    const wrapper = mountList()
    await flushPromises()

    expect(wrapper.find('[data-test="table-empty"]').text()).toBe('Нет подписок')
    expect(wrapper.find('[data-test="subscription-search"]').exists()).toBe(false)
    expect(wrapper.find('.subscriptions-card').classes()).toContain('subscriptions-card--empty')
  })

  it('shows list alert by default and suppresses it when embedded', async () => {
    alertStore.alert.value = { message: 'Subscription error', type: 'alert-danger' }

    const wrapper = mountList()
    await flushPromises()

    expect(wrapper.find('.alert-dismissable').text()).toContain('Subscription error')

    const embeddedWrapper = mountList({ embedded: true })
    await flushPromises()

    expect(embeddedWrapper.find('.alert-dismissable').exists()).toBe(false)
  })

  it('renders embedded mode with compact subsection styles', async () => {
    accountsStore.subscriptions.value = {
      subscriptions: [
        { categoryId: 7, categoryTitle: 'Premium', categoryFree: false, startDate: '2026-06-01', endDate: '2026-06-30' }
      ],
      availableCategories: []
    }

    const wrapper = mountList({ embedded: true })
    await flushPromises()

    expect(wrapper.classes()).toContain('subscriptions-list-embedded')
    expect(wrapper.find('.subscriptions-list-subsection-header').exists()).toBe(true)
    expect(wrapper.find('.subscriptions-list-subsection-divider').exists()).toBe(true)
    expect(wrapper.find('.subscriptions-list-card-embedded').exists()).toBe(true)
    expect(wrapper.find('[data-test="subscription-search"]').attributes('data-density')).toBe('compact')
    expect(wrapper.find('.data-table').attributes('data-density')).toBe('compact')
  })

  it('renders multiple subscriptions for the same category', async () => {
    accountsStore.subscriptions.value = {
      subscriptions: [
        { categoryId: 7, categoryTitle: 'Premium', categoryFree: false, startDate: '2026-06-01', endDate: '2026-06-30' },
        { categoryId: 7, categoryTitle: 'Premium', categoryFree: false, startDate: '2026-07-01', endDate: '2026-07-31' }
      ],
      availableCategories: []
    }

    const wrapper = mountList()
    await flushPromises()

    const rows = wrapper.findAll('[data-test="subscription-row"]')
    expect(rows).toHaveLength(2)
    expect(wrapper.find('.subscriptions-card').classes()).not.toContain('subscriptions-card--empty')
    expect(rows[0].attributes('data-row-id')).not.toBe(rows[1].attributes('data-row-id'))
    expect(wrapper.find('[data-test="create-subscription-button"]').element.disabled).toBe(false)
  })

  it('matches search against formatted subscription dates', async () => {
    accountsStore.subscriptions.value = {
      subscriptions: [
        { categoryId: 7, categoryTitle: 'Premium', categoryFree: false, startDate: '2026-06-01', endDate: '2026-06-30' }
      ],
      availableCategories: []
    }

    const wrapper = mountList()
    await flushPromises()

    const vm = wrapper.vm

    expect(vm.filterSubscriptions(null, '01.06.2026', { raw: vm.subscriptionRows[0] })).toBe(true)
  })

  it('routes create and edit actions for administrators', async () => {
    accountsStore.subscriptions.value = {
      subscriptions: [
        { categoryId: 7, categoryTitle: 'Premium', categoryFree: false, startDate: '2026-06-01', endDate: '2026-06-30' }
      ],
      availableCategories: [
        { id: 9, title: 'Sports', free: false }
      ]
    }

    const wrapper = mountList({ accountId: 4 })
    await flushPromises()

    await wrapper.find('[data-test="create-subscription-button"]').trigger('click')
    await wrapper.find('[data-test="edit-subscription-button"]').trigger('click')

    expect(routerPush).toHaveBeenCalledWith('/account/4/subscription/create')
    expect(routerPush).toHaveBeenCalledWith('/account/4/subscription/edit/7')
  })

  it('renders category mode as accounts with subscription dates', async () => {
    accountsStore.accounts.value = [
      { id: 1, name: 'Cafe' },
      { id: 2, name: 'Shop' }
    ]
    accountsStore.getSubscriptions = vi.fn(async (accountId) => ({
      subscriptions: accountId === 1
        ? [
            {
              categoryId: 7,
              categoryTitle: 'Premium',
              categoryFree: false,
              startDate: '2026-06-01',
              endDate: '2026-06-30'
            },
            {
              categoryId: 7,
              categoryTitle: 'Premium',
              categoryFree: false,
              startDate: '2026-07-01',
              endDate: '2026-07-31'
            }
          ]
        : [],
      availableCategories: []
    }))

    const wrapper = mountList({ mode: 'category', categoryId: 7, categoryTitle: 'Premium' })
    await flushPromises()

    expect(accountsStore.getAll).toHaveBeenCalled()
    expect(accountsStore.getSubscriptions).toHaveBeenCalledWith(1)
    expect(accountsStore.getSubscriptions).toHaveBeenCalledWith(2)
    expect(wrapper.findAll('[data-test="subscription-row"]')).toHaveLength(2)
    expect(wrapper.findAll('[data-test="subscription-account"]').map(item => item.text())).toEqual(['Cafe', 'Cafe'])
    expect(wrapper.findAll('[data-test="subscription-start"]').map(item => item.text())).toEqual(['01.06.2026', '01.07.2026'])
  })

  it('routes category mode row actions using row account and fixed category', async () => {
    accountsStore.accounts.value = [
      { id: 1, name: 'Cafe' },
      { id: 2, name: 'Shop' }
    ]
    accountsStore.getSubscriptions = vi.fn(async (accountId) => ({
      subscriptions: accountId === 1
        ? [
            {
              categoryId: 7,
              categoryTitle: 'Premium',
              categoryFree: false,
              startDate: '2026-06-01',
              endDate: '2026-06-30'
            }
          ]
        : [],
      availableCategories: []
    }))

    const wrapper = mountList({ mode: 'category', categoryId: 7, categoryTitle: 'Premium' })
    await flushPromises()

    await wrapper.find('[data-test="create-subscription-button"]').trigger('click')
    await wrapper.find('[data-test="edit-subscription-button"]').trigger('click')

    expect(routerPush).toHaveBeenCalledWith({
      path: '/category/7/subscription/create',
      query: { categoryTitle: 'Premium' }
    })
    expect(routerPush).toHaveBeenCalledWith('/account/1/subscription/edit/7')
  })

  it('filters category mode accounts by user access rights', async () => {
    authStore.isAdministrator = false
    authStore.user = {
      roles: [11],
      accountIds: [2]
    }
    accountsStore.accounts.value = [
      { id: 1, name: 'Cafe' },
      { id: 2, name: 'Shop' }
    ]
    accountsStore.getSubscriptions = vi.fn(async () => ({
      subscriptions: [
        {
          categoryId: 7,
          categoryTitle: 'Premium',
          categoryFree: false,
          startDate: '2026-06-01',
          endDate: '2026-06-30'
        }
      ],
      availableCategories: []
    }))

    const wrapper = mountList({ mode: 'category', categoryId: 7 })
    await flushPromises()

    expect(accountsStore.getSubscriptions).not.toHaveBeenCalledWith(1)
    expect(accountsStore.getSubscriptions).toHaveBeenCalledWith(2)
    expect(wrapper.findAll('[data-test="subscription-account"]').map(item => item.text())).toEqual(['Shop'])
    expect(wrapper.find('[data-test="create-subscription-button"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="edit-subscription-button"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="delete-subscription-button"]').exists()).toBe(false)
  })

  it('deletes category mode subscription by row account and fixed category', async () => {
    accountsStore.accounts.value = [{ id: 1, name: 'Cafe' }]
    accountsStore.getSubscriptions = vi.fn(async () => ({
      subscriptions: [
        {
          categoryId: 7,
          categoryTitle: 'Premium',
          categoryFree: false,
          startDate: '2026-06-01',
          endDate: '2026-06-30'
        }
      ],
      availableCategories: []
    }))
    accountsStore.deleteSubscription = vi.fn(async () => ({ subscriptions: [], availableCategories: [] }))

    const wrapper = mountList({ mode: 'category', categoryId: 7 })
    await flushPromises()

    await wrapper.find('[data-test="delete-subscription-button"]').trigger('click')
    await flushPromises()

    expect(confirmation.confirmDelete).toHaveBeenCalledWith('Cafe', 'подписку')
    expect(accountsStore.deleteSubscription).toHaveBeenCalledWith(1, 7, {})
  })

  it('hides actions for non-administrators', async () => {
    authStore.isAdministrator = false
    accountsStore.subscriptions.value = {
      subscriptions: [
        { categoryId: 7, categoryTitle: 'Premium', categoryFree: false, startDate: '2026-06-01', endDate: '2026-06-30' }
      ],
      availableCategories: [
        { id: 9, title: 'Sports', free: false }
      ]
    }

    const wrapper = mountList()
    await flushPromises()

    expect(wrapper.find('[data-test="create-subscription-button"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="edit-subscription-button"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="delete-subscription-button"]').exists()).toBe(false)
  })

  it('deletes subscription after confirmation', async () => {
    accountsStore.subscriptions.value = {
      subscriptions: [
        { categoryId: 7, categoryTitle: 'Premium', categoryFree: false, startDate: '2026-06-01', endDate: '2026-06-30' }
      ],
      availableCategories: []
    }

    const wrapper = mountList()
    await flushPromises()

    await wrapper.find('[data-test="delete-subscription-button"]').trigger('click')
    await flushPromises()

    expect(confirmation.confirmDelete).toHaveBeenCalledWith('Premium', 'подписку')
    expect(accountsStore.deleteSubscription).toHaveBeenCalledWith(1, 7, {})
  })

  it('shows playlist impact before retrying subscription delete with force cleanup', async () => {
    accountsStore.subscriptions.value = {
      subscriptions: [
        { categoryId: 7, categoryTitle: 'Premium', categoryFree: false, startDate: '2026-06-01', endDate: '2026-06-30' }
      ],
      availableCategories: []
    }
    accountsStore.deleteSubscription = vi.fn()
      .mockRejectedValueOnce({ status: 409, data: { affectedPlaylistCount: 1, affectedPlaylists: [] } })
      .mockResolvedValueOnce({ subscriptions: [], availableCategories: [] })

    const wrapper = mountList()
    await flushPromises()

    await wrapper.find('[data-test="delete-subscription-button"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-test="playlist-impact-dialog"]').exists()).toBe(true)

    await wrapper.find('[data-test="confirm-playlist-impact-button"]').trigger('click')
    await flushPromises()

    expect(accountsStore.deleteSubscription).toHaveBeenLastCalledWith(1, 7, { forcePlaylistCleanup: true })
  })
})
