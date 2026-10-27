import React from 'react';

export default function Card({ children, className = '', ...props }) {
  return (
    <div
      className={`bg-white border border-gray-200 rounded-lg p-5 sm:p-6 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
