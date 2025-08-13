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
const componentError = ref(null)
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
      componentError.value = `Группа устройств с ID ${props.id} не найдена`
      alertStore.error(componentError.value)
    } else {
      componentError.value = err.message || err
      alertStore.error(`Ошибка загрузки группы устройств: ${componentError.value}`)
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
  componentError.value = null
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
      componentError.value = `Группа устройств с ID ${props.id} не найдена`
      alertStore.error(componentError.value)
    } else if (err.status === 409) {
      componentError.value = 'Группа устройств с таким названием уже существует'
      alertStore.error(componentError.value)
    } else if (err.status === 422) {
      componentError.value = 'Проверьте корректность введённых данных'
      alertStore.error(componentError.value)
    } else {
      componentError.value = err.message || err
      alertStore.error(`Ошибка при ${isRegister() ? 'создании' : 'обновлении'} группы устройств: ${componentError.value}`)
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

