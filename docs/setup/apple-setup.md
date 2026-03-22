# Apple App Store Setup Guide

Step-by-step instructions for setting up Forever Fireflies on the Apple App Store with subscriptions.

## 1. Enroll in Apple Developer Program

1. Go to [developer.apple.com](https://developer.apple.com)
2. Click **Account > Enroll**
3. Pay the $99/year fee
4. Wait for approval (24-48 hours typically)

## 2. Create App ID

1. Go to [Certificates, Identifiers & Profiles](https://developer.apple.com/account/resources)
2. Click **Identifiers > + (new)**
3. Select **App IDs** > **App**
4. Bundle ID: `com.foreverfireflies.app` (Explicit)
5. Enable capabilities: In-App Purchase (enabled by default)

## 3. Create App in App Store Connect

1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Click **My Apps > + (new app)**
3. Platform: iOS
4. Name: Forever Fireflies
5. Bundle ID: Select `com.foreverfireflies.app`
6. SKU: `forever-fireflies`

## 4. Create Subscription Products

1. In your app, go to **Monetization > Subscriptions**
2. Create a subscription group: **Forever Fireflies Premium**

### Monthly Plan
- Reference Name: Monthly
- Product ID: `ff_monthly`
- Subscription Duration: 1 Month
- Price: $5.99
- Free Trial: 7 days (set in Introductory Offers)

### Annual Plan
- Reference Name: Annual
- Product ID: `ff_annual`
- Subscription Duration: 1 Year
- Price: $49.99
- Free Trial: 7 days (set in Introductory Offers)

## 5. Set Up Sandbox Testers

Sandbox testers can make test purchases without real charges:

1. Go to **App Store Connect > Users and Access > Sandbox > Testers**
2. Click **+ (add tester)**
3. Create a new Apple ID specifically for testing (use a real email you control)
4. On your test device: Settings > App Store > Sandbox Account > sign in with the test Apple ID

## 6. Get Shared Secret (for RevenueCat)

RevenueCat needs the shared secret to validate receipts:

1. In App Store Connect, go to your app
2. Navigate to **In-App Purchases > App-Specific Shared Secret**
3. Click **Generate** if none exists
4. Copy the shared secret
5. Paste it into RevenueCat under your Apple platform settings

## 7. Configure Bundle ID

The app must use `com.foreverfireflies.app` as the bundle ID. This is set in:
- `app.json` → `ios.bundleIdentifier`

The bundle ID must match exactly what's registered in the Apple Developer portal.
