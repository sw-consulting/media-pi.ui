/**
 * Tree State Management Module
 * This file is a part of Media Pi frontend application
 *
 * Handles persistence and restoration of tree expansion and selection state.
 * This module ensures that users maintain their tree navigation context
 * when navigating between pages or refreshing the application.
 *
 * State Persistence Features:
 * - Saves expanded node IDs to maintain tree structure visibility
 * - Saves selected node ID to restore user's current selection
 * - Handles complex loading sequences for nested tree structures
 * - Graceful error handling during state restoration
 *
 * Restoration Strategy:
 * - First loads non-group nodes to establish basic structure
 * - Then loads data for expanded container nodes
 * - Finally restores device group expansions after tree is ready
 * - Uses timing controls to prevent race conditions
 *
 * @module TreeState
 * @author Maxim Samsonov
 * @since 2025
 */

/**
 * Creates state management functions for tree persistence
 *
 * Factory function that creates utilities for saving and restoring tree state.
 * The state includes both the currently selected node and all expanded nodes,
 * allowing users to maintain their navigation context across sessions.
 *
 * @param {Object} authStore - Authentication store that handles state persistence
 * @returns {Object} Object containing restoreTreeState and saveTreeState functions
 *
 * @example
 * // Setup in a Vue component
 * import { createStateManager } from '@/helpers/tree/tree.state'
 * import { useAuthStore } from '@/stores/auth.store'
 *
 * const authStore = useAuthStore()
 * const { restoreTreeState, saveTreeState } = createStateManager(authStore)
 *
 * // Restore state when component mounts
 * onMounted(async () => {
 *   await restoreTreeState(selectedNode, expandedNodes, loadChildren)
 * })
 *
 * // Save state when tree changes
 * watch([selectedNode, expandedNodes], () => {
 *   saveTreeState(selectedNode, expandedNodes)
 * })
 */
export const createStateManager = (authStore) => {
  /**
   * Restores tree expansion and selection state from persistent storage
   *
   * This function implements a sophisticated restoration strategy to handle
   * the complex loading requirements of the hierarchical tree structure:
   *
   * 1. Restores selected node immediately for visual feedback
   * 2. Expands non-group nodes first to establish basic structure
   * 3. Loads data for container nodes that require lazy loading
   * 4. Finally restores device group expansions after data is loaded
   *
   * The staged approach prevents timing issues and ensures all necessary
   * data is loaded before attempting to expand child nodes.
   *
   * @param {import('vue').Ref} selectedNode - Reactive reference to selected node array
   * @param {import('vue').Ref} expandedNodes - Reactive reference to expanded nodes array
   * @param {Function} loadChildren - Function to load children for lazy-loaded nodes
   *
   * @example
   * // Basic restoration
   * await restoreTreeState(selectedNode, expandedNodes, loadChildren)
   *
   * // Restoration with error handling
   * try {
   *   await restoreTreeState(selectedNode, expandedNodes, loadChildren)
   * } catch (error) {
   *   // Failed to restore tree state: handle or log via alert store if needed
   * }
   */
  const restoreTreeState = async (selectedNode, expandedNodes, loadChildren) => {
    const savedState = authStore.getAccountsTreeState

    // Restore selected node immediately for visual feedback
    if (savedState && savedState.selectedNode) {
      selectedNode.value = [savedState.selectedNode]
    }

    if (savedState && savedState.expandedNodes && savedState.expandedNodes.length > 0) {
      // Stage 1: Restore non-group nodes first to establish basic tree structure
      // Group nodes require their parent data to be loaded first
      const nonGroupNodes = savedState.expandedNodes.filter(nodeId => !nodeId.startsWith('group-'))
      expandedNodes.value = [...nonGroupNodes]

      // Stage 2: Load children for container nodes that require data loading
      if (loadChildren) {
        const nodesToLoad = savedState.expandedNodes.filter(nodeId =>
          nodeId === 'root-unassigned' || nodeId.startsWith('account-')
        )

        // Load each node sequentially to avoid overwhelming the API
        for (const nodeId of nodesToLoad) {
          try {
            await loadChildren({ id: nodeId })
          } catch {
            // Ignore errors during restoration - they'll be handled when user interacts
            // This prevents restoration failures from breaking the entire tree
          }
        }
      }

      // Stage 3: Restore device group expansions after parent data is loaded
      const groupNodes = savedState.expandedNodes.filter(nodeId => nodeId.startsWith('group-'))
      if (groupNodes.length > 0) {
        // Use setTimeout to ensure tree rendering is complete before expanding groups
        await new Promise(resolve => globalThis.setTimeout(resolve, 0))
        expandedNodes.value = [...savedState.expandedNodes]
      }
    }
  }

  /**
   * Saves current tree expansion and selection state to persistent storage
   *
   * Captures the current tree state and stores it through the auth store
   * for restoration in future sessions. The state includes the currently
   * selected node and all expanded nodes.
   *
   * @param {import('vue').Ref} selectedNode - Reactive reference to selected node array
   * @param {import('vue').Ref} expandedNodes - Reactive reference to expanded nodes array
   *
   * @example
   * // Save state when tree changes
   * watch([selectedNode, expandedNodes], () => {
   *   saveTreeState(selectedNode, expandedNodes)
   * }, { deep: true })
   *
   * // Manual save when needed
   * saveTreeState(selectedNode, expandedNodes)
   */
  const saveTreeState = (selectedNode, expandedNodes) => {
    // Extract the first selected node (tree typically allows single selection)
    const selected = selectedNode.value && selectedNode.value.length > 0 ? selectedNode.value[0] : null

    // Get all currently expanded nodes
    const expanded = expandedNodes.value || []

    // Persist state through auth store
    authStore.saveAccountsTreeState(selected, expanded)
  }

  return { restoreTreeState, saveTreeState }
}
