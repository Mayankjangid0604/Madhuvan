import React from "react";
import { ChevronRight, Home } from "lucide-react";
import "./pageHeader.css";

const PageHeader = ({ 
  title, 
  subtitle, 
  action,
  breadcrumbs = []
}) => {
  return (
    <div className="page-header">
      {breadcrumbs.length > 0 && (
        <nav className="page-header__breadcrumbs">
          <a href="/" className="breadcrumb-item">
            <Home size={14} />
            <span>Home</span>
          </a>
          {breadcrumbs.map((crumb, index) => (
            <React.Fragment key={index}>
              <ChevronRight size={14} className="breadcrumb-separator" />
              {crumb.path ? (
                <a href={crumb.path} className="breadcrumb-item">
                  {crumb.label}
                </a>
              ) : (
                <span className="breadcrumb-item breadcrumb-item--current">
                  {crumb.label}
                </span>
              )}
            </React.Fragment>
          ))}
        </nav>
      )}

      <div className="page-header__main">
        <div className="page-header__info">
          <h1 className="page-header__title">{title}</h1>
          {subtitle && (
            <p className="page-header__subtitle">{subtitle}</p>
          )}
        </div>

        {action && (
          <div className="page-header__actions">
            {action}
          </div>
        )}
      </div>
    </div>
  );
};

export default PageHeader;
