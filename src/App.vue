// Copyright (c) 2025 sw.consulting
// This file is a part of Media Pi  frontend application

<script setup>

import { RouterLink, RouterView } from 'vue-router'
import { version } from '@/../package'
import { onMounted } from 'vue'
import { useStatusStore } from '@/stores/status.store.js'
import { useAccountsCaption } from '@/helpers/accounts.caption.js'
import { getRoleName } from '@/helpers/user.helpers.js'

import { useRolesStore } from '@/stores/roles.store.js'
const rolesStore = useRolesStore()

import { useDisplay } from 'vuetify'
const { height } = useDisplay()

import { useAuthStore } from '@/stores/auth.store.js'
const authStore = useAuthStore()

const accountsCaption = useAccountsCaption(authStore)

const statusStore = useStatusStore()
statusStore.fetchStatus().catch(() => {})
 onMounted(() => {
  statusStore.fetchStatus()
    .then(() => {rolesStore.ensureLoaded().catch(() => {})})
    .catch(() => {})
 })

import { drawer, toggleDrawer } from '@/helpers/drawer.js'

function deauth() {
  authStore.logout()
}

function getUserName() {
  return authStore.user
    ? ' | ' +
        authStore.user.lastName +
        ' ' +
        authStore.user.firstName +
        ' ' +
        authStore.user.patronymic
    : ''
}

function getUserRole() {
  if (!authStore.user || authStore.user === undefined) {
    return 'Media Pi'
  }
  /* getRoleName requires rolesStore.ensureLoaded */
  return getRoleName(authStore.user)
}

 
/*
<v-list-item>
          <RouterLink to="/register" class="link">Регистрация</RouterLink>
        </v-list-item>
        <v-list-item>
          <RouterLink to="/recover" class="link">Восстановление пароля</RouterLink>
        </v-list-item>
*/
 
</script>

<template>
  <v-app class="rounded rounded-md">
    <v-app-bar>
      <template v-slot:prepend>
        <v-app-bar-nav-icon @click.stop="toggleDrawer()" color="blue-darken-2"></v-app-bar-nav-icon>
      </template>
      <v-app-bar-title class="orange">{{ getUserRole() }}{{ getUserName() }} </v-app-bar-title>
      <v-spacer />
    </v-app-bar>
    <v-navigation-drawer v-model="drawer" elevation="4">
      <template v-slot:prepend>
        <div class="pa-2" v-if="height > 480">
          <img alt="Media Pi" class="logo" src="@/assets/logo.svg" />
        </div>
      </template>
      <v-list v-if="authStore.user">
        <v-list-item v-if="accountsCaption">
          <RouterLink to="/accounts" class="link">{{ accountsCaption }}</RouterLink>
        </v-list-item>
        <v-list-item v-if="!authStore.isAdministrator">
          <RouterLink :to="'/user/edit/' + authStore.user.id" class="link">Настройки</RouterLink>
        </v-list-item>
        <v-list-item v-if="authStore.isAdministrator">
          <RouterLink to="/users" class="link">Пользователи</RouterLink>
        </v-list-item>
        <v-list-item>
          <RouterLink to="/login" @click="deauth()" class="link">Выход</RouterLink>
        </v-list-item>
      </v-list>
      <v-list v-if="!authStore.user">
        <v-list-item>
          <RouterLink to="/login" class="link">Вход</RouterLink>
        </v-list-item>
      </v-list>
      <template v-slot:append>
        <div class="pa-2">
          <span class="primary-heading version-info"> Клиент {{ version }} </span>
          <br v-if="statusStore.coreVersion"/>
          <span v-if="statusStore.coreVersion" class="primary-heading version-info">
            Сервер {{ statusStore.coreVersion }}
          </span>
          <br v-if="statusStore.dbVersion"/>
          <span v-if="statusStore.dbVersion" class="primary-heading version-info">
            БД {{ statusStore.dbVersion }}
          </span>
        </div>
      </template>
    </v-navigation-drawer>

    <v-main class="d-flex align-center justify-center vvv">
      <RouterView />
    </v-main>
  </v-app>
</template>

<style scoped>
.vvv {
  width: 90vw;
  margin: 1rem;
  min-width: 480px;
}

.v-app-bar {
  background: linear-gradient(65deg, #8abdfc 0%, #bdddfd 100%);
  box-shadow: 0 2px 8px rgba(144,202,249,0.08);
}

.v-navigation-drawer {
  background: linear-gradient(145deg,#8abdfc 0%, #bdddfd 100%);
  box-shadow: 2px 0 8px rgba(144,202,249,0.08);
}

.logo {
  margin: 1rem;
  display: block;
  width: 75%;
  background: transparent;
}

.version-info {
  margin-left: 1rem;
  margin-top: 0;
  margin-bottom: 0;
  font-size: smaller;
}

nav {
  width: 100%;
  margin-top: 1.5rem;
  text-align: left;
  margin-left: 1rem;
  font-size: 1rem;
  padding: 1rem 0;
  margin-top: 1rem;
}

nav a.router-link-exact-active {
  color: var(--color-text);
}

nav a.router-link-exact-active:hover {
  background-color: transparent;
}

nav a {
  display: inline-block;
  padding: 0 1rem;
  border-left: 1px solid var(--color-border);
}

nav a:first-of-type {
  border: 0;
}

/* Make the entire menu item hoverable */
:deep(.v-list-item) {
  transition: background-color 0.2s ease-in-out;
}

:deep(.v-list-item:hover) {
    color: #eeeeee;
    background-color: var(--gtc-color-1);
}

/* Style for nested menu items */
:deep(.v-list-group .v-list-item) {
  padding-left: 2rem;
}

:deep(.v-list-group .v-list-item .link) {
  font-size: 1rem;
}

/* Ensure menu group activator text matches list items */
:deep(.v-list-group__header .v-list-item-title) {
  font-size: 1.2rem !important;
  font-family: inherit !important;
  font-weight: normal !important;
  color: var(--primary-color) !important;
}
</style>
