// Bundles the Mukta font files into the APK.
//
// Run `npx react-native-asset` after changing this, which copies the TTFs into
// android/app/src/main/assets/fonts. Without that step the app asks Android for
// "Mukta", Android does not have it, and every screen silently falls back to
// Roboto — the type looks fine in the browser and wrong on the phone.
module.exports = {
  project: {
    android: {},
    ios: {},
  },
  assets: ['./src/assets/fonts'],
};
