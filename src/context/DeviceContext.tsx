/**
 * Device Context - Manages connected MAG devices and app state
 */

import React, { createContext, useState, useContext, useCallback, useEffect } from 'react';
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
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);

  // Load saved settings and devices from storage
  const loadSettings = useCallback(async () => {
    try {
      const settingsJson = await AsyncStorage.getItem('app_settings');
      if (settingsJson) {
        const loadedSettings = JSON.parse(settingsJson);
        setSettings(loadedSettings);
        setSavedDevices(loadedSettings.savedDevices || []);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  }, []);

  // Save settings to storage
  const saveSettings = useCallback(async (newSettings: AppSettings) => {
    try {
      await AsyncStorage.setItem('app_settings', JSON.stringify(newSettings));
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  }, []);

  // Add a device to saved devices
  const addSavedDevice = useCallback(async (device: MAGDevice) => {
    const updatedDevices = [...savedDevices.filter(d => d.id !== device.id), device];
    setSavedDevices(updatedDevices);
    const newSettings = { ...settings, savedDevices: updatedDevices, lastDevice: device };
    setSettings(newSettings);
    await saveSettings(newSettings);
  }, [savedDevices, settings, saveSettings]);

  // Remove a device from saved devices
  const removeSavedDevice = useCallback(async (deviceId: string) => {
    const updatedDevices = savedDevices.filter(d => d.id !== deviceId);
    setSavedDevices(updatedDevices);
    const newSettings = { ...settings, savedDevices: updatedDevices };
    setSettings(newSettings);
    await saveSettings(newSettings);
  }, [savedDevices, settings, saveSettings]);

  // Update app settings
  const updateSettings = useCallback(async (newSettings: Partial<AppSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    await saveSettings(updated);
  }, [settings, saveSettings]);

  // Load settings on mount
  useEffect(() => {
    loadSettings();
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
