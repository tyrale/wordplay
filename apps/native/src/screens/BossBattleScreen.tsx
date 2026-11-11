/**
 * Native "GUS" Boss Battle screen - a port of the boss-battle state
 * machine that lives inside apps/web's `App.tsx` (handleBossTrigger /
 * startBossBattle / advanceBossBattle / handleBossGameEnd /
 * handleBossTimeout / handleBossResign / endBoss), restructured as its
 * own self-contained navigation screen rather than top-level app state -
 * this port uses React Navigation screens instead of web's single
 * `appState` string-union machine (see App.tsx's own doc comments for
 * the same pattern applied to Zen/Challenge). Reuses InteractiveGame for
 * each stage's actual battle (same whole-game countdown/GUS-trigger
 * support added there for this feature).
 *
 * The gigaboss visual effect (animated monster-shadow background +
 * "lightning strike" reveal, CSS/SVG-driven on web) is ported here via
 * `BossMonsterBackground` (Animated + react-native-svg), shown both
 * behind this screen's advance-to-giga alert and behind the actual giga
 * battle itself (see InteractiveGame.tsx, keyed off the active theme
 * name). The escalating boss music (see ../hooks/useBossMusic) and the
 * actual encounter mechanic (three escalating stages, whole-game
 * countdowns, strict win condition, permanent unlock on beating gigaboss,
 * retryable on loss) are fully real.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { InteractiveGame } from './InteractiveGame';
import { AlertOverlay } from '../components/AlertOverlay';
import { BossMonsterBackground } from '../components/BossMonsterBackground';
import type { AlertOverlayVariant } from '../components/AlertOverlay';
import { alertCopy } from '../content/alertCopy';
import { getBotDisplayName } from '@wordplay/engine/botRegistry';
import { BOSS_STAGES, BOSS_BATTLE_MAX_TURNS, getBossTheme, getThemeByName } from '../data/bossBattle';
import type { BossStage } from '../data/bossBattle';
import { clearActiveGame } from '../adapters/nativeGameSaveAdapter';
import { defaultTheme } from '@wordplay/theme/theme';
import { useBossMusic } from '../hooks/useBossMusic';

type BossPhase = 'intro' | 'battle' | 'advance' | 'victory' | 'defeat' | 'timeout';

export interface BossBattleScreenProps {
  /** The encounter is fully over (victory/defeat/timeout overlay closed) -
   * navigate back to the main menu. */
  onExit: () => void;
}

