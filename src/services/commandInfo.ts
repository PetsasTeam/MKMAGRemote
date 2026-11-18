/**
 * Display names and icons for remote keys, used wherever keys are listed
 * (macro steps, key palette, pinned keys).
 */
import { MAGCommand } from '../types';
import { TranslationKey, t } from '../i18n';

export interface CommandInfo {
  label: string;
  icon: string;
}

/** Labels here are translation keys; commandInfo() returns them translated. */
const INFO: Partial<Record<MAGCommand, { label: TranslationKey; icon: string }>> = {
  [MAGCommand.UP]: { label: 'key.up', icon: 'chevron-up' },
  [MAGCommand.DOWN]: { label: 'key.down', icon: 'chevron-down' },
  [MAGCommand.LEFT]: { label: 'key.left', icon: 'chevron-left' },
  [MAGCommand.RIGHT]: { label: 'key.right', icon: 'chevron-right' },
  [MAGCommand.OK]: { label: 'key.ok', icon: 'circle-medium' },
  [MAGCommand.BACK]: { label: 'key.back', icon: 'arrow-u-left-top' },
  [MAGCommand.EXIT]: { label: 'key.exit', icon: 'close' },
  [MAGCommand.MENU]: { label: 'key.menu', icon: 'home-outline' },
  [MAGCommand.INFO]: { label: 'key.info', icon: 'information-outline' },
  [MAGCommand.VOL_UP]: { label: 'key.volUp', icon: 'volume-plus' },
  [MAGCommand.VOL_DOWN]: { label: 'key.volDown', icon: 'volume-minus' },
  [MAGCommand.MUTE]: { label: 'key.mute', icon: 'volume-off' },
  [MAGCommand.CH_UP]: { label: 'key.chUp', icon: 'chevron-double-up' },
  [MAGCommand.CH_DOWN]: { label: 'key.chDown', icon: 'chevron-double-down' },
  [MAGCommand.PLAY]: { label: 'key.play', icon: 'play-pause' },
  [MAGCommand.PAUSE]: { label: 'key.pause', icon: 'pause' },
  [MAGCommand.STOP]: { label: 'key.stop', icon: 'stop' },
  [MAGCommand.REWIND]: { label: 'key.rewind', icon: 'rewind' },
  [MAGCommand.FORWARD]: { label: 'key.forward', icon: 'fast-forward' },
  [MAGCommand.PREV]: { label: 'key.prev', icon: 'skip-previous' },
  [MAGCommand.NEXT]: { label: 'key.next', icon: 'skip-next' },
  [MAGCommand.REC]: { label: 'key.rec', icon: 'record-circle-outline' },
  [MAGCommand.RED]: { label: 'key.red', icon: 'circle' },
  [MAGCommand.GREEN]: { label: 'key.green', icon: 'circle' },
  [MAGCommand.YELLOW]: { label: 'key.yellow', icon: 'circle' },
  [MAGCommand.BLUE]: { label: 'key.blue', icon: 'circle' },
  [MAGCommand.POWER]: { label: 'key.power', icon: 'power' },
  [MAGCommand.TV_RADIO]: { label: 'key.tv', icon: 'television' },
  [MAGCommand.SETTINGS]: { label: 'key.settings', icon: 'cog-outline' },
  [MAGCommand.FAV]: { label: 'key.fav', icon: 'star-outline' },
  [MAGCommand.PORTAL]: { label: 'key.portal', icon: 'web' },
  [MAGCommand.USB]: { label: 'key.usb', icon: 'usb' },
  [MAGCommand.AUDIO]: { label: 'key.audio', icon: 'music-note' },
  [MAGCommand.SUBTITLE]: { label: 'key.subtitles', icon: 'subtitles-outline' },
};

const DIGITS = [
  MAGCommand.NUM_0,
  MAGCommand.NUM_1,
  MAGCommand.NUM_2,
  MAGCommand.NUM_3,
  MAGCommand.NUM_4,
  MAGCommand.NUM_5,
  MAGCommand.NUM_6,
  MAGCommand.NUM_7,
  MAGCommand.NUM_8,
  MAGCommand.NUM_9,
];

export function commandInfo(command: MAGCommand): CommandInfo {
  const digit = DIGITS.indexOf(command);
  if (digit >= 0) {
    return { label: String(digit), icon: `numeric-${digit}` };
  }
  const info = INFO[command];
  return info
    ? { label: t(info.label), icon: info.icon }
    : { label: t('key.key'), icon: 'gesture-tap' };
}

/** The command for a digit character, or undefined if it isn't 0-9. */
export function digitCommand(char: string): MAGCommand | undefined {
  return /^[0-9]$/.test(char) ? DIGITS[Number(char)] : undefined;
}

/** Keys offered when building macros or pinning keys, in palette order. */
export const PALETTE: MAGCommand[] = [
  MAGCommand.UP,
  MAGCommand.DOWN,
  MAGCommand.LEFT,
  MAGCommand.RIGHT,
  MAGCommand.OK,
  MAGCommand.BACK,
  MAGCommand.EXIT,
  MAGCommand.MENU,
  MAGCommand.INFO,
  MAGCommand.VOL_UP,
  MAGCommand.VOL_DOWN,
  MAGCommand.MUTE,
  MAGCommand.CH_UP,
  MAGCommand.CH_DOWN,
  MAGCommand.PLAY,
  MAGCommand.STOP,
  MAGCommand.REWIND,
  MAGCommand.FORWARD,
  MAGCommand.PREV,
  MAGCommand.NEXT,
  MAGCommand.RED,
  MAGCommand.GREEN,
  MAGCommand.YELLOW,
  MAGCommand.BLUE,
  MAGCommand.POWER,
  MAGCommand.TV_RADIO,
  ...DIGITS.slice(1),
  MAGCommand.NUM_0,
];
