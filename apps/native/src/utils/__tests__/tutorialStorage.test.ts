import AsyncStorage from '@react-native-async-storage/async-storage';
import { hasSeenTutorial, markTutorialSeen } from '../tutorialStorage';

describe('native tutorialStorage', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('defaults to not having seen the tutorial', async () => {
    expect(await hasSeenTutorial()).toBe(false);
  });

  it('persists the seen flag across calls', async () => {
    await markTutorialSeen();
    expect(await hasSeenTutorial()).toBe(true);
  });
});
