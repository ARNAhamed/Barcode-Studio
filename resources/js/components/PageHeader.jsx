import React from 'react';

export default function PageHeader({ title, description, action, children, className = '' }) {
  return (
    <div className={`pb-5 border-b border-gray-200 ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="min-w-0 max-w-2xl">
          <h1 className="text-xl font-semibold text-gray-900 leading-tight truncate" title={title}>
            {title}
          </h1>
          {description && (
            <p
              className="text-xs sm:text-sm text-gray-500 mt-1 max-w-[640px] truncate"
              title={typeof description === 'string' ? description : undefined}
            >
              {description}
            </p>
          )}
        </div>
        {(action || children) && (
          <div className="flex items-center gap-2 flex-wrap shrink-0 self-start sm:self-center">
            {action}
            {children}
          </div>
        )}
      </div>
    </div>
  );
}
