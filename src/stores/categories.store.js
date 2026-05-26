// Copyright (c) 2025 sw.consulting
// This file is a part of Media Pi frontend application

import { defineStore } from 'pinia'
import { ref } from 'vue'
import { fetchWrapper } from '@/helpers/fetch.wrapper.js'
import { apiUrl } from '@/helpers/config.js'

const baseUrl = `${apiUrl}/categories`

export const useCategoriesStore = defineStore('categories', () => {
  const categories = ref([])
  const category = ref(null)
  const loading = ref(false)
  const error = ref(null)

  const setLoading = (value) => {
    loading.value = value
  }

  const setError = (err) => {
    error.value = err
  }

  const handleRequest = async (action, onSuccess) => {
    setLoading(true)
    setError(null)
    try {
      const result = await action()
      if (typeof onSuccess === 'function') {
        await onSuccess(result)
      }
      return result
    } catch (err) {
      setError(err)
      throw err
    } finally {
      setLoading(false)
    }
  }

  async function getAll() {
    return handleRequest(
      async () => {
        const result = await fetchWrapper.get(baseUrl)
        categories.value = result || []
        return categories.value
      },
      null
    ).catch(err => {
      categories.value = []
      throw err
    })
  }

  async function getById(id) {
    return handleRequest(
      async () => {
        const result = await fetchWrapper.get(`${baseUrl}/${id}`)
        category.value = result
        return category.value
      },
      null
    ).catch(err => {
      category.value = null
      throw err
    })
  }

  async function create(params) {
    return handleRequest(async () => {
      const result = await fetchWrapper.post(baseUrl, params)
      await getAll()
      return result
    })
  }

  async function update(id, params) {
    return handleRequest(async () => {
      const result = await fetchWrapper.put(`${baseUrl}/${id}`, params)
      await getAll()
      return result
    })
  }

  async function remove(id) {
    return handleRequest(async () => {
      const result = await fetchWrapper.delete(`${baseUrl}/${id}`)
      await getAll()
      return result
    })
  }

  return {
    categories,
    category,
    loading,
    error,
    getAll,
    getById,
    create,
    update,
    remove
  }
})
