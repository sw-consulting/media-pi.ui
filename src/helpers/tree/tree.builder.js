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
 * Tree Builder Module
 * 
 * This module provides core functions for building hierarchical tree structures
 * for the Media Pi application's account and device management interface.
 * 
 * Key Features:
 * - Hierarchical organization of accounts, device groups, and devices
 * - Lazy loading support for performance optimization
 * - Permission-based tree construction
 * - Race condition prevention during device transitions
 * - Consistent ordering (accounts first, then unassigned devices)
 * 
 * Tree Structure:
 * Root Level:
 *   ├── Лицевые счета (Accounts) - appears first
 *   │   ├── Account 1
 *   │   │   ├── Группы устройств (Device Groups)
 *   │   │   │   ├── Group A (with devices)
 *   │   │   │   └── Group B (with devices)
 *   │   │   └── Нераспределённые устройства (Unassigned Devices)
 *   │   └── Account 2...
 *   └── Нераспределённые устройства (Global Unassigned) - appears last
 * 
 * @module TreeBuilder
 * @author Maxim Samsonov
 * @since 2025
 */


/**
 * Get unassigned devices (devices without accountId)
 * 
 * Retrieves all devices that are not assigned to any account (accountId is null, undefined, or 0).
 * These devices are considered "global" and available for assignment to any account.
 * 
 * @param {Object} devicesStore - The devices store containing the devices array
 * @param {Set} transitioningDevices - Set of device IDs that are currently being moved/transitioned (default: empty Set)
 * @returns {Array} Array of device objects formatted for tree display with unique IDs
 * 
 * @example
 * // Returns: [{ id: 'device-1', name: 'Camera 1' }, { id: 'device-2', name: 'Sensor A' }]
 * getUnassignedDevices(devicesStore, new Set([3])) // Excludes device with ID 3
 */
export const getUnassignedDevices = (devicesStore, transitioningDevices = new Set()) => {
  return (devicesStore.devices || [])
    .filter(d => !d.accountId || d.accountId === 0) // Only devices without account assignment
    .filter(d => !transitioningDevices.has(d.id)) // Exclude devices being moved to prevent UI conflicts
    .map(d => ({ id: `device-${d.id}`, name: d.name })) // Format for tree component
}

/**
 * Get children for a specific account (device groups + unassigned devices)
 * 
 * Builds the hierarchical structure for devices within a specific account.
 * Groups devices into two main categories:
 * 1. Device Groups - organized collections of devices
 * 2. Unassigned Devices - devices in the account but not assigned to any group
 * 
 * The order is intentional: groups first, then unassigned devices at the end.
 * 
 * @param {number} accountId - The ID of the account to get children for
 * @param {Object} devicesStore - The devices store containing the devices array
 * @param {Object} deviceGroupsStore - The device groups store containing the groups array
 * @param {Set} transitioningDevices - Set of device IDs that are currently being moved/transitioned (default: empty Set)
 * @returns {Array} Array containing two nodes: groups container and unassigned devices container
 * 
 * @example
 * // Returns: [
 * //   { id: 'account-1-groups', name: 'Группы устройств', children: [...] },
 * //   { id: 'account-1-unassigned', name: 'Нераспределённые устройства', children: [...] }
 * // ]
 * getAccountChildren(1, devicesStore, deviceGroupsStore)
 */
export const getAccountChildren = (accountId, devicesStore, deviceGroupsStore, transitioningDevices = new Set()) => {
  // Get all devices belonging to this specific account, excluding any currently being moved
  const devices = (devicesStore.devices || [])
    .filter(d => d.accountId === accountId) // Only devices assigned to this account
    .filter(d => !transitioningDevices.has(d.id)) // Exclude devices being moved to prevent UI conflicts
  
  // Create list of unassigned devices (devices in account but not in any group)
  const unassigned = devices
    .filter(d => !d.deviceGroupId || d.deviceGroupId === 0) // No group assignment
    .map(d => ({ 
      id: `device-${d.id}-account-${d.accountId}-unassigned`, // Unique ID for tree
      name: d.name 
    }))
  
  // Create device groups and populate them with their assigned devices
  const groups = (deviceGroupsStore.groups || [])
    .filter(g => g.accountId === accountId) // Only groups belonging to this account
    .map(g => ({
      id: `group-${g.id}`,
      name: g.name,
      children: devices
        .filter(d => d.deviceGroupId === g.id) // Devices assigned to this group
        .map(d => ({ 
          id: `device-${d.id}-account-${d.accountId}-group-${g.id}`, // Unique ID indicating group context
          name: d.name 
        }))
    }))
  
  const children = []
  
  // Add device groups container first (organizational preference)
  children.push({
    id: `account-${accountId}-groups`,
    name: 'Группы устройств',
    children: groups
  })
  
  // Add unassigned devices node at the end (less priority than organized groups)
  children.push({ 
    id: `account-${accountId}-unassigned`, 
    name: 'Нераспределённые устройства', 
    children: unassigned 
  })
  
  return children
}

