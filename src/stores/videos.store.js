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

  const assertUploadTarget = (accountId) => {
    if (accountId === undefined || accountId === null) throw new Error('Не выбран лицевой счёт')
  }

  const deriveUploadTitle = (file, title = '') => {
    return (title && title.trim()) ? title.trim() : (file.name ? file.name.replace(/\.[^.]+$/, '') : '')
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

  async function removeBatch(ids) {
    return handleRequest(
      async () => {
        const selectedIds = Array.from(ids || [])
        if (!selectedIds.length) throw new Error('Не выбраны видеофайлы')

        const result = await fetchWrapper.post(`${baseUrl}/delete/batch`, { ids: selectedIds })
        return result
      }
    )
  }

  const buildUploadOptions = (options = {}) => {
    const uploadOptions = {}
    if (typeof options.onUploadProgress === 'function') {
      uploadOptions.onUploadProgress = options.onUploadProgress
    }
    if (options.signal) {
      uploadOptions.signal = options.signal
    }

    return Object.keys(uploadOptions).length ? uploadOptions : null
  }

  const postUploadFile = (url, formData, options) => {
    const uploadOptions = buildUploadOptions(options)
    if (uploadOptions) {
      return fetchWrapper.postFile(url, formData, uploadOptions)
    }
    return fetchWrapper.postFile(url, formData)
  }

  async function uploadFile(file, accountId, title = '', options = {}) {
    return handleRequest(async () => {
      if (!file) throw new Error('Не выбран видеофайл')
      assertUploadTarget(accountId)
      const effectiveTitle = deriveUploadTitle(file, title)
      const formData = new globalThis.FormData()
      formData.append('File', file)
      formData.append('Title', effectiveTitle)
      formData.append('AccountId', accountId)
      return postUploadFile(`${baseUrl}/upload`, formData, options)
    })
  }

  async function uploadFiles(files, accountId, options = {}) {
    return handleRequest(async () => {
      const selectedFiles = Array.from(files || []).filter(Boolean)
      if (!selectedFiles.length) throw new Error('Не выбран видеофайл')
      assertUploadTarget(accountId)

      const formData = new globalThis.FormData()
      selectedFiles.forEach(file => {
        formData.append('Files', file)
        formData.append('Titles', deriveUploadTitle(file, file.name || ''))
      })
      formData.append('AccountId', accountId)

      return postUploadFile(`${baseUrl}/upload/batch`, formData, options)
    })
  }

  async function getAllByAccount(accountId) {
    return handleRequest(
      async () => {
        if (accountId === null) {
          videos.value = []
          return videos.value
        }
        const result = await fetchWrapper.get(`${baseUrl}/by-account/${accountId}`)
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
    removeBatch,
    uploadFile,
    uploadFiles,
    getAllByAccount,
  }
})
