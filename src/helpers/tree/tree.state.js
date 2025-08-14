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

/**
 * Tree State Management Functions
 * Handles saving and restoring tree expansion and selection state
 */

/**
 * Create state management functions for tree state
 */
export const createStateManager = (authStore) => {
  const restoreTreeState = async (selectedNode, expandedNodes, loadChildren) => {
    const savedState = authStore.getAccountsTreeState
    if (savedState && savedState.selectedNode) {
      selectedNode.value = [savedState.selectedNode]
    }
    if (savedState && savedState.expandedNodes && savedState.expandedNodes.length > 0) {
      // First restore only non-group nodes to avoid auto-expansion issues
      const nonGroupNodes = savedState.expandedNodes.filter(nodeId => !nodeId.startsWith('group-'))
      expandedNodes.value = [...nonGroupNodes]
      
      // Load children for all expanded nodes that need loading
      if (loadChildren) {
        const nodesToLoad = savedState.expandedNodes.filter(nodeId => 
          nodeId === 'root-unassigned' || nodeId.startsWith('account-')
        )
        
        for (const nodeId of nodesToLoad) {
          try {
            await loadChildren({ id: nodeId })
          } catch {
            // Ignore errors during restoration, they'll be handled when user interacts
          }
        }
      }
      
      // After loading is complete, restore the device group expanded state
      const groupNodes = savedState.expandedNodes.filter(nodeId => nodeId.startsWith('group-'))
      if (groupNodes.length > 0) {
        // Use nextTick to ensure the tree is fully rendered before expanding groups
        await new Promise(resolve => globalThis.setTimeout(resolve, 0))
        expandedNodes.value = [...savedState.expandedNodes]
      }
    }
  }

  const saveTreeState = (selectedNode, expandedNodes) => {
    const selected = selectedNode.value && selectedNode.value.length > 0 ? selectedNode.value[0] : null
    const expanded = expandedNodes.value || []
    authStore.saveAccountsTreeState(selected, expanded)
  }

  return { restoreTreeState, saveTreeState }
}
