import React from 'react';
import Button from './Button';

export default function EmptyState({
  icon: Icon,
  title,
  description,
  actionText,
  onAction,
  actionIcon,
  children,
  className = '',
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center p-8 sm:p-12 bg-white rounded-lg border border-gray-200 ${className}`}
    >
      {Icon && (
        <Icon className="w-7 h-7 text-gray-400 mb-3" strokeWidth={1.5} />
      )}
      <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      {description && (
        <p className="mt-1 text-xs text-gray-500 max-w-sm leading-relaxed">{description}</p>
      )}
      {actionText && onAction && (
        <div className="mt-4">
          <Button onClick={onAction} icon={actionIcon} variant="primary" size="sm">
            {actionText}
          </Button>
        </div>
      )}
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}
