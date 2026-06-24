// Copyright (c) 2025 sw.consulting
// This file is a part of Media Pi  frontend application

import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { fetchWrapper } from '@/helpers/fetch.wrapper.js'
import { apiUrl } from '@/helpers/config.js'
import router from '@/router'
import { useStatusStore } from '@/stores/status.store.js'
import { isAdministrator as isAdmin } from '@/helpers/user.helpers.js' 
import { isManager as isMngr } from '@/helpers/user.helpers.js' 
import { isEngineer as isEng } from '@/helpers/user.helpers.js' 

const baseUrl = `${apiUrl}/auth`
const listStateStorageKey = 'authListState'

const listStateDefaults = Object.freeze({
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
})

const listStateKeys = Object.keys(listStateDefaults)
const perPageKeys = new Set(listStateKeys.filter(key => key.endsWith('_per_page')))
const pageKeys = new Set(listStateKeys.filter(key => key.endsWith('_page') && !key.endsWith('_per_page')))
const searchKeys = new Set(listStateKeys.filter(key => key.endsWith('_search')))
const sortKeys = new Set(listStateKeys.filter(key => key.endsWith('_sort_by')))

function cloneListStateValue(value) {
  if (Array.isArray(value)) {
    return value.map(item => (
      item && typeof item === 'object'
        ? { ...item }
        : item
    ))
  }

  return value
}

function createDefaultListState() {
  return Object.fromEntries(
    listStateKeys.map(key => [key, cloneListStateValue(listStateDefaults[key])])
  )
}

function normalizePositiveInteger(value, fallback) {
  return Number.isInteger(value) && value > 0 ? value : fallback
}

function normalizePerPage(value, fallback) {
  return Number.isInteger(value) && (value > 0 || value === -1) ? value : fallback
}

function normalizeListStateValue(key, value, fallback) {
  if (perPageKeys.has(key)) return normalizePerPage(value, fallback)
  if (pageKeys.has(key)) return normalizePositiveInteger(value, fallback)
  if (searchKeys.has(key)) return typeof value === 'string' ? value : fallback
  if (sortKeys.has(key)) return Array.isArray(value) ? cloneListStateValue(value) : cloneListStateValue(fallback)
  return cloneListStateValue(fallback)
}

function normalizeListState(savedState = {}) {
  const defaults = createDefaultListState()

  return Object.fromEntries(
    listStateKeys.map(key => [
      key,
      normalizeListStateValue(key, savedState?.[key], defaults[key])
    ])
  )
}

function readSavedListStates() {
  try {
    const saved = localStorage.getItem(listStateStorageKey)
    if (!saved) return {}

    const parsed = JSON.parse(saved)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
  } catch {
    return {}
  }
}

