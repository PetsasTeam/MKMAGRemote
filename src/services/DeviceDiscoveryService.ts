/**
 * Device Discovery Service
 *
 * MAG boxes with "Remote control" enabled listen on TCP port 40611, which is
 * specific to the MAG remote protocol. Boxes with it switched off don't open
 * that port, but Infomir's Linux firmware still runs a Dropbear SSH server on
 * port 22, so those are reported too (as "remote control off") and the user is
 * told how to enable it. iOS gives apps no access to MAC addresses, so the
 * SSH banner is the best fingerprint available; other Dropbear devices
 * (some routers, NAS boxes) can show up as possible boxes as well.
 *
 * The scan covers the phone's whole Wi-Fi subnet (up to MAX_SCAN_HOSTS
 * addresses), checking hosts in parallel.
 */
import NetInfo from '@react-native-community/netinfo';
import TcpSocket from 'react-native-tcp-socket';
import { MAGDevice } from '../types';
import { isMagRemotePortOpen, nativeConnectTimeout } from './MAGConnection';
import { MAG_REMOTE_PORT } from './magProtocol';

const PROBE_TIMEOUT_MS = 800;
const MANUAL_PROBE_TIMEOUT_MS = 3000;
const CONCURRENCY = 32;
const SSH_PORT = 22;
/** Largest subnet scanned in full (a /22). Bigger networks scan the phone's /24. */
export const MAX_SCAN_HOSTS = 1022;

/** A device found by a scan. `remoteControlOff` = looks like a MAG, but port 40611 is closed. */
export interface DiscoveredDevice extends MAGDevice {
  remoteControlOff?: boolean;
}

/** Infomir's Linux firmware ships Dropbear as its SSH server. */
export function isLikelyMagSshBanner(banner: string | null): boolean {
  return !!banner && /^SSH-2\.0-dropbear/i.test(banner.trim());
}

function ipToInt(ip: string): number {
  return ip.split('.').reduce((acc, part) => acc * 256 + Number(part), 0);
}

function intToIp(n: number): string {
  return [24, 16, 8, 0].map(shift => Math.floor(n / 2 ** shift) % 256).join('.');
}

/**
 * Every host address on the phone's subnet, excluding the phone itself.
 * Falls back to the phone's /24 when the mask is missing, invalid or the
 * subnet has more than `maxHosts` addresses.
 */
export function hostsToScan(
  localIp: string,
  subnetMask: string | null | undefined,
  maxHosts = MAX_SCAN_HOSTS,
): string[] {
  let mask = 0xffffff00;
  if (subnetMask && isValidIPv4(subnetMask)) {
    const m = ipToInt(subnetMask);
    const hostBits = 32 - m.toString(2).replace(/0+$/, '').length;
    const contiguous = m === 0 ? false : (2 ** 32 - 2 ** hostBits) === m;
    const hostCount = 2 ** hostBits - 2;
    if (contiguous && hostBits >= 2 && hostCount <= maxHosts) {
      mask = m;
    }
  }
  const hostBits = 32 - mask.toString(2).replace(/0+$/, '').length;
  const size = 2 ** hostBits;
  const local = ipToInt(localIp);
  const network = local - (local % size);
  const hosts: string[] = [];
  for (let n = network + 1; n < network + size - 1; n++) {
    if (n !== local) {
      hosts.push(intToIp(n));
    }
  }
  return hosts;
}

/** Read the first line a TCP service sends (e.g. an SSH banner), or null. */
export function readBanner(host: string, port: number, timeoutMs: number): Promise<string | null> {
  return new Promise(resolve => {
    let settled = false;
    let text = '';
    const socket = TcpSocket.createConnection(
      { host, port, connectTimeout: nativeConnectTimeout(timeoutMs) },
      () => {},
    );
    const finish = (value: string | null) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      socket.destroy();
      resolve(value);
    };
    const timer = setTimeout(() => finish(text ? text.trim() : null), timeoutMs);
    socket.on('data', data => {
      text += typeof data === 'string' ? data : String.fromCharCode(...new Uint8Array(data as ArrayBuffer));
      const newline = text.indexOf('\n');
      if (newline >= 0) {
        finish(text.slice(0, newline).trim());
      }
    });
    socket.on('error', () => finish(null));
    socket.on('close', () => finish(text ? text.trim() : null));
  });
}

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

  /** The phone's IPv4 address and subnet mask on Wi-Fi/Ethernet, or null if not on a LAN. */
  async getLocalNetwork(): Promise<{ ip: string; subnet: string | null } | null> {
    const state = await NetInfo.fetch();
    if (state.type !== 'wifi' && state.type !== 'ethernet') {
      return null;
    }
    const details = state.details as { ipAddress?: string | null; subnet?: string | null } | null;
    const ip = details?.ipAddress;
    if (!ip || !isValidIPv4(ip)) {
      return null;
    }
    return { ip, subnet: details?.subnet ?? null };
  }

  /** The phone's IPv4 address on Wi-Fi/Ethernet, or null if not on a LAN. */
  async getLocalIpAddress(): Promise<string | null> {
    return (await this.getLocalNetwork())?.ip ?? null;
  }

  /** Check one host: ready (40611 open), remote control off (Dropbear SSH), or nothing. */
  async probeHost(ip: string, timeoutMs = PROBE_TIMEOUT_MS): Promise<DiscoveredDevice | null> {
    const [remoteOpen, banner] = await Promise.all([
      isMagRemotePortOpen(ip, timeoutMs),
      readBanner(ip, SSH_PORT, timeoutMs),
    ]);
    if (remoteOpen) {
      return makeMagDevice(ip);
    }
    if (isLikelyMagSshBanner(banner)) {
      return { ...makeMagDevice(ip), name: `Possible MAG (${ip})`, remoteControlOff: true };
    }
    return null;
  }

  /**
   * Scan the local network. Throws NoWifiError if the phone isn't on Wi-Fi.
   * Devices are reported through `onDeviceFound` as soon as they answer.
   */
  async scanNetwork(
    onDeviceFound?: (device: DiscoveredDevice) => void,
    onProgress?: (progress: number) => void,
  ): Promise<DiscoveredDevice[]> {
    const network = await this.getLocalNetwork();
    if (!network) {
      throw new NoWifiError();
    }

    const generation = ++this.scanGeneration;
    this.scanning = true;
    const targets = hostsToScan(network.ip, network.subnet);

    const found: DiscoveredDevice[] = [];
    let next = 0;
    let done = 0;
    const worker = async () => {
      while (next < targets.length && generation === this.scanGeneration) {
        const ip = targets[next++];
        const device = await this.probeHost(ip);
        if (device) {
          if (generation !== this.scanGeneration) {
            return;
          }
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
  quickScan(onDeviceFound?: (device: DiscoveredDevice) => void): Promise<DiscoveredDevice[]> {
    return this.scanNetwork(onDeviceFound);
  }

  /**
   * Check one IP. Returns a ready device, a device with `remoteControlOff`
   * (looks like a MAG but port 40611 is closed), or null if nothing matches.
   */
  async addManualDevice(ip: string): Promise<DiscoveredDevice | null> {
    const trimmed = ip.trim();
    if (!isValidIPv4(trimmed)) {
      return null;
    }
    return this.probeHost(trimmed, MANUAL_PROBE_TIMEOUT_MS);
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
