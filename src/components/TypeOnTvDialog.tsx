/**
 * Live typing on the TV: every character you type is sent as you type it,
 * deleting sends Backspace, and Return presses Enter on the box. Sends go
 * through one queue so characters always arrive in order.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Dialog, Icon, Portal } from 'react-native-paper';
import { MAGCommand } from '../types';
import MAGService from '../services/MAGService';
import { useKeyboardHeight } from '../hooks/useKeyboardHeight';
import { colors, radius, spacing } from '../theme/tokens';
import { t } from '../i18n';
import { textEdits } from '../services/textEdits';

interface Props {
  visible: boolean;
  onClose: () => void;
}

const TypeOnTvDialog: React.FC<Props> = ({ visible, onClose }) => {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const sent = useRef('');
  const queue = useRef<Promise<void>>(Promise.resolve());
  const keyboardHeight = useKeyboardHeight();

  useEffect(() => {
    if (visible) {
      setValue('');
      setError('');
      sent.current = '';
    }
  }, [visible]);

  /** Run `task` after everything sent before it. */
  const enqueue = (task: () => Promise<boolean>) => {
    queue.current = queue.current.then(async () => {
      if (!(await task())) {
        setError(t('type.error'));
      }
    });
    return queue.current;
  };

  const backspace = (times: number) => {
    for (let i = 0; i < times; i++) {
      enqueue(() => MAGService.sendCommand(MAGCommand.BACK));
    }
  };

  const onChange = (next: string) => {
    const { deletes, insert } = textEdits(sent.current, next);
    sent.current = next;
    setValue(next);
    setError('');
    backspace(deletes);
    if (insert) {
      enqueue(() => MAGService.sendText(insert));
    }
  };

  const deleteOne = () => {
    if (sent.current === '') {
      // Field is empty: still delete, to clear text that was already on the TV.
      backspace(1);
      return;
    }
    onChange([...sent.current].slice(0, -1).join(''));
  };

  const enter = async () => {
    await enqueue(() => MAGService.sendCommand(MAGCommand.OK));
    onClose();
  };

  return (
    <Portal>
      <Dialog
        visible={visible}
        onDismiss={onClose}
        style={[styles.dialog, { marginBottom: keyboardHeight }]}>
        <Dialog.Title style={styles.title}>{t('type.title')}</Dialog.Title>
        <Dialog.Content>
          <Text style={styles.hint}>{t('type.hint')}</Text>
          <TextInput
            value={value}
            onChangeText={onChange}
            placeholder={t('type.placeholder')}
            placeholderTextColor={colors.textMuted}
            autoFocus
            autoCapitalize="none"
            autoCorrect={false}
            spellCheck={false}
            smartInsertDelete={false}
            keyboardAppearance="dark"
            returnKeyType="go"
            blurOnSubmit={false}
            onSubmitEditing={enter}
            style={styles.input}
          />
          {error !== '' && <Text style={styles.error}>{error}</Text>}
          <View style={styles.actions}>
            <Pressable
              onPress={deleteOne}
              style={({ pressed }) => [styles.action, pressed && styles.pressed]}
              accessibilityLabel={t('type.delete')}>
              <Icon source="backspace-outline" size={20} color={colors.text} />
              <Text style={styles.actionText}>{t('type.delete')}</Text>
            </Pressable>
            <Pressable
              onPress={enter}
              style={({ pressed }) => [styles.action, pressed && styles.pressed]}
              accessibilityLabel={t('type.enter')}>
              <Icon source="keyboard-return" size={20} color={colors.text} />
              <Text style={styles.actionText}>{t('type.enter')}</Text>
            </Pressable>
            <Pressable
              onPress={onClose}
              style={({ pressed }) => [styles.action, styles.done, pressed && styles.pressed]}>
              <Text style={[styles.actionText, styles.doneText]}>{t('common.done')}</Text>
            </Pressable>
          </View>
        </Dialog.Content>
      </Dialog>
    </Portal>
  );
};

const styles = StyleSheet.create({
  dialog: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
  },
  title: {
    color: colors.text,
  },
  hint: {
    color: colors.textSecondary,
    fontSize: 14,
    marginBottom: spacing.md,
  },
  input: {
    backgroundColor: colors.background,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    fontSize: 17,
    color: colors.text,
  },
  error: {
    color: colors.danger,
    fontSize: 13,
    marginTop: spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  action: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.control,
    borderRadius: radius.md,
    paddingVertical: 12,
  },
  pressed: {
    backgroundColor: colors.controlPressed,
  },
  actionText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '500',
  },
  done: {
    backgroundColor: colors.accent,
  },
  doneText: {
    color: '#FFFFFF',
  },
});

export default TypeOnTvDialog;
