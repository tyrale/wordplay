# Native app testing (EAS Update + Expo Go)

Testers can run the native app from anywhere. They don't need to be on the same Wi-Fi, and the dev machine doesn't need to be running.

| Item         | Value                                                                |
| ------------ | -------------------------------------------------------------------- |
| Expo project | `@mohow/wordplay`, https://expo.dev/accounts/mohow/projects/wordplay |
| Channel      | `preview` → branch `preview`                                         |
| Runtime      | `exposdk:54.0.0` (`runtimeVersion.policy: "sdkVersion"`)             |
| Backend      | Production ReWord Supabase. **Test data is real data.**              |

## For testers

1. Install **Expo Go** for SDK 54:
   - **iPhone:** the App Store version.
   - **Android:** the Play Store version, or the SDK 54 build from https://expo.dev/go if the store version is newer.
2. Scan this QR code. On iPhone, use the Camera app; on Android, scan from inside Expo Go.

   ![Expo Go preview QR](./expo-go-preview-qr.png)

   Or open this link on the phone:
   `exp://u.expo.dev/5d0c1923-3eea-4d49-b76e-0878538eb58c?channel-name=preview&runtime-version=exposdk:54.0.0`

The link is stable: it always loads the latest update published to `preview`. To pick up a new update, force-close the app in Expo Go and reopen it.

## Publishing a new version for testers

From `apps/native`, signed in with `npx eas-cli login`:

```bash
npx eas-cli@latest update --branch preview --message "what changed"
```

`EXPO_PUBLIC_*` values are inlined from `apps/native/.env.local` when you publish. Publish only from a machine that has that file; without it, the app falls back to `placeholder.supabase.co` and multiplayer stops working.

## Limits and next steps

- **Expo Go only**: the `sdkVersion` runtime policy is what lets Expo Go load these updates. Once the app has real builds (`eas build --profile preview`, or TestFlight), switch to the `appVersion` or `fingerprint` policy, rebuild, and publish updates against that runtime.
- **SDK upgrades**: App Store Expo Go supports only the latest SDK. Upgrading past SDK 54 means iPhone testers need real builds (TestFlight).
- **App IDs**: `com.tyrale.wordplay` (iOS `bundleIdentifier` and Android `package`). These are permanent once published to a store.
