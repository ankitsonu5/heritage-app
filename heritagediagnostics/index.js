/**
 * Device entry point (Android / iOS).
 *
 * This used Expo's registerRootComponent, which pulled the whole `expo` package
 * into the Android build. Expo's Gradle plugin is not installed in a bare React
 * Native project, so the release build died with
 * "Plugin with id 'expo-module-gradle-plugin' not found".
 *
 * The web build has its own entry (src/web/main.tsx) and never comes through
 * here, so plain AppRegistry is all this needs.
 *
 * @format
 */

import messaging from '@react-native-firebase/messaging';
import firebase from '@react-native-firebase/app';
import { AppRegistry, Platform } from 'react-native';

import App from './App';
import { name as appName } from './app.json';

// Registered here, at module scope, and NOT inside a component — when a push arrives
// with the app killed, React Native spins up a headless JS context with no component
// tree for a hook to run in. Firebase warns and drops the message if this is missing.
//
// There is deliberately nothing to do in the body: the server sends a `notification`
// block (backend/src/push.js), so Android draws the notification itself, in every
// state, without waking JS. This handler exists to satisfy the registration and to be
// the place any future background work would go.
// Android is already configured with google-services.json. iOS registers the
// handler only after a GoogleService-Info.plist has configured a default Firebase
// app; until then the testing build remains usable and simply falls back to the
// in-app notification feed.
if (Platform.OS === 'android' || firebase.apps.length > 0) {
  messaging().setBackgroundMessageHandler(async () => {});
}

AppRegistry.registerComponent(appName, () => App);
