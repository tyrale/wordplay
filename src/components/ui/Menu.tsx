import React, { useState, useCallback } from 'react';
import { useTheme } from '../theme/ThemeProvider';
import { useUnlockSystem } from '../unlock/UnlockProvider';
import { useVanityFilter } from '../../hooks/useVanityFilter';
import { useMechanicsSettings } from '../../contexts/MechanicsSettingsContext';
import { useUnlockedThemes } from '../../hooks/useUnlockedThemes';
import { getAllBots, getBotDisplayNamesMapping } from '../../data/botRegistry';
import { availableThemes as ALL_THEMES } from '../../types/theme';
import type { GameTheme } from '../../types/theme';
import { DictionariesOverlay } from './DictionariesOverlay';
import './Menu.css';

interface MenuTier2Item {
  id: string;
  title: string;
  isSelected?: boolean;
  onClick?: () => void;
  theme?: GameTheme; // For theme items, store the theme object
  isLocked?: boolean; // Grayed-out '????' preview for a not-yet-unlocked item
}

// Full list of mechanic ids that can exist (excludes 'dark-mode', which lives under the themes section)
const ALL_MECHANIC_IDS = ['vanity-filter', '5-letter-start', '6-letter-start', 'time-pressure', 'gravity'];

// Masks a display name into '?' characters (one per non-space character), preserving spaces as gaps
const maskName = (name: string): string => name.replace(/[^\s]/g, '?');

interface MenuTier1Item {
  id: string;
  title: string;
  children?: MenuTier2Item[]; // Made optional for standalone tier 1 items
  onClick?: () => void;
}

// Map mechanic IDs to display names
const mechanicDisplayNames: Record<string, string> = {
  '5-letter-start': '5 letter starting word',
  '6-letter-start': '6 letter starting word',
  'time-pressure': 'time pressure mode',
  'gravity': 'falls mode',
  'challenge-dictionary': 'challenge dictionary'
};

// Updated menu structure based on requirements and unlock state
// Resolves a mechanic id's real display name (matches the logic used for real unlocked mechanic items)
const getMechanicTitle = (mechanicId: string): string =>
  mechanicId === 'vanity-filter' ? 'bad word filter' : (mechanicDisplayNames[mechanicId] || mechanicId);

