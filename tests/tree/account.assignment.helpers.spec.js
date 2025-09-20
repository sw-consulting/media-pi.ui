// Copyright (c) 2025 sw.consulting
// This file is a part of Media Pi  frontend application

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { createAccountAssignmentActions } from '@/helpers/tree/account.assignment.helpers.js'

describe('Account Assignment Helper Functions', () => {
  let accountAssignmentState, transitioningDevices, mockDevicesStore, mockAlertStore, actions

  beforeEach(() => {
    accountAssignmentState = ref({})
    transitioningDevices = ref(new Set())
    
    mockDevicesStore = {
      assignAccount: vi.fn().mockResolvedValue()
    }
    
    mockAlertStore = {
      error: vi.fn()
    }

    actions = createAccountAssignmentActions(
      accountAssignmentState,
      transitioningDevices,
      mockDevicesStore,
      mockAlertStore
    )
  })

  describe('startAccountAssignment', () => {
    it('should start assignment mode for valid device', () => {
      const item = { id: 'device-123' }
      
      actions.startAccountAssignment(item)
      
      expect(accountAssignmentState.value[123]).toEqual({
        editMode: true,
        selectedAccountId: null
      })
    })

    it('should show error for invalid device', () => {
      const item = { id: 'account-123' }
      
      actions.startAccountAssignment(item)
      
      expect(mockAlertStore.error).toHaveBeenCalledWith(
        'Не удалось определить ID устройства для назначения'
      )
    })
  })

  describe('cancelAccountAssignment', () => {
    it('should cancel assignment mode for device', () => {
      const item = { id: 'device-123' }
      accountAssignmentState.value[123] = { editMode: true, selectedAccountId: 456 }
      
      actions.cancelAccountAssignment(item)
      
      expect(accountAssignmentState.value[123]).toEqual({
        editMode: false,
        selectedAccountId: null
      })
    })

    it('should handle device without assignment state', () => {
      const item = { id: 'device-999' }
      
      expect(() => actions.cancelAccountAssignment(item)).not.toThrow()
    })
  })

  describe('updateSelectedAccount', () => {
    it('should update selected account for device', () => {
      accountAssignmentState.value[123] = { editMode: true, selectedAccountId: null }
      
      actions.updateSelectedAccount(123, 456)
      
      expect(accountAssignmentState.value[123]).toEqual({
        editMode: true,
        selectedAccountId: 456
      })
    })

    it('should create assignment state if it does not exist', () => {
      actions.updateSelectedAccount(123, 456)
      
      expect(accountAssignmentState.value[123]).toEqual({
        selectedAccountId: 456
      })
    })
  })

  describe('confirmAccountAssignment', () => {
    it('should successfully assign account', async () => {
      const item = { id: 'device-123' }
      accountAssignmentState.value[123] = { editMode: true, selectedAccountId: 456 }
      
      await actions.confirmAccountAssignment(item)
      
      expect(transitioningDevices.value.has(123)).toBe(false)
      expect(mockDevicesStore.assignAccount).toHaveBeenCalledWith(123, 456)
      expect(accountAssignmentState.value[123]).toEqual({
        editMode: false,
        selectedAccountId: null
      })
    })

    it('should show error when no account selected', async () => {
      const item = { id: 'device-123' }
      accountAssignmentState.value[123] = { editMode: true, selectedAccountId: null }
      
      await actions.confirmAccountAssignment(item)
      
      expect(mockAlertStore.error).toHaveBeenCalledWith(
        'Не выбран лицевой счёт для назначения'
      )
      expect(mockDevicesStore.assignAccount).not.toHaveBeenCalled()
    })

    it('should show error for invalid device', async () => {
      const item = { id: 'account-123' }
      
      await actions.confirmAccountAssignment(item)
      
      expect(mockAlertStore.error).toHaveBeenCalledWith(
        'Не выбран лицевой счёт для назначения'
      )
    })

    it('should handle assignment errors', async () => {
      const item = { id: 'device-123' }
      accountAssignmentState.value[123] = { editMode: true, selectedAccountId: 456 }
      mockDevicesStore.assignAccount.mockRejectedValue(new Error('API Error'))
      
      await actions.confirmAccountAssignment(item)
      
      expect(transitioningDevices.value.has(123)).toBe(false)
      expect(mockAlertStore.error).toHaveBeenCalledWith(
        'Ошибка при назначении лицевого счёта: API Error'
      )
    })

    it('should handle assignment errors without message', async () => {
      const item = { id: 'device-123' }
      accountAssignmentState.value[123] = { editMode: true, selectedAccountId: 456 }
      mockDevicesStore.assignAccount.mockRejectedValue('String error')
      
      await actions.confirmAccountAssignment(item)
      
      expect(mockAlertStore.error).toHaveBeenCalledWith(
        'Ошибка при назначении лицевого счёта: String error'
      )
    })
  })
})

