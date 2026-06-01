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
import PlaylistAccessImpactDialog from '@/components/PlaylistAccessImpactDialog.vue'

const props = defineProps({
  accountId: {
    type: Number,
    required: true
  }
})

const accountsStore = useAccountsStore()
const authStore = useAuthStore()
const alertStore = useAlertStore()
const { confirmDelete } = useConfirmation()

const { subscriptions, loading, error } = storeToRefs(accountsStore)
const { alert } = storeToRefs(alertStore)

const playlistImpactDialog = ref(false)
const playlistImpact = ref(null)
const pendingDelete = ref(null)
const deleteSaving = ref(false)

const headers = computed(() => {
  const baseHeaders = [
    { title: 'Категория', align: 'start', key: 'categoryTitle', width: '40%' },
    { title: 'Начало подписки', align: 'start', key: 'startDateFormatted', width: '25%' },
    { title: 'Окончание подписки', align: 'start', key: 'endDateFormatted', width: '25%' }
  ]

  if (!authStore.isAdministrator) return baseHeaders

  return [
    { title: '', align: 'center', key: 'actions', sortable: false, width: '10%' },
    ...baseHeaders
  ]
})

const subscriptionRows = computed(() => (
  subscriptions.value?.subscriptions || []
).filter(isPaidCategory).map((item, index) => ({
  ...item,
  subscriptionRowId: createSubscriptionRowId(item, index),
  categoryTitle: item.categoryTitle || `Категория ${item.categoryId}`,
  startDate: item.startDate || '',
  endDate: item.endDate || '',
  startDateFormatted: formatRuDate(item.startDate),
  endDateFormatted: formatRuDate(item.endDate)
})))

const availableCategories = computed(() => (
  subscriptions.value?.availableCategories || []
).filter(isPaidCategory))

const isBusy = computed(() => loading.value || deleteSaving.value)
const canCreateSubscription = computed(() => (
  authStore.isAdministrator && hasSubscriptionCategory.value && !isBusy.value
))

const hasSubscriptionCategory = computed(() => (
  availableCategories.value.length > 0 || subscriptionRows.value.length > 0
))

onMounted(refreshSubscriptions)

function isPaidCategory(category) {
  return category?.free !== true && category?.categoryFree !== true
}

function createSubscriptionRowId(item, index) {
  const identity = item.id ?? item.subscriptionId ?? index
  return [
    identity,
    item.categoryId ?? '',
    item.startDate ?? '',
    item.endDate ?? ''
  ].join(':')
}

async function refreshSubscriptions() {
  try {
    await accountsStore.getSubscriptions(props.accountId)
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
    rawSubscription.categoryTitle,
    rawSubscription.startDate,
    rawSubscription.endDate,
    rawSubscription.startDateFormatted,
    rawSubscription.endDateFormatted
  ].some(field => (field || '').toString().toLocaleLowerCase().includes(q))
}

function createSubscription() {
  if (!canCreateSubscription.value) return
  router.push(`/account/${props.accountId}/subscription/create`)
}

function editSubscription(item) {
  if (!item || !authStore.isAdministrator) return
  router.push(`/account/${props.accountId}/subscription/edit/${item.categoryId}`)
}

async function deleteSubscriptionPayload(item, forcePlaylistCleanup = false) {
  deleteSaving.value = true
  try {
    await accountsStore.deleteSubscription(props.accountId, item.categoryId, {
      ...(forcePlaylistCleanup ? { forcePlaylistCleanup: true } : {})
    })
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
  if (!item || !authStore.isAdministrator) return
  const confirmed = await confirmDelete(item.categoryTitle || `Категория ${item.categoryId}`, 'подписку')
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
  <div class="subscriptions-section settings table-3">
    <div class="header-with-actions">
      <h2 class="secondary-heading">Подписки</h2>
      <div v-if="authStore.isAdministrator" class="header-actions-container">
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

    <v-card>
      <div v-if="subscriptionRows.length">
        <v-text-field
          v-model="authStore.subscriptions_search"
          :append-inner-icon="mdiMagnify"
          label="Поиск по подпискам"
          variant="solo"
          hide-details
        />
      </div>
      <v-data-table
        v-if="subscriptionRows.length"
        v-model:items-per-page="authStore.subscriptions_per_page"
        items-per-page-text="Подписок на странице"
        :items-per-page-options="itemsPerPageOptions"
        page-text="{0}-{1} из {2}"
        v-model:page="authStore.subscriptions_page"
        :headers="headers"
        :items="subscriptionRows"
        :search="authStore.subscriptions_search"
        v-model:sort-by="authStore.subscriptions_sort_by"
        :custom-filter="filterSubscriptions"
        item-value="subscriptionRowId"
        class="elevation-1"
      >
        <template v-if="authStore.isAdministrator" v-slot:[`item.actions`]="{ item }">
          <div class="actions-container">
            <ActionButton
              data-test="edit-subscription-button"
              :item="item"
              icon="fa-solid fa-pen"
              tooltip-text="Редактировать подписку"
              :disabled="isBusy"
              @click="editSubscription"
            />
            <ActionButton
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
      <div v-if="!subscriptionRows.length" class="text-center m-5">
        {{ isBusy ? 'Загрузка...' : 'Нет подписок' }}
      </div>
    </v-card>

    <div v-if="error" class="text-center m-5">
      <div class="text-danger">Ошибка при загрузке списка подписок: {{ error }}</div>
    </div>
    <div v-if="alert" class="alert alert-dismissable mt-3 mb-0" :class="alert.type">
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
</style>
