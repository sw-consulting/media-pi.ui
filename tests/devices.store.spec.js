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

  it('getAllByAccount sets devices from fetch', async () => {
    const store = useDevicesStore()
    fetchWrapper.get.mockResolvedValueOnce(mockDevices)
    await store.getAllByAccount(1)
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
    await store.assignGroup(1, { deviceGroupId: 2 })
    expect(fetchWrapper.patch).toHaveBeenCalled()
  })

  it('initialAssignAccount calls fetchWrapper.patch', async () => {
    const store = useDevicesStore()
    fetchWrapper.patch.mockResolvedValueOnce({})
    await store.initialAssignAccount(1, { accountId: 2 })
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

  it('getAllByAccount throws error and resets devices when fetch fails', async () => {
    const store = useDevicesStore()
    const mockError = new Error('GetAllByAccount failed')
    fetchWrapper.get.mockRejectedValueOnce(mockError)
    await expect(store.getAllByAccount(1)).rejects.toThrow('GetAllByAccount failed')
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
    await expect(store.assignGroup(1, { deviceGroupId: 2 })).rejects.toThrow('Assign failed')
    expect(store.error).toBe(mockError)
    expect(store.loading).toBe(false)
  })

  it('initialAssignAccount throws error and sets error state when fetch fails', async () => {
    const store = useDevicesStore()
    const mockError = new Error('InitialAssign failed')
    fetchWrapper.patch.mockRejectedValueOnce(mockError)
    await expect(store.initialAssignAccount(1, { accountId: 2 })).rejects.toThrow('InitialAssign failed')
    expect(store.error).toBe(mockError)
    expect(store.loading).toBe(false)
  })
})

