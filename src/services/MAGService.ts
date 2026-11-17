/**
 * MAG Device Service
 *
 * Talks to MAG set-top boxes using the same protocol as Infomir's official
 * "MAGic Remote" app: an encrypted TCP session on port 40611, authorised by a
 * one-time pairing where the box shows a 6-digit code on the TV.
 *
 * Boxes that speak the AuraHD Remote protocol instead (UDP, Device name +
 * Password) are handed to AuraService; callers don't need to know which.
 *
 * On the box: Settings -> System settings -> Remote control -> enable it.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MAGDevice, MAGCommand } from '../types';
import { MAGConnection } from './MAGConnection';
import AuraService from './AuraService';
import { isAuraCommandSupported } from './auraProtocol';
import { getRcCode, isCommandSupported } from './magKeyCodes';
import {
  MAGIdentity,
  connectRequest,
  decryptReply,
  keyboardChar,
  pairingComplete,
  pairingRequest,
  ping,
  rcCode,
} from './magProtocol';

/**
 * 'unreachable': no TCP connection (box off, remote control disabled, wrong IP).
 * 'rejected': the box answered but not with our pairing (needs re-pairing).
 */
export type ConnectResult = 'ok' | 'unreachable' | 'rejected';

const DEVICE_ID_KEY = 'mag_remote_device_id';
const DEVICE_DESCRIPTION = 'MAG Remote';
const REPLY_TIMEOUT_MS = 4000;
const KEEP_ALIVE_MS = 15000;
const TEXT_CHAR_DELAY_MS = 40;

const delay = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

class SessionError extends Error {
  constructor(
    readonly result: Exclude<ConnectResult, 'ok'>,
    message: string,
  ) {
    super(message);
  }
}

class MAGService {
  private identity: MAGIdentity | null = null;
  private currentDevice: MAGDevice | null = null;
  private connection: MAGConnection | null = null;
  private pairingSession: { ip: string; connection: MAGConnection } | null = null;
  private keepAliveTimer: ReturnType<typeof setInterval> | null = null;
  /** Serialises everything written to the box so messages never interleave. */
  private queue: Promise<unknown> = Promise.resolve();

  // ---------------------------------------------------------------- identity

  /** A random id that stays the same for this phone; the box remembers it when pairing. */
  private async getIdentity(): Promise<MAGIdentity> {
    if (this.identity) {
      return this.identity;
    }
    let devId = await AsyncStorage.getItem(DEVICE_ID_KEY);
    if (!devId) {
      devId = Array.from({ length: 16 }, () => Math.floor(Math.random() * 16).toString(16)).join(
        '',
      );
      await AsyncStorage.setItem(DEVICE_ID_KEY, devId);
    }
    this.identity = { devId, devDescr: DEVICE_DESCRIPTION };
    return this.identity;
  }

  // ----------------------------------------------------------------- pairing

  /**
   * Step 1 of pairing: ask the box for a code. On success the TV shows a
   * 6-digit code; pass it to completePairing().
   */
  async startPairing(ip: string): Promise<void> {
    this.cancelPairing();
    const identity = await this.getIdentity();
    const connection = await MAGConnection.open(ip);
    await connection.write(pairingRequest(identity));
    this.pairingSession = { ip, connection };
  }

  /** Step 2 of pairing. Resolves true if the box accepts the code. */
  async completePairing(code: string): Promise<boolean> {
    const session = this.pairingSession;
    if (!session) {
      throw new Error('Pairing was not started');
    }
    const identity = await this.getIdentity();
    try {
      await session.connection.write(pairingComplete(identity, code));
      // Give the box a moment to store the pairing; its reply content isn't needed.
      await session.connection.nextFrame(1500).catch(() => undefined);
    } finally {
      session.connection.close();
      this.pairingSession = null;
    }

    // Prove the code works by opening a real session with it.
    try {
      const connection = await this.openSession(session.ip, code);
      connection.close();
      return true;
    } catch {
      return false;
    }
  }

  cancelPairing(): void {
    this.pairingSession?.connection.close();
    this.pairingSession = null;
  }

  // ----------------------------------------------------------------- session

  private async openSession(ip: string, code: string): Promise<MAGConnection> {
    const identity = await this.getIdentity();
    let connection: MAGConnection;
    try {
      connection = await MAGConnection.open(ip);
    } catch (error) {
      throw new SessionError('unreachable', `Cannot reach ${ip}: ${String(error)}`);
    }

    try {
      await connection.write(connectRequest(identity));
      const reply = await connection.nextFrame(REPLY_TIMEOUT_MS);
      if (decryptReply(code, reply.body) === null) {
        throw new Error('Reply could not be decrypted with the pairing code');
      }
      await connection.write(ping(identity, code));
      // The ping reply only confirms the session; don't fail if it is slow.
      await connection.nextFrame(REPLY_TIMEOUT_MS).catch(() => undefined);
      return connection;
    } catch (error) {
      connection.close();
      throw new SessionError('rejected', String(error));
    }
  }

