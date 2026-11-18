/**
 * AuraHD remote protocol ("Remote control" with Device name + Password).
 *
 * This is the protocol of Infomir's AuraHD Remote app, which many Linux MAG
 * boxes (e.g. MAG 424) speak instead of the MAGic Remote one. Worked out from
 * the AuraHD Remote Android app and checked against a real MAG 424:
 *
 * Discovery (plain UDP, JSON):
 *   phone -> box:6000  {"protocol":"remote_stb_1.0","port":<replyPort>}
 *   box   -> phone:<replyPort>  {"msgType":"Info","name":...,"type":"MAG424",
 *                                "serialNumber":...,"port":7666,...}
 *
 * Session (UDP to the box's "port", usually 7666): every message is JSON,
 * encrypted with AES-256-CBC + PKCS#7, key = the box password (UTF-8) padded
 * with zero bytes to 32 bytes, fixed IV "erghnlhbnmbnkghy".
 *   {"msgType":"pingRequest"} -> {"msgType":"pingResponse"}  (handshake + keep-alive)
 *   {"msgType":"keyboardKey","action":"press"|"release","keycode":..,
 *    "unicode":..,"metaState":..,"characters":""}             (buttons / text)
 * A wrong password gets no usable reply.
 */
import { MAGCommand } from '../types';
import { utf8DecodeStrict, utf8Encode } from './magProtocol';
import { aesCbcDecrypt, aesCbcEncrypt } from './nativeCrypto';

export const AURA_DISCOVERY_PORT = 6000;
export const AURA_DEFAULT_COMMAND_PORT = 7666;
export const AURA_PROTOCOL_VERSION = 'remote_stb_1.0';
const IV = 'erghnlhbnmbnkghy';

// Qt modifier flags the box expects in metaState.
const ALT = 134217728;
const CTRL = 67108864;

export interface AuraKey {
  keycode: number;
  unicode: number;
  metaState: number;
}

/**
 * Remote buttons -> the Qt key events the AuraHD app sends to Linux MAG boxes
 * (its Android keycode table run through its LINUX_STB mapping). Buttons the
 * AuraHD app has no key for are left out, so the UI shows them disabled.
 */
