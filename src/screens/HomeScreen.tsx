/**
 * Home Screen
 * Main screen showing saved devices and quick connect options
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Alert,
  TouchableOpacity,
} from 'react-native';
import {
  Button,
  Card,
  Title,
  Paragraph,
  IconButton,
  FAB,
  Portal,
  Dialog,
  TextInput,
  useTheme,
  Text,
} from 'react-native-paper';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../App';
import { useDevice } from '../context/DeviceContext';
import { MAGDevice } from '../types';
import MAGService from '../services/MAGService';

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Home'>;

interface Props {
  navigation: HomeScreenNavigationProp;
}

const HomeScreen: React.FC<Props> = ({ navigation }) => {
  const theme = useTheme();
  const { savedDevices, setCurrentDevice, addSavedDevice, removeSavedDevice } = useDevice();
  const [connecting, setConnecting] = useState(false);
  const [showManualDialog, setShowManualDialog] = useState(false);
  const [manualIp, setManualIp] = useState('');
  const [manualPort, setManualPort] = useState('80');

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <IconButton
          icon="cog"
          size={24}
          onPress={() => navigation.navigate('Settings')}
        />
      ),
    });
  }, [navigation]);

  const handleConnect = async (device: MAGDevice) => {
    setConnecting(true);
    try {
      const connected = await MAGService.connect(device);
      if (connected) {
        setCurrentDevice(device);
        await addSavedDevice(device);
        navigation.navigate('Remote', {
          deviceId: device.id,
          deviceName: device.name,
          deviceIp: device.ip,
        });
      } else {
        Alert.alert(
          'Connection Failed',
          'Could not connect to the MAG device. Please check:\n\n' +
          '1. Device is powered on\n' +
          '2. Both devices are on the same WiFi network\n' +
          '3. Remote Control is enabled on the MAG box\n' +
          '4. IP address is correct'
        );
      }
    } catch (error) {
      Alert.alert('Error', 'An error occurred while connecting to the device.');
    } finally {
      setConnecting(false);
    }
  };

  const handleManualConnect = async () => {
    if (!manualIp) {
      Alert.alert('Error', 'Please enter an IP address');
      return;
    }

    const device: MAGDevice = {
      id: `${manualIp}:${manualPort}`,
      name: `MAG Device (${manualIp})`,
      ip: manualIp,
      port: parseInt(manualPort, 10),
    };

    setShowManualDialog(false);
    await handleConnect(device);
    setManualIp('');
    setManualPort('80');
  };

  const handleDeleteDevice = (deviceId: string) => {
    Alert.alert(
      'Remove Device',
      'Are you sure you want to remove this device from saved devices?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => removeSavedDevice(deviceId),
        },
      ]
    );
  };

  const renderDeviceCard = ({ item }: { item: MAGDevice }) => (
    <Card style={styles.deviceCard}>
      <Card.Content>
        <View style={styles.cardHeader}>
          <View style={styles.cardInfo}>
            <Title>{item.name}</Title>
            <Paragraph>
              {item.ip}:{item.port}
            </Paragraph>
            {item.model && <Paragraph style={styles.modelText}>Model: {item.model}</Paragraph>}
          </View>
          <IconButton
            icon="delete"
            size={24}
            onPress={() => handleDeleteDevice(item.id)}
          />
        </View>
      </Card.Content>
      <Card.Actions>
        <Button
          mode="contained"
          onPress={() => handleConnect(item)}
          loading={connecting}
          disabled={connecting}>
          Connect
        </Button>
      </Card.Actions>
    </Card>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <Title style={styles.headerTitle}>My MAG Devices</Title>
        <Paragraph style={styles.headerSubtitle}>
          Select a device to connect or add a new one
        </Paragraph>
      </View>

      {savedDevices.length === 0 ? (
        <View style={styles.emptyContainer}>
          <IconButton icon="television" size={80} iconColor={theme.colors.primary} />
          <Title>No Devices Found</Title>
          <Paragraph style={styles.emptyText}>
            Add your MAG device to get started
          </Paragraph>
          <Button
            mode="contained"
            onPress={() => navigation.navigate('DeviceDiscovery')}
            style={styles.emptyButton}
            icon="magnify">
            Find Devices
          </Button>
          <Button
            mode="outlined"
            onPress={() => setShowManualDialog(true)}
            style={styles.emptyButton}
            icon="plus">
            Add Manually
          </Button>
        </View>
      ) : (
        <FlatList
          data={savedDevices}
          renderItem={renderDeviceCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
        />
      )}

      <FAB
        icon="magnify"
        style={styles.fab}
        onPress={() => navigation.navigate('DeviceDiscovery')}
        label="Find Devices"
      />

      <Portal>
        <Dialog visible={showManualDialog} onDismiss={() => setShowManualDialog(false)}>
          <Dialog.Title>Add Device Manually</Dialog.Title>
          <Dialog.Content>
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
              label="Port"
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
            <Button onPress={handleManualConnect}>Connect</Button>
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
  listContainer: {
    padding: 16,
  },
  deviceCard: {
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardInfo: {
    flex: 1,
  },
  modelText: {
    fontSize: 12,
    opacity: 0.7,
    marginTop: 4,
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
    marginBottom: 20,
    opacity: 0.7,
  },
  emptyButton: {
    marginTop: 10,
    minWidth: 200,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
  input: {
    marginBottom: 10,
  },
});

export default HomeScreen;
