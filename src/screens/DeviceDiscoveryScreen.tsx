/**
 * Device Discovery Screen
 * Scans the local network for MAG boxes with Remote control enabled
 * (MAGic Remote or AuraHD protocol). Tap a box to connect.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Button, Dialog, Icon, Portal, TextInput } from 'react-native-paper';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../App';
import DeviceDiscoveryService, {
  DiscoveredDevice,
  NoWifiError,
  isValidIPv4,
  mergeDiscovered,
} from '../services/DeviceDiscoveryService';
import { useMagConnect } from '../hooks/useMagConnect';
import { useKeyboardHeight } from '../hooks/useKeyboardHeight';
import { colors, radius, spacing, type } from '../theme/tokens';
import { t } from '../i18n';

type DeviceDiscoveryScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'DeviceDiscovery'
>;

interface Props {
  navigation: DeviceDiscoveryScreenNavigationProp;
}

const CHECKS = [t('scan.check1'), t('scan.check2'), t('scan.check3'), t('scan.check4')];

const DeviceDiscoveryScreen: React.FC<Props> = ({ navigation }) => {
  const [scanning, setScanning] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [progress, setProgress] = useState(0);
  const [devices, setDevices] = useState<DiscoveredDevice[]>([]);
  const [showManualDialog, setShowManualDialog] = useState(false);
  const [manualIp, setManualIp] = useState('');
  const keyboardHeight = useKeyboardHeight();
  const { connect, connectingId, pairingDialog } = useMagConnect(device =>
    navigation.replace('Remote', {
      deviceId: device.id,
      deviceName: device.name,
      deviceIp: device.ip,
    }),
  );

  const handleScan = useCallback(async () => {
    setScanning(true);
    setScanned(false);
    setDevices([]);
    setProgress(0);
    try {
      await DeviceDiscoveryService.scanNetwork(
        device => setDevices(prev => mergeDiscovered(prev, device)),
        value => setProgress(value),
      );
    } catch (error) {
      Alert.alert(
        error instanceof NoWifiError ? t('scan.noWifiTitle') : t('scan.failedTitle'),
        error instanceof NoWifiError ? t('scan.noWifiBody') : t('scan.failedBody'),
      );
    } finally {
      setScanning(false);
      setScanned(true);
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
      Alert.alert(t('ip.invalidTitle'), t('ip.invalidBody'));
      return;
    }
    setShowManualDialog(false);
    setScanning(true);
    try {
      const device = await DeviceDiscoveryService.addManualDevice(ip);
      if (device) {
        setDevices(prev => mergeDiscovered(prev, device));
      } else {
        Alert.alert(t('scan.noAnswerTitle', { ip }), t('scan.noAnswerBody'));
      }
    } finally {
      setScanning(false);
      setScanned(true);
      setManualIp('');
    }
  };

  const renderDevice = ({ item }: { item: DiscoveredDevice }) => (
    <Pressable
      onPress={() => connect(item)}
      disabled={connectingId !== null}
      accessibilityRole="button"
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}>
      <View style={styles.tile}>
        <Icon source="television" size={22} color={colors.accentText} />
      </View>
      <View style={styles.rowText}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.rowSubtitle} numberOfLines={1}>
          {item.ip} · {item.protocol === 'aurahd' ? t('scan.usesPassword') : t('scan.usesCode')}
        </Text>
      </View>
      {connectingId === item.id ? (
        <ActivityIndicator color={colors.textSecondary} />
      ) : (
        <Text style={styles.connectText}>{t('common.connect')}</Text>
      )}
    </Pressable>
  );

  const status = scanning ? (
    <View style={styles.status}>
      <View style={styles.statusLine}>
        <Icon source="radar" size={18} color={colors.accentText} />
        <Text style={styles.statusText}>
          {devices.length > 0
            ? t('scan.searchingFound', { count: devices.length })
            : t('scan.searching')}
        </Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.trackFill, { width: `${Math.max(4, Math.round(progress))}%` }]} />
      </View>
    </View>
  ) : devices.length > 0 ? (
    <Text style={styles.sectionLabel}>
      {devices.length === 1 ? t('scan.oneFound') : t('scan.manyFound', { count: devices.length })}
    </Text>
  ) : null;

  const nothingFound =
    scanned && !scanning && devices.length === 0 ? (
      <View style={styles.helpCard}>
        <Text style={styles.helpTitle}>{t('scan.noneTitle')}</Text>
        <Text style={styles.helpBody}>{t('scan.checkThat')}</Text>
        {CHECKS.map(check => (
          <View key={check} style={styles.helpItem}>
            <Icon source="check-circle-outline" size={16} color={colors.textMuted} />
            <Text style={styles.helpText}>{check}</Text>
          </View>
        ))}
      </View>
    ) : null;

  return (
    <View style={styles.container}>
      <FlatList
        data={devices}
        renderItem={renderDevice}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={Separator}
        ListHeaderComponent={
          <>
            <Text style={styles.intro}>{t('scan.intro')}</Text>
            {status}
          </>
        }
        ListFooterComponent={nothingFound}
      />

      <View style={styles.footer}>
        <Button
          mode="contained"
          onPress={handleScan}
          disabled={scanning}
          style={styles.primaryButton}
          contentStyle={styles.buttonContent}
          labelStyle={styles.buttonLabel}>
          {scanning ? t('scan.searchingButton') : t('scan.again')}
        </Button>
        <Button
          mode="text"
          onPress={() => setShowManualDialog(true)}
          textColor={colors.textSecondary}>
          {t('home.enterIp')}
        </Button>
      </View>

      <Portal>
        <Dialog
          visible={showManualDialog}
          onDismiss={() => setShowManualDialog(false)}
          style={[styles.dialog, { marginBottom: keyboardHeight }]}>
          <Dialog.Title style={styles.dialogTitle}>{t('ip.title')}</Dialog.Title>
          <Dialog.Content>
            <Text style={styles.dialogBody}>{t('ip.where')}</Text>
            <TextInput
              mode="outlined"
              value={manualIp}
              onChangeText={setManualIp}
              placeholder="192.168.1.50"
              keyboardType="numbers-and-punctuation"
              returnKeyType="go"
              autoFocus
              autoCorrect={false}
              onSubmitEditing={handleManualAdd}
              outlineColor={colors.border}
              activeOutlineColor={colors.accent}
              textColor={colors.text}
              style={styles.dialogInput}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowManualDialog(false)} textColor={colors.textSecondary}>
              {t('common.cancel')}
            </Button>
            <Button onPress={handleManualAdd} textColor={colors.accentText}>
              {t('common.add')}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {pairingDialog}
    </View>
  );
};

const Separator = () => <View style={styles.separator} />;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  intro: {
    ...type.body,
    color: colors.textSecondary,
    marginHorizontal: spacing.sm,
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
  },
  status: {
    marginHorizontal: spacing.sm,
    marginBottom: spacing.lg,
  },
  statusLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  statusText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  track: {
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.control,
    overflow: 'hidden',
  },
  trackFill: {
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.accent,
  },
  sectionLabel: {
    ...type.label,
    fontWeight: '600',
    marginHorizontal: spacing.sm,
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  rowPressed: {
    backgroundColor: colors.control,
  },
  separator: {
    height: spacing.sm,
  },
  tile: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    flex: 1,
  },
  rowTitle: {
    ...type.body,
    fontWeight: '600',
  },
  rowSubtitle: {
    ...type.caption,
    marginTop: 2,
  },
  connectText: {
    color: colors.accentText,
    fontSize: 14,
    fontWeight: '600',
  },
  helpCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  helpTitle: {
    ...type.heading,
  },
  helpBody: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  helpItem: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  helpText: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
    paddingTop: spacing.sm,
  },
  primaryButton: {
    borderRadius: radius.md,
    marginBottom: spacing.xs,
  },
  buttonContent: {
    height: 52,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  dialog: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
  },
  dialogTitle: {
    color: colors.text,
  },
  dialogBody: {
    color: colors.textSecondary,
    fontSize: 14,
    marginBottom: spacing.md,
  },
  dialogInput: {
    backgroundColor: colors.background,
  },
});

export default DeviceDiscoveryScreen;
