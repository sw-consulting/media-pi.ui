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
})
