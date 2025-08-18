/**
 * Accounts Tree Helper Module
 * This file is a part of Media Pi frontend application
 * 
 * Central aggregator and facade for all tree-related functionality in the Media Pi
 * application. This module combines tree building, state management, actions, and
 * utilities into a cohesive API for working with the hierarchical account/device tree.
 * 
 * Architecture:
 * - Modular design with separate files for each concern
 * - Facade pattern providing unified access to all tree functionality
 * - Composable pattern for easy integration with Vue components
 * - Re-exports all individual modules for direct access when needed
 * 
 * Tree Structure:
 * ```
 * Root
 * ├── Accounts
 * │   ├── Account A
 * │   │   ├── Device Groups
 * │   │   └── Devices
 * │   └── Account B
 * └── Unassigned Devices
 *     ├── Device 1
 *     └── Device 2
 * ```
 * 
 * Key Features:
 * - Hierarchical account/device organization
 * - Lazy loading of tree nodes
 * - Context-sensitive actions and permissions
 * - Device assignment and reassignment
 * - Account and device group management
 * 
 * @module AccountsTreeHelpers
 * @author Maxim Samsonov
 * @since 2025
 */

// Core tree building functionality
import {
  getUnassignedDevices,
  getAccountChildren,
  buildTreeItems
} from './tree/tree.builder.js'

// Tree loading and state management
import { createLoadChildrenHandler } from './tree/tree.loader.js'
import { createStateManager } from './tree/tree.state.js'

// Action creators for different node types
import { createAccountActions } from './tree/account.actions.js'
import { createDeviceGroupActions } from './tree/devicegroup.actions.js'
import { createDeviceActions } from './tree/device.actions.js'

// Permission and security helpers
import { createPermissionCheckers } from './tree/tree.permissions.js'

// ID extraction utilities
import { 
  getEntityIdFromNodeId,
  getAccountIdFromNodeId,
  getDeviceIdFromNodeId,
  getGroupIdFromNodeId
} from './tree/id.extraction.helpers.js'

// Device-specific utilities and helpers
import { 
  isTopLevelUnassignedDevice,
  isAccountAssignedDevice,
  isDeviceInUnassignedSection,
  isDeviceInGroupSection,
  createAvailableAccountsList,
  createAvailableDeviceGroupsList
} from './tree/device.item.helpers.js'

// Action-specific utilities
import { getDeviceFromItem } from './tree/device.actions.js'
import { getAccountFromItem } from './tree/account.actions.js'
import { getDeviceGroupFromItem } from './tree/devicegroup.actions.js'

// Assignment and reassignment functionality
import { createAccountAssignmentActions } from './tree/account.assignment.helpers.js'
import { createDeviceGroupAssignmentActions } from './tree/devicegroup.assignment.helpers.js'

// Re-export all functions for direct import access when specific modules are needed
export * from './tree/tree.builder.js'
export * from './tree/tree.loader.js'
export * from './tree/tree.state.js'
export * from './tree/account.actions.js'
export * from './tree/devicegroup.actions.js'
export * from './tree/device.actions.js'
export * from './tree/tree.permissions.js'
export * from './tree/device.item.helpers.js'
export * from './tree/account.assignment.helpers.js'
export * from './tree/devicegroup.assignment.helpers.js'
export * from './tree/id.extraction.helpers.js'

/**
 * Main Accounts Tree Composable
 * 
 * Provides a unified interface to all tree functionality, making it easy to use
 * in Vue components. This composable combines all the tree modules and returns
 * a comprehensive API for tree operations.
 * 
 * Usage Pattern:
 * ```javascript
 * // In a Vue component
 * import { useAccountsTreeHelper } from '@/helpers/accounts.tree.helpers'
 * 
 * export default {
 *   setup() {
 *     const treeHelper = useAccountsTreeHelper()
 *     
 *     // Use any tree functionality
 *     const treeItems = await treeHelper.buildTreeItems()
 *     const loadChildren = treeHelper.createLoadChildrenHandler()
 *     const accountActions = treeHelper.createAccountActions()
 *     
 *     return { treeItems, loadChildren, accountActions }
 *   }
 * }
 * ```
 * 
 * @returns {Object} Complete tree helper API with all functionality
 * 
 * @example
 * // Basic tree setup
 * const { buildTreeItems, createStateManager } = useAccountsTreeHelper()
 * const treeItems = ref(await buildTreeItems())
 * const { expandedItems, selectedItems } = createStateManager()
 * 
 * // Action handling
 * const { createAccountActions, createDeviceActions } = useAccountsTreeHelper()
 * const accountActions = createAccountActions(refreshTree)
 * const deviceActions = createDeviceActions(refreshTree)
 * 
 * // Permission checking
 * const { createPermissionCheckers } = useAccountsTreeHelper()
 * const { canManageAccount, canManageDevice } = createPermissionCheckers()
 */
export function useAccountsTreeHelper() {
  return {
    // Tree Building Functions
    // Core functions for constructing the hierarchical tree structure
    getUnassignedDevices,      // Get all devices not assigned to accounts
    getAccountChildren,        // Get children (devices/groups) for an account
    buildTreeItems,           // Build the complete tree structure
    
    // Tree Loading and State Management
    // Functions for managing tree state and lazy loading
    createLoadChildrenHandler, // Create handler for lazy loading tree nodes
    createStateManager,       // Create reactive state for tree expansion/selection
    
    // Action Creators
    // Factory functions that create context-sensitive action handlers
    createAccountActions,     // Create actions for account nodes (edit, delete, etc.)
    createDeviceGroupActions, // Create actions for device group nodes
    createDeviceActions,      // Create actions for device nodes
    
    // Permission and Security
    // Functions for checking user permissions on tree operations
    createPermissionCheckers, // Create permission checking functions
    
    // Device Item Utilities
    // Helper functions for working with device items in different contexts
    isTopLevelUnassignedDevice,    // Check if device is in top-level unassigned section
    isAccountAssignedDevice,       // Check if device is assigned to an account
    isDeviceInUnassignedSection,   // Check if device is in unassigned section
    isDeviceInGroupSection,        // Check if device is in a group section
    getDeviceFromItem,             // Extract device object from tree item
    getAccountFromItem,            // Extract account object from tree item
    getDeviceGroupFromItem,        // Extract device group object from tree item
    createAvailableAccountsList,   // Create list of accounts for assignment
    createAvailableDeviceGroupsList, // Create list of device groups for assignment
    
    // Assignment and Reassignment Actions
    // Functions for moving devices between accounts and groups
    createAccountAssignmentActions,     // Create actions for assigning devices to accounts
    createDeviceGroupAssignmentActions, // Create actions for assigning devices to groups
    
    // ID Extraction Utilities
    // Helper functions for extracting IDs from various tree contexts
    getEntityIdFromNodeId,         // Generic entity ID extraction with configurable prefix
    getAccountIdFromNodeId,        // Extract account ID from tree node ID
    getGroupIdFromNodeId,          // Extract group ID from tree node ID (handles device node patterns too)
    getDeviceIdFromNodeId          // Extract device ID from tree node ID
  }
}
