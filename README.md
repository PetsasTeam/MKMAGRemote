# IPTV MK Remote

A modern, feature-rich mobile remote control app for Infomir MAG IPTV devices with advanced gesture controls, macros, and customization options.

## ✨ Features

### Core Features
- **Universal Compatibility**: Works with all MAG device models (250, 254, 256, 322, 324, 349, 351, 410, 420, 424, 500, and more)
- **WiFi Control**: Connect to your MAG box over your local network
- **Auto-Discovery**: Automatically finds MAG devices on your network
- **Cross-Platform**: Available for both iOS and Android
- **Modern Interface**: Beautiful UI with smooth animations and haptic feedback

### Control Modes
- **Standard Remote**: Traditional button-based remote with all standard controls
- **Gesture Control**: Swipe to navigate - intuitive touch gestures for up/down/left/right/OK
- **Touchpad Mode**: Use your phone as a touchpad/mouse for precise control
- **Virtual Keyboard**: Full QWERTY keyboard for text input on MAG devices

### Advanced Features
- **Macros**: Create and execute command sequences with one tap
  - Pre-loaded with 10+ useful macros (Start IPTV, Skip Intro, Volume Reset, etc.)
  - Execute multiple commands with customizable delays
- **Quick Actions**: One-tap access to favorite commands
  - Power, Portal, Menu, Favorites, USB, Settings
  - Customizable shortcuts
- **App Shortcuts**: Quick launch for IPTV apps (YouTube, Netflix, VOD, Radio, etc.)
- **Multiple Remote Modes**: Switch between Standard, Gesture, Touchpad, and Keyboard modes
- **Customizable Settings**: Adjust haptic feedback, button size, and visual preferences
- **Device Management**: Save multiple devices and switch between them

### Remote Control Features
- **Navigation**: Full D-pad controls (Up, Down, Left, Right, OK)
- **Playback Controls**: Play, Pause, Stop, Rewind, Forward, Previous, Next
- **Volume & Channel**: Volume up/down/mute, Channel up/down
- **Numeric Keypad**: Direct channel entry with 0-9 buttons
- **Color Buttons**: Red, Green, Yellow, Blue function keys
- **Function Buttons**: Menu, Settings, Info, Exit, Back, Portal, USB, Audio, Subtitle, TV/Radio, Favorites
- **Power Control**: Turn MAG box on/standby

## 📱 Screenshots

*Coming soon*

## 🎯 Supported MAG Devices

- MAG 250/254/256/270
- MAG 322/324/349/351
- MAG 410/420/424
- MAG 500/500A/520/540
- And other Infomir MAG models

## 📋 Requirements

### For the App
- iOS 13.0+ or Android 6.0+
- WiFi connection

### For Your MAG Box
1. MAG box must be connected to the same WiFi network as your phone
2. Remote Control feature must be enabled:
   - Go to **Settings** → **System Settings** → **Remote Control**
   - Enable the Remote Control option

## 🚀 Installation

### Android
1. Download from Google Play Store (coming soon)
2. Or install the APK from the releases page

### iOS
1. Download from App Store (coming soon)
2. Or install via TestFlight (for beta testing)

## 🔧 Setup

1. **Enable Remote Control on MAG Box**:
   - Navigate to Settings → System Settings → Remote Control
   - Turn ON the Remote Control option
   - Note the IP address (Settings → System Info → Network)

2. **Connect via App**:
   - Open IPTV MK Remote app
   - Tap "Find Devices" to auto-discover your MAG box
   - Or manually enter the IP address
   - Tap "Connect"

3. **Start Controlling**:
   - Choose your preferred control mode (Standard/Gesture/Touchpad/Keyboard)
   - Use the virtual remote to control your MAG box
   - Explore macros and quick actions for faster control

## 🎮 How to Use

### Control Modes

#### Standard Remote
Traditional button layout with all controls organized by function:
- Navigation section with D-pad and OK button
- Playback controls
- Volume and channel controls
- Numeric keypad
- Color buttons and function keys

#### Gesture Control
Intuitive swipe-based navigation:
- **Swipe Up**: Navigate up
- **Swipe Down**: Navigate down
- **Swipe Left**: Navigate left
- **Swipe Right**: Navigate right
- **Tap**: OK/Select

#### Touchpad Mode
Use your phone as a mouse:
- **Move finger**: Move cursor
- **Single tap**: OK/Select
- Perfect for browser navigation on MAG