const AURA_KEYS: Partial<Record<MAGCommand, AuraKey>> = {
  [MAGCommand.UP]: { keycode: 16777235, unicode: 38, metaState: 0 },
  [MAGCommand.DOWN]: { keycode: 16777237, unicode: 40, metaState: 0 },
  [MAGCommand.LEFT]: { keycode: 16777234, unicode: 37, metaState: 0 },
  [MAGCommand.RIGHT]: { keycode: 16777236, unicode: 39, metaState: 0 },
  [MAGCommand.OK]: { keycode: 16777220, unicode: 13, metaState: 0 },
  [MAGCommand.BACK]: { keycode: 16777219, unicode: 8, metaState: 0 },
  [MAGCommand.EXIT]: { keycode: 16777216, unicode: 27, metaState: 0 },
  [MAGCommand.MENU]: { keycode: 16777274, unicode: 122, metaState: CTRL },
  [MAGCommand.INFO]: { keycode: 89, unicode: 121, metaState: ALT },

  [MAGCommand.PLAY]: { keycode: 82, unicode: 114, metaState: ALT },
  [MAGCommand.PAUSE]: { keycode: 82, unicode: 114, metaState: ALT },
  [MAGCommand.STOP]: { keycode: 83, unicode: 115, metaState: ALT },
  [MAGCommand.REWIND]: { keycode: 66, unicode: 98, metaState: ALT },
  [MAGCommand.FORWARD]: { keycode: 70, unicode: 102, metaState: ALT },
  [MAGCommand.PREV]: { keycode: 16777238, unicode: 33, metaState: 0 },
  [MAGCommand.NEXT]: { keycode: 16777239, unicode: 40, metaState: CTRL },
  // Page Up / Page Down switch channels on MAG portals.
  [MAGCommand.CH_UP]: { keycode: 16777238, unicode: 33, metaState: 0 },
  [MAGCommand.CH_DOWN]: { keycode: 16777239, unicode: 40, metaState: CTRL },

  [MAGCommand.VOL_UP]: { keycode: 43, unicode: 43, metaState: 0 },
  [MAGCommand.VOL_DOWN]: { keycode: 45, unicode: 45, metaState: 0 },
  [MAGCommand.MUTE]: { keycode: 96, unicode: 96, metaState: ALT },

  [MAGCommand.RED]: { keycode: 16777264, unicode: 112, metaState: CTRL },
  [MAGCommand.GREEN]: { keycode: 16777265, unicode: 113, metaState: CTRL },
  [MAGCommand.YELLOW]: { keycode: 16777266, unicode: 114, metaState: CTRL },
  [MAGCommand.BLUE]: { keycode: 16777267, unicode: 115, metaState: CTRL },

  [MAGCommand.NUM_0]: { keycode: 48, unicode: 48, metaState: 0 },
  [MAGCommand.NUM_1]: { keycode: 49, unicode: 49, metaState: 0 },
  [MAGCommand.NUM_2]: { keycode: 50, unicode: 50, metaState: 0 },
  [MAGCommand.NUM_3]: { keycode: 51, unicode: 51, metaState: 0 },
  [MAGCommand.NUM_4]: { keycode: 52, unicode: 52, metaState: 0 },
  [MAGCommand.NUM_5]: { keycode: 53, unicode: 53, metaState: 0 },
  [MAGCommand.NUM_6]: { keycode: 54, unicode: 54, metaState: 0 },
  [MAGCommand.NUM_7]: { keycode: 55, unicode: 55, metaState: 0 },
  [MAGCommand.NUM_8]: { keycode: 56, unicode: 56, metaState: 0 },
  [MAGCommand.NUM_9]: { keycode: 57, unicode: 57, metaState: 0 },
};

export function getAuraKey(command: MAGCommand): AuraKey | undefined {
  return AURA_KEYS[command];
}

export function isAuraCommandSupported(command: MAGCommand): boolean {
  return AURA_KEYS[command] !== undefined;
}

// ------------------------------------------------------------------ crypto

/** AES-256 key: the password's UTF-8 bytes, zero-padded (or cut) to 32 bytes. */
export function auraKey(password: string): Uint8Array {
  const key = new Uint8Array(32);
  key.set(utf8Encode(password).slice(0, 32));
  return key;
}

export function auraEncrypt(password: string, plaintext: string): Uint8Array {
  return aesCbcEncrypt(auraKey(password), utf8Encode(IV), utf8Encode(plaintext));
}

