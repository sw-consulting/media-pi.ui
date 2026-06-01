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

const accountsStore = {
  account: ref(null),
  getById: vi.fn()
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

vi.mock('@/stores/accounts.store.js', () => ({
  useAccountsStore: () => accountsStore
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

vi.mock('@sw-consulting/tooling.ui.kit', () => ({
  ActionButton: {
    name: 'ActionButton',
    props: ['item', 'icon', 'iconSize', 'tooltipText', 'disabled'],
    emits: ['click'],
    template: '<button :data-icon="icon" :data-icon-size="iconSize" :data-tooltip="tooltipText" :disabled="disabled" @click="$emit(\'click\', item)"></button>'
  }
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
        template: '<form data-test="form" @submit.prevent="onSubmit"><slot :errors="errors" :isSubmitting="false" :handleSubmit="handleSubmit" /></form>',
        props: ['initialValues'],
        emits: ['submit'],
        data() {
          return { errors: props.showValidationError ? { title: 'Необходимо указать название' } : {} }
        },
        methods: {
          handleSubmit(submit) {
            return submit({ ...this.initialValues, ...(props.submitValues || {}) })
          },
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
      },
      ModalWindow: {
        template: '<div v-if="modelValue" data-test="modal-window"><slot /><slot name="actions" /></div>',
        props: ['modelValue', 'title'],
        emits: ['confirm', 'cancel', 'update:modelValue']
      },
      'v-btn': {
        template: '<button v-bind="$attrs"><slot /></button>'
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
    videosStore.video.value = {
      id: 10,
      title: 'Clip',
      accountId: 0,
      categoryId: 3,
      fileSizeBytes: 1048576,
      durationSeconds: 65
    }
    videosStore.loading.value = false
    videosStore.getById = vi.fn().mockResolvedValue()
    videosStore.update = vi.fn().mockResolvedValue()
    accountsStore.account.value = null
    accountsStore.getById = vi.fn().mockImplementation(async (id) => {
      accountsStore.account.value = { id, name: `Account ${id}` }
    })
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
    expect(wrapper.find('[data-test="video-account-name"]').element.value).toBe('Общие файлы')
    expect(wrapper.find('[data-test="video-file-size"]').element.value).toBe('1.0 МБ')
    expect(wrapper.find('[data-test="video-duration"]').element.value).toBe('1:05')
    expect(videosStore.update).toHaveBeenCalledWith(10, { title: 'Updated Clip', categoryId: 4 })
    expect(routerGo).toHaveBeenCalledWith(-1)
  })

  it('does not send category for account-linked videos', async () => {
    authStore = { user: { roles: [], accountIds: [42] } }
    videosStore.video.value = { id: 10, title: 'Account Clip', accountId: 42, categoryId: 0 }
    const wrapper = mountSettings({ submitValues: { title: 'Renamed' } })
    await flushPromises()

    expect(wrapper.find('[data-test="video-category-select"]').exists()).toBe(false)
    expect(accountsStore.getById).toHaveBeenCalledWith(42)
    expect(wrapper.find('[data-test="video-account-name"]').element.value).toBe('Account 42')

    await wrapper.find('[data-test="form"]').trigger('submit')
    await flushPromises()

    expect(videosStore.update).toHaveBeenCalledWith(10, { title: 'Renamed' })
  })

  it('lists affected playlists before retrying common video update with force cleanup', async () => {
    videosStore.update = vi.fn()
      .mockRejectedValueOnce({
        status: 409,
        data: {
          affectedPlaylistCount: 1,
          affectedItemCount: 1,
          affectedVideoCount: 1,
          affectedPlaylists: [
            {
              playlistId: 11,
              title: 'Morning',
              filename: 'morning.m3u',
              accountId: 1,
              accountName: 'Cafe',
              removedItemCount: 1
            }
          ]
        }
      })
      .mockResolvedValueOnce()
    const wrapper = mountSettings({ submitValues: { title: 'Updated Clip' } })
    await flushPromises()

    await wrapper.find('[data-test="video-category-select"]').setValue('4')
    await wrapper.find('[data-test="form"]').trigger('submit')
    await flushPromises()

    expect(videosStore.update).toHaveBeenCalledWith(10, { title: 'Updated Clip', categoryId: 4 })
    expect(wrapper.find('[data-test="playlist-impact-list"]').text()).toContain('Cafe / Morning')

    await wrapper.find('[data-test="confirm-playlist-impact-button"]').trigger('click')
    await flushPromises()

    expect(videosStore.update).toHaveBeenLastCalledWith(10, {
      title: 'Updated Clip',
      categoryId: 4,
      forcePlaylistCleanup: true
    })
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

  it('redirects when id is NaN', async () => {
    mountSettings({ id: NaN })
    await flushPromises()

    expect(redirectToDefaultRoute).toHaveBeenCalled()
  })

  it('redirects when load returns 401 error', async () => {
    const error = new Error('Unauthorized')
    error.status = 401
    videosStore.getById = vi.fn().mockRejectedValue(error)

    mountSettings()
    await flushPromises()

    expect(redirectToDefaultRoute).toHaveBeenCalled()
  })

  it('shows generic error when video load fails with non-http error', async () => {
    const error = new Error('Network failure')
    videosStore.getById = vi.fn().mockRejectedValue(error)

    mountSettings()
    await flushPromises()

    expect(alertStore.error).toHaveBeenCalledWith('Ошибка загрузки видеофайла: Network failure')
  })

  it('uses header action buttons for save and cancel', async () => {
    const wrapper = mountSettings()
    await flushPromises()

    const saveButton = wrapper.find('[data-test="save-video-button"]')
    const cancelButton = wrapper.find('[data-test="cancel-video-button"]')

    expect(saveButton.attributes('data-icon')).toBe('fa-solid fa-check-double')
    expect(saveButton.attributes('data-icon-size')).toBe('2x')
    expect(cancelButton.attributes('data-icon')).toBe('fa-solid fa-xmark')
    expect(cancelButton.attributes('data-icon-size')).toBe('2x')

    await saveButton.trigger('click')
    await flushPromises()
    expect(videosStore.update).toHaveBeenCalled()

    await cancelButton.trigger('click')

    expect(routerGo).toHaveBeenCalledWith(-1)
  })

  it('calls alertStore.clear when alert close button is clicked', async () => {
    const error = new Error('Server error')
    videosStore.getById = vi.fn().mockRejectedValue(error)

    const wrapper = mountSettings()
    await flushPromises()

    const closeButton = wrapper.find('.alert-dismissable .btn-link.close')
    expect(closeButton.exists()).toBe(true)
    await closeButton.trigger('click')

    expect(alertStore.clear).toHaveBeenCalled()
  })

  it('cancelPlaylistCleanup does nothing while force save is in progress', async () => {
    let resolveUpdate
    videosStore.update = vi.fn()
      .mockRejectedValueOnce({
        status: 409,
        data: {
          affectedPlaylistCount: 1,
          affectedItemCount: 1,
          affectedVideoCount: 1,
          affectedPlaylists: [
            { playlistId: 11, title: 'Morning', filename: 'morning.m3u', accountId: 1, accountName: 'Cafe', removedItemCount: 1 }
          ]
        }
      })
      .mockReturnValueOnce(new Promise(resolve => { resolveUpdate = resolve }))

    const wrapper = mountSettings({ submitValues: { title: 'Updated Clip' } })
    await flushPromises()

    await wrapper.find('[data-test="video-category-select"]').setValue('4')
    await wrapper.find('[data-test="form"]').trigger('submit')
    await flushPromises()

    expect(wrapper.find('[data-test="playlist-impact-list"]').exists()).toBe(true)

    // Await confirm click so forceSaving=true is set synchronously before cancelling
    await wrapper.find('[data-test="confirm-playlist-impact-button"]').trigger('click')
    // Now forceSaving=true; emit cancel directly from PlaylistAccessImpactDialog (bypassing its guard)
    // to test Video_Settings' own cancelPlaylistCleanup guard
    const impactDialog = wrapper.findComponent({ name: 'PlaylistAccessImpactDialog' })
    await impactDialog.vm.$emit('cancel')
    await flushPromises()

    // Dialog still showing because cancelPlaylistCleanup guard blocked it (forceSaving=true)
    expect(wrapper.find('[data-test="playlist-impact-list"]').exists()).toBe(true)

    resolveUpdate()
    await flushPromises()
  })

  it('v-model on PlaylistAccessImpactDialog closes dialog on update:modelValue false', async () => {
    videosStore.update = vi.fn().mockRejectedValueOnce({
      status: 409,
      data: {
        affectedPlaylistCount: 1,
        affectedItemCount: 1,
        affectedVideoCount: 1,
        affectedPlaylists: [
          { playlistId: 11, title: 'Morning', filename: 'morning.m3u', accountId: 1, accountName: 'Cafe', removedItemCount: 1 }
        ]
      }
    })

    const wrapper = mountSettings({ submitValues: { title: 'Updated Clip' } })
    await flushPromises()

    await wrapper.find('[data-test="video-category-select"]').setValue('4')
    await wrapper.find('[data-test="form"]').trigger('submit')
    await flushPromises()

    expect(wrapper.find('[data-test="playlist-impact-list"]').exists()).toBe(true)

    // Emit update:modelValue false from PlaylistAccessImpactDialog to test v-model handler in Video_Settings
    const impactDialog = wrapper.findComponent({ name: 'PlaylistAccessImpactDialog' })
    await impactDialog.vm.$emit('update:modelValue', false)
    await flushPromises()

    expect(wrapper.find('[data-test="playlist-impact-list"]').exists()).toBe(false)
  })
})

describe('Video_Settings.vue - additional branch coverage', () => {
  beforeEach(() => {
    authStore = { user: { roles: [1], accountIds: [] } }
    videosStore.video.value = { id: 10, title: 'Clip', accountId: 0, categoryId: 3 }
    videosStore.loading.value = false
    videosStore.getById = vi.fn().mockResolvedValue()
    videosStore.update = vi.fn().mockResolvedValue()
    accountsStore.account.value = null
    accountsStore.getById = vi.fn().mockImplementation(async (id) => {
      accountsStore.account.value = { id, name: `Account ${id}` }
    })
    categoriesStore.categories.value = [{ id: 3, title: 'Sports' }, { id: 4, title: 'News' }]
    categoriesStore.getAll = vi.fn().mockResolvedValue()
    alertStore.alert.value = null
    vi.clearAllMocks()
  })

  it('handles null categories gracefully', async () => {
    categoriesStore.categories.value = null
    const wrapper = mountSettings({ submitValues: { title: 'Clip' } })
    await flushPromises()

    // isCommonVideo=true, category options should be empty but not crash
    expect(wrapper.find('[data-test="video-category-select"]').exists()).toBe(true)
  })

  it('handles video with undefined accountId as common video', async () => {
    videosStore.video.value = { id: 10, title: 'Clip', categoryId: 3 }
    const wrapper = mountSettings({ submitValues: { title: 'Clip' } })
    await flushPromises()

    // accountId is undefined → isCommonVideo = (undefined ?? 0 === 0) = true
    expect(wrapper.find('[data-test="video-category-select"]').exists()).toBe(true)
  })

  it('handles video with null title using empty string fallback', async () => {
    videosStore.video.value = { id: 10, title: null, accountId: 0, categoryId: 3 }
    mountSettings()
    await flushPromises()

    expect(videosStore.getById).toHaveBeenCalledWith(10)
  })

  it('handles generic error without message property in load', async () => {
    videosStore.getById = vi.fn().mockRejectedValue({ status: 500 })
    mountSettings()
    await flushPromises()

    expect(alertStore.error).toHaveBeenCalledWith(
      expect.stringContaining('Ошибка загрузки видеофайла')
    )
  })

  it('handles 401 error in saveVideoPayload', async () => {
    videosStore.update = vi.fn().mockRejectedValue({ status: 401 })
    const wrapper = mountSettings({ submitValues: { title: 'Updated Clip' } })
    await flushPromises()

    await wrapper.find('[data-test="form"]').trigger('submit')
    await flushPromises()

    expect(redirectToDefaultRoute).toHaveBeenCalled()
  })

  it('handles 404 error in saveVideoPayload', async () => {
    videosStore.update = vi.fn().mockRejectedValue({ status: 404 })
    const wrapper = mountSettings({ submitValues: { title: 'Updated Clip' } })
    await flushPromises()

    await wrapper.find('[data-test="form"]').trigger('submit')
    await flushPromises()

    expect(alertStore.error).toHaveBeenCalledWith('Видеофайл с ID 10 не найден')
  })

  it('handles 422 error in saveVideoPayload', async () => {
    videosStore.update = vi.fn().mockRejectedValue({ status: 422 })
    const wrapper = mountSettings({ submitValues: { title: 'Updated Clip' } })
    await flushPromises()

    await wrapper.find('[data-test="form"]').trigger('submit')
    await flushPromises()

    expect(alertStore.error).toHaveBeenCalledWith('Проверьте корректность введённых данных')
  })

  it('handles generic error in saveVideoPayload', async () => {
    videosStore.update = vi.fn().mockRejectedValue(new Error('Save failed'))
    const wrapper = mountSettings({ submitValues: { title: 'Updated Clip' } })
    await flushPromises()

    await wrapper.find('[data-test="form"]').trigger('submit')
    await flushPromises()

    expect(alertStore.error).toHaveBeenCalledWith('Ошибка при обновлении видеофайла: Save failed')
  })

  it('confirmPlaylistCleanup does nothing when no pending payload', async () => {
    const wrapper = mountSettings()
    await flushPromises()

    // No 409 error triggered, pendingVideoPayload is null
    // Emit confirm from PlaylistAccessImpactDialog directly
    const impactDialog = wrapper.findComponent({ name: 'PlaylistAccessImpactDialog' })
    await impactDialog.vm.$emit('confirm')
    await flushPromises()

    expect(videosStore.update).not.toHaveBeenCalled()
  })
})
