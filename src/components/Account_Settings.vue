// Copyright (c) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
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
import FieldArrayWithButtons from '@/components/FieldArrayWithButtons.vue'


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
      'Invalid manager selection', 
      value => value === '' || (typeof value === 'number' && !isNaN(value))
    )
  )
})

let account = ref({ name: '', managers: [''] })
const { loading } = storeToRefs(accountsStore) 
const componentError = ref(null)
const initialLoading = ref(false)

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
    }
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
  const managers = isRegister() ? [] : (accountsStore.account?.userIds || [])
  return managers
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
  <div class="settings form-2 form-compact">
    <h1 class="primary-heading">{{ isRegister() ? 'Новый лицевой счёт' : 'Настройки лицевого счёта' }}</h1>
    <hr class="hr" />

    <Form
      :validation-schema="schema"
      :initial-values="account"
      @submit="onSubmit"
      v-slot="{ errors, isSubmitting }"
    >
      <div class="form-group-1">
        <label for="name" class="label-1">Название:</label>
        <Field name="name" type="text" id="name" :disabled="isSubmitting"
          class="form-control input-1" :class="{ 'is-invalid': errors.name }"
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

      <div v-else class="form-group-1">
        <label class="label-1">Менеджеры:</label>
        <ul>
          <li v-for="name in selectedManagerNames" :key="name">{{ name }}</li>
          <li v-if="!selectedManagerNames.length">Менеджеры не назначены</li>
        </ul>
      </div>

      <div class="form-group mt-8">
        <button class="button primary" type="submit" :disabled="isSubmitting">
          <span v-show="isSubmitting" class="spinner-border spinner-border-sm mr-1"></span>
          <font-awesome-icon size="1x" icon="fa-solid fa-check-double" class="mr-1" />
            {{ getButton() }}
        </button>
        <button
          class="button secondary"
          type="button"
          @click="$router.go(-1)"
        >
          <font-awesome-icon size="1x" icon="fa-solid fa-xmark" class="mr-1" />
          Отменить
        </button>
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
    
  </div>
</template>
