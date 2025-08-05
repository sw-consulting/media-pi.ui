<script setup>
// Copyright (c) 2025 sw.consulting
// Licensed under the MIT License.
// This file is a part of Mediapi frontend application

import { RouterLink, RouterView } from 'vue-router'
import { version } from '@/../package'
import { onMounted } from 'vue'
import { useStatusStore } from '@/stores/status.store.js'

import { useDisplay } from 'vuetify'
const { height } = useDisplay()

import { useAuthStore } from '@/stores/auth.store.js'
const authStore = useAuthStore()

const statusStore = useStatusStore()
 onMounted(() => {
  statusStore.fetchStatus().catch(() => {})
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
      <v-app-bar-title class="orange">Mediapi {{ getUserName() }} </v-app-bar-title>
      <v-spacer />
    </v-app-bar>
    <v-navigation-drawer v-model="drawer" elevation="4">
      <template v-slot:prepend>
        <div class="pa-2" v-if="height > 480">
          <img alt="Mediapi" class="logo" src="@/assets/logo.png" />
        </div>
      </template>
      <v-list v-if="authStore.user">
        <v-list-item v-if="!authStore.isAdmin">
          <RouterLink :to="'/user/edit/' + authStore.user.id" class="link">Настройки</RouterLink>
        </v-list-item>
        <v-list-item v-if="authStore.isAdmin">
          <RouterLink to="/users" class="link">Пользователи</RouterLink>
        </v-list-item>
        <v-list-item v-if="authStore.isLogist">
          <RouterLink to="/registers" class="link">Реестры</RouterLink>
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
          <span class="orange version"> Клиент {{ version }} </span>
          <br v-if="statusStore.coreVersion"/>
          <span v-if="statusStore.coreVersion" class="orange version">
            Сервер {{ statusStore.coreVersion }}
          </span>
          <br v-if="statusStore.dbVersion"/>
          <span v-if="statusStore.dbVersion" class="orange version"          >
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

.logo {
  margin: 1rem;
  display: block;
  width: 90%;
}

.version {
  margin: 2rem;
  font-size: 1rem;
}

nav {
  width: 100%;
  margin-top: 2rem;
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


</style>
