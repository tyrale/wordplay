# Native app testing (EAS Update + Expo Go)

Testers can run the native app from anywhere. They don't need to be on the same Wi-Fi, and the dev machine doesn't need to be running.

| Item         | Value                                                                  |
| ------------ | ---------------------------------------------------------------------- |
| Expo project | `@reword/wordplay`, https://expo.dev/accounts/reword/projects/wordplay |
| Testers      | Members of the `reword` Expo organization                              |
| Channel      | `preview` → branch `preview`                                           |
| Runtime      | `exposdk:58.0.0` (`runtimeVersion.policy: "sdkVersion"`)               |
| Backend      | Production ReWord Supabase. **Test data is real data.**                |

## Adding a tester

Expo Go opens published updates only for people **signed in to Expo Go with an account that has access to the project**. Scanning without that access fails with "Something went wrong". Simulators aren't checked.

1. The tester creates a free account at https://expo.dev/signup.
2. An owner invites them at https://expo.dev/accounts/reword/members (**Invite**), using the lowest role that works (Viewer).
3. The tester accepts the invite email.

## For testers

1. Install **Expo Go** for SDK 58 and **sign in** with the Expo account that was invited:
   - **iPhone:** the App Store version.
   - **Android:** the Play Store version, or the SDK 58 build from https://expo.dev/go if the store version doesn't match.
2. Scan this QR code. On iPhone, use the Camera app; on Android, scan from inside Expo Go.

   ![Expo Go preview QR](./expo-go-preview-qr.png)

   Or open this link on the phone:
   `exp://u.expo.dev/5d0c1923-3eea-4d49-b76e-0878538eb58c?channel-name=preview&runtime-version=exposdk:58.0.0`

The link is stable: it always loads the latest update published to `preview`. To pick up a new update, force-close the app in Expo Go and reopen it.

## Publishing a new version for testers

From `apps/native`, signed in with `npx eas-cli login`:

```bash
npx eas-cli@latest update --branch preview --environment preview --message "what changed"
```

`EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` come from the EAS **preview** environment (Expo dashboard → project → Environment variables), not from `.env.local`. With `--environment`, EAS ignores local `.env` files. These are public values (the publishable key). If they're missing, the app falls back to `placeholder.supabase.co` and multiplayer stops working, so after publishing, check that the exported bundle in `dist/` contains `supabase.co` and not `placeholder`.

## Limits and next steps

- **Expo Go only**: the `sdkVersion` runtime policy is what lets Expo Go load these updates. Once the app has real builds (`eas build --profile preview`, or TestFlight), switch to the `appVersion` or `fingerprint` policy, rebuild, and publish updates against that runtime.
- **Android sign-in bug**: some Expo Go Android versions don't send the signed-in session with update requests, so loading fails even for invited members (expo/expo#50498). iPhone isn't affected. The workaround is a preview APK (`eas build --profile preview --platform android`).
- **SDK upgrades**: App Store Expo Go supports only the latest SDK; iPhone users can't install an older one. When Expo ships a new SDK, upgrade the app (`npx expo install expo@^<new>.0.0 --fix`), republish, and regenerate the QR code (the link's `runtime-version` changes). Otherwise iPhone testers need real builds (TestFlight).
- **App IDs**: `com.tyrale.wordplay` (iOS `bundleIdentifier` and Android `package`). These are permanent once published to a store.
