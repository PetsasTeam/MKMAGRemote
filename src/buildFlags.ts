/**
 * Build-time switches. Always false in the repository and in App Store
 * builds; scripts/build-owner.sh turns OWNER_BUILD on for a personal copy
 * installed straight from the Mac, which then skips the paywall.
 */
export const OWNER_BUILD = false;
