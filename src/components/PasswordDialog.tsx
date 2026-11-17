/**
 * Asks for an AuraHD box's Remote control password (set on the box under
 * Settings → System settings → Remote control → Password). The password is
 * also the encryption key, so it is checked by connecting with it.
 */
import React, { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { Button, Dialog, HelperText, Paragraph, Portal, TextInput } from 'react-native-paper';
import { MAGDevice } from '../types';
import { useKeyboardHeight } from '../hooks/useKeyboardHeight';
import { colors, radius } from '../theme/tokens';

interface Props {
  /** Device to ask about; the dialog is shown while this is non-null. */
  device: MAGDevice | null;
  /** Shown under the field, e.g. after a wrong password. */
  error?: string;
  onSubmit: (device: MAGDevice) => void;
  onCancel: () => void;
}

const PasswordDialog: React.FC<Props> = ({ device, error, onSubmit, onCancel }) => {
  const [password, setPassword] = useState('');
  const keyboardHeight = useKeyboardHeight();

  useEffect(() => {
    setPassword(device?.password ?? '');
  }, [device]);

  const submit = () => {
    if (device) {
      onSubmit({ ...device, password });
    }
  };

  return (
    <Portal>
      {/* Lift the dialog above the keyboard so its buttons stay reachable. */}
      <Dialog
        visible={device !== null}
        onDismiss={onCancel}
        style={[styles.dialog, { marginBottom: keyboardHeight }]}>
        <Dialog.Title style={styles.title}>Box password</Dialog.Title>
        <Dialog.Content>
          <Paragraph style={styles.text}>
            Enter the password set on {device?.name ?? 'the box'} under Settings → System settings →
            Remote control. Leave it empty if the box has no password.
          </Paragraph>
          <TextInput
            label="Password"
            value={password}
            onChangeText={setPassword}
            // number-pad has no Return key; this one has a "Go" key that submits.
            keyboardType="numbers-and-punctuation"
            returnKeyType="go"
            secureTextEntry
            autoFocus
            autoCorrect={false}
            mode="outlined"
            outlineColor={colors.border}
            activeOutlineColor={colors.accent}
            textColor={colors.text}
            style={styles.input}
            onSubmitEditing={submit}
          />
          <HelperText type="error" visible={!!error}>
            {error}
          </HelperText>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={onCancel} textColor={colors.textSecondary}>
            Cancel
          </Button>
          <Button onPress={submit} textColor={colors.accentText}>
            Connect
          </Button>
        </Dialog.Actions>
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
  text: {
    marginBottom: 12,
    color: colors.textSecondary,
  },
  input: {
    backgroundColor: colors.background,
  },
});

export default PasswordDialog;
