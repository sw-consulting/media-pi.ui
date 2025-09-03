// Copyright (c) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// This helper validates OpenSSH public keys of common types.

// Supported types include:
// - ssh-ed25519
// - ssh-rsa
// - ecdsa-sha2-nistp256, ecdsa-sha2-nistp384, ecdsa-sha2-nistp521
// - sk-ssh-ed25519@openssh.com
// - sk-ecdsa-sha2-nistp256@openssh.com

const OPENSSH_PUBKEY_REGEX = new RegExp(
  '^(' +
    '(?:ssh-(?:rsa|ed25519))' +
    '|' +
    '(?:ecdsa-sha2-nistp(?:256|384|521))' +
    '|' +
    '(?:sk-ecdsa-sha2-nistp256@openssh\\.com)' +
    '|' +
    '(?:sk-ssh-ed25519@openssh\\.com)' +
  ')\\s+' +
  '([A-Za-z0-9+/]+={0,3})' + // base64 key material
  '(?:\\s+([^\\r\\n]+))?' + // optional comment
  '$'
)

export function isValidOpenSshPublicKey(key) {
  if (!key) return false
  const value = String(key).trim()
  if (!value) return false
  return OPENSSH_PUBKEY_REGEX.test(value)
}

export { OPENSSH_PUBKEY_REGEX }

