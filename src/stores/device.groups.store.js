// Copyright (c) 2025 sw.consulting
// This file is a part of Media Pi backend

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
      getAll()
    } catch (err) {
      error.value = err
      throw err
    } finally {
      loading.value = false
    }
  }

  async function getAll() {
    loading.value = true
    error.value = null
    try {
      const result = await fetchWrapper.get(baseUrl)
      groups.value = result || []
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
      getAll()
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
      getAll()
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

