/**
 * Unit Tests for ID Extraction Utilities
 * This file is a part of Media Pi frontend application
 * 
 * Comprehensive test suite for ID extraction helper functions.
 * Tests cover all utility functions, edge cases, error conditions,
 * and real-world usage scenarios.
 * 
 * @author Maxim Samsonov
 * @since 2025
 */

import { describe, it, expect } from 'vitest'
import {
  getEntityIdFromNodeId,
  getAccountIdFromNodeId,
  getDeviceIdFromNodeId,
  getGroupIdFromNodeId
} from '../../src/helpers/tree/id.extraction.helpers.js'

describe('ID Extraction Utilities', () => {
  describe('getEntityIdFromNodeId', () => {
    describe('Valid cases', () => {
      it('should extract ID from simple entity node', () => {
        expect(getEntityIdFromNodeId('account-123', 'account')).toBe(123)
        expect(getEntityIdFromNodeId('device-456', 'device')).toBe(456)
        expect(getEntityIdFromNodeId('group-789', 'group')).toBe(789)
      })

      it('should extract ID from entity node with suffix', () => {
        expect(getEntityIdFromNodeId('account-123-groups', 'account')).toBe(123)
        expect(getEntityIdFromNodeId('account-456-unassigned', 'account')).toBe(456)
        expect(getEntityIdFromNodeId('device-789-old', 'device')).toBe(789)
      })

      it('should handle large ID numbers', () => {
        expect(getEntityIdFromNodeId('account-999999', 'account')).toBe(999999)
        expect(getEntityIdFromNodeId('device-1234567890', 'device')).toBe(1234567890)
      })

      it('should handle different entity prefixes', () => {
        expect(getEntityIdFromNodeId('user-123', 'user')).toBe(123)
        expect(getEntityIdFromNodeId('project-456', 'project')).toBe(456)
        expect(getEntityIdFromNodeId('organization-789', 'organization')).toBe(789)
      })
    })

    describe('Invalid cases', () => {
      it('should return null for null/undefined inputs', () => {
        expect(getEntityIdFromNodeId(null, 'account')).toBeNull()
        expect(getEntityIdFromNodeId(undefined, 'account')).toBeNull()
        expect(getEntityIdFromNodeId('account-123', null)).toBeNull()
        expect(getEntityIdFromNodeId('account-123', undefined)).toBeNull()
        expect(getEntityIdFromNodeId(null, null)).toBeNull()
      })

      it('should return null for non-string inputs', () => {
        expect(getEntityIdFromNodeId(123, 'account')).toBeNull()
        expect(getEntityIdFromNodeId({}, 'account')).toBeNull()
        expect(getEntityIdFromNodeId([], 'account')).toBeNull()
        expect(getEntityIdFromNodeId(true, 'account')).toBeNull()
        expect(getEntityIdFromNodeId('account-123', 123)).toBeNull()
        expect(getEntityIdFromNodeId('account-123', {})).toBeNull()
      })

      it('should return null for empty strings', () => {
        expect(getEntityIdFromNodeId('', 'account')).toBeNull()
        expect(getEntityIdFromNodeId('account-123', '')).toBeNull()
        expect(getEntityIdFromNodeId('', '')).toBeNull()
      })

      it('should return null for wrong prefix', () => {
        expect(getEntityIdFromNodeId('device-123', 'account')).toBeNull()
        expect(getEntityIdFromNodeId('account-456', 'device')).toBeNull()
        expect(getEntityIdFromNodeId('group-789', 'user')).toBeNull()
      })

      it('should return null for malformed IDs', () => {
        expect(getEntityIdFromNodeId('account', 'account')).toBeNull()
        expect(getEntityIdFromNodeId('account-', 'account')).toBeNull()
        expect(getEntityIdFromNodeId('account-abc', 'account')).toBeNull()
        expect(getEntityIdFromNodeId('account--123', 'account')).toBeNull()
        expect(getEntityIdFromNodeId('accountt-123', 'account')).toBeNull()
        expect(getEntityIdFromNodeId('123-account', 'account')).toBeNull()
      })

      it('should return null for zero or negative IDs', () => {
        expect(getEntityIdFromNodeId('account-0', 'account')).toBe(0)  // Zero is now valid
        expect(getEntityIdFromNodeId('device--1', 'device')).toBeNull()
        expect(getEntityIdFromNodeId('group--999', 'group')).toBeNull()
      })

      it('should return null for floating point numbers', () => {
        expect(getEntityIdFromNodeId('account-123.45', 'account')).toBeNull()
        expect(getEntityIdFromNodeId('device-1.0', 'device')).toBeNull()
      })
    })

    describe('Edge cases', () => {
      it('should handle very long node IDs', () => {
        const longSuffix = 'a'.repeat(1000)
        expect(getEntityIdFromNodeId(`account-123-${longSuffix}`, 'account')).toBe(123)
      })

      it('should handle complex suffixes with dashes', () => {
        expect(getEntityIdFromNodeId('account-123-groups-active-new', 'account')).toBe(123)
        expect(getEntityIdFromNodeId('device-456-group-789-assigned', 'device')).toBe(456)
      })

      it('should be case sensitive for prefixes', () => {
        expect(getEntityIdFromNodeId('Account-123', 'account')).toBeNull()
        expect(getEntityIdFromNodeId('ACCOUNT-123', 'account')).toBeNull()
        expect(getEntityIdFromNodeId('account-123', 'Account')).toBeNull()
      })
    })
  })

  describe('getAccountIdFromNodeId', () => {
    it('should extract account ID from simple account node', () => {
      expect(getAccountIdFromNodeId('account-123')).toBe(123)
      expect(getAccountIdFromNodeId('account-456')).toBe(456)
    })

    it('should extract account ID from account container nodes', () => {
      expect(getAccountIdFromNodeId('account-123-groups')).toBe(123)
      expect(getAccountIdFromNodeId('account-456-unassigned')).toBe(456)
      expect(getAccountIdFromNodeId('account-789-devices')).toBe(789)
    })

    it('should return null for non-account nodes', () => {
      expect(getAccountIdFromNodeId('device-123')).toBeNull()
      expect(getAccountIdFromNodeId('group-456')).toBeNull()
      expect(getAccountIdFromNodeId('user-789')).toBeNull()
    })

    it('should return null for invalid inputs', () => {
      expect(getAccountIdFromNodeId(null)).toBeNull()
      expect(getAccountIdFromNodeId('')).toBeNull()
      expect(getAccountIdFromNodeId('invalid')).toBeNull()
    })
  })

  describe('getDeviceIdFromNodeId', () => {
    it('should extract device ID from device nodes', () => {
      expect(getDeviceIdFromNodeId('device-123')).toBe(123)
      expect(getDeviceIdFromNodeId('device-456')).toBe(456)
    })

    it('should return null for non-device nodes', () => {
      expect(getDeviceIdFromNodeId('account-123')).toBeNull()
      expect(getDeviceIdFromNodeId('group-456')).toBeNull()
    })

    it('should return null for invalid inputs', () => {
      expect(getDeviceIdFromNodeId(null)).toBeNull()
      expect(getDeviceIdFromNodeId('')).toBeNull()
      expect(getDeviceIdFromNodeId('invalid')).toBeNull()
    })
  })

  describe('getGroupIdFromNodeId', () => {
    it('should extract group ID from group nodes', () => {
      expect(getGroupIdFromNodeId('group-123')).toBe(123)
      expect(getGroupIdFromNodeId('group-456')).toBe(456)
    })

    it('should return null for non-group nodes', () => {
      expect(getGroupIdFromNodeId('account-123')).toBeNull()
      expect(getGroupIdFromNodeId('device-456')).toBeNull()
    })

    it('should return null for invalid inputs', () => {
      expect(getGroupIdFromNodeId(null)).toBeNull()
      expect(getGroupIdFromNodeId('')).toBeNull()
      expect(getGroupIdFromNodeId('invalid')).toBeNull()
    })
  })

  describe('Integration scenarios', () => {
    it('should work together for tree navigation', () => {
      // Simulate extracting IDs from different tree levels
      const accountNode = 'account-123'
      const deviceNode = 'device-456'
      const groupNode = 'group-789'
      
      const accountId = getAccountIdFromNodeId(accountNode)
      const deviceId = getDeviceIdFromNodeId(deviceNode)
      const groupId = getGroupIdFromNodeId(groupNode)
      
      expect(accountId).toBe(123)
      expect(deviceId).toBe(456)
      expect(groupId).toBe(789)
    })

    it('should handle complex tree item with context', () => {
      const complexTreeItem = {
        id: 'device-456',
        device: {
          id: 456,
          name: 'Temperature Sensor',
          accountId: 123
        },
        parentId: 'account-123-unassigned'
      }
      
      const deviceId = getDeviceIdFromNodeId(complexTreeItem.id)
      const parentAccountId = getAccountIdFromNodeId(complexTreeItem.parentId)
      
      expect(deviceId).toBe(456)
      expect(parentAccountId).toBe(123)
    })
  })
})
