/**
 * User Role and Permission Helper Functions
 * This file is a part of Media Pi frontend application
 * 
 * Provides utilities for user role management, permission checking, and access control
 * throughout the Media Pi application. This module centralizes the business logic
 * for determining what actions users can perform based on their roles and assignments.
 * 
 * Role Hierarchy:
 * - System Administrator (ID: 1): Full access to all accounts and devices
 * - Account Manager (ID: 11): Access to assigned accounts and their devices
 * - Installation Engineer (ID: 21): Access to unassigned devices and assigned accounts
 * 
 * Permission Model:
 * - Administrators have global access
 * - Managers have scoped access to their assigned accounts
 * - Engineers have access to unassigned devices and can work within assigned accounts
 * - Users without roles have minimal access (profile editing only)
 * 
 * @module UserHelpers
 * @author Maxim Samsonov
 * @since 2025
 */

import { useRolesStore } from '@/stores/roles.store.js'

/**
 * System role constants defining the role hierarchy
 * 
 * These constants match the backend role definitions and should be kept
 * in sync with server-side role management. The numeric values determine
 * the role hierarchy for permission calculations.
 * 
 * @type {Object}
 * @readonly
 * 
 * @example
 * // Check if user has administrator role
 * if (user.roles.includes(UserRoleConstants.SystemAdministrator)) {
 *   // Grant admin access
 * }
 */
export const UserRoleConstants = {
  SystemAdministrator: 1,     // Highest privilege level
  AccountManager: 11,         // Account-scoped privileges
  InstallationEngineer: 21    // Device and installation privileges
}

/**
 * Checks if a user has System Administrator privileges
 * 
 * System Administrators have the highest level of access and can perform
 * any operation in the system including user management, global settings,
 * and access to all accounts and devices.
 * 
 * @param {Object} user - User object with roles array
 * @returns {boolean} True if user is a System Administrator
 * 
 * @example
 * // Check before allowing user management
 * if (isAdministrator(currentUser)) {
 *   showUserManagementPanel()
 * }
 * 
 * // In a component guard
 * const canAccessAdminPanel = computed(() => isAdministrator(authStore.user))
 */
export function isAdministrator(user) {
  return user && Array.isArray(user.roles) && user.roles.includes(UserRoleConstants.SystemAdministrator)
}

/**
 * Checks if a user has Account Manager privileges
 * 
 * Account Managers have access to specific accounts assigned to them.
 * They can manage users, devices, and settings within their assigned accounts
 * but cannot access global system settings or other accounts.
 * 
 * @param {Object} user - User object with roles array
 * @returns {boolean} True if user is an Account Manager
 * 
 * @example
 * // Check before showing account-specific features
 * if (isManager(currentUser)) {
 *   showAccountManagementTools()
 * }
 * 
 * // Filter available accounts based on role
 * const accessibleAccounts = computed(() => {
 *   if (isManager(user)) return user.accountIds
 *   return []
 * })
 */
export function isManager(user) {
  return user && Array.isArray(user.roles) && user.roles.includes(UserRoleConstants.AccountManager)
}

/**
 * Checks if a user has Installation Engineer privileges
 * 
 * Installation Engineers can work with devices and installations.
 * They have access to unassigned devices and can work within accounts
 * they're assigned to, but cannot manage user accounts or global settings.
 * 
 * @param {Object} user - User object with roles array
 * @returns {boolean} True if user is an Installation Engineer
 * 
 * @example
 * // Show device installation tools
 * if (isEngineer(currentUser)) {
 *   showDeviceInstallationPanel()
 * }
 * 
 * // Check device access permissions
 * const canInstallDevice = computed(() => 
 *   isEngineer(user) || isAdministrator(user)
 * )
 */
export function isEngineer(user) {
  return user && Array.isArray(user.roles) && user.roles.includes(UserRoleConstants.InstallationEngineer)
}

/**
 * Gets the display name for a user's primary role
 * 
 * Returns the localized name of the user's highest-priority role (lowest numeric ID).
 * If the user has multiple roles, returns the name of the most privileged one.
 * Uses the roles store to get current role definitions.
 * 
 * @param {Object} user - User object with roles array
 * @returns {string} Localized role name or "Без роли" if no roles
 * 
 * @example
 * // Display user role in a table
 * <td>{{ getRoleName(user) }}</td>
 * 
 * // Show role-based welcome message
 * const welcomeMessage = computed(() => 
 *   `Добро пожаловать, ${getRoleName(currentUser)}`
 * )
 */
export function getRoleName(user) {
  if (user && Array.isArray(user.roles) && user.roles.length > 0) {
    // Find the role with minimal roleId (highest priority)
    const minRoleId = Math.min(...user.roles)
    
    // Retrieve role name from the roles store
    const rolesStore = useRolesStore()
    return rolesStore.getNameByRoleId(minRoleId)
  }
  return 'Без роли'  // Russian: "No role"
}

/**
 * Checks if a user can manage a specific account by ID
 * 
 * Determines access permissions based on role and account assignments:
 * - System Administrators can manage any account
 * - Account Managers can manage accounts in their accountIds array
 * - Other roles cannot manage accounts
 * 
 * @param {Object} user - User object with roles and accountIds
 * @param {number} accountId - ID of the account to check access for
 * @returns {boolean} True if user can manage the specified account
 * 
 * @example
 * // Check before allowing account editing
 * if (canManageAccountById(currentUser, account.id)) {
 *   showAccountEditButton()
 * }
 * 
 * // Filter accounts list based on permissions
 * const manageableAccounts = accounts.filter(account => 
 *   canManageAccountById(currentUser, account.id)
 * )
 */
export function canManageAccountById(user, accountId) {
  if (!user || !accountId) {
    return false
  }
  
  // System Administrators can manage any account
  if (isAdministrator(user)) {
    return true
  }
  
  // Account Managers can manage accounts they're assigned to
  return !!(isManager(user) && user.accountIds && Array.isArray(user.accountIds) && user.accountIds.includes(accountId))
}

/**
 * Checks if a user can manage a specific device
 * 
 * Device management permissions depend on the device's account assignment:
 * - Unassigned devices: Only Administrators and Engineers can manage
 * - Assigned devices: Use account-based permissions (canManageAccountById)
 * 
 * This enables the workflow where Engineers install devices (unassigned)
 * and then assign them to accounts that Managers can then control.
 * 
 * @param {Object} user - User object with roles and accountIds
 * @param {Object} device - Device object with optional accountId
 * @returns {boolean} True if user can manage the specified device
 * 
 * @example
 * // Show device actions based on permissions
 * if (canManageDevice(currentUser, device)) {
 *   showDeviceEditButton()
 * }
 * 
 * // Filter device list for current user
 * const accessibleDevices = devices.filter(device => 
 *   canManageDevice(currentUser, device)
 * )
 * 
 * // Check before device assignment
 * if (canManageDevice(engineer, unassignedDevice)) {
 *   allowDeviceAssignment()
 * }
 */
export function canManageDevice(user, device) {
  if (!user || !device) {
    return false
  }
  
  // Unassigned devices can be managed by Administrators and Engineers
  if (!device.accountId) {
    return isAdministrator(user) || isEngineer(user)
  }
  
  // Assigned devices use account-based permission checking
  return canManageAccountById(user, device.accountId)
}


