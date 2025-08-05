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
})
