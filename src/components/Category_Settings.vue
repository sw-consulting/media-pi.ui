// Copyright (c) 2025 sw.consulting
// This file is a part of Media Pi frontend application

<script setup>
import { computed, ref } from 'vue'
import router from '@/router'
import { storeToRefs } from 'pinia'
import { Form, Field } from 'vee-validate'
import * as Yup from 'yup'
import { ActionButton } from '@sw-consulting/tooling.ui.kit'

import { useCategoriesStore } from '@/stores/categories.store.js'
import { useAlertStore } from '@/stores/alert.store.js'
import { useAuthStore } from '@/stores/auth.store.js'
import { redirectToDefaultRoute } from '@/helpers/default.route.js'
import { isPlaylistAccessImpactError } from '@/helpers/playlist.access.impact.js'
import { showFormValidationErrors } from '@/helpers/form.validation.alert.js'
import AlertOutput from '@/components/AlertOutput.vue'
import VideosList from '@/components/Videos_List.vue'
import SubscriptionsList from '@/components/Subscriptions_List.vue'
import PlaylistAccessImpactDialog from '@/components/PlaylistAccessImpactDialog.vue'
import { createCategoryScope } from '@/helpers/video.scope.helpers.js'

const props = defineProps({
  register: {
    type: Boolean,
    required: true
  },
  id: {
    type: Number,
    required: false
  }
})

const categoriesStore = useCategoriesStore()
const alertStore = useAlertStore()
const authStore = useAuthStore()
const { loading } = storeToRefs(categoriesStore)

if (!authStore.isAdministrator) {
  redirectToDefaultRoute()
}

const schema = Yup.object().shape({
  title: Yup.string().trim().required('Необходимо указать название')
})

const category = ref({ title: '', free: true })
const createdCategoryId = ref(null)
const initialLoading = ref(false)
const playlistImpactDialog = ref(false)
const playlistImpact = ref(null)
const pendingCategoryPayload = ref(null)
const pendingCategoryNavigate = ref(true)
const categoryForceSaving = ref(false)
const faCheckDouble = 'fa-solid fa-check-double'
const faXmark = 'fa-solid fa-xmark'
let beforeEmbeddedActionHandler = async () => true
const categoryTitleText = computed(() => (
  isCreatingNewCategory()
    ? 'Новая категория'
    : 'Настройки категории'
))
const activeCategoryId = computed(() => props.id || createdCategoryId.value)
const categoryVideosScope = computed(() => (
  activeCategoryId.value ? createCategoryScope(activeCategoryId.value) : null
))
const isPendingCategoryVideosScope = computed(() => !activeCategoryId.value)
const showCategoryVideosList = computed(() => (
  authStore.isAdministrator && (isRegister() || Boolean(activeCategoryId.value))
))

function isRegister() {
  return props.register
}

function getButton() {
  return isCreatingNewCategory() ? 'Создать' : 'Сохранить'
}

function isCreatingNewCategory() {
  return isRegister() && !activeCategoryId.value
}

function normalizeCategoryId(value) {
  const id = Number(value)
  return Number.isFinite(id) && id > 0 ? id : null
}

function getStoredCategories() {
  const items = categoriesStore.categories
  if (Array.isArray(items)) return items
  if (Array.isArray(items?.value)) return items.value
  return []
}

function resolveCreatedCategoryId(createdCategory, payload) {
  const directId = normalizeCategoryId(createdCategory?.id)
    || normalizeCategoryId(createdCategory?.categoryId)
    || normalizeCategoryId(createdCategory?.category?.id)
  if (directId) return directId

  const matchingCategory = getStoredCategories().find(item => (
    item?.title === payload.title && item?.free === payload.free
  ))
  return normalizeCategoryId(matchingCategory?.id)
}

if (!isRegister()) {
  if (!props.id || isNaN(props.id)) {
    redirectToDefaultRoute()
  } else {
    initialLoading.value = true
    try {
      await categoriesStore.getById(props.id)
      const loadedCategory = categoriesStore.category
      if (!loadedCategory) {
        throw new Error(`Категория с ID ${props.id} не найдена`)
      }
      category.value = {
        title: loadedCategory.title || '',
        free: loadedCategory.free ?? true
      }
    } catch (err) {
      if (err.status === 401 || err.status === 403) {
        redirectToDefaultRoute()
      } else if (err.status === 404) {
        alertStore.error(`Категория с ID ${props.id} не найдена`)
      } else {
        alertStore.error(`Ошибка загрузки категории: ${err.message || err}`)
      }
    } finally {
      initialLoading.value = false
    }
  }
}

function runSubmitHandler(handleSubmit, submit) {
  const submitResult = handleSubmit(submit)
  return typeof submitResult === 'function' ? submitResult() : submitResult
}

function captureEmbeddedActionHandler(handleSubmit) {
  beforeEmbeddedActionHandler = async () => {
    let submitted = false
    const result = await runSubmitHandler(handleSubmit, async (values) => {
      submitted = true
      return saveBeforeEmbeddedAction(values)
    })
    return submitted && result !== false
  }
  return true
}

async function beforeEmbeddedListAction() {
  return beforeEmbeddedActionHandler()
}

