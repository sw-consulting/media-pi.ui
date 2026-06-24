// Copyright (c) 2025 sw.consulting
// This file is a part of Media Pi  frontend application

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { nextTick } from 'vue'
import { useAuthStore } from '@/stores/auth.store.js'
import { useStatusStore } from '@/stores/status.store.js'
import { fetchWrapper } from '@/helpers/fetch.wrapper.js'
import router from '@/router'
import createLocalStorageMock from './__mocks__/localStorage.js'

vi.mock('@/helpers/fetch.wrapper.js', () => ({
  fetchWrapper: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn()
  }
}))

vi.mock('@/router', () => ({
  default: {
    push: vi.fn()
  }
}))

// Mock the status store
vi.mock('@/stores/status.store.js', () => {
  const fetchStatusMock = vi.fn().mockResolvedValue({})
  return {
    useStatusStore: vi.fn(() => ({
      fetchStatus: fetchStatusMock
    }))
  }
})

const listStateStorageKey = 'authListState'

function createDefaultListState() {
  return {
    users_per_page: 10,
    users_search: '',
    users_sort_by: ['id'],
    users_page: 1,
    videos_per_page: 10,
    videos_search: '',
    videos_sort_by: [],
    videos_page: 1,
    screenshots_per_page: 100,
    screenshots_sort_by: [{ key: 'id', order: 'asc' }],
    screenshots_page: 1,
    playlists_per_page: 10,
    playlists_search: '',
    playlists_sort_by: [],
    playlists_page: 1,
    playlist_available_videos_per_page: 10,
    playlist_available_videos_page: 1,
    categories_per_page: 10,
    categories_search: '',
    categories_sort_by: [],
    categories_page: 1,
    subscriptions_per_page: 10,
    subscriptions_search: '',
    subscriptions_sort_by: [],
    subscriptions_page: 1
  }
}

function createListState(overrides = {}) {
  return {
    ...createDefaultListState(),
    ...overrides
  }
}

function expectListState(store, expected) {
  Object.entries(expected).forEach(([key, value]) => {
    expect(store[key]).toEqual(value)
  })
}

function readPersistedListStates() {
  return JSON.parse(localStorage.getItem(listStateStorageKey) || '{}')
}

async function waitForListStatePersistence() {
  await nextTick()
  await Promise.resolve()
}

