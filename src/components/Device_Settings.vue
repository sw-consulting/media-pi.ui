// Copyright (c) 2025 sw.consulting
// This file is a part of Media Pi  frontend application

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
import { canManageAccountById } from '@/helpers/user.helpers.js'

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
  ipAddress: Yup.string().required('Необходимо указать IP адрес'),
  port: Yup.number()
    .typeError('Порт должен быть числом')
    .integer('Порт должен быть целым числом')
    .min(1, 'Порт должен быть больше 0')
    .max(65535, 'Порт должен быть меньше либо равен 65535')
    .required('Необходимо указать TCP порт')
})

// Default port for devices is 8081
let device = ref({ name: '', ipAddress: '', port: 8081 })
const initialLoading = ref(false)
const currentTab = ref('name')

function canCreate () {
  return authStore.isAdministrator || authStore.isEngineer
}

function canEdit (dev) {
  if (dev?.accountId) {
    return canManageAccountById(authStore.user, dev.accountId)
  } else {
    return authStore.isAdministrator || authStore.isEngineer
  }
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
      ipAddress: loadedDevice.ipAddress || '',
      port: typeof loadedDevice.port === 'number' ? loadedDevice.port : (loadedDevice.port ? Number(loadedDevice.port) : 8081)
    }
  } catch (err) {
    if (err.status === 401 || err.status === 403) {
      redirectToDefaultRoute()
    } else if (err.status === 404) {
      alertStore.error(`Устройство с ID ${props.id} не найдено`)
    } else {
      const errorMessage = err.message || err
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
      ipAddress: values.ipAddress.trim(),
      port: Number(values.port) || 8081
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
    if (err.status === 401 || err.status === 403) {
      redirectToDefaultRoute()
    } else if (err.status === 404) {
      alertStore.error(`Устройство с ID ${props.id} не найдено`)
    } else if (err.status === 409) {
      alertStore.error('Устройство с таким IP адресом уже существует')
    } else if (err.status === 422) {
      alertStore.error('Проверьте корректность введённых данных')
    } else {
      const errorMessage = err.message || err
      alertStore.error(`Ошибка при ${isRegister() ? 'создании' : 'обновлении'} устройства: ${errorMessage}`)
    }
  }
}
</script>

<template>
  <div class="settings form-2 form-compact">
    <h1 class="primary-heading">{{ isRegister() ? 'Новое устройство' : 'Настройки устройства' }}</h1>
    <hr class="hr" />

    <v-tabs v-model="currentTab" color="primary">
      <v-tab value="name">Название</v-tab>
      <v-tab value="settings">Настройки</v-tab>
      <v-tab value="system-info">Системная информация</v-tab>
    </v-tabs>

    <v-tabs-window v-model="currentTab">
      <v-tabs-window-item value="name">
        <Form
          :validation-schema="schema"
          :initial-values="device"
          @submit="onSubmit"
          v-slot="{ errors, isSubmitting }"
        >
          <div class="form-group mt-4">
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

          <div class="form-group mt-4">
            <label for="port" class="label">TCP порт:</label>
            <Field name="port" type="number" id="port" :disabled="isSubmitting"
              class="form-control input" :class="{ 'is-invalid': errors.port }"
              placeholder="Введите TCP порт (1-65535)"
            />
          </div>

          <div class="form-group mt-8">
            <button class="button primary" type="submit" :disabled="isSubmitting">
              <span v-show="isSubmitting" class="spinner-border spinner-border-sm mr-1"></span>
              <font-awesome-icon size="1x" icon="fa-solid fa-check-double" class="mr-1" />
              {{ getButton() }}
            </button>
          </div>

          <div v-if="errors.name" class="alert alert-danger mt-3 mb-0">{{ errors.name }}</div>
          <div v-if="errors.ipAddress" class="alert alert-danger mt-3 mb-0">{{ errors.ipAddress }}</div>
        </Form>
      </v-tabs-window-item>

      <v-tabs-window-item value="settings">
        <div class="mt-4">
          <p>Настройки</p>
        </div>
      </v-tabs-window-item>

      <v-tabs-window-item value="system-info">
        <div class="mt-4">
          <p>Системная информация</p>
        </div>
      </v-tabs-window-item>
    </v-tabs-window>

    <div class="form-group mt-8">
      <button
        class="button secondary"
        type="button"
        @click="$router.go(-1)"
      >
        <font-awesome-icon size="1x" icon="fa-solid fa-xmark" class="mr-1" />
        Отменить
      </button>
    </div>

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

