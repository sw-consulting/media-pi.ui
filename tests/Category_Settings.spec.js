/* @vitest-environment jsdom */
// Copyright (c) 2025 sw.consulting
// This file is a part of Media Pi frontend application

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import CategorySettings from '@/components/Category_Settings.vue'
import { redirectToDefaultRoute } from '@/helpers/default.route.js'

const routerGo = vi.hoisted(() => vi.fn())

const categoriesStore = {
  categories: ref([]),
  category: null,
  loading: ref(false),
  getById: vi.fn(),
  create: vi.fn(),
  update: vi.fn()
}

const alertStore = {
  alert: ref(null),
  error: vi.fn((message) => { alertStore.alert.value = { message, type: 'alert-danger' } }),
  clear: vi.fn()
}

let authStore = { isAdministrator: true }

vi.mock('pinia', async () => {
  const actual = await vi.importActual('pinia')
  return { ...actual, storeToRefs: (store) => store }
})

vi.mock('@/router', () => ({
  default: { go: routerGo }
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

vi.mock('@sw-consulting/tooling.ui.kit', () => ({
  ActionButton: {
    name: 'ActionButton',
    props: ['item', 'icon', 'iconSize', 'tooltipText', 'disabled', 'variant'],
    emits: ['click'],
    template: '<button :data-icon="icon" :data-icon-size="iconSize" :data-tooltip="tooltipText" :data-variant="variant" :disabled="disabled" @click="$emit(\'click\', item)"></button>'
  }
}))

const mountSettings = (props = {}) => mount({
  template: '<Suspense><CategorySettings v-bind="$attrs" /></Suspense>',
  components: { CategorySettings },
  inheritAttrs: false
}, {
  attrs: {
    register: true,
    ...props
  },
  global: {
    stubs: {
      Form: {
        template: '<form data-test="form" @submit.prevent="onSubmit"><slot :errors="errors" :isSubmitting="isSubmitting" :handleSubmit="handleSubmit" /></form>',
        props: ['validationSchema', 'initialValues'],
        emits: ['submit', 'invalid-submit'],
        data() {
          return {
            errors: props.showValidationError ? { title: 'Необходимо указать название' } : {},
            isSubmitting: props.isSubmitting || false
          }
        },
        methods: {
          handleSubmit(submit) {
            if (Object.keys(this.errors || {}).length) {
              this.$emit('invalid-submit', { errors: this.errors })
              return false
            }
            return submit({ ...this.initialValues, ...(props.submitValues || {}) })
          },
          onSubmit() {
            if (Object.keys(this.errors || {}).length) {
              this.$emit('invalid-submit', { errors: this.errors })
              return false
            }
            this.$emit('submit', { ...this.initialValues, ...(props.submitValues || {}) })
          }
        }
      },
      Field: {
        props: ['name'],
        template: '<input data-test="title-field" />'
      },
      ModalWindow: {
        template: '<div v-if="modelValue" data-test="modal-window"><slot /><slot name="actions" /></div>',
        props: ['modelValue', 'title'],
        emits: ['confirm', 'cancel', 'update:modelValue']
      },
      'v-btn': {
        template: '<button v-bind="$attrs"><slot /></button>'
      },
      VideosList: {
        props: {
          title: String,
          embedded: Boolean,
          fixedScope: String,
          pendingFixedScope: Boolean,
          beforeEmbeddedAction: Function
        },
        template: `
          <div data-test="category-videos-list" :data-title="title" :data-embedded="embedded ? 'true' : 'false'" :data-fixed-scope="fixedScope" :data-pending-fixed-scope="pendingFixedScope ? 'true' : 'false'">
            <button data-test="embedded-videos-action" @click="beforeEmbeddedAction && beforeEmbeddedAction()"></button>
          </div>
        `
      },
      SubscriptionsList: {
        props: {
          mode: String,
          categoryId: Number,
          categoryTitle: String,
          embedded: Boolean,
          beforeEmbeddedAction: Function
        },
        template: `
          <div data-test="category-subscriptions-list" :data-mode="mode" :data-category-id="categoryId" :data-category-title="categoryTitle" :data-embedded="embedded ? 'true' : 'false'">
            <button data-test="embedded-subscriptions-action" @click="beforeEmbeddedAction && beforeEmbeddedAction()"></button>
          </div>
        `
      }
    },
    mocks: {
      $router: { go: routerGo }
    }
  }
})

describe('Category_Settings.vue', () => {
  beforeEach(() => {
    authStore = { isAdministrator: true }
    categoriesStore.categories.value = []
    categoriesStore.category = null
    categoriesStore.loading.value = false
    categoriesStore.getById = vi.fn().mockResolvedValue()
    categoriesStore.create = vi.fn().mockResolvedValue()
    categoriesStore.update = vi.fn().mockResolvedValue()
    alertStore.alert.value = null
    vi.clearAllMocks()
  })

  it('creates category with Free checked by default', async () => {
    const wrapper = mountSettings({
      submitValues: { title: 'Movies' }
    })
    await flushPromises()

    expect(wrapper.find('[data-test="category-free-checkbox"]').element.checked).toBe(true)

    await wrapper.find('[data-test="form"]').trigger('submit')
    await flushPromises()

    expect(categoriesStore.create).toHaveBeenCalledWith({ title: 'Movies', free: true })
    expect(routerGo).toHaveBeenCalledWith(-1)
  })

  it('creates category with Free unchecked after user changes it', async () => {
    const wrapper = mountSettings({
      submitValues: { title: 'Premium' }
    })
    await flushPromises()

    await wrapper.find('[data-test="category-free-checkbox"]').setValue(false)
    await wrapper.find('[data-test="form"]').trigger('submit')
    await flushPromises()

    expect(categoriesStore.create).toHaveBeenCalledWith({ title: 'Premium', free: false })
  })

  it('creates a new category before the first embedded videos action and keeps the form open', async () => {
    categoriesStore.create = vi.fn(async (payload) => {
      categoriesStore.categories.value = [{ id: 44, ...payload }]
      return { id: 44, ...payload }
    })

    const wrapper = mountSettings({
      submitValues: { title: 'Fresh Category' }
    })
    await flushPromises()

    let videosList = wrapper.find('[data-test="category-videos-list"]')
    expect(videosList.exists()).toBe(true)
    expect(videosList.attributes('data-fixed-scope')).toBeUndefined()
    expect(videosList.attributes('data-pending-fixed-scope')).toBe('true')

    await wrapper.find('[data-test="embedded-videos-action"]').trigger('click')
    await flushPromises()

    expect(categoriesStore.create).toHaveBeenCalledWith({ title: 'Fresh Category', free: true })
    expect(routerGo).not.toHaveBeenCalled()

    videosList = wrapper.find('[data-test="category-videos-list"]')
    expect(videosList.attributes('data-fixed-scope')).toBe('category:44')
    expect(videosList.attributes('data-pending-fixed-scope')).toBe('false')
    expect(wrapper.find('.primary-heading').text()).toBe('Настройки категории')
  })

  it('loads category when editing and updates it', async () => {
    categoriesStore.category = { id: 9, title: 'Existing', free: false }

    const wrapper = mountSettings({
      register: false,
      id: 9,
      submitValues: { title: 'Updated' }
    })
    await flushPromises()

    expect(categoriesStore.getById).toHaveBeenCalledWith(9)
    expect(wrapper.find('[data-test="category-free-checkbox"]').element.checked).toBe(false)

    await wrapper.find('[data-test="category-free-checkbox"]').setValue(true)
    await wrapper.find('[data-test="form"]').trigger('submit')
    await flushPromises()

    expect(categoriesStore.update).toHaveBeenCalledWith(9, { title: 'Updated', free: true })
  })

  it('lists affected playlists before retrying category update with force cleanup', async () => {
    categoriesStore.category = { id: 9, title: 'Existing', free: true }
    categoriesStore.update = vi.fn()
      .mockRejectedValueOnce({
        status: 409,
        data: {
          affectedPlaylistCount: 1,
          affectedItemCount: 2,
          affectedVideoCount: 1,
          affectedPlaylists: [
            {
              playlistId: 11,
              title: 'Morning',
              filename: 'morning.m3u',
              accountId: 1,
              accountName: 'Cafe',
              removedItemCount: 2
            }
          ]
        }
      })
      .mockResolvedValueOnce()

    const wrapper = mountSettings({
      register: false,
      id: 9,
      submitValues: { title: 'Existing' }
    })
    await flushPromises()

    await wrapper.find('[data-test="category-free-checkbox"]').setValue(false)
    await wrapper.find('[data-test="form"]').trigger('submit')
    await flushPromises()

    expect(categoriesStore.update).toHaveBeenCalledWith(9, { title: 'Existing', free: false })
    expect(wrapper.find('[data-test="playlist-impact-list"]').text()).toContain('Cafe / Morning')
    expect(wrapper.find('[data-test="playlist-impact-list"]').text()).toContain('morning.m3u')

    await wrapper.find('[data-test="confirm-playlist-impact-button"]').trigger('click')
    await flushPromises()

    expect(categoriesStore.update).toHaveBeenLastCalledWith(9, {
      title: 'Existing',
      free: false,
      forcePlaylistCleanup: true
    })
  })

  it('renders category videos as an embedded subsection scoped to the category', async () => {
    categoriesStore.category = { id: 9, title: 'Existing', free: true }

    const wrapper = mountSettings({
      register: false,
      id: 9
    })
    await flushPromises()

    const videosList = wrapper.find('[data-test="category-videos-list"]')

    expect(wrapper.find('.primary-heading').text()).toBe("Настройки категории")
    expect(videosList.exists()).toBe(true)
    expect(videosList.attributes('data-title')).toBe('Видеофайлы')
    expect(videosList.attributes('data-subtitle')).toBeUndefined()
    expect(videosList.attributes('data-embedded')).toBe('true')
    expect(videosList.attributes('data-fixed-scope')).toBe('category:9')
  })

  it('shows category subscriptions for paid categories', async () => {
    categoriesStore.category = { id: 9, title: 'Existing', free: false }

    const wrapper = mountSettings({
      register: false,
      id: 9
    })
    await flushPromises()

    const subscriptionsList = wrapper.find('[data-test="category-subscriptions-list"]')
    const subscriptionsSection = wrapper.find('[data-test="category-subscriptions-section"]')

    expect(subscriptionsSection.exists()).toBe(true)
    expect(subscriptionsSection.isVisible()).toBe(true)
    expect(subscriptionsList.exists()).toBe(true)
    expect(subscriptionsList.isVisible()).toBe(true)
    expect(subscriptionsList.attributes('data-mode')).toBe('category')
    expect(subscriptionsList.attributes('data-category-id')).toBe('9')
    expect(subscriptionsList.attributes('data-category-title')).toBe('Existing')
    expect(subscriptionsList.attributes('data-embedded')).toBe('true')
    expect(wrapper.html().indexOf('data-test="category-videos-list"')).toBeLessThan(
      wrapper.html().indexOf('data-test="category-subscriptions-section"')
    )
  })

  it('saves the category before an embedded videos action without leaving the form', async () => {
    categoriesStore.category = { id: 9, title: 'Existing', free: false }

    const wrapper = mountSettings({
      register: false,
      id: 9,
      submitValues: { title: 'Embedded Save' }
    })
    await flushPromises()

    await wrapper.find('[data-test="embedded-videos-action"]').trigger('click')
    await flushPromises()

    expect(categoriesStore.update).toHaveBeenCalledWith(9, {
      title: 'Embedded Save',
      free: false
    })
    expect(routerGo).not.toHaveBeenCalled()
  })

  it('saves the category before an embedded subscriptions action without leaving the form', async () => {
    categoriesStore.category = { id: 9, title: 'Existing', free: false }

    const wrapper = mountSettings({
      register: false,
      id: 9,
      submitValues: { title: 'Subscription Save' }
    })
    await flushPromises()

    await wrapper.find('[data-test="embedded-subscriptions-action"]').trigger('click')
    await flushPromises()

    expect(categoriesStore.update).toHaveBeenCalledWith(9, {
      title: 'Subscription Save',
      free: false
    })
    expect(routerGo).not.toHaveBeenCalled()
  })

  it('keeps the category form open when embedded action save needs playlist cleanup confirmation', async () => {
    categoriesStore.category = { id: 9, title: 'Existing', free: true }
    categoriesStore.update = vi.fn()
      .mockRejectedValueOnce({
        status: 409,
        data: {
          affectedPlaylistCount: 1,
          affectedItemCount: 2,
          affectedVideoCount: 1,
          affectedPlaylists: [
            {
              playlistId: 11,
              title: 'Morning',
              filename: 'morning.m3u',
              accountId: 1,
              accountName: 'Cafe',
              removedItemCount: 2
            }
          ]
        }
      })
      .mockResolvedValueOnce()

    const wrapper = mountSettings({
      register: false,
      id: 9,
      submitValues: { title: 'Existing' }
    })
    await flushPromises()

    await wrapper.find('[data-test="category-free-checkbox"]').setValue(false)
    await wrapper.find('[data-test="embedded-videos-action"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-test="playlist-impact-dialog"]').exists()).toBe(true)
    expect(routerGo).not.toHaveBeenCalled()

    await wrapper.find('[data-test="confirm-playlist-impact-button"]').trigger('click')
    await flushPromises()

    expect(categoriesStore.update).toHaveBeenLastCalledWith(9, {
      title: 'Existing',
      free: false,
      forcePlaylistCleanup: true
    })
    expect(routerGo).not.toHaveBeenCalled()
    expect(wrapper.find('[data-test="playlist-impact-dialog"]').exists()).toBe(false)
  })

  it('renders the shared alert below embedded category lists', async () => {
    categoriesStore.category = { id: 9, title: 'Existing', free: false }
    alertStore.alert.value = { message: 'Category alert', type: 'alert-danger' }

    const wrapper = mountSettings({
      register: false,
      id: 9
    })
    await flushPromises()

    expect(wrapper.find('.alert-dismissable').text()).toContain('Category alert')
    expect(wrapper.html().indexOf('data-test="category-videos-list"')).toBeLessThan(
      wrapper.html().indexOf('alert-dismissable')
    )
    expect(wrapper.html().indexOf('data-test="category-subscriptions-section"')).toBeLessThan(
      wrapper.html().indexOf('alert-dismissable')
    )
  })

  it('shows store loading as a header action indicator', async () => {
    categoriesStore.loading.value = true

    const wrapper = mountSettings({
      submitValues: { title: 'Movies' }
    })
    await flushPromises()

    expect(wrapper.find('[data-test="settings-loading-indicator"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="settings-loading-indicator"] .spinner-border-m').exists()).toBe(true)
    expect(wrapper.find('.spinner-border-lg').exists()).toBe(false)
  })

  it('hides but keeps category subscriptions mounted when free access is enabled', async () => {
    categoriesStore.category = { id: 9, title: 'Existing', free: false }

    const wrapper = mountSettings({
      register: false,
      id: 9
    })
    await flushPromises()

    const subscriptionsList = wrapper.find('[data-test="category-subscriptions-list"]')
    expect(subscriptionsList.exists()).toBe(true)
    expect(subscriptionsList.isVisible()).toBe(true)

    await wrapper.find('[data-test="category-free-checkbox"]').setValue(true)
    await flushPromises()

    expect(wrapper.find('[data-test="category-subscriptions-list"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="category-subscriptions-section"]').attributes('style')).toContain('display: none')
  })

  it('redirects on 401 or 403 load error', async () => {
    categoriesStore.getById = vi.fn().mockRejectedValue({ status: 403 })

    mountSettings({ register: false, id: 9 })
    await flushPromises()

    expect(redirectToDefaultRoute).toHaveBeenCalled()
  })

  it('shows not found load error', async () => {
    categoriesStore.getById = vi.fn().mockRejectedValue({ status: 404 })

    mountSettings({ register: false, id: 9 })
    await flushPromises()

    expect(alertStore.error).toHaveBeenCalledWith('Категория с ID 9 не найдена')
  })

  it('shows generic load error when store returns no category', async () => {
    categoriesStore.category = null

    mountSettings({ register: false, id: 9 })
    await flushPromises()

    expect(alertStore.error).toHaveBeenCalledWith(
      'Ошибка загрузки категории: Категория с ID 9 не найдена'
    )
  })

  it('shows generic load error', async () => {
    categoriesStore.getById = vi.fn().mockRejectedValue(new Error('Network'))

    mountSettings({ register: false, id: 9 })
    await flushPromises()

    expect(alertStore.error).toHaveBeenCalledWith('Ошибка загрузки категории: Network')
  })

  it('handles conflict submit error', async () => {
    categoriesStore.create = vi.fn().mockRejectedValue({ status: 409 })
    const wrapper = mountSettings({ submitValues: { title: 'Movies' } })
    await flushPromises()

    await wrapper.find('[data-test="form"]').trigger('submit')
    await flushPromises()

    expect(alertStore.error).toHaveBeenCalledWith('Категория с таким названием уже существует или используется')
  })

  it('redirects on 401 or 403 submit error', async () => {
    categoriesStore.create = vi.fn().mockRejectedValue({ status: 401 })
    const wrapper = mountSettings({ submitValues: { title: 'Movies' } })
    await flushPromises()

    await wrapper.find('[data-test="form"]').trigger('submit')
    await flushPromises()

    expect(redirectToDefaultRoute).toHaveBeenCalled()
  })

  it('shows not found submit error', async () => {
    categoriesStore.update = vi.fn().mockRejectedValue({ status: 404 })
    categoriesStore.category = { id: 9, title: 'Existing', free: true }
    const wrapper = mountSettings({ register: false, id: 9, submitValues: { title: 'Movies' } })
    await flushPromises()

    await wrapper.find('[data-test="form"]').trigger('submit')
    await flushPromises()

    expect(alertStore.error).toHaveBeenCalledWith('Категория с ID 9 не найдена')
  })

  it('shows validation submit error', async () => {
    categoriesStore.create = vi.fn().mockRejectedValue({ status: 422 })
    const wrapper = mountSettings({ submitValues: { title: 'Movies' } })
    await flushPromises()

    await wrapper.find('[data-test="form"]').trigger('submit')
    await flushPromises()

    expect(alertStore.error).toHaveBeenCalledWith('Проверьте корректность введённых данных')
  })

  it('shows generic create submit error', async () => {
    categoriesStore.create = vi.fn().mockRejectedValue(new Error('Network'))
    const wrapper = mountSettings({ submitValues: { title: 'Movies' } })
    await flushPromises()

    await wrapper.find('[data-test="form"]').trigger('submit')
    await flushPromises()

    expect(alertStore.error).toHaveBeenCalledWith('Ошибка при создании категории: Network')
  })

  it('shows generic update submit error', async () => {
    categoriesStore.update = vi.fn().mockRejectedValue(new Error('Network'))
    categoriesStore.category = { id: 9, title: 'Existing', free: true }
    const wrapper = mountSettings({ register: false, id: 9, submitValues: { title: 'Movies' } })
    await flushPromises()

    await wrapper.find('[data-test="form"]').trigger('submit')
    await flushPromises()

    expect(alertStore.error).toHaveBeenCalledWith('Ошибка при обновлении категории: Network')
  })

  it('handles validation error state', async () => {
    const wrapper = mountSettings({ showValidationError: true })
    await flushPromises()

    await wrapper.find('[data-test="form"]').trigger('submit')
    await flushPromises()

    expect(alertStore.error).toHaveBeenCalledWith('Необходимо указать название')
  })

  it('handles cancel button click', async () => {
    const wrapper = mountSettings()
    await flushPromises()

    await wrapper.find('[data-test="cancel-category-button"]').trigger('click')

    expect(routerGo).toHaveBeenCalledWith(-1)
  })

  it('uses header ActionButtons for save and cancel actions', async () => {
    const wrapper = mountSettings({ submitValues: { title: 'Header Category' } })
    await flushPromises()

    const saveButton = wrapper.find('[data-test="save-category-button"]')
    const cancelButton = wrapper.find('[data-test="cancel-category-button"]')

    expect(saveButton.attributes('data-icon')).toBe('fa-solid fa-check-double')
    expect(saveButton.attributes('data-icon-size')).toBe('2x')
    expect(saveButton.attributes('data-tooltip')).toBe('Создать')
    expect(saveButton.attributes('data-variant')).toBeUndefined()
    expect(cancelButton.attributes('data-icon')).toBe('fa-solid fa-xmark')
    expect(cancelButton.attributes('data-icon-size')).toBe('2x')
    expect(cancelButton.attributes('data-tooltip')).toBe('Отменить')
    expect(cancelButton.attributes('data-variant')).toBeUndefined()

    await saveButton.trigger('click')
    await flushPromises()

    expect(categoriesStore.create).toHaveBeenCalledWith({ title: 'Header Category', free: true })
  })

  it('redirects non-administrator on create', async () => {
    authStore = { isAdministrator: false }

    mountSettings({ register: true })
    await flushPromises()

    expect(redirectToDefaultRoute).toHaveBeenCalled()
  })

  it('redirects non-administrator on edit', async () => {
    authStore = { isAdministrator: false }

    mountSettings({ register: false, id: 9 })
    await flushPromises()

    expect(redirectToDefaultRoute).toHaveBeenCalled()
  })

  it('redirects when id is missing on edit', async () => {
    mountSettings({ register: false })
    await flushPromises()

    expect(redirectToDefaultRoute).toHaveBeenCalled()
  })

  it('cancels playlist cleanup dialog without triggering force save', async () => {
    categoriesStore.category = { id: 9, title: 'Existing', free: true }
    categoriesStore.update = vi.fn().mockRejectedValueOnce({
      status: 409,
      data: {
        affectedPlaylistCount: 1,
        affectedItemCount: 2,
        affectedVideoCount: 1,
        affectedPlaylists: [
          { playlistId: 11, title: 'Morning', filename: 'morning.m3u', accountId: 1, accountName: 'Cafe', removedItemCount: 2 }
        ]
      }
    })

    const wrapper = mountSettings({ register: false, id: 9, submitValues: { title: 'Existing' } })
    await flushPromises()

    await wrapper.find('[data-test="category-free-checkbox"]').setValue(false)
    await wrapper.find('[data-test="form"]').trigger('submit')
    await flushPromises()

    expect(wrapper.find('[data-test="playlist-impact-list"]').exists()).toBe(true)

    await wrapper.find('[data-test="cancel-playlist-impact-button"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-test="playlist-impact-list"]').exists()).toBe(false)
    expect(categoriesStore.update).toHaveBeenCalledTimes(1)
  })
})

describe('Category_Settings.vue - additional coverage', () => {
  beforeEach(() => {
    authStore = { isAdministrator: true }
    categoriesStore.categories.value = []
    categoriesStore.category = null
    categoriesStore.loading.value = false
    categoriesStore.getById = vi.fn().mockResolvedValue()
    categoriesStore.create = vi.fn().mockResolvedValue()
    categoriesStore.update = vi.fn().mockResolvedValue()
    alertStore.alert.value = null
    vi.clearAllMocks()
  })

  it('uses title fallback empty string when loaded category has no title', async () => {
    categoriesStore.category = { id: 5, title: null, free: false }

    const wrapper = mountSettings({ register: false, id: 5 })
    await flushPromises()

    const titleInput = wrapper.find('[data-test="title-field"]')
    expect(titleInput.exists()).toBe(true)
  })

  it('uses free=true fallback when loaded category has undefined free field', async () => {
    categoriesStore.category = { id: 5, title: 'Sport' }

    const wrapper = mountSettings({ register: false, id: 5 })
    await flushPromises()

    expect(wrapper.find('[data-test="category-free-checkbox"]').element.checked).toBe(true)
  })

  it('shows generic error when saveCategoryPayload fails with non-http error on create', async () => {
    categoriesStore.create = vi.fn().mockRejectedValue(new Error('Network error'))

    const wrapper = mountSettings({ register: true, submitValues: { title: 'New Cat' } })
    await flushPromises()

    await wrapper.find('[data-test="form"]').trigger('submit')
    await flushPromises()

    expect(alertStore.error).toHaveBeenCalledWith(
      expect.stringContaining('Ошибка при создании категории')
    )
  })

  it('calls alertStore.clear when alert close button is clicked', async () => {
    categoriesStore.create = vi.fn().mockRejectedValue(new Error('Server error'))

    const wrapper = mountSettings({ register: true, submitValues: { title: 'New Cat' } })
    await flushPromises()

    await wrapper.find('[data-test="form"]').trigger('submit')
    await flushPromises()

    const closeButton = wrapper.find('.alert-dismissable .btn-link.close')
    expect(closeButton.exists()).toBe(true)
    await closeButton.trigger('click')

    expect(alertStore.clear).toHaveBeenCalled()
  })

  it('confirmPlaylistCleanup returns early when no pending payload', async () => {
    categoriesStore.category = { id: 9, title: 'Sport', free: true }

    const wrapper = mountSettings({ register: false, id: 9 })
    await flushPromises()

    // No 409 error triggered, so pendingCategoryPayload is null
    // Emit confirm directly from PlaylistAccessImpactDialog (dialog not open, pending is null)
    const impactDialog = wrapper.findComponent({ name: 'PlaylistAccessImpactDialog' })
    await impactDialog.vm.$emit('confirm')
    await flushPromises()

    expect(categoriesStore.update).not.toHaveBeenCalled()
  })

  it('cancelPlaylistCleanup does nothing while category force save is in progress', async () => {
    categoriesStore.category = { id: 9, title: 'Existing', free: true }

    let resolveUpdate
    categoriesStore.update = vi.fn()
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

    const wrapper = mountSettings({ register: false, id: 9, submitValues: { title: 'Existing' } })
    await flushPromises()

    await wrapper.find('[data-test="category-free-checkbox"]').setValue(false)
    await wrapper.find('[data-test="form"]').trigger('submit')
    await flushPromises()

    expect(wrapper.find('[data-test="playlist-impact-list"]').exists()).toBe(true)

    // Await confirm click so categoryForceSaving=true is set before cancelling
    await wrapper.find('[data-test="confirm-playlist-impact-button"]').trigger('click')
    // Emit cancel directly from PlaylistAccessImpactDialog to test Category_Settings guard
    const impactDialog = wrapper.findComponent({ name: 'PlaylistAccessImpactDialog' })
    await impactDialog.vm.$emit('cancel')
    await flushPromises()

    // Dialog still showing because cancelPlaylistCleanup guard blocked it
    expect(wrapper.find('[data-test="playlist-impact-list"]').exists()).toBe(true)

    resolveUpdate()
    await flushPromises()
  })
})
