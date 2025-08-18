/**
 * Account Assignment Helpers Module
 * This file is a part of Media Pi frontend application
 * 
 * Manages inline account assignment functionality for devices within the tree interface.
 * This module provides a sophisticated assignment workflow that allows users to assign
 * devices to accounts directly from the tree view with inline editing capabilities.
 * 
 * Key Features:
 * - Inline account assignment with dropdown selection
 * - State management for assignment workflows
 * - Transition state handling to prevent UI inconsistencies
 * - Comprehensive error handling with user feedback
 * - Reactive state updates for real-time UI responsiveness
 * 
 * Assignment Workflow:
 * 1. User initiates assignment (startAccountAssignment)
 * 2. UI shows inline dropdown for account selection
 * 3. User selects account and confirms (confirmAccountAssignment)
 * 4. Device transitions to new account with state management
 * 5. Tree updates to reflect new device location
 * 
 * @module AccountAssignmentHelpers
 * @author Maxim Samsonov
 * @since 2025
 */

import { getDeviceIdFromItem } from './device.item.helpers.js'

/**
 * Creates account assignment action handlers for inline device assignment
 * 
 * Factory function that creates a comprehensive set of handlers for managing
 * device-to-account assignment workflows. These handlers manage the complex
 * state transitions required for inline editing within the tree interface.
 * 
 * @param {import('vue').Ref} accountAssignmentState - Reactive state for assignment UI
 * @param {import('vue').Ref<Set>} transitioningDevices - Set of devices currently transitioning
 * @param {Object} devicesStore - Pinia store for device data management
 * @param {Object} alertStore - Pinia store for displaying user notifications
 * @returns {Object} Object containing assignment action handlers
 * 
 * @example
 * // Setup in a Vue component
 * import { createAccountAssignmentActions } from '@/helpers/tree/account.assignment.helpers'
 * import { ref } from 'vue'
 * 
 * const accountAssignmentState = ref({})
 * const transitioningDevices = ref(new Set())
 * 
 * const {
 *   startAccountAssignment,
 *   cancelAccountAssignment,
 *   confirmAccountAssignment,
 *   updateSelectedAccount
 * } = createAccountAssignmentActions(
 *   accountAssignmentState,
 *   transitioningDevices,
 *   devicesStore,
 *   alertStore
 * )
 * 
 * // Use in tree context menu
 * const contextMenu = [
 *   { title: 'Назначить лицевой счёт', action: () => startAccountAssignment(selectedItem) }
 * ]
 */
