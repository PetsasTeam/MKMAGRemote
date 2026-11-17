/**
 * Macros Screen
 * Chains of keys sent with one tap. Tap a macro to run it on your box,
 * long-press to edit or delete it.
 */
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Button, Icon, Snackbar } from 'react-native-paper';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../App';
import { useDevice } from '../context/DeviceContext';
import { useShortcutTarget } from '../hooks/useShortcutTarget';
import { MAGCommand, Macro } from '../types';
import MacroService, { describeResult } from '../services/MacroService';
import { commandInfo } from '../services/commandInfo';
import MacroEditor from '../components/MacroEditor';
import { colors, radius, spacing, type } from '../theme/tokens';

type MacrosScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Macros'>;

interface Props {
  navigation: MacrosScreenNavigationProp;
}

const newMacro = (): Macro => ({ id: `macro-${Date.now()}`, name: '', commands: [] });

const MacrosScreen: React.FC<Props> = ({ navigation }) => {
  const { settings, updateSettings } = useDevice();
  const { target, ensureConnected } = useShortcutTarget();
  const [editing, setEditing] = useState<Macro | null>(null);
  const [running, setRunning] = useState<{ id: string; step: number } | null>(null);
  const [message, setMessage] = useState('');
  const macros = settings.macros ?? [];

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable
          onPress={() => setEditing(newMacro())}
          style={styles.headerButton}
          accessibilityLabel="New macro"
          hitSlop={6}>
          <Icon source="plus" size={22} color={colors.text} />
        </Pressable>
      ),
    });
  }, [navigation]);

  const connectOrExplain = async (): Promise<boolean> => {
    if (!target) {
      setMessage('Add a box first');
      return false;
    }
    if (!(await ensureConnected())) {
      setMessage(`Couldn't connect to ${target.name}`);
      return false;
    }
    return true;
  };

  const run = async (macro: Macro) => {
    if (running) {
      return;
    }
    setRunning({ id: macro.id, step: 0 });
    if (await connectOrExplain()) {
      const result = await MacroService.runMacro(macro, step => setRunning({ id: macro.id, step }));
      setMessage(`${macro.name}: ${describeResult(result)}`);
    }
    setRunning(null);
  };

  const tryInEditor = async (commands: MAGCommand[], delay: number) => {
    if (!(await connectOrExplain())) {
      return target ? `Couldn't connect to ${target.name}` : 'Add a box first';
    }
    return describeResult(await MacroService.run(commands, delay));
  };

  const save = (macro: Macro) => {
    const exists = macros.some(m => m.id === macro.id);
    updateSettings({
      macros: exists ? macros.map(m => (m.id === macro.id ? macro : m)) : [...macros, macro],
    });
    setEditing(null);
  };

  const showOptions = (macro: Macro) => {
    Alert.alert(macro.name, undefined, [
      { text: 'Edit', onPress: () => setEditing(macro) },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => updateSettings({ macros: macros.filter(m => m.id !== macro.id) }),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const addStarters = () => {
    const have = new Set(macros.map(m => m.id));
    updateSettings({
      macros: [...macros, ...MacroService.starterMacros().filter(m => !have.has(m.id))],
    });
  };

  const renderMacro = ({ item }: { item: Macro }) => {
    const isRunning = running?.id === item.id;
    return (
      <Pressable
        onPress={() => run(item)}
        onLongPress={() => showOptions(item)}
        accessibilityRole="button"
        accessibilityHint="Runs the macro. Long-press to edit or delete."
        style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}>
        <View style={styles.tile}>
          <Icon source="lightning-bolt-outline" size={22} color={colors.accentText} />
        </View>
        <View style={styles.rowText}>
          <Text style={styles.rowTitle} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.rowSubtitle} numberOfLines={1}>
            {item.commands.map(c => commandInfo(c).label).join(' · ')}
          </Text>
        </View>
        {isRunning ? (
          <View style={styles.progress}>
            <ActivityIndicator color={colors.accentText} size="small" />
            <Text style={styles.progressText}>
              {Math.min(running.step + 1, item.commands.length)}/{item.commands.length}
            </Text>
          </View>
        ) : (
          <View style={styles.runButton}>
            <Icon source="play" size={18} color={colors.text} />
          </View>
        )}
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.subtitle}>
        {target ? `Runs on ${target.name}` : 'Add a box on the Devices screen first'}
      </Text>

      {macros.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <Icon source="lightning-bolt-outline" size={36} color={colors.accentText} />
          </View>
          <Text style={styles.emptyTitle}>Create your first macro</Text>
          <Text style={styles.emptyBody}>
            Chain keys into one tap, like going back to the menu or skipping three channels.
          </Text>
          <Button
            mode="contained"
            onPress={() => setEditing(newMacro())}
            style={styles.primaryButton}
            contentStyle={styles.buttonContent}
            labelStyle={styles.buttonLabel}>
            New macro
          </Button>
          <Button mode="text" onPress={addStarters} textColor={colors.textSecondary}>
            Add starter macros
          </Button>
        </View>
      ) : (
        <FlatList
          data={macros}
          renderItem={renderMacro}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={Separator}
          ListFooterComponent={
            <Text style={styles.footnote}>Tap to run · long-press to edit or delete</Text>
          }
        />
      )}

      <MacroEditor
        macro={editing}
        device={target}
        onSave={save}
        onClose={() => setEditing(null)}
        onTry={tryInEditor}
      />

      <Snackbar
        visible={message !== ''}
        onDismiss={() => setMessage('')}
        duration={3000}
        style={styles.snackbar}>
        {message}
      </Snackbar>
    </View>
  );
};

const Separator = () => <View style={styles.separator} />;

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
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
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
  runButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.control,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progress: {
    alignItems: 'center',
    minWidth: 36,
  },
  progressText: {
    color: colors.accentText,
    fontSize: 11,
    marginTop: 2,
  },
  footnote: {
    ...type.caption,
    textAlign: 'center',
    marginTop: spacing.lg,
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
  snackbar: {
    backgroundColor: colors.control,
  },
});

export default MacrosScreen;
