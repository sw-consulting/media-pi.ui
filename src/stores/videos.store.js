// Copyright (c) 2025 sw.consulting
// This file is a part of Media Pi  frontend application

import { defineStore } from 'pinia'
import { ref } from 'vue'
import { fetchWrapper } from '@/helpers/fetch.wrapper.js'
import { apiUrl } from '@/helpers/config.js'

const baseUrl = `${apiUrl}/videos`

export const useVideosStore = defineStore('videos', () => {
  const videos = ref([])
  const video = ref(null)
  const loading = ref(false)
  const error = ref(null)

  const setError = (err) => {
    error.value = err
  }

  const setLoading = (value) => {
    loading.value = value
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
        videos.value = result || []
        return videos.value
      },
      null
    ).catch(err => {
      videos.value = []
      throw err
    })
  }

  async function getById(id) {
    return handleRequest(
      async () => {
        const result = await fetchWrapper.get(`${baseUrl}/${id}`)
        video.value = result
        return video.value
      },
      null
    ).catch(err => {
      video.value = null
      throw err
    })
  }

  async function update(id, params) {
    return handleRequest(
      async () => {
        const result = await fetchWrapper.put(`${baseUrl}/${id}`, params)
        await getAll()
        return result
      }
    )
  }

  async function remove(id) {
    return handleRequest(
      async () => {
        const result = await fetchWrapper.delete(`${baseUrl}/${id}`)
        await getAll()
        return result
      }
    )
  }

  async function uploadFile(id, file, metadata = {}) {
    return handleRequest(
      async () => {
        const formData = new globalThis.FormData()
        if (file !== undefined && file !== null) {
          formData.append('file', file)
        }
        Object.entries(metadata || {}).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            formData.append(key, value)
          }
        })
        const result = await fetchWrapper.postFile(`${baseUrl}/${id}/file`, formData)
        if (video.value?.id === id) {
          await getById(id)
        }
        return result
      }
    )
  }

  async function getAllByAccount(accountId) {
    return handleRequest(
      async () => {
        const result = await fetchWrapper.get(`${baseUrl}/account/${accountId}`)
        videos.value = result || []
        return videos.value
      },
      null
    ).catch(err => {
      videos.value = []
      throw err
    })
  }

  return {
    videos,
    video,
    loading,
    error,
    getAll,
    getById,
    update,
    remove,
    uploadFile,
    getAllByAccount,
  }
})
