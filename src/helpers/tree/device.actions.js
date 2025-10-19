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
 * - Integration with centralized ID extraction utilities
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

import { getDeviceIdFromNodeId } from './id.extraction.helpers.js'

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
  const deviceId = getDeviceIdFromNodeId(item?.id)
  if (deviceId === null) {
    return {}
  }
  const device = devicesStore.getDeviceById(deviceId)
  return device || {}
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
   *   Зарегистрировать устройство
   * </v-btn>
   * 
   * // In a context menu
   * const menuItems = [
   *   { title: 'Зарегистрировать новое устройство', action: createDevice }
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
   * @param {import('vue').Ref} [expandedNodes] - Optional reference to expanded nodes for preserving expansion state
   * 
   * @example
   * // Unassign from group context menu
   * const groupDeviceMenu = [
   *   { title: 'Исключить из группы', action: () => unassignFromGroup(selectedNode, expandedNodes) }
   * ]
   * 
   * // Programmatic unassignment
   * const moveDeviceToAccountUnassigned = async (deviceNode) => {
   *   await unassignFromGroup(deviceNode, expandedNodes)
   * }
   */
  const unassignFromGroup = async (item, expandedNodes = null) => {
    try {
      const deviceId = getDeviceIdFromNodeId(item?.id)
      if (!deviceId) {
        alertStore.error('Не удалось определить ID устройства для исключения из группы')
        return
      }

      // Extract account ID from the device node to identify the target location
      const accountMatch = item.id.match(/account-(\d+)/)
      const accountId = accountMatch ? parseInt(accountMatch[1], 10) : null

      // Linear state change: mark device as transitioning to prevent duplication
      if (transitioningDevices) {
        transitioningDevices.value.add(deviceId)
      }

      try {
        // Assign to group 0 (unassigned) while keeping account assignment
        await devicesStore.assignGroup(deviceId, 0)
        
        // Ensure target unassigned section remains expanded after the device is moved
        if (expandedNodes && expandedNodes.value && accountId) {
          const accountNodeId = `account-${accountId}`
          const unassignedNodeId = `account-${accountId}-unassigned`
          
          // Ensure both the account node and its unassigned section remain expanded
          const nodesToExpand = [accountNodeId, unassignedNodeId]
          
          nodesToExpand.forEach(nodeId => {
            if (!expandedNodes.value.includes(nodeId)) {
              expandedNodes.value = [...expandedNodes.value, nodeId]
            }
          })
        }
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
   * @param {import('vue').Ref} [expandedNodes] - Optional reference to expanded nodes for preserving expansion state
   * 
   * @example
   * // Unassign from account context menu
   * const accountDeviceMenu = [
   *   { title: 'Исключить из лицевого счёта', action: () => unassignFromAccount(selectedNode, expandedNodes) }
   * ]
   * 
   * // Return device to global pool
   * const returnDeviceToGlobalPool = async (deviceNode) => {
   *   await unassignFromAccount(deviceNode, expandedNodes)
   * }
   */
  const unassignFromAccount = async (item, expandedNodes = null) => {
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
        
        // Ensure root unassigned section remains expanded after the device is moved
        if (expandedNodes && expandedNodes.value) {
          const rootUnassignedNodeId = 'root-unassigned'
          
          if (!expandedNodes.value.includes(rootUnassignedNodeId)) {
            expandedNodes.value = [...expandedNodes.value, rootUnassignedNodeId]
          }
        }
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
