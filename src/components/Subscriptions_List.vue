// Copyright (c) 2025 sw.consulting
// This file is a part of Media Pi frontend application

<script setup>
import { computed, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { mdiMagnify } from '@mdi/js'
import { ActionButton } from '@sw-consulting/tooling.ui.kit'

import router from '@/router'
import { useAccountsStore } from '@/stores/accounts.store.js'
import { useAuthStore } from '@/stores/auth.store.js'
import { useAlertStore } from '@/stores/alert.store.js'
import { useConfirmation } from '@/helpers/confirmation.js'
import { formatRuDate } from '@/helpers/date.format.js'
import { itemsPerPageOptions } from '@/helpers/items.per.page.js'
import { isPlaylistAccessImpactError } from '@/helpers/playlist.access.impact.js'
import { canManageAccountById } from '@/helpers/user.helpers.js'
import PlaylistAccessImpactDialog from '@/components/PlaylistAccessImpactDialog.vue'

const props = defineProps({
  accountId: {
    type: Number,
    required: false
  },
  categoryId: {
    type: Number,
    required: false
  },
  categoryTitle: {
    type: String,
    required: false,
    default: ''
  },
  embedded: {
    type: Boolean,
    default: false
  },
  beforeEmbeddedAction: {
    type: Function,
    default: null
  },
  mode: {
    type: String,
    default: 'account',
    validator: value => ['account', 'category'].includes(value)
  }
})

const accountsStore = useAccountsStore()
const authStore = useAuthStore()
const alertStore = useAlertStore()
const { confirmDelete } = useConfirmation()

const { accounts, subscriptions, loading } = storeToRefs(accountsStore)
const { alert } = storeToRefs(alertStore)

const playlistImpactDialog = ref(false)
const playlistImpact = ref(null)
const pendingDelete = ref(null)
const deleteSaving = ref(false)
const categoryRows = ref([])
const categoryLoading = ref(false)

const isCategoryMode = computed(() => props.mode === 'category')

const headers = computed(() => {
  const baseHeaders = isCategoryMode.value
    ? [
        { title: 'Лицевой счёт', align: 'start', key: 'accountName', width: '40%' },
        { title: 'Начало подписки', align: 'start', key: 'startDateFormatted', width: '25%' },
        { title: 'Окончание подписки', align: 'start', key: 'endDateFormatted', width: '25%' }
      ]
    : [
        { title: 'Категория', align: 'start', key: 'categoryTitle', width: '40%' },
        { title: 'Начало подписки', align: 'start', key: 'startDateFormatted', width: '25%' },
        { title: 'Окончание подписки', align: 'start', key: 'endDateFormatted', width: '25%' }
      ]

  if (!canManageSubscriptions.value) return baseHeaders

  return [
    { title: '', align: 'center', key: 'actions', sortable: false, width: '10%' },
    ...baseHeaders
  ]
})

const accountSubscriptionRows = computed(() => (
  subscriptions.value?.subscriptions || []
).filter(isPaidCategory).map((item, index) => ({
  ...item,
  subscriptionRowId: createAccountSubscriptionRowId(item, index),
  categoryTitle: item.categoryTitle || `Категория ${item.categoryId}`,
  startDate: item.startDate || '',
  endDate: item.endDate || '',
  startDateFormatted: formatRuDate(item.startDate),
  endDateFormatted: formatRuDate(item.endDate),
  hasSubscription: true
})))

const subscriptionRows = computed(() => (
  isCategoryMode.value ? categoryRows.value : accountSubscriptionRows.value
))

const availableCategories = computed(() => (
  subscriptions.value?.availableCategories || []
).filter(isPaidCategory))

const isBusy = computed(() => loading.value || categoryLoading.value || deleteSaving.value)
const canManageSubscriptions = computed(() => Boolean(authStore.isAdministrator))
const canCreateSubscription = computed(() => (
  canManageSubscriptions.value
    && !isBusy.value
    && (
      isCategoryMode.value
        ? Boolean(props.categoryId)
        : hasSubscriptionCategory.value
    )
))

const hasSubscriptionCategory = computed(() => (
  availableCategories.value.length > 0 || accountSubscriptionRows.value.length > 0
))

onMounted(refreshSubscriptions)

function isPaidCategory(category) {
  return category?.free !== true && category?.categoryFree !== true
}

function canManageAccountSubscription(accountId) {
  if (authStore.isAdministrator) return true
  return canManageAccountById(authStore.user, accountId)
}

function createAccountSubscriptionRowId(item, index) {
  const identity = item.id ?? item.subscriptionId ?? index
  return [
    identity,
    item.categoryId ?? '',
    item.startDate ?? '',
    item.endDate ?? ''
  ].join(':')
}

function createCategorySubscriptionRowId(accountId, subscription, index = 0) {
  return [
    `account:${accountId}`,
    `category:${props.categoryId}`,
    subscription?.id ?? subscription?.subscriptionId ?? index,
    subscription?.startDate ?? '',
    subscription?.endDate ?? ''
  ].join(':')
}

function getAccountName(account) {
  return account?.name || account?.title || `Лицевой счёт ${account?.id || ''}`
}

function normalizeCategoryRow(account, subscription, index = 0) {
  return {
    ...(subscription || {}),
    subscriptionRowId: createCategorySubscriptionRowId(account.id, subscription, index),
    accountId: account.id,
    accountName: getAccountName(account),
    categoryId: props.categoryId,
    categoryTitle: subscription?.categoryTitle || '',
    startDate: subscription?.startDate || '',
    endDate: subscription?.endDate || '',
    startDateFormatted: subscription ? formatRuDate(subscription.startDate) : '—',
    endDateFormatted: subscription ? formatRuDate(subscription.endDate) : '—',
    hasSubscription: Boolean(subscription)
  }
}

async function refreshAccountSubscriptions() {
  if (!props.accountId) return
  await accountsStore.getSubscriptions(props.accountId)
}

async function refreshCategorySubscriptions() {
  if (!props.categoryId) {
    categoryRows.value = []
    return
  }

  categoryLoading.value = true
  try {
    await accountsStore.getAll()
    const accessibleAccounts = (accounts.value || [])
      .filter(account => account?.id && canManageAccountSubscription(account.id))
    const rows = []

    for (const account of accessibleAccounts) {
      const data = await accountsStore.getSubscriptions(account.id)
      const accountSubscriptions = (data?.subscriptions || [])
        .filter(isPaidCategory)
        .filter(item => item.categoryId === props.categoryId)

      accountSubscriptions.forEach((subscription, index) => {
        rows.push(normalizeCategoryRow(account, subscription, index))
      })
    }

    categoryRows.value = rows
  } catch (err) {
    categoryRows.value = []
    alertStore.error('Не удалось загрузить подписки: ' + (err?.message || err))
  } finally {
    categoryLoading.value = false
  }
}

async function refreshSubscriptions() {
  try {
    if (isCategoryMode.value) {
      await refreshCategorySubscriptions()
    } else {
      await refreshAccountSubscriptions()
    }
  } catch (err) {
    alertStore.error('Не удалось загрузить подписки: ' + (err?.message || err))
  }
}

function filterSubscriptions(value, query, item) {
  if (!query) return true
  const rawSubscription = item?.raw
  if (!rawSubscription) return false
  const q = query.toLocaleLowerCase()
  return [
    rawSubscription.accountName,
    rawSubscription.categoryTitle,
    rawSubscription.startDate,
    rawSubscription.endDate,
    rawSubscription.startDateFormatted,
    rawSubscription.endDateFormatted
  ].some(field => (field || '').toString().toLocaleLowerCase().includes(q))
}

function runBeforeEmbeddedAction() {
  if (!props.embedded || typeof props.beforeEmbeddedAction !== 'function') return true
  return Promise.resolve(props.beforeEmbeddedAction())
    .then(result => result !== false)
    .catch(() => false)
}

async function createSubscription() {
  if (isCategoryMode.value) {
    if (!canCreateSubscription.value) return
    const canProceed = runBeforeEmbeddedAction()
    if (canProceed !== true && !await canProceed) return
    router.push({
      path: `/category/${props.categoryId}/subscription/create`,
      query: props.categoryTitle ? { categoryTitle: props.categoryTitle } : {}
    })
    return
  }

  if (!canCreateSubscription.value) return
  const canProceed = runBeforeEmbeddedAction()
  if (canProceed !== true && !await canProceed) return
  router.push(`/account/${props.accountId}/subscription/create`)
}

function canEditRowSubscription(item) {
  return Boolean(
    item?.hasSubscription
      && canManageSubscriptions.value
      && !isBusy.value
      && (
        !isCategoryMode.value
          || canManageAccountSubscription(item.accountId)
      )
  )
}

function canDeleteRowSubscription(item) {
  return canEditRowSubscription(item)
}

function getRowAccountId(item) {
  return isCategoryMode.value ? item?.accountId : props.accountId
}

function getRowCategoryId(item) {
  return isCategoryMode.value ? props.categoryId : item?.categoryId
}

async function editSubscription(item) {
  if (!canEditRowSubscription(item)) return
  const canProceed = runBeforeEmbeddedAction()
  if (canProceed !== true && !await canProceed) return
  router.push(`/account/${getRowAccountId(item)}/subscription/edit/${getRowCategoryId(item)}`)
}

async function deleteSubscriptionPayload(item, forcePlaylistCleanup = false) {
  deleteSaving.value = true
  try {
    await accountsStore.deleteSubscription(getRowAccountId(item), getRowCategoryId(item), {
      ...(forcePlaylistCleanup ? { forcePlaylistCleanup: true } : {})
    })
    if (isCategoryMode.value) {
      await refreshCategorySubscriptions()
    }
    playlistImpactDialog.value = false
    pendingDelete.value = null
  } catch (err) {
    if (isPlaylistAccessImpactError(err) && !forcePlaylistCleanup) {
      playlistImpact.value = err.data
      pendingDelete.value = item
      playlistImpactDialog.value = true
      return
    }
    alertStore.error('Не удалось удалить подписку: ' + (err?.message || err))
  } finally {
    deleteSaving.value = false
  }
}

async function deleteSubscription(item) {
  if (!canDeleteRowSubscription(item)) return
  const canProceed = runBeforeEmbeddedAction()
  if (canProceed !== true && !await canProceed) return
  const confirmed = await confirmDelete(
    isCategoryMode.value
      ? item.accountName || `Лицевой счёт ${item.accountId}`
      : item.categoryTitle || `Категория ${item.categoryId}`,
    'подписку'
  )
  if (!confirmed) return
  await deleteSubscriptionPayload(item)
}

async function confirmPlaylistCleanup() {
  const item = pendingDelete.value
  if (!item) return
  await deleteSubscriptionPayload(item, true)
}

function cancelPlaylistCleanup() {
  if (deleteSaving.value) return
  playlistImpactDialog.value = false
  pendingDelete.value = null
}
</script>

<template>
  <div class="subscriptions-section settings table-3" :class="{ 'subscriptions-list-embedded': props.embedded }">
    <div class="header-with-actions" :class="{ 'subscriptions-list-subsection-header': props.embedded }">
      <h2 class="secondary-heading">Подписки</h2>
      <div v-if="canManageSubscriptions" class="header-actions-container">
        <div v-if="isBusy" class="header-actions header-actions-group">
          <span class="spinner-border spinner-border-m"></span>
        </div>
        <div class="header-actions header-actions-group">
          <ActionButton
            data-test="create-subscription-button"
            :item="{}"
            icon="fa-solid fa-plus"
            tooltip-text="Добавить подписку"
            :disabled="!canCreateSubscription"
            @click="createSubscription"
          />
        </div>
      </div>
    </div>
    <div v-if="props.embedded" class="subscriptions-list-subsection-divider"></div>

    <v-card
      class="subscriptions-card"
      :class="{
        'subscriptions-card--empty': !subscriptionRows.length,
        'subscriptions-list-card-embedded': props.embedded
      }"
    >
      <div v-if="subscriptionRows.length">
        <v-text-field
          v-model="authStore.subscriptions_search"
          :append-inner-icon="mdiMagnify"
          label="Поиск по подпискам"
          variant="solo"
          :density="props.embedded ? 'compact' : undefined"
          hide-details
        />
      </div>
      <v-data-table
        v-model:items-per-page="authStore.subscriptions_per_page"
        items-per-page-text="Подписок на странице"
        no-data-text="Нет подписок"
        no-results-text="Подписки не найдены"
        :items-per-page-options="itemsPerPageOptions"
        page-text="{0}-{1} из {2}"
        v-model:page="authStore.subscriptions_page"
        :headers="headers"
        :items="subscriptionRows"
        :search="authStore.subscriptions_search"
        v-model:sort-by="authStore.subscriptions_sort_by"
        :custom-filter="filterSubscriptions"
        item-value="subscriptionRowId"
        :density="props.embedded ? 'compact' : undefined"
        class="elevation-1"
      >
        <template v-if="canManageSubscriptions" v-slot:[`item.actions`]="{ item }">
          <div class="actions-container">
            <ActionButton
              v-if="canEditRowSubscription(item)"
              data-test="edit-subscription-button"
              :item="item"
              icon="fa-solid fa-pen"
              tooltip-text="Редактировать подписку"
              :disabled="isBusy"
              @click="editSubscription"
            />
            <ActionButton
              v-if="canDeleteRowSubscription(item)"
              data-test="delete-subscription-button"
              :item="item"
              icon="fa-solid fa-trash-can"
              tooltip-text="Удалить подписку"
              :disabled="isBusy"
              @click="deleteSubscription"
            />
          </div>
        </template>
      </v-data-table>
    </v-card>

    <div v-if="!props.embedded && alert" class="alert alert-dismissable mt-3 mb-0" :class="alert.type">
      <button @click="alertStore.clear()" class="btn btn-link close">×</button>
      {{ alert.message }}
    </div>

    <PlaylistAccessImpactDialog
      v-model="playlistImpactDialog"
      :impact="playlistImpact"
      :saving="deleteSaving"
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
  margin: 0;
}

.subscriptions-list-embedded .subscriptions-list-subsection-header {
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 8px;
}

.subscriptions-list-embedded .header-actions {
  gap: 0.125rem;
  padding: 0.25rem;
  border-color: #d0d7de;
  border-radius: 6px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.12);
}

.subscriptions-list-subsection-divider {
  height: 1px;
  margin: 0 0 12px;
  background: #e0e0e0;
}

.subscriptions-list-card-embedded {
  overflow: hidden;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  box-shadow: none;
}

.subscriptions-list-embedded :deep(.v-data-table thead th),
.subscriptions-list-embedded :deep(.v-data-table-server thead th),
.subscriptions-list-embedded :deep(.v-table thead th),
.subscriptions-list-embedded :deep(.v-table > .v-table__wrapper > table > thead > tr > th) {
  font-size: 0.9rem !important;
}

.subscriptions-list-embedded :deep(.v-data-table__td) {
  font-size: 0.875rem;
}

.subscriptions-card--empty {
  padding-top: 0.75rem;
  padding-bottom: 0.75rem;
}
</style>