export const useAuthStore = defineStore('auth', () => {
  const saved_user = localStorage.getItem('user')
  const user = ref(saved_user ? JSON.parse(saved_user) : null )
  const isAdministrator = computed(() =>
    isAdmin(user.value)
  )
  const isManager = computed(() =>
    isMngr(user.value)
  )
  const isEngineer = computed(() =>
    isEng(user.value)
  )
  const defaultListState = createDefaultListState()
  const users_per_page = ref(defaultListState.users_per_page)
  const users_search = ref(defaultListState.users_search)
  const users_sort_by = ref(defaultListState.users_sort_by)
  const users_page = ref(defaultListState.users_page)
  const videos_per_page = ref(defaultListState.videos_per_page)
  const videos_search = ref(defaultListState.videos_search)
  const videos_sort_by = ref(defaultListState.videos_sort_by)
  const videos_page = ref(defaultListState.videos_page)
  const screenshots_per_page = ref(defaultListState.screenshots_per_page)
  const screenshots_sort_by = ref(defaultListState.screenshots_sort_by)
  const screenshots_page = ref(defaultListState.screenshots_page)
  const playlists_per_page = ref(defaultListState.playlists_per_page)
  const playlists_search = ref(defaultListState.playlists_search)
  const playlists_sort_by = ref(defaultListState.playlists_sort_by)
  const playlists_page = ref(defaultListState.playlists_page)
  const playlist_available_videos_per_page = ref(defaultListState.playlist_available_videos_per_page)
  const playlist_available_videos_page = ref(defaultListState.playlist_available_videos_page)
  const categories_per_page = ref(defaultListState.categories_per_page)
  const categories_search = ref(defaultListState.categories_search)
  const categories_sort_by = ref(defaultListState.categories_sort_by)
  const categories_page = ref(defaultListState.categories_page)
  const subscriptions_per_page = ref(defaultListState.subscriptions_per_page)
  const subscriptions_search = ref(defaultListState.subscriptions_search)
  const subscriptions_sort_by = ref(defaultListState.subscriptions_sort_by)
  const subscriptions_page = ref(defaultListState.subscriptions_page)
  const returnUrl = ref(null)
  const re_jwt = ref(null)
  const re_tgt = ref(null)

  const listStateRefs = {
    users_per_page,
    users_search,
    users_sort_by,
    users_page,
    videos_per_page,
    videos_search,
    videos_sort_by,
    videos_page,
    screenshots_per_page,
    screenshots_sort_by,
    screenshots_page,
    playlists_per_page,
    playlists_search,
    playlists_sort_by,
    playlists_page,
    playlist_available_videos_per_page,
    playlist_available_videos_page,
    categories_per_page,
    categories_search,
    categories_sort_by,
    categories_page,
    subscriptions_per_page,
    subscriptions_search,
    subscriptions_sort_by,
    subscriptions_page
  }

  // Accounts tree state management
  const accountsTreeState = ref({})

  // Videos tree state management
  const videosTreeState = ref({})
  let isApplyingListState = false

  function getCurrentUserListStateKey() {
    return user.value?.id ? String(user.value.id) : null
  }

  function getCurrentListState() {
    return Object.fromEntries(
      listStateKeys.map(key => [key, cloneListStateValue(listStateRefs[key].value)])
    )
  }

  function applyListState(savedState = {}) {
    const state = normalizeListState(savedState)

    isApplyingListState = true
    try {
      listStateKeys.forEach(key => {
        listStateRefs[key].value = cloneListStateValue(state[key])
      })
    } finally {
      isApplyingListState = false
    }
  }

  function loadListStateForCurrentUser() {
    const userKey = getCurrentUserListStateKey()
    if (!userKey) {
      applyListState()
      return
    }

    const savedStates = readSavedListStates()
    applyListState(savedStates[userKey])
  }

  function saveListStateForCurrentUser() {
    if (isApplyingListState) return

    const userKey = getCurrentUserListStateKey()
    if (!userKey) return

    const savedStates = readSavedListStates()
    savedStates[userKey] = normalizeListState(getCurrentListState())
    localStorage.setItem(listStateStorageKey, JSON.stringify(savedStates))
  }

  // Load tree state from localStorage on store initialization
  function loadAccountsTreeState() {
    try {
      const saved = localStorage.getItem('accountsTreeState')
      if (saved) {
        accountsTreeState.value = JSON.parse(saved)
      }
    } catch {
      accountsTreeState.value = {}
    }
  }

  // Load videos tree state
  function loadVideosTreeState() {
    try {
      const saved = localStorage.getItem('videosTreeState')
      if (saved) {
        videosTreeState.value = JSON.parse(saved)
      }
    } catch {
      videosTreeState.value = {}
    }
  }

  // Get tree state for current user
  const getAccountsTreeState = computed(() => {
    if (!user.value?.id) return { selectedNode: null, expandedNodes: [] }
    return accountsTreeState.value[user.value.id] || { selectedNode: null, expandedNodes: [] }
  })

  // Get videos tree state for current user
  const getVideosTreeState = computed(() => {
    if (!user.value?.id) return { selectedNode: [], openedNodes: [] }
    return videosTreeState.value[user.value.id] || { selectedNode: [], openedNodes: [] }
  })

  // Save tree state for current user
  function saveAccountsTreeState(selectedNode, expandedNodes) {
    if (!user.value?.id) return

    accountsTreeState.value[user.value.id] = {
      selectedNode: selectedNode || null,
      expandedNodes: expandedNodes ? [...expandedNodes] : []
    }

    // Persist to localStorage
    localStorage.setItem('accountsTreeState', JSON.stringify(accountsTreeState.value))
  }

  // Save videos tree state for current user
  function saveVideosTreeState(selectedNode, openedNodes) {
    if (!user.value?.id) return

    videosTreeState.value[user.value.id] = {
      selectedNode: Array.isArray(selectedNode) ? [...selectedNode] : (selectedNode ? [selectedNode] : []),
      openedNodes: Array.isArray(openedNodes) ? [...openedNodes] : []
    }

    localStorage.setItem('videosTreeState', JSON.stringify(videosTreeState.value))
  }

  // Clear tree state for current user
  function clearAccountsTreeState() {
    if (!user.value?.id) return

    if (accountsTreeState.value[user.value.id]) {
      delete accountsTreeState.value[user.value.id]
      localStorage.setItem('accountsTreeState', JSON.stringify(accountsTreeState.value))
    }
  }

  // Clear videos tree state for current user
  function clearVideosTreeState() {
    if (!user.value?.id) return
    if (videosTreeState.value[user.value.id]) {
      delete videosTreeState.value[user.value.id]
      localStorage.setItem('videosTreeState', JSON.stringify(videosTreeState.value))
    }
  }

  async function check() {
    await fetchWrapper.get(`${baseUrl}/check`)
  }

  async function register(userParam) {
    await fetchWrapper.post(`${baseUrl}/register`, userParam)
  }

  async function recover(userParam) {
    await fetchWrapper.post(`${baseUrl}/recover`, userParam)
  }

  async function re() {
    const currentReJwt = re_jwt.value
    re_jwt.value = null
    
    // Fetch status information regardless of re-authentication success, failure, or exception
    const statusStore = useStatusStore()
    
    try {
      const userData = await fetchWrapper.put(`${baseUrl}/${re_tgt.value}`, { jwt: currentReJwt })
      user.value = userData
      localStorage.setItem('user', JSON.stringify(userData))
      loadListStateForCurrentUser()
    } catch (error) {
      // Ensure status is fetched before re-throwing the error
      await statusStore.fetchStatus().catch(() => {})
      throw error
    }
    
    // Fetch status after successful re-authentication as well
    await statusStore.fetchStatus().catch(() => {})
  }

  async function login(email, password) {
    // Fetch status information regardless of login success, failure, or exception
    const statusStore = useStatusStore()
    
    try {
      const userData = await fetchWrapper.post(`${baseUrl}/login`, { email, password })
      user.value = userData
      localStorage.setItem('user', JSON.stringify(userData))
      loadListStateForCurrentUser()
      
      if (returnUrl.value) {
        router.push(returnUrl.value)
        returnUrl.value = null
      }
    } catch (error) {
      // Ensure status is fetched before re-throwing the error
      await statusStore.fetchStatus().catch(() => {})
      throw error
    }
    
    // Fetch status after successful login as well
    await statusStore.fetchStatus().catch(() => {})
  }

  function logout() {
    // Fetch status information regardless of logout success, failure, or exception
    const statusStore = useStatusStore()
    
    try {
      user.value = null
      localStorage.removeItem('user')
      loadListStateForCurrentUser()
      router.push('/login')
    } catch (error) {
      // Ensure status is fetched before re-throwing the error
      statusStore.fetchStatus().catch(() => {})
      throw error
    }
    
    // Fetch status after successful logout as well
    statusStore.fetchStatus().catch(() => {})
  }

  // Load tree state when store is initialized
  loadAccountsTreeState()
  loadVideosTreeState()
  loadListStateForCurrentUser()

  watch(
    () => listStateKeys.map(key => listStateRefs[key].value),
    saveListStateForCurrentUser,
    { deep: true, flush: 'sync' }
  )

  return {
    // state
    user,
    users_per_page,
    users_search,
    users_sort_by,
    users_page,
    videos_per_page,
    videos_search,
    videos_sort_by,
    videos_page,
    screenshots_per_page,
    screenshots_sort_by,
    screenshots_page,
    playlists_per_page,
    playlists_search,
    playlists_sort_by,
    playlists_page,
    playlist_available_videos_per_page,
    playlist_available_videos_page,
    categories_per_page,
    categories_search,
    categories_sort_by,
    categories_page,
    subscriptions_per_page,
    subscriptions_search,
    subscriptions_sort_by,
    subscriptions_page,
    returnUrl,
    re_jwt,
    re_tgt,
    isAdministrator,
    isManager,
    isEngineer,
    getAccountsTreeState,
  getVideosTreeState,
    // actions
    check,
    register,
    recover,
    re,
    login,
    logout,
    saveAccountsTreeState,
    clearAccountsTreeState,
    loadAccountsTreeState,
    saveVideosTreeState,
    clearVideosTreeState,
    loadVideosTreeState
  }
})
