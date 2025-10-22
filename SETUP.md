# IPTV MK Remote - Development Setup Guide

This guide will help you set up your development environment to build and run the IPTV MK Remote app.

## Prerequisites

Before you begin, ensure you have the following installed:

### Required for All Platforms
- **Node.js** (v18 or higher)
- **npm** or **yarn**
- **Git**
- **React Native CLI**: Install globally with `npm install -g react-native-cli`

### For Android Development
- **Java Development Kit (JDK)** 11 or higher
- **Android Studio** with the following components:
  - Android SDK Platform 34
  - Android SDK Build-Tools 34.0.0
  - Android Emulator (optional, for testing)
  - Android SDK Platform-Tools
  - Android NDK version 25.1.8937393
- **Environment Variables**:
  ```bash
  export ANDROID_HOME=$HOME/Library/Android/sdk  # macOS
  # or
  export ANDROID_HOME=$HOME/Android/Sdk  # Linux

  export PATH=$PATH:$ANDROID_HOME/emulator
  export PATH=$PATH:$ANDROID_HOME/platform-tools
  ```

### For iOS Development (macOS only)
- **Xcode** 14 or higher (from Mac App Store)
- **CocoaPods**: Install with `sudo gem install cocoapods`
- **Xcode Command Line Tools**: `xcode-select --install`

## Initial Setup

### 1. Clone the Repository

```bash
git clone https://github.com/PetsasTeam/MKMAGRemote.git
cd MKMAGRemote
```

### 2. Install Dependencies

```bash
npm install
# or
yarn install
```

### 3. Platform-Specific Setup

#### Android Setup

1. No additional setup needed if you have Android Studio configured
2. Connect an Android device via USB with USB debugging enabled, or start an Android emulator

#### iOS Setup (macOS only)

1. Install CocoaPods dependencies:
   ```bash
   cd ios
   pod install
   cd ..
   ```

2. Open `ios/IPTVMKRemote.xcworkspace` in Xcode (not the .xcodeproj file)

## Running the App

### Start Metro Bundler

In the project root directory:

```bash
npm start
# or
yarn start
```

Keep this terminal window open while developing.

### Run on Android

In a new terminal window:

```bash
npm run android
# or
yarn android
```

This will:
1. Build the Android app
2. Install it on your connected device/emulator
3. Launch the app

### Run on iOS (macOS only)

In a new terminal window:

```bash
npm run ios
# or
yarn ios
```

To run on a specific simulator:

```bash
npx react-native run-ios --simulator="iPhone 14 Pro"
```

## Troubleshooting

### Common Android Issues

**Build fails with "SDK location not found":**
- Create `android/local.properties` file with:
  ```
  sdk.dir=/path/to/your/Android/sdk
  ```

**Metro bundler connection issues:**
```bash
adb reverse tcp:8081 tcp:8081
```

**Clear cache and rebuild:**
```bash
cd android
./gradlew clean
cd ..
npm start --reset-cache
```

### Common iOS Issues

**Pod install fails:**
```bash
cd ios
pod deintegrate
pod install
cd ..
```

**Build fails in Xcode:**
- Clean build folder: Product → Clean Build Folder (Cmd+Shift+K)
- Delete derived data: Xcode → Preferences → Locations → Derived Data → Delete

**Simulator not launching:**
```bash
xcrun simctl list
xcrun simctl boot "iPhone 14 Pro"
```

### Network Issues

**Cannot connect to MAG device:**
1. Ensure both phone and MAG box are on the same WiFi network
2. Check if Remote Control is enabled on MAG box (Settings → System Settings → Remote Control)
3. Verify MAG box IP address (Settings → System Info → Network)
4. Try pinging the MAG box from your development machine:
   ```bash
   ping [MAG_BOX_IP]
   ```

## Development Tips

### Hot Reloading

- **Android/iOS**: Shake the device or press Cmd+M (Android) / Cmd+D (iOS) to open dev menu
- Enable "Fast Refresh" for automatic reloads on code changes

### Debugging

**Chrome DevTools:**
1. Open dev menu (shake device or Cmd+M/Cmd+D)
2. Select "Debug"
3. Chrome will open with DevTools

**React Native Debugger:**
```bash
npm install -g react-native-debugger
```

**Flipper (recommended):**
- Open Flipper app
- Your running app should appear automatically
- Access network inspector, logs, layout inspector, etc.

### TypeScript

The project uses TypeScript for type safety. Run type checking:

```bash
npx tsc --noEmit
```

### Linting

```bash
npm run lint
# or
yarn lint
```

Fix auto-fixable issues:
```bash
npm run lint -- --fix
```

## Building for Production

### Android APK

```bash
cd android
./gradlew assembleRelease
```

The APK will be at: `android/app/build/outputs/apk/release/app-release.apk`

### Android App Bundle (for Play Store)

```bash
cd android
./gradlew bundleRelease
```

### iOS (macOS only)

1. Open `ios/IPTVMKRemote.xcworkspace` in Xcode
2. Select "Any iOS Device" as the build target
3. Product → Archive
4. Follow the prompts to upload to App Store Connect

## Environment Configuration

Create a `.env` file in the root directory for environment-specific settings:

```env
# Development
DEV_MODE=true
LOG_LEVEL=debug

# MAG Device defaults
DEFAULT_PORT=80
SCAN_TIMEOUT=3000
```

## Testing

### Run Tests

```bash
npm test
# or
yarn test
```

### Run Tests in Watch Mode

```bash
npm test -- --watch
```

## Additional Resources

- [React Native Documentation](https://reactnative.dev/docs/getting-started)
- [React Navigation](https://reactnavigation.org/docs/getting-started)
- [React Native Paper](https://callstack.github.io/react-native-paper/)
- [TypeScript](https://www.typescriptlang.org/docs/)

## Getting Help

If you encounter issues:

1. Check the [Troubleshooting](#troubleshooting) section
2. Search existing [GitHub Issues](https://github.com/PetsasTeam/MKMAGRemote/issues)
3. Create a new issue with:
   - Development environment details
   - Steps to reproduce
   - Error messages/logs
   - Screenshots if applicable

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.
