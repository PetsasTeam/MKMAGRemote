/**
 * Maps the app's remote buttons to the "rc codes" the MAG remote protocol
 * expects. Codes come from the reference implementation's verified table
 * (https://github.com/rgerganov/magic-remote). Buttons without a known code
 * are deliberately left out instead of guessing; the UI shows them disabled.
 */
import { MAGCommand } from '../types';

const RC_CODES: Partial<Record<MAGCommand, number>> = {
  [MAGCommand.UP]: 189,
  [MAGCommand.DOWN]: 190,
  [MAGCommand.LEFT]: 191,
  [MAGCommand.RIGHT]: 171,
  [MAGCommand.OK]: 172,
  [MAGCommand.BACK]: 143,
  // The MAGic Remote "Home" key opens the box's main menu.
  [MAGCommand.MENU]: 141,
  [MAGCommand.INFO]: 157,

  [MAGCommand.PLAY]: 139, // play/pause toggle
  [MAGCommand.PAUSE]: 139,
  [MAGCommand.REWIND]: 150,
  [MAGCommand.FORWARD]: 144,

  [MAGCommand.VOL_UP]: 146,
  [MAGCommand.VOL_DOWN]: 147,
  [MAGCommand.MUTE]: 176,
  [MAGCommand.CH_UP]: 188,
  [MAGCommand.CH_DOWN]: 145,

  [MAGCommand.NUM_0]: 128,
  [MAGCommand.NUM_1]: 129,
  [MAGCommand.NUM_2]: 130,
  [MAGCommand.NUM_3]: 131,
  [MAGCommand.NUM_4]: 132,
  [MAGCommand.NUM_5]: 133,
  [MAGCommand.NUM_6]: 134,
  [MAGCommand.NUM_7]: 135,
  [MAGCommand.NUM_8]: 136,
  [MAGCommand.NUM_9]: 137,

  // Colour keys are F1-F4 on MAG remotes.
  [MAGCommand.RED]: 178,
  [MAGCommand.GREEN]: 177,
  [MAGCommand.YELLOW]: 185,
  [MAGCommand.BLUE]: 186,

  [MAGCommand.POWER]: 140,
  [MAGCommand.TV_RADIO]: 138, // "TV" key
};

export function getRcCode(command: MAGCommand): number | undefined {
  return RC_CODES[command];
}

export function isCommandSupported(command: MAGCommand): boolean {
  return RC_CODES[command] !== undefined;
}
