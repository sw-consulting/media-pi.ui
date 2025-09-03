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

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAccountsStore } from '@/stores/accounts.store.js'
import { fetchWrapper } from '@/helpers/fetch.wrapper.js'

vi.mock('@/helpers/fetch.wrapper.js', () => {
  return {
    fetchWrapper: {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
      patch: vi.fn()
    }
  }
})

const mockAccounts = [
  { id: 1, name: 'Account 1' },
  { id: 2, name: 'Account 2' }
]

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
})

describe('accounts.store', () => {
  it('getAccountById returns correct account', () => {
    const store = useAccountsStore()
    store.$patch({ accounts: mockAccounts })

    expect(store.getAccountById(1)).toEqual(mockAccounts[0])
    expect(store.getAccountById(999)).toBeUndefined()
  })

  it('add calls fetchWrapper.post', async () => {
    const store = useAccountsStore()
    fetchWrapper.post.mockResolvedValueOnce({})
    await store.add({ name: 'Account 3' })
    expect(fetchWrapper.post).toHaveBeenCalled()
  })

  it('getAll sets accounts from fetch', async () => {
    const store = useAccountsStore()
    fetchWrapper.get.mockResolvedValueOnce(mockAccounts)
    await store.getAll()
    expect(store.accounts).toEqual(mockAccounts)
  })

  it('getById sets account from fetch', async () => {
    const store = useAccountsStore()
    fetchWrapper.get.mockResolvedValueOnce(mockAccounts[0])
    await store.getById(1)
    expect(store.account).toEqual(mockAccounts[0])
  })

  it('update calls fetchWrapper.put', async () => {
    const store = useAccountsStore()
    fetchWrapper.put.mockResolvedValueOnce({})
    await store.update(1, { name: 'Updated' })
    expect(fetchWrapper.put).toHaveBeenCalled()
  })

  it('delete calls fetchWrapper.delete', async () => {
    const store = useAccountsStore()
    fetchWrapper.delete.mockResolvedValueOnce({})
    await store.delete(1)
    expect(fetchWrapper.delete).toHaveBeenCalled()
  })

  it('add throws error and sets error state when fetch fails', async () => {
    const store = useAccountsStore()
    const mockError = new Error('Add failed')
    fetchWrapper.post.mockRejectedValueOnce(mockError)
    await expect(store.add({ name: 'Acc' })).rejects.toThrow('Add failed')
    expect(store.error).toBe(mockError)
    expect(store.loading).toBe(false)
  })

  it('getAll throws error and resets accounts when fetch fails', async () => {
    const store = useAccountsStore()
    const mockError = new Error('GetAll failed')
    fetchWrapper.get.mockRejectedValueOnce(mockError)
    await expect(store.getAll()).rejects.toThrow('GetAll failed')
    expect(store.error).toBe(mockError)
    expect(store.accounts).toEqual([])
    expect(store.loading).toBe(false)
  })

  it('getById throws error and resets account when fetch fails', async () => {
    const store = useAccountsStore()
    const mockError = new Error('GetById failed')
    fetchWrapper.get.mockRejectedValueOnce(mockError)
    await expect(store.getById(1)).rejects.toThrow('GetById failed')
    expect(store.error).toBe(mockError)
    expect(store.account).toBe(null)
    expect(store.loading).toBe(false)
  })

  it('update throws error and sets error state when fetch fails', async () => {
    const store = useAccountsStore()
    const mockError = new Error('Update failed')
    fetchWrapper.put.mockRejectedValueOnce(mockError)
    await expect(store.update(1, { name: 'Fail' })).rejects.toThrow('Update failed')
    expect(store.error).toBe(mockError)
    expect(store.loading).toBe(false)
  })

  it('delete throws error and sets error state when fetch fails', async () => {
    const store = useAccountsStore()
    const mockError = new Error('Delete failed')
    fetchWrapper.delete.mockRejectedValueOnce(mockError)
    await expect(store.delete(1)).rejects.toThrow('Delete failed')
    expect(store.error).toBe(mockError)
    expect(store.loading).toBe(false)
  })

  // Tests for getByManager function
  it('getByManager successfully fetches accounts for a manager', async () => {
    const store = useAccountsStore()
    const managerAccounts = [
      { id: 1, name: 'Manager Account 1' },
      { id: 3, name: 'Manager Account 3' }
    ]
    fetchWrapper.get.mockResolvedValueOnce(managerAccounts)

    await store.getByManager(5)

    expect(fetchWrapper.get).toHaveBeenCalledWith('http://localhost:8087/api/accounts/by-manager/5')
    expect(store.accounts).toEqual(managerAccounts)
    expect(store.error).toBe(null)
    expect(store.loading).toBe(false)
  })

  it('getByManager sets loading state correctly', async () => {
    const store = useAccountsStore()
    const managerAccounts = [{ id: 1, name: 'Account 1' }]
    
    // Mock a slow response to test loading state
    let resolvePromise
    const promise = new Promise((resolve) => {
      resolvePromise = resolve
    })
    fetchWrapper.get.mockReturnValueOnce(promise)

    const getByManagerPromise = store.getByManager(5)
    
    // Check loading state is true during the request
    expect(store.loading).toBe(true)
    
    // Resolve the promise
    resolvePromise(managerAccounts)
    await getByManagerPromise
    
    // Check loading state is false after completion
    expect(store.loading).toBe(false)
  })

  it('getByManager throws error and sets error state when fetch fails', async () => {
    const store = useAccountsStore()
    const mockError = new Error('GetByManager failed')
    fetchWrapper.get.mockRejectedValueOnce(mockError)
    
    await expect(store.getByManager(5)).rejects.toThrow('GetByManager failed')
    expect(store.error).toBe(mockError)
    expect(store.loading).toBe(false)
  })

  it('getByManager handles manager with no accounts', async () => {
    const store = useAccountsStore()
    const emptyAccounts = []
    fetchWrapper.get.mockResolvedValueOnce(emptyAccounts)

    await store.getByManager(10)

    expect(fetchWrapper.get).toHaveBeenCalledWith('http://localhost:8087/api/accounts/by-manager/10')
    expect(store.accounts).toEqual([])
    expect(store.error).toBe(null)
    expect(store.loading).toBe(false)
  })

  it('getByManager resets error state on successful call', async () => {
    const store = useAccountsStore()
    // Set initial error state
    store.error = new Error('Previous error')
    
    const managerAccounts = [{ id: 1, name: 'Account 1' }]
    fetchWrapper.get.mockResolvedValueOnce(managerAccounts)

    await store.getByManager(5)

    expect(store.error).toBe(null)
  })
})

