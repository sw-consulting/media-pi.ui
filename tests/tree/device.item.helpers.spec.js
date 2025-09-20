// Copyright (c) 2025 sw.consulting
// This file is a part of Media Pi  frontend application

import { describe, it, expect, beforeEach } from 'vitest'
import {
  isTopLevelUnassignedDevice,
  isAccountAssignedDevice,
  isDeviceInUnassignedSection,
  isDeviceInGroupSection,
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

