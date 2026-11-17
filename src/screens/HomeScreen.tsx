/**
 * Home Screen
 * Main screen showing saved devices and quick connect options
 */

import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, Alert, TouchableOpacity } from 'react-native';
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
import { useMagConnect } from '../hooks/useMagConnect';
import DeviceDiscoveryService, {
  isValidIPv4,
  makeMagDevice,
} from '../services/DeviceDiscoveryService';

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Home'>;

interface Props {
  navigation: HomeScreenNavigationProp;
}

const HomeScreen: React.FC<Props> = ({ navigation }) => {
  const theme = useTheme();
  const { savedDevices, removeSavedDevice } = useDevice();
  const [showManualDialog, setShowManualDialog] = useState(false);
  const [manualIp, setManualIp] = useState('');
  const { connect, connectingId, pairingDialog } = useMagConnect(device =>
    navigation.navigate('Remote', {
      deviceId: device.id,
      deviceName: device.name,
      deviceIp: device.ip,
    }),
  );

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <IconButton icon="cog" size={24} onPress={() => navigation.navigate('Settings')} />
      ),
    });
  }, [navigation]);

  const handleManualConnect = async () => {
    const ip = manualIp.trim();
    if (!isValidIPv4(ip)) {
      Alert.alert('Invalid IP address', 'Enter the IP shown on the box, e.g. 192.168.1.50');
      return;
    }
    setShowManualDialog(false);
    setManualIp('');
    // Work out which remote protocol the box speaks (MAGic Remote or AuraHD).
    const found = await DeviceDiscoveryService.addManualDevice(ip);
    connect(found ?? makeMagDevice(ip));
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
      ],
    );
  };

  const renderDeviceCard = ({ item }: { item: MAGDevice }) => (
    <Card style={styles.deviceCard}>
      <Card.Content>
        <View style={styles.cardHeader}>
          <View style={styles.cardInfo}>
            <Title>{item.name}</Title>
            <Paragraph>{item.ip}</Paragraph>
            <Paragraph style={styles.modelText}>
              {item.pairingCode ? 'Paired' : 'Not paired yet (you will be asked for a code)'}
            </Paragraph>
          </View>
          <IconButton icon="delete" size={24} onPress={() => handleDeleteDevice(item.id)} />
        </View>
      </Card.Content>
      <Card.Actions>
        <Button
          mode="contained"
          onPress={() => connect(item)}
          loading={connectingId === item.id}
          disabled={connectingId !== null}>
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

      {savedDevices.length > 0 && (
        <View style={styles.quickAccessContainer}>
          <Card style={styles.quickAccessCard}>
            <Card.Content>
              <View style={styles.quickAccessButtons}>
                <TouchableOpacity
                  style={styles.quickAccessButton}
                  onPress={() => navigation.navigate('Macros')}>
                  <Text style={styles.quickAccessIcon}>⚡</Text>
                  <Text style={styles.quickAccessLabel}>Macros</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.quickAccessButton}
                  onPress={() => navigation.navigate('QuickActions')}>
                  <Text style={styles.quickAccessIcon}>⭐</Text>
                  <Text style={styles.quickAccessLabel}>Quick Actions</Text>
                </TouchableOpacity>
              </View>
            </Card.Content>
          </Card>
        </View>
      )}

      {savedDevices.length === 0 ? (
        <View style={styles.emptyContainer}>
          <IconButton icon="television" size={80} iconColor={theme.colors.primary} />
          <Title>No Devices Found</Title>
          <Paragraph style={styles.emptyText}>Add your MAG device to get started</Paragraph>
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
          keyExtractor={item => item.id}
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
              keyboardType="decimal-pad"
              autoCorrect={false}
              mode="outlined"
              style={styles.input}
            />
            <Paragraph style={styles.dialogHint}>
              Find it on the box under Settings → System settings → Network / Info.
            </Paragraph>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowManualDialog(false)}>Cancel</Button>
            <Button onPress={handleManualConnect}>Connect</Button>
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
  dialogHint: {
    opacity: 0.7,
  },
  quickAccessContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  quickAccessCard: {
    backgroundColor: 'rgba(0, 168, 232, 0.1)',
  },
  quickAccessButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 16,
  },
  quickAccessButton: {
    alignItems: 'center',
    padding: 12,
    flex: 1,
  },
  quickAccessIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  quickAccessLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
});

export default HomeScreen;
