/**
 * Circular direction pad with a large OK key in the middle. Each direction
 * owns a quarter of the ring, so it's easy to hit without looking.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Icon } from 'react-native-paper';
import { MAGCommand } from '../../types';
import { t } from '../../i18n';
import { colors } from '../../theme/tokens';
import RemoteKey from './RemoteKey';

const SIZE = 228;
const OK_SIZE = 88;
const ZONE = (SIZE - OK_SIZE) / 2;

interface Props {
  onKey: (command: MAGCommand) => void;
  haptics: boolean;
}

const directions = [
  {
    command: MAGCommand.UP,
    icon: 'chevron-up',
    label: t('key.up'),
    style: { top: 0, left: ZONE, width: OK_SIZE, height: ZONE },
  },
  {
    command: MAGCommand.DOWN,
    icon: 'chevron-down',
    label: t('key.down'),
    style: { bottom: 0, left: ZONE, width: OK_SIZE, height: ZONE },
  },
  {
    command: MAGCommand.LEFT,
    icon: 'chevron-left',
    label: t('key.left'),
    style: { left: 0, top: ZONE, width: ZONE, height: OK_SIZE },
  },
  {
    command: MAGCommand.RIGHT,
    icon: 'chevron-right',
    label: t('key.right'),
    style: { right: 0, top: ZONE, width: ZONE, height: OK_SIZE },
  },
];

const DPad: React.FC<Props> = ({ onKey, haptics }) => (
  <View style={styles.ring}>
    {directions.map(d => (
      <View key={d.label} style={[styles.zone, d.style]}>
        <RemoteKey
          onPress={() => onKey(d.command)}
          repeat
          haptics={haptics}
          accessibilityLabel={d.label}
          pressedColor="rgba(255,255,255,0.08)"
          style={styles.zoneKey}>
          <Icon source={d.icon} size={30} color={colors.textSecondary} />
        </RemoteKey>
      </View>
    ))}
    <RemoteKey
      onPress={() => onKey(MAGCommand.OK)}
      haptics={haptics}
      accessibilityLabel={t('key.ok')}
      pressedColor={colors.accentPressed}
      style={styles.ok}>
      <Text style={styles.okText}>OK</Text>
    </RemoteKey>
  </View>
);

const styles = StyleSheet.create({
  ring: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zone: {
    position: 'absolute',
  },
  zoneKey: {
    width: '100%',
    height: '100%',
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ok: {
    width: OK_SIZE,
    height: OK_SIZE,
    borderRadius: OK_SIZE / 2,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  okText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});

export default DPad;
