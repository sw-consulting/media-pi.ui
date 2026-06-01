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
  subscriptions: ref({ subscriptions: [], availableCategories: [] }),
  loading: ref(false),
  error: ref(null),
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
  'v-card': { template: '<div><slot /></div>' },
  'v-text-field': {
    props: ['modelValue'],
    emits: ['update:modelValue'],
    template: '<input data-test="subscription-search" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />'
  },
  'v-data-table': {
    props: ['items', 'headers', 'customFilter'],
    template: `
      <div class="data-table">
        <div v-for="item in items" :key="item.categoryId" class="data-row" data-test="subscription-row">
          <slot name="item.actions" :item="item" />
          <span data-test="subscription-category">{{ item.categoryTitle }}</span>
          <span data-test="subscription-start">{{ item.startDate }}</span>
          <span data-test="subscription-end">{{ item.endDate }}</span>
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
    accountsStore.loading.value = false
    accountsStore.error.value = null
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
    expect(wrapper.find('[data-test="filter-7"]').text()).toBe('true')
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
      .mockRejectedValueOnce({ status: 409, data: { affectedPlaylistCount: 1 } })
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
