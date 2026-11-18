/**
 * Phone volume buttons control the TV while the remote is on screen.
 *
 * iOS has no "button pressed" event, only volume changes, so the phone's
 * volume is parked at the middle and every change away from it becomes TV
 * volume steps, then the volume is put back. The phone's own volume and its
 * volume HUD are restored when the remote leaves the screen or the app goes
 * to the background.
 */
import { useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { VolumeManager } from 'react-native-volume-manager';

const BASELINE = 0.5;
/** One press of an iPhone volume button moves the volume by 1/16. */
const STEP = 1 / 16;
const MAX_STEPS = 4;

/** How many TV volume steps a change from the baseline means (+ up, − down). */
export function volumeSteps(volume: number, baseline = BASELINE): number {
  const delta = volume - baseline;
  if (Math.abs(delta) < STEP / 3) {
    return 0;
  }
  const steps = Math.min(MAX_STEPS, Math.max(1, Math.round(Math.abs(delta) / STEP)));
  return delta > 0 ? steps : -steps;
}

export function useVolumeButtons(enabled: boolean, onUp: () => void, onDown: () => void): void {
  const focused = useIsFocused();
  const [appActive, setAppActive] = useState(AppState.currentState === 'active');
  const handlers = useRef({ onUp, onDown });
  handlers.current = { onUp, onDown };

  useEffect(() => {
    const sub = AppState.addEventListener('change', state => setAppActive(state === 'active'));
    return () => sub.remove();
  }, []);

  const active = enabled && focused && appActive && Platform.OS === 'ios';

  useEffect(() => {
    if (!active) {
      return;
    }
    let stopped = false;
    let original: number | undefined;
    let subscription: { remove: () => void } | undefined;

    (async () => {
      try {
        original = (await VolumeManager.getVolume()).volume;
        if (stopped) {
          return;
        }
        await VolumeManager.showNativeVolumeUI({ enabled: false });
        await VolumeManager.setVolume(BASELINE, { showUI: false });
        subscription = VolumeManager.addVolumeListener(({ volume }) => {
          const steps = volumeSteps(volume);
          if (steps === 0 || stopped) {
            return; // our own reset, or nothing to do
          }
          for (let i = 0; i < Math.abs(steps); i++) {
            steps > 0 ? handlers.current.onUp() : handlers.current.onDown();
          }
          VolumeManager.setVolume(BASELINE, { showUI: false }).catch(() => {});
        });
      } catch {
        // No volume control available (e.g. Simulator): the feature just stays off.
      }
    })();

    return () => {
      stopped = true;
      subscription?.remove();
      if (original !== undefined) {
        VolumeManager.setVolume(original, { showUI: false }).catch(() => {});
      }
      VolumeManager.showNativeVolumeUI({ enabled: true }).catch(() => {});
    };
  }, [active]);
}
