/**
 * Pairing dialog: asks the MAG box to show a 6-digit code on the TV, then
 * lets the user type it in. Pairing only has to happen once per box.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  ActivityIndicator,
  Button,
  Dialog,
  HelperText,
  Paragraph,
  Portal,
  TextInput,
} from 'react-native-paper';
import { MAGDevice } from '../types';
import MAGService from '../services/MAGService';
import { MAG_REMOTE_PORT, isValidPairingCode } from '../services/magProtocol';

type Step = 'starting' | 'enter-code' | 'verifying' | 'error';

interface Props {
  /** Device to pair with; the dialog is shown while this is non-null. */
  device: MAGDevice | null;
  onPaired: (device: MAGDevice) => void;
  onCancel: () => void;
}

const PairingDialog: React.FC<Props> = ({ device, onPaired, onCancel }) => {
  const [step, setStep] = useState<Step>('starting');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  const requestCode = useCallback(async (target: MAGDevice) => {
    setStep('starting');
    setCode('');
    setError('');
    try {
      await MAGService.startPairing(target.ip);
      setStep('enter-code');
    } catch {
      setError(
        `Couldn't reach the MAG box at ${target.ip}.\n\n` +
          'Check that it is on, on the same Wi-Fi as this phone, and that ' +
          'Settings → System settings → Remote control is enabled.',
      );
      setStep('error');
    }
  }, []);

  useEffect(() => {
    if (device) {
      requestCode(device);
    }
  }, [device, requestCode]);

  const handleCancel = () => {
    MAGService.cancelPairing();
    onCancel();
  };

  const handleSubmit = async () => {
    if (!device) {
      return;
    }
    if (!isValidPairingCode(code)) {
      setError('Enter the 6 digits shown on your TV.');
      return;
    }
    setError('');
    setStep('verifying');
    try {
      const ok = await MAGService.completePairing(code);
      if (ok) {
        onPaired({ ...device, port: MAG_REMOTE_PORT, pairingCode: code });
        return;
      }
      setError("That code wasn't accepted. Tap “Try again” to show a new code on your TV.");
    } catch {
      setError('Pairing failed. Tap “Try again” to show a new code on your TV.');
    }
    setStep('error');
  };

  return (
    <Portal>
      <Dialog visible={device !== null} onDismiss={handleCancel}>
        <Dialog.Title>Pair with your MAG</Dialog.Title>
        <Dialog.Content>
          {step === 'starting' && (
            <View style={styles.row}>
              <ActivityIndicator />
              <Paragraph style={styles.rowText}>Connecting to {device?.ip}…</Paragraph>
            </View>
          )}

          {step === 'enter-code' && (
            <>
              <Paragraph style={styles.text}>
                A 6-digit code is now shown on your TV. Enter it below.
              </Paragraph>
              <TextInput
                label="Pairing code"
                value={code}
                onChangeText={value => setCode(value.replace(/\D/g, '').slice(0, 6))}
                keyboardType="number-pad"
                maxLength={6}
                autoFocus
                mode="outlined"
                onSubmitEditing={handleSubmit}
              />
              <HelperText type="error" visible={error !== ''}>
                {error}
              </HelperText>
            </>
          )}

          {step === 'verifying' && (
            <View style={styles.row}>
              <ActivityIndicator />
              <Paragraph style={styles.rowText}>Checking code…</Paragraph>
            </View>
          )}

          {step === 'error' && <Paragraph>{error}</Paragraph>}
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={handleCancel}>Cancel</Button>
          {step === 'enter-code' && (
            <Button onPress={handleSubmit} disabled={code.length !== 6}>
              Pair
            </Button>
          )}
          {step === 'error' && device && (
            <Button onPress={() => requestCode(device)}>Try again</Button>
          )}
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowText: {
    marginLeft: 12,
  },
  text: {
    marginBottom: 12,
  },
});

export default PairingDialog;
