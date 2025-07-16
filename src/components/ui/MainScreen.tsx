import React, { useState, useCallback } from 'react';
import { Menu } from './Menu';
import { useUnlockSystem } from '../unlock/UnlockProvider';
import { getAllBots } from '../../data/botRegistry';
import './MainScreen.css';

interface MainScreenProps {
  onStartGame: (gameType: 'bot' | 'challenge' | 'tutorial', botId?: string) => void;
}

export const MainScreen: React.FC<MainScreenProps> = ({ onStartGame }) => {
  const [currentView, setCurrentView] = useState<'main' | 'bots'>('main');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  // Get unlock state
  const { getUnlockedItems } = useUnlockSystem();
  const unlockedBotIds = getUnlockedItems('bot');
  
  // Filter bots based on unlock state
  const availableBots = getAllBots().filter(bot => unlockedBotIds.includes(bot.id));

  const handleGameTypeSelect = useCallback((gameType: string) => {
    if (gameType === 'vs-bot') {
      setCurrentView('bots');
    } else if (gameType === 'challenge') {
      onStartGame('challenge');
    } else if (gameType === 'vs-human') {
      // This mode not implemented yet
      console.log(`${gameType} mode not implemented yet`);
    }
  }, [onStartGame]);

  const handleBotSelect = useCallback((botId: string) => {
    onStartGame('bot', botId);
  }, [onStartGame]);



  const handleMenuOpen = useCallback(() => {
    setIsMenuOpen(true);
  }, []);

  const handleMenuClose = useCallback(() => {
    setIsMenuOpen(false);
  }, []);

  return (
    <div className="main-screen">
      {/* Menu icon - positioned to match alphabet grid menu icon */}
      <button 
        className="main-screen-menu-button"
        onClick={handleMenuOpen}
        aria-label="Open menu"
      >
        ≡
      </button>

      {/* Main content */}
      <div className="main-screen__content">
        {currentView === 'main' && (
          <div className="main-screen__game-selection">
            <button 
              className="main-screen__game-option"
              onClick={() => handleGameTypeSelect('challenge')}
            >
              <span className="main-screen__vs-text">vs</span> world
            </button>
            <button 
              className="main-screen__game-option"
              onClick={() => handleGameTypeSelect('vs-human')}
            >
              <span className="main-screen__vs-text">vs</span> human
            </button>
            <button 
              className="main-screen__game-option"
              onClick={() => handleGameTypeSelect('vs-bot')}
            >
              <span className="main-screen__vs-text">vs</span> bot
            </button>
          </div>
        )}

        {currentView === 'bots' && (
          <div className="main-screen__bot-selection">
            <div className="main-screen__bot-list">
              {availableBots.map((bot) => (
                <button
                  key={bot.id}
                  className="main-screen__bot-option"
                  onClick={() => handleBotSelect(bot.id)}
                >
                  {bot.displayName}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Menu */}
      <Menu
        isOpen={isMenuOpen}
        onClose={handleMenuClose}
        onStartGame={onStartGame}
        onNavigateHome={() => {
          // Already on main screen, just close menu
          setIsMenuOpen(false);
        }}
        isInGame={false}
        currentGameMode={undefined}
      />
    </div>
  );
}; 