/**
 * Build the complete tree structure
 * 
 * Constructs the main tree structure based on user permissions and data availability.
 * The tree has two potential root nodes:
 * 1. Accounts (Лицевые счета) - appears first if user can view accounts
 * 2. Unassigned Devices (Нераспределённые устройства) - appears last if user can view them
 * 
 * Implements lazy loading: child nodes are empty until explicitly loaded.
 * This improves performance for large datasets and allows progressive data loading.
 * 
 * @param {boolean} canViewUnassignedDevices - Whether user has permission to view global unassigned devices
 * @param {boolean} canViewAccounts - Whether user has permission to view accounts and their devices
 * @param {Set} loadedNodes - Set of node IDs that have been loaded (for lazy loading control)
 * @param {Object} accountsStore - The accounts store containing the accounts array
 * @param {Object} devicesStore - The devices store containing the devices array
 * @param {Object} deviceGroupsStore - The device groups store containing the groups array
 * @param {Function} getUnassignedDevicesFn - Function to get unassigned devices (default: getUnassignedDevices)
 * @param {Function} getAccountChildrenFn - Function to get account children (default: getAccountChildren)
 * @returns {Array} Array of root tree nodes based on user permissions
 * 
 * @example
 * // For administrator (can see everything):
 * // Returns: [
 * //   { id: 'root-accounts', name: 'Лицевые счета', children: [...] },
 * //   { id: 'root-unassigned', name: 'Нераспределённые устройства', children: [...] }
 * // ]
 * 
 * // For manager (can see only accounts):
 * // Returns: [
 * //   { id: 'root-accounts', name: 'Лицевые счета', children: [...] }
 * // ]
 * 
 * // For engineer (can see only unassigned devices):
 * // Returns: [
 * //   { id: 'root-unassigned', name: 'Нераспределённые устройства', children: [...] }
 * // ]
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
  
  // Add accounts root node first (prioritized over unassigned devices)
  if (canViewAccounts) {
    // Transform each account into a tree node with proper lazy loading support
    const accounts = (accountsStore.accounts || []).map(acc => {
      const accountNodeId = `account-${acc.id}`
      const hasChildren = !loadedNodes.has(accountNodeId) // Check if account node has been expanded/loaded
      
      // If account node is loaded, build its children with nested lazy loading
      let children = []
      if (!hasChildren) {
        const accountChildren = getAccountChildrenFn(acc.id, devicesStore, deviceGroupsStore)
        
        // Apply lazy loading to device group containers within accounts
        children = accountChildren.map(child => {
          if (child.id.includes('-groups')) {
            const groupsNodeId = child.id
            const groupsHasChildren = !loadedNodes.has(groupsNodeId) // Check if groups container was expanded
            return {
              ...child,
              children: groupsHasChildren ? [] : child.children // Empty array triggers lazy loading
            }
          }
          return child // Unassigned devices don't need special lazy loading handling
        })
      }
      
      return {
        id: accountNodeId,
        name: acc.name,
        children: hasChildren ? [] : children // Empty array triggers lazy loading for account
      }
    })
    
    // Create the accounts root container
    items.push({
      id: 'root-accounts',
      name: 'Лицевые счета',
      children: accounts
    })
  }
  
  // Add unassigned devices root node at the end (lower priority than organized accounts)
  if (canViewUnassignedDevices) {
    const hasChildren = !loadedNodes.has('root-unassigned') // Check if unassigned root was expanded
    items.push({
      id: 'root-unassigned',
      name: 'Нераспределённые устройства',
      children: hasChildren ? [] : getUnassignedDevicesFn(devicesStore) // Load devices if expanded
    })
  }
  
  return items
}

/**
 * Implementation Notes:
 * 
 * 1. Lazy Loading Strategy:
 *    - Empty children arrays indicate unloaded nodes
 *    - loadedNodes Set tracks which nodes have been expanded
 *    - Improves performance for large datasets
 * 
 * 2. Unique ID Generation:
 *    - Each tree node has a unique ID for React/Vue key purposes
 *    - IDs encode context (device-1-account-2-group-3)
 *    - Enables precise node identification and manipulation
 * 
 * 3. Race Condition Prevention:
 *    - transitioningDevices Set excludes devices being moved
 *    - Prevents UI inconsistencies during async operations
 *    - Maintains data integrity during transitions
 * 
 * 4. Ordering Philosophy:
 *    - Organized content (accounts, groups) appears first
 *    - Unassigned/unorganized content appears last
 *    - Promotes better user experience and organization
 * 
 * 5. Permission Model:
 *    - Functions accept permission flags rather than user objects
 *    - Enables flexible permission checking strategies
 *    - Separates business logic from UI concerns
 */
