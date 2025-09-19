// Copyright (c) 2025 sw.consulting
// This file is a part of Media Pi backend

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useRolesStore } from '@/stores/roles.store.js'
import { fetchWrapper } from '@/helpers/fetch.wrapper.js'

// Mock fetch wrapper
vi.mock('@/helpers/fetch.wrapper.js', () => {
  return {
    fetchWrapper: {
      get: vi.fn()
    }
  }
})

const mockRoles = [
  { id: 1, roleId: 1, name: 'SystemAdministrator' },
  { id: 11, roleId: 11, name: 'AccountManager' },
  { id: 21, roleId: 21, name: 'InstallationEngineer' }
]

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
})

describe('roles.store', () => {
  it('getAll sets roles from fetch', async () => {
    const store = useRolesStore()
    fetchWrapper.get.mockResolvedValueOnce(mockRoles)
    
    await store.getAll()
    
    expect(store.roles).toEqual(mockRoles)
    expect(store.loading).toBe(false)
    expect(store.error).toBe(null)
  })

  it('getName returns correct role name', async () => {
    const store = useRolesStore()
    fetchWrapper.get.mockResolvedValueOnce(mockRoles)
    
    await store.getAll()
    
    expect(store.getName(1)).toBe('SystemAdministrator')
    expect(store.getName(11)).toBe('AccountManager')
    expect(store.getName(999)).toBe('Роль #999') // Fallback for unknown role
  })

  it('ensureLoaded calls getAll only once', async () => {
    const store = useRolesStore()
    fetchWrapper.get.mockResolvedValueOnce(mockRoles)
    
    await store.ensureLoaded()
    await store.ensureLoaded() // Second call should not trigger another fetch
    
    expect(fetchWrapper.get).toHaveBeenCalledTimes(1)
  })

  // Error handling tests
  it('getAll throws error and sets error state when fetch fails', async () => {
    const store = useRolesStore()
    const mockError = new Error('Failed to fetch roles')
    fetchWrapper.get.mockRejectedValueOnce(mockError)
    
    await expect(store.getAll()).rejects.toThrow('Failed to fetch roles')
    expect(store.error).toBe(mockError)
    expect(store.loading).toBe(false)
  })

  it('ensureLoaded throws error when getAll fails', async () => {
    const store = useRolesStore()
    const mockError = new Error('Failed to fetch roles')
    fetchWrapper.get.mockRejectedValueOnce(mockError)
    
    await expect(store.ensureLoaded()).rejects.toThrow('Failed to fetch roles')
    expect(store.error).toBe(mockError)
  })
})

