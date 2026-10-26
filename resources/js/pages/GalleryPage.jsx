import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { LayoutGrid, AlertTriangle } from 'lucide-react';

import Filters from '../features/gallery/Filters';
import CodeGrid from '../features/gallery/CodeGrid';
import Modal from '../components/Modal';
import Button from '../components/Button';
import { getCodes, deleteCode } from '../api/codes';

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

  // Mutation: Delete Code
  const deleteMutation = useMutation({
    mutationFn: (id) => deleteCode(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['codes'] });
      queryClient.invalidateQueries({ queryKey: ['codes-all'] });
      toast.success('Code deleted successfully.');
      handleCloseDeleteModal();
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to delete code.');
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
        title="Delete Code"
        description="Are you sure you want to permanently delete this code from your gallery?"
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
              Delete Code
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
