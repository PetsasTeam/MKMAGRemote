/**
 * Device Context - Manages connected MAG devices and app state
 */

import React, { createContext, useState, useContext, useCallback, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MAGDevice, AppSettings } from '../types';

interface DeviceContextType {
  currentDevice: MAGDevice | null;
  savedDevices: MAGDevice[];
  settings: AppSettings;
  setCurrentDevice: (device: MAGDevice | null) => void;
  addSavedDevice: (device: MAGDevice) => Promise<void>;
  removeSavedDevice: (deviceId: string) => Promise<void>;
  updateSettings: (settings: Partial<AppSettings>) => Promise<void>;
  loadSettings: () => Promise<void>;
  /** True once saved settings have been read from storage. */
  ready: boolean;
}

const defaultSettings: AppSettings = {
  theme: 'dark',
  vibrationEnabled: true,
  soundEnabled: true,
  autoConnect: false,
  defaultRemoteMode: 'standard',
  showAdvancedControls: true,
  buttonSize: 'medium',
  enableGestures: true,
  hapticFeedbackStrength: 'medium',
  savedDevices: [],
  macros: [],
  quickActions: [],
  appShortcuts: [],
  favorites: [],
};

const DeviceContext = createContext<DeviceContextType | undefined>(undefined);

export const DeviceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentDevice, setCurrentDevice] = useState<MAGDevice | null>(null);
  const [savedDevices, setSavedDevices] = useState<MAGDevice[]>([]);
  const [settings, setSettingsState] = useState<AppSettings>(defaultSettings);
  const [ready, setReady] = useState(false);
  // The latest settings, so quick successive updates build on each other
  // instead of on a stale copy captured by an earlier render.
  const latest = useRef<AppSettings>(defaultSettings);

  const commit = useCallback(async (next: AppSettings) => {
    latest.current = next;
    setSettingsState(next);
    setSavedDevices(next.savedDevices || []);
    try {
      await AsyncStorage.setItem('app_settings', JSON.stringify(next));
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  }, []);

  // Load saved settings and devices from storage
  const loadSettings = useCallback(async () => {
    try {
      const settingsJson = await AsyncStorage.getItem('app_settings');
      if (settingsJson) {
        // Merge with defaults so options added in newer versions get a value.
        const loaded: AppSettings = { ...defaultSettings, ...JSON.parse(settingsJson) };
        latest.current = loaded;
        setSettingsState(loaded);
        setSavedDevices(loaded.savedDevices || []);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  }, []);

  const addSavedDevice = useCallback(
    async (device: MAGDevice) => {
      const devices = [...latest.current.savedDevices.filter(d => d.id !== device.id), device];
      await commit({ ...latest.current, savedDevices: devices, lastDevice: device });
    },
    [commit],
  );

  const removeSavedDevice = useCallback(
    async (deviceId: string) => {
      const devices = latest.current.savedDevices.filter(d => d.id !== deviceId);
      const lastDevice =
        latest.current.lastDevice?.id === deviceId ? undefined : latest.current.lastDevice;
      await commit({ ...latest.current, savedDevices: devices, lastDevice });
    },
    [commit],
  );

  const updateSettings = useCallback(
    (newSettings: Partial<AppSettings>) => commit({ ...latest.current, ...newSettings }),
    [commit],
  );

  // Load settings on mount
  useEffect(() => {
    loadSettings().finally(() => setReady(true));
  }, [loadSettings]);

  const value: DeviceContextType = {
    currentDevice,
    savedDevices,
    settings,
    setCurrentDevice,
    addSavedDevice,
    removeSavedDevice,
    updateSettings,
    loadSettings,
    ready,
  };

  return <DeviceContext.Provider value={value}>{children}</DeviceContext.Provider>;
};

export const useDevice = (): DeviceContextType => {
  const context = useContext(DeviceContext);
  if (!context) {
    throw new Error('useDevice must be used within a DeviceProvider');
  }
  return context;
};
