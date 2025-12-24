// Copyright (c) 2025 sw.consulting
// This file is a part of Media Pi  frontend application

import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store.js'
import { useAlertStore } from '@/stores/alert.store.js'
import { getDefaultRoute } from '@/helpers/default.route.js'

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
      path: '/device/create',
      name: 'Создание устройства',
      component: () => import('@/views/Device_CreateView.vue'),
      props: true
    },
    {
      path: '/device/edit/:id',
      name: 'Настройки устройства',
      component: () => import('@/views/Device_EditView.vue'),
      props: true
    },
    {
      path: '/device/manage/:id',
      name: 'Управление устройством',
      component: () => import('@/views/Device_ManagementView.vue'),
      props: true
    },
    {
      path: '/videos',
      name: 'Видеофайлы',
      component: () => import('@/views/Videos_View.vue')
    },
    {
      path: '/playlists',
      name: 'Плейлисты',
      component: () => import('@/views/Playlists_View.vue')
    },

  ]
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()
  const alert = useAlertStore()
  alert.clear()

  // Handle password recovery or registration completion
  if (auth.re_jwt) {
    try {
      await auth.re()
      return auth.re_tgt == 'register' ? '/users/' : '/user/edit/' + auth.user.id
    } catch (error) {
      auth.logout()
      auth.returnUrl = null
      alert.error(
        auth.re_tgt === 'register'
          ? 'Не удалось завершить регистрацию. '
          : 'Не удалось восстановить пароль. ' + error
      )
      return '/login'
    }
  }

  // Public pages are always accessible
  if (publicPages.includes(to.path)) {
    return true
  }

  // For login pages, check server availability and redirect if already logged in
  if (loginPages.includes(to.path)) {
    try {
      await auth.check()
      // User is logged in and server is available
      if (auth.user) {
        // Handle permission redirects
        if (auth.permissionRedirect) {
          auth.permissionRedirect = false
          return true
        }
        // Otherwise redirect to role-appropriate home
        return getDefaultRoute()
      }
    } catch {
      // Server unavailable but it's OK for login page
    }
    // Allow access to login page if not logged in or server check failed
    return true
  }

  // For all other routes, verify authentication and permissions
  try {
    // Verify server availability and session validity
    await auth.check()
    
    // If no user after check, route to login
    if (!auth.user) {
      return routeToLogin(to, auth)
    }

    // Check role-specific permissions
    if (to.meta.requiresAdmin && !auth.isAdmin) {
      return routeToLogin(to, auth)
    }

    if (to.meta.requiresLogist && !auth.isLogist) {
      return routeToLogin(to, auth)
    }

    // User is authenticated and has proper permissions
    return true
  } catch (error) {
    // Server unavailable or other error
    console.error('Authentication check failed:', error)
    auth.logout()
    auth.returnUrl = to.fullPath
    alert.error('Сервер недоступен. Пожалуйста, попробуйте позже.')
    return '/login'
  }
})

export default router
