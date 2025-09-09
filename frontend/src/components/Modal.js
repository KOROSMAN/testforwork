// Modal.js - Composant Modal personnalisé pour remplacer les alerts
import React from 'react';
import './Modal.css';

const Modal = ({ 
  isOpen, 
  onClose, 
  type = 'info', // 'success', 'error', 'warning', 'info', 'confirm'
  title, 
  message, 
  confirmText = 'OK',
  cancelText = 'Annuler',
  onConfirm,
  onCancel,
  showCancel = false,
  icon = null,
  children
}) => {
  if (!isOpen) return null;

  // Icônes par défaut selon le type
  const defaultIcons = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️',
    confirm: '❓'
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    } else {
      onClose();
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className={`modal-container modal-${type}`}>
        {/* Header */}
        <div className="modal-header">
          <div className="modal-icon">
            {icon || defaultIcons[type]}
          </div>
          <h3 className="modal-title">{title}</h3>
          <button 
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Fermer"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="modal-content">
          {message && <p className="modal-message">{message}</p>}
          {children}
        </div>

        {/* Actions */}
        <div className="modal-actions">
          {showCancel && (
            <button 
              className="btn btn-secondary"
              onClick={handleCancel}
            >
              {cancelText}
            </button>
          )}
          <button 
            className={`btn btn-${type === 'error' ? 'danger' : 'primary'}`}
            onClick={handleConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

// Composants spécialisés pour différents types de modals
export const SuccessModal = ({ isOpen, onClose, title, message, ...props }) => (
  <Modal
    isOpen={isOpen}
    onClose={onClose}
    type="success"
    title={title || "Succès"}
    message={message}
    confirmText="Parfait !"
    {...props}
  />
);

export const ErrorModal = ({ isOpen, onClose, title, message, ...props }) => (
  <Modal
    isOpen={isOpen}
    onClose={onClose}
    type="error"
    title={title || "Erreur"}
    message={message}
    confirmText="Compris"
    {...props}
  />
);

export const ConfirmModal = ({ isOpen, onClose, title, message, onConfirm, ...props }) => (
  <Modal
    isOpen={isOpen}
    onClose={onClose}
    type="confirm"
    title={title || "Confirmation"}
    message={message}
    confirmText="Confirmer"
    cancelText="Annuler"
    showCancel={true}
    onConfirm={onConfirm}
    {...props}
  />
);

export const WarningModal = ({ isOpen, onClose, title, message, ...props }) => (
  <Modal
    isOpen={isOpen}
    onClose={onClose}
    type="warning"
    title={title || "Attention"}
    message={message}
    confirmText="J'ai compris"
    {...props}
  />
);

// Hook personnalisé pour gérer les modals facilement
export const useModal = () => {
  const [modal, setModal] = React.useState({
    isOpen: false,
    type: 'info',
    title: '',
    message: '',
    onConfirm: null,
    onCancel: null
  });

  const showModal = (config) => {
    setModal({
      isOpen: true,
      ...config
    });
  };

  const hideModal = () => {
    setModal(prev => ({ ...prev, isOpen: false }));
  };

  const showSuccess = (title, message, onConfirm = null) => {
    showModal({
      type: 'success',
      title: title || 'Succès',
      message,
      onConfirm
    });
  };

  const showError = (title, message, onConfirm = null) => {
    showModal({
      type: 'error',
      title: title || 'Erreur',
      message,
      onConfirm
    });
  };

  const showConfirm = (title, message, onConfirm, onCancel = null) => {
    showModal({
      type: 'confirm',
      title: title || 'Confirmation',
      message,
      onConfirm,
      onCancel: onCancel || hideModal,
      showCancel: true
    });
  };

  const showWarning = (title, message, onConfirm = null) => {
    showModal({
      type: 'warning',
      title: title || 'Attention',
      message,
      onConfirm
    });
  };

  return {
    modal,
    showModal,
    hideModal,
    showSuccess,
    showError,
    showConfirm,
    showWarning
  };
};

export default Modal;