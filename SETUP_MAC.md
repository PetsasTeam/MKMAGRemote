# Testing IPTV MK Remote on Mac

## Quick Start Options

You have three options to test the app on Mac:

1. **iOS Simulator** (Recommended) - Test on virtual iPhone/iPad
2. **Android Emulator** - Test on virtual Android device
3. **Physical Device** - Test on real iPhone or Android phone

---

## Option 1: iOS Simulator (Best for Mac)

### Prerequisites

#### 1. Install Xcode (Required)

```bash
# Download Xcode from Mac App Store (it's free but ~12GB)
# Or visit: https://apps.apple.com/us/app/xcode/id497799835

# After installation, install Command Line Tools:
xcode-select --install

# Accept Xcode license:
sudo xcodebuild -license accept
```

#### 2. Install CocoaPods (Required for iOS dependencies)

```bash
# Install CocoaPods (Ruby gem for iOS dependencies)
sudo gem install cocoapods

# Verify installation:
pod --version
```

#### 3. Install Watchman (Optional but recommended)

```bash
# Install Homebrew if you don't have it:
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Watchman (file watcher for React Native):
brew install watchman
```

### Setup & Run

```bash
# 1. Navigate to project directory
cd /home/user/MKMAGRemote

# 2. Install npm dependencies
npm install

# 3. Install iOS dependencies (CocoaPods)
cd ios
pod install
cd ..

# 4. Start Metro bundler (in one terminal)
npm start

# 5. Run on iOS Simulator (in another terminal)
npm run ios

# Or specify a device:
npm run ios -- --simulator="iPhone 15 Pro"
```

### Available iOS Simulators

```bash
# List all available simulators:
xcrun simctl list devices available

# Run on specific simulator:
npx react-native run-ios --simulator="iPhone 14"
npx react-native run-ios --simulator="iPhone 15 Pro Max"
npx react-native run-ios --simulator="iPad Pro (12.9-inch)"
```

---

## Option 2: Android Emulator

### Prerequisites

#### 1. Install Android Studio

```bash
# Download from: https://developer.android.com/studio

# After installation, open Android Studio and:
# 1. Go to Settings/Preferences → Appearance & Behavior → System Settings → Android SDK
# 2. Install Android SDK Platform 34
# 3. Install Android SDK Build-Tools 34.0.0
# 4. Install Android Emulator
```

#### 2. Set Environment Variables

Add to your `~/.zshrc` or `~/.bash_profile`:

```bash
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/tools
export PATH=$PATH:$ANDROID_HOME/tools/bin
```

Then reload:
```bash
source ~/.zshrc  # or source ~/.bash_profile
```

#### 3. Create Android Virtual Device (AVD)

```bash
# In Android Studio:
# Tools → Device Manager → Create Device
# Choose a device (e.g., Pixel 7) and download Android 14 system image
```

### Setup & Run

```bash
# 1. Navigate to project directory
cd /home/user/MKMAGRemote

# 2. Install dependencies
npm install

# 3. Start emulator (from Android Studio or command line)
emulator -avd Pixel_7_API_34

# 4. Start Metro bundler (in one terminal)
npm start

# 5. Run on Android (in another terminal)
npm run android
```

---

## Option 3: Physical Device

### For iPhone/iPad

#### Via USB (No Developer Account Needed)

```bash
# 1. Connect iPhone via USB cable

# 2. Trust your Mac on iPhone (popup will appear on phone)

# 3. Open Xcode
open ios/IPTVMKRemote.xcworkspace

# 4. In Xcode:
# - Select your iPhone from device list (top toolbar)
# - Product → Run (or press Cmd+R)

# 5. On your iPhone:
# - Go to Settings → General → VPN & Device Management
# - Trust your developer certificate
```

#### Via WiFi (After initial USB connection)

```bash
# 1. Connect iPhone via USB first

# 2. In Xcode: Window → Devices and Simulators

# 3. Select your iPhone → Check "Connect via network"

# 4. Now you can run without USB:
npm run ios -- --device="YourPhoneName"
```

