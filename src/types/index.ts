/**
 * Type definitions for IPTV MK Remote
 */

export interface MAGDevice {
  id: string;
  name: string;
  ip: string;
  port: number;
  model?: string;
  macAddress?: string;
  lastConnected?: Date;
  isConnected?: boolean;
}

export interface RemoteKey {
  id: string;
  label: string;
  code: number;
  icon?: string;
  type: 'navigation' | 'control' | 'numeric' | 'function';
}

export enum MAGCommand {
  // Navigation
  UP = 103,
  DOWN = 108,
  LEFT = 105,
  RIGHT = 106,
  OK = 28,
  BACK = 158,
  EXIT = 174,
  MENU = 139,
  INFO = 358,

  // Playback
  PLAY = 207,
  PAUSE = 119,
  STOP = 128,
  REWIND = 168,
  FORWARD = 159,
  PREV = 412,
  NEXT = 407,
  REC = 167,

  // Volume
  VOL_UP = 115,
  VOL_DOWN = 114,
  MUTE = 113,

  // Channel
  CH_UP = 402,
  CH_DOWN = 403,

  // Numbers
  NUM_0 = 11,
  NUM_1 = 2,
  NUM_2 = 3,
  NUM_3 = 4,
  NUM_4 = 5,
  NUM_5 = 6,
  NUM_6 = 7,
  NUM_7 = 8,
  NUM_8 = 9,
  NUM_9 = 10,

  // Function keys
  RED = 398,
  GREEN = 399,
  YELLOW = 400,
  BLUE = 401,
  POWER = 116,
  SETTINGS = 388,

  // Additional
  AUDIO = 392,
  SUBTITLE = 370,
  TV_RADIO = 377,
  FAV = 364,
  PORTAL = 156,
  USB = 389,
}

export interface RemoteCommand {
  device: MAGDevice;
  command: MAGCommand;
  timestamp: Date;
}

export interface DeviceConnection {
  device: MAGDevice;
  connected: boolean;
  error?: string;
}

export interface AppSettings {
  theme: 'light' | 'dark';
  vibrationEnabled: boolean;
  soundEnabled: boolean;
  autoConnect: boolean;
  lastDevice?: MAGDevice;
  savedDevices: MAGDevice[];
}

export interface DiscoveryResult {
  devices: MAGDevice[];
  scanning: boolean;
  error?: string;
}
