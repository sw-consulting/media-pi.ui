/**
 * Confirmation Dialog Helper
 * This file is a part of Media Pi frontend application
 * 
 * Provides reusable confirmation dialogs with consistent styling and behavior
 * across the application. Built on top of vuetify-use-dialog for Vue 3/Vuetify 3
 * compatibility.
 * 
 * Features:
 * - Standardized delete confirmations for safety
 * - Generic confirmations for custom actions
 * - Consistent Russian localization
 * - Customizable styling and behavior
 * - Promise-based API for easy async/await usage
 * 
 * @module Confirmation
 * @author Maxim Samsonov
 * @since 2025
 */

import { useConfirm } from 'vuetify-use-dialog'

/**
 * Reusable confirmation dialog composable
 * 
 * Provides consistent confirmation dialogs across the application with
 * standardized styling, localization, and behavior patterns.
 * 
 * @returns {Object} Object containing confirmation dialog functions
 * @returns {Function} confirmDelete - Function for delete confirmations
 * @returns {Function} confirmAction - Function for generic confirmations
 * 
 * @example
 * // In a Vue component
 * const { confirmDelete, confirmAction } = useConfirmation()
 * 
 * // Delete confirmation
 * if (await confirmDelete('Иван Иванов', 'пользователя')) {
 *   // User confirmed deletion
 *   await deleteUser(userId)
 * }
 * 
 * // Generic confirmation
 * if (await confirmAction('Сохранить изменения?')) {
 *   // User confirmed action
 *   await saveChanges()
 * }
 */
export function useConfirmation() {
  const confirm = useConfirm()

  /**
   * Show a delete confirmation dialog
   * 
   * Displays a standardized confirmation dialog specifically for delete operations.
   * Uses warning colors and explicit messaging to prevent accidental deletions.
   * 
   * @param {string} itemName - The name/identifier of the item being deleted
   * @param {string} itemType - The type of item being deleted (e.g., 'пользователя', 'лицевой счёт', 'группу устройств')
   * @param {Object} options - Additional customization options
   * @param {string} options.title - Custom dialog title (default: 'Подтверждение удаления')
   * @param {string} options.confirmationText - Custom confirm button text (default: 'Удалить')
   * @param {string} options.cancellationText - Custom cancel button text (default: 'Отмена')
   * @param {Object} options.dialogProps - Custom dialog properties
   * @param {Object} options.confirmationButtonProps - Custom confirm button properties
   * @returns {Promise<boolean>} Promise that resolves to true if confirmed, false if cancelled
   * 
   * @example
   * // Standard delete confirmation
   * const confirmed = await confirmDelete('Основной счёт', 'лицевой счёт')
   * 
   * // Custom confirmation with options
   * const confirmed = await confirmDelete('Критическая группа', 'группу устройств', {
   *   title: 'ВНИМАНИЕ: Критическое удаление',
   *   confirmationButtonProps: { color: 'red' }
   * })
   */
  const confirmDelete = async (itemName, itemType = 'элемент', options = {}) => {
    // Default styling and behavior for delete operations
    const defaultOptions = {
      title: 'Подтверждение удаления',
      confirmationText: 'Удалить',
      cancellationText: 'Отмена',
      dialogProps: {
        width: '30%',
        minWidth: '250px'
      },
      confirmationButtonProps: {
        color: 'orange-darken-3' // Warning color for destructive actions
      }
    }

    // Merge user options with defaults, preserving nested objects
    const mergedOptions = {
      ...defaultOptions,
      ...options,
      content: `Вы уверены, что хотите удалить ${itemType} "${itemName}"?`,
      dialogProps: {
        ...defaultOptions.dialogProps,
        ...(options.dialogProps || {})
      },
      confirmationButtonProps: {
        ...defaultOptions.confirmationButtonProps,
        ...(options.confirmationButtonProps || {})
      }
    }

    return await confirm(mergedOptions)
  }

  /**
   * Show a generic confirmation dialog
   * 
   * Displays a general-purpose confirmation dialog for non-destructive actions.
   * Uses neutral styling and customizable messaging.
   * 
   * @param {string} message - The confirmation message to display to the user
   * @param {Object} options - Additional customization options
   * @param {string} options.title - Custom dialog title (default: 'Подтверждение')
   * @param {string} options.confirmationText - Custom confirm button text (default: 'Да')
   * @param {string} options.cancellationText - Custom cancel button text (default: 'Нет')
   * @param {Object} options.dialogProps - Custom dialog properties
   * @returns {Promise<boolean>} Promise that resolves to true if confirmed, false if cancelled
   * 
   * @example
   * // Simple yes/no confirmation
   * const shouldSave = await confirmAction('Сохранить изменения перед выходом?')
   * 
   * // Custom confirmation with different button text
   * const shouldProceed = await confirmAction('Продолжить обработку?', {
   *   confirmationText: 'Продолжить',
   *   cancellationText: 'Остановить'
   * })
   */
  const confirmAction = async (message, options = {}) => {
    // Default styling and behavior for general confirmations
    const defaultOptions = {
      title: 'Подтверждение',
      confirmationText: 'Да',
      cancellationText: 'Нет',
      dialogProps: {
        width: '30%',
        minWidth: '250px'
      }
    }

    // Merge user options with defaults
    const mergedOptions = {
      ...defaultOptions,
      ...options,
      content: message,
      dialogProps: {
        ...defaultOptions.dialogProps,
        ...(options.dialogProps || {})
      }
    }

    return await confirm(mergedOptions)
  }

  return {
    confirmDelete,
    confirmAction
  }
}
