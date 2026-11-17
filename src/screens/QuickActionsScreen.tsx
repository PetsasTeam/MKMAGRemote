/**
 * Quick Actions Screen
 * One-tap shortcuts: favourite channels (sends the channel number, then OK)
 * and pinned keys. Long-press any shortcut to remove it.
 */
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Button, Icon, Snackbar } from 'react-native-paper';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../App';
import { useDevice } from '../context/DeviceContext';
import { useShortcutTarget } from '../hooks/useShortcutTarget';
import { MAGCommand, QuickAction } from '../types';
import MAGService from '../services/MAGService';
import MacroService, { channelCommands, describeResult } from '../services/MacroService';
import { commandInfo } from '../services/commandInfo';
import KeyPalette from '../components/KeyPalette';
import { tapHaptic } from '../components/remote/RemoteKey';
import { colors, radius, spacing, type } from '../theme/tokens';

type QuickActionsScreenNavigationProp = StackNavigationProp<RootStackParamList, 'QuickActions'>;

interface Props {
  navigation: QuickActionsScreenNavigationProp;
}

type AddMode = 'channel' | 'key';

const isChannel = (action: QuickAction) => action.kind === 'channel';

const QuickActionsScreen: React.FC<Props> = ({ navigation }) => {
  const { settings, updateSettings } = useDevice();
  const { target, ensureConnected } = useShortcutTarget();
  const [adding, setAdding] = useState<AddMode | null>(null);
  const [channelName, setChannelName] = useState('');
  const [channelNumber, setChannelNumber] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  // Saved shortcuts that can still do something (old versions stored placeholders).
  const actions = (settings.quickActions ?? []).filter(a =>
    isChannel(a) ? !!a.channel : a.command !== undefined,
  );
  const channels = actions.filter(isChannel);
  const keys = actions.filter(a => !isChannel(a));

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable
          onPress={() => setAdding('channel')}
          style={styles.headerButton}
          accessibilityLabel="Add a shortcut"
          hitSlop={6}>
          <Icon source="plus" size={22} color={colors.text} />
        </Pressable>
      ),
    });
  }, [navigation]);

  const save = (list: QuickAction[]) => updateSettings({ quickActions: list });

  const run = async (action: QuickAction) => {
    if (busyId) {
      return;
    }
    tapHaptic(settings.vibrationEnabled !== false);
    if (!target) {
      setMessage('Add a box first');
      return;
    }
    setBusyId(action.id);
    try {
      if (!(await ensureConnected())) {
        setMessage(`Couldn't connect to ${target.name}`);
        return;
      }
      if (isChannel(action)) {
        const result = await MacroService.goToChannel(action.channel ?? '');
        setMessage(
          result.failed || result.skipped.length > 0
            ? `${action.name}: ${describeResult(result)}`
            : `${action.name} · ${action.channel}`,
        );
      } else {
        const command = action.command as MAGCommand;
        if (!MAGService.isCommandSupported(command)) {
          setMessage(`This box doesn't support ${commandInfo(command).label}`);
        } else if (!(await MAGService.sendCommand(command))) {
          setMessage("Couldn't reach the box");
        }
      }
    } finally {
      setBusyId(null);
    }
  };

  const remove = (action: QuickAction) => {
    Alert.alert(`Remove ${action.name}?`, undefined, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => save((settings.quickActions ?? []).filter(a => a.id !== action.id)),
      },
    ]);
  };

  const closeAdd = () => {
    setAdding(null);
    setChannelName('');
    setChannelNumber('');
  };

  const channelValid = channelName.trim() !== '' && channelCommands(channelNumber).length > 0;

  const addChannel = () => {
    if (!channelValid) {
      return;
    }
    save([
      ...(settings.quickActions ?? []),
      {
        id: `channel-${Date.now()}`,
        kind: 'channel',
        name: channelName.trim(),
        channel: channelNumber.trim(),
      },
    ]);
    closeAdd();
  };

  const pinKey = (command: MAGCommand) => {
    save([
      ...(settings.quickActions ?? []),
      { id: `key-${Date.now()}`, kind: 'key', name: commandInfo(command).label, command },
    ]);
    closeAdd();
  };

  const keyDimmed = (action: QuickAction) =>
    !MAGService.isCommandSupportedFor(target, action.command as MAGCommand);

  return (
    <View style={styles.container}>
      <Text style={styles.subtitle}>
        {target ? `Sends to ${target.name}` : 'Add a box on the Devices screen first'}
      </Text>

      {actions.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <Icon source="star-outline" size={36} color={colors.accentText} />
          </View>
          <Text style={styles.emptyTitle}>Your one-tap shortcuts</Text>
          <Text style={styles.emptyBody}>
            Save favourite channels to jump straight to them, or pin keys you use a lot.
          </Text>
          <Button
            mode="contained"
            onPress={() => setAdding('channel')}
            style={styles.primaryButton}
            contentStyle={styles.buttonContent}
            labelStyle={styles.buttonLabel}>
            Add a channel
          </Button>
          <Button mode="text" onPress={() => setAdding('key')} textColor={colors.textSecondary}>
            Pin a key
          </Button>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {channels.length > 0 && (
            <>
              <Text style={styles.sectionLabel}>CHANNELS</Text>
              <View style={styles.channelGrid}>
                {channels.map(action => (
                  <Pressable
                    key={action.id}
                    onPress={() => run(action)}
                    onLongPress={() => remove(action)}
                    accessibilityRole="button"
                    accessibilityLabel={`Go to ${action.name}, channel ${action.channel}`}
                    style={({ pressed }) => [
                      styles.channelCard,
                      (pressed || busyId === action.id) && styles.cardPressed,
                    ]}>
                    <Text style={styles.channelNumber}>{action.channel}</Text>
                    <Text style={styles.channelName} numberOfLines={1}>
                      {action.name}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </>
          )}

          {keys.length > 0 && (
            <>
              <Text style={[styles.sectionLabel, styles.sectionGap]}>KEYS</Text>
              <View style={styles.keyGrid}>
                {keys.map(action => {
                  const info = commandInfo(action.command as MAGCommand);
                  return (
                    <Pressable
                      key={action.id}
                      onPress={() => run(action)}
                      onLongPress={() => remove(action)}
                      accessibilityRole="button"
                      accessibilityLabel={info.label}
                      style={[styles.keyWrap, keyDimmed(action) && styles.dimmed]}>
                      {({ pressed }) => (
                        <>
                          <View style={[styles.key, pressed && styles.cardPressed]}>
                            <Icon source={info.icon} size={24} color={colors.text} />
                          </View>
                          <Text style={styles.keyLabel} numberOfLines={1}>
                            {info.label}
                          </Text>
                        </>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            </>
          )}

          <Text style={styles.footnote}>Long-press a shortcut to remove it</Text>
        </ScrollView>
      )}

      <Modal
        visible={adding !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeAdd}>
        <View style={styles.sheet}>
          <View style={styles.sheetHeader}>
            <Pressable onPress={closeAdd} hitSlop={8}>
              <Text style={styles.sheetAction}>Cancel</Text>
            </Pressable>
            <Text style={styles.sheetTitle}>Add shortcut</Text>
            <Pressable
              onPress={addChannel}
              disabled={adding !== 'channel' || !channelValid}
              hitSlop={8}>
              <Text
                style={[
                  styles.sheetAction,
                  styles.sheetSave,
                  (adding !== 'channel' || !channelValid) && styles.hidden,
                ]}>
                Save
              </Text>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.sheetBody} keyboardShouldPersistTaps="handled">
            <View style={styles.segment}>
              {(['channel', 'key'] as AddMode[]).map(mode => (
                <Pressable
                  key={mode}
                  onPress={() => setAdding(mode)}
                  style={[styles.segmentItem, adding === mode && styles.segmentActive]}>
                  <Text style={[styles.segmentText, adding === mode && styles.segmentTextActive]}>
                    {mode === 'channel' ? 'Channel' : 'Key'}
                  </Text>
                </Pressable>
              ))}
            </View>

            {adding === 'channel' ? (
              <>
                <TextInput
                  value={channelName}
                  onChangeText={setChannelName}
                  placeholder="Name, like “BBC One”"
                  placeholderTextColor={colors.textMuted}
                  style={styles.input}
                  maxLength={30}
                  autoFocus
                />
                <TextInput
                  value={channelNumber}
                  onChangeText={value => setChannelNumber(value.replace(/\D/g, '').slice(0, 5))}
                  placeholder="Channel number, like 101"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="number-pad"
                  style={styles.input}
                />
                <Text style={styles.help}>
                  Tapping it types the number on the box, then presses OK.
                </Text>
              </>
            ) : (
              <>
                <Text style={styles.help}>Tap a key to pin it.</Text>
                <KeyPalette device={target} onPick={pinKey} />
              </>
            )}
          </ScrollView>
        </View>
      </Modal>

      <Snackbar
        visible={message !== ''}
        onDismiss={() => setMessage('')}
        duration={2500}
        style={styles.snackbar}>
        {message}
      </Snackbar>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.control,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.lg,
  },
  subtitle: {
    ...type.caption,
    fontSize: 13,
    marginHorizontal: spacing.xl,
    marginBottom: spacing.lg,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  sectionLabel: {
    ...type.label,
    fontWeight: '600',
    marginHorizontal: spacing.sm,
    marginBottom: spacing.sm,
  },
  sectionGap: {
    marginTop: spacing.xl,
  },
  channelGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  channelCard: {
    width: '48.5%',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  cardPressed: {
    backgroundColor: colors.controlPressed,
  },
  channelNumber: {
    color: colors.accentText,
    fontSize: 26,
    fontWeight: '600',
    letterSpacing: -0.5,
  },
  channelName: {
    ...type.body,
    fontWeight: '500',
    marginTop: 4,
  },
  keyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.lg,
    paddingHorizontal: spacing.sm,
  },
  keyWrap: {
    alignItems: 'center',
    gap: 6,
    width: 64,
  },
  key: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.control,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyLabel: {
    fontSize: 11,
    color: colors.textMuted,
  },
  dimmed: {
    opacity: 0.35,
  },
  footnote: {
    ...type.caption,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
    paddingBottom: 80,
  },
  emptyIcon: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  emptyTitle: {
    ...type.heading,
    fontSize: 20,
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
  sheet: {
    flex: 1,
    backgroundColor: colors.background,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  sheetTitle: {
    ...type.heading,
  },
  sheetAction: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  sheetSave: {
    color: colors.accentText,
    fontWeight: '600',
  },
  hidden: {
    opacity: 0.35,
  },
  sheetBody: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  segment: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 3,
    marginBottom: spacing.sm,
  },
  segmentItem: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: radius.sm,
    alignItems: 'center',
  },
  segmentActive: {
    backgroundColor: colors.controlPressed,
  },
  segmentText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
  segmentTextActive: {
    color: colors.text,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    fontSize: 17,
    color: colors.text,
  },
  help: {
    color: colors.textSecondary,
    fontSize: 14,
    marginHorizontal: spacing.xs,
  },
  snackbar: {
    backgroundColor: colors.control,
  },
});

export default QuickActionsScreen;
