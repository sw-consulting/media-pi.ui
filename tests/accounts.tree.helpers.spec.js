// Copyright (c) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software")
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

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { useAccountsTreeHelper } from '@/helpers/accounts.tree.helpers.js'

describe('useAccountsTreeHelper', () => {
  let helper

  beforeEach(() => {
    helper = useAccountsTreeHelper()
  })

  describe('getUnassignedDevices', () => {
    it('should return devices without accountId', () => {
      const devicesStore = {
        devices: [
          { id: 1, name: 'Device 1', accountId: null },
          { id: 2, name: 'Device 2', accountId: 0 },
          { id: 3, name: 'Device 3', accountId: 1 },
          { id: 4, name: 'Device 4' } // no accountId property
        ]
      }

      const result = helper.getUnassignedDevices(devicesStore)

      expect(result).toEqual([
        { id: 'device-1', name: 'Device 1' },
        { id: 'device-2', name: 'Device 2' },
        { id: 'device-4', name: 'Device 4' }
      ])
    })

    it('should return empty array when no devices exist', () => {
      const devicesStore = { devices: null }
      const result = helper.getUnassignedDevices(devicesStore)
      expect(result).toEqual([])
    })

    it('should return empty array when devices array is empty', () => {
      const devicesStore = { devices: [] }
      const result = helper.getUnassignedDevices(devicesStore)
      expect(result).toEqual([])
    })
  })

  describe('getAccountChildren', () => {
    it('should return account children with unassigned devices and groups', () => {
      const accountId = 1
      const devicesStore = {
        devices: [
          { id: 1, name: 'Device 1', accountId: 1, deviceGroupId: null },
          { id: 2, name: 'Device 2', accountId: 1, deviceGroupId: 0 },
          { id: 3, name: 'Device 3', accountId: 1, deviceGroupId: 1 },
          { id: 4, name: 'Device 4', accountId: 2 } // different account
        ]
      }
      const deviceGroupsStore = {
        groups: [
          { id: 1, name: 'Group 1', accountId: 1 },
          { id: 2, name: 'Group 2', accountId: 2 } // different account
        ]
      }

      const result = helper.getAccountChildren(accountId, devicesStore, deviceGroupsStore)

      expect(result).toHaveLength(2)
      
      // Check unassigned devices node
      const unassignedNode = result.find(node => node.id === 'account-1-unassigned')
      expect(unassignedNode).toBeDefined()
      expect(unassignedNode.name).toBe('Нераспределённые устройства')
      expect(unassignedNode.children).toEqual([
        { id: 'device-1', name: 'Device 1' },
        { id: 'device-2', name: 'Device 2' }
      ])

      // Check groups container node
      const groupsNode = result.find(node => node.id === 'account-1-groups')
      expect(groupsNode).toBeDefined()
      expect(groupsNode.name).toBe('Группы устройств')
      expect(groupsNode.children).toHaveLength(1)
      expect(groupsNode.children[0]).toEqual({
        id: 'group-1',
        name: 'Group 1',
        children: [{ id: 'device-3', name: 'Device 3' }]
      })
    })

    it('should return empty children when no devices or groups exist for account', () => {
      const accountId = 999
      const devicesStore = { devices: [] }
      const deviceGroupsStore = { groups: [] }

      const result = helper.getAccountChildren(accountId, devicesStore, deviceGroupsStore)

      expect(result).toHaveLength(2)
      expect(result[0].children).toEqual([]) // unassigned devices
      expect(result[1].children).toEqual([]) // groups
    })

    it('should handle null/undefined store data', () => {
      const accountId = 1
      const devicesStore = { devices: null }
      const deviceGroupsStore = { groups: null }

      const result = helper.getAccountChildren(accountId, devicesStore, deviceGroupsStore)

      expect(result).toHaveLength(2)
      expect(result[0].children).toEqual([])
      expect(result[1].children).toEqual([])
    })
  })

  describe('buildTreeItems', () => {
    it('should build complete tree structure when user can view everything', () => {
      const canViewUnassignedDevices = true
      const canViewAccounts = true
      const loadedNodes = new Set()
      const accountsStore = {
        accounts: [
          { id: 1, name: 'Account 1' },
          { id: 2, name: 'Account 2' }
        ]
      }
      const devicesStore = { devices: [] }
      const deviceGroupsStore = { groups: [] }

      const result = helper.buildTreeItems(
        canViewUnassignedDevices,
        canViewAccounts,
        loadedNodes,
        accountsStore,
        devicesStore,
        deviceGroupsStore
      )

      expect(result).toHaveLength(2)
      
      // Check unassigned devices root
      expect(result[0]).toEqual({
        id: 'root-unassigned',
        name: 'Нераспределённые устройства',
        children: []
      })

      // Check accounts root
      const accountsRoot = result[1]
      expect(accountsRoot.id).toBe('root-accounts')
      expect(accountsRoot.name).toBe('Лицевые счета')
      expect(accountsRoot.children).toHaveLength(2)
      expect(accountsRoot.children[0]).toEqual({
        id: 'account-1',
        name: 'Account 1',
        children: []
      })
    })

    it('should only show unassigned devices when user cannot view accounts', () => {
      const canViewUnassignedDevices = true
      const canViewAccounts = false
      const loadedNodes = new Set()
      const accountsStore = { accounts: [] }
      const devicesStore = { devices: [] }
      const deviceGroupsStore = { groups: [] }

      const result = helper.buildTreeItems(
        canViewUnassignedDevices,
        canViewAccounts,
        loadedNodes,
        accountsStore,
        devicesStore,
        deviceGroupsStore
      )

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('root-unassigned')
    })

    it('should return empty array when user cannot view anything', () => {
      const canViewUnassignedDevices = false
      const canViewAccounts = false
      const loadedNodes = new Set()
      const accountsStore = { accounts: [] }
      const devicesStore = { devices: [] }
      const deviceGroupsStore = { groups: [] }

      const result = helper.buildTreeItems(
        canViewUnassignedDevices,
        canViewAccounts,
        loadedNodes,
        accountsStore,
        devicesStore,
        deviceGroupsStore
      )

      expect(result).toEqual([])
    })

    it('should show loaded children when node is already loaded', () => {
      const canViewUnassignedDevices = true
      const canViewAccounts = false
      const loadedNodes = new Set(['root-unassigned'])
      const accountsStore = { accounts: [] }
      const devicesStore = {
        devices: [{ id: 1, name: 'Device 1', accountId: null }]
      }
      const deviceGroupsStore = { groups: [] }

      const result = helper.buildTreeItems(
        canViewUnassignedDevices,
        canViewAccounts,
        loadedNodes,
        accountsStore,
        devicesStore,
        deviceGroupsStore
      )

      expect(result[0].children).toEqual([
        { id: 'device-1', name: 'Device 1' }
      ])
    })
  })

  describe('createLoadChildrenHandler', () => {
    let loadedNodes, loadingNodes, devicesStore, deviceGroupsStore, alertStore
    let loadChildrenHandler

    beforeEach(() => {
      loadedNodes = ref(new Set())
      loadingNodes = ref(new Set())
      devicesStore = {
        getAll: vi.fn().mockResolvedValue()
      }
      deviceGroupsStore = {
        getAll: vi.fn().mockResolvedValue()
      }
      alertStore = {
        error: vi.fn()
      }

      loadChildrenHandler = helper.createLoadChildrenHandler(
        loadedNodes,
        loadingNodes,
        devicesStore,
        deviceGroupsStore,
        alertStore
      )
    })

    it('should load devices for root-unassigned node', async () => {
      const item = { id: 'root-unassigned', name: 'Unassigned Devices' }

      await loadChildrenHandler(item)

      expect(devicesStore.getAll).toHaveBeenCalled()
      expect(loadedNodes.value.has('root-unassigned')).toBe(true)
      expect(loadingNodes.value.has('root-unassigned')).toBe(false)
    })

    it('should load devices and groups for account node', async () => {
      const item = { id: 'account-1', name: 'Account 1' }

      await loadChildrenHandler(item)

      expect(devicesStore.getAll).toHaveBeenCalled()
      expect(deviceGroupsStore.getAll).toHaveBeenCalled()
      expect(loadedNodes.value.has('account-1')).toBe(true)
      expect(loadingNodes.value.has('account-1')).toBe(false)
    })

    it('should prevent duplicate loading', async () => {
      const item = { id: 'root-unassigned', name: 'Unassigned Devices' }
      loadedNodes.value.add('root-unassigned')

      await loadChildrenHandler(item)

      expect(devicesStore.getAll).not.toHaveBeenCalled()
    })

    it('should prevent loading when already loading', async () => {
      const item = { id: 'root-unassigned', name: 'Unassigned Devices' }
      loadingNodes.value.add('root-unassigned')

      await loadChildrenHandler(item)

      expect(devicesStore.getAll).not.toHaveBeenCalled()
    })

    it('should handle loading errors', async () => {
      const item = { id: 'root-unassigned', name: 'Unassigned Devices' }
      const error = new Error('Network error')
      devicesStore.getAll.mockRejectedValue(error)

      await loadChildrenHandler(item)

      expect(alertStore.error).toHaveBeenCalledWith(
        'Не удалось загрузить данные для "Unassigned Devices": Network error'
      )
      expect(loadingNodes.value.has('root-unassigned')).toBe(false)
    })
  })

  describe('createStateManager', () => {
    let authStore, stateManager

    beforeEach(() => {
      authStore = {
        getAccountsTreeState: {
          selectedNode: 'account-1',
          expandedNodes: ['root-accounts', 'account-1']
        },
        saveAccountsTreeState: vi.fn()
      }

      stateManager = helper.createStateManager(authStore)
    })

    it('should restore tree state from auth store', () => {
      const selectedNode = ref([])
      const expandedNodes = ref([])

      stateManager.restoreTreeState(selectedNode, expandedNodes)

      expect(selectedNode.value).toEqual(['account-1'])
      expect(expandedNodes.value).toEqual(['root-accounts', 'account-1'])
    })

    it('should handle missing saved state', () => {
      authStore.getAccountsTreeState = {}
      const selectedNode = ref(['initial'])
      const expandedNodes = ref(['initial'])

      stateManager.restoreTreeState(selectedNode, expandedNodes)

      expect(selectedNode.value).toEqual(['initial'])
      expect(expandedNodes.value).toEqual(['initial'])
    })

    it('should save tree state to auth store', () => {
      const selectedNode = ref(['account-2'])
      const expandedNodes = ref(['root-accounts'])

      stateManager.saveTreeState(selectedNode, expandedNodes)

      expect(authStore.saveAccountsTreeState).toHaveBeenCalledWith(
        'account-2',
        ['root-accounts']
      )
    })

    it('should handle empty selection when saving', () => {
      const selectedNode = ref([])
      const expandedNodes = ref([])

      stateManager.saveTreeState(selectedNode, expandedNodes)

      expect(authStore.saveAccountsTreeState).toHaveBeenCalledWith(null, [])
    })
  })

  describe('createAccountActions', () => {
    let router, alertStore, accountsStore, confirmDelete, actions

    beforeEach(() => {
      router = {
        push: vi.fn()
      }
      alertStore = {
        error: vi.fn()
      }
      accountsStore = {
        accounts: [
          { id: 1, name: 'Account 1' },
          { id: 2, name: 'Account 2' }
        ],
        delete: vi.fn().mockResolvedValue()
      }
      confirmDelete = vi.fn().mockResolvedValue(true)

      actions = helper.createAccountActions(router, alertStore, accountsStore, confirmDelete)
    })

    describe('createAccount', () => {
      it('should navigate to create account page', () => {
        actions.createAccount()
        expect(router.push).toHaveBeenCalledWith('/account/create')
      })

      it('should handle navigation errors', () => {
        const error = new Error('Navigation failed')
        router.push.mockImplementation(() => { throw error })

        actions.createAccount()

        expect(alertStore.error).toHaveBeenCalledWith(
          'Не удалось перейти к созданию лицевого счёта: Navigation failed'
        )
      })
    })

    describe('editAccount', () => {
      it('should navigate to edit account page with object parameter', () => {
        actions.editAccount({ id: 1 })
        expect(router.push).toHaveBeenCalledWith('/account/edit/1')
      })

      it('should navigate to edit account page with primitive parameter', () => {
        actions.editAccount(2)
        expect(router.push).toHaveBeenCalledWith('/account/edit/2')
      })

      it('should handle navigation errors', () => {
        const error = new Error('Navigation failed')
        router.push.mockImplementation(() => { throw error })

        actions.editAccount(1)

        expect(alertStore.error).toHaveBeenCalledWith(
          'Не удалось перейти к редактированию лицевого счёта: Navigation failed'
        )
      })
    })

    describe('deleteAccount', () => {
      it('should delete account after confirmation', async () => {
        await actions.deleteAccount({ id: 1 })

        expect(confirmDelete).toHaveBeenCalledWith('Account 1', 'лицевой счёт')
        expect(accountsStore.delete).toHaveBeenCalledWith(1)
      })

      it('should not delete account if not confirmed', async () => {
        confirmDelete.mockResolvedValue(false)

        await actions.deleteAccount({ id: 1 })

        expect(accountsStore.delete).not.toHaveBeenCalled()
      })

      it('should handle primitive id parameter', async () => {
        await actions.deleteAccount(2)

        expect(confirmDelete).toHaveBeenCalledWith('Account 2', 'лицевой счёт')
        expect(accountsStore.delete).toHaveBeenCalledWith(2)
      })

      it('should handle missing account', async () => {
        await actions.deleteAccount({ id: 999 })

        expect(confirmDelete).not.toHaveBeenCalled()
        expect(accountsStore.delete).not.toHaveBeenCalled()
      })

      it('should handle deletion errors', async () => {
        const error = new Error('Delete failed')
        accountsStore.delete.mockRejectedValue(error)

        await actions.deleteAccount({ id: 1 })

        expect(alertStore.error).toHaveBeenCalledWith(
          'Ошибка при удалении лицевого счёта: Delete failed'
        )
      })
    })
  })

  describe('createDeviceGroupActions', () => {
    let router, alertStore, deviceGroupsStore, confirmDelete, actions

    beforeEach(() => {
      router = {
        push: vi.fn()
      }
      alertStore = {
        error: vi.fn()
      }
      deviceGroupsStore = {
        groups: [
          { id: 1, name: 'Group 1' },
          { id: 2, name: 'Group 2' }
        ],
        delete: vi.fn().mockResolvedValue()
      }
      confirmDelete = vi.fn().mockResolvedValue(true)

      actions = helper.createDeviceGroupActions(router, alertStore, deviceGroupsStore, confirmDelete)
    })

    describe('createDeviceGroup', () => {
      it('should navigate to create device group page with account ID', () => {
        const item = { id: 'account-123-groups' }
        actions.createDeviceGroup(item)
        expect(router.push).toHaveBeenCalledWith({ name: 'Создание группы устройств', params: { accountId: '123' } })
      })

      it('should handle invalid item id format', () => {
        const item = { id: 'invalid-format' }
        actions.createDeviceGroup(item)
        expect(alertStore.error).toHaveBeenCalledWith('Не удалось определить лицевой счёт для создания группы устройств')
      })

      it('should handle navigation errors', () => {
        const error = new Error('Navigation failed')
        router.push.mockImplementation(() => { throw error })
        const item = { id: 'account-123-groups' }

        actions.createDeviceGroup(item)

        expect(alertStore.error).toHaveBeenCalledWith(
          'Не удалось перейти к созданию группы устройств: Navigation failed'
        )
      })
    })

    describe('editDeviceGroup', () => {
      it('should navigate to edit device group page with object parameter', () => {
        actions.editDeviceGroup({ id: 1 })
        expect(router.push).toHaveBeenCalledWith({ name: 'Настройки группы устройств', params: { id: 1 } })
      })

      it('should navigate to edit device group page with primitive parameter', () => {
        actions.editDeviceGroup(2)
        expect(router.push).toHaveBeenCalledWith({ name: 'Настройки группы устройств', params: { id: 2 } })
      })

      it('should handle navigation errors', () => {
        const error = new Error('Navigation failed')
        router.push.mockImplementation(() => { throw error })

        actions.editDeviceGroup(1)

        expect(alertStore.error).toHaveBeenCalledWith(
          'Не удалось перейти к редактированию группы устройств: Navigation failed'
        )
      })
    })

    describe('deleteDeviceGroup', () => {
      it('should delete device group after confirmation', async () => {
        await actions.deleteDeviceGroup({ id: 1 })

        expect(confirmDelete).toHaveBeenCalledWith('Group 1', 'группу устройств')
        expect(deviceGroupsStore.delete).toHaveBeenCalledWith(1)
      })

      it('should not delete device group if not confirmed', async () => {
        confirmDelete.mockResolvedValue(false)

        await actions.deleteDeviceGroup({ id: 1 })

        expect(deviceGroupsStore.delete).not.toHaveBeenCalled()
      })

      it('should handle primitive id parameter', async () => {
        await actions.deleteDeviceGroup(2)

        expect(confirmDelete).toHaveBeenCalledWith('Group 2', 'группу устройств')
        expect(deviceGroupsStore.delete).toHaveBeenCalledWith(2)
      })

      it('should handle missing device group', async () => {
        await actions.deleteDeviceGroup({ id: 999 })

        expect(confirmDelete).not.toHaveBeenCalled()
        expect(deviceGroupsStore.delete).not.toHaveBeenCalled()
      })

      it('should handle deletion errors', async () => {
        const error = new Error('Delete failed')
        deviceGroupsStore.delete.mockRejectedValue(error)

        await actions.deleteDeviceGroup({ id: 1 })

        expect(alertStore.error).toHaveBeenCalledWith(
          'Ошибка при удалении группы устройств: Delete failed'
        )
      })
    })
  })

  describe('getGroupIdFromNodeId', () => {
    it('should extract group ID from node ID', () => {
      expect(helper.getGroupIdFromNodeId('group-123')).toBe(123)
      expect(helper.getGroupIdFromNodeId('group-1')).toBe(1)
    })

    it('should return null for non-group node IDs', () => {
      expect(helper.getGroupIdFromNodeId('device-123')).toBe(null)
      expect(helper.getGroupIdFromNodeId('account-456')).toBe(null)
      expect(helper.getGroupIdFromNodeId('root-accounts')).toBe(null)
    })

    it('should handle invalid input', () => {
      expect(helper.getGroupIdFromNodeId('')).toBe(null)
      expect(helper.getGroupIdFromNodeId(null)).toBe(null)
      expect(helper.getGroupIdFromNodeId(undefined)).toBe(null)
    })
  })

  describe('getAccountIdFromNodeId', () => {
    it('should extract account ID from node ID', () => {
      expect(helper.getAccountIdFromNodeId('account-123')).toBe(123)
      expect(helper.getAccountIdFromNodeId('account-1')).toBe(1)
    })

    it('should return null for non-account node IDs', () => {
      expect(helper.getAccountIdFromNodeId('device-123')).toBe(null)
      expect(helper.getAccountIdFromNodeId('group-456')).toBe(null)
      expect(helper.getAccountIdFromNodeId('root-accounts')).toBe(null)
    })

    it('should handle invalid input', () => {
      expect(helper.getAccountIdFromNodeId('')).toBe(null)
      expect(helper.getAccountIdFromNodeId(null)).toBe(null)
      expect(helper.getAccountIdFromNodeId(undefined)).toBe(null)
    })
  })

  describe('createPermissionCheckers', () => {
    let authStore, permissions

    beforeEach(() => {
      authStore = {
        isAdministrator: false,
        isManager: false,
        isEngineer: false
      }

      permissions = helper.createPermissionCheckers(authStore)
    })

    it('should allow administrators to view everything', () => {
      authStore.isAdministrator = true

      expect(permissions.canViewUnassignedDevices.value).toBe(true)
      expect(permissions.canViewAccounts.value).toBe(true)
      expect(permissions.canEditAccounts.value).toBe(true)
      expect(permissions.canCreateDeleteAccounts.value).toBe(true)
    })

    it('should allow managers to view and edit accounts but not unassigned devices', () => {
      authStore.isManager = true

      expect(permissions.canViewUnassignedDevices.value).toBe(false)
      expect(permissions.canViewAccounts.value).toBe(true)
      expect(permissions.canEditAccounts.value).toBe(true)
      expect(permissions.canCreateDeleteAccounts.value).toBe(false)
    })

    it('should allow engineers to view unassigned devices but not accounts', () => {
      authStore.isEngineer = true

      expect(permissions.canViewUnassignedDevices.value).toBe(true)
      expect(permissions.canViewAccounts.value).toBe(false)
      expect(permissions.canEditAccounts.value).toBe(false)
      expect(permissions.canCreateDeleteAccounts.value).toBe(false)
    })

    it('should deny everything for regular users', () => {
      expect(permissions.canViewUnassignedDevices.value).toBe(false)
      expect(permissions.canViewAccounts.value).toBe(false)
      expect(permissions.canEditAccounts.value).toBe(false)
      expect(permissions.canCreateDeleteAccounts.value).toBe(false)
    })
  })
})
