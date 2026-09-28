import type { CapacitorConfig } from '@capacitor/cli';

/**
 * The iOS and Android apps wrap the same build as the website (`npm run build` → dist/).
 * `npm run app:sync` copies dist/ into ios/ and android/; open them with
 * `npx cap open ios` (Xcode, needs a Mac) or `npx cap open android` (Android Studio).
 * See docs/APP-STORE.md.
 */
const config: CapacitorConfig = {
  appId: 'is.midatorg.app',
  appName: 'Miðatorg',
  webDir: 'dist',
  server: {
    // https://localhost on Android so cookies/storage behave like the website
    androidScheme: 'https',
  },
  ios: {
    contentInset: 'automatic',
    scheme: 'Miðatorg',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      backgroundColor: '#FFFFFF',
      showSpinner: false,
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;
