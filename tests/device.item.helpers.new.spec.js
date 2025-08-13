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

import { describe, it, expect } from 'vitest'
import {
  getAccountIdFromDeviceItem,
  createAvailableDeviceGroupsList
} from '@/helpers/tree/device.item.helpers.js'

describe('Device Item Helpers - New Functions', () => {
  describe('getAccountIdFromDeviceItem', () => {
    it('should extract account ID from device item with account context', () => {
      const item = { id: 'device-123-account-456-unassigned' }
      const result = getAccountIdFromDeviceItem(item)
      expect(result).toBe(456)
    })

    it('should extract account ID from device item with group context', () => {
      const item = { id: 'device-123-account-789-groups-10' }
      const result = getAccountIdFromDeviceItem(item)
      expect(result).toBe(789)
    })

    it('should return null for top-level unassigned device', () => {
      const item = { id: 'device-123' }
      const result = getAccountIdFromDeviceItem(item)
      expect(result).toBe(null)
    })

    it('should return null for non-device item', () => {
      const item = { id: 'account-123' }
      const result = getAccountIdFromDeviceItem(item)
      expect(result).toBe(null)
    })

    it('should return null for invalid item', () => {
      expect(getAccountIdFromDeviceItem(null)).toBe(null)
      expect(getAccountIdFromDeviceItem({})).toBe(null)
      expect(getAccountIdFromDeviceItem({ id: null })).toBe(null)
      expect(getAccountIdFromDeviceItem({ id: undefined })).toBe(null)
    })
  })

  describe('createAvailableDeviceGroupsList', () => {
    const mockDeviceGroupsStore = {
      groups: [
        { id: 1, name: 'Group A', accountId: 100 },
        { id: 2, name: 'Group B', accountId: 100 },
        { id: 3, name: 'Group C', accountId: 200 },
        { id: 4, name: null, accountId: 100 }, // Group without name
        { id: 5, name: 'Group E', accountId: 300 }
      ]
    }

    it('should return groups for specific account', () => {
      const result = createAvailableDeviceGroupsList(mockDeviceGroupsStore, 100)
      
      expect(result).toEqual([
        { id: 1, title: 'Group A' },
        { id: 2, title: 'Group B' },
        { id: 4, title: 'Группа 4' } // Fallback title for group without name
      ])
    })

    it('should return empty array for account with no groups', () => {
      const result = createAvailableDeviceGroupsList(mockDeviceGroupsStore, 999)
      expect(result).toEqual([])
    })

    it('should return empty array when no groups exist', () => {
      const emptyStore = { groups: [] }
      const result = createAvailableDeviceGroupsList(emptyStore, 100)
      expect(result).toEqual([])
    })

    it('should return empty array when groups is null', () => {
      const nullStore = { groups: null }
      const result = createAvailableDeviceGroupsList(nullStore, 100)
      expect(result).toEqual([])
    })

    it('should return empty array when accountId is null', () => {
      const result = createAvailableDeviceGroupsList(mockDeviceGroupsStore, null)
      expect(result).toEqual([])
    })

    it('should return empty array when store is null', () => {
      const result = createAvailableDeviceGroupsList(null, 100)
      expect(result).toEqual([])
    })

    it('should handle groups with missing properties gracefully', () => {
      const partialStore = {
        groups: [
          { id: 1, accountId: 100 }, // Missing name
          { name: 'Group B', accountId: 100 }, // Missing id - will be filtered out
          { id: 3, name: 'Group C' }, // Missing accountId - will be filtered out
          { id: 4, name: 'Group D', accountId: 100 } // Complete
        ]
      }

      const result = createAvailableDeviceGroupsList(partialStore, 100)
      
      expect(result).toEqual([
        { id: 1, title: 'Группа 1' },
        { id: 4, title: 'Group D' }
      ])
    })
  })
})
