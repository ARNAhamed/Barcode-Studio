import React from 'react';

export default function Badge({
  children,
  variant = 'neutral', // 'neutral' | 'primary' | 'accent' | 'success' | 'warning' | 'danger'
  size = 'sm',
  className = '',
  dot = false,
}) {
  const sizeStyles = {
    xs: 'text-[11px] px-1.5 py-0.5',
    sm: 'text-xs px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
  };

  // Status variants are shown as small dot + plain gray text
  const isSemantic = ['success', 'warning', 'danger'].includes(variant);

  const dotColors = {
    neutral: 'bg-gray-400',
    primary: 'bg-indigo-600',
    accent: 'bg-indigo-600',
    success: 'bg-[#16A34A]',
    warning: 'bg-[#D97706]',
    danger: 'bg-[#DC2626]',
  };

  // Semantic statuses always show the dot by default
  const showDot = dot || isSemantic;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded bg-gray-100 text-gray-700 whitespace-nowrap shrink-0 font-normal leading-normal ${
        sizeStyles[size] || sizeStyles.sm
      } ${className}`}
    >
      {showDot && (
        <span
          className={`w-1.5 h-1.5 rounded-full shrink-0 ${
            dotColors[variant] || 'bg-gray-400'
          }`}
        />
      )}
      <span>{children}</span>
    </span>
  );
}
