// Copyright (c) 2025 sw.consulting
// Licensed under the MIT License.
// This file is a part of Mediapi frontend application

import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store.js'
import { useAlertStore } from '@/stores/alert.store.js'

const publicPages = ['/recover', '/register']
const loginPages = ['/login']
const logistPages = ['/registers']

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
        // Priority: logist > administrator > regular user
        if (auth.isLogist) return '/registers'
        if (auth.isAdmin) return '/users'
        return '/user/edit/' + auth.user.id
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
      path: '/registers',
      name: 'Реестры',
      component: () => import('@/views/Registers_View.vue')
    },
    {
      path: '/user/edit/:id',
      name: 'Настройки',
      component: () => import('@/views/User_EditView.vue'),
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

  // (3) Check role-specific access BEFORE general redirects
  if (logistPages.includes(to.path) && !auth.isLogist) {
    return routeToLogin(to, auth)
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
    
    // No need to login, redirect based on role priority
    if (auth.isLogist) return '/registers'
    if (auth.isAdmin) return '/users'
    return '/user/edit/' + auth.user.id
  }

  // (5) Allow access to other routes
  return true
})

export default router
