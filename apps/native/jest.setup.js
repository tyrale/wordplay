// react-native-safe-area-context requires native modules that aren't
// available under Jest; its own package ships a mock for exactly this
// purpose (see https://github.com/th3rdwave/react-native-safe-area-context#testing).
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