export function createAccountAssignmentActions(
  accountAssignmentState,
  transitioningDevices,
  devicesStore,
  alertStore
) {
  /**
   * Initiates account assignment workflow for a device
   * 
   * Starts the inline assignment process by setting the device into edit mode.
   * This enables the account selection dropdown and prepares the UI for
   * account selection and confirmation.
   * 
   * @param {Object} item - Tree item representing the device to assign
   * 
   * @example
   * // Start assignment from context menu
   * const handleAssignAccount = () => {
   *   startAccountAssignment(selectedTreeItem)
   * }
   * 
   * // Start assignment from button click
   * <v-btn @click="startAccountAssignment(deviceItem)">
   *   Назначить лицевой счёт
   * </v-btn>
   */
  const startAccountAssignment = (item) => {
    const deviceId = getDeviceIdFromItem(item)
    if (!deviceId) {
      alertStore.error('Не удалось определить ID устройства для назначения')
      return
    }
    
    // Ensure proper reactivity by creating a new object
    // This triggers Vue's reactivity system for nested object updates
    accountAssignmentState.value = {
      ...accountAssignmentState.value,
      [deviceId]: {
        editMode: true,
        selectedAccountId: null
      }
    }
  }

  /**
   * Cancels account assignment workflow for a device
   * 
   * Exits the assignment mode without making any changes. Resets the
   * assignment state and returns the UI to its normal display mode.
   * 
   * @param {Object} item - Tree item representing the device assignment to cancel
   * 
   * @example
   * // Cancel assignment from UI
   * const handleCancel = () => {
   *   cancelAccountAssignment(selectedTreeItem)
   * }
   * 
   * // Cancel button in inline editor
   * <v-btn @click="cancelAccountAssignment(deviceItem)" variant="text">
   *   Отмена
   * </v-btn>
   */
  const cancelAccountAssignment = (item) => {
    const deviceId = getDeviceIdFromItem(item)
    if (deviceId && accountAssignmentState.value[deviceId]) {
      // Ensure proper reactivity by creating a new object
      accountAssignmentState.value = {
        ...accountAssignmentState.value,
        [deviceId]: {
          editMode: false,
          selectedAccountId: null
        }
      }
    }
  }

  /**
   * Confirms and executes account assignment for a device
   * 
   * Performs the actual assignment operation with comprehensive state management:
   * 1. Validates that an account has been selected
   * 2. Marks device as transitioning to prevent UI conflicts
   * 3. Executes the assignment API call
   * 4. Cleans up assignment state on success
   * 5. Handles errors with user feedback
   * 
   * @param {Object} item - Tree item representing the device to assign
   * 
   * @example
   * // Confirm assignment from UI
   * const handleConfirm = async () => {
   *   await confirmAccountAssignment(selectedTreeItem)
   * }
   * 
   * // Confirm button in inline editor
   * <v-btn 
   *   @click="confirmAccountAssignment(deviceItem)" 
   *   color="primary"
   *   :disabled="!assignmentState[deviceId]?.selectedAccountId"
   * >
   *   Подтвердить
   * </v-btn>
   */
  const confirmAccountAssignment = async (item) => {
    const deviceId = getDeviceIdFromItem(item)
    if (!deviceId || !accountAssignmentState.value[deviceId]?.selectedAccountId) {
      alertStore.error('Не выбран лицевой счёт для назначения')
      return
    }
    
    try {
      // Linear state change approach to prevent race conditions:
      // 1. Mark device as transitioning to remove it from current tree position
      transitioningDevices.value.add(deviceId)
      
      // 2. Perform the API call to assign the account
      await devicesStore.assignAccount(deviceId, accountAssignmentState.value[deviceId].selectedAccountId)
      
      // 3. Clear assignment state to exit edit mode
      accountAssignmentState.value = {
        ...accountAssignmentState.value,
        [deviceId]: {
          editMode: false,
          selectedAccountId: null
        }
      }
      
      // 4. Remove from transitioning state after successful assignment
      transitioningDevices.value.delete(deviceId)
     
    } catch (error) {
      // On error, remove from transitioning state and show error
      transitioningDevices.value.delete(deviceId)
      alertStore.error(`Ошибка при назначении лицевого счёта: ${error.message || error}`)
    }
  }

  /**
   * Updates selected account in assignment state
   * 
   * Updates the selected account ID for a device assignment workflow.
   * This is typically called when the user selects an account from
   * the dropdown in the inline assignment interface.
   * 
   * @param {number} deviceId - ID of the device being assigned
   * @param {number} selectedAccountId - ID of the selected account
   * 
   * @example
   * // Update selection from dropdown
   * const handleAccountSelect = (accountId) => {
   *   updateSelectedAccount(deviceId, accountId)
   * }
   * 
   * // In a select component
   * <v-select
   *   :model-value="assignmentState[deviceId]?.selectedAccountId"
   *   @update:model-value="(value) => updateSelectedAccount(deviceId, value)"
   *   :items="availableAccounts"
   * />
   */
  const updateSelectedAccount = (deviceId, selectedAccountId) => {
    accountAssignmentState.value = {
      ...accountAssignmentState.value,
      [deviceId]: {
        ...accountAssignmentState.value[deviceId],
        selectedAccountId: selectedAccountId
      }
    }
  }

  return {
    startAccountAssignment,
    cancelAccountAssignment,
    confirmAccountAssignment,
    updateSelectedAccount
  }
}
