/* @vitest-environment jsdom */
// Copyright (c) 2025 sw.consulting
// This file is a part of Media Pi frontend application

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import VideoSettings from '@/components/Video_Settings.vue'
import { redirectToDefaultRoute } from '@/helpers/default.route.js'

const routerGo = vi.hoisted(() => vi.fn())

const videosStore = {
  video: ref(null),
  loading: ref(false),
  getById: vi.fn(),
  update: vi.fn()
}

const categoriesStore = {
  categories: ref([]),
  getAll: vi.fn()
}

const alertStore = {
  alert: ref(null),
  error: vi.fn((message) => { alertStore.alert.value = { message, type: 'alert-danger' } }),
  clear: vi.fn()
}

let authStore = { user: { roles: [1], accountIds: [] } }

vi.mock('pinia', async () => {
  const actual = await vi.importActual('pinia')
  return { ...actual, storeToRefs: (store) => store }
})

vi.mock('@/router', () => ({
  default: { go: routerGo }
}))

vi.mock('@/stores/videos.store.js', () => ({
  useVideosStore: () => videosStore
}))

vi.mock('@/stores/categories.store.js', () => ({
  useCategoriesStore: () => categoriesStore
}))

vi.mock('@/stores/alert.store.js', () => ({
  useAlertStore: () => alertStore
}))

vi.mock('@/stores/auth.store.js', () => ({
  useAuthStore: () => authStore
}))

vi.mock('@/helpers/default.route.js', () => ({
  redirectToDefaultRoute: vi.fn()
}))

vi.mock('@/helpers/user.helpers.js', () => ({
  isAdministrator: (u) => Array.isArray(u?.roles) && u.roles.includes(1),
  canManageAccountById: (u, accountId) => Array.isArray(u?.accountIds) && u.accountIds.includes(accountId)
}))

const mountSettings = (props = {}) => mount({
  template: '<Suspense><VideoSettings v-bind="$attrs" /></Suspense>',
  components: { VideoSettings },
  inheritAttrs: false
}, {
  attrs: {
    id: 10,
    ...props
  },
  global: {
    stubs: {
      Form: {
        template: '<form data-test="form" @submit.prevent="onSubmit"><slot :errors="errors" :isSubmitting="false" /></form>',
        props: ['initialValues'],
        emits: ['submit'],
        data() {
          return { errors: props.showValidationError ? { title: 'Необходимо указать название' } : {} }
        },
        methods: {
          onSubmit() {
            this.$emit('submit', { ...this.initialValues, ...(props.submitValues || {}) })
          }
        }
      },
      Field: {
        props: ['name'],
        template: '<input data-test="title-field" />'
      },
      'v-select': {
        props: ['items', 'modelValue'],
        emits: ['update:modelValue'],
        template: '<select data-test="video-category-select" :value="modelValue" @change="$emit(\'update:modelValue\', Number($event.target.value))"><option v-for="item in items" :key="item.value" :value="item.value">{{ item.title }}</option></select>'
      }
    },
    mocks: {
      $router: { go: routerGo }
    }
  }
})

describe('Video_Settings.vue', () => {
  beforeEach(() => {
    authStore = { user: { roles: [1], accountIds: [] } }
    videosStore.video.value = { id: 10, title: 'Clip', accountId: 0, categoryId: 3 }
    videosStore.loading.value = false
    videosStore.getById = vi.fn().mockResolvedValue()
    videosStore.update = vi.fn().mockResolvedValue()
    categoriesStore.categories.value = [{ id: 3, title: 'Sports' }, { id: 4, title: 'News' }]
    categoriesStore.getAll = vi.fn().mockResolvedValue()
    alertStore.alert.value = null
    vi.clearAllMocks()
  })

  it('loads common video and saves title with category', async () => {
    const wrapper = mountSettings({ submitValues: { title: 'Updated Clip' } })
    await flushPromises()

    await wrapper.find('[data-test="video-category-select"]').setValue('4')
    await wrapper.find('[data-test="form"]').trigger('submit')
    await flushPromises()

    expect(videosStore.getById).toHaveBeenCalledWith(10)
    expect(categoriesStore.getAll).toHaveBeenCalled()
    expect(videosStore.update).toHaveBeenCalledWith(10, { title: 'Updated Clip', categoryId: 4 })
    expect(routerGo).toHaveBeenCalledWith(-1)
  })

  it('does not send category for account-linked videos', async () => {
    authStore = { user: { roles: [], accountIds: [42] } }
    videosStore.video.value = { id: 10, title: 'Account Clip', accountId: 42, categoryId: 0 }
    const wrapper = mountSettings({ submitValues: { title: 'Renamed' } })
    await flushPromises()

    expect(wrapper.find('[data-test="video-category-select"]').exists()).toBe(false)

    await wrapper.find('[data-test="form"]').trigger('submit')
    await flushPromises()

    expect(videosStore.update).toHaveBeenCalledWith(10, { title: 'Renamed' })
  })

  it('redirects when current user cannot manage the video', async () => {
    authStore = { user: { roles: [], accountIds: [99] } }
    videosStore.video.value = { id: 10, title: 'Locked', accountId: 42, categoryId: 0 }

    mountSettings()
    await flushPromises()

    expect(redirectToDefaultRoute).toHaveBeenCalled()
  })

  it('shows not found alert when video load returns 404', async () => {
    const error = new Error('not found')
    error.status = 404
    videosStore.getById = vi.fn().mockRejectedValue(error)

    mountSettings()
    await flushPromises()

    expect(alertStore.error).toHaveBeenCalledWith('Видеофайл с ID 10 не найден')
  })
})
