/**
 * AuraHD remote sessions and discovery over UDP (see auraProtocol.ts).
 *
 * Used for MAG boxes whose "Remote control" setting has a Device name and a
 * Password (the protocol of Infomir's AuraHD Remote app). The password typed
 * here is the one set on the box under Settings → System settings → Remote control.
 */
import dgram from 'react-native-udp';
import { MAGCommand, MAGDevice } from '../types';
import {
  AURA_DISCOVERY_PORT,
  AuraInfo,
  buttonMessages,
  charMessages,
  isPingResponse,
  parseInfo,
  pingRequest,
  solicitMessage,
} from './auraProtocol';

// react-native-udp's sockets are EventEmitters, but its type definitions leave
// the listener methods out.
type Listener = (...args: any[]) => void;
type UdpSocket = ReturnType<typeof dgram.createSocket> & {
  on(event: string, listener: Listener): unknown;
  once(event: string, listener: Listener): unknown;
  removeListener(event: string, listener: Listener): unknown;
};
export type AuraConnectResult = 'ok' | 'unreachable' | 'rejected';

const PING_TRIES = 3;
const PING_WAIT_MS = 1200;
const INFO_WAIT_MS = 1500;
const KEEP_ALIVE_MS = 5000;
const KEY_GAP_MS = 40;
const SEND_CALLBACK_MS = 300;
/** UDP sockets used in parallel for discovery queries. */
const DISCOVERY_SOCKETS = 16;
/** Upper bound on waiting for queued discovery queries to go out. */
export const MAX_SEND_WAIT_MS = 1500;

const delay = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

/** Opens a UDP socket on a free port. */
export function openUdpSocket(): Promise<UdpSocket> {
  return new Promise((resolve, reject) => {
    const socket = dgram.createSocket({ type: 'udp4' }) as UdpSocket;
    const onError = (error: Error) => reject(error);
    socket.once('error', onError);
    socket.once('listening', () => {
      socket.removeListener('error', onError);
      socket.on('error', () => {});
      resolve(socket);
    });
    socket.bind(0);
  });
}

function closeQuietly(socket: UdpSocket | null): void {
  try {
    socket?.close();
  } catch {
    // already closed
  }
}

/**
 * Sends one datagram. UDP is fire-and-forget, and under load the native module
 * doesn't always report back, so don't wait more than SEND_CALLBACK_MS for it.
 */
function send(socket: UdpSocket, data: Uint8Array, port: number, host: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, SEND_CALLBACK_MS);
    try {
      socket.send(data, 0, data.length, port, host, error => {
        clearTimeout(timer);
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    } catch (error) {
      clearTimeout(timer);
      reject(error);
    }
  });
}

/** Resolves true once `match` accepts a message from `host`, false after `timeoutMs`. */
function waitForMessage(
  socket: UdpSocket,
  host: string,
  timeoutMs: number,
  match: (msg: Uint8Array) => boolean,
): Promise<boolean> {
  return new Promise(resolve => {
    const onMessage = (msg: Uint8Array, rinfo: { address: string }) => {
      if (rinfo.address === host && match(msg)) {
        finish(true);
      }
    };
    const finish = (result: boolean) => {
      clearTimeout(timer);
      socket.removeListener('message', onMessage);
      resolve(result);
    };
    const timer = setTimeout(() => finish(false), timeoutMs);
    socket.on('message', onMessage);
  });
}

/**
 * Asks hosts for their AuraHD info by unicast (iPhones can't broadcast UDP
 * without a special entitlement) and reports every box that answers.
 *
 * Only ask hosts known to be alive: the native module sends one datagram at a
 * time, and a datagram to an address where nothing lives stalls for seconds
 * on address resolution, which would delay the queries to real boxes.
 */
export class AuraDiscovery {
  readonly found = new Map<string, AuraInfo>();
  private readonly asked = new Set<string>();
  private closed = false;
  private pending = 0;
  private next = 0;
  private idleWaiters: Array<() => void> = [];

  private constructor(
    private readonly sockets: UdpSocket[],
    private readonly onFound?: (ip: string, info: AuraInfo) => void,
  ) {
    for (const socket of sockets) {
      socket.on('message', (msg: Uint8Array, rinfo: { address: string }) => {
        const info = parseInfo(msg);
        if (info && !this.closed && !this.found.has(rinfo.address)) {
          this.found.set(rinfo.address, info);
          this.onFound?.(rinfo.address, info);
        }
      });
    }
  }

  /**
   * Opens `poolSize` sockets. The native module sends one datagram at a time
   * per socket (~50 ms each), so a pool spreads a subnet's worth of queries.
   * Null if no socket could be opened.
   */
  static async start(
    onFound?: (ip: string, info: AuraInfo) => void,
    poolSize = DISCOVERY_SOCKETS,
  ): Promise<AuraDiscovery | null> {
    const opened = await Promise.all(
      Array.from({ length: poolSize }, () => openUdpSocket().catch(() => null)),
    );
    const sockets = opened.filter((s): s is UdpSocket => s !== null);
    return sockets.length > 0 ? new AuraDiscovery(sockets, onFound) : null;
  }

