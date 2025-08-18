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

import { describe, it, expect, beforeEach } from 'vitest'
import {
  isTopLevelUnassignedDevice,
  isAccountAssignedDevice,
  isDeviceInUnassignedSection,
  isDeviceInGroupSection,
  getDeviceFromItem,
  createAvailableAccountsList
} from '@/helpers/tree/device.item.helpers.js'

describe('Device Item Helper Functions', () => {
  describe('isTopLevelUnassignedDevice', () => {
    it('should return true for top level unassigned devices', () => {
      const item = { id: 'device-123' }
      expect(isTopLevelUnassignedDevice(item)).toBe(true)
    })

    it('should return false for account-assigned devices', () => {
      const item = { id: 'device-123-account-456' }
      expect(isTopLevelUnassignedDevice(item)).toBe(false)
    })

    it('should return false for non-device items', () => {
      const item = { id: 'account-123' }
      expect(isTopLevelUnassignedDevice(item)).toBe(false)
    })
  })

  describe('isAccountAssignedDevice', () => {
    it('should return true for account-assigned devices', () => {
      const item = { id: 'device-123-account-456' }
      expect(isAccountAssignedDevice(item)).toBe(true)
    })

    it('should return false for top level unassigned devices', () => {
      const item = { id: 'device-123' }
      expect(isAccountAssignedDevice(item)).toBe(false)
    })

    it('should return false for non-device items', () => {
      const item = { id: 'account-123' }
      expect(isAccountAssignedDevice(item)).toBe(false)
    })
  })

  describe('isDeviceInUnassignedSection', () => {
    it('should return true for devices in unassigned section', () => {
      const item = { id: 'device-123-account-456-unassigned' }
      expect(isDeviceInUnassignedSection(item)).toBe(true)
    })

    it('should return false for devices in group section', () => {
      const item = { id: 'device-123-account-456-groups-789' }
      expect(isDeviceInUnassignedSection(item)).toBe(false)
    })

    it('should return false for non-device items', () => {
      const item = { id: 'account-123-unassigned' }
      expect(isDeviceInUnassignedSection(item)).toBe(false)
    })
  })

  describe('isDeviceInGroupSection', () => {
    it('should return true for devices in group section', () => {
      const item = { id: 'device-123-account-456-group-789' }
      expect(isDeviceInGroupSection(item)).toBe(true)
    })

    it('should return false for devices in unassigned section', () => {
      const item = { id: 'device-123-account-456-unassigned' }
      expect(isDeviceInGroupSection(item)).toBe(false)
    })

    it('should return false for non-device items', () => {
      const item = { id: 'group-123' }
      expect(isDeviceInGroupSection(item)).toBe(false)
    })
  })

  describe('getDeviceFromItem', () => {
    let mockDevicesStore

    beforeEach(() => {
      mockDevicesStore = {
        devices: [
          { deviceId: 123, name: 'Device 1' },
          { deviceId: 456, name: 'Device 2' }
        ]
      }
    })

    it('should return device object for valid device item', () => {
      const item = { id: 'device-123' }
      const result = getDeviceFromItem(item, mockDevicesStore)
      expect(result).toEqual({ deviceId: 123, name: 'Device 1' })
    })

    it('should return device object for device with context', () => {
      const item = { id: 'device-456-account-789' }
      const result = getDeviceFromItem(item, mockDevicesStore)
      expect(result).toEqual({ deviceId: 456, name: 'Device 2' })
    })

    it('should return empty object for non-device item', () => {
      const item = { id: 'account-123' }
      const result = getDeviceFromItem(item, mockDevicesStore)
      expect(result).toEqual({})
    })

    it('should return empty object for device not found in store', () => {
      const item = { id: 'device-999' }
      const result = getDeviceFromItem(item, mockDevicesStore)
      expect(result).toEqual({})
    })

    it('should return empty object for null item', () => {
      const result = getDeviceFromItem(null, mockDevicesStore)
      expect(result).toEqual({})
    })
  })

  describe('createAvailableAccountsList', () => {
    let mockAccountsStore, mockAuthStore

    beforeEach(() => {
      mockAccountsStore = {
        accounts: [
          { id: 1, name: 'Account 1' },
          { id: 2, name: 'Account 2' },
          { id: 3, name: null }
        ]
      }
      mockAuthStore = {
        user: { id: 1 }
      }
    })

    it('should create formatted accounts list', () => {
      const result = createAvailableAccountsList(mockAccountsStore, mockAuthStore)
      expect(result).toEqual([
        { id: 1, title: 'Account 1' },
        { id: 2, title: 'Account 2' },
        { id: 3, title: 'Лицевой счёт 3' }
      ])
    })

    it('should return empty array when no accounts', () => {
      mockAccountsStore.accounts = null
      const result = createAvailableAccountsList(mockAccountsStore, mockAuthStore)
      expect(result).toEqual([])
    })

    it('should return empty array when no user', () => {
      mockAuthStore.user = null
      const result = createAvailableAccountsList(mockAccountsStore, mockAuthStore)
      expect(result).toEqual([])
    })
  })
})
