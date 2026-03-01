const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Limit workers to prevent terminal spam on Windows
config.maxWorkers = 2;

// Fix: zustand v5's ESM build uses import.meta.env which crashes in
// non-module scripts on web. Force zustand to resolve its CJS build
// on web so the bundle doesn't contain import.meta syntax.
const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && moduleName.startsWith('zustand')) {
    // Rewrite zustand imports to their CJS entry points
    const subpath = moduleName.replace('zustand', '');
    const cjsFile = subpath ? `zustand${subpath}.js` : 'zustand/index.js';
    const resolved = path.resolve(__dirname, 'node_modules', cjsFile);
    return { type: 'sourceFile', filePath: resolved };
  }
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
