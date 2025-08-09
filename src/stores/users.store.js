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
    update,
    delete: deleteUser
  }
})
