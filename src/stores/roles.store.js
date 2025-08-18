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
import { apiUrl } from '@/helpers/config.js'

const baseUrl = `${apiUrl}/roles`

export const useRolesStore = defineStore('roles', () => {
  const roles = ref([])
  const loading = ref(false)
  const error = ref(null)

  const roleMap = ref(new Map())
  let initialized = false

  async function getAll() {
    loading.value = true
    error.value = null
    try {
      const res = await fetchWrapper.get(baseUrl)
      roles.value = res || []
      roleMap.value = new Map(roles.value.map(t => [t.roleId, t]))
    } catch (err) {
      error.value = err
      throw err
    } finally {
      loading.value = false
    }
  }
  
  async function ensureLoaded() {
    if (!initialized  && !loading.value) {
      initialized = true
      await getAll()
    }
  }

  function getName(id) {
    const role = roleMap.value.get(id)
    return role ? role.name : `Роль #${id}`
  }

  function getNameByRoleId(roleId) {
    const role = roleMap.value.get(roleId)
    return role ? role.name : `Роль ${roleId}`
  }

  return { 
    roles, 
    loading, 
    error, 
    getAll, 
    ensureLoaded, 
    getName,
    getNameByRoleId
  }
})
