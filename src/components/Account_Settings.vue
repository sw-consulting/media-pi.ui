// Copyright (c) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
//
// Permission is hereby gr// Load utry {
  a}// Load use} // Load use} catch (err) {
  // Don't block the form if users fail to load, just show a warning
  if (authStore.isAdministrator) {
    alertStore.error('Не удалось загрузить список пользователей для выбора менеджеров')
  }
} better error handling
try {
  await usersStore.getAll()
} catch (err) {
  // Don't block the form if users fail to load, just show a warning
  if (authStore.isAdministrator) {
    alertStore.error('Не удалось загрузить список пользователей для выбора менеджеров')
  }
}) {
  // Don't block the form if users fail to load, just show a warning
  if (authStore.isAdministrator) {
    alertStore.error('Не удалось загрузить список пользователей для выбора менеджеров')
  }
} better error handling
try {
  await usersStore.getAll()
} catch (err) {
  // Don't block the form if users fail to load, just show a warning
  if (authStore.isAdministrator) {
    alertStore.error('Не удалось загрузить список пользователей для выбора менеджеров')
  }
}rr) {
  // Don't block the form if users fail to load, just show a warning
  if (authStore.isAdministrator) {
    alertStore.error('Не удалось загрузить список пользователей для выбора менеджеров')
  }sersStore.getAll()
} catch (err) {
  // Don't block the form if users fail to load, just show a warning
  if (authStore.isAdministrator) {
    alertStore.error('Не удалось загрузить список пользователей для выбора менеджеров')
  }
} better error handling
try {
  await usersStore.getAll()
} catch (err) {
  // Don't block the form if users fail to load, just show a warning
  if (authStore.isAdministrator) {
    alertStore.error('Не удалось загрузить список пользователей для выбора менеджеров')
  }
}e of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.
//
// This file is a part of Media Pi frontend application

<script setup>
import { ref, computed } from 'vue'
import router from '@/router'
import { storeToRefs } from 'pinia'
import { Form, Field } from 'vee-validate'
import * as Yup from 'yup'

import { useAccountsStore } from '@/stores/accounts.store.js'
import { useUsersStore } from '@/stores/users.store.js'
import { useAuthStore } from '@/stores/auth.store.js'
import { useAlertStore } from '@/stores/alert.store.js'
import { UserRoleConstants } from '@/helpers/user.helpers.js'
import { redirectToDefaultRoute } from '@/helpers/default.route.js'

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
  managers: Yup.array().of(Yup.number())
})

let account = ref({ name: '', managers: [] })
const { loading, error } = storeToRefs(accountsStore)
const componentError = ref(null)
const initialLoading = ref(false)

// Access control
if (!isRegister() && !authStore.isAdministrator && !authStore.isManager) {
  redirectToDefaultRoute()
}
if (isRegister() && !authStore.isAdministrator) {
  redirectToDefaultRoute()
}

if (!isRegister()) {
  initialLoading.value = true
  const accountRef = storeToRefs(accountsStore)
  account.value = accountRef.account
  try {
    await accountsStore.getById(props.id)
    if (!account.value) {
      throw new Error(`Лицевой счёт с ID ${props.id} не найден`)
    }
    account.value.managers = account.value.managers || account.value.managerIds || []
  } catch (err) {
    if (err.status === 401 || err.status === 403) {
      redirectToDefaultRoute()
    } else if (err.status === 404) {
      componentError.value = `Лицевой счёт с ID ${props.id} не найден`
      alertStore.error(componentError.value)
    } else {
      componentError.value = err.message || err
      alertStore.error(`Ошибка загрузки лицевого счёта: ${componentError.value}`)
    }
  } finally {
    initialLoading.value = false
  }
}

// Load users with better error handling
try {
  await usersStore.getAll()
} catch (err) {
  if (authStore.isAdministrator) {
    alertStore.error(`Не удалось загрузить список для выбора менеджеров: ${err.message || err}`)
  }
}

const managerOptions = computed(() => {
  return (usersStore.users || [])
    .filter(u => Array.isArray(u.roles) && u.roles.includes(UserRoleConstants.AccountManager))
    .map(u => ({
      value: u.id,
      text: `${u.lastName || ''} ${u.firstName || ''}`.trim()
    }))
})

