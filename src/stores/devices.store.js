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

const baseUrl = `${apiUrl}/devices`

export const useDevicesStore = defineStore('devices', () => {
  const devices = ref([])
  const device = ref(null)
  const loading = ref(false)
  const error = ref(null)

  const getDeviceById = (id) => {
    if (!devices || !Array.isArray(devices.value)) {
      return null
    }
    return devices.value.find(d => d && d.id === id)
  }

  async function register() {
    loading.value = true
    error.value = null
    try {
      const result = await fetchWrapper.post(`${baseUrl}/register`, {})
      getAll()
      return result
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
      devices.value = result || []
    } catch (err) {
      error.value = err
      devices.value = []
      throw err
    } finally {
      loading.value = false
    }
  }

  async function getAllByAccount(accountId) {
    loading.value = true
    error.value = null
    try {
      const url = accountId == null ? `${baseUrl}/by-account` : `${baseUrl}/by-account/${accountId}`
      const result = await fetchWrapper.get(url)
      devices.value = result || []
    } catch (err) {
      error.value = err
      devices.value = []
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
      device.value = result
    } catch (err) {
      error.value = err
      device.value = null
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

  async function deleteDevice(id) {
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

  async function assignGroup(id, params) {
    loading.value = true
    error.value = null
    try {
      await fetchWrapper.patch(`${baseUrl}/assign-group/${id}`, params)
      getAll()
    } catch (err) {
      error.value = err
      throw err
    } finally {
      loading.value = false
    }
  }

  async function initialAssignAccount(id, params) {
    loading.value = true
    error.value = null
    try {
      await fetchWrapper.patch(`${baseUrl}/initial-assign-account/${id}`, params)
      getAll()
    } catch (err) {
      error.value = err
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    devices,
    device,
    loading,
    error,
    getDeviceById,
    register,
    getAll,
    getAllByAccount,
    getById,
    update,
    delete: deleteDevice,
    assignGroup,
    initialAssignAccount
  }
})