/** Decrypts a reply; null if it doesn't decrypt to valid UTF-8 (e.g. wrong password). */
export function auraDecrypt(password: string, ciphertext: Uint8Array): string | null {
  if (ciphertext.length === 0 || ciphertext.length % 16 !== 0) {
    return null;
  }
  try {
    const decrypted = aesCbcDecrypt(auraKey(password), utf8Encode(IV), ciphertext);
    return decrypted && decrypted.length > 0 ? utf8DecodeStrict(decrypted) : null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------- messages

export function solicitMessage(replyPort: number): Uint8Array {
  return utf8Encode(JSON.stringify({ protocol: AURA_PROTOCOL_VERSION, port: replyPort }));
}

export function pingRequest(password: string): Uint8Array {
  return auraEncrypt(password, JSON.stringify({ msgType: 'pingRequest' }));
}

export function isPingResponse(password: string, reply: Uint8Array): boolean {
  const text = auraDecrypt(password, reply);
  if (!text) {
    return false;
  }
  try {
    return JSON.parse(text).msgType === 'pingResponse';
  } catch {
    return false;
  }
}

function keyEvent(
  password: string,
  action: 'press' | 'release',
  key: AuraKey,
  characters?: string,
): Uint8Array {
  // Buttons carry characters: "" like the AuraHD app; typed text leaves it out.
  return auraEncrypt(
    password,
    JSON.stringify({
      msgType: 'keyboardKey',
      action,
      keycode: key.keycode,
      unicode: key.unicode,
      metaState: key.metaState,
      ...(characters === undefined ? {} : { characters }),
    }),
  );
}

/** Press + release messages for a remote button, or [] if it has no AuraHD key. */
export function buttonMessages(password: string, command: MAGCommand): Uint8Array[] {
  const key = AURA_KEYS[command];
  return key ? [keyEvent(password, 'press', key, ''), keyEvent(password, 'release', key, '')] : [];
}

const SHIFT = 33554432;
const SHIFTED_SYMBOLS = '~!@#$%^&*()_+{}|:"<>?';
const ENTER: AuraKey = { keycode: 16777220, unicode: 13, metaState: 0 };

/**
 * The key event the AuraHD app sends for a typed character: letters use the
 * upper-case Qt key code, other printable ASCII its own code, and anything
 * else (accents, Greek, emoji) travels by unicode alone. Capitals and shifted
 * symbols carry the Shift modifier, as a hardware keyboard would.
 */
export function charKey(char: string): AuraKey {
  if (char === '\n') {
    return ENTER;
  }
  const code = char.codePointAt(0) ?? 0;
  let keycode = 0;
  if (/^[a-z]$/.test(char)) {
    keycode = code - 32;
  } else if (code >= 32 && code <= 126) {
    keycode = code;
  }
  const shifted = /^[A-Z]$/.test(char) || SHIFTED_SYMBOLS.includes(char);
  return { keycode, unicode: code, metaState: shifted ? SHIFT : 0 };
}

/** Kept for callers that only need the key code. */
export function charKeycode(char: string): number {
  return charKey(char).keycode;
}

/** Press + release messages that type one character. */
export function charMessages(password: string, char: string): Uint8Array[] {
  const key = charKey(char);
  return [keyEvent(password, 'press', key), keyEvent(password, 'release', key)];
}

// ------------------------------------------------------------------- mouse

/** Pointer move. Linux MAG boxes take absolute screen coordinates. */
export function mouseMoveMessage(password: string, x: number, y: number): Uint8Array {
  return auraEncrypt(
    password,
    JSON.stringify({ msgType: 'mouseMove', x: Math.round(x), y: Math.round(y) }),
  );
}

/** Left-button press and release (a tap). */
export function mouseClickMessages(password: string): Uint8Array[] {
  return (['press', 'release'] as const).map(action =>
    auraEncrypt(password, JSON.stringify({ msgType: 'mouseClick', action, button: 'left' })),
  );
}

/** Scroll wheel; the AuraHD app sends ±50 per step. */
export function mouseRollMessage(password: string, value: number): Uint8Array {
  return auraEncrypt(
    password,
    JSON.stringify({ msgType: 'mouseRoll', value: Math.round(value), orientation: 'vertical' }),
  );
}

// --------------------------------------------------------------- discovery

export interface AuraInfo {
  name: string;
  type: string;
  serialNumber: string;
  port: number;
  screenWidth: number;
  screenHeight: number;
}

/** Parses a box's discovery "Info" reply; null if it isn't one. */
export function parseInfo(bytes: Uint8Array): AuraInfo | null {
  const text = utf8DecodeStrict(bytes);
  if (!text) {
    return null;
  }
  try {
    const info = JSON.parse(text);
    if (
      typeof info !== 'object' ||
      info === null ||
      String(info.msgType).toLowerCase() !== 'info'
    ) {
      return null;
    }
    const port = Number(info.port);
    return {
      name: String(info.name ?? ''),
      type: String(info.type ?? 'MAG'),
      serialNumber: String(info.serialNumber ?? ''),
      port: Number.isInteger(port) && port > 0 && port < 65536 ? port : AURA_DEFAULT_COMMAND_PORT,
      screenWidth: Number(info.screenWidth) > 0 ? Number(info.screenWidth) : 1280,
      screenHeight: Number(info.screenHeight) > 0 ? Number(info.screenHeight) : 720,
    };
  } catch {
    return null;
  }
}
