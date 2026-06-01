// Copyright (c) 2025 sw.consulting
// This file is a part of Media Pi frontend application

<script setup>
import { computed, ref } from 'vue'
import router from '@/router'
import { storeToRefs } from 'pinia'
import { Form, Field } from 'vee-validate'
import * as Yup from 'yup'
import { ActionButton } from '@sw-consulting/tooling.ui.kit'

import { useAccountsStore } from '@/stores/accounts.store.js'
import { useAuthStore } from '@/stores/auth.store.js'
import { useAlertStore } from '@/stores/alert.store.js'
import { redirectToDefaultRoute } from '@/helpers/default.route.js'
import { isPlaylistAccessImpactError } from '@/helpers/playlist.access.impact.js'
import PlaylistAccessImpactDialog from '@/components/PlaylistAccessImpactDialog.vue'

const props = defineProps({
  register: {
    type: Boolean,
    required: true
  },
  accountId: {
    type: Number,
    required: true
  },
  categoryId: {
    type: Number,
    required: false
  }
})

const accountsStore = useAccountsStore()
const authStore = useAuthStore()
const alertStore = useAlertStore()
const { alert } = storeToRefs(alertStore)
const { loading } = storeToRefs(accountsStore)

const subscription = ref({ categoryId: props.categoryId || '', startDate: '', endDate: '' })
const availableCategories = ref([])
const currentCategory = ref(null)
const initialLoading = ref(false)
const playlistImpactDialog = ref(false)
const playlistImpact = ref(null)
const pendingSubscriptionSave = ref(null)
const subscriptionForceSaving = ref(false)
const faCheckDouble = 'fa-solid fa-check-double'
const faXmark = 'fa-solid fa-xmark'

if (!authStore.isAdministrator) {
  redirectToDefaultRoute()
}

const schema = Yup.object().shape({
  startDate: Yup.string().required('Укажите дату начала подписки'),
  endDate: Yup.string().required('Укажите дату окончания подписки')
})

const titleText = computed(() => (
  isRegister()
    ? 'Новая подписка'
    : `Настройки подписки '${currentCategory.value?.title || `Категория #${props.categoryId}`}'`
))

const buttonText = computed(() => (isRegister() ? 'Создать' : 'Сохранить'))

const categoryOptions = computed(() => (
  isRegister()
    ? availableCategories.value
    : currentCategory.value ? [currentCategory.value] : []
).map(category => ({
  value: category.id,
  text: category.title || `Категория ${category.id}`
})))

function isRegister() {
  return props.register
}

function isPaidCategory(category) {
  return category?.free !== true && category?.categoryFree !== true
}

function normalizeSubscriptionRow(item) {
  return {
    ...item,
    startDate: item.startDate || '',
    endDate: item.endDate || ''
  }
}

function resolveEditCategory(row) {
  return {
    id: row.categoryId,
    title: row.categoryTitle || `Категория ${row.categoryId}`,
    free: row.categoryFree ?? false
  }
}

if (!props.accountId || isNaN(props.accountId)) {
  redirectToDefaultRoute()
} else {
  initialLoading.value = true
  try {
    const data = await accountsStore.getSubscriptions(props.accountId)
    const paidAvailable = (data?.availableCategories || []).filter(isPaidCategory)
    if (isRegister()) {
      availableCategories.value = paidAvailable
      const firstAvailable = paidAvailable[0]
      subscription.value = {
        categoryId: firstAvailable?.id || '',
        startDate: '',
        endDate: ''
      }
    } else {
      const loadedSubscription = (data?.subscriptions || [])
        .filter(isPaidCategory)
        .map(normalizeSubscriptionRow)
        .find(item => item.categoryId === props.categoryId)
      if (!loadedSubscription) {
        throw new Error(`Подписка для категории с ID ${props.categoryId} не найдена`)
      }
      currentCategory.value = resolveEditCategory(loadedSubscription)
      subscription.value = {
        categoryId: loadedSubscription.categoryId,
        startDate: loadedSubscription.startDate,
        endDate: loadedSubscription.endDate
      }
    }
  } catch (err) {
    if (err.status === 401 || err.status === 403) {
      redirectToDefaultRoute()
    } else if (err.status === 404) {
      alertStore.error(`Лицевой счёт с ID ${props.accountId} не найден`)
    } else {
      alertStore.error(`Ошибка загрузки подписки: ${err.message || err}`)
    }
  } finally {
    initialLoading.value = false
  }
}

