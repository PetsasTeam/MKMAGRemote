/**
 * Device Discovery Service
 *
 * MAG boxes with "Remote control" enabled listen on TCP port 40611, which is
 * specific to the MAG remote protocol. Discovery reads the phone's Wi-Fi IP,
 * then checks that port on every address in the same /24 network in parallel.
 * A /24 scan typically finishes in a few seconds.
 */
import NetInfo from '@react-native-community/netinfo';
import { MAGDevice } from '../types';
import { isMagRemotePortOpen } from './MAGConnection';
import { MAG_REMOTE_PORT } from './magProtocol';

const PROBE_TIMEOUT_MS = 800;
const MANUAL_PROBE_TIMEOUT_MS = 3000;
const CONCURRENCY = 32;

export class NoWifiError extends Error {
  constructor() {
    super('Connect your phone to the same Wi-Fi network as your MAG box.');
  }
}

export function isValidIPv4(ip: string): boolean {
  const parts = ip.trim().split('.');
  return (
    parts.length === 4 &&
    parts.every(p => /^\d{1,3}$/.test(p) && Number(p) <= 255)
  );
}

export function makeMagDevice(ip: string): MAGDevice {
  return {
    id: `${ip}:${MAG_REMOTE_PORT}`,
    name: `MAG (${ip})`,
    ip,
    port: MAG_REMOTE_PORT,
    model: 'MAG',
  };
}

class DeviceDiscoveryService {
  private scanGeneration = 0;
  private scanning = false;

  /** The phone's IPv4 address on Wi-Fi/Ethernet, or null if not on a LAN. */
  async getLocalIpAddress(): Promise<string | null> {
    const state = await NetInfo.fetch();
    if (state.type !== 'wifi' && state.type !== 'ethernet') {
      return null;
    }
    const ip = (state.details as { ipAddress?: string | null } | null)?.ipAddress;
    return ip && isValidIPv4(ip) ? ip : null;
  }

  /**
   * Scan the local network. Throws NoWifiError if the phone isn't on Wi-Fi.
   * Devices are reported through `onDeviceFound` as soon as they answer.
   */
  async scanNetwork(
    onDeviceFound?: (device: MAGDevice) => void,
    onProgress?: (progress: number) => void,
  ): Promise<MAGDevice[]> {
    const localIp = await this.getLocalIpAddress();
    if (!localIp) {
      throw new NoWifiError();
    }

    const generation = ++this.scanGeneration;
    this.scanning = true;
    const prefix = localIp.split('.').slice(0, 3).join('.');
    const targets: string[] = [];
    for (let i = 1; i <= 254; i++) {
      const ip = `${prefix}.${i}`;
      if (ip !== localIp) {
        targets.push(ip);
      }
    }

    const found: MAGDevice[] = [];
    let next = 0;
    let done = 0;
    const worker = async () => {
      while (next < targets.length && generation === this.scanGeneration) {
        const ip = targets[next++];
        if (await isMagRemotePortOpen(ip, PROBE_TIMEOUT_MS)) {
          if (generation !== this.scanGeneration) {
            return;
          }
          const device = makeMagDevice(ip);
          found.push(device);
          onDeviceFound?.(device);
        }
        done++;
        onProgress?.((done / targets.length) * 100);
      }
    };

    try {
      await Promise.all(Array.from({ length: CONCURRENCY }, worker));
    } finally {
      if (generation === this.scanGeneration) {
        this.scanning = false;
      }
    }
    return found;
  }

  /** Kept for existing callers: a full /24 scan is already fast. */
  quickScan(onDeviceFound?: (device: MAGDevice) => void): Promise<MAGDevice[]> {
    return this.scanNetwork(onDeviceFound);
  }

  /** Check one IP. Returns null if nothing answers on the MAG remote port. */
  async addManualDevice(ip: string): Promise<MAGDevice | null> {
    const trimmed = ip.trim();
    if (!isValidIPv4(trimmed)) {
      return null;
    }
    return (await isMagRemotePortOpen(trimmed, MANUAL_PROBE_TIMEOUT_MS))
      ? makeMagDevice(trimmed)
      : null;
  }

  stopScan(): void {
    this.scanGeneration++;
    this.scanning = false;
  }

  getIsScanning(): boolean {
    return this.scanning;
  }
}

// Export singleton instance
export default new DeviceDiscoveryService();
