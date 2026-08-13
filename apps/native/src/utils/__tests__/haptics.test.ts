import * as Haptics from 'expo-haptics';
import { triggerHapticFeedback } from '../haptics';

jest.mock('expo-haptics', () => ({
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
  impactAsync: jest.fn().mockResolvedValue(undefined),
  notificationAsync: jest.fn().mockResolvedValue(undefined),
  selectionAsync: jest.fn().mockResolvedValue(undefined)
}));

describe('native triggerHapticFeedback', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('maps "submit" to a medium impact', async () => {
    await triggerHapticFeedback('submit');
    expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Medium);
  });

  it('maps "win"/"unlock" to a success notification', async () => {
    await triggerHapticFeedback('win');
    expect(Haptics.notificationAsync).toHaveBeenCalledWith(Haptics.NotificationFeedbackType.Success);

    jest.clearAllMocks();

    await triggerHapticFeedback('unlock');
    expect(Haptics.notificationAsync).toHaveBeenCalledWith(Haptics.NotificationFeedbackType.Success);
  });

  it('maps "lose" to an error notification', async () => {
    await triggerHapticFeedback('lose');
    expect(Haptics.notificationAsync).toHaveBeenCalledWith(Haptics.NotificationFeedbackType.Error);
  });

  it('maps "yourTurn" to a selection change', async () => {
    await triggerHapticFeedback('yourTurn');
    expect(Haptics.selectionAsync).toHaveBeenCalled();
  });

  it('maps "move"/"pass"/"add" to a light impact', async () => {
    for (const pattern of ['move', 'pass', 'add'] as const) {
      jest.clearAllMocks();
      await triggerHapticFeedback(pattern);
      expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);
    }
  });

  it('never throws even if the native module rejects', async () => {
    (Haptics.impactAsync as jest.Mock).mockRejectedValueOnce(new Error('unsupported device'));
    await expect(triggerHapticFeedback('move')).resolves.toBeUndefined();
  });
});
