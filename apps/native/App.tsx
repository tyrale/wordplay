import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import { getScoreForMove } from '@wordplay/engine/scoring';

// Phase 0 smoke test: this calls into the shared, platform-agnostic
// @wordplay/engine package (the same one apps/web uses) with zero adapters
// or I/O, to confirm Metro can resolve and bundle it inside the Expo app.
// CAT -> CATS is a single letter add, so this should score 1.
const smokeTestScore = getScoreForMove('CAT', 'CATS', []);

export default function App() {
  return (
    <View style={styles.container}>
      <Text>WordPlay native - Phase 0 scaffold</Text>
      <Text>
        @wordplay/engine smoke test (CAT -&gt; CATS score): {smokeTestScore}
      </Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
