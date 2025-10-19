/**
 * Tree Loader Module
 * This file is a part of Media Pi frontend application
 * 
 * Handles lazy loading functionality for the accounts tree. This module provides
 * efficient data loading strategies to avoid loading all tree data at once,
 * improving performance and user experience for large trees.
 * 
 * Loading Strategy:
 * - Root level loads only basic structure initially
 * - Child nodes are loaded on-demand when expanded
 * - Duplicate loading prevention with loading state tracking
 * - Error handling with user-friendly messages
 * 
 * Performance Benefits:
 * - Reduces initial page load time
 * - Minimizes memory usage for large trees
 * - Improves perceived performance through progressive loading
 * - Allows users to see and interact with tree structure immediately
 * 
 * @module TreeLoader
 * @author Maxim Samsonov
 * @since 2025
 */

/**
 * Creates a lazy loading handler for tree nodes
 * 
 * This factory function creates a specialized loading handler that manages
 * the loading of child data for different types of tree nodes. It prevents
 * duplicate requests, tracks loading state, and handles errors gracefully.
 * 
 * Node Types Handled:
 * - 'root-unassigned': Loads all unassigned devices
 * - '*-groups': Loads device groups for an account
 * - 'account-*': Loads both devices and groups for a specific account
 * 
 * Loading State Management:
 * - `loadedNodes`: Set of node IDs that have been successfully loaded
 * - `loadingNodes`: Set of node IDs currently being loaded
 * - Prevents duplicate loading attempts and provides loading feedback
 * 
 * @param {import('vue').Ref<Set>} loadedNodes - Reactive set of loaded node IDs
 * @param {import('vue').Ref<Set>} loadingNodes - Reactive set of loading node IDs
 * @param {Object} devicesStore - Pinia store for device data management
 * @param {Object} deviceGroupsStore - Pinia store for device group data management
 * @param {Object} alertStore - Pinia store for displaying user notifications
 * @returns {Function} Async function that handles node loading
 * 
 * @example
 * // Setup in a Vue component
 * import { createLoadChildrenHandler } from '@/helpers/tree/tree.loader'
 * import { useDevicesStore, useDeviceGroupsStore, useAlertStore } from '@/stores'
 * 
 * const loadedNodes = ref(new Set())
 * const loadingNodes = ref(new Set())
 * const devicesStore = useDevicesStore()
 * const deviceGroupsStore = useDeviceGroupsStore()
 * const alertStore = useAlertStore()
 * 
 * const loadChildren = createLoadChildrenHandler(
 *   loadedNodes, 
 *   loadingNodes, 
 *   devicesStore, 
 *   deviceGroupsStore, 
 *   alertStore
 * )
 * 
 * // Use with tree component
 * <v-treeview
 *   :load-children="loadChildren"
 *   :items="treeItems"
 * />
 */
export const createLoadChildrenHandler = (
  loadedNodes, 
  loadingNodes, 
  devicesStore, 
  deviceGroupsStore, 
  alertStore
) => {
  return async (item) => {
    const nodeId = item.id
    
    // Prevent duplicate loading - check if already loaded or currently loading
    if (loadedNodes.value.has(nodeId) || loadingNodes.value.has(nodeId)) {
      return
    }
    
    // Mark node as currently loading
    loadingNodes.value.add(nodeId)
    
    try {
      // Load data based on node type
      if (nodeId === 'root-unassigned') {
        // Load devices if not already cached for unassigned devices section
        // This ensures we have the latest device data and can filter unassigned ones
        if (!devicesStore.devices || devicesStore.devices.length === 0) {
          await devicesStore.getAll()
        }
        loadedNodes.value.add(nodeId)
        
      } else if (nodeId.includes('-groups')) {
        // Device groups container node - only load groups if not already loaded
        // Since groups are typically loaded once on component mount, avoid redundant calls
        if (!deviceGroupsStore.groups || deviceGroupsStore.groups.length === 0) {
          await deviceGroupsStore.getAll()
        }
        loadedNodes.value.add(nodeId)
        
      } else if (nodeId.startsWith('account-')) {
        // Account node - only load devices if not already cached
        // This ensures the account node has all its child data available
        if (!devicesStore.devices || devicesStore.devices.length === 0) {
          await devicesStore.getAll()
        }
        loadedNodes.value.add(nodeId)
      }
      
    } catch (error) {
      // Handle loading errors with user-friendly messages
      const errorMessage = `Не удалось загрузить данные для "${item.name}": ` + (error.message || error)
      alertStore.error(errorMessage)
      
      // Note: We don't add to loadedNodes on error, allowing retry attempts
      
    } finally {
      // Always remove from loading state, regardless of success/failure
      loadingNodes.value.delete(nodeId)
    }
  }
}
