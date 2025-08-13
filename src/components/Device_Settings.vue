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
import { ref } from 'vue'
import router from '@/router'
import { storeToRefs } from 'pinia'
import { Form, Field } from 'vee-validate'
import * as Yup from 'yup'

import { useDevicesStore } from '@/stores/devices.store.js'
import { useAlertStore } from '@/stores/alert.store.js'
import { useAuthStore } from '@/stores/auth.store.js'
import { redirectToDefaultRoute } from '@/helpers/default.route.js'

const props = defineProps({
  register: {
    type: Boolean,
    required: true
  },
  id: {
    type: Number,
    required: false
  },
  accountId: {
    type: Number,
    required: false
  }
})

const devicesStore = useDevicesStore()
const alertStore = useAlertStore()
const authStore = useAuthStore()
const { alert } = storeToRefs(alertStore)
const { loading } = storeToRefs(devicesStore)

const schema = Yup.object().shape({
  name: Yup.string().required('Необходимо указать имя'),
  ipAddress: Yup.string().required('Необходимо указать IP адрес')
})

let device = ref({ name: '', ipAddress: '' })
const initialLoading = ref(false)

function canCreate () {
  return authStore.isAdministrator || authStore.isEngineer
}

function canEdit (dev) {
  if (authStore.isAdministrator || authStore.isManager) {
    return true
  }
  return authStore.isEngineer && (dev?.accountId === null || dev?.accountId === undefined)
}

if (props.register) {
  if (!canCreate()) {
    redirectToDefaultRoute()
  }
} else {
  initialLoading.value = true
  try {
    await devicesStore.getById(props.id)
    const loadedDevice = devicesStore.device
    if (!loadedDevice) {
      throw new Error(`Устройство с ID ${props.id} не найдено`)
    }
    if (!canEdit(loadedDevice)) {
      redirectToDefaultRoute()
    }
    device.value = {
      name: loadedDevice.name || '',
      ipAddress: loadedDevice.ipAddress || ''
    }
  } catch (err) {
    const status = err?.status || err?.response?.status
    if (status === 401 || status === 403) {
      redirectToDefaultRoute()
    } else if (status === 404) {
      alertStore.error(`Устройство с ID ${props.id} не найдено`)
    } else {
      const errorMessage = err?.message || err?.response?.data?.message || err
      alertStore.error(`Ошибка загрузки устройства: ${errorMessage}`)
    }
  } finally {
    initialLoading.value = false
  }
}

function isRegister () {
  return props.register
}

function getButton () {
  return isRegister() ? 'Создать' : 'Сохранить'
}

async function onSubmit (values) {
  try {
    const payload = {
      name: values.name.trim(),
      ipAddress: values.ipAddress.trim()
    }
    if (props.accountId !== undefined) {
      payload.accountId = props.accountId
    }
    if (isRegister()) {
      const reference = await devicesStore.register()
      await devicesStore.update(reference.id, payload)
    } else {
      await devicesStore.update(props.id, payload)
    }
    router.go(-1)
  } catch (err) {
    const status = err?.status || err?.response?.status
    if (status === 401 || status === 403) {
      redirectToDefaultRoute()
    } else if (status === 404) {
      alertStore.error(`Устройство с ID ${props.id} не найдено`)
    } else if (status === 409) {
      alertStore.error('Устройство с таким IP адресом уже существует')
    } else if (status === 422) {
      alertStore.error('Проверьте корректность введённых данных')
    } else {
      const errorMessage = err?.message || err?.response?.data?.message || err
      alertStore.error(`Ошибка при ${isRegister() ? 'создании' : 'обновлении'} устройства: ${errorMessage}`)
    }
  }
}
</script>

<template>
  <div class="settings form-2 form-compact">
    <h1 class="primary-heading">{{ isRegister() ? 'Новое устройство' : 'Настройки устройства' }}</h1>
    <hr class="hr" />

    <Form
      :validation-schema="schema"
      :initial-values="device"
      @submit="onSubmit"
      v-slot="{ errors, isSubmitting }"
    >
      <div class="form-group">
        <label for="name" class="label">Название:</label>
        <Field name="name" type="text" id="name" :disabled="isSubmitting"
          class="form-control input" :class="{ 'is-invalid': errors.name }"
          placeholder="Введите название устройства"
        />
      </div>

      <div class="form-group mt-4">
        <label for="ipAddress" class="label">IP адрес:</label>
        <Field name="ipAddress" type="text" id="ipAddress" :disabled="isSubmitting"
          class="form-control input" :class="{ 'is-invalid': errors.ipAddress }"
          placeholder="Введите IP адрес устройства"
        />
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

      <div v-if="errors.name" class="alert alert-danger mt-3 mb-0">{{ errors.name }}</div>
      <div v-if="errors.ipAddress" class="alert alert-danger mt-3 mb-0">{{ errors.ipAddress }}</div>
    </Form>

    <div v-if="alert" class="alert alert-dismissable mt-3 mb-0" :class="alert.type">
      <button @click="alertStore.clear()" class="btn btn-link close">×</button>
      {{ alert.message }}
    </div>

    <div v-if="loading || initialLoading" class="text-center m-5">
      <span class="spinner-border spinner-border-lg align-center"></span>
      <div class="mt-2">{{ loading ? 'Сохранение...' : 'Загрузка...' }}</div>
    </div>
  </div>
</template>

