import { describe, it, expect } from 'vitest'
import { ref } from 'vue'
import { buildAccountOptions, getAccountDisplayName, useAccessibleAccounts } from '@/helpers/accounts.access.js'

const makeStores = (user, accounts) => {
  const authStore = { user }
  const accountsStore = { accounts: ref(accounts) }
  return { authStore, accountsStore }
}

describe('accounts.access helper', () => {
  const sampleAccounts = [
    { id: 1, name: 'One' },
    { id: 2, name: 'Two' }
  ]

  it('builds options with common category', () => {
    const options = buildAccountOptions(sampleAccounts)
    expect(options[0]).toEqual({ title: 'Общие', value: null })
    expect(options.slice(1).map(o => o.value)).toEqual([1, 2])
  })

  it('formats account display name with fallback', () => {
    expect(getAccountDisplayName({ id: 7, name: '' })).toContain('7')
    expect(getAccountDisplayName(null)).toBe('')
  })

  it('returns only accessible accounts for manager', () => {
    const { authStore, accountsStore } = makeStores({ roles: [11], accountIds: [2] }, sampleAccounts)
    const accessibleAccounts = useAccessibleAccounts(authStore, accountsStore)
    expect(accessibleAccounts.value.map(a => a.id)).toEqual([2])
  })

  it('returns all accounts for administrator', () => {
    const { authStore, accountsStore } = makeStores({ roles: [1] }, sampleAccounts)
    const accessibleAccounts = useAccessibleAccounts(authStore, accountsStore)
    expect(accessibleAccounts.value.length).toBe(2)
  })
})

