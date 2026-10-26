import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { LayoutGrid, Trash2, Plus } from 'lucide-react';

import Filters from '../features/gallery/Filters';
import CodeGrid from '../features/gallery/CodeGrid';
import Modal from '../components/Modal';
import Button from '../components/Button';
import { getCodes, deleteCode, restoreCode } from '../api/codes';
import { getBinSummary } from '../api/bin';

export default function GalleryPage() {
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all'); // 'all' | 'barcode' | 'qr'

  // Delete modal state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [codeToDelete, setCodeToDelete] = useState(null);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  // Query: Bin Summary counts
  const { data: binSummary } = useQuery({
    queryKey: ['bin-summary'],
    queryFn: getBinSummary,
  });

  // Query: All codes (for counts and fallback)
  const { data: allCodesResponse } = useQuery({
    queryKey: ['codes-all'],
    queryFn: () => getCodes(),
  });

  // Query: Filtered codes
  const { data: codesResponse, isLoading } = useQuery({
    queryKey: ['codes', { search: debouncedSearch, type: typeFilter }],
    queryFn: () =>
      getCodes({
        search: debouncedSearch || undefined,
        type: typeFilter !== 'all' ? typeFilter : undefined,
      }),
  });

  const invalidateQueries = () => {
    queryClient.invalidateQueries({ queryKey: ['codes'] });
    queryClient.invalidateQueries({ queryKey: ['codes-all'] });
    queryClient.invalidateQueries({ queryKey: ['codes-trash'] });
    queryClient.invalidateQueries({ queryKey: ['bin-summary'] });
  };

  // Mutation: Restore code (for Undo toast)
  const restoreMutation = useMutation({
    mutationFn: (id) => restoreCode(id),
    onSuccess: (res) => {
      invalidateQueries();
      toast.success(res.message || 'Design restored to gallery.');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to restore design.');
    },
  });

  // Mutation: Delete Code (move to Recycle Bin)
  const deleteMutation = useMutation({
    mutationFn: (id) => deleteCode(id),
    onSuccess: (res, deletedId) => {
      invalidateQueries();
      const codeName = codeToDelete?.name || 'Design';
      handleCloseDeleteModal();

      // Show toast with interactive Undo button
      toast(
        (t) => (
          <div className="flex items-center justify-between gap-3 w-full">
            <span className="text-xs">
              Moved <strong>{codeName}</strong> to Recycle Bin.
            </span>
            <button
              type="button"
              onClick={() => {
                restoreMutation.mutate(deletedId);
                toast.dismiss(t.id);
              }}
              className="px-2.5 py-1 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors cursor-pointer shrink-0"
            >
              Undo
            </button>
          </div>
        ),
        { duration: 5000 }
      );
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to delete design.');
    },
  });

  // Calculate filter counts
  const allCodes = allCodesResponse?.data || [];
  const counts = {
    all: allCodes.length,
    barcode: allCodes.filter((c) => c.type === 'barcode').length,
    qr: allCodes.filter((c) => c.type === 'qr').length,
  };

  const handleOpenDelete = (code) => {
    setCodeToDelete(code);
    setIsDeleteModalOpen(true);
  };

  const handleCloseDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setCodeToDelete(null);
  };

  const handleConfirmDelete = () => {
    if (codeToDelete?.id) {
      deleteMutation.mutate(codeToDelete.id);
    }
  };

  const handleResetFilters = () => {
    setSearch('');
    setTypeFilter('all');
  };

  const codes = codesResponse?.data || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <LayoutGrid className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Code Gallery</h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Browse, download, and manage your collection of saved barcodes and QR codes.
          </p>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto flex-wrap">
          <Link to="/designer">
            <Button variant="primary" size="md" icon={Plus}>
              Create New
            </Button>
          </Link>
        </div>
      </div>

      {/* Top Filter Bar */}
      <Filters
        search={search}
        onSearchChange={setSearch}
        typeFilter={typeFilter}
        onTypeFilterChange={setTypeFilter}
        counts={counts}
      />

      {/* Responsive Code Cards Grid */}
      <CodeGrid
        codes={codes}
        isLoading={isLoading}
        searchTerm={debouncedSearch}
        typeFilter={typeFilter}
        onResetFilters={handleResetFilters}
        onDelete={handleOpenDelete}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={handleCloseDeleteModal}
        title="Move to Recycle Bin"
        description="Are you sure you want to move this design to the Recycle Bin? You can restore it anytime within 30 days."
        footer={
          <>
            <Button
              variant="secondary"
              onClick={handleCloseDeleteModal}
              disabled={deleteMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleConfirmDelete}
              isLoading={deleteMutation.isPending}
            >
              Move to Recycle Bin
            </Button>
          </>
        }
      >
        {codeToDelete && (
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-4">
            {codeToDelete.preview_url ? (
              <img
                src={codeToDelete.preview_url}
                alt={codeToDelete.name}
                className="w-16 h-16 object-contain bg-white rounded-lg border border-slate-200 p-1 shrink-0"
              />
            ) : (
              <div className="w-16 h-16 rounded-lg bg-slate-200 flex items-center justify-center text-slate-400 shrink-0">
                <LayoutGrid className="w-6 h-6" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-slate-900 truncate">{codeToDelete.name}</p>
              <p className="text-xs text-slate-500 font-mono mt-0.5 truncate">
                {codeToDelete.format} • {codeToDelete.value}
              </p>
              {codeToDelete.product && (
                <p className="text-xs text-indigo-600 mt-0.5 truncate">
                  Product: {codeToDelete.product.name}
                </p>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
