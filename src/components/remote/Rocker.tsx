/**
 * Vertical two-way rocker (volume, channel), like the rocker on a physical
 * remote. Both halves auto-repeat while held.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Icon } from 'react-native-paper';
import { colors, radius } from '../../theme/tokens';
import RemoteKey from './RemoteKey';

interface Props {
  label: string;
  upIcon: string;
  downIcon: string;
  onUp: () => void;
  onDown: () => void;
  upDimmed?: boolean;
  downDimmed?: boolean;
  haptics: boolean;
}

const Rocker: React.FC<Props> = ({
  label,
  upIcon,
  downIcon,
  onUp,
  onDown,
  upDimmed,
  downDimmed,
  haptics,
}) => (
  <View style={styles.pill}>
    <RemoteKey
      onPress={onUp}
      repeat
      dimmed={upDimmed}
      haptics={haptics}
      accessibilityLabel={`${label} up`}
      style={[styles.half, styles.top]}>
      <Icon source={upIcon} size={24} color={colors.text} />
    </RemoteKey>
    <Text style={styles.label}>{label}</Text>
    <RemoteKey
      onPress={onDown}
      repeat
      dimmed={downDimmed}
      haptics={haptics}
      accessibilityLabel={`${label} down`}
      style={[styles.half, styles.bottom]}>
      <Icon source={downIcon} size={24} color={colors.text} />
    </RemoteKey>
  </View>
);

const styles = StyleSheet.create({
  pill: {
    width: 60,
    height: 148,
    borderRadius: radius.pill,
    backgroundColor: colors.control,
    alignItems: 'center',
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  half: {
    width: 60,
    height: 62,
    alignItems: 'center',
    justifyContent: 'center',
  },
  top: {
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
  },
  bottom: {
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
    letterSpacing: 1,
  },
});

export default Rocker;
