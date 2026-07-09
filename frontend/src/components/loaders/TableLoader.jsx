import React from "react";
import "./tableLoader.css";

const TableLoader = ({ 
  rows = 5, 
  columns = 5,
  hasCheckbox = false,
  hasActions = false
}) => {
  return (
    <div className="table-loader">
      <div className="table-loader__header">
        {hasCheckbox && <div className="skeleton skeleton--checkbox" />}
        {Array.from({ length: columns }).map((_, index) => (
          <div key={`header-${index}`} className="skeleton skeleton--header" />
        ))}
        {hasActions && <div className="skeleton skeleton--actions" />}
      </div>

      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={`row-${rowIndex}`} className="table-loader__row">
          {hasCheckbox && <div className="skeleton skeleton--checkbox" />}
          {Array.from({ length: columns }).map((_, colIndex) => (
            <div 
              key={`cell-${rowIndex}-${colIndex}`} 
              className="skeleton skeleton--cell"
              style={{
                width: colIndex === 0 ? '30%' : colIndex === columns - 1 ? '15%' : 'auto'
              }}
            />
          ))}
          {hasActions && <div className="skeleton skeleton--actions" />}
        </div>
      ))}
    </div>
  );
};

export default TableLoader;
