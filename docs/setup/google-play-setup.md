# Google Play Store Setup Guide

Step-by-step instructions for setting up Forever Fireflies on the Google Play Store with subscriptions.

## 1. Create Developer Account

1. Go to [Google Play Console](https://play.google.com/console)
2. Pay the one-time $25 registration fee
3. Complete identity verification (takes 1-2 days)

## 2. Create App Listing

1. In Play Console, click **Create app**
2. App name: **Forever Fireflies**
3. Default language: English
4. App type: App (not Game)
5. Free or paid: Free (subscriptions are in-app purchases)

## 3. Upload Initial Build

1. Build a signed AAB:
   ```bash
   eas build --profile production --platform android
   ```
2. Upload the AAB to **Production > Release > Create new release**
3. Note: The app doesn't need to be published yet — just uploaded so you can create subscription products

## 4. Create Subscription Products

1. Go to **Monetization > Products > Subscriptions**
2. Create subscription group (if needed)

### Monthly Plan
- Product ID: `ff_monthly`
- Name: Forever Fireflies Monthly
- Price: $5.99/month
- Free trial: 7 days
- Grace period: 3 days (recommended)

### Annual Plan
- Product ID: `ff_annual`
- Name: Forever Fireflies Annual
- Price: $49.99/year
- Free trial: 7 days
- Grace period: 7 days (recommended)

## 5. Create Service Account (for RevenueCat)

RevenueCat needs a service account to verify purchases with Google:

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Select the project linked to your Play Console
3. Go to **IAM & Admin > Service Accounts**
4. Click **Create Service Account**
5. Name: `revenuecat-integration`
6. Grant the **Finance** role
7. Create a JSON key and download it
8. Upload this JSON key to RevenueCat under your Google Play platform settings

## 6. Add License Testers

License testers can make test purchases without being charged:

1. Go to **Play Console > Settings > License Testing**
2. Add Gmail addresses of your test devices
3. These testers will see "(test)" next to subscription prices

## 7. Configure Package Name

The app must use `com.foreverfireflies.app` as the package name. This is set in:
- `app.json` → `android.package`

If you previously used a different package name, you need a new keystore and fresh APK install.
