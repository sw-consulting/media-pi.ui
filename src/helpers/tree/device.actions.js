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
 * Device Action Functions
 * Handles CRUD operations and assignment actions for devices
 */

/**
 * Extract device ID from tree node ID
 * @param {string} nodeId - Tree node ID (e.g., 'device-123')
 * @returns {number|null} - Device ID or null if not a device node
 */
export const getDeviceIdFromNodeId = (nodeId) => {
  if (!nodeId || typeof nodeId !== 'string') return null
  
  // Match device-ID or device-ID-anything pattern
  const match = nodeId.match(/^device-(\d+)(?:-.*)?$/)
  return match ? parseInt(match[1], 10) : null
}

/**
 * Extract account ID from tree node ID for account-level operations
 * @param {string} nodeId - Tree node ID (e.g., 'account-123-unassigned')
 * @returns {number|null} - Account ID or null if not an account node
 */
export const getAccountIdFromDeviceContext = (nodeId) => {
  if (!nodeId || typeof nodeId !== 'string') return null
  
  const match = nodeId.match(/^account-(\d+)-/)
  return match ? parseInt(match[1], 10) : null
}

/**
 * Create device action handlers
 */
export const createDeviceActions = (router, alertStore, devicesStore, confirmDelete, transitioningDevices = null) => {
  // Navigation actions
  const createDevice = () => {
    try {
        router.push({ name: 'Создание устройства' })
    } catch (error) {
      alertStore.error(`Не удалось перейти к созданию устройства: ${error.message || error}`)
    }
  }

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
