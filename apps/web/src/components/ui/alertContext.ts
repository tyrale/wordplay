/**
 * Alert context, its option types and the `useAlert` hook. Kept apart
 * from `AlertProvider.tsx` so that file only exports a component (React
 * Fast Refresh requirement).
 */

import { createContext, useContext } from 'react';
import type React from 'react';
import type { AlertOverlayAction, AlertOverlayVariant } from './AlertOverlay';
import type { AlertCategory, alertCopy } from '../../content/alertCopy';

export interface ShowAlertOptions {
  params?: Record<string, string>;
  /** Raw item id (e.g. bot id, mechanic id) used to look up a per-item `metaByItem` phrase. */
  itemId?: string;
  variant?: AlertOverlayVariant;
  meta?: React.ReactNode;
  actions?: AlertOverlayAction[];
  onClose?: () => void;
}

export interface ShowCustomAlertOptions {
  variant?: AlertOverlayVariant;
  meta?: React.ReactNode;
  actions?: AlertOverlayAction[];
  onClose?: () => void;
}

export interface AlertContextType {
  showAlert: <C extends AlertCategory>(
    category: C,
    key: keyof (typeof alertCopy)[C],
    options?: ShowAlertOptions
  ) => void;
  showCustomAlert: (lines: string[], options?: ShowCustomAlertOptions) => void;
  dismissAlert: () => void;
}

export const AlertContext = createContext<AlertContextType | undefined>(
  undefined
);

export const useAlert = () => {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlert must be used within an AlertProvider');
  }
  return context;
};
