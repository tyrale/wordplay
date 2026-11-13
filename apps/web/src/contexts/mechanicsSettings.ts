/**
 * Mechanics settings context, its value type and the
 * `useMechanicsSettings` hook. Kept apart from
 * `MechanicsSettingsContext.tsx` so that file only exports a component
 * (React Fast Refresh requirement).
 */

import { createContext, useContext } from 'react';

export interface MechanicsSettingsContextValue {
  isMechanicOn: (mechanicId: string) => boolean;
  toggleMechanic: (mechanicId: string) => void;
}

export const MechanicsSettingsContext =
  createContext<MechanicsSettingsContextValue | null>(null);

export const useMechanicsSettings = (): MechanicsSettingsContextValue => {
  const context = useContext(MechanicsSettingsContext);
  if (!context) {
    throw new Error(
      'useMechanicsSettings must be used within a MechanicsSettingsProvider'
    );
  }
  return context;
};
