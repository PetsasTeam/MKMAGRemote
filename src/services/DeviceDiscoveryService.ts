/**
 * Device Discovery Service
 * Scans the local network for MAG devices using native parallel port scanning
 */

import { MAGDevice } from '../types';
import MAGService from './MAGService';
import NetInfo from '@react-native-community/netinfo';
import PortScanner from 'react-native-lan-port-scanner';

class DeviceDiscoveryService {
  private isScanning = false;
  private discoveredDevices: MAGDevice[] = [];
  private scanAborted = false;

  /**
   * Scan local network for MAG devices using native parallel port scanner
   * This is MUCH faster than the old HTTP-based scanning (uses native threads)
   */
  async scanNetwork(
    onDeviceFound?: (device: MAGDevice) => void,
    onProgress?: (progress: number) => void
  ): Promise<MAGDevice[]> {
    if (this.isScanning) {
      console.warn('Scan already in progress');
      return this.discoveredDevices;
    }

    this.isScanning = true;
    this.scanAborted = false;
    this.discoveredDevices = [];

    try {
      // Get real local IP from device's network interface
      const localIp = await this.getLocalIpAddress();
      if (!localIp) {
        throw new Error('Could not determine local IP address. Please connect to WiFi.');
      }

      const subnet = this.getSubnet(localIp);
      console.log(`Scanning subnet: ${subnet}.0/24 (Local IP: ${localIp})`);

      // Common MAG device ports
      const ports = [80, 8080];

      // Scan IP range (typically .1 to .254)
      const ipRange = 254;
      const totalScans = ipRange * ports.length;
      let completed = 0;

      // Use native parallel port scanner for MUCH faster scanning
      const scanner = new PortScanner();

      // Build list of all IPs to scan
      const ipAddresses: string[] = [];
      for (let i = 1; i <= ipRange; i++) {
        ipAddresses.push(`${subnet}.${i}`);
      }

      // Scan all IPs in parallel batches for speed
      const batchSize = 50; // Can handle more in parallel with native scanner
      for (let i = 0; i < ipAddresses.length && !this.scanAborted; i += batchSize) {
        const batch = ipAddresses.slice(i, i + batchSize);

        await Promise.all(
          batch.map(async (ip) => {
            for (const port of ports) {
              if (this.scanAborted) return;

              try {
                // Use native port scanner with short timeout (much faster than HTTP)
                const isOpen = await scanner.connectToAddress(ip, port, 800);

                if (isOpen) {
                  // Verify it's actually a MAG device by testing the API endpoint
                  const isMAG = await this.probeDevice(ip, port);
                  if (isMAG) {
                    const device: MAGDevice = {
                      id: `${ip}:${port}`,
                      name: `MAG Device (${ip})`,
                      ip,
                      port,
                      model: 'MAG',
                    };

                    this.discoveredDevices.push(device);
                    console.log(`Found MAG device: ${ip}:${port}`);
                    if (onDeviceFound) {
                      onDeviceFound(device);
                    }
                  }
                }
              } catch (error) {
                // Port closed or timeout, continue
              }

              completed++;
              if (onProgress && completed % 20 === 0) {
                onProgress((completed / totalScans) * 100);
              }
            }
          })
        );
      }

      console.log(`Scan complete. Found ${this.discoveredDevices.length} MAG device(s)`);
      return this.discoveredDevices;
    } finally {
      this.isScanning = false;
    }
  }

  /**
   * Probe a specific IP and port to see if it's a MAG device
   */
  private async probeDevice(ip: string, port: number): Promise<boolean> {
    try {
      return await MAGService.testConnection(ip, port);
    } catch (error) {
      return false;
    }
  }

