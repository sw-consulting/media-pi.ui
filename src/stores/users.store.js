// Copyright (c) 2025 sw.consulting
// This file is a part of Media Pi backend

import { defineStore } from 'pinia'
import { ref } from 'vue'
import { fetchWrapper } from '@/helpers/fetch.wrapper.js'
import { useAuthStore } from '@/stores/auth.store.js'
import { apiUrl } from '@/helpers/config.js'

const baseUrl = `${apiUrl}/users`

export const useUsersStore = defineStore('users', () => {
  const users = ref([])
  const user = ref(null)
  const loading = ref(false)
  const error = ref(null)

  // getters
const getUserById = (id) => {
  if (!users.value || !Array.isArray(users.value)) {
    return null
  }
  return users.value.find(user => user && user.id === id);
}

  // actions
  async function add(userParam) {
    loading.value = true
    error.value = null
    try {
      await fetchWrapper.post(baseUrl, userParam)
      getAll() 
    } catch (err) {
      error.value = err
      throw err
    }
    finally {
      loading.value = false
    }
  }

  async function getAll() {
    loading.value = true
    error.value = null
    try {
      const result = await fetchWrapper.get(baseUrl)
      users.value = result
    } catch (err) {
      error.value = err
      users.value = []
      throw err
    }
    finally {
      loading.value = false
    }
  }

  async function getById(id) {
    loading.value = true
    error.value = null
    try {
      const result = await fetchWrapper.get(`${baseUrl}/${id}`)
      user.value = result
    } catch (err) {
      error.value = err
      user.value = null
      throw err
    }
    finally {
      loading.value = false
    }
  }

  async function getByAccount(accountId) {
    loading.value = true
    error.value = null
    try {
      const result = await fetchWrapper.get(`${baseUrl}/by-account/${accountId}`)
      users.value = result
    } catch (err) {
      error.value = err
      throw err
    }
    finally {
      loading.value = false
    }
  }

  async function update(id, params) {
    loading.value = true
    error.value = null
    try {
      await fetchWrapper.put(`${baseUrl}/${id}`, params)
    } catch (err) {
      error.value = err
      throw err
    }
    finally {
      loading.value = false
    }

    // update stored user if the logged in user updated their own record
    const authStore = useAuthStore()
    if (authStore.user && id === authStore.user.id) {
      // update local storage
      const updatedUser = { ...authStore.user, ...params }
      localStorage.setItem('user', JSON.stringify(updatedUser))

      // update auth user in pinia state
      authStore.user = updatedUser
    }
  }

  async function deleteUser(id) {
    const authStore = useAuthStore()
    if (authStore.user && id === authStore.user.id) {
      authStore.logout()
    }
    loading.value = true
    error.value = null
    try {
      await fetchWrapper.delete(`${baseUrl}/${id}`, {})
      getAll()
    } catch (err) {
      error.value = err
      throw err
    }
    finally {
      loading.value = false
    }
  }

  return {
    // state
    users,
    user,
    loading,
    error,
    // getters
    getUserById,
    // actions
    add,
    getAll,
    getById,
    getByAccount,
    update,
    delete: deleteUser
  }
})
