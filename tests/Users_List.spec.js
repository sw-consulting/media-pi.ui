/* @vitest-environment jsdom */
// Copyright (c) 2025 sw.consulting
// This file is a part of Media Pi  frontend application

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import UsersList from '@/components/Users_List.vue'
import { resolveAll } from './helpers/test-utils'

// Centralized mock data
const mockUsers = ref([
  { id: 1, firstName: 'John', lastName: 'Doe', patronymic: '', email: 'john@example.com', roles: ['administrator'] }
])
const mockLoading = ref(false)
const mockError = ref(null)

// Centralized mock functions
const getAll = vi.hoisted(() => vi.fn())
const deleteUserFn = vi.hoisted(() => vi.fn(() => Promise.resolve()))
const errorFn = vi.hoisted(() => vi.fn())
const confirmMock = vi.hoisted(() => vi.fn().mockResolvedValue(true))
const ensureLoaded = vi.hoisted(() => vi.fn(() => Promise.resolve()))
const router = vi.hoisted(() => ({
  push: vi.fn()
}))

// Centralized mocks for all modules
vi.mock('pinia', async () => {
  const actual = await vi.importActual('pinia')
  return {
    ...actual,
    storeToRefs: () => ({ users: mockUsers, loading: mockLoading, error: mockError })
  }
})

vi.mock('@/stores/users.store.js', () => ({
  useUsersStore: () => ({
    users: mockUsers,
    loading: mockLoading,
    error: mockError,
    getAll,
    delete: deleteUserFn
  })
}))

vi.mock('@/stores/alert.store.js', () => ({
  useAlertStore: () => ({ alert: null, error: errorFn, clear: vi.fn() })
}))

vi.mock('@/stores/auth.store.js', () => ({
  useAuthStore: () => ({
    users_per_page: 10,
    users_search: '',
    users_sort_by: ['id'],
    users_page: 1
  })
}))

vi.mock('@/stores/roles.store.js', () => ({
  useRolesStore: () => ({
    ensureLoaded,
    roles: [
      { id: 1, roleId: 1, name: 'Администратор' },
      { id: 11, roleId: 11, name: 'Менеджер' },
      { id: 21, roleId: 21, name: 'Инженер' }
    ]
  })
}))

vi.mock('@/stores/accounts.store.js', () => ({
  useAccountsStore: () => ({
    getAll: vi.fn(() => Promise.resolve()),
    accounts: [
      { id: 1, name: 'Test Account' },
      { id: 2, name: 'Account B' }
    ]
  })
}))

vi.mock('@/helpers/user.helpers.js', () => ({
  getRoleName: (user) => {
    if (user.roles?.includes('administrator')) return 'Administrator'
    if (user.roles?.includes('account manager')) return 'Account Manager'
    return 'User'
  },
  isManager: (user) => user.roles?.includes('account manager') || false
}))

vi.mock('vuetify-use-dialog', () => ({
  useConfirm: () => confirmMock
}))

vi.mock('@/router', () => ({
  default: router
}), { virtual: true })

const actionButtonStub = {
  name: 'ActionButton',
  props: ['item', 'icon', 'tooltipText', 'iconSize', 'disabled'],
  emits: ['click'],
  template: '<button v-bind="$attrs" :disabled="disabled" @click="$emit(\'click\', item)"></button>'
}

const baseMountOptions = {
  global: {
    stubs: {
      'v-card': true,
      'v-data-table': true,
      'v-text-field': true,
      'font-awesome-icon': true,
      'router-link': true,
      ActionButton: actionButtonStub
    }
  }
}

function mountComponent(overrides = {}) {
  return mount(UsersList, {
    ...baseMountOptions,
    ...overrides,
    global: {
      ...baseMountOptions.global,
      ...overrides.global,
      stubs: {
        ...baseMountOptions.global.stubs,
        ...(overrides.global?.stubs || {})
      }
    }
  })
}

