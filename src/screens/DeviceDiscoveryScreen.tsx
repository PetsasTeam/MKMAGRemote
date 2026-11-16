/**
 * Device Discovery Screen
 * Scans the local network for MAG boxes with Remote control enabled.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, Alert } from 'react-native';
import {
  Button,
  Card,
  Title,
  Paragraph,
  ActivityIndicator,
  useTheme,
  ProgressBar,
  Text,
  Portal,
  Dialog,
  TextInput,
} from 'react-native-paper';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../App';
import { MAGDevice } from '../types';
import DeviceDiscoveryService, {
  NoWifiError,
  isValidIPv4,
} from '../services/DeviceDiscoveryService';
import { useMagConnect } from '../hooks/useMagConnect';

type DeviceDiscoveryScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'DeviceDiscovery'
>;

interface Props {
  navigation: DeviceDiscoveryScreenNavigationProp;
}

const NOTHING_FOUND_HELP =
  'No MAG boxes answered. Please check:\n\n' +
  '1. The box is switched on\n' +
  '2. Your phone and the box are on the same Wi-Fi network\n' +
  '3. On the box: Settings → System settings → Remote control is enabled\n' +
  '4. On iPhone: if you were asked about "Local Network" access, tap Allow ' +
  '(or enable it in iOS Settings → Privacy & Security → Local Network) and scan again';

const DeviceDiscoveryScreen: React.FC<Props> = ({ navigation }) => {
  const theme = useTheme();
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [devices, setDevices] = useState<MAGDevice[]>([]);
  const [showManualDialog, setShowManualDialog] = useState(false);
  const [manualIp, setManualIp] = useState('');
  const { connect, connectingId, pairingDialog } = useMagConnect(device =>
    navigation.replace('Remote', {
      deviceId: device.id,
      deviceName: device.name,
      deviceIp: device.ip,
    }),
  );

  const handleScan = useCallback(async () => {
    setScanning(true);
    setDevices([]);
    setProgress(0);

    try {
      const found = await DeviceDiscoveryService.scanNetwork(
        device => setDevices(prev => [...prev, device]),
        value => setProgress(value),
      );
      if (found.length === 0) {
        Alert.alert('No Devices Found', NOTHING_FOUND_HELP, [
          { text: 'Add Manually', onPress: () => setShowManualDialog(true) },
          { text: 'OK', style: 'cancel' },
        ]);
      }
    } catch (error) {
      Alert.alert(
        error instanceof NoWifiError ? 'Not on Wi-Fi' : 'Scan failed',
        error instanceof Error ? error.message : 'An error occurred during scanning.',
      );
    } finally {
      setScanning(false);
      setProgress(0);
    }
  }, []);

  useEffect(() => {
    handleScan();
    return () => DeviceDiscoveryService.stopScan();
  }, [handleScan]);

  const handleManualAdd = async () => {
    const ip = manualIp.trim();
    if (!isValidIPv4(ip)) {
      Alert.alert('Invalid IP address', 'Enter the IP shown on the box, e.g. 192.168.1.50');
      return;
    }

    setShowManualDialog(false);
    setScanning(true);
    try {
      const device = await DeviceDiscoveryService.addManualDevice(ip);
      if (device) {
        setDevices(prev => [...prev.filter(d => d.id !== device.id), device]);
      } else {
        Alert.alert(
          'Device Not Found',
          `Nothing at ${ip} accepts MAG remote connections.\n\n` +
            'Check the IP and make sure Settings → System settings → Remote control is enabled on the box.',
        );
      }
    } finally {
      setScanning(false);
      setManualIp('');
    }
  };

  const renderDeviceCard = ({ item }: { item: MAGDevice }) => (
    <Card style={styles.deviceCard}>
      <Card.Content>
        <Title>{item.name}</Title>
        <Paragraph>IP: {item.ip}</Paragraph>
      </Card.Content>
      <Card.Actions>
        <Button
          mode="contained"
          onPress={() => connect(item)}
          loading={connectingId === item.id}
          disabled={connectingId !== null}>
          {connectingId === item.id ? 'Connecting...' : 'Connect'}
        </Button>
      </Card.Actions>
    </Card>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <Title style={styles.headerTitle}>Find MAG Devices</Title>
        <Paragraph style={styles.headerSubtitle}>
          Looking for MAG boxes with Remote control enabled on your Wi-Fi
        </Paragraph>
      </View>

      {scanning && (
        <View style={styles.scanningContainer}>
          <ActivityIndicator size="large" />
          <Text style={styles.scanningText}>
            {progress > 0 ? `Scanning network... ${progress.toFixed(0)}%` : 'Searching...'}
          </Text>
          {progress > 0 && <ProgressBar progress={progress / 100} style={styles.progressBar} />}
        </View>
      )}

      {!scanning && devices.length === 0 && (
        <View style={styles.emptyContainer}>
          <Title>No Devices Found</Title>
          <Paragraph style={styles.emptyText}>
            Scan again or add your device manually
          </Paragraph>
        </View>
      )}

      {devices.length > 0 && (
        <>
          <Text style={styles.resultText}>Found {devices.length} device(s)</Text>
          <FlatList
            data={devices}
            renderItem={renderDeviceCard}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listContainer}
          />
        </>
      )}

      <View style={styles.buttonContainer}>
        <Button
          mode="contained"
          onPress={handleScan}
          disabled={scanning}
          style={styles.button}
          icon="radar">
          Scan Again
        </Button>
        <Button
          mode="outlined"
          onPress={() => setShowManualDialog(true)}
          disabled={scanning}
          style={styles.button}
          icon="plus">
          Add Manually
        </Button>
      </View>

      <Portal>
        <Dialog visible={showManualDialog} onDismiss={() => setShowManualDialog(false)}>
          <Dialog.Title>Add Device Manually</Dialog.Title>
          <Dialog.Content>
            <Paragraph style={styles.dialogText}>
              Enter the IP address of your MAG box. You can find it on the box under
              Settings → System settings → Network / Info.
            </Paragraph>
            <TextInput
              label="IP Address"
              value={manualIp}
              onChangeText={setManualIp}
              placeholder="192.168.1.100"
              keyboardType="decimal-pad"
              autoCorrect={false}
              mode="outlined"
              style={styles.input}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowManualDialog(false)}>Cancel</Button>
            <Button onPress={handleManualAdd}>Add Device</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {pairingDialog}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingTop: 10,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    opacity: 0.7,
    marginTop: 5,
  },
  scanningContainer: {
    padding: 20,
    alignItems: 'center',
  },
  scanningText: {
    marginTop: 15,
    fontSize: 16,
  },
  progressBar: {
    width: '80%',
    marginTop: 15,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 10,
    opacity: 0.7,
  },
  resultText: {
    paddingHorizontal: 20,
    marginBottom: 10,
    fontSize: 16,
    fontWeight: 'bold',
  },
  listContainer: {
    padding: 16,
  },
  deviceCard: {
    marginBottom: 16,
  },
  buttonContainer: {
    padding: 16,
    gap: 10,
  },
  button: {
    marginVertical: 5,
  },
  dialogText: {
    marginBottom: 15,
  },
  input: {
    marginBottom: 10,
  },
});

export default DeviceDiscoveryScreen;
