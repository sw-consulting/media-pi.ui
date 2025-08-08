<script setup>
// Copyright (c) 2025 sw.consulting
// Licensed under the MIT License.
// This file is a part of Mediapi frontend application

import { ref, computed, onMounted } from 'vue'

import router from '@/router'
import { storeToRefs } from 'pinia'
import { Form, Field } from 'vee-validate'
import * as Yup from 'yup'
import { useUsersStore } from '@/stores/users.store.js'
import { useAuthStore } from '@/stores/auth.store.js'
import { useAlertStore } from '@/stores/alert.store.js'

import { useRolesStore } from '@/stores/roles.store.js'
const rolesStore = useRolesStore()

// Load roles only once on component mount
onMounted(async () => {
  await rolesStore.ensureLoaded()
})


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

const usersStore = useUsersStore()
const authStore = useAuthStore()

const pwdErr =
  'Пароль должен быть не короче 8 символов и содержать хотя бы одну цифру и один специальный символ (!@#$%^&*()\\-_=+{};:,<.>)'
const pwdReg = /^.*(?=.{8,})((?=.*[!@#$%^&*()\-_=+{};:,<.>]){1})((?=.*\d){1}).*$/

const schema = Yup.object().shape({
  firstName: Yup.string().required('Необходимо указать имя'),
  lastName: Yup.string().required('Необходимо указать фамилию'),
  email: Yup.string()
    .required('Необходимо указать электронную почту')
    .email('Неверный формат электронной почты'),
  password: Yup.string().concat(
    isRegister() ? Yup.string().required('Необходимо указать пароль').matches(pwdReg, pwdErr) : null
  ),
  password2: Yup.string()
    .when('password', (password, schema) => {
      if ((password && password != '') || isRegister())
        return schema.required('Необходимо подтвердить пароль').matches(pwdReg, pwdErr)
    })
    .oneOf([Yup.ref('password')], 'Пароли должны совпадать')
})


const showPassword = ref(false)
const showPassword2 = ref(false)

let user = ref({
})

// Computed property for available roles as options for the combobox
const roleOptions = computed(() => {
  const options = [{ value: null, text: 'Без роли' }]
  if (rolesStore.roles && rolesStore.roles.length > 0) {
    rolesStore.roles.forEach(role => {
      options.push({ value: role.id, text: role.name })
    })
  }
  return options
})

// Computed property for selected role (0 or 1 role)
const selectedRole = computed({
  get() {
    if (!user.value || !Array.isArray(user.value.roles) || user.value.roles.length === 0) {
      return null
    }
    // If multiple roles, select the one with smallest ID
    return Math.min(...user.value.roles)
  },
  set(roleId) {
    if (!user.value) user.value = {}
    if (roleId === null || roleId === undefined) {
      user.value.roles = []
    } else {
      user.value.roles = [roleId]
    }
  }
})

if (!isRegister()) {
  ;({ user } = storeToRefs(usersStore))
  await usersStore.getById(props.id, true)
}

function isRegister() {
  return props.register
}

function asAdmin() {
  return authStore.isAdministrator
}

function getTitle() {
  return isRegister() ? (asAdmin() ? 'Регистрация пользователя' : 'Регистрация') : 'Настройки'
}

function getButton() {
  return isRegister() ? 'Зарегистрировать' + (asAdmin() ? '' : 'ся') : 'Сохранить'
}

function showCredentials() {
  return !isRegister() && !asAdmin()
}

function showAndEditCredentials() {
  return asAdmin()
}

function getCredentials() {
  const crd = []
  if (user.value && Array.isArray(user.value.roles)) {
    user.value.roles.forEach(roleId => {
      crd.push(rolesStore.getName(roleId))
    })
  }
  return crd.join(', ')
}

function onSubmit(values, { setErrors }) {
  if (isRegister()) {
    if (asAdmin()) {
      // Admin can set roles via the combobox, convert selectedRole to roles array
      if (selectedRole.value !== null) {
        values.roles = [selectedRole.value]
      } else {
        values.roles = []
      }
      return usersStore
        .add(values, true)
        .then(() =>
          router.push(authStore.isAdmin ? '/users' : '/user/edit/' + authStore.user.id)
        )
        .catch((error) => setErrors({ apiError: error.message || String(error) }))
    } else {
      // Non-admin registers with default role (assuming role ID 11 for AccountManager/logist)
      values.roles = [11]
      values.host = window.location.href
      values.host = values.host.substring(0, values.host.lastIndexOf('/'))
      return authStore
        .register(values)
        .then(() => {
          router.push('/').then(() => {
            const alertStore = useAlertStore()
            alertStore.success(
              'На Ваш адрес электронной почты отправлено письмо с подтверждением. ' +
                'Пожалуйста, перейдите по ссылке для завершения регистрации. ' +
                'Обратите внимание, что ссылка одноразовая и действует 4 часа. ' +
                'Если Вы не можете найти письма, проверьте папку с нежелательной почтой (спамом). ' +
                'Если письмо не пришло, обратитесь к администратору.'
            )
          })
        })
        .catch((error) => setErrors({ apiError: error.message || String(error) }))
    }
  } else {
    if (asAdmin()) {
      // Admin can edit roles via the combobox
      if (selectedRole.value !== null) {
        values.roles = [selectedRole.value]
      } else {
        values.roles = []
      }
    } else {
      // Non-admin keeps existing roles
      values.roles = user.value.roles
    }
    return usersStore
      .update(props.id, values, true)
      .then(() =>
        router.push(authStore.isAdmin ? '/users' : '/user/edit/' + authStore.user.id)
      )
      .catch((error) => setErrors({ apiError: error.message || String(error) }))
  }
}

</script>

<template>
  <div class="settings form-2">
    <h1 class="orange">{{ getTitle() }}</h1>
    <hr class="hr" />
    <Form
      @submit="onSubmit"
      :initial-values="user"
      :validation-schema="schema"
      v-slot="{ errors, isSubmitting }"
    >
      <div class="form-group">
        <label for="lastName" class="label">Фамилия:</label>
        <Field
          name="lastName"
          id="lastName"
          type="text"
          class="form-control input"
          :class="{ 'is-invalid': errors.lastName }"
          placeholder="Фамилия"
        />
      </div>
      <div class="form-group">
        <label for="firstName" class="label">Имя:</label>
        <Field
          name="firstName"
          id="firstName"
          type="text"
          class="form-control input"
          :class="{ 'is-invalid': errors.firstName }"
          placeholder="Имя"
        />
      </div>
      <div class="form-group">
        <label for="patronymic" class="label">Отчество:</label>
        <Field
          name="patronymic"
          id="patronymic"
          type="text"
          class="form-control input"
          :class="{ 'is-invalid': errors.patronymic }"
          placeholder="Отчество"
        />
      </div>
      <div class="form-group">
        <label for="email" class="label">Адрес электронной почты:</label>
        <Field
          name="email"
          id="email"
          autocomplete="off"
          type="email"
          class="form-control input"
          :class="{ 'is-invalid': errors.email }"
          placeholder="Адрес электронной почты"
        />
      </div>
      <div class="form-group">
        <label for="password" class="label">Пароль:</label>
        <div class="password-wrapper">
          <Field
            name="password"
            id="password"
            ref="password"
            :type="showPassword ? 'text' : 'password'"
            class="form-control input password"
            :class="{ 'is-invalid': errors.password }"
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
      <div class="form-group">
        <label for="password2" class="label">Пароль ещё раз:</label>
        <div class="password-wrapper">
          <Field
            name="password2"
            id="password2"
            :type="showPassword2 ? 'text' : 'password'"
            class="form-control input password"
            :class="{ 'is-invalid': errors.password2 }"
            placeholder="Пароль"
          />
          <button
            type="button"
            @click="
              (event) => {
                event.preventDefault()
                showPassword2 = !showPassword2
              }
            "
            class="button-o"
          >
            <font-awesome-icon
              size="1x"
              v-if="!showPassword2"
              icon="fa-solid fa-eye"
              class="button-o-c"
            />
            <font-awesome-icon
              size="1x"
              v-if="showPassword2"
              icon="fa-solid fa-eye-slash"
              class="button-o-c"
            />
          </button>
        </div>
      </div>
      <div v-if="showCredentials()" class="form-group">
        <label for="crd" class="label">Права:</label>
        <span id="crd"
          ><em>{{ getCredentials() }}</em></span
        >
      </div>

      <div v-if="showAndEditCredentials()" class="form-group">
        <label for="roleSelect" class="label">Роль:</label>
        <select
          id="roleSelect"
          v-model="selectedRole"
          class="form-control input"
        >
          <option
            v-for="option in roleOptions"
            :key="option.value"
            :value="option.value"
          >
            {{ option.text }}
          </option>
        </select>
      </div>

      <div class="form-group mt-5">
        <button class="button" type="submit" :disabled="isSubmitting">
          <span v-show="isSubmitting" class="spinner-border spinner-border-sm mr-1"></span>
          {{ getButton() }}
        </button>
        <button
          v-if="asAdmin()"
          class="button"
          type="button"
          @click="
            $router.push(authStore.isAdmin ? '/users' : '/user/edit/' + authStore.user.id)
          "
        >
          <span v-show="isSubmitting" class="spinner-border spinner-border-sm mr-1"></span>
          Отменить
        </button>
      </div>
      <div v-if="errors.lastName" class="alert alert-danger mt-3 mb-0">{{ errors.lastName }}</div>
      <div v-if="errors.firstName" class="alert alert-danger mt-3 mb-0">{{ errors.firstName }}</div>
      <div v-if="errors.patronymic" class="alert alert-danger mt-3 mb-0">
        {{ errors.patronymic }}
      </div>
      <div v-if="errors.email" class="alert alert-danger mt-3 mb-0">{{ errors.email }}</div>
      <div v-if="errors.password" class="alert alert-danger mt-3 mb-0">{{ errors.password }}</div>
      <div v-if="errors.password2" class="alert alert-danger mt-3 mb-0">{{ errors.password2 }}</div>
      <div v-if="errors.apiError" class="alert alert-danger mt-3 mb-0">{{ errors.apiError }}</div>
    </Form>
  </div>
  <div v-if="user?.loading" class="text-center m-5">
    <span class="spinner-border spinner-border-lg align-center"></span>
  </div>
  <div v-if="user?.error" class="text-center m-5">
    <div class="text-danger">Ошибка при загрузке информации о пользователе: {{ user.error }}</div>
  </div>
</template>
