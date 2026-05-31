// Copyright (c) 2025 sw.consulting
// This file is a part of Media Pi  frontend application

<script setup>
import { ref, computed } from 'vue'
import router from '@/router'
import { storeToRefs } from 'pinia'
import { Form, Field } from 'vee-validate'
import * as Yup from 'yup'
import { ActionButton } from '@sw-consulting/tooling.ui.kit'

import { useAccountsStore } from '@/stores/accounts.store.js'
import { useUsersStore } from '@/stores/users.store.js'
import { useAuthStore } from '@/stores/auth.store.js'
import { useAlertStore } from '@/stores/alert.store.js'
import { UserRoleConstants } from '@/helpers/user.helpers.js'
import { redirectToDefaultRoute } from '@/helpers/default.route.js'
import { isPlaylistAccessImpactError } from '@/helpers/playlist.access.impact.js'
import FieldArrayWithButtons from '@/components/FieldArrayWithButtons.vue'
import PlaylistAccessImpactDialog from '@/components/PlaylistAccessImpactDialog.vue'


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

const accountsStore = useAccountsStore()
const usersStore = useUsersStore()
const authStore = useAuthStore()
const alertStore = useAlertStore()
const { alert } = storeToRefs(alertStore)

const schema = Yup.object().shape({
  name: Yup.string().required('Необходимо указать имя'),
  managers: Yup.array().of(
    Yup.mixed().test(
      'is-number-or-empty', 
      'Ошибка выбора пользователей', 
      value => value === '' || (typeof value === 'number' && !isNaN(value))
    )
  )
})

let account = ref({ name: '', managers: [''] })
const { loading } = storeToRefs(accountsStore) 
const initialLoading = ref(false)
const subscriptionsData = ref({ subscriptions: [], availableCategories: [] })
const subscriptionRows = ref([])
const newSubscription = ref({ categoryId: '', startDate: '', endDate: '' })
const subscriptionSaving = ref(false)
const playlistImpactDialog = ref(false)
const playlistImpact = ref(null)
const pendingSubscriptionSave = ref(null)
const faCheckDouble = 'fa-solid fa-check-double'
const faXmark = 'fa-solid fa-xmark'

if (!isRegister()) {
  initialLoading.value = true
  try {
    await accountsStore.getById(props.id)
    const loadedAccount = accountsStore.account
    if (!loadedAccount) {
      throw new Error(`Лицевой счёт с ID ${props.id} не найден`)
    }
    // Update the reactive account data
    // Only include valid AccountManager IDs
    const validManagerIds = (usersStore.users || [])
      .filter(u => Array.isArray(u.roles) && u.roles.includes(UserRoleConstants.AccountManager))
      .map(u => u.id)
    let filteredManagers = (loadedAccount.userIds || []).filter(id => validManagerIds.includes(id))
    if (filteredManagers.length === 0) {
      filteredManagers = ['']
    }
    account.value = {
      name: loadedAccount.name || '',
      managers: filteredManagers
    };
    await loadSubscriptions()
  } catch (err) {
    if (err.status === 401 || err.status === 403) {
      redirectToDefaultRoute()
    } else if (err.status === 404) {
      alertStore.error(`Лицевой счёт с ID ${props.id} не найден`)
    } else {
      alertStore.error(`Ошибка загрузки лицевого счёта: ${err.message || err}`)
    }
  } finally {
    initialLoading.value = false
  }
}

try {
  if (canEditManagers()) {
    await usersStore.getAll()
  }
  else {
    await usersStore.getByAccount(props.id)
  }
} catch (err) {
    alertStore.error(`Не удалось загрузить список пользователей: ${err.message || err}`)
}

const managerOptions = computed(() => {
  return (usersStore.users || [])
    .filter(u => Array.isArray(u.roles) && u.roles.includes(UserRoleConstants.AccountManager))
    .map(u => ({
      value: u.id,
      text: `${u.lastName || ''} ${u.firstName || ''} ${u.patronymic || ''}`.trim()
    }))
})

const availableCategoryOptions = computed(() => (
  subscriptionsData.value.availableCategories || []
).map(category => ({
  value: category.id,
  text: category.title || `Категория ${category.id}`
})))

const selectedManagerNames = computed(() => {
   return canEditManagers() ? [] : (usersStore.users || [])
})

function isRegister() {
  return props.register
}

function canEditManagers() {
  return authStore.isAdministrator
}

function canEditSubscriptions() {
  return authStore.isAdministrator
}

function getButton() {
  return isRegister() ? 'Создать' : 'Сохранить'
}

function isPaidCategory(category) {
  return category?.free !== true && category?.categoryFree !== true
}