const getMenuItems = (
  availableThemes: GameTheme[], 
  currentTheme: GameTheme, 
  isInverted: boolean, 
  isInGame: boolean = false,
  unlockedMechanics: string[] = [],
  availableBots: string[] = [],
  _currentGameMode?: string,
  _vanityFilterUnlocked: boolean = false,
  vanityFilterOn: boolean = true,
  isMechanicOn: (mechanicId: string) => boolean = () => true,
  revealedCategories: string[] = []
): MenuTier1Item[] => {
  // Locked theme previews - only computed once 'themes' has been revealed
  const lockedThemeItems: MenuTier2Item[] = revealedCategories.includes('themes')
    ? ALL_THEMES
        .filter(theme => !availableThemes.some(unlocked => unlocked.name === theme.name))
        .map(theme => ({
          id: `locked-theme-${theme.name.toLowerCase().replace(/\s+/g, '-')}`,
          title: maskName(theme.name.toLowerCase()),
          isLocked: true
        }))
    : [];

  // Locked mechanic previews - only computed once 'mechanics' has been revealed
  const lockedMechanicItems: MenuTier2Item[] = revealedCategories.includes('mechanics')
    ? ALL_MECHANIC_IDS
        .filter(mechanicId => !unlockedMechanics.includes(mechanicId))
        .map(mechanicId => ({
          id: `locked-mechanic-${mechanicId}`,
          title: maskName(getMechanicTitle(mechanicId)),
          isLocked: true
        }))
    : [];

  // Locked bot previews - only computed once 'bots' has been revealed
  const lockedBotItems: MenuTier2Item[] = revealedCategories.includes('bots')
    ? getAllBots()
        .filter(bot => !availableBots.includes(bot.id))
        .map(bot => ({
          id: `locked-bot-${bot.id}`,
          title: maskName(getBotDisplayNamesMapping()[bot.id] || bot.id),
          isLocked: true
        }))
    : [];

  return [
  // Only include resign if user is in an active game
  ...(isInGame ? [{
    id: 'resign',
    title: 'resign'
    // No children - this is a standalone tier 1 action item
  }] : []),
  {
    id: 'vsworld',
    title: 'vs world',
    children: [
      { id: 'challenge-mode', title: 'daily challenge' },
      { id: 'leaderboard', title: 'leaderboard' },
      { id: 'reset-challenge', title: 'reset daily challenge (testing)' },
    ]
  },
  {
    id: 'themes',
    title: 'themes', 
    children: [
      ...(unlockedMechanics.includes('dark-mode') ? [{ id: 'inverted', title: 'dark mode', isSelected: isInverted }] : []),
      ...availableThemes.map(theme => ({
        id: theme.name.toLowerCase().replace(/\s+/g, '-'),
        title: theme.name.toLowerCase(),
        isSelected: theme.name === currentTheme.name,
        theme: theme
      })),
      ...lockedThemeItems
    ]
  },
  // Show mechanics section if there are unlocked mechanics (excluding dark mode,
  // which lives under the themes section instead) or if locked previews are revealed
  ...(unlockedMechanics.filter(id => id !== 'dark-mode' && id !== 'unlock-counter').length > 0 || lockedMechanicItems.length > 0 ? [{
    id: 'mechanics',
    title: 'mechanics',
    children: [
      ...unlockedMechanics.filter(mechanicId => mechanicId !== 'dark-mode' && mechanicId !== 'unlock-counter').map(mechanicId => {
        // Special handling for vanity filter - make it a toggle
        if (mechanicId === 'vanity-filter') {
          return {
            id: mechanicId,
            title: 'bad word filter',
            isSelected: vanityFilterOn
          };
        }
        return {
          id: mechanicId,
          title: mechanicDisplayNames[mechanicId] || mechanicId,
          isSelected: isMechanicOn(mechanicId)
        };
      }),
      ...lockedMechanicItems
    ]
  }] : []),
  // Show bots section if there are available bots
  ...(availableBots.length > 0 || lockedBotItems.length > 0 ? [{
    id: 'bots',
    title: 'bots',
    children: [
      ...availableBots.map((botId: string) => ({
        id: botId,
        title: getBotDisplayNamesMapping()[botId] || botId
      })),
      ...lockedBotItems
    ]
  }] : []),
  {
    id: 'about',
    title: 'about',
    children: [
      { id: 'the-basics', title: 'the basics' },
      { id: 'dictionaries', title: 'dictionaries' },
      { id: 'debug-mode', title: 'debug mode' },
      { id: 'reset-unlocks', title: 'reset unlocks (debug)' },
    ]
  },
  // Home item - moved to bottom
  {
    id: 'home',
    title: 'home'
    // No children - this is a standalone tier 1 action item
  },
  ];
};

export interface MenuProps {
  isOpen: boolean;
  onClose: () => void;
  onDebugOpen?: () => void;
  onResign?: () => void;
  onStartGame?: (gameType: 'bot' | 'challenge' | 'tutorial', botId?: string) => void;
  onNavigateHome?: () => void;
  className?: string;
  isInGame?: boolean;
  currentGameMode?: string;
}

