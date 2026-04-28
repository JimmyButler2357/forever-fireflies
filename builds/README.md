# Builds

AAB/APK files are not stored in git — they're large and can always be re-downloaded from EAS.

## Build Log

| Date | Profile | Platform | Format | EAS Build ID | Download |
|------|---------|----------|--------|-------------|----------|
| 2026-03-28 | preview | Android | AAB | 5868ddb4-a19f-4478-8b80-87edd0121a98 | [Download](https://expo.dev/artifacts/eas/bVcspTJnrAW9B5z1oof51Y.aab) |

## How to rebuild

```bash
# Preview (closed testing / beta)
npx eas build --profile preview --platform android

# Development (local dev with hot reload)
npx eas build --profile development --platform android

# Production (public release)
npx eas build --profile production --platform android
```

## Notes

- Download links expire after ~30 days. Use the EAS Build ID to find them in the [Expo dashboard](https://expo.dev).
- Preview builds have paywall bypass enabled (`EXPO_PUBLIC_BYPASS_PAYWALL=true`).
- Production builds do not.
