// Copyright (c) 2025 sw.consulting
// This file is a part of Media Pi frontend application

<script setup>
import { computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { mdiMagnify } from '@mdi/js'
import { ActionButton } from '@sw-consulting/tooling.ui.kit'

import router from '@/router'
import { useCategoriesStore } from '@/stores/categories.store.js'
import { useAuthStore } from '@/stores/auth.store.js'
import { useAlertStore } from '@/stores/alert.store.js'
import { useConfirmation } from '@/helpers/confirmation.js'
import { itemsPerPageOptions } from '@/helpers/items.per.page.js'

const categoriesStore = useCategoriesStore()
const authStore = useAuthStore()
const alertStore = useAlertStore()
const { confirmDelete } = useConfirmation()

const { categories, loading } = storeToRefs(categoriesStore)
const { alert } = storeToRefs(alertStore)

const headers = computed(() => {
  const baseHeaders = [
    { title: 'Название', align: 'start', key: 'title', width: '70%' },
    { title: 'Доступ без подписки', align: 'center', key: 'free', width: '25%' }
  ]

  if (!authStore.isAdministrator) return baseHeaders

  return [
    { title: '', align: 'center', key: 'actions', sortable: false, width: '5%' },
    ...baseHeaders
  ]
})

onMounted(async () => {
  try {
    await categoriesStore.getAll()
  } catch (err) {
    alertStore.error('Не удалось загрузить категории: ' + (err?.message || err))
  }
})

function filterCategories(value, query, item) {
  if (!query) return true
  const rawCategory = item?.raw
  if (!rawCategory) return false
  const q = query.toLocaleLowerCase()
  const freeText = rawCategory.free ? 'да доступ без подписки' : 'нет подписка'
  return [rawCategory.title, freeText]
    .some(field => (field || '').toString().toLocaleLowerCase().includes(q))
}

function createCategory() {
  router.push('/category/create')
}

function editCategory(item) {
  if (!item || !authStore.isAdministrator) return
  router.push(`/category/edit/${item.id}`)
}

async function deleteCategory(item) {
  if (!item || !authStore.isAdministrator) return
  const confirmed = await confirmDelete(item.title || 'категория', 'категорию')
  if (!confirmed) return
  try {
    await categoriesStore.remove(item.id)
  } catch (err) {
    alertStore.error('Не удалось удалить категорию: ' + (err?.message || err))
  }
}
</script>

<template>
  <div class="settings table-2">
    <div class="header-with-actions">
      <h1 class="primary-heading">Категории</h1>
      <div v-if="authStore.isAdministrator" class="header-actions-container">
        <div v-if="loading" class="header-actions header-actions-group">
          <span class="spinner-border spinner-border-m"></span>
        </div>
        <div class="header-actions header-actions-group">
          <ActionButton
            data-test="create-category-button"
            :item="{}"
            icon="fa-solid fa-folder-plus"
            tooltip-text="Создать категорию"
            :disabled="loading"
            @click="createCategory"
          />
        </div>
      </div>
    </div>
    <hr class="hr" />

    <v-card>
      <div v-if="categories?.length">
        <v-text-field
          v-model="authStore.categories_search"
          :append-inner-icon="mdiMagnify"
          label="Поиск по категориям"
          variant="solo"
          hide-details
        />
      </div>
      <v-data-table
        v-if="categories?.length"
        v-model:items-per-page="authStore.categories_per_page"
        items-per-page-text="Категорий на странице"
        :items-per-page-options="itemsPerPageOptions"
        page-text="{0}-{1} из {2}"
        v-model:page="authStore.categories_page"
        :headers="headers"
        :items="categories"
        :search="authStore.categories_search"
        v-model:sort-by="authStore.categories_sort_by"
        :custom-filter="filterCategories"
        item-value="id"
        class="elevation-1"
      >
        <template v-slot:[`item.free`]="{ item }">
          <span :data-test="`category-free-${item.id}`">{{ item.free ? 'Да' : 'Нет' }}</span>
        </template>
        <template v-if="authStore.isAdministrator" v-slot:[`item.actions`]="{ item }">
          <div class="actions-container">
            <ActionButton
              data-test="edit-category-button"
              :item="item"
              icon="fa-solid fa-pen"
              tooltip-text="Редактировать категорию"
              :disabled="loading"
              @click="editCategory"
            />
            <ActionButton
              data-test="delete-category-button"
              :item="item"
              icon="fa-solid fa-trash-can"
              tooltip-text="Удалить категорию"
              :disabled="loading"
              @click="deleteCategory"
            />
          </div>
        </template>
      </v-data-table>
      <div v-if="!categories?.length" class="text-center m-5">
        {{ loading ? 'Загрузка...' : 'Нет категорий' }}
      </div>
    </v-card>
    <div v-if="alert" class="alert alert-dismissable mt-3 mb-0" :class="alert.type">
      <button @click="alertStore.clear()" class="btn btn-link close">×</button>
      {{ alert.message }}
    </div>
  </div>
</template>
