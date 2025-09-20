// Copyright (c) 2025 sw.consulting
// This file is a part of Media Pi  frontend application

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
