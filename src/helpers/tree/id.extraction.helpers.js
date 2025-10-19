/**
 * ID Extraction Utilities Module
 * This file is a part of Media Pi frontend application
 * 
 * Provides utility functions for extracting entity IDs from tree node IDs and contexts.
 * Tree nodes use prefixed IDs like "account-123", "device-456", "group-789" for uniqueness,
 * and these utilities extract the numeric ID portions for API calls and data operations.
 * 
 * Key Features:
 * - Generic entity ID extraction with configurable prefixes
 * - Type-specific convenience functions for common entities
 * - Context-aware ID extraction from complex tree structures
 * - Robust error handling for malformed IDs
 * - Comprehensive validation and type checking
 * 
 * ID Patterns:
 * - Account nodes: "account-{id}" → {id}
 * - Device nodes: "device-{id}" → {id}
 * - Group nodes: "group-{id}" → {id}
 * - Complex nodes: "account-{id}-groups" → {id} (for account)
 * 
 * @module IdExtractionHelpers
 * @author Maxim Samsonov
 * @since 2025
 */

/**
 * Extracts entity ID from tree node ID using a specified prefix
 * 
 * Generic utility function that parses tree node IDs to extract the underlying
 * entity ID. This is the core function that powers all specific ID extraction
 * utilities. It supports flexible prefix matching and robust error handling.
 * 
 * @param {string} nodeId - Tree node ID in format "{prefix}-{id}[suffix]"
 * @param {string} prefix - Entity prefix to match (e.g., 'account', 'device', 'group')
 * @returns {number|null} Entity ID as number, or null if parsing fails or input is invalid
 * 
 * @example
 * // Basic entity ID extraction
 * const accountId = getEntityIdFromNodeId('account-123', 'account') // Returns: 123
 * const deviceId = getEntityIdFromNodeId('device-456', 'device')    // Returns: 456
 * const groupId = getEntityIdFromNodeId('group-789', 'group')       // Returns: 789
 * 
 * // Complex node IDs with suffixes
 * const accountId = getEntityIdFromNodeId('account-123-groups', 'account') // Returns: 123
 * const accountId = getEntityIdFromNodeId('account-456-unassigned', 'account') // Returns: 456
 * 
 * // Invalid cases return null
 * const invalid1 = getEntityIdFromNodeId('device-456', 'account')    // Returns: null
 * const invalid2 = getEntityIdFromNodeId('invalid-format', 'device') // Returns: null
 * const invalid3 = getEntityIdFromNodeId(null, 'account')            // Returns: null
 * const invalid4 = getEntityIdFromNodeId('account-abc', 'account')   // Returns: null (non-numeric)
 * 
 * // Use in tree action handlers
 * const handleTreeAction = (treeNode, entityType) => {
 *   const entityId = getEntityIdFromNodeId(treeNode.id, entityType)
 *   if (entityId !== null) {
 *     performAction(entityId)
 *   } else {
 *     // Invalid node ID found - handle appropriately
 *   }
 * }
 */
export const getEntityIdFromNodeId = (nodeId, prefix) => {
  // Validate inputs
  if (!nodeId || typeof nodeId !== 'string' || !prefix || typeof prefix !== 'string') {
    return null
  }
  
  // Create regex pattern to match "{prefix}-{digits}" at the start of the string
  // This allows for suffixes like "account-123-groups"
  const pattern = new RegExp(`${prefix}-(\\d+)(?:-.*)?$`)
  const match = nodeId.match(pattern)
  
  if (!match) {
    return null
  }
  
  // Parse the numeric ID
  const numericId = parseInt(match[1], 10)
  
  // Ensure the parsed value is a valid non-negative integer (including 0)
  return (isNaN(numericId) || numericId < 0) ? null : numericId
}

/**
 * Extracts account ID from tree node ID
 * 
 * Convenience function for extracting account IDs from tree nodes.
 * Handles various account node formats including simple accounts and
 * account container nodes like groups and unassigned sections.
 * 
 * @param {string} nodeId - Tree node ID in format "account-{id}[suffix]"
 * @returns {number|null} Account ID as number, or null if parsing fails
 * 
 * @example
 * // Standard account nodes
 * const accountId = getAccountIdFromNodeId('account-123') // Returns: 123
 * 
 * // Account container nodes
 * const groupsAccountId = getAccountIdFromNodeId('account-456-groups') // Returns: 456
 * const unassignedAccountId = getAccountIdFromNodeId('account-789-unassigned') // Returns: 789
 * 
 * // Use in component actions
 * const handleAccountEdit = (treeNode) => {
 *   const accountId = getAccountIdFromNodeId(treeNode.id)
 *   if (accountId) {
 *     router.push(`/accounts/${accountId}/edit`)
 *   }
 * }
 */
export const getAccountIdFromNodeId = (nodeId) => {
  return getEntityIdFromNodeId(nodeId, 'account')
}

/**
 * Extracts device ID from tree node ID
 * 
 * Convenience function for extracting device IDs from tree nodes.
 * Works with device nodes in various contexts including unassigned devices,
 * account-assigned devices, and group-assigned devices.
 * 
 * @param {string} nodeId - Tree node ID in format "device-{id}"
 * @returns {number|null} Device ID as number, or null if parsing fails
 * 
 * @example
 * // Device nodes in different contexts
 * const deviceId = getDeviceIdFromNodeId('device-123') // Returns: 123
 * 
 * // Use in device operations
 * const handleDeviceEdit = (treeNode) => {
 *   const deviceId = getDeviceIdFromNodeId(treeNode.id)
 *   if (deviceId) {
 *     openDeviceEditDialog(deviceId)
 *   }
 * }
 * 
 * // Use in assignment operations
 * const assignDeviceToAccount = (deviceNode, accountId) => {
 *   const deviceId = getDeviceIdFromNodeId(deviceNode.id)
 *   if (deviceId) {
 *     devicesStore.assignToAccount(deviceId, accountId)
 *   }
 * }
 */
export const getDeviceIdFromNodeId = (nodeId) => {
  return getEntityIdFromNodeId(nodeId, 'device')
}

/**
 * Extracts device group ID from tree node ID
 * 
 * Convenience function for extracting device group IDs from tree nodes.
 * Used for device group management operations within account contexts.
 * 
 * @param {string} nodeId - Tree node ID in format "group-{id}"
 * @returns {number|null} Device group ID as number, or null if parsing fails
 * 
 * @example
 * // Device group nodes
 * const groupId = getGroupIdFromNodeId('group-456') // Returns: 456
 * 
 * // Use in group operations
 * const handleGroupEdit = (treeNode) => {
 *   const groupId = getGroupIdFromNodeId(treeNode.id)
 *   if (groupId) {
 *     openGroupEditDialog(groupId)
 *   }
 * }
 * 
 * // Use in device assignment to groups
 * const assignDeviceToGroup = (deviceId, groupNode) => {
 *   const groupId = getGroupIdFromNodeId(groupNode.id)
 *   if (groupId) {
 *     devicesStore.assignToGroup(deviceId, groupId)
 *   }
 * }
 */
export const getGroupIdFromNodeId = (nodeId) => {
  return getEntityIdFromNodeId(nodeId, 'group')
}




