// Copyright (c) 2025 sw.consulting
// This file is a part of Media Pi  frontend application

<script setup>
import { ref } from 'vue'
import router from '@/router'
import { storeToRefs } from 'pinia'
import { Form, Field } from 'vee-validate'
import * as Yup from 'yup'

import { useDeviceGroupsStore } from '@/stores/device.groups.store.js'
import { useAlertStore } from '@/stores/alert.store.js'
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

const deviceGroupsStore = useDeviceGroupsStore()
const alertStore = useAlertStore()
const { alert } = storeToRefs(alertStore)
const { loading } = storeToRefs(deviceGroupsStore)

const schema = Yup.object().shape({
  name: Yup.string().required('Необходимо указать имя')
})

let group = ref({ name: '' })
const initialLoading = ref(false)

if (!isRegister()) {
  initialLoading.value = true
  try {
    await deviceGroupsStore.getById(props.id)
    const loadedGroup = deviceGroupsStore.group
    if (!loadedGroup) {
      throw new Error(`Группа устройств с ID ${props.id} не найдена`)
    }
    group.value = {
      name: loadedGroup.name || ''
    }
  } catch (err) {
    if (err.status === 401 || err.status === 403) {
      redirectToDefaultRoute()
    } else if (err.status === 404) {
      alertStore.error(`Группа устройств с ID ${props.id} не найдена`)
    } else {
      const errorMessage = err.message || err
      alertStore.error(`Ошибка загрузки группы устройств: ${errorMessage}`)
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
      name: values.name.trim()
    }
    if (isRegister()) {
      payload.accountId = props.accountId
      await deviceGroupsStore.add(payload)
    } else {
      await deviceGroupsStore.update(props.id, payload)
    }
    router.go(-1)
  } catch (err) {
    if (err.status === 401 || err.status === 403) {
      redirectToDefaultRoute()
    } else if (err.status === 404) {
      alertStore.error(`Группа устройств с ID ${props.id} не найдена`)
    } else if (err.status === 409) {
      alertStore.error('Группа устройств с таким названием уже существует')
    } else if (err.status === 422) {
      alertStore.error('Проверьте корректность введённых данных')
    } else {
      const errorMessage = err.message || err
      alertStore.error(`Ошибка при ${isRegister() ? 'создании' : 'обновлении'} группы устройств: ${errorMessage}`)
    }
  }
}
</script>

<template>
  <div class="settings form-2 form-compact">
    <h1 class="primary-heading">{{ isRegister() ? 'Новая группа устройств' : 'Настройки группы устройств' }}</h1>
    <hr class="hr" />

    <Form
      :validation-schema="schema"
      :initial-values="group"
      @submit="onSubmit"
      v-slot="{ errors, isSubmitting }"
    >
      <div class="form-group">
        <label for="name" class="label">Название:</label>
        <Field name="name" type="text" id="name" :disabled="isSubmitting"
          class="form-control input" :class="{ 'is-invalid': errors.name }"
          placeholder="Введите название группы"
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

