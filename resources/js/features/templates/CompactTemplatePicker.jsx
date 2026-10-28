import React, { useState, useRef, useEffect } from 'react';
import {
  ChevronDown,
  RotateCcw,
  Sparkles,
  Bookmark,
  MoreVertical,
  Plus,
  Sliders,
} from 'lucide-react';

export default function CompactTemplatePicker({
  type = 'barcode',
  templates = [],
  appliedTemplate = null,
  isModified = false,
  onSelectTemplate,
  onResetToTemplate,
  onOpenSaveModal,
  onUpdateTemplate,
  onOpenManager,
  isUpdating = false,
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const currentTemplates = templates.filter((t) => t.type === type);

  useEffect(() => {
    const handleOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const handleSelectChange = (e) => {
    const val = e.target.value;
    if (!val) {
      onSelectTemplate(null);
      return;
    }
    const found = currentTemplates.find((t) => String(t.id) === String(val));
    if (found) {
      onSelectTemplate(found);
    }
  };

  return (
    <div className="relative">
      <div className="flex items-center gap-1.5">
        {/* Template Select Dropdown */}
        <div className="relative flex-1 min-w-0">
          <select
            value={appliedTemplate?.id || ''}
            onChange={handleSelectChange}
            className="w-full h-9 pl-3 pr-8 bg-white border border-gray-300 rounded-lg text-xs font-medium text-gray-800 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 appearance-none truncate cursor-pointer transition-colors"
          >
            <option value="">Custom (No template)</option>
            {currentTemplates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} {t.is_default ? '★ (Default)' : ''}
              </option>
            ))}
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none stroke-[1.5]" />
        </div>

        {/* If Modified: Quick Update & Reset */}
        {appliedTemplate && isModified && (
          <button
            type="button"
            onClick={onUpdateTemplate}
            disabled={isUpdating}
            className="h-9 px-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-semibold shrink-0 cursor-pointer disabled:opacity-50 transition-colors"
            title="Save changes to template"
          >
            {isUpdating ? '...' : 'Update'}
          </button>
        )}

        {/* Template Actions Menu */}
        <div className="relative shrink-0" ref={menuRef}>
          <button
            type="button"
            onClick={() => setIsMenuOpen((prev) => !prev)}
            className="w-9 h-9 border border-gray-300 hover:bg-gray-50 rounded-lg flex items-center justify-center text-gray-600 hover:text-gray-900 cursor-pointer transition-colors"
            title="Template actions"
          >
            <MoreVertical className="w-3.5 h-3.5 stroke-[1.5]" />
          </button>

          {isMenuOpen && (
            <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-lg shadow-lg border border-gray-200 py-1.5 z-40 text-xs animate-in fade-in zoom-in-95 duration-100">
              <button
                type="button"
                onClick={() => {
                  onOpenSaveModal();
                  setIsMenuOpen(false);
                }}
                className="w-full px-3 py-1.5 text-left text-gray-700 hover:bg-gray-50 flex items-center gap-2 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-gray-400" />
                <span>Save as template...</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onOpenManager();
                  setIsMenuOpen(false);
                }}
                className="w-full px-3 py-1.5 text-left text-gray-700 hover:bg-gray-50 flex items-center gap-2 cursor-pointer"
              >
                <Sliders className="w-3.5 h-3.5 text-gray-400" />
                <span>Manage templates...</span>
              </button>

              {appliedTemplate && isModified && (
                <>
                  <div className="h-px bg-gray-100 my-1" />
                  <button
                    type="button"
                    onClick={() => {
                      onResetToTemplate();
                      setIsMenuOpen(false);
                    }}
                    className="w-full px-3 py-1.5 text-left text-gray-700 hover:bg-gray-50 flex items-center gap-2 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-gray-400" />
                    <span>Discard modifications</span>
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
