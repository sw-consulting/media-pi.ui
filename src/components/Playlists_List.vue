// Copyright (c) 2025 sw.consulting
// This file is a part of Media Pi  frontend application

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { mdiMagnify } from '@mdi/js'
import { ActionButton } from '@sw-consulting/tooling.ui.kit'

import router from '@/router'
import { usePlaylistsStore } from '@/stores/playlists.store.js'
import { useAccountsStore } from '@/stores/accounts.store.js'
import { useAuthStore } from '@/stores/auth.store.js'
import { useAlertStore } from '@/stores/alert.store.js'
import { useConfirmation } from '@/helpers/confirmation.js'
import { itemsPerPageOptions } from '@/helpers/items.per.page.js'
import { createAccountOptions, estimateSelectWidth } from '@/helpers/account.options.js'
import { formatDuration, formatFileSize } from '@/helpers/media.format.js'

const playlistsStore = usePlaylistsStore()
const accountsStore = useAccountsStore()
const authStore = useAuthStore()
const alertStore = useAlertStore()
const { confirmDelete } = useConfirmation()

const { playlists, loading, error } = storeToRefs(playlistsStore)
const { loading: accountsLoading, accounts } = storeToRefs(accountsStore)
const { alert } = storeToRefs(alertStore)

const selectedAccountId = ref(null)
const search = ref('')
const itemsPerPage = ref(10)
const sortBy = ref([])
const page = ref(1)

const accountOptions = computed(() => createAccountOptions(accounts.value || [], authStore.user, { includeCommon: false }))

const headers = [
  { title: '', align: 'center', key: 'actions', sortable: false, width: '5%' },
  { title: 'Название', align: 'start', key: 'title', width: '25%' },
  { title: 'Имя файла', align: 'start', key: 'filename', width: '25%' },
  { title: 'Размер', align: 'start', key: 'totalFileSizeBytes', width: '15%' },
  { title: 'Длительность', align: 'start', key: 'totalDurationSeconds', width: '15%' },
  { title: 'Видео', align: 'start', key: 'videoCount', width: '10%' }
]

const selectWidth = computed(() => estimateSelectWidth(accountOptions.value))
const isBusy = computed(() => loading.value || accountsLoading.value)

function ensureSelection(options) {
  const availableValues = options.map(option => option.value)
  if (!availableValues.includes(selectedAccountId.value)) {
    selectedAccountId.value = availableValues.length ? availableValues[0] : null
  }
}

const refreshPlaylists = async () => {
  try {
    if (selectedAccountId?.value == null || selectedAccountId.value === undefined) return
    await playlistsStore.getAllByAccount(selectedAccountId.value)
  } catch (err) {
    alertStore.error('Не удалось загрузить плейлисты: ' + (err?.message || err))
  }
}

watch(accountOptions, (options) => ensureSelection(options), { immediate: true })

watch(selectedAccountId, async () => {
  if (selectedAccountId.value === undefined) return
  await refreshPlaylists()
}, { immediate: true })

onMounted(async () => {
  try {
    await accountsStore.getAll()
  } catch (err) {
    alertStore.error('Не удалось загрузить лицевые счета: ' + (err?.message || err))
  }
})

function filterPlaylists(value, query, item) {
  if (!query) return true
  const rawPlaylist = item?.raw
  if (!rawPlaylist) return false
  const q = query.toLocaleLowerCase()
  return [
    rawPlaylist.title,
    rawPlaylist.filename,
    rawPlaylist.totalFileSizeBytes,
    rawPlaylist.totalDurationSeconds,
    rawPlaylist.videoCount
  ].some(field => (field || '').toString().toLocaleLowerCase().includes(q))
}

function createPlaylist() {
  router.push({ path: '/playlist/create', query: { accountId: selectedAccountId.value ?? '' } })
}

function editPlaylist(item) {
  if (!item) return
  router.push(`/playlist/edit/${item.id}`)
}

async function deletePlaylist(item) {
  if (!item) return
  const confirmed = await confirmDelete(item.title || item.filename || 'плейлист', 'плейлист')
  if (!confirmed) return
  try {
    await playlistsStore.remove(item.id)
    await refreshPlaylists()
  } catch (err) {
    alertStore.error('Не удалось удалить плейлист: ' + (err?.message || err))
  }
}
</script>

<template>
  <div class="settings table-3">
    <div class="header-with-actions">
      <h1 class="primary-heading">Плейлисты</h1>
      <div class="header-actions-container">
        <div v-if="loading" class="header-actions header-actions-group">
          <span class="spinner-border spinner-border-m"></span>
        </div>
        <div class="header-actions header-actions-group">
          <v-select
            v-model="selectedAccountId"
            :items="accountOptions"
            label="Лицевой счёт"
            item-title="title"
            item-value="value"
            density="compact"
            variant="outlined"
            hide-details
            :disabled="isBusy"
            :style="{ width: selectWidth, marginRight: '12px' }"
          />
          <div class="header-actions header-actions-group">
            <ActionButton
              data-test="create-playlist-button"
              :item="{}"
              icon="fa-solid fa-folder-plus"
              tooltip-text="Создать плейлист"
              :disabled="isBusy || !(accountOptions && accountOptions.length)"
              @click="createPlaylist"
            />
          </div>
        </div>
      </div>
    </div>
    <hr class="hr" />

    <v-card>
      <div v-if="playlists?.length">
        <v-text-field
          v-model="search"
          :append-inner-icon="mdiMagnify"
          label="Поиск по любой информации о плейлистах"
          variant="solo"
          hide-details
        />
      </div>
      <v-data-table
        v-if="playlists?.length"
        v-model:items-per-page="itemsPerPage"
        items-per-page-text="Плейлистов на странице"
        :items-per-page-options="itemsPerPageOptions"
        page-text="{0}-{1} из {2}"
        v-model:page="page"
        :headers="headers"
        :items="playlists"
        :search="search"
        v-model:sort-by="sortBy"
        :custom-filter="filterPlaylists"
        item-value="id"
        class="elevation-1"
      >
        <template v-slot:[`item.totalFileSizeBytes`]="{ item }">
          {{ formatFileSize(item.totalFileSizeBytes) }}
        </template>
        <template v-slot:[`item.totalDurationSeconds`]="{ item }">
          {{ formatDuration(item.totalDurationSeconds) }}
        </template>
        <template v-slot:[`item.actions`]="{ item }">
          <div class="actions-container">
            <ActionButton
              data-test="edit-playlist-button"
              :item="item"
              icon="fa-solid fa-pen"
              tooltip-text="Редактировать плейлист"
              :disabled="isBusy"
              @click="editPlaylist"
            />
            <ActionButton
              data-test="delete-playlist-button"
              :item="item"
              icon="fa-solid fa-trash-can"
              tooltip-text="Удалить плейлист"
              :disabled="isBusy"
              @click="deletePlaylist"
            />
          </div>
        </template>
      </v-data-table>
      <div v-if="!playlists?.length" class="text-center m-5">
        {{ isBusy ? 'Загрузка...' : 'Нет плейлистов' }}
      </div>
    </v-card>
    <div v-if="error" class="text-center m-5">
      <div class="text-danger">Ошибка при загрузке списка плейлистов: {{ error }}</div>
    </div>
    <div v-if="alert" class="alert alert-dismissable mt-3 mb-0" :class="alert.type">
      <button @click="alertStore.clear()" class="btn btn-link close">×</button>
      {{ alert.message }}
    </div>
  </div>
</template>
