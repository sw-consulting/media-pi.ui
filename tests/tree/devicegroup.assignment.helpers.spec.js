// Copyright (c) 2025 sw.consulting
// This file is a part of Media Pi  frontend application

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { createDeviceGroupAssignmentActions } from '@/helpers/tree/devicegroup.assignment.helpers.js'

describe('createDeviceGroupAssignmentActions', () => {
  let deviceGroupAssignmentState
  let transitioningDevices
  let mockDevicesStore
  let mockAlertStore
  let actions

  const mockItem = {
    id: 'device-123-account-456-unassigned'
  }

  beforeEach(() => {
    deviceGroupAssignmentState = ref({})
    transitioningDevices = ref(new Set())
    
    mockDevicesStore = {
      assignGroup: vi.fn()
    }
    
    mockAlertStore = {
      error: vi.fn()
    }

    actions = createDeviceGroupAssignmentActions(
      deviceGroupAssignmentState,
      transitioningDevices,
      mockDevicesStore,
      mockAlertStore
    )
  })

  describe('startDeviceGroupAssignment', () => {
    it('should initialize assignment state for valid device', () => {
      actions.startDeviceGroupAssignment(mockItem)

      expect(deviceGroupAssignmentState.value[123]).toEqual({
        editMode: true,
        selectedGroupId: null
      })
    })

    it('should show error for invalid device item', () => {
      actions.startDeviceGroupAssignment({ id: 'invalid-item' })

      expect(mockAlertStore.error).toHaveBeenCalledWith(
        'Не удалось определить ID устройства для назначения группы'
      )
    })

    it('should preserve other device states', () => {
      deviceGroupAssignmentState.value = { 999: { editMode: false, selectedGroupId: 5 } }
      
      actions.startDeviceGroupAssignment(mockItem)

      expect(deviceGroupAssignmentState.value[999]).toEqual({
        editMode: false,
        selectedGroupId: 5
      })
    })
  })

  describe('cancelDeviceGroupAssignment', () => {
    it('should reset assignment state', () => {
      deviceGroupAssignmentState.value = {
        123: { editMode: true, selectedGroupId: 5 }
      }

      actions.cancelDeviceGroupAssignment(mockItem)

      expect(deviceGroupAssignmentState.value[123]).toEqual({
        editMode: false,
        selectedGroupId: null
      })
    })

    it('should handle missing device state gracefully', () => {
      actions.cancelDeviceGroupAssignment(mockItem)
      
      // Should not throw error
      expect(deviceGroupAssignmentState.value[123]).toBeUndefined()
    })
  })

  describe('confirmDeviceGroupAssignment', () => {
    beforeEach(() => {
      deviceGroupAssignmentState.value = {
        123: { editMode: true, selectedGroupId: 5 }
      }
    })

    it('should successfully assign device to group', async () => {
      mockDevicesStore.assignGroup.mockResolvedValue()

      await actions.confirmDeviceGroupAssignment(mockItem)

      expect(transitioningDevices.value.has(123)).toBe(false)
      expect(mockDevicesStore.assignGroup).toHaveBeenCalledWith(123, 5)
      expect(deviceGroupAssignmentState.value[123]).toEqual({
        editMode: false,
        selectedGroupId: null
      })
    })

    it('should handle assignment errors', async () => {
      const error = new Error('API Error')
      mockDevicesStore.assignGroup.mockRejectedValue(error)

      await actions.confirmDeviceGroupAssignment(mockItem)

      expect(transitioningDevices.value.has(123)).toBe(false)
      expect(mockAlertStore.error).toHaveBeenCalledWith(
        'Ошибка при назначении группы: API Error'
      )
    })

    it('should show error when no group selected', async () => {
      deviceGroupAssignmentState.value[123].selectedGroupId = null

      await actions.confirmDeviceGroupAssignment(mockItem)

      expect(mockAlertStore.error).toHaveBeenCalledWith(
        'Не выбрана группа для назначения'
      )
      expect(mockDevicesStore.assignGroup).not.toHaveBeenCalled()
    })

    it('should prevent race conditions using transitioning state', async () => {
      mockDevicesStore.assignGroup.mockImplementation(async () => {
        // Verify device is in transitioning state during API call
        expect(transitioningDevices.value.has(123)).toBe(true)
      })

      await actions.confirmDeviceGroupAssignment(mockItem)

      // Verify device is removed from transitioning state after completion
      expect(transitioningDevices.value.has(123)).toBe(false)
    })
  })

  describe('updateSelectedDeviceGroup', () => {
    it('should update selected group for device', () => {
      deviceGroupAssignmentState.value = {
        123: { editMode: true, selectedGroupId: null }
      }

      actions.updateSelectedDeviceGroup(123, 7)

      expect(deviceGroupAssignmentState.value[123]).toEqual({
        editMode: true,
        selectedGroupId: 7
      })
    })

    it('should create new state if device not exists', () => {
      actions.updateSelectedDeviceGroup(123, 7)

      expect(deviceGroupAssignmentState.value[123]).toEqual({
        selectedGroupId: 7
      })
    })

    it('should preserve other device states', () => {
      deviceGroupAssignmentState.value = {
        123: { editMode: true, selectedGroupId: null },
        999: { editMode: false, selectedGroupId: 3 }
      }

      actions.updateSelectedDeviceGroup(123, 7)

      expect(deviceGroupAssignmentState.value[999]).toEqual({
        editMode: false,
        selectedGroupId: 3
      })
    })
  })
})

