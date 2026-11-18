/// <reference types="node" />
/**
 * Typing on the TV, the touchpad messages, phone volume buttons, the free
 * trial and translations.
 */
import crypto from 'crypto';
import {
  auraDecrypt,
  charKey,
  mouseClickMessages,
  mouseMoveMessage,
  mouseRollMessage,
} from '../src/services/auraProtocol';
import { textEdits } from '../src/services/textEdits';
import { volumeSteps } from '../src/hooks/useVolumeButtons';
import {
  TRIAL_MS,
  TRIAL_SKU,
  UNLOCK_SKU,
  evaluate,
  mergeOwned,
  timeLeft,
  toOwned,
} from '../src/services/PurchaseService';
import en from '../src/i18n/en';
import el from '../src/i18n/el';
import { setLanguage, t } from '../src/i18n';

jest.mock('react-native-volume-manager', () => ({ VolumeManager: {} }));
jest.mock('@react-navigation/native', () => ({ useIsFocused: () => true }));
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('react-native-iap', () => ({ ErrorCode: { E_USER_CANCELLED: 'E_USER_CANCELLED' } }));

const PASSWORD = '4242';
const SHIFT = 33554432;
const decode = (m: Uint8Array) => JSON.parse(auraDecrypt(PASSWORD, m));

describe('typing on the TV', () => {
  it('sends only what changed', () => {
    expect(textEdits('', 'abc')).toEqual({ deletes: 0, insert: 'abc' });
    expect(textEdits('abc', 'abcd')).toEqual({ deletes: 0, insert: 'd' });
    expect(textEdits('abcd', 'abc')).toEqual({ deletes: 1, insert: '' });
    // Autocorrect-style replacement of the last word.
    expect(textEdits('teh cat', 'the cat')).toEqual({ deletes: 6, insert: 'he cat' });
    // A pasted chunk in the middle.
    expect(textEdits('ac', 'abc')).toEqual({ deletes: 1, insert: 'bc' });
    // Emoji count as one character, not two UTF-16 halves.
    expect(textEdits('hi😀', 'hi')).toEqual({ deletes: 1, insert: '' });
  });

  it('encodes characters like the AuraHD app', () => {
    expect(charKey('a')).toEqual({ keycode: 65, unicode: 97, metaState: 0 });
    expect(charKey('A')).toEqual({ keycode: 65, unicode: 65, metaState: SHIFT });
    expect(charKey('5')).toEqual({ keycode: 53, unicode: 53, metaState: 0 });
    expect(charKey('@')).toEqual({ keycode: 64, unicode: 64, metaState: SHIFT });
    expect(charKey('.')).toEqual({ keycode: 46, unicode: 46, metaState: 0 });
    expect(charKey(' ')).toEqual({ keycode: 32, unicode: 32, metaState: 0 });
    expect(charKey('\n')).toEqual({ keycode: 16777220, unicode: 13, metaState: 0 });
    expect(charKey('α')).toEqual({ keycode: 0, unicode: 945, metaState: 0 });
  });
});

describe('touchpad messages', () => {
  it('builds mouse move, click and scroll', () => {
    expect(decode(mouseMoveMessage(PASSWORD, 10.4, 20.6))).toEqual({
      msgType: 'mouseMove',
      x: 10,
      y: 21,
    });
    expect(mouseClickMessages(PASSWORD).map(decode)).toEqual([
      { msgType: 'mouseClick', action: 'press', button: 'left' },
      { msgType: 'mouseClick', action: 'release', button: 'left' },
    ]);
    expect(decode(mouseRollMessage(PASSWORD, -50))).toEqual({
      msgType: 'mouseRoll',
      value: -50,
      orientation: 'vertical',
    });
  });

  it('decrypts with standard AES-256-CBC', () => {
    const key = Buffer.alloc(32);
    Buffer.from(PASSWORD).copy(key);
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, Buffer.from('erghnlhbnmbnkghy'));
    const bytes = Buffer.from(mouseRollMessage(PASSWORD, 50));
    const text = Buffer.concat([decipher.update(bytes), decipher.final()]).toString('utf8');
    expect(JSON.parse(text).value).toBe(50);
  });
});

describe('phone volume buttons', () => {
  it('turns volume changes into TV steps', () => {
    expect(volumeSteps(0.5)).toBe(0);
    expect(volumeSteps(0.5 + 1 / 16)).toBe(1);
    expect(volumeSteps(0.5 - 1 / 16)).toBe(-1);
    expect(volumeSteps(0.5 + 2 / 16)).toBe(2);
    expect(volumeSteps(1)).toBe(4); // capped
    expect(volumeSteps(0.505)).toBe(0); // our own reset settling
  });
});

describe('free trial and unlock', () => {
  const start = Date.UTC(2026, 10, 18, 9, 0);

  it('offers the trial until it is used', () => {
    expect(evaluate([], start)).toEqual({ status: 'trialAvailable' });
  });

  it('runs the trial for 24 hours from the trial purchase', () => {
    const owned = [{ productId: TRIAL_SKU, date: start }];
    expect(evaluate(owned, start + 1000)).toEqual({ status: 'trial', endsAt: start + TRIAL_MS });
    expect(evaluate(owned, start + TRIAL_MS - 1).status).toBe('trial');
    expect(evaluate(owned, start + TRIAL_MS).status).toBe('expired');
  });

  it('unlock wins over everything', () => {
    const owned = [
      { productId: TRIAL_SKU, date: start },
      { productId: UNLOCK_SKU, date: start + 5 },
    ];
    expect(evaluate(owned, start + 10 * TRIAL_MS)).toEqual({ status: 'unlocked' });
  });

  it('keeps the earliest date when merging', () => {
    const merged = mergeOwned(
      [{ productId: TRIAL_SKU, date: 200 }],
      [
        { productId: TRIAL_SKU, date: 100 },
        { productId: UNLOCK_SKU, date: 300 },
      ],
    );
    expect(merged).toEqual([
      { productId: TRIAL_SKU, date: 100 },
      { productId: UNLOCK_SKU, date: 300 },
    ]);
  });

  it('uses the original purchase date (so reinstalling does not restart the trial)', () => {
    const purchase = {
      productId: TRIAL_SKU,
      transactionDate: start + 5 * TRIAL_MS,
      originalTransactionDateIOS: start,
    } as unknown as Parameters<typeof toOwned>[0];
    expect(toOwned(purchase)).toEqual({ productId: TRIAL_SKU, date: start });
  });

  it('says how long is left', () => {
    expect(timeLeft(start + 5 * 3600000 + 1, start)).toEqual({ hours: 5, minutes: 1 });
    expect(timeLeft(start + 42 * 60000, start)).toEqual({ hours: 0, minutes: 42 });
  });
});

describe('translations', () => {
  it('has every English text in Greek, with the same placeholders', () => {
    const placeholders = (text: string) => (text.match(/\{\w+\}/g) ?? []).sort();
    for (const key of Object.keys(en) as (keyof typeof en)[]) {
      expect(el[key]).toBeTruthy();
      expect([key, placeholders(el[key])]).toEqual([key, placeholders(en[key])]);
    }
  });

  it('fills placeholders', () => {
    setLanguage('en');
    expect(t('home.removeTitle', { name: 'Living room' })).toBe('Remove Living room?');
    setLanguage('el');
    expect(t('home.removeTitle', { name: 'Σαλόνι' })).toBe('Αφαίρεση του Σαλόνι;');
    setLanguage('en');
  });
});
