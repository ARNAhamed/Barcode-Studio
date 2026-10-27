import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Plus, Package, Trash2, RotateCcw, Upload, Download } from 'lucide-react';
import Button from '../components/Button';
import Drawer from '../components/Drawer';
import Modal from '../components/Modal';
import SummaryCards from '../features/stock/SummaryCards';
import ProductTable from '../features/stock/ProductTable';
import ProductForm from '../features/stock/ProductForm';
import ImportModal from '../features/stock/ImportModal';
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

  // Drawer state (Add / Edit)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [serverErrors, setServerErrors] = useState({});

  // Delete modal state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);

  // Import / Export state
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await exportProducts({
        search: debouncedSearch || undefined,
        sort: sortField,
      });
      toast.success('Products exported successfully.');
    } catch (err) {
      toast.error('Failed to export products.');
    } finally {
      setIsExporting(false);
    }
  };

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
      handleCloseDrawer();
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
      handleCloseDrawer();
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

  // Open Drawer for Add
  const handleOpenAdd = () => {
    setEditingProduct(null);
    setServerErrors({});
    setIsDrawerOpen(true);
  };

  // Open Drawer for Edit
  const handleOpenEdit = (product) => {
    setEditingProduct(product);
    setServerErrors({});
    setIsDrawerOpen(true);
  };

  // Close Drawer
  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setEditingProduct(null);
    setServerErrors({});
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

  const isFormSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Package className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Stock Management</h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Track product inventory, manage SKU data, and instantly generate linked barcodes and QR codes.
          </p>
        </div>

        {/* Header Actions: Import, Export, Add Product */}
        <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto flex-wrap">
          <Button
            onClick={() => setIsImportModalOpen(true)}
            icon={Upload}
            variant="outline"
            size="md"
          >
            Import
          </Button>
          <Button
            onClick={handleExport}
            icon={Download}
            variant="outline"
            size="md"
            isLoading={isExporting}
          >
            Export
          </Button>
          <Button
            onClick={handleOpenAdd}
            icon={Plus}
            variant="primary"
            size="md"
          >
            Add Product
          </Button>
        </div>
      </div>

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
      />

      {/* Slide-over Drawer for Add/Edit */}
      <Drawer
        isOpen={isDrawerOpen}
        onClose={handleCloseDrawer}
        title={editingProduct ? 'Edit Product' : 'Add New Product'}
        description={
          editingProduct
            ? `Update product details and stock thresholds for SKU ${editingProduct.sku}`
            : 'Fill in the information below to add a new inventory item.'
        }
      >
        <ProductForm
          product={editingProduct}
          onSubmit={handleFormSubmit}
          onCancel={handleCloseDrawer}
          isSubmitting={isFormSubmitting}
          serverErrors={serverErrors}
        />
      </Drawer>

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
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-sm space-y-1">
            <p className="font-semibold text-slate-900">{productToDelete.name}</p>
            <p className="text-xs font-mono text-slate-500">SKU: {productToDelete.sku}</p>
            {productToDelete.barcode_number && (
              <p className="text-xs font-mono text-slate-500">
                Barcode: {productToDelete.barcode_number}
              </p>
            )}
            <p className="text-xs text-slate-500">Current Quantity: {productToDelete.quantity}</p>
          </div>
        )}
      </Modal>

      {/* CSV Import Modal */}
      <ImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={invalidateQueries}
      />
    </div>
  );
}
