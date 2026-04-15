// Copyright (c) 2026 sw.consulting
// This file is a part of Media Pi frontend application

import { defineStore } from 'pinia'
import { ref } from 'vue'
import { fetchWrapper } from '@/helpers/fetch.wrapper.js'
import { apiUrl } from '@/helpers/config.js'
import { useAuthStore } from '@/stores/auth.store.js'

const baseUrl = `${apiUrl}/screenshots`
const defaultPageSize = 100
const maxPageSize = 1000

const createEmptyPagination = () => ({
  currentPage: 1,
  pageSize: defaultPageSize,
  totalCount: 0,
  totalPages: 0,
  hasNextPage: false,
  hasPreviousPage: false
})

const createEmptySorting = () => ({
  sortBy: 'id',
  sortOrder: 'asc'
})

function normalizeDateParam(value) {
  if (!value) return null

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString()
  }

  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString()
}

function extractFilename(disposition, fallback) {
  if (!disposition || !disposition.includes('filename=')) {
    return fallback
  }

  return disposition
    .split('filename=')[1]
    .replace(/["']/g, '')
    .trim() || fallback
}

export const useScreenshotsStore = defineStore('screenshots', () => {
  const screenshots = ref([])
  const screenshot = ref(null)
  const loading = ref(false)
  const error = ref(null)
  const totalCount = ref(0)
  const hasNextPage = ref(false)
  const hasPreviousPage = ref(false)
  const pagination = ref(createEmptyPagination())
  const sorting = ref(createEmptySorting())
  const activeFilters = ref({
    deviceId: null,
    from: null,
    to: null
  })

  const resetListState = () => {
    screenshots.value = []
    totalCount.value = 0
    hasNextPage.value = false
    hasPreviousPage.value = false
    pagination.value = createEmptyPagination()
    sorting.value = createEmptySorting()
  }

  const resolvePageSize = (requestedPageSize) => {
    if (requestedPageSize === -1) {
      const resolved = totalCount.value > 0 ? totalCount.value : defaultPageSize
      return Math.min(Math.max(resolved, 1), maxPageSize)
    }

    const numeric = Number(requestedPageSize)
    if (!Number.isFinite(numeric) || numeric <= 0) {
      return defaultPageSize
    }

    return Math.min(Math.trunc(numeric), maxPageSize)
  }

  async function getAllByDevice(deviceId, { from = null, to = null } = {}) {
    if (deviceId === null || deviceId === undefined) {
      resetListState()
      activeFilters.value = { deviceId: null, from: null, to: null }
      return []
    }

    const authStore = useAuthStore()
    const queryParams = new URLSearchParams({
      deviceId: String(deviceId),
      page: String(authStore.screenshots_page || 1),
      pageSize: String(resolvePageSize(authStore.screenshots_per_page)),
      sortBy: authStore.screenshots_sort_by?.[0]?.key || 'id',
      sortOrder: authStore.screenshots_sort_by?.[0]?.order || 'asc'
    })

    const normalizedFrom = normalizeDateParam(from)
    const normalizedTo = normalizeDateParam(to)

    if (normalizedFrom) {
      queryParams.append('from', normalizedFrom)
    }
    if (normalizedTo) {
      queryParams.append('to', normalizedTo)
    }

    loading.value = true
    error.value = null

    try {
      const response = await fetchWrapper.get(`${baseUrl}?${queryParams.toString()}`)
      screenshots.value = response?.items || []
      totalCount.value = response?.pagination?.totalCount || 0
      hasNextPage.value = response?.pagination?.hasNextPage || false
      hasPreviousPage.value = response?.pagination?.hasPreviousPage || false
      pagination.value = {
        ...createEmptyPagination(),
        ...(response?.pagination || {})
      }
      sorting.value = {
        ...createEmptySorting(),
        ...(response?.sorting || {})
      }
      activeFilters.value = {
        deviceId,
        from: normalizedFrom,
        to: normalizedTo
      }
      return screenshots.value
    } catch (err) {
      error.value = err
      resetListState()
      throw err
    } finally {
      loading.value = false
    }
  }

  async function open(id) {
    loading.value = true
    error.value = null

    try {
      const response = await fetchWrapper.getFile(`${baseUrl}/${id}`)
      const blob = await response.blob()
      const objectUrl = globalThis.URL.createObjectURL(blob)
      const filename = extractFilename(
        response?.headers?.get?.('Content-Disposition'),
        `screenshot-${id}`
      )

      screenshot.value = { id, filename, objectUrl }

      const openedWindow = globalThis.open?.(objectUrl, '_blank', 'noopener')
      if (!openedWindow && globalThis.document?.createElement) {
        const link = document.createElement('a')
        link.href = objectUrl
        link.download = filename
        document.body.appendChild(link)
        link.click()
        link.remove()
      }

      globalThis.setTimeout(() => {
        globalThis.URL.revokeObjectURL(objectUrl)
      }, 60000)

      return screenshot.value
    } catch (err) {
      error.value = err
      throw err
    } finally {
      loading.value = false
    }
  }

  async function remove(id) {
    loading.value = true
    error.value = null

    try {
      await fetchWrapper.delete(`${baseUrl}/${id}`)
      screenshots.value = screenshots.value.filter((item) => item.id !== id)
      totalCount.value = Math.max(0, totalCount.value - 1)
      pagination.value = {
        ...pagination.value,
        totalCount: Math.max(0, (pagination.value?.totalCount || 0) - 1)
      }
      return true
    } catch (err) {
      error.value = err
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    screenshots,
    screenshot,
    loading,
    error,
    totalCount,
    hasNextPage,
    hasPreviousPage,
    pagination,
    sorting,
    activeFilters,
    getAllByDevice,
    open,
    remove
  }
})
