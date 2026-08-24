/**
 * Native Tutorial Overlay - the presentational half of apps/web's
 * `components/tutorial/TutorialOverlay.tsx` (progress dots + instruction
 * banner + skip button). The state-tracking logic that component
 * combined with its rendering lives separately in
 * `hooks/useTutorialProgress.ts` here - see that file's doc comment for
 * why (no DOM to poll, `pendingWord` is passed in directly instead).
 *
 * Rendered as a banner pinned near the top of the screen, on top of
 * InteractiveGame's board - not a full-screen overlay like
 * AlertOverlay/DictionariesOverlay/StatsOverlay, since the player needs
 * to keep interacting with the actual grid underneath while this shows.
 */
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme, getEffectiveColors } from '../theme/ThemeProvider';
import { TUTORIAL_STEPS } from '../hooks/tutorialSteps';

export interface TutorialOverlayProps {
  currentStepIndex: number;
  banner: string[];
  onSkip: () => void;
}

export const TutorialOverlay: React.FC<TutorialOverlayProps> = ({ currentStepIndex, banner, onSkip }) => {
  const { currentTheme, isInverted } = useTheme();
  const colors = getEffectiveColors(currentTheme, isInverted);

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]} pointerEvents="box-none">
      <View style={styles.progress}>
        {TUTORIAL_STEPS.map((step, index) => (
          <View
            key={step.id}
            style={[
              styles.dot,
              { backgroundColor: index <= currentStepIndex ? colors.accent : colors.disabled }
            ]}
          />
        ))}
      </View>

      <View style={styles.lines}>
        {banner.map((line, index) => (
          <Text key={index} style={[styles.line, { color: colors.text }]}>
            {line}
          </Text>
        ))}
      </View>

      <Pressable onPress={onSkip} accessibilityRole="button" accessibilityLabel="Skip tutorial">
        <Text style={[styles.skip, { color: colors.textSecondary }]}>Skip tutorial</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
    gap: 8,
    zIndex: 500
  },
  progress: {
    flexDirection: 'row',
    gap: 6
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4
  },
  lines: {
    alignItems: 'center'
  },
  line: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center'
  },
  skip: {
    fontSize: 13,
    textDecorationLine: 'underline'
  }
});
