// Copyright (c) 2025 sw.consulting
// Licensed under the MIT License.
// This file is a part of Mediapi frontend application

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
  const registers_per_page = ref(10)
  const registers_search = ref('')
  const registers_sort_by = ref([{ key: 'id', order: 'asc' }])
  const registers_page = ref(1)
  const returnUrl = ref(null)
  const re_jwt = ref(null)
  const re_tgt = ref(null)

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

  return {
    // state
    user,
    users_per_page,
    users_search,
    users_sort_by,
    users_page,
    registers_per_page,
    registers_search,
    registers_sort_by,
    registers_page,
    returnUrl,
    re_jwt,
    re_tgt,
    isAdministrator,
    isManager,
    isEngineer,
    // actions
    check,
    register,
    recover,
    re,
    login,
    logout
  }
})
