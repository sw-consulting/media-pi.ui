// Copyright (c) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
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
import { UserRoleConstants, isAdministrator, isManager, isEngineer, getRoleName, canManageAccountById, canManageDevice } from '@/helpers/user.helpers.js'

// Mock the roles store - only mocking what getRoleName actually uses
vi.mock('@/stores/roles.store.js', () => ({
  useRolesStore: () => ({
    getNameByRoleId: (roleId) => {
      const roleNames = {
        1: 'Администратор',
        11: 'Менеджер', 
        21: 'Инженер'
      }
      return roleNames[roleId] || `Роль ${roleId}`
    }
  })
}))

describe('User Role Helpers', () => {
  const adminUser = { roles: [UserRoleConstants.SystemAdministrator] }
  const managerUser = { roles: [UserRoleConstants.AccountManager] }
  const engineerUser = { roles: [UserRoleConstants.InstallationEngineer] }
  const multiRoleUser = { roles: [UserRoleConstants.SystemAdministrator, UserRoleConstants.AccountManager] }
  const noRoleUser = { roles: [] }
  const undefinedRolesUser = {}

  it('should identify administrator', () => {
    expect(isAdministrator(adminUser)).toBe(true)
    expect(isAdministrator(managerUser)).toBe(false)
    expect(isAdministrator(engineerUser)).toBe(false)
    expect(isAdministrator(multiRoleUser)).toBe(true)
    expect(isAdministrator(noRoleUser)).toBe(false)
    expect(isAdministrator(undefinedRolesUser)).toBe(false)
  })

  it('should identify manager', () => {
    expect(isManager(adminUser)).toBe(false)
    expect(isManager(managerUser)).toBe(true)
    expect(isManager(engineerUser)).toBe(false)
    expect(isManager(multiRoleUser)).toBe(true)
    expect(isManager(noRoleUser)).toBe(false)
    expect(isManager(undefinedRolesUser)).toBe(false)
  })

  it('should identify engineer', () => {
    expect(isEngineer(adminUser)).toBe(false)
    expect(isEngineer(managerUser)).toBe(false)
    expect(isEngineer(engineerUser)).toBe(true)
    expect(isEngineer(multiRoleUser)).toBe(false)
    expect(isEngineer(noRoleUser)).toBe(false)
    expect(isEngineer(undefinedRolesUser)).toBe(false)
  })

  describe('getRoleName', () => {
    it('should return role name for user with single role', () => {
      expect(getRoleName(adminUser)).toBe('Администратор')
      expect(getRoleName(managerUser)).toBe('Менеджер')
      expect(getRoleName(engineerUser)).toBe('Инженер')
    })

    it('should return role name with smallest roleId for user with multiple roles', () => {
      expect(getRoleName(multiRoleUser)).toBe('Администратор') // roleId 1 is smaller than 11
    })

    it('should return "Без роли" for user with no roles', () => {
      expect(getRoleName(noRoleUser)).toBe('Без роли')
      expect(getRoleName(undefinedRolesUser)).toBe('Без роли')
      expect(getRoleName(null)).toBe('Без роли')
      expect(getRoleName(undefined)).toBe('Без роли')
    })

    it('should return fallback text for unknown role', () => {
      const unknownRoleUser = { roles: [999] }
      expect(getRoleName(unknownRoleUser)).toBe('Роль 999')
    })
  })

  describe('canManageAccountById', () => {
    const adminUser = { roles: [UserRoleConstants.SystemAdministrator], accountIds: [1, 2] }
    const managerUser = { roles: [UserRoleConstants.AccountManager], accountIds: [1, 3] }
    const engineerUser = { roles: [UserRoleConstants.InstallationEngineer], accountIds: [2] }
    const userWithoutAccounts = { roles: [UserRoleConstants.AccountManager] }
    const userWithEmptyAccounts = { roles: [UserRoleConstants.AccountManager], accountIds: [] }

    it('should allow SystemAdministrator to manage any account', () => {
      expect(canManageAccountById(adminUser, 1)).toBe(true)
      expect(canManageAccountById(adminUser, 5)).toBe(true)
      expect(canManageAccountById(adminUser, 999)).toBe(true)
    })

    it('should allow managers to manage accounts in their accountIds array', () => {
      expect(canManageAccountById(managerUser, 1)).toBe(true)
      expect(canManageAccountById(managerUser, 3)).toBe(true)
    })

    it('should not allow engineers to manage accounts even if in their accountIds array', () => {
      expect(canManageAccountById(engineerUser, 2)).toBe(false)
    })

    it('should not allow users to manage accounts not in their accountIds array', () => {
      expect(canManageAccountById(managerUser, 2)).toBe(false)
      expect(canManageAccountById(managerUser, 5)).toBe(false)
      expect(canManageAccountById(engineerUser, 1)).toBe(false)
      expect(canManageAccountById(engineerUser, 3)).toBe(false)
    })

    it('should return false for users without accountIds', () => {
      expect(canManageAccountById(userWithoutAccounts, 1)).toBe(false)
      expect(canManageAccountById(userWithEmptyAccounts, 1)).toBe(false)
    })

    it('should return false for invalid inputs', () => {
      expect(canManageAccountById(null, 1)).toBe(false)
      expect(canManageAccountById(undefined, 1)).toBe(false)
      expect(canManageAccountById(managerUser, null)).toBe(false)
      expect(canManageAccountById(managerUser, undefined)).toBe(false)
      expect(canManageAccountById(null, null)).toBe(false)
    })

    it('should handle non-array accountIds gracefully', () => {
      const userWithInvalidAccountIds = { roles: [UserRoleConstants.AccountManager], accountIds: 'not-an-array' }
      expect(canManageAccountById(userWithInvalidAccountIds, 1)).toBe(false)
    })
  })

  describe('canManageDevice', () => {
    const adminUser = { roles: [UserRoleConstants.SystemAdministrator] }
    const managerUser = { roles: [UserRoleConstants.AccountManager], accountIds: [1, 3] }
    const engineerUser = { roles: [UserRoleConstants.InstallationEngineer], accountIds: [2] }
    const userWithoutAccounts = { roles: [UserRoleConstants.AccountManager] }

    it('should allow administrators to manage any device', () => {
      const deviceWithAccount = { accountId: 1 }
      const deviceWithoutAccount = {}
      
      expect(canManageDevice(adminUser, deviceWithAccount)).toBe(true)
      expect(canManageDevice(adminUser, deviceWithoutAccount)).toBe(true)
    })

    it('should allow engineers to manage devices without accountId', () => {
      const deviceWithoutAccount = {}
      
      expect(canManageDevice(engineerUser, deviceWithoutAccount)).toBe(true)
    })

    it('should not allow managers to manage devices without accountId', () => {
      const deviceWithoutAccount = {}
      
      expect(canManageDevice(managerUser, deviceWithoutAccount)).toBe(false)
    })

    it('should allow managers to manage devices with accountId they can manage', () => {
      const deviceWithAccount1 = { accountId: 1 }
      const deviceWithAccount3 = { accountId: 3 }
      
      expect(canManageDevice(managerUser, deviceWithAccount1)).toBe(true)
      expect(canManageDevice(managerUser, deviceWithAccount3)).toBe(true)
    })

    it('should not allow managers to manage devices with accountId they cannot manage', () => {
      const deviceWithAccount2 = { accountId: 2 }
      const deviceWithAccount5 = { accountId: 5 }
      
      expect(canManageDevice(managerUser, deviceWithAccount2)).toBe(false)
      expect(canManageDevice(managerUser, deviceWithAccount5)).toBe(false)
    })

    it('should not allow engineers to manage devices with accountId', () => {
      const deviceWithAccount1 = { accountId: 1 }
      const deviceWithAccount2 = { accountId: 2 }
      
      expect(canManageDevice(engineerUser, deviceWithAccount1)).toBe(false)
      expect(canManageDevice(engineerUser, deviceWithAccount2)).toBe(false)
    })

    it('should return false for users without accountIds when device has accountId', () => {
      const deviceWithAccount = { accountId: 1 }
      
      expect(canManageDevice(userWithoutAccounts, deviceWithAccount)).toBe(false)
    })

    it('should return false for invalid inputs', () => {
      const validDevice = { accountId: 1 }
      
      expect(canManageDevice(null, validDevice)).toBe(false)
      expect(canManageDevice(undefined, validDevice)).toBe(false)
      expect(canManageDevice(managerUser, null)).toBe(false)
      expect(canManageDevice(managerUser, undefined)).toBe(false)
      expect(canManageDevice(null, null)).toBe(false)
    })

    it('should handle devices with null or undefined accountId as devices without accountId', () => {
      const deviceWithNullAccount = { accountId: null }
      const deviceWithUndefinedAccount = { accountId: undefined }
      
      expect(canManageDevice(engineerUser, deviceWithNullAccount)).toBe(true)
      expect(canManageDevice(engineerUser, deviceWithUndefinedAccount)).toBe(true)
      expect(canManageDevice(managerUser, deviceWithNullAccount)).toBe(false)
      expect(canManageDevice(managerUser, deviceWithUndefinedAccount)).toBe(false)
    })
  })
})
