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

// Import all tree functionality from modular files
import {
  getUnassignedDevices,
  getAccountChildren,
  buildTreeItems
} from './tree/tree.builder.js'

import { createLoadChildrenHandler } from './tree/tree.loader.js'
import { createStateManager } from './tree/tree.state.js'
import { createAccountActions, getAccountIdFromNodeId } from './tree/account.actions.js'
import { createDeviceGroupActions, getGroupIdFromNodeId } from './tree/devicegroup.actions.js'
import { createPermissionCheckers } from './tree/tree.permissions.js'

// Re-export all functions for direct import access
export * from './tree/tree.builder.js'
export * from './tree/tree.loader.js'
export * from './tree/tree.state.js'
export * from './tree/account.actions.js'
export * from './tree/devicegroup.actions.js'
export * from './tree/tree.permissions.js'

/**
 * Main Accounts Tree Helper
 * Combines all tree functionality into a single composable
 */
export function useAccountsTreeHelper() {
  return {
    // Tree building
    getUnassignedDevices,
    getAccountChildren,
    buildTreeItems,
    
    // Loading
    createLoadChildrenHandler,
    
    // State management
    createStateManager,
    
    // Actions
    createAccountActions,
    createDeviceGroupActions,
    
    // Utilities
    getAccountIdFromNodeId,
    getGroupIdFromNodeId,
    createPermissionCheckers
  }
}
