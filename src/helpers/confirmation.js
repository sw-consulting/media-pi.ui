// Copyright (c) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
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

import { useConfirm } from 'vuetify-use-dialog'

/**
 * Reusable confirmation dialog composable
 * Provides consistent confirmation dialogs across the application
 */
export function useConfirmation() {
  const confirm = useConfirm()

  /**
   * Show a delete confirmation dialog
   * @param {string} itemName - The name of the item being deleted
   * @param {string} itemType - The type of item (e.g., 'пользователя', 'лицевой счёт')
   * @param {object} options - Additional options for customization
   * @returns {Promise<boolean>} - True if confirmed, false if cancelled
   */
  const confirmDelete = async (itemName, itemType = 'элемент', options = {}) => {
    const defaultOptions = {
      title: 'Подтверждение удаления',
      confirmationText: 'Удалить',
      cancellationText: 'Отмена',
      dialogProps: {
        width: '30%',
        minWidth: '250px'
      },
      confirmationButtonProps: {
        color: 'orange-darken-3'
      }
    }

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
   * @param {string} message - The confirmation message
   * @param {object} options - Additional options for customization
   * @returns {Promise<boolean>} - True if confirmed, false if cancelled
   */
  const confirmAction = async (message, options = {}) => {
    const defaultOptions = {
      title: 'Подтверждение',
      confirmationText: 'Да',
      cancellationText: 'Нет',
      dialogProps: {
        width: '30%',
        minWidth: '250px'
      }
    }

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
