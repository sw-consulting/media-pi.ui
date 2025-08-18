// Copyright (c) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
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

import router from '@/router'
import { useAuthStore } from '@/stores/auth.store.js'

/**
 * Determines the route to navigate to after successful login
 * based on user roles and permissions
 * @returns {string} The path to redirect to
 */
export function getDefaultRoute() {
  const auth = useAuthStore()
  
  if (!auth.user) {
    return('/login')
  }
  // Users with any role go to accounts, users with no role go to their edit form
  if (auth.isAdministrator || auth.isManager || auth.isEngineer) {
    return('/accounts')
  } else {
    return(`/user/edit/${auth.user.id}`)
  }
}

/**
 * Redirects user to the application's default route.
 * Users with any role go to /accounts
 * Users without a role go to their edit page
 */
export function redirectToDefaultRoute() {
  router.push(getDefaultRoute())
  return 
}

