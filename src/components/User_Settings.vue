// Copyright (c) 2025 sw.consulting
// This file is a part of Media Pi  frontend application

<script setup>

import { ref, computed, onMounted } from 'vue'

import router from '@/router'
import { storeToRefs } from 'pinia'
import { Form, Field } from 'vee-validate'
import * as Yup from 'yup'
import { useUsersStore } from '@/stores/users.store.js'
import { useAuthStore } from '@/stores/auth.store.js'
import { useAlertStore } from '@/stores/alert.store.js'
import { getRoleName, isManager } from '@/helpers/user.helpers.js'
import { useRolesStore } from '@/stores/roles.store.js'
import { useAccountsStore } from '@/stores/accounts.store.js'
import { redirectToDefaultRoute } from '@/helpers/default.route'
import { FieldArrayWithButtons } from '@sw-consulting/tooling.ui.kit'

const alertStore = useAlertStore()
const { alert } = storeToRefs(alertStore)

const rolesStore = useRolesStore()
const accountsStore = useAccountsStore()
const usersStore = useUsersStore()
const authStore = useAuthStore()


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

const pwdErr =
  'Пароль должен быть не короче 8 символов и содержать хотя бы одну цифру и один специальный символ (!@#$%^&*()\\-_=+{};:,<.>)'
