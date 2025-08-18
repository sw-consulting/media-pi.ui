/**
 * Device Group Assignment Helpers Module
 * This file is a part of Media Pi frontend application
 * 
 * Manages inline device group assignment functionality for devices within the tree interface.
 * This module provides a sophisticated assignment workflow that allows users to assign
 * devices to device groups directly from the tree view with inline editing capabilities.
 * 
 * Key Features:
 * - Inline device group assignment with dropdown selection
 * - State management for group assignment workflows
 * - Transition state handling to prevent UI inconsistencies
 * - Account-scoped group filtering for appropriate assignments
 * - Comprehensive error handling with user feedback
 * 
 * Assignment Scope:
 * - Only devices assigned to accounts can be assigned to groups
 * - Groups are account-specific; devices can only be assigned to groups within their account
 * - Assignment preserves account relationship while adding group organization
 * 
 * Assignment Workflow:
 * 1. User initiates group assignment (startDeviceGroupAssignment)
 * 2. UI shows inline dropdown with account-appropriate groups
 * 3. User selects group and confirms (confirmDeviceGroupAssignment)
 * 4. Device transitions to group section with state management
 * 5. Tree updates to reflect device's new group location
 * 
 * @module DeviceGroupAssignmentHelpers
 * @author Maxim Samsonov
 * @since 2025
 */

import { getDeviceIdFromItem } from './device.item.helpers.js'

/**
 * Creates device group assignment action handlers for inline device assignment
 * 
 * Factory function that creates a comprehensive set of handlers for managing
 * device-to-group assignment workflows. These handlers manage the complex
 * state transitions required for inline editing within the tree interface.
 * 
 * @param {import('vue').Ref} deviceGroupAssignmentState - Reactive state for group assignment UI
 * @param {import('vue').Ref<Set>} transitioningDevices - Set of devices currently transitioning
 * @param {Object} devicesStore - Pinia store for device data management
 * @param {Object} alertStore - Pinia store for displaying user notifications
 * @returns {Object} Object containing group assignment action handlers
 * 
 * @example
 * // Setup in a Vue component
 * import { createDeviceGroupAssignmentActions } from '@/helpers/tree/devicegroup.assignment.helpers'
 * import { ref } from 'vue'
 * 
 * const deviceGroupAssignmentState = ref({})
 * const transitioningDevices = ref(new Set())
 * 
 * const {
 *   startDeviceGroupAssignment,
 *   cancelDeviceGroupAssignment,
 *   confirmDeviceGroupAssignment,
 *   updateSelectedDeviceGroup
 * } = createDeviceGroupAssignmentActions(
 *   deviceGroupAssignmentState,
 *   transitioningDevices,
 *   devicesStore,
 *   alertStore
 * )
 * 
 * // Use in tree context menu for account-assigned devices
 * const contextMenu = [
 *   { title: 'Назначить группу', action: () => startDeviceGroupAssignment(selectedItem) }
 * ]
 */
