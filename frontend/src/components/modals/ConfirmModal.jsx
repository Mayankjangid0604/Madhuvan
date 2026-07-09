import React from 'react';
import { AlertCircle, X, AlertTriangle } from 'lucide-react';
import Button from '../buttons/Button';
import './confirmModal.css';

const ConfirmModal = ({
    isOpen,
    title = "Confirm Action",
    message,
    onConfirm,
    onCancel,
    confirmText = "Confirm",
    cancelText = "Cancel",
    type = "warning" // can be 'warning', 'danger', or 'info'
}) => {
    if (!isOpen) return null;

    const getIcon = () => {
        switch (type) {
            case 'danger':
                return <AlertTriangle size={20} />;
            case 'warning':
            case 'info':
            default:
                return <AlertCircle size={20} />;
        }
    };

    return (
        <div className="modal-overlay" onClick={onCancel}>
            <div className={`modal-content confirm-modal ${type}`} onClick={(e) => e.stopPropagation()}>
                <div className={`modal-header ${type}`}>
                    <h3>
                        {getIcon()}
                        {title}
                    </h3>
                    <button className="close-btn" onClick={onCancel}>
                        <X size={20} />
                    </button>
                </div>

                <div className="modal-body">
                    <p className="confirm-message">{message}</p>
                </div>

                <div className="modal-footer">
                    <Button variant="secondary" onClick={onCancel}>
                        {cancelText}
                    </Button>
                    <Button
                        variant={type === 'danger' ? 'danger' : 'primary'}
                        onClick={() => {
                            onConfirm();
                            onCancel();
                        }}
                    >
                        {confirmText}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmModal;
