// Copyright (c) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software")
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
import { ref } from 'vue'
import { createStateManager } from '@/helpers/tree/tree.state.js'

describe('Tree State Functions', () => {
  describe('createStateManager', () => {
    let authStore, stateManager

    beforeEach(() => {
      authStore = {
        getAccountsTreeState: {
          selectedNode: 'account-1',
          expandedNodes: ['root-accounts', 'account-1']
        },
        saveAccountsTreeState: vi.fn()
      }

      stateManager = createStateManager(authStore)
    })

    it('should restore tree state from auth store', async () => {
      const selectedNode = ref([])
      const expandedNodes = ref([])

      await stateManager.restoreTreeState(selectedNode, expandedNodes)

      expect(selectedNode.value).toEqual(['account-1'])
      expect(expandedNodes.value).toEqual(['root-accounts', 'account-1'])
    })

    it('should handle missing saved state', async () => {
      authStore.getAccountsTreeState = {}
      const selectedNode = ref(['initial'])
      const expandedNodes = ref(['initial'])

      await stateManager.restoreTreeState(selectedNode, expandedNodes)

      expect(selectedNode.value).toEqual(['initial'])
      expect(expandedNodes.value).toEqual(['initial'])
    })

    it('should load children for expanded nodes during restoration', async () => {
      const selectedNode = ref([])
      const expandedNodes = ref([])
      const loadChildren = vi.fn().mockResolvedValue()

      await stateManager.restoreTreeState(selectedNode, expandedNodes, loadChildren)

      expect(selectedNode.value).toEqual(['account-1'])
      expect(expandedNodes.value).toEqual(['root-accounts', 'account-1'])
      // Only account-1 needs loading, root-accounts doesn't need lazy loading
      expect(loadChildren).toHaveBeenCalledWith({ id: 'account-1' })
      expect(loadChildren).toHaveBeenCalledTimes(1)
    })

    it('should restore only specific device groups that were expanded', async () => {
      const authStore = {
        getAccountsTreeState: {
          selectedNode: 'group-1',
          expandedNodes: ['root-accounts', 'account-1', 'account-1-groups', 'group-1'] // Only group-1 was expanded
        },
        saveAccountsTreeState: vi.fn()
      }
      
      const stateManager = createStateManager(authStore)
      const selectedNode = ref([])
      const expandedNodes = ref([])
      const loadChildren = vi.fn().mockResolvedValue()

      await stateManager.restoreTreeState(selectedNode, expandedNodes, loadChildren)

      // Check that expanded nodes are restored correctly (including device groups after loading)
      expect(expandedNodes.value).toEqual(['root-accounts', 'account-1', 'account-1-groups', 'group-1'])
      
      // Only nodes that start with 'account-' and need loading should trigger loadChildren
      expect(loadChildren).toHaveBeenCalledWith({ id: 'account-1' })
      expect(loadChildren).toHaveBeenCalledWith({ id: 'account-1-groups' })
      expect(loadChildren).not.toHaveBeenCalledWith({ id: 'root-accounts' }) // Root doesn't need loading
      expect(loadChildren).not.toHaveBeenCalledWith({ id: 'group-1' }) // Individual groups don't need loading
      expect(loadChildren).toHaveBeenCalledTimes(2)
    })

    it('should handle loadChildren errors gracefully during restoration', async () => {
      const selectedNode = ref([])
      const expandedNodes = ref([])
      const loadChildren = vi.fn().mockRejectedValue(new Error('Load failed'))

      // Should not throw
      await expect(stateManager.restoreTreeState(selectedNode, expandedNodes, loadChildren)).resolves.toBeUndefined()

      expect(selectedNode.value).toEqual(['account-1'])
      expect(expandedNodes.value).toEqual(['root-accounts', 'account-1'])
    })

    it('should save tree state to auth store', () => {
      const selectedNode = ref(['account-2'])
      const expandedNodes = ref(['root-accounts'])

      stateManager.saveTreeState(selectedNode, expandedNodes)

      expect(authStore.saveAccountsTreeState).toHaveBeenCalledWith(
        'account-2',
        ['root-accounts']
      )
    })

    it('should handle empty selection when saving', () => {
      const selectedNode = ref([])
      const expandedNodes = ref([])

      stateManager.saveTreeState(selectedNode, expandedNodes)

      expect(authStore.saveAccountsTreeState).toHaveBeenCalledWith(null, [])
    })
  })
})
