/**
 * Device Discovery Service
 *
 * MAG boxes speak one of two remote protocols, depending on firmware:
 *  - MAGic Remote: the box listens on TCP port 40611 (pairing code on the TV).
 *  - AuraHD Remote: the box answers a UDP query on port 6000 (Device name +
 *    Password); see AuraService.AuraDiscovery.
 * Both only answer while Settings → System settings → Remote control is on,
 * so only boxes that can actually be controlled are listed.
 *
 * The scan covers the phone's whole Wi-Fi subnet (up to MAX_SCAN_HOSTS
 * addresses), checking hosts in parallel.
 */
import NetInfo from '@react-native-community/netinfo';
import { MAGDevice } from '../types';
import { AuraDiscovery, MAX_SEND_WAIT_MS, discoverAuraBoxes } from './AuraService';
import { AuraInfo } from './auraProtocol';
import { isMagRemotePortOpen } from './MAGConnection';
import { MAG_REMOTE_PORT } from './magProtocol';

const PROBE_TIMEOUT_MS = 800;
const MANUAL_PROBE_TIMEOUT_MS = 3000;
const CONCURRENCY = 32;
/** How long to wait for AuraHD boxes to answer after asking every host. */
const AURA_WAIT_MS = 800;
const MANUAL_AURA_WAIT_MS = 1500;
/** Largest subnet scanned in full (a /22). Bigger networks scan the phone's /24. */
export const MAX_SCAN_HOSTS = 1022;

const delay = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

/** A device found by a scan: a box that answered one of the remote protocols. */
export type DiscoveredDevice = MAGDevice;

/** A box that answered AuraHD discovery (connects with its Remote control password). */
export function makeAuraDevice(ip: string, info: AuraInfo): DiscoveredDevice {
  const model = info.type || 'MAG';
  return {
    id: `${ip}:${info.port}`,
    name: info.name ? `${model} “${info.name}”` : `${model} (${ip})`,
    ip,
    port: info.port,
    model,
    protocol: 'aurahd',
    serial: info.serialNumber || undefined,
  };
}

/** Adds a device to scan results, replacing an earlier entry with the same id. */
export function mergeDiscovered(
  list: DiscoveredDevice[],
  device: DiscoveredDevice,
): DiscoveredDevice[] {
  return [...list.filter(d => d.id !== device.id), device];
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
    const contiguous = m === 0 ? false : 2 ** 32 - 2 ** hostBits === m;
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

export class NoWifiError extends Error {
  constructor() {
    super('Connect your phone to the same Wi-Fi network as your MAG box.');
  }
}

export function isValidIPv4(ip: string): boolean {
  const parts = ip.trim().split('.');
  return parts.length === 4 && parts.every(p => /^\d{1,3}$/.test(p) && Number(p) <= 255);
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
  async getLocalNetwork(): Promise<{
    ip: string;
    subnet: string | null;
  } | null> {
    const state = await NetInfo.fetch();
    if (state.type !== 'wifi' && state.type !== 'ethernet') {
      return null;
    }
    const details = state.details as {
      ipAddress?: string | null;
      subnet?: string | null;
    } | null;
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

  /** Check one host for the MAGic Remote protocol (TCP 40611). */
  async probeHost(ip: string, timeoutMs = PROBE_TIMEOUT_MS): Promise<DiscoveredDevice | null> {
    return (await isMagRemotePortOpen(ip, timeoutMs)) ? makeMagDevice(ip) : null;
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

    let found: DiscoveredDevice[] = [];
    const report = (device: DiscoveredDevice) => {
      if (generation !== this.scanGeneration) {
        return;
      }
      found = mergeDiscovered(found, device);
      onDeviceFound?.(device);
    };
    // AuraHD boxes answer over UDP. Ask every host first, while the network
    // stack is idle: running this alongside the TCP probes below slows the
    // native sends to a crawl. Replies keep arriving during the TCP scan.
    const aura = await AuraDiscovery.start((ip, info) => report(makeAuraDevice(ip, info)));
    if (aura) {
      targets.forEach(ip => aura.ask(ip));
      await aura.sent(MAX_SEND_WAIT_MS);
      await delay(AURA_WAIT_MS);
      // A UDP packet can get lost on busy Wi-Fi: ask the silent hosts once more.
      targets.filter(ip => !aura.found.has(ip)).forEach(ip => aura.ask(ip));
      await aura.sent(MAX_SEND_WAIT_MS);
    }
    let next = 0;
    let done = 0;
    const worker = async () => {
      while (next < targets.length && generation === this.scanGeneration) {
        const ip = targets[next++];
        if (await isMagRemotePortOpen(ip, PROBE_TIMEOUT_MS)) {
          report(makeMagDevice(ip));
        }
        done++;
        onProgress?.((done / targets.length) * 100);
      }
    };

    try {
      await Promise.all(Array.from({ length: CONCURRENCY }, worker));
      if (aura && generation === this.scanGeneration) {
        await aura.finish(0, false);
      }
    } finally {
      aura?.close();
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

  /** Check one IP for either remote protocol (MAGic Remote or AuraHD); null if neither answers. */
  async addManualDevice(ip: string): Promise<DiscoveredDevice | null> {
    const trimmed = ip.trim();
    if (!isValidIPv4(trimmed)) {
      return null;
    }
    const [probed, aura] = await Promise.all([
      this.probeHost(trimmed, MANUAL_PROBE_TIMEOUT_MS),
      discoverAuraBoxes([trimmed], MANUAL_AURA_WAIT_MS),
    ]);
    const info = aura.get(trimmed);
    return probed ?? (info ? makeAuraDevice(trimmed, info) : null);
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
