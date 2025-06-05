import { ThemeProvider, InteractiveGame, useTheme } from './components';
import ResponsiveTest from './components/game/ResponsiveTest';
import './App.css';

function ThemeSelector() {
  const { currentTheme, setTheme, availableThemes: themes } = useTheme();

  return (
    <div style={{ position: 'absolute', top: '20px', right: '20px' }}>
      <select 
        value={currentTheme.name} 
        onChange={(e) => {
          const theme = themes.find(t => t.name === e.target.value);
          if (theme) setTheme(theme);
        }}
        style={{
          fontFamily: 'var(--theme-font-family)',
          fontWeight: 'var(--theme-font-weight)',
          fontSize: 'var(--theme-font-size-sm)',
          padding: '8px',
          border: 'none',
          borderRadius: '4px',
          backgroundColor: 'var(--theme-surface)',
          color: 'var(--theme-text)',
        }}
      >
        {themes.map(theme => (
          <option key={theme.name} value={theme.name}>
            {theme.name}
          </option>
        ))}
      </select>
    </div>
  );
}

function App() {
  const handleGameEnd = (winner: string | null, finalScores: { human: number; bot: number }) => {
    console.log('Game ended:', { winner, finalScores });
  };

  return (
    <ThemeProvider>
      <ResponsiveTest>
        <ThemeSelector />
        <InteractiveGame 
          config={{ 
            maxTurns: 10,
            allowBotPlayer: true,
            enableKeyLetters: true,
            enableLockedLetters: true
          }}
          onGameEnd={handleGameEnd}
        />
      </ResponsiveTest>
    </ThemeProvider>
  );
}

export default App;
