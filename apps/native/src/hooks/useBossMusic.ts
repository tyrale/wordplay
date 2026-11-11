/**
 * Boss Battle Music - Native
 *
 * Mirrors apps/web's `hooks/useBossMusic.ts` public API exactly
 * (`useBossMusic({ enabled, stage })`) so call sites read the same way -
 * only the underlying implementation differs. Web synthesizes the motif on
 * the fly with the Web Audio API; expo-audio has no equivalent "generate a
 * tone from an oscillator at call time" API (it only plays pre-existing
 * audio sources), so each stage's one-loop-iteration motif is instead
 * pre-rendered once to a WAV file (see
 * scripts/generate-native-boss-music-assets.cjs, which renders the exact
 * same notes/durations/waveforms/octave-doubling/lowpass cutoff as web's
 * `MOTIF_NOTES`/`NOTE_DURATIONS`/etc.) and looped back here.
 *
 * One player per stage is created lazily and reused, matching the pattern
 * in ../utils/sound.ts. Stage changes swap which player is playing (pause
 * the old one, seek+play the new one) rather than tearing everything down,
 * so escalating from boss -> mega -> giga is instant.
 */
import { useEffect, useRef } from 'react';
import { createAudioPlayer } from 'expo-audio';
import type { AudioPlayer } from 'expo-audio';
import type { BossStage } from '../data/bossBattle';

export interface UseBossMusicOptions {
  /** Start/stop the music. Only true during an active boss battle encounter. */
  enabled: boolean;
  /** Current boss stage (used to escalate intensity). null when disabled. */
  stage: BossStage | null;
}

// Metro resolves each require() to a numeric asset id at bundle time - these
// must stay static (no dynamic path construction) for that to work.
const BOSS_MUSIC_ASSETS: Record<BossStage, number> = {
  boss: require('../../assets/sounds/boss-music-boss.wav'),
  mega: require('../../assets/sounds/boss-music-mega.wav'),
  giga: require('../../assets/sounds/boss-music-giga.wav')
};

const players = new Map<BossStage, AudioPlayer>();

function getPlayer(stage: BossStage): AudioPlayer {
  let player = players.get(stage);
  if (!player) {
    player = createAudioPlayer(BOSS_MUSIC_ASSETS[stage]);
    player.loop = true;
    players.set(stage, player);
  }
  return player;
}

/**
 * React hook that starts/stops the boss battle music. The music only plays
 * while `enabled` is true; toggling it off (or unmounting) cleanly pauses
 * whichever stage's player is active. Switching `stage` while enabled
 * escalates to the next stage's loop.
 */
export function useBossMusic({ enabled, stage }: UseBossMusicOptions): void {
  const activeStageRef = useRef<BossStage | null>(null);

  useEffect(() => {
    if (!enabled || !stage) {
      if (activeStageRef.current) {
        try {
          getPlayer(activeStageRef.current).pause();
        } catch {
          // Fail silently - music is a non-critical enhancement, matching web.
        }
        activeStageRef.current = null;
      }
      return;
    }

    try {
      const player = getPlayer(stage);
      player.seekTo(0).catch(() => {});
      player.play();
    } catch {
      // Fail silently.
    }
    activeStageRef.current = stage;

    return () => {
      if (activeStageRef.current) {
        try {
          getPlayer(activeStageRef.current).pause();
        } catch {
          // Fail silently.
        }
        activeStageRef.current = null;
      }
    };
  }, [enabled, stage]);
}
