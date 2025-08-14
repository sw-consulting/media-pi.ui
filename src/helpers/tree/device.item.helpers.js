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

/**
 * Device Item Helper Functions
 * Utilities for working with device items in the tree component
 */

/**
 * Helper functions to determine device context
 */
export const isTopLevelUnassignedDevice = (item) => {
  // Top level unassigned devices are direct children of root-unassigned
  // They have device- prefix and no account context in their tree path
  return item.id.startsWith('device-') && !item.id.includes('account-')
}

export const isAccountAssignedDevice = (item) => {
  // Account-assigned devices contain 'account-' in their ID path
  return item.id.startsWith('device-') && item.id.includes('account-')
}

export const isDeviceInUnassignedSection = (item) => {
  // Devices in unassigned section are under account-X-unassigned
  return item.id.includes('-unassigned') && item.id.startsWith('device-')
}

export const isDeviceInGroupSection = (item) => {
  // Devices in group section have pattern: device-ID-account-AID-group-GID
  return item.id.startsWith('device-') && item.id.includes('-group-')
}

/**
 * Helper function to get device object from tree item
 */
export const getDeviceFromItem = (item, devicesStore) => {
  if (!item || !item.id.startsWith('device-')) {
    return {}
  }
  
  // Extract device ID from the tree node ID
  // Device IDs in tree are like: device-123 or device-123-account-456
  const deviceIdMatch = item.id.match(/device-(\d+)/)
  if (!deviceIdMatch) {
    return {}
  }
  
  const deviceId = parseInt(deviceIdMatch[1])
  const device = devicesStore.devices?.find(d => d.deviceId === deviceId)
  return device || {}
}

/**
 * Extract device ID from tree item
 */
export const getDeviceIdFromItem = (item) => {
  if (!item || !item.id.startsWith('device-')) {
    return null
  }
  
  // Extract device ID from the tree node ID
  const deviceIdMatch = item.id.match(/device-(\d+)/)
  return deviceIdMatch ? parseInt(deviceIdMatch[1]) : null
}

/**
 * Extract account ID from device tree item
 */
export const getAccountIdFromDeviceItem = (item) => {
  if (!item || !item.id || typeof item.id !== 'string' || 
      !item.id.startsWith('device-') || !item.id.includes('account-')) {
    return null
  }
  
  // Extract account ID from tree node ID like device-123-account-456-unassigned
  const accountIdMatch = item.id.match(/account-(\d+)/)
  return accountIdMatch ? parseInt(accountIdMatch[1]) : null
}

/**
 * Extract group ID from device tree item in group section
 */
export const getGroupIdFromDeviceItem = (item) => {
  if (!item || !item.id || typeof item.id !== 'string' || 
      !item.id.startsWith('device-') || !item.id.includes('group-')) {
    return null
  }
  
  // Extract group ID from tree node ID like device-123-account-456-group-789
  const groupIdMatch = item.id.match(/group-(\d+)/)
  return groupIdMatch ? parseInt(groupIdMatch[1]) : null
}

/**
 * Create available accounts list for assignment
 */
export const createAvailableAccountsList = (accountsStore, authStore) => {
  if (!accountsStore.accounts || !authStore.user) {
    return []
  }
  
  return accountsStore.accounts
    .map(account => ({
      id: account.id,
      title: account.name || `Лицевой счёт ${account.id}`
    }))
}

/**
 * Create available device groups list for assignment (within the same account)
 */
export const createAvailableDeviceGroupsList = (deviceGroupsStore, accountId) => {
  if (!deviceGroupsStore || !deviceGroupsStore.groups || !accountId) {
    return []
  }
  
  return deviceGroupsStore.groups
    .filter(group => group && typeof group.id !== 'undefined' && group.accountId === accountId)
    .map(group => ({
      id: group.id,
      title: group.name || `Группа ${group.id}`
    }))
}
