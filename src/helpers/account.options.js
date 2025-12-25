// Copyright (c) 2025 sw.consulting
// This file is a part of Media Pi  frontend application

import { isAdministrator } from '@/helpers/user.helpers.js'

const COMMON_MEDIA_OPTION = { title: 'Общие видеофайлы', value: 0 }

export function createAccountOptions(accounts, user, { includeCommon = false } = {}) {
  if (!user || !Array.isArray(accounts)) {
    return []
  }

  const options = accounts.map(account => ({
    value: account.id,
    title: account.name || `Лицевой счёт ${account.id}`
  }))

  if (includeCommon) {
    options.push(COMMON_MEDIA_OPTION)
  }

  if (isAdministrator(user)) {
    return options
  }

  const managedAccountIds = Array.isArray(user.accountIds) ? user.accountIds : []
  return options.filter(option => managedAccountIds.includes(option.value) || (includeCommon && option.value === 0))
}

export function estimateSelectWidth(options, { minWidth = 200, charWidth = 9, padding = 65 } = {}) {
  if (!Array.isArray(options) || options.length === 0) {
    return 'auto'
  }

  const longestTitle = options.reduce((longest, option) => {
    const currentTitle = option?.title || ''
    return currentTitle.length > longest.length ? currentTitle : longest
  }, '')

  const width = Math.max(longestTitle.length * charWidth + padding, minWidth)
  return `${width}px`
}
