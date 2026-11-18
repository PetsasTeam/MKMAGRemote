/**
 * Sheet for creating or editing a macro: name it, pick a speed, tap keys to
 * add steps (tap a step to remove it), and try it on the TV before saving.
 */
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Icon } from 'react-native-paper';
import { MAGCommand, MAGDevice, Macro } from '../types';
import { SPEEDS, Speed, speedOf } from '../services/MacroService';
import { commandInfo } from '../services/commandInfo';
import { colors, radius, spacing, type } from '../theme/tokens';
import { t } from '../i18n';
import KeyPalette from './KeyPalette';

const MAX_STEPS = 40;

interface Props {
  /** Macro to edit, a blank one to create, or null when closed. */
  macro: Macro | null;
  device: MAGDevice | null;
  onSave: (macro: Macro) => void;
  onClose: () => void;
  /** Runs the steps on the TV and resolves with a short result message. */
  onTry: (commands: MAGCommand[], delay: number) => Promise<string>;
}

const SPEED_LABELS: Record<Speed, string> = {
  fast: t('macros.fast'),
  normal: t('macros.normal'),
  slow: t('macros.slow'),
};

const MacroEditor: React.FC<Props> = ({ macro, device, onSave, onClose, onTry }) => {
  const [name, setName] = useState('');
  const [steps, setSteps] = useState<MAGCommand[]>([]);
  const [speed, setSpeed] = useState<Speed>('normal');
  const [trying, setTrying] = useState(false);
  const [tryResult, setTryResult] = useState('');

  useEffect(() => {
    if (macro) {
      setName(macro.name);
      setSteps(macro.commands);
      setSpeed(speedOf(macro.delay));
      setTryResult('');
    }
  }, [macro]);

  const canSave = name.trim() !== '' && steps.length > 0;

  const save = () => {
    if (macro && canSave) {
      onSave({ ...macro, name: name.trim(), commands: steps, delay: SPEEDS[speed] });
    }
  };

  const tryIt = async () => {
    setTrying(true);
    setTryResult('');
    setTryResult(await onTry(steps, SPEEDS[speed]));
    setTrying(false);
  };

  return (
    <Modal
      visible={macro !== null}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}>
      <View style={styles.sheet}>
        <View style={styles.header}>
          <Pressable onPress={onClose} hitSlop={8}>
            <Text style={styles.headerAction}>{t('common.cancel')}</Text>
          </Pressable>
          <Text style={styles.headerTitle}>
            {macro && macro.commands.length > 0 ? t('macros.edit') : t('macros.new')}
          </Text>
          <Pressable onPress={save} disabled={!canSave} hitSlop={8}>
            <Text style={[styles.headerAction, styles.save, !canSave && styles.disabled]}>
              {t('common.save')}
            </Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder={t('macros.namePlaceholder')}
            placeholderTextColor={colors.textMuted}
            style={styles.nameInput}
            returnKeyType="done"
            maxLength={40}
          />

          <Text style={styles.sectionLabel}>{t('macros.speed')}</Text>
          <View style={styles.segment}>
            {(Object.keys(SPEEDS) as Speed[]).map(option => (
              <Pressable
                key={option}
                onPress={() => setSpeed(option)}
                style={[styles.segmentItem, speed === option && styles.segmentActive]}>
                <Text style={[styles.segmentText, speed === option && styles.segmentTextActive]}>
                  {SPEED_LABELS[option]}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.stepsHeader}>
            <Text style={styles.sectionLabel}>
              STEPS{steps.length > 0 ? ` · ${steps.length}` : ''}
            </Text>
            {steps.length > 0 && (
              <Pressable onPress={() => setSteps([])} hitSlop={8}>
                <Text style={styles.clear}>{t('macros.clear')}</Text>
              </Pressable>
            )}
          </View>
          <View style={styles.steps}>
            {steps.length === 0 ? (
              <Text style={styles.hint}>{t('macros.tapKeys')}</Text>
            ) : (
              steps.map((command, i) => (
                <Pressable
                  key={`${i}-${command}`}
                  onPress={() => setSteps(prev => prev.filter((_, j) => j !== i))}
                  accessibilityLabel={t('macros.removeStep', {
                    index: i + 1,
                    name: commandInfo(command).label,
                  })}
                  style={styles.step}>
                  <Text style={styles.stepIndex}>{i + 1}</Text>
                  <Text style={styles.stepText}>{commandInfo(command).label}</Text>
                  <Icon source="close" size={14} color={colors.textMuted} />
                </Pressable>
              ))
            )}
          </View>

          {steps.length > 0 && (
            <View style={styles.tryRow}>
              <Pressable
                onPress={tryIt}
                disabled={trying}
                style={({ pressed }) => [styles.tryButton, pressed && styles.tryPressed]}>
                {trying ? (
                  <ActivityIndicator color={colors.accentText} />
                ) : (
                  <Icon source="play" size={18} color={colors.accentText} />
                )}
                <Text style={styles.tryText}>{t('macros.tryOnTv')}</Text>
              </Pressable>
              {tryResult !== '' && <Text style={styles.tryResult}>{tryResult}</Text>}
            </View>
          )}

          <Text style={[styles.sectionLabel, styles.keysLabel]}>{t('macros.keys')}</Text>
          <KeyPalette
            device={device}
            onPick={command =>
              setSteps(prev => (prev.length < MAX_STEPS ? [...prev, command] : prev))
            }
          />
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  sheet: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    ...type.heading,
  },
  headerAction: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  save: {
    color: colors.accentText,
    fontWeight: '600',
  },
  disabled: {
    opacity: 0.35,
  },
  body: {
    padding: spacing.lg,
    paddingBottom: 60,
  },
  nameInput: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    fontSize: 17,
    color: colors.text,
    marginBottom: spacing.xl,
  },
  sectionLabel: {
    ...type.label,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  segment: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 3,
    marginBottom: spacing.xl,
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
  stepsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  clear: {
    color: colors.danger,
    fontSize: 13,
    marginBottom: spacing.sm,
  },
  steps: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    minHeight: 52,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  hint: {
    color: colors.textMuted,
    fontSize: 14,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.control,
    borderRadius: radius.pill,
    paddingLeft: 4,
    paddingRight: 10,
    paddingVertical: 4,
  },
  stepIndex: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: colors.accentSoft,
    color: colors.accentText,
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 20,
  },
  stepText: {
    color: colors.text,
    fontSize: 13,
  },
  tryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  tryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.accentSoft,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: 9,
  },
  tryPressed: {
    opacity: 0.7,
  },
  tryText: {
    color: colors.accentText,
    fontSize: 14,
    fontWeight: '600',
  },
  tryResult: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: 13,
  },
  keysLabel: {
    marginTop: spacing.xl,
  },
});

export default MacroEditor;
