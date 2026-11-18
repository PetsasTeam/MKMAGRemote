/**
 * Whether BoxPilot is unlocked, in its free trial, or locked, plus the
 * actions behind the paywall (start trial, unlock, restore).
 */
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import PurchaseService, {
  Entitlement,
  OwnedProduct,
  TRIAL_SKU,
  UNLOCK_SKU,
  evaluate,
  isUserCancel,
  mergeOwned,
} from '../services/PurchaseService';
import { t } from '../i18n';
import { OWNER_BUILD } from '../buildFlags';

interface EntitlementContextType {
  entitlement: Entitlement;
  /** Localized unlock price, once the App Store has answered. */
  price: string | null;
  /** A purchase or restore is in progress. */
  busy: boolean;
  /** Last problem to show on the paywall, or ''. */
  error: string;
  startTrial: () => Promise<void>;
  unlock: () => Promise<void>;
  /** Ask the App Store again. Resolves to whether anything is owned. */
  restore: () => Promise<boolean>;
  /** Development builds only: use the app without buying. */
  devSkip: () => void;
}

const EntitlementContext = createContext<EntitlementContextType | undefined>(undefined);

export const EntitlementProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const owned = useRef<OwnedProduct[]>([]);
  const [entitlement, setEntitlement] = useState<Entitlement>({ status: 'loading' });
  const [price, setPrice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const skipped = useRef(OWNER_BUILD);

  const refresh = useCallback(() => {
    setEntitlement(skipped.current ? { status: 'unlocked' } : evaluate(owned.current, Date.now()));
  }, []);

  const add = useCallback(
    (more: OwnedProduct[]) => {
      owned.current = mergeOwned(owned.current, more);
      PurchaseService.saveCache(owned.current);
      refresh();
    },
    [refresh],
  );

  useEffect(() => {
    let alive = true;
    PurchaseService.listen(
      product => {
        add([product]);
        setBusy(false);
        setError('');
      },
      purchaseError => {
        setBusy(false);
        setError(isUserCancel(purchaseError) ? '' : t('paywall.purchaseFailed'));
      },
    );
    (async () => {
      owned.current = await PurchaseService.loadCache();
      if (!alive) {
        return;
      }
      refresh();
      PurchaseService.unlockPrice().then(value => alive && setPrice(value));
      try {
        const fromStore = await PurchaseService.fetchOwned();
        if (alive) {
          add(fromStore);
        }
      } catch {
        // Offline: the cached purchases decide for now.
      }
    })();
    return () => {
      alive = false;
      PurchaseService.stopListening();
    };
  }, [add, refresh]);

  // The trial ends on its own; check every minute while it runs.
  useEffect(() => {
    if (entitlement.status !== 'trial') {
      return;
    }
    const timer = setInterval(refresh, 60 * 1000);
    return () => clearInterval(timer);
  }, [entitlement.status, refresh]);

  const buy = useCallback(async (sku: string) => {
    setError('');
    setBusy(true);
    try {
      await PurchaseService.buy(sku);
      // The result arrives through the purchase listener.
    } catch (e) {
      setBusy(false);
      setError(isUserCancel(e) ? '' : t('paywall.storeError'));
    }
  }, []);

  const restore = useCallback(async () => {
    setError('');
    setBusy(true);
    try {
      const fromStore = await PurchaseService.fetchOwned();
      add(fromStore);
      return fromStore.length > 0;
    } catch {
      setError(t('paywall.storeError'));
      return false;
    } finally {
      setBusy(false);
    }
  }, [add]);

  const devSkip = useCallback(() => {
    if (__DEV__) {
      skipped.current = true;
      refresh();
    }
  }, [refresh]);

  const value: EntitlementContextType = {
    entitlement,
    price,
    busy,
    error,
    startTrial: () => buy(TRIAL_SKU),
    unlock: () => buy(UNLOCK_SKU),
    restore,
    devSkip,
  };

  return <EntitlementContext.Provider value={value}>{children}</EntitlementContext.Provider>;
};

export const useEntitlement = (): EntitlementContextType => {
  const context = useContext(EntitlementContext);
  if (!context) {
    throw new Error('useEntitlement must be used within an EntitlementProvider');
  }
  return context;
};
