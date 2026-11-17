/**
 * MAG remote-control wire protocol (the one used by Infomir's official
 * "MAGic Remote" app on Linux-based MAG set-top boxes).
 *
 * Reference: https://github.com/rgerganov/magic-remote (MIT), an open-source
 * re-implementation of the official app.
 *
 * Summary:
 *  - Raw TCP connection to the box on port 40611.
 *  - Every message = 6-byte header + 32-char ASCII command + body.
 *    Header: 00 00 00 01 <len lo> <len hi>, where len is the total message length.
 *  - The body is a small JSON string. Once paired, bodies are encrypted with
 *    AES-128 in CFB mode (128-bit segments). The key is the first 16 bytes of
 *    SHA1(pairingCode + fixed salt); the IV is fixed.
 *  - Pairing: send "pairing-req" (unencrypted) -> the TV shows a 6-digit code ->
 *    send "pairing-complete" encrypted with that code.
 *
 * This module is pure (no React Native imports) so it can be unit tested.
 */

import CryptoJS from 'crypto-js';

export const MAG_REMOTE_PORT = 40611;

const HEADER = [0x00, 0x00, 0x00, 0x01];
const HEADER_LENGTH = 6;
const COMMAND_LENGTH = 32;
/** The reference implementation stores the length in a single byte. */
const MAX_MESSAGE_LENGTH = 255;

export const MAGProtocolCommand = {
  PAIRING_REQUEST: 'pairing-reqpairing-reqpairing-re',
  PAIRING_COMPLETE: 'pairing-complete-reqpairing-comp',
  CONNECT_REQUEST: 'connect-reqconnect-reqconnect-re',
  PING: 'ping-reqping-reqping-reqping-req',
  RC_CODE: 'rc-code-reqrc-code-reqrc-code-re',
  KEYBOARD_KEY: 'msg-rc-kb-key-reqmsg-rc-kb-keyms',
} as const;

const KEY_SALT = [8, 56, 154, 132, 29, 181, 211, 74];
const IV = [18, 111, 241, 33, 102, 71, 144, 109, 192, 233, 6, 153, 180, 99, 222, 101];

// ---------------------------------------------------------------------------
// Byte helpers
// ---------------------------------------------------------------------------

export function utf8Encode(text: string): Uint8Array {
  const out: number[] = [];
  for (const char of text) {
    const cp = char.codePointAt(0)!;
    if (cp < 0x80) {
      out.push(cp);
    } else if (cp < 0x800) {
      out.push(0xc0 | (cp >> 6), 0x80 | (cp & 0x3f));
    } else if (cp < 0x10000) {
      out.push(0xe0 | (cp >> 12), 0x80 | ((cp >> 6) & 0x3f), 0x80 | (cp & 0x3f));
    } else {
      out.push(
        0xf0 | (cp >> 18),
        0x80 | ((cp >> 12) & 0x3f),
        0x80 | ((cp >> 6) & 0x3f),
        0x80 | (cp & 0x3f),
      );
    }
  }
  return Uint8Array.from(out);
}

/** Strict UTF-8 decoder: returns null for invalid input instead of guessing. */
export function utf8DecodeStrict(bytes: Uint8Array): string | null {
  let result = '';
  let i = 0;
  while (i < bytes.length) {
    const b0 = bytes[i];
    let cp: number;
    let extra: number;
    if (b0 < 0x80) {
      cp = b0;
      extra = 0;
    } else if (b0 >= 0xc2 && b0 <= 0xdf) {
      cp = b0 & 0x1f;
      extra = 1;
    } else if (b0 >= 0xe0 && b0 <= 0xef) {
      cp = b0 & 0x0f;
      extra = 2;
    } else if (b0 >= 0xf0 && b0 <= 0xf4) {
      cp = b0 & 0x07;
      extra = 3;
    } else {
      return null;
    }
    for (let k = 1; k <= extra; k++) {
      const b = bytes[i + k];
      if (b === undefined || (b & 0xc0) !== 0x80) {
        return null;
      }
      cp = (cp << 6) | (b & 0x3f);
    }
    // Reject overlong encodings, surrogates and out-of-range code points.
    if (
      (extra === 2 && cp < 0x800) ||
      (extra === 3 && (cp < 0x10000 || cp > 0x10ffff)) ||
      (cp >= 0xd800 && cp <= 0xdfff)
    ) {
      return null;
    }
    result += String.fromCodePoint(cp);
    i += extra + 1;
  }
  return result;
}

