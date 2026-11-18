/**
 * Remote Screen
 * One-handed remote: circular D-pad up top, system keys, volume and channel
 * rockers, playback and colour keys. Numbers and text entry open on demand.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Icon, Modal, Portal, Snackbar } from 'react-native-paper';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../App';
import { useDevice } from '../context/DeviceContext';
import { MAGCommand } from '../types';
import MAGService from '../services/MAGService';
import RemoteKey, { tapHaptic } from '../components/remote/RemoteKey';
import DPad from '../components/remote/DPad';
import Rocker from '../components/remote/Rocker';
import Touchpad from '../components/remote/Touchpad';
import TypeOnTvDialog from '../components/TypeOnTvDialog';
import { useVolumeButtons } from '../hooks/useVolumeButtons';
import { colors, radius, spacing } from '../theme/tokens';
import { t } from '../i18n';

type RemoteScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Remote'>;
type RemoteScreenRouteProp = RouteProp<RootStackParamList, 'Remote'>;

interface Props {
  navigation: RemoteScreenNavigationProp;
  route: RemoteScreenRouteProp;
}

const NUMBERS = [
  MAGCommand.NUM_1,
  MAGCommand.NUM_2,
  MAGCommand.NUM_3,
  MAGCommand.NUM_4,
  MAGCommand.NUM_5,
  MAGCommand.NUM_6,
  MAGCommand.NUM_7,
  MAGCommand.NUM_8,
  MAGCommand.NUM_9,
];

const supported = (command: MAGCommand) => MAGService.isCommandSupported(command);

const RemoteScreen: React.FC<Props> = ({ navigation, route }) => {
  const { settings } = useDevice();
  const haptics = settings.vibrationEnabled !== false;
  const [message, setMessage] = useState('');
  const [showNumbers, setShowNumbers] = useState(false);
  const [showText, setShowText] = useState(false);
  const [mode, setMode] = useState<'buttons' | 'touchpad'>('buttons');
  const touchpad = MAGService.supportsTouchpad();

  const send = useCallback(async (command: MAGCommand) => {
    if (!supported(command)) {
      setMessage(t('remote.unsupported'));
      return;
    }
    if (!(await MAGService.sendCommand(command))) {
      setMessage(t('remote.unreachable'));
    }
  }, []);

  const unreachable = useCallback(() => setMessage(t('remote.unreachable')), []);

  useVolumeButtons(
    settings.volumeButtons !== false,
    () => send(MAGCommand.VOL_UP),
    () => send(MAGCommand.VOL_DOWN),
  );

  useEffect(() => {
    navigation.setOptions({
      headerTitle: () => (
        <View style={styles.headerTitle}>
          <View style={styles.statusDot} />
          <Text style={styles.headerText} numberOfLines={1}>
            {route.params.deviceName}
          </Text>
        </View>
      ),
      headerRight: () => (
        <View style={styles.headerActions}>
          <Pressable
            onPress={() => setShowText(true)}
            style={styles.headerButton}
            accessibilityLabel={t('remote.typeOnTv')}
            hitSlop={6}>
            <Icon source="keyboard-outline" size={20} color={colors.textSecondary} />
          </Pressable>
          <Pressable
            onPress={() => {
              tapHaptic(haptics);
              send(MAGCommand.POWER);
            }}
            style={[styles.headerButton, !supported(MAGCommand.POWER) && styles.dimmed]}
            accessibilityLabel={t('key.power')}
            hitSlop={6}>
            <Icon source="power" size={20} color={colors.danger} />
          </Pressable>
        </View>
      ),
    });
  }, [navigation, route.params.deviceName, haptics, send]);

  useEffect(() => {
    if (!MAGService.isConnected()) {
      Alert.alert(t('remote.notConnectedTitle'), t('remote.notConnectedBody'), [
        { text: t('common.ok'), onPress: () => navigation.goBack() },
      ]);
    }
  }, [navigation]);

  const roundKey = (command: MAGCommand, icon: string, label: string) => (
    <View style={styles.roundKeyWrap}>
      <RemoteKey
        onPress={() => send(command)}
        dimmed={!supported(command)}
        haptics={haptics}
        accessibilityLabel={label}
        style={styles.roundKey}>
        <Icon source={icon} size={22} color={colors.text} />
      </RemoteKey>
      <Text style={styles.keyLabel}>{label}</Text>
    </View>
  );

  const playbackKey = (command: MAGCommand, icon: string, label: string) => (
    <RemoteKey
      onPress={() => send(command)}
      dimmed={!supported(command)}
      haptics={haptics}
      accessibilityLabel={label}
      style={styles.playKey}>
      <Icon source={icon} size={24} color={colors.text} />
    </RemoteKey>
  );

  const colourKey = (command: MAGCommand, color: string, label: string) => (
    <View style={styles.colourKeyWrap}>
      <RemoteKey
        onPress={() => send(command)}
        dimmed={!supported(command)}
        haptics={haptics}
        accessibilityLabel={label}
        pressedColor={color}
        style={styles.colourKeyHit}>
        <View style={[styles.colourBar, { backgroundColor: color }]} />
      </RemoteKey>
    </View>
  );

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        scrollEnabled={mode === 'buttons'}>
        {touchpad && (
          <View style={styles.segment}>
            {(['buttons', 'touchpad'] as const).map(item => (
              <Pressable
                key={item}
                onPress={() => setMode(item)}
                accessibilityRole="tab"
                accessibilityState={{ selected: mode === item }}
                style={[styles.segmentItem, mode === item && styles.segmentActive]}>
                <Icon
                  source={item === 'buttons' ? 'remote' : 'gesture-tap'}
                  size={16}
                  color={mode === item ? colors.text : colors.textMuted}
                />
                <Text style={[styles.segmentText, mode === item && styles.segmentTextActive]}>
                  {item === 'buttons' ? t('remote.buttons') : t('remote.touchpad')}
                </Text>
              </Pressable>
            ))}
          </View>
        )}

        {mode === 'touchpad' && touchpad ? (
          <Touchpad haptics={haptics} onError={unreachable} />
        ) : (
          <DPad onKey={send} haptics={haptics} />
        )}

        <View style={styles.systemRow}>
          {roundKey(MAGCommand.BACK, 'arrow-u-left-top', t('key.back'))}
          {roundKey(MAGCommand.MENU, 'home-outline', t('key.menu'))}
          {roundKey(MAGCommand.EXIT, 'close', t('key.exit'))}
          {roundKey(MAGCommand.INFO, 'information-outline', t('key.info'))}
        </View>

        <View style={styles.rockerRow}>
          <Rocker
            label="VOL"
            upLabel={t('key.volUp')}
            downLabel={t('key.volDown')}
            upIcon="plus"
            downIcon="minus"
            onUp={() => send(MAGCommand.VOL_UP)}
            onDown={() => send(MAGCommand.VOL_DOWN)}
            upDimmed={!supported(MAGCommand.VOL_UP)}
            downDimmed={!supported(MAGCommand.VOL_DOWN)}
            haptics={haptics}
          />
          <View style={styles.middleColumn}>
            <RemoteKey
              onPress={() => send(MAGCommand.MUTE)}
              dimmed={!supported(MAGCommand.MUTE)}
              haptics={haptics}
              accessibilityLabel={t('key.mute')}
              style={styles.roundKey}>
              <Icon source="volume-off" size={22} color={colors.text} />
            </RemoteKey>
            <RemoteKey
              onPress={() => setShowNumbers(true)}
              haptics={haptics}
              accessibilityLabel={t('remote.numberPad')}
              style={styles.numbersKey}>
              <Text style={styles.numbersText}>123</Text>
            </RemoteKey>
          </View>
          <Rocker
            label="CH"
            upLabel={t('key.chUp')}
            downLabel={t('key.chDown')}
            upIcon="chevron-up"
            downIcon="chevron-down"
            onUp={() => send(MAGCommand.CH_UP)}
            onDown={() => send(MAGCommand.CH_DOWN)}
            upDimmed={!supported(MAGCommand.CH_UP)}
            downDimmed={!supported(MAGCommand.CH_DOWN)}
            haptics={haptics}
          />
        </View>

        <View style={styles.playbackBar}>
          {playbackKey(MAGCommand.PREV, 'skip-previous', t('key.prev'))}
          {playbackKey(MAGCommand.REWIND, 'rewind', t('key.rewind'))}
          <RemoteKey
            onPress={() => send(MAGCommand.PLAY)}
            dimmed={!supported(MAGCommand.PLAY)}
            haptics={haptics}
            accessibilityLabel={t('remote.playPause')}
            pressedColor={colors.textSecondary}
            style={styles.playMain}>
            <Icon source="play-pause" size={26} color={colors.background} />
          </RemoteKey>
          {playbackKey(MAGCommand.FORWARD, 'fast-forward', t('key.forward'))}
          {playbackKey(MAGCommand.NEXT, 'skip-next', t('key.next'))}
        </View>

        <View style={styles.colourRow}>
          {colourKey(MAGCommand.RED, colors.keyRed, t('key.red'))}
          {colourKey(MAGCommand.GREEN, colors.keyGreen, t('key.green'))}
          {colourKey(MAGCommand.YELLOW, colors.keyYellow, t('key.yellow'))}
          {colourKey(MAGCommand.BLUE, colors.keyBlue, t('key.blue'))}
        </View>
      </ScrollView>

      <Portal>
        <Modal
          visible={showNumbers}
          onDismiss={() => setShowNumbers(false)}
          contentContainerStyle={styles.sheet}>
          <View style={styles.sheetHandle} />
          <View style={styles.numGrid}>
            {NUMBERS.map((command, i) => (
              <RemoteKey
                key={command}
                onPress={() => send(command)}
                haptics={haptics}
                accessibilityLabel={String(i + 1)}
                style={styles.numKey}>
                <Text style={styles.numText}>{i + 1}</Text>
              </RemoteKey>
            ))}
            <RemoteKey
              onPress={() => send(MAGCommand.BACK)}
              haptics={haptics}
              accessibilityLabel={t('key.back')}
              style={[styles.numKey, styles.numKeyQuiet]}>
              <Icon source="backspace-outline" size={22} color={colors.textSecondary} />
            </RemoteKey>
            <RemoteKey
              onPress={() => send(MAGCommand.NUM_0)}
              haptics={haptics}
              accessibilityLabel="0"
              style={styles.numKey}>
              <Text style={styles.numText}>0</Text>
            </RemoteKey>
            <RemoteKey
              onPress={() => send(MAGCommand.OK)}
              haptics={haptics}
              accessibilityLabel="OK"
              pressedColor={colors.accentPressed}
              style={[styles.numKey, styles.numKeyAccent]}>
              <Text style={[styles.numText, styles.numOkText]}>OK</Text>
            </RemoteKey>
          </View>
          <Button
            mode="text"
            onPress={() => setShowNumbers(false)}
            textColor={colors.textSecondary}
            style={styles.sheetDone}>
            {t('common.done')}
          </Button>
        </Modal>

        <TypeOnTvDialog visible={showText} onClose={() => setShowText(false)} />

        <Snackbar
          visible={message !== ''}
          onDismiss={() => setMessage('')}
          duration={2500}
          style={styles.snackbar}>
          {message}
        </Snackbar>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    alignItems: 'center',
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
    paddingHorizontal: spacing.xl,
    gap: spacing.xl,
  },
  headerTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: 220,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success,
    marginRight: spacing.sm,
  },
  headerText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginRight: spacing.lg,
  },
  headerButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.control,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dimmed: {
    opacity: 0.35,
  },
  segment: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    padding: 3,
  },
  segmentItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: radius.pill,
  },
  segmentActive: {
    backgroundColor: colors.controlPressed,
  },
  segmentText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  segmentTextActive: {
    color: colors.text,
  },
  systemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignSelf: 'stretch',
    paddingHorizontal: spacing.sm,
  },
  roundKeyWrap: {
    alignItems: 'center',
    gap: 6,
  },
  roundKey: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.control,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyLabel: {
    fontSize: 11,
    color: colors.textMuted,
  },
  rockerRow: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  middleColumn: {
    alignItems: 'center',
    gap: spacing.md,
  },
  numbersKey: {
    width: 76,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.control,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numbersText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 1,
  },
  playbackBar: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  playKey: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playMain: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colourRow: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    gap: spacing.sm,
  },
  colourKeyWrap: {
    flex: 1,
  },
  colourKeyHit: {
    height: 32,
    borderRadius: radius.sm,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  colourBar: {
    height: 8,
    borderRadius: 4,
  },
  sheet: {
    marginTop: 'auto',
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginBottom: spacing.lg,
  },
  numGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: spacing.md,
  },
  numKey: {
    width: 96,
    height: 60,
    borderRadius: radius.lg,
    backgroundColor: colors.control,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numKeyQuiet: {
    backgroundColor: 'transparent',
  },
  numKeyAccent: {
    backgroundColor: colors.accent,
  },
  numText: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '500',
  },
  numOkText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
  sheetDone: {
    marginTop: spacing.md,
  },
  snackbar: {
    backgroundColor: colors.control,
  },
});

export default RemoteScreen;
