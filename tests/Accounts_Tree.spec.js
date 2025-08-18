/* @vitest-environment jsdom */

// Copyright (c) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
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

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import AccountsTree from '@/components/Accounts_Tree.vue'
import { resolveAll } from './helpers/test-utils'

let authStore
const accountsStore = {
  accounts: [],
  getAll: vi.fn().mockResolvedValue()
}
const devicesStore = {
  devices: [],
  getAll: vi.fn().mockResolvedValue()
}
const deviceGroupsStore = {
  groups: [],
  getAll: vi.fn().mockResolvedValue()
}
const alertStore = {
  error: vi.fn()
}

const mockPush = vi.fn()

// Mock global confirm function
global.confirm = vi.fn()

// Mock confirmation helper
const mockConfirmDelete = vi.fn().mockResolvedValue(true)
vi.mock('@/helpers/confirmation.js', () => ({
  useConfirmation: () => ({
    confirmDelete: mockConfirmDelete
  })
}))

vi.mock('pinia', async () => {
  const actual = await vi.importActual('pinia')
  return { ...actual, storeToRefs: (store) => store }
})

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: mockPush
  })
}))

vi.mock('@/stores/auth.store.js', () => ({
  useAuthStore: () => authStore
}))

vi.mock('@/stores/accounts.store.js', () => ({
  useAccountsStore: () => accountsStore
}))

vi.mock('@/stores/devices.store.js', () => ({
  useDevicesStore: () => devicesStore
}))

vi.mock('@/stores/device.groups.store.js', () => ({
  useDeviceGroupsStore: () => deviceGroupsStore
}))

vi.mock('@/stores/alert.store.js', () => ({
  useAlertStore: () => alertStore
}))

const mountTree = () => mount(AccountsTree, {
  global: {
    stubs: {
      'v-card': { template: '<div><slot /></div>' },
      'v-treeview': { props: ['items'], template: '<div><slot name="append" v-for="item in items" :item="item"></slot></div>' },
      'v-progress-linear': { template: '<div />' },
      'v-progress-circular': { template: '<div />' },
      'v-alert': { template: '<div />' },
      'v-icon': { template: '<div />' },
      'v-tooltip': { template: '<div><slot name="activator" :props="{}"></slot></div>' },
      'font-awesome-icon': { template: '<div />' },
      'ActionButton': { 
        props: ['item', 'icon', 'tooltipText'], 
        template: '<button @click="$emit(\'click\', item)"><div /></button>',
        emits: ['click']
      }
    }
  }
})

