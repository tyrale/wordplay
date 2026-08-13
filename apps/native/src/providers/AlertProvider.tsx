/**
 * Native Alert Provider.
 *
 * Direct port of apps/web's `components/ui/AlertProvider.tsx` - an
 * imperative trigger mechanism for contextual/transient alerts (unlocks,
 * share results, etc.) that don't already have their own app-level state
 * machine, queued and shown one at a time through `AlertOverlay`. The
 * logic here is identical to web's; only the imports (native
 * `AlertOverlay`/`content/alertCopy`) differ.
 *
 * Declarative full-app-state overlays (win/lose/quit, once those flows
 * are ported) should render `AlertOverlay` directly instead of using this
 * provider, matching web's convention - see that file's doc comment.
 */
import React, { createContext, useCallback, useContext, useState } from 'react';
import { AlertOverlay } from '../components/AlertOverlay';
import type { AlertOverlayAction, AlertOverlayVariant } from '../components/AlertOverlay';
import { alertCopy, resolveAlertLines, resolveAlertMeta } from '../content/alertCopy';
import type { AlertCategory, AlertCopyEntry } from '../content/alertCopy';

interface AlertRequest {
  id: string;
  lines: string[];
  variant?: AlertOverlayVariant;
  meta?: React.ReactNode;
  actions?: AlertOverlayAction[];
  onCloseExtra?: () => void;
}

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

interface AlertContextType {
  showAlert: <C extends AlertCategory>(category: C, key: keyof (typeof alertCopy)[C], options?: ShowAlertOptions) => void;
  showCustomAlert: (lines: string[], options?: ShowCustomAlertOptions) => void;
  dismissAlert: () => void;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export const useAlert = (): AlertContextType => {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlert must be used within an AlertProvider');
  }
  return context;
};

interface AlertProviderProps {
  children: React.ReactNode;
}

export const AlertProvider: React.FC<AlertProviderProps> = ({ children }) => {
  const [queue, setQueue] = useState<AlertRequest[]>([]);

  const generateId = useCallback(() => {
    return `alert-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  }, []);

  const enqueue = useCallback((request: Omit<AlertRequest, 'id'>) => {
    setQueue(prev => [...prev, { ...request, id: generateId() }]);
  }, [generateId]);

  const showAlert = useCallback(<C extends AlertCategory>(
    category: C,
    key: keyof (typeof alertCopy)[C],
    options?: ShowAlertOptions
  ) => {
    const categoryEntries = alertCopy[category] as Record<string, AlertCopyEntry>;
    const entry = categoryEntries[key as string];
    if (!entry) {
      console.warn(`AlertProvider: no copy found for ${category}.${String(key)}`);
      return;
    }
    enqueue({
      lines: resolveAlertLines(entry, options?.params),
      variant: options?.variant,
      meta: options?.meta ?? resolveAlertMeta(entry, options?.params, options?.itemId),
      actions: options?.actions,
      onCloseExtra: options?.onClose
    });
  }, [enqueue]);

  const showCustomAlert = useCallback((lines: string[], options?: ShowCustomAlertOptions) => {
    enqueue({
      lines,
      variant: options?.variant,
      meta: options?.meta,
      actions: options?.actions,
      onCloseExtra: options?.onClose
    });
  }, [enqueue]);

  const dismissAlert = useCallback(() => {
    setQueue(prev => {
      const [closing, ...rest] = prev;
      closing?.onCloseExtra?.();
      return rest;
    });
  }, []);

  const current = queue[0];

  return (
    <AlertContext.Provider value={{ showAlert, showCustomAlert, dismissAlert }}>
      {children}
      {current && (
        <AlertOverlay
          isVisible={true}
          lines={current.lines}
          variant={current.variant}
          meta={current.meta}
          actions={current.actions}
          onClose={dismissAlert}
        />
      )}
    </AlertContext.Provider>
  );
};
