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

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createAccountActions } from '@/helpers/tree/account.actions.js'
import { getAccountIdFromNodeId } from '@/helpers/tree/id.extraction.helpers.js'

describe('Account Actions Functions', () => {
  describe('createAccountActions', () => {
    let router, alertStore, accountsStore, confirmDelete, actions

    beforeEach(() => {
      router = {
        push: vi.fn()
      }
      alertStore = {
        error: vi.fn()
      }
      accountsStore = {
        accounts: [
          { id: 1, name: 'Account 1' },
          { id: 2, name: 'Account 2' }
        ],
        delete: vi.fn().mockResolvedValue()
      }
      confirmDelete = vi.fn().mockResolvedValue(true)

      actions = createAccountActions(router, alertStore, accountsStore, confirmDelete)
    })

    describe('createAccount', () => {
      it('should navigate to create account page', () => {
        actions.createAccount()
        expect(router.push).toHaveBeenCalledWith('/account/create')
      })

      it('should handle navigation errors', () => {
        const error = new Error('Navigation failed')
        router.push.mockImplementation(() => { throw error })

        actions.createAccount()

        expect(alertStore.error).toHaveBeenCalledWith(
          'Не удалось перейти к созданию лицевого счёта: Navigation failed'
        )
      })
    })

    describe('editAccount', () => {
      it('should navigate to edit account page with object parameter', () => {
        actions.editAccount({ id: 1 })
        expect(router.push).toHaveBeenCalledWith('/account/edit/1')
      })

      it('should navigate to edit account page with primitive parameter', () => {
        actions.editAccount(2)
        expect(router.push).toHaveBeenCalledWith('/account/edit/2')
      })

      it('should handle navigation errors', () => {
        const error = new Error('Navigation failed')
        router.push.mockImplementation(() => { throw error })

        actions.editAccount(1)

        expect(alertStore.error).toHaveBeenCalledWith(
          'Не удалось перейти к редактированию лицевого счёта: Navigation failed'
        )
      })
    })

    describe('deleteAccount', () => {
      it('should delete account after confirmation', async () => {
        await actions.deleteAccount({ id: 1 })

        expect(confirmDelete).toHaveBeenCalledWith('Account 1', 'лицевой счёт')
        expect(accountsStore.delete).toHaveBeenCalledWith(1)
      })

      it('should not delete account if not confirmed', async () => {
        confirmDelete.mockResolvedValue(false)

        await actions.deleteAccount({ id: 1 })

        expect(accountsStore.delete).not.toHaveBeenCalled()
      })

      it('should handle primitive id parameter', async () => {
        await actions.deleteAccount(2)

        expect(confirmDelete).toHaveBeenCalledWith('Account 2', 'лицевой счёт')
        expect(accountsStore.delete).toHaveBeenCalledWith(2)
      })

      it('should handle missing account', async () => {
        await actions.deleteAccount({ id: 999 })

        expect(confirmDelete).not.toHaveBeenCalled()
        expect(accountsStore.delete).not.toHaveBeenCalled()
      })

      it('should handle deletion errors', async () => {
        const error = new Error('Delete failed')
        accountsStore.delete.mockRejectedValue(error)

        await actions.deleteAccount({ id: 1 })

        expect(alertStore.error).toHaveBeenCalledWith(
          'Ошибка при удалении лицевого счёта: Delete failed'
        )
      })
    })
  })

  describe('getAccountIdFromNodeId', () => {
    it('should extract account ID from node ID', () => {
      expect(getAccountIdFromNodeId('account-123')).toBe(123)
      expect(getAccountIdFromNodeId('account-1')).toBe(1)
    })

    it('should return null for non-account node IDs', () => {
      expect(getAccountIdFromNodeId('device-123')).toBe(null)
      expect(getAccountIdFromNodeId('group-456')).toBe(null)
      expect(getAccountIdFromNodeId('root-accounts')).toBe(null)
    })

    it('should handle invalid input', () => {
      expect(getAccountIdFromNodeId('')).toBe(null)
      expect(getAccountIdFromNodeId(null)).toBe(null)
      expect(getAccountIdFromNodeId(undefined)).toBe(null)
    })
  })
})
