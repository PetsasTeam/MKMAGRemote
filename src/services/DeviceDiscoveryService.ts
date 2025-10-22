/**
 * Device Discovery Service
 * Scans the local network for MAG devices
 */

import { MAGDevice } from '../types';
import MAGService from './MAGService';

class DeviceDiscoveryService {
  private isScanning = false;
  private discoveredDevices: MAGDevice[] = [];

  /**
   * Scan local network for MAG devices
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
    this.discoveredDevices = [];

    try {
      // Get local IP to determine subnet
      const localIp = await this.getLocalIpAddress();
      if (!localIp) {
        throw new Error('Could not determine local IP address');
      }

      const subnet = this.getSubnet(localIp);
      const startIp = this.getStartIp(subnet);

      // Common MAG device ports
      const ports = [80, 8080];

      // Scan IP range (typically .1 to .254)
      const ipRange = 254;
      const totalScans = ipRange * ports.length;
      let completed = 0;

      // Batch scanning for better performance
      const batchSize = 20;
      const ipAddresses: string[] = [];

      for (let i = 1; i <= ipRange; i++) {
        ipAddresses.push(`${subnet}.${i}`);
      }

      // Process in batches
      for (let i = 0; i < ipAddresses.length; i += batchSize) {
        const batch = ipAddresses.slice(i, i + batchSize);

        await Promise.all(
          batch.map(async (ip) => {
            for (const port of ports) {
              try {
                const isMAG = await this.probeDevice(ip, port);
                if (isMAG) {
                  const device: MAGDevice = {
                    id: `${ip}:${port}`,
                    name: `MAG Device (${ip})`,
                    ip,
                    port,
                    model: 'MAG', // Will be updated if we can get device info
                  };

                  this.discoveredDevices.push(device);
                  if (onDeviceFound) {
                    onDeviceFound(device);
                  }
                }
              } catch (error) {
                // Device not reachable, continue
              }

              completed++;
              if (onProgress) {
                onProgress((completed / totalScans) * 100);
              }
            }
          })
        );
      }

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
   * Get local IP address of the device
   * Note: This is a placeholder - actual implementation would use
   * react-native-network-info or similar
   */
  private async getLocalIpAddress(): Promise<string | null> {
    // In a real implementation, we would use:
    // import NetworkInfo from 'react-native-network-info';
    // const ip = await NetworkInfo.getIPV4Address();

    // For now, return a common local network prefix
    // This should be replaced with actual network detection
    return '192.168.1.100'; // Placeholder
  }

  /**
   * Extract subnet from IP address
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
   * Quick scan - only check common MAG device IPs
   */
  async quickScan(onDeviceFound?: (device: MAGDevice) => void): Promise<MAGDevice[]> {
    this.discoveredDevices = [];

    // Common router DHCP ranges
    const commonIps = [
      '192.168.1.1',
      '192.168.0.1',
      '192.168.1.100',
      '192.168.1.101',
      '192.168.1.254',
      '10.0.0.1',
      '10.0.0.100',
    ];

    const ports = [80, 8080];

    for (const ip of commonIps) {
      for (const port of ports) {
        try {
          const isMAG = await this.probeDevice(ip, port);
          if (isMAG) {
            const device: MAGDevice = {
              id: `${ip}:${port}`,
              name: `MAG Device (${ip})`,
              ip,
              port,
            };

            this.discoveredDevices.push(device);
            if (onDeviceFound) {
              onDeviceFound(device);
            }
          }
        } catch (error) {
          // Continue to next IP
        }
      }
    }

    return this.discoveredDevices;
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
