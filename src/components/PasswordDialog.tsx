/**
 * Asks for an AuraHD box's Remote control password (set on the box under
 * Settings → System settings → Remote control → Password). The password is
 * also the encryption key, so it is checked by connecting with it.
 */
import React, { useEffect, useState } from 'react';
import { Keyboard, StyleSheet } from 'react-native';
import { Button, Dialog, HelperText, Paragraph, Portal, TextInput } from 'react-native-paper';
import { MAGDevice } from '../types';

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
        style={{ marginBottom: keyboardHeight }}>
        <Dialog.Title>Box password</Dialog.Title>
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
            onSubmitEditing={submit}
          />
          <HelperText type="error" visible={!!error}>
            {error}
          </HelperText>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={onCancel}>Cancel</Button>
          <Button onPress={submit}>Connect</Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
};

function useKeyboardHeight(): number {
  const [height, setHeight] = useState(0);
  useEffect(() => {
    const show = Keyboard.addListener('keyboardWillShow', e => setHeight(e.endCoordinates.height));
    const hide = Keyboard.addListener('keyboardWillHide', () => setHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return height;
}

const styles = StyleSheet.create({
  text: {
    marginBottom: 12,
  },
});

export default PasswordDialog;
