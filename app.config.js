const IS_DEV = process.env.APP_VARIANT === "development";

const config = require("./app.json").expo;

if (IS_DEV) {
  config.name = "FF Dev";
  config.android.package = "com.foreverfireflies.app.dev";
  config.ios.bundleIdentifier = "com.foreverfireflies.app.dev";
  // Dev build doesn't have this package registered in Firebase,
  // so skip google-services.json to avoid Gradle build failure
  delete config.android.googleServicesFile;
}

module.exports = () => ({ expo: config });
