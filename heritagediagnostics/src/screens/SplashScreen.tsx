// Brand splash. Held for a beat on cold start (see SPLASH_MS in store/session),
// so the logo reads as a brand rather than a flicker, and so the session restore
// finishes before the user sees anything.
//
// If you want the hospital photograph behind this, drop it in as
// src/assets/hospital.jpg and swap the gradient block for an <ImageBackground>.

import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Image, Text, View } from 'react-native';

import { C, styles, T } from '../theme';
import logo from '../assets/logo.png';

export default function SplashScreen() {
  const fade = useRef(new Animated.Value(0)).current;
  const rise = useRef(new Animated.Value(18)).current;
  const scale = useRef(new Animated.Value(0.94)).current;
  const sweep = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, {
        toValue: 1, duration: 550, easing: Easing.out(Easing.cubic), useNativeDriver: true,
      }),
      Animated.timing(rise, {
        toValue: 0, duration: 550, easing: Easing.out(Easing.cubic), useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 1, duration: 650, easing: Easing.out(Easing.back(1.2)), useNativeDriver: true,
      }),
    ]).start();

    // A progress sweep, not a spinner: it says "we are getting there", which is
    // what a 3-second hold actually needs to communicate.
    Animated.loop(
      Animated.timing(sweep, {
        toValue: 1, duration: 1400, easing: Easing.inOut(Easing.ease), useNativeDriver: true,
      }),
    ).start();
  }, [fade, rise, scale, sweep]);

  const sweepX = sweep.interpolate({ inputRange: [0, 1], outputRange: [-90, 90] });

  return (
    <View style={[styles.screen, { alignItems: 'center', justifyContent: 'center', padding: 32 }]}>
      {/* A soft halo behind the mark, so the logo sits on light rather than floats. */}
      <View style={{
        position: 'absolute',
        width: 320, height: 320, borderRadius: 160,
        backgroundColor: '#FFFFFF',
        opacity: 0.55,
      }} />

      <Animated.View style={{
        opacity: fade,
        transform: [{ translateY: rise }, { scale }],
        alignItems: 'center',
      }}>
        <Image
          source={logo}
          resizeMode="contain"
          style={{ width: 250, height: 126 }}
          accessibilityLabel="Heritage Diagnostics"
        />

        <View style={{
          width: 44, height: 2, borderRadius: 1,
          backgroundColor: C.gold, marginTop: 18, marginBottom: 14,
        }} />

        <Text style={{ ...T.h2, color: C.maroon, textAlign: 'center' }}>
          Home sample collection
        </Text>
        <Text style={{ ...T.caption, color: C.gray, textAlign: 'center', marginTop: 4 }}>
          Blood · Pathology · Radiology · Varanasi
        </Text>
      </Animated.View>

      {/* Indeterminate sweep. */}
      <Animated.View style={{
        position: 'absolute', bottom: 64,
        width: 180, height: 3, borderRadius: 2,
        backgroundColor: '#EADFD0', overflow: 'hidden', opacity: fade,
      }}>
        <Animated.View style={{
          width: 70, height: 3, borderRadius: 2,
          backgroundColor: C.red,
          transform: [{ translateX: sweepX }],
        }} />
      </Animated.View>
    </View>
  );
}
