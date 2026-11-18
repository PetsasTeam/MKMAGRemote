/**
 * Macro Service
 * Runs sequences of remote keys (macros, channel shortcuts) and reports
 * exactly what happened: keys sent, keys the box doesn't support, failures.
 */
import { Macro, MAGCommand } from '../types';
import MAGService from './MAGService';
import { commandInfo, digitCommand } from './commandInfo';
import { t } from '../i18n';

export interface RunResult {
  /** Keys sent to the box. */
  sent: number;
  /** Keys left out because the connected box doesn't support them. */
  skipped: MAGCommand[];
  /** Sending stopped because the box couldn't be reached (or wasn't connected). */
  failed: boolean;
}

export const SPEEDS = {
  fast: 300,
  normal: 600,
  slow: 1200,
} as const;
export type Speed = keyof typeof SPEEDS;

export function speedOf(delay: number | undefined): Speed {
  if (delay === undefined) {
    return 'normal';
  }
  if (delay <= SPEEDS.fast) {
    return 'fast';
  }
  return delay >= SPEEDS.slow ? 'slow' : 'normal';
}

/** Keys that switch to a channel: its digits, then OK to confirm. */
export function channelCommands(channel: string): MAGCommand[] {
  const digits = [...channel.trim()].map(digitCommand);
  if (digits.length === 0 || digits.some(d => d === undefined)) {
    return [];
  }
  return [...(digits as MAGCommand[]), MAGCommand.OK];
}

/** A short, honest summary of a run for the user. */
export function describeResult(result: RunResult): string {
  if (result.failed) {
    return result.sent === 0
      ? t('macros.resultUnreachable')
      : result.sent === 1
        ? t('macros.resultStoppedOne')
        : t('macros.resultStopped', { count: result.sent });
  }
  if (result.skipped.length > 0) {
    const names = [...new Set(result.skipped.map(c => commandInfo(c).label))].join(', ');
    return result.sent === 0
      ? t('macros.resultNothing', { names })
      : t('macros.resultSkipped', { names });
  }
  return t('macros.resultDone');
}

const wait = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

class MacroService {
  private running = false;

  isRunning(): boolean {
    return this.running;
  }

  /**
   * Send `commands` one after another, `delayMs` apart. Keys the box doesn't
   * support are skipped (and reported); a send failure stops the run.
   */
  async run(
    commands: MAGCommand[],
    delayMs: number,
    onStep?: (index: number) => void,
  ): Promise<RunResult> {
    const result: RunResult = { sent: 0, skipped: [], failed: false };
    if (this.running || !MAGService.isConnected()) {
      return { ...result, failed: true };
    }
    this.running = true;
    try {
      for (let i = 0; i < commands.length; i++) {
        const command = commands[i];
        onStep?.(i);
        if (!MAGService.isCommandSupported(command)) {
          result.skipped.push(command);
          continue;
        }
        if (result.sent > 0) {
          await wait(delayMs);
        }
        if (!(await MAGService.sendCommand(command))) {
          result.failed = true;
          break;
        }
        result.sent++;
      }
      return result;
    } finally {
      this.running = false;
    }
  }

  runMacro(macro: Macro, onStep?: (index: number) => void): Promise<RunResult> {
    return this.run(macro.commands, macro.delay ?? SPEEDS.normal, onStep);
  }

  /** Switch to a channel by number (digits, then OK). */
  goToChannel(channel: string): Promise<RunResult> {
    const commands = channelCommands(channel);
    if (commands.length === 0) {
      return Promise.resolve({ sent: 0, skipped: [], failed: true });
    }
    // Digits go quickly so the box reads them as one number.
    return this.run(commands, 250);
  }

  /** Ready-made macros that only use keys every MAG box supports. */
  starterMacros(): Macro[] {
    return [
      {
        id: 'starter-volume-up',
        name: t('macros.starterVolUp'),
        icon: 'volume-plus',
        commands: [MAGCommand.VOL_UP, MAGCommand.VOL_UP, MAGCommand.VOL_UP],
        delay: SPEEDS.fast,
      },
      {
        id: 'starter-volume-down',
        name: t('macros.starterVolDown'),
        icon: 'volume-minus',
        commands: [MAGCommand.VOL_DOWN, MAGCommand.VOL_DOWN, MAGCommand.VOL_DOWN],
        delay: SPEEDS.fast,
      },
      {
        id: 'starter-channels-up',
        name: t('macros.starterSkip'),
        icon: 'chevron-double-up',
        commands: [MAGCommand.CH_UP, MAGCommand.CH_UP, MAGCommand.CH_UP],
        delay: SPEEDS.normal,
      },
      {
        id: 'starter-back-out',
        name: t('macros.starterMenu'),
        icon: 'home-outline',
        commands: [MAGCommand.BACK, MAGCommand.BACK, MAGCommand.BACK, MAGCommand.MENU],
        delay: SPEEDS.normal,
      },
    ];
  }
}

export default new MacroService();
