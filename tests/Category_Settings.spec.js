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
        emits: ['submit'],
        data() {
          return {
            errors: props.showValidationError ? { title: 'Необходимо указать название' } : {},
            isSubmitting: props.isSubmitting || false
          }
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
      VideosList: {
        props: ['title', 'fixedScope'],
        template: '<div data-test="category-videos-list"></div>'
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

    expect(wrapper.text()).toContain('Необходимо указать название')
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

  it('redirects when id is NaN on edit', async () => {
    mountSettings({ register: false, id: NaN })
    await flushPromises()

    expect(redirectToDefaultRoute).toHaveBeenCalled()
  })
})
