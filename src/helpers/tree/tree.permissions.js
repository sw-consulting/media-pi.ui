/**
 * Tree Permissions Module
 * This file is a part of Media Pi frontend application
 * 
 * Handles user permission evaluation for tree operations and visibility.
 * This module provides reactive permission checkers that determine what
 * parts of the tree interface users can see and interact with based on
 * their assigned roles.
 * 
 * Permission Model:
 * - System Administrators: Full access to all tree operations
 * - Account Managers: Can view and edit accounts, but not create/delete them
 * - Installation Engineers: Can view and work with unassigned devices
 * - Users without roles: No tree access
 * 
 * Reactive Design:
 * - All permission checks are reactive computed properties
 * - Automatically update when user role or authentication status changes
 * - Enable/disable UI elements based on real-time permission evaluation
 * 
 * @module TreePermissions
 * @author Maxim Samsonov
 * @since 2025
 */

import { computed } from 'vue'

/**
 * Creates reactive permission checkers for tree operations
 * 
 * Factory function that creates a set of reactive computed properties
 * for checking user permissions. These permission checkers automatically
 * update when the user's authentication status or roles change.
 * 
 * @param {Object} authStore - Authentication store containing user role information
 * @returns {Object} Object containing reactive permission checker functions
 * 
 * @example
 * // Setup in a Vue component
 * import { createPermissionCheckers } from '@/helpers/tree/tree.permissions'
 * import { useAuthStore } from '@/stores/auth.store'
 * 
 * const authStore = useAuthStore()
 * const {
 *   canViewUnassignedDevices,
 *   canViewAccounts,
 *   canEditAccounts,
 *   canCreateDeleteAccounts
 * } = createPermissionCheckers(authStore)
 * 
 * // Use in template
 * <div v-if="canViewAccounts">
 *   <AccountsTree />
 * </div>
 * 
 * // Use in computed properties
 * const treeItems = computed(() => {
 *   return buildTreeItems(
 *     canViewUnassignedDevices.value,
 *     canViewAccounts.value,
 *     // ... other parameters
 *   )
 * })
 */
export const createPermissionCheckers = (authStore) => {
  /**
   * Determines if user can view unassigned devices section
   * 
   * Unassigned devices are global devices not assigned to any account.
   * Only administrators and engineers have access to manage these devices
   * as part of the device installation and assignment workflow.
   * 
   * @type {import('vue').ComputedRef<boolean>}
   * 
   * @example
   * // Show unassigned devices section in tree
   * <TreeSection v-if="canViewUnassignedDevices">
   *   <UnassignedDevices />
   * </TreeSection>
   * 
   * // Enable device assignment actions
   * const showAssignActions = computed(() => 
   *   canViewUnassignedDevices.value && selectedDevice.value
   * )
   */
  const canViewUnassignedDevices = computed(() => 
    authStore.isAdministrator || authStore.isEngineer
  )

  /**
   * Determines if user can view accounts section
   * 
   * Accounts section contains all customer accounts and their associated
   * devices and groups. Administrators and managers can view accounts,
   * with managers typically seeing only their assigned accounts.
   * 
   * @type {import('vue').ComputedRef<boolean>}
   * 
   * @example
   * // Show accounts section in tree
   * <TreeSection v-if="canViewAccounts">
   *   <AccountsTree />
   * </TreeSection>
   * 
   * // Filter navigation options
   * const navigationItems = computed(() => {
   *   const items = []
   *   if (canViewAccounts.value) {
   *     items.push({ title: 'Лицевые счета', route: '/accounts' })
   *   }
   *   return items
   * })
   */
  const canViewAccounts = computed(() => 
    authStore.isAdministrator || authStore.isManager
  )

  /**
   * Determines if user can edit account information
   * 
   * Account editing includes modifying account details, managing account
   * settings, and performing account-level operations. Both administrators
   * and managers can edit accounts, with managers limited to their assigned accounts.
   * 
   * @type {import('vue').ComputedRef<boolean>}
   * 
   * @example
   * // Show edit button in account context menu
   * <ContextMenuItem 
   *   v-if="canEditAccounts" 
   *   @click="editAccount"
   * >
   *   Редактировать
   * </ContextMenuItem>
   * 
   * // Enable account form fields
   * const isReadOnly = computed(() => !canEditAccounts.value)
   */
  const canEditAccounts = computed(() => 
    authStore.isAdministrator || authStore.isManager
  )

  /**
   * Determines if user can create or delete accounts
   * 
   * Account creation and deletion are high-privilege operations that
   * can significantly impact the system structure. Only system administrators
   * are allowed to perform these operations.
   * 
   * @type {import('vue').ComputedRef<boolean>}
   * 
   * @example
   * // Show create account button
   * <v-btn 
   *   v-if="canCreateDeleteAccounts" 
   *   @click="createAccount"
   * >
   *   Создать лицевой счёт
   * </v-btn>
   * 
   * // Show delete option in context menu
   * <ContextMenuItem 
   *   v-if="canCreateDeleteAccounts"
   *   @click="deleteAccount"
   *   color="error"
   * >
   *   Удалить
   * </ContextMenuItem>
   */
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
