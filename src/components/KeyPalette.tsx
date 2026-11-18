/**
 * Grid of remote keys to pick from (macro steps, pinned keys). Only keys the
 * target box supports are offered, so nothing saved can silently do nothing.
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from 'react-native-paper';
import { MAGCommand, MAGDevice } from '../types';
import MAGService from '../services/MAGService';
import { PALETTE, commandInfo } from '../services/commandInfo';
import { t } from '../i18n';
import { colors, radius, spacing } from '../theme/tokens';
import { tapHaptic } from './remote/RemoteKey';

const KEY_COLOURS: Partial<Record<MAGCommand, string>> = {
  [MAGCommand.RED]: colors.keyRed,
  [MAGCommand.GREEN]: colors.keyGreen,
  [MAGCommand.YELLOW]: colors.keyYellow,
  [MAGCommand.BLUE]: colors.keyBlue,
  [MAGCommand.POWER]: colors.danger,
};

interface Props {
  device: MAGDevice | null;
  onPick: (command: MAGCommand) => void;
}

const KeyPalette: React.FC<Props> = ({ device, onPick }) => {
  const keys = PALETTE.filter(command => MAGService.isCommandSupportedFor(device, command));
  return (
    <View style={styles.grid}>
      {keys.map(command => {
        const info = commandInfo(command);
        return (
          <Pressable
            key={command}
            onPress={() => {
              tapHaptic();
              onPick(command);
            }}
            accessibilityRole="button"
            accessibilityLabel={t('key.add', { name: info.label })}
            style={({ pressed }) => [styles.key, pressed && styles.keyPressed]}>
            {/^[0-9]$/.test(info.label) ? (
              <Text style={styles.digit}>{info.label}</Text>
            ) : (
              <>
                <Icon source={info.icon} size={20} color={KEY_COLOURS[command] ?? colors.text} />
                <Text style={styles.label} numberOfLines={1}>
                  {info.label}
                </Text>
              </>
            )}
          </Pressable>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  key: {
    width: '23%',
    height: 60,
    borderRadius: radius.md,
    backgroundColor: colors.control,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  keyPressed: {
    backgroundColor: colors.controlPressed,
  },
  label: {
    fontSize: 11,
    color: colors.textSecondary,
    maxWidth: '92%',
  },
  digit: {
    fontSize: 22,
    fontWeight: '500',
    color: colors.text,
  },
});

export default KeyPalette;
