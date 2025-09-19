// Copyright (c) 2025 sw.consulting
// This file is a part of Media Pi backend

import { describe, it, expect, vi } from 'vitest'
import {
  UserRoleConstants,
  isAdministrator,
  isManager,
  isEngineer,
  getRoleName,
  canManageAccountById,
  canManageAccount,
  canManageDeviceGroup,
  canManageDevice
} from '@/helpers/user.helpers.js'

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

  describe('canManageAccount', () => {
    const adminUser = { roles: [UserRoleConstants.SystemAdministrator], accountIds: [1, 2] }
    const managerUser = { roles: [UserRoleConstants.AccountManager], accountIds: [1, 3] }
    const engineerUser = { roles: [UserRoleConstants.InstallationEngineer], accountIds: [2] }
    
    const account1 = { id: 1 }
    const account2 = { id: 2 }
    const account3 = { id: 3 }

    it('should allow administrators to manage any account', () => {
      expect(canManageAccount(adminUser, account1)).toBe(true)
      expect(canManageAccount(adminUser, account2)).toBe(true)
    })

    it('should allow managers to manage accounts in their accountIds', () => {
      expect(canManageAccount(managerUser, account1)).toBe(true)
      expect(canManageAccount(managerUser, account3)).toBe(true)
    })

    it('should not allow managers to manage accounts not in their accountIds', () => {
      expect(canManageAccount(managerUser, account2)).toBe(false)
    })

    it('should not allow engineers to manage any accounts', () => {
      expect(canManageAccount(engineerUser, account1)).toBe(false)
      expect(canManageAccount(engineerUser, account2)).toBe(false)
    })

    it('should handle null/undefined inputs', () => {
      expect(canManageAccount(null, account1)).toBe(false)
      expect(canManageAccount(undefined, account1)).toBe(false)
      expect(canManageAccount(managerUser, null)).toBe(false)
      expect(canManageAccount(managerUser, undefined)).toBe(false)
      expect(canManageAccount(null, null)).toBe(false)
    })
  })

  describe('canManageDeviceGroup', () => {
    const adminUser = { roles: [UserRoleConstants.SystemAdministrator], accountIds: [1, 2] }
    const managerUser = { roles: [UserRoleConstants.AccountManager], accountIds: [1, 3] }
    const engineerUser = { roles: [UserRoleConstants.InstallationEngineer], accountIds: [2] }
    
    const deviceGroup1 = { id: 101, accountId: 1 }
    const deviceGroup2 = { id: 102, accountId: 2 }
    const deviceGroup3 = { id: 103, accountId: 3 }

    it('should allow administrators to manage any device group', () => {
      expect(canManageDeviceGroup(adminUser, deviceGroup1)).toBe(true)
      expect(canManageDeviceGroup(adminUser, deviceGroup2)).toBe(true)
    })

    it('should allow managers to manage device groups in their accountIds', () => {
      expect(canManageDeviceGroup(managerUser, deviceGroup1)).toBe(true)
      expect(canManageDeviceGroup(managerUser, deviceGroup3)).toBe(true)
    })

    it('should not allow managers to manage device groups not in their accountIds', () => {
      expect(canManageDeviceGroup(managerUser, deviceGroup2)).toBe(false)
    })

    it('should not allow engineers to manage device groups', () => {
      expect(canManageDeviceGroup(engineerUser, deviceGroup1)).toBe(false)
      expect(canManageDeviceGroup(engineerUser, deviceGroup2)).toBe(false)
    })

    it('should handle null/undefined inputs', () => {
      expect(canManageDeviceGroup(null, deviceGroup1)).toBe(false)
      expect(canManageDeviceGroup(undefined, deviceGroup1)).toBe(false)
      expect(canManageDeviceGroup(managerUser, null)).toBe(false)
      expect(canManageDeviceGroup(managerUser, undefined)).toBe(false)
      expect(canManageDeviceGroup(null, null)).toBe(false)
    })
  })
})

