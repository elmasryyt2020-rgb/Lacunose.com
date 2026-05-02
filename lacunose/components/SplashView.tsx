import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';

/**
 * Custom branded splash screen that matches the Lacunose identity.
 *
 * Shows "•Lacunose" with "Find your gap." tagline on a cream background,
 * then fades out once fonts/auth are ready.
 *
 * The parent must call `onReady` when the app is ready to display; SplashView
 * will animate out over 400ms and then call `onFinished` to unmount itself.
 */

interface SplashViewProps {
  /** Set to true when the app is ready to show underneath. */
  isReady: boolean;
  /** Called after the fade-out animation completes so the parent can unmount this view. */
  onFinished: () => void;
}

export function SplashView({ isReady, onFinished }: SplashViewProps) {
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!isReady) return;

    // Small delay so the content behind has time to render a frame
    const timer = setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) onFinished();
      });
    }, 300);

    return () => clearTimeout(timer);
  }, [isReady]);

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]} pointerEvents="none">
      <View style={styles.content}>
        {/* •Lacunose */}
        <View style={styles.titleRow}>
          <Text style={styles.dot}>•</Text>
          <Text style={styles.title}>Lacunose</Text>
        </View>

        {/* Find your gap. */}
        <Text style={styles.tagline}>Find your gap.</Text>
      </View>
    </Animated.View>
  );
}

const BG = '#F1EEE8';
const INK = '#0E0E0C';
const INK_SOFT = '#4A4742';
const DOT_COLOR = '#A08060'; // warm brownish dot from the reference image

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: BG,
    zIndex: 9999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 4,
  },
  dot: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 52,
    color: DOT_COLOR,
    marginRight: 2,
    // Shift the dot down slightly so it sits beside the "L" baseline
    marginTop: 6,
  },
  title: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 52,
    color: INK,
    letterSpacing: -1,
    // Subtle text shadow for that printed-press feel
    textShadowColor: 'rgba(14,14,12,0.25)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 0.4,
  },
  tagline: {
    fontFamily: 'InstrumentSerif_400Regular_Italic',
    fontSize: 24,
    color: INK_SOFT,
    marginTop: 2,
    letterSpacing: 0.2,
  },
});