function applySubscriptionsData(data) {
  const normalizedData = data || { subscriptions: [], availableCategories: [] }
  subscriptionsData.value = {
    subscriptions: normalizedData.subscriptions || [],
    availableCategories: (normalizedData.availableCategories || []).filter(isPaidCategory)
  }
  subscriptionRows.value = (subscriptionsData.value.subscriptions || []).filter(isPaidCategory).map(item => ({
    ...item,
    startDate: item.startDate || '',
    endDate: item.endDate || ''
  }))
  const firstAvailable = (subscriptionsData.value.availableCategories || [])[0]
  newSubscription.value = {
    categoryId: firstAvailable?.id || '',
    startDate: '',
    endDate: ''
  }
}

async function loadSubscriptions() {
  if (isRegister() || !props.id) return
  const data = await accountsStore.getSubscriptions(props.id)
  applySubscriptionsData(data)
}

async function saveSubscriptionPayload(categoryId, payload, forcePlaylistCleanup = false) {
  subscriptionSaving.value = true
  try {
    const data = await accountsStore.upsertSubscription(props.id, categoryId, {
      ...payload,
      ...(forcePlaylistCleanup ? { forcePlaylistCleanup: true } : {})
    })
    applySubscriptionsData(data)
    playlistImpactDialog.value = false
    pendingSubscriptionSave.value = null
  } catch (err) {
    if (isPlaylistAccessImpactError(err) && !forcePlaylistCleanup) {
      playlistImpact.value = err.data
      pendingSubscriptionSave.value = { categoryId, payload }
      playlistImpactDialog.value = true
      return
    }
    alertStore.error(`Ошибка при сохранении подписки: ${err.message || err}`)
  } finally {
    subscriptionSaving.value = false
  }
}

async function saveSubscription(row) {
  if (!row?.categoryId || !row.startDate || !row.endDate) {
    alertStore.error('Укажите даты подписки')
    return
  }
  await saveSubscriptionPayload(row.categoryId, {
    startDate: row.startDate,
    endDate: row.endDate
  })
}

async function addSubscription() {
  if (!newSubscription.value.categoryId || !newSubscription.value.startDate || !newSubscription.value.endDate) {
    alertStore.error('Выберите категорию и даты подписки')
    return
  }
  await saveSubscriptionPayload(newSubscription.value.categoryId, {
    startDate: newSubscription.value.startDate,
    endDate: newSubscription.value.endDate
  })
}

async function confirmPlaylistCleanup() {
  const pending = pendingSubscriptionSave.value
  if (!pending) return
  await saveSubscriptionPayload(pending.categoryId, pending.payload, true)
}

function cancelPlaylistCleanup() {
  if (subscriptionSaving.value) return
  playlistImpactDialog.value = false
  pendingSubscriptionSave.value = null
}

async function onSubmit(values) {
  try {
    // Filter out empty string values and convert to numbers
    const filteredManagers = (values.managers || [])
      .filter(manager => manager !== '' && manager !== null && manager !== undefined)
      .map(manager => typeof manager === 'string' ? parseInt(manager, 10) : manager)
      .filter(manager => !isNaN(manager))
    
    const payload = { 
      name: values.name.trim(), 
      userIds: filteredManagers 
    }
    
    if (isRegister()) {
      await accountsStore.add(payload)
    } else {
      await accountsStore.update(props.id, payload)
    }
    router.go(-1)
  } catch (err) {
    if (err.status === 401 || err.status === 403) {
      redirectToDefaultRoute()
    } else if (err.status === 409) {
      alertStore.error('Лицевой счёт с таким названием уже существует')
    } else if (err.status === 422) {
      alertStore.error('Проверьте корректность введённых данных')
    } else {
      alertStore.error(`Ошибка при ${isRegister() ? 'создании' : 'обновлении'} лицевого счёта: ${err.message || err}`)
    }
  }
}
</script>

