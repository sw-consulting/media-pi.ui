/**
 * Device Group Actions Module
 * This file is a part of Media Pi frontend application
 * 
 * Provides action handlers for device group operations within the tree interface.
 * Device groups are organizational units within accounts that allow grouping
 * related devices for easier management and configuration.
 * 
 * Key Features:
 * - Device group creation with account context extraction
 * - Device group editing navigation
 * - Safe device group deletion with confirmation
 * - Integration with centralized ID extraction utilities
 * - Comprehensive error handling with user feedback
 * 
 * Tree Context:
 * - Groups are nested under accounts in the tree structure
 * - Group creation requires parent account identification
 * - Group nodes use "group-{id}" naming convention
 * - Account groups container nodes use "account-{id}-groups" format
 * 
 * @module DeviceGroupActions
 * @author Maxim Samsonov
 * @since 2025
 */

/**
 * Creates device group action handlers for tree operations
 * 
 * Factory function that creates a set of action handlers for device group operations.
 * These handlers understand the tree context and can extract necessary information
 * like account IDs from tree node structures.
 * 
 * @param {Object} router - Vue Router instance for navigation
 * @param {Object} alertStore - Pinia store for displaying user notifications
 * @param {Object} deviceGroupsStore - Pinia store for device group data management
 * @param {Function} confirmDelete - Function for displaying deletion confirmations
 * @returns {Object} Object containing createDeviceGroup, editDeviceGroup, and deleteDeviceGroup handlers
 * 
 * @example
 * // Setup in a Vue component
 * import { createDeviceGroupActions } from '@/helpers/tree/devicegroup.actions'
 * import { useRouter } from 'vue-router'
 * import { useAlertStore, useDeviceGroupsStore } from '@/stores'
 * import { confirmDelete } from '@/helpers/confirmation'
 * 
 * const { createDeviceGroup, editDeviceGroup, deleteDeviceGroup } = createDeviceGroupActions(
 *   router, alertStore, deviceGroupsStore, confirmDelete
 * )
 * 
 * // Use in tree context menu
 * const getContextMenu = (node) => {
 *   if (node.id.includes('-groups')) {
 *     return [{ title: 'Создать группу', action: () => createDeviceGroup(node) }]
 *   }
 *   if (node.id.startsWith('group-')) {
 *     return [
 *       { title: 'Редактировать', action: () => editDeviceGroup(node) },
 *       { title: 'Удалить', action: () => deleteDeviceGroup(node) }
 *     ]
 *   }
 * }
 */
export const createDeviceGroupActions = (router, alertStore, deviceGroupsStore, confirmDelete) => {
  /**
   * Navigates to device group creation form with account context
   * 
   * Extracts the parent account ID from the tree node and navigates to
   * the device group creation form. The account context is necessary
   * because device groups belong to specific accounts.
   * 
   * @param {Object} item - Tree node item, expected to be account groups container
   * 
   * @example
   * // From account groups container node
   * createDeviceGroup({ id: 'account-123-groups', name: 'Группы устройств' })
   * 
   * // In context menu handler
   * const handleCreateGroup = () => {
   *   if (selectedNode.id.includes('-groups')) {
   *     createDeviceGroup(selectedNode)
   *   }
   * }
   */
  const createDeviceGroup = (item) => {
    try {
      // Extract account ID from groups container node (format: account-123-groups)
      const match = item.id.match(/account-(\d+)-groups/)
      if (match) {
        const accountId = match[1]
        router.push({ name: 'Создание группы устройств', params: { accountId } })
      } else {
        alertStore.error('Не удалось определить лицевой счёт для создания группы устройств')
      }
    } catch (error) {
      alertStore.error(`Не удалось перейти к созданию группы устройств: ${error.message || error}`)
    }
  }

  /**
   * Navigates to device group editing form
   * 
   * Redirects the user to the device group editing page for the specified group.
   * Accepts either a group object or a group ID as parameter and handles
   * the navigation with proper error handling.
   * 
   * @param {Object|number} item - Device group object with id property or group ID number
   * 
   * @example
   * // With group object
   * editDeviceGroup({ id: 456, name: 'Security Cameras' })
   * 
   * // With group ID
   * editDeviceGroup(456)
   * 
   * // From tree context
   * const handleEdit = () => {
   *   const groupId = getGroupIdFromNodeId(selectedNode.id)
   *   if (groupId) editDeviceGroup(groupId)
   * }
   */
  const editDeviceGroup = (item) => {
    try {
      // Handle both object and primitive ID parameters
      const groupId = typeof item === 'object' ? item.id : item
      router.push({ name: 'Настройки группы устройств', params: { id: groupId } })
    } catch (error) {
      alertStore.error(`Не удалось перейти к редактированию группы устройств: ${error.message || error}`)
    }
  }

  /**
   * Deletes a device group with user confirmation
   * 
   * Performs a safe device group deletion process that includes:
   * 1. Finding the group in the store to get its name
   * 2. Showing a confirmation dialog with the group name
   * 3. Executing the deletion if confirmed
   * 4. Handling any errors that occur during deletion
   * 
   * Note: This will also unassign any devices that were assigned to this group.
   * 
   * @param {Object|number} item - Device group object with id property or group ID number
   * 
   * @example
   * // Delete from context menu
   * const handleDelete = async () => {
   *   await deleteDeviceGroup(selectedGroup)
   * }
   * 
   * // Delete with group ID
   * const confirmAndDelete = async (groupId) => {
   *   await deleteDeviceGroup(groupId)
   * }
   */
  const deleteDeviceGroup = async (item) => {
    // Extract group ID from parameter
    const groupId = typeof item === 'object' ? item.id : item
    
    // Find the group in the store to get display information
    const group = deviceGroupsStore.groups.find(g => g.id === groupId)
    if (!group) return // Group not found, nothing to delete
    
    // Show confirmation dialog with group name for safety
    const confirmed = await confirmDelete(group.name, 'группу устройств')
    
    if (confirmed) {
      try {
        // Execute the deletion through the store
        await deviceGroupsStore.delete(groupId)
        // Success feedback is typically handled by the store or calling component
      } catch (error) {
        // Show user-friendly error message
        alertStore.error(`Ошибка при удалении группы устройств: ${error.message || error}`)
      }
    }
  }

  return { createDeviceGroup, editDeviceGroup, deleteDeviceGroup }
}
