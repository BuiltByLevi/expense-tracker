// Learn more https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const repoRoot = path.resolve(projectRoot, '..');

const config = getDefaultConfig(projectRoot);

// The shared financial logic lives at <repo>/shared, outside this app's root.
// Metro only watches the project root by default, so it must be told to watch
// the repo root or every `@shared/*` import fails to resolve at bundle time.
config.watchFolders = [repoRoot];

// Search this app's own node_modules first so the mobile React/React Native
// copies win over the web app's Vite-side copies at the repo root.
//
// Hierarchical lookup stays ENABLED on purpose: several dependencies ship
// nested node_modules (react-native-reanimated bundles its own `semver`),
// and disabling it makes those nested packages unresolvable at bundle time.
config.resolver.nodeModulesPaths = [path.resolve(projectRoot, 'node_modules')];

module.exports = config;