### For Android Phone

```bash
# 1. Enable Developer Options on Android:
# - Settings → About Phone → Tap "Build Number" 7 times

# 2. Enable USB Debugging:
# - Settings → System → Developer Options → USB Debugging

# 3. Connect via USB cable

# 4. Verify device is connected:
adb devices

# 5. Run the app:
npm run android
```

---

## Quick Test Without Physical Device

If you just want to see the code structure and test the app logic without running it:

```bash
# 1. Install dependencies
cd /home/user/MKMAGRemote
npm install

# 2. Run TypeScript type checking
npx tsc --noEmit

# 3. Run linter
npm run lint

# 4. Start Metro bundler (to see if it builds)
npm start
```

---

## Troubleshooting

### iOS Simulator Issues

**Simulator won't start:**
```bash
# Reset simulator:
xcrun simctl shutdown all
xcrun simctl erase all

# Restart your Mac
```

**Build fails with CocoaPods error:**
```bash
cd ios
pod deintegrate
rm -rf Pods Podfile.lock
pod install
cd ..
```

**Port 8081 already in use:**
```bash
# Kill Metro bundler:
lsof -ti:8081 | xargs kill -9

# Or use different port:
npm start -- --port 8082
```

### Android Emulator Issues

**Emulator is slow:**
```bash
# Make sure HAXM (Intel) or Hypervisor Framework (M1/M2) is enabled
# In Android Studio: Tools → SDK Manager → SDK Tools → Check "Intel x86 Emulator Accelerator"
```

**Build fails:**
```bash
cd android
./gradlew clean
cd ..
npm start --reset-cache
```

**Cannot connect to Metro:**
```bash
# Reverse port for emulator:
adb reverse tcp:8081 tcp:8081
```

---

## Recommended Testing Setup

For best experience on Mac:

1. **Primary**: iOS Simulator (iPhone 15 Pro) - Best performance, easiest setup
2. **Secondary**: Android Emulator (Pixel 7) - Test Android compatibility
3. **Final**: Physical iPhone - Test real-world experience

---

## Expected Installation Times

- **Xcode**: 30-60 minutes (large download)
- **Android Studio**: 20-30 minutes
- **npm install**: 2-5 minutes
- **pod install**: 1-3 minutes
- **First build**: 5-10 minutes
- **Subsequent builds**: 1-2 minutes

---

## System Requirements

### Minimum:
- macOS 12.0 (Monterey) or later
- 8GB RAM
- 20GB free disk space
- Intel or Apple Silicon (M1/M2/M3) processor

### Recommended:
- macOS 14.0 (Sonoma) or later
- 16GB+ RAM
- 50GB free disk space
- Apple Silicon (M1/M2/M3) for best performance

---

## Next Steps After Setup

Once the app is running:

1. **Test Device Discovery**:
   - Make sure you're on the same network as a MAG device
   - Or use the manual IP entry feature

2. **Test Control Modes**:
   - Standard Remote
   - Gesture Control (swipe around)
   - Touchpad Mode
   - Virtual Keyboard

3. **Test Macros**:
   - Load default macros
   - Execute a few to see the sequence

4. **Test Quick Actions**:
   - Try the quick action buttons
   - Navigate to different screens

---

## Getting Help

If you encounter issues:

1. Check error messages carefully
2. Google the specific error
3. Check React Native documentation: https://reactnative.dev/docs/environment-setup
4. Open an issue on GitHub with:
   - Your Mac model and macOS version
   - Error message
   - Steps you've taken
   - Screenshots if applicable

---

## Quick Reference Commands

```bash
# Install dependencies
npm install

# iOS
cd ios && pod install && cd ..
npm run ios

# Android
npm run android

# Start Metro bundler
npm start

# Clear cache
npm start --reset-cache

# Check for errors
npx tsc --noEmit
npm run lint

# List iOS simulators
xcrun simctl list devices

# Check Android devices
adb devices
```

Good luck! 🚀
