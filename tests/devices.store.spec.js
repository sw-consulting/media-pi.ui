// Copyright (c) 2025 sw.consulting
// This file is a part of Media Pi backend

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useDevicesStore } from '@/stores/devices.store.js'
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

const mockDevices = [
  { id: 1, name: 'Device 1' },
  { id: 2, name: 'Device 2' }
]

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
})

describe('devices.store', () => {
  it('getDeviceById returns correct device', () => {
    const store = useDevicesStore()
    store.$patch({ devices: mockDevices })

    expect(store.getDeviceById(1)).toEqual(mockDevices[0])
    expect(store.getDeviceById(999)).toBeUndefined()
  })

  it('register calls fetchWrapper.post', async () => {
    const store = useDevicesStore()
    fetchWrapper.post.mockResolvedValueOnce({ id: 3 })
    const res = await store.register()
    expect(fetchWrapper.post).toHaveBeenCalled()
    expect(res).toEqual({ id: 3 })
  })

  it('getAll sets devices from fetch', async () => {
    const store = useDevicesStore()
    fetchWrapper.get.mockResolvedValueOnce(mockDevices)
    await store.getAll()
    expect(store.devices).toEqual(mockDevices)
  })

  it('getByAccount sets devices from fetch', async () => {
    const store = useDevicesStore()
    fetchWrapper.get.mockResolvedValueOnce(mockDevices)
    await store.getByAccount(1)
    expect(store.devices).toEqual(mockDevices)
  })

  it('getById sets device from fetch', async () => {
    const store = useDevicesStore()
    fetchWrapper.get.mockResolvedValueOnce(mockDevices[0])
    await store.getById(1)
    expect(store.device).toEqual(mockDevices[0])
  })

  it('update calls fetchWrapper.put', async () => {
    const store = useDevicesStore()
    fetchWrapper.put.mockResolvedValueOnce({})
    await store.update(1, { name: 'Updated' })
    expect(fetchWrapper.put).toHaveBeenCalled()
  })

  it('delete calls fetchWrapper.delete', async () => {
    const store = useDevicesStore()
    fetchWrapper.delete.mockResolvedValueOnce({})
    await store.delete(1)
    expect(fetchWrapper.delete).toHaveBeenCalled()
  })

  it('assignGroup calls fetchWrapper.patch', async () => {
    const store = useDevicesStore()
    fetchWrapper.patch.mockResolvedValueOnce({})
    await store.assignGroup(1, 2)
    expect(fetchWrapper.patch).toHaveBeenCalled()
  })

  it('assignAccount calls fetchWrapper.patch', async () => {
    const store = useDevicesStore()
    fetchWrapper.patch.mockResolvedValueOnce({})
    await store.assignAccount(1, 2)
    expect(fetchWrapper.patch).toHaveBeenCalled()
  })

  it('register throws error and sets error state when fetch fails', async () => {
    const store = useDevicesStore()
    const mockError = new Error('Register failed')
    fetchWrapper.post.mockRejectedValueOnce(mockError)
    await expect(store.register()).rejects.toThrow('Register failed')
    expect(store.error).toBe(mockError)
    expect(store.loading).toBe(false)
  })

  it('getAll throws error and resets devices when fetch fails', async () => {
    const store = useDevicesStore()
    const mockError = new Error('GetAll failed')
    fetchWrapper.get.mockRejectedValueOnce(mockError)
    await expect(store.getAll()).rejects.toThrow('GetAll failed')
    expect(store.error).toBe(mockError)
    expect(store.devices).toEqual([])
    expect(store.loading).toBe(false)
  })

  it('getByAccount throws error and resets devices when fetch fails', async () => {
    const store = useDevicesStore()
    const mockError = new Error('getByAccount failed')
    fetchWrapper.get.mockRejectedValueOnce(mockError)
    await expect(store.getByAccount(1)).rejects.toThrow('getByAccount failed')
    expect(store.error).toBe(mockError)
    expect(store.devices).toEqual([])
    expect(store.loading).toBe(false)
  })

  it('getById throws error and resets device when fetch fails', async () => {
    const store = useDevicesStore()
    const mockError = new Error('GetById failed')
    fetchWrapper.get.mockRejectedValueOnce(mockError)
    await expect(store.getById(1)).rejects.toThrow('GetById failed')
    expect(store.error).toBe(mockError)
    expect(store.device).toBe(null)
    expect(store.loading).toBe(false)
  })

  it('update throws error and sets error state when fetch fails', async () => {
    const store = useDevicesStore()
    const mockError = new Error('Update failed')
    fetchWrapper.put.mockRejectedValueOnce(mockError)
    await expect(store.update(1, { name: 'Fail' })).rejects.toThrow('Update failed')
    expect(store.error).toBe(mockError)
    expect(store.loading).toBe(false)
  })

  it('delete throws error and sets error state when fetch fails', async () => {
    const store = useDevicesStore()
    const mockError = new Error('Delete failed')
    fetchWrapper.delete.mockRejectedValueOnce(mockError)
    await expect(store.delete(1)).rejects.toThrow('Delete failed')
    expect(store.error).toBe(mockError)
    expect(store.loading).toBe(false)
  })

  it('assignGroup throws error and sets error state when fetch fails', async () => {
    const store = useDevicesStore()
    const mockError = new Error('Assign failed')
    fetchWrapper.patch.mockRejectedValueOnce(mockError)
    await expect(store.assignGroup(1, 2)).rejects.toThrow('Assign failed')
    expect(store.error).toBe(mockError)
    expect(store.loading).toBe(false)
  })

  it('assignAccount throws error and sets error state when fetch fails', async () => {
    const store = useDevicesStore()
    const mockError = new Error('Assign failed')
    fetchWrapper.patch.mockRejectedValueOnce(mockError)
    await expect(store.assignAccount(1, 2)).rejects.toThrow('Assign failed')
    expect(store.error).toBe(mockError)
    expect(store.loading).toBe(false)
  })

  it('assignGroup handles null groupId by setting Id to 0', async () => {
    const store = useDevicesStore()
    fetchWrapper.patch.mockResolvedValueOnce({})
    await store.assignGroup(1, null)
    expect(fetchWrapper.patch).toHaveBeenCalledWith(
      expect.stringContaining('/assign-group/1'),
      { Id: 0 }
    )
  })

  it('assignAccount handles null accountId by setting Id to 0', async () => {
    const store = useDevicesStore()
    fetchWrapper.patch.mockResolvedValueOnce({})
    await store.assignAccount(1, null)
    expect(fetchWrapper.patch).toHaveBeenCalledWith(
      expect.stringContaining('/assign-account/1'),
      { Id: 0 }
    )
  })

  it('assignGroup creates correct DTO structure', async () => {
    const store = useDevicesStore()
    fetchWrapper.patch.mockResolvedValueOnce({})
    await store.assignGroup(1, 5)
    expect(fetchWrapper.patch).toHaveBeenCalledWith(
      expect.stringContaining('/assign-group/1'),
      { Id: 5 }
    )
  })

  it('assignAccount creates correct DTO structure', async () => {
    const store = useDevicesStore()
    fetchWrapper.patch.mockResolvedValueOnce({})
    await store.assignAccount(1, 3)
    expect(fetchWrapper.patch).toHaveBeenCalledWith(
      expect.stringContaining('/assign-account/1'),
      { Id: 3 }
    )
  })
})


