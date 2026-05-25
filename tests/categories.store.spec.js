// Copyright (c) 2025 sw.consulting
// This file is a part of Media Pi frontend application

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useCategoriesStore } from '@/stores/categories.store.js'
import { fetchWrapper } from '@/helpers/fetch.wrapper.js'

vi.mock('@/helpers/fetch.wrapper.js', () => ({
  fetchWrapper: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn()
  }
}))

const mockCategories = [
  { id: 1, title: 'Movies', free: true },
  { id: 2, title: 'Sport', free: false }
]

describe('categories.store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('getAll loads categories', async () => {
    fetchWrapper.get.mockResolvedValueOnce(mockCategories)

    const store = useCategoriesStore()
    await store.getAll()

    expect(fetchWrapper.get).toHaveBeenCalledWith(expect.stringContaining('/categories'))
    expect(store.categories).toEqual(mockCategories)
  })

  it('getAll resets categories on error', async () => {
    const error = new Error('failed')
    fetchWrapper.get.mockRejectedValueOnce(error)

    const store = useCategoriesStore()

    await expect(store.getAll()).rejects.toThrow('failed')
    expect(store.categories).toEqual([])
    expect(store.error).toBe(error)
    expect(store.loading).toBe(false)
  })

  it('getById loads a single category', async () => {
    fetchWrapper.get.mockResolvedValueOnce(mockCategories[0])

    const store = useCategoriesStore()
    await store.getById(1)

    expect(fetchWrapper.get).toHaveBeenCalledWith(expect.stringContaining('/categories/1'))
    expect(store.category).toEqual(mockCategories[0])
  })

  it('getById resets category on error', async () => {
    const error = new Error('not found')
    fetchWrapper.get.mockRejectedValueOnce(error)

    const store = useCategoriesStore()

    await expect(store.getById(1)).rejects.toThrow('not found')
    expect(store.category).toBeNull()
    expect(store.error).toBe(error)
  })

  it('create posts data and refreshes list', async () => {
    fetchWrapper.post.mockResolvedValueOnce({ id: 3 })
    fetchWrapper.get.mockResolvedValueOnce(mockCategories)

    const store = useCategoriesStore()
    await store.create({ title: 'News', free: true })

    expect(fetchWrapper.post).toHaveBeenCalledWith(expect.stringContaining('/categories'), { title: 'News', free: true })
    expect(fetchWrapper.get).toHaveBeenCalled()
  })

  it('update puts data and refreshes list', async () => {
    fetchWrapper.put.mockResolvedValueOnce({})
    fetchWrapper.get.mockResolvedValueOnce(mockCategories)

    const store = useCategoriesStore()
    await store.update(1, { title: 'Cinema', free: false })

    expect(fetchWrapper.put).toHaveBeenCalledWith(expect.stringContaining('/categories/1'), { title: 'Cinema', free: false })
    expect(fetchWrapper.get).toHaveBeenCalled()
  })

  it('remove deletes data and refreshes list', async () => {
    fetchWrapper.delete.mockResolvedValueOnce({})
    fetchWrapper.get.mockResolvedValueOnce(mockCategories)

    const store = useCategoriesStore()
    await store.remove(1)

    expect(fetchWrapper.delete).toHaveBeenCalledWith(expect.stringContaining('/categories/1'))
    expect(fetchWrapper.get).toHaveBeenCalled()
  })
})
