#!/bin/bash
# Builds a personal Release copy of BoxPilot with the paywall switched off and
# installs it on a connected iPhone. The switch is put back afterwards, so the
# repository and App Store builds are unaffected.
#   scripts/build-owner.sh <device-udid> [team-id]
set -euo pipefail
cd "$(dirname "$0")/.."
DEVICE="${1:?usage: scripts/build-owner.sh <device-udid> [team-id]}"
TEAM="${2:-YLE8N7AAH2}"
FLAGS=src/buildFlags.ts

restore() { sed -i '' 's/OWNER_BUILD = true/OWNER_BUILD = false/' "$FLAGS"; }
trap restore EXIT
sed -i '' 's/OWNER_BUILD = false/OWNER_BUILD = true/' "$FLAGS"
grep -q 'OWNER_BUILD = true' "$FLAGS"

cd ios
LANG=en_US.UTF-8 xcodebuild -workspace IPTVMKRemote.xcworkspace -scheme IPTVMKRemote \
  -configuration Release -destination "id=$DEVICE" -derivedDataPath build-owner \
  DEVELOPMENT_TEAM="$TEAM" CODE_SIGN_STYLE=Automatic -allowProvisioningUpdates build \
  | grep -E 'error:|BUILD (SUCCEEDED|FAILED)'
xcrun devicectl device install app --device "$DEVICE" \
  build-owner/Build/Products/Release-iphoneos/IPTVMKRemote.app
echo "Installed the owner build on $DEVICE"
