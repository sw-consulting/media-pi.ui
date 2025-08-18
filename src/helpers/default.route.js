/**
 * Default Route Helper
 * This file is a part of Media Pi frontend application
 * 
 * Handles role-based routing logic to determine where users should land
 * after successful authentication. Different user roles have different
 * default destinations based on their permissions and responsibilities.
 * 
 * Routing Logic:
 * - Users with valid roles (admin/manager/engineer): → /accounts
 * - Users without roles: → /user/edit/{id} (to set up their profile)
 * - Unauthenticated users: → /login
 * 
 * @module DefaultRoute
 * @author Maxim Samsonov
 * @since 2025
 */

import router from '@/router'
import { useAuthStore } from '@/stores/auth.store.js'

/**
 * Determines the route to navigate to after successful login based on user roles and permissions
 * 
 * This function implements the application's role-based routing strategy:
 * - Authenticated users with any system role are directed to the main accounts interface
 * - Authenticated users without roles are directed to their profile to complete setup
 * - Unauthenticated users are directed to login
 * 
 * @returns {string} The path to redirect to
 * 
 * @example
 * // After successful login
 * const defaultPath = getDefaultRoute()
 * router.push(defaultPath)
 * 
 * // Possible return values:
 * // '/accounts' - for users with roles
 * // '/user/edit/123' - for users without roles
 * // '/login' - for unauthenticated users
 */
export function getDefaultRoute() {
  const auth = useAuthStore()
  
  // Redirect unauthenticated users to login
  if (!auth.user) {
    return('/login')
  }
  
  // Users with any valid system role go to the main application interface
  if (auth.isAdministrator || auth.isManager || auth.isEngineer) {
    return('/accounts')
  } else {
    // Users without roles need to complete their profile setup
    return(`/user/edit/${auth.user.id}`)
  }
}

/**
 * Redirects user to the application's default route
 * 
 * Convenience function that combines route determination and navigation.
 * Uses the router instance to perform the actual navigation.
 * 
 * @example
 * // After successful login in a component
 * redirectToDefaultRoute()
 * 
 * // Instead of manually doing:
 * // router.push(getDefaultRoute())
 */
export function redirectToDefaultRoute() {
  router.push(getDefaultRoute())
  return 
}

