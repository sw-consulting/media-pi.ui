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

import { getDeviceIdFromItem } from './device.item.helpers.js'

/**
 * Account Assignment Helper Functions
 * Manages inline account assignment functionality
 */

/**
 * Create account assignment actions
 */
export function createAccountAssignmentActions(
  accountAssignmentState,
  transitioningDevices,
  devicesStore,
  alertStore
) {
  const startAccountAssignment = (item) => {
    const deviceId = getDeviceIdFromItem(item)
    if (!deviceId) {
      alertStore.error('Не удалось определить ID устройства для назначения')
      return
    }
    
    // Ensure proper reactivity by creating a new object
    accountAssignmentState.value = {
      ...accountAssignmentState.value,
      [deviceId]: {
        editMode: true,
        selectedAccountId: null
      }
    }
  }

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
      
      // 3. Clear assignment state
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
