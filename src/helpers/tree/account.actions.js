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

/**
 * Account Action Functions
 * Handles CRUD operations for accounts
 */

/**
 * Create account action handlers
 */
export const createAccountActions = (router, alertStore, accountsStore, confirmDelete) => {
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

/**
 * Extract account ID from node ID (e.g., "account-123" -> 123)
 */
export const getAccountIdFromNodeId = (nodeId) => {
  if (!nodeId || typeof nodeId !== 'string') return null
  const match = nodeId.match(/^account-(\d+)$/)
  return match ? parseInt(match[1], 10) : null
}
