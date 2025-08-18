/**
 * Device Item Helpers Module
 * This file is a part of Media Pi frontend application
 * 
 * Provides utility functions for working with device items within the tree component.
 * This module handles device context detection, data extraction from tree nodes,
 * and creation of assignment options for device management operations.
 * 
 * Key Features:
 * - Device context detection (unassigned, account-assigned, group-assigned)
 * - ID extraction from complex tree node structures
 * - Device object retrieval from stores
 * - Assignment option generation for dropdowns and selectors
 * 
 * Tree Node ID Patterns:
 * - Global unassigned: "device-123"
 * - Account unassigned: "device-123-account-456-unassigned"
 * - Group assigned: "device-123-account-456-group-789"
 * 
 * @module DeviceItemHelpers
 * @author Maxim Samsonov
 * @since 2025
 */

/**
 * Determines if a device item is a top-level unassigned device
 * 
 * Top-level unassigned devices are global devices not assigned to any account.
 * They appear in the root "Unassigned Devices" section and are available
 * for assignment to any account.
 * 
 * @param {Object} item - Tree item with id property
 * @returns {boolean} True if device is globally unassigned
 * 
 * @example
 * // Global unassigned device
 * isTopLevelUnassignedDevice({ id: 'device-123' }) // true
 * 
 * // Account-assigned device
 * isTopLevelUnassignedDevice({ id: 'device-123-account-456-unassigned' }) // false
 * 
 * // Use in context menu logic
 * const canAssignToAccount = isTopLevelUnassignedDevice(selectedItem)
 */
export const isTopLevelUnassignedDevice = (item) => {
  // Top level unassigned devices are direct children of root-unassigned
  // They have device- prefix and no account context in their tree path
  return item.id.startsWith('device-') && !item.id.includes('account-')
}

/**
 * Determines if a device item is assigned to an account
 * 
 * Account-assigned devices belong to a specific account and appear
 * within that account's section in the tree. They may or may not
 * be further assigned to a device group within the account.
 * 
 * @param {Object} item - Tree item with id property
 * @returns {boolean} True if device is assigned to an account
 * 
 * @example
 * // Account-assigned devices
 * isAccountAssignedDevice({ id: 'device-123-account-456-unassigned' }) // true
 * isAccountAssignedDevice({ id: 'device-123-account-456-group-789' }) // true
 * 
 * // Global unassigned device
 * isAccountAssignedDevice({ id: 'device-123' }) // false
 */
export const isAccountAssignedDevice = (item) => {
  // Account-assigned devices contain 'account-' in their ID path
  return item.id.startsWith('device-') && item.id.includes('account-')
}

/**
 * Determines if a device item is in an account's unassigned section
 * 
 * These devices are assigned to an account but not to any specific
 * device group within that account. They appear in the account's
 * "Unassigned Devices" subsection.
 * 
 * @param {Object} item - Tree item with id property
 * @returns {boolean} True if device is in account unassigned section
 * 
 * @example
 * // Account unassigned device
 * isDeviceInUnassignedSection({ id: 'device-123-account-456-unassigned' }) // true
 * 
 * // Group assigned device
 * isDeviceInUnassignedSection({ id: 'device-123-account-456-group-789' }) // false
 * 
 * // Use for context-specific actions
 * const canAssignToGroup = isDeviceInUnassignedSection(selectedItem)
 */
export const isDeviceInUnassignedSection = (item) => {
  // Devices in unassigned section are under account-X-unassigned
  return item.id.includes('-unassigned') && item.id.startsWith('device-')
}

/**
 * Determines if a device item is assigned to a device group
 * 
 * Group-assigned devices belong to a specific device group within
 * an account. They appear under the device group's section in the tree
 * and inherit group-level settings and configurations.
 * 
 * @param {Object} item - Tree item with id property
 * @returns {boolean} True if device is assigned to a group
 * 
 * @example
 * // Group assigned device
 * isDeviceInGroupSection({ id: 'device-123-account-456-group-789' }) // true
 * 
 * // Account unassigned device
 * isDeviceInGroupSection({ id: 'device-123-account-456-unassigned' }) // false
 * 
 * // Use for group-specific operations
 * const canRemoveFromGroup = isDeviceInGroupSection(selectedItem)
 */
export const isDeviceInGroupSection = (item) => {
  // Devices in group section have pattern: device-ID-account-AID-group-GID
  return item.id.startsWith('device-') && item.id.includes('-group-')
}

