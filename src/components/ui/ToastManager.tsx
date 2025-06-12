/**
 * Toast Manager Component
 * 
 * Manages multiple toast notifications and provides a context
 * for showing toasts throughout the application.
 */

import React, { createContext, useContext, useState, useCallback } from 'react';
import { Toast } from './Toast';
import type { ToastProps } from './Toast';

interface ToastData {
  id: string;
  type: ToastProps['type'];
  title: string;
  message: string;
  duration?: number;
}

interface ToastContextType {
  showToast: (toast: Omit<ToastData, 'id'>) => void;
  showUnlockToast: (category: string, itemName: string) => void;
  dismissToast: (id: string) => void;
  clearAllToasts: () => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

interface ToastProviderProps {
  children: React.ReactNode;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const generateId = useCallback(() => {
    return `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  const showToast = useCallback((toastData: Omit<ToastData, 'id'>) => {
    const id = generateId();
    const newToast: ToastData = {
      ...toastData,
      id
    };

    setToasts(prev => [...prev, newToast]);
  }, [generateId]);

  const showUnlockToast = useCallback((category: string, itemName: string) => {
    const categoryDisplayName = category === 'theme' ? 'Theme' : 
                               category === 'mechanic' ? 'Mechanic' : 
                               category === 'bot' ? 'Bot' : 
                               category.charAt(0).toUpperCase() + category.slice(1);

    showToast({
      type: 'unlock',
      title: `${categoryDisplayName} Unlocked!`,
      message: `You've unlocked "${itemName}". Check it out in the menu!`,
      duration: 5000 // Longer duration for unlock notifications
    });
  }, [showToast]);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const clearAllToasts = useCallback(() => {
    setToasts([]);
  }, []);

  const contextValue: ToastContextType = {
    showToast,
    showUnlockToast,
    dismissToast,
    clearAllToasts
  };

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      
      {/* Render toasts */}
      <div className="toast-container">
        {toasts.map((toast, index) => (
          <Toast
            key={toast.id}
            id={toast.id}
            type={toast.type}
            title={toast.title}
            message={toast.message}
            duration={toast.duration}
            onDismiss={dismissToast}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
}; 