<template>
  <div class="settings form-3 form-compact">
    <Form
      :validation-schema="schema"
      :initial-values="account"
      @submit="onSubmit"
      v-slot="{ errors, isSubmitting, handleSubmit }"
    >
      <div class="header-with-actions">
        <h1 class="primary-heading">{{ isRegister() ? 'Новый лицевой счёт' : 'Настройки лицевого счёта' }}</h1>
        <div class="header-actions-container">
          <div class="header-actions header-actions-group">
            <ActionButton
              data-test="save-account-button"
              :item="{}"
              :icon="faCheckDouble"
              icon-size="2x"
              :tooltip-text="getButton()"
              :disabled="isSubmitting"
              @click="handleSubmit(onSubmit)"
            />
            <ActionButton
              data-test="cancel-account-button"
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
        <label for="name" class="label">Название:</label>
        <Field name="name" type="text" id="name" :disabled="isSubmitting"
          class="form-control input" :class="{ 'is-invalid': errors.name }"
          placeholder="Введите название лицевого счёта"
        />
      </div>

      <div v-if="canEditManagers()">
        <FieldArrayWithButtons
          name="managers"
          label="Менеджеры"
          field-type="select"
          :options="managerOptions"
          placeholder="Выберите менеджера:"
          add-tooltip="Добавить менеджера"
          remove-tooltip="Удалить менеджера"
          :has-error="!!errors.managers"
        />
      </div>

      <div v-else class="form-group">
        <label for="fieldList" class="label field-list-label">Менеджеры:</label>
        <ul id="fieldList" class="field-list">
          <li v-for="user in selectedManagerNames" :key="user.id" class="field-list-item">
            {{ user ? `${user.lastName || ''} ${user.firstName || ''} ${user.patronymic || ''}`.trim() : `Пользователь #${user.id}` }}
          </li>
        </ul>
      </div>

      <div v-if="!isRegister()" class="subscriptions-section">
        <h2 class="secondary-heading">Подписки</h2>

        <div v-if="subscriptionRows.length" class="subscriptions-list">
          <div
            v-for="row in subscriptionRows"
            :key="row.categoryId"
            class="subscription-row"
            data-test="subscription-row"
          >
            <div class="subscription-category">
              <div class="subscription-title">{{ row.categoryTitle || `Категория ${row.categoryId}` }}</div>
              <div class="subscription-state">{{ row.isActive ? 'Активна' : 'Не активна' }}</div>
            </div>
            <input
              v-model="row.startDate"
              data-test="subscription-start-date"
              type="date"
              class="form-control input subscription-date"
              :disabled="!canEditSubscriptions() || subscriptionSaving"
            />
            <input
              v-model="row.endDate"
              data-test="subscription-end-date"
              type="date"
              class="form-control input subscription-date"
              :disabled="!canEditSubscriptions() || subscriptionSaving"
            />
            <button
              v-if="canEditSubscriptions()"
              data-test="save-subscription-button"
              type="button"
              class="button secondary subscription-save"
              :disabled="subscriptionSaving"
              @click="saveSubscription(row)"
            >
              Сохранить
            </button>
          </div>
        </div>
        <div v-else class="subscriptions-empty">Нет подписок</div>

        <div v-if="canEditSubscriptions() && availableCategoryOptions.length" class="subscription-row subscription-new">
          <select
            v-model="newSubscription.categoryId"
            data-test="new-subscription-category"
            class="form-control input subscription-category-select"
            :disabled="subscriptionSaving"
          >
            <option value="">Выберите категорию</option>
            <option v-for="option in availableCategoryOptions" :key="option.value" :value="option.value">
              {{ option.text }}
            </option>
          </select>
          <input
            v-model="newSubscription.startDate"
            data-test="new-subscription-start-date"
            type="date"
            class="form-control input subscription-date"
            :disabled="subscriptionSaving"
          />
          <input
            v-model="newSubscription.endDate"
            data-test="new-subscription-end-date"
            type="date"
            class="form-control input subscription-date"
            :disabled="subscriptionSaving"
          />
          <button
            data-test="add-subscription-button"
            type="button"
            class="button secondary subscription-save"
            :disabled="subscriptionSaving"
            @click="addSubscription"
          >
            Добавить
          </button>
        </div>
      </div>

      <!-- Form validation errors -->
      <div v-if="errors.name" class="alert alert-danger mt-3 mb-0">{{ errors.name }}</div>
      <div v-if="errors.managers" class="alert alert-danger mt-3 mb-0">{{ errors.managers }}</div>
    </Form>
    
    <!-- Global alert messages -->
    <div v-if="alert" class="alert alert-dismissable mt-3 mb-0" :class="alert.type">
      <button @click="alertStore.clear()" class="btn btn-link close">×</button>
      {{ alert.message }}
    </div>
    
    <!-- Store loading and error states -->
    <div v-if="loading || initialLoading" class="text-center m-5">
      <span class="spinner-border spinner-border-lg align-center"></span>
      <div class="mt-2">{{ loading ? 'Сохранение...' : 'Загрузка...' }}</div>
    </div>

    <PlaylistAccessImpactDialog
      v-model="playlistImpactDialog"
      :impact="playlistImpact"
      :saving="subscriptionSaving"
      @confirm="confirmPlaylistCleanup"
      @cancel="cancelPlaylistCleanup"
    />
    
  </div>
</template>

<style scoped>
.subscriptions-section {
  margin-top: 1.5rem;
}

.subscriptions-section .secondary-heading {
  margin-bottom: 0.75rem;
}

.subscriptions-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.subscription-row {
  display: grid;
  grid-template-columns: minmax(180px, 1fr) 150px 150px 110px;
  gap: 0.5rem;
  align-items: center;
}

.subscription-category {
  min-width: 0;
}

.subscription-title {
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.subscription-state {
  color: #5c6f7f;
  font-size: 0.85rem;
}

.subscription-date,
.subscription-category-select {
  min-width: 0;
}

.subscription-save {
  justify-self: start;
}

.subscription-new {
  margin-top: 0.75rem;
}

.subscriptions-empty {
  color: #5c6f7f;
  margin-bottom: 0.75rem;
}

@media (max-width: 760px) {
  .subscription-row {
    grid-template-columns: 1fr;
  }
}
</style>
