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
import { t } from '../i18n';

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
          accessibilityLabel={t('quick.add')}
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
      setMessage(t('shortcut.addBoxFirst'));
      return;
    }
    setBusyId(action.id);
    try {
      if (!(await ensureConnected())) {
        setMessage(t('shortcut.couldntConnect', { name: target.name }));
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
          setMessage(t('quick.unsupported', { name: commandInfo(command).label }));
        } else if (!(await MAGService.sendCommand(command))) {
          setMessage(t('shortcut.couldntReach'));
        }
      }
    } finally {
      setBusyId(null);
    }
  };

  const remove = (action: QuickAction) => {
    Alert.alert(t('quick.removeTitle', { name: action.name }), undefined, [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.remove'),
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
        {target ? t('quick.sendsTo', { name: target.name }) : t('shortcut.addBoxOnDevices')}
      </Text>

      {actions.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <Icon source="star-outline" size={36} color={colors.accentText} />
          </View>
          <Text style={styles.emptyTitle}>{t('quick.emptyTitle')}</Text>
          <Text style={styles.emptyBody}>{t('quick.emptyBody')}</Text>
          <Button
            mode="contained"
            onPress={() => setAdding('channel')}
            style={styles.primaryButton}
            contentStyle={styles.buttonContent}
            labelStyle={styles.buttonLabel}>
            {t('quick.addChannel')}
          </Button>
          <Button mode="text" onPress={() => setAdding('key')} textColor={colors.textSecondary}>
            {t('quick.pinKey')}
          </Button>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {channels.length > 0 && (
            <>
              <Text style={styles.sectionLabel}>{t('quick.channels')}</Text>
              <View style={styles.channelGrid}>
                {channels.map(action => (
                  <Pressable
                    key={action.id}
                    onPress={() => run(action)}
                    onLongPress={() => remove(action)}
                    accessibilityRole="button"
                    accessibilityLabel={t('quick.goTo', {
                      name: action.name,
                      channel: action.channel ?? '',
                    })}
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
              <Text style={[styles.sectionLabel, styles.sectionGap]}>{t('quick.keys')}</Text>
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

          <Text style={styles.footnote}>{t('quick.footnote')}</Text>
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
              <Text style={styles.sheetAction}>{t('common.cancel')}</Text>
            </Pressable>
            <Text style={styles.sheetTitle}>{t('quick.addTitle')}</Text>
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
                {t('common.save')}
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
                    {mode === 'channel' ? t('quick.channel') : t('quick.key')}
                  </Text>
                </Pressable>
              ))}
            </View>

            {adding === 'channel' ? (
              <>
                <TextInput
                  value={channelName}
                  onChangeText={setChannelName}
                  placeholder={t('quick.namePlaceholder')}
                  placeholderTextColor={colors.textMuted}
                  style={styles.input}
                  maxLength={30}
                  autoFocus
                />
                <TextInput
                  value={channelNumber}
                  onChangeText={value => setChannelNumber(value.replace(/\D/g, '').slice(0, 5))}
                  placeholder={t('quick.numberPlaceholder')}
                  placeholderTextColor={colors.textMuted}
                  keyboardType="number-pad"
                  style={styles.input}
                />
                <Text style={styles.help}>{t('quick.channelHelp')}</Text>
              </>
            ) : (
              <>
                <Text style={styles.help}>{t('quick.keyHelp')}</Text>
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
