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

import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store.js'
import { useAlertStore } from '@/stores/alert.store.js'

const publicPages = ['/recover', '/register']
const loginPages = ['/login']

function routeToLogin(to, auth) {
  if (loginPages.includes(to.path)) {
    return true
  }
  auth.returnUrl = to ? to.fullPath : null
  // Set a flag to indicate this is a permission redirect
  auth.permissionRedirect = true
  return '/login'
}

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: ( ) => {
        const auth = useAuthStore()
        if (!auth.user) {
          return '/login'
        }
        // Users with any role go to accounts, users with no role go to their edit form
        if (auth.isAdministrator || auth.isManager || auth.isEngineer) {
          return '/accounts'
        }
        return `/user/edit/${auth.user.id}`
      }
    },
    {
      path: '/login',
      name: 'Вход',
      component: () => import('@/views/User_LoginView.vue')
    },
    {
      path: '/recover',
      name: 'Восстановление пароля',
      component: () => import('@/views/User_RecoverView.vue'),
      props: true
    },
    {
      path: '/register',
      name: 'Регистрация',
      component: () => import('@/views/User_RegisterView.vue')
    },
    {
      path: '/users',
      name: 'Пользователи',
      component: () => import('@/views/Users_View.vue')
    },
    {
      path: '/accounts',
      name: 'Лицевые счета и устройства',
      component: () => import('@/views/Accounts_View.vue')
    },
    {
      path: '/account/create',
      name: 'Создание лицевого счёта',
      component: () => import('@/views/Account_CreateView.vue')
    },
    {
      path: '/account/edit/:id',
      name: 'Настройки лицевого счёта',
      component: () => import('@/views/Account_EditView.vue'),
      props: true
    },
    {
      path: '/user/edit/:id',
      name: 'Настройки',
      component: () => import('@/views/User_EditView.vue'),
      props: true
    },
    {
      path: '/devicegroup/create/:accountId',
      name: 'Создание группы устройств',
      component: () => import('@/views/DeviceGroup_CreateView.vue'),
      props: true
    },
    {
      path: '/devicegroup/edit/:id',
      name: 'Настройки группы устройств',
      component: () => import('@/views/DeviceGroup_EditView.vue'),
      props: true
    },
    {
      path: '/device/create/:accountId',
      name: 'Создание устройства',
      component: () => import('@/views/Device_CreateView.vue'),
      props: true
    },
    {
      path: '/device/edit/:id',
      name: 'Настройки устройства',
      component: () => import('@/views/Device_EditView.vue'),
      props: true
    }
  ]
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()
  const alert = useAlertStore()
  alert.clear()

  if (auth.re_jwt) {
    return auth
      .re()
      .then(() => {
        return auth.re_tgt == 'register' ? '/users/' : '/user/edit/' + auth.user.id
      })
      .catch((error) => {
        router.push('/login').then(() => {
          alert.error(
            auth.re_tgt === 'register'
              ? 'Не удалось завершить регистрацию. '
              : 'Не удалось восстановить пароль. ' + error
          )
        })
      })
  }

  // (1) Route to public pages
  if (publicPages.includes(to.path)) {
    return true
  }

  // (2) No user and (implied) auth required
  if (!auth.user) {
    return routeToLogin(to, auth)
  }


  // (3) Role-based access control
  if (to.path === '/accounts') {
    if (!auth.isAdministrator && !auth.isManager && !auth.isEngineer) {
      return `/user/edit/${auth.user.id}`
    }
  }

  if (to.path === '/users') {
    if (!auth.isAdministrator && !auth.isManager && !auth.isEngineer) {
      return `/user/edit/${auth.user.id}`
    }
  }

  if (to.path === '/account/create') {
    if (!auth.isAdministrator) {
      return '/'
    }
  }

  if (to.path.startsWith('/account/edit/')) {
    if (!auth.isAdministrator && !auth.isManager) {
      return '/'
    }
  }

  if (to.path.startsWith('/devicegroup/create/')) {
    if (!auth.isAdministrator && !auth.isManager) {
      return '/'
    }
  }

  if (to.path.startsWith('/devicegroup/edit/')) {
    if (!auth.isAdministrator && !auth.isManager) {
      return '/'
    }
  }

  if (to.path.startsWith('/device/create/')) {
    if (!auth.isAdministrator && !auth.isEngineer) {
      return '/'
    }
  }

  if (to.path.startsWith('/device/edit/')) {
    if (!auth.isAdministrator && !auth.isManager && !auth.isEngineer) {
      return '/'
    }
  }

  // For user edit pages, ensure users can only edit their own profile unless they have elevated roles
  if (to.path.startsWith('/user/edit/')) {
    const editUserId = to.params.id
    const currentUserId = auth.user.id.toString()
    
    // Allow access if editing own profile or if user has administrative roles
    if (editUserId !== currentUserId && !auth.isAdministrator && !auth.isManager) {
      return `/user/edit/${auth.user.id}`
    }
  }

  // (4) Handle login page access with role-priority redirect
  if (loginPages.includes(to.path)) {
    try {
      await auth.check()
    } catch {
      return true
    }
    if (!auth.user) {
      return true
    }
    
    // If this is a permission redirect, don't auto-redirect based on role
    if (auth.permissionRedirect) {
      auth.permissionRedirect = false
      return true
    }
    
    // Redirect after login based on user roles
    if (auth.isAdministrator || auth.isManager || auth.isEngineer) {
      return '/accounts'
    }
    // Users with no role go to their edit form
    return `/user/edit/${auth.user.id}`
  }

  // (5) Allow access to other routes
  return true
})

export default router
