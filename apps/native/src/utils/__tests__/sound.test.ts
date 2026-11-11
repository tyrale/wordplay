import * as Audio from 'expo-audio';
import { triggerSoundFeedback, setSoundEnabled, isSoundEnabled } from '../sound';

describe('native triggerSoundFeedback', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setSoundEnabled(true);
  });

  it('is enabled by default', () => {
    expect(isSoundEnabled()).toBe(true);
  });

  it('creates and plays a player for a pattern, reusing it on repeat calls', () => {
    triggerSoundFeedback('add');
    triggerSoundFeedback('add');

    // One player created and cached per pattern - not recreated on every call.
    expect(Audio.createAudioPlayer).toHaveBeenCalledTimes(1);
    const player = (Audio.createAudioPlayer as jest.Mock).mock.results[0].value;
    expect(player.seekTo).toHaveBeenCalledTimes(2);
    expect(player.play).toHaveBeenCalledTimes(2);
  });

  it('creates separate players for different patterns', () => {
    triggerSoundFeedback('submit');
    triggerSoundFeedback('remove');

    expect(Audio.createAudioPlayer).toHaveBeenCalledTimes(2);
  });

  it('does nothing while disabled', () => {
    setSoundEnabled(false);
    triggerSoundFeedback('win');
    expect(Audio.createAudioPlayer).not.toHaveBeenCalled();
  });

  it('never throws even if the player rejects', () => {
    (Audio.createAudioPlayer as jest.Mock).mockImplementationOnce(() => {
      throw new Error('unsupported device');
    });
    expect(() => triggerSoundFeedback('lose')).not.toThrow();
  });
});
