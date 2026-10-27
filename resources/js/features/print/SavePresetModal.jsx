import React, { useState } from 'react';
import Modal from '../../components/Modal';
import Button from '../../components/Button';
import { Bookmark, Sparkles } from 'lucide-react';

export default function SavePresetModal({
  isOpen,
  onClose,
  config,
  onSave,
  isSaving = false,
}) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please provide a preset name.');
      return;
    }
    setError('');
    onSave(name.trim());
  };

  const handleOpen = () => {
    setName('');
    setError('');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Save Sheet Preset"
      description="Save your current sheet grid, margins, and label dimensions for reuse."
      maxWidth="max-w-md"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSubmit}
            isLoading={isSaving}
            icon={Bookmark}
          >
            Save Preset
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">
            Preset Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (error) setError('');
            }}
            placeholder="e.g. Avery 5160 (3 × 10), My Shipping Grid"
            className="w-full h-9 px-3 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20"
            autoFocus
          />
          {error && <p className="mt-1 text-xs text-red-600 font-medium">{error}</p>}
        </div>

        {/* Configuration Summary Card */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs space-y-1.5">
          <div className="flex items-center justify-between text-gray-600">
            <span>Paper:</span>
            <span className="font-semibold text-gray-900 uppercase">
              {config?.paper_size === 'custom'
                ? `Custom (${Math.round((config?.custom_width || 210) * 10) / 10} × ${Math.round((config?.custom_height || 297) * 10) / 10} mm)`
                : config?.paper_size}{' '}
              ({config?.orientation})
            </span>
          </div>
          <div className="flex items-center justify-between text-gray-600">
            <span>Grid:</span>
            <span className="font-semibold text-gray-900">
              {config?.columns} cols × {config?.rows} rows ({config?.columns * config?.rows} labels)
            </span>
          </div>
          <div className="flex items-center justify-between text-gray-600">
            <span>Label Size:</span>
            <span className="font-semibold text-gray-900 font-mono">
              {config?.label_width} × {config?.label_height} mm
            </span>
          </div>
          <div className="flex items-center justify-between text-gray-600">
            <span>Margins & Gaps:</span>
            <span className="text-gray-700">
              T:{config?.margin_top} L:{config?.margin_left} | H-gap:{config?.gap_horizontal} V-gap:
              {config?.gap_vertical} mm
            </span>
          </div>
        </div>
      </form>
    </Modal>
  );
}
