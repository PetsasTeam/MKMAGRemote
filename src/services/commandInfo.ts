/**
 * Display names and icons for remote keys, used wherever keys are listed
 * (macro steps, key palette, pinned keys).
 */
import { MAGCommand } from '../types';

export interface CommandInfo {
  label: string;
  icon: string;
}

const INFO: Partial<Record<MAGCommand, CommandInfo>> = {
  [MAGCommand.UP]: { label: 'Up', icon: 'chevron-up' },
  [MAGCommand.DOWN]: { label: 'Down', icon: 'chevron-down' },
  [MAGCommand.LEFT]: { label: 'Left', icon: 'chevron-left' },
  [MAGCommand.RIGHT]: { label: 'Right', icon: 'chevron-right' },
  [MAGCommand.OK]: { label: 'OK', icon: 'circle-medium' },
  [MAGCommand.BACK]: { label: 'Back', icon: 'arrow-u-left-top' },
  [MAGCommand.EXIT]: { label: 'Exit', icon: 'close' },
  [MAGCommand.MENU]: { label: 'Menu', icon: 'home-outline' },
  [MAGCommand.INFO]: { label: 'Info', icon: 'information-outline' },
  [MAGCommand.VOL_UP]: { label: 'Vol +', icon: 'volume-plus' },
  [MAGCommand.VOL_DOWN]: { label: 'Vol −', icon: 'volume-minus' },
  [MAGCommand.MUTE]: { label: 'Mute', icon: 'volume-off' },
  [MAGCommand.CH_UP]: { label: 'Ch +', icon: 'chevron-double-up' },
  [MAGCommand.CH_DOWN]: { label: 'Ch −', icon: 'chevron-double-down' },
  [MAGCommand.PLAY]: { label: 'Play/Pause', icon: 'play-pause' },
  [MAGCommand.PAUSE]: { label: 'Pause', icon: 'pause' },
  [MAGCommand.STOP]: { label: 'Stop', icon: 'stop' },
  [MAGCommand.REWIND]: { label: 'Rewind', icon: 'rewind' },
  [MAGCommand.FORWARD]: { label: 'Forward', icon: 'fast-forward' },
  [MAGCommand.PREV]: { label: 'Previous', icon: 'skip-previous' },
  [MAGCommand.NEXT]: { label: 'Next', icon: 'skip-next' },
  [MAGCommand.REC]: { label: 'Record', icon: 'record-circle-outline' },
  [MAGCommand.RED]: { label: 'Red', icon: 'circle' },
  [MAGCommand.GREEN]: { label: 'Green', icon: 'circle' },
  [MAGCommand.YELLOW]: { label: 'Yellow', icon: 'circle' },
  [MAGCommand.BLUE]: { label: 'Blue', icon: 'circle' },
  [MAGCommand.POWER]: { label: 'Power', icon: 'power' },
  [MAGCommand.TV_RADIO]: { label: 'TV', icon: 'television' },
  [MAGCommand.SETTINGS]: { label: 'Settings', icon: 'cog-outline' },
  [MAGCommand.FAV]: { label: 'Favourites', icon: 'star-outline' },
  [MAGCommand.PORTAL]: { label: 'Portal', icon: 'web' },
  [MAGCommand.USB]: { label: 'USB', icon: 'usb' },
  [MAGCommand.AUDIO]: { label: 'Audio', icon: 'music-note' },
  [MAGCommand.SUBTITLE]: { label: 'Subtitles', icon: 'subtitles-outline' },
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
  return INFO[command] ?? { label: 'Key', icon: 'gesture-tap' };
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
