// Runs the SAME React Native app in a browser via react-native-web.
//
// Screens are untouched: the native-only bits (camera, file picker, TTS,
// connectivity) sit behind media.ts / net.ts / tts.ts, and the `.web.ts` variants
// are picked up by the resolve.extensions order below.
//
//   npm run web    ->  http://localhost:5174

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react({ jsxRuntime: 'automatic' })],

  define: {
    global: 'window',
    __DEV__: 'true',
    'process.env.NODE_ENV': JSON.stringify('development'),
  },

  resolve: {
    alias: [
      { find: /^react-native$/, replacement: 'react-native-web' },
      // Native-only modules that have no web build. Screens no longer import these
      // directly (they go through media.ts / net.ts), but the transitive graph
      // still touches them, so point them at a harmless stub.
      { find: /^react-native-image-picker$/, replacement: '/src/web/stub.ts' },
      { find: /^@react-native-documents\/picker$/, replacement: '/src/web/stub.ts' },
      { find: /^react-native-tts$/, replacement: '/src/web/stub.ts' },
      { find: /^@react-native-community\/netinfo$/, replacement: '/src/web/stub.ts' },
      { find: /^@notifee\/react-native$/, replacement: '/src/web/stub.ts' },
      { find: /^@react-native-firebase\/app$/, replacement: '/src/web/stub.ts' },
      { find: /^@react-native-firebase\/messaging$/, replacement: '/src/web/stub.ts' },
    ],
    // .web.* wins over the native file, which is how media.web.ts / net.web.ts /
    // tts.web.ts get selected without any change to the screens that import them.
    extensions: ['.web.tsx', '.web.ts', '.web.js', '.tsx', '.ts', '.jsx', '.js', '.json'],

    // Without this, Vite hands out TWO copies of @react-navigation/core — one
    // pre-bundled for the packages it optimised, one from source. The navigators
    // then live in different React contexts: the tab bar rendered fine, but every
    // tab press dispatched into the copy that no NavigationContainer was listening
    // to, so the screen never changed and nothing errored.
    dedupe: [
      'react',
      'react-dom',
      'react-native-web',
      '@react-navigation/core',
      '@react-navigation/routers',
      '@react-navigation/native',
      '@react-navigation/native-stack',
      '@react-navigation/bottom-tabs',
      '@react-navigation/elements',
      'use-latest-callback',
      'nanoid',
    ],
  },

  optimizeDeps: {
    // React Navigation and friends ship untranspiled Flow/JSX in .js files.
    esbuildOptions: { loader: { '.js': 'jsx' }, resolveExtensions: ['.web.js', '.js', '.ts', '.tsx'] },
    include: ['react-native-web'],
  },

  server: {
    port: 5174,
    proxy: {
      '/api': { target: 'http://localhost:5000', changeOrigin: true },
      '/uploads': { target: 'http://localhost:5000', changeOrigin: true },
      // ws:true is required for the Socket.io upgrade to pass through.
      '/socket.io': { target: 'http://localhost:5000', ws: true },
    },
  },
});