#### Virtual Keyboard
Full QWERTY keyboard for text input:
- Type search queries
- Enter URLs
- Login credentials
- Switch between lowercase, uppercase, and symbols

### Macros
Execute multiple commands in sequence:
1. Go to **Macros** screen
2. Browse available macros or load defaults
3. Tap **Run** to execute
4. Pre-loaded macros include:
   - Start IPTV (Power → OK → Portal)
   - Skip Intro (6x Fast Forward)
   - Volume Reset (Mute → Unmute)
   - Restart Video (Stop → Play)
   - And more!

### Quick Actions
One-tap shortcuts for common tasks:
- Access from Home screen
- Power, Portal, Menu, Favorites, USB, Settings
- App Shortcuts for IPTV, YouTube, Netflix, Movies, Radio

## ⚙️ Settings

Customize your experience:
- **Vibration Feedback**: Haptic response on button press
- **Sound Feedback**: Audio cues for actions
- **Auto Connect**: Automatically connect to last device
- **Button Size**: Small, Medium, or Large
- **Haptic Strength**: Light, Medium, or Strong
- **Default Remote Mode**: Choose starting mode
- **Advanced Controls**: Show/hide additional buttons

## 🔍 Troubleshooting

### Can't find MAG box
- Ensure both devices are on the same WiFi network
- Check if Remote Control is enabled on MAG box
- Try manual IP entry instead of auto-discovery
- Check firewall settings on your router

### Connection fails
- Verify the MAG box IP address is correct
- Restart both the app and MAG box
- Ensure no VPN is active on your phone
- Check MAG box is not in standby mode

### Buttons not responding
- Check the connection status in the app
- Reconnect to the MAG box
- Try restarting the MAG box
- Update to the latest app version

### Gesture controls not working
- Enable gestures in Settings
- Make sure you're on the Gesture tab
- Swipe with sufficient distance
- Check haptic feedback settings

## 💻 Building from Source

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

For detailed setup instructions, see [SETUP.md](SETUP.md).

## 🛠️ Technology Stack

- **Framework**: React Native 0.73 with TypeScript
- **UI Components**: React Native Paper (Material Design)
- **Navigation**: React Navigation 6 with Stack & Tab navigators
- **State Management**: React Context + Hooks
- **Storage**: AsyncStorage for persistent settings
- **Network**: Axios for HTTP requests
- **Animations**: React Native Animated API
- **Gestures**: React Native Gesture Handler

## 🤝 Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details.

## 📝 License

MIT License - see [LICENSE](LICENSE) file for details.

## ⚠️ Disclaimer

This is an unofficial third-party remote control app for MAG devices. It is not affiliated with or endorsed by Infomir. MAG and Infomir are trademarks of their respective owners.

## 🆘 Support

For issues, questions, or feature requests:
- Open an issue on [GitHub](https://github.com/PetsasTeam/MKMAGRemote/issues)
- Check existing issues for solutions
- Provide detailed information (device model, app version, steps to reproduce)

## 📊 Changelog

### Version 1.0.0 (Initial Release)
- Full remote control functionality
- Auto-discovery of MAG devices
- Standard remote mode with all buttons
- Gesture control mode
- Touchpad mode
- Virtual keyboard
- Macro system with 10+ pre-loaded macros
- Quick actions and app shortcuts
- Device management
- Customizable settings
- Modern, animated UI
- Support for all MAG device models
- Cross-platform (iOS & Android)

## 🎯 Roadmap

- [ ] Landscape mode optimization
- [ ] Custom macro creation UI
- [ ] Multiple device profiles
- [ ] Widget for quick access (Android)
- [ ] Watch app (Apple Watch, Wear OS)
- [ ] Voice control integration
- [ ] Remote wake-on-LAN
- [ ] EPG (Electronic Program Guide) display
- [ ] Favorite channels list
- [ ] Remote screenshot feature
- [ ] Dark/Light theme toggle
- [ ] Tablet-optimized layouts
- [ ] Accessibility improvements

## 🌟 Show Your Support

If you find this app useful, please:
- ⭐ Star the repository
- 🐛 Report bugs
- 💡 Suggest features
- 📱 Share with others
- 🤝 Contribute code

## 👥 Authors

**PetsasTeam**

## 🙏 Acknowledgments

- Infomir for MAG hardware
- React Native community
- All contributors and testers

---

Made with ❤️ for the IPTV community
