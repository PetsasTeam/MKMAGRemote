/**
 * BoxPilot is a free download with a one-day free trial and a one-time unlock,
 * both App Store in-app purchases (non-consumable):
 *
 *   com.iptvmkremote.trial   "1-day Trial", price Free. Starts the trial.
 *   com.iptvmkremote.unlock  "Unlock BoxPilot", the paid one-time unlock.
 *
 * The trial runs for 24 hours from the trial purchase. Purchases are cached
 * on the phone so the app works offline, and refreshed from the App Store.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { EmitterSubscription, Platform } from 'react-native';
import * as IAP from 'react-native-iap';

export const TRIAL_SKU = 'com.iptvmkremote.trial';
export const UNLOCK_SKU = 'com.iptvmkremote.unlock';
export const TRIAL_MS = 24 * 60 * 60 * 1000;
const CACHE_KEY = 'purchases_v1';

/** What we keep about a purchase: which product, and when it was first bought. */
export interface OwnedProduct {
  productId: string;
  date: number;
}

export type Entitlement =
  | { status: 'loading' }
  | { status: 'unlocked' }
  | { status: 'trial'; endsAt: number }
  | { status: 'trialAvailable' }
  | { status: 'expired' };

/** Work out what the user may do from what they own, at time `now`. */
export function evaluate(owned: OwnedProduct[], now: number): Entitlement {
  if (owned.some(p => p.productId === UNLOCK_SKU)) {
    return { status: 'unlocked' };
  }
  const trials = owned.filter(p => p.productId === TRIAL_SKU);
  if (trials.length === 0) {
    return { status: 'trialAvailable' };
  }
  const endsAt = Math.min(...trials.map(p => p.date)) + TRIAL_MS;
  return now < endsAt ? { status: 'trial', endsAt } : { status: 'expired' };
}

/** Merge two lists, keeping the earliest date for each product. */
export function mergeOwned(a: OwnedProduct[], b: OwnedProduct[]): OwnedProduct[] {
  const byId = new Map<string, OwnedProduct>();
  for (const p of [...a, ...b]) {
    const have = byId.get(p.productId);
    if (!have || p.date < have.date) {
      byId.set(p.productId, p);
    }
  }
  return [...byId.values()];
}

export function toOwned(purchase: IAP.Purchase): OwnedProduct {
  const date = purchase.originalTransactionDateIOS ?? purchase.transactionDate ?? Date.now();
  return { productId: purchase.productId, date: Number(date) };
}

/** "5 h" or "42 min" left, for the trial badge. */
export function timeLeft(endsAt: number, now: number): { hours: number; minutes: number } {
  const ms = Math.max(0, endsAt - now);
  return { hours: Math.floor(ms / 3600000), minutes: Math.ceil((ms % 3600000) / 60000) };
}

export function isUserCancel(error: unknown): boolean {
  return (error as { code?: string })?.code === IAP.ErrorCode.E_USER_CANCELLED;
}

class PurchaseService {
  private connected: Promise<boolean> | null = null;
  private listeners: EmitterSubscription[] = [];

  async loadCache(): Promise<OwnedProduct[]> {
    try {
      const json = await AsyncStorage.getItem(CACHE_KEY);
      return json ? (JSON.parse(json) as OwnedProduct[]) : [];
    } catch {
      return [];
    }
  }

  async saveCache(owned: OwnedProduct[]): Promise<void> {
    try {
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(owned));
    } catch {
      // Not fatal: the App Store is asked again next launch.
    }
  }

  private connect(): Promise<boolean> {
    if (!this.connected) {
      // StoreKit 2 where available: it reads what the Apple ID owns without
      // asking the user to sign in (StoreKit 1's restore always asks).
      IAP.setup({ storekitMode: 'STOREKIT_HYBRID_MODE' });
      this.connected = IAP.initConnection().catch(() => {
        this.connected = null;
        return false;
      });
    }
    return this.connected;
  }

  /**
   * Listen for finished purchases (including ones that complete later, such
   * as Ask to Buy). Each is finished with the store and reported once.
   */
  listen(onOwned: (owned: OwnedProduct) => void, onError: (error: IAP.PurchaseError) => void) {
    this.stopListening();
    this.connect();
    this.listeners = [
      IAP.purchaseUpdatedListener(async purchase => {
        onOwned(toOwned(purchase));
        try {
          await IAP.finishTransaction({ purchase, isConsumable: false });
        } catch {
          // StoreKit will deliver it again next launch; recording it twice is harmless.
        }
      }),
      IAP.purchaseErrorListener(onError),
    ];
  }

  stopListening(): void {
    this.listeners.forEach(l => l.remove());
    this.listeners = [];
  }

  /** Localized price of the unlock, like "€4.99", or null if the store didn't answer. */
  async unlockPrice(): Promise<string | null> {
    if (!(await this.connect())) {
      return null;
    }
    try {
      const products = await IAP.getProducts({ skus: [UNLOCK_SKU, TRIAL_SKU] });
      return products.find(p => p.productId === UNLOCK_SKU)?.localizedPrice ?? null;
    } catch {
      return null;
    }
  }

  /** Everything this Apple ID owns, from the App Store. Throws if it can't be reached. */
  async fetchOwned(): Promise<OwnedProduct[]> {
    if (!(await this.connect())) {
      throw new Error('store unavailable');
    }
    const purchases = await IAP.getAvailablePurchases();
    return purchases
      .filter(p => p.productId === TRIAL_SKU || p.productId === UNLOCK_SKU)
      .map(toOwned);
  }

  /** Start the App Store sheet; the result arrives through listen(). */
  async buy(sku: string): Promise<void> {
    if (!(await this.connect())) {
      throw new Error('store unavailable');
    }
    if (Platform.OS === 'ios') {
      await IAP.requestPurchase({ sku, andDangerouslyFinishTransactionAutomaticallyIOS: false });
    } else {
      await IAP.requestPurchase({ skus: [sku] });
    }
  }
}

export default new PurchaseService();
