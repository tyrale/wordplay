// Jest setup for React 19 and Expo SDK 53 with New Architecture

// Mock console.warn to reduce noise in tests
global.console = {
  ...console,
  warn: jest.fn(),
};

// Mock zustand
jest.mock('zustand');

// Mock React Native Gesture Handler for New Architecture
jest.mock('react-native-gesture-handler', () => {
  const View = require('react-native').View;
  
  return {
    GestureDetector: ({ children }) => children,
    Gesture: {
      Pan: () => ({
        onStart: () => ({}),
        onUpdate: () => ({}),
        onEnd: () => ({}),
      }),
      Tap: () => ({
        onEnd: () => ({}),
      }),
    },
    GestureHandlerRootView: View,
    State: {},
    PanGestureHandler: View,
    TapGestureHandler: View,
    LongPressGestureHandler: View,
    PinchGestureHandler: View,
    RotationGestureHandler: View,
    FlingGestureHandler: View,
    ForceTouchGestureHandler: View,
    NativeViewGestureHandler: View,
    RawButton: View,
    BaseButton: View,
    RectButton: View,
    BorderlessButton: View,
    TouchableOpacity: require('react-native').TouchableOpacity,
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

// Setup for React 19 testing environment
global.IS_REACT_ACT_ENVIRONMENT = true; 