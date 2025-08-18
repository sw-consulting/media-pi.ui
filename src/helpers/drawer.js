/**
 * Navigation Drawer State Manager
 * This file is a part of Media Pi frontend application
 * 
 * Manages the global state and interactions for the application's navigation drawer.
 * Uses Vue 3's reactivity system to provide a shared state across components
 * that need to control or respond to drawer visibility changes.
 * 
 * State Management:
 * - Centralizes drawer state in a reactive reference
 * - Provides utility functions for common drawer operations
 * - Enables consistent drawer behavior across the application
 * 
 * @module DrawerHelper
 * @author Maxim Samsonov
 * @since 2025
 */

import { ref } from 'vue'

/**
 * Reactive reference to the navigation drawer's visibility state
 * 
 * This is the central state that controls whether the navigation drawer
 * is open or closed. Components can directly bind to this reference
 * or use the helper functions below for state manipulation.
 * 
 * @type {import('vue').Ref<boolean>}
 * 
 * @example
 * // In a component template
 * <v-navigation-drawer v-model="drawer">
 *   <!-- drawer content -->
 * </v-navigation-drawer>
 * 
 * // In component script
 * import { drawer } from '@/helpers/drawer'
 * 
 * // Watch for changes
 * watch(drawer, (isOpen) => {
 *   console.log(`Drawer is ${isOpen ? 'open' : 'closed'}`)
 * })
 */
export const drawer = ref(null)

/**
 * Toggles the navigation drawer's visibility state
 * 
 * Switches between open and closed states. If the drawer is currently
 * open, it will be closed, and vice versa. This is commonly used
 * for menu buttons and keyboard shortcuts.
 * 
 * @example
 * // In a menu button click handler
 * <v-btn @click="toggleDrawer" icon>
 *   <v-icon>mdi-menu</v-icon>
 * </v-btn>
 * 
 * // In a keyboard shortcut handler
 * document.addEventListener('keydown', (e) => {
 *   if (e.key === 'Escape') {
 *     toggleDrawer()
 *   }
 * })
 */
export function toggleDrawer() {
  drawer.value = !drawer.value
}

/**
 * Explicitly closes the navigation drawer
 * 
 * Sets the drawer state to closed/hidden. This is useful for scenarios
 * where you need to ensure the drawer is closed, such as after navigation
 * on mobile devices or when certain actions require the drawer to be hidden.
 * 
 * @example
 * // Close drawer after navigation on mobile
 * router.afterEach(() => {
 *   if (isMobile.value) {
 *     hideDrawer()
 *   }
 * })
 * 
 * // Close drawer when opening a modal
 * function openModal() {
 *   hideDrawer()
 *   showModal.value = true
 * }
 */
export function hideDrawer() {
  drawer.value = false
}
