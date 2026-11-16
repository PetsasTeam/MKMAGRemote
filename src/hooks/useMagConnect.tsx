/**
 * Shared "connect to a MAG box" flow: pairs first if needed, saves the
 * device (with its pairing code) and reports success to the caller.
 */
import React, { useState } from 'react';
import { Alert } from 'react-native';
import PairingDialog from '../components/PairingDialog';
import { useDevice } from '../context/DeviceContext';
import MAGService from '../services/MAGService';
import { MAGDevice } from '../types';

const UNREACHABLE_HELP =
  'Could not reach the MAG box. Please check:\n\n' +
  '1. The box is switched on (not in deep standby)\n' +
  '2. Your phone and the box are on the same Wi-Fi network\n' +
  '3. Settings → System settings → Remote control is enabled on the box\n' +
  '4. The IP address is correct';

export function useMagConnect(onConnected: (device: MAGDevice) => void) {
  const { addSavedDevice, setCurrentDevice } = useDevice();
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [pairingDevice, setPairingDevice] = useState<MAGDevice | null>(null);

  const openSession = async (device: MAGDevice) => {
    setConnectingId(device.id);
    const result = await MAGService.connect(device);
    setConnectingId(null);

    if (result === 'ok') {
      await addSavedDevice(device);
      setCurrentDevice(device);
      onConnected(device);
    } else if (result === 'rejected') {
      Alert.alert(
        'Pair again',
        'The box did not accept this phone. This happens if the pairing was reset on the box. Pair again?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Pair', onPress: () => setPairingDevice({ ...device, pairingCode: undefined }) },
        ],
      );
    } else {
      Alert.alert('Connection Failed', UNREACHABLE_HELP, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Retry', onPress: () => openSession(device) },
      ]);
    }
  };

  const connect = (device: MAGDevice) => {
    if (device.pairingCode) {
      openSession(device);
    } else {
      setPairingDevice(device);
    }
  };

  const pairingDialog = (
    <PairingDialog
      device={pairingDevice}
      onCancel={() => setPairingDevice(null)}
      onPaired={paired => {
        setPairingDevice(null);
        openSession(paired);
      }}
    />
  );

  return { connect, connectingId, pairingDialog };
}
