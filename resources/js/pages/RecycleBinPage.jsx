import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Trash2,
  RotateCcw,
  Package,
  QrCode,
  Barcode,
  Search,
  X,
  ArrowLeft,
  AlertTriangle,
  Clock,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Layers,
  Truck,
} from 'lucide-react';

import Button from '../components/Button';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import Skeleton from '../components/Skeleton';
import EmptyState from '../components/EmptyState';
import Pagination from '../components/Pagination';
import PageHeader from '../components/PageHeader';

import {
  getTrashedProducts,
  restoreProduct,
  forceDeleteProduct,
  restoreAllProducts,
  emptyProductTrash,
} from '../api/products';

import {
  getTrashedCodes,
  restoreCode,
  forceDeleteCode,
  restoreAllCodes,
  emptyCodesTrash,
} from '../api/codes';

import {
  getTrashedSuppliers,
  restoreSupplier,
  forceDeleteSupplier,
  restoreAllSuppliers,
  emptySupplierTrash,
} from '../api/suppliers';

import { getBinSummary } from '../api/bin';

export default function RecycleBinPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  // Active tab: 'products' | 'suppliers' | 'designs'
  const tabParam = searchParams.get('tab');
  const activeTab = tabParam === 'designs' ? 'designs' : tabParam === 'suppliers' ? 'suppliers' : 'products';

  const setActiveTab = (tab) => {
    setSearchParams({ tab });
    setProductSearch('');
    setSupplierSearch('');
    setDesignSearch('');
    setProductPage(1);
    setSupplierPage(1);
    setDesignPage(1);
  };

  // Products filters & pagination
  const [productSearch, setProductSearch] = useState('');
  const [productPage, setProductPage] = useState(1);

  // Suppliers filters & pagination
  const [supplierSearch, setSupplierSearch] = useState('');
  const [supplierPage, setSupplierPage] = useState(1);

  // Designs filters & pagination
  const [designSearch, setDesignSearch] = useState('');
  const [designType, setDesignType] = useState('all'); // 'all' | 'barcode' | 'qr'
  const [designPage, setDesignPage] = useState(1);

  // Modals state
  const [itemToDelete, setItemToDelete] = useState(null); // { type: 'product'|'supplier'|'code', item }
  const [isEmptyBinModalOpen, setIsEmptyBinModalOpen] = useState(false);

  // Query: Bin Summary counts
  const { data: binSummary } = useQuery({
    queryKey: ['bin-summary'],
    queryFn: getBinSummary,
  });

  // Query: Trashed Products
  const { data: productTrashResponse, isLoading: isProductsLoading } = useQuery({
    queryKey: ['products-trash', { search: productSearch, page: productPage }],
    queryFn: () => getTrashedProducts({ search: productSearch || undefined, page: productPage, per_page: 10 }),
    enabled: activeTab === 'products',
  });

  // Query: Trashed Suppliers
  const { data: supplierTrashResponse, isLoading: isSuppliersLoading } = useQuery({
    queryKey: ['suppliers-trash', { search: supplierSearch, page: supplierPage }],
    queryFn: () => getTrashedSuppliers({ search: supplierSearch || undefined, page: supplierPage, per_page: 10 }),
    enabled: activeTab === 'suppliers',
  });

  // Query: Trashed Designs
  const { data: codeTrashResponse, isLoading: isCodesLoading } = useQuery({
    queryKey: ['codes-trash', { search: designSearch, type: designType, page: designPage }],
    queryFn: () =>
      getTrashedCodes({
        search: designSearch || undefined,
        type: designType !== 'all' ? designType : undefined,
        page: designPage,
        per_page: 10,
      }),
    enabled: activeTab === 'designs',
  });

  const trashedProducts = productTrashResponse?.data || [];
  const productMeta = productTrashResponse?.meta;

  const trashedSuppliers = supplierTrashResponse?.data || [];
  const supplierMeta = supplierTrashResponse?.meta;

  const trashedCodes = codeTrashResponse?.data || [];
  const codeMeta = codeTrashResponse?.meta;

  // Invalidate all related queries
  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['products'] });
    queryClient.invalidateQueries({ queryKey: ['products-summary'] });
    queryClient.invalidateQueries({ queryKey: ['products-trash'] });
    queryClient.invalidateQueries({ queryKey: ['suppliers'] });
    queryClient.invalidateQueries({ queryKey: ['suppliers-summary'] });
    queryClient.invalidateQueries({ queryKey: ['suppliers-trash'] });
    queryClient.invalidateQueries({ queryKey: ['codes'] });
    queryClient.invalidateQueries({ queryKey: ['codes-all'] });
    queryClient.invalidateQueries({ queryKey: ['codes-trash'] });
    queryClient.invalidateQueries({ queryKey: ['bin-summary'] });
  };

  // --- Product Mutations ---
  const restoreProductMutation = useMutation({
    mutationFn: restoreProduct,
    onSuccess: (res) => {
      invalidateAll();
      toast.success(res.message || 'Product restored successfully.');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to restore product.');
    },
  });

  const forceDeleteProductMutation = useMutation({
    mutationFn: forceDeleteProduct,
    onSuccess: () => {
      invalidateAll();
      toast.success('Product permanently deleted.');
      setItemToDelete(null);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to delete product.');
    },
  });

  const restoreAllProductsMutation = useMutation({
    mutationFn: restoreAllProducts,
    onSuccess: (res) => {
      invalidateAll();
      toast.success(res.message || 'All products restored.');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to restore products.');
    },
  });

  const emptyProductsTrashMutation = useMutation({
    mutationFn: emptyProductTrash,
    onSuccess: (res) => {
      invalidateAll();
      toast.success(res.message || 'Product recycle bin emptied.');
      setIsEmptyBinModalOpen(false);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to empty recycle bin.');
    },
  });

  // --- Design Mutations ---
  const restoreCodeMutation = useMutation({
    mutationFn: restoreCode,
    onSuccess: (res) => {
      invalidateAll();
      toast.success(res.message || 'Design restored successfully.');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to restore design.');
    },
  });

  const forceDeleteCodeMutation = useMutation({
    mutationFn: forceDeleteCode,
    onSuccess: () => {
      invalidateAll();
      toast.success('Design permanently deleted.');
      setItemToDelete(null);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to delete design.');
    },
  });

  const restoreAllCodesMutation = useMutation({
    mutationFn: restoreAllCodes,
    onSuccess: (res) => {
      invalidateAll();
      toast.success(res.message || 'All designs restored.');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to restore designs.');
    },
  });

  const emptyCodesTrashMutation = useMutation({
    mutationFn: emptyCodesTrash,
    onSuccess: (res) => {
      invalidateAll();
      toast.success(res.message || 'Designs recycle bin emptied.');
      setIsEmptyBinModalOpen(false);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to empty recycle bin.');
    },
  });

  // --- Supplier Mutations ---
  const restoreSupplierMutation = useMutation({
    mutationFn: restoreSupplier,
    onSuccess: (res) => {
      invalidateAll();
      toast.success(res.message || 'Supplier restored successfully.');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to restore supplier.');
    },
  });

  const forceDeleteSupplierMutation = useMutation({
    mutationFn: forceDeleteSupplier,
    onSuccess: () => {
      invalidateAll();
      toast.success('Supplier permanently deleted.');
      setItemToDelete(null);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to delete supplier.');
    },
  });

  const restoreAllSuppliersMutation = useMutation({
    mutationFn: restoreAllSuppliers,
    onSuccess: (res) => {
      invalidateAll();
      toast.success(res.message || 'All suppliers restored.');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to restore suppliers.');
    },
  });

  const emptySuppliersTrashMutation = useMutation({
    mutationFn: emptySupplierTrash,
    onSuccess: (res) => {
      invalidateAll();
      toast.success(res.message || 'Suppliers recycle bin emptied.');
      setIsEmptyBinModalOpen(false);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to empty recycle bin.');
    },
  });

  // Modal actions
  const handleConfirmPermanentDelete = () => {
    if (!itemToDelete) return;
    if (itemToDelete.type === 'product') {
      forceDeleteProductMutation.mutate(itemToDelete.item.id);
    } else if (itemToDelete.type === 'supplier') {
      forceDeleteSupplierMutation.mutate(itemToDelete.item.id);
    } else {
      forceDeleteCodeMutation.mutate(itemToDelete.item.id);
    }
  };

  const handleConfirmEmptyBin = () => {
    if (activeTab === 'products') {
      emptyProductsTrashMutation.mutate();
    } else if (activeTab === 'suppliers') {
      emptySuppliersTrashMutation.mutate();
    } else {
      emptyCodesTrashMutation.mutate();
    }
  };

  const currentTabCount =
    activeTab === 'products'
      ? binSummary?.products || 0
      : activeTab === 'suppliers'
      ? binSummary?.suppliers || 0
      : binSummary?.codes || 0;

  const isActionPending =
    forceDeleteProductMutation.isPending ||
    forceDeleteSupplierMutation.isPending ||
    forceDeleteCodeMutation.isPending ||
    emptyProductsTrashMutation.isPending ||
    emptySuppliersTrashMutation.isPending ||
    emptyCodesTrashMutation.isPending;

  const isRestoreAllPending =
    restoreAllProductsMutation.isPending ||
    restoreAllSuppliersMutation.isPending ||
    restoreAllCodesMutation.isPending;

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Recycle Bin"
        description="Items remain here for 30 days before being purged permanently."
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="md"
              icon={RotateCcw}
              onClick={() => {
                if (activeTab === 'products') {
                  restoreAllProductsMutation.mutate();
                } else if (activeTab === 'suppliers') {
                  restoreAllSuppliersMutation.mutate();
                } else {
                  restoreAllCodesMutation.mutate();
                }
              }}
              disabled={currentTabCount === 0 || isRestoreAllPending}
              isLoading={isRestoreAllPending}
            >
              Restore all
            </Button>

            <Button
              variant="danger"
              size="md"
              icon={Trash2}
              onClick={() => setIsEmptyBinModalOpen(true)}
              disabled={currentTabCount === 0 || isActionPending}
            >
              Empty bin
            </Button>
          </div>
        }
      />

      {/* Tabs Switcher */}
      <div className="flex items-center gap-2 border-b border-gray-200">
        <button
          type="button"
          onClick={() => setActiveTab('products')}
          className={`flex items-center gap-2 py-2.5 px-3 border-b-2 font-medium text-sm transition-colors cursor-pointer ${
            activeTab === 'products'
              ? 'border-indigo-600 text-indigo-600 font-semibold'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <Package className="w-4 h-4 stroke-[1.5]" />
          <span>Items</span>
          <span className="text-xs text-gray-500 font-normal">
            ({binSummary?.products ?? 0})
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('suppliers')}
          className={`flex items-center gap-2 py-2.5 px-3 border-b-2 font-medium text-sm transition-colors cursor-pointer ${
            activeTab === 'suppliers'
              ? 'border-indigo-600 text-indigo-600 font-semibold'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <Truck className="w-4 h-4 stroke-[1.5]" />
          <span>Suppliers</span>
          <span className="text-xs text-gray-500 font-normal">
            ({binSummary?.suppliers ?? 0})
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('designs')}
          className={`flex items-center gap-2 py-2.5 px-3 border-b-2 font-medium text-sm transition-colors cursor-pointer ${
            activeTab === 'designs'
              ? 'border-indigo-600 text-indigo-600 font-semibold'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <Barcode className="w-4 h-4 stroke-[1.5]" />
          <span>Designs</span>
          <span className="text-xs text-gray-500 font-normal">
            ({binSummary?.codes ?? 0})
          </span>
        </button>
      </div>

      {/* PRODUCTS TAB CONTENT */}
      {activeTab === 'products' && (
        <div className="space-y-4">
          {/* Search bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 stroke-[1.5]" />
              <input
                type="text"
                value={productSearch}
                onChange={(e) => {
                  setProductSearch(e.target.value);
                  setProductPage(1);
                }}
                placeholder="Search trashed products..."
                className="w-full h-9 pl-9 pr-8 bg-white border border-gray-300 rounded-lg text-sm placeholder:text-gray-400 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 transition-colors"
              />
              {productSearch && (
                <button
                  type="button"
                  onClick={() => setProductSearch('')}
                  className="p-1 text-gray-400 hover:text-gray-600 absolute right-2 top-1/2 -translate-y-1/2 rounded cursor-pointer"
                >
                  <X className="w-3.5 h-3.5 stroke-[1.5]" />
                </button>
              )}
            </div>
          </div>

          {/* Products Table Card */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden w-full">
            {/* Desktop / Tablet Table (768px and up) */}
            <div className="hidden md:block w-full overflow-hidden">
              <table className="w-full table-fixed text-left border-collapse">
                <thead>
                  <tr className="h-9 sm:h-10 border-b border-gray-200 bg-white text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <th className="py-2 px-3 sm:px-4 min-w-[220px] w-[32%] lg:w-[30%] truncate text-left align-middle">Product</th>
                    <th className="hidden 2xl:table-cell py-2 px-2 w-[110px] truncate text-center align-middle">Category</th>
                    <th className="py-2 px-2 w-[88px] min-w-[88px] truncate text-center align-middle">Price</th>
                    <th className="py-2 px-1.5 w-[56px] min-w-[56px] truncate text-center align-middle">Qty</th>
                    <th className="hidden xl:table-cell py-2 px-3 w-[120px] truncate text-center align-middle">Deleted Date</th>
                    <th className="py-2 px-2 w-[100px] min-w-[100px] truncate text-center align-middle">Retention</th>
                    <th className="py-2 px-2 text-center w-[108px] min-w-[108px] truncate align-middle">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100 text-sm">
                  {isProductsLoading ? (
                    <Skeleton type="table-row" count={5} />
                  ) : trashedProducts.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-16 px-4 text-center">
                        <EmptyState
                          icon={Trash2}
                          title="No products in Recycle Bin"
                          description={
                            productSearch
                              ? 'No trashed products match your search query.'
                              : 'Products moved to the bin will appear here for 30 days before permanent removal.'
                          }
                          actionText={productSearch ? 'Clear search' : 'Back to Stock'}
                          onAction={() => (productSearch ? setProductSearch('') : navigate('/products/items'))}
                          actionIcon={Package}
                          className="border-0 shadow-none bg-transparent"
                        />
                      </td>
                    </tr>
                  ) : (
                    trashedProducts.map((product) => {
                      const deletedDate = product.deleted_at
                        ? new Date(product.deleted_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })
                        : '—';

                      const daysLeft = product.days_left !== undefined ? product.days_left : 30;

                      return (
                        <tr key={product.id} className="h-10 sm:h-11 hover:bg-gray-50/75 transition-colors">
                          <td className="py-1.5 px-3 sm:px-4 min-w-[220px] text-left align-middle">
                            <div
                              className="font-medium text-gray-900 text-sm leading-snug line-clamp-2"
                              title={product.name}
                            >
                              {product.name}
                            </div>
                            <div
                              className="text-[11px] text-gray-400 font-mono truncate mt-0.5 leading-tight"
                              title={`Item Code: ${product.sku}`}
                            >
                              {product.sku}
                            </div>
                          </td>
                          <td className="hidden 2xl:table-cell py-1.5 px-2 text-center min-w-0 align-middle">
                            {product.category ? (
                              <span className="inline-block max-w-[100px] truncate px-2 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-700" title={product.category}>
                                {product.category}
                              </span>
                            ) : (
                              <span className="text-gray-400 text-xs">—</span>
                            )}
                          </td>
                          <td className="py-1.5 px-2 font-medium text-gray-900 min-w-0 truncate text-center align-middle text-sm">
                            ${parseFloat(product.price).toFixed(2)}
                          </td>
                          <td className="py-1.5 px-1.5 text-gray-600 min-w-0 truncate text-center align-middle text-sm">
                            {product.quantity}
                          </td>
                          <td className="hidden xl:table-cell py-1.5 px-3 text-gray-500 text-xs min-w-0 truncate text-center align-middle">
                            {deletedDate}
                          </td>
                          <td className="py-1.5 px-2 min-w-0 text-center align-middle">
                            <span className="inline-flex items-center justify-center gap-1.5 text-xs text-gray-700 font-medium whitespace-nowrap shrink-0">
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  daysLeft <= 5
                                    ? 'bg-red-500'
                                    : daysLeft <= 15
                                    ? 'bg-amber-500'
                                    : 'bg-green-500'
                                }`}
                              />
                              {daysLeft}d left
                            </span>
                          </td>
                          <td className="py-1.5 px-2 text-center min-w-0 align-middle">
                            <div className="inline-flex items-center justify-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => restoreProductMutation.mutate(product.id)}
                                disabled={restoreProductMutation.isPending}
                                className="w-7 h-7 inline-flex items-center justify-center text-gray-400 hover:text-indigo-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer shrink-0"
                                title="Restore Product"
                                aria-label="Restore Product"
                              >
                                <RotateCcw className="w-4 h-4 stroke-[1.5]" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setItemToDelete({ type: 'product', item: product })}
                                className="w-7 h-7 inline-flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer shrink-0"
                                title="Delete Permanently"
                                aria-label="Delete Permanently"
                              >
                                <Trash2 className="w-4 h-4 stroke-[1.5]" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Stacked Cards (below 768px) */}
            <div className="md:hidden divide-y divide-gray-100 w-full">
              {isProductsLoading ? (
                <div className="p-4 space-y-3">
                  <Skeleton type="card" count={3} />
                </div>
              ) : trashedProducts.length === 0 ? (
                <div className="py-12 px-4 text-center">
                  <EmptyState
                    icon={Trash2}
                    title="No products in Recycle Bin"
                    description={
                      productSearch
                        ? 'No trashed products match your search query.'
                        : 'Products moved to the bin will appear here for 30 days.'
                    }
                    actionText={productSearch ? 'Clear search' : 'Back to Stock'}
                    onAction={() => (productSearch ? setProductSearch('') : navigate('/products/items'))}
                    actionIcon={Package}
                    className="border-0 shadow-none bg-transparent"
                  />
                </div>
              ) : (
                trashedProducts.map((product) => {
                  const daysLeft = product.days_left !== undefined ? product.days_left : 30;
                  return (
                    <div key={product.id} className="p-4 space-y-2 bg-white hover:bg-gray-50/50 transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold text-gray-900 text-sm truncate" title={product.name}>
                            {product.name}
                          </h3>
                          <p className="font-mono text-xs text-gray-500 mt-0.5 truncate">
                            Item Code: {product.sku}
                          </p>
                        </div>
                        <span className="inline-flex items-center gap-1.5 text-xs text-gray-700 font-medium shrink-0">
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              daysLeft <= 5 ? 'bg-red-500' : 'bg-green-500'
                            }`}
                          />
                          {daysLeft}d left
                        </span>
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-gray-100 text-xs">
                        <div className="flex items-center gap-3 text-gray-600">
                          <span>${parseFloat(product.price).toFixed(2)}</span>
                          <span>Qty: {product.quantity}</span>
                          {product.category && (
                            <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 truncate max-w-[80px]">
                              {product.category}
                            </span>
                          )}
                        </div>

                        <div className="inline-flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => restoreProductMutation.mutate(product.id)}
                            className="w-8 h-8 inline-flex items-center justify-center text-gray-400 hover:text-indigo-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                            title="Restore"
                            aria-label="Restore"
                          >
                            <RotateCcw className="w-4 h-4 stroke-[1.5]" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setItemToDelete({ type: 'product', item: product })}
                            className="w-8 h-8 inline-flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            title="Delete Permanently"
                            aria-label="Delete Permanently"
                          >
                            <Trash2 className="w-4 h-4 stroke-[1.5]" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Pagination */}
            {productMeta && (
              <Pagination
                page={productPage}
                lastPage={productMeta.last_page}
                from={productMeta.from}
                to={productMeta.to}
                total={productMeta.total}
                itemLabel="products"
                onPageChange={setProductPage}
                isLoading={isProductsLoading}
              />
            )}
          </div>
        </div>
      )}

      {/* SUPPLIERS TAB CONTENT */}
      {activeTab === 'suppliers' && (
        <div className="space-y-4">
          {/* Search bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 stroke-[1.5]" />
              <input
                type="text"
                value={supplierSearch}
                onChange={(e) => {
                  setSupplierSearch(e.target.value);
                  setSupplierPage(1);
                }}
                placeholder="Search trashed suppliers..."
                className="w-full h-9 pl-9 pr-8 bg-white border border-gray-300 rounded-lg text-sm placeholder:text-gray-400 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 transition-colors"
              />
              {supplierSearch && (
                <button
                  type="button"
                  onClick={() => setSupplierSearch('')}
                  className="p-1 text-gray-400 hover:text-gray-600 absolute right-2 top-1/2 -translate-y-1/2 rounded cursor-pointer"
                >
                  <X className="w-3.5 h-3.5 stroke-[1.5]" />
                </button>
              )}
            </div>
          </div>

          {/* Suppliers Table Card */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden w-full">
            {/* Desktop / Tablet Table (768px and up) */}
            <div className="hidden md:block w-full">
              <table className="w-full table-fixed text-left border-collapse">
                <thead>
                  <tr className="h-10 border-b border-gray-200 bg-white text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <th className="py-2 px-3 sm:px-4 w-[35%] truncate text-left align-middle">Supplier</th>
                    <th className="py-2 px-3 w-[18%] truncate text-center align-middle">Mobile</th>
                    <th className="py-2 px-3 w-[15%] truncate text-center align-middle">City</th>
                    <th className="hidden xl:table-cell py-2 px-3 w-[14%] truncate text-center align-middle">Deleted Date</th>
                    <th className="py-2 px-3 w-[14%] truncate text-center align-middle">Retention</th>
                    <th className="py-2 px-3 sm:px-4 text-center w-[14%] truncate align-middle">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100 text-sm">
                  {isSuppliersLoading ? (
                    <Skeleton type="table-row" count={5} />
                  ) : trashedSuppliers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-16 px-4 text-center">
                        <EmptyState
                          icon={Trash2}
                          title="No suppliers in Recycle Bin"
                          description={
                            supplierSearch
                              ? 'No trashed suppliers match your search query.'
                              : 'Suppliers moved to the bin will appear here for 30 days before permanent removal.'
                          }
                          actionText={supplierSearch ? 'Clear search' : 'Back to Suppliers'}
                          onAction={() => (supplierSearch ? setSupplierSearch('') : navigate('/products/suppliers'))}
                          actionIcon={Truck}
                          className="border-0 shadow-none bg-transparent"
                        />
                      </td>
                    </tr>
                  ) : (
                    trashedSuppliers.map((supplier) => {
                      const deletedDate = supplier.deleted_at
                        ? new Date(supplier.deleted_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })
                        : '—';

                      const daysLeft = supplier.days_left !== undefined ? supplier.days_left : 30;

                      return (
                        <tr key={supplier.id} className="hover:bg-gray-50/75 transition-colors">
                          <td className="py-2 px-3 sm:px-4 min-w-0 text-left align-middle">
                            <div
                              className="font-medium text-gray-900 truncate leading-tight text-sm"
                              title={supplier.name}
                            >
                              {supplier.name}
                            </div>
                            {supplier.contact_person && (
                              <div
                                className="text-xs text-gray-500 truncate mt-0.5 leading-none"
                                title={supplier.contact_person}
                              >
                                Contact: {supplier.contact_person}
                              </div>
                            )}
                          </td>

                          <td className="py-2 px-3 text-center min-w-0 align-middle">
                            <span className="font-mono text-gray-600 text-xs">
                              {supplier.mobile}
                            </span>
                          </td>

                          <td className="py-2 px-3 text-center min-w-0 align-middle text-xs text-gray-600">
                            {supplier.city || <span className="text-gray-300">—</span>}
                          </td>

                          <td className="hidden xl:table-cell py-2 px-3 text-center min-w-0 align-middle text-xs text-gray-500">
                            {deletedDate}
                          </td>

                          <td className="py-2 px-3 text-center min-w-0 align-middle">
                            <span className="inline-flex items-center gap-1.5 text-xs text-gray-700 font-medium">
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  daysLeft <= 5 ? 'bg-red-500' : 'bg-green-500'
                                }`}
                              />
                              {daysLeft}d left
                            </span>
                          </td>

                          <td className="py-2 px-3 sm:px-4 text-center shrink-0 min-w-0 align-middle">
                            <div className="inline-flex items-center justify-center gap-1.5">
                              <Button
                                variant="secondary"
                                size="xs"
                                onClick={() => restoreSupplierMutation.mutate(supplier.id)}
                                isLoading={restoreSupplierMutation.isPending}
                                icon={RotateCcw}
                                title="Restore Supplier"
                              >
                                Restore
                              </Button>

                              <button
                                type="button"
                                onClick={() => setItemToDelete({ type: 'supplier', item: supplier })}
                                className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer"
                                title="Delete Permanently"
                              >
                                <Trash2 className="w-3.5 h-3.5 stroke-[1.5]" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Stacked Cards (below 768px) */}
            <div className="md:hidden divide-y divide-gray-100 w-full">
              {isSuppliersLoading ? (
                <div className="p-4 space-y-3">
                  <Skeleton type="card" count={3} />
                </div>
              ) : trashedSuppliers.length === 0 ? (
                <div className="py-12 px-4 text-center">
                  <EmptyState
                    icon={Trash2}
                    title="No suppliers in Recycle Bin"
                    description={
                      supplierSearch
                        ? 'No trashed suppliers match your search query.'
                        : 'Suppliers moved to the bin will appear here for 30 days.'
                    }
                    actionText={supplierSearch ? 'Clear search' : 'Back to Suppliers'}
                    onAction={() => (supplierSearch ? setSupplierSearch('') : navigate('/products/suppliers'))}
                    actionIcon={Truck}
                    className="border-0 shadow-none bg-transparent"
                  />
                </div>
              ) : (
                trashedSuppliers.map((supplier) => {
                  const daysLeft = supplier.days_left !== undefined ? supplier.days_left : 30;
                  return (
                    <div key={supplier.id} className="p-4 space-y-2 bg-white hover:bg-gray-50/50 transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold text-gray-900 text-sm truncate" title={supplier.name}>
                            {supplier.name}
                          </h3>
                          {supplier.contact_person && (
                            <p className="text-xs text-gray-500 mt-0.5 truncate">
                              Contact: {supplier.contact_person}
                            </p>
                          )}
                        </div>
                        <span className="inline-flex items-center gap-1.5 text-xs text-gray-700 font-medium shrink-0">
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              daysLeft <= 5 ? 'bg-red-500' : 'bg-green-500'
                            }`}
                          />
                          {daysLeft}d left
                        </span>
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-gray-100 text-xs">
                        <div className="flex items-center gap-3 text-gray-600">
                          <span>{supplier.mobile}</span>
                          {supplier.city && <span>{supplier.city}</span>}
                        </div>

                        <div className="inline-flex items-center gap-1 shrink-0">
                          <Button
                            variant="secondary"
                            size="xs"
                            onClick={() => restoreSupplierMutation.mutate(supplier.id)}
                            isLoading={restoreSupplierMutation.isPending}
                            icon={RotateCcw}
                          >
                            Restore
                          </Button>
                          <button
                            type="button"
                            onClick={() => setItemToDelete({ type: 'supplier', item: supplier })}
                            className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5 stroke-[1.5]" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Pagination */}
            {supplierMeta && (
              <Pagination
                page={supplierPage}
                lastPage={supplierMeta.last_page}
                from={supplierMeta.from}
                to={supplierMeta.to}
                total={supplierMeta.total}
                itemLabel="suppliers"
                onPageChange={setSupplierPage}
                isLoading={isSuppliersLoading}
              />
            )}
          </div>
        </div>
      )}

      {/* DESIGNS TAB CONTENT */}
      {activeTab === 'designs' && (
        <div className="space-y-4">
          {/* Search bar & Type filter chips */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 stroke-[1.5]" />
              <input
                type="text"
                value={designSearch}
                onChange={(e) => {
                  setDesignSearch(e.target.value);
                  setDesignPage(1);
                }}
                placeholder="Search trashed designs..."
                className="w-full h-9 pl-9 pr-8 bg-white border border-gray-300 rounded-lg text-sm placeholder:text-gray-400 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 transition-colors"
              />
              {designSearch && (
                <button
                  type="button"
                  onClick={() => setDesignSearch('')}
                  className="p-1 text-gray-400 hover:text-gray-600 absolute right-2 top-1/2 -translate-y-1/2 rounded cursor-pointer"
                >
                  <X className="w-3.5 h-3.5 stroke-[1.5]" />
                </button>
              )}
            </div>

            {/* Type filter chips */}
            <div className="inline-flex p-0.5 bg-gray-100 border border-gray-200 rounded-lg self-start sm:self-auto shrink-0">
              {[
                { value: 'all', label: 'All Designs', icon: Layers },
                { value: 'barcode', label: 'Barcodes', icon: Barcode },
                { value: 'qr', label: 'QR Codes', icon: QrCode },
              ].map((opt) => {
                const Icon = opt.icon;
                const isActive = designType === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      setDesignType(opt.value);
                      setDesignPage(1);
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-white text-indigo-600 font-semibold'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 stroke-[1.5]" />
                    <span>{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Designs Table Card */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden w-full">
            {/* Desktop / Tablet Table (768px and up) */}
            <div className="hidden md:block w-full">
              <table className="w-full table-fixed text-left border-collapse">
                <thead>
                  <tr className="h-10 border-b border-gray-200 bg-white text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <th className="py-2 px-3 sm:px-4 w-[10%] lg:w-[8%] xl:w-[6%] text-center align-middle">Preview</th>
                    <th className="py-2 px-3 w-[46%] lg:w-[36%] xl:w-[32%] truncate text-left align-middle">Name & Value</th>
                    <th className="py-2 px-3 w-[18%] lg:w-[16%] xl:w-[13%] truncate text-center align-middle">Type</th>
                    <th className="hidden lg:table-cell py-2 px-3 w-[14%] xl:w-[12%] truncate text-center align-middle">Format</th>
                    <th className="hidden xl:table-cell py-2 px-3 w-[13%] truncate text-center align-middle">Deleted Date</th>
                    <th className="py-2 px-3 w-[26%] lg:w-[16%] xl:w-[14%] truncate text-center align-middle">Retention</th>
                    <th className="py-2 px-3 sm:px-4 text-center w-[14%] lg:w-[12%] xl:w-[10%] truncate align-middle">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100 text-sm">
                  {isCodesLoading ? (
                    <Skeleton type="table-row" count={5} />
                  ) : trashedCodes.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-16 px-4 text-center">
                        <EmptyState
                          icon={Trash2}
                          title="No designs in Recycle Bin"
                          description={
                            designSearch
                              ? 'No trashed designs match your search query.'
                              : 'Deleted barcodes and QR codes will appear here for 30 days before permanent removal.'
                          }
                          actionText={designSearch ? 'Clear search' : 'Back to Gallery'}
                          onAction={() => (designSearch ? setDesignSearch('') : navigate('/'))}
                          actionIcon={Barcode}
                          className="border-0 shadow-none bg-transparent"
                        />
                      </td>
                    </tr>
                  ) : (
                    trashedCodes.map((code) => {
                      const deletedDate = code.deleted_at
                        ? new Date(code.deleted_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })
                        : '—';

                      const daysLeft = code.days_left !== undefined ? code.days_left : 30;

                      return (
                        <tr key={code.id} className="hover:bg-gray-50/75 transition-colors">
                          {/* Preview Thumbnail */}
                          <td className="py-2 px-3 sm:px-4 text-center align-middle">
                            <div className="w-8 h-8 rounded-lg bg-gray-50 border border-gray-200 p-0.5 flex items-center justify-center shrink-0 mx-auto">
                              {code.preview_url ? (
                                <img
                                  src={code.preview_url}
                                  alt={code.name}
                                  className="w-full h-full object-contain"
                                />
                              ) : (
                                <Barcode className="w-4 h-4 text-gray-300 stroke-[1.5]" />
                              )}
                            </div>
                          </td>

                          {/* Name & Encoded Value */}
                          <td className="py-2 px-3 min-w-0 text-left align-middle">
                            <div
                              className="font-medium text-gray-900 truncate leading-tight text-sm"
                              title={code.name}
                            >
                              {code.name}
                            </div>
                            <div
                              className="text-xs text-gray-500 font-mono truncate mt-0.5 leading-none"
                              title={code.value}
                            >
                              {code.value}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5 leading-none">
                              <span className="text-[11px] font-mono text-gray-400 lg:hidden">
                                {code.format}
                              </span>
                              {code.product && (
                                <span
                                  className="text-[11px] text-gray-500 truncate"
                                  title={code.product.name}
                                >
                                  • {code.product.name}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Type Badge */}
                          <td className="py-2 px-3 min-w-0 text-center align-middle">
                            <Badge variant={code.type === 'qr' ? 'neutral' : 'neutral'} size="sm">
                              {code.type === 'qr' ? 'QR Code' : 'Barcode'}
                            </Badge>
                          </td>

                          {/* Format */}
                          <td className="hidden lg:table-cell py-2 px-3 font-mono text-[13px] text-gray-600 min-w-0 truncate text-center align-middle">
                            {code.format}
                          </td>

                          {/* Deleted Date */}
                          <td className="hidden xl:table-cell py-2 px-3 text-gray-500 text-xs min-w-0 truncate text-center align-middle">
                            {deletedDate}
                          </td>

                          {/* Retention (Days Left) */}
                          <td className="py-2 px-3 min-w-0 text-center align-middle">
                            <span className="inline-flex items-center justify-center gap-1.5 text-xs text-gray-700 font-medium whitespace-nowrap shrink-0">
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  daysLeft <= 5
                                    ? 'bg-red-500'
                                    : daysLeft <= 15
                                    ? 'bg-amber-500'
                                    : 'bg-green-500'
                                }`}
                              />
                              {daysLeft}d left
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="py-2 px-3 sm:px-4 text-center min-w-0 align-middle">
                            <div className="inline-flex items-center justify-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => restoreCodeMutation.mutate(code.id)}
                                disabled={restoreCodeMutation.isPending}
                                className="w-7 h-7 inline-flex items-center justify-center text-gray-400 hover:text-indigo-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer shrink-0"
                                title="Restore Design"
                                aria-label="Restore Design"
                              >
                                <RotateCcw className="w-4 h-4 stroke-[1.5]" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setItemToDelete({ type: 'code', item: code })}
                                className="w-7 h-7 inline-flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer shrink-0"
                                title="Delete Permanently"
                                aria-label="Delete Permanently"
                              >
                                <Trash2 className="w-4 h-4 stroke-[1.5]" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Stacked Cards (below 768px) */}
            <div className="md:hidden divide-y divide-gray-100 w-full">
              {isCodesLoading ? (
                <div className="p-4 space-y-3">
                  <Skeleton type="card" count={3} />
                </div>
              ) : trashedCodes.length === 0 ? (
                <div className="py-12 px-4 text-center">
                  <EmptyState
                    icon={Trash2}
                    title="No designs in Recycle Bin"
                    description={
                      designSearch
                        ? 'No trashed designs match your search query.'
                        : 'Deleted barcodes and QR codes will appear here for 30 days.'
                    }
                    actionText={designSearch ? 'Clear search' : 'Back to Gallery'}
                    onAction={() => (designSearch ? setDesignSearch('') : navigate('/'))}
                    actionIcon={Barcode}
                    className="border-0 shadow-none bg-transparent"
                  />
                </div>
              ) : (
                trashedCodes.map((code) => {
                  const daysLeft = code.days_left !== undefined ? code.days_left : 30;
                  return (
                    <div key={code.id} className="p-4 flex gap-3 bg-white hover:bg-gray-50/50 transition-colors">
                      {/* Thumbnail */}
                      <div className="w-12 h-12 rounded-lg bg-gray-50 border border-gray-200 p-0.5 flex items-center justify-center shrink-0">
                        {code.preview_url ? (
                          <img
                            src={code.preview_url}
                            alt={code.name}
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <Barcode className="w-6 h-6 text-gray-300 stroke-[1.5]" />
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <h3 className="font-semibold text-gray-900 text-sm truncate" title={code.name}>
                              {code.name}
                            </h3>
                            <p className="font-mono text-xs text-gray-500 truncate mt-0.5">
                              {code.value}
                            </p>
                          </div>
                          <span className="inline-flex items-center gap-1.5 text-xs text-gray-700 font-medium shrink-0">
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                daysLeft <= 5 ? 'bg-red-500' : 'bg-green-500'
                              }`}
                            />
                            {daysLeft}d left
                          </span>
                        </div>

                        <div className="flex items-center justify-between pt-1 border-t border-gray-100">
                          <div className="flex items-center gap-2 text-xs">
                            <Badge variant="neutral" size="sm">
                              {code.type === 'qr' ? 'QR' : 'Barcode'}
                            </Badge>
                            <span className="font-mono text-gray-500 text-[11px]">
                              {code.format}
                            </span>
                          </div>

                          <div className="inline-flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => restoreCodeMutation.mutate(code.id)}
                              className="w-8 h-8 inline-flex items-center justify-center text-gray-400 hover:text-indigo-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                              title="Restore"
                              aria-label="Restore"
                            >
                              <RotateCcw className="w-4 h-4 stroke-[1.5]" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setItemToDelete({ type: 'code', item: code })}
                              className="w-8 h-8 inline-flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                              title="Delete Permanently"
                              aria-label="Delete Permanently"
                            >
                              <Trash2 className="w-4 h-4 stroke-[1.5]" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Pagination */}
            {codeMeta && (
              <Pagination
                page={designPage}
                lastPage={codeMeta.last_page}
                from={codeMeta.from}
                to={codeMeta.to}
                total={codeMeta.total}
                itemLabel="designs"
                onPageChange={setDesignPage}
                isLoading={isCodesLoading}
              />
            )}
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL: Permanent Single Item Delete */}
      <Modal
        isOpen={Boolean(itemToDelete)}
        onClose={() => setItemToDelete(null)}
        title={
          itemToDelete?.type === 'product'
            ? 'Permanently Delete Product?'
            : itemToDelete?.type === 'supplier'
            ? 'Permanently Delete Supplier?'
            : 'Permanently Delete Design?'
        }
        description="This action cannot be undone. All associated data will be permanently erased."
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setItemToDelete(null)}
              disabled={isActionPending}
            >
              Cancel
            </Button>
            <Button
              variant="danger-solid"
              onClick={handleConfirmPermanentDelete}
              isLoading={isActionPending}
            >
              Delete Permanently
            </Button>
          </>
        }
      >
        {itemToDelete && (
          <div className="p-3.5 bg-red-50/60 rounded-lg border border-red-200 flex items-start gap-2.5 text-xs text-red-900">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0 mt-1.5" />
            <div>
              <p className="font-semibold">
                {itemToDelete.type === 'product'
                  ? `Product: ${itemToDelete.item.name} (${itemToDelete.item.sku})`
                  : itemToDelete.type === 'supplier'
                  ? `Supplier: ${itemToDelete.item.name} (${itemToDelete.item.mobile})`
                  : `Design: ${itemToDelete.item.name} (${itemToDelete.item.format})`}
              </p>
              <p className="text-xs text-red-700 mt-1">
                {itemToDelete.type === 'supplier'
                  ? 'This supplier will be completely removed from the database and any linked products will have their supplier cleared.'
                  : 'This item will be completely removed from the database and cannot be recovered.'}
              </p>
            </div>
          </div>
        )}
      </Modal>

      {/* CONFIRMATION MODAL: Empty Active Bin */}
      <Modal
        isOpen={isEmptyBinModalOpen}
        onClose={() => setIsEmptyBinModalOpen(false)}
        title={
          activeTab === 'products'
            ? 'Empty Products Recycle Bin?'
            : activeTab === 'suppliers'
            ? 'Empty Suppliers Recycle Bin?'
            : 'Empty Designs Recycle Bin?'
        }
        description={`This will permanently delete all ${
          activeTab === 'products'
            ? 'products'
            : activeTab === 'suppliers'
            ? 'suppliers'
            : 'designs'
        } currently in the Recycle Bin. This action cannot be undone.`}
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setIsEmptyBinModalOpen(false)}
              disabled={isActionPending}
            >
              Cancel
            </Button>
            <Button
              variant="danger-solid"
              onClick={handleConfirmEmptyBin}
              isLoading={isActionPending}
            >
              Empty Bin
            </Button>
          </>
        }
      >
        <div className="p-3.5 bg-amber-50/60 rounded-lg border border-amber-200 flex items-start gap-2.5 text-xs text-amber-900">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 mt-1.5" />
          <div>
            <p className="font-semibold">Warning: Irreversible Action</p>
            <p className="text-xs text-amber-700 mt-1">
              You are about to permanently purge {currentTabCount}{' '}
              {activeTab === 'products'
                ? 'products'
                : activeTab === 'suppliers'
                ? 'suppliers'
                : 'designs'}
              .
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
}
