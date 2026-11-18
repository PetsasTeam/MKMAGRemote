/**
 * Home Screen
 * Your MAG boxes: tap one to open the remote, long-press to remove it.
 */
import React, { useState } from 'react';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../App';
import { useDevice } from '../context/DeviceContext';
import { useEntitlement } from '../context/EntitlementContext';
import { timeLeft } from '../services/PurchaseService';
import { MAGDevice } from '../types';
import { useMagConnect } from '../hooks/useMagConnect';
import { useKeyboardHeight } from '../hooks/useKeyboardHeight';
import MAGService from '../services/MAGService';
import DeviceDiscoveryService, {
  isValidIPv4,
  makeDemoDevice,
  makeMagDevice,
} from '../services/DeviceDiscoveryService';
import { colors, radius, spacing, type } from '../theme/tokens';
import { t } from '../i18n';

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Home'>;

interface Props {
  navigation: HomeScreenNavigationProp;
}

const HomeScreen: React.FC<Props> = ({ navigation }) => {
  const { savedDevices, removeSavedDevice, currentDevice } = useDevice();
  const [showManualDialog, setShowManualDialog] = useState(false);
  const [manualIp, setManualIp] = useState('');
  const [checkingIp, setCheckingIp] = useState(false);
  const { entitlement } = useEntitlement();
  const keyboardHeight = useKeyboardHeight();
  const insets = useSafeAreaInsets();
  const { connect, connectingId, pairingDialog } = useMagConnect(device =>
    navigation.navigate('Remote', {
      deviceId: device.id,
      deviceName: device.name,
      deviceIp: device.ip,
    }),
  );

  const handleManualConnect = async () => {
    const ip = manualIp.trim();
    if (!isValidIPv4(ip)) {
      Alert.alert(t('ip.invalidTitle'), t('ip.invalidBody'));
      return;
    }
    setShowManualDialog(false);
    setManualIp('');
    // Work out which remote protocol the box speaks (MAGic Remote or AuraHD).
    setCheckingIp(true);
    const found = await DeviceDiscoveryService.addManualDevice(ip);
    setCheckingIp(false);
    connect(found ?? makeMagDevice(ip));
  };

  const confirmRemove = (device: MAGDevice) => {
    Alert.alert(t('home.removeTitle', { name: device.name }), t('home.removeBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.remove'),
        style: 'destructive',
        onPress: () => removeSavedDevice(device.id),
      },
    ]);
  };

  const isConnected = (device: MAGDevice) =>
    currentDevice?.id === device.id && MAGService.isConnected();

  const renderDevice = ({ item }: { item: MAGDevice }) => {
    const connected = isConnected(item);
    const connecting = connectingId === item.id;
    return (
      <Pressable
        onPress={() => connect(item)}
        onLongPress={() => confirmRemove(item)}
        disabled={connectingId !== null}
        accessibilityRole="button"
        accessibilityHint={t('home.rowHint')}
        style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}>
        <View style={[styles.tile, connected && styles.tileActive]}>
          <Icon
            source={item.protocol === 'demo' ? 'television-play' : 'television'}
            size={22}
            color={connected ? colors.accentText : colors.textSecondary}
          />
        </View>
        <View style={styles.rowText}>
          <Text style={styles.rowTitle} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={[styles.rowSubtitle, connected && styles.connectedText]} numberOfLines={1}>
            {connected
              ? t('home.connected')
              : item.protocol === 'demo'
                ? t('home.demoSubtitle')
                : item.ip}
          </Text>
        </View>
        {connecting ? (
          <ActivityIndicator color={colors.textSecondary} />
        ) : (
          <Icon source="chevron-right" size={22} color={colors.textMuted} />
        )}
      </Pressable>
    );
  };

  const empty = (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Icon source="remote-tv" size={40} color={colors.accentText} />
      </View>
      <Text style={styles.emptyTitle}>{t('home.addYourBox')}</Text>
      <Text style={styles.emptyBody}>{t('home.addYourBoxBody')}</Text>
      <Button
        mode="contained"
        onPress={() => navigation.navigate('DeviceDiscovery')}
        style={styles.primaryButton}
        contentStyle={styles.buttonContent}
        labelStyle={styles.buttonLabel}>
        {t('home.findBoxes')}
      </Button>
      <Button
        mode="text"
        onPress={() => setShowManualDialog(true)}
        textColor={colors.textSecondary}>
        {t('home.enterIp')}
      </Button>
      <Button
        mode="text"
        icon="television-play"
        onPress={() => connect(makeDemoDevice(t('home.demoName')))}
        textColor={colors.textMuted}>
        {t('home.tryDemo')}
      </Button>
    </View>
  );

  const extras = (
    <View style={styles.extras}>
      <Text style={styles.sectionLabel}>{t('home.shortcuts')}</Text>
      <View style={styles.extrasRow}>
        <Pressable
          onPress={() => navigation.navigate('Macros')}
          style={({ pressed }) => [styles.extraCard, pressed && styles.rowPressed]}>
          <Icon source="lightning-bolt-outline" size={20} color={colors.accentText} />
          <Text style={styles.extraText}>{t('nav.macros')}</Text>
        </Pressable>
        <Pressable
          onPress={() => navigation.navigate('QuickActions')}
          style={({ pressed }) => [styles.extraCard, pressed && styles.rowPressed]}>
          <Icon source="star-outline" size={20} color={colors.accentText} />
          <Text style={styles.extraText}>{t('nav.quickActions')}</Text>
        </Pressable>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.lg }]}>
      <View style={styles.titleRow}>
        <View>
          <Text style={type.title}>{t('nav.devices')}</Text>
          {entitlement.status === 'trial' && (
            <Pressable onPress={() => navigation.navigate('Settings')} hitSlop={6}>
              <Text style={styles.trialBadge}>{trialLabel(entitlement.endsAt)}</Text>
            </Pressable>
          )}
        </View>
        <View style={styles.titleActions}>
          {savedDevices.length > 0 && (
            <Pressable
              onPress={() => navigation.navigate('DeviceDiscovery')}
              style={styles.headerButton}
              accessibilityLabel={t('nav.addBox')}
              hitSlop={6}>
              <Icon source="plus" size={22} color={colors.text} />
            </Pressable>
          )}
          <Pressable
            onPress={() => navigation.navigate('Settings')}
            style={styles.headerButton}
            accessibilityLabel={t('nav.settings')}
            hitSlop={6}>
            <Icon source="cog-outline" size={20} color={colors.textSecondary} />
          </Pressable>
        </View>
      </View>

      {savedDevices.length === 0 ? (
        empty
      ) : (
        <FlatList
          data={savedDevices}
          renderItem={renderDevice}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={Separator}
          ListHeaderComponent={<Text style={styles.sectionLabel}>{t('home.yourBoxes')}</Text>}
          ListFooterComponent={
            <>
              <Pressable onPress={() => setShowManualDialog(true)} style={styles.ipLink}>
                <Text style={styles.ipLinkText}>{t('home.enterIpInstead')}</Text>
              </Pressable>
              {extras}
            </>
          }
        />
      )}

      {checkingIp && (
        <View style={styles.checking}>
          <ActivityIndicator color={colors.text} />
          <Text style={styles.checkingText}>{t('home.checking')}</Text>
        </View>
      )}

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
              onSubmitEditing={handleManualConnect}
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
            <Button onPress={handleManualConnect} textColor={colors.accentText}>
              {t('common.connect')}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {pairingDialog}
    </View>
  );
};

