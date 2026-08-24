/**
 * Native Mechanics Settings Context Provider.
 *
 * Direct port of apps/web's `contexts/MechanicsSettingsContext.tsx` logic,
 * with AsyncStorage instead of `localStorage`. Since AsyncStorage is
 * async (unlike localStorage), this can't read the persisted value inside
 * a `useState` initializer like the web version does - it starts with an
 * empty settings object and loads the real one in an effect, same pattern
 * as `theme/ThemeProvider.tsx`.
 */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface MechanicsSettingsContextValue {
  isMechanicOn: (mechanicId: string) => boolean;
  toggleMechanic: (mechanicId: string) => void;
}

const MechanicsSettingsContext = createContext<MechanicsSettingsContextValue | null>(null);

const STORAGE_KEY = 'wordplay-mechanics-settings';

// Mechanics that default to "off" until the player explicitly turns them on
const DEFAULT_OFF_MECHANICS = new Set(['time-pressure', 'type-to-clear']);

interface MechanicsSettingsProviderProps {
  children: ReactNode;
}

export const MechanicsSettingsProvider: React.FC<MechanicsSettingsProviderProps> = ({ children }) => {
  const [settings, setSettings] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let isMounted = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then(stored => {
        if (isMounted && stored) setSettings(JSON.parse(stored));
      })
      .catch(error => console.warn('Failed to load mechanics settings from AsyncStorage:', error));
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(settings)).catch(error => {
      console.warn('Failed to save mechanics settings to AsyncStorage:', error);
    });
  }, [settings]);

  const isMechanicOn = useCallback((mechanicId: string): boolean => {
    if (mechanicId in settings) {
      return settings[mechanicId];
    }
    return !DEFAULT_OFF_MECHANICS.has(mechanicId);
  }, [settings]);

  const toggleMechanic = useCallback((mechanicId: string): void => {
    setSettings(prev => {
      const currentlyOn = mechanicId in prev ? prev[mechanicId] : !DEFAULT_OFF_MECHANICS.has(mechanicId);
      return { ...prev, [mechanicId]: !currentlyOn };
    });
  }, []);

  const contextValue: MechanicsSettingsContextValue = { isMechanicOn, toggleMechanic };

  return <MechanicsSettingsContext.Provider value={contextValue}>{children}</MechanicsSettingsContext.Provider>;
};

export const useMechanicsSettings = (): MechanicsSettingsContextValue => {
  const context = useContext(MechanicsSettingsContext);
  if (!context) {
    throw new Error('useMechanicsSettings must be used within a MechanicsSettingsProvider');
  }
  return context;
};
