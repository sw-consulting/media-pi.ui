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

const baseUrl = `${apiUrl}/deviceStatus`

export const useDeviceStatusesStore = defineStore('deviceStatuses', () => {
  const statuses = ref([])
  const loading = ref(false)
  const error = ref(null)
  let eventSource = null

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

  function startStream() {
    stopStream()
    const url = `${baseUrl}/stream`
    eventSource = new EventSource(url)
    eventSource.onmessage = (e) => {
      try {
        const item = JSON.parse(e.data)
        updateLocal(item)
      } catch (err) {
        error.value = err instanceof Error ? err : new Error(String(err))
      }
    }
      error.value = new Error('EventSource connection error' + (e && e.type ? `: ${e.type}` : ''))
    }
  }

  function stopStream() {
    if (eventSource) {
      eventSource.close()
      eventSource = null
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