  /**
   * Get local IP address of the device using NetInfo
   * This replaces the hardcoded placeholder and gets the REAL IP
   */
  private async getLocalIpAddress(): Promise<string | null> {
    try {
      const state = await NetInfo.fetch();

      // Check if connected to WiFi
      if (state.type !== 'wifi' && state.type !== 'ethernet') {
        console.warn('Not connected to WiFi or Ethernet');
        return null;
      }

      // Get IP address details
      if (state.details && 'ipAddress' in state.details) {
        const ipAddress = state.details.ipAddress;
        if (ipAddress && this.isValidIpAddress(ipAddress)) {
          console.log(`Device IP address: ${ipAddress}`);
          return ipAddress;
        }
      }

      console.warn('Could not retrieve IP address from network interface');
      return null;
    } catch (error) {
      console.error('Error getting local IP address:', error);
      return null;
    }
  }

  /**
   * Validate IP address format
   */
  private isValidIpAddress(ip: string): boolean {
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipRegex.test(ip)) return false;

    const parts = ip.split('.');
    return parts.every(part => {
      const num = parseInt(part, 10);
      return num >= 0 && num <= 255;
    });
  }

  /**
   * Extract subnet from IP address (first 3 octets)
   */
  private getSubnet(ip: string): string {
    const parts = ip.split('.');
    return `${parts[0]}.${parts[1]}.${parts[2]}`;
  }

  /**
   * Get start IP for scanning
   */
  private getStartIp(subnet: string): string {
    return `${subnet}.1`;
  }

  /**
   * Quick scan - check common MAG device IPs in the current subnet
   */
  async quickScan(onDeviceFound?: (device: MAGDevice) => void): Promise<MAGDevice[]> {
    this.discoveredDevices = [];

    try {
      // Get real local IP to determine subnet
      const localIp = await this.getLocalIpAddress();
      const subnet = localIp ? this.getSubnet(localIp) : '192.168.1';

      // Common device IPs (relative to current subnet)
      const commonIps = [
        `${subnet}.1`,    // Router
        `${subnet}.100`,
        `${subnet}.101`,
        `${subnet}.102`,
        `${subnet}.200`,
        `${subnet}.254`,
        '192.168.1.1',    // Fallback common IPs
        '192.168.0.1',
        '10.0.0.1',
      ];

      const ports = [80, 8080];
      const scanner = new PortScanner();

      console.log(`Quick scan on subnet ${subnet}.0/24`);

      for (const ip of commonIps) {
        for (const port of ports) {
          try {
            // Quick port check first
            const isOpen = await scanner.connectToAddress(ip, port, 500);
            if (isOpen) {
              // Verify it's a MAG device
              const isMAG = await this.probeDevice(ip, port);
              if (isMAG) {
                const device: MAGDevice = {
                  id: `${ip}:${port}`,
                  name: `MAG Device (${ip})`,
                  ip,
                  port,
                };

                this.discoveredDevices.push(device);
                console.log(`Quick scan found MAG device: ${ip}:${port}`);
                if (onDeviceFound) {
                  onDeviceFound(device);
                }
              }
            }
          } catch (error) {
            // Continue to next IP
          }
        }
      }

      console.log(`Quick scan complete. Found ${this.discoveredDevices.length} device(s)`);
      return this.discoveredDevices;
    } catch (error) {
      console.error('Error in quick scan:', error);
      return this.discoveredDevices;
    }
  }

  /**
   * Add device manually by IP
   */
  async addManualDevice(ip: string, port: number = 80): Promise<MAGDevice | null> {
    try {
      const isMAG = await this.probeDevice(ip, port);
      if (isMAG) {
        return {
          id: `${ip}:${port}`,
          name: `MAG Device (${ip})`,
          ip,
          port,
        };
      }
      return null;
    } catch (error) {
      console.error('Error adding manual device:', error);
      return null;
    }
  }

  /**
   * Stop current scan
   */
  stopScan(): void {
    this.scanAborted = true;
    this.isScanning = false;
  }

  /**
   * Check if currently scanning
   */
  getIsScanning(): boolean {
    return this.isScanning;
  }

  /**
   * Get discovered devices
   */
  getDiscoveredDevices(): MAGDevice[] {
    return this.discoveredDevices;
  }
}

// Export singleton instance
export default new DeviceDiscoveryService();