const Separator = () => <View style={styles.separator} />;

function trialLabel(endsAt: number): string {
  const { hours, minutes } = timeLeft(endsAt, Date.now());
  const time =
    hours > 0 ? t('paywall.hours', { count: hours }) : t('paywall.minutes', { count: minutes });
  return t('paywall.trialLeft', { time });
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.control,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trialBadge: {
    color: colors.accentText,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  titleActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  sectionLabel: {
    ...type.label,
    fontWeight: '600',
    marginHorizontal: spacing.sm,
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
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
    backgroundColor: colors.control,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileActive: {
    backgroundColor: colors.accentSoft,
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
  connectedText: {
    color: colors.success,
  },
  ipLink: {
    alignSelf: 'center',
    padding: spacing.lg,
  },
  ipLinkText: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  extras: {
    marginTop: spacing.md,
  },
  extrasRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  extraCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  extraText: {
    ...type.body,
    fontSize: 14,
    fontWeight: '500',
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
    paddingBottom: 80,
  },
  emptyIcon: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  emptyTitle: {
    ...type.heading,
    fontSize: 22,
    marginBottom: spacing.sm,
  },
  emptyBody: {
    ...type.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: spacing.xl,
  },
  primaryButton: {
    alignSelf: 'stretch',
    borderRadius: radius.md,
    marginBottom: spacing.sm,
  },
  buttonContent: {
    height: 52,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  checking: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
    backgroundColor: colors.control,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  checkingText: {
    color: colors.text,
    fontSize: 14,
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

export default HomeScreen;
