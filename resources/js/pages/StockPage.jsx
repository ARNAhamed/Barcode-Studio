import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Plus, Package, AlertTriangle } from 'lucide-react';
import Button from '../components/Button';
import Drawer from '../components/Drawer';
import Modal from '../components/Modal';
import SummaryCards from '../features/stock/SummaryCards';
import ProductTable from '../features/stock/ProductTable';
import ProductForm from '../features/stock/ProductForm';
import {
  getProducts,
  getProductSummary,
  createProduct,
  updateProduct,
  deleteProduct,
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

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Query: Stock Summary
  const { data: summary, isLoading: isSummaryLoading } = useQuery({
    queryKey: ['products-summary'],
    queryFn: getProductSummary,
  });

  // Query: Products List
  const {
    data: productsResponse,
    isLoading: isProductsLoading,
    isFetching: isProductsFetching,
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

  // Mutation: Create Product
  const createMutation = useMutation({
    mutationFn: createProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['products-summary'] });
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
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['products-summary'] });
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

  // Mutation: Delete Product
  const deleteMutation = useMutation({
    mutationFn: (id) => deleteProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['products-summary'] });
      toast.success('Product deleted.');
      handleCloseDeleteModal();
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

  // Confirm Delete
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

        <Button onClick={handleOpenAdd} icon={Plus} variant="primary">
          Add Product
        </Button>
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

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={handleCloseDeleteModal}
        title="Delete Product"
        description="Are you sure you want to delete this product? Any codes linked to this product will be unlinked."
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
              Delete Product
            </Button>
          </>
        }
      >
        {productToDelete && (
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-sm space-y-1">
            <p className="font-semibold text-slate-900">{productToDelete.name}</p>
            <p className="text-xs font-mono text-slate-500">SKU: {productToDelete.sku}</p>
            {productToDelete.barcode_number && (
              <p className="text-xs font-mono text-slate-500">Barcode: {productToDelete.barcode_number}</p>
            )}
            <p className="text-xs text-slate-500">Current Quantity: {productToDelete.quantity}</p>
          </div>
        )}
      </Modal>
    </div>
  );
}
