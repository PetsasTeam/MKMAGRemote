/**
 * Which box macros and quick actions run on (the connected one, else the
 * last used, else the first saved), and a way to connect to it on demand.
 */
import { useCallback } from 'react';
import { useDevice } from '../context/DeviceContext';
import MAGService from '../services/MAGService';
import { MAGDevice } from '../types';

export function useShortcutTarget(): {
  target: MAGDevice | null;
  ensureConnected: () => Promise<boolean>;
} {
  const { currentDevice, savedDevices, settings, setCurrentDevice } = useDevice();
  const target = currentDevice ?? settings.lastDevice ?? savedDevices[0] ?? null;

  const ensureConnected = useCallback(async () => {
    if (!target) {
      return false;
    }
    if (MAGService.isConnected() && MAGService.getCurrentDevice()?.id === target.id) {
      return true;
    }
    if ((await MAGService.connect(target)) !== 'ok') {
      return false;
    }
    setCurrentDevice(target);
    return true;
  }, [target, setCurrentDevice]);

  return { target, ensureConnected };
}
