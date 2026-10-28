import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  Search,
  X,
  Star,
  Copy,
  Pencil,
  Trash2,
  Check,
  CheckCircle2,
  Barcode as BarcodeIcon,
  QrCode as QrCodeIcon,
  Layers,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

import Modal from '../../components/Modal';
import Button from '../../components/Button';
import Skeleton from '../../components/Skeleton';
import Badge from '../../components/Badge';
import {
  getTemplates,
  updateTemplate,
  deleteTemplate,
  duplicateTemplate,
  setDefaultTemplate,
} from '../../api/templates';

export default function TemplateManagerModal({
  isOpen,
  onClose,
  activeMode = 'barcode', // 'barcode' | 'qr'
  appliedTemplateId = null,
  onApplyTemplate,
}) {
  const queryClient = useQueryClient();
  const [filterType, setFilterType] = useState('all'); // 'all' | 'barcode' | 'qr'
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [deletingId, setDeletingId] = useState(null);

  // Fetch templates query
  const {
    data: templates = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['templates', filterType, searchQuery],
    queryFn: async () => {
      const params = {};
      if (filterType !== 'all') params.type = filterType;
      if (searchQuery.trim()) params.search = searchQuery.trim();
      const res = await getTemplates(params);
      return res.data || [];
    },
    enabled: isOpen,
  });

  // Mutation: Rename
  const renameMutation = useMutation({
    mutationFn: async ({ id, name }) => {
      return await updateTemplate(id, { name });
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      toast.success('Template renamed successfully.');
      setEditingId(null);
    },
    onError: (err) => {
      const msg = err.response?.data?.errors?.name?.[0] || err.response?.data?.message || 'Failed to rename template.';
      toast.error(msg);
    },
  });

  // Mutation: Duplicate
  const duplicateMutation = useMutation({
    mutationFn: async (id) => {
      return await duplicateTemplate(id);
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      toast.success(`Duplicated "${res.data.name}"`);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to duplicate template.');
    },
  });

  // Mutation: Set as Default
  const setDefaultMutation = useMutation({
    mutationFn: async (id) => {
      return await setDefaultTemplate(id);
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      toast.success(`"${res.data.name}" set as default ${res.data.type} template.`);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to set default template.');
    },
  });

  // Mutation: Delete
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      return await deleteTemplate(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      toast.success('Template deleted. Existing codes remain intact.');
      setDeletingId(null);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to delete template.');
      setDeletingId(null);
    },
  });

  const handleStartRename = (template) => {
    setEditingId(template.id);
    setEditingName(template.name);
  };

  const handleSaveRename = (id) => {
    if (!editingName.trim()) {
      toast.error('Template name cannot be empty.');
      return;
    }
    renameMutation.mutate({ id, name: editingName.trim() });
  };

  const handleApply = (template) => {
    if (onApplyTemplate) {
      onApplyTemplate(template);
    }
    onClose();
  };

  const formatSize = (template) => {
    const s = template.settings || {};
    const art = s.artboard || {};
    if (art.width && art.height) {
      return `${art.width} × ${art.height} ${art.unit || 'mm'}`;
    }
    if (template.type === 'barcode') {
      return `${s.format || 'CODE128'} • ${s.width || 260}×${s.height || 100} ${s.unit || 'px'}`;
    }
    return `QR • ${s.size || 220} ${s.unit || 'px'}`;
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Manage Design Templates"
      description="Create, rename, duplicate, or set default templates for barcodes and QR codes."
      maxWidth="max-w-3xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <p className="text-xs text-gray-500">
            Deleting a template never alters codes that were created from it.
          </p>
          <Button variant="secondary" onClick={onClose}>
            Done
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Search & Filter Toolbar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search templates by name, format, or notes..."
              className="w-full h-9 pl-9 pr-8 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Type Filter Chips */}
          <div className="flex items-center gap-1 bg-gray-100 p-0.5 rounded-lg shrink-0">
            {[
              { id: 'all', label: 'All' },
              { id: 'barcode', label: 'Barcode' },
              { id: 'qr', label: 'QR Code' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterType(tab.id)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                  filterType === tab.id
                    ? 'bg-white text-gray-900 shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Templates List */}
        <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 overflow-hidden bg-white">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="w-12 h-12 rounded-lg shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="w-48 h-4 rounded" />
                    <Skeleton className="w-24 h-3 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : isError ? (
            <div className="p-8 text-center">
              <p className="text-sm text-red-600 mb-2">Failed to load templates.</p>
              <Button variant="secondary" size="sm" onClick={() => refetch()}>
                Retry
              </Button>
            </div>
          ) : templates.length === 0 ? (
            <div className="py-12 px-4 text-center">
              <Layers className="w-10 h-10 text-gray-300 mx-auto mb-2 stroke-[1.5]" />
              <h4 className="text-sm font-semibold text-gray-900">No templates found</h4>
              <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                {searchQuery
                  ? `No templates matched "${searchQuery}". Try a different keyword.`
                  : `No ${filterType !== 'all' ? filterType : ''} templates available.`}
              </p>
            </div>
          ) : (
            templates.map((tpl) => {
              const isDefault = Boolean(tpl.is_default);
              const isApplied = appliedTemplateId === tpl.id;
              const isEditing = editingId === tpl.id;
              const isDeleting = deletingId === tpl.id;

              return (
                <div
                  key={tpl.id}
                  className={`p-3.5 flex items-center justify-between gap-3 hover:bg-gray-50/75 transition-colors ${
                    isApplied ? 'bg-indigo-50/30' : ''
                  }`}
                >
                  {/* Left: Thumbnail + Info */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {/* Thumbnail container */}
                    <div className="w-12 h-12 rounded-lg border border-gray-200 bg-[#F4F4F5] flex items-center justify-center overflow-hidden shrink-0">
                      {tpl.thumbnail_url ? (
                        <img
                          src={tpl.thumbnail_url}
                          alt={tpl.name}
                          className="max-h-full max-w-full object-contain"
                          loading="lazy"
                        />
                      ) : tpl.type === 'barcode' ? (
                        <BarcodeIcon className="w-6 h-6 text-gray-400 stroke-[1.5]" />
                      ) : (
                        <QrCodeIcon className="w-6 h-6 text-gray-400 stroke-[1.5]" />
                      )}
                    </div>

                    {/* Metadata & Title */}
                    <div className="min-w-0 flex-1">
                      {isEditing ? (
                        <div className="flex items-center gap-2 max-w-md">
                          <input
                            type="text"
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveRename(tpl.id);
                              if (e.key === 'Escape') setEditingId(null);
                            }}
                            autoFocus
                            className="h-8 px-2.5 bg-white border border-indigo-600 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 flex-1"
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveRename(tpl.id)}
                            disabled={renameMutation.isPending}
                            className="p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors cursor-pointer"
                            title="Save name"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                            title="Cancel"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div>
                          <div className="flex items-center gap-2">
                            <h4
                              className="text-sm font-semibold text-gray-900 truncate"
                              title={tpl.name}
                            >
                              {tpl.name}
                            </h4>

                            {isDefault && (
                              <span
                                className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 border border-amber-200/80 px-1.5 py-0.5 rounded"
                                title="Default template for new designs"
                              >
                                <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                                <span>Default</span>
                              </span>
                            )}

                            {isApplied && (
                              <span className="text-[11px] font-medium text-indigo-700 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded">
                                Applied
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5 flex-wrap">
                            <span className="uppercase font-mono text-[11px]">
                              {tpl.type === 'barcode' ? 'Barcode' : 'QR Code'}
                            </span>
                            <span>•</span>
                            <span className="font-mono text-[11px] text-gray-600">
                              {formatSize(tpl)}
                            </span>
                            {tpl.settings?.labelPattern && (
                              <>
                                <span>•</span>
                                <span className="text-[11px] text-gray-400 truncate max-w-[160px]" title={tpl.settings.labelPattern}>
                                  {tpl.settings.labelPattern}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Actions */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {isDeleting ? (
                      <div className="flex items-center gap-1.5 bg-red-50 p-1 rounded-lg border border-red-200">
                        <span className="text-xs text-red-700 font-medium px-1">Delete?</span>
                        <button
                          type="button"
                          onClick={() => deleteMutation.mutate(tpl.id)}
                          disabled={deleteMutation.isPending}
                          className="px-2 py-1 text-xs font-medium bg-red-600 hover:bg-red-700 text-white rounded transition-colors cursor-pointer disabled:opacity-50"
                        >
                          Confirm
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingId(null)}
                          className="px-2 py-1 text-xs font-medium text-gray-600 hover:text-gray-800 rounded transition-colors cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <>
                        {/* Apply Button */}
                        <Button
                          variant={isApplied ? 'secondary' : 'primary'}
                          size="sm"
                          onClick={() => handleApply(tpl)}
                          className="text-xs"
                        >
                          {isApplied ? 'Re-apply' : 'Apply'}
                        </Button>

                        {/* Set as Default (star icon) */}
                        <button
                          type="button"
                          onClick={() => setDefaultMutation.mutate(tpl.id)}
                          disabled={isDefault || setDefaultMutation.isPending}
                          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                            isDefault
                              ? 'text-amber-500 cursor-default'
                              : 'text-gray-400 hover:text-amber-600 hover:bg-amber-50'
                          }`}
                          title={isDefault ? 'Default template' : 'Set as default template'}
                        >
                          <Star
                            className={`w-4 h-4 ${isDefault ? 'fill-amber-500' : ''}`}
                            strokeWidth={1.5}
                          />
                        </button>

                        {/* Rename */}
                        <button
                          type="button"
                          onClick={() => handleStartRename(tpl)}
                          className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                          title="Rename template"
                        >
                          <Pencil className="w-4 h-4" strokeWidth={1.5} />
                        </button>

                        {/* Duplicate */}
                        <button
                          type="button"
                          onClick={() => duplicateMutation.mutate(tpl.id)}
                          disabled={duplicateMutation.isPending}
                          className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                          title="Duplicate template"
                        >
                          <Copy className="w-4 h-4" strokeWidth={1.5} />
                        </button>

                        {/* Delete */}
                        <button
                          type="button"
                          onClick={() => setDeletingId(tpl.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          title="Delete template"
                        >
                          <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </Modal>
  );
}
