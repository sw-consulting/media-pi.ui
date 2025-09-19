// Copyright (c) 2025 sw.consulting
// This file is a part of Media Pi backend

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createAccountActions, getAccountFromItem } from '@/helpers/tree/account.actions.js'
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

  describe('getAccountFromItem', () => {
    let mockAccountsStore

    beforeEach(() => {
      mockAccountsStore = {
        accounts: [
          { id: 123, name: 'Account 1' },
          { id: 456, name: 'Account 2' }
        ],
        getAccountById(id) {
          return this.accounts.find(account => account.id === id)
        }
      }
    })

    it('should return account object for valid account item', () => {
      const item = { id: 'account-123' }
      const result = getAccountFromItem(item, mockAccountsStore)
      expect(result).toEqual({ id: 123, name: 'Account 1' })
    })

    it('should return account object for account with context', () => {
      const item = { id: 'account-456-groups' }
      const result = getAccountFromItem(item, mockAccountsStore)
      expect(result).toEqual({ id: 456, name: 'Account 2' })
    })

    it('should return empty object for non-account item', () => {
      const item = { id: 'device-123' }
      const result = getAccountFromItem(item, mockAccountsStore)
      expect(result).toEqual({})
    })

    it('should return empty object for account not found in store', () => {
      const item = { id: 'account-999' }
      const result = getAccountFromItem(item, mockAccountsStore)
      expect(result).toEqual({})
    })

    it('should return empty object for null item', () => {
      const result = getAccountFromItem(null, mockAccountsStore)
      expect(result).toEqual({})
    })
  })
})