  /** Connect to a paired device (or, for AuraHD boxes, one with a password). */
  async connect(device: MAGDevice): Promise<ConnectResult> {
    this.disconnect();
    if (device.protocol === 'aurahd') {
      const result = await AuraService.connect(device);
      if (result === 'ok') {
        this.currentDevice = device;
      }
      return result;
    }
    if (!device.pairingCode) {
      return 'rejected';
    }
    try {
      const connection = await this.openSession(device.ip, device.pairingCode);
      this.currentDevice = device;
      this.attach(connection);
      this.startKeepAlive();
      return 'ok';
    } catch (error) {
      return error instanceof SessionError ? error.result : 'unreachable';
    }
  }

  disconnect(): void {
    AuraService.disconnect();
    this.stopKeepAlive();
    this.connection?.close();
    this.connection = null;
    this.currentDevice = null;
  }

  /** True while a device is selected. Dropped sockets are reopened on the next command. */
  isConnected(): boolean {
    return this.currentDevice !== null;
  }

  getCurrentDevice(): MAGDevice | null {
    return this.currentDevice;
  }

  private attach(connection: MAGConnection): void {
    this.connection = connection;
    connection.onClose = () => {
      if (this.connection === connection) {
        this.connection = null;
      }
    };
  }

  private async ensureConnection(): Promise<{ connection: MAGConnection; code: string }> {
    const device = this.currentDevice;
    if (!device?.pairingCode) {
      throw new Error('Not connected to any device');
    }
    if (!this.connection || this.connection.isClosed) {
      this.attach(await this.openSession(device.ip, device.pairingCode));
    }
    return { connection: this.connection!, code: device.pairingCode };
  }

  /** Run `task` after everything queued before it; retry once on a fresh socket. */
  private enqueue<T>(task: (connection: MAGConnection, code: string) => Promise<T>): Promise<T> {
    const run = async () => {
      try {
        const { connection, code } = await this.ensureConnection();
        return await task(connection, code);
      } catch (error) {
        if (!this.currentDevice) {
          throw error;
        }
        // The box may have dropped an idle connection: reconnect and retry once.
        this.connection?.close();
        this.connection = null;
        const { connection, code } = await this.ensureConnection();
        return await task(connection, code);
      }
    };
    const result = this.queue.then(run, run);
    this.queue = result.catch(() => undefined);
    return result;
  }

  private startKeepAlive(): void {
    this.stopKeepAlive();
    this.keepAliveTimer = setInterval(() => {
      const connection = this.connection;
      const code = this.currentDevice?.pairingCode;
      if (!connection || connection.isClosed || !code) {
        return; // reconnect lazily on the next command instead
      }
      this.queue = this.queue
        .then(async () => connection.write(ping(await this.getIdentity(), code)))
        .catch(() => connection.close());
    }, KEEP_ALIVE_MS);
  }

  private stopKeepAlive(): void {
    if (this.keepAliveTimer) {
      clearInterval(this.keepAliveTimer);
      this.keepAliveTimer = null;
    }
  }

  // ---------------------------------------------------------------- commands

  private isAura(): boolean {
    return this.currentDevice?.protocol === 'aurahd';
  }

  isCommandSupported(command: MAGCommand): boolean {
    return this.isCommandSupportedFor(this.currentDevice, command);
  }

  /** Whether `device` (MAGic Remote by default) can receive `command`, connected or not. */
  isCommandSupportedFor(device: MAGDevice | null, command: MAGCommand): boolean {
    return device?.protocol === 'aurahd'
      ? isAuraCommandSupported(command)
      : isCommandSupported(command);
  }

  /** Send a remote button. Returns false if it failed or the button has no MAG code. */
  async sendCommand(command: MAGCommand): Promise<boolean> {
    if (this.isAura()) {
      return AuraService.sendCommand(command);
    }
    const code = getRcCode(command);
    if (code === undefined) {
      return false;
    }
    return this.sendRcCode(code);
  }

  /** Send a raw MAG rc code (see magKeyCodes.ts). */
  async sendRcCode(code: number): Promise<boolean> {
    const identity = await this.getIdentity();
    try {
      await this.enqueue(async (connection, pairingCode) => {
        connection.clearPendingFrames();
        await connection.write(rcCode(identity, pairingCode, code));
        await connection.write(ping(identity, pairingCode));
      });
      return true;
    } catch (error) {
      console.warn('Failed to send rc code', code, error);
      return false;
    }
  }

  /** Type text into the focused field on the TV (search boxes, URLs, logins). */
  async sendText(text: string): Promise<boolean> {
    if (!text) {
      return true;
    }
    if (this.isAura()) {
      return AuraService.sendText(text);
    }
    const identity = await this.getIdentity();
    try {
      await this.enqueue(async (connection, pairingCode) => {
        for (const char of text) {
          await connection.write(keyboardChar(identity, pairingCode, char));
          await delay(TEXT_CHAR_DELAY_MS);
        }
      });
      return true;
    } catch (error) {
      console.warn('Failed to send text', error);
      return false;
    }
  }
}

// Export singleton instance
export default new MAGService();