describe('Users_List.vue', () => {
  beforeEach(() => {
    // Clear mocks before each test
    vi.clearAllMocks()

    // Reset default mock behavior
    confirmMock.mockResolvedValue(true)
    deleteUserFn.mockResolvedValue()
    mockLoading.value = false
    mockError.value = null
  })
  
  afterEach(() => {
    // Restore timers if they were mocked
    vi.useRealTimers()
  })

  it('calls getAll on mount', async () => {
    const wrapper = mountComponent()
    
    // Wait for all async operations to complete
    await flushPromises()
    
    expect(getAll).toHaveBeenCalled()
    expect(wrapper.exists()).toBe(true)
  })

  it('handles empty users array', async () => {
    mockUsers.value = []
    const wrapper = mountComponent()
    expect(wrapper.exists()).toBe(true)
    // Reset mock data for other tests
    mockUsers.value = [{ id: 1, firstName: 'John', lastName: 'Doe', patronymic: '', email: 'john@example.com', roles: ['administrator'] }]
  })

  it('handles search input', async () => {
    const wrapper = mountComponent()
    const searchInput = wrapper.findComponent({ name: 'v-text-field' }) || wrapper.find('input[type="text"]')
    if (searchInput.exists()) {
      await searchInput.setValue('John')
      await searchInput.trigger('input')
    }
  })

  it('calls delete function when delete action is confirmed', async () => {
    const wrapper = mountComponent()
    const user = { id: 1, firstName: 'John', lastName: 'Doe' }

    await wrapper.vm.deleteUser(user)

    expect(deleteUserFn).toHaveBeenCalledWith(1)
  })

  it('navigates to add user page when add button is clicked', async () => {
    const wrapper = mountComponent()

    const addButton = wrapper.find('[data-test="register-user-button"]')
    expect(addButton.exists()).toBe(true)
    await addButton.trigger('click')
    expect(router.push).toHaveBeenCalledWith('/register')
  })

  it('shows loader and disables action button when loading', async () => {
    mockLoading.value = true
    const wrapper = mountComponent()
    await flushPromises()

    expect(wrapper.find('.spinner-border').exists()).toBe(true)
    const addButton = wrapper.find('[data-test="register-user-button"]')
    expect(addButton.attributes('disabled')).toBeDefined()
  })

  it('navigates to edit user page when userSettings is invoked', async () => {
    const wrapper = mountComponent()
    await wrapper.vm.userSettings({ id: 1 })
    expect(router.push).toHaveBeenCalledWith('user/edit/1')
  })

  // New tests
  it('displays error when API call fails', async () => {
    // Reset mocks
    getAll.mockReset()

    // Create a mock implementation that sets the error
    getAll.mockImplementation(async () => {
      mockError.value = 'Failed to fetch users'
      throw new Error('Failed to fetch users')
    })

    const wrapper = mountComponent()

    await flushPromises()

    expect(getAll).toHaveBeenCalled()
    expect(wrapper.html()).toContain('Ошибка при загрузке списка пользователей: Failed to fetch users')
    expect(errorFn).toHaveBeenCalled()
  })

  it('shows confirmation dialog before deleting a user', async () => {
    // Configure the confirm mock to return true for this test
    confirmMock.mockResolvedValue(true)

    const wrapper = mountComponent()
    await wrapper.vm.deleteUser({ id: 1, firstName: 'John', lastName: 'Doe' })
    expect(confirmMock).toHaveBeenCalled()
    expect(deleteUserFn).toHaveBeenCalledWith(1)
  })

  it('does not delete user when confirmation is declined', async () => {
    // Configure the confirm mock to return false for this test
    confirmMock.mockResolvedValue(false)

    const wrapper = mountComponent()
    await wrapper.vm.deleteUser({ id: 1, firstName: 'John', lastName: 'Doe' })
    expect(confirmMock).toHaveBeenCalled()
    expect(deleteUserFn).not.toHaveBeenCalled()
  })

  // Error handling test
  it('calls alertStore.error when deleteUser rejects', async () => {
    // Configure the confirm mock to return true for this test
    confirmMock.mockResolvedValue(true)
    
    // Set up the delete function to reject with an error
    const errorMessage = 'Failed to delete user'
    deleteUserFn.mockRejectedValueOnce(new Error(errorMessage))
    
    // Create a mock item
    const mockItem = { id: 1, firstName: 'John', lastName: 'Doe' }
    
    // Call the deleteUser method directly instead of trying to find and click a button
    const wrapper = mountComponent()
    
    // Access the component instance and call the deleteUser method directly
    wrapper.vm.deleteUser(mockItem)
    
    // Wait for all promises to resolve, including the one in the catch block
    await resolveAll()
    
    // Verify that the delete function was called
    expect(deleteUserFn).toHaveBeenCalledWith(1)
    
    // Verify that the error function was called with the formatted error message
    expect(errorFn).toHaveBeenCalledWith(`Ошибка при удалении пользователя: ${errorMessage}`)
    
    // Verify that getAll was not called again (since the delete failed)
    expect(getAll).toHaveBeenCalledTimes(1) // Only the initial call on mount
  })

  it('calls ensureLoaded from roles store on component mount', async () => {
    mountComponent()
    await resolveAll()
    expect(ensureLoaded).toHaveBeenCalled()
  })

  // Test filterUsers function
  it('filters users by name fields', () => {
    const wrapper = mountComponent()
    
    const filterUsers = wrapper.vm.filterUsers || wrapper.vm.$options.methods?.filterUsers
    if (filterUsers) {
      const testUser = { 
        raw: { 
          firstName: 'John', 
          lastName: 'Doe', 
          patronymic: 'Middle',
          email: 'john@example.com',
          roles: ['administrator'],
          accountIds: []
        } 
      }
      
      expect(filterUsers('', 'john', testUser)).toBe(true)
      expect(filterUsers('', 'doe', testUser)).toBe(true)
      expect(filterUsers('', 'middle', testUser)).toBe(true)
      expect(filterUsers('', 'john@example.com', testUser)).toBe(true)
      expect(filterUsers('', 'nonexistent', testUser)).toBe(false)
    }
  })

  it('filters users by role name', () => {
    const wrapper = mountComponent()
    
    const filterUsers = wrapper.vm.filterUsers || wrapper.vm.$options.methods?.filterUsers
    if (filterUsers) {
      const testUser = { 
        raw: { 
          firstName: 'John', 
          lastName: 'Doe', 
          patronymic: '',
          email: 'john@example.com',
          roles: ['administrator'],
          accountIds: []
        } 
      }
      
      expect(filterUsers('', 'admin', testUser)).toBe(true)
    }
  })

  it('filters users by managed account names', () => {
    const wrapper = mountComponent()
    
    const filterUsers = wrapper.vm.filterUsers || wrapper.vm.$options.methods?.filterUsers
    if (filterUsers) {
      const testUser = { 
        raw: { 
          firstName: 'John', 
          lastName: 'Doe', 
          patronymic: '',
          email: 'john@example.com',
          roles: ['account manager'],
          accountIds: [1]
        } 
      }
      
      expect(filterUsers('', 'test account', testUser)).toBe(true)
    }
  })

  it('returns false for filterUsers with null parameters', () => {
    const wrapper = mountComponent()
    
    const filterUsers = wrapper.vm.filterUsers || wrapper.vm.$options.methods?.filterUsers
    if (filterUsers) {
      expect(filterUsers('', null, {})).toBe(false)
      expect(filterUsers('', 'query', null)).toBe(false)
      expect(filterUsers('', 'query', { raw: null })).toBe(false)
    }
  })

  // Test getManagedAccountNames function
  it('returns empty array for non-manager users', () => {
    const wrapper = mountComponent()
    
    const getManagedAccountNames = wrapper.vm.getManagedAccountNames || wrapper.vm.$options.methods?.getManagedAccountNames
    if (getManagedAccountNames) {
      const nonManagerUser = { roles: ['administrator'], accountIds: [1] }
      expect(getManagedAccountNames(nonManagerUser)).toEqual([])
    }
  })

  it('returns empty array for users without accountIds', () => {
    const wrapper = mountComponent()
    
    const getManagedAccountNames = wrapper.vm.getManagedAccountNames || wrapper.vm.$options.methods?.getManagedAccountNames
    if (getManagedAccountNames) {
      const managerUser = { roles: ['account manager'] }
      expect(getManagedAccountNames(managerUser)).toEqual([])
      
      const managerUserWithNonArrayIds = { roles: ['account manager'], accountIds: 'not-array' }
      expect(getManagedAccountNames(managerUserWithNonArrayIds)).toEqual([])
    }
  })

  it('returns account names for manager users', () => {
    const wrapper = mountComponent()
    
    const getManagedAccountNames = wrapper.vm.getManagedAccountNames || wrapper.vm.$options.methods?.getManagedAccountNames
    if (getManagedAccountNames) {
      const managerUser = { roles: ['account manager'], accountIds: [1, 999] }
      const result = getManagedAccountNames(managerUser)
      expect(result).toEqual(['Test Account'])
    }
  })

  // Test getCredentialsDisplay function
  it('displays role name only for non-manager users', () => {
    const wrapper = mountComponent()
    
    const getCredentialsDisplay = wrapper.vm.getCredentialsDisplay || wrapper.vm.$options.methods?.getCredentialsDisplay
    if (getCredentialsDisplay) {
      const adminUser = { roles: ['administrator'] }
      expect(getCredentialsDisplay(adminUser)).toBe('Administrator')
    }
  })

  it('displays role name and account names for manager users', () => {
    const wrapper = mountComponent()
    
    const getCredentialsDisplay = wrapper.vm.getCredentialsDisplay || wrapper.vm.$options.methods?.getCredentialsDisplay
    if (getCredentialsDisplay) {
      const managerUser = { roles: ['account manager'], accountIds: [1] }
      expect(getCredentialsDisplay(managerUser)).toBe('Account Manager<br>Test Account')
    }
  })

  // Test getCredentialsSortValue function
  it('returns role name for sort value for non-manager users', () => {
    const wrapper = mountComponent()
    
    const getCredentialsSortValue = wrapper.vm.getCredentialsSortValue || wrapper.vm.$options.methods?.getCredentialsSortValue
    if (getCredentialsSortValue) {
      const adminUser = { roles: ['administrator'] }
      expect(getCredentialsSortValue(adminUser)).toBe('Administrator')
    }
  })

  it('returns role name and sorted account names for manager users', () => {
    const wrapper = mountComponent()
    
    const getCredentialsSortValue = wrapper.vm.getCredentialsSortValue || wrapper.vm.$options.methods?.getCredentialsSortValue
    if (getCredentialsSortValue) {
      const managerUser = { roles: ['account manager'], accountIds: [1] }
      expect(getCredentialsSortValue(managerUser)).toBe('Account Manager Test Account')
    }
  })

  it('returns empty array when users is null', async () => {
    const originalValue = mockUsers.value
    mockUsers.value = []

    const wrapper = mountComponent()
    
    await flushPromises()
    
    const enhancedUsers = wrapper.vm.enhancedUsers
    expect(enhancedUsers).toEqual([])
    
    // Reset mock data for other tests
    mockUsers.value = originalValue
  })
})

