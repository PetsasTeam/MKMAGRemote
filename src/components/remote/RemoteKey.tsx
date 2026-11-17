/**
 * The one pressable used for every remote button: springs down on touch,
 * gives a light haptic tap, and can auto-repeat while held (arrows, volume).
 */
import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleProp, ViewStyle } from 'react-native';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { colors } from '../../theme/tokens';

const REPEAT_DELAY_MS = 400;
const REPEAT_EVERY_MS = 140;

export function tapHaptic(enabled = true): void {
  if (enabled) {
    ReactNativeHapticFeedback.trigger('impactLight', {
      enableVibrateFallback: false,
      ignoreAndroidSystemSettings: false,
    });
  }
}

interface Props {
  onPress: () => void;
  /** Keep sending while the key is held down. */
  repeat?: boolean;
  /** Shown dimmed (the box doesn't support this key); still tappable so it can explain why. */
  dimmed?: boolean;
  haptics?: boolean;
  style?: StyleProp<ViewStyle>;
  pressedColor?: string;
  accessibilityLabel: string;
  children: React.ReactNode;
}

const RemoteKey: React.FC<Props> = ({
  onPress,
  repeat = false,
  dimmed = false,
  haptics = true,
  style,
  pressedColor = colors.controlPressed,
  accessibilityLabel,
  children,
}) => {
  const scale = useRef(new Animated.Value(1)).current;
  const timers = useRef<{
    delay?: ReturnType<typeof setTimeout>;
    every?: ReturnType<typeof setInterval>;
  }>({});

  const stopRepeat = () => {
    if (timers.current.delay !== undefined) {
      clearTimeout(timers.current.delay);
    }
    if (timers.current.every !== undefined) {
      clearInterval(timers.current.every);
    }
    timers.current = {};
  };
  useEffect(() => stopRepeat, []);

  const pressIn = () => {
    Animated.spring(scale, {
      toValue: 0.92,
      useNativeDriver: true,
      speed: 50,
      bounciness: 0,
    }).start();
    tapHaptic(haptics && !dimmed);
    onPress();
    if (repeat && !dimmed) {
      timers.current.delay = setTimeout(() => {
        timers.current.every = setInterval(onPress, REPEAT_EVERY_MS);
      }, REPEAT_DELAY_MS);
    }
  };

  const pressOut = () => {
    stopRepeat();
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 6 }).start();
  };

  return (
    <Pressable
      onPressIn={pressIn}
      onPressOut={pressOut}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: dimmed }}
      hitSlop={4}>
      {({ pressed }) => (
        <Animated.View
          style={[
            style,
            pressed && !dimmed && { backgroundColor: pressedColor },
            dimmed && { opacity: 0.35 },
            { transform: [{ scale }] },
          ]}>
          {children}
        </Animated.View>
      )}
    </Pressable>
  );
};

export default RemoteKey;
