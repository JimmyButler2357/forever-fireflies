# Build Guide — Forever Fireflies

## How Expo Builds Work

Think of your app like a sandwich:
- **The bread** = the native shell (compiled code that talks to your phone's hardware — camera, microphone, network, etc.)
- **The filling** = your JavaScript code (screens, components, logic)

When you run `npx expo start`, only the filling gets served fresh from your dev server. The bread was baked earlier during a **build**. If you change which native packages are in the sandwich (add/remove bread ingredients), you need to bake new bread — that's a **rebuild**.

## Build Profiles

Your project has three build profiles defined in `eas.json`:

| Profile | What it is | Who uses it | How it runs |
|---|---|---|---|
| `development` | Your personal dev build | You (the developer) | Connects to your local dev server (`npx expo start`) — hot reload, dev tools, error overlays |
| `preview` | Beta testers' build | Testers you invite | Standalone app — works like a normal installed app, no dev server needed |
| `production` | App Store / Play Store release | End users | Final optimized build for public distribution |

## When You Need to Rebuild

### Rebuild required (new bread)
- Adding or removing a native package (e.g. `expo-network`, `expo-camera`, `@react-native-community/netinfo`)
- Changing `app.json` values that affect the native shell (permissions, plugins, package name, version)
- Updating Expo SDK version

### No rebuild needed (just restart dev server)
- Changing any `.ts` / `.tsx` / `.js` file (screens, components, hooks, services, styles)
- Adding a JS-only package (no native code)
- Changing images or other assets

**How to tell:** If a package has native code (Android/iOS folders, or it appears in `app.json` plugins), it needs a rebuild. Pure JS packages (like `date-fns`, `zustand`) don't.

## Package Rules

1. **Always prefer `expo-*` packages** over `@react-native-community/*` alternatives. Expo packages are tested against your SDK version and work out of the box. Community packages may need extra native config and can crash in dev builds.

2. **Always install with `npx expo install`** (not `npm install`). This command picks the version that's compatible with your current Expo SDK — like a librarian who knows which edition fits your shelf.

3. **After adding/removing a native package**, rebuild both `development` and `preview` profiles so you and your testers are on the same version.

## Build Commands

```bash
# Start a development build (your personal dev app)
eas build --profile development --platform android

# Start a preview build (beta testers' standalone app)
eas build --profile preview --platform android

# Start a production build (app store release)
eas build --profile production --platform android
```

After the build finishes, EAS gives you a download link for the APK. Install it on your device (or share the preview link with testers).

Then start your dev server to connect:
```bash
npx expo start --dev-client
```

## Beta Tester Distribution

Preview builds are distributed via **EAS internal distribution**:

1. Testers register their device at your project's EAS page
2. You run `eas build --profile preview --platform android`
3. EAS emails/links the APK to registered testers
4. Testers download and install — no dev server needed

## Troubleshooting

| Problem | Likely cause | Fix |
|---|---|---|
| `NativeModule.XXX is null` | Native package not included in current build | Rebuild with the package installed |
| App crashes on launch after `npm install` | New package has native code but you didn't rebuild | Run `eas build` for your profile |
| `npx expo start` works but app won't connect | Dev build is outdated | Rebuild `development` profile |
