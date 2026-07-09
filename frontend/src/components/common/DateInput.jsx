import React, { useState, useRef } from 'react';

/**
 * DateInput - A text-based date input that allows direct typing in DD-MM-YYYY format.
 * Also includes a calendar icon that opens the native date picker.
 * Stores value internally as YYYY-MM-DD (ISO) for backend compatibility.
 *
 * Props:
 *   value      - ISO date string (YYYY-MM-DD) or empty
 *   onChange   - function(isoDateString) called with YYYY-MM-DD or ''
 *   className  - CSS class for the input
 *   placeholder - placeholder text (default: "DD-MM-YYYY")
 *   ...rest    - any other input props
 */
const DateInput = ({ value, onChange, className = '', placeholder = 'DD-MM-YYYY', disabled = false, ...rest }) => {
    const isoToDisplay = (iso) => {
        if (!iso) return '';
        const parts = iso.split('-');
        if (parts.length !== 3) return iso;
        return `${parts[2]}-${parts[1]}-${parts[0]}`;
    };

    const displayToIso = (display) => {
        if (!display) return '';
        const clean = display.replace(/[^0-9]/g, '');
        if (clean.length === 8) {
            const dd = clean.substring(0, 2);
            const mm = clean.substring(2, 4);
            const yyyy = clean.substring(4, 8);
            return `${yyyy}-${mm}-${dd}`;
        }
        return '';
    };

    const [displayValue, setDisplayValue] = useState(isoToDisplay(value));
    const inputRef = useRef(null);
    const dateRef = useRef(null);

    React.useEffect(() => {
        const newDisplay = isoToDisplay(value);
        if (newDisplay !== displayValue) {
            setDisplayValue(newDisplay);
        }
    }, [value]);

    const formatInput = (raw) => {
        const digits = raw.replace(/[^0-9]/g, '');
        let formatted = '';
        for (let i = 0; i < digits.length && i < 8; i++) {
            if (i === 2 || i === 4) formatted += '-';
            formatted += digits[i];
        }
        return formatted;
    };

    const handleChange = (e) => {
        const raw = e.target.value;
        const formatted = formatInput(raw);
        setDisplayValue(formatted);

        const digits = formatted.replace(/[^0-9]/g, '');
        if (digits.length === 8) {
            const iso = displayToIso(formatted);
            const dd = parseInt(digits.substring(0, 2));
            const mm = parseInt(digits.substring(2, 4));
            const yyyy = parseInt(digits.substring(4, 8));

            if (dd >= 1 && dd <= 31 && mm >= 1 && mm <= 12 && yyyy >= 1900 && yyyy <= 2099) {
                onChange(iso);
            }
        } else if (digits.length === 0) {
            onChange('');
        }
    };

    const handleNativePickerChange = (e) => {
        const iso = e.target.value;
        setDisplayValue(isoToDisplay(iso));
        onChange(iso);
    };

    const openPicker = () => {
        if (disabled) return;
        const el = dateRef.current;
        if (!el) return;
        if (typeof el.showPicker === 'function') {
            try { el.showPicker(); return; } catch (err) { /* fall through */ }
        }
        el.click();
        el.focus();
    };

    return (
        <div className={`date-input-wrapper ${className}`} style={{
            position: 'relative',
            display: 'inline-flex',
            alignItems: 'center',
            width: '100%'
        }}>
            <input
                ref={inputRef}
                type="text"
                value={displayValue}
                onChange={handleChange}
                className={className}
                placeholder={placeholder}
                maxLength={10}
                inputMode="numeric"
                disabled={disabled}
                style={{ paddingRight: '36px', width: '100%' }}
                {...rest}
            />
            <button
                type="button"
                onClick={openPicker}
                disabled={disabled}
                title="Open calendar"
                aria-label="Open calendar"
                style={{
                    position: 'absolute',
                    right: '6px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'transparent',
                    border: 'none',
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#64748b'
                }}
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
            </button>
            <input
                ref={dateRef}
                type="date"
                value={value || ''}
                onChange={handleNativePickerChange}
                disabled={disabled}
                tabIndex={-1}
                aria-hidden="true"
                style={{
                    position: 'absolute',
                    right: '6px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    opacity: 0,
                    width: '26px',
                    height: '26px',
                    pointerEvents: 'none'
                }}
            />
        </div>
    );
};

export default DateInput;