const pwdReg = /^.*(?=.{8,})((?=.*[!@#$%^&*()\-_=+{};:,<.>]){1})((?=.*\d){1}).*$/

const schema = Yup.object().shape({
  firstName: Yup.string().required('Необходимо указать имя'),
  lastName: Yup.string().required('Необходимо указать фамилию'),
  email: Yup.string()
    .required('Необходимо указать электронную почту')
    .email('Неверный формат электронной почты'),
  accountIds: Yup.array().of(
    Yup.mixed().test(
      'is-number-or-empty', 
      'Ошибка выбора лицевых счетов', 
      value => value === '' || (typeof value === 'number' && !isNaN(value))
    )
  ),
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

onMounted(async () => {
  try {
    await rolesStore.ensureLoaded() 
    if (authStore.isAdministrator) {
      await accountsStore.getAll()
    }
    else if (authStore.isAccountManager) {
      await accountsStore.getByManager(props.id)
    }
  } catch {
    alertStore.error('Не удалось загрузить списки ролей и лицевых счетов');
  }
})

const showPassword = ref(false)
const showPassword2 = ref(false)

let user = ref({
  accountIds: [''], // Start with one empty field for FieldArray
  roles: []
})

// Computed property for available roles as options for the combobox
const roleOptions = computed(() => {
  const options = [{ value: null, text: 'Без роли' }]
  if (rolesStore.roles && rolesStore.roles.length > 0) {
    rolesStore.roles.forEach(role => {
      options.push({ value: role.roleId, text: role.name })
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
    // If multiple roles, select the one with smallest roleId
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

const isSelectedRoleManager = computed(() => {
  if (!selectedRole.value) return false;
  return isManager({ roles: [selectedRole.value] });
});

const shouldShowAccountArray = computed(() => {
  return showAndEditCredentials() && isSelectedRoleManager.value;
});

const accountOptions = computed(() => {
  return (accountsStore.accounts || []).map(acc => ({
    value: acc.id,
    text: acc.name
  }))
})

const userAccounts = computed(() => {
  if (!user.value || !Array.isArray(user.value.accountIds) || user.value.accountIds.length === 0) {
    return []
  }
  
  const userAccountIds = user.value.accountIds.filter(id => id !== '' && id !== null && id !== undefined)
  // Filter account options to only include those that match user's accountIds
  const xx = (accountsStore.accounts || [])
    .filter(acc => userAccountIds.includes(acc.id))
    .map(acc => ({
      value: acc.id,
      text: acc.name
    }))

    return xx
})

if (!isRegister()) {
  await usersStore.getById(props.id, true)
  const { user: storeUser } = storeToRefs(usersStore)
  user.value = storeUser.value
  
  if (!user.value.accountIds || !Array.isArray(user.value.accountIds) || user.value.accountIds.length === 0) {
    user.value.accountIds = ['']
  }
}

function isRegister() {
  return props.register
}

function asAdmin() {
  return authStore.isAdministrator
}

function getTitle() {
  return isRegister() ? (asAdmin() ? 'Регистрация пользователя' : 'Регистрация') : 'Настройки пользователя'
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

function redirectToReturnRoute() {
  if (asAdmin()) {
    return router.push('/users')
  }
  redirectToDefaultRoute()
}

function filterAccountIds(accountIds) {
  return (accountIds || [])
    .filter(accountId => accountId !== '' && accountId !== null && accountId !== undefined)
    .map(accountId => typeof accountId === 'string' ? parseInt(accountId, 10) : accountId)
    .filter(accountId => !isNaN(accountId))
}

function onSubmit(values) {
  // Clear any previous alerts
  const alertStore = useAlertStore()
  alertStore.clear()
  
  if (isRegister()) {
    if (asAdmin()) {
      if (selectedRole.value !== null && selectedRole.value !== undefined) {
        values.roles = [selectedRole.value]
      } else {
        values.roles = []
      }
      values.accountIds = filterAccountIds(values.accountIds)
      return usersStore
        .add(values, true)
        .then(() =>
          redirectToReturnRoute()
        )
        .catch((error) => alertStore.error(error.message || String(error)))
    } else {
      // Non-admin registers with empty roles array
      values.roles = []
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
        .catch((error) => alertStore.error(error.message || String(error)))
    }
  } else {
    if (asAdmin()) {
      // Admin can edit roles via the combobox, selectedRole already contains roleId
      if (selectedRole.value !== null) {
        values.roles = [selectedRole.value]
      } else {
        values.roles = []
      }
      values.accountIds = filterAccountIds(values.accountIds)
    } else {
      values.roles = undefined
      values.accountIds = undefined
    }
    return usersStore
      .update(props.id, values, true)
      .then(() =>
        redirectToReturnRoute()
      )
      .catch((error) => alertStore.error(error.message || String(error)))
  }
}

</script>

<template>
  <div class="settings form-2 form-compact">
    <h1 class="primary-heading">{{ getTitle() }}</h1>
    <hr class="hr" />
    <Form
      @submit="onSubmit"
      :initial-values="user"
      :validation-schema="schema"
      v-slot="{ errors, isSubmitting }"
    >
      <div class="form-group">
        <label for="lastName" class="label">Фамилия:</label>
        <Field  name="lastName" id="lastName" type="text" class="form-control input"
          :class="{ 'is-invalid': errors.lastName }" placeholder="Фамилия"
        />
      </div>
      <div class="form-group">
        <label for="firstName" class="label">Имя:</label>
        <Field name="firstName" id="firstName" type="text" class="form-control input"
          :class="{ 'is-invalid': errors.firstName }"  placeholder="Имя"
        />
      </div>
      <div class="form-group">
        <label for="patronymic" class="label">Отчество:</label>
        <Field  name="patronymic" id="patronymic" type="text" class="form-control input"
          :class="{ 'is-invalid': errors.patronymic }" placeholder="Отчество"
        />
      </div>
      <div class="form-group">
        <label for="email" class="label">Адрес электронной почты:</label>
        <Field  name="email" id="email" autocomplete="off" type="email"
          class="form-control input" :class="{ 'is-invalid': errors.email }"
          placeholder="Адрес электронной почты"
        />
      </div>
      <div class="form-group">
        <label for="password" class="label">Пароль:</label>
        <div class="password-wrapper">
          <Field name="password" id="password" ref="password" :type="showPassword ? 'text' : 'password'"
                 class="form-control input password" :class="{ 'is-invalid': errors.password }"
                 placeholder="Пароль"
          />
          <button  type="button" class="button-o" @click=" (event) => {
                event.preventDefault()
                showPassword = !showPassword
              }
            "       
          >
            <font-awesome-icon size="1x" v-if="!showPassword" icon="fa-solid fa-eye"  class="button-o-c"/>
            <font-awesome-icon size="1x" v-if="showPassword" icon="fa-solid fa-eye-slash" class="button-o-c" />
          </button>
        </div>
      </div>
      <div class="form-group">
        <label for="password2" class="label">Пароль ещё раз:</label>
        <div class="password-wrapper">
          <Field name="password2" id="password2" :type="showPassword2 ? 'text' : 'password'" 
                 class="form-control input password"  :class="{ 'is-invalid': errors.password2 }"
                 placeholder="Пароль"
          />
          <button
            type="button" class="button-o"
            @click="
              (event) => {
                event.preventDefault()
                showPassword2 = !showPassword2
              }
            "            
          >
            <font-awesome-icon size="1x" v-if="!showPassword2" icon="fa-solid fa-eye" class="button-o-c" />
            <font-awesome-icon size="1x" v-if="showPassword2" icon="fa-solid fa-eye-slash" class="button-o-c" />
          </button>
        </div>
      </div>

       <div v-if="showAndEditCredentials()" class="form-group">
        <label for="roleSelect" class="label">Роль:</label>
        <select id="roleSelect" v-model="selectedRole" class="form-control input">
          <option v-for="option in roleOptions" :key="option.value" :value="option.value" >
            {{ option.text }}
          </option>
        </select>
      </div>
      <div v-if="showCredentials()" class="form-group">
        <label for="crd" class="label">Роль:</label>
        <span id="crd" class="field-list-item">
          {{ getRoleName(user) }}
        </span>
      </div>
      <div v-if="shouldShowAccountArray">
        <FieldArrayWithButtons  name="accountIds"  label="Лицевые счета"  :options="accountOptions"
          :hasError="!!errors.accountIds"  addTooltip="Добавить лицевой счет" removeTooltip="Удалить лицевой счет"
          placeholder="Выберите лицевой счет:"
        />
      </div>

      <div v-if="authStore.isManager" class="form-group field-list-container">
        <label for="fieldList" class="label field-list-label">Лицевые счета:</label>
        <ul id="fieldList" class="field-list">
          <li v-for="account in userAccounts" :key="account.value" class="field-list-item">
            {{ account.text }}
          </li>
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
          @click="redirectToReturnRoute()"
        >
          <font-awesome-icon size="1x" icon="fa-solid fa-xmark" class="mr-1" />
          Отменить
        </button>
      </div>

      <div v-if="errors.lastName" class="alert alert-danger mt-3 mb-0">{{ errors.lastName }}</div>
      <div v-if="errors.firstName" class="alert alert-danger mt-3 mb-0">{{ errors.firstName }}</div>
      <div v-if="errors.patronymic" class="alert alert-danger mt-3 mb-0">
        {{ errors.patronymic }}
      </div>
      <div v-if="errors.email" class="alert alert-danger mt-3 mb-0">{{ errors.email }}</div>
      <div v-if="errors.accountIds" class="alert alert-danger mt-3 mb-0">{{ errors.accountIds }}</div>
      <div v-if="errors.password" class="alert alert-danger mt-3 mb-0">{{ errors.password }}</div>
      <div v-if="errors.password2" class="alert alert-danger mt-3 mb-0">{{ errors.password2 }}</div>
    </Form>
    <div v-if="alert" class="alert alert-dismissable mt-3 mb-0" :class="alert.type">
      <button @click="alertStore.clear()" class="btn btn-link close">×</button>
      {{ alert.message }}
    </div>
  </div>
  <div v-if="user?.loading" class="text-center m-5">
    <span class="spinner-border spinner-border-lg align-center"></span>
  </div>
  <div v-if="user?.error" class="text-center m-5">
    <div class="text-danger">Ошибка при загрузке информации о пользователе: {{ user.error }}</div>
  </div>
</template>
