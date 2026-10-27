import React from 'react';
import { Loader2 } from 'lucide-react';

export default function Button({
  children,
  type = 'button',
  variant = 'primary', // 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'danger-solid'
  size = 'md', // 'sm' (32px) | 'md' (36px) | 'xs' (28px)
  isLoading = false,
  disabled = false,
  icon: Icon,
  className = '',
  ...props
}) {
  const baseStyles =
    'inline-flex items-center justify-center font-medium transition-colors duration-150 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed select-none cursor-pointer whitespace-nowrap shrink-0';

  const sizeStyles = {
    xs: 'h-7 px-2.5 text-xs gap-1',
    sm: 'h-8 px-3 text-xs gap-1.5',
    md: 'h-9 px-3.5 text-sm gap-1.5',
    lg: 'h-9 px-4 text-sm gap-2',
  };

  const variantStyles = {
    primary:
      'bg-indigo-600 text-white hover:bg-indigo-700 active:bg-indigo-800',
    secondary:
      'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 active:bg-gray-100',
    outline:
      'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 active:bg-gray-100',
    ghost:
      'text-gray-600 hover:text-gray-900 hover:bg-gray-100',
    danger:
      'bg-white border border-gray-300 text-red-600 hover:bg-red-50 hover:border-red-200',
    'danger-solid':
      'bg-red-600 text-white hover:bg-red-700 active:bg-red-800',
  };

  return (
    <button
      type={type}
      disabled={disabled || isLoading}
      className={`${baseStyles} ${sizeStyles[size] || sizeStyles.md} ${
        variantStyles[variant] || variantStyles.primary
      } ${className}`}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin shrink-0" strokeWidth={1.5} />
      ) : Icon ? (
        <Icon className="w-4 h-4 shrink-0" strokeWidth={1.5} />
      ) : null}
      {children && <span>{children}</span>}
    </button>
  );
}