export const Menu: React.FC<MenuProps> = ({ 
  isOpen, 
  onClose, 
  onDebugOpen, 
  onResign, 
  onStartGame,
  onNavigateHome,
  className = '',
  isInGame = false,
  currentGameMode
}) => {
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [isClosing, setIsClosing] = useState(false);
  const [isDictionariesOpen, setIsDictionariesOpen] = useState(false);
  const { currentTheme, setTheme, isInverted, toggleInverted } = useTheme();
  
  // Get unlock state
  const { getUnlockedItems, resetUnlocksToFresh, isLoading, isUnlocked, getUnlockProgress } = useUnlockSystem();
  
  // Get vanity filter state
  const { isVanityFilterUnlocked, isVanityFilterOn, toggleVanityFilter } = useVanityFilter();
  
  // Get mechanics on/off state
  const { isMechanicOn, toggleMechanic } = useMechanicsSettings();
  const unlockedThemeIds = getUnlockedItems('theme');
  const unlockedMechanics = getUnlockedItems('mechanic');
  const unlockedBots = getUnlockedItems('bot');
  const revealedCategories = getUnlockedItems('reveal');
  
  // Ensure basicBot is always available (fallback for loading state or missing data)
  const availableBots = isLoading ? ['basicBot'] : (unlockedBots.length > 0 ? unlockedBots : ['basicBot']);

  // Filter themes based on unlock state
  const unlockedThemes = useUnlockedThemes({ unlockedThemes: unlockedThemeIds });

  // Simple reset function that doesn't require the challenge hook
  const resetDailyChallenge = useCallback(() => {
    try {
      const today = new Date().toISOString().split('T')[0];
      localStorage.removeItem(`wordplay-challenge-${today}`);
      console.log('Daily challenge reset for', today);
    } catch (err) {
      console.warn('Failed to reset daily challenge:', err);
    }
  }, []);

  const menuItems = getMenuItems(unlockedThemes, currentTheme, isInverted, isInGame, unlockedMechanics, availableBots, currentGameMode, isVanityFilterUnlocked(), isVanityFilterOn(), isMechanicOn, revealedCategories);

  // "unlock" mechanic - shows a small "x/x unlocked" progress indicator under home
  const isUnlockCounterOn = isUnlocked('mechanic', 'unlock-counter');
  const unlockProgress = getUnlockProgress();

  const handleClose = useCallback(() => {
    setIsClosing(true);
    // Wait for animation to complete before actually closing
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 300); // Match the longest animation duration
  }, [onClose]);

  const handleOverlayClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  }, [handleClose]);

  const handleTier1Click = useCallback((itemId: string) => {
    // Handle standalone tier 1 items that perform actions directly
    if (itemId === 'home') {
      onNavigateHome?.();
      handleClose(); // Close menu after home navigation
      return;
    }
    
    if (itemId === 'resign') {
      onResign?.();
      handleClose(); // Close menu after resign
      return;
    }
    
    // For items with children, toggle expansion
    setExpandedItem(prevExpanded => 
      prevExpanded === itemId ? null : itemId
    );
  }, [onNavigateHome, onResign, handleClose]);

  // Helper function to render theme name with color preview
  const renderThemeName = useCallback((item: MenuTier2Item) => {
    if (!item.theme) {
      return item.title;
    }

    const theme = item.theme;
    const title = item.title;
    
    // Pick a deterministic letter to highlight based on theme name hash
    const hash = title.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);
    const accentIndex = hash % title.length;
    
    // Apply dark mode inversion if toggled
    const displayColors = isInverted ? {
      text: theme.colors.background,
      accent: theme.colors.accent
    } : {
      text: theme.colors.text,
      accent: theme.colors.accent
    };
    
    return (
      <span style={{ color: displayColors.text }}>
        {title.split('').map((char: string, index: number) => (
          <span
            key={index}
            style={{
              color: index === accentIndex ? displayColors.accent : displayColors.text
            }}
          >
            {char}
          </span>
        ))}
      </span>
    );
  }, [isInverted]);

  // Helper function to render "vs world" with accent color for "vs"
  const renderVsWorldTitle = useCallback((title: string) => {
    if (title === 'vs world') {
      return (
        <>
          <span style={{ color: 'var(--theme-accent)' }}>vs</span> world
        </>
      );
    }
    return title;
  }, []);

  const handleTier2Click = useCallback((tier1Id: string, tier2Id: string) => {
    // Handle specific actions that should close the menu
    if (tier1Id === 'themes') {
      if (tier2Id === 'inverted') {
        // Toggle inverted theme
        toggleInverted();
        // Don't close menu after toggle
      } else {
        // Find and set the selected theme
        const selectedTheme = unlockedThemes.find(theme => 
          theme.name.toLowerCase().replace(/\s+/g, '-') === tier2Id
        );
        if (selectedTheme) {
          setTheme(selectedTheme);
          // Don't close menu after theme change
        }
      }
    } else if (tier1Id === 'about' && tier2Id === 'the-basics') {
      // Force-replay the tutorial layer on a fresh bot game (handled in App.tsx)
      onStartGame?.('tutorial');
      handleClose(); // Close menu after starting tutorial
    } else if (tier1Id === 'about' && tier2Id === 'dictionaries') {
      // Show the dictionaries overlay
      setIsDictionariesOpen(true);
      handleClose(); // Close menu behind the overlay
    } else if (tier1Id === 'about' && (tier2Id === 'debug' || tier2Id === 'debug-mode')) {
      // Open debug dialog
      onDebugOpen?.();
      handleClose(); // Close menu after opening debug
    } else if (tier1Id === 'about' && tier2Id === 'reset-unlocks') {
      // Reset unlocks to fresh user state
      resetUnlocksToFresh();
      handleClose(); // Close menu after reset
    } else if (tier1Id === 'vsworld' && tier2Id === 'challenge-mode') {
      // Start daily challenge
      onStartGame?.('challenge');
      handleClose(); // Close menu after starting challenge
    } else if (tier1Id === 'vsworld' && tier2Id === 'reset-challenge') {
      // Reset daily challenge for testing
      resetDailyChallenge();
      // Keep menu open for testing workflow
    } else if (tier1Id === 'mechanics') {
      if (tier2Id === 'vanity-filter') {
        // Toggle vanity filter
        toggleVanityFilter();
      } else {
        // Toggle the mechanic on/off
        toggleMechanic(tier2Id);
      }
      // Don't close menu after toggle
    } else if (tier1Id === 'bots') {
      // Bot selection - this will trigger confirmation in App.tsx
      onStartGame?.('bot', tier2Id);
      handleClose(); // Close menu after bot selection (confirmation handled at app level)
    }
    
    // For other items (challenge, mechanics, other about items), keep menu open
    // These are placeholder items that don't have functionality yet
  }, [handleClose, onDebugOpen, onResign, onStartGame, unlockedThemes, setTheme, toggleInverted, toggleVanityFilter, toggleMechanic, resetUnlocksToFresh, resetDailyChallenge]);

  return (
    <>
    {isOpen && (
    <div 
      className={`menu-overlay ${isClosing ? 'menu-overlay--closing' : ''} ${className}`.trim()}
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="menu-title"
    >
      <div className="menu-container">
        <div className="menu-content">
          <div className="menu-main">
            <div className="menu-spacer"></div>
            <div className="menu-list">
                         {menuItems.map((tier1Item: MenuTier1Item, tier1Index: number) => (
              <div key={tier1Item.id} className="menu-tier1-section">
                <button
                  className={`menu-tier1-item ${isClosing ? 'menu-tier1-item--closing' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleTier1Click(tier1Item.id);
                  }}
                  aria-expanded={expandedItem === tier1Item.id}
                  aria-controls={`menu-${tier1Item.id}-submenu`}
                  style={{ 
                    position: 'relative', 
                    zIndex: 200,
                    animationDelay: isClosing ? `${(menuItems.length - tier1Index - 1) * 0.05}s` : `${tier1Index * 0.1}s`,
                    color: tier1Item.id === 'resign' ? 'var(--theme-accent)' : undefined
                  }}
                >
                  {renderVsWorldTitle(tier1Item.title)}
                </button>

                {tier1Item.id === 'home' && isUnlockCounterOn && (
                  <div className="menu-unlock-progress">
                    {unlockProgress.unlocked}/{unlockProgress.total} unlocked
                  </div>
                )}

                {tier1Item.children && (
                  <div 
                    className={`menu-tier2-list ${expandedItem === tier1Item.id ? 'menu-tier2-list--expanded' : ''}`}
                    id={`menu-${tier1Item.id}-submenu`}
                    role="region"
                    aria-labelledby={`menu-${tier1Item.id}-button`}
                  >
                    {tier1Item.id === 'themes' ? (
                      // Special handling for themes menu
                      <>
                        {/* Dark mode toggle on its own row */}
                        <div className="menu-tier2-darkmode-row">
                          {tier1Item.children
                                                         .filter((item: MenuTier2Item) => item.id === 'inverted')
                             .map((tier2Item: MenuTier2Item, tier2Index: number) => {
                              return (
                                <button
                                  key={tier2Item.id}
                                  className={`menu-tier2-item menu-tier2-item--toggle ${tier2Item.isSelected ? 'menu-tier2-item--selected' : ''} ${isClosing ? 'menu-tier2-item--closing' : ''}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleTier2Click(tier1Item.id, tier2Item.id);
                                  }}
                                  style={{
                                    animationDelay: isClosing 
                                      ? `${(menuItems.length - tier1Index - 1) * 0.05 + (tier1Item.children!.length - tier2Index - 1) * 0.02}s`
                                      : `${(tier1Index * 0.1) + 0.05 + (tier2Index * 0.02)}s`
                                  }}
                                >
                                  {tier2Item.title}
                                  <div className={`dark-mode-toggle ${tier2Item.isSelected ? 'dark-mode-toggle--active' : ''}`}>
                                    <div className="dark-mode-toggle__slider"></div>
                                  </div>
                                </button>
                              );
                            })}
                        </div>
                        
                        {/* Theme items in wrapped rows */}
                        <div className="menu-tier2-themes-grid">
                          {tier1Item.children
                                                         .filter((item: MenuTier2Item) => item.id !== 'inverted')
                             .map((tier2Item: MenuTier2Item, tier2Index: number) => {
                              // Locked previews have no theme colors to show - render as a flat gray box
                              const themeStyles = tier2Item.isLocked ? {} : {
                                borderColor: isInverted ? tier2Item.theme!.colors.background : tier2Item.theme!.colors.text,
                                backgroundColor: isInverted ? tier2Item.theme!.colors.text : tier2Item.theme!.colors.background,
                                color: isInverted ? tier2Item.theme!.colors.background : tier2Item.theme!.colors.text
                              };

                              return (
                                <button
                                  key={tier2Item.id}
                                  className={`menu-tier2-item menu-tier2-item--theme ${tier2Item.isSelected ? 'menu-tier2-item--selected' : ''} ${isClosing ? 'menu-tier2-item--closing' : ''} ${tier2Item.isLocked ? 'menu-tier2-item--locked' : ''}`}
                                  disabled={tier2Item.isLocked}
                                  aria-disabled={tier2Item.isLocked}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleTier2Click(tier1Item.id, tier2Item.id);
                                  }}
                                  style={{
                                    animationDelay: isClosing 
                                      ? `${(menuItems.length - tier1Index - 1) * 0.05 + (tier1Item.children!.length - tier2Index - 1) * 0.02}s`
                                      : `${(tier1Index * 0.1) + 0.05 + (tier2Index * 0.02)}s`,
                                    ...themeStyles
                                  }}
                                >
                                  {tier2Item.isLocked ? tier2Item.title : renderThemeName(tier2Item)}
                                  
                                  {/* Checkmark for selected theme items */}
                                  {tier2Item.isSelected && !tier2Item.isLocked && (
                                    <span 
                                      className="menu-tier2-item__checkmark"
                                      style={{ color: tier2Item.theme!.colors.accent }}
                                    >
                                      ✓
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                        </div>
                      </>
                    ) : (
                      // Regular handling for non-themes menus
                      tier1Item.children.map((tier2Item: MenuTier2Item, tier2Index: number) => {
                        // Check if this is a toggle item (has isSelected property)
                        const isToggle = tier2Item.isSelected !== undefined;
                        
                        return (
                          <button
                            key={tier2Item.id}
                            className={`menu-tier2-item ${isToggle ? 'menu-tier2-item--toggle' : ''} ${tier2Item.isSelected ? 'menu-tier2-item--selected' : ''} ${isClosing ? 'menu-tier2-item--closing' : ''} ${tier2Item.isLocked ? 'menu-tier2-item--locked' : ''}`}
                            disabled={tier2Item.isLocked}
                            aria-disabled={tier2Item.isLocked}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleTier2Click(tier1Item.id, tier2Item.id);
                            }}
                            style={{
                              animationDelay: isClosing 
                                ? `${(menuItems.length - tier1Index - 1) * 0.05 + (tier1Item.children!.length - tier2Index - 1) * 0.02}s`
                                : `${(tier1Index * 0.1) + 0.05 + (tier2Index * 0.02)}s`
                            }}
                          >
                            {tier2Item.title}
                            {isToggle && (
                              <div className={`dark-mode-toggle ${tier2Item.isSelected ? 'dark-mode-toggle--active' : ''}`}>
                                <div className="dark-mode-toggle__slider"></div>
                              </div>
                            )}
                          </button>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
          </div>
          <div className="menu-footer">
            <button
              className={`menu-close-button ${isClosing ? 'menu-close-button--closing' : ''}`}
              onClick={handleClose}
              aria-label="Close menu"
            >
              ×
            </button>
          </div>
        </div>
      </div>
    </div>
    )}
      <DictionariesOverlay
        isVisible={isDictionariesOpen}
        onClose={() => setIsDictionariesOpen(false)}
      />
    </>
  );
}; 