async function saveCategoryPayload(payload, forcePlaylistCleanup = false, navigate = true) {
  try {
    if (isCreatingNewCategory()) {
      const createdCategory = await categoriesStore.create(payload)
      const savedCategoryId = resolveCreatedCategoryId(createdCategory, payload)
      if (savedCategoryId) {
        createdCategoryId.value = savedCategoryId
      } else if (!navigate) {
        alertStore.error('Категория создана, но не удалось определить её ID для загрузки видеофайлов')
        return false
      }
    } else {
      const updatePayload = { ...payload }
      if (forcePlaylistCleanup) updatePayload.forcePlaylistCleanup = true
      await categoriesStore.update(activeCategoryId.value, updatePayload)
    }
    category.value = { ...category.value, title: payload.title, free: payload.free }
    playlistImpactDialog.value = false
    playlistImpact.value = null
    pendingCategoryPayload.value = null
    pendingCategoryNavigate.value = true
    if (navigate) {
      router.go(-1)
    }
    return true
  } catch (err) {
    if (isPlaylistAccessImpactError(err) && !forcePlaylistCleanup) {
      playlistImpact.value = err.data
      pendingCategoryPayload.value = payload
      pendingCategoryNavigate.value = navigate
      playlistImpactDialog.value = true
      return false
    }
    if (err.status === 401 || err.status === 403) {
      redirectToDefaultRoute()
    } else if (err.status === 404) {
      alertStore.error(`Категория с ID ${activeCategoryId.value || props.id} не найдена`)
    } else if (err.status === 409) {
      alertStore.error('Категория с таким названием уже существует или используется')
    } else if (err.status === 422) {
      alertStore.error('Проверьте корректность введённых данных')
    } else {
      alertStore.error(`Ошибка при ${isCreatingNewCategory() ? 'создании' : 'обновлении'} категории: ${err.message || err}`)
    }
    return false
  }
}

async function onSubmit(values) {
  const payload = {
    title: values.title.trim(),
    free: category.value.free
  }
  await saveCategoryPayload(payload)
}

async function saveBeforeEmbeddedAction(values) {
  const payload = {
    title: values.title.trim(),
    free: category.value.free
  }
  const saved = await saveCategoryPayload(payload, false, false)
  return saved && Boolean(activeCategoryId.value)
}

async function confirmPlaylistCleanup() {
  if (!pendingCategoryPayload.value) return
  categoryForceSaving.value = true
  try {
    await saveCategoryPayload(pendingCategoryPayload.value, true, pendingCategoryNavigate.value)
  } finally {
    categoryForceSaving.value = false
  }
}

function cancelPlaylistCleanup() {
  if (categoryForceSaving.value) return
  playlistImpactDialog.value = false
  pendingCategoryPayload.value = null
  pendingCategoryNavigate.value = true
}

function onInvalidSubmit(context) {
  return showFormValidationErrors(alertStore, context)
}
</script>

<template>
  <div class="settings form-4 form-compact">
    <Form
      :validation-schema="schema"
      :initial-values="category"
      @submit="onSubmit"
      @invalid-submit="onInvalidSubmit"
      v-slot="{ errors, isSubmitting, handleSubmit }"
    >
      <div class="header-with-actions">
        <h1 class="primary-heading">{{ categoryTitleText }}</h1>
        <div class="header-actions-container">
          <div
            v-if="loading || initialLoading || categoryForceSaving"
            class="header-actions header-actions-group"
            data-test="settings-loading-indicator"
          >
            <span class="spinner-border spinner-border-m"></span>
          </div>
          <div class="header-actions header-actions-group">
            <ActionButton
              data-test="save-category-button"
              :item="{}"
              :icon="faCheckDouble"
              icon-size="2x"
              :tooltip-text="getButton()"
              :disabled="isSubmitting"
              @click="handleSubmit(onSubmit)"
            />
            <ActionButton
              data-test="cancel-category-button"
              :item="{}"
              :icon="faXmark"
              icon-size="2x"
              tooltip-text="Отменить"
              @click="$router.go(-1)"
            />
          </div>
        </div>
      </div>
      <hr class="hr" />
      <AlertOutput />

      <div class="form-group">
        <label for="title" class="label">Название:</label>
        <Field
          name="title"
          type="text"
          id="title"
          :disabled="isSubmitting"
          class="form-control input"
          :class="{ 'is-invalid': errors.title }"
          placeholder="Введите название категории"
        />
      </div>

      <div class="form-group">
        <span class="label"></span>
        <div class="category-free-control">
          <input
            id="category-free"
            data-test="category-free-checkbox"
            v-model="category.free"
            class="checkbox-styled"
            type="checkbox"
            :disabled="isSubmitting"
          />
          <label for="category-free">Доступ без подписки</label>
        </div>
      </div>
      <template v-if="captureEmbeddedActionHandler(handleSubmit)"></template>
    </Form>

    <VideosList
      v-if="showCategoryVideosList"
      class="mt-8"
      title="Видеофайлы"
      embedded
      :fixed-scope="categoryVideosScope"
      :pending-fixed-scope="isPendingCategoryVideosScope"
      :before-embedded-action="beforeEmbeddedListAction"
    />

    <div
      v-if="!isRegister() && props.id"
      v-show="!category.free"
      data-test="category-subscriptions-section"
      class="mt-8"
    >
      <SubscriptionsList
        mode="category"
        :category-id="props.id"
        :category-title="category.title"
        embedded
        :before-embedded-action="beforeEmbeddedListAction"
      />
    </div>

    <PlaylistAccessImpactDialog
      v-model="playlistImpactDialog"
      :impact="playlistImpact"
      :saving="categoryForceSaving"
      @confirm="confirmPlaylistCleanup"
      @cancel="cancelPlaylistCleanup"
    />
  </div>
</template>

<style scoped>
.category-free-control {
  display: flex;
  align-items: center;
  min-height: 2rem;
}

.category-free-control label {
  cursor: pointer;
  font-size: 0.875rem;
}

.category-free-control .checkbox-styled:disabled + label {
  cursor: not-allowed;
  opacity: 0.7;
}
</style>