export function createDeviceGroupAssignmentActions(
  deviceGroupAssignmentState,
  transitioningDevices,
  devicesStore,
  alertStore
) {
  /**
   * Initiates device group assignment workflow for a device
   * 
   * Starts the inline assignment process by setting the device into edit mode.
   * This enables the device group selection dropdown and prepares the UI for
   * group selection and confirmation. Only works for devices already assigned to accounts.
   * 
   * @param {Object} item - Tree item representing the device to assign to a group
   * 
   * @example
   * // Start group assignment from context menu
   * const handleAssignGroup = () => {
   *   startDeviceGroupAssignment(selectedTreeItem)
   * }
   * 
   * // Start assignment from button click (for account devices only)
   * <v-btn 
   *   v-if="isAccountAssignedDevice(deviceItem)"
   *   @click="startDeviceGroupAssignment(deviceItem)"
   * >
   *   Назначить группу
   * </v-btn>
   */
  const startDeviceGroupAssignment = (item) => {
    const deviceId = getDeviceIdFromItem(item)
    if (!deviceId) {
      alertStore.error('Не удалось определить ID устройства для назначения группы')
      return
    }
    
    // Ensure proper reactivity by creating a new object
    // This triggers Vue's reactivity system for nested object updates
    deviceGroupAssignmentState.value = {
      ...deviceGroupAssignmentState.value,
      [deviceId]: {
        editMode: true,
        selectedGroupId: null
      }
    }
  }

  /**
   * Cancels device group assignment workflow for a device
   * 
   * Exits the group assignment mode without making any changes. Resets the
   * assignment state and returns the UI to its normal display mode.
   * 
   * @param {Object} item - Tree item representing the device assignment to cancel
   * 
   * @example
   * // Cancel group assignment from UI
   * const handleCancel = () => {
   *   cancelDeviceGroupAssignment(selectedTreeItem)
   * }
   * 
   * // Cancel button in inline editor
   * <v-btn @click="cancelDeviceGroupAssignment(deviceItem)" variant="text">
   *   Отмена
   * </v-btn>
   */
  const cancelDeviceGroupAssignment = (item) => {
    const deviceId = getDeviceIdFromItem(item)
    if (deviceId && deviceGroupAssignmentState.value[deviceId]) {
      // Ensure proper reactivity by creating a new object
      deviceGroupAssignmentState.value = {
        ...deviceGroupAssignmentState.value,
        [deviceId]: {
          editMode: false,
          selectedGroupId: null
        }
      }
    }
  }

  /**
   * Confirms and executes device group assignment for a device
   * 
   * Performs the actual group assignment operation with comprehensive state management:
   * 1. Validates that a device group has been selected
   * 2. Marks device as transitioning to prevent UI conflicts
   * 3. Executes the group assignment API call
   * 4. Cleans up assignment state on success
   * 5. Handles errors with user feedback
   * 
   * Note: This operation preserves the device's account assignment while adding group organization.
   * 
   * @param {Object} item - Tree item representing the device to assign to a group
   * 
   * @example
   * // Confirm group assignment from UI
   * const handleConfirm = async () => {
   *   await confirmDeviceGroupAssignment(selectedTreeItem)
   * }
   * 
   * // Confirm button in inline editor
   * <v-btn 
   *   @click="confirmDeviceGroupAssignment(deviceItem)" 
   *   color="primary"
   *   :disabled="!groupAssignmentState[deviceId]?.selectedGroupId"
   * >
   *   Подтвердить
   * </v-btn>
   */
  const confirmDeviceGroupAssignment = async (item) => {
    const deviceId = getDeviceIdFromItem(item)
    if (!deviceId || !deviceGroupAssignmentState.value[deviceId]?.selectedGroupId) {
      alertStore.error('Не выбрана группа для назначения')
      return
    }
    
    try {
      // Linear state change approach to prevent race conditions:
      // 1. Mark device as transitioning to remove it from current tree position
      transitioningDevices.value.add(deviceId)
      
      // 2. Perform the API call to assign the device group
      await devicesStore.assignGroup(deviceId, deviceGroupAssignmentState.value[deviceId].selectedGroupId)
      
      // 3. Clear assignment state to exit edit mode
      deviceGroupAssignmentState.value = {
        ...deviceGroupAssignmentState.value,
        [deviceId]: {
          editMode: false,
          selectedGroupId: null
        }
      }
      
      // 4. Remove from transitioning state after successful assignment
      transitioningDevices.value.delete(deviceId)
     
    } catch (error) {
      // On error, remove from transitioning state and show error
      transitioningDevices.value.delete(deviceId)
      alertStore.error(`Ошибка при назначении группы: ${error.message || error}`)
    }
  }

  /**
   * Updates selected device group in assignment state
   * 
   * Updates the selected device group ID for a device assignment workflow.
   * This is typically called when the user selects a group from the dropdown
   * in the inline assignment interface. Only groups within the device's account are valid.
   * 
   * @param {number} deviceId - ID of the device being assigned
   * @param {number} selectedGroupId - ID of the selected device group
   * 
   * @example
   * // Update selection from dropdown
   * const handleGroupSelect = (groupId) => {
   *   updateSelectedDeviceGroup(deviceId, groupId)
   * }
   * 
   * // In a select component with account-filtered groups
   * <v-select
   *   :model-value="groupAssignmentState[deviceId]?.selectedGroupId"
   *   @update:model-value="(value) => updateSelectedDeviceGroup(deviceId, value)"
   *   :items="availableGroupsForAccount"
   *   item-title="title"
   *   item-value="id"
   * />
   */
  const updateSelectedDeviceGroup = (deviceId, selectedGroupId) => {
    deviceGroupAssignmentState.value = {
      ...deviceGroupAssignmentState.value,
      [deviceId]: {
        ...deviceGroupAssignmentState.value[deviceId],
        selectedGroupId: selectedGroupId
      }
    }
  }

  return {
    startDeviceGroupAssignment,
    cancelDeviceGroupAssignment,
    confirmDeviceGroupAssignment,
    updateSelectedDeviceGroup
  }
}
