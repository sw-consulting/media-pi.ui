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
