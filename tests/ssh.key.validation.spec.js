/* @vitest-environment jsdom */

import { describe, it, expect } from 'vitest'
import { isValidOpenSshPublicKey } from '@/helpers/ssh.key.validation.js'

describe('OpenSSH public key validation', () => {
  it('accepts valid ssh-ed25519 key', () => {
    const key = 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIB1b7oPAy7vXn1f2zP1mYV1F3X0E5qYw4r4E4JXlCw9 user@host'
    expect(isValidOpenSshPublicKey(key)).toBe(true)
  })

  it('accepts valid ssh-rsa key', () => {
    const key = 'ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQC1v8Xq7T4C4r3q9mZf5U9XoW0b3d8GZKMqv9rGvLwL9g2LZr9qQ9mVY8rHkzE2Z1gF0pX7Vv3KpF3q7R1yVvM1lP+f8OQp0Q9UQG1Zk8Wqm7 user@host'
    expect(isValidOpenSshPublicKey(key)).toBe(true)
  })

  it('accepts valid ecdsa nistp256 key', () => {
    const key = 'ecdsa-sha2-nistp256 AAAAE2VjZHNhLXNoYTItbmlzdHAyNTYAAAAIbmlzdHAyNTYAAABBBNaX6l1a8q8eJtFn2Yw9Kxv8Kf3lK2F1r3lK8dFv9hK2N9r8K1F9hQ2w== comment'
    expect(isValidOpenSshPublicKey(key)).toBe(true)
  })

  it('rejects missing type', () => {
    const key = 'AAAAC3NzaC1lZDI1NTE5AAAAIB1b7oPAy7vXn1f2zP1mYV1F3X0E5qYw4r4E4JXlCw9 user@host'
    expect(isValidOpenSshPublicKey(key)).toBe(false)
  })

  it('rejects bad base64 with spaces', () => {
    const key = 'ssh-ed25519 AAAA C3NzaC1lZDI1NTE5AAAAI user@host'
    expect(isValidOpenSshPublicKey(key)).toBe(false)
  })

  it('rejects unknown type', () => {
    const key = 'ssh-unknown AAAAC3NzaC1lZDI1NTE5AAAAI user@host'
    expect(isValidOpenSshPublicKey(key)).toBe(false)
  })

  it('returns false for empty and whitespace', () => {
    expect(isValidOpenSshPublicKey('')).toBe(false)
    expect(isValidOpenSshPublicKey('   ')).toBe(false)
    expect(isValidOpenSshPublicKey(null)).toBe(false)
  })
})

