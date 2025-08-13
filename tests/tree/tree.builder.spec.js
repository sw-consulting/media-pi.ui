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

import { describe, it, expect, vi } from 'vitest'
import {
  getUnassignedDevices,
  getAccountChildren,
  buildTreeItems
} from '@/helpers/tree/tree.builder.js'

describe('Tree Builder Functions', () => {
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

      const result = getUnassignedDevices(devicesStore)

      expect(result).toEqual([
        { id: 'device-1', name: 'Device 1' },
        { id: 'device-2', name: 'Device 2' },
        { id: 'device-4', name: 'Device 4' }
      ])
    })

    it('should return empty array when no devices exist', () => {
      const devicesStore = { devices: null }
      const result = getUnassignedDevices(devicesStore)
      expect(result).toEqual([])
    })

    it('should return empty array when devices array is empty', () => {
      const devicesStore = { devices: [] }
      const result = getUnassignedDevices(devicesStore)
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

      const result = getAccountChildren(accountId, devicesStore, deviceGroupsStore)

      expect(result).toHaveLength(2)
      
      // Check unassigned devices node
      const unassignedNode = result.find(node => node.id === 'account-1-unassigned')
      expect(unassignedNode).toBeDefined()
      expect(unassignedNode.name).toBe('Нераспределённые устройства')
      expect(unassignedNode.children).toEqual([
        { id: 'device-1-account-1-unassigned', name: 'Device 1' },
        { id: 'device-2-account-1-unassigned', name: 'Device 2' }
      ])

      // Check groups container node
      const groupsNode = result.find(node => node.id === 'account-1-groups')
      expect(groupsNode).toBeDefined()
      expect(groupsNode.name).toBe('Группы устройств')
      expect(groupsNode.children).toHaveLength(1)
      expect(groupsNode.children[0]).toEqual({
        id: 'group-1',
        name: 'Group 1',
        children: [{ id: 'device-3-account-1-group-1', name: 'Device 3' }]
      })
    })

    it('should return empty children when no devices or groups exist for account', () => {
      const accountId = 999
      const devicesStore = { devices: [] }
      const deviceGroupsStore = { groups: [] }

      const result = getAccountChildren(accountId, devicesStore, deviceGroupsStore)

      expect(result).toHaveLength(2)
      expect(result[0].children).toEqual([]) // unassigned devices
      expect(result[1].children).toEqual([]) // groups
    })

    it('should handle null/undefined store data', () => {
      const accountId = 1
      const devicesStore = { devices: null }
      const deviceGroupsStore = { groups: null }

      const result = getAccountChildren(accountId, devicesStore, deviceGroupsStore)

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

      const result = buildTreeItems(
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

      const result = buildTreeItems(
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

      const result = buildTreeItems(
        canViewUnassignedDevices,
        canViewAccounts,
        loadedNodes,
        accountsStore,
        devicesStore,
        deviceGroupsStore
      )

      expect(result).toEqual([])
    })

    it('should handle device group containers with proper lazy loading', () => {
      const canViewUnassignedDevices = false
      const canViewAccounts = true
      const loadedNodes = new Set(['account-1']) // Account is loaded but groups container is not
      const accountsStore = {
        accounts: [{ id: 1, name: 'Account 1' }]
      }
      const devicesStore = { devices: [] }
      const deviceGroupsStore = { 
        groups: [{ id: 1, name: 'Group 1', accountId: 1 }] 
      }
      
      // Mock getAccountChildren to return device groups container
      const mockGetAccountChildren = vi.fn().mockReturnValue([
        {
          id: 'account-1-unassigned',
          name: 'Нераспределённые устройства',
          children: []
        },
        {
          id: 'account-1-groups',
          name: 'Группы устройств',
          children: [{ id: 'group-1', name: 'Group 1', children: [] }]
        }
      ])

      const result = buildTreeItems(
        canViewUnassignedDevices,
        canViewAccounts,
        loadedNodes,
        accountsStore,
        devicesStore,
        deviceGroupsStore,
        undefined, // use default getUnassignedDevices
        mockGetAccountChildren
      )

      expect(result).toHaveLength(1)
      const accountsRoot = result[0]
      expect(accountsRoot.children).toHaveLength(1)
      
      const account = accountsRoot.children[0]
      expect(account.id).toBe('account-1')
      expect(account.children).toHaveLength(2)
      
      // Device groups container should have empty children since it's not loaded
      const groupsContainer = account.children.find(child => child.id === 'account-1-groups')
      expect(groupsContainer).toBeDefined()
      expect(groupsContainer.children).toEqual([]) // Should be empty for lazy loading
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

      const result = buildTreeItems(
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
})
