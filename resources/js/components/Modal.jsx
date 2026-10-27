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
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-fade-in"
        onClick={onClose}
      />

      {/* Modal Dialog Box */}
      <div
        className={`relative w-full ${maxWidth} ${
          fullScreenMobile
            ? 'h-full sm:h-auto max-h-[100dvh] sm:max-h-[calc(100vh-2rem)] sm:max-h-[calc(100dvh-2rem)] rounded-none sm:rounded-2xl'
            : 'max-h-[calc(100vh-2rem)] max-h-[calc(100dvh-2rem)] rounded-2xl'
        } bg-white shadow-xl border border-slate-200 overflow-hidden z-10 animate-scale-up flex flex-col`}
        role="dialog"
        aria-modal="true"
      >
        {/* Fixed Header (shrink-0) */}
        {(title || onClose || headerExtra) && (
          <div className="shrink-0 p-4 sm:p-6 pb-3 sm:pb-4 border-b border-slate-100 bg-white">
            <div className="flex items-start justify-between gap-3">
              <div>
                {title && (
                  <h3 className="text-lg font-semibold text-slate-900 leading-snug">{title}</h3>
                )}
                {description && (
                  <p className="mt-1 text-xs sm:text-sm text-slate-500">{description}</p>
                )}
              </div>
              {onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors shrink-0 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
            {headerExtra && <div className="mt-3">{headerExtra}</div>}
          </div>
        )}

        {/* Scrollable Body (flex-1 min-h-0 overflow-y-auto) */}
        <div className={`flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 ${bodyClassName}`}>
          {children}
        </div>

        {/* Fixed Footer (shrink-0) */}
        {footer && (
          <div className="shrink-0 flex items-center justify-between gap-3 px-4 sm:px-6 py-3 sm:py-4 bg-white border-t border-slate-100">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
