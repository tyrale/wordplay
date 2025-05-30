// Jest setup for React 19 and Expo SDK 53 with New Architecture

// Mock console.warn to reduce noise in tests
global.console = {
  ...console,
  warn: jest.fn(),
};

// Mock zustand
jest.mock('zustand');

// Mock react-native
jest.mock('react-native', () => ({
  Platform: { OS: 'web' },
  Dimensions: {
    get: jest.fn().mockReturnValue({ width: 375, height: 667 }),
  },
  Text: 'Text',
  View: 'View',
  ScrollView: 'ScrollView',
  TouchableOpacity: 'TouchableOpacity',
  StyleSheet: {
    create: jest.fn().mockReturnValue({}),
  },
  Alert: {
    alert: jest.fn(),
  },
}));

// Mock React Native Gesture Handler
jest.mock('react-native-gesture-handler', () => {
  const View = jest.requireActual('react-native').View;
  return {
    Swipe: {
      DIRECTION_LEFT: 1,
      DIRECTION_RIGHT: 2,
      DIRECTION_UP: 4,
      DIRECTION_DOWN: 8,
    },
    State: {
      BEGAN: 'BEGAN',
      FAILED: 'FAILED',
      CANCELLED: 'CANCELLED',
      END: 'END',
    },
    PanGestureHandler: View,
    PinchGestureHandler: View,
    TapGestureHandler: View,
    LongPressGestureHandler: View,
    NativeViewGestureHandler: View,
    createNativeWrapper: jest.fn(),
    GestureHandlerRootView: View,
  };
});

// Mock React Native Reanimated v3 for New Architecture
jest.mock('react-native-reanimated', () => {
  const View = require('react-native').View;
  return {
    default: {
      View: View,
      Text: require('react-native').Text,
      ScrollView: require('react-native').ScrollView,
    },
    useSharedValue: () => ({ value: 0 }),
    useAnimatedStyle: () => ({}),
    withSpring: (value) => value,
    withTiming: (value) => value,
    runOnJS: (fn) => fn,
    interpolateColor: () => '#000000',
    Extrapolate: {
      CLAMP: 'clamp',
      EXTEND: 'extend', 
      IDENTITY: 'identity',
    },
  };
});

// Mock bad-words with proper named export
jest.mock('bad-words', () => {
  // Create a mock Filter class
  class MockFilter {
    constructor() {}
    isProfane(text) { return false; }
    clean(text) { return text; }
    addWords(words) {}
    removeWords(words) {}
  }
  
  return {
    Filter: MockFilter,
    default: MockFilter,
  };
});

// Setup for React 19 testing environment
global.IS_REACT_ACT_ENVIRONMENT = true;

module.exports = {}; 