async function saveSubscriptionPayload(categoryId, payload, forcePlaylistCleanup = false) {
  try {
    await accountsStore.upsertSubscription(props.accountId, categoryId, {
      ...payload,
      ...(forcePlaylistCleanup ? { forcePlaylistCleanup: true } : {})
    })
    router.go(-1)
  } catch (err) {
    if (isPlaylistAccessImpactError(err) && !forcePlaylistCleanup) {
      playlistImpact.value = err.data
      pendingSubscriptionSave.value = { categoryId, payload }
      playlistImpactDialog.value = true
      return
    }
    if (err.status === 401 || err.status === 403) {
      redirectToDefaultRoute()
    } else if (err.status === 404) {
      alertStore.error(`Лицевой счёт с ID ${props.accountId} или категория с ID ${categoryId} не найдены`)
    } else if (err.status === 422 || err.status === 400) {
      alertStore.error('Проверьте корректность введённых данных')
    } else {
      alertStore.error(`Ошибка при ${isRegister() ? 'создании' : 'обновлении'} подписки: ${err.message || err}`)
    }
  }
}

async function onSubmit(values) {
  const categoryId = Number(subscription.value.categoryId)
  if (!categoryId) {
    alertStore.error('Выберите категорию')
    return
  }

  await saveSubscriptionPayload(categoryId, {
    startDate: values.startDate,
    endDate: values.endDate
  })
}

async function confirmPlaylistCleanup() {
  if (!pendingSubscriptionSave.value) return
  subscriptionForceSaving.value = true
  try {
    await saveSubscriptionPayload(
      pendingSubscriptionSave.value.categoryId,
      pendingSubscriptionSave.value.payload,
      true
    )
  } finally {
    subscriptionForceSaving.value = false
  }
}

function cancelPlaylistCleanup() {
  if (subscriptionForceSaving.value) return
  playlistImpactDialog.value = false
  pendingSubscriptionSave.value = null
}
</script>

<template>
  <div class="settings form-3 form-compact">
    <Form
      :validation-schema="schema"
      :initial-values="subscription"
      @submit="onSubmit"
      v-slot="{ errors, isSubmitting, handleSubmit }"
    >
      <div class="header-with-actions">
        <h1 class="primary-heading">{{ titleText }}</h1>
        <div class="header-actions-container">
          <div class="header-actions header-actions-group">
            <ActionButton
              data-test="save-subscription-settings-button"
              :item="{}"
              :icon="faCheckDouble"
              icon-size="2x"
              :tooltip-text="buttonText"
              :disabled="isSubmitting || !categoryOptions.length"
              @click="handleSubmit(onSubmit)"
            />
            <ActionButton
              data-test="cancel-subscription-settings-button"
              :item="{}"
              :icon="faXmark"
              icon-size="2x"
              tooltip-text="Отменить"
              @click="router.go(-1)"
            />
          </div>
        </div>
      </div>
      <hr class="hr" />

      <div class="form-group">
        <label for="categoryId" class="label">Категория:</label>
        <select
          id="categoryId"
          v-model="subscription.categoryId"
          data-test="subscription-category-select"
          class="form-control input"
          :disabled="!isRegister() || isSubmitting"
        >
          <option value="">Выберите категорию</option>
          <option v-for="option in categoryOptions" :key="option.value" :value="option.value">
            {{ option.text }}
          </option>
        </select>
      </div>

      <div class="form-group">
        <label for="startDate" class="label">Начало подписки:</label>
        <Field
          name="startDate"
          type="date"
          id="startDate"
          data-test="subscription-start-date"
          :disabled="isSubmitting"
          class="form-control input"
          :class="{ 'is-invalid': errors.startDate }"
        />
      </div>

      <div class="form-group">
        <label for="endDate" class="label">Окончание подписки:</label>
        <Field
          name="endDate"
          type="date"
          id="endDate"
          data-test="subscription-end-date"
          :disabled="isSubmitting"
          class="form-control input"
          :class="{ 'is-invalid': errors.endDate }"
        />
      </div>

      <div v-if="errors.startDate" class="alert alert-danger mt-3 mb-0">{{ errors.startDate }}</div>
      <div v-if="errors.endDate" class="alert alert-danger mt-3 mb-0">{{ errors.endDate }}</div>
      <div v-if="isRegister() && !categoryOptions.length" class="alert alert-info mt-3 mb-0">
        Нет категорий для подписки
      </div>
    </Form>

    <div v-if="alert" class="alert alert-dismissable mt-3 mb-0" :class="alert.type">
      <button @click="alertStore.clear()" class="btn btn-link close">×</button>
      {{ alert.message }}
    </div>

    <div v-if="loading || initialLoading || subscriptionForceSaving" class="text-center m-5">
      <span class="spinner-border spinner-border-lg align-center"></span>
      <div class="mt-2">{{ loading || subscriptionForceSaving ? 'Сохранение...' : 'Загрузка...' }}</div>
    </div>

    <PlaylistAccessImpactDialog
      v-model="playlistImpactDialog"
      :impact="playlistImpact"
      :saving="subscriptionForceSaving"
      @confirm="confirmPlaylistCleanup"
      @cancel="cancelPlaylistCleanup"
    />
  </div>
</template>
