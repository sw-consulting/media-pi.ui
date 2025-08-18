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
import { createDeviceGroupActions } from '@/helpers/tree/devicegroup.actions.js'
import { getGroupIdFromNodeId } from '@/helpers/tree/id.extraction.helpers.js'

describe('Device Group Actions Functions', () => {
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

      actions = createDeviceGroupActions(router, alertStore, deviceGroupsStore, confirmDelete)
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
      expect(getGroupIdFromNodeId('group-123')).toBe(123)
      expect(getGroupIdFromNodeId('group-1')).toBe(1)
    })

    it('should return null for non-group node IDs', () => {
      expect(getGroupIdFromNodeId('device-123')).toBe(null)
      expect(getGroupIdFromNodeId('account-456')).toBe(null)
      expect(getGroupIdFromNodeId('root-accounts')).toBe(null)
    })

    it('should handle invalid input', () => {
      expect(getGroupIdFromNodeId('')).toBe(null)
      expect(getGroupIdFromNodeId(null)).toBe(null)
      expect(getGroupIdFromNodeId(undefined)).toBe(null)
    })
  })
})
