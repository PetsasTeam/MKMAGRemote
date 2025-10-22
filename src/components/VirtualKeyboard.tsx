/**
 * Virtual Keyboard Component
 * Full QWERTY keyboard for text input on MAG devices
 */

import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Vibration,
} from 'react-native';
import { Text, Surface, useTheme, IconButton, Button } from 'react-native-paper';
import { MAGCommand } from '../types';

interface VirtualKeyboardProps {
  onCommand: (command: MAGCommand) => void;
  onTextInput?: (text: string) => void;
  vibrationEnabled?: boolean;
}

const KEYBOARD_LAYOUTS = {
  lowercase: [
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
    ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
    ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
    ['shift', 'z', 'x', 'c', 'v', 'b', 'n', 'm', 'back'],
    ['123', '@', 'space', '.', 'enter'],
  ],
  uppercase: [
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
    ['shift', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'back'],
    ['123', '@', 'space', '.', 'enter'],
  ],
  symbols: [
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
    ['!', '@', '#', '$', '%', '^', '&', '*', '(', ')'],
    ['-', '_', '=', '+', '[', ']', '{', '}', '\\', '|'],
    ['shift', ';', ':', '"', "'", '<', '>', ',', 'back'],
    ['abc', '/', 'space', '.', 'enter'],
  ],
};

export const VirtualKeyboard: React.FC<VirtualKeyboardProps> = ({
  onCommand,
  onTextInput,
  vibrationEnabled = true,
}) => {
  const theme = useTheme();
  const [currentLayout, setCurrentLayout] = useState<'lowercase' | 'uppercase' | 'symbols'>(
    'lowercase'
  );
  const [inputText, setInputText] = useState('');

  const handleKeyPress = (key: string) => {
    if (vibrationEnabled) Vibration.vibrate(20);

    switch (key) {
      case 'shift':
        setCurrentLayout(currentLayout === 'lowercase' ? 'uppercase' : 'lowercase');
        break;
      case '123':
        setCurrentLayout('symbols');
        break;
      case 'abc':
        setCurrentLayout('lowercase');
        break;
      case 'back':
        const newText = inputText.slice(0, -1);
        setInputText(newText);
        if (onTextInput) onTextInput(newText);
        onCommand(MAGCommand.BACK);
        break;
      case 'enter':
        if (onTextInput) onTextInput(inputText);
        onCommand(MAGCommand.OK);
        break;
      case 'space':
        const withSpace = inputText + ' ';
        setInputText(withSpace);
        if (onTextInput) onTextInput(withSpace);
        break;
      default:
        const updated = inputText + key;
        setInputText(updated);
        if (onTextInput) onTextInput(updated);
        // Auto-lowercase after typing
        if (currentLayout === 'uppercase') {
          setCurrentLayout('lowercase');
        }
    }
  };

  const clearText = () => {
    setInputText('');
    if (onTextInput) onTextInput('');
  };

  const renderKey = (key: string) => {
    const isSpecial = ['shift', '123', 'abc', 'back', 'enter', 'space'].includes(key);
    const isWide = key === 'space';

    let displayKey = key;
    let icon = null;

    if (key === 'back') {
      icon = 'backspace';
      displayKey = '';
    } else if (key === 'enter') {
      icon = 'keyboard-return';
      displayKey = '';
    } else if (key === 'shift') {
      icon = 'arrow-up';
      displayKey = '';
    } else if (key === 'space') {
      displayKey = 'Space';
    }

    return (
      <TouchableOpacity
        key={key}
        style={[
          styles.key,
          isWide && styles.spaceKey,
          isSpecial && styles.specialKey,
          { backgroundColor: isSpecial ? theme.colors.primary : theme.colors.surface },
        ]}
        onPress={() => handleKeyPress(key)}>
        {icon ? (
          <IconButton icon={icon} size={20} iconColor="#FFFFFF" />
        ) : (
          <Text style={[styles.keyText, isSpecial && styles.specialKeyText]}>
            {displayKey}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Surface style={[styles.keyboard, { backgroundColor: theme.colors.background }]}>
        <View style={styles.inputDisplay}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <Text style={styles.inputText}>{inputText || 'Type here...'}</Text>
          </ScrollView>
          {inputText.length > 0 && (
            <IconButton icon="close-circle" size={20} onPress={clearText} />
          )}
        </View>

        <View style={styles.keys}>
          {KEYBOARD_LAYOUTS[currentLayout].map((row, rowIndex) => (
            <View key={rowIndex} style={styles.row}>
              {row.map(renderKey)}
            </View>
          ))}
        </View>

        <View style={styles.actions}>
          <Button
            mode="outlined"
            onPress={() => {
              setInputText('');
              onCommand(MAGCommand.EXIT);
            }}
            icon="close">
            Close
          </Button>
          <Button
            mode="contained"
            onPress={() => {
              if (onTextInput) onTextInput(inputText);
              onCommand(MAGCommand.OK);
            }}
            icon="send">
            Send
          </Button>
        </View>
      </Surface>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 8,
  },
  keyboard: {
    borderRadius: 16,
    padding: 12,
    elevation: 8,
  },
  inputDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 168, 232, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    minHeight: 50,
  },
  inputText: {
    fontSize: 18,
    fontFamily: 'monospace',
    minWidth: 200,
  },
  keys: {
    gap: 6,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 6,
  },
  key: {
    minWidth: 32,
    height: 42,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
  },
  spaceKey: {
    minWidth: 150,
  },
  specialKey: {
    minWidth: 50,
  },
  keyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  specialKeyText: {
    fontSize: 12,
    textTransform: 'uppercase',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    gap: 12,
  },
});
