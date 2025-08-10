import { library } from '@fortawesome/fontawesome-svg-core';
import { faCheckDouble, faXmark } from '@fortawesome/free-solid-svg-icons';
library.add(faCheckDouble, faXmark);
// Copyright (c) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.
//
// This file is a part of Media Pi frontend application

/* @vitest-environment jsdom */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import AccountSettings from '@/components/Account_Settings.vue'

let authStore
const accountsStore = {
  account: null,
  loading: false,
  error: null,
  getById: vi.fn(),
  add: vi.fn(),
  update: vi.fn()
}
const usersStore = {
  users: [],
  getAll: vi.fn().mockResolvedValue(),
  getUserById: vi.fn()
}
const alertStore = {
  error: vi.fn(),
  success: vi.fn(),
  clear: vi.fn()
}

vi.mock('pinia', async () => {
  const actual = await vi.importActual('pinia')
  return { ...actual, storeToRefs: (store) => store }
})

vi.mock('@/router', () => {
  const mockPush = vi.fn()
  return {
    default: {
      push: mockPush
    }
  }
})

vi.mock('vue-router', async (importOriginal) => {
  const actual = await importOriginal()
  const mockPush = vi.fn()
  return {
    ...actual,
    useRouter: () => ({
      push: mockPush
    })
  }
})

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
          'Form': { 
            template: '<form @submit="$emit(\'submit\', { name: \'Test Account\', managers: [1, 2] })"><slot :errors="{}" :isSubmitting="false" /></form>',
            emits: ['submit']
          },
          'Field': { 
            template: '<input />', 
            props: ['name', 'type', 'as', 'multiple'] 
          }
        },
        components: {
          'font-awesome-icon': FontAwesomeIcon
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
    accountsStore.error = null
    accountsStore.getById = vi.fn().mockResolvedValue()
    accountsStore.add = vi.fn().mockResolvedValue()
    accountsStore.update = vi.fn().mockResolvedValue()
    usersStore.getAll = vi.fn().mockResolvedValue()
    vi.clearAllMocks()
  })

  it('renders form for creating new account', async () => {
    const wrapper = mountSettings({ register: true })
    await flushPromises()
    
    expect(wrapper.find('form').exists()).toBe(true)
    expect(accountsStore.getById).not.toHaveBeenCalled()
  })

  it('loads account data when editing', async () => {
    accountsStore.account = {
      id: 1,
      name: 'Test Account',
      managers: [1, 2]
    }
    
    const wrapper = mountSettings({ register: false, id: 1 })
    await flushPromises()
    
    expect(accountsStore.getById).toHaveBeenCalledWith(1)
    expect(wrapper.find('form').exists()).toBe(true)
  })

  it('handles form submission for creating account', async () => {
    const wrapper = mountSettings({ register: true })
    await flushPromises()
    
    const form = wrapper.find('form')
    await form.trigger('submit')
    await flushPromises()
    
    expect(accountsStore.add).toHaveBeenCalledWith({
      name: 'Test Account',
      userIds: [1, 2]
    })
  })

  it('handles form submission for updating account', async () => {
    accountsStore.account = {
      id: 1,
      name: 'Existing Account',
      managers: [1]
    }
    
    const wrapper = mountSettings({ register: false, id: 1 })
    await flushPromises()
    
    const form = wrapper.find('form')
    await form.trigger('submit')
    await flushPromises()
    
    expect(accountsStore.update).toHaveBeenCalledWith(1, {
      name: 'Test Account',
      userIds: [1, 2]
    })
  })

  it('handles account not found error', async () => {
    accountsStore.account = null
    
    mountSettings({ register: false, id: 999 })
    await flushPromises()
    
    expect(alertStore.error).toHaveBeenCalledWith('Ошибка загрузки лицевого счёта: Лицевой счёт с ID 999 не найден')
  })

  it('handles create error', async () => {
    accountsStore.add = vi.fn().mockRejectedValue({ message: 'Account name already exists' })
    
    const wrapper = mountSettings({ register: true })
    await flushPromises()
    
    const form = wrapper.find('form')
    await form.trigger('submit')
    await flushPromises()
    
    expect(alertStore.error).toHaveBeenCalledWith('Ошибка при создании лицевого счёта: Account name already exists')
  })

  it('allows form submission when no managers are selected', async () => {
    const wrapper = mount({
      template: '<Suspense><AccountSettings v-bind="$attrs" /></Suspense>',
      components: { AccountSettings },
      inheritAttrs: false
    }, {
      attrs: { register: true },
      global: {
        stubs: {
          'Form': { 
            template: '<form @submit="$emit(\'submit\', { name: \'Test Account\', managers: [\'\'] })"><slot :errors="{}" :isSubmitting="false" /></form>',
            emits: ['submit']
          },
          'Field': { template: '<input />', props: ['name', 'type', 'as', 'multiple'] }
        },
        components: { 'font-awesome-icon': FontAwesomeIcon }
      }
    })
    
    await flushPromises()
    
    const form = wrapper.find('form')
    await form.trigger('submit')
    await flushPromises()
    
    expect(accountsStore.add).toHaveBeenCalledWith({
      name: 'Test Account',
      userIds: []
    })
  })
})
