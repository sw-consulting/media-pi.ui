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
 * Device Group Assignment Helper Functions
 * Manages inline device group assignment functionality
 */

/**
 * Create device group assignment actions
 */
export function createDeviceGroupAssignmentActions(
  deviceGroupAssignmentState,
  transitioningDevices,
  devicesStore,
  alertStore
) {
  const startDeviceGroupAssignment = (item) => {
    const deviceId = getDeviceIdFromItem(item)
    if (!deviceId) {
      alertStore.error('Не удалось определить ID устройства для назначения группы')
      return
    }
    
    // Ensure proper reactivity by creating a new object
    deviceGroupAssignmentState.value = {
      ...deviceGroupAssignmentState.value,
      [deviceId]: {
        editMode: true,
        selectedGroupId: null
      }
    }
  }

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
      
      // 2. Perform the API call to assign the group
      await devicesStore.assignGroup(deviceId, deviceGroupAssignmentState.value[deviceId].selectedGroupId)
      
      // 3. Clear assignment state
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
