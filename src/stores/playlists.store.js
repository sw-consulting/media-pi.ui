// Copyright (c) 2025 sw.consulting
// This file is a part of Media Pi  frontend application

import { defineStore } from 'pinia'
import { ref } from 'vue'
import { fetchWrapper } from '@/helpers/fetch.wrapper.js'
import { apiUrl } from '@/helpers/config.js'

const baseUrl = `${apiUrl}/playlists`

const isFormData = (payload) => {
  if (typeof FormData === 'undefined' || !payload) {
    return false
  }

  return payload instanceof FormData
}

export const usePlaylistsStore = defineStore('playlists', () => {
  const playlists = ref([])
  const playlist = ref(null)
  const playlistDevices = ref([])
  const playlistMediaFiles = ref([])
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
        playlists.value = result || []
        return playlists.value
      },
      null
    ).catch(err => {
      playlists.value = []
      throw err
    })
  }

  async function getById(id) {
    return handleRequest(
      async () => {
        const result = await fetchWrapper.get(`${baseUrl}/${id}`)
        playlist.value = result
        return playlist.value
      },
      null
    ).catch(err => {
      playlist.value = null
      throw err
    })
  }

  async function create(params) {
    return handleRequest(
      async () => {
        const result = await fetchWrapper.post(baseUrl, params)
        await getAll()
        return result
      }
    )
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

  async function getDevices(id) {
    return handleRequest(
      async () => {
        const result = await fetchWrapper.get(`${baseUrl}/${id}/devices`)
        playlistDevices.value = result || []
        return playlistDevices.value
      },
      null
    ).catch(err => {
      playlistDevices.value = []
      throw err
    })
  }

  async function addDevice(id, device) {
    const payload = typeof device === 'object' && device !== null ? device : { deviceId: device }
    return handleRequest(
      async () => {
        const result = await fetchWrapper.post(`${baseUrl}/${id}/devices`, payload)
        await getDevices(id)
        return result
      }
    )
  }

  async function removeDevice(id, deviceId) {
    return handleRequest(
      async () => {
        const result = await fetchWrapper.delete(`${baseUrl}/${id}/devices/${deviceId}`)
        await getDevices(id)
        return result
      }
    )
  }

  async function getMediaFiles(id) {
    return handleRequest(
      async () => {
        const result = await fetchWrapper.get(`${baseUrl}/${id}/files`)
        playlistMediaFiles.value = result || []
        return playlistMediaFiles.value
      },
      null
    ).catch(err => {
      playlistMediaFiles.value = []
      throw err
    })
  }

  async function addMediaFile(id, payload) {
    const request = isFormData(payload) ? fetchWrapper.postFile : fetchWrapper.post
    return handleRequest(
      async () => {
        const result = await request(`${baseUrl}/${id}/files`, payload)
        await getMediaFiles(id)
        return result
      }
    )
  }

  async function updateMediaFile(id, fileId, payload) {
    const request = isFormData(payload) ? fetchWrapper.postFile : fetchWrapper.put
    return handleRequest(
      async () => {
        const result = await request(`${baseUrl}/${id}/files/${fileId}`, payload)
        await getMediaFiles(id)
        return result
      }
    )
  }

  async function removeMediaFile(id, fileId) {
    return handleRequest(
      async () => {
        const result = await fetchWrapper.delete(`${baseUrl}/${id}/files/${fileId}`)
        await getMediaFiles(id)
        return result
      }
    )
  }

  async function reorderMediaFiles(id, payload) {
    return handleRequest(
      async () => {
        const result = await fetchWrapper.post(`${baseUrl}/${id}/files/reorder`, payload)
        await getMediaFiles(id)
        return result
      }
    )
  }

  function resetState() {
    playlists.value = []
    playlist.value = null
    playlistDevices.value = []
    playlistMediaFiles.value = []
    error.value = null
    loading.value = false
  }

  return {
    playlists,
    playlist,
    playlistDevices,
    playlistMediaFiles,
    loading,
    error,
    getAll,
    getById,
    create,
    update,
    remove,
    getDevices,
    addDevice,
    removeDevice,
    getMediaFiles,
    addMediaFile,
    updateMediaFile,
    removeMediaFile,
    reorderMediaFiles,
    resetState
  }
})
