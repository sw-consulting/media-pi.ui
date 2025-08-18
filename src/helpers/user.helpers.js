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

import { useRolesStore } from '@/stores/roles.store.js'

export const UserRoleConstants = {
  SystemAdministrator: 1,
  AccountManager: 11,
  InstallationEngineer: 21
}

export function isAdministrator(user) {
  return user && Array.isArray(user.roles) && user.roles.includes(UserRoleConstants.SystemAdministrator)
}

export function isManager(user) {
  return user && Array.isArray(user.roles) && user.roles.includes(UserRoleConstants.AccountManager)
}

export function isEngineer(user) {
  return user && Array.isArray(user.roles) && user.roles.includes(UserRoleConstants.InstallationEngineer)
}

export function getRoleName(user) {
  if (user && Array.isArray(user.roles) && user.roles.length > 0) {
    // Find the role with minimal roleId
    const minRoleId = Math.min(...user.roles)
    // Find the role name by roleId
    const rolesStore = useRolesStore()
    return rolesStore.getNameByRoleId(minRoleId)
  }
  return 'Без роли'
}

export function canManageAccountById(user, accountId) {
  if (!user || !accountId) {
    return false
  }
  
  // SystemAdministrator can manage any account
  if (isAdministrator(user)) {
    return true
  }
  
  // Check if accountId is in user's accountIds array (only for managers)
  return !!(isManager(user) && user.accountIds && Array.isArray(user.accountIds) && user.accountIds.includes(accountId))
}

export function canManageDevice(user, device) {
  if (!user || !device) {
    return false
  }
  
  // If device has no accountId, only administrators and engineers can manage it
  if (!device.accountId) {
    return isAdministrator(user) || isEngineer(user)
  }
  
  // If device has an accountId, use the account-based permission check
  return canManageAccountById(user, device.accountId)
}


