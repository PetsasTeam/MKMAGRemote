/**
 * Device Discovery Screen
 * Scans network for MAG devices
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Alert,
} from 'react-native';
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
import { useDevice } from '../context/DeviceContext';
import { MAGDevice } from '../types';
import DeviceDiscoveryService from '../services/DeviceDiscoveryService';
import MAGService from '../services/MAGService';

type DeviceDiscoveryScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'DeviceDiscovery'
>;

interface Props {
  navigation: DeviceDiscoveryScreenNavigationProp;
}

const DeviceDiscoveryScreen: React.FC<Props> = ({ navigation }) => {
  const theme = useTheme();
  const { addSavedDevice, setCurrentDevice } = useDevice();
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [devices, setDevices] = useState<MAGDevice[]>([]);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [showManualDialog, setShowManualDialog] = useState(false);
  const [manualIp, setManualIp] = useState('');
  const [manualPort, setManualPort] = useState('80');

  useEffect(() => {
    // Auto-start quick scan
    handleQuickScan();
  }, []);

  const handleQuickScan = async () => {
    setScanning(true);
    setDevices([]);
    setProgress(0);

    try {
      const foundDevices = await DeviceDiscoveryService.quickScan((device) => {
        setDevices((prev) => [...prev, device]);
      });

      if (foundDevices.length === 0) {
        Alert.alert(
          'No Devices Found',
          'No MAG devices were found. Make sure:\n\n' +
          '1. Your MAG box is powered on\n' +
          '2. Both devices are on the same WiFi network\n' +
          '3. Remote Control is enabled on the MAG box\n\n' +
          'Try a full network scan or add the device manually.',
          [
            { text: 'Full Scan', onPress: handleFullScan },
            { text: 'Add Manually', onPress: () => setShowManualDialog(true) },
            { text: 'Cancel', style: 'cancel' },
          ]
        );
      }
    } catch (error) {
      Alert.alert('Error', 'An error occurred during scanning.');
    } finally {
      setScanning(false);
      setProgress(0);
    }
  };

  const handleFullScan = async () => {
    setScanning(true);
    setDevices([]);
    setProgress(0);

    try {
      await DeviceDiscoveryService.scanNetwork(
        (device) => {
          setDevices((prev) => [...prev, device]);
        },
        (progressValue) => {
          setProgress(progressValue);
        }
      );

      if (devices.length === 0) {
        Alert.alert(
          'No Devices Found',
          'No MAG devices were found on your network. Try adding the device manually with its IP address.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      Alert.alert('Error', 'An error occurred during scanning.');
    } finally {
      setScanning(false);
      setProgress(0);
    }
  };

  const handleConnect = async (device: MAGDevice) => {
    setConnecting(device.id);

    try {
      const connected = await MAGService.connect(device);

      if (connected) {
        await addSavedDevice(device);
        setCurrentDevice(device);

        Alert.alert('Success', 'Connected to device successfully!', [
          {
            text: 'Use Remote',
            onPress: () =>
              navigation.replace('Remote', {
                deviceId: device.id,
                deviceName: device.name,
                deviceIp: device.ip,
              }),
          },
          {
            text: 'Back to Home',
            onPress: () => navigation.navigate('Home'),
          },
        ]);
      } else {
        Alert.alert(
          'Connection Failed',
          'Could not connect to the device. Please ensure Remote Control is enabled on the MAG box.'
        );
      }
    } catch (error) {
      Alert.alert('Error', 'An error occurred while connecting.');
    } finally {
      setConnecting(null);
    }
  };

  const handleManualAdd = async () => {
    if (!manualIp) {
      Alert.alert('Error', 'Please enter an IP address');
      return;
    }

    setShowManualDialog(false);
    setScanning(true);

    try {
      const device = await DeviceDiscoveryService.addManualDevice(
        manualIp,
        parseInt(manualPort, 10)
      );

      if (device) {
        setDevices([device]);
        Alert.alert('Device Found', 'MAG device found! You can now connect to it.');
      } else {
        Alert.alert(
          'Device Not Found',
          'Could not find a MAG device at the specified IP address. Please check the IP and try again.'
        );
      }
    } catch (error) {
      Alert.alert('Error', 'An error occurred while adding the device.');
    } finally {
      setScanning(false);
      setManualIp('');
      setManualPort('80');
    }
  };

  const renderDeviceCard = ({ item }: { item: MAGDevice }) => (
    <Card style={styles.deviceCard}>
      <Card.Content>
        <Title>{item.name}</Title>
        <Paragraph>
          IP: {item.ip}:{item.port}
        </Paragraph>
        {item.model && <Paragraph>Model: {item.model}</Paragraph>}
      </Card.Content>
      <Card.Actions>
        <Button
          mode="contained"
          onPress={() => handleConnect(item)}
          loading={connecting === item.id}
          disabled={connecting !== null}>
          {connecting === item.id ? 'Connecting...' : 'Connect'}
        </Button>
      </Card.Actions>
    </Card>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <Title style={styles.headerTitle}>Find MAG Devices</Title>
        <Paragraph style={styles.headerSubtitle}>
          Scanning your local network for MAG devices
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
            Try scanning again or add your device manually
          </Paragraph>
        </View>
      )}

      {devices.length > 0 && (
        <>
          <Text style={styles.resultText}>Found {devices.length} device(s)</Text>
          <FlatList
            data={devices}
            renderItem={renderDeviceCard}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContainer}
          />
        </>
      )}

      <View style={styles.buttonContainer}>
        <Button
          mode="contained"
          onPress={handleQuickScan}
          disabled={scanning}
          style={styles.button}
          icon="magnify">
          Quick Scan
        </Button>
        <Button
          mode="outlined"
          onPress={handleFullScan}
          disabled={scanning}
          style={styles.button}
          icon="radar">
          Full Network Scan
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
              Enter the IP address of your MAG device. You can find this in Settings → System Info → Network on your MAG box.
            </Paragraph>
            <TextInput
              label="IP Address"
              value={manualIp}
              onChangeText={setManualIp}
              placeholder="192.168.1.100"
              keyboardType="numeric"
              mode="outlined"
              style={styles.input}
            />
            <TextInput
              label="Port (optional)"
              value={manualPort}
              onChangeText={setManualPort}
              placeholder="80"
              keyboardType="numeric"
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
