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
} from 'lucide-react';

import Button from '../components/Button';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import Skeleton from '../components/Skeleton';
import EmptyState from '../components/EmptyState';
import Pagination from '../components/Pagination';

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

import { getBinSummary } from '../api/bin';

export default function RecycleBinPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  // Active tab: 'products' | 'designs'
  const activeTab = searchParams.get('tab') === 'designs' ? 'designs' : 'products';

  const setActiveTab = (tab) => {
    setSearchParams({ tab });
    setProductSearch('');
    setDesignSearch('');
    setProductPage(1);
    setDesignPage(1);
  };

  // Products filters & pagination
  const [productSearch, setProductSearch] = useState('');
  const [productPage, setProductPage] = useState(1);

  // Designs filters & pagination
  const [designSearch, setDesignSearch] = useState('');
  const [designType, setDesignType] = useState('all'); // 'all' | 'barcode' | 'qr'
  const [designPage, setDesignPage] = useState(1);

  // Modals state
  const [itemToDelete, setItemToDelete] = useState(null); // { type: 'product'|'code', item }
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

  const trashedCodes = codeTrashResponse?.data || [];
  const codeMeta = codeTrashResponse?.meta;

  // Invalidate all related queries
  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['products'] });
    queryClient.invalidateQueries({ queryKey: ['products-summary'] });
    queryClient.invalidateQueries({ queryKey: ['products-trash'] });
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

  // Modal actions
  const handleConfirmPermanentDelete = () => {
    if (!itemToDelete) return;
    if (itemToDelete.type === 'product') {
      forceDeleteProductMutation.mutate(itemToDelete.item.id);
    } else {
      forceDeleteCodeMutation.mutate(itemToDelete.item.id);
    }
  };

  const handleConfirmEmptyBin = () => {
    if (activeTab === 'products') {
      emptyProductsTrashMutation.mutate();
    } else {
      emptyCodesTrashMutation.mutate();
    }
  };

  const currentTabCount = activeTab === 'products' ? (binSummary?.products || 0) : (binSummary?.codes || 0);
  const isActionPending =
    forceDeleteProductMutation.isPending ||
    forceDeleteCodeMutation.isPending ||
    emptyProductsTrashMutation.isPending ||
    emptyCodesTrashMutation.isPending;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <Link
              to={activeTab === 'products' ? '/stock' : '/'}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              title="Go back"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <Trash2 className="w-5 h-5" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Recycle Bin</h1>
            </div>
          </div>
          <p className="text-sm text-slate-500 mt-1 pl-11">
            Items remain here for 30 days before being automatically purged permanently.
          </p>
        </div>

        {/* Top actions scoped to active tab */}
        <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto pl-11 sm:pl-0 flex-wrap">
          <Button
            variant="outline"
            size="md"
            icon={RotateCcw}
            onClick={() => {
              if (activeTab === 'products') {
                restoreAllProductsMutation.mutate();
              } else {
                restoreAllCodesMutation.mutate();
              }
            }}
            disabled={currentTabCount === 0 || restoreAllProductsMutation.isPending || restoreAllCodesMutation.isPending}
            isLoading={restoreAllProductsMutation.isPending || restoreAllCodesMutation.isPending}
          >
            Restore all
          </Button>

          <Button
            variant="danger"
            size="md"
            icon={Trash2}
            onClick={() => setIsEmptyBinModalOpen(true)}
            disabled={currentTabCount === 0 || emptyProductsTrashMutation.isPending || emptyCodesTrashMutation.isPending}
          >
            Empty bin
          </Button>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab('products')}
          className={`flex items-center gap-2 py-3 px-4 border-b-2 font-medium text-sm transition-all cursor-pointer ${
            activeTab === 'products'
              ? 'border-indigo-600 text-indigo-600 font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Products</span>
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
              activeTab === 'products'
                ? 'bg-indigo-50 text-indigo-600'
                : 'bg-slate-100 text-slate-600'
            }`}
          >
            {binSummary?.products ?? 0}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('designs')}
          className={`flex items-center gap-2 py-3 px-4 border-b-2 font-medium text-sm transition-all cursor-pointer ${
            activeTab === 'designs'
              ? 'border-indigo-600 text-indigo-600 font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
          }`}
        >
          <Barcode className="w-4 h-4" />
          <span>Designs</span>
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
              activeTab === 'designs'
                ? 'bg-indigo-50 text-indigo-600'
                : 'bg-slate-100 text-slate-600'
            }`}
          >
            {binSummary?.codes ?? 0}
          </span>
        </button>
      </div>

      {/* PRODUCTS TAB CONTENT */}
      {activeTab === 'products' && (
        <div className="space-y-4">
          {/* Search bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={productSearch}
                onChange={(e) => {
                  setProductSearch(e.target.value);
                  setProductPage(1);
                }}
                placeholder="Search trashed products..."
                className="w-full pl-9 pr-9 py-2 bg-white border border-slate-300 rounded-xl text-sm placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all shadow-xs"
              />
              {productSearch && (
                <button
                  type="button"
                  onClick={() => setProductSearch('')}
                  className="p-1 text-slate-400 hover:text-slate-600 absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left border-collapse min-w-[780px]">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/75 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4 sm:px-6 min-w-[220px]">Product</th>
                    <th className="py-3 px-4 min-w-[130px] whitespace-nowrap">SKU</th>
                    <th className="py-3 px-4 min-w-[120px] whitespace-nowrap">Category</th>
                    <th className="py-3 px-4 min-w-[90px] whitespace-nowrap">Price</th>
                    <th className="py-3 px-4 min-w-[80px] whitespace-nowrap">Qty</th>
                    <th className="py-3 px-4 min-w-[120px] whitespace-nowrap">Deleted Date</th>
                    <th className="py-3 px-4 min-w-[130px] whitespace-nowrap">Retention</th>
                    <th className="py-3 px-4 sm:px-6 text-right min-w-[120px] whitespace-nowrap">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 text-sm">
                  {isProductsLoading ? (
                    <Skeleton type="table-row" count={5} />
                  ) : trashedProducts.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-16 px-4 text-center">
                        <EmptyState
                          icon={Trash2}
                          title="No products in Recycle Bin"
                          description={
                            productSearch
                              ? 'No trashed products match your search query.'
                              : 'Products moved to the bin will appear here for 30 days before permanent removal.'
                          }
                          actionText={productSearch ? 'Clear search' : 'Back to Stock'}
                          onAction={() => (productSearch ? setProductSearch('') : navigate('/stock'))}
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
                        <tr key={product.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3.5 px-4 sm:px-6 max-w-[280px]">
                            <div
                              className="font-semibold text-slate-900 truncate"
                              title={product.name}
                            >
                              {product.name}
                            </div>
                            {product.description && (
                              <div
                                className="text-xs text-slate-400 truncate mt-0.5"
                                title={product.description}
                              >
                                {product.description}
                              </div>
                            )}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-xs font-semibold text-slate-700 whitespace-nowrap">
                            {product.sku}
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            {product.category ? (
                              <span className="inline-block px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-600">
                                {product.category}
                              </span>
                            ) : (
                              <span className="text-slate-400 text-xs">—</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 font-medium text-slate-900 whitespace-nowrap">
                            ${parseFloat(product.price).toFixed(2)}
                          </td>
                          <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                            {product.quantity}
                          </td>
                          <td className="py-3.5 px-4 text-slate-500 text-xs whitespace-nowrap">
                            {deletedDate}
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap shrink-0 ${
                                daysLeft <= 5
                                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                  : daysLeft <= 15
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              }`}
                            >
                              <Clock className="w-3 h-3 shrink-0" />
                              {daysLeft} {daysLeft === 1 ? 'day' : 'days'} left
                            </span>
                          </td>
                          <td className="py-3.5 px-4 sm:px-6 text-right whitespace-nowrap">
                            <div className="inline-flex items-center justify-end gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => restoreProductMutation.mutate(product.id)}
                                disabled={restoreProductMutation.isPending}
                                className="w-8 h-8 inline-flex items-center justify-center text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer shrink-0"
                                title="Restore Product"
                              >
                                <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setItemToDelete({ type: 'product', item: product })}
                                className="w-8 h-8 inline-flex items-center justify-center text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer shrink-0"
                                title="Delete Permanently"
                              >
                                <Trash2 className="w-3.5 h-3.5 shrink-0" />
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

      {/* DESIGNS TAB CONTENT */}
      {activeTab === 'designs' && (
        <div className="space-y-4">
          {/* Search bar & Type filter chips */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={designSearch}
                onChange={(e) => {
                  setDesignSearch(e.target.value);
                  setDesignPage(1);
                }}
                placeholder="Search trashed designs..."
                className="w-full pl-9 pr-9 py-2 bg-white border border-slate-300 rounded-xl text-sm placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all shadow-xs"
              />
              {designSearch && (
                <button
                  type="button"
                  onClick={() => setDesignSearch('')}
                  className="p-1 text-slate-400 hover:text-slate-600 absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Type filter chips */}
            <div className="inline-flex p-1 bg-slate-200/60 rounded-xl self-start sm:self-auto shrink-0">
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
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-white text-indigo-600 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/75 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4 sm:px-6 w-16">Preview</th>
                    <th className="py-3 px-4">Name & Value</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Format</th>
                    <th className="py-3 px-4">Deleted Date</th>
                    <th className="py-3 px-4">Retention</th>
                    <th className="py-3 px-4 sm:px-6 text-right">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 text-sm">
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
                        <tr key={code.id} className="hover:bg-slate-50/80 transition-colors">
                          {/* Preview Thumbnail */}
                          <td className="py-3 px-4 sm:px-6">
                            <div className="w-12 h-12 rounded-lg bg-white border border-slate-200 p-1 flex items-center justify-center shrink-0">
                              {code.preview_url ? (
                                <img
                                  src={code.preview_url}
                                  alt={code.name}
                                  className="w-full h-full object-contain"
                                />
                              ) : (
                                <Barcode className="w-6 h-6 text-slate-300" />
                              )}
                            </div>
                          </td>

                          {/* Name & Encoded Value */}
                          <td className="py-3.5 px-4 max-w-[260px]">
                            <div
                              className="font-semibold text-slate-900 truncate"
                              title={code.name}
                            >
                              {code.name}
                            </div>
                            <div
                              className="text-xs text-slate-400 font-mono truncate mt-0.5"
                              title={code.value}
                            >
                              {code.value}
                            </div>
                            {code.product && (
                              <div
                                className="text-[11px] text-indigo-600 truncate mt-0.5"
                                title={code.product.name}
                              >
                                Product: {code.product.name}
                              </div>
                            )}
                          </td>

                          {/* Type Badge */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <Badge variant={code.type === 'qr' ? 'accent' : 'primary'} size="sm">
                              {code.type === 'qr' ? 'QR Code' : 'Barcode'}
                            </Badge>
                          </td>

                          {/* Format */}
                          <td className="py-3.5 px-4 font-mono text-xs text-slate-700 whitespace-nowrap">
                            {code.format}
                          </td>

                          {/* Deleted Date */}
                          <td className="py-3.5 px-4 text-slate-500 text-xs whitespace-nowrap">
                            {deletedDate}
                          </td>

                          {/* Retention (Days Left) */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap shrink-0 ${
                                daysLeft <= 5
                                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                  : daysLeft <= 15
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              }`}
                            >
                              <Clock className="w-3 h-3 shrink-0" />
                              {daysLeft} {daysLeft === 1 ? 'day' : 'days'} left
                            </span>
                          </td>

                          {/* Row Actions */}
                          <td className="py-3.5 px-4 sm:px-6 text-right whitespace-nowrap">
                            <div className="inline-flex items-center justify-end gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => restoreCodeMutation.mutate(code.id)}
                                disabled={restoreCodeMutation.isPending}
                                className="w-8 h-8 inline-flex items-center justify-center text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer shrink-0"
                                title="Restore Design"
                              >
                                <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setItemToDelete({ type: 'code', item: code })}
                                className="w-8 h-8 inline-flex items-center justify-center text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer shrink-0"
                                title="Delete Permanently"
                              >
                                <Trash2 className="w-3.5 h-3.5 shrink-0" />
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
        title={itemToDelete?.type === 'product' ? 'Permanently Delete Product?' : 'Permanently Delete Design?'}
        description="This action cannot be undone. All associated data and preview files will be permanently erased."
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
              variant="danger"
              onClick={handleConfirmPermanentDelete}
              isLoading={isActionPending}
            >
              Delete Permanently
            </Button>
          </>
        }
      >
        {itemToDelete && (
          <div className="p-4 bg-rose-50/80 rounded-xl border border-rose-200/80 flex items-start gap-3 text-sm text-rose-900">
            <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">
                {itemToDelete.type === 'product'
                  ? `Product: ${itemToDelete.item.name} (${itemToDelete.item.sku})`
                  : `Design: ${itemToDelete.item.name} (${itemToDelete.item.format})`}
              </p>
              <p className="text-xs text-rose-700 mt-1">
                This item will be completely removed from the database and cannot be recovered.
              </p>
            </div>
          </div>
        )}
      </Modal>

      {/* CONFIRMATION MODAL: Empty Active Bin */}
      <Modal
        isOpen={isEmptyBinModalOpen}
        onClose={() => setIsEmptyBinModalOpen(false)}
        title={activeTab === 'products' ? 'Empty Products Recycle Bin?' : 'Empty Designs Recycle Bin?'}
        description={`This will permanently delete all ${
          activeTab === 'products' ? 'products' : 'designs'
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
              variant="danger"
              onClick={handleConfirmEmptyBin}
              isLoading={isActionPending}
            >
              Empty Bin
            </Button>
          </>
        }
      >
        <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 flex items-start gap-3 text-sm text-amber-900">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Warning: Irreversible Action</p>
            <p className="text-xs text-amber-700 mt-1">
              You are about to permanently purge {currentTabCount}{' '}
              {activeTab === 'products' ? 'products' : 'designs'}.
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
}