export const BossBattleScreen: React.FC<BossBattleScreenProps> = ({ onExit }) => {
  const { currentTheme, setTheme } = useTheme();

  // Captured once, on mount - the theme to restore on loss/resign/timeout.
  const prevThemeNameRef = React.useRef(currentTheme.name);
  const [phase, setPhase] = useState<BossPhase>('intro');
  const [stage, setStage] = useState<BossStage>('boss');
  const [battleKey, setBattleKey] = useState(0);

  // Apply the first stage's theme immediately on mount (GUS was just
  // played - the intro alert should already feel like the encounter
  // started). Runs once; the effect's own empty dependency array is
  // intentional here (this screen mounts fresh per encounter via
  // navigation, so there's no scenario where this needs to re-fire).
  useEffect(() => {
    setTheme(getBossTheme('boss'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const revertTheme = useCallback(() => {
    const prev = getThemeByName(prevThemeNameRef.current);
    setTheme(prev ?? defaultTheme);
  }, [setTheme]);

  const startBossBattle = useCallback(() => {
    setBattleKey(k => k + 1);
    setPhase('battle');
  }, []);

  // A boss battle reached BOSS_BATTLE_MAX_TURNS turns. Per the spec the
  // player must have MORE points than the boss to win - a tie counts as a
  // loss (InteractiveGame's own winner computation already treats ties as
  // null, matching this).
  const handleBossGameEnd = useCallback(
    (winner: string | null, _finalScores: { human: number; bot: number }) => {
      if (winner === 'human') {
        const next = BOSS_STAGES[stage].next;
        if (next) {
          setStage(next);
          setTheme(getBossTheme(next));
          setPhase('advance');
        } else {
          // Beat gigaboss - keep the giga theme as the reward (do NOT
          // revert). The permanent boss-bot + theme unlocks fire via
          // InteractiveGame's own handleGameCompletion call
          // (beat_giga_boss_bot achievement).
          setPhase('victory');
        }
      } else {
        revertTheme();
        setPhase('defeat');
      }
    },
    [stage, setTheme, revertTheme]
  );

  const handleBossTimeout = useCallback(() => {
    clearActiveGame().catch(err => console.warn('Failed to clear saved game on boss timeout:', err));
    revertTheme();
    setPhase('timeout');
  }, [revertTheme]);

  const handleBossResign = useCallback(() => {
    clearActiveGame().catch(err => console.warn('Failed to clear saved game on boss resign:', err));
    revertTheme();
    setPhase('defeat');
  }, [revertTheme]);

  // The '←' action button - leaves immediately with no ceremony, same as
  // a normal bot game, but also ends the whole encounter (reverts the
  // theme) rather than leaving it dangling.
  const handleNavigateHome = useCallback(() => {
    revertTheme();
    onExit();
  }, [revertTheme, onExit]);

  // Procedural boss battle music, escalating per stage (boss -> mega ->
  // giga). Plays continuously across the intro/advance overlay and the
  // battle itself (matches web's App.tsx), and stops once the encounter
  // resolves (victory/defeat/timeout).
  const bossMusicActive = phase === 'intro' || phase === 'battle' || phase === 'advance';
  useBossMusic({ enabled: bossMusicActive, stage: bossMusicActive ? stage : null });

  const stageConfig = BOSS_STAGES[stage];
  // `stage` is already the *upcoming* stage by the time `phase` is
  // 'advance' (handleBossGameEnd sets it before setPhase('advance')), so
  // this always names the boss the player is about to face next, not
  // the one they just beat.
  const introOrAdvanceCopy =
    phase === 'intro' ? alertCopy.boss.intro : alertCopy.boss.advance[stage as 'mega' | 'giga'];
  const endCopy = phase === 'victory' ? alertCopy.boss.victory : phase === 'timeout' ? alertCopy.boss.timeout : alertCopy.boss.defeat;
  const endVariant: AlertOverlayVariant | undefined = phase === 'victory' ? 'win' : phase === 'defeat' || phase === 'timeout' ? 'lose' : undefined;

  return (
    <View style={styles.container}>
      {phase !== 'intro' && (
        <InteractiveGame
          key={`${stage}-${battleKey}`}
          botId={stageConfig.botId}
          botDisplayName={getBotDisplayName(stageConfig.botId)}
          config={{
            maxTurns: BOSS_BATTLE_MAX_TURNS,
            allowBotPlayer: true,
            gameTimeLimitSeconds: stageConfig.timeLimitSeconds
          }}
          onGameEnd={handleBossGameEnd}
          onGameTimeout={handleBossTimeout}
          onResign={handleBossResign}
          onNavigateHome={handleNavigateHome}
        />
      )}

      {/* Gigaboss lightning-reveal shadow behind the advance overlay (the
          buildup to the final boss). `stage` is already 'giga' here
          (advanced before the alert shows) - matches web's App.tsx. */}
      {phase === 'advance' && stage === 'giga' && <BossMonsterBackground />}

      {(phase === 'intro' || phase === 'advance') && (
        <AlertOverlay
          isVisible
          lines={[...introOrAdvanceCopy.lines]}
          meta={introOrAdvanceCopy.meta}
          onClose={startBossBattle}
        />
      )}

      {(phase === 'victory' || phase === 'defeat' || phase === 'timeout') && (
        <AlertOverlay
          isVisible
          lines={[...endCopy.lines]}
          meta={'meta' in endCopy ? endCopy.meta : undefined}
          variant={endVariant}
          onClose={onExit}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1
  }
});
