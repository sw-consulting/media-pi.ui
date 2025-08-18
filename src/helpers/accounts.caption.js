/**
 * Accounts Caption Helper
 * This file is a part of Media Pi frontend application
 * 
 * Provides role-based captions for the accounts section header.
 * Different user roles see different interpretations of the same data,
 * so the caption reflects what they're actually viewing.
 * 
 * Role-based captions:
 * - Engineers: Only see unassigned devices they can manage
 * - Managers: See devices across accounts they manage
 * - Administrators: See the full accounts and devices hierarchy
 * 
 * @module AccountsCaption
 * @author Maxim Samsonov
 * @since 2025
 */

import { computed } from 'vue'

/**
 * Get the appropriate accounts caption based on user role
 * 
 * Returns a reactive computed value that automatically updates when the user's
 * role changes. The caption helps users understand what they're viewing based
 * on their permissions and role within the system.
 * 
 * @param {Object} authStore - The authentication store instance containing user role information
 * @param {boolean} authStore.isEngineer - Whether the user has engineer role
 * @param {boolean} authStore.isManager - Whether the user has manager role  
 * @param {boolean} authStore.isAdministrator - Whether the user has administrator role
 * @returns {ComputedRef<string|null>} The localized caption for the accounts section or null if no valid role
 * 
 * @example
 * // In a Vue component
 * const authStore = useAuthStore()
 * const accountsCaption = useAccountsCaption(authStore)
 * 
 * // In template
 * <h1>{{ accountsCaption || 'Информация не доступна' }}</h1>
 */
export function useAccountsCaption(authStore) {
  return computed(() => {
    // Engineers only see unassigned devices they can manage
    if (authStore.isEngineer) return 'Нераспределённые устройства'
    
    // Managers see devices across their assigned accounts
    if (authStore.isManager) return 'Устройства'
    
    // Administrators see the full hierarchy of accounts and devices
    if (authStore.isAdministrator) return 'Лицевые счета и устройства'
    
    // No valid role found - should not happen in normal operation
    return null
  })
}
