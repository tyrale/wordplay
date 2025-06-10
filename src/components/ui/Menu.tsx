import React, { useState, useCallback } from 'react';
import { useTheme } from '../theme/ThemeProvider';
import './Menu.css';

interface MenuTier2Item {
  id: string;
  title: string;
  isSelected?: boolean;
  onClick?: () => void;
}

interface MenuTier1Item {
  id: string;
  title: string;
  children: MenuTier2Item[];
  onClick?: () => void;
}

interface MenuProps {
  isOpen: boolean;
  onClose: () => void;
  onDebugOpen?: () => void;
  className?: string;
}

// Updated menu structure based on requirements
const getMenuItems = (availableThemes: any[], currentTheme: any): MenuTier1Item[] => [
  {
    id: 'challenge',
    title: 'challenge',
    children: [
      { id: 'challenge-mode', title: 'challenge mode' },
      { id: 'leaderboard', title: 'leaderboard' },
    ]
  },
  {
    id: 'themes',
    title: 'themes', 
    children: availableThemes.map(theme => ({
      id: theme.name.toLowerCase().replace(/\s+/g, '-'),
      title: theme.name.toLowerCase(),
      isSelected: theme.name === currentTheme.name
    }))
  },
  {
    id: 'mechanics',
    title: 'mechanics',
    children: [
      { id: '5-letter-start', title: '5 letter starting word' },
      { id: 'longer-words', title: 'longer word limits' },
      { id: 'time-pressure', title: 'time pressure mode' },
      { id: 'double-key-letters', title: 'double key letters' },
      { id: 'reverse-scoring', title: 'reverse scoring' },
      { id: 'challenge-dictionary', title: 'challenge dictionary' },
    ]
  },
  {
    id: 'bots',
    title: 'bots',
    children: [
      { id: 'easy-bot', title: 'easy bot' },
      { id: 'medium-bot', title: 'medium bot' },
      { id: 'hard-bot', title: 'hard bot' },
      { id: 'expert-bot', title: 'expert bot' },
      { id: 'adaptive-bot', title: 'adaptive bot' },
      { id: 'puzzle-bot', title: 'puzzle bot' },
      { id: 'speed-bot', title: 'speed bot' },
      { id: 'strategic-bot', title: 'strategic bot' },
      { id: 'creative-bot', title: 'creative bot' },
      { id: 'aggressive-bot', title: 'aggressive bot' },
      { id: 'defensive-bot', title: 'defensive bot' },
      { id: 'learning-bot', title: 'learning bot' },
      { id: 'memory-bot', title: 'memory bot' },
      { id: 'pattern-bot', title: 'pattern bot' },
      { id: 'chaos-bot', title: 'chaos bot' },
      { id: 'minimalist-bot', title: 'minimalist bot' },
      { id: 'maximalist-bot', title: 'maximalist bot' },
      { id: 'vowel-bot', title: 'vowel bot' },
      { id: 'consonant-bot', title: 'consonant bot' },
      { id: 'rhyme-bot', title: 'rhyme bot' },
      { id: 'alliteration-bot', title: 'alliteration bot' },
      { id: 'length-bot', title: 'length bot' },
      { id: 'suffix-bot', title: 'suffix bot' },
      { id: 'prefix-bot', title: 'prefix bot' },
      { id: 'compound-bot', title: 'compound bot' },
      { id: 'analytical-bot', title: 'analytical bot' },
      { id: 'intuitive-bot', title: 'intuitive bot' },
      { id: 'experimental-bot', title: 'experimental bot' },
      { id: 'classic-bot', title: 'classic bot' },
      { id: 'modern-bot', title: 'modern bot' },
    ]
  },
  {
    id: 'about',
    title: 'about',
    children: [
      { id: 'game-version', title: 'game version' },
      { id: 'credits', title: 'credits' },
      { id: 'privacy-policy', title: 'privacy policy' },
      { id: 'terms-of-service', title: 'terms of service' },
      { id: 'contact-support', title: 'contact support' },
      { id: 'feedback', title: 'feedback' },
      { id: 'debug', title: 'debug' },
    ]
  },
];

export const Menu: React.FC<MenuProps> = ({
  isOpen,
  onClose,
  onDebugOpen,
  className = ''
}) => {
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const { currentTheme, setTheme, availableThemes } = useTheme();

  const menuItems = getMenuItems(availableThemes, currentTheme);

  const handleOverlayClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }, [onClose]);

  const handleTier1Click = useCallback((itemId: string) => {
    setExpandedItem(prevExpanded => 
      prevExpanded === itemId ? null : itemId
    );
  }, []);

  const handleTier2Click = useCallback((tier1Id: string, tier2Id: string) => {
    // Handle specific actions that should close the menu
    if (tier1Id === 'themes') {
      // Find and set the selected theme
      const selectedTheme = availableThemes.find(theme => 
        theme.name.toLowerCase().replace(/\s+/g, '-') === tier2Id
      );
      if (selectedTheme) {
        setTheme(selectedTheme);
        onClose(); // Close menu after theme change
      }
    } else if (tier1Id === 'about' && tier2Id === 'debug') {
      // Open debug dialog
      onDebugOpen?.();
      onClose(); // Close menu after opening debug
    }
    
    // For other items (challenge, mechanics, bots, other about items), keep menu open
    // These are placeholder items that don't have functionality yet
  }, [onClose, onDebugOpen, availableThemes, setTheme]);

  if (!isOpen) return null;

  return (
    <div 
      className={`menu-overlay ${className}`.trim()}
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="menu-title"
    >
      <div className="menu-container">
        <div className="menu-content">
          <div className="menu-list">
            {menuItems.map((tier1Item: MenuTier1Item) => (
              <div key={tier1Item.id} className="menu-tier1-section">
                <button
                  className="menu-tier1-item"
                  onClick={() => handleTier1Click(tier1Item.id)}
                  aria-expanded={expandedItem === tier1Item.id}
                  aria-controls={`menu-${tier1Item.id}-submenu`}
                >
                  {tier1Item.title}
                </button>
                
                <div 
                  className={`menu-tier2-list ${expandedItem === tier1Item.id ? 'menu-tier2-list--expanded' : ''}`}
                  id={`menu-${tier1Item.id}-submenu`}
                  role="region"
                  aria-labelledby={`menu-${tier1Item.id}-button`}
                >
                  <div>
                    {tier1Item.children.map((tier2Item: MenuTier2Item) => (
                      <button
                        key={tier2Item.id}
                        className={`menu-tier2-item ${tier2Item.isSelected ? 'menu-tier2-item--selected' : ''}`}
                        onClick={() => handleTier2Click(tier1Item.id, tier2Item.id)}
                      >
                        {tier2Item.title}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}; 