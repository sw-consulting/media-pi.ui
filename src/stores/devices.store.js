// Copyright (c) 2025 sw.consulting
// This file is a part of Media Pi  frontend application

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
  const lastLoaded = ref(null) // Track when data was last loaded

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
      getAll(true) // Force refresh after register
      return result
    } catch (err) {
      error.value = err
      throw err
    } finally {
      loading.value = false
    }
  }

  async function getAll(forceRefresh = false) {
    // Skip loading if data is fresh (loaded within last 30 seconds) and not forcing refresh
    if (!forceRefresh && lastLoaded.value && devices.value.length > 0) {
      const timeSinceLastLoad = Date.now() - lastLoaded.value
      if (timeSinceLastLoad < 30000) { // 30 seconds cache
        return devices.value
      }
    }

    loading.value = true
    error.value = null
    try {
      const result = await fetchWrapper.get(baseUrl)
      devices.value = result || []
      lastLoaded.value = Date.now()
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

  const buildDeviceUrl = (id, segments = []) => {
    const normalizedSegments = Array.isArray(segments) ? segments : [segments]
    const encodedSegments = normalizedSegments
      .filter(segment => segment !== undefined && segment !== null && segment !== '')
      .map(segment => encodeURIComponent(String(segment)))

    return [baseUrl, encodeURIComponent(String(id)), ...encodedSegments].join('/')
  }

  const executeDeviceRequest = async (method, id, segments = [], body) => {
    loading.value = true
    error.value = null

    const url = buildDeviceUrl(id, segments)
    const methodName = method.toLowerCase()

    try {
      if (!fetchWrapper[methodName]) {
        throw new Error(`Unsupported method: ${method}`)
      }

      if (methodName === 'get' || methodName === 'delete') {
        return await fetchWrapper[methodName](url)
      }

      return await fetchWrapper[methodName](url, body ?? {})
    } catch (err) {
      error.value = err
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
      getAll(true) // Force refresh after update
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
      getAll(true) // Force refresh after delete
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
      getAll(true) // Force refresh after assignment
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
      getAll(true) // Force refresh after assignment
    } catch (err) {
      error.value = err
      throw err
    } finally {
      loading.value = false
    }
  }

  const getConfiguration = (id) => executeDeviceRequest('get', id, ['configuration', 'get'])
  const updateConfiguration = (id, params) => executeDeviceRequest('put', id, ['configuration', 'update'], params)
  const reloadSystem = (id) => executeDeviceRequest('post', id, ['system', 'reload'])
  const rebootSystem = (id) => executeDeviceRequest('post', id, ['system', 'reboot'])
  const shutdownSystem = (id) => executeDeviceRequest('post', id, ['system', 'shutdown'])
  const startPlayback = (id) => executeDeviceRequest('post', id, ['playback', 'start'])
  const stopPlayback = (id) => executeDeviceRequest('post', id, ['playback', 'stop'])
  const buildUploadAction = (resource, action) => (id) =>
    executeDeviceRequest('post', id, [resource, `${action}-upload`])

  const startPlaylistUpload = buildUploadAction('playlist', 'start')
  const stopPlaylistUpload = buildUploadAction('playlist', 'stop')
  const startVideoUpload = buildUploadAction('video', 'start')
  const stopVideoUpload = buildUploadAction('video', 'stop')
  const getServiceStatus = (id) => executeDeviceRequest('get', id, ['service', 'status'])


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
    disableService,
    getConfiguration,
    updateConfiguration,
    reloadSystem,
    rebootSystem,
    shutdownSystem,
    startPlayback,
    stopPlayback,
    startPlaylistUpload,
    stopPlaylistUpload,
    startVideoUpload,
    stopVideoUpload,
    getServiceStatus
  }
})

