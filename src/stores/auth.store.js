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

  // Load tree state from localStorage on store initialization
  function loadAccountsTreeState() {
    try {
      const saved = localStorage.getItem('accountsTreeState')
      if (saved) {
        accountsTreeState.value = JSON.parse(saved)
      }
    } catch (error) {
      accountsTreeState.value = {}
    }
  }

  // Get tree state for current user
  const getAccountsTreeState = computed(() => {
    if (!user.value?.id) return { selectedNode: null, expandedNodes: [] }
    return accountsTreeState.value[user.value.id] || { selectedNode: null, expandedNodes: [] }
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

  // Clear tree state for current user
  function clearAccountsTreeState() {
    if (!user.value?.id) return

    if (accountsTreeState.value[user.value.id]) {
      delete accountsTreeState.value[user.value.id]
      localStorage.setItem('accountsTreeState', JSON.stringify(accountsTreeState.value))
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
    // actions
    check,
    register,
    recover,
    re,
    login,
    logout,
    saveAccountsTreeState,
    clearAccountsTreeState,
    loadAccountsTreeState
  }
})