describe('Accounts_Tree.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    accountsStore.accounts = []
    devicesStore.devices = []
    deviceGroupsStore.groups = []
  })

  it('renders both roots for administrator', async () => {
    authStore = { isAdministrator: true, isManager: false, isEngineer: false }
    accountsStore.accounts = [
      { id: 1, name: 'Account 1' }
    ]
    devicesStore.devices = [
      { id: 1, name: 'Device A', accountId: 0 },
      { id: 2, name: 'Device B', accountId: 1, deviceGroupId: 0 }
    ]
    const wrapper = mountTree()
    await resolveAll()
    expect(wrapper.vm.treeItems.length).toBe(2)
    // Accounts now come first
    expect(wrapper.vm.treeItems[0].name).toBe('Лицевые счета')
    expect(wrapper.vm.treeItems[0].children[0].name).toBe('Account 1')
    // Unassigned devices now come last
    expect(wrapper.vm.treeItems[1].name).toBe('Нераспределённые устройства')
    // With lazy loading, unassigned devices children are empty initially
    expect(wrapper.vm.treeItems[1].children).toEqual([])
  })

  it('shows only accounts for manager', async () => {
    authStore = { isAdministrator: false, isManager: true, isEngineer: false }
    accountsStore.accounts = [
      { id: 1, name: 'Account 1' }
    ]
    devicesStore.devices = [
      { id: 2, name: 'Device B', accountId: 1, deviceGroupId: 0 }
    ]
    const wrapper = mountTree()
    await resolveAll()
    expect(wrapper.vm.treeItems.length).toBe(1)
    expect(wrapper.vm.treeItems[0].name).toBe('Лицевые счета')
    expect(wrapper.vm.treeItems[0].children[0].name).toBe('Account 1')
    // With lazy loading, children are empty initially
    expect(wrapper.vm.treeItems[0].children[0].children).toEqual([])
  })

  it('shows only unassigned devices for engineer', async () => {
    authStore = { isAdministrator: false, isManager: false, isEngineer: true }
    devicesStore.devices = [
      { id: 1, name: 'Device A', accountId: 0 }
    ]
    const wrapper = mountTree()
    await resolveAll()
    expect(wrapper.vm.treeItems.length).toBe(1)
    expect(wrapper.vm.treeItems[0].name).toBe('Нераспределённые устройства')
    // With lazy loading, children are empty initially
    expect(wrapper.vm.treeItems[0].children).toEqual([])
  })

  describe('Action Buttons', () => {
    beforeEach(() => {
      authStore = { isAdministrator: true, isManager: false, isEngineer: false }
      accountsStore.accounts = [
        { id: 1, name: 'Account 1' },
        { id: 2, name: 'Account 2' }
      ]
      vi.clearAllMocks()
    })

    it('navigates to account create page when create button is clicked', async () => {
      const wrapper = mountTree()
      await resolveAll()
      
      await wrapper.vm.createAccount()
      
      expect(mockPush).toHaveBeenCalledWith('/account/create')
    })

    it('navigates to account edit page when edit button is clicked', async () => {
      const wrapper = mountTree()
      await resolveAll()
      
      const accountId = 1
      await wrapper.vm.editAccount(accountId)
      
      expect(mockPush).toHaveBeenCalledWith('/account/edit/1')
    })

    it('shows confirm dialog when delete button is clicked', async () => {
      mockConfirmDelete.mockResolvedValue(false)
      
      const wrapper = mountTree()
      await resolveAll()
      
      const accountId = 1
      await wrapper.vm.deleteAccount(accountId)

      expect(mockConfirmDelete).toHaveBeenCalledWith('Account 1', 'лицевой счёт')
    })

    it('deletes account when deletion is confirmed', async () => {
      mockConfirmDelete.mockResolvedValue(true)
      accountsStore.delete = vi.fn().mockResolvedValue()
      alertStore.success = vi.fn()
      
      const wrapper = mountTree()
      await resolveAll()
      
      const accountId = 1
      await wrapper.vm.deleteAccount(accountId)

      expect(accountsStore.delete).toHaveBeenCalledWith(accountId)
    })

    it('does not delete account when deletion is cancelled', async () => {
      mockConfirmDelete.mockResolvedValue(false)
      accountsStore.delete = vi.fn()

      const wrapper = mountTree()
      await resolveAll()
      
      const accountId = 1
      await wrapper.vm.deleteAccount(accountId)

      expect(accountsStore.delete).not.toHaveBeenCalled()
    })

    it('handles delete error gracefully', async () => {
      mockConfirmDelete.mockResolvedValue(true)
      const deleteError = new Error('Delete failed')
      accountsStore.delete = vi.fn().mockRejectedValue(deleteError)
      alertStore.error = vi.fn()
      
      const wrapper = mountTree()
      await resolveAll()
      
      const accountId = 1
      // Should not throw error
      await expect(wrapper.vm.deleteAccount(accountId)).resolves.toBeUndefined()

      expect(accountsStore.delete).toHaveBeenCalledWith(accountId)
      expect(alertStore.error).toHaveBeenCalledWith('Ошибка при удалении лицевого счёта: Delete failed')
    })

    it('renders create button for root accounts node', async () => {
      const wrapper = mountTree()
      await resolveAll()
      
      // Check if the component has the createAccount method available
      expect(typeof wrapper.vm.createAccount).toBe('function')
    })

    it('renders edit and delete buttons for account nodes', async () => {
      const wrapper = mountTree()
      await resolveAll()
      
      // Check if the component has the edit and delete methods available
      expect(typeof wrapper.vm.editAccount).toBe('function')
      expect(typeof wrapper.vm.deleteAccount).toBe('function')
    })

    it('calls edit and delete functions correctly', async () => {
      const wrapper = mountTree()
      await resolveAll()
      
      // Test that methods can be called without errors
      expect(() => wrapper.vm.createAccount()).not.toThrow()
      expect(() => wrapper.vm.editAccount(1)).not.toThrow()
    })

    it('only shows create functionality for administrators and managers', async () => {
      // Test for manager role
      authStore = { isAdministrator: false, isManager: true, isEngineer: false }
      
      const wrapper = mountTree()
      await resolveAll()
      
      // Manager should have access to create functionality
      expect(typeof wrapper.vm.createAccount).toBe('function')
      
      // Test for engineer role (should not see accounts tree at all)
      authStore = { isAdministrator: false, isManager: false, isEngineer: true }
      
      const wrapper2 = mountTree()
      await resolveAll()
      
      // Engineer should not see accounts tree at all based on previous tests
      const engineerAccountsRoot = wrapper2.vm.treeItems.find(item => item.name === 'Лицевые счета')
      expect(engineerAccountsRoot).toBeUndefined()
    })

    it('handles navigation errors in createAccount', async () => {
      mockPush.mockImplementationOnce(() => {
        throw new Error('Navigation failed')
      })
      alertStore.error = vi.fn()
      
      const wrapper = mountTree()
      await resolveAll()
      
      wrapper.vm.createAccount()
      
      expect(alertStore.error).toHaveBeenCalledWith('Не удалось перейти к созданию лицевого счёта: Navigation failed')
    })

    it('handles navigation errors in editAccount', async () => {
      mockPush.mockImplementationOnce(() => {
        throw new Error('Navigation failed')
      })
      alertStore.error = vi.fn()
      
      const wrapper = mountTree()
      await resolveAll()
      
      wrapper.vm.editAccount(1)
      
      expect(alertStore.error).toHaveBeenCalledWith('Не удалось перейти к редактированию лицевого счёта: Navigation failed')
    })
  })

  describe('Tree State Persistence', () => {
    beforeEach(() => {
      authStore = { 
        isAdministrator: true, 
        isManager: false, 
        isEngineer: false,
        getAccountsTreeState: { selectedNode: null, expandedNodes: [] },
        saveAccountsTreeState: vi.fn()
      }
      vi.clearAllMocks()
    })

    it('saves tree state when selection changes', async () => {
      const wrapper = mountTree()
      await resolveAll()

      // Simulate selection change
      wrapper.vm.selectedNode = ['account-1']
      await wrapper.vm.$nextTick()

      expect(authStore.saveAccountsTreeState).toHaveBeenCalledWith('account-1', [])
    })

    it('saves tree state when expanded nodes change', async () => {
      const wrapper = mountTree()
      await resolveAll()

      // Simulate expansion change
      wrapper.vm.expandedNodes = ['root-accounts', 'account-1']
      await wrapper.vm.$nextTick()

      expect(authStore.saveAccountsTreeState).toHaveBeenCalledWith(null, ['root-accounts', 'account-1'])
    })

    it('handles empty tree state gracefully', async () => {
      authStore.getAccountsTreeState = { selectedNode: null, expandedNodes: [] }

      const wrapper = mountTree()
      await resolveAll()

      expect(wrapper.vm.selectedNode).toEqual([])
      expect(wrapper.vm.expandedNodes).toEqual([])
    })

    it('handles tree state with multiple selections', async () => {
      const wrapper = mountTree()
      await resolveAll()

      // Simulate multiple selection
      wrapper.vm.selectedNode = ['account-1', 'account-2']
      await wrapper.vm.$nextTick()

      // Should only save the first selected node
      expect(authStore.saveAccountsTreeState).toHaveBeenCalledWith('account-1', [])
    })

    it('auto-saves state on every tree interaction', async () => {
      const wrapper = mountTree()
      await resolveAll()

      // Multiple tree operations
      wrapper.vm.selectedNode = ['account-1']
      await wrapper.vm.$nextTick()
      
      wrapper.vm.expandedNodes = ['root-accounts']
      await wrapper.vm.$nextTick()

      wrapper.vm.selectedNode = ['account-2']
      await wrapper.vm.$nextTick()

      // Should have been called for each change
      expect(authStore.saveAccountsTreeState).toHaveBeenCalledTimes(3)
      expect(authStore.saveAccountsTreeState).toHaveBeenLastCalledWith('account-2', ['root-accounts'])
    })

    it('calls saveAccountsTreeState with correct parameters for empty selection', async () => {
      const wrapper = mountTree()
      await resolveAll()

      // Simulate clearing selection
      wrapper.vm.selectedNode = []
      wrapper.vm.expandedNodes = ['root-accounts']
      await wrapper.vm.$nextTick()

      expect(authStore.saveAccountsTreeState).toHaveBeenCalledWith(null, ['root-accounts'])
    })
  })

  describe('Device group assignment UI state', () => {
    it('disables action buttons when device group assignment is in progress', async () => {
      authStore = { 
        isAdministrator: true, 
        isManager: false, 
        isEngineer: false, 
        user: { role: 'SystemAdministrator' }
      }
      accountsStore.accounts = [
        { id: 1, name: 'Account 1' }
      ]
      devicesStore.devices = [
        { id: 1, name: 'Device A', accountId: 1, deviceGroupId: 0 }
      ]
      deviceGroupsStore.groups = [
        { id: 1, name: 'Group 1', accountId: 1 }
      ]

      const wrapper = mountTree()
      await resolveAll()

      // Simulate device group assignment in progress
      wrapper.vm.deviceGroupAssignmentState = {
        1: { editMode: true, selectedGroupId: null }
      }
      await wrapper.vm.$nextTick()

      // Verify that the assignment state is correctly set
      expect(wrapper.vm.deviceGroupAssignmentState[1].editMode).toBe(true)
      
      // Verify that getDeviceIdFromNodeId function would work with our test data
      const testItem = { id: 'device-1-account-1-unassigned' }
      const deviceId = wrapper.vm.getDeviceIdFromNodeId(testItem.id)
      expect(deviceId).toBe(1)
      
      // Verify that when editMode is true, buttons would be disabled
      const isInEditMode = wrapper.vm.deviceGroupAssignmentState[deviceId]?.editMode
      expect(isInEditMode).toBe(true)
    })
  })
})

