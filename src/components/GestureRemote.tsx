/**
 * Gesture Remote Component
 * Touch-based gesture controls for navigation
 */

import React, { useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  PanResponder,
  Animated,
  Vibration,
  Dimensions,
} from 'react-native';
import { Text, Surface, useTheme } from 'react-native-paper';
import { MAGCommand } from '../types';

interface GestureRemoteProps {
  onCommand: (command: MAGCommand) => void;
  vibrationEnabled?: boolean;
}

const SWIPE_THRESHOLD = 50;
const TAP_THRESHOLD = 10;

export const GestureRemote: React.FC<GestureRemoteProps> = ({
  onCommand,
  vibrationEnabled = true,
}) => {
  const theme = useTheme();
  const [gesture, setGesture] = useState<string>('');
  const pan = useRef(new Animated.ValueXY()).current;
  const opacity = useRef(new Animated.Value(0)).current;

  const showGesture = (gestureName: string) => {
    setGesture(gestureName);
    Animated.sequence([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.delay(300),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => setGesture(''));
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,

      onPanResponderGrant: () => {
        pan.setOffset({
          x: pan.x._value,
          y: pan.y._value,
        });
      },

      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], {
        useNativeDriver: false,
      }),

      onPanResponderRelease: (evt, gestureState) => {
        pan.flattenOffset();

        const { dx, dy } = gestureState;
        const absX = Math.abs(dx);
        const absY = Math.abs(dy);

        // Reset animation
        Animated.spring(pan, {
          toValue: { x: 0, y: 0 },
          useNativeDriver: true,
        }).start();

        // Detect tap (OK button)
        if (absX < TAP_THRESHOLD && absY < TAP_THRESHOLD) {
          if (vibrationEnabled) Vibration.vibrate(50);
          showGesture('OK');
          onCommand(MAGCommand.OK);
          return;
        }

        // Detect swipe direction
        if (absX > SWIPE_THRESHOLD || absY > SWIPE_THRESHOLD) {
          if (vibrationEnabled) Vibration.vibrate(30);

          if (absX > absY) {
            // Horizontal swipe
            if (dx > 0) {
              showGesture('→ Right');
              onCommand(MAGCommand.RIGHT);
            } else {
              showGesture('← Left');
              onCommand(MAGCommand.LEFT);
            }
          } else {
            // Vertical swipe
            if (dy > 0) {
              showGesture('↓ Down');
              onCommand(MAGCommand.DOWN);
            } else {
              showGesture('↑ Up');
              onCommand(MAGCommand.UP);
            }
          }
        }
      },
    })
  ).current;

  return (
    <View style={styles.container}>
      <Surface style={[styles.gestureArea, { backgroundColor: theme.colors.surface }]}>
        <Text style={styles.hint}>Swipe to Navigate • Tap for OK</Text>

        <View style={styles.gestureZone} {...panResponder.panHandlers}>
          <Animated.View
            style={[
              styles.gestureIndicator,
              {
                transform: [{ translateX: pan.x }, { translateY: pan.y }],
              },
            ]}>
            <View style={[styles.centerDot, { backgroundColor: theme.colors.primary }]} />
          </Animated.View>

          <Animated.View style={[styles.gestureLabel, { opacity }]}>
            <Text style={styles.gestureLabelText}>{gesture}</Text>
          </Animated.View>
        </View>

        <View style={styles.arrows}>
          <Text style={styles.arrow}>↑</Text>
          <View style={styles.arrowRow}>
            <Text style={styles.arrow}>←</Text>
            <Text style={[styles.arrow, { fontSize: 32 }]}>●</Text>
            <Text style={styles.arrow}>→</Text>
          </View>
          <Text style={styles.arrow}>↓</Text>
        </View>
      </Surface>
    </View>
  );
};

interface TouchpadProps {
  onCommand: (command: MAGCommand) => void;
  onMove?: (dx: number, dy: number) => void;
  vibrationEnabled?: boolean;
}

export const Touchpad: React.FC<TouchpadProps> = ({
  onCommand,
  onMove,
  vibrationEnabled = true,
}) => {
  const theme = useTheme();
  const [touching, setTouching] = useState(false);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,

      onPanResponderGrant: () => {
        setTouching(true);
      },

      onPanResponderMove: (evt, gestureState) => {
        if (onMove) {
          onMove(gestureState.dx, gestureState.dy);
        }
      },

      onPanResponderRelease: (evt, gestureState) => {
        setTouching(false);

        const { dx, dy } = gestureState;
        const absX = Math.abs(dx);
        const absY = Math.abs(dy);

        // Single tap = OK
        if (absX < TAP_THRESHOLD && absY < TAP_THRESHOLD) {
          if (vibrationEnabled) Vibration.vibrate(50);
          onCommand(MAGCommand.OK);
        }
      },
    })
  ).current;

  return (
    <Surface
      style={[
        styles.touchpad,
        {
          backgroundColor: theme.colors.surface,
          borderColor: touching ? theme.colors.primary : 'transparent',
        },
      ]}
      {...panResponder.panHandlers}>
      <Text style={styles.touchpadHint}>
        {touching ? 'Moving...' : 'Touch to control mouse'}
      </Text>
      <View style={styles.touchpadIcon}>
        <Text style={styles.touchpadIconText}>🖱️</Text>
      </View>
    </Surface>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 16,
  },
  gestureArea: {
    borderRadius: 20,
    padding: 20,
    elevation: 8,
  },
  hint: {
    textAlign: 'center',
    fontSize: 14,
    opacity: 0.7,
    marginBottom: 16,
  },
  gestureZone: {
    height: 280,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  gestureIndicator: {
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    elevation: 4,
  },
  gestureLabel: {
    position: 'absolute',
    top: '50%',
    alignSelf: 'center',
    backgroundColor: 'rgba(0, 168, 232, 0.9)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  gestureLabelText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  arrows: {
    alignItems: 'center',
    opacity: 0.3,
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -50 }, { translateY: -50 }],
  },
  arrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: 180,
  },
  arrow: {
    fontSize: 40,
    color: '#00A8E8',
  },
  touchpad: {
    height: 300,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    elevation: 8,
  },
  touchpadHint: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 20,
  },
  touchpadIcon: {
    marginTop: 20,
  },
  touchpadIconText: {
    fontSize: 48,
  },
});
