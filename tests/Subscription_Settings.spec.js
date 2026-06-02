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
  account: ref(null),
  accounts: ref([]),
  loading: ref(false),
  getAll: vi.fn(),
  getById: vi.fn(),
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
    accountsStore.account.value = null
    accountsStore.accounts.value = []
    accountsStore.loading.value = false
    accountsStore.getAll = vi.fn().mockImplementation(async () => {
      accountsStore.accounts.value = []
    })
    accountsStore.getById = vi.fn().mockImplementation(async (id) => {
      accountsStore.account.value = { id, name: `Account ${id}` }
    })
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

    expect(accountsStore.getById).toHaveBeenCalledWith(3)
    expect(wrapper.find('h1.primary-heading').text()).toBe('Создание подписки')
    expect(wrapper.find('[data-test="subscription-account-name"]').element.value).toBe('Account 3')
    expect(wrapper.find('[data-test="subscription-account-name"]').attributes('readonly')).toBeDefined()

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

  it('preselects requested category when creating from category subscriptions list', async () => {
    accountsStore.getSubscriptions = vi.fn().mockResolvedValue({
      subscriptions: [],
      availableCategories: [
        { id: 7, title: 'Premium', free: false },
        { id: 9, title: 'Sports', free: false }
      ]
    })

    const wrapper = mountSettings({
      register: true,
      accountId: 3,
      categoryId: 9,
      submitValues: {
        startDate: '2026-06-01',
        endDate: '2026-06-30'
      }
    })
    await flushPromises()

    await wrapper.find('[data-test="save-subscription-settings-button"]').trigger('click')
    await flushPromises()

    expect(accountsStore.upsertSubscription).toHaveBeenCalledWith(3, 9, {
      startDate: '2026-06-01',
      endDate: '2026-06-30'
    })
  })

  it('creates category-locked subscription after selecting an account', async () => {
    accountsStore.accounts.value = [
      { id: 3, name: 'Account 3' },
      { id: 4, name: 'Account 4' }
    ]
    accountsStore.getAll = vi.fn().mockResolvedValue()
    accountsStore.getSubscriptions = vi.fn().mockResolvedValue({
      subscriptions: [],
      availableCategories: []
    })

    const wrapper = mountSettings({
      register: true,
      accountId: undefined,
      categoryId: 9,
      categoryLocked: true,
      categoryTitle: 'Sports',
      submitValues: {
        startDate: '2026-06-01',
        endDate: '2026-06-30'
      }
    })
    await flushPromises()

    expect(accountsStore.getAll).toHaveBeenCalled()
    expect(wrapper.find('[data-test="subscription-account-name"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="subscription-category-select"]').element.disabled).toBe(true)
    expect(wrapper.find('[data-test="subscription-category-select"]').text()).toContain('Sports')

    await wrapper.find('[data-test="subscription-account-select"]').setValue('3')
    await flushPromises()
    await wrapper.find('[data-test="save-subscription-settings-button"]').trigger('click')
    await flushPromises()

    expect(accountsStore.getSubscriptions).toHaveBeenCalledWith(3)
    expect(accountsStore.upsertSubscription).toHaveBeenCalledWith(3, 9, {
      startDate: '2026-06-01',
      endDate: '2026-06-30'
    })
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

    await wrapper.find('[data-test="form"]').trigger('submit')
    await flushPromises()

    expect(alertStore.error).toHaveBeenCalledWith('Выберите категорию')
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

    expect(wrapper.find('h1.primary-heading').text()).toBe('Редактирование подписки')
    expect(wrapper.find('[data-test="subscription-category-select"]').element.disabled).toBe(true)
    expect(wrapper.find('[data-test="subscription-start-date"]').classes()).toContain('date-input')
    expect(wrapper.find('[data-test="subscription-end-date"]').classes()).toContain('date-input')

    await wrapper.find('[data-test="save-subscription-settings-button"]').trigger('click')
    await flushPromises()

    expect(accountsStore.upsertSubscription).toHaveBeenCalledWith(3, 7, {
      startDate: '2026-07-01',
      endDate: '2026-07-31'
    })
  })

  it('lists affected playlists before retrying save with force cleanup', async () => {
    accountsStore.upsertSubscription = vi.fn()
      .mockRejectedValueOnce({ status: 409, data: { affectedPlaylistCount: 1, affectedPlaylists: [] } })
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

  it('cancels playlist impact cleanup confirmation', async () => {
    accountsStore.upsertSubscription = vi.fn()
      .mockRejectedValueOnce({ status: 409, data: { affectedPlaylistCount: 1, affectedPlaylists: [] } })

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

    await wrapper.find('[data-test="cancel-playlist-impact-button"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-test="playlist-impact-dialog"]').exists()).toBe(false)
  })

  it('redirects invalid subscription routes', async () => {
    mountSettings({ register: true, accountId: NaN })
    await flushPromises()

    expect(redirectToDefaultRoute).toHaveBeenCalled()
  })

  it('reports missing edit subscriptions and load errors', async () => {
    accountsStore.getSubscriptions = vi.fn()
      .mockResolvedValueOnce({ subscriptions: [], availableCategories: [] })
      .mockRejectedValueOnce({ status: 403 })
      .mockRejectedValueOnce({ status: 404 })
      .mockRejectedValueOnce(new Error('load failed'))

    mountSettings({ register: false, accountId: 3, categoryId: 99 })
    await flushPromises()

    expect(alertStore.error).toHaveBeenCalledWith('Ошибка загрузки подписки: Подписка для категории с ID 99 не найдена')

    mountSettings({ register: true, accountId: 3 })
    await flushPromises()

    expect(redirectToDefaultRoute).toHaveBeenCalled()

    mountSettings({ register: true, accountId: 4 })
    await flushPromises()

    expect(alertStore.error).toHaveBeenCalledWith('Лицевой счёт с ID 4 не найден')

    mountSettings({ register: true, accountId: 5 })
    await flushPromises()

    expect(alertStore.error).toHaveBeenCalledWith('Ошибка загрузки подписки: load failed')
  })

  it('reports save authorization, missing entity, validation, and generic errors', async () => {
    accountsStore.upsertSubscription = vi.fn()
      .mockRejectedValueOnce({ status: 403 })
      .mockRejectedValueOnce({ status: 404 })
      .mockRejectedValueOnce({ status: 400 })
      .mockRejectedValueOnce(new Error('save failed'))
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
    await wrapper.find('[data-test="save-subscription-settings-button"]').trigger('click')
    await flushPromises()
    await wrapper.find('[data-test="save-subscription-settings-button"]').trigger('click')
    await flushPromises()
    await wrapper.find('[data-test="save-subscription-settings-button"]').trigger('click')
    await flushPromises()

    expect(redirectToDefaultRoute).toHaveBeenCalled()
    expect(alertStore.error).toHaveBeenCalledWith('Лицевой счёт с ID 1 или категория с ID 7 не найдены')
    expect(alertStore.error).toHaveBeenCalledWith('Проверьте корректность введённых данных')
    expect(alertStore.error).toHaveBeenCalledWith('Ошибка при создании подписки: save failed')
  })

  it('redirects non-administrators', async () => {
    authStore = { isAdministrator: false }

    mountSettings({ register: true })
    await flushPromises()

    expect(redirectToDefaultRoute).toHaveBeenCalled()
  })
})
