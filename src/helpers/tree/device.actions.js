/**
 * Device Actions Module
 * This file is a part of Media Pi frontend application
 * 
 * Provides comprehensive action handlers for device operations within the tree interface.
 * This module handles CRUD operations, assignment management, and device transitions
 * between different organizational levels (unassigned, accounts, groups).
 * 
 * Key Features:
 * - Device creation, editing, and deletion with confirmation
 * - Device assignment and unassignment operations
 * - Transition state management to prevent UI inconsistencies
 * - Complex ID extraction from various tree node formats
 * - Robust error handling with user-friendly messages
 * 
 * Tree Node ID Formats:
 * - Simple device: "device-123"
 * - Account device: "device-123-account-456-unassigned" 
 * - Group device: "device-123-account-456-group-789"
 * - Global unassigned: "device-123"
 * 
 * @module DeviceActions
 * @author Maxim Samsonov
 * @since 2025
 */

/**
 * Extracts device ID from tree node ID
 * 
 * Utility function that parses various tree node ID formats to extract
 * the underlying device ID. Device nodes can have complex IDs that encode
 * their context within the tree structure.
 * 
 * @param {string} nodeId - Tree node ID in various device formats
 * @returns {number|null} Device ID as number, or null if parsing fails
 * 
 * @example
 * // Simple device node
 * getDeviceIdFromNodeId('device-123') // Returns: 123
 * 
 * // Account-scoped device node
 * getDeviceIdFromNodeId('device-123-account-456-unassigned') // Returns: 123
 * 
 * // Group-scoped device node  
 * getDeviceIdFromNodeId('device-123-account-456-group-789') // Returns: 123
 * 
 * // Invalid formats
 * getDeviceIdFromNodeId('account-123') // Returns: null
 * getDeviceIdFromNodeId(null) // Returns: null
 */
export const getDeviceIdFromNodeId = (nodeId) => {
  if (!nodeId || typeof nodeId !== 'string') return null
  
  // Match device-ID or device-ID-anything pattern to handle all device node formats
  const match = nodeId.match(/^device-(\d+)(?:-.*)?$/)
  return match ? parseInt(match[1], 10) : null
}

/**
 * Extracts account ID from device context node ID
 * 
 * Utility function that extracts account ID from device node IDs that
 * include account context. This is used for operations that need to
 * understand which account a device operation is taking place within.
 * 
 * @param {string} nodeId - Tree node ID with account context
 * @returns {number|null} Account ID as number, or null if parsing fails
 * 
 * @example
 * // Account-scoped device operations
 * getAccountIdFromDeviceContext('account-456-unassigned') // Returns: 456
 * getAccountIdFromDeviceContext('device-123-account-456-group-789') // Returns: 456
 * 
 * // Non-account contexts
 * getAccountIdFromDeviceContext('device-123') // Returns: null
 * getAccountIdFromDeviceContext('group-789') // Returns: null
 */
export const getAccountIdFromDeviceContext = (nodeId) => {
  if (!nodeId || typeof nodeId !== 'string') return null
  
  // Match account-ID- pattern to extract account context
  const match = nodeId.match(/^account-(\d+)-/)
  return match ? parseInt(match[1], 10) : null
}

/**
 * Creates device action handlers for tree operations
 * 
 * Factory function that creates a comprehensive set of action handlers for device operations.
 * These handlers understand the tree context and manage device transitions between
 * different organizational levels with proper state management.
 * 
 * @param {Object} router - Vue Router instance for navigation
 * @param {Object} alertStore - Pinia store for displaying user notifications
 * @param {Object} devicesStore - Pinia store for device data management
 * @param {Function} confirmDelete - Function for displaying deletion confirmations
 * @param {import('vue').Ref<Set>} transitioningDevices - Optional reactive set for tracking device transitions
 * @returns {Object} Object containing all device action handlers
 * 
 * @example
 * // Setup in a Vue component
 * import { createDeviceActions } from '@/helpers/tree/device.actions'
 * import { useRouter } from 'vue-router'
 * import { useAlertStore, useDevicesStore } from '@/stores'
 * import { confirmDelete } from '@/helpers/confirmation'
 * 
 * const transitioningDevices = ref(new Set())
 * const { createDevice, editDevice, deleteDevice, unassignFromGroup, unassignFromAccount } = 
 *   createDeviceActions(router, alertStore, devicesStore, confirmDelete, transitioningDevices)
 * 
 * // Use in context menu
 * const getDeviceMenu = (node) => [
 *   { title: 'Редактировать', action: () => editDevice(node) },
 *   { title: 'Удалить', action: () => deleteDevice(node) },
 *   { title: 'Исключить из группы', action: () => unassignFromGroup(node) }
 * ]
 */
