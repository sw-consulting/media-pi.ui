// Copyright (c) 2025 sw.consulting
// This file is a part of Media Pi  frontend application
/* global process */

import { defineStore } from 'pinia'
import { ref } from 'vue'
import { fetchWrapper } from '@/helpers/fetch.wrapper.js'
import { apiUrl, enableLog } from '@/helpers/config.js'
import { useAuthStore } from '@/stores/auth.store.js'

const baseUrl = `${apiUrl}/devicestatuses`

export const useDeviceStatusesStore = defineStore('deviceStatuses', () => {
  const statuses = ref([])
  const loading = ref(false)
  const error = ref(null)
  let streamController = null
  let streamReader = null

  const updateLocal = (item) => {
    const idx = statuses.value.findIndex(s => s.deviceId === item.deviceId)
    const next = { ...item }
    if (idx >= 0) {
      // ensure reactivity on replace
      statuses.value.splice(idx, 1, next)
    } else {
      // ensure reactivity on add by creating new array reference
      statuses.value = [...statuses.value, next]
    }
  }

  async function getAll() {
    loading.value = true
    error.value = null
    try {
      const result = await fetchWrapper.get(baseUrl)
      statuses.value = result || []
    } catch (err) {
      error.value = err
      statuses.value = []
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
      updateLocal(result)
      return result
    } catch (err) {
      error.value = err
      throw err
    } finally {
      loading.value = false
    }
  }

  async function test(id) {
    loading.value = true
    error.value = null
    try {
      const result = await fetchWrapper.post(`${baseUrl}/${id}/test`, {})
      updateLocal(result)
      return result
    } catch (err) {
      error.value = err
      throw err
    } finally {
      loading.value = false
    }
  }

  async function startStream() {
    stopStream()
    const authStore = useAuthStore()
    const token = authStore.user?.token
    
    if (!token) {
      error.value = new Error('No authentication token available')
      return
    }
    
    // Create an AbortController before the initial fetch so we can
    // cancel both the fetch request and the subsequent stream
    const controller = new AbortController()
    streamController = controller

    try {
      const response = await fetch(`${baseUrl}/stream`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'text/event-stream',
          'Cache-Control': 'no-cache'
        },
        signal: controller.signal
      })
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      // If stopStream() was called while the fetch was in-flight, abort
      if (controller.signal.aborted) {
        return
      }

      streamReader = response.body?.getReader()
      if (!streamReader) {
        throw new Error('Response body is not readable')
      }

      const decoder = new TextDecoder()
      let buffer = ''

      while (!controller.signal.aborted) {
        const { done, value } = await streamReader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || '' // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = line.slice(6).trim()
              if (data) {
                const item = JSON.parse(data)
                updateLocal(item)
              }
            } catch (err) {
              error.value = err instanceof Error ? err : new Error(String(err))
              const isTest = typeof process !== 'undefined' && process.env && (process.env.VITEST || process.env.VITEST_WORKER_ID)
              if (enableLog && !isTest) {
                console.log('[device.statuses.store] SSE error:', { line: line, error: error.value })
              }
            }
          }
        }
      }
    } catch (err) {
      // Ignore AbortError triggered by stopStream()
      if (err?.name !== 'AbortError' && !controller.signal.aborted) {
        error.value = err instanceof Error ? err : new Error(String(err))
        const isTest = typeof process !== 'undefined' && process.env && (process.env.VITEST || process.env.VITEST_WORKER_ID)
        if (!isTest) {
          console.error('SSE stream error:', err)
        }
        // Implement retry logic here if needed
      }
    } finally {
      // Only clean up if this startStream call is still the active one
      if (streamController === controller) {
        streamReader = null
        streamController = null
      }
    }
  }

  function stopStream() {
    if (streamController) {
      streamController.abort()
      streamController = null
    }
    if (streamReader) {
      streamReader.cancel()
      streamReader = null
    }
  }

  return {
    statuses,
    loading,
    error,
    getAll,
    getById,
    test,
    startStream,
    stopStream
  }
})
