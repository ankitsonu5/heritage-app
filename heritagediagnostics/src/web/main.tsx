// Web entry point. Mounts the same HeritageApp the device build uses.
import { AppRegistry } from 'react-native';
import { enableScreens } from 'react-native-screens';

// react-native-screens drives the native screen containers on a device, but on the
// web its container swallowed the bottom tab bar's presses and failed to show the
// screen that had actually been selected — the tab highlighted, the content did
// not. The DOM does not need native screen containers; turn them off here only.
enableScreens(false);

// Self-hosted fonts (no CDN). theme.tsx references these families by name.
import '@fontsource/mukta/400.css';
import '@fontsource/mukta/500.css';
import '@fontsource/mukta/600.css';
import '@fontsource/mukta/700.css';
import '@fontsource/mukta/800.css';
import '@fontsource/noto-sans-devanagari/400.css';
import '@fontsource/noto-sans-devanagari/500.css';
import '@fontsource/noto-sans-devanagari/600.css';
import '@fontsource/noto-sans-devanagari/700.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';

import HeritageApp from '../HeritageApp';

AppRegistry.registerComponent('heritagediagnostics', () => HeritageApp);
AppRegistry.runApplication('heritagediagnostics', {
  rootTag: document.getElementById('root'),
});
