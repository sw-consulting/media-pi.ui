// Copyright (c) 2025 sw.consulting
// This file is a part of Media Pi  frontend application

import { defineStore } from 'pinia'
import { ref } from 'vue'
import { fetchWrapper } from '@/helpers/fetch.wrapper.js'
import { apiUrl } from '@/helpers/config.js'

const baseUrl = `${apiUrl}/playlists`

export const usePlaylistsStore = defineStore('playlists', () => {
  const playlists = ref([])
  const playlist = ref(null)
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

  async function getAllByAccount(accountId) {
    return handleRequest(
      async () => {
        const result = await fetchWrapper.get(`${baseUrl}/by-account/${accountId}`)
        playlists.value = result || []
        return playlists.value
      },
      null
    ).catch(err => {
      playlists.value = []
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

  return {
    playlists,
    playlist,
    loading,
    error,
    getAll,
    getById,
    getAllByAccount,
    create,
    update,
    remove,
  }
})
