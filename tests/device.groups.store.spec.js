// Copyright (c) 2025 sw.consulting
// This file is a part of Media Pi  frontend application

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useDeviceGroupsStore } from '@/stores/device.groups.store.js'
import { fetchWrapper } from '@/helpers/fetch.wrapper.js'

vi.mock('@/helpers/fetch.wrapper.js', () => {
  return {
    fetchWrapper: {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
      patch: vi.fn()
    }
  }
})

const mockGroups = [
  { id: 1, name: 'Group 1' },
  { id: 2, name: 'Group 2' }
]

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
})

describe('device.groups.store', () => {
  it('getGroupById returns correct group', () => {
    const store = useDeviceGroupsStore()
    store.$patch({ groups: mockGroups })

    expect(store.getGroupById(1)).toEqual(mockGroups[0])
    expect(store.getGroupById(999)).toBeUndefined()
  })

  it('add calls fetchWrapper.post', async () => {
    const store = useDeviceGroupsStore()
    fetchWrapper.post.mockResolvedValueOnce({})
    await store.add({ name: 'Group 3' })
    expect(fetchWrapper.post).toHaveBeenCalled()
  })

  it('getAll sets groups from fetch', async () => {
    const store = useDeviceGroupsStore()
    fetchWrapper.get.mockResolvedValueOnce(mockGroups)
    await store.getAll()
    expect(store.groups).toEqual(mockGroups)
  })

  it('getById sets group from fetch', async () => {
    const store = useDeviceGroupsStore()
    fetchWrapper.get.mockResolvedValueOnce(mockGroups[0])
    await store.getById(1)
    expect(store.group).toEqual(mockGroups[0])
  })

  it('update calls fetchWrapper.put', async () => {
    const store = useDeviceGroupsStore()
    fetchWrapper.put.mockResolvedValueOnce({})
    await store.update(1, { name: 'Updated' })
    expect(fetchWrapper.put).toHaveBeenCalled()
  })

  it('delete calls fetchWrapper.delete', async () => {
    const store = useDeviceGroupsStore()
    fetchWrapper.delete.mockResolvedValueOnce({})
    await store.delete(1)
    expect(fetchWrapper.delete).toHaveBeenCalled()
  })

  it('add throws error and sets error state when fetch fails', async () => {
    const store = useDeviceGroupsStore()
    const mockError = new Error('Add failed')
    fetchWrapper.post.mockRejectedValueOnce(mockError)
    await expect(store.add({ name: 'G' })).rejects.toThrow('Add failed')
    expect(store.error).toBe(mockError)
    expect(store.loading).toBe(false)
  })

  it('getAll throws error and resets groups when fetch fails', async () => {
    const store = useDeviceGroupsStore()
    const mockError = new Error('GetAll failed')
    fetchWrapper.get.mockRejectedValueOnce(mockError)
    await expect(store.getAll()).rejects.toThrow('GetAll failed')
    expect(store.error).toBe(mockError)
    expect(store.groups).toEqual([])
    expect(store.loading).toBe(false)
  })

  it('getById throws error and resets group when fetch fails', async () => {
    const store = useDeviceGroupsStore()
    const mockError = new Error('GetById failed')
    fetchWrapper.get.mockRejectedValueOnce(mockError)
    await expect(store.getById(1)).rejects.toThrow('GetById failed')
    expect(store.error).toBe(mockError)
    expect(store.group).toBe(null)
    expect(store.loading).toBe(false)
  })

  it('update throws error and sets error state when fetch fails', async () => {
    const store = useDeviceGroupsStore()
    const mockError = new Error('Update failed')
    fetchWrapper.put.mockRejectedValueOnce(mockError)
    await expect(store.update(1, { name: 'Fail' })).rejects.toThrow('Update failed')
    expect(store.error).toBe(mockError)
    expect(store.loading).toBe(false)
  })

  it('delete throws error and sets error state when fetch fails', async () => {
    const store = useDeviceGroupsStore()
    const mockError = new Error('Delete failed')
    fetchWrapper.delete.mockRejectedValueOnce(mockError)
    await expect(store.delete(1)).rejects.toThrow('Delete failed')
    expect(store.error).toBe(mockError)
    expect(store.loading).toBe(false)
  })
})


