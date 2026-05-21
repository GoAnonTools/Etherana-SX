/**
 * AES-256-GCM encryption for sensitive config values (provider API keys, etc.)
 *
 * Encryption is enabled when the ETHERANA_SECRET_KEY environment variable is set.
 * If the env var is absent the values are stored as plain text — this preserves
 * backwards compatibility for existing installs that don't set the variable.
 *
 * Encrypted values are stored as a prefixed base64 string:
 *   enc:v1:<base64(iv + authTag + ciphertext)>
 *
 * The prefix lets us safely detect and decrypt on read without any schema change.
 */

import crypto from 'crypto';

const ALGO = 'aes-256-gcm';
const ENC_PREFIX = 'enc:v1:';
const IV_LEN = 12;   // 96-bit IV — recommended for GCM
const TAG_LEN = 16;  // 128-bit auth tag

/**
 * Derives a 32-byte key from the raw secret using SHA-256.
 * Accepts secrets of any length so users don't need to pre-format them.
 */
const deriveKey = (secret: string): Buffer =>
  crypto.createHash('sha256').update(secret).digest();

const getSecret = (): string | undefined => process.env.ETHERANA_SECRET_KEY;

export const encryptConfigValue = (plaintext: string): string => {
  const secret = getSecret();
  if (!secret || !plaintext) return plaintext;

  const key = deriveKey(secret);
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv(ALGO, key, iv) as crypto.CipherGCM;

  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);

  const tag = cipher.getAuthTag();

  // Pack: iv (12) + tag (16) + ciphertext
  const packed = Buffer.concat([iv, tag, encrypted]);
  return ENC_PREFIX + packed.toString('base64');
};

export const decryptConfigValue = (value: string): string => {
  if (!value.startsWith(ENC_PREFIX)) return value; // plaintext or empty

  const secret = getSecret();
  if (!secret) {
    console.warn(
      'Config value is encrypted but ETHERANA_SECRET_KEY is not set — cannot decrypt.',
    );
    return value; // return raw rather than crashing
  }

  try {
    const key = deriveKey(secret);
    const packed = Buffer.from(value.slice(ENC_PREFIX.length), 'base64');

    const iv = packed.subarray(0, IV_LEN);
    const tag = packed.subarray(IV_LEN, IV_LEN + TAG_LEN);
    const ciphertext = packed.subarray(IV_LEN + TAG_LEN);

    const decipher = crypto.createDecipheriv(ALGO, key, iv) as crypto.DecipherGCM;
    decipher.setAuthTag(tag);

    return decipher.update(ciphertext) + decipher.final('utf8');
  } catch {
    console.error('Failed to decrypt config value — key may have changed.');
    return value;
  }
};

export const isEncrypted = (value: string): boolean =>
  value.startsWith(ENC_PREFIX);