  /** Ask one host (again, if asked before and still silent). */
  ask(host: string): void {
    if (this.closed || this.found.has(host)) {
      return;
    }
    this.asked.add(host);
    const socket = this.sockets[this.next++ % this.sockets.length];
    const solicit = solicitMessage(socket.address().port);
    this.pending++;
    const done = () => {
      this.pending--;
      if (this.pending === 0) {
        this.idleWaiters.splice(0).forEach(resolve => resolve());
      }
    };
    try {
      socket.send(solicit, 0, solicit.length, AURA_DISCOVERY_PORT, host, done);
    } catch {
      done(); // socket closed meanwhile
    }
  }

  /** Resolves once every query asked so far has been sent, or after `maxMs`. */
  sent(maxMs: number): Promise<void> {
    if (this.pending === 0) {
      return Promise.resolve();
    }
    return new Promise(resolve => {
      const timer = setTimeout(resolve, maxMs);
      this.idleWaiters.push(() => {
        clearTimeout(timer);
        resolve();
      });
    });
  }

  /** Optionally re-ask silent hosts, wait `waitMs` for late replies, then close. */
  async finish(waitMs: number, retry = true): Promise<Map<string, AuraInfo>> {
    // A single UDP packet can get lost on busy Wi-Fi: ask the silent ones again.
    if (retry) {
      this.asked.forEach(host => this.ask(host));
      await this.sent(MAX_SEND_WAIT_MS);
    }
    await delay(waitMs);
    this.close();
    return this.found;
  }

  close(): void {
    this.closed = true;
    this.sockets.forEach(closeQuietly);
  }
}

/** Ask specific hosts (e.g. an IP typed by the user) and wait for answers. */
export async function discoverAuraBoxes(
  hosts: string[],
  waitMs: number,
): Promise<Map<string, AuraInfo>> {
  const session = await AuraDiscovery.start(undefined, Math.min(DISCOVERY_SOCKETS, hosts.length));
  if (!session) {
    return new Map();
  }
  hosts.forEach(host => session.ask(host));
  await session.sent(MAX_SEND_WAIT_MS);
  await delay(Math.min(500, waitMs));
  return session.finish(waitMs);
}

class AuraService {
  private socket: UdpSocket | null = null;
  private device: MAGDevice | null = null;
  private keepAliveTimer: ReturnType<typeof setInterval> | null = null;
  /** Serialises key events so press/release pairs never interleave. */
  private queue: Promise<unknown> = Promise.resolve();

  /** Handshake with the box using `device.password`. */
  async connect(device: MAGDevice): Promise<AuraConnectResult> {
    this.disconnect();
    const password = device.password ?? '';
    let socket: UdpSocket;
    try {
      socket = await openUdpSocket();
    } catch {
      return 'unreachable';
    }

    for (let i = 0; i < PING_TRIES; i++) {
      const reply = waitForMessage(socket, device.ip, PING_WAIT_MS, msg =>
        isPingResponse(password, msg),
      );
      await send(socket, pingRequest(password), device.port, device.ip).catch(() => undefined);
      if (await reply) {
        this.socket = socket;
        this.device = device;
        this.startKeepAlive();
        return 'ok';
      }
    }

    // No valid reply. If the box still answers discovery, the password is wrong.
    const info = waitForMessage(socket, device.ip, INFO_WAIT_MS, msg => parseInfo(msg) !== null);
    await send(socket, solicitMessage(socket.address().port), AURA_DISCOVERY_PORT, device.ip).catch(
      () => undefined,
    );
    const reachable = await info;
    closeQuietly(socket);
    return reachable ? 'rejected' : 'unreachable';
  }

  disconnect(): void {
    if (this.keepAliveTimer) {
      clearInterval(this.keepAliveTimer);
      this.keepAliveTimer = null;
    }
    closeQuietly(this.socket);
    this.socket = null;
    this.device = null;
  }

  isConnected(): boolean {
    return this.device !== null;
  }

  private startKeepAlive(): void {
    this.keepAliveTimer = setInterval(() => {
      this.enqueue([pingRequest(this.device?.password ?? '')]).catch(() => undefined);
    }, KEEP_ALIVE_MS);
  }

  private async ensureSocket(): Promise<UdpSocket> {
    if (!this.socket) {
      this.socket = await openUdpSocket();
    }
    return this.socket;
  }

  private enqueue(messages: Uint8Array[]): Promise<void> {
    const run = async () => {
      const device = this.device;
      if (!device) {
        throw new Error('Not connected to any device');
      }
      const socket = await this.ensureSocket();
      for (let i = 0; i < messages.length; i++) {
        if (i > 0) {
          await delay(KEY_GAP_MS);
        }
        await send(socket, messages[i], device.port, device.ip);
      }
    };
    const result = this.queue.then(run, run);
    this.queue = result.catch(() => undefined);
    return result;
  }

  async sendCommand(command: MAGCommand): Promise<boolean> {
    const messages = buttonMessages(this.device?.password ?? '', command);
    if (messages.length === 0) {
      return false;
    }
    try {
      await this.enqueue(messages);
      return true;
    } catch (error) {
      console.warn('AuraHD: failed to send button', command, error);
      return false;
    }
  }

  async sendText(text: string): Promise<boolean> {
    const password = this.device?.password ?? '';
    try {
      for (const char of text) {
        await this.enqueue(charMessages(password, char));
      }
      return true;
    } catch (error) {
      console.warn('AuraHD: failed to send text', error);
      return false;
    }
  }
}

export default new AuraService();
