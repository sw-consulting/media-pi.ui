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
 * Tree Building Functions
 * Handles the construction of tree data structures for accounts and devices
 */

/**
 * Get unassigned devices (devices without accountId)
 */
export const getUnassignedDevices = (devicesStore) => {
  return (devicesStore.devices || [])
    .filter(d => !d.accountId || d.accountId === 0)
    .map(d => ({ id: `device-${d.id}`, name: d.name }))
}

/**
 * Get children for a specific account (unassigned devices + device groups)
 */
export const getAccountChildren = (accountId, devicesStore, deviceGroupsStore) => {
  const devices = (devicesStore.devices || []).filter(d => d.accountId === accountId)
  const unassigned = devices
    .filter(d => !d.deviceGroupId || d.deviceGroupId === 0)
    .map(d => ({ id: `device-${d.id}`, name: d.name }))
  
  const groups = (deviceGroupsStore.groups || [])
    .filter(g => g.accountId === accountId)
    .map(g => ({
      id: `group-${g.id}`,
      name: g.name,
      children: devices
        .filter(d => d.deviceGroupId === g.id)
        .map(d => ({ id: `device-${d.id}`, name: d.name }))
    }))
  
  const children = []
  
  // Always add unassigned devices node (even if empty)
  children.push({ 
    id: `account-${accountId}-unassigned`, 
    name: 'Нераспределённые устройства', 
    children: unassigned 
  })
  
  // Always add device groups container node (even if empty)
  children.push({
    id: `account-${accountId}-groups`,
    name: 'Группы устройств',
    children: groups
  })
  
  return children
}

/**
 * Build the complete tree structure
 */
export const buildTreeItems = (
  canViewUnassignedDevices, 
  canViewAccounts, 
  loadedNodes, 
  accountsStore, 
  devicesStore,
  deviceGroupsStore,
  getUnassignedDevicesFn = getUnassignedDevices,
  getAccountChildrenFn = getAccountChildren
) => {
  const items = []
  
  if (canViewUnassignedDevices) {
    const hasChildren = !loadedNodes.has('root-unassigned')
    items.push({
      id: 'root-unassigned',
      name: 'Нераспределённые устройства',
      children: hasChildren ? [] : getUnassignedDevicesFn(devicesStore)
    })
  }
  
  if (canViewAccounts) {
    const accounts = (accountsStore.accounts || []).map(acc => {
      const accountNodeId = `account-${acc.id}`
      const hasChildren = !loadedNodes.has(accountNodeId)
      
      // If account node is loaded, check if device group containers need loading
      let children = []
      if (!hasChildren) {
        const accountChildren = getAccountChildrenFn(acc.id, devicesStore, deviceGroupsStore)
        
        // For each child that is a device group container, check if it needs loading
        children = accountChildren.map(child => {
          if (child.id.includes('-groups')) {
            const groupsNodeId = child.id
            const groupsHasChildren = !loadedNodes.has(groupsNodeId)
            return {
              ...child,
              children: groupsHasChildren ? [] : child.children
            }
          }
          return child
        })
      }
      
      return {
        id: accountNodeId,
        name: acc.name,
        children: hasChildren ? [] : children
      }
    })
    
    items.push({
      id: 'root-accounts',
      name: 'Лицевые счета',
      children: accounts
    })
  }
  
  return items
}
