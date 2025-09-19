// Copyright (c) 2025 sw.consulting
// This file is a part of Media Pi backend

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useUsersStore } from '@/stores/users.store.js'
import { fetchWrapper } from '@/helpers/fetch.wrapper.js'

// Mocking the auth store to avoid issues with null user
vi.mock('@/stores/auth.store.js', () => ({
  useAuthStore: vi.fn(() => ({
    user: null,
    logout: vi.fn()
  }))
}))

// Mock fetch wrapper
vi.mock('@/helpers/fetch.wrapper.js', () => {
  return {
    fetchWrapper: {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn()
    }
  }
})

const mockUsers = [
  { id: 1, roles: [1] }, // SystemAdministrator
  { id: 2, roles: [11] }, // AccountManager
  { id: 3, roles: [21] }, // InstallationEngineer
]

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
})

describe('users.store', () => {
  it('getUserById returns correct user', () => {
    const store = useUsersStore()
    
    store.$patch({ 
      users: mockUsers 
    })

    // Test getUserById functionality
    const user = store.getUserById(1)
    expect(user).toEqual(mockUsers[0])
    
    const user2 = store.getUserById(2)
    expect(user2).toEqual(mockUsers[1])
    
    const nonExistentUser = store.getUserById(999)
    expect(nonExistentUser).toBeUndefined()
  })

  it('add calls fetchWrapper.post', async () => {
    const store = useUsersStore()
    fetchWrapper.post.mockResolvedValueOnce({})
    await store.add({ id: 4, roles: [1] })
    expect(fetchWrapper.post).toHaveBeenCalled()
  })

  it('getAll sets users from fetch', async () => {
    const store = useUsersStore()
    fetchWrapper.get.mockResolvedValueOnce(mockUsers)
    await store.getAll()
    expect(store.users).toEqual(mockUsers)
  })

  it('getById sets user from fetch', async () => {
    const store = useUsersStore()
    fetchWrapper.get.mockResolvedValueOnce(mockUsers[0])
    await store.getById(1)
    expect(store.user).toEqual(mockUsers[0])
  })

  it('update calls fetchWrapper.put', async () => {
    const store = useUsersStore()
    fetchWrapper.put.mockResolvedValueOnce({})
    await store.update(1, { roles: [11] })
    expect(fetchWrapper.put).toHaveBeenCalled()
  })

  it('delete calls fetchWrapper.delete', async () => {
    const store = useUsersStore()
    fetchWrapper.delete.mockResolvedValueOnce({})
    await store.delete(1)
    expect(fetchWrapper.delete).toHaveBeenCalled()
  })

  // Error handling tests
  it('add throws error and sets error state when fetch fails', async () => {
    const store = useUsersStore()
    const mockError = new Error('Add failed')
    fetchWrapper.post.mockRejectedValueOnce(mockError)
    
    await expect(store.add({ id: 4, roles: [1] })).rejects.toThrow('Add failed')
    expect(store.error).toBe(mockError)
    expect(store.loading).toBe(false)
  })

  it('getAll throws error and sets error state when fetch fails', async () => {
    const store = useUsersStore()
    const mockError = new Error('GetAll failed')
    fetchWrapper.get.mockRejectedValueOnce(mockError)
    
    await expect(store.getAll()).rejects.toThrow('GetAll failed')
    expect(store.error).toBe(mockError)
    expect(store.users).toEqual([]) // Should be reset to empty array
    expect(store.loading).toBe(false)
  })

  it('getById throws error and sets error state when fetch fails', async () => {
    const store = useUsersStore()
    const mockError = new Error('GetById failed')
    fetchWrapper.get.mockRejectedValueOnce(mockError)
    
    await expect(store.getById(1)).rejects.toThrow('GetById failed')
    expect(store.error).toBe(mockError)
    expect(store.user).toBe(null) // Should be reset to null
    expect(store.loading).toBe(false)
  })

  it('update throws error and sets error state when fetch fails', async () => {
    const store = useUsersStore()
    const mockError = new Error('Update failed')
    fetchWrapper.put.mockRejectedValueOnce(mockError)
    
    await expect(store.update(1, { roles: [11] })).rejects.toThrow('Update failed')
    expect(store.error).toBe(mockError)
    expect(store.loading).toBe(false)
  })

  it('delete throws error and sets error state when fetch fails', async () => {
    const store = useUsersStore()
    const mockError = new Error('Delete failed')
    fetchWrapper.delete.mockRejectedValueOnce(mockError)
    
    await expect(store.delete(1)).rejects.toThrow('Delete failed')
    expect(store.error).toBe(mockError)
    expect(store.loading).toBe(false)
  })
  
  // getByAccount tests
  it('getByAccount fetches users by account and sets users', async () => {
    const store = useUsersStore()
    const mockAccountUsers = [{ id: 10, name: 'UserA' }, { id: 11, name: 'UserB' }]
    fetchWrapper.get.mockResolvedValueOnce(mockAccountUsers)
    await store.getByAccount(123)
    expect(fetchWrapper.get).toHaveBeenCalledWith(expect.stringContaining('/by-account/123'))
    expect(store.users).toEqual(mockAccountUsers)
    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
  })

  it('getByAccount handles error when fetch fails', async () => {
    const store = useUsersStore()
    const error = new Error('Fetch failed')
    fetchWrapper.get.mockRejectedValueOnce(error)
    await expect(store.getByAccount(123)).rejects.toThrow('Fetch failed')
    expect(store.error).toBe(error)
    expect(store.loading).toBe(false)
  })
})

