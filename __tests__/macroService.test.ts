/**
 * MacroService: runs keys in order, reports unsupported keys instead of
 * pretending they were sent, stops when the box can't be reached, and builds
 * channel shortcuts from digits.
 */
jest.mock('../src/services/MAGService', () => ({
  __esModule: true,
  default: {
    isConnected: jest.fn(() => true),
    isCommandSupported: jest.fn(() => true),
    sendCommand: jest.fn(async () => true),
  },
}));

import MAGService from '../src/services/MAGService';
import MacroService, {
  channelCommands,
  describeResult,
  speedOf,
} from '../src/services/MacroService';
import { isAuraCommandSupported } from '../src/services/auraProtocol';
import { isCommandSupported as isMagicCommandSupported } from '../src/services/magKeyCodes';
import { MAGCommand } from '../src/types';

const mag = MAGService as jest.Mocked<typeof MAGService>;

beforeEach(() => {
  jest.clearAllMocks();
  mag.isConnected.mockReturnValue(true);
  mag.isCommandSupported.mockReturnValue(true);
  mag.sendCommand.mockResolvedValue(true);
});

describe('run', () => {
  it('sends every key in order and reports success', async () => {
    const steps: number[] = [];
    const result = await MacroService.run(
      [MAGCommand.VOL_UP, MAGCommand.OK, MAGCommand.BACK],
      0,
      i => steps.push(i),
    );
    expect(mag.sendCommand.mock.calls.map(c => c[0])).toEqual([
      MAGCommand.VOL_UP,
      MAGCommand.OK,
      MAGCommand.BACK,
    ]);
    expect(steps).toEqual([0, 1, 2]);
    expect(result).toEqual({ sent: 3, skipped: [], failed: false });
    expect(describeResult(result)).toBe('Done');
  });

  it('skips keys the box does not support and says so', async () => {
    mag.isCommandSupported.mockImplementation(c => c !== MAGCommand.POWER);
    const result = await MacroService.run([MAGCommand.POWER, MAGCommand.OK], 0);
    expect(mag.sendCommand).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ sent: 1, skipped: [MAGCommand.POWER], failed: false });
    expect(describeResult(result)).toBe('Done, skipped Power (not supported by this box)');
  });

  it('stops at the first failed send', async () => {
    mag.sendCommand.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    const result = await MacroService.run([MAGCommand.UP, MAGCommand.DOWN, MAGCommand.LEFT], 0);
    expect(mag.sendCommand).toHaveBeenCalledTimes(2);
    expect(result.failed).toBe(true);
    expect(describeResult(result)).toBe('Stopped after 1 step: lost the box');
  });

  it('refuses to run when not connected', async () => {
    mag.isConnected.mockReturnValue(false);
    const result = await MacroService.run([MAGCommand.OK], 0);
    expect(mag.sendCommand).not.toHaveBeenCalled();
    expect(describeResult(result)).toBe("Couldn't reach the box");
  });

  it('waits between keys', async () => {
    const start = Date.now();
    await MacroService.run([MAGCommand.UP, MAGCommand.UP, MAGCommand.UP], 50);
    expect(Date.now() - start).toBeGreaterThanOrEqual(95);
  });
});

describe('channels', () => {
  it('types the digits then OK', () => {
    expect(channelCommands('101')).toEqual([
      MAGCommand.NUM_1,
      MAGCommand.NUM_0,
      MAGCommand.NUM_1,
      MAGCommand.OK,
    ]);
  });

  it('rejects anything that is not a number', () => {
    expect(channelCommands('')).toEqual([]);
    expect(channelCommands('1a')).toEqual([]);
  });

  it('sends a channel through run', async () => {
    const result = await MacroService.goToChannel('7');
    expect(mag.sendCommand.mock.calls.map(c => c[0])).toEqual([MAGCommand.NUM_7, MAGCommand.OK]);
    expect(result.sent).toBe(2);
  });
});

describe('starter macros and speeds', () => {
  it('only use keys both box protocols support', () => {
    for (const macro of MacroService.starterMacros()) {
      for (const command of macro.commands) {
        expect(isAuraCommandSupported(command)).toBe(true);
        expect(isMagicCommandSupported(command)).toBe(true);
      }
    }
  });

  it('maps delays to speeds', () => {
    expect(speedOf(undefined)).toBe('normal');
    expect(speedOf(300)).toBe('fast');
    expect(speedOf(600)).toBe('normal');
    expect(speedOf(1200)).toBe('slow');
  });
});
