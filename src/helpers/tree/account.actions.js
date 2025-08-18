/**
 * Account Actions Module
 * This file is a part of Media Pi frontend application
 * 
 * Provides action handlers for account-related operations within the tree interface.
 * This module handles CRUD operations for accounts including navigation to forms,
 * deletion with confirmation, and ID extraction utilities.
 * 
 * Key Features:
 * - Account creation navigation
 * - Account editing navigation with ID extraction
 * - Safe account deletion with user confirmation
 * - Robust error handling with user-friendly messages
 * - ID parsing utilities for tree node identification
 * 
 * Integration:
 * - Works with Vue Router for navigation
 * - Uses Pinia stores for data management
 * - Integrates with confirmation dialogs for safety
 * - Provides consistent error messaging through alert store
 * 
 * @module AccountActions
 * @author Maxim Samsonov
 * @since 2025
 */

/**
 * Creates account action handlers for tree operations
 * 
 * Factory function that creates a set of action handlers for account operations.
 * These handlers are designed to be used in tree context menus, buttons, and
 * other UI elements that need to perform account-related actions.
 * 
 * @param {Object} router - Vue Router instance for navigation
 * @param {Object} alertStore - Pinia store for displaying user notifications
 * @param {Object} accountsStore - Pinia store for account data management
 * @param {Function} confirmDelete - Function for displaying deletion confirmations
 * @returns {Object} Object containing createAccount, editAccount, and deleteAccount handlers
 * 
 * @example
 * // Setup in a Vue component
 * import { createAccountActions } from '@/helpers/tree/account.actions'
 * import { useRouter } from 'vue-router'
 * import { useAlertStore, useAccountsStore } from '@/stores'
 * import { confirmDelete } from '@/helpers/confirmation'
 * 
 * const router = useRouter()
 * const alertStore = useAlertStore()
 * const accountsStore = useAccountsStore()
 * 
 * const { createAccount, editAccount, deleteAccount } = createAccountActions(
 *   router, alertStore, accountsStore, confirmDelete
 * )
 * 
 * // Use in context menu
 * const contextMenuItems = [
 *   { title: 'Создать', action: createAccount },
 *   { title: 'Редактировать', action: () => editAccount(selectedAccount) },
 *   { title: 'Удалить', action: () => deleteAccount(selectedAccount) }
 * ]
 */
export const createAccountActions = (router, alertStore, accountsStore, confirmDelete) => {
  /**
   * Navigates to the account creation form
   * 
   * Redirects the user to the account creation page where they can
   * input details for a new account. Handles navigation errors gracefully
   * with user-friendly error messages.
   * 
   * @example
   * // In a toolbar button
   * <v-btn @click="createAccount">
   *   Создать лицевой счёт
   * </v-btn>
   * 
   * // In a context menu
   * const menuItems = [
   *   { title: 'Создать новый счёт', action: createAccount }
   * ]
   */
  const createAccount = () => {
    try {
      router.push('/account/create')
    } catch (error) {
      alertStore.error(`Не удалось перейти к созданию лицевого счёта: ${error.message || error}`)
    }
  }

  /**
   * Navigates to the account editing form
   * 
   * Redirects the user to the account editing page for the specified account.
   * Accepts either an account object or an account ID as parameter.
   * Extracts the account ID appropriately and handles navigation errors.
   * 
   * @param {Object|number} item - Account object with id property or account ID number
   * 
   * @example
   * // With account object
   * editAccount({ id: 123, name: 'Company A' })
   * 
   * // With account ID
   * editAccount(123)
   * 
   * // In a tree context menu
   * const handleEdit = () => editAccount(selectedTreeItem)
   */
  const editAccount = (item) => {
    try {
      // Handle both object and primitive ID parameters
      const accountId = typeof item === 'object' ? item.id : item
      router.push(`/account/edit/${accountId}`)
    } catch (error) {
      alertStore.error(`Не удалось перейти к редактированию лицевого счёта: ${error.message || error}`)
    }
  }

  /**
   * Deletes an account with user confirmation
   * 
   * Performs a safe account deletion process that includes:
   * 1. Finding the account in the store to get its name
   * 2. Showing a confirmation dialog with the account name
   * 3. Executing the deletion if confirmed
   * 4. Handling any errors that occur during deletion
   * 
   * @param {Object|number} item - Account object with id property or account ID number
   * 
   * @example
   * // Delete from context menu
   * const handleDelete = async () => {
   *   await deleteAccount(selectedAccount)
   * }
   * 
   * // Delete with confirmation
   * const confirmAndDelete = async (account) => {
   *   await deleteAccount(account.id)
   * }
   */
  const deleteAccount = async (item) => {
    // Extract account ID from parameter
    const accountId = typeof item === 'object' ? item.id : item
    
    // Find the account in the store to get display information
    const account = accountsStore.accounts.find(a => a.id === accountId)
    if (!account) return // Account not found, nothing to delete
    
    // Show confirmation dialog with account name for safety
    const confirmed = await confirmDelete(account.name, 'лицевой счёт')
    
    if (confirmed) {
      try {
        // Execute the deletion through the store
        await accountsStore.delete(accountId)
        // Success feedback is typically handled by the store or calling component
      } catch (error) {
        // Show user-friendly error message
        alertStore.error(`Ошибка при удалении лицевого счёта: ${error.message || error}`)
      }
    }
  }

  return { createAccount, editAccount, deleteAccount }
}

/**
 * Extracts account ID from tree node ID
 * 
 * Utility function that parses tree node IDs to extract the underlying
 * account ID. Tree nodes use prefixed IDs like "account-123" for uniqueness,
 * and this function extracts the numeric ID portion.
 * 
 * @param {string} nodeId - Tree node ID in format "account-{id}"
 * @returns {number|null} Account ID as number, or null if parsing fails
 * 
 * @example
 * // Extract account ID from tree node
 * const accountId = getAccountIdFromNodeId('account-123') // Returns: 123
 * const invalid = getAccountIdFromNodeId('device-456')    // Returns: null
 * const missing = getAccountIdFromNodeId(null)           // Returns: null
 * 
 * // Use in tree action handlers
 * const handleAccountAction = (treeNode) => {
 *   const accountId = getAccountIdFromNodeId(treeNode.id)
 *   if (accountId) {
 *     performAccountAction(accountId)
 *   }
 * }
 */
export const getAccountIdFromNodeId = (nodeId) => {
  if (!nodeId || typeof nodeId !== 'string') return null
  
  // Match pattern "account-{digits}"
  const match = nodeId.match(/^account-(\d+)$/)
  return match ? parseInt(match[1], 10) : null
}
