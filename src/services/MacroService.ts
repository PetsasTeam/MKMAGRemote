/**
 * Macro Service
 * Handles macro creation and execution
 */

import { Macro, MAGCommand } from '../types';
import MAGService from './MAGService';

class MacroService {
  private executing = false;

  /**
   * Execute a macro (sequence of commands)
   */
  async executeMacro(macro: Macro): Promise<boolean> {
    if (this.executing) {
      console.warn('Macro already executing');
      return false;
    }

    if (!MAGService.isConnected()) {
      console.warn('Not connected to device');
      return false;
    }

    this.executing = true;

    try {
      const delay = macro.delay || 300; // Default 300ms delay between commands

      for (const command of macro.commands) {
        await MAGService.sendCommand(command);
        await this.delay(delay);
      }

      return true;
    } catch (error) {
      console.error('Error executing macro:', error);
      return false;
    } finally {
      this.executing = false;
    }
  }

  /**
   * Create default macros
   */
  getDefaultMacros(): Macro[] {
    return [
      {
        id: 'power-on-tv',
        name: 'Start IPTV',
        icon: '📺',
        description: 'Power on and go to IPTV',
        commands: [MAGCommand.POWER, MAGCommand.OK, MAGCommand.PORTAL],
        delay: 1000,
      },
      {
        id: 'volume-reset',
        name: 'Volume Reset',
        icon: '🔊',
        description: 'Mute then unmute',
        commands: [MAGCommand.MUTE, MAGCommand.MUTE],
        delay: 500,
      },
      {
        id: 'channel-up-3',
        name: 'Next 3 Channels',
        icon: '⏭️',
        description: 'Skip 3 channels forward',
        commands: [MAGCommand.CH_UP, MAGCommand.CH_UP, MAGCommand.CH_UP],
        delay: 300,
      },
      {
        id: 'back-to-menu',
        name: 'Back to Menu',
        icon: '🏠',
        description: 'Navigate back to main menu',
        commands: [MAGCommand.EXIT, MAGCommand.MENU],
        delay: 500,
      },
      {
        id: 'restart-video',
        name: 'Restart Video',
        icon: '🔄',
        description: 'Stop and play current video',
        commands: [MAGCommand.STOP, MAGCommand.PLAY],
        delay: 1000,
      },
      {
        id: 'subtitles-toggle',
        name: 'Toggle Subtitles',
        icon: '💬',
        description: 'Open subtitle menu',
        commands: [MAGCommand.MENU, MAGCommand.DOWN, MAGCommand.DOWN, MAGCommand.OK],
        delay: 300,
      },
      {
        id: 'quick-favorite',
        name: 'Favorite Channel',
        icon: '⭐',
        description: 'Go to favorites and select first',
        commands: [MAGCommand.FAV, MAGCommand.OK],
        delay: 500,
      },
      {
        id: 'volume-down-3',
        name: 'Volume Down 3x',
        icon: '🔉',
        description: 'Decrease volume by 3 steps',
        commands: [MAGCommand.VOL_DOWN, MAGCommand.VOL_DOWN, MAGCommand.VOL_DOWN],
        delay: 200,
      },
      {
        id: 'volume-up-3',
        name: 'Volume Up 3x',
        icon: '🔊',
        description: 'Increase volume by 3 steps',
        commands: [MAGCommand.VOL_UP, MAGCommand.VOL_UP, MAGCommand.VOL_UP],
        delay: 200,
      },
      {
        id: 'netflix-style-skip',
        name: 'Skip Intro',
        icon: '⏩',
        description: 'Fast forward 30 seconds',
        commands: [
          MAGCommand.FORWARD,
          MAGCommand.FORWARD,
          MAGCommand.FORWARD,
          MAGCommand.FORWARD,
          MAGCommand.FORWARD,
          MAGCommand.FORWARD,
        ],
        delay: 100,
      },
    ];
  }

  /**
   * Create quick action shortcuts
   */
  getDefaultQuickActions() {
    return [
      {
        id: 'power',
        name: 'Power',
        icon: '⚡',
        command: MAGCommand.POWER,
        color: '#FF6B6B',
      },
      {
        id: 'portal',
        name: 'Portal',
        icon: '🌐',
        command: MAGCommand.PORTAL,
        color: '#4ECDC4',
      },
      {
        id: 'menu',
        name: 'Menu',
        icon: '📋',
        command: MAGCommand.MENU,
        color: '#45B7D1',
      },
      {
        id: 'favorites',
        name: 'Favorites',
        icon: '⭐',
        command: MAGCommand.FAV,
        color: '#F7B731',
      },
      {
        id: 'usb',
        name: 'USB',
        icon: '💾',
        command: MAGCommand.USB,
        color: '#5F27CD',
      },
      {
        id: 'settings',
        name: 'Settings',
        icon: '⚙️',
        command: MAGCommand.SETTINGS,
        color: '#95A5A6',
      },
    ];
  }

  /**
   * Create app shortcuts
   */
  getDefaultAppShortcuts() {
    return [
      {
        id: 'iptv',
        name: 'IPTV',
        icon: '📺',
        portal: 'iptv',
        description: 'Launch IPTV Portal',
      },
      {
        id: 'youtube',
        name: 'YouTube',
        icon: '▶️',
        portal: 'youtube',
        description: 'Open YouTube',
      },
      {
        id: 'netflix',
        name: 'Netflix',
        icon: '🎬',
        portal: 'netflix',
        description: 'Open Netflix',
      },
      {
        id: 'movies',
        name: 'Movies',
        icon: '🍿',
        portal: 'vod',
        description: 'Video On Demand',
      },
      {
        id: 'radio',
        name: 'Radio',
        icon: '📻',
        command: MAGCommand.TV_RADIO,
        description: 'Switch to Radio',
      },
      {
        id: 'recordings',
        name: 'Recordings',
        icon: '📼',
        command: MAGCommand.REC,
        description: 'View Recordings',
      },
    ];
  }

  /**
   * Utility: delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Check if currently executing
   */
  isExecuting(): boolean {
    return this.executing;
  }
}

// Export singleton instance
export default new MacroService();
