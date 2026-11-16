/**
 * Thin wrapper around a react-native-tcp-socket connection that speaks the
 * MAG remote framing: buffers incoming bytes, splits them into frames and
 * lets callers wait for the next reply.
 */
import TcpSocket from 'react-native-tcp-socket';
import { MAGFrame, MAG_REMOTE_PORT, splitFrames } from './magProtocol';

type Socket = ReturnType<typeof TcpSocket.createConnection>;

interface Waiter {
  resolve: (frame: MAGFrame) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

/** Unread replies we keep around (keep-alive pings produce replies nobody waits for). */
const MAX_QUEUED_FRAMES = 20;

export class MAGConnection {
  private buffer: Uint8Array = new Uint8Array(0);
  private frames: MAGFrame[] = [];
  private waiters: Waiter[] = [];
  private closed = false;
  onClose?: () => void;

  private constructor(private readonly socket: Socket) {
    socket.on('data', data => this.handleData(data));
    socket.on('error', () => this.handleClose());
    socket.on('close', () => this.handleClose());
  }

  static open(host: string, timeoutMs = 3000): Promise<MAGConnection> {
    return new Promise((resolve, reject) => {
      let settled = false;
      const onError = (error: Error) => fail(error);
      const onClose = () => fail(new Error('Connection closed'));
      const socket = TcpSocket.createConnection(
        { host, port: MAG_REMOTE_PORT, connectTimeout: timeoutMs },
        () => {
          if (settled) {
            return;
          }
          settled = true;
          clearTimeout(timer);
          socket.off('error', onError);
          socket.off('close', onClose);
          resolve(new MAGConnection(socket));
        },
      );
      function fail(error: Error) {
        if (settled) {
          return;
        }
        settled = true;
        clearTimeout(timer);
        socket.destroy();
        reject(error);
      }
      const timer = setTimeout(() => fail(new Error('Connection timed out')), timeoutMs);
      socket.on('error', onError);
      socket.on('close', onClose);
    });
  }

  get isClosed(): boolean {
    return this.closed;
  }

  write(bytes: Uint8Array): Promise<void> {
    if (this.closed) {
      return Promise.reject(new Error('Connection closed'));
    }
    return new Promise((resolve, reject) => {
      this.socket.write(bytes, undefined, error => (error ? reject(error) : resolve()));
    });
  }

  /** Resolve with the next reply frame, or reject after `timeoutMs`. */
  nextFrame(timeoutMs: number): Promise<MAGFrame> {
    const queued = this.frames.shift();
    if (queued) {
      return Promise.resolve(queued);
    }
    if (this.closed) {
      return Promise.reject(new Error('Connection closed'));
    }
    return new Promise((resolve, reject) => {
      const waiter: Waiter = {
        resolve,
        reject,
        timer: setTimeout(() => {
          this.waiters = this.waiters.filter(w => w !== waiter);
          reject(new Error('Timed out waiting for reply'));
        }, timeoutMs),
      };
      this.waiters.push(waiter);
    });
  }

  /** Forget replies that arrived earlier (e.g. before sending a new request). */
  clearPendingFrames(): void {
    this.frames = [];
  }

  close(): void {
    if (!this.closed) {
      this.socket.destroy();
      this.handleClose();
    }
  }

  private handleData(data: Uint8Array | string): void {
    const chunk = typeof data === 'string' ? Uint8Array.from(data, c => c.charCodeAt(0)) : new Uint8Array(data);
    const merged = new Uint8Array(this.buffer.length + chunk.length);
    merged.set(this.buffer);
    merged.set(chunk, this.buffer.length);

    const { frames, rest } = splitFrames(merged);
    this.buffer = rest;
    for (const frame of frames) {
      const waiter = this.waiters.shift();
      if (waiter) {
        clearTimeout(waiter.timer);
        waiter.resolve(frame);
      } else {
        this.frames.push(frame);
        if (this.frames.length > MAX_QUEUED_FRAMES) {
          this.frames.shift();
        }
      }
    }
  }

  private handleClose(): void {
    if (this.closed) {
      return;
    }
    this.closed = true;
    const waiters = this.waiters;
    this.waiters = [];
    waiters.forEach(w => {
      clearTimeout(w.timer);
      w.reject(new Error('Connection closed'));
    });
    this.onClose?.();
  }
}

/**
 * True if `host` accepts TCP connections on the MAG remote port, i.e. it is
 * a MAG box with "Remote control" enabled. Used for discovery.
 */
export async function isMagRemotePortOpen(host: string, timeoutMs: number): Promise<boolean> {
  try {
    const connection = await MAGConnection.open(host, timeoutMs);
    connection.close();
    return true;
  } catch {
    return false;
  }
}
