import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { LayoutGrid, Trash2, Plus } from 'lucide-react';

import PageHeader from '../components/PageHeader';
import Filters from '../features/gallery/Filters';
import CodeGrid from '../features/gallery/CodeGrid';
import Modal from '../components/Modal';
import Button from '../components/Button';
import { getCodes, deleteCode, restoreCode } from '../api/codes';
import { getBinSummary } from '../api/bin';

export default function GalleryPage() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  const urlFilter = searchParams.get('filter');
  const urlBatchId = searchParams.get('batch_id');
  const initialFilter = urlFilter === 'last_bulk' || urlBatchId ? 'last_bulk' : 'all';

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState(initialFilter); // 'all' | 'barcode' | 'qr' | 'last_bulk'

  // Delete modal state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [codeToDelete, setCodeToDelete] = useState(null);

  // Sync state if URL changes
  useEffect(() => {
    if (urlFilter === 'last_bulk' || urlBatchId) {
      setTypeFilter('last_bulk');
    }
  }, [urlFilter, urlBatchId]);

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
    queryKey: ['codes', { search: debouncedSearch, type: typeFilter, batchId: urlBatchId }],
    queryFn: () => {
      const params = {
        search: debouncedSearch || undefined,
      };
      if (typeFilter === 'last_bulk') {
        params.filter = 'last_bulk';
        if (urlBatchId) params.batch_id = urlBatchId;
      } else if (typeFilter !== 'all') {
        params.type = typeFilter;
      }
      return getCodes(params);
    },
  });

  const handleTypeFilterChange = (newFilter) => {
    setTypeFilter(newFilter);
    if (newFilter === 'last_bulk') {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set('filter', 'last_bulk');
        return next;
      });
    } else {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete('filter');
        next.delete('batch_id');
        return next;
      });
    }
  };

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
    <div className="space-y-3">
      {/* Header */}
      <PageHeader
        title="Code Gallery"
        description="Browse, download, and manage your collection of saved barcodes and QR codes."
        action={
          <Link to="/designer">
            <Button variant="primary" size="md" icon={Plus}>
              Create New
            </Button>
          </Link>
        }
      />

      {/* Top Filter Bar */}
      <Filters
        search={search}
        onSearchChange={setSearch}
        typeFilter={typeFilter}
        onTypeFilterChange={handleTypeFilterChange}
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
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 flex items-center gap-4">
            {codeToDelete.preview_url ? (
              <img
                src={codeToDelete.preview_url}
                alt={codeToDelete.name}
                className="w-16 h-16 object-contain bg-white rounded border border-gray-200 p-1 shrink-0"
              />
            ) : (
              <div className="w-16 h-16 rounded bg-gray-200 flex items-center justify-center text-gray-400 shrink-0">
                <LayoutGrid className="w-6 h-6 stroke-[1.5]" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="font-medium text-gray-900 truncate">{codeToDelete.name}</p>
              <p className="text-xs text-gray-500 font-mono mt-0.5 truncate">
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
