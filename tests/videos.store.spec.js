// Copyright (c) 2025 sw.consulting
// This file is a part of Media Pi  frontend application

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useVideosStore } from '@/stores/videos.store.js'
import { fetchWrapper } from '@/helpers/fetch.wrapper.js'

vi.mock('@/helpers/fetch.wrapper.js', () => ({
  fetchWrapper: {
    get: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    postFile: vi.fn()
  }
}))

const mockVideos = [
  { id: 1, name: 'Video A' },
  { id: 2, name: 'Video B' }
]

const videoDetails = {
  id: 1,
  name: 'Video A',
  description: 'Test video'
}

describe('videos.store', () => {
  let originalFormData

  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    originalFormData = global.FormData
  })

  afterEach(() => {
    global.FormData = originalFormData
  })

  it('getAll loads videos', async () => {
    fetchWrapper.get.mockResolvedValueOnce(mockVideos)

    const store = useVideosStore()
    await store.getAll()

    expect(fetchWrapper.get).toHaveBeenCalledWith(expect.stringContaining('/videos'))
    expect(store.videos).toEqual(mockVideos)
  })

  it('getAll handles errors by resetting collection', async () => {
    const error = new Error('failed')
    fetchWrapper.get.mockRejectedValueOnce(error)

    const store = useVideosStore()

    await expect(store.getAll()).rejects.toThrow('failed')
    expect(store.videos).toEqual([])
    expect(store.error).toBe(error)
  })

  it('getById loads a single video', async () => {
    fetchWrapper.get.mockResolvedValueOnce(videoDetails)

    const store = useVideosStore()
    await store.getById(videoDetails.id)

    expect(fetchWrapper.get).toHaveBeenCalledWith(expect.stringContaining(`/videos/${videoDetails.id}`))
    expect(store.video).toEqual(videoDetails)
  })

  it('getById handles error by resetting video', async () => {
    const error = new Error('not found')
    fetchWrapper.get.mockRejectedValueOnce(error)

    const store = useVideosStore()

    await expect(store.getById(1)).rejects.toThrow('not found')
    expect(store.video).toBeNull()
    expect(store.error).toBe(error)
  })

  it('update puts data and refreshes list', async () => {
    fetchWrapper.put.mockResolvedValueOnce({})
    fetchWrapper.get.mockResolvedValueOnce(mockVideos)

    const store = useVideosStore()
    await store.update(1, { name: 'Updated Video' })

    expect(fetchWrapper.put).toHaveBeenCalledWith(expect.stringContaining('/videos/1'), { name: 'Updated Video' })
    expect(fetchWrapper.get).toHaveBeenCalled()
  })

  it('remove deletes data and refreshes list', async () => {
    fetchWrapper.delete.mockResolvedValueOnce({})
    fetchWrapper.get.mockResolvedValueOnce(mockVideos)

    const store = useVideosStore()
    await store.remove(1)

    expect(fetchWrapper.delete).toHaveBeenCalledWith(expect.stringContaining('/videos/1'))
    expect(fetchWrapper.get).toHaveBeenCalled()
  })

  it('uploadFile posts form data to video file endpoint', async () => {
    const appendSpy = vi.fn()
    const mockFormData = vi.fn(() => ({
      append: appendSpy
    }))
    global.FormData = mockFormData

    fetchWrapper.postFile.mockResolvedValueOnce({})
    fetchWrapper.get.mockResolvedValueOnce(videoDetails)

    const store = useVideosStore()
    store.video = videoDetails

    await store.uploadFile(1, new Blob(['test']), { language: 'ru' })

    expect(fetchWrapper.postFile).toHaveBeenCalledWith(expect.stringContaining('/videos/1/file'), expect.any(Object))
    expect(appendSpy).toHaveBeenCalledWith('file', expect.any(Blob))
    expect(appendSpy).toHaveBeenCalledWith('language', 'ru')
  })

  it('getAllByAccount loads videos scoped to account', async () => {
    fetchWrapper.get.mockResolvedValueOnce(mockVideos)

    const store = useVideosStore()
    await store.getAllByAccount(42)

    expect(fetchWrapper.get).toHaveBeenCalledWith(expect.stringContaining('/videos/account/42'))
    expect(store.videos).toEqual(mockVideos)
  })

  it('getAllByAccount handles errors by clearing collection', async () => {
    const error = new Error('bad account')
    fetchWrapper.get.mockRejectedValueOnce(error)

    const store = useVideosStore()

    await expect(store.getAllByAccount(42)).rejects.toThrow('bad account')
    expect(store.videos).toEqual([])
    expect(store.error).toBe(error)
  })
})
