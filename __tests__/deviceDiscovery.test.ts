/// <reference types="node" />
/**
 * Discovery helpers: which addresses a scan covers, how a MAG box with
 * Remote control switched off is recognised (Dropbear SSH banner), and
 * reading a service banner over TCP.
 */
import net from 'net';

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
jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  default: { fetch: jest.fn() },
}));

// Imported after the mocks are registered.
import {
  hostsToScan,
  isLikelyMagSshBanner,
  readBanner,
} from '../src/services/DeviceDiscoveryService';
import { nativeConnectTimeout } from '../src/services/MAGConnection';

describe('hostsToScan', () => {
  it('covers a /24 without the network, broadcast or phone address', () => {
    const hosts = hostsToScan('192.168.10.68', '255.255.255.0');
    expect(hosts).toHaveLength(253);
    expect(hosts[0]).toBe('192.168.10.1');
    expect(hosts[hosts.length - 1]).toBe('192.168.10.254');
    expect(hosts).not.toContain('192.168.10.68');
    expect(hosts).toContain('192.168.10.40');
  });

  it('covers the whole subnet when it is larger than a /24', () => {
    const hosts = hostsToScan('10.0.1.20', '255.255.254.0');
    expect(hosts).toHaveLength(509);
    expect(hosts[0]).toBe('10.0.0.1');
    expect(hosts[hosts.length - 1]).toBe('10.0.1.254');
    expect(hosts).toContain('10.0.0.255');
    expect(hosts).not.toContain('10.0.1.20');
  });

  it("falls back to the phone's /24 when the subnet is too big or unknown", () => {
    for (const mask of ['255.255.0.0', null, undefined, 'garbage', '255.0.255.0']) {
      const hosts = hostsToScan('172.16.5.9', mask);
      expect(hosts).toHaveLength(253);
      expect(hosts[0]).toBe('172.16.5.1');
    }
  });

  it('handles small subnets', () => {
    expect(hostsToScan('192.168.1.10', '255.255.255.248')).toEqual([
      '192.168.1.9',
      '192.168.1.11',
      '192.168.1.12',
      '192.168.1.13',
      '192.168.1.14',
    ]);
  });
});

describe('nativeConnectTimeout', () => {
  // The iOS library divides by 1000 with integer maths: 800 ms would become 0 s.
  it('never hands the native side less than one whole second', () => {
    expect(nativeConnectTimeout(800)).toBe(1000);
    expect(nativeConnectTimeout(1)).toBe(1000);
    expect(nativeConnectTimeout(1000)).toBe(1000);
    expect(nativeConnectTimeout(3000)).toBe(3000);
    expect(nativeConnectTimeout(2500)).toBe(3000);
  });
});

describe('isLikelyMagSshBanner', () => {
  it('accepts the Dropbear banner MAG firmware sends', () => {
    expect(isLikelyMagSshBanner('SSH-2.0-dropbear_2017.75')).toBe(true);
    expect(isLikelyMagSshBanner('SSH-2.0-dropbear_2015.67\r')).toBe(true);
  });

  it('rejects other SSH servers and missing banners', () => {
    expect(isLikelyMagSshBanner('SSH-2.0-OpenSSH_9.6p1 Ubuntu-3ubuntu13.20')).toBe(false);
    expect(isLikelyMagSshBanner('')).toBe(false);
    expect(isLikelyMagSshBanner(null)).toBe(false);
  });
});

describe('readBanner', () => {
  let server: net.Server;
  let port: number;

  beforeAll(done => {
    server = net.createServer(socket => socket.write('SSH-2.0-dropbear_2017.75\r\nmore'));
    server.listen(0, '127.0.0.1', () => {
      port = (server.address() as net.AddressInfo).port;
      done();
    });
  });
  afterAll(done => {
    server.close(() => done());
  });

  it('returns the first line the service sends', async () => {
    await expect(readBanner('127.0.0.1', port, 2000)).resolves.toBe('SSH-2.0-dropbear_2017.75');
  });

  it('returns null when nothing is listening', async () => {
    const closed = net.createServer();
    await new Promise<void>(resolve => closed.listen(0, '127.0.0.1', () => resolve()));
    const closedPort = (closed.address() as net.AddressInfo).port;
    await new Promise<void>(resolve => closed.close(() => resolve()));
    await expect(readBanner('127.0.0.1', closedPort, 1000)).resolves.toBeNull();
  });
});
