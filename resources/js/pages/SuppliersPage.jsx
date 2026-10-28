import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Plus,
  Trash2,
  Truck,
  CheckCircle,
  PackageX,
  Boxes,
} from 'lucide-react';
import Button from '../components/Button';
import Modal from '../components/Modal';
import ProductsTabNav from '../components/ProductsTabNav';
import SupplierTable from '../features/suppliers/SupplierTable';
import SupplierFormModal from '../features/suppliers/SupplierFormModal';
import SupplierDetailModal from '../features/suppliers/SupplierDetailModal';
import {
  getSuppliers,
  getSupplierSummary,
  deleteSupplier,
  exportSuppliers,
} from '../api/suppliers';
import { getBinSummary } from '../api/bin';

export default function SuppliersPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();

  const page = parseInt(searchParams.get('page') || '1', 10);
  const search = searchParams.get('search') || '';
  const statusFilter = searchParams.get('status') || '';
  const sort = searchParams.get('sort') || 'name';

  // Selection state
  const [selectedIds, setSelectedIds] = useState([]);
  const [isExporting, setIsExporting] = useState(false);

  // Modals state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [viewingSupplier, setViewingSupplier] = useState(null);
  const [supplierToDelete, setSupplierToDelete] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Suppliers listing query
  const {
    data: suppliersResponse,
    isLoading,
    isPlaceholderData,
  } = useQuery({
    queryKey: ['suppliers', { page, search, status: statusFilter, sort }],
    queryFn: () =>
      getSuppliers({
        page,
        search,
        status: statusFilter,
        sort,
        per_page: 15,
      }),
    placeholderData: (prev) => prev,
  });

  const suppliers = suppliersResponse?.data || [];
  const meta = suppliersResponse?.meta || null;

  // Summary counts query
  const { data: summaryData } = useQuery({
    queryKey: ['suppliers-summary'],
    queryFn: getSupplierSummary,
  });

  // Bin summary for trash badge
  const { data: binSummary } = useQuery({
    queryKey: ['bin-summary'],
    queryFn: getBinSummary,
  });

  const trashedSuppliersCount = binSummary?.suppliers ?? 0;

  // Query Param updaters
  const updateQueryParam = (newParams) => {
    const updated = new URLSearchParams(searchParams);
    Object.entries(newParams).forEach(([key, value]) => {
      if (value === null || value === undefined || value === '') {
        updated.delete(key);
      } else {
        updated.set(key, value);
      }
    });
    setSearchParams(updated);
  };

  const handleSearchChange = (val) => {
    updateQueryParam({ search: val, page: 1 });
  };

  const handleStatusFilterChange = (val) => {
    updateQueryParam({ status: val, page: 1 });
  };

  const handleSort = (column, direction) => {
    const sortVal = direction === 'desc' ? `-${column}` : column;
    updateQueryParam({ sort: sortVal });
  };

  const handlePageChange = (newPage) => {
    updateQueryParam({ page: newPage });
  };

  // Selection handlers
  const handleToggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleToggleSelectAll = () => {
    if (suppliers.every((s) => selectedIds.includes(s.id))) {
      setSelectedIds([]);
    } else {
      setSelectedIds(suppliers.map((s) => s.id));
    }
  };

  const handleClearSelection = () => {
    setSelectedIds([]);
  };

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id) => deleteSupplier(id),
    onSuccess: (_, id) => {
      toast.success('Supplier moved to Recycle Bin.');
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      queryClient.invalidateQueries({ queryKey: ['suppliers-summary'] });
      queryClient.invalidateQueries({ queryKey: ['bin-summary'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setSelectedIds((prev) => prev.filter((item) => item !== id));
      setIsDeleteModalOpen(false);
      setSupplierToDelete(null);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to delete supplier.');
    },
  });

  const handleDeleteConfirm = () => {
    if (supplierToDelete) {
      deleteMutation.mutate(supplierToDelete.id);
    }
  };

  // Export handlers
  const handleExportSelected = async () => {
    if (selectedIds.length === 0) return;
    try {
      setIsExporting(true);
      await exportSuppliers({ ids: selectedIds });
      toast.success(`Exported ${selectedIds.length} suppliers.`);
    } catch {
      toast.error('Failed to export suppliers.');
    } finally {
      setIsExporting(false);
    }
  };

  const sortBy = sort.startsWith('-') ? sort.slice(1) : sort;
  const sortOrder = sort.startsWith('-') ? 'desc' : 'asc';

  return (
    <div className="space-y-3">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 mb-3 border-b border-gray-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
            Suppliers
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            Manage vendor contacts, payment terms, and supplier-linked catalog items.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Recycle Bin shortcut */}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate('/bin?tab=suppliers')}
            className="relative"
            title="Open Suppliers Recycle Bin"
            icon={Trash2}
          >
            <span>Recycle Bin</span>
            {trashedSuppliersCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 bg-gray-200 text-gray-700 rounded-full text-[10px] font-semibold">
                {trashedSuppliersCount}
              </span>
            )}
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setEditingSupplier(null);
              setIsFormModalOpen(true);
            }}
            icon={Plus}
          >
            Add Supplier
          </Button>
        </div>
      </div>

      {/* Shared Section Tab Switcher (Items | Suppliers) */}
      <ProductsTabNav />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Total Suppliers */}
        <div className="p-3.5 bg-white border border-gray-200 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500">Total Suppliers</span>
            <div className="p-1.5 bg-gray-50 rounded-md text-gray-600">
              <Truck className="w-4 h-4" strokeWidth={1.5} />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900 mt-2">
            {summaryData?.total ?? 0}
          </div>
          <p className="text-[11px] text-gray-400 mt-0.5">Registered vendor accounts</p>
        </div>

        {/* Active Suppliers */}
        <div className="p-3.5 bg-white border border-gray-200 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500">Active Suppliers</span>
            <div className="p-1.5 bg-green-50 rounded-md text-[#16A34A]">
              <CheckCircle className="w-4 h-4" strokeWidth={1.5} />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900 mt-2">
            {summaryData?.active ?? 0}
          </div>
          <p className="text-[11px] text-gray-400 mt-0.5">Available for product assignment</p>
        </div>

        {/* Products without a Supplier */}
        <div
          onClick={() => navigate('/products/items?no_supplier=1')}
          className="p-3.5 bg-white border border-gray-200 rounded-lg hover:border-indigo-300 transition-colors cursor-pointer group"
          title="Click to view products without a supplier in Items"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500 group-hover:text-indigo-600">
              Products Without Supplier
            </span>
            <div className="p-1.5 bg-amber-50 rounded-md text-amber-600">
              <PackageX className="w-4 h-4" strokeWidth={1.5} />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900 mt-2">
            {summaryData?.no_supplier_products ?? 0}
          </div>
          <p className="text-[11px] text-indigo-600 font-medium mt-0.5 group-hover:underline">
            View unassigned items &rarr;
          </p>
        </div>
      </div>

      {/* Suppliers Table */}
      <SupplierTable
        suppliers={suppliers}
        meta={meta}
        isLoading={isLoading}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSort={handleSort}
        onPageChange={handlePageChange}
        searchTerm={search}
        onSearchChange={handleSearchChange}
        statusFilter={statusFilter}
        onStatusFilterChange={handleStatusFilterChange}
        selectedIds={selectedIds}
        onToggleSelect={handleToggleSelect}
        onToggleSelectAll={handleToggleSelectAll}
        onClearSelection={handleClearSelection}
        onView={(s) => setViewingSupplier(s)}
        onEdit={(s) => {
          setEditingSupplier(s);
          setIsFormModalOpen(true);
        }}
        onDelete={(s) => {
          setSupplierToDelete(s);
          setIsDeleteModalOpen(true);
        }}
        onExportSelected={handleExportSelected}
        isExporting={isExporting}
      />

      {/* Add / Edit Supplier Modal */}
      <SupplierFormModal
        isOpen={isFormModalOpen}
        supplier={editingSupplier}
        onClose={() => {
          setIsFormModalOpen(false);
          setEditingSupplier(null);
        }}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['suppliers'] });
          queryClient.invalidateQueries({ queryKey: ['suppliers-summary'] });
          queryClient.invalidateQueries({ queryKey: ['products'] });
        }}
      />

      {/* View Supplier Detail Modal */}
      <SupplierDetailModal
        isOpen={Boolean(viewingSupplier)}
        supplier={viewingSupplier}
        onClose={() => setViewingSupplier(null)}
        onEdit={(s) => {
          setEditingSupplier(s);
          setIsFormModalOpen(true);
        }}
      />

      {/* Delete Confirmation Modal (Soft Delete to Recycle Bin) */}
      {isDeleteModalOpen && supplierToDelete && (
        <Modal
          isOpen={true}
          onClose={() => {
            setIsDeleteModalOpen(false);
            setSupplierToDelete(null);
          }}
          title="Move Supplier to Recycle Bin?"
          description={`Are you sure you want to move "${supplierToDelete.name}" to the Recycle Bin?`}
          size="sm"
          footer={
            <div className="flex items-center justify-end gap-2 w-full">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setSupplierToDelete(null);
                }}
                disabled={deleteMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleDeleteConfirm}
                isLoading={deleteMutation.isPending}
              >
                Move to Bin
              </Button>
            </div>
          }
        >
          <div className="space-y-2 text-xs text-gray-600">
            <p>
              This supplier will be kept in the Recycle Bin for 30 days before
              being automatically purged.
            </p>
            <p className="text-gray-500">
              Products currently linked to this supplier will remain linked and
              show as <em>(deleted)</em> until restored.
            </p>
          </div>
        </Modal>
      )}
    </div>
  );
}
