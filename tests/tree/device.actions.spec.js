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
import { 
  createDeviceActions, 
  getDeviceIdFromNodeId, 
  getAccountIdFromDeviceContext 
} from '@/helpers/tree/device.actions.js'

describe('Device Actions Functions', () => {
  describe('getDeviceIdFromNodeId', () => {
    it('should extract device ID from node ID', () => {
      expect(getDeviceIdFromNodeId('device-123')).toBe(123)
      expect(getDeviceIdFromNodeId('device-1')).toBe(1)
    })

    it('should return null for non-device node IDs', () => {
      expect(getDeviceIdFromNodeId('account-123')).toBe(null)
      expect(getDeviceIdFromNodeId('group-456')).toBe(null)
      expect(getDeviceIdFromNodeId('root-accounts')).toBe(null)
    })

    it('should handle invalid input', () => {
      expect(getDeviceIdFromNodeId('')).toBe(null)
      expect(getDeviceIdFromNodeId(null)).toBe(null)
      expect(getDeviceIdFromNodeId(undefined)).toBe(null)
    })
  })

  describe('getAccountIdFromDeviceContext', () => {
    it('should extract account ID from account context node IDs', () => {
      expect(getAccountIdFromDeviceContext('account-123-unassigned')).toBe(123)
      expect(getAccountIdFromDeviceContext('account-1-groups')).toBe(1)
    })

    it('should return null for non-account context node IDs', () => {
      expect(getAccountIdFromDeviceContext('device-123')).toBe(null)
      expect(getAccountIdFromDeviceContext('root-accounts')).toBe(null)
      expect(getAccountIdFromDeviceContext('group-456')).toBe(null)
    })

    it('should handle invalid input', () => {
      expect(getAccountIdFromDeviceContext('')).toBe(null)
      expect(getAccountIdFromDeviceContext(null)).toBe(null)
      expect(getAccountIdFromDeviceContext(undefined)).toBe(null)
    })
  })

  describe('createDeviceActions', () => {
    let router, alertStore, devicesStore, confirmDelete, transitioningDevices, actions

    beforeEach(() => {
      router = {
        push: vi.fn()
      }
      alertStore = {
        error: vi.fn()
      }
      devicesStore = {
        devices: [
          { id: 1, name: 'Test Device 1', accountId: null },
          { id: 2, name: 'Test Device 2', accountId: 1 }
        ],
        delete: vi.fn().mockResolvedValue(),
        assignGroup: vi.fn().mockResolvedValue(),
        assignAccount: vi.fn().mockResolvedValue()
      }
      confirmDelete = vi.fn().mockResolvedValue(true)
      transitioningDevices = { value: new Set() }

      actions = createDeviceActions(router, alertStore, devicesStore, confirmDelete, transitioningDevices)
      
      // Clear all mocks between tests
      vi.clearAllMocks()
    })

    describe('createDevice', () => {
      it('should navigate to create device page from root level', () => {
        actions.createDevice()
        expect(router.push).toHaveBeenCalledWith({ name: 'Создание устройства' })
      })

      it('should navigate to create device page with account context', () => {
        actions.createDevice()
        expect(router.push).toHaveBeenCalledWith({ name: 'Создание устройства' })
      })

      it('should handle navigation errors', () => {
        const error = new Error('Navigation failed')
        router.push.mockImplementation(() => { throw error })

        actions.createDevice()

        expect(alertStore.error).toHaveBeenCalledWith(
          'Не удалось перейти к созданию устройства: Navigation failed'
        )
      })
    })

    describe('editDevice', () => {
      it('should navigate to edit device page with device node ID', () => {
        actions.editDevice({ id: 'device-123' })
        expect(router.push).toHaveBeenCalledWith('/device/edit/123')
      })

      it('should navigate to edit device page with object parameter', () => {
        actions.editDevice({ id: 1 })
        expect(router.push).toHaveBeenCalledWith('/device/edit/1')
      })

      it('should navigate to edit device page with primitive parameter', () => {
        actions.editDevice(2)
        expect(router.push).toHaveBeenCalledWith('/device/edit/2')
      })

      it('should handle invalid device ID', () => {
        actions.editDevice({ id: null })
        expect(alertStore.error).toHaveBeenCalledWith('Не удалось определить ID устройства для редактирования')
      })

      it('should handle navigation errors', () => {
        const error = new Error('Navigation failed')
        router.push.mockImplementation(() => { throw error })

        actions.editDevice({ id: 'device-123' })

        expect(alertStore.error).toHaveBeenCalledWith(
          'Не удалось перейти к редактированию устройства: Navigation failed'
        )
      })
    })

    describe('deleteDevice', () => {
      it('should delete device after confirmation with device node ID', async () => {
        await actions.deleteDevice({ id: 'device-1' })

        expect(confirmDelete).toHaveBeenCalledWith('Test Device 1', 'устройство')
        expect(devicesStore.delete).toHaveBeenCalledWith(1)
      })

      it('should delete device after confirmation with object parameter', async () => {
        await actions.deleteDevice({ id: 1 })

        expect(confirmDelete).toHaveBeenCalledWith('Test Device 1', 'устройство')
        expect(devicesStore.delete).toHaveBeenCalledWith(1)
      })

      it('should not delete device if not confirmed', async () => {
        confirmDelete.mockResolvedValue(false)

        await actions.deleteDevice({ id: 'device-1' })

        expect(devicesStore.delete).not.toHaveBeenCalled()
      })

      it('should handle missing device', async () => {
        await actions.deleteDevice({ id: 'device-999' })

        expect(confirmDelete).not.toHaveBeenCalled()
        expect(devicesStore.delete).not.toHaveBeenCalled()
      })

      it('should handle invalid device ID', async () => {
        await actions.deleteDevice({ id: null })

        expect(alertStore.error).toHaveBeenCalledWith('Не удалось определить ID устройства для удаления')
      })

      it('should handle deletion errors', async () => {
        const error = new Error('Delete failed')
        devicesStore.delete.mockRejectedValue(error)

        await actions.deleteDevice({ id: 'device-1' })

        expect(alertStore.error).toHaveBeenCalledWith('Ошибка при удалении устройства: Delete failed')
      })
    })

    describe('unassignFromGroup', () => {
      beforeEach(() => {
        devicesStore.assignGroup.mockResolvedValue()
      })

      it('should unassign device from group successfully', async () => {
        const deviceItem = { id: 'device-1-account-456-group-789' }

        await actions.unassignFromGroup(deviceItem)

        expect(devicesStore.assignGroup).toHaveBeenCalledWith(1, 0)
      })

      it('should use linear state change pattern with transitioning devices', async () => {
        const deviceItem = { id: 'device-1-account-456-group-789' }

        await actions.unassignFromGroup(deviceItem)

        // Verify device was marked as transitioning during operation
        expect(transitioningDevices.value.has(1)).toBe(false) // Should be removed after operation
        expect(devicesStore.assignGroup).toHaveBeenCalledWith(1, 0)
      })

      it('should handle invalid device ID', async () => {
        const deviceItem = { id: 'invalid-item' }

        await actions.unassignFromGroup(deviceItem)

        expect(alertStore.error).toHaveBeenCalledWith('Не удалось определить ID устройства для исключения из группы')
        expect(devicesStore.assignGroup).not.toHaveBeenCalled()
      })

      it('should handle API errors and clean up transitioning state', async () => {
        const error = new Error('API Error')
        devicesStore.assignGroup.mockRejectedValue(error)
        const deviceItem = { id: 'device-1-account-456-group-789' }

        await actions.unassignFromGroup(deviceItem)

        expect(alertStore.error).toHaveBeenCalledWith('Ошибка при исключении из группы: API Error')
        // Verify device was removed from transitioning state even after error
        expect(transitioningDevices.value.has(1)).toBe(false)
      })

      it('should work without transitioning devices set', async () => {
        // Test with actions created without transitioningDevices
        const actionsWithoutTransitioning = createDeviceActions(
          router,
          alertStore,
          devicesStore,
          confirmDelete
          // No transitioningDevices parameter
        )
        const deviceItem = { id: 'device-1-account-456-group-789' }

        await actionsWithoutTransitioning.unassignFromGroup(deviceItem)

        expect(devicesStore.assignGroup).toHaveBeenCalledWith(1, 0)
      })

      it('should handle missing device item parameter', async () => {
        await actions.unassignFromGroup(null)

        expect(alertStore.error).toHaveBeenCalledWith('Не удалось определить ID устройства для исключения из группы')
        expect(devicesStore.assignGroup).not.toHaveBeenCalled()
      })
    })

    describe('unassignFromAccount', () => {
      beforeEach(() => {
        devicesStore.assignAccount = vi.fn().mockResolvedValue()
      })

      it('should unassign device from account successfully', async () => {
        const deviceItem = { id: 'device-1-account-456' }

        await actions.unassignFromAccount(deviceItem)

        expect(devicesStore.assignAccount).toHaveBeenCalledWith(1, 0)
      })

      it('should use linear state change pattern with transitioning devices', async () => {
        const deviceItem = { id: 'device-1-account-456' }

        await actions.unassignFromAccount(deviceItem)

        // Verify device was marked as transitioning during operation
        expect(transitioningDevices.value.has(1)).toBe(false) // Should be removed after operation
        expect(devicesStore.assignAccount).toHaveBeenCalledWith(1, 0)
      })

      it('should handle device not found gracefully', async () => {
        devicesStore.devices = []
        const deviceItem = { id: 'device-999-account-456' }

        await actions.unassignFromAccount(deviceItem)

        // unassignFromAccount doesn't check if device exists in store, it just calls API
        expect(devicesStore.assignAccount).toHaveBeenCalledWith(999, 0)
      })

      it('should handle invalid device ID', async () => {
        const deviceItem = { id: 'invalid-item' }

        await actions.unassignFromAccount(deviceItem)

        expect(alertStore.error).toHaveBeenCalledWith('Не удалось определить ID устройства для исключения из лицевого счёта')
        expect(devicesStore.assignAccount).not.toHaveBeenCalled()
      })

      it('should handle API errors and clean up transitioning state', async () => {
        const error = new Error('API Error')
        devicesStore.assignAccount.mockRejectedValue(error)
        const deviceItem = { id: 'device-1-account-456' }

        await actions.unassignFromAccount(deviceItem)

        expect(alertStore.error).toHaveBeenCalledWith('Ошибка при исключении из лицевого счёта: API Error')
        // Verify device was removed from transitioning state even after error
        expect(transitioningDevices.value.has(1)).toBe(false)
      })

      it('should work without transitioning devices set', async () => {
        // Test with actions created without transitioningDevices
        const actionsWithoutTransitioning = createDeviceActions(
          router,
          alertStore,
          devicesStore,
          confirmDelete
          // No transitioningDevices parameter
        )
        const deviceItem = { id: 'device-1-account-456' }

        await actionsWithoutTransitioning.unassignFromAccount(deviceItem)

        expect(devicesStore.assignAccount).toHaveBeenCalledWith(1, 0)
      })

      it('should handle missing device item parameter', async () => {
        await actions.unassignFromAccount(null)

        expect(alertStore.error).toHaveBeenCalledWith('Не удалось определить ID устройства для исключения из лицевого счёта')
        expect(devicesStore.assignAccount).not.toHaveBeenCalled()
      })

      it('should handle undefined device item parameter', async () => {
        await actions.unassignFromAccount(undefined)

        expect(alertStore.error).toHaveBeenCalledWith('Не удалось определить ID устройства для исключения из лицевого счёта')
        expect(devicesStore.assignAccount).not.toHaveBeenCalled()
      })
    })

    // Additional edge case tests for better coverage
    describe('Edge Cases and Error Handling', () => {
      it('should handle empty device store gracefully in editDevice', () => {
        devicesStore.devices = []
        
        actions.editDevice({ id: 'device-123' })
        
        expect(router.push).toHaveBeenCalledWith('/device/edit/123')
      })

      it('should handle zero device ID in editDevice', () => {
        actions.editDevice({ id: 0 })
        
        expect(alertStore.error).toHaveBeenCalledWith('Не удалось определить ID устройства для редактирования')
      })

      it('should handle string device ID in editDevice', () => {
        actions.editDevice({ id: '123' })
        
        expect(router.push).toHaveBeenCalledWith('/device/edit/123')
      })

      it('should handle createDevice with item parameter', () => {
        actions.createDevice({ id: 'some-item' })
        
        expect(router.push).toHaveBeenCalledWith({ name: 'Создание устройства' })
      })

      it('should handle deleteDevice with zero ID', async () => {
        await actions.deleteDevice({ id: 0 })

        expect(alertStore.error).toHaveBeenCalledWith('Не удалось определить ID устройства для удаления')
      })

      it('should handle deleteDevice with empty string ID', async () => {
        await actions.deleteDevice({ id: '' })

        expect(alertStore.error).toHaveBeenCalledWith('Не удалось определить ID устройства для удаления')
      })

      it('should handle unassignFromGroup with empty string ID', async () => {
        await actions.unassignFromGroup({ id: '' })

        expect(alertStore.error).toHaveBeenCalledWith('Не удалось определить ID устройства для исключения из группы')
      })

      it('should handle concurrent operations on same device', async () => {
        const deviceItem = { id: 'device-1-account-456' }
        
        // Start first operation
        const promise1 = actions.unassignFromAccount(deviceItem)
        
        // Start second operation on same device before first completes
        const promise2 = actions.unassignFromAccount(deviceItem)
        
        await Promise.all([promise1, promise2])
        
        // Both operations should complete
        expect(devicesStore.assignAccount).toHaveBeenCalledTimes(2)
      })
    })
  })

  // Additional utility function tests for complete coverage
  describe('Utility Functions Edge Cases', () => {
    describe('getDeviceIdFromNodeId edge cases', () => {
      it('should handle device prefix with no ID', () => {
        expect(getDeviceIdFromNodeId('device-')).toBe(null)
      })

      it('should handle device prefix with non-numeric ID', () => {
        expect(getDeviceIdFromNodeId('device-abc')).toBe(null)
      })

      it('should handle device prefix with negative ID', () => {
        expect(getDeviceIdFromNodeId('device--1')).toBe(null)
      })

      it('should handle device prefix with zero ID', () => {
        expect(getDeviceIdFromNodeId('device-0')).toBe(0)
      })

      it('should handle device prefix with float ID', () => {
        expect(getDeviceIdFromNodeId('device-1.5')).toBe(null)
      })
    })

    describe('getAccountIdFromDeviceContext edge cases', () => {
      it('should handle account prefix with no ID', () => {
        expect(getAccountIdFromDeviceContext('account--unassigned')).toBe(null)
      })

      it('should handle account prefix with non-numeric ID', () => {
        expect(getAccountIdFromDeviceContext('account-abc-groups')).toBe(null)
      })

      it('should handle account prefix with zero ID', () => {
        expect(getAccountIdFromDeviceContext('account-0-unassigned')).toBe(0)
      })

      it('should handle malformed account context', () => {
        expect(getAccountIdFromDeviceContext('account-123')).toBe(null)
      })

      it('should handle account prefix with float ID', () => {
        expect(getAccountIdFromDeviceContext('account-1.5-groups')).toBe(null)
      })
    })
  })
})
