/**
 * Mechanics Settings Context Provider
 *
 * Tracks which *unlocked* gameplay mechanics (e.g. '5-letter-start',
 * 'time-pressure') are currently toggled on by the player. Unlocking a
 * mechanic (see packages/engine/unlock-definitions.ts) only makes it
 * available in the menu — this context tracks whether the player has
 * actually switched it on, and persists that choice across sessions.
 *
 * Mechanics default to "on" the first time they're seen, matching the
 * expectation that unlocking a mechanic should take effect immediately.
 * A small set of mechanics (see `DEFAULT_OFF_MECHANICS`) default to "off"
 * instead, for mechanics disruptive enough that the player should opt in.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';

export interface MechanicsSettingsContextValue {
  isMechanicOn: (mechanicId: string) => boolean;
  toggleMechanic: (mechanicId: string) => void;
}

const MechanicsSettingsContext = createContext<MechanicsSettingsContextValue | null>(null);

const STORAGE_KEY = 'wordplay-mechanics-settings';

// Mechanics that default to "off" until the player explicitly turns them on
const DEFAULT_OFF_MECHANICS = new Set(['time-pressure']);

interface MechanicsSettingsProviderProps {
  children: ReactNode;
}

export const MechanicsSettingsProvider: React.FC<MechanicsSettingsProviderProps> = ({ children }) => {
  const [settings, setSettings] = useState<Record<string, boolean>>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.warn('Failed to load mechanics settings from localStorage:', error);
      return {};
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (error) {
      console.warn('Failed to save mechanics settings to localStorage:', error);
    }
  }, [settings]);

  const isMechanicOn = useCallback((mechanicId: string): boolean => {
    // Respect any explicit choice the player has made
    if (mechanicId in settings) {
      return settings[mechanicId];
    }
    // Otherwise fall back to the mechanic's default (on, unless listed in DEFAULT_OFF_MECHANICS)
    return !DEFAULT_OFF_MECHANICS.has(mechanicId);
  }, [settings]);

  const toggleMechanic = useCallback((mechanicId: string): void => {
    setSettings(prev => {
      const currentlyOn = mechanicId in prev ? prev[mechanicId] : !DEFAULT_OFF_MECHANICS.has(mechanicId);
      return {
        ...prev,
        [mechanicId]: !currentlyOn
      };
    });
  }, []);

  const contextValue: MechanicsSettingsContextValue = {
    isMechanicOn,
    toggleMechanic
  };

  return (
    <MechanicsSettingsContext.Provider value={contextValue}>
      {children}
    </MechanicsSettingsContext.Provider>
  );
};

export const useMechanicsSettings = (): MechanicsSettingsContextValue => {
  const context = useContext(MechanicsSettingsContext);
  if (!context) {
    throw new Error('useMechanicsSettings must be used within a MechanicsSettingsProvider');
  }
  return context;
};
