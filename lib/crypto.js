/**
 * Cryptography utilities for Cyberdyne Profiles
 * Standalone encryption with wallet-based key derivation
 */

import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';
import * as ed25519 from '@noble/ed25519';

// Key cache to avoid repeated derivations
const keyCache = new Map();

/**
 * Derive encryption key from wallet signature
 */
export async function deriveKey(walletSecretKeyBase58, derivationMsg = 'IPFS_ENCRYPTION_KEY_V1', cacheTtlMs = 600000) {
  const cacheKey = `${walletSecretKeyBase58.slice(0, 16)}:${derivationMsg}`;
  
  // Check cache
  const cached = keyCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < cacheTtlMs) {
    return cached.key;
  }
  
  // Decode base58 wallet secret key
  const secretKey = base58Decode(walletSecretKeyBase58);
  
  // Sign derivation message
  const message = new TextEncoder().encode(derivationMsg);
  const signature = await ed25519.sign(message, secretKey.slice(0, 32));
  
  // Use first 32 bytes of signature as AES key
  const key = Buffer.from(signature.slice(0, 32));
  
  // Cache the key
  keyCache.set(cacheKey, {
    key,
    timestamp: Date.now()
  });
  
  return key;
}

/**
 * Encrypt data with AES-256-GCM
 */
export function encrypt(plaintext, key) {
  const iv = randomBytes(12); // 96-bit IV for GCM
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  
  let encrypted = cipher.update(plaintext, 'utf8');
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  
  const authTag = cipher.getAuthTag();
  
  return {
    iv: iv.toString('base64'),
    data: encrypted.toString('base64'),
    authTag: authTag.toString('base64')
  };
}

/**
 * Decrypt data with AES-256-GCM
 */
export function decrypt(encrypted, key) {
  const iv = Buffer.from(encrypted.iv, 'base64');
  const authTag = Buffer.from(encrypted.authTag, 'base64');
  const data = Buffer.from(encrypted.data, 'base64');
  
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  
  let plaintext = decipher.update(data);
  plaintext = Buffer.concat([plaintext, decipher.final()]);
  
  return plaintext.toString('utf8');
}

/**
 * Create encrypted payload
 */
export async function createEncryptedPayload(plaintext, walletPubkey, walletSecretKeyBase58, derivationMsg, cacheTtlMs) {
  const key = await deriveKey(walletSecretKeyBase58, derivationMsg, cacheTtlMs);
  const encryptedData = encrypt(plaintext, key);
  
  return {
    version: 1,
    algorithm: 'AES-256-GCM',
    wallet: walletPubkey,
    derivationMsg: derivationMsg,
    data: encryptedData
  };
}

/**
 * Decrypt payload
 */
export async function decryptPayload(payload, walletSecretKeyBase58, cacheTtlMs) {
  if (payload.version !== 1) {
    throw new Error(`Unsupported payload version: ${payload.version}`);
  }
  
  if (payload.algorithm !== 'AES-256-GCM') {
    throw new Error(`Unsupported algorithm: ${payload.algorithm}`);
  }
  
  const key = await deriveKey(walletSecretKeyBase58, payload.derivationMsg, cacheTtlMs);
  return decrypt(payload.data, key);
}

/**
 * Compute SHA256 hash
 */
export function sha256(data) {
  return createHash('sha256').update(data, 'utf8').digest('hex');
}

/**
 * Simple base58 decode (for wallet keys)
 */
function base58Decode(str) {
  const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  const BASE = ALPHABET.length;
  
  let num = 0n;
  for (let i = 0; i < str.length; i++) {
    const digit = ALPHABET.indexOf(str[i]);
    if (digit < 0) throw new Error('Invalid base58 character');
    num = num * BigInt(BASE) + BigInt(digit);
  }
  
  // Convert to bytes
  const bytes = [];
  while (num > 0n) {
    bytes.unshift(Number(num % 256n));
    num = num / 256n;
  }
  
  // Add leading zeros
  for (let i = 0; i < str.length && str[i] === '1'; i++) {
    bytes.unshift(0);
  }
  
  return new Uint8Array(bytes);
}

/**
 * CryptoBox class wrapper for convenience
 */
export class CryptoBox {
  constructor(walletPubkey, walletSecretKeyBase58, derivationMsg = 'IPFS_ENCRYPTION_KEY_V1', cacheTtlMs = 600000) {
    this.walletPubkey = walletPubkey;
    this.walletSecretKeyBase58 = walletSecretKeyBase58;
    this.derivationMsg = derivationMsg;
    this.cacheTtlMs = cacheTtlMs;
  }
  
  async encrypt(plaintext) {
    const payload = await createEncryptedPayload(
      plaintext,
      this.walletPubkey,
      this.walletSecretKeyBase58,
      this.derivationMsg,
      this.cacheTtlMs
    );
    return payload;
  }
  
  async decrypt(payload) {
    return await decryptPayload(payload, this.walletSecretKeyBase58, this.cacheTtlMs);
  }
}
