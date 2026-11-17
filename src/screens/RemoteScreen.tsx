/**
 * Remote Screen
 * One-handed remote: circular D-pad up top, system keys, volume and channel
 * rockers, playback and colour keys. Numbers and text entry open on demand.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Dialog, Icon, Modal, Portal, Snackbar, TextInput } from 'react-native-paper';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../App';
import { useDevice } from '../context/DeviceContext';
import { MAGCommand } from '../types';
import MAGService from '../services/MAGService';
import RemoteKey, { tapHaptic } from '../components/remote/RemoteKey';
import DPad from '../components/remote/DPad';
import Rocker from '../components/remote/Rocker';
import { useKeyboardHeight } from '../hooks/useKeyboardHeight';
import { colors, radius, spacing } from '../theme/tokens';

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
  const [text, setText] = useState('');
  const keyboardHeight = useKeyboardHeight();

  const send = useCallback(async (command: MAGCommand) => {
    if (!supported(command)) {
      setMessage("This box doesn't support that key over Wi-Fi");
      return;
    }
    if (!(await MAGService.sendCommand(command))) {
      setMessage("Couldn't reach the box. Check it's on and on the same Wi-Fi.");
    }
  }, []);

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
            accessibilityLabel="Type text on TV"
            hitSlop={6}>
            <Icon source="keyboard-outline" size={20} color={colors.textSecondary} />
          </Pressable>
          <Pressable
            onPress={() => {
              tapHaptic(haptics);
              send(MAGCommand.POWER);
            }}
            style={[styles.headerButton, !supported(MAGCommand.POWER) && styles.dimmed]}
            accessibilityLabel="Power"
            hitSlop={6}>
            <Icon source="power" size={20} color={colors.danger} />
          </Pressable>
        </View>
      ),
    });
  }, [navigation, route.params.deviceName, haptics, send]);

  useEffect(() => {
    if (!MAGService.isConnected()) {
      Alert.alert('Not connected', 'Connect to your MAG box again.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    }
  }, [navigation]);

  const sendText = async () => {
    const value = text;
    setShowText(false);
    setText('');
    if (value) {
      setMessage((await MAGService.sendText(value)) ? 'Sent to TV' : "Couldn't send the text");
    }
  };

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
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <DPad onKey={send} haptics={haptics} />

        <View style={styles.systemRow}>
          {roundKey(MAGCommand.BACK, 'arrow-u-left-top', 'Back')}
          {roundKey(MAGCommand.MENU, 'home-outline', 'Menu')}
          {roundKey(MAGCommand.EXIT, 'close', 'Exit')}
          {roundKey(MAGCommand.INFO, 'information-outline', 'Info')}
        </View>

        <View style={styles.rockerRow}>
          <Rocker
            label="VOL"
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
              accessibilityLabel="Mute"
              style={styles.roundKey}>
              <Icon source="volume-off" size={22} color={colors.text} />
            </RemoteKey>
            <RemoteKey
              onPress={() => setShowNumbers(true)}
              haptics={haptics}
              accessibilityLabel="Number pad"
              style={styles.numbersKey}>
              <Text style={styles.numbersText}>123</Text>
            </RemoteKey>
          </View>
          <Rocker
            label="CH"
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
          {playbackKey(MAGCommand.PREV, 'skip-previous', 'Previous')}
          {playbackKey(MAGCommand.REWIND, 'rewind', 'Rewind')}
          <RemoteKey
            onPress={() => send(MAGCommand.PLAY)}
            dimmed={!supported(MAGCommand.PLAY)}
            haptics={haptics}
            accessibilityLabel="Play or pause"
            pressedColor={colors.textSecondary}
            style={styles.playMain}>
            <Icon source="play-pause" size={26} color={colors.background} />
          </RemoteKey>
          {playbackKey(MAGCommand.FORWARD, 'fast-forward', 'Fast forward')}
          {playbackKey(MAGCommand.NEXT, 'skip-next', 'Next')}
        </View>

        <View style={styles.colourRow}>
          {colourKey(MAGCommand.RED, colors.keyRed, 'Red')}
          {colourKey(MAGCommand.GREEN, colors.keyGreen, 'Green')}
          {colourKey(MAGCommand.YELLOW, colors.keyYellow, 'Yellow')}
          {colourKey(MAGCommand.BLUE, colors.keyBlue, 'Blue')}
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
              accessibilityLabel="Back"
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
            Done
          </Button>
        </Modal>

        <Dialog
          visible={showText}
          onDismiss={() => setShowText(false)}
          style={[styles.dialog, { marginBottom: keyboardHeight }]}>
          <Dialog.Title style={styles.dialogTitle}>Type on TV</Dialog.Title>
          <Dialog.Content>
            <TextInput
              mode="outlined"
              value={text}
              onChangeText={setText}
              placeholder="Search, URL or login"
              autoFocus
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="send"
              onSubmitEditing={sendText}
              outlineColor={colors.border}
              activeOutlineColor={colors.accent}
              textColor={colors.text}
              style={styles.dialogInput}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowText(false)} textColor={colors.textSecondary}>
              Cancel
            </Button>
            <Button onPress={sendText} textColor={colors.accentText}>
              Send
            </Button>
          </Dialog.Actions>
        </Dialog>

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
  dialog: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
  },
  dialogTitle: {
    color: colors.text,
  },
  dialogInput: {
    backgroundColor: colors.background,
  },
  snackbar: {
    backgroundColor: colors.control,
  },
});

export default RemoteScreen;
