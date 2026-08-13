import { StatusBar } from 'expo-status-bar';
import { ThemeProvider } from './src/theme/ThemeProvider';
import { InteractiveGame } from './src/screens/InteractiveGame';

// Phase 2 (see docs/project/REACT_NATIVE_PORT_PLAN.md): the smallest
// complete gameplay loop - a single bot game, no navigation/menu yet.
export default function App() {
  return (
    <ThemeProvider>
      <InteractiveGame />
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
