/* @vitest-environment jsdom */
// Copyright (c) 2025 sw.consulting
// This file is a part of Media Pi frontend application

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import CategoriesList from '@/components/Categories_List.vue'

const routerPush = vi.hoisted(() => vi.fn())

let currentAuthStore

const categoriesStore = {
  categories: ref([]),
  loading: ref(false),
  error: ref(null),
  getAll: vi.fn(async () => categoriesStore.categories.value),
  remove: vi.fn(async () => ({}))
}

const alertStore = {
  alert: ref(null),
  error: vi.fn((message) => { alertStore.alert.value = { message, type: 'alert-danger' } }),
  clear: vi.fn()
}

const confirmation = { confirmDelete: vi.fn(async () => true) }

vi.mock('@/stores/categories.store.js', () => ({ useCategoriesStore: () => categoriesStore }))
vi.mock('@/stores/auth.store.js', () => ({ useAuthStore: () => currentAuthStore }))
vi.mock('@/stores/alert.store.js', () => ({ useAlertStore: () => alertStore }))
vi.mock('@/helpers/confirmation.js', () => ({ useConfirmation: () => confirmation }))
vi.mock('@/router', () => ({ default: { push: routerPush } }))
vi.mock('@sw-consulting/tooling.ui.kit', () => ({
  ActionButton: { name: 'ActionButton', props: ['item', 'disabled'], emits: ['click'], template: '<button :disabled="disabled" @click="$emit(\'click\', item)"></button>' }
}))

const globalStubs = {
  'v-card': { template: '<div><slot /></div>' },
  'v-data-table': {
    props: ['items', 'customFilter'],
    template: `
      <div class="data-table">
        <div v-for="item in items" :key="item.id" class="data-row">
          <slot name="item.actions" :item="item" />
          <span class="title-cell">{{ item.title }}</span>
          <slot name="item.free" :item="item" />
          <span v-if="customFilter" :data-test="'filter-empty-' + item.id">{{ customFilter(null, '', { raw: item }) }}</span>
          <span v-if="customFilter" :data-test="'filter-free-' + item.id">{{ customFilter(null, item.free ? 'доступ' : 'подписка', { raw: item }) }}</span>
          <span v-if="customFilter" :data-test="'filter-missing-' + item.id">{{ customFilter(null, 'x', {}) }}</span>
        </div>
      </div>
    `
  },
  'v-text-field': { props: ['modelValue'], emits: ['update:modelValue'], template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />' }
}

function mountList() {
  return mount(CategoriesList, { global: { stubs: globalStubs } })
}

describe('Categories_List.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    categoriesStore.categories.value = []
    categoriesStore.loading.value = false
    categoriesStore.error.value = null
    categoriesStore.getAll = vi.fn(async () => categoriesStore.categories.value)
    categoriesStore.remove = vi.fn(async () => ({}))
    alertStore.alert.value = null
    confirmation.confirmDelete = vi.fn(async () => true)
    currentAuthStore = {
      isAdministrator: true,
      isManager: false,
      categories_per_page: 10,
      categories_search: '',
      categories_sort_by: [],
      categories_page: 1
    }
  })

  it('loads and renders categories', async () => {
    categoriesStore.categories.value = [
      { id: 1, title: 'Movies', free: true },
      { id: 2, title: 'Sport', free: false }
    ]

    const wrapper = mountList()
    await flushPromises()

    expect(categoriesStore.getAll).toHaveBeenCalled()
    expect(wrapper.text()).toContain('Movies')
    expect(wrapper.find('[data-test="category-free-1"]').text()).toBe('Да')
    expect(wrapper.find('[data-test="category-free-2"]').text()).toBe('Нет')
    expect(wrapper.find('[data-test="filter-empty-1"]').text()).toBe('true')
    expect(wrapper.find('[data-test="filter-free-1"]').text()).toBe('true')
    expect(wrapper.find('[data-test="filter-free-2"]').text()).toBe('true')
    expect(wrapper.find('[data-test="filter-missing-1"]').text()).toBe('false')
  })

  it('routes admin to create category', async () => {
    const wrapper = mountList()
    await flushPromises()

    await wrapper.find('[data-test="create-category-button"]').trigger('click')

    expect(routerPush).toHaveBeenCalledWith('/category/create')
  })

  it('routes admin to edit category', async () => {
    categoriesStore.categories.value = [{ id: 7, title: 'Movies', free: true }]
    const wrapper = mountList()
    await flushPromises()

    await wrapper.find('[data-test="edit-category-button"]').trigger('click')

    expect(routerPush).toHaveBeenCalledWith('/category/edit/7')
  })

  it('deletes category after confirmation', async () => {
    categoriesStore.categories.value = [{ id: 7, title: 'Movies', free: true }]
    const wrapper = mountList()
    await flushPromises()

    await wrapper.find('[data-test="delete-category-button"]').trigger('click')

    expect(confirmation.confirmDelete).toHaveBeenCalledWith('Movies', 'категорию')
    expect(categoriesStore.remove).toHaveBeenCalledWith(7)
  })

  it('does not delete category when confirmation is cancelled', async () => {
    confirmation.confirmDelete = vi.fn(async () => false)
    categoriesStore.categories.value = [{ id: 7, title: 'Movies', free: true }]
    const wrapper = mountList()
    await flushPromises()

    await wrapper.find('[data-test="delete-category-button"]').trigger('click')

    expect(categoriesStore.remove).not.toHaveBeenCalled()
  })

  it('shows manager read-only list without action buttons', async () => {
    currentAuthStore.isAdministrator = false
    currentAuthStore.isManager = true
    categoriesStore.categories.value = [{ id: 7, title: 'Movies', free: true }]

    const wrapper = mountList()
    await flushPromises()

    expect(wrapper.text()).toContain('Movies')
    expect(wrapper.find('[data-test="create-category-button"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="edit-category-button"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="delete-category-button"]').exists()).toBe(false)
  })

  it('reports load error', async () => {
    categoriesStore.getAll = vi.fn().mockRejectedValue(new Error('API down'))

    mountList()
    await flushPromises()

    expect(alertStore.error).toHaveBeenCalledWith('Не удалось загрузить категории: API down')
  })

  it('reports delete error', async () => {
    categoriesStore.categories.value = [{ id: 7, title: 'Movies', free: true }]
    categoriesStore.remove = vi.fn().mockRejectedValue(new Error('in use'))
    const wrapper = mountList()
    await flushPromises()

    await wrapper.find('[data-test="delete-category-button"]').trigger('click')
    await flushPromises()

    expect(alertStore.error).toHaveBeenCalledWith('Не удалось удалить категорию: in use')
  })
})
