import React from 'react';
import {
  Bookmark,
  Sparkles,
  RotateCcw,
  Sliders,
  Star,
  Layers,
  ChevronDown,
} from 'lucide-react';
import Button from '../../components/Button';

export default function TemplateBar({
  type = 'barcode', // 'barcode' | 'qr'
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
  const currentTemplates = templates.filter((t) => t.type === type);

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
    <div className="p-4 bg-gray-50/80 border-b border-gray-200">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <Bookmark className="w-3.5 h-3.5 text-indigo-600 stroke-[2] shrink-0" />
          <span className="text-xs font-semibold text-gray-900 tracking-tight">Design Template</span>

          {appliedTemplate && isModified && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-200 select-none">
              Modified
            </span>
          )}
        </div>

        {appliedTemplate && isModified && (
          <button
            type="button"
            onClick={onResetToTemplate}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-600 hover:text-gray-900 transition-colors cursor-pointer"
            title="Discard changes and restore applied template settings"
          >
            <RotateCcw className="w-3 h-3 stroke-[1.5]" />
            <span>Reset</span>
          </button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        {/* Template Select Dropdown with optional thumbnail */}
        <div className="relative flex-1 min-w-0 flex items-center">
          {appliedTemplate?.thumbnail_url && (
            <div className="absolute left-2 w-5 h-5 rounded border border-gray-200 bg-white overflow-hidden pointer-events-none z-10 flex items-center justify-center">
              <img
                src={appliedTemplate.thumbnail_url}
                alt=""
                className="max-h-full max-w-full object-contain"
              />
            </div>
          )}

          <select
            value={appliedTemplate?.id || ''}
            onChange={handleSelectChange}
            className={`w-full h-8 ${
              appliedTemplate?.thumbnail_url ? 'pl-8' : 'pl-2.5'
            } pr-8 bg-white border border-gray-300 rounded-lg text-xs font-medium text-gray-800 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 appearance-none truncate transition-colors cursor-pointer`}
          >
            <option value="">Custom Design (No template)</option>
            {currentTemplates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} {t.is_default ? '★ (Default)' : ''}
              </option>
            ))}
          </select>

          <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2.5 pointer-events-none stroke-[1.5]" />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5 shrink-0">
          {appliedTemplate && isModified && (
            <button
              type="button"
              onClick={onUpdateTemplate}
              disabled={isUpdating}
              className="h-8 px-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
              title="Save current modifications back to this template"
            >
              {isUpdating ? 'Updating...' : 'Update'}
            </button>
          )}

          <button
            type="button"
            onClick={onOpenSaveModal}
            className="h-8 px-2.5 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 rounded-lg text-xs font-medium transition-colors cursor-pointer"
            title="Save current design as a new template"
          >
            Save as...
          </button>

          <button
            type="button"
            onClick={onOpenManager}
            className="h-8 px-2.5 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 rounded-lg text-xs font-medium transition-colors cursor-pointer"
            title="Open Template Manager"
          >
            Manage
          </button>
        </div>
      </div>
    </div>
  );
}
