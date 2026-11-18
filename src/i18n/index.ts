/**
 * Translations. The app follows the phone's language (English or Greek,
 * English otherwise). Use t('key') for text and t('key', { name }) to fill
 * {name} placeholders.
 */
import { NativeModules, Platform } from 'react-native';
import en from './en';
import el from './el';

export type Language = 'en' | 'el';
export type TranslationKey = keyof typeof en;

const dictionaries: Record<Language, Record<TranslationKey, string>> = { en, el };

function deviceLanguage(): Language {
  const settings = NativeModules.SettingsManager?.settings;
  const locale: string =
    Platform.OS === 'ios'
      ? (settings?.AppleLanguages?.[0] ?? settings?.AppleLocale ?? 'en')
      : (NativeModules.I18nManager?.localeIdentifier ?? 'en');
  return locale.toLowerCase().startsWith('el') ? 'el' : 'en';
}

let current: Language = deviceLanguage();

export function language(): Language {
  return current;
}

/** For tests and previews. */
export function setLanguage(next: Language): void {
  current = next;
}

export function t(key: TranslationKey, params?: Record<string, string | number>): string {
  let text = dictionaries[current][key] ?? en[key];
  if (params) {
    for (const [name, value] of Object.entries(params)) {
      text = text.split(`{${name}}`).join(String(value));
    }
  }
  return text;
}
