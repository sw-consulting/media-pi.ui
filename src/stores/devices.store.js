// Copyright (c) 2025 sw.consulting
// This file is a part of Media Pi backend

import { defineStore } from 'pinia'
import { ref } from 'vue'
import { fetchWrapper } from '@/helpers/fetch.wrapper.js'
import { apiUrl } from '@/helpers/config.js'

const baseUrl = `${apiUrl}/devices`

export const useDevicesStore = defineStore('devices', () => {
  const devices = ref([])
  const device = ref(null)
  const services = ref([])
  const serviceResponse = ref(null)
  const loading = ref(false)
  const error = ref(null)

  const sanitizeServiceUnit = (unit) => {
    if (typeof unit !== 'string') {
      return ''
    }
    return unit.trim()
  }

  const getDeviceById = (id) => {
    if (!devices.value || !Array.isArray(devices.value)) {
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

  async function getByAccount(accountId) {
    loading.value = true
    error.value = null
    try {
      const url = accountId === null ? `${baseUrl}/by-account` : `${baseUrl}/by-account/${accountId}`
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

  async function listServices(id) {
    loading.value = true
    error.value = null
    try {
      const result = await fetchWrapper.get(`${baseUrl}/${id}/services`)
      const units = Array.isArray(result?.units) ? result.units : []
      services.value = units
      serviceResponse.value = result
      return result
    } catch (err) {
      error.value = err
      services.value = []
      serviceResponse.value = null
      throw err
    } finally {
      loading.value = false
    }
  }

  async function executeServiceAction(id, unit, action) {
    loading.value = true
    error.value = null
    try {
      const sanitizedUnit = sanitizeServiceUnit(unit)
      if (!sanitizedUnit) {
        const validationError = new Error('Не указано имя службы')
        validationError.status = 400
        throw validationError
      }
      const result = await fetchWrapper.post(
        `${baseUrl}/${id}/services/${encodeURIComponent(sanitizedUnit)}/${action}`,
        {}
      )
      serviceResponse.value = result
      return result
    } catch (err) {
      error.value = err
      serviceResponse.value = null
      throw err
    } finally {
      loading.value = false
    }
  }

  async function startService(id, unit) {
    return executeServiceAction(id, unit, 'start')
  }

  async function stopService(id, unit) {
    return executeServiceAction(id, unit, 'stop')
  }

  async function restartService(id, unit) {
    return executeServiceAction(id, unit, 'restart')
  }

  async function enableService(id, unit) {
    return executeServiceAction(id, unit, 'enable')
  }

  async function disableService(id, unit) {
    return executeServiceAction(id, unit, 'disable')
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

  async function assignGroup(id, groupId) {
    loading.value = true
    error.value = null
    try {
      const params = { Id: groupId ?? 0 }
      await fetchWrapper.patch(`${baseUrl}/assign-group/${id}`, params)
      getAll()
    } catch (err) {
      error.value = err
      throw err
    } finally {
      loading.value = false
    }
  }

  async function assignAccount(id, accountId) {
    loading.value = true
    error.value = null
    try {
      const params = { Id: accountId ?? 0 }
      await fetchWrapper.patch(`${baseUrl}/assign-account/${id}`, params)
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
    services,
    serviceResponse,
    loading,
    error,
    getDeviceById,
    register,
    getAll,
    getByAccount,
    getById,
    listServices,
    update,
    delete: deleteDevice,
    assignGroup,
    assignAccount,
    startService,
    stopService,
    restartService,
    enableService,
    disableService
  }
})

