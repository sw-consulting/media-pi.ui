// Copyright (c) 2025 sw.consulting
// This file is a part of Media Pi frontend application

import { isAdministrator } from '@/helpers/user.helpers.js'

export const COMMON_ALL_SCOPE = 'common:all'
export const CATEGORY_NONE_SCOPE = 'category:none'

export function createAccountScope(accountId) {
  return `account:${accountId}`
}

export function createCategoryScope(categoryId) {
  return `category:${categoryId}`
}

export function parseVideoScope(value) {
  if (typeof value === 'number') {
    return value === 0
      ? { type: 'common', accountId: 0, categoryId: undefined }
      : { type: 'account', accountId: value, categoryId: undefined }
  }

  if (value === COMMON_ALL_SCOPE) {
    return { type: 'common', accountId: 0, categoryId: undefined }
  }

  if (value === CATEGORY_NONE_SCOPE) {
    return { type: 'category', accountId: 0, categoryId: 0 }
  }

  if (typeof value === 'string' && value.startsWith('account:')) {
    return { type: 'account', accountId: Number(value.slice('account:'.length)), categoryId: undefined }
  }

  if (typeof value === 'string' && value.startsWith('category:')) {
    return { type: 'category', accountId: 0, categoryId: Number(value.slice('category:'.length)) }
  }

  return { type: 'none', accountId: null, categoryId: undefined }
}

export function createVideoScopeOptions(accounts, categories, user) {
  if (!user) return []

  const options = []
  const managedAccountIds = Array.isArray(user.accountIds) ? user.accountIds : []
  const canSeeAllAccounts = isAdministrator(user)

  for (const account of accounts || []) {
    if (!canSeeAllAccounts && !managedAccountIds.includes(account.id)) continue
    options.push({
      value: createAccountScope(account.id),
      title: account.name || `Лицевой счёт ${account.id}`
    })
  }

  options.push({ value: COMMON_ALL_SCOPE, title: 'Общие видеофайлы' })
  options.push({ value: CATEGORY_NONE_SCOPE, title: 'Без категории' })

  for (const category of categories || []) {
    options.push({
      value: createCategoryScope(category.id),
      title: category.title || `Категория ${category.id}`
    })
  }

  return options
}

export function createCategoryOptions(categories, { includeUncategorized = true } = {}) {
  const options = []
  if (includeUncategorized) {
    options.push({ value: 0, title: 'Без категории' })
  }

  for (const category of categories || []) {
    options.push({
      value: category.id,
      title: category.title || `Категория ${category.id}`
    })
  }

  return options
}

export function getCategoryTitle(categoryId, categories) {
  const id = Number(categoryId || 0)
  if (id === 0) return 'Без категории'

  const category = (categories || []).find(item => item.id === id)
  return category?.title || `Категория #${id}`
}
