import { describe, it, expect } from 'vitest'
import { UserRoleConstants, isAdministrator, isManager, isEngineer } from '@/helpers/user.helpers.js'

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
})
