// Copyright (c) 2025 sw.consulting
// This file is a part of Media Pi  frontend application

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { fetchWrapper } from '@/helpers/fetch.wrapper.js'
import { apiUrl } from '@/helpers/config.js'
import router from '@/router'
import { useStatusStore } from '@/stores/status.store.js'
import { isAdministrator as isAdmin } from '@/helpers/user.helpers.js' 
import { isManager as isMngr } from '@/helpers/user.helpers.js' 
import { isEngineer as isEng } from '@/helpers/user.helpers.js' 

const baseUrl = `${apiUrl}/auth`

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
  const users_per_page = ref(10)
  const users_search = ref('')
  const users_sort_by = ref(['id'])
  const users_page = ref(1)
  const returnUrl = ref(null)
  const re_jwt = ref(null)
  const re_tgt = ref(null)

  // Accounts tree state management
  const accountsTreeState = ref({})

  // Videos tree state management
  const videosTreeState = ref({})

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

  return {
    // state
    user,
    users_per_page,
    users_search,
    users_sort_by,
    users_page,
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
