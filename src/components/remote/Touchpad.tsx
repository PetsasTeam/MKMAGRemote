/**
 * Touchpad for boxes that accept a mouse pointer (AuraHD): drag to move the
 * pointer, tap to click, drag with two fingers to scroll.
 */
import React, { useMemo, useRef } from 'react';
import { PanResponder, StyleSheet, Text, View } from 'react-native';
import { Icon } from 'react-native-paper';
import MAGService from '../../services/MAGService';
import { tapHaptic } from './RemoteKey';
import { colors, radius, spacing } from '../../theme/tokens';
import { t } from '../../i18n';

/** Pointer pixels on the TV per point dragged on the phone. */
const SPEED = 1.5;
/** Send pointer moves at most this often, so the box isn't flooded. */
const MOVE_EVERY_MS = 33;
/** Points of two-finger drag per scroll step. */
const SCROLL_STEP = 24;
const SCROLL_VALUE = 50;
const TAP_SLOP = 6;
const TAP_MAX_MS = 300;

interface Props {
  haptics: boolean;
  onError: () => void;
}

const Touchpad: React.FC<Props> = ({ haptics, onError }) => {
  const state = useRef({
    startedAt: 0,
    lastDx: 0,
    lastDy: 0,
    maxFingers: 1,
    moved: false,
    scrollCarry: 0,
    pendingX: 0,
    pendingY: 0,
    timer: null as ReturnType<typeof setTimeout> | null,
  });

  const responder = useMemo(() => {
    const s = state.current;
    const report = (ok: boolean) => {
      if (!ok) {
        onError();
      }
    };
    const flush = () => {
      s.timer = null;
      const x = Math.round(s.pendingX);
      const y = Math.round(s.pendingY);
      s.pendingX -= x;
      s.pendingY -= y;
      if (x !== 0 || y !== 0) {
        MAGService.moveMouse(x, y).then(report);
      }
    };

    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        Object.assign(s, {
          startedAt: Date.now(),
          lastDx: 0,
          lastDy: 0,
          maxFingers: 1,
          moved: false,
          scrollCarry: 0,
        });
      },
      onPanResponderMove: (event, gesture) => {
        const fingers = event.nativeEvent.touches.length;
        s.maxFingers = Math.max(s.maxFingers, fingers);
        const dx = gesture.dx - s.lastDx;
        const dy = gesture.dy - s.lastDy;
        s.lastDx = gesture.dx;
        s.lastDy = gesture.dy;
        if (Math.abs(gesture.dx) > TAP_SLOP || Math.abs(gesture.dy) > TAP_SLOP) {
          s.moved = true;
        }
        if (fingers >= 2) {
          // Finger moving up scrolls the page down, like a laptop trackpad.
          s.scrollCarry -= dy;
          while (Math.abs(s.scrollCarry) >= SCROLL_STEP) {
            const direction = Math.sign(s.scrollCarry);
            s.scrollCarry -= direction * SCROLL_STEP;
            MAGService.scroll(direction * SCROLL_VALUE).then(report);
          }
          return;
        }
        s.pendingX += dx * SPEED;
        s.pendingY += dy * SPEED;
        if (!s.timer) {
          s.timer = setTimeout(flush, MOVE_EVERY_MS);
        }
      },
      onPanResponderRelease: () => {
        if (s.timer) {
          clearTimeout(s.timer);
          flush();
        }
        if (!s.moved && s.maxFingers === 1 && Date.now() - s.startedAt < TAP_MAX_MS) {
          tapHaptic(haptics);
          MAGService.click().then(report);
        }
      },
      onPanResponderTerminate: () => {
        if (s.timer) {
          clearTimeout(s.timer);
          s.timer = null;
        }
      },
    });
  }, [haptics, onError]);

  return (
    <View
      style={styles.pad}
      {...responder.panHandlers}
      accessible
      accessibilityLabel={t('remote.touchpad')}
      accessibilityHint={t('remote.touchpadHint')}>
      <Icon source="gesture-tap" size={28} color={colors.textMuted} />
      <Text style={styles.hint}>{t('remote.touchpadHint')}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  pad: {
    alignSelf: 'stretch',
    height: 340,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  hint: {
    color: colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
});

export default Touchpad;
