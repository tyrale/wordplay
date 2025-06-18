import React from 'react';
import './ConfirmationDialog.css';

export interface ConfirmationDialogProps {
  isVisible: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  isVisible,
  title,
  message,
  confirmText = 'Yes',
  cancelText = 'Cancel',
  onConfirm,
  onCancel
}) => {
  if (!isVisible) return null;

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onCancel();
    }
  };

  return (
    <div className="confirmation-dialog-overlay" onClick={handleOverlayClick}>
      <div className="confirmation-dialog">
        <div className="confirmation-dialog__content">
          <h3 className="confirmation-dialog__title">{title}</h3>
          <p className="confirmation-dialog__message">{message}</p>
          
          <div className="confirmation-dialog__actions">
            <button 
              className="confirmation-dialog__action confirmation-dialog__action--cancel"
              onClick={onCancel}
            >
              {cancelText}
            </button>
            <button 
              className="confirmation-dialog__action confirmation-dialog__action--confirm"
              onClick={onConfirm}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}; 