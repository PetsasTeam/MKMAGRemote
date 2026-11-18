# Export compliance (please confirm)

App Store Connect asks about encryption for every build.

**What BoxPilot does:** AuraHD-protocol MAG boxes only accept remote-control commands encrypted with AES-256-CBC, the box's own protocol. BoxPilot encrypts the commands it sends to the user's own box on the local network. It doesn't encrypt user data for storage or for sending over the internet, and it uses no other cryptography. The App Store purchase uses Apple's own encryption.

**Suggested answers** (confirm before submitting):

1. *Does your app use encryption?* **Yes.**
2. *Does it qualify for any of the exemptions in Category 5, Part 2?* The app uses standard encryption (AES) only to talk to a consumer device under the user's control. That is a mass-market use and generally qualifies for the exemption. If App Store Connect asks whether it uses "standard encryption algorithms instead of, or in addition to, Apple's", answer **Yes**. It is not proprietary encryption.
3. Distribution in France: no separate declaration is normally needed for this kind of use. Check this if you distribute there.

Once you have confirmed the answers, add this to `ios/IPTVMKRemote/Info.plist` so you aren't asked on every upload:

```xml
<key>ITSAppUsesNonExemptEncryption</key>
<false/>
```

Use `false` only if you agree the use is exempt. If unsure, check with an export-compliance adviser. This is not legal advice.
