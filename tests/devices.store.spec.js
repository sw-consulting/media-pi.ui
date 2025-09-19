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

  it('listServices updates services and serviceResponse', async () => {
    const store = useDevicesStore()
    const mockResponse = {
      ok: true,
      units: [
        { unit: 'one', active: 'active', sub: 'running' },
        { unit: 'two', active: 'inactive', sub: 'dead' }
      ]
    }
    fetchWrapper.get.mockResolvedValueOnce(mockResponse)

    const result = await store.listServices(5)

    expect(fetchWrapper.get).toHaveBeenCalledWith(expect.stringContaining('/devices/5/services'))
    expect(store.services).toEqual(mockResponse.units)
    expect(store.serviceResponse).toEqual(mockResponse)
    expect(result).toEqual(mockResponse)
  })

  it('listServices resets state on error', async () => {
    const store = useDevicesStore()
    const mockError = new Error('List failed')
    fetchWrapper.get.mockRejectedValueOnce(mockError)

    await expect(store.listServices(6)).rejects.toThrow('List failed')
    expect(store.error).toBe(mockError)
    expect(store.services).toEqual([])
    expect(store.serviceResponse).toBe(null)
  })

  it.each([
    ['startService', 'start'],
    ['stopService', 'stop'],
    ['restartService', 'restart'],
    ['enableService', 'enable'],
    ['disableService', 'disable']
  ])('%s posts to the correct endpoint and updates response', async (method, action) => {
    const store = useDevicesStore()
    const mockResult = { ok: true, unit: 'media-pi.service', result: 'done' }
    fetchWrapper.post.mockResolvedValueOnce(mockResult)

    const returned = await store[method](10, ' media-pi.service ')

    expect(fetchWrapper.post).toHaveBeenCalledWith(
      expect.stringContaining(`/devices/10/services/media-pi.service/${action}`),
      {}
    )
    expect(store.serviceResponse).toEqual(mockResult)
    expect(returned).toEqual(mockResult)
  })

  it('service commands URL-encode unit names', async () => {
    const store = useDevicesStore()
    fetchWrapper.post.mockResolvedValueOnce({ ok: true })

    await store.startService(3, 'my service@1.service')

    expect(fetchWrapper.post).toHaveBeenCalledWith(
      expect.stringContaining('/devices/3/services/my%20service%401.service/start'),
      {}
    )
  })

  it('service commands validate unit name before sending request', async () => {
    const store = useDevicesStore()

    await expect(store.startService(4, '   ')).rejects.toThrow('Не указано имя службы')
    expect(fetchWrapper.post).not.toHaveBeenCalled()
    expect(store.error).toBeInstanceOf(Error)
    expect(store.serviceResponse).toBe(null)
  })

  it('service commands reset state when fetch fails', async () => {
    const store = useDevicesStore()
    const mockError = new Error('Command failed')
    fetchWrapper.post.mockRejectedValueOnce(mockError)

    await expect(store.stopService(7, 'media-pi.service')).rejects.toThrow('Command failed')
    expect(fetchWrapper.post).toHaveBeenCalled()
    expect(store.error).toBe(mockError)
    expect(store.serviceResponse).toBe(null)
  })
})

