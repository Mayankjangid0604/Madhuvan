import React, { useState, useEffect } from 'react';
import { X, HelpCircle } from 'lucide-react';
import Button from '../buttons/Button';
import './confirmModal.css';

const PromptModal = ({
    isOpen,
    title = "Input Required",
    message,
    onConfirm,
    onCancel,
    confirmText = "Submit",
    cancelText = "Cancel",
    placeholder = "Enter text...",
    defaultValue = "",
    type = "info"
}) => {
    const [inputValue, setInputValue] = useState(defaultValue);

    useEffect(() => {
        if (isOpen) {
            setInputValue(defaultValue);
        }
    }, [isOpen, defaultValue]);

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onCancel}>
            <div className={`modal-content confirm-modal ${type}`} onClick={(e) => e.stopPropagation()}>
                <div className={`modal-header ${type}`}>
                    <h3>
                        <HelpCircle size={20} />
                        {title}
                    </h3>
                    <button className="close-btn" onClick={onCancel}>
                        <X size={20} />
                    </button>
                </div>

                <div className="modal-body">
                    <p className="confirm-message">{message}</p>
                    <div style={{ marginTop: '16px' }}>
                        <input
                            type="text"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            placeholder={placeholder}
                            autoFocus
                            style={{
                                width: '100%',
                                padding: '10px 12px',
                                borderRadius: '8px',
                                border: '1px solid #e2e8f0',
                                fontSize: '14px',
                                outline: 'none',
                                transition: 'border-color 0.2s'
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    onConfirm(inputValue);
                                }
                            }}
                        />
                    </div>
                </div>

                <div className="modal-footer">
                    <Button variant="secondary" onClick={onCancel}>
                        {cancelText}
                    </Button>
                    <Button
                        variant="primary"
                        onClick={() => onConfirm(inputValue)}
                    >
                        {confirmText}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default PromptModal;
