import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.gk.fitness',
  appName: 'GK Fitness',
  webDir: 'dist',
  android: {
    backgroundColor: '#0A0C11',
  },
  plugins: {
    SplashScreen: {
      backgroundColor: '#0A0C11',
      showSpinner: false,
      launchAutoHide: true,
    },
  },
};

export default config;
