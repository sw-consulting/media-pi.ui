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
 * Tree Loading Functions
 * Handles lazy loading of tree nodes and data fetching
 */

/**
 * Handle lazy loading of tree nodes
 */
export const createLoadChildrenHandler = (
  loadedNodes, 
  loadingNodes, 
  devicesStore, 
  deviceGroupsStore, 
  alertStore
) => {
  return async (item) => {
    const nodeId = item.id
    
    // Prevent duplicate loading
    if (loadedNodes.value.has(nodeId) || loadingNodes.value.has(nodeId)) {
      return
    }
    
    loadingNodes.value.add(nodeId)
    
    try {
      if (nodeId === 'root-unassigned') {
        // Load devices for unassigned root
        await devicesStore.getAll()
        loadedNodes.value.add(nodeId)
        
      } else if (nodeId.includes('-groups')) {
        // Load device groups for device group container
        await deviceGroupsStore.getAll()
        loadedNodes.value.add(nodeId)
        
      } else if (nodeId.startsWith('account-')) {
        // Load devices and groups for specific account
        await Promise.all([
          devicesStore.getAll(),
          deviceGroupsStore.getAll()
        ])
        loadedNodes.value.add(nodeId)
      }
      
    } catch (error) {
      alertStore.error(`Не удалось загрузить данные для "${item.name}": ` + (error.message || error))
    } finally {
      loadingNodes.value.delete(nodeId)
    }
  }
}
