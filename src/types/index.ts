/**
 * Type definitions for BoxPilot
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
  /** 6-digit code shown on the TV during pairing; also the encryption key. */
  pairingCode?: string;
  /**
   * Which remote protocol the box speaks: 'magic' (MAGic Remote, TCP 40611,
   * pairing code; the default) or 'aurahd' (AuraHD Remote, UDP, password).
   */
  protocol?: 'magic' | 'aurahd' | 'demo';
  /** AuraHD only: the Remote control password set on the box. */
  password?: string;
  /** AuraHD only: the box's serial number, from discovery. */
  serial?: string;
  /** AuraHD only: the TV screen size the box reports, for the touchpad. */
  screenWidth?: number;
  screenHeight?: number;
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

export interface Macro {
  id: string;
  name: string;
  icon?: string;
  commands: MAGCommand[];
  delay?: number; // Delay between commands in ms
  description?: string;
}

/**
 * A one-tap shortcut: either a channel (digits + OK) or a single pinned key.
 * Entries saved by older versions have no `kind` and are treated as keys.
 */
export interface QuickAction {
  id: string;
  name: string;
  kind?: 'channel' | 'key';
  /** For channels: the channel number, e.g. "101". */
  channel?: string;
  /** For keys: the remote key to send. */
  command?: MAGCommand;
  icon?: string;
  color?: string;
}

export interface AppShortcut {
  id: string;
  name: string;
  icon: string;
  channel?: number;
  portal?: string;
  description?: string;
}

export type RemoteMode = 'standard' | 'gesture' | 'touchpad' | 'keyboard';

export interface AppSettings {
  theme: 'light' | 'dark' | 'auto';
  accentColor?: string;
  vibrationEnabled: boolean;
  soundEnabled: boolean;
  autoConnect: boolean;
  defaultRemoteMode: RemoteMode;
  showAdvancedControls: boolean;
  buttonSize: 'small' | 'medium' | 'large';
  enableGestures: boolean;
  hapticFeedbackStrength: 'light' | 'medium' | 'strong';
  lastDevice?: MAGDevice;
  savedDevices: MAGDevice[];
  macros: Macro[];
  quickActions: QuickAction[];
  appShortcuts: AppShortcut[];
  favorites: MAGCommand[];
  /** The first-run guide has been seen. */
  onboardingDone?: boolean;
  /** Phone volume buttons change the TV volume while the remote is open. */
  volumeButtons?: boolean;
}

export interface DiscoveryResult {
  devices: MAGDevice[];
  scanning: boolean;
  error?: string;
}

export interface RemoteProfile {
  id: string;
  name: string;
  icon: string;
  layout: 'standard' | 'compact' | 'extended' | 'custom';
  customButtons?: RemoteKey[];
  backgroundColor?: string;
  buttonColor?: string;
}
