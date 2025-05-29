export interface BotPersonality {
  id: string;
  name: string;
  description: string;
  avatar: {
    image: string;  // Path to avatar image
    theme: {
      primary: string;  // Primary color
      secondary: string;  // Secondary color
      accent: string;  // Accent color
    };
  };
  ruleBreaks: {
    allowInvalidWords?: boolean;
    allowNumbers?: boolean;
    allowSymbols?: boolean;
    customPattern?: string;
  };
  unlockableAttribute?: {
    id: string;
    name: string;
    description: string;
  };
}

export const BOTS: Record<string, BotPersonality> = {
  NOOB: {
    id: 'NOOB',
    name: 'Noob Bot',
    description: 'Only adds "S" to the end of words, even if invalid',
    avatar: {
      image: '/assets/bots/noob.png',
      theme: {
        primary: '#FF6B6B',    // Light red
        secondary: '#4ECDC4',  // Teal
        accent: '#FFE66D'      // Yellow
      }
    },
    ruleBreaks: {
      allowInvalidWords: true,
      customPattern: '.*S$'
    }
  },
  LEET: {
    id: 'LEET',
    name: '1337 Bot',
    description: 'Uses leetspeak numbers in display only',
    avatar: {
      image: '/assets/bots/leet.png',
      theme: {
        primary: '#2C3E50',    // Dark blue
        secondary: '#E74C3C',  // Red
        accent: '#3498DB'      // Light blue
      }
    },
    ruleBreaks: {
      allowNumbers: true,
      customPattern: '[A-Z0-9]+'
    },
    unlockableAttribute: {
      id: 'LEET_DISPLAY',
      name: '1337 Display',
      description: 'Display letters as their 1337 number equivalents'
    }
  }
};

export function isBotPlayer(playerId: string): boolean {
  return playerId in BOTS;
}

export function getBotPersonality(playerId: string): BotPersonality | undefined {
  return BOTS[playerId];
} 