export const createDeviceActions = (router, alertStore, devicesStore, confirmDelete, transitioningDevices = null) => {
  /**
   * Navigates to the device creation form
   * 
   * Redirects the user to the device creation page where they can
   * input details for a new device. Handles navigation errors gracefully.
   * 
   * @example
   * // In a toolbar button
   * <v-btn @click="createDevice">
   *   Создать устройство
   * </v-btn>
   * 
   * // In a context menu
   * const menuItems = [
   *   { title: 'Создать новое устройство', action: createDevice }
   * ]
   */
  const createDevice = () => {
    try {
        router.push({ name: 'Создание устройства' })
    } catch (error) {
      alertStore.error(`Не удалось перейти к созданию устройства: ${error.message || error}`)
    }
  }

  /**
   * Navigates to the device editing form
   * 
   * Redirects the user to the device editing page for the specified device.
   * Handles complex device ID extraction from tree node structures and
   * provides comprehensive error handling.
   * 
   * @param {Object|number} item - Device object, tree node, or device ID
   * 
   * @example
   * // With tree node
   * editDevice({ id: 'device-123-account-456-unassigned' })
   * 
   * // With device object
   * editDevice({ id: 123, name: 'Camera 1' })
   * 
   * // With device ID
   * editDevice(123)
   */
  const editDevice = (item) => {
    try {
      // Try to get device ID from tree node ID first, then fallback to item.id or item itself
      const deviceId = getDeviceIdFromNodeId(item?.id) || (typeof item === 'object' ? item.id : item)
      if (!deviceId) {
        alertStore.error('Не удалось определить ID устройства для редактирования')
        return
      }
      router.push(`/device/edit/${deviceId}`)
    } catch (error) {
      alertStore.error(`Не удалось перейти к редактированию устройства: ${error.message || error}`)
    }
  }

  /**
   * Deletes a device with user confirmation
   * 
   * Performs a safe device deletion process that includes:
   * 1. Extracting device ID from various input formats
   * 2. Finding the device in the store to get its name
   * 3. Showing a confirmation dialog with the device name
   * 4. Executing the deletion if confirmed
   * 
   * @param {Object|number} item - Device object, tree node, or device ID
   * 
   * @example
   * // Delete from tree context menu
   * const handleDelete = async () => {
   *   await deleteDevice(selectedTreeNode)
   * }
   * 
   * // Delete with device ID
   * const confirmAndDelete = async (deviceId) => {
   *   await deleteDevice(deviceId)
   * }
   */
  const deleteDevice = async (item) => {
    try {
      const deviceId = getDeviceIdFromNodeId(item?.id) || (typeof item === 'object' ? item.id : item)
      if (!deviceId) {
        alertStore.error('Не удалось определить ID устройства для удаления')
        return
      }

      const device = devicesStore.devices?.find(d => d.id === deviceId)
      if (!device) {
        return // Device not found, silently return
      }

      const confirmed = await confirmDelete(device.name, 'устройство')
      if (confirmed) {
        await devicesStore.delete(deviceId)
      }
    } catch (error) {
      alertStore.error(`Ошибка при удалении устройства: ${error.message || error}`)
    }
  }

  /**
   * Unassigns a device from its current group
   * 
   * Removes the device from its device group assignment while keeping it
   * assigned to the account. The device will appear in the account's
   * "Unassigned Devices" section after this operation.
   * 
   * Uses transition state management to prevent UI inconsistencies during
   * the async operation.
   * 
   * @param {Object} item - Tree node representing the device in a group context
   * 
   * @example
   * // Unassign from group context menu
   * const groupDeviceMenu = [
   *   { title: 'Исключить из группы', action: () => unassignFromGroup(selectedNode) }
   * ]
   * 
   * // Programmatic unassignment
   * const moveDeviceToAccountUnassigned = async (deviceNode) => {
   *   await unassignFromGroup(deviceNode)
   * }
   */
  const unassignFromGroup = async (item) => {
    try {
      const deviceId = getDeviceIdFromNodeId(item?.id)
      if (!deviceId) {
        alertStore.error('Не удалось определить ID устройства для исключения из группы')
        return
      }

      // Linear state change: mark device as transitioning to prevent duplication
      if (transitioningDevices) {
        transitioningDevices.value.add(deviceId)
      }

      try {
        // Assign to group 0 (unassigned) while keeping account assignment
        await devicesStore.assignGroup(deviceId, 0)
      } finally {
        // Remove from transitioning state after operation (success or failure)
        if (transitioningDevices) {
          transitioningDevices.value.delete(deviceId)
        }
      }
    } catch (error) {
      alertStore.error(`Ошибка при исключении из группы: ${error.message || error}`)
    }
  }

  /**
   * Unassigns a device from its current account
   * 
   * Removes the device from its account assignment, making it a global
   * unassigned device. The device will appear in the top-level
   * "Unassigned Devices" section after this operation.
   * 
   * This also removes any group assignment since devices cannot be
   * in a group without being in an account.
   * 
   * @param {Object} item - Tree node representing the device in an account context
   * 
   * @example
   * // Unassign from account context menu
   * const accountDeviceMenu = [
   *   { title: 'Исключить из лицевого счёта', action: () => unassignFromAccount(selectedNode) }
   * ]
   * 
   * // Return device to global pool
   * const returnDeviceToGlobalPool = async (deviceNode) => {
   *   await unassignFromAccount(deviceNode)
   * }
   */
  const unassignFromAccount = async (item) => {
    try {
      const deviceId = getDeviceIdFromNodeId(item?.id)

      if (!deviceId) {
        alertStore.error('Не удалось определить ID устройства для исключения из лицевого счёта')
        return
      }

      // Linear state change: mark device as transitioning to prevent duplication
      if (transitioningDevices) {
        transitioningDevices.value.add(deviceId)
      }

      try {
        // Assign to account 0 (unassigned) which also removes group assignment
        await devicesStore.assignAccount(deviceId, 0)
      } finally {
        // Remove from transitioning state after operation (success or failure)
        if (transitioningDevices) {
          transitioningDevices.value.delete(deviceId)
        }
      }
    } catch (error) {
      alertStore.error(`Ошибка при исключении из лицевого счёта: ${error.message || error}`)
    }
  }

  return {
    createDevice,
    editDevice,
    deleteDevice,
    unassignFromGroup,
    unassignFromAccount
  }
}
