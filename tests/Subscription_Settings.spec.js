/* @vitest-environment jsdom */
// Copyright (c) 2025 sw.consulting
// This file is a part of Media Pi frontend application

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import SubscriptionSettings from '@/components/Subscription_Settings.vue'
import { redirectToDefaultRoute } from '@/helpers/default.route.js'

const routerGo = vi.hoisted(() => vi.fn())

let authStore
const accountsStore = {
  loading: ref(false),
  getSubscriptions: vi.fn(),
  upsertSubscription: vi.fn()
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
  default: {
    go: routerGo
  }
}))

vi.mock('@/stores/accounts.store.js', () => ({ useAccountsStore: () => accountsStore }))
vi.mock('@/stores/auth.store.js', () => ({ useAuthStore: () => authStore }))
vi.mock('@/stores/alert.store.js', () => ({ useAlertStore: () => alertStore }))
vi.mock('@/helpers/default.route.js', () => ({ redirectToDefaultRoute: vi.fn() }))
vi.mock('@sw-consulting/tooling.ui.kit', () => ({
  ActionButton: {
    name: 'ActionButton',
    props: ['item', 'icon', 'iconSize', 'tooltipText', 'disabled'],
    emits: ['click'],
    template: '<button :data-icon="icon" :data-icon-size="iconSize" :data-tooltip="tooltipText" :disabled="disabled" @click="$emit(\'click\', item)"></button>'
  }
}))

function mountSettings(props = {}) {
  return mount({
    template: '<Suspense><SubscriptionSettings v-bind="$attrs" /></Suspense>',
    components: { SubscriptionSettings },
    inheritAttrs: false
  }, {
    attrs: {
      register: true,
      accountId: 1,
      ...props
    },
    global: {
      stubs: {
        Form: {
          template: '<form data-test="form" @submit.prevent="onSubmit"><slot :errors="errors" :isSubmitting="isSubmitting" :handleSubmit="handleSubmit" /></form>',
          props: ['validationSchema', 'initialValues'],
          emits: ['submit'],
          data() {
            return {
              errors: props.errors || {},
              isSubmitting: props.isSubmitting || false
            }
          },
          methods: {
            handleSubmit(submit) {
              return submit({ ...this.initialValues, ...(props.submitValues || {}) })
            },
            onSubmit() {
              this.$emit('submit', { ...this.initialValues, ...(props.submitValues || {}) })
            }
          }
        },
        Field: {
          template: '<input :data-test="$attrs[\'data-test\']" :name="name" :type="type" />',
          props: ['name', 'type', 'id']
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
    }
  })
}

describe('Subscription_Settings.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authStore = { isAdministrator: true }
    accountsStore.loading.value = false
    accountsStore.getSubscriptions = vi.fn().mockResolvedValue({
      subscriptions: [],
      availableCategories: [
        { id: 7, title: 'Premium', free: false },
        { id: 8, title: 'Free', free: true }
      ]
    })
    accountsStore.upsertSubscription = vi.fn().mockResolvedValue({
      subscriptions: [],
      availableCategories: []
    })
    alertStore.alert.value = null
    routerGo.mockClear()
  })

  it('creates a subscription for a paid available category', async () => {
    const wrapper = mountSettings({
      register: true,
      accountId: 3,
      submitValues: {
        startDate: '2026-06-01',
        endDate: '2026-06-30'
      }
    })
    await flushPromises()

    const categorySelect = wrapper.find('[data-test="subscription-category-select"]')
    expect(categorySelect.text()).toContain('Premium')
    expect(categorySelect.text()).not.toContain('Free')

    await wrapper.find('[data-test="save-subscription-settings-button"]').trigger('click')
    await flushPromises()

    expect(accountsStore.upsertSubscription).toHaveBeenCalledWith(3, 7, {
      startDate: '2026-06-01',
      endDate: '2026-06-30'
    })
    expect(routerGo).toHaveBeenCalledWith(-1)
  })

  it('disables save when no paid categories are available for creation', async () => {
    accountsStore.getSubscriptions = vi.fn().mockResolvedValue({
      subscriptions: [],
      availableCategories: [{ id: 8, title: 'Free', free: true }]
    })

    const wrapper = mountSettings({ register: true })
    await flushPromises()

    expect(wrapper.find('[data-test="save-subscription-settings-button"]').element.disabled).toBe(true)
    expect(wrapper.text()).toContain('Нет категорий для подписки')
  })

  it('loads and updates an existing subscription', async () => {
    accountsStore.getSubscriptions = vi.fn().mockResolvedValue({
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
    })

    const wrapper = mountSettings({
      register: false,
      accountId: 3,
      categoryId: 7,
      submitValues: {
        startDate: '2026-07-01',
        endDate: '2026-07-31'
      }
    })
    await flushPromises()

    expect(wrapper.find('[data-test="subscription-category-select"]').element.disabled).toBe(true)

    await wrapper.find('[data-test="save-subscription-settings-button"]').trigger('click')
    await flushPromises()

    expect(accountsStore.upsertSubscription).toHaveBeenCalledWith(3, 7, {
      startDate: '2026-07-01',
      endDate: '2026-07-31'
    })
  })

  it('lists affected playlists before retrying save with force cleanup', async () => {
    accountsStore.upsertSubscription = vi.fn()
      .mockRejectedValueOnce({ status: 409, data: { affectedPlaylistCount: 1 } })
      .mockResolvedValueOnce({ subscriptions: [], availableCategories: [] })

    const wrapper = mountSettings({
      register: true,
      submitValues: {
        startDate: '2026-06-01',
        endDate: '2026-06-30'
      }
    })
    await flushPromises()

    await wrapper.find('[data-test="save-subscription-settings-button"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-test="playlist-impact-dialog"]').exists()).toBe(true)

    await wrapper.find('[data-test="confirm-playlist-impact-button"]').trigger('click')
    await flushPromises()

    expect(accountsStore.upsertSubscription).toHaveBeenLastCalledWith(1, 7, {
      startDate: '2026-06-01',
      endDate: '2026-06-30',
      forcePlaylistCleanup: true
    })
  })

  it('redirects non-administrators', async () => {
    authStore = { isAdministrator: false }

    mountSettings({ register: true })
    await flushPromises()

    expect(redirectToDefaultRoute).toHaveBeenCalled()
  })
})
