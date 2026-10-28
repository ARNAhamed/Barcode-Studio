import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Bookmark, Sparkles } from 'lucide-react';
import Modal from '../../components/Modal';
import Button from '../../components/Button';
import { createTemplate } from '../../api/templates';
import { hasPlaceholders } from '../../utils/placeholders';

export default function SaveTemplateModal({
  isOpen,
  onClose,
  type = 'barcode',
  currentDesign,
  captureThumbnail,
  onSaved,
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [includeLabelPattern, setIncludeLabelPattern] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [nameError, setNameError] = useState(null);

  const activeSettings = type === 'barcode' ? currentDesign.barcodeSettings : currentDesign.qrSettings;
  const currentPattern =
    activeSettings.labelPattern ||
    (hasPlaceholders(activeSettings.label) ? activeSettings.label : '{name} • {price}');

  useEffect(() => {
    if (isOpen) {
      setName('');
      setDescription('');
      setIsDefault(false);
      setIncludeLabelPattern(Boolean(activeSettings.label));
      setNameError(null);
    }
  }, [isOpen, activeSettings.label]);

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!name.trim()) {
      setNameError('Template name is required.');
      return;
    }

    setIsSaving(true);
    setNameError(null);

    try {
      // 1. Prepare settings clean of encoded value
      const settingsToSave = {
        ...activeSettings,
        artboard: {
          ...currentDesign.artboardSettings,
        },
        dpi: currentDesign.dpi || 300,
      };

      delete settingsToSave.value;

      if (includeLabelPattern) {
        settingsToSave.labelPattern = currentPattern;
      } else {
        delete settingsToSave.labelPattern;
        settingsToSave.label = '';
      }

      // 2. Capture thumbnail blob if available
      let thumbnailBlob = null;
      if (typeof captureThumbnail === 'function') {
        try {
          thumbnailBlob = await captureThumbnail();
        } catch (captureErr) {
          console.warn('Failed to capture template thumbnail:', captureErr);
        }
      }

      // 3. Build multipart form data
      const formData = new FormData();
      formData.append('name', name.trim());
      formData.append('type', type);
      if (description.trim()) {
        formData.append('description', description.trim());
      }
      formData.append('is_default', isDefault ? '1' : '0');
      formData.append('settings', JSON.stringify(settingsToSave));

      if (thumbnailBlob) {
        formData.append('thumbnail', thumbnailBlob, 'thumbnail.png');
      }

      const res = await createTemplate(formData);
      const created = res.data;

      toast.success(`Template "${created.name}" saved!`);
      if (onSaved) {
        onSaved(created);
      }
      onClose();
    } catch (err) {
      console.error('Save template error:', err);
      const msg = err.response?.data?.message || err.response?.data?.errors?.name?.[0] || 'Failed to save template.';
      if (err.response?.data?.errors?.name) {
        setNameError(err.response.data.errors.name[0]);
      } else {
        toast.error(msg);
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Save as Design Template"
      description="Store the dimensions, styling, and label pattern as a reusable template."
      maxWidth="max-w-md"
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : 'Save Template'}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name Input */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">
            Template Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (nameError) setNameError(null);
            }}
            placeholder={type === 'barcode' ? 'e.g. Retail Shelf Label' : 'e.g. Modern QR Card'}
            autoFocus
            className={`w-full h-9 px-3 bg-white border rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none transition-colors ${
              nameError
                ? 'border-red-400 focus:ring-2 focus:ring-red-100'
                : 'border-gray-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20'
            }`}
          />
          {nameError && (
            <p className="mt-1 text-xs text-red-600 font-medium">{nameError}</p>
          )}
        </div>

        {/* Description Input */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">
            Description <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="Usage notes, printer specs, or department..."
            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 transition-colors resize-none"
          />
        </div>

        {/* Checkbox: Set as Default */}
        <div className="pt-1">
          <label className="flex items-start gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              className="mt-0.5 w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500 cursor-pointer"
            />
            <div className="text-xs">
              <span className="font-medium text-gray-900">Set as default {type === 'barcode' ? 'Barcode' : 'QR Code'} template</span>
              <p className="text-gray-500 mt-0.5">
                New {type === 'barcode' ? 'barcode' : 'QR code'} designs will automatically start with these settings.
              </p>
            </div>
          </label>
        </div>

        {/* Checkbox: Include Label Pattern */}
        <div className="pt-1 border-t border-gray-100">
          <label className="flex items-start gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={includeLabelPattern}
              onChange={(e) => setIncludeLabelPattern(e.target.checked)}
              className="mt-0.5 w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500 cursor-pointer"
            />
            <div className="text-xs">
              <span className="font-medium text-gray-900">Include label text pattern</span>
              <p className="text-gray-500 mt-0.5">
                Pattern: <code className="bg-gray-100 px-1 py-0.5 rounded font-mono text-gray-700">{currentPattern}</code>
              </p>
            </div>
          </label>
        </div>
      </form>
    </Modal>
  );
}
