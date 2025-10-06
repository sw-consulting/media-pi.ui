// Copyright (c) 2025 sw.consulting
// This file is a part of Media Pi  frontend application

import { describe, it, expect, beforeEach } from 'vitest'
import { createPermissionCheckers } from '@/helpers/tree/tree.permissions.js'

describe('Tree Permissions Functions', () => {
  describe('createPermissionCheckers', () => {
    let authStore, permissions

    beforeEach(() => {
      authStore = {
        isAdministrator: false,
        isManager: false,
        isEngineer: false
      }

      permissions = createPermissionCheckers(authStore)
    })

    it('should allow administrators to view everything', () => {
      authStore.isAdministrator = true

      expect(permissions.canViewUnassignedDevices.value).toBe(true)
      expect(permissions.canViewAccounts.value).toBe(true)
      expect(permissions.canCreateDeleteAccounts.value).toBe(true)
    })

    it('should allow managers to view and edit accounts but not unassigned devices', () => {
      authStore.isManager = true

      expect(permissions.canViewUnassignedDevices.value).toBe(false)
      expect(permissions.canViewAccounts.value).toBe(true)
      expect(permissions.canCreateDeleteAccounts.value).toBe(false)
    })

    it('should allow engineers to view unassigned devices but not accounts', () => {
      authStore.isEngineer = true

      expect(permissions.canViewUnassignedDevices.value).toBe(true)
      expect(permissions.canViewAccounts.value).toBe(false)
      expect(permissions.canCreateDeleteAccounts.value).toBe(false)
    })

    it('should deny everything for regular users', () => {
      expect(permissions.canViewUnassignedDevices.value).toBe(false)
      expect(permissions.canViewAccounts.value).toBe(false)
      expect(permissions.canCreateDeleteAccounts.value).toBe(false)
    })
  })
})

