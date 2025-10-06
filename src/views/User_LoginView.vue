// Copyright (c) 2025 sw.consulting
// This file is a part of Media Pi  frontend application

<script setup>

import { ref } from 'vue'
import { Form, Field } from 'vee-validate'
import * as Yup from 'yup'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '@/stores/auth.store.js'
import { useAlertStore } from '@/stores/alert.store.js'
import { useRolesStore } from '@/stores/roles.store.js'

import { redirectToDefaultRoute } from '@/helpers/default.route.js'
import { useRolesStore } from '@/stores/roles.store.js'


const schema = Yup.object().shape({
  login_email: Yup.string()
    .required('Необходимо указать электронную почту')
    .email('Неверный формат электронной почты'),
  login_password: Yup.string()
    .required('Необходимо указать пароль')
    .min(4, 'Пароль не может быть короче 4 симоволов')
})

const showPassword = ref(false)

const alertStore = useAlertStore()
const { alert } = storeToRefs(alertStore)

function onSubmit(values) {
  const authStore = useAuthStore()
  const { login_email, login_password } = values

  // Clear any previous alerts
  alertStore.clear()

  return authStore
    .login(login_email, login_password)
    .then(() => {
      const rolesStore = useRolesStore()
      rolesStore.ensureLoaded().catch(() => {})
      redirectToDefaultRoute()
    })
    .catch((error) => alertStore.error(error.message || String(error)))
}
</script>

<template>
  <div class="settings form-1">
    <h1 class="primary-heading">Вход</h1>
    <hr class="hr" />
    <Form @submit="onSubmit" :validation-schema="schema" v-slot="{ errors, isSubmitting }">
      <div class="form-group">
        <label for="login_email" class="label">Адрес электронной почты:</label>
        <Field
          name="login_email"
          id="login_email"
          type="text"
          class="form-control input"
          :class="{ 'is-invalid': errors.login_email }"
          placeholder="Адрес электронной почты"
        />
      </div>
      <div class="form-group">
        <label for="login_password" class="label">Пароль:</label>
        <div class="password-wrapper">
          <Field
            name="login_password"
            id="login_password"
            :type="showPassword ? 'text' : 'password'"
            class="form-control input password"
            :class="{ 'is-invalid': errors.login_password }"
            placeholder="Пароль"
          />
          <button
            type="button"
            @click="
              (event) => {
                event.preventDefault()
                showPassword = !showPassword
              }
            "
            class="button-o"
          >
            <font-awesome-icon
              size="1x"
              v-if="!showPassword"
              icon="fa-solid fa-eye"
              class="button-o-c"
            />
            <font-awesome-icon
              size="1x"
              v-if="showPassword"
              icon="fa-solid fa-eye-slash"
              class="button-o-c"
            />
          </button>
        </div>
      </div>

      <div class="form-group mt-8">
        <button class="button primary" type="submit" :disabled="isSubmitting">
          <span v-show="isSubmitting" class="spinner-border spinner-border-sm mr-1"></span>
          <font-awesome-icon size="1x" icon="fa-solid fa-check-double" class="mr-1" />
            Войти
        </button>
      </div>

      <div v-if="errors.login_email" class="alert alert-danger mt-3 mb-0">
        {{ errors.login_email }}
      </div>
      <div v-if="errors.login_password" class="alert alert-danger mt-3 mb-0">
        {{ errors.login_password }}
      </div>
    </Form>
    <div v-if="alert" class="alert alert-dismissable mt-3 mb-0" :class="alert.type">
      <button @click="alertStore.clear()" class="btn btn-link close">×</button>
      {{ alert.message }}
    </div>
  </div>
</template>
