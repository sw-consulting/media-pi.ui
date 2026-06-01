// Copyright (c) 2025 sw.consulting
// This file is a part of Media Pi  frontend application

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

  it('getSubscriptions loads account subscriptions', async () => {
    const store = useAccountsStore()
    const payload = {
      subscriptions: [{ categoryId: 7, categoryTitle: 'Paid' }],
      availableCategories: [{ id: 8, title: 'Other' }]
    }
    fetchWrapper.get.mockResolvedValueOnce(payload)

    const result = await store.getSubscriptions(1)

    expect(fetchWrapper.get).toHaveBeenCalledWith('http://localhost:8080/api/accounts/1/subscriptions')
    expect(result).toEqual(payload)
    expect(store.subscriptions).toEqual(payload)
  })

  it('upsertSubscription puts account category subscription and refreshes', async () => {
    const store = useAccountsStore()
    const refreshed = { subscriptions: [], availableCategories: [] }
    fetchWrapper.put.mockResolvedValueOnce({})
    fetchWrapper.get.mockResolvedValueOnce(refreshed)

    const result = await store.upsertSubscription(1, 7, { startDate: '2026-06-01', endDate: '2026-06-30' })

    expect(fetchWrapper.put).toHaveBeenCalledWith(
      'http://localhost:8080/api/accounts/1/subscriptions/7',
      { startDate: '2026-06-01', endDate: '2026-06-30' }
    )
    expect(result).toEqual(refreshed)
  })

  it('deleteSubscription deletes account category subscription and refreshes', async () => {
    const store = useAccountsStore()
    const refreshed = { subscriptions: [], availableCategories: [] }
    fetchWrapper.delete.mockResolvedValueOnce({})
    fetchWrapper.get.mockResolvedValueOnce(refreshed)

    const result = await store.deleteSubscription(1, 7, { forcePlaylistCleanup: true })

    expect(fetchWrapper.delete).toHaveBeenCalledWith(
      'http://localhost:8080/api/accounts/1/subscriptions/7',
      { forcePlaylistCleanup: true }
    )
    expect(result).toEqual(refreshed)
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

    expect(fetchWrapper.get).toHaveBeenCalledWith('http://localhost:8080/api/accounts/by-manager/5')
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

    expect(fetchWrapper.get).toHaveBeenCalledWith('http://localhost:8080/api/accounts/by-manager/10')
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

  it('getSubscriptions throws error and resets subscriptions when fetch fails', async () => {
    const store = useAccountsStore()
    const mockError = new Error('GetSubscriptions failed')
    fetchWrapper.get.mockRejectedValueOnce(mockError)

    await expect(store.getSubscriptions(1)).rejects.toThrow('GetSubscriptions failed')
    expect(store.error).toBe(mockError)
    expect(store.subscriptions).toEqual({ subscriptions: [], availableCategories: [] })
    expect(store.loading).toBe(false)
  })

  it('upsertSubscription throws error and sets error state when put fails', async () => {
    const store = useAccountsStore()
    const mockError = new Error('UpsertSubscription failed')
    fetchWrapper.put.mockRejectedValueOnce(mockError)

    await expect(store.upsertSubscription(1, 7, { startDate: '2026-06-01' })).rejects.toThrow('UpsertSubscription failed')
    expect(store.error).toBe(mockError)
    expect(store.loading).toBe(false)
  })

  it('deleteSubscription throws error and sets error state when delete fails', async () => {
    const store = useAccountsStore()
    const mockError = new Error('DeleteSubscription failed')
    fetchWrapper.delete.mockRejectedValueOnce(mockError)

    await expect(store.deleteSubscription(1, 7)).rejects.toThrow('DeleteSubscription failed')
    expect(store.error).toBe(mockError)
    expect(store.loading).toBe(false)
  })
})

describe('accounts.store - additional coverage', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('getAccountById returns null when accounts is not an array', () => {
    const store = useAccountsStore()
    store.$patch({ accounts: {} })

    expect(store.getAccountById(1)).toBeNull()
  })

  it('getSubscriptions stores fallback when fetch returns null', async () => {
    const store = useAccountsStore()
    fetchWrapper.get.mockResolvedValueOnce(null)

    const result = await store.getSubscriptions(1)

    expect(result).toEqual({ subscriptions: [], availableCategories: [] })
    expect(store.subscriptions).toEqual({ subscriptions: [], availableCategories: [] })
  })
})

