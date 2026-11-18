/// <reference types="node" />
/**
 * End-to-end test of AuraService against a fake AuraHD box on localhost:
 * discovery, the password handshake (right and wrong), buttons and text.
 * The fake box follows the protocol taken from the AuraHD Remote app; real
 * firmware was checked by hand against a MAG 424.
 */
import crypto from 'crypto';
import dgram from 'dgram';

// react-native-udp mirrors Node's dgram API, so use Node sockets in tests.
jest.mock('react-native-udp', () => {
  const nodeDgram = jest.requireActual('dgram');
  return {
    __esModule: true,
    default: { createSocket: (options: { type: string }) => nodeDgram.createSocket(options.type) },
  };
});

// Imported after the mocks are registered.
import AuraService, { discoverAuraBoxes } from '../src/services/AuraService';
import { MAGCommand, MAGDevice } from '../src/types';

const HOST = '127.0.0.1';
const BOX_PASSWORD = '2468';
const IV = Buffer.from('erghnlhbnmbnkghy');

const key = (pw: string) => {
  const k = Buffer.alloc(32);
  Buffer.from(pw).copy(k);
  return k;
};
const enc = (text: string) => {
  const c = crypto.createCipheriv('aes-256-cbc', key(BOX_PASSWORD), IV);
  return Buffer.concat([c.update(text, 'utf8'), c.final()]);
};
const dec = (data: Buffer): string | null => {
  try {
    const d = crypto.createDecipheriv('aes-256-cbc', key(BOX_PASSWORD), IV);
    return Buffer.concat([d.update(data), d.final()]).toString('utf8');
  } catch {
    return null;
  }
};

const waitFor = async (check: () => boolean, ms = 3000) => {
  const start = Date.now();
  while (!check()) {
    if (Date.now() - start > ms) {
      throw new Error('timed out');
    }
    await new Promise(r => setTimeout(r, 20));
  }
};

describe('AuraService with a fake box', () => {
  let command: dgram.Socket;
  let discovery: dgram.Socket;
  let commandPort: number;
  const received: Array<Record<string, unknown>> = [];

  beforeAll(async () => {
    command = dgram.createSocket('udp4');
    command.on('message', (msg, rinfo) => {
      const text = dec(msg);
      if (text === null) {
        return; // wrong password: the box stays silent
      }
      const json = JSON.parse(text);
      received.push(json);
      if (json.msgType === 'pingRequest') {
        command.send(enc('{"msgType":"pingResponse"}'), rinfo.port, rinfo.address);
      }
    });
    await new Promise<void>(r => command.bind(0, HOST, () => r()));
    commandPort = command.address().port;

    discovery = dgram.createSocket('udp4');
    discovery.on('message', (msg, rinfo) => {
      const { port } = JSON.parse(msg.toString());
      const info = JSON.stringify({
        msgType: 'Info',
        name: 'Test box',
        deviceFamily: 'stbapp',
        type: 'MAG424',
        serialNumber: 'SN1',
        port: commandPort,
        modes: ['MOUSE', 'KEYBOARD'],
      });
      discovery.send(Buffer.from(info), port, rinfo.address);
    });
    await new Promise<void>(r => discovery.bind(6000, HOST, () => r()));
  });

  afterAll(async () => {
    AuraService.disconnect();
    await new Promise<void>(r => command.close(() => r()));
    await new Promise<void>(r => discovery.close(() => r()));
  });

  beforeEach(() => {
    received.length = 0;
  });

  const device = (password: string): MAGDevice => ({
    id: `${HOST}:${commandPort}`,
    name: 'Test box',
    ip: HOST,
    port: commandPort,
    protocol: 'aurahd',
    password,
  });

  it('discovers the box and its command port', async () => {
    const found = await discoverAuraBoxes([HOST], 300);
    expect(found.get(HOST)).toEqual({
      name: 'Test box',
      type: 'MAG424',
      serialNumber: 'SN1',
      port: commandPort,
      screenWidth: 1280,
      screenHeight: 720,
    });
  });

  it('reports a wrong password as rejected', async () => {
    await expect(AuraService.connect(device('1111'))).resolves.toBe('rejected');
    expect(AuraService.isConnected()).toBe(false);
  });

  it('reports a box that does not answer as unreachable', async () => {
    const nowhere = { ...device(BOX_PASSWORD), ip: '127.0.0.2' };
    await expect(AuraService.connect(nowhere)).resolves.toBe('unreachable');
  }, 10000);

  it('connects with the right password and sends buttons and text', async () => {
    await expect(AuraService.connect(device(BOX_PASSWORD))).resolves.toBe('ok');
    expect(AuraService.isConnected()).toBe(true);

    await expect(AuraService.sendCommand(MAGCommand.UP)).resolves.toBe(true);
    await expect(AuraService.sendText('hi')).resolves.toBe(true);
    await waitFor(() => received.filter(m => m.msgType === 'keyboardKey').length === 6);

    const keys = received.filter(m => m.msgType === 'keyboardKey');
    expect(keys.map(k => [k.action, k.keycode])).toEqual([
      ['press', 16777235],
      ['release', 16777235],
      ['press', 72],
      ['release', 72],
      ['press', 73],
      ['release', 73],
    ]);
    expect(await AuraService.sendCommand(MAGCommand.POWER)).toBe(false);
    AuraService.disconnect();
  });

  it('types a login in order, with Shift for capitals and symbols', async () => {
    await expect(AuraService.connect(device(BOX_PASSWORD))).resolves.toBe('ok');
    const text = 'Me@x.io 9!';
    // Characters typed quickly one after another, as live typing sends them.
    const sends = [...text].map(c => AuraService.sendText(c));
    await expect(Promise.all(sends)).resolves.toEqual([...text].map(() => true));
    await waitFor(
      () => received.filter(m => m.msgType === 'keyboardKey').length === text.length * 2,
    );

    const presses = received.filter(m => m.msgType === 'keyboardKey' && m.action === 'press');
    expect(presses.map(p => String.fromCodePoint(p.unicode as number)).join('')).toBe(text);
    const shifted = presses
      .filter(p => p.metaState === 33554432)
      .map(p => String.fromCodePoint(p.unicode as number));
    expect(shifted).toEqual(['M', '@', '!']);

    // Pointer moves stay on screen and clicks arrive as press + release.
    await expect(AuraService.moveMouse(-5000, 99999)).resolves.toBe(true);
    await expect(AuraService.click()).resolves.toBe(true);
    await waitFor(() => received.some(m => m.msgType === 'mouseClick' && m.action === 'release'));
    expect(received.find(m => m.msgType === 'mouseMove')).toEqual({
      msgType: 'mouseMove',
      x: 0,
      y: 719,
    });
    AuraService.disconnect();
  });
});