/**
 * Retrieves the device object from the store based on tree item
 * 
 * Extracts the device ID from the tree item and looks up the corresponding
 * device object in the devices store. Handles various tree node ID formats
 * and returns an empty object if the device is not found.
 * 
 * @param {Object} item - Tree item with id property
 * @param {Object} devicesStore - Pinia store containing devices array
 * @returns {Object} Device object or empty object if not found
 * 
 * @example
 * // Get device object for editing
 * const device = getDeviceFromItem(selectedTreeItem, devicesStore)
 * if (device.id) {
 *   openDeviceEditForm(device)
 * }
 * 
 * // Use in computed property
 * const selectedDevice = computed(() => 
 *   getDeviceFromItem(selectedTreeItem.value, devicesStore)
 * )
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
 * Extracts device ID from tree item
 * 
 * Utility function that parses tree item IDs to extract the numeric
 * device ID. Works with all device tree node ID formats.
 * 
 * @param {Object} item - Tree item with id property
 * @returns {number|null} Device ID as number, or null if not a device item
 * 
 * @example
 * // Extract device ID for API calls
 * const deviceId = getDeviceIdFromItem(selectedTreeItem)
 * if (deviceId) {
 *   await updateDevice(deviceId, formData)
 * }
 * 
 * // Use in action handlers
 * const handleDeviceAction = (treeItem) => {
 *   const deviceId = getDeviceIdFromItem(treeItem)
 *   performDeviceOperation(deviceId)
 * }
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
 * Extracts account ID from device tree item
 * 
 * For account-assigned devices, extracts the account ID from the tree node ID.
 * Returns null for globally unassigned devices that don't have account context.
 * 
 * @param {Object} item - Tree item with id property
 * @returns {number|null} Account ID as number, or null if not account-assigned
 * 
 * @example
 * // Get account context for device operations
 * const accountId = getAccountIdFromDeviceItem(selectedTreeItem)
 * if (accountId) {
 *   loadAccountDeviceGroups(accountId)
 * }
 * 
 * // Use for permission checking
 * const canManageDevice = computed(() => {
 *   const accountId = getAccountIdFromDeviceItem(selectedDevice.value)
 *   return authStore.canManageAccount(accountId)
 * })
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
 * Extracts group ID from device tree item in group section
 * 
 * For group-assigned devices, extracts the device group ID from the tree node ID.
 * Returns null for devices that are not assigned to a specific group.
 * 
 * @param {Object} item - Tree item with id property
 * @returns {number|null} Device group ID as number, or null if not group-assigned
 * 
 * @example
 * // Get group context for device operations
 * const groupId = getGroupIdFromDeviceItem(selectedTreeItem)
 * if (groupId) {
 *   loadGroupConfiguration(groupId)
 * }
 * 
 * // Use for group-specific actions
 * const canRemoveFromGroup = computed(() => {
 *   return getGroupIdFromDeviceItem(selectedDevice.value) !== null
 * })
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
 * Creates available accounts list for device assignment
 * 
 * Generates a formatted list of accounts suitable for use in dropdowns,
 * selectors, and other UI components for device assignment operations.
 * The list includes account IDs and display names.
 * 
 * @param {Object} accountsStore - Pinia store containing accounts array
 * @param {Object} authStore - Authentication store for user context
 * @returns {Array} Array of account objects with id and title properties
 * 
 * @example
 * // Create dropdown options for account assignment
 * const accountOptions = createAvailableAccountsList(accountsStore, authStore)
 * 
 * // Use in a select component
 * <v-select
 *   :items="accountOptions"
 *   item-title="title"
 *   item-value="id"
 *   label="Выберите лицевой счёт"
 * />
 * 
 * // Filter based on user permissions
 * const assignableAccounts = computed(() => 
 *   createAvailableAccountsList(accountsStore, authStore)
 *     .filter(account => authStore.canManageAccount(account.id))
 * )
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
 * Creates available device groups list for device assignment within an account
 * 
 * Generates a formatted list of device groups within a specific account,
 * suitable for use in dropdowns and selectors for device group assignment.
 * Only includes groups that belong to the specified account.
 * 
 * @param {Object} deviceGroupsStore - Pinia store containing device groups array
 * @param {number} accountId - ID of the account to filter groups by
 * @returns {Array} Array of group objects with id and title properties
 * 
 * @example
 * // Create dropdown options for group assignment within an account
 * const groupOptions = createAvailableDeviceGroupsList(deviceGroupsStore, 123)
 * 
 * // Use in a select component
 * <v-select
 *   :items="groupOptions"
 *   item-title="title" 
 *   item-value="id"
 *   label="Выберите группу устройств"
 * />
 * 
 * // Reactive group options based on selected account
 * const availableGroups = computed(() => {
 *   const accountId = getAccountIdFromDeviceItem(selectedDevice.value)
 *   return accountId ? createAvailableDeviceGroupsList(deviceGroupsStore, accountId) : []
 * })
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
