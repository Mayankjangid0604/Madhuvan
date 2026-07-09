import React from "react";
import { 
  FileQuestion, 
  Search, 
  AlertCircle, 
  Inbox,
  Database,
  Filter,
  Plus,
  RefreshCw,
  FolderOpen,
  Users
} from "lucide-react";
import Button from "../buttons/Button";
import "./emptyState.css";

const EmptyState = ({ 
  icon,
  type = "noData",
  title,
  message,
  action,
  actionLabel,
  onAction,
  secondaryAction,
  secondaryLabel,
  onSecondaryAction,
  size = "md",
  animated = true
}) => {
  const iconMap = {
    noData: Inbox,
    search: Search,
    error: AlertCircle,
    filter: Filter,
    empty: Database,
    notFound: FileQuestion,
    folder: FolderOpen,
    users: Users,
    add: Plus
  };

  const defaultTitles = {
    noData: "No Data Available",
    search: "No Results Found",
    error: "Something Went Wrong",
    filter: "No Matches",
    empty: "Get Started",
    notFound: "Not Found",
    folder: "Empty Folder",
    users: "No Users Yet",
    add: "Nothing Here Yet"
  };

  const defaultMessages = {
    noData: "There's no data to display at the moment.",
    search: "Try adjusting your search terms or filters.",
    error: "An error occurred while loading data. Please try again.",
    filter: "No items match your current filters.",
    empty: "Start by adding your first item.",
    notFound: "The item you're looking for doesn't exist.",
    folder: "This folder is empty.",
    users: "No users have been added yet.",
    add: "Create your first entry to get started."
  };

  const IconComponent = icon || iconMap[type];
  const displayTitle = title || defaultTitles[type];
  const displayMessage = message || defaultMessages[type];

  const iconSizes = {
    sm: 36,
    md: 48,
    lg: 64
  };

  return (
    <div className={`empty-state empty-state--${size} ${animated ? 'empty-state--animated' : ''}`}>
      <div className={`empty-state__icon-wrapper empty-state__icon-wrapper--${type}`}>
        <IconComponent 
          className="empty-state__icon" 
          size={iconSizes[size]} 
          strokeWidth={1.5} 
        />
      </div>
      
      <div className="empty-state__content">
        <h3 className="empty-state__title">{displayTitle}</h3>
        <p className="empty-state__message">{displayMessage}</p>
      </div>

      {(action || onAction || secondaryAction || onSecondaryAction) && (
        <div className="empty-state__actions">
          {action || (onAction && (
            <Button 
              variant="primary" 
              onClick={onAction}
              icon={type === 'add' || type === 'empty' ? <Plus size={18} /> : undefined}
            >
              {actionLabel || "Get Started"}
            </Button>
          ))}
          {secondaryAction || (onSecondaryAction && (
            <Button 
              variant="secondary" 
              onClick={onSecondaryAction}
              icon={type === 'error' ? <RefreshCw size={16} /> : undefined}
            >
              {secondaryLabel || "Go Back"}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
};

export default EmptyState;