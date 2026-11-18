/**
 * Shared "connect to a MAG box" flow. MAGic Remote boxes pair first (code on
 * the TV); AuraHD boxes ask for the box's Remote control password. Either
 * way the device is saved with its key and reported to the caller.
 */
import React, { useState } from 'react';
import { Alert } from 'react-native';
import PairingDialog from '../components/PairingDialog';
import PasswordDialog from '../components/PasswordDialog';
import { useDevice } from '../context/DeviceContext';
import MAGService from '../services/MAGService';
import { MAGDevice } from '../types';
import { t } from '../i18n';

export function useMagConnect(onConnected: (device: MAGDevice) => void) {
  const { addSavedDevice, setCurrentDevice } = useDevice();
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [pairingDevice, setPairingDevice] = useState<MAGDevice | null>(null);
  const [passwordDevice, setPasswordDevice] = useState<MAGDevice | null>(null);
  const [passwordError, setPasswordError] = useState('');

  const askPassword = (device: MAGDevice, error = '') => {
    setPasswordError(error);
    setPasswordDevice(device);
  };

  const openSession = async (device: MAGDevice) => {
    setConnectingId(device.id);
    const result = await MAGService.connect(device);
    setConnectingId(null);

    if (result === 'ok') {
      await addSavedDevice(device);
      setCurrentDevice(device);
      onConnected(device);
    } else if (result === 'rejected' && device.protocol === 'aurahd') {
      askPassword(device, t('connect.wrongPassword'));
    } else if (result === 'rejected') {
      Alert.alert(t('connect.pairAgainTitle'), t('connect.pairAgainBody'), [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('connect.pair'),
          onPress: () => setPairingDevice({ ...device, pairingCode: undefined }),
        },
      ]);
    } else {
      Alert.alert(t('connect.failedTitle'), t('connect.unreachable'), [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('common.retry'), onPress: () => openSession(device) },
      ]);
    }
  };

  const connect = (device: MAGDevice) => {
    if (device.protocol === 'demo') {
      openSession(device);
    } else if (device.protocol === 'aurahd') {
      if (device.password !== undefined) {
        openSession(device);
      } else {
        askPassword(device);
      }
    } else if (device.pairingCode) {
      openSession(device);
    } else {
      setPairingDevice(device);
    }
  };

  const pairingDialog = (
    <>
      <PairingDialog
        device={pairingDevice}
        onCancel={() => setPairingDevice(null)}
        onPaired={paired => {
          setPairingDevice(null);
          openSession(paired);
        }}
      />
      <PasswordDialog
        device={passwordDevice}
        error={passwordError}
        onCancel={() => setPasswordDevice(null)}
        onSubmit={withPassword => {
          setPasswordDevice(null);
          openSession(withPassword);
        }}
      />
    </>
  );

  return { connect, connectingId, pairingDialog };
}
