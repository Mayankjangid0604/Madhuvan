import React from "react";
import "./card.css";

const Card = ({ 
  children, 
  title, 
  subtitle,
  headerAction,
  padding = "md",
  hover = false,
  glass = true,
  variant = "default",
  className = "",
  noBorder = false,
  ...props 
}) => {
  const classNames = [
    'card',
    `card-padding-${padding}`,
    `card-${variant}`,
    hover ? 'card-hover' : '',
    glass ? 'card-glass' : '',
    noBorder ? 'card-no-border' : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={classNames} {...props}>
      {(title || subtitle || headerAction) && (
        <div className="card-header">
          <div className="card-header-text">
            {title && <h3 className="card-title">{title}</h3>}
            {subtitle && <p className="card-subtitle">{subtitle}</p>}
          </div>
          {headerAction && <div className="card-header-action">{headerAction}</div>}
        </div>
      )}
      <div className="card-body">
        {children}
      </div>
    </div>
  );
};

export default Card;