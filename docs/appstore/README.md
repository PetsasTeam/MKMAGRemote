# App Store submission kit

| File | Use |
|---|---|
| [listing.md](listing.md) | Name, subtitle, description, keywords (EN + EL), IAP products, privacy label |
| [review-notes.md](review-notes.md) | Notes for App Review (demo box, permissions, IAP) |
| [privacy-policy.md](privacy-policy.md) | Host it and use the link as the Privacy Policy URL |
| [support.md](support.md) | Host it and use the link as the Support URL |
| [export-compliance.md](export-compliance.md) | Encryption questions: confirm the answers |

Before submitting:

1. Replace `SUPPORT_EMAIL_HERE` in the two hosted pages. Set `SUPPORT_EMAIL` in `src/config.ts` to show "Contact support" in Settings.
2. Accept the Paid Apps agreement and fill in banking and tax details in App Store Connect.
3. Join the App Store Small Business Program (15% commission instead of 30%).
4. Create the two in-app purchases from listing.md and attach them to the version.
5. Test purchases with a Sandbox Apple ID (Settings → Developer → Sandbox Apple Account on the iPhone). From Xcode, you can instead pick `ios/BoxPilot.storekit` under Edit Scheme → Run → Options → StoreKit Configuration.
