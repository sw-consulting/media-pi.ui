// Copyright (c) 2025 sw.consulting
// This file is a part of Media Pi  frontend application

import { computed } from 'vue'
import { isAdministrator } from '@/helpers/user.helpers.js'

export function useAccessibleAccounts(authStore, accountsStore) {
  return computed(() => {
    const currentUser = authStore?.user
    const allAccounts = accountsStore?.accounts?.value || []

    if (!currentUser) {
      return []
    }

    if (isAdministrator(currentUser)) {
      return allAccounts
    }

    const managedAccountIds = Array.isArray(currentUser.accountIds)
      ? currentUser.accountIds
      : []

    if (managedAccountIds.length > 0) {
      return allAccounts.filter(account => managedAccountIds.includes(account.id))
    }

    return []
  })
}

export function getAccountDisplayName(account) {
  if (!account) {
    return ''
  }
  if (account.name && account.name.trim().length > 0) {
    return account.name
  }
  if (account.id) {
    return `Лицевой счёт №${account.id}`
  }
  return 'Лицевой счёт'
}

export function buildAccountOptions(accessibleAccounts, includeCommon = true) {
  const options = []

  if (includeCommon) {
    options.push({ title: 'Общие', value: null })
  }

  if (Array.isArray(accessibleAccounts)) {
    accessibleAccounts.forEach(account => {
      options.push({
        title: getAccountDisplayName(account),
        value: account.id
      })
    })
  }

  return options
}

