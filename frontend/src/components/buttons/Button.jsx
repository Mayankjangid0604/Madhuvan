import React from "react";
import "./button.css";

const Button = ({ 
  children, 
  onClick, 
  variant = "primary", 
  size = "md",
  disabled = false,
  fullWidth = false,
  loading = false,
  icon,
  iconPosition = "left",
  rounded = false,
  glass = false,
  type = "button",
  className = "",
  ...props 
}) => {
  const classNames = [
    'btn',
    `btn-${variant}`,
    `btn-${size}`,
    fullWidth ? 'btn-full' : '',
    loading ? 'btn-loading' : '',
    rounded ? 'btn-rounded' : '',
    glass ? 'btn-glass' : '',
    iconPosition === 'right' ? 'btn-icon-right' : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <button
      type={type}
      className={classNames}
      onClick={onClick}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <>
          <span className="btn-spinner"></span>
          <span className="btn-loading-text">Loading...</span>
        </>
      ) : (
        <>
          {icon && iconPosition === "left" && (
            <span className="btn-icon">{icon}</span>
          )}
          {children && <span className="btn-text">{children}</span>}
          {icon && iconPosition === "right" && (
            <span className="btn-icon">{icon}</span>
          )}
        </>
      )}
    </button>
  );
};

export default Button;