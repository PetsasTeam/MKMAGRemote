# 🚀 Quick Test Checklist for Mac

This checklist will help you test the IPTV MK Remote app on your Mac step by step.

## ✅ Pre-Test Checklist

Before testing, make sure you have:

- [ ] **Mac computer** with macOS 12.0 or later
- [ ] **Git installed** (comes with Xcode Command Line Tools)
- [ ] **10GB+ free disk space** (for Xcode and dependencies)
- [ ] **Stable internet connection** (for downloading dependencies)

---

## 📦 Step 1: Clone & Verify (5 minutes)

On your Mac, open **Terminal** and run:

```bash
# Clone the repository
git clone https://github.com/PetsasTeam/MKMAGRemote.git
cd MKMAGRemote

# Run verification script
bash verify-setup.sh
```

**Expected Output:**
- ✅ Checks will show what's installed
- ✅ Shows what's missing (if anything)
- ✅ Provides installation commands

**Action:** Follow any installation instructions shown by the script.

---

## 🛠️ Step 2: Install Prerequisites (30-60 minutes first time)

### A. Install Xcode (Required for iOS Simulator)

```bash
# Open Mac App Store
open -a "App Store"

# Search for "Xcode" and click Install
# This will take 30-60 minutes (it's ~12GB)

# After installation, install Command Line Tools:
xcode-select --install

# Accept license:
sudo xcodebuild -license accept
```

**Check:**
```bash
xcodebuild -version
# Should show: Xcode 15.x.x
```

### B. Install CocoaPods

```bash
sudo gem install cocoapods

# Verify:
pod --version
```

### C. Install Watchman (Optional but Recommended)

```bash
# Install Homebrew if you don't have it:
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Watchman:
brew install watchman

# Verify:
watchman --version
```

---

## 📱 Step 3: Install Dependencies (5 minutes)

```bash
# Make sure you're in the project directory
cd /path/to/MKMAGRemote

# Install npm dependencies
npm install

# Install iOS dependencies
cd ios
pod install
cd ..
```

**Expected Output:**
```
✔ Dependencies installed successfully
✔ Pod installation complete
```

**Troubleshooting:**
If you get errors:
```bash
# Clear cache and retry:
npm cache clean --force
rm -rf node_modules package-lock.json
npm install

# For CocoaPods issues:
cd ios
pod deintegrate
rm -rf Pods Podfile.lock
pod install
cd ..
```

---

## 🏃 Step 4: Run the App (2 minutes)

### Option A: iOS Simulator (Recommended)

Open **two terminal windows**:

**Terminal 1 - Start Metro Bundler:**
```bash
cd MKMAGRemote
npm start
```

**Terminal 2 - Run on Simulator:**
```bash
cd MKMAGRemote
npm run ios
```

**Expected Result:**
1. ✅ iOS Simulator window opens
2. ✅ App builds and installs (first time takes 5-10 minutes)
3. ✅ App launches showing "IPTV MK Remote" home screen

**Choose Specific Simulator:**
```bash
# List available simulators:
xcrun simctl list devices available | grep iPhone

# Run on specific device:
npm run ios -- --simulator="iPhone 15 Pro"
npm run ios -- --simulator="iPhone 14"
npm run ios -- --simulator="iPad Pro (12.9-inch)"
```

### Option B: Physical iPhone

```bash
# 1. Connect iPhone to Mac via USB

# 2. Open project in Xcode:
open ios/IPTVMKRemote.xcworkspace

# 3. In Xcode:
#    - Select your iPhone from device dropdown (top toolbar)
#    - Click the "Run" button (▶️) or press Cmd+R

# 4. On your iPhone:
#    - Go to Settings → General → VPN & Device Management
#    - Trust your developer certificate
```

---

## 🧪 Step 5: Test Features (10 minutes)

Once the app is running, test these features:

### ✅ Basic Tests

- [ ] **App launches** without crashes
- [ ] **Home screen appears** with "IPTV MK Remote" title
- [ ] **Navigation works** between screens
- [ ] **Settings button** opens settings screen

### ✅ Device Discovery Tests