const selectedManagerNames = computed(() => {
  return (account.value.managers || [])
    .map(id => {
      const u = usersStore.getUserById ? usersStore.getUserById(id) : (usersStore.users || []).find(u => u.id === id)
      return u ? `${u.lastName || ''} ${u.firstName || ''}`.trim() : `#${id}`
    })
})

function isRegister() {
  return props.register
}

function canEditManagers() {
  return authStore.isAdministrator
}

function getButton() {
  return isRegister() ? 'Создать' : 'Сохранить'
}

async function onSubmit(values) {
  componentError.value = null
  try {
    const payload = { 
      name: values.name.trim(), 
      managerIds: account.value.managers || [] 
    }
    
    if (isRegister()) {
      await accountsStore.add(payload)
      alertStore.success('Лицевой счёт успешно создан')
    } else {
      await accountsStore.update(props.id, payload)
      alertStore.success('Настройки лицевого счёта сохранены')
    }
    router.push('/accounts')
  } catch (err) {
    if (err.status === 401 || err.status === 403) {
      redirectToDefaultRoute()
    } else if (err.status === 409) {
      componentError.value = 'Лицевой счёт с таким названием уже существует'
      alertStore.error(componentError.value)
    } else if (err.status === 422) {
      componentError.value = 'Проверьте корректность введённых данных'
      alertStore.error(componentError.value)
    } else {
      componentError.value = err.message || err
      alertStore.error(`Ошибка при ${isRegister() ? 'создании' : 'обновлении'} лицевого счёта: ${componentError.value}`)
    }
  }
}
</script>

<template>
  <div class="settings table">
    <h1 class="orange">{{ isRegister() ? 'Новый лицевой счёт' : 'Настройки лицевого счёта' }}</h1>
    <hr class="hr" />

    <Form @submit="onSubmit" :validation-schema="schema" v-slot="{ errors, isSubmitting }">
      <div class="form-group">
        <label for="name" class="label">Название:</label>
        <Field
          name="name"
          type="text"
          id="name"
          v-model="account.name"
          class="form-control input"
          :class="{ 'is-invalid': errors.name }"
          placeholder="Введите название лицевого счёта"
          :disabled="isSubmitting"
        />
        <div v-if="errors.name" class="invalid-feedback">{{ errors.name }}</div>
      </div>

      <div class="form-group">
        <label for="managers" class="label">Менеджеры:</label>
        <select
          v-if="canEditManagers()"
          id="managers"
          multiple
          v-model="account.managers"
          class="form-control input"
          :class="{ 'is-invalid': errors.managers }"
          :disabled="isSubmitting || !managerOptions.length"
        >
          <option v-if="!managerOptions.length" disabled>
            Нет доступных пользователей
          </option>
          <option v-for="option in managerOptions" :key="option.value" :value="option.value">
            {{ option.text }}
          </option>
        </select>
        <ul v-else>
          <li v-for="name in selectedManagerNames" :key="name">{{ name }}</li>
          <li v-if="!selectedManagerNames.length">Менеджеры не назначены</li>
        </ul>
        <div v-if="errors.managers" class="invalid-feedback">{{ errors.managers }}</div>
      </div>

      <div class="form-group mt-5">
        <button class="button" type="submit" :disabled="isSubmitting || componentError">
          <span v-show="isSubmitting" class="spinner-border spinner-border-sm mr-1"></span>
          {{ getButton() }}
        </button>
        <button class="button" type="button" @click="$router.push('/accounts')" :disabled="isSubmitting">
          Отменить
        </button>
      </div>
      
      <!-- Component-level errors -->
      <div v-if="componentError" class="alert alert-danger mt-3 mb-0">
        {{ componentError }}
        <button @click="componentError = null" class="btn btn-link close">×</button>
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
    
    <div v-if="error && !componentError" class="text-center m-5">
      <div class="text-danger">Ошибка при загрузке информации о счёте: {{ error }}</div>
      <button @click="$router.go(0)" class="btn btn-primary mt-2">
        Обновить страницу
      </button>
    </div>
  </div>
</template>
