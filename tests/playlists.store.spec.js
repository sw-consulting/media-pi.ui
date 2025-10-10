// Copyright (c) 2025 sw.consulting
// This file is a part of Media Pi  frontend application

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { usePlaylistsStore } from '@/stores/playlists.store.js'
import { fetchWrapper } from '@/helpers/fetch.wrapper.js'

vi.mock('@/helpers/fetch.wrapper.js', () => ({
  fetchWrapper: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    postFile: vi.fn()
  }
}))

const mockPlaylists = [
  { id: 1, name: 'Playlist A' },
  { id: 2, name: 'Playlist B' }
]

const mockDevices = [
  { id: 10, name: 'Device 10' }
]

const mockFiles = [
  { id: 100, name: 'File 1' }
]

describe('playlists.store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('getAll loads playlists', async () => {
    fetchWrapper.get.mockResolvedValueOnce(mockPlaylists)

    const store = usePlaylistsStore()
    await store.getAll()

    expect(fetchWrapper.get).toHaveBeenCalledWith(expect.stringContaining('/playlists'))
    expect(store.playlists).toEqual(mockPlaylists)
  })

  it('getAll handles errors by resetting collection', async () => {
    const error = new Error('failed')
    fetchWrapper.get.mockRejectedValueOnce(error)

    const store = usePlaylistsStore()

    await expect(store.getAll()).rejects.toThrow('failed')
    expect(store.playlists).toEqual([])
    expect(store.error).toBe(error)
  })

  it('getById loads a single playlist', async () => {
    const playlist = mockPlaylists[0]
    fetchWrapper.get.mockResolvedValueOnce(playlist)

    const store = usePlaylistsStore()
    await store.getById(playlist.id)

    expect(fetchWrapper.get).toHaveBeenCalledWith(expect.stringContaining(`/playlists/${playlist.id}`))
    expect(store.playlist).toEqual(playlist)
  })

  it('getById handles error by resetting playlist', async () => {
    const error = new Error('not found')
    fetchWrapper.get.mockRejectedValueOnce(error)

    const store = usePlaylistsStore()

    await expect(store.getById(1)).rejects.toThrow('not found')
    expect(store.playlist).toBeNull()
    expect(store.error).toBe(error)
  })

  it('create posts data and refreshes list', async () => {
    fetchWrapper.post.mockResolvedValueOnce({ id: 3 })
    fetchWrapper.get.mockResolvedValueOnce(mockPlaylists)

    const store = usePlaylistsStore()
    await store.create({ name: 'New Playlist' })

    expect(fetchWrapper.post).toHaveBeenCalledWith(expect.stringContaining('/playlists'), { name: 'New Playlist' })
    expect(fetchWrapper.get).toHaveBeenCalled()
  })

  it('update puts data and refreshes list', async () => {
    fetchWrapper.put.mockResolvedValueOnce({})
    fetchWrapper.get.mockResolvedValueOnce(mockPlaylists)

    const store = usePlaylistsStore()
    await store.update(1, { name: 'Updated Playlist' })

    expect(fetchWrapper.put).toHaveBeenCalledWith(expect.stringContaining('/playlists/1'), { name: 'Updated Playlist' })
    expect(fetchWrapper.get).toHaveBeenCalled()
  })

  it('remove deletes data and refreshes list', async () => {
    fetchWrapper.delete.mockResolvedValueOnce({})
    fetchWrapper.get.mockResolvedValueOnce(mockPlaylists)

    const store = usePlaylistsStore()
    await store.remove(1)

    expect(fetchWrapper.delete).toHaveBeenCalledWith(expect.stringContaining('/playlists/1'))
    expect(fetchWrapper.get).toHaveBeenCalled()
  })

  it('getDevices loads playlist devices', async () => {
    fetchWrapper.get.mockResolvedValueOnce(mockDevices)

    const store = usePlaylistsStore()
    await store.getDevices(1)

    expect(fetchWrapper.get).toHaveBeenCalledWith(expect.stringContaining('/playlists/1/devices'))
    expect(store.playlistDevices).toEqual(mockDevices)
  })

  it('addDevice posts payload and refreshes devices list', async () => {
    fetchWrapper.post.mockResolvedValueOnce({})
    fetchWrapper.get.mockResolvedValueOnce(mockDevices)

    const store = usePlaylistsStore()
    await store.addDevice(1, 10)

    expect(fetchWrapper.post).toHaveBeenCalledWith(expect.stringContaining('/playlists/1/devices'), { deviceId: 10 })
    expect(fetchWrapper.get).toHaveBeenCalledWith(expect.stringContaining('/playlists/1/devices'))
  })

  it('removeDevice deletes device and refreshes list', async () => {
    fetchWrapper.delete.mockResolvedValueOnce({})
    fetchWrapper.get.mockResolvedValueOnce(mockDevices)

    const store = usePlaylistsStore()
    await store.removeDevice(1, 10)

    expect(fetchWrapper.delete).toHaveBeenCalledWith(expect.stringContaining('/playlists/1/devices/10'))
    expect(fetchWrapper.get).toHaveBeenCalledWith(expect.stringContaining('/playlists/1/devices'))
  })

  it('getMediaFiles loads playlist files', async () => {
    fetchWrapper.get.mockResolvedValueOnce(mockFiles)

    const store = usePlaylistsStore()
    await store.getMediaFiles(1)

    expect(fetchWrapper.get).toHaveBeenCalledWith(expect.stringContaining('/playlists/1/files'))
    expect(store.playlistMediaFiles).toEqual(mockFiles)
  })

  it('addMediaFile uses post for JSON payloads', async () => {
    fetchWrapper.post.mockResolvedValueOnce({})
    fetchWrapper.get.mockResolvedValueOnce(mockFiles)

    const store = usePlaylistsStore()
    await store.addMediaFile(1, { name: 'File' })

    expect(fetchWrapper.post).toHaveBeenCalledWith(expect.stringContaining('/playlists/1/files'), { name: 'File' })
    expect(fetchWrapper.get).toHaveBeenCalledWith(expect.stringContaining('/playlists/1/files'))
  })

  it('addMediaFile uses postFile when payload is FormData', async () => {
    const formData = new FormData()
    fetchWrapper.postFile.mockResolvedValueOnce({})
    fetchWrapper.get.mockResolvedValueOnce(mockFiles)

    const store = usePlaylistsStore()
    await store.addMediaFile(1, formData)

    expect(fetchWrapper.postFile).toHaveBeenCalledWith(expect.stringContaining('/playlists/1/files'), formData)
    expect(fetchWrapper.get).toHaveBeenCalledWith(expect.stringContaining('/playlists/1/files'))
  })

  it('updateMediaFile uses put for JSON payloads', async () => {
    fetchWrapper.put.mockResolvedValueOnce({})
    fetchWrapper.get.mockResolvedValueOnce(mockFiles)

    const store = usePlaylistsStore()
    await store.updateMediaFile(1, 100, { name: 'Updated File' })

    expect(fetchWrapper.put).toHaveBeenCalledWith(expect.stringContaining('/playlists/1/files/100'), { name: 'Updated File' })
    expect(fetchWrapper.get).toHaveBeenCalledWith(expect.stringContaining('/playlists/1/files'))
  })

  it('updateMediaFile uses postFile for FormData payloads', async () => {
    const formData = new FormData()
    fetchWrapper.postFile.mockResolvedValueOnce({})
    fetchWrapper.get.mockResolvedValueOnce(mockFiles)

    const store = usePlaylistsStore()
    await store.updateMediaFile(1, 100, formData)

    expect(fetchWrapper.postFile).toHaveBeenCalledWith(expect.stringContaining('/playlists/1/files/100'), formData)
    expect(fetchWrapper.get).toHaveBeenCalledWith(expect.stringContaining('/playlists/1/files'))
  })

  it('removeMediaFile deletes file and refreshes list', async () => {
    fetchWrapper.delete.mockResolvedValueOnce({})
    fetchWrapper.get.mockResolvedValueOnce(mockFiles)

    const store = usePlaylistsStore()
    await store.removeMediaFile(1, 100)

    expect(fetchWrapper.delete).toHaveBeenCalledWith(expect.stringContaining('/playlists/1/files/100'))
    expect(fetchWrapper.get).toHaveBeenCalledWith(expect.stringContaining('/playlists/1/files'))
  })

  it('reorderMediaFiles posts payload and refreshes list', async () => {
    fetchWrapper.post.mockResolvedValueOnce({})
    fetchWrapper.get.mockResolvedValueOnce(mockFiles)

    const store = usePlaylistsStore()
    await store.reorderMediaFiles(1, { order: [1, 2, 3] })

    expect(fetchWrapper.post).toHaveBeenCalledWith(expect.stringContaining('/playlists/1/files/reorder'), { order: [1, 2, 3] })
    expect(fetchWrapper.get).toHaveBeenCalledWith(expect.stringContaining('/playlists/1/files'))
  })
})
