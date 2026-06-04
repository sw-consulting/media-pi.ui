// Copyright (c) 2025 sw.consulting
// This file is a part of Media Pi frontend application

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import AccountSettings from '@/components/Account_Settings.vue'
import { redirectToDefaultRoute } from '@/helpers/default.route.js'

const routerGo = vi.hoisted(() => vi.fn())

let authStore
const accountsStore = {
  account: null,
  loading: false,
  getById: vi.fn(),
  add: vi.fn(),
  update: vi.fn()
}
const usersStore = {
  users: [],
  getAll: vi.fn(),
  getByAccount: vi.fn()
}
const alertStore = {
  alert: null,
  error: vi.fn(),
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

vi.mock('@/stores/auth.store.js', () => ({
  useAuthStore: () => authStore
}))

vi.mock('@/stores/accounts.store.js', () => ({
  useAccountsStore: () => accountsStore
}))

vi.mock('@/stores/users.store.js', () => ({
  useUsersStore: () => usersStore
}))

vi.mock('@/stores/alert.store.js', () => ({
  useAlertStore: () => alertStore
}))

vi.mock('@/helpers/default.route.js', () => ({
  redirectToDefaultRoute: vi.fn()
}))

vi.mock('@sw-consulting/tooling.ui.kit', () => ({
  ActionButton: {
    name: 'ActionButton',
    props: ['item', 'icon', 'iconSize', 'tooltipText', 'disabled'],
    emits: ['click'],
    template: '<button :data-icon="icon" :data-icon-size="iconSize" :data-tooltip="tooltipText" :disabled="disabled" @click="$emit(\'click\', item)"></button>'
  }
}))

const mountSettings = (props = {}) => mount({
  template: '<Suspense><AccountSettings v-bind="$attrs" /></Suspense>',
  components: { AccountSettings },
  inheritAttrs: false
}, {
  attrs: {
    register: false,
    id: 1,
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
            return submit(props.submitValues || { name: 'Test Account', managers: [1, '2', ''] })
          },
          onSubmit() {
            this.$emit('submit', props.submitValues || { name: 'Test Account', managers: [1, '2', ''] })
          }
        }
      },
      Field: {
        template: '<input />',
        props: ['name', 'type', 'id', 'disabled']
      },
      FieldArrayWithButtons: {
        template: `
          <div data-test="manager-field-array">
            <span v-for="option in options" :key="option.value" data-test="manager-option">
              {{ option.value }}:{{ option.text }}
            </span>
          </div>
        `,
        props: ['name', 'label', 'fieldType', 'options', 'placeholder', 'addTooltip', 'removeTooltip', 'hasError']
      },
      SubscriptionsList: {
        template: `
          <div data-test="subscriptions-list" :data-account-id="accountId" :data-embedded="embedded ? 'true' : 'false'">
            <button data-test="embedded-subscriptions-action" @click="beforeEmbeddedAction && beforeEmbeddedAction()"></button>
          </div>
        `,
        props: {
          accountId: Number,
          embedded: Boolean,
          beforeEmbeddedAction: Function
        }
      }
    }
  }
})

