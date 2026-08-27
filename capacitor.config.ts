import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.alaniselin.numisma.test',
  appName: 'INUMIS Test',
  webDir: 'dist-ios',
  server: {
    iosScheme: 'https',
  },
  plugins: {
    FirebaseAuthentication: {
      skipNativeAuth: true,
      providers: ['google.com'],
    },
  },
  experimental: {
    ios: {
      spm: {
        packageOptions: {
          '@capacitor-firebase/authentication': {
            symlink: true,
          },
        },
      },
    },
  },
};

export default config;
