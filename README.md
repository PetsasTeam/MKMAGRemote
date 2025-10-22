# IPTV MK Remote

A modern, user-friendly mobile remote control app for Infomir MAG IPTV devices.

## Features

- **Universal Compatibility**: Works with all MAG device models (250, 254, 256, 322, 324, 349, 351, 410, 420, 424, 500, and more)
- **WiFi Control**: Connect to your MAG box over your local network
- **Modern Interface**: Clean, intuitive design with smooth animations
- **Auto-Discovery**: Automatically finds MAG devices on your network
- **Full Remote Control**: All standard remote buttons including navigation, playback, and numeric keypad
- **Cross-Platform**: Available for both iOS and Android

## Supported MAG Devices

- MAG 250/254/256/270
- MAG 322/324/349/351
- MAG 410/420/424
- MAG 500/500A/520/540
- And other Infomir MAG models

## Requirements

### For the App
- iOS 13.0+ or Android 6.0+
- WiFi connection

### For Your MAG Box
1. Your MAG box must be connected to the same WiFi network as your phone
2. Remote Control feature must be enabled on the MAG box:
   - Go to **Settings** → **System Settings** → **Remote Control**
   - Enable the Remote Control option

## Installation

### Android
1. Download from Google Play Store (coming soon)
2. Or install the APK from the releases page

### iOS
1. Download from App Store (coming soon)
2. Or install via TestFlight (for beta testing)

## Setup

1. **Enable Remote Control on MAG Box**:
   - Navigate to Settings → System Settings → Remote Control
   - Turn ON the Remote Control option
   - Note the IP address shown on your MAG box (Settings → System Info → Network)

2. **Connect via App**:
   - Open IPTV MK Remote app
   - Tap "Find Devices" to auto-discover your MAG box
   - Or manually enter the IP address
   - Tap "Connect"

3. **Start Controlling**:
   - Use the virtual remote to control your MAG box
   - All standard remote functions are available

## How to Use

### Navigation
- **D-Pad**: Navigate through menus (Up, Down, Left, Right)
- **OK/Enter**: Select items
- **Back/Return**: Go back to previous screen
- **Menu**: Open main menu
- **Exit**: Exit current application

### Playback Controls
- **Play/Pause**: Control video playback
- **Stop**: Stop playback
- **Fast Forward/Rewind**: Skip forward/backward
- **Previous/Next**: Navigate between channels or videos

### Additional Features
- **Numeric Keypad**: Enter channel numbers directly
- **Volume Controls**: Adjust volume or mute
- **Power**: Turn MAG box on/standby
- **Info**: Display current program information

## Building from Source

### Prerequisites
- Node.js 18+ and npm/yarn
- React Native development environment
- For iOS: Xcode 14+ and CocoaPods
- For Android: Android Studio and JDK 11+

### Build Instructions

```bash
# Clone the repository
git clone https://github.com/PetsasTeam/MKMAGRemote.git
cd MKMAGRemote

# Install dependencies
npm install

# For iOS (Mac only)
cd ios && pod install && cd ..

# Run on Android
npm run android

# Run on iOS
npm run ios
```

## Troubleshooting

### Can't find MAG box
- Ensure both devices are on the same WiFi network
- Check if Remote Control is enabled on the MAG box
- Try manual IP entry instead of auto-discovery
- Check firewall settings on your router

### Connection fails
- Verify the MAG box IP address is correct
- Restart both the app and MAG box
- Ensure no VPN is active on your phone

### Buttons not responding
- Check the connection status in the app
- Reconnect to the MAG box
- Update to the latest app version

## Technology Stack

- **Framework**: React Native with TypeScript
- **UI Components**: React Native Paper
- **Navigation**: React Navigation
- **State Management**: React Context + Hooks
- **Network**: Axios for HTTP requests
- **Device Discovery**: UDP multicast/broadcast

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - see LICENSE file for details

## Disclaimer

This is an unofficial third-party remote control app for MAG devices. It is not affiliated with or endorsed by Infomir. MAG and Infomir are trademarks of their respective owners.

## Support

For issues, questions, or feature requests, please open an issue on GitHub.

## Changelog

### Version 1.0.0 (Initial Release)
- Full remote control functionality
- Auto-discovery of MAG devices
- Modern, user-friendly interface
- Support for all MAG device models
- Cross-platform (iOS & Android)