describe('Account_Settings.vue', () => {
  beforeEach(() => {
    authStore = {
      isAdministrator: true,
      isManager: false,
      isEngineer: false
    }
    accountsStore.account = null
    accountsStore.loading = false
    accountsStore.getById = vi.fn().mockResolvedValue()
    accountsStore.add = vi.fn().mockResolvedValue()
    accountsStore.update = vi.fn().mockResolvedValue()
    usersStore.users = [
      { id: 1, firstName: 'Ann', lastName: 'Admin', roles: [2] },
      { id: 2, firstName: 'Ivan', lastName: 'Manager', roles: [2] }
    ]
    usersStore.getAll = vi.fn().mockResolvedValue()
    usersStore.getByAccount = vi.fn().mockResolvedValue()
    alertStore.alert = null
    vi.clearAllMocks()
    routerGo.mockClear()
  })

  it('renders create form without loading an account', async () => {
    const wrapper = mountSettings({ register: true })
    await flushPromises()

    expect(wrapper.find('[data-test="form"]').exists()).toBe(true)
    expect(accountsStore.getById).not.toHaveBeenCalled()
    expect(wrapper.find('[data-test="subscriptions-list"]').exists()).toBe(false)
  })

  it('loads account data and renders the subscriptions list when editing', async () => {
    accountsStore.account = {
      id: 1,
      name: 'Cafe',
      userIds: [1, 999]
    }

    const wrapper = mountSettings({ register: false, id: 1 })
    await flushPromises()

    expect(accountsStore.getById).toHaveBeenCalledWith(1)
    expect(wrapper.find('[data-test="manager-field-array"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="subscriptions-list"]').attributes('data-account-id')).toBe('1')
    expect(wrapper.find('[data-test="subscriptions-list"]').attributes('data-embedded')).toBe('true')
  })

  it('renders the shared alert below embedded subscriptions', async () => {
    accountsStore.account = {
      id: 1,
      name: 'Cafe',
      userIds: [1]
    }
    alertStore.alert = { message: 'Account alert', type: 'alert-danger' }

    const wrapper = mountSettings({ register: false, id: 1 })
    await flushPromises()

    expect(wrapper.find('.alert-dismissable').text()).toContain('Account alert')
    expect(wrapper.html().indexOf('data-test="subscriptions-list"')).toBeLessThan(
      wrapper.html().indexOf('alert-dismissable')
    )
  })

  it('shows store loading as a header action indicator', async () => {
    accountsStore.loading = true

    const wrapper = mountSettings({ register: true })
    await flushPromises()

    expect(wrapper.find('[data-test="settings-loading-indicator"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="settings-loading-indicator"] .spinner-border-m').exists()).toBe(true)
    expect(wrapper.find('.spinner-border-lg').exists()).toBe(false)
  })

  it('loads account managers by account for non-admin users', async () => {
    authStore = {
      isAdministrator: false,
      isManager: true,
      isEngineer: false
    }
    accountsStore.account = {
      id: 1,
      name: 'Managed Account',
      userIds: [2]
    }

    const wrapper = mountSettings({ register: false, id: 1 })
    await flushPromises()

    expect(usersStore.getByAccount).toHaveBeenCalledWith(1)
    expect(wrapper.text()).toContain('Manager Ivan')
  })

  it('submits create payload with numeric manager IDs', async () => {
    const wrapper = mountSettings({ register: true })
    await flushPromises()

    await wrapper.find('[data-test="form"]').trigger('submit')
    await flushPromises()

    expect(accountsStore.add).toHaveBeenCalledWith({
      name: 'Test Account',
      userIds: [1, 2]
    })
    expect(routerGo).toHaveBeenCalledWith(-1)
  })

  it('submits update payload and supports header action save', async () => {
    accountsStore.account = {
      id: 1,
      name: 'Cafe',
      userIds: [1]
    }
    const wrapper = mountSettings({ register: false, id: 1 })
    await flushPromises()

    await wrapper.find('[data-test="save-account-button"]').trigger('click')
    await flushPromises()

    expect(accountsStore.update).toHaveBeenCalledWith(1, {
      name: 'Test Account',
      userIds: [1, 2]
    })
  })

  it('saves the account before an embedded subscription action without leaving the form', async () => {
    accountsStore.account = {
      id: 1,
      name: 'Cafe',
      userIds: [1]
    }
    const wrapper = mountSettings({
      register: false,
      id: 1,
      submitValues: { name: 'Embedded Save', managers: [2] }
    })
    await flushPromises()

    await wrapper.find('[data-test="embedded-subscriptions-action"]').trigger('click')
    await flushPromises()

    expect(accountsStore.update).toHaveBeenCalledWith(1, {
      name: 'Embedded Save',
      userIds: [2]
    })
    expect(routerGo).not.toHaveBeenCalled()
  })

  it('handles header cancel action', async () => {
    const wrapper = mountSettings({ register: true })
    await flushPromises()

    await wrapper.find('[data-test="cancel-account-button"]').trigger('click')

    expect(routerGo).toHaveBeenCalledWith(-1)
  })

  it('shows account load error when account is missing', async () => {
    accountsStore.account = null

    mountSettings({ register: false, id: 999 })
    await flushPromises()

    expect(alertStore.error).toHaveBeenCalledWith(
      'Ошибка загрузки лицевого счёта: Лицевой счёт с ID 999 не найден'
    )
  })

  it('handles account load authorization and not-found responses', async () => {
    accountsStore.getById = vi.fn().mockRejectedValueOnce({ status: 403 })

    mountSettings({ register: false, id: 1 })
    await flushPromises()

    expect(redirectToDefaultRoute).toHaveBeenCalled()

    accountsStore.getById = vi.fn().mockRejectedValueOnce({ status: 404 })

    mountSettings({ register: false, id: 2 })
    await flushPromises()

    expect(alertStore.error).toHaveBeenCalledWith('Лицевой счёт с ID 2 не найден')
  })

  it('shows an error when manager options fail to load', async () => {
    usersStore.getAll = vi.fn().mockRejectedValue(new Error('users down'))

    mountSettings({ register: true })
    await flushPromises()

    expect(alertStore.error).toHaveBeenCalledWith('Не удалось загрузить список пользователей: users down')
  })

  it('redirects on unauthorized submit errors', async () => {
    accountsStore.add = vi.fn().mockRejectedValue({ status: 401 })
    const wrapper = mountSettings({ register: true })
    await flushPromises()

    await wrapper.find('[data-test="form"]').trigger('submit')
    await flushPromises()

    expect(redirectToDefaultRoute).toHaveBeenCalled()
  })

  it('reports conflict, validation, and generic submit errors', async () => {
    accountsStore.add = vi.fn()
      .mockRejectedValueOnce({ status: 409 })
      .mockRejectedValueOnce({ status: 422 })
      .mockRejectedValueOnce(new Error('save failed'))
    const wrapper = mountSettings({ register: true })
    await flushPromises()

    await wrapper.find('[data-test="form"]').trigger('submit')
    await flushPromises()
    await wrapper.find('[data-test="form"]').trigger('submit')
    await flushPromises()
    await wrapper.find('[data-test="form"]').trigger('submit')
    await flushPromises()

    expect(alertStore.error).toHaveBeenCalledWith('Лицевой счёт с таким названием уже существует')
    expect(alertStore.error).toHaveBeenCalledWith('Проверьте корректность введённых данных')
    expect(alertStore.error).toHaveBeenCalledWith('Ошибка при создании лицевого счёта: save failed')
  })
})
