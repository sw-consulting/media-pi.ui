// Copyright (c) 2025 sw.consulting
// This file is a part of Media Pi  frontend application

import { defineStore } from 'pinia'
import { ref } from 'vue'
import { fetchWrapper } from '@/helpers/fetch.wrapper.js'
import { apiUrl } from '@/helpers/config.js'

const baseUrl = `${apiUrl}/devicegroups`

export const useDeviceGroupsStore = defineStore('devicegroups', () => {
  const groups = ref([])
  const group = ref(null)
  const loading = ref(false)
  const error = ref(null)
  const lastLoaded = ref(null) // Track when data was last loaded

  const getGroupById = (id) => {
    if (!groups.value || !Array.isArray(groups.value)) {
      return null
    }
    return groups.value.find(g => g && g.id === id)
  }

  async function add(groupParam) {
    loading.value = true
    error.value = null
    try {
      await fetchWrapper.post(baseUrl, groupParam)
      getAll(true) // Force refresh after add
    } catch (err) {
      error.value = err
      throw err
    } finally {
      loading.value = false
    }
  }

  async function getAll(forceRefresh = false) {
    // Skip loading if data is fresh (loaded within last 30 seconds) and not forcing refresh
    if (!forceRefresh && lastLoaded.value && groups.value.length > 0) {
      const timeSinceLastLoad = Date.now() - lastLoaded.value
      if (timeSinceLastLoad < 30000) { // 30 seconds cache
        return groups.value
      }
    }

    loading.value = true
    error.value = null
    try {
      const result = await fetchWrapper.get(baseUrl)
      groups.value = result || []
      lastLoaded.value = Date.now()
    } catch (err) {
      error.value = err
      groups.value = []
      throw err
    } finally {
      loading.value = false
    }
  }

  async function getById(id) {
    loading.value = true
    error.value = null
    try {
      const result = await fetchWrapper.get(`${baseUrl}/${id}`)
      group.value = result
    } catch (err) {
      error.value = err
      group.value = null
      throw err
    } finally {
      loading.value = false
    }
  }

  async function update(id, params) {
    loading.value = true
    error.value = null
    try {
      await fetchWrapper.put(`${baseUrl}/${id}`, params)
      getAll(true) // Force refresh after update
    } catch (err) {
      error.value = err
      throw err
    } finally {
      loading.value = false
    }
  }

  async function deleteGroup(id) {
    loading.value = true
    error.value = null
    try {
      await fetchWrapper.delete(`${baseUrl}/${id}`, {})
      getAll(true) // Force refresh after delete
    } catch (err) {
      error.value = err
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    groups,
    group,
    loading,
    error,
    getGroupById,
    add,
    getAll,
    getById,
    update,
    delete: deleteGroup
  }
})

