/**
 * Drunk mode - unlocked via the "drunk" word, toggled on in the Menu's
 * mechanics section. Applies everywhere in the app (Menu included, not
 * just the three game screens), matching web's actual behavior: web
 * applies its `.interactive-game--drunk` wobble/blur class inside each
 * game screen, but since native mounts exactly one screen at a time and
 * the Menu renders as a `Modal` (a separate native layer, not a child of
 * whatever screen opened it), per-screen wiring left the Menu and the
 * home screen unaffected - wiring it once here, wrapping the whole
 * `AppNavigator` tree in App.tsx, covers everything with a single
 * source of truth instead of three (now removed) per-screen copies.
 *
 * Web's effect is a CSS `rotate`/`scale`/`translate` wobble animation
 * plus a `blur`/`saturate` filter. This ports both halves natively:
 * the wobble via core `Animated` (already a dependency), and the blur
 * via `expo-blur`'s `BlurView` (a new, official Expo dependency - no
 * native CSS filter equivalent exists otherwise). `pointerEvents="none"`
 * on the BlurView is required - without it, the blur overlay (rendered
 * on top of everything, app-wide) would swallow every touch in the app.
 */
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { useUnlockSystem } from '../providers/UnlockProvider';
import { useMechanicsSettings } from '../contexts/MechanicsSettingsContext';

// A full wobble cycle takes this long - slower/dreamier than web's 6s
// original, per direct request to make the motion read as more woozy
// rather than jittery.
const WOBBLE_DURATION_MS = 12000;

interface DrunkModeOverlayProps {
  children: React.ReactNode;
}

export const DrunkModeOverlay: React.FC<DrunkModeOverlayProps> = ({ children }) => {
  const { getUnlockedItems } = useUnlockSystem();
  const { isMechanicOn } = useMechanicsSettings();
  const isDrunkOn = getUnlockedItems('mechanic').includes('drunk') && isMechanicOn('drunk');

  const drunkAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!isDrunkOn) {
      drunkAnim.stopAnimation();
      drunkAnim.setValue(0);
      return;
    }

    const loop = Animated.loop(
      Animated.timing(drunkAnim, {
        toValue: 1,
        duration: WOBBLE_DURATION_MS,
        easing: Easing.inOut(Easing.sin),
        useNativeDriver: true
      })
    );
    loop.start();

    return () => loop.stop();
  }, [isDrunkOn, drunkAnim]);

  const wobbleStyle = {
    transform: [
      {
        rotate: drunkAnim.interpolate({
          inputRange: [0, 0.15, 0.3, 0.45, 0.6, 0.75, 0.9, 1],
          outputRange: ['0deg', '1.5deg', '-1.8deg', '1.2deg', '-0.9deg', '2deg', '-1.2deg', '0deg']
        })
      },
      {
        scale: drunkAnim.interpolate({
          inputRange: [0, 0.15, 0.3, 0.45, 0.6, 0.75, 0.9, 1],
          outputRange: [1, 1.025, 0.985, 1.02, 1, 0.99, 1.01, 1]
        })
      }
    ]
  };

  // The blur "breathes" along with the wobble instead of sitting at a
  // constant intensity. `BlurView`'s `intensity` is a plain number
  // (0-100), not an Animated-drivable style prop, so this can't reuse
  // `useNativeDriver: true` the way the transform does - a second,
  // JS-driven listener keeps a plain number in sync instead.
  //
  // One full `sin` hump per wobble loop (rather than two) means the
  // intensity eases all the way down to 0 - genuinely clear, not just
  // "less blurry" - once per cycle before building back up to the haziest
  // point at the loop's midpoint, per direct request that it should
  // actually go from clear to blurred instead of oscillating between two
  // blurred states.
  const [blurIntensity, setBlurIntensity] = React.useState(0);
  useEffect(() => {
    if (!isDrunkOn) {
      setBlurIntensity(0);
      return;
    }
    const id = drunkAnim.addListener(({ value }) => {
      setBlurIntensity(Math.sin(value * Math.PI) * 45);
    });
    return () => drunkAnim.removeListener(id);
  }, [isDrunkOn, drunkAnim]);

  if (!isDrunkOn) {
    return <>{children}</>;
  }

  return (
    <Animated.View style={[styles.fill, wobbleStyle]}>
      {children}
      <BlurView
        intensity={blurIntensity}
        tint="default"
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  fill: {
    flex: 1
  }
});