- [ ] Click **"Find Devices"** button
- [ ] Network scan starts (you'll see progress)
- [ ] Click **"Add Manually"** and enter IP: `192.168.1.100`
- [ ] Device card appears on home screen

### ✅ Remote Control Tests (Without MAG Device)

- [ ] Connect to a device (or manually add one)
- [ ] **Remote screen opens** with all buttons
- [ ] Test **4 control modes** via tabs:
  - **Standard Remote**: All buttons visible
  - **Gesture Control**: Swipe area appears with arrows
  - **Touchpad Mode**: Large touchpad area shown
  - **Virtual Keyboard**: Full QWERTY keyboard displays

### ✅ Gesture Tests

On **Gesture Control** tab:
- [ ] **Swipe up** → "↑ Up" appears
- [ ] **Swipe down** → "↓ Down" appears
- [ ] **Swipe left** → "← Left" appears
- [ ] **Swipe right** → "→ Right" appears
- [ ] **Tap center** → "OK" appears
- [ ] **Haptic feedback** works (phone vibrates)

### ✅ Virtual Keyboard Tests

On **Keyboard** tab:
- [ ] Type letters → Text appears in input field
- [ ] **Shift** toggles uppercase/lowercase
- [ ] **123** switches to symbols
- [ ] **Backspace** deletes characters
- [ ] **Space bar** adds spaces

### ✅ Macro Tests

- [ ] Click **Macros** button on Remote screen
- [ ] Click **"Load Default Macros"**
- [ ] See 10+ macros appear:
  - Start IPTV
  - Skip Intro
  - Volume Reset
  - etc.
- [ ] Click **"Run"** on any macro
- [ ] Macro shows "Executing..." status

### ✅ Quick Actions Tests

- [ ] Navigate to **Quick Actions** screen
- [ ] Click **"Load Default Actions"**
- [ ] See quick action buttons:
  - ⚡ Power
  - 🌐 Portal
  - 📋 Menu
  - ⭐ Favorites
  - 💾 USB
  - ⚙️ Settings
- [ ] Tap any quick action (command sends)

### ✅ Settings Tests

- [ ] Open **Settings** screen
- [ ] Toggle **Vibration Feedback** (on/off)
- [ ] Toggle **Sound Feedback** (on/off)
- [ ] Toggle **Auto Connect** (on/off)
- [ ] Changes save automatically

### ✅ UI/Animation Tests

- [ ] Buttons have **press animation** (shrink on tap)
- [ ] Connection status shows **pulse animation**
- [ ] Smooth **transitions** between screens
- [ ] **Haptic feedback** on button presses
- [ ] **Tab switching** is smooth

---

## 🎯 Success Criteria

Your test is **successful** if:

✅ App launches without crashing
✅ All 4 control modes display correctly
✅ Gestures are recognized and show feedback
✅ Virtual keyboard types characters
✅ Macros load and execute
✅ Quick actions display
✅ Settings save and load
✅ Animations are smooth
✅ Navigation works between all screens

---

## ❌ Common Issues & Solutions

### Issue: "iOS Simulator not found"
```bash
# Open Xcode → Settings → Platforms
# Download iOS 17.x simulator
```

### Issue: "Command PhaseScriptExecution failed"
```bash
cd ios
pod deintegrate
pod install
cd ..
```

### Issue: "Metro bundler connection failed"
```bash
# Kill existing Metro:
lsof -ti:8081 | xargs kill -9

# Restart:
npm start --reset-cache
```

### Issue: "Unable to boot simulator"
```bash
# Reset simulator:
xcrun simctl shutdown all
xcrun simctl erase all

# Restart Mac if issues persist
```

### Issue: App builds but crashes immediately
```bash
# Clear derived data:
rm -rf ~/Library/Developer/Xcode/DerivedData/*

# Clean and rebuild:
cd ios
xcodebuild clean
cd ..
npm run ios
```

---

## 📊 Test Report Template

After testing, document your results:

```
IPTV MK Remote - Test Report
============================

Date: __________
Tester: __________
Mac Model: __________
macOS Version: __________
Xcode Version: __________

Installation:
[ ] Prerequisites installed successfully
[ ] Dependencies installed without errors
[ ] App built successfully

Functionality:
[ ] App launches
[ ] All 4 control modes work
[ ] Gestures recognized
[ ] Keyboard functional
[ ] Macros execute
[ ] Quick actions work
[ ] Settings persist

Performance:
[ ] Animations smooth
[ ] No lag or freezing
[ ] Fast screen transitions

Issues Found:
1. __________
2. __________

Overall Rating: ___/10

Notes:
__________
```

---

## 🎬 Next Steps After Testing

If all tests pass:

1. **Test with actual MAG device**:
   - Connect Mac and MAG to same WiFi
   - Find device using auto-discovery
   - Test actual remote commands

2. **Build for production**:
   ```bash
   # iOS Archive:
   # Open Xcode → Product → Archive

   # Android APK:
   cd android
   ./gradlew assembleRelease
   ```

3. **Report any bugs**:
   - Create GitHub issue
   - Include test report
   - Attach screenshots

---

## 🆘 Need Help?

If you encounter issues:

1. **Check logs**: Metro bundler shows detailed error messages
2. **Google the error**: Most issues have solutions online
3. **Check documentation**: See SETUP_MAC.md for details
4. **Ask for help**: Create GitHub issue with:
   - Your Mac model and macOS version
   - Error message
   - Steps you took
   - Screenshots

---

## ✨ Expected Experience

When everything works correctly, you should see:

🎨 **Beautiful dark theme** with blue accents
📱 **4 different control modes** in tabs
👆 **Smooth gesture recognition** with visual feedback
⌨️ **Full keyboard** with shift and symbols
⚡ **10+ ready-to-use macros**
⭐ **Quick access buttons** for common actions
🎯 **Professional animations** throughout
📊 **Live connection status**
⚙️ **Customizable settings**

---

**Good luck testing! 🚀**

For the full setup guide, see: **SETUP_MAC.md**
