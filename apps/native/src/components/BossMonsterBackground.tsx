/**
 * Gigaboss old-school boss reveal - direct port of apps/web's
 * `.boss-monster-bg` CSS/SVG effect (see InteractiveGame.css) using
 * `Animated` + `react-native-svg` instead of CSS keyframes, since RN has
 * neither. The background stays black (the gigaboss theme's own bg), but
 * a "lightning strike" periodically flashes a gray layer behind a flat 2D
 * boss silhouette. The silhouette is solid black (same as the bg), so
 * it's invisible in the dark and only appears when the flash lights the
 * background - exactly like a lightning strike revealing a monster. Two
 * faint red glowing eyes are always dimly visible so something feels
 * present even without a flash, and brighten slightly on their own slow
 * flicker loop.
 *
 * Rendered behind the board during an actual gigaboss battle
 * (InteractiveGame.tsx, keyed off the active theme name) and behind the
 * advance alert leading into it (BossBattleScreen.tsx) - same component,
 * same silhouette, both matching web's `.boss-monster-bg`/
 * `.boss-monster-bg--app` variants exactly.
 */
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

// Same single-path silhouette (horns, head, hunched shoulders, body) and
// eye cutouts as web's boss-monster-bg__body/__eyes paths - kept pixel-
// identical so both platforms show the same monster.
const BODY_PATH =
  'M 30 38 L 64 96 L 80 100 Q 120 74 160 100 L 176 96 L 210 38 L 197 112 L 224 140 L 207 154 L 216 200 L 199 236 L 189 300 L 51 300 L 41 236 L 24 200 L 33 154 L 16 140 L 43 112 Z';
const EYES_PATH = 'M 92 112 L 108 120 L 92 128 Z M 148 112 L 132 120 L 148 128 Z';

// Matches web's `@keyframes boss-lightning` exactly: a long dark gap, then
// a quick strobe of gray flickers near the end of each 7s loop.
const LIGHTNING_DURATION_MS = 7000;
const LIGHTNING_INPUT_RANGE = [0, 0.9, 0.91, 0.92, 0.93, 0.94, 0.95, 0.96, 0.97, 0.98, 1];
const LIGHTNING_OUTPUT_RANGE = [0, 0, 0.9, 0.05, 0.75, 0, 0.6, 0.1, 0.45, 0, 0];

// Matches web's `@keyframes boss-eyes-flicker`: a slow 3.2s ease-in-out
// pulse between two faint red opacities.
const EYES_HALF_CYCLE_MS = 1600;
const EYES_MIN_OPACITY = 0.35;
const EYES_MAX_OPACITY = 0.6;

export const BossMonsterBackground: React.FC = () => {
  const lightningAnim = useRef(new Animated.Value(0)).current;
  const eyesAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const lightningLoop = Animated.loop(
      Animated.timing(lightningAnim, {
        toValue: 1,
        duration: LIGHTNING_DURATION_MS,
        easing: Easing.linear,
        useNativeDriver: true
      })
    );
    const eyesLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(eyesAnim, {
          toValue: 1,
          duration: EYES_HALF_CYCLE_MS,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true
        }),
        Animated.timing(eyesAnim, {
          toValue: 0,
          duration: EYES_HALF_CYCLE_MS,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true
        })
      ])
    );
    lightningLoop.start();
    eyesLoop.start();

    return () => {
      lightningLoop.stop();
      eyesLoop.stop();
    };
  }, [lightningAnim, eyesAnim]);

  const lightningOpacity = lightningAnim.interpolate({
    inputRange: LIGHTNING_INPUT_RANGE,
    outputRange: LIGHTNING_OUTPUT_RANGE
  });
  const eyesOpacity = eyesAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [EYES_MIN_OPACITY, EYES_MAX_OPACITY]
  });

  return (
    <View style={styles.container} pointerEvents="none">
      <Animated.View style={[styles.lightning, { opacity: lightningOpacity }]} />
      <View style={styles.silhouetteWrap}>
        <Svg width="100%" height="100%" viewBox="0 0 240 300" preserveAspectRatio="xMidYMax meet">
          <Path d={BODY_PATH} fill="#000000" />
        </Svg>
        {/* Eyes: rendered as their own layer on top of the body so their
            opacity can flicker independently of the (always-solid-black)
            body silhouette. */}
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: eyesOpacity }]}>
          <Svg width="100%" height="100%" viewBox="0 0 240 300" preserveAspectRatio="xMidYMax meet">
            <Path d={EYES_PATH} fill="#b91c1c" />
          </Svg>
        </Animated.View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden'
  },
  lightning: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#6b6b78'
  },
  silhouetteWrap: {
    width: '75%',
    maxWidth: 520,
    height: '78%'
  }
});