export function bytesToWordArray(bytes: Uint8Array): CryptoJS.lib.WordArray {
  const words: number[] = [];
  for (let i = 0; i < bytes.length; i++) {
    words[i >>> 2] |= bytes[i] << (24 - (i % 4) * 8);
  }
  return CryptoJS.lib.WordArray.create(words, bytes.length);
}

export function wordArrayToBytes(wordArray: CryptoJS.lib.WordArray): Uint8Array {
  const { words, sigBytes } = wordArray;
  const out = new Uint8Array(sigBytes);
  for (let i = 0; i < sigBytes; i++) {
    out[i] = (words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
  }
  return out;
}

function concatBytes(...parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, p) => sum + p.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const p of parts) {
    out.set(p, offset);
    offset += p.length;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Crypto
// ---------------------------------------------------------------------------

/** AES key = first 16 bytes of SHA1(utf8(pairingCode) + salt). */
export function deriveKey(pairingCode: string): Uint8Array {
  const material = concatBytes(utf8Encode(pairingCode), Uint8Array.from(KEY_SALT));
  const digest = wordArrayToBytes(CryptoJS.SHA1(bytesToWordArray(material)));
  return digest.slice(0, 16);
}

function aesEncryptBlock(key: CryptoJS.lib.WordArray, block: Uint8Array): Uint8Array {
  const encrypted = CryptoJS.AES.encrypt(bytesToWordArray(block), key, {
    mode: CryptoJS.mode.ECB,
    padding: CryptoJS.pad.NoPadding,
  });
  return wordArrayToBytes(encrypted.ciphertext);
}

/** AES-128-CFB with 128-bit segments; works for any data length. */
function aesCfb(pairingCode: string, data: Uint8Array, decrypt: boolean): Uint8Array {
  const key = bytesToWordArray(deriveKey(pairingCode));
  const out = new Uint8Array(data.length);
  let feedback = Uint8Array.from(IV);
  for (let offset = 0; offset < data.length; offset += 16) {
    const keystream = aesEncryptBlock(key, feedback);
    const n = Math.min(16, data.length - offset);
    for (let i = 0; i < n; i++) {
      out[offset + i] = data[offset + i] ^ keystream[i];
    }
    if (n === 16) {
      // Ciphertext of this block feeds the next one.
      feedback = (decrypt ? data : out).slice(offset, offset + 16);
    }
  }
  return out;
}

export function encrypt(pairingCode: string, plaintext: Uint8Array): Uint8Array {
  return aesCfb(pairingCode, plaintext, false);
}

export function decrypt(pairingCode: string, ciphertext: Uint8Array): Uint8Array {
  return aesCfb(pairingCode, ciphertext, true);
}

// ---------------------------------------------------------------------------
// Message framing
// ---------------------------------------------------------------------------

/**
 * Build a protocol message. Pass a pairing code to encrypt the body
 * (required for everything except the initial pairing/connect requests).
 */
export function buildMessage(command: string, body: string, pairingCode?: string): Uint8Array {
  if (command.length !== COMMAND_LENGTH) {
    throw new Error(`MAG command must be ${COMMAND_LENGTH} characters: ${command}`);
  }
  let bodyBytes = utf8Encode(body);
  if (pairingCode) {
    bodyBytes = encrypt(pairingCode, bodyBytes);
  }
  const message = concatBytes(Uint8Array.from([...HEADER, 0, 0]), utf8Encode(command), bodyBytes);
  if (message.length > MAX_MESSAGE_LENGTH) {
    throw new Error(`MAG message too long (${message.length} bytes)`);
  }
  message[4] = message.length & 0xff;
  message[5] = (message.length >> 8) & 0xff;
  return message;
}

export interface MAGIdentity {
  devId: string;
  devDescr: string;
}

const json = (value: unknown) => JSON.stringify(value);

export function pairingRequest(id: MAGIdentity): Uint8Array {
  return buildMessage(
    MAGProtocolCommand.PAIRING_REQUEST,
    json({ dev_id: id.devId, dev_descr: id.devDescr }),
  );
}

export function pairingComplete(id: MAGIdentity, pairingCode: string): Uint8Array {
  return buildMessage(
    MAGProtocolCommand.PAIRING_COMPLETE,
    json({ dev_id: id.devId, dev_descr: id.devDescr }),
    pairingCode,
  );
}

export function connectRequest(id: MAGIdentity): Uint8Array {
  return buildMessage(
    MAGProtocolCommand.CONNECT_REQUEST,
    json({ dev_id: id.devId, dev_descr: id.devDescr }),
  );
}

export function ping(id: MAGIdentity, pairingCode: string): Uint8Array {
  return buildMessage(MAGProtocolCommand.PING, json({ dev_id: id.devId }), pairingCode);
}

export function rcCode(id: MAGIdentity, pairingCode: string, code: number): Uint8Array {
  return buildMessage(
    MAGProtocolCommand.RC_CODE,
    json({ dev_id: id.devId, dev_descr: id.devDescr, rc_code: code }),
    pairingCode,
  );
}

export function keyboardChar(id: MAGIdentity, pairingCode: string, char: string): Uint8Array {
  const code = char.codePointAt(0)!;
  return buildMessage(
    MAGProtocolCommand.KEYBOARD_KEY,
    json({ dev_id: id.devId, dev_descr: id.devDescr, kb_key_code: code, meta: 0, ucode: code }),
    pairingCode,
  );
}

// ---------------------------------------------------------------------------
// Parsing replies
// ---------------------------------------------------------------------------

export interface MAGFrame {
  command: string;
  body: Uint8Array;
}

/**
 * Split buffered TCP data into frames. Returns the frames found and the
 * leftover bytes that belong to an incomplete frame.
 */
export function splitFrames(buffer: Uint8Array): { frames: MAGFrame[]; rest: Uint8Array } {
  const frames: MAGFrame[] = [];
  let offset = 0;
  while (buffer.length - offset >= HEADER_LENGTH + COMMAND_LENGTH) {
    const declared = buffer[offset + 4] | (buffer[offset + 5] << 8);
    let length = declared;
    if (declared < HEADER_LENGTH + COMMAND_LENGTH) {
      // Unexpected header: treat the rest of the buffer as one frame
      // (this is what the reference implementation effectively does).
      length = buffer.length - offset;
    } else if (buffer.length - offset < declared) {
      break; // wait for more data
    }
    const frame = buffer.slice(offset, offset + length);
    const commandBytes = frame.slice(HEADER_LENGTH, HEADER_LENGTH + COMMAND_LENGTH);
    frames.push({
      command: String.fromCharCode(...commandBytes),
      body: frame.slice(HEADER_LENGTH + COMMAND_LENGTH),
    });
    offset += length;
  }
  return { frames, rest: buffer.slice(offset) };
}

/**
 * Decrypt a reply body. Returns null if the pairing code is wrong
 * (the plaintext is then not valid, printable UTF-8).
 */
export function decryptReply(pairingCode: string, body: Uint8Array): string | null {
  const text = utf8DecodeStrict(decrypt(pairingCode, body));
  if (text === null) {
    return null;
  }
  // Reject control characters other than common whitespace.
  return /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(text) ? null : text;
}

export function isValidPairingCode(code: string): boolean {
  return /^\d{6}$/.test(code);
}
