// react-native-safe-area-context requires native modules that aren't
// available under Jest; its own package ships a mock for exactly this
// purpose (see https://github.com/th3rdwave/react-native-safe-area-context#testing).
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);

// expo-audio's AudioPlayer class extends a native SharedObject base that
// only exists once the real native module is linked - importing it as-is
// under Jest (no native binding available) throws at class-definition
// time, before any test even gets a chance to mock a specific call.
// src/utils/sound.ts is imported transitively by most game screens/
// components now, so this needs to be a blanket mock here rather than
// something each individual test file opts into.
jest.mock('expo-audio', () => ({
  createAudioPlayer: jest.fn(() => ({
    play: jest.fn(),
    pause: jest.fn(),
    seekTo: jest.fn().mockResolvedValue(undefined),
    remove: jest.fn()
  })),
  setAudioModeAsync: jest.fn().mockResolvedValue(undefined)
}));
