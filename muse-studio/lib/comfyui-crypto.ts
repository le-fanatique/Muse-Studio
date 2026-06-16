import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { db } from '@/db';

const ALG = 'aes-256-gcm';
const IV_LEN = 12;   // bytes; standard nonce length for AES-GCM
const TAG_LEN = 16;  // bytes; GCM authentication tag
const DB_KEY = 'comfyui_api_key_enc';

function getKey(): Buffer {
  const hex = process.env.COMFYUI_ENCRYPTION_KEY;
  if (!hex) throw new Error('COMFYUI_ENCRYPTION_KEY is not set in environment');
  const buf = Buffer.from(hex, 'hex');
  if (buf.length !== 32) throw new Error('COMFYUI_ENCRYPTION_KEY must be 64 hex characters (32 bytes)');
  return buf;
}

/** Encrypt an API key with AES-256-GCM. Returns base64(iv ‖ ciphertext ‖ authTag). */
export function encryptApiKey(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALG, key, iv);
  const ct = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, ct, tag]).toString('base64');
}

/** Decrypt an encoded API key. Throws if COMFYUI_ENCRYPTION_KEY is missing or data is corrupt. */
export function decryptApiKey(encoded: string): string {
  const key = getKey();
  const raw = Buffer.from(encoded, 'base64');
  if (raw.length < IV_LEN + TAG_LEN + 1) throw new Error('Encrypted API key is malformed');
  const iv = raw.subarray(0, IV_LEN);
  const tag = raw.subarray(raw.length - TAG_LEN);
  const ct = raw.subarray(IV_LEN, raw.length - TAG_LEN);
  const decipher = createDecipheriv(ALG, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString('utf8');
}

interface _SettingRow { key: string; value: string; updated_at: string }

/**
 * Read and decrypt the stored ComfyUI API key.
 * Returns null if no key is stored in DB.
 * Throws if a key exists but cannot be decrypted (missing or wrong COMFYUI_ENCRYPTION_KEY).
 */
export async function getDecryptedComfyUIApiKey(): Promise<string | null> {
  const row = db
    .prepare<[string], _SettingRow>('SELECT value FROM settings WHERE key = ?')
    .get(DB_KEY);
  if (!row) return null;
  return decryptApiKey(row.value);
}
