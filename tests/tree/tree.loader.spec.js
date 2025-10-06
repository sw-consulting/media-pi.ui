// Copyright (c) 2025 sw.consulting
// This file is a part of Media Pi  frontend application

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { createLoadChildrenHandler } from '@/helpers/tree/tree.loader.js'

describe('Tree Loader Functions', () => {
  describe('createLoadChildrenHandler', () => {
    let loadedNodes, loadingNodes, devicesStore, deviceGroupsStore, alertStore
    let loadChildrenHandler

    beforeEach(() => {
      loadedNodes = ref(new Set())
      loadingNodes = ref(new Set())
      devicesStore = {
        getAll: vi.fn().mockResolvedValue()
      }
      deviceGroupsStore = {
        getAll: vi.fn().mockResolvedValue()
      }
      alertStore = {
        error: vi.fn()
      }

      loadChildrenHandler = createLoadChildrenHandler(
        loadedNodes,
        loadingNodes,
        devicesStore,
        deviceGroupsStore,
        alertStore
      )
    })

    it('should load devices for root-unassigned node', async () => {
      const item = { id: 'root-unassigned', name: 'Unassigned Devices' }

      await loadChildrenHandler(item)

      expect(devicesStore.getAll).toHaveBeenCalled()
      expect(loadedNodes.value.has('root-unassigned')).toBe(true)
      expect(loadingNodes.value.has('root-unassigned')).toBe(false)
    })

    it('should load devices and groups for account node', async () => {
      const item = { id: 'account-1', name: 'Account 1' }

      await loadChildrenHandler(item)

      expect(devicesStore.getAll).toHaveBeenCalled()
      expect(deviceGroupsStore.getAll).toHaveBeenCalled()
      expect(loadedNodes.value.has('account-1')).toBe(true)
      expect(loadingNodes.value.has('account-1')).toBe(false)
    })

    it('should prevent duplicate loading', async () => {
      const item = { id: 'root-unassigned', name: 'Unassigned Devices' }
      loadedNodes.value.add('root-unassigned')

      await loadChildrenHandler(item)

      expect(devicesStore.getAll).not.toHaveBeenCalled()
    })

    it('should prevent loading when already loading', async () => {
      const item = { id: 'root-unassigned', name: 'Unassigned Devices' }
      loadingNodes.value.add('root-unassigned')

      await loadChildrenHandler(item)

      expect(devicesStore.getAll).not.toHaveBeenCalled()
    })

    it('should load device groups for device group container node', async () => {
      const item = { id: 'account-1-groups', name: 'Device Groups' }

      await loadChildrenHandler(item)

      expect(deviceGroupsStore.getAll).toHaveBeenCalled()
      expect(devicesStore.getAll).not.toHaveBeenCalled() // Only groups needed
      expect(loadedNodes.value.has('account-1-groups')).toBe(true)
      expect(loadingNodes.value.has('account-1-groups')).toBe(false)
    })

    it('should handle loading errors', async () => {
      const item = { id: 'root-unassigned', name: 'Unassigned Devices' }
      const error = new Error('Network error')
      devicesStore.getAll.mockRejectedValue(error)

      await loadChildrenHandler(item)

      expect(alertStore.error).toHaveBeenCalledWith(
        'Не удалось загрузить данные для "Unassigned Devices": Network error'
      )
      expect(loadingNodes.value.has('root-unassigned')).toBe(false)
    })
  })
})

