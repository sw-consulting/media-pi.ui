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

import { computed } from 'vue'

/**
 * Accounts Tree Helper
 * Contains all the logic for building and managing the accounts tree structure
 */
export function useAccountsTreeHelper() {
  
  // ==================== Tree Building Functions ====================
  
  /**
   * Get unassigned devices (devices without accountId)
   */
  const getUnassignedDevices = (devicesStore) => {
    return (devicesStore.devices || [])
      .filter(d => !d.accountId || d.accountId === 0)
      .map(d => ({ id: `device-${d.id}`, name: d.name }))
  }

  /**
   * Get children for a specific account (unassigned devices + device groups)
   */
  const getAccountChildren = (accountId, devicesStore, deviceGroupsStore) => {
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
  const buildTreeItems = (
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
        const hasChildren = !loadedNodes.has(`account-${acc.id}`)
        return {
          id: `account-${acc.id}`,
          name: acc.name,
          children: hasChildren ? [] : getAccountChildrenFn(acc.id, devicesStore, deviceGroupsStore)
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

  // ==================== Loading Functions ====================
  
  /**
   * Handle lazy loading of tree nodes
   */
  const createLoadChildrenHandler = (
    loadedNodes, 
    loadingNodes, 
    devicesStore, 
    deviceGroupsStore, 
    alertStore
  ) => {
    return async (item) => {
      const nodeId = item.id
      
      // Prevent duplicate loading
      if (loadedNodes.value.has(nodeId) || loadingNodes.value.has(nodeId)) {
        return
      }
      
      loadingNodes.value.add(nodeId)
      
      try {
        if (nodeId === 'root-unassigned') {
          // Load devices for unassigned root
          await devicesStore.getAll()
          loadedNodes.value.add(nodeId)
          
        } else if (nodeId.startsWith('account-')) {
          // Load devices and groups for specific account
          await Promise.all([
            devicesStore.getAll(),
            deviceGroupsStore.getAll()
          ])
          loadedNodes.value.add(nodeId)
        }
        
      } catch (error) {
        alertStore.error(`Не удалось загрузить данные для "${item.name}": ` + (error.message || error))
      } finally {
        loadingNodes.value.delete(nodeId)
      }
    }
  }

  // ==================== State Management Functions ====================
  
  /**
   * Create state management functions for tree state
   */
  const createStateManager = (authStore) => {
    const restoreTreeState = (selectedNode, expandedNodes) => {
      const savedState = authStore.getAccountsTreeState
      if (savedState.selectedNode) {
        selectedNode.value = [savedState.selectedNode]
      }
      if (savedState.expandedNodes && savedState.expandedNodes.length > 0) {
        expandedNodes.value = [...savedState.expandedNodes]
      }
    }

    const saveTreeState = (selectedNode, expandedNodes) => {
      const selected = selectedNode.value && selectedNode.value.length > 0 ? selectedNode.value[0] : null
      const expanded = expandedNodes.value || []
      authStore.saveAccountsTreeState(selected, expanded)
    }

    return { restoreTreeState, saveTreeState }
  }

  // ==================== Action Functions ====================
  
  /**
   * Create account action handlers
   */
  const createAccountActions = (router, alertStore, accountsStore, confirmDelete) => {
    const createAccount = () => {
      try {
        router.push('/account/create')
      } catch (error) {
        alertStore.error(`Не удалось перейти к созданию лицевого счёта: ${error.message || error}`)
      }
    }

    const editAccount = (item) => {
      try {
        const accountId = typeof item === 'object' ? item.id : item
        router.push(`/account/edit/${accountId}`)
      } catch (error) {
        alertStore.error(`Не удалось перейти к редактированию лицевого счёта: ${error.message || error}`)
      }
    }

    const deleteAccount = async (item) => {
      const accountId = typeof item === 'object' ? item.id : item
      const account = accountsStore.accounts.find(a => a.id === accountId)
      if (!account) return
      
      const confirmed = await confirmDelete(account.name, 'лицевой счёт')
      
      if (confirmed) {
        try {
          await accountsStore.delete(accountId)
        } catch (error) {
          alertStore.error(`Ошибка при удалении лицевого счёта: ${error.message || error}`)
        }
      }
    }

    return { createAccount, editAccount, deleteAccount }
  }

  // ==================== Utility Functions ====================
  
  /**
   * Extract account ID from tree node ID
   */
  const getAccountIdFromNodeId = (nodeId) => {
    if (nodeId && nodeId.startsWith('account-')) {
      return parseInt(nodeId.replace('account-', ''))
    }
    return null
  }

  /**
   * Create permission checkers
   */
  const createPermissionCheckers = (authStore) => {
    const canViewUnassignedDevices = computed(() => 
      authStore.isAdministrator || authStore.isEngineer
    )

    const canViewAccounts = computed(() => 
      authStore.isAdministrator || authStore.isManager
    )

    const canEditAccounts = computed(() => 
      authStore.isAdministrator || authStore.isManager
    )

    const canCreateDeleteAccounts = computed(() => 
      authStore.isAdministrator
    )

    return {
      canViewUnassignedDevices,
      canViewAccounts,
      canEditAccounts,
      canCreateDeleteAccounts
    }
  }

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
    
    // Utilities
    getAccountIdFromNodeId,
    createPermissionCheckers
  }
}
