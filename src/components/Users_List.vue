// Copyright (c) 2025 sw.consulting
// This file is a part of Media Pi  frontend application

<script setup>

import router from '@/router'

import { storeToRefs } from 'pinia'
import { useUsersStore } from '@/stores/users.store.js'
import { itemsPerPageOptions } from '@/helpers/items.per.page.js'
import { getRoleName, isManager } from '@/helpers/user.helpers.js'
import { mdiMagnify } from '@mdi/js'
import { onMounted, computed } from 'vue'
import { ActionButton } from '@sw-consulting/tooling.ui.kit'

import { useAuthStore } from '@/stores/auth.store.js'
const authStore = useAuthStore()

import { useRolesStore } from '@/stores/roles.store.js'
const rolesStore = useRolesStore()

import { useAccountsStore } from '@/stores/accounts.store.js'
const accountsStore = useAccountsStore()

const usersStore = useUsersStore()
const { users, loading, error } = storeToRefs(usersStore)

const enhancedUsers = computed(() => {
  if (!users.value || !Array.isArray(users.value)) return []
  return users.value.map(user => {
    return {
      ...user,
      credentialsSortValue: getCredentialsSortValue(user)
    }
  })
})

onMounted(async () => {
  try
  {
    await rolesStore.ensureLoaded()
    await accountsStore.getAll()
    await usersStore.getAll()
  } catch {
    alertStore.error('Не удалось загрузить списки ролей, пользователей и лицевых счетов');
  }

})

import { useAlertStore } from '@/stores/alert.store.js'
import { useConfirmation } from '@/helpers/confirmation.js'
const alertStore = useAlertStore()
const { alert } = storeToRefs(alertStore)

const { confirmDelete } = useConfirmation()

function userSettings(item) {
  const id = item.id
  router.push('user/edit/' + id)
}

function goToRegister() {
  router.push('/register')
}

function filterUsers(value, query, item) {
  if (query === null || item === null) {
    return false
  }
  const i = item.raw
  if (i === null) {
    return false
  }
  const q = query.toLocaleUpperCase()

  if (
    i.lastName.toLocaleUpperCase().indexOf(q) !== -1 ||
    i.firstName.toLocaleUpperCase().indexOf(q) !== -1 ||
    i.patronymic.toLocaleUpperCase().indexOf(q) !== -1 ||
    i.email.toLocaleUpperCase().indexOf(q) !== -1
  ) {
    return true
  }

  const crd = getRoleName(i)
  if (crd.toLocaleUpperCase().indexOf(q) !== -1) {
    return true
  }

  const managedAccounts = getManagedAccountNames(i)
  if (managedAccounts.some(accountName => 
    accountName.toLocaleUpperCase().indexOf(q) !== -1
  )) {
    return true
  }

  return false
}

async function deleteUser(item) {
  const userName = `${item.firstName} ${item.lastName}`
  const confirmed = await confirmDelete(userName, 'пользователя')

  if (confirmed) {
    usersStore
      .delete(item.id)
      .then(() => {
        usersStore.getAll()
      })
      .catch((error) => {
        alertStore.error('Ошибка при удалении пользователя: ' + (error.message || error))
      })
  }
}

function getManagedAccountNames(user) {
  if (!isManager(user) || !user.accountIds || !Array.isArray(user.accountIds)) {
    return []
  }
  
  const accounts = accountsStore.accounts || []
  return user.accountIds
    .map(accountId => {
      const account = accounts.find(acc => acc.id === accountId)
      return account ? account.name : null
    })
    .filter(name => name !== null)
}

function getCredentialsDisplay(user) {
  const roleName = getRoleName(user)
  const managedAccounts = getManagedAccountNames(user)
  
  if (managedAccounts.length > 0) {
    return roleName + '<br>' + managedAccounts.join('<br>')
  }
  
  return roleName
}

function getCredentialsSortValue(user) {
  const roleName = getRoleName(user)
  const managedAccounts = getManagedAccountNames(user)
  
  // Sort by role name first, then by account names (joined as string)
  if (managedAccounts.length > 0) {
    return roleName + ' ' + managedAccounts.sort().join(' ')
  }
  
  return roleName
}

const headers = [
  { title: '', align: 'center', key: 'actions', sortable: false, width: '5%' },
  { title: 'Пользователь', align: 'start', key: 'id' },
  { title: 'E-mail', align: 'start', key: 'email' },
  { title: 'Права', align: 'start', key: 'credentialsSortValue' }
]
</script>

<template>
  <div class="settings table-2">
    <div class="header-with-actions">
      <h1 class="primary-heading">Пользователи</h1>
      <div style="display: flex; align-items: center; gap: 8px;">
        <div v-if="loading" class="header-actions header-actions-group">
          <span class="spinner-border spinner-border-m"></span>
        </div>
        <div class="header-actions header-actions-group">
          <ActionButton
            data-test="register-user-button"
            :item="null"
            icon="fa-solid fa-user-plus"
            tooltip-text="Зарегистрировать пользователя"
            icon-size="2x"
            :disabled="loading"
            @click="goToRegister"
          />
        </div>
      </div>
    </div>
    <hr class="hr" />

    <v-card>
      <v-data-table
        v-if="enhancedUsers?.length"
        v-model:items-per-page="authStore.users_per_page"
        items-per-page-text="Пользователей на странице"
        :items-per-page-options="itemsPerPageOptions"
        page-text="{0}-{1} из {2}"
        v-model:page="authStore.users_page"
        :headers="headers"
        :items="enhancedUsers"
        :search="authStore.users_search"
        v-model:sort-by="authStore.users_sort_by"
        :custom-filter="filterUsers"
        item-value="name"
        class="elevation-1"
      >
        <template v-slot:[`item.id`]="{ item }">
          {{ item['lastName'] }} {{ item['firstName'] }} {{ item['patronymic'] }}
        </template>

        <template v-slot:[`item.credentialsSortValue`]="{ item }">
          <span v-html="getCredentialsDisplay(item)"></span>
        </template>

        <template v-slot:[`item.actions`]="{ item }">
          <div class="actions-container">
            <ActionButton
              data-test="edit-user-button"
              :item="item"
              icon="fa-solid fa-pen"
              tooltip-text="Редактировать информацию о пользователе"
              @click="userSettings"
            />
            <ActionButton
              data-test="delete-user-button"
              :item="item"
              icon="fa-solid fa-trash-can"
              tooltip-text="Удалить информацию о пользователе"
              @click="deleteUser"
            />
          </div>
        </template>
      </v-data-table>
      <div v-if="!enhancedUsers?.length" class="text-center m-5">Список пользователей пуст</div>
      <div v-if="enhancedUsers?.length">
        <v-text-field
          v-model="authStore.users_search"
          :append-inner-icon="mdiMagnify"
          label="Поиск по любой информации о пользователе"
          variant="solo"
          hide-details
        />
      </div>
    </v-card>
    <div v-if="loading" class="text-center m-5">
      <span class="spinner-border spinner-border-lg align-center"></span>
    </div>
    <div v-if="error" class="text-center m-5">
      <div class="text-danger">Ошибка при загрузке списка пользователей: {{ error }}</div>
    </div>
    <div v-if="alert" class="alert alert-dismissable mt-3 mb-0" :class="alert.type">
      <button @click="alertStore.clear()" class="btn btn-link close">×</button>
      {{ alert.message }}
    </div>
  </div>
</template>
