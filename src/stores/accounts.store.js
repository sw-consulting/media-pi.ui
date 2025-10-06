// Copyright (c) 2025 sw.consulting
// This file is a part of Media Pi  frontend application

import { defineStore } from 'pinia'
import { ref } from 'vue'
import { fetchWrapper } from '@/helpers/fetch.wrapper.js'
import { apiUrl } from '@/helpers/config.js'

const baseUrl = `${apiUrl}/accounts`

export const useAccountsStore = defineStore('accounts', () => {
  const accounts = ref([])
  const account = ref(null)
  const loading = ref(false)
  const error = ref(null)

  const getAccountById = (id) => {
    if (!accounts.value || !Array.isArray(accounts.value)) {
      return null
    }
    return accounts.value.find(account => account && account.id === id)
  }

  async function add(accountParam) {
    loading.value = true
    error.value = null
    try {
      await fetchWrapper.post(baseUrl, accountParam)
      getAll()
    } catch (err) {
      error.value = err
      throw err
    } finally {
      loading.value = false
    }
  }

  async function getAll() {
    loading.value = true
    error.value = null
    try {
      const result = await fetchWrapper.get(baseUrl)
      accounts.value = result || []
    } catch (err) {
      error.value = err
      accounts.value = []
      throw err
    } finally {
      loading.value = false
    }
  }

  async function getById(id) {
    loading.value = true
    error.value = null
    try {
      const result = await fetchWrapper.get(`${baseUrl}/${id}`)
      account.value = result
    } catch (err) {
      error.value = err
      account.value = null
      throw err
    } finally {
      loading.value = false
    }
  }

  async function getByManager(userId) {
    loading.value = true
    error.value = null
    try {
      const result = await fetchWrapper.get(`${baseUrl}/by-manager/${userId}`)
      accounts.value = result
    } catch (err) {
      error.value = err
      throw err
    }
    finally {
      loading.value = false
    }
  }

  async function update(id, params) {
    loading.value = true
    error.value = null
    try {
      await fetchWrapper.put(`${baseUrl}/${id}`, params)
      getAll()
    } catch (err) {
      error.value = err
      throw err
    } finally {
      loading.value = false
    }
  }

  async function deleteAccount(id) {
    loading.value = true
    error.value = null
    try {
      await fetchWrapper.delete(`${baseUrl}/${id}`, {})
      getAll()
    } catch (err) {
      error.value = err
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    accounts,
    account,
    loading,
    error,
    getAccountById,
    add,
    getAll,
    getById,
    getByManager,
    update,
    delete: deleteAccount
  }
})

