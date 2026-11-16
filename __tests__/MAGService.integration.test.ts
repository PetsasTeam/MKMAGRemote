/// <reference types="node" />
/**
 * End-to-end test of MAGService against a fake MAG box on localhost.
 *
 * The fake box follows the protocol as implemented by the reference client
 * (pairing code shown "on TV", encrypted replies once paired). It checks the
 * app's client logic: pairing, wrong codes, sending keys/text and recovering
 * when the box drops the connection. It cannot prove how real firmware
 * behaves in every edge case; that needs a test on a real MAG.
 */
import net from 'net';
import {
  MAGProtocolCommand,
  MAG_REMOTE_PORT,
  buildMessage,
  decryptReply,
  splitFrames,
  utf8DecodeStrict,
} from '../src/services/magProtocol';

// react-native-tcp-socket mirrors Node's `net` API, so use Node sockets in tests.
jest.mock('react-native-tcp-socket', () => {
  const nodeNet = jest.requireActual('net');
  return {
    __esModule: true,
    default: {
      createConnection: (options: { host: string; port: number }, onConnect: () => void) =>
        nodeNet.createConnection({ host: options.host, port: options.port }, onConnect),
    },
  };
});
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// Imported after the mocks are registered.
import MAGService from '../src/services/MAGService';
import { MAGCommand, MAGDevice } from '../src/types';

const HOST = '127.0.0.1';
const TV_CODE = '482913';

interface Received {
  command: string;
  json: Record<string, unknown>;
}

class FakeMagBox {
  private server: net.Server | null = null;
  private sockets = new Set<net.Socket>();
  paired = new Set<string>();
  received: Received[] = [];

  start(): Promise<void> {
    this.server = net.createServer(socket => this.handle(socket));
    return new Promise(resolve => this.server!.listen(MAG_REMOTE_PORT, HOST, resolve));
  }

  stop(): Promise<void> {
    this.dropConnections();
    return new Promise(resolve => (this.server ? this.server.close(() => resolve()) : resolve()));
  }

  dropConnections(): void {
    this.sockets.forEach(s => s.destroy());
    this.sockets.clear();
  }

  private reply(socket: net.Socket, command: string, body: object) {
    socket.write(buildMessage(command, JSON.stringify(body), TV_CODE));
  }

  private handle(socket: net.Socket) {
    this.sockets.add(socket);
    socket.on('close', () => this.sockets.delete(socket));
    let buffer: Uint8Array = new Uint8Array(0);
    let pairingDevId: string | null = null;

    socket.on('data', (chunk: Buffer) => {
      const merged = new Uint8Array(buffer.length + chunk.length);
      merged.set(buffer);
      merged.set(chunk, buffer.length);
      const { frames, rest } = splitFrames(merged);
      buffer = rest;

      for (const frame of frames) {
        const plain = utf8DecodeStrict(frame.body);
        switch (frame.command) {
          case MAGProtocolCommand.PAIRING_REQUEST:
            pairingDevId = JSON.parse(plain!).dev_id; // the TV now shows TV_CODE
            break;
          case MAGProtocolCommand.PAIRING_COMPLETE: {
            const text = decryptReply(TV_CODE, frame.body);
            const devId = text ? JSON.parse(text).dev_id : null;
            if (devId && devId === pairingDevId) {
              this.paired.add(devId);
            }
            this.reply(socket, frame.command, { paired: devId !== null });
            break;
          }
          case MAGProtocolCommand.CONNECT_REQUEST: {
            const devId = JSON.parse(plain!).dev_id;
            if (this.paired.has(devId)) {
              this.reply(socket, frame.command, { status: 'connected' });
            } else {
              // Not paired: answer without our encryption.
              socket.write(buildMessage(frame.command, '{"status":"not paired"}'));
            }
            break;
          }
          default: {
            const text = decryptReply(TV_CODE, frame.body);
            if (text) {
              this.received.push({ command: frame.command, json: JSON.parse(text) });
            }
            if (frame.command === MAGProtocolCommand.PING) {
              this.reply(socket, frame.command, { status: 'pong' });
            }
          }
        }
      }
    });
  }

  async waitFor(predicate: (r: Received) => boolean, count = 1): Promise<Received[]> {
    for (let i = 0; i < 100; i++) {
      const matches = this.received.filter(predicate);
      if (matches.length >= count) {
        return matches;
      }
      await new Promise<void>(r => setTimeout(r, 20));
    }
    throw new Error('Fake MAG did not receive the expected message');
  }
}

const isRc = (code: number) => (r: Received) =>
  r.command === MAGProtocolCommand.RC_CODE && r.json.rc_code === code;

describe('MAGService against a fake MAG box', () => {
  const box = new FakeMagBox();
  const device: MAGDevice = { id: 'box', name: 'Living room', ip: HOST, port: MAG_REMOTE_PORT };

  beforeAll(() => box.start());
  afterAll(async () => {
    MAGService.disconnect();
    await box.stop();
  });

  it('refuses an unpaired device', async () => {
    expect(await MAGService.connect({ ...device, pairingCode: TV_CODE })).toBe('rejected');
    expect(MAGService.isConnected()).toBe(false);
  });

  it('rejects a wrong pairing code', async () => {
    await MAGService.startPairing(HOST);
    expect(await MAGService.completePairing('111111')).toBe(false);
    expect(box.paired.size).toBe(0);
  });

  it('pairs with the code shown on the TV', async () => {
    await MAGService.startPairing(HOST);
    expect(await MAGService.completePairing(TV_CODE)).toBe(true);
    expect(box.paired.size).toBe(1);
  });

  it('connects and sends remote buttons', async () => {
    expect(await MAGService.connect({ ...device, pairingCode: TV_CODE })).toBe('ok');
    expect(await MAGService.sendCommand(MAGCommand.UP)).toBe(true);
    expect(await MAGService.sendCommand(MAGCommand.OK)).toBe(true);
    await box.waitFor(isRc(189));
    await box.waitFor(isRc(172));
  });

  it('does not send buttons that have no MAG code', async () => {
    const before = box.received.length;
    expect(await MAGService.sendCommand(MAGCommand.USB)).toBe(false);
    await new Promise<void>(r => setTimeout(r, 100));
    expect(box.received.length).toBe(before);
  });

  it('reconnects transparently after the box drops the connection', async () => {
    box.dropConnections();
    await new Promise<void>(r => setTimeout(r, 50));
    expect(await MAGService.sendCommand(MAGCommand.VOL_UP)).toBe(true);
    await box.waitFor(isRc(146));
  });

  it('types text on the TV', async () => {
    expect(await MAGService.sendText('Hi!')).toBe(true);
    const keys = await box.waitFor(r => r.command === MAGProtocolCommand.KEYBOARD_KEY, 3);
    expect(keys.map(k => k.json.kb_key_code)).toEqual([72, 105, 33]);
  });

  it('reports an unreachable box', async () => {
    await box.stop();
    expect(await MAGService.connect({ ...device, pairingCode: TV_CODE })).toBe('unreachable');
  });
});
