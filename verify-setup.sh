#!/bin/bash

# IPTV MK Remote - Mac Setup Verification Script
# Run this script on your Mac to check if everything is ready

echo "🔍 IPTV MK Remote - Setup Verification"
echo "======================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Track if all checks pass
ALL_GOOD=true

# Function to check command existence
check_command() {
    local cmd=$1
    local name=$2
    local install_msg=$3

    if command -v $cmd &> /dev/null; then
        local version=$($cmd --version 2>&1 | head -n 1)
        echo -e "${GREEN}✅ $name is installed${NC}"
        echo "   Version: $version"
        return 0
    else
        echo -e "${RED}❌ $name is NOT installed${NC}"
        echo -e "   ${YELLOW}Install: $install_msg${NC}"
        ALL_GOOD=false
        return 1
    fi
}

echo "📋 Checking Prerequisites..."
echo ""

# Check Node.js
check_command "node" "Node.js" "Download from https://nodejs.org (v18 or higher required)"
echo ""

# Check npm
check_command "npm" "npm" "Comes with Node.js"
echo ""

# Check Xcode Command Line Tools
if xcode-select -p &> /dev/null; then
    echo -e "${GREEN}✅ Xcode Command Line Tools is installed${NC}"
    echo "   Path: $(xcode-select -p)"
else
    echo -e "${RED}❌ Xcode Command Line Tools is NOT installed${NC}"
    echo -e "   ${YELLOW}Install: xcode-select --install${NC}"
    ALL_GOOD=false
fi
echo ""

# Check Xcode
if [ -d "/Applications/Xcode.app" ]; then
    echo -e "${GREEN}✅ Xcode is installed${NC}"
    if command -v xcodebuild &> /dev/null; then
        xcodebuild -version
    fi
else
    echo -e "${YELLOW}⚠️  Xcode is NOT installed${NC}"
    echo -e "   ${BLUE}Install from Mac App Store (required for iOS Simulator)${NC}"
    echo -e "   ${BLUE}Or skip if you only want to test on physical device${NC}"
fi
echo ""

# Check CocoaPods
check_command "pod" "CocoaPods" "sudo gem install cocoapods"
echo ""

# Check Watchman (optional)
if command -v watchman &> /dev/null; then
    echo -e "${GREEN}✅ Watchman is installed (optional but recommended)${NC}"
    watchman --version
else
    echo -e "${YELLOW}⚠️  Watchman is NOT installed (optional)${NC}"
    echo -e "   ${BLUE}Install: brew install watchman${NC}"
fi
echo ""

# Check project files
echo "📁 Checking Project Files..."
echo ""

check_file() {
    local file=$1
    local name=$2

    if [ -f "$file" ]; then
        echo -e "${GREEN}✅ $name exists${NC}"
        return 0
    else
        echo -e "${RED}❌ $name is missing${NC}"
        ALL_GOOD=false
        return 1
    fi
}

check_file "package.json" "package.json"
check_file "App.tsx" "App.tsx"
check_file "tsconfig.json" "tsconfig.json"
check_file "ios/Podfile" "iOS Podfile"
echo ""

# Check if node_modules exists
if [ -d "node_modules" ]; then
    echo -e "${GREEN}✅ node_modules exists (dependencies installed)${NC}"
else
    echo -e "${YELLOW}⚠️  node_modules not found${NC}"
    echo -e "   ${BLUE}Run: npm install${NC}"
fi
echo ""

# Check if iOS Pods are installed
if [ -d "ios/Pods" ]; then
    echo -e "${GREEN}✅ iOS Pods installed${NC}"
else
    echo -e "${YELLOW}⚠️  iOS Pods not found${NC}"
    echo -e "   ${BLUE}Run: cd ios && pod install && cd ..${NC}"
fi
echo ""

# Check available iOS Simulators
echo "📱 Checking iOS Simulators..."
echo ""

if command -v xcrun &> /dev/null; then
    simulator_count=$(xcrun simctl list devices available 2>/dev/null | grep "iPhone" | wc -l | xargs)

    if [ "$simulator_count" -gt 0 ]; then
        echo -e "${GREEN}✅ Found $simulator_count iPhone simulator(s)${NC}"
        echo ""
        echo "Available simulators:"
        xcrun simctl list devices available 2>/dev/null | grep "iPhone" | head -5
        echo ""
    else
        echo -e "${YELLOW}⚠️  No simulators found${NC}"
        echo -e "   ${BLUE}Open Xcode → Settings → Platforms to install simulators${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Cannot check simulators (Xcode not installed)${NC}"
fi
echo ""

# Check source files
echo "💻 Checking Source Code..."
echo ""

component_count=$(find src -type f \( -name "*.tsx" -o -name "*.ts" \) 2>/dev/null | wc -l | xargs)
if [ "$component_count" -gt 0 ]; then
    echo -e "${GREEN}✅ Found $component_count TypeScript source files${NC}"
    echo ""
    echo "Source structure:"
    tree -L 2 src 2>/dev/null || find src -maxdepth 2 -type d
else
    echo -e "${RED}❌ No source files found${NC}"
    ALL_GOOD=false
fi
echo ""

# Summary
echo "================================"
echo "📊 VERIFICATION SUMMARY"
echo "================================"
echo ""

if [ "$ALL_GOOD" = true ]; then
    echo -e "${GREEN}✅ All required components are installed!${NC}"
    echo ""
    echo "🚀 You're ready to run the app!"
    echo ""
    echo "Next steps:"
    echo "  1. npm install                    # Install dependencies (if not done)"
    echo "  2. cd ios && pod install && cd .. # Install iOS dependencies"
    echo "  3. npm start                      # Start Metro bundler"
    echo "  4. npm run ios                    # Run on iOS Simulator (in new terminal)"
    echo ""
else
    echo -e "${YELLOW}⚠️  Some components are missing${NC}"
    echo ""
    echo "Please install the missing components shown above."
    echo "See SETUP_MAC.md for detailed installation instructions."
    echo ""
fi

# Additional checks
echo "💡 Additional Information:"
echo ""
echo "Current directory: $(pwd)"
echo "macOS version: $(sw_vers -productVersion 2>/dev/null || echo 'Unknown')"
echo "Architecture: $(uname -m)"
echo ""

# Quick start reminder
echo "================================"
echo "🎯 QUICK START COMMANDS"
echo "================================"
echo ""
echo "# Install dependencies:"
echo "npm install"
echo ""
echo "# Install iOS dependencies:"
echo "cd ios && pod install && cd .."
echo ""
echo "# Run on iOS (opens simulator):"
echo "npm run ios"
echo ""
echo "# Run on specific simulator:"
echo "npm run ios -- --simulator=\"iPhone 15 Pro\""
echo ""
echo "# List available simulators:"
echo "xcrun simctl list devices available | grep iPhone"
echo ""
echo "# For physical iPhone:"
echo "# Connect iPhone → Open Xcode → Select device → Press Run"
echo ""

echo "================================"
echo "For detailed instructions, see SETUP_MAC.md"
echo "================================"
