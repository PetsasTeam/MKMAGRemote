/**
 * MAG Device Service
 * Handles communication with MAG IPTV devices
 */

import axios, { AxiosInstance } from 'axios';
import { MAGDevice, MAGCommand } from '../types';

class MAGService {
  private axiosInstance: AxiosInstance | null = null;
  private currentDevice: MAGDevice | null = null;
  private commandQueue: Array<{ command: MAGCommand; timestamp: number }> = [];
  private isProcessingQueue = false;

  /**
   * Connect to a MAG device
   */
  async connect(device: MAGDevice): Promise<boolean> {
    try {
      this.currentDevice = device;
      const port = device.port || 80;

      this.axiosInstance = axios.create({
        baseURL: `http://${device.ip}:${port}`,
        timeout: 5000,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      // Test connection
      const response = await this.axiosInstance.get('/server/api/chk_rec.php', {
        timeout: 3000,
      });

      return response.status === 200;
    } catch (error) {
      console.error('Connection error:', error);
      return false;
    }
  }

  /**
   * Disconnect from current device
   */
  disconnect(): void {
    this.currentDevice = null;
    this.axiosInstance = null;
    this.commandQueue = [];
  }

  /**
   * Check if connected to a device
   */
  isConnected(): boolean {
    return this.currentDevice !== null && this.axiosInstance !== null;
  }

  /**
   * Send a remote control command to the MAG device
   */
  async sendCommand(command: MAGCommand): Promise<boolean> {
    if (!this.isConnected() || !this.axiosInstance || !this.currentDevice) {
      console.warn('Not connected to any device');
      return false;
    }

    try {
      // Add command to queue
      this.commandQueue.push({ command, timestamp: Date.now() });

      // Process queue if not already processing
      if (!this.isProcessingQueue) {
        await this.processCommandQueue();
      }

      return true;
    } catch (error) {
      console.error('Error sending command:', error);
      return false;
    }
  }

  /**
   * Process command queue to avoid overwhelming the device
   */
  private async processCommandQueue(): Promise<void> {
    this.isProcessingQueue = true;

    while (this.commandQueue.length > 0) {
      const { command } = this.commandQueue.shift()!;

      try {
        // MAG devices accept commands via HTTP GET/POST
        // The endpoint varies by model, trying common ones
        await this.sendCommandToDevice(command);

        // Small delay between commands to prevent overwhelming the device
        await this.delay(100);
      } catch (error) {
        console.error('Error processing command:', error);
      }
    }

    this.isProcessingQueue = false;
  }

  /**
   * Send command to the actual device (multiple API attempts for compatibility)
   */
  private async sendCommandToDevice(command: MAGCommand): Promise<void> {
    if (!this.axiosInstance) return;

    const endpoints = [
      `/server/api/remote_control.php?key=${command}`,
      `/server/api/chk_rec.php?event=key&keycode=${command}`,
      `/stalker_portal/api/remote_control.php?key=${command}`,
    ];

    // Try different endpoints for compatibility with various MAG models
    for (const endpoint of endpoints) {
      try {
        const response = await this.axiosInstance.get(endpoint, { timeout: 2000 });
        if (response.status === 200) {
          return; // Success
        }
      } catch (error) {
        // Try next endpoint
        continue;
      }
    }

    // If all endpoints fail, try POST method
    try {
      await this.axiosInstance.post('/server/api/remote_control.php',
        `key=${command}`,
        { timeout: 2000 }
      );
    } catch (error) {
      console.warn('All command sending methods failed for command:', command);
    }
  }

  /**
   * Get current device info
   */
  async getDeviceInfo(): Promise<any> {
    if (!this.isConnected() || !this.axiosInstance) {
      return null;
    }

    try {
      const response = await this.axiosInstance.get('/server/api/chk_rec.php');
      return response.data;
    } catch (error) {
      console.error('Error getting device info:', error);
      return null;
    }
  }

  /**
   * Test connection to device
   */
  async testConnection(ip: string, port: number = 80): Promise<boolean> {
    try {
      const response = await axios.get(`http://${ip}:${port}/server/api/chk_rec.php`, {
        timeout: 3000,
      });
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  /**
   * Utility: delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get current device
   */
  getCurrentDevice(): MAGDevice | null {
    return this.currentDevice;
  }
}

// Export singleton instance
export default new MAGService();
