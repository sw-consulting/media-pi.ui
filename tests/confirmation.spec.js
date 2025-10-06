/* @vitest-environment jsdom */
// Copyright (c) 2025 sw.consulting
// This file is a part of Media Pi  frontend application

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useConfirmation } from '@/helpers/confirmation.js'

// Mock vuetify-use-dialog
const mockConfirm = vi.fn()
vi.mock('vuetify-use-dialog', () => ({
  useConfirm: () => mockConfirm
}))

describe('useConfirmation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('confirmDelete', () => {
    it('should call confirm with correct delete dialog options', async () => {
      mockConfirm.mockResolvedValue(true)
      const { confirmDelete } = useConfirmation()

      const result = await confirmDelete('Test User', 'пользователя')

      expect(mockConfirm).toHaveBeenCalledWith({
        title: 'Подтверждение удаления',
        confirmationText: 'Удалить',
        cancellationText: 'Отмена',
        content: 'Вы уверены, что хотите удалить пользователя "Test User"?',
        dialogProps: {
          width: '30%',
          minWidth: '250px'
        },
        confirmationButtonProps: {
          color: 'orange-darken-3'
        }
      })
      expect(result).toBe(true)
    })

    it('should use default item type when not provided', async () => {
      mockConfirm.mockResolvedValue(false)
      const { confirmDelete } = useConfirmation()

      await confirmDelete('Test Item')

      expect(mockConfirm).toHaveBeenCalledWith(
        expect.objectContaining({
          content: 'Вы уверены, что хотите удалить элемент "Test Item"?'
        })
      )
    })

    it('should merge custom options with defaults', async () => {
      mockConfirm.mockResolvedValue(true)
      const { confirmDelete } = useConfirmation()

      const customOptions = {
        title: 'Custom Title',
        dialogProps: {
          width: '50%'
        },
        confirmationButtonProps: {
          color: 'red'
        }
      }

      await confirmDelete('Test Item', 'элемент', customOptions)

      expect(mockConfirm).toHaveBeenCalledWith({
        title: 'Custom Title',
        confirmationText: 'Удалить',
        cancellationText: 'Отмена',
        content: 'Вы уверены, что хотите удалить элемент "Test Item"?',
        dialogProps: {
          width: '50%',
          minWidth: '250px'
        },
        confirmationButtonProps: {
          color: 'red'
        }
      })
    })

    it('should return false when user cancels', async () => {
      mockConfirm.mockResolvedValue(false)
      const { confirmDelete } = useConfirmation()

      const result = await confirmDelete('Test User', 'пользователя')

      expect(result).toBe(false)
    })
  })

  describe('confirmAction', () => {
    it('should call confirm with correct action dialog options', async () => {
      mockConfirm.mockResolvedValue(true)
      const { confirmAction } = useConfirmation()

      const result = await confirmAction('Are you sure you want to proceed?')

      expect(mockConfirm).toHaveBeenCalledWith({
        title: 'Подтверждение',
        confirmationText: 'Да',
        cancellationText: 'Нет',
        content: 'Are you sure you want to proceed?',
        dialogProps: {
          width: '30%',
          minWidth: '250px'
        }
      })
      expect(result).toBe(true)
    })

    it('should merge custom options with defaults', async () => {
      mockConfirm.mockResolvedValue(true)
      const { confirmAction } = useConfirmation()

      const customOptions = {
        title: 'Custom Action',
        confirmationText: 'Proceed',
        cancellationText: 'Cancel'
      }

      await confirmAction('Custom message', customOptions)

      expect(mockConfirm).toHaveBeenCalledWith({
        title: 'Custom Action',
        confirmationText: 'Proceed',
        cancellationText: 'Cancel',
        content: 'Custom message',
        dialogProps: {
          width: '30%',
          minWidth: '250px'
        }
      })
    })

    it('should return false when user cancels', async () => {
      mockConfirm.mockResolvedValue(false)
      const { confirmAction } = useConfirmation()

      const result = await confirmAction('Test message')

      expect(result).toBe(false)
    })
  })
})

