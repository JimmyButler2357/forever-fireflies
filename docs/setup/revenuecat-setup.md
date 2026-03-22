# RevenueCat Setup Guide

Step-by-step instructions for connecting Forever Fireflies to RevenueCat for subscription management.

## 1. Create Account

1. Go to [app.revenuecat.com](https://app.revenuecat.com) and sign up
2. Create a new project called **Forever Fireflies**

## 2. Add Platforms

### Google Play Store
- Platform: Google Play Store
- Package name: `com.foreverfireflies.app`

### Apple App Store
- Platform: Apple App Store
- Bundle ID: `com.foreverfireflies.app`

## 3. Create Entitlement

1. Go to **Project Settings > Entitlements**
2. Create an entitlement named `premium`
   - This is what the app checks to determine if the user has paid access
   - Both monthly and annual products will unlock this same entitlement

## 4. Create Products

### Monthly
- Product ID: `ff_monthly`
- Price: $5.99/month
- Free trial: 7 days

### Annual
- Product ID: `ff_annual`
- Price: $49.99/year
- Free trial: 7 days

## 5. Create Offering

1. Go to **Products > Offerings**
2. Create an offering called `default`
3. Add both packages:
   - Monthly package → `ff_monthly`
   - Annual package → `ff_annual`

## 6. Get API Key

1. Go to **Project Settings > API Keys**
2. Copy the **Public API Key** (starts with `appl_` for iOS or `goog_` for Android)
3. Add to `.env.local`:
   ```
   EXPO_PUBLIC_REVENUECAT_API_KEY=your_key_here
   ```

## 7. Link Store Accounts

### Google Play
- Requires a **Service Account JSON key** from Google Cloud Console
- See [google-play-setup.md](./google-play-setup.md) for details

### Apple App Store
- Requires a **Shared Secret** from App Store Connect
- See [apple-setup.md](./apple-setup.md) for details

## Testing

- Use RevenueCat's **Sandbox** mode for testing purchases
- Add test emails to your store's license testing settings
- RevenueCat dashboard shows real-time purchase events under **Customers**
