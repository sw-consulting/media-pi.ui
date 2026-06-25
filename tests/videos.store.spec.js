// Copyright (c) 2025 sw.consulting
// This file is a part of Media Pi  frontend application

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useVideosStore } from '@/stores/videos.store.js'
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

/* global Blob, File */

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
    vi.unstubAllGlobals()
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

  it('open requests playback token and stores stream url', async () => {
    fetchWrapper.post.mockResolvedValueOnce({
      token: 'token-11',
      expiresAt: '2026-06-02T11:00:00Z',
      url: '/api/videos/11/file?playbackToken=token-11'
    })

    const store = useVideosStore()
    const result = await store.open(11)

    expect(fetchWrapper.post).toHaveBeenCalledWith(expect.stringContaining('/videos/11/playback-token'))
    expect(result).toEqual({
      id: 11,
      filename: 'video-11',
      streamUrl: 'http://localhost:8080/api/videos/11/file?playbackToken=token-11',
      expiresAt: '2026-06-02T11:00:00Z'
    })
    expect(store.videoPreview).toEqual(result)
    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
  })

  it('open builds stream url from token when response has no url', async () => {
    fetchWrapper.post.mockResolvedValueOnce({
      token: 'fallback-token',
      expiresAt: '2026-06-02T12:00:00Z'
    })

    const store = useVideosStore()
    const result = await store.open(12)

    expect(result.filename).toBe('video-12')
    expect(result.streamUrl).toBe('http://localhost:8080/api/videos/12/file?playbackToken=fallback-token')
  })

  it('open uses loaded video original filename as filename fallback', async () => {
    fetchWrapper.post.mockResolvedValueOnce({
      token: 'title-token',
      url: '/api/videos/1/file?playbackToken=title-token'
    })

    const store = useVideosStore()
    store.video = { id: 1, title: 'Clip title', originalFilename: 'clip.mp4' }
    const result = await store.open(1)

    expect(result.filename).toBe('clip.mp4')
  })

  it('open sets error state and rethrows when preview loading fails', async () => {
    const error = new Error('preview failed')
    fetchWrapper.post.mockRejectedValueOnce(error)

    const store = useVideosStore()

    await expect(store.open(13)).rejects.toThrow('preview failed')
    expect(store.error).toBe(error)
    expect(store.loading).toBe(false)
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

  it('removeBatch posts selected ids and leaves scoped refresh to the caller', async () => {
    const response = { requestedCount: 2, deletedIds: [1, 2], failures: [] }
    fetchWrapper.post.mockResolvedValueOnce(response)

    const store = useVideosStore()
    const result = await store.removeBatch([1, 2])

    expect(fetchWrapper.post).toHaveBeenCalledWith(expect.stringContaining('/videos/delete/batch'), { ids: [1, 2] })
    expect(fetchWrapper.get).not.toHaveBeenCalled()
    expect(result).toEqual(response)
  })

  it('removeBatch throws when no ids are selected', async () => {
    const store = useVideosStore()

    await expect(store.removeBatch([])).rejects.toThrow('Не выбраны видеофайлы')
    expect(fetchWrapper.post).not.toHaveBeenCalled()
  })

  it('updateCategoryBatch posts selected ids and required category id', async () => {
    const response = { requestedCount: 2, updatedIds: [1, 2], failures: [] }
    fetchWrapper.post.mockResolvedValueOnce(response)

    const store = useVideosStore()
    const result = await store.updateCategoryBatch([1, 2], 0)

    expect(fetchWrapper.post).toHaveBeenCalledWith(expect.stringContaining('/videos/category/batch'), { ids: [1, 2], categoryId: 0 })
    expect(result).toEqual(response)
  })

  it('updateCategoryBatch forwards force cleanup option', async () => {
    fetchWrapper.post.mockResolvedValueOnce({ requestedCount: 1, updatedIds: [1], failures: [] })

    const store = useVideosStore()
    await store.updateCategoryBatch([1], 5, { forcePlaylistCleanup: true })

    expect(fetchWrapper.post).toHaveBeenCalledWith(expect.stringContaining('/videos/category/batch'), { ids: [1], categoryId: 5, forcePlaylistCleanup: true })
  })

  it('updateCategoryBatch requires a numeric category id', async () => {
    const store = useVideosStore()

    await expect(store.updateCategoryBatch([1], null)).rejects.toThrow('Не выбрана категория')
    expect(fetchWrapper.post).not.toHaveBeenCalled()
  })

  it('uploadFile posts to /videos/upload with File, Title and AccountId (new signature)', async () => {
    const appendSpy = vi.fn()
    const mockFormData = vi.fn(function () {
      return {
        append: appendSpy
      }
    })
    global.FormData = mockFormData

    fetchWrapper.postFile.mockResolvedValueOnce({})

    const store = useVideosStore()

    await store.uploadFile(new Blob(['test']), 99, 'Created Video')

    expect(fetchWrapper.postFile).toHaveBeenCalledWith(expect.stringContaining('/videos/upload'), expect.any(Object))
    expect(appendSpy).toHaveBeenCalledWith('File', expect.any(Blob))
    expect(appendSpy).toHaveBeenCalledWith('Title', 'Created Video')
    expect(appendSpy).toHaveBeenCalledWith('AccountId', 99)
  })

  it('uploadFile appends CategoryId only when provided in options', async () => {
    const appendSpy = vi.fn()
    const mockFormData = vi.fn(function () {
      return {
        append: appendSpy
      }
    })
    global.FormData = mockFormData

    fetchWrapper.postFile.mockResolvedValueOnce({})

    const store = useVideosStore()
    const file = new File(['one'], 'one.mp4', { type: 'video/mp4' })

    await store.uploadFile(file, 0, '', { categoryId: 5 })

    expect(appendSpy).toHaveBeenCalledWith('CategoryId', 5)
  })

  it('uploadFile forwards upload progress callback', async () => {
    const appendSpy = vi.fn()
    const mockFormData = vi.fn(function () {
      return {
        append: appendSpy
      }
    })
    global.FormData = mockFormData

    fetchWrapper.postFile.mockResolvedValueOnce({})

    const store = useVideosStore()
    const file = new File(['one'], 'one.mp4', { type: 'video/mp4' })
    const onUploadProgress = vi.fn()
    const abortController = new AbortController()

    await store.uploadFile(file, 7, '', { onUploadProgress, signal: abortController.signal })

    expect(fetchWrapper.postFile).toHaveBeenCalledWith(
      expect.stringContaining('/videos/upload'),
      expect.any(Object),
      { onUploadProgress, signal: abortController.signal }
    )
  })

  it('uploadFile throws when missing File (Russian message)', async () => {
    const store = useVideosStore()
    await expect(store.uploadFile(null, 1, 'X')).rejects.toThrow('Не выбран видеофайл')
  })

  it('uploadFile derives title from full file name when title empty', async () => {
    const appendSpy = vi.fn()
    const mockFormData = vi.fn(function () { return { append: appendSpy } })
    global.FormData = mockFormData
    fetchWrapper.postFile.mockResolvedValueOnce({})
    const store = useVideosStore()
    const file = new File(['data'], 'derived-name.mp4', { type: 'video/mp4' })
    await store.uploadFile(file, 7, '')
    expect(appendSpy).toHaveBeenCalledWith('Title', 'derived-name.mp4')
  })

  it('uploadFile throws when missing AccountId (Russian message)', async () => {
    const store = useVideosStore()
    await expect(store.uploadFile(new Blob(['x']), undefined, 'X')).rejects.toThrow('Не выбран лицевой счёт')
  })

  it('uploadFile allows empty title when file has no name (stores empty Title)', async () => {
    const appendSpy = vi.fn()
    const mockFormData = vi.fn(function () { return { append: appendSpy } })
    global.FormData = mockFormData
    const store = useVideosStore()
    const file = new Blob(['data']) // no name property to derive from
    await store.uploadFile(file, 5, '')
    expect(appendSpy).toHaveBeenCalledWith('Title', '')
  })

  it('getAllByAccount loads videos scoped to account', async () => {
    fetchWrapper.get.mockResolvedValueOnce(mockVideos)

    const store = useVideosStore()
    await store.getAllByAccount(42)

    expect(fetchWrapper.get).toHaveBeenCalledWith(expect.stringContaining('/videos/by-account/42'))
    expect(store.videos).toEqual(mockVideos)
  })

  it('getAllByAccount includes category query when provided', async () => {
    fetchWrapper.get.mockResolvedValueOnce(mockVideos)

    const store = useVideosStore()
    await store.getAllByAccount(0, { categoryId: 7 })

    expect(fetchWrapper.get).toHaveBeenCalledWith(expect.stringContaining('/videos/by-account/0?categoryId=7'))
  })

  it('getAllByAccount includes availableForAccountId query when provided', async () => {
    const store = useVideosStore()
    fetchWrapper.get.mockResolvedValueOnce([])

    await store.getAllByAccount(0, { availableForAccountId: 12 })

    expect(fetchWrapper.get).toHaveBeenCalledWith(expect.stringContaining('/videos/by-account/0?availableForAccountId=12'))
  })

  it('getAllByAccount handles errors by clearing collection', async () => {
    const error = new Error('bad account')
    fetchWrapper.get.mockRejectedValueOnce(error)

    const store = useVideosStore()

    await expect(store.getAllByAccount(42)).rejects.toThrow('bad account')
    expect(store.videos).toEqual([])
    expect(store.error).toBe(error)
  })

  it('getAllByAccount returns early without making API call when accountId is null', async () => {
    fetchWrapper.get.mockResolvedValueOnce([])
    const store = useVideosStore()
    await store.getAllByAccount(null)
    expect(fetchWrapper.get).not.toHaveBeenCalled()
  })
})
