/**
 * AES and SHA-1 for the remote protocols, done by the phone's operating
 * system (iOS CommonCrypto, through the BoxCrypto native module), so the app
 * ships no encryption code of its own. Bytes travel to native as base64.
 */
import { NativeModules } from 'react-native';

interface BoxCryptoModule {
  cbcEncrypt(key: string, iv: string, data: string): string | null;
  cbcDecrypt(key: string, iv: string, data: string): string | null;
  ecbEncryptBlock(key: string, block: string): string | null;
  sha1(data: string): string | null;
}

function native(): BoxCryptoModule {
  const module = NativeModules.BoxCrypto as BoxCryptoModule | undefined;
  if (!module) {
    throw new Error('BoxCrypto native module is missing');
  }
  return module;
}

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const LOOKUP = new Map([...ALPHABET].map((c, i) => [c, i]));

export function toBase64(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const n = (bytes[i] << 16) | ((bytes[i + 1] ?? 0) << 8) | (bytes[i + 2] ?? 0);
    out += ALPHABET[(n >> 18) & 63] + ALPHABET[(n >> 12) & 63];
    out += i + 1 < bytes.length ? ALPHABET[(n >> 6) & 63] : '=';
    out += i + 2 < bytes.length ? ALPHABET[n & 63] : '=';
  }
  return out;
}

export function fromBase64(text: string): Uint8Array {
  const clean = text.replace(/=+$/, '');
  const out = new Uint8Array(Math.floor((clean.length * 3) / 4));
  let bits = 0;
  let value = 0;
  let index = 0;
  for (const c of clean) {
    value = (value << 6) | (LOOKUP.get(c) ?? 0);
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out[index++] = (value >> bits) & 0xff;
    }
  }
  return out;
}

const result = (value: string | null): Uint8Array | null =>
  value === null || value === undefined ? null : fromBase64(value);

/** AES-CBC with PKCS#7 padding. */
export function aesCbcEncrypt(key: Uint8Array, iv: Uint8Array, data: Uint8Array): Uint8Array {
  const out = result(native().cbcEncrypt(toBase64(key), toBase64(iv), toBase64(data)));
  if (!out) {
    throw new Error('AES encryption failed');
  }
  return out;
}

/** AES-CBC with PKCS#7 padding; null if it doesn't decrypt (e.g. wrong key). */
export function aesCbcDecrypt(
  key: Uint8Array,
  iv: Uint8Array,
  data: Uint8Array,
): Uint8Array | null {
  return result(native().cbcDecrypt(toBase64(key), toBase64(iv), toBase64(data)));
}

/** Encrypts one 16-byte block with AES (no chaining, no padding). */
export function aesEncryptBlock(key: Uint8Array, block: Uint8Array): Uint8Array {
  const out = result(native().ecbEncryptBlock(toBase64(key), toBase64(block)));
  if (!out) {
    throw new Error('AES block encryption failed');
  }
  return out;
}

export function sha1(data: Uint8Array): Uint8Array {
  const out = result(native().sha1(toBase64(data)));
  if (!out) {
    throw new Error('SHA-1 failed');
  }
  return out;
}
