import { describe, it, expect, vi } from 'vitest'
import { UserRoleConstants, isAdministrator, isManager, isEngineer, getRoleName } from '@/helpers/user.helpers.js'

// Mock the roles store
const mockRolesStore = {
  roles: [
    { id: 1, roleId: 1, name: 'Администратор' },
    { id: 11, roleId: 11, name: 'Менеджер' },
    { id: 21, roleId: 21, name: 'Инженер' }
  ]
}

vi.mock('@/stores/roles.store.js', () => ({
  useRolesStore: () => mockRolesStore
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
})
