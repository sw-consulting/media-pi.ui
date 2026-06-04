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
import { showFormValidationErrors } from '@/helpers/form.validation.alert.js'
import PlaylistAccessImpactDialog from '@/components/PlaylistAccessImpactDialog.vue'

const props = defineProps({
  register: {
    type: Boolean,
    required: true
  },
  accountId: {
    type: Number,
    required: false
  },
  categoryId: {
    type: Number,
    required: false
  },
  categoryLocked: {
    type: Boolean,
    default: false
  },
  categoryTitle: {
    type: String,
    required: false,
    default: ''
  }
})

const accountsStore = useAccountsStore()
const authStore = useAuthStore()
const alertStore = useAlertStore()
const { alert } = storeToRefs(alertStore)
const { loading, account, accounts } = storeToRefs(accountsStore)

const subscription = ref({ categoryId: props.categoryId || '', startDate: '', endDate: '' })
const selectedAccountId = ref(props.accountId || '')
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

const titleText = computed(() => (isRegister() ? 'Создание подписки' : 'Редактирование подписки'))

const buttonText = computed(() => (isRegister() ? 'Создать' : 'Сохранить'))

const accountName = computed(() => account.value?.name || '')

const hasAccountIdProp = computed(() => props.accountId !== undefined && props.accountId !== null)

const hasFixedAccount = computed(() => (
  hasAccountIdProp.value && Boolean(props.accountId) && !isNaN(props.accountId)
))

const isCategoryLocked = computed(() => Boolean(isRegister() && props.categoryLocked && props.categoryId))

const accountOptions = computed(() => (
  accounts.value || []
).map(account => ({
  value: account.id,
  text: account.name || account.title || `Лицевой счёт ${account.id}`
})))

const categoryOptions = computed(() => (
  isCategoryLocked.value
    ? [{ id: props.categoryId, title: props.categoryTitle || `Категория ${props.categoryId}` }]
    : isRegister()
      ? availableCategories.value
      : currentCategory.value ? [currentCategory.value] : []
).map(category => ({
  value: category.id,
  text: category.title || `Категория ${category.id}`
})))

const canSaveSubscription = computed(() => (
  Boolean(selectedAccountId.value) && categoryOptions.value.length > 0
))

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

async function loadAccountSubscriptions(accountId) {
  const data = await accountsStore.getSubscriptions(accountId)
  const paidAvailable = (data?.availableCategories || []).filter(isPaidCategory)

  if (isRegister()) {
    availableCategories.value = paidAvailable
    const requestedCategory = paidAvailable.find(category => category.id === props.categoryId)
    const firstAvailable = isCategoryLocked.value
      ? { id: props.categoryId }
      : requestedCategory || paidAvailable[0]
    subscription.value = {
      categoryId: firstAvailable?.id || '',
      startDate: '',
      endDate: ''
    }
    return data
  }

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
  return data
}

async function onAccountChange() {
  const accountId = Number(selectedAccountId.value)
  if (!accountId) {
    availableCategories.value = []
    subscription.value = {
      categoryId: isCategoryLocked.value ? props.categoryId : '',
      startDate: '',
      endDate: ''
    }
    return
  }

  initialLoading.value = true
  try {
    await loadAccountSubscriptions(accountId)
  } catch (err) {
    alertStore.error(`Ошибка загрузки подписки: ${err.message || err}`)
  } finally {
    initialLoading.value = false
  }
}

