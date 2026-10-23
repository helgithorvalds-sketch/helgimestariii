import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Native shell for the VILD app. Build the web bundle first:
 *   npm run build:vild && npx cap sync
 * See docs/vild/NATIVE.md for the full App Store / Play Store checklist.
 */
const config: CapacitorConfig = {
  appId: 'is.vild.app',
  appName: 'VILD',
  webDir: 'dist-vild',
  backgroundColor: '#ffffff',
  ios: {
    contentInset: 'never',
    scheme: 'VILD',
    limitsNavigationsToAppBoundDomains: false,
  },
  android: {
    allowMixedContent: false,
  },
  server: {
    androidScheme: 'https',
    iosScheme: 'capacitor',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
      backgroundColor: '#B4FF9B',
      showSpinner: false,
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true,
    },
  },
};

export default config;
