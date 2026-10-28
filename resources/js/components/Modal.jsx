import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export default function Modal({
  isOpen,
  onClose,
  title,
  description,
  headerExtra,
  children,
  footer,
  maxWidth = 'max-w-md',
  fullScreenMobile = false,
  bodyClassName = '',
}) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center ${
        fullScreenMobile ? 'p-0 sm:p-4' : 'p-3 sm:p-4'
      }`}
    >
      {/* Dim blurred overlay */}
      <div
        className="fixed inset-0 bg-gray-900/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog Box: 12px radius, soft shadow, border */}
      <div
        className={`relative w-full ${maxWidth} ${
          fullScreenMobile
            ? 'h-full sm:h-auto max-h-[100dvh] sm:max-h-[calc(100vh-2rem)] sm:max-h-[calc(100dvh-2rem)] rounded-none sm:rounded-xl'
            : 'max-h-[calc(100vh-2rem)] max-h-[calc(100dvh-2rem)] rounded-xl'
        } bg-white shadow-lg border border-gray-200 overflow-hidden z-10 flex flex-col`}
        role="dialog"
        aria-modal="true"
      >
        {/* Fixed Header (shrink-0) */}
        {(title || onClose || headerExtra) && (
          <div className="shrink-0 p-4 sm:p-5 pb-3 border-b border-gray-100 bg-white">
            <div className="flex items-start justify-between gap-3">
              <div>
                {title && (
                  <h3 className="text-base font-semibold text-gray-900 leading-snug">{title}</h3>
                )}
                {description && (
                  <p className="mt-1 text-xs text-gray-500">{description}</p>
                )}
              </div>
              {onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1 text-gray-400 hover:text-gray-700 rounded-md hover:bg-gray-100 transition-colors shrink-0 cursor-pointer"
                  aria-label="Close modal"
                >
                  <X className="w-4 h-4" strokeWidth={1.5} />
                </button>
              )}
            </div>
            {headerExtra && <div className="mt-3">{headerExtra}</div>}
          </div>
        )}

        {/* Scrollable Body (flex-1 min-h-0 overflow-y-auto) */}
        <div className={`flex-1 min-h-0 overflow-y-auto p-4 sm:p-5 ${bodyClassName}`}>
          {children}
        </div>

        {/* Fixed Footer (shrink-0): secondary and primary buttons aligned to right */}
        {footer && (
          <div className="shrink-0 flex items-center justify-end gap-2.5 px-4 sm:px-5 py-3 bg-white border-t border-gray-100">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