if (hasAccountIdProp.value && (!props.accountId || isNaN(props.accountId))) {
  redirectToDefaultRoute()
} else {
  initialLoading.value = true
  try {
    if (hasFixedAccount.value) {
      await accountsStore.getById(props.accountId)
      await loadAccountSubscriptions(props.accountId)
    } else if (isRegister()) {
      await accountsStore.getAll()
      subscription.value = {
        categoryId: isCategoryLocked.value ? props.categoryId : '',
        startDate: '',
        endDate: ''
      }
    } else {
      redirectToDefaultRoute()
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

async function saveSubscriptionPayload(accountId, categoryId, payload, forcePlaylistCleanup = false) {
  try {
    await accountsStore.upsertSubscription(accountId, categoryId, {
      ...payload,
      ...(forcePlaylistCleanup ? { forcePlaylistCleanup: true } : {})
    })
    router.go(-1)
  } catch (err) {
    if (isPlaylistAccessImpactError(err) && !forcePlaylistCleanup) {
      playlistImpact.value = err.data
      pendingSubscriptionSave.value = { accountId, categoryId, payload }
      playlistImpactDialog.value = true
      return
    }
    if (err.status === 401 || err.status === 403) {
      redirectToDefaultRoute()
    } else if (err.status === 404) {
      alertStore.error(`Лицевой счёт с ID ${accountId} или категория с ID ${categoryId} не найдены`)
    } else if (err.status === 422 || err.status === 400) {
      alertStore.error('Проверьте корректность введённых данных')
    } else {
      alertStore.error(`Ошибка при ${isRegister() ? 'создании' : 'обновлении'} подписки: ${err.message || err}`)
    }
  }
}

async function onSubmit(values) {
  const accountId = Number(selectedAccountId.value)
  if (!accountId) {
    alertStore.error('Выберите лицевой счёт')
    return
  }

  const categoryId = Number(subscription.value.categoryId)
  if (!categoryId) {
    alertStore.error('Выберите категорию')
    return
  }

  await saveSubscriptionPayload(accountId, categoryId, {
    startDate: values.startDate,
    endDate: values.endDate
  })
}

async function confirmPlaylistCleanup() {
  if (!pendingSubscriptionSave.value) return
  subscriptionForceSaving.value = true
  try {
    await saveSubscriptionPayload(
      pendingSubscriptionSave.value.accountId,
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

function onInvalidSubmit(context) {
  return showFormValidationErrors(alertStore, context)
}
</script>

<template>
  <div class="settings form-3 form-compact">
    <Form
      :validation-schema="schema"
      :initial-values="subscription"
      @submit="onSubmit"
      @invalid-submit="onInvalidSubmit"
      v-slot="{ errors, isSubmitting, handleSubmit }"
    >
      <div class="header-with-actions">
        <h1 class="primary-heading">{{ titleText }}</h1>
        <div class="header-actions-container">
          <div
            v-if="loading || initialLoading || subscriptionForceSaving"
            class="header-actions header-actions-group"
            data-test="settings-loading-indicator"
          >
            <span class="spinner-border spinner-border-m"></span>
          </div>
          <div class="header-actions header-actions-group">
            <ActionButton
              data-test="save-subscription-settings-button"
              :item="{}"
              :icon="faCheckDouble"
              icon-size="2x"
              :tooltip-text="buttonText"
              :disabled="isSubmitting || !canSaveSubscription"
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

      <div v-if="hasFixedAccount" class="form-group">
        <label for="accountName" class="label">Лицевой счёт:</label>
        <input
          id="accountName"
          data-test="subscription-account-name"
          :value="accountName"
          readonly
          class="form-control input"
        />
      </div>

      <div v-else class="form-group">
        <label for="accountId" class="label">Лицевой счёт:</label>
        <select
          id="accountId"
          v-model="selectedAccountId"
          data-test="subscription-account-select"
          class="form-control input"
          :disabled="isSubmitting"
          @change="onAccountChange"
        >
          <option value="">Выберите лицевой счёт</option>
          <option v-for="option in accountOptions" :key="option.value" :value="option.value">
            {{ option.text }}
          </option>
        </select>
      </div>

      <div class="form-group">
        <label for="categoryId" class="label">Категория:</label>
        <select
          id="categoryId"
          v-model="subscription.categoryId"
          data-test="subscription-category-select"
          class="form-control input"
          :disabled="!isRegister() || isCategoryLocked || isSubmitting"
        >
          <option value="">Выберите категорию</option>
          <option v-for="option in categoryOptions" :key="option.value" :value="option.value">
            {{ option.text }}
          </option>
        </select>
      </div>

      <div class="subscription-date-row" data-test="subscription-date-row">
        <div class="form-group subscription-date-group">
          <label for="startDate" class="label">Начало подписки:</label>
          <Field
            name="startDate"
            v-model="subscription.startDate"
            type="date"
            id="startDate"
            data-test="subscription-start-date"
            :disabled="isSubmitting"
            class="form-control input date-input"
            :class="{ 'is-invalid': errors.startDate }"
          />
        </div>

        <div class="form-group subscription-date-group">
          <label for="endDate" class="label">Окончание подписки:</label>
          <Field
            name="endDate"
            v-model="subscription.endDate"
            type="date"
            id="endDate"
            data-test="subscription-end-date"
            :disabled="isSubmitting"
            class="form-control input date-input"
            :class="{ 'is-invalid': errors.endDate }"
          />
        </div>
      </div>
      <div v-if="isRegister() && !categoryOptions.length" class="alert alert-info mt-3 mb-0">
        Нет категорий для подписки
      </div>
    </Form>

    <div v-if="alert" class="alert alert-dismissable mt-3 mb-0" :class="alert.type">
      <button @click="alertStore.clear()" class="btn btn-link close">×</button>
      {{ alert.message }}
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

<style scoped>
.subscription-date-row {
  display: grid;
  grid-template-columns: calc(40% + 0.375rem) minmax(0, 1fr);
  column-gap: 0;
  row-gap: 0.25rem;
  align-items: center;
}

.subscription-date-group {
  min-width: 0;
}

.subscription-date-group .label {
  width: auto;
  min-width: 8.5rem;
}

.date-input {
  flex: 0 0 12rem;
  width: 12rem;
  max-width: 12rem;
}
</style>
