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
 * Device Group Action Functions
 * Handles CRUD operations for device groups
 */

/**
 * Create device group action handlers
 */
export const createDeviceGroupActions = (router, alertStore, deviceGroupsStore, confirmDelete) => {
  const createDeviceGroup = (item) => {
    try {
      // item.id is like 'account-123-groups', extract accountId
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

  const editDeviceGroup = (item) => {
    try {
      const groupId = typeof item === 'object' ? item.id : item
      router.push({ name: 'Настройки группы устройств', params: { id: groupId } })
    } catch (error) {
      alertStore.error(`Не удалось перейти к редактированию группы устройств: ${error.message || error}`)
    }
  }

  const deleteDeviceGroup = async (item) => {
    const groupId = typeof item === 'object' ? item.id : item
    const group = deviceGroupsStore.groups.find(g => g.id === groupId)
    if (!group) return
    
    const confirmed = await confirmDelete(group.name, 'группу устройств')
    
    if (confirmed) {
      try {
        await deviceGroupsStore.delete(groupId)
      } catch (error) {
        alertStore.error(`Ошибка при удалении группы устройств: ${error.message || error}`)
      }
    }
  }

  return { createDeviceGroup, editDeviceGroup, deleteDeviceGroup }
}

/**
 * Extract group ID from node ID (e.g., "group-123" -> 123)
 */
export const getGroupIdFromNodeId = (nodeId) => {
  if (!nodeId || typeof nodeId !== 'string') return null
  const match = nodeId.match(/^group-(\d+)$/)
  return match ? parseInt(match[1], 10) : null
}
