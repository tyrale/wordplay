// Simple setup for Jest testing

// Mock console.warn to reduce noise in tests
global.console = {
  ...console,
  warn: jest.fn(),
};

// Mock zustand
jest.mock('zustand');

// Mock React Native Reanimated
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
  };
});

// Only mock React Native gesture handler if it exists
try {
  require.resolve('react-native-gesture-handler');
  jest.mock('react-native-gesture-handler', () => {
    const View = require('react-native').View;
    return {
      PanGestureHandler: View,
      TapGestureHandler: View,
      State: {},
      Directions: {},
    };
  });
} catch (e) {
  // react-native-gesture-handler not installed, skip mock
}

// Setup React Native Web environment
try {
  require('react-native-web/dist/exports/StyleSheet/processColor');
} catch (e) {
  // react-native-web StyleSheet not available, skip
} 