describe('auth store', () => {
  // Store original localStorage
  const originalLocalStorage = global.localStorage
  
  beforeEach(() => {
    // Set up localStorage mock before each test
    global.localStorage = createLocalStorageMock()
    setActivePinia(createPinia())
    vi.clearAllMocks()
    router.push.mockReset()
    localStorage.clear()
  })
  
  afterEach(() => {
    // Restore original localStorage after each test
    global.localStorage = originalLocalStorage
  })

  describe('state', () => {
    it('initializes with default values', () => {
      const store = useAuthStore()
      expect(store.user).toBeNull()
      // isAdmin should be falsy when there's no user
      expect(store.users_per_page).toBe(10)
      expect(store.users_search).toBe('')
      expect(store.users_sort_by).toEqual(['id'])
      expect(store.users_page).toBe(1)
      expect(store.videos_per_page).toBe(10)
      expect(store.videos_search).toBe('')
      expect(store.videos_sort_by).toEqual([])
      expect(store.videos_page).toBe(1)
      expect(store.screenshots_per_page).toBe(100)
      expect(store.screenshots_sort_by).toEqual([{ key: 'id', order: 'asc' }])
      expect(store.screenshots_page).toBe(1)
      expect(store.playlists_per_page).toBe(10)
      expect(store.playlists_search).toBe('')
      expect(store.playlists_sort_by).toEqual([])
      expect(store.playlists_page).toBe(1)
      expect(store.playlist_available_videos_per_page).toBe(10)
      expect(store.playlist_available_videos_page).toBe(1)
      expect(store.categories_per_page).toBe(10)
      expect(store.categories_search).toBe('')
      expect(store.categories_sort_by).toEqual([])
      expect(store.categories_page).toBe(1)
      expect(store.subscriptions_per_page).toBe(10)
      expect(store.subscriptions_search).toBe('')
      expect(store.subscriptions_sort_by).toEqual([])
      expect(store.subscriptions_page).toBe(1)
      expect(store.returnUrl).toBeNull()
      expect(store.re_jwt).toBeNull()
      expect(store.re_tgt).toBeNull()
    })

    it('loads user from localStorage if present', () => {
      const testUser = { id: 1, name: 'Test User', roles: [1] }
      localStorage.setItem('user', JSON.stringify(testUser))
      const parseSpy = vi.spyOn(JSON, 'parse').mockImplementation(() => testUser)
      
      const store = useAuthStore()
      expect(store.user).toEqual(testUser)
      expect(store.isAdministrator).toBe(true)
      expect(store.isManager).toBeFalsy()
      expect(store.isEngineer).toBeFalsy()
      parseSpy.mockRestore()
    })

    it('correctly identifies admin users', () => {
      const store = useAuthStore()
      store.logout()

      store.user = { id: 1, roles: [1] }
      expect(store.isAdministrator).toBe(true)

      store.user = { id: 2, roles: [11] }
      expect(store.isAdministrator).toBeFalsy()

      store.user = { id: 3, roles: [1, 11] }
      expect(store.isAdministrator).toBe(true)
    })

    it('correctly identifies manager users', () => {
      const store = useAuthStore()
      store.user = { id: 1, roles: [11] }
      expect(store.isManager).toBe(true)

      store.user = { id: 2, roles: [21] }
      expect(store.isManager).toBe(false)

      store.user  = { id: 3, roles: [11, 21] }
      expect(store.isManager).toBe(true)
    })

   it('correctly identifies engineer users', () => {
      const store = useAuthStore()
      store.user = { id: 1, roles: [21] }
      expect(store.isEngineer).toBe(true)

      store.user = { id: 2, roles: [1] }
      expect(store.isEngineer).toBe(false)

      store.user  = { id: 3, roles: [1, 21] }
      expect(store.isEngineer).toBe(true)
    })

    it('handles register view parameters correctly', () => {
      const store = useAuthStore()
      
      // Test setting re_jwt and re_tgt for registration
      store.re_jwt = 'registration-jwt-token'
      store.re_tgt = 'register'
      
      expect(store.re_jwt).toBe('registration-jwt-token')
      expect(store.re_tgt).toBe('register')
    })

    it('handles password recovery parameters correctly', () => {
      const store = useAuthStore()
      
      // Test setting re_jwt and re_tgt for password recovery
      store.re_jwt = 'recovery-jwt-token'
      store.re_tgt = 'recover'
      
      expect(store.re_jwt).toBe('recovery-jwt-token')
      expect(store.re_tgt).toBe('recover')
    })
  })

  describe('list state persistence', () => {
    it('loads persisted list params for saved user', () => {
      const testUser = { id: 7, name: 'Saved User', roles: [1] }
      const savedState = createListState({
        users_per_page: 25,
        users_search: 'ivan',
        users_sort_by: [{ key: 'email', order: 'desc' }],
        users_page: 3,
        videos_per_page: 50,
        videos_search: 'clip',
        videos_sort_by: [{ key: 'title', order: 'asc' }],
        videos_page: 4,
        screenshots_per_page: 25,
        screenshots_sort_by: [{ key: 'timeCreated', order: 'desc' }],
        screenshots_page: 5,
        playlists_per_page: -1,
        playlists_search: 'morning',
        playlists_sort_by: [{ key: 'title', order: 'desc' }],
        playlists_page: 6,
        playlist_available_videos_per_page: 25,
        playlist_available_videos_page: 3,
        categories_per_page: 50,
        categories_search: 'news',
        categories_sort_by: [{ key: 'free', order: 'asc' }],
        categories_page: 7,
        subscriptions_per_page: 25,
        subscriptions_search: 'paid',
        subscriptions_sort_by: [{ key: 'endDate', order: 'desc' }],
        subscriptions_page: 8
      })
      localStorage.setItem('user', JSON.stringify(testUser))
      localStorage.setItem(listStateStorageKey, JSON.stringify({
        [testUser.id]: savedState,
        99: createListState({ users_search: 'other user' })
      }))

      const store = useAuthStore()

      expectListState(store, savedState)
    })

    it('persists all list params for current user and preserves other users', async () => {
      const testUser = { id: 1, name: 'Current User' }
      const nextState = createListState({
        users_per_page: 25,
        users_search: 'user search',
        users_sort_by: [{ key: 'email', order: 'asc' }],
        users_page: 2,
        videos_per_page: 50,
        videos_search: 'video search',
        videos_sort_by: [{ key: 'title', order: 'desc' }],
        videos_page: 3,
        screenshots_per_page: 25,
        screenshots_sort_by: [{ key: 'timeCreated', order: 'desc' }],
        screenshots_page: 4,
        playlists_per_page: -1,
        playlists_search: 'playlist search',
        playlists_sort_by: [{ key: 'videoCount', order: 'asc' }],
        playlists_page: 5,
        playlist_available_videos_per_page: 50,
        playlist_available_videos_page: 2,
        categories_per_page: 50,
        categories_search: 'category search',
        categories_sort_by: [{ key: 'title', order: 'desc' }],
        categories_page: 6,
        subscriptions_per_page: 25,
        subscriptions_search: 'subscription search',
        subscriptions_sort_by: [{ key: 'startDate', order: 'asc' }],
        subscriptions_page: 7
      })
      const otherUserState = createListState({ users_search: 'other user state' })
      localStorage.setItem('user', JSON.stringify(testUser))
      localStorage.setItem(listStateStorageKey, JSON.stringify({ 2: otherUserState }))
      const store = useAuthStore()
      localStorage.setItem.mockClear()

      Object.entries(nextState).forEach(([key, value]) => {
        store[key] = value
      })
      await waitForListStatePersistence()

      const savedStates = readPersistedListStates()
      expect(savedStates['1']).toEqual(nextState)
      expect(savedStates['2']).toEqual(otherUserState)
      expect(localStorage.setItem).toHaveBeenCalledWith(listStateStorageKey, expect.any(String))
    })

    it('uses defaults when persisted list state JSON is corrupted', () => {
      localStorage.setItem('user', JSON.stringify({ id: 5, name: 'Broken Storage User' }))
      localStorage.setItem(listStateStorageKey, 'invalid-json')

      const store = useAuthStore()

      expectListState(store, createDefaultListState())
    })

    it('ignores invalid persisted list fields and keeps valid fields', () => {
      const validVideoSort = [{ key: 'title', order: 'asc' }]
      localStorage.setItem('user', JSON.stringify({ id: 6, name: 'Invalid State User' }))
      localStorage.setItem(listStateStorageKey, JSON.stringify({
        6: {
          users_per_page: 0,
          users_search: 123,
          users_sort_by: 'email',
          users_page: -1,
          videos_per_page: -1,
          videos_search: 'valid search',
          videos_sort_by: validVideoSort,
          videos_page: 2,
          screenshots_per_page: 10.5,
          screenshots_sort_by: null,
          screenshots_page: '3',
          playlist_available_videos_per_page: 0,
          playlist_available_videos_page: '4'
        }
      }))

      const store = useAuthStore()

      expect(store.users_per_page).toBe(10)
      expect(store.users_search).toBe('')
      expect(store.users_sort_by).toEqual(['id'])
      expect(store.users_page).toBe(1)
      expect(store.videos_per_page).toBe(-1)
      expect(store.videos_search).toBe('valid search')
      expect(store.videos_sort_by).toEqual(validVideoSort)
      expect(store.videos_page).toBe(2)
      expect(store.screenshots_per_page).toBe(100)
      expect(store.screenshots_sort_by).toEqual([{ key: 'id', order: 'asc' }])
      expect(store.screenshots_page).toBe(1)
      expect(store.playlist_available_videos_per_page).toBe(10)
      expect(store.playlist_available_videos_page).toBe(1)
    })

    it('applies logged-in user list state after login', async () => {
      const loggedInUser = { id: 8, name: 'Logged In User' }
      const savedState = createListState({
        users_page: 4,
        videos_search: 'loaded after login',
        categories_sort_by: [{ key: 'title', order: 'asc' }]
      })
      localStorage.setItem(listStateStorageKey, JSON.stringify({ 8: savedState }))
      fetchWrapper.post.mockResolvedValue(loggedInUser)
      const store = useAuthStore()

      await store.login('test@example.com', 'password')

      expect(store.user).toEqual(loggedInUser)
      expectListState(store, savedState)
    })

    it('applies re-authenticated user list state after re process', async () => {
      const firstUser = { id: 9, name: 'First User' }
      const nextUser = { id: 10, name: 'Next User' }
      const firstState = createListState({ users_search: 'first user' })
      const nextState = createListState({
        users_search: 'next user',
        videos_page: 5,
        subscriptions_per_page: 25
      })
      localStorage.setItem('user', JSON.stringify(firstUser))
      localStorage.setItem(listStateStorageKey, JSON.stringify({
        9: firstState,
        10: nextState
      }))
      fetchWrapper.put.mockResolvedValue(nextUser)
      const store = useAuthStore()
      expectListState(store, firstState)
      store.re_jwt = 'jwt-token'
      store.re_tgt = 'reset'

      await store.re()

      expect(store.user).toEqual(nextUser)
      expectListState(store, nextState)
    })

    it('resets list params on logout without deleting persisted states', () => {
      const testUser = { id: 11, name: 'Logout User' }
      const savedState = createListState({
        users_search: 'before logout',
        videos_per_page: 50,
        screenshots_page: 3
      })
      localStorage.setItem('user', JSON.stringify(testUser))
      localStorage.setItem(listStateStorageKey, JSON.stringify({ 11: savedState }))
      const store = useAuthStore()
      expectListState(store, savedState)

      store.logout()

      expect(store.user).toBeNull()
      expectListState(store, createDefaultListState())
      expect(readPersistedListStates()['11']).toEqual(savedState)
    })
  })

  describe('actions', () => {
    it('check calls the API to check authentication', async () => {
      fetchWrapper.get.mockResolvedValue({})
      
      const store = useAuthStore()
      await store.check()
      
      expect(fetchWrapper.get).toHaveBeenCalledWith(expect.stringContaining('/check'))
    })
    
    it('check propagates errors when API call fails', async () => {
      const errorMessage = 'Authentication check failed'
      fetchWrapper.get.mockRejectedValue(new Error(errorMessage))
      
      const store = useAuthStore()
      
      await expect(store.check()).rejects.toThrow(errorMessage)
      expect(fetchWrapper.get).toHaveBeenCalledWith(expect.stringContaining('/check'))
    })

    it('register calls the API with user data', async () => {
      fetchWrapper.post.mockResolvedValue({})
      
      const store = useAuthStore()
      const testUser = { email: 'test@example.com', password: 'password' }
      await store.register(testUser)
      
      expect(fetchWrapper.post).toHaveBeenCalledWith(expect.stringContaining('/register'), testUser)
    })
    
    it('register propagates errors when API call fails', async () => {
      const errorMessage = 'Failed to register user'
      fetchWrapper.post.mockRejectedValue(new Error(errorMessage))
      
      const store = useAuthStore()
      const testUser = { email: 'test@example.com', password: 'password' }
      
      await expect(store.register(testUser)).rejects.toThrow(errorMessage)
      expect(fetchWrapper.post).toHaveBeenCalledWith(expect.stringContaining('/register'), testUser)
    })

    it('recover calls the API with user data', async () => {
      fetchWrapper.post.mockResolvedValue({})
      
      const store = useAuthStore()
      const testUser = { email: 'test@example.com' }
      await store.recover(testUser)
      
      expect(fetchWrapper.post).toHaveBeenCalledWith(expect.stringContaining('/recover'), testUser)
    })
    
    it('recover propagates errors when API call fails', async () => {
      const errorMessage = 'Failed to recover password'
      fetchWrapper.post.mockRejectedValue(new Error(errorMessage))
      
      const store = useAuthStore()
      const testUser = { email: 'test@example.com' }
      
      await expect(store.recover(testUser)).rejects.toThrow(errorMessage)
      expect(fetchWrapper.post).toHaveBeenCalledWith(expect.stringContaining('/recover'), testUser)
    })

    it('login authenticates the user, stores in localStorage, and fetches status', async () => {
      const testUser = { id: 1, name: 'Test User', token: 'abc123' }
      fetchWrapper.post.mockResolvedValue(testUser)
      
      const statusStore = useStatusStore()
      const store = useAuthStore()
      await store.login('test@example.com', 'password')
      
      expect(fetchWrapper.post).toHaveBeenCalledWith(
        expect.stringContaining('/login'),
        { email: 'test@example.com', password: 'password' }
      )
      expect(store.user).toEqual(testUser)
      expect(localStorage.setItem).toHaveBeenCalledWith('user', JSON.stringify(testUser))
      expect(statusStore.fetchStatus).toHaveBeenCalled()
    })
    
    it('fetches status even when login fails', async () => {
      const errorMessage = 'Invalid credentials'
      fetchWrapper.post.mockRejectedValue(new Error(errorMessage))
      
      const statusStore = useStatusStore()
      const store = useAuthStore()
      
      await expect(store.login('test@example.com', 'wrong-password')).rejects.toThrow(errorMessage)
      
      expect(fetchWrapper.post).toHaveBeenCalledWith(
        expect.stringContaining('/login'),
        { email: 'test@example.com', password: 'wrong-password' }
      )
      expect(statusStore.fetchStatus).toHaveBeenCalled()
    })

    it('login redirects to returnUrl if set', async () => {
      const testUser = { id: 1, name: 'Test User' }
      fetchWrapper.post.mockResolvedValue(testUser)
      
      const store = useAuthStore()
      store.returnUrl = '/dashboard'
      
      await store.login('test@example.com', 'password')
      
      expect(router.push).toHaveBeenCalledWith('/dashboard')
      expect(store.returnUrl).toBeNull()
    })

    it('logout removes user from store, localStorage, and fetches status', () => {
      const testUser = { id: 1, name: 'Test User' }
      localStorage.setItem('user', JSON.stringify(testUser))
      
      const statusStore = useStatusStore()
      const store = useAuthStore()
      store.user.value = testUser
      
      store.logout()
      
      expect(store.user).toBeNull()
      expect(localStorage.removeItem).toHaveBeenCalledWith('user')
      expect(statusStore.fetchStatus).toHaveBeenCalled()
      expect(router.push).toHaveBeenCalledWith('/login')
    })

    it('fetches status and rethrows when logout navigation fails', () => {
      const statusStore = useStatusStore()
      const store = useAuthStore()
      const error = new Error('navigation failed')
      router.push.mockImplementationOnce(() => {
        throw error
      })

      expect(() => store.logout()).toThrow(error)
      expect(statusStore.fetchStatus).toHaveBeenCalled()
    })

    it('re process updates user with jwt token and fetches status', async () => {
      const testUser = { id: 1, name: 'Updated User' }
      fetchWrapper.put.mockResolvedValue(testUser)
      
      const statusStore = useStatusStore()
      const store = useAuthStore()
      store.re_jwt = 'jwt-token'
      store.re_tgt = 'reset'
      
      await store.re()
      
      expect(fetchWrapper.put).toHaveBeenCalledWith(
        expect.stringContaining('/reset'),
        { jwt: 'jwt-token' }
      )
      expect(store.user).toEqual(testUser)
      expect(store.re_jwt).toBeNull()
      expect(localStorage.setItem).toHaveBeenCalledWith('user', JSON.stringify(testUser))
      expect(statusStore.fetchStatus).toHaveBeenCalled()
    })
    
    it('fetches status even when re process fails', async () => {
      const errorMessage = 'Invalid token'
      fetchWrapper.put.mockRejectedValue(new Error(errorMessage))
      
      const statusStore = useStatusStore()
      const store = useAuthStore()
      store.re_jwt = 'invalid-token'
      store.re_tgt = 'reset'
      
      await expect(store.re()).rejects.toThrow(errorMessage)
      
      expect(fetchWrapper.put).toHaveBeenCalledWith(
        expect.stringContaining('/reset'),
        { jwt: 'invalid-token' }
      )
      expect(store.re_jwt).toBeNull()
      expect(statusStore.fetchStatus).toHaveBeenCalled()
    })

    it('re process handles register target correctly', async () => {
      const testUser = { id: 1, name: 'Registered User', roles: ['user'] }
      fetchWrapper.put.mockResolvedValue(testUser)
      
      const statusStore = useStatusStore()
      const store = useAuthStore()
      store.re_jwt = 'register-jwt-token'
      store.re_tgt = 'register'
      
      await store.re()
      
      expect(fetchWrapper.put).toHaveBeenCalledWith(
        expect.stringContaining('/register'),
        { jwt: 'register-jwt-token' }
      )
      expect(store.user).toEqual(testUser)
      expect(store.re_jwt).toBeNull()
      expect(localStorage.setItem).toHaveBeenCalledWith('user', JSON.stringify(testUser))
      expect(statusStore.fetchStatus).toHaveBeenCalled()
    })

    it('re process handles recover target correctly', async () => {
      const testUser = { id: 1, name: 'Recovered User', roles: ['user'] }
      fetchWrapper.put.mockResolvedValue(testUser)
      
      const statusStore = useStatusStore()
      const store = useAuthStore()
      store.re_jwt = 'recover-jwt-token'
      store.re_tgt = 'recover'
      
      await store.re()
      
      expect(fetchWrapper.put).toHaveBeenCalledWith(
        expect.stringContaining('/recover'),
        { jwt: 'recover-jwt-token' }
      )
      expect(store.user).toEqual(testUser)
      expect(store.re_jwt).toBeNull()
      expect(localStorage.setItem).toHaveBeenCalledWith('user', JSON.stringify(testUser))
      expect(statusStore.fetchStatus).toHaveBeenCalled()
    })
  })

  describe('Accounts Tree State Management', () => {
    beforeEach(() => {
      setActivePinia(createPinia())
      vi.clearAllMocks()
      localStorage.clear()
    })

    it('initializes with empty tree state when no user', () => {
      const store = useAuthStore()
      
      expect(store.getAccountsTreeState).toEqual({
        selectedNode: null,
        expandedNodes: []
      })
    })

    it('saves tree state for current user', () => {
      const store = useAuthStore()
      store.user = { id: 1, email: 'test@example.com' }
      
      store.saveAccountsTreeState('account-123', ['root-accounts', 'account-123'])
      
      expect(store.getAccountsTreeState).toEqual({
        selectedNode: 'account-123',
        expandedNodes: ['root-accounts', 'account-123']
      })
      
      expect(localStorage.setItem).toHaveBeenCalledWith('accountsTreeState', expect.any(String))
    })

    it('does not save tree state when no user', () => {
      const store = useAuthStore()
      store.user = null
      
      store.saveAccountsTreeState('account-123', ['root-accounts'])
      
      expect(localStorage.setItem).not.toHaveBeenCalledWith('accountsTreeState', expect.any(String))
    })

    it('returns empty state when user not logged in', () => {
      const store = useAuthStore()
      store.user = null
      
      expect(store.getAccountsTreeState).toEqual({
        selectedNode: null,
        expandedNodes: []
      })
    })

    it('handles corrupted localStorage data gracefully', () => {
      localStorage.setItem('accountsTreeState', 'invalid-json')
      
      setActivePinia(createPinia())
      const store = useAuthStore()
      store.user = { id: 1, email: 'test@example.com' }
      
      expect(store.getAccountsTreeState).toEqual({
        selectedNode: null,
        expandedNodes: []
      })
    })

    it('clears tree state for current user', () => {
      const store = useAuthStore()
      store.user = { id: 1, email: 'test@example.com' }
      
      // First save some state
      store.saveAccountsTreeState('account-123', ['root-accounts'])
      expect(store.getAccountsTreeState.selectedNode).toBe('account-123')
      
      // Then clear it
      store.clearAccountsTreeState()
      expect(store.getAccountsTreeState).toEqual({
        selectedNode: null,
        expandedNodes: []
      })
      
      expect(localStorage.setItem).toHaveBeenCalledWith('accountsTreeState', '{}')
    })

    it('does not clear tree state when no user', () => {
      const store = useAuthStore()
      store.user = null
      
      store.clearAccountsTreeState()
      
      expect(localStorage.setItem).not.toHaveBeenCalledWith('accountsTreeState', expect.any(String))
    })

    it('maintains separate state for different users', () => {
      const store = useAuthStore()
      
      // User 1
      store.user = { id: 1, email: 'user1@example.com' }
      store.saveAccountsTreeState('account-123', ['root-accounts'])
      const user1State = store.getAccountsTreeState
      
      // User 2
      store.user = { id: 2, email: 'user2@example.com' }
      store.saveAccountsTreeState('account-456', ['root-accounts', 'account-456'])
      const user2State = store.getAccountsTreeState
      
      // Switch back to User 1
      store.user = { id: 1, email: 'user1@example.com' }
      
      expect(store.getAccountsTreeState).toEqual(user1State)
      expect(user1State.selectedNode).toBe('account-123')
      expect(user2State.selectedNode).toBe('account-456')
    })

    it('handles null and undefined values in saveAccountsTreeState', () => {
      const store = useAuthStore()
      store.user = { id: 1, email: 'test@example.com' }
      
      store.saveAccountsTreeState(null, undefined)
      
      expect(store.getAccountsTreeState).toEqual({
        selectedNode: null,
        expandedNodes: []
      })
    })

    it('creates a copy of expandedNodes array to prevent mutations', () => {
      const store = useAuthStore()
      store.user = { id: 1, email: 'test@example.com' }
      
      const originalExpanded = ['root-accounts', 'account-123']
      store.saveAccountsTreeState('account-123', originalExpanded)
      
      // Modify the original array
      originalExpanded.push('new-item')
      
      // Stored state should not be affected
      expect(store.getAccountsTreeState.expandedNodes).toEqual(['root-accounts', 'account-123'])
    })
  })

  describe('Videos Tree State Management', () => {
    beforeEach(() => {
      setActivePinia(createPinia())
      vi.clearAllMocks()
      localStorage.clear()
    })

    it('initializes with empty videos tree state when no user', () => {
      const store = useAuthStore()

      expect(store.getVideosTreeState).toEqual({
        selectedNode: [],
        openedNodes: []
      })
    })

    it('returns empty videos tree state for a user with no saved state', () => {
      const store = useAuthStore()
      store.user = { id: 1, email: 'test@example.com' }

      expect(store.getVideosTreeState).toEqual({
        selectedNode: [],
        openedNodes: []
      })
    })

    it('saves videos tree state and normalizes selected nodes', () => {
      const store = useAuthStore()
      store.user = { id: 1, email: 'test@example.com' }

      store.saveVideosTreeState('video-123', ['root-videos'])

      expect(store.getVideosTreeState).toEqual({
        selectedNode: ['video-123'],
        openedNodes: ['root-videos']
      })
      expect(localStorage.setItem).toHaveBeenCalledWith('videosTreeState', expect.any(String))
    })

    it('saves videos tree state arrays as defensive copies', () => {
      const store = useAuthStore()
      store.user = { id: 1, email: 'test@example.com' }
      const selectedNodes = ['video-123']
      const openedNodes = ['root-videos']

      store.saveVideosTreeState(selectedNodes, openedNodes)
      selectedNodes.push('video-456')
      openedNodes.push('category-1')

      expect(store.getVideosTreeState).toEqual({
        selectedNode: ['video-123'],
        openedNodes: ['root-videos']
      })
    })

    it('does not save or clear videos tree state when no user is active', () => {
      const store = useAuthStore()
      store.user = null

      store.saveVideosTreeState('video-123', ['root-videos'])
      store.clearVideosTreeState()

      expect(localStorage.setItem).not.toHaveBeenCalledWith('videosTreeState', expect.any(String))
    })

    it('clears videos tree state for the current user', () => {
      const store = useAuthStore()
      store.user = { id: 1, email: 'test@example.com' }

      store.saveVideosTreeState(['video-123'], ['root-videos'])
      expect(store.getVideosTreeState.selectedNode).toEqual(['video-123'])

      store.clearVideosTreeState()

      expect(store.getVideosTreeState).toEqual({
        selectedNode: [],
        openedNodes: []
      })
      expect(localStorage.setItem).toHaveBeenCalledWith('videosTreeState', '{}')
    })

    it('handles corrupted videos tree state in localStorage', () => {
      localStorage.setItem('videosTreeState', 'invalid-json')

      setActivePinia(createPinia())
      const store = useAuthStore()
      store.user = { id: 1, email: 'test@example.com' }

      expect(store.getVideosTreeState).toEqual({
        selectedNode: [],
        openedNodes: []
      })
    })
  })

})
