import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Plus, Package, Trash2, RotateCcw, Upload, Download, Sparkles } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import Button from '../components/Button';
import Modal from '../components/Modal';
import SummaryCards from '../features/stock/SummaryCards';
import ProductTable from '../features/stock/ProductTable';
import ProductForm from '../features/stock/ProductForm';
import ImportModal from '../features/stock/ImportModal';
import BulkGenerateModal from '../features/stock/BulkGenerateModal';
import {
  getProducts,
  getProductSummary,
  createProduct,
  updateProduct,
  deleteProduct,
  restoreProduct,
  exportProducts,
} from '../api/products';

export default function StockPage() {
  const queryClient = useQueryClient();

  // Search, sort & pagination state
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sortField, setSortField] = useState('-created_at');
  const [page, setPage] = useState(1);

  // Modal state (Add / Edit) & Dirty tracking
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isFormDirty, setIsFormDirty] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [serverErrors, setServerErrors] = useState({});

  // Delete modal state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);

  // Import / Export & Selection state
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isBulkGenerateModalOpen, setIsBulkGenerateModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [isSelectAllMatching, setIsSelectAllMatching] = useState(false);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Query: Stock Summary (including trash count)
  const { data: summary, isLoading: isSummaryLoading } = useQuery({
    queryKey: ['products-summary'],
    queryFn: getProductSummary,
  });

  // Query: Active Products List
  const {
    data: productsResponse,
    isLoading: isProductsLoading,
  } = useQuery({
    queryKey: ['products', { search: debouncedSearch, sort: sortField, page }],
    queryFn: () =>
      getProducts({
        search: debouncedSearch || undefined,
        sort: sortField,
        page,
        per_page: 10,
      }),
  });

  // Bulk products query for BulkGenerateModal
  const { data: bulkProductsData } = useQuery({
    queryKey: ['bulk-selected-products', { selectedIds, isSelectAllMatching, debouncedSearch, sortField }],
    queryFn: async () => {
      if (isSelectAllMatching) {
        const res = await getProducts({
          search: debouncedSearch || undefined,
          sort: sortField,
          per_page: 500,
        });
        return res.data || [];
      } else if (selectedIds.length > 0) {
        const res = await getProducts({
          ids: selectedIds,
          per_page: 500,
        });
        return res.data || [];
      }
      return [];
    },
    enabled: isBulkGenerateModalOpen,
  });

  const bulkSelectedProducts = bulkProductsData || (
    isSelectAllMatching
      ? []
      : (productsResponse?.data || []).filter((p) => selectedIds.includes(p.id))
  );

  const invalidateQueries = () => {
    queryClient.invalidateQueries({ queryKey: ['products'] });
    queryClient.invalidateQueries({ queryKey: ['products-summary'] });
    queryClient.invalidateQueries({ queryKey: ['products-trash'] });
    queryClient.invalidateQueries({ queryKey: ['bin-summary'] });
  };

  // Mutation: Restore product (for Undo toast)
  const restoreMutation = useMutation({
    mutationFn: (id) => restoreProduct(id),
    onSuccess: (res) => {
      invalidateQueries();
      toast.success(res.message || 'Product restored to inventory.');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to restore product.');
    },
  });

  // Mutation: Create Product
  const createMutation = useMutation({
    mutationFn: createProduct,
    onSuccess: () => {
      invalidateQueries();
      toast.success('Product created successfully!');
      setIsFormDirty(false);
      setIsProductModalOpen(false);
      setEditingProduct(null);
      setServerErrors({});
    },
    onError: (err) => {
      if (err.response?.status === 422 && err.response?.data?.errors) {
        setServerErrors(err.response.data.errors);
        toast.error('Please resolve the errors highlighted below.');
      } else {
        toast.error(err.response?.data?.message || 'Failed to create product.');
      }
    },
  });

  // Mutation: Update Product
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => updateProduct(id, data),
    onSuccess: () => {
      invalidateQueries();
      toast.success('Product updated successfully!');
      setIsFormDirty(false);
      setIsProductModalOpen(false);
      setEditingProduct(null);
      setServerErrors({});
    },
    onError: (err) => {
      if (err.response?.status === 422 && err.response?.data?.errors) {
        setServerErrors(err.response.data.errors);
        toast.error('Please resolve the errors highlighted below.');
      } else {
        toast.error(err.response?.data?.message || 'Failed to update product.');
      }
    },
  });

  // Mutation: Soft Delete Product (moves to Recycle Bin)
  const deleteMutation = useMutation({
    mutationFn: (id) => deleteProduct(id),
    onSuccess: (res, deletedId) => {
      invalidateQueries();
      const productName = productToDelete?.name || 'Product';
      handleCloseDeleteModal();

      // Show toast with interactive Undo button
      toast(
        (t) => (
          <div className="flex items-center justify-between gap-3 w-full">
            <span className="text-xs">
              Moved <strong>{productName}</strong> to Recycle Bin.
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
      toast.error(err.response?.data?.message || 'Failed to delete product.');
    },
  });

  // Open Modal for Add
  const handleOpenAdd = () => {
    setEditingProduct(null);
    setServerErrors({});
    setIsFormDirty(false);
    setIsProductModalOpen(true);
  };

  // Open Modal for Edit
  const handleOpenEdit = (product) => {
    setEditingProduct(product);
    setServerErrors({});
    setIsFormDirty(false);
    setIsProductModalOpen(true);
  };

  // Close Modal with Unsaved Changes check
  const handleRequestCloseProductModal = () => {
    if (isFormDirty) {
      const confirmDiscard = window.confirm(
        'You have unsaved changes. Are you sure you want to discard them?'
      );
      if (!confirmDiscard) return;
    }
    setIsProductModalOpen(false);
    setEditingProduct(null);
    setServerErrors({});
    setIsFormDirty(false);
  };

  // Handle Form Submit
  const handleFormSubmit = (data) => {
    if (editingProduct?.id) {
      updateMutation.mutate({ id: editingProduct.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  // Open Delete Confirmation Modal
  const handleOpenDeleteModal = (product) => {
    setProductToDelete(product);
    setIsDeleteModalOpen(true);
  };

  // Close Delete Confirmation Modal
  const handleCloseDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setProductToDelete(null);
  };

  // Confirm Move to Recycle Bin
  const handleConfirmDelete = () => {
    if (productToDelete?.id) {
      deleteMutation.mutate(productToDelete.id);
    }
  };

  // Computed selected counts & handlers
  const totalMatching = productsResponse?.meta?.total || 0;
  const selectedCount = isSelectAllMatching ? totalMatching : selectedIds.length;

  const handleToggleSelect = (id) => {
    setIsSelectAllMatching(false);
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleToggleSelectAll = () => {
    const currentPageProducts = productsResponse?.data || [];
    if (currentPageProducts.length === 0) return;

    const allPageSelected = currentPageProducts.every((p) =>
      selectedIds.includes(p.id)
    );

    if (allPageSelected || isSelectAllMatching) {
      setIsSelectAllMatching(false);
      const pageIds = new Set(currentPageProducts.map((p) => p.id));
      setSelectedIds((prev) => prev.filter((id) => !pageIds.has(id)));
    } else {
      const pageIds = currentPageProducts.map((p) => p.id);
      setSelectedIds((prev) => Array.from(new Set([...prev, ...pageIds])));
    }
  };

  const handleSelectAllMatching = () => {
    setIsSelectAllMatching(true);
  };

  const handleClearSelection = () => {
    setSelectedIds([]);
    setIsSelectAllMatching(false);
  };

  const handleExport = async () => {
    if (selectedCount === 0) return;
    setIsExporting(true);
    try {
      await exportProducts({
        ids: isSelectAllMatching ? [] : selectedIds,
        all_matching: isSelectAllMatching,
        search: debouncedSearch || undefined,
        sort: sortField,
      });
      toast.success(
        `${selectedCount} product${selectedCount === 1 ? '' : 's'} exported.`
      );
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to export products.');
    } finally {
      setIsExporting(false);
    }
  };

  const isFormSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Stock Management"
        description="Track product inventory, manage SKU data, and instantly generate linked barcodes."
        action={
          <div className="flex items-center gap-2 flex-nowrap shrink-0">
            <Button
              onClick={() => setIsImportModalOpen(true)}
              icon={Upload}
              variant="secondary"
              size="md"
              title="Import products from CSV"
              className="h-9 whitespace-nowrap"
            >
              <span className="hidden md:inline">Import</span>
            </Button>
            <span
              title={selectedCount === 0 ? 'Select products to export' : 'Export selected products to CSV'}
              className="inline-flex"
            >
              <Button
                onClick={handleExport}
                icon={Download}
                variant="secondary"
                size="md"
                disabled={selectedCount === 0 || isExporting}
                isLoading={isExporting}
                className="h-9 whitespace-nowrap"
              >
                <span className="hidden md:inline">
                  {selectedCount > 0 ? `Export (${selectedCount})` : 'Export'}
                </span>
                {selectedCount > 0 && <span className="md:hidden text-xs">({selectedCount})</span>}
              </Button>
            </span>
            <span
              title={selectedCount === 0 ? 'Select products to generate codes' : 'Bulk generate codes with a template'}
              className="inline-flex"
            >
              <Button
                onClick={() => setIsBulkGenerateModalOpen(true)}
                icon={Sparkles}
                variant="secondary"
                size="md"
                disabled={selectedCount === 0}
                className="h-9 whitespace-nowrap"
              >
                <span className="hidden md:inline">
                  {selectedCount > 0 ? `Generate codes (${selectedCount})` : 'Generate codes'}
                </span>
                {selectedCount > 0 && <span className="md:hidden text-xs">Codes ({selectedCount})</span>}
                {selectedCount === 0 && <span className="md:hidden text-xs">Codes</span>}
              </Button>
            </span>
            <Button
              onClick={handleOpenAdd}
              icon={Plus}
              variant="primary"
              size="md"
              className="h-9 whitespace-nowrap"
            >
              Add Product
            </Button>
          </div>
        }
      />

      {/* Summary Cards */}
      <SummaryCards summary={summary} isLoading={isSummaryLoading} />

      {/* Product Table */}
      <ProductTable
        products={productsResponse?.data || []}
        meta={productsResponse?.meta}
        isLoading={isProductsLoading}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        sortField={sortField}
        onSortChange={setSortField}
        page={page}
        onPageChange={setPage}
        onEdit={handleOpenEdit}
        onDelete={handleOpenDeleteModal}
        selectedIds={selectedIds}
        onToggleSelect={handleToggleSelect}
        onToggleSelectAll={handleToggleSelectAll}
        isSelectAllMatching={isSelectAllMatching}
        onSelectAllMatching={handleSelectAllMatching}
        onClearSelection={handleClearSelection}
        onOpenBulkGenerate={() => setIsBulkGenerateModalOpen(true)}
      />

      {/* Centered Modal for Add / Edit Product */}
      <Modal
        isOpen={isProductModalOpen}
        onClose={handleRequestCloseProductModal}
        title={editingProduct ? 'Edit Product' : 'Add Product'}
        description={
          editingProduct
            ? `Update product details and stock thresholds for SKU ${editingProduct.sku}`
            : 'Fill in the information below to add a new inventory item.'
        }
        maxWidth="max-w-xl"
        fullScreenMobile={true}
        footer={
          <>
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={handleRequestCloseProductModal}
              disabled={isFormSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="product-modal-form"
              variant="primary"
              size="md"
              isLoading={isFormSubmitting}
            >
              {editingProduct ? 'Save Changes' : 'Save Product'}
            </Button>
          </>
        }
      >
        <ProductForm
          formId="product-modal-form"
          product={editingProduct}
          onSubmit={handleFormSubmit}
          isSubmitting={isFormSubmitting}
          serverErrors={serverErrors}
          hideActions={true}
          onDirtyChange={setIsFormDirty}
        />
      </Modal>

      {/* Move to Recycle Bin Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={handleCloseDeleteModal}
        title="Move to Recycle Bin"
        description="Are you sure you want to move this product to the Recycle Bin? You can restore it anytime within 30 days."
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
        {productToDelete && (
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 text-sm space-y-1">
            <p className="font-medium text-gray-900">{productToDelete.name}</p>
            <p className="text-xs font-mono text-gray-500">SKU: {productToDelete.sku}</p>
            {productToDelete.barcode_number && (
              <p className="text-xs font-mono text-gray-500">
                Barcode: {productToDelete.barcode_number}
              </p>
            )}
            <p className="text-xs text-gray-500">Current Quantity: {productToDelete.quantity}</p>
          </div>
        )}
      </Modal>

      {/* CSV Import Modal */}
      <ImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={invalidateQueries}
      />

      {/* Bulk Generate Modal */}
      <BulkGenerateModal
        isOpen={isBulkGenerateModalOpen}
        onClose={() => setIsBulkGenerateModalOpen(false)}
        selectedProducts={bulkSelectedProducts}
        onSuccess={invalidateQueries}
      />
    </div>
  );
}
