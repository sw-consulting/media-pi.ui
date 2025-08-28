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
import { useAuthStore } from '@/stores/auth.store.js'

const baseUrl = `${apiUrl}/deviceStatus`

export const useDeviceStatusesStore = defineStore('deviceStatuses', () => {
  const statuses = ref([])
  const loading = ref(false)
  const error = ref(null)
  let streamController = null
  let streamReader = null

  const updateLocal = (item) => {
    const idx = statuses.value.findIndex(s => s.deviceId === item.deviceId)
    if (idx >= 0) {
      statuses.value[idx] = item
    } else {
      statuses.value.push(item)
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
    
    try {
      const response = await fetch(`${baseUrl}/stream`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'text/event-stream',
          'Cache-Control': 'no-cache'
        }
      })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      streamReader = response.body?.getReader()
      if (!streamReader) {
        throw new Error('Response body is not readable')
      }
      
      const decoder = new TextDecoder()
      let buffer = ''
      
      // Create an AbortController to handle cancellation
      streamController = new AbortController()
      
      while (!streamController.signal.aborted) {
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
              console.error('Failed to parse SSE data:', err)
              error.value = err instanceof Error ? err : new Error(String(err))
            }
          }
        }
      }
    } catch (err) {
      if (!streamController?.signal.aborted) {
        error.value = err instanceof Error ? err : new Error(String(err))
        console.error('SSE stream error:', err)
        // Implement retry logic here if needed
      }
    } finally {
      streamReader = null
      streamController = null
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
