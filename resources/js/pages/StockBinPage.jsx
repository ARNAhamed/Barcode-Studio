import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Trash2,
  RotateCcw,
  Package,
  Search,
  X,
  ArrowLeft,
  AlertTriangle,
  Clock,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';

import Button from '../components/Button';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import Skeleton from '../components/Skeleton';
import EmptyState from '../components/EmptyState';

import {
  getTrashedProducts,
  restoreProduct,
  forceDeleteProduct,
  restoreAllProducts,
  emptyProductTrash,
} from '../api/products';

export default function StockBinPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  // Modals state
  const [productToDelete, setProductToDelete] = useState(null);
  const [isEmptyBinModalOpen, setIsEmptyBinModalOpen] = useState(false);

  // Query: Trashed Products
  const { data: trashResponse, isLoading } = useQuery({
    queryKey: ['products-trash', { search, page }],
    queryFn: () => getTrashedProducts({ search: search || undefined, page, per_page: 10 }),
  });

  const trashedProducts = trashResponse?.data || [];
  const meta = trashResponse?.meta;

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['products'] });
    queryClient.invalidateQueries({ queryKey: ['products-summary'] });
    queryClient.invalidateQueries({ queryKey: ['products-trash'] });
  };

  // Mutation: Restore single product
  const restoreMutation = useMutation({
    mutationFn: restoreProduct,
    onSuccess: (res) => {
      invalidateAll();
      toast.success(res.message || 'Product restored successfully.');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to restore product.');
    },
  });

  // Mutation: Permanently delete single product
  const forceDeleteMutation = useMutation({
    mutationFn: forceDeleteProduct,
    onSuccess: () => {
      invalidateAll();
      toast.success('Product permanently deleted.');
      setProductToDelete(null);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to permanently delete product.');
    },
  });

  // Mutation: Restore all
  const restoreAllMutation = useMutation({
    mutationFn: restoreAllProducts,
    onSuccess: (res) => {
      invalidateAll();
      toast.success(res.message || 'All products restored.');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to restore products.');
    },
  });

  // Mutation: Empty trash
  const emptyTrashMutation = useMutation({
    mutationFn: emptyProductTrash,
    onSuccess: (res) => {
      invalidateAll();
      toast.success(res.message || 'Recycle Bin emptied.');
      setIsEmptyBinModalOpen(false);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to empty Recycle Bin.');
    },
  });

  return (
    <div className="space-y-6">
      {/* Header & Back link */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <Link
              to="/stock"
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              title="Back to Stock"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Recycle Bin</h1>
              <p className="text-xs text-slate-400">
                Items remain here for 30 days before being permanently deleted.
              </p>
            </div>
          </div>
        </div>

        {/* Global Bin Actions */}
        {trashedProducts.length > 0 && (
          <div className="flex items-center gap-2.5 self-start sm:self-auto">
            <Button
              variant="outline"
              size="sm"
              icon={RotateCcw}
              isLoading={restoreAllMutation.isPending}
              onClick={() => restoreAllMutation.mutate()}
            >
              Restore All
            </Button>
            <Button
              variant="danger"
              size="sm"
              icon={Trash2}
              onClick={() => setIsEmptyBinModalOpen(true)}
            >
              Empty Bin
            </Button>
          </div>
        )}
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search deleted products..."
              className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100 transition-all"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-md cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {meta && (
            <div className="text-xs text-slate-500 font-medium self-start sm:self-auto">
              Total trashed items: <span className="font-semibold text-slate-700">{meta.total}</span>
            </div>
          )}
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <th className="py-3 px-4 sm:px-6 text-left">Product</th>
                <th className="py-3 px-4 text-center">Item Code</th>
                <th className="py-3 px-4 text-center">Category</th>
                <th className="py-3 px-4 text-center">Price</th>
                <th className="py-3 px-4 text-center">Qty</th>
                <th className="py-3 px-4 text-center">Deleted Date</th>
                <th className="py-3 px-4 text-center">Retention</th>
                <th className="py-3 px-4 sm:px-6 text-center">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 text-sm">
              {isLoading ? (
                <Skeleton type="table-row" count={5} />
              ) : trashedProducts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 px-4 text-center">
                    <EmptyState
                      icon={Trash2}
                      title="Recycle Bin is empty"
                      description="No deleted products in the bin. Items deleted from stock will appear here for 30 days before permanent removal."
                      actionText="Back to Stock Management"
                      onAction={() => navigate('/stock')}
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
                      {/* Name */}
                      <td className="py-3.5 px-4 sm:px-6 text-left">
                        <div className="font-semibold text-slate-900 line-clamp-1">
                          {product.name}
                        </div>
                        {product.description && (
                          <div className="text-xs text-slate-400 line-clamp-1 mt-0.5">
                            {product.description}
                          </div>
                        )}
                      </td>

                      {/* SKU */}
                      <td className="py-3.5 px-4 font-mono text-xs font-medium text-slate-700 text-center">
                        {product.sku}
                      </td>

                      {/* Category */}
                      <td className="py-3.5 px-4 text-center">
                        {product.category ? (
                          <span className="inline-block px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-600">
                            {product.category}
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>

                      {/* Price */}
                      <td className="py-3.5 px-4 font-medium text-slate-900 text-center">
                        ${parseFloat(product.price).toFixed(2)}
                      </td>

                      {/* Quantity */}
                      <td className="py-3.5 px-4 text-slate-700 font-medium text-center">
                        {product.quantity}
                      </td>

                      {/* Deleted Date */}
                      <td className="py-3.5 px-4 text-xs text-slate-500 whitespace-nowrap text-center">
                        {deletedDate}
                      </td>

                      {/* Retention / Days Left */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            daysLeft <= 5
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          <Clock className="w-3 h-3" />
                          <span>{daysLeft} days left</span>
                        </span>
                      </td>

                      {/* Row Actions */}
                      <td className="py-3.5 px-4 sm:px-6 text-center">
                        <div className="inline-flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => restoreMutation.mutate(product.id)}
                            disabled={restoreMutation.isPending}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors cursor-pointer"
                            title="Restore product to active inventory"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Restore</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setProductToDelete(product)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 transition-colors cursor-pointer"
                            title="Permanently delete product"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete Permanently</span>
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
        {meta && meta.last_page > 1 && (
          <div className="p-4 sm:px-6 border-t border-slate-100 flex items-center justify-between">
            <Button
              size="sm"
              variant="outline"
              disabled={page <= 1 || isLoading}
              onClick={() => setPage(page - 1)}
              icon={ChevronLeft}
            >
              Previous
            </Button>
            <span className="text-xs text-slate-500 font-medium">
              Page {page} of {meta.last_page}
            </span>
            <Button
              size="sm"
              variant="outline"
              disabled={page >= meta.last_page || isLoading}
              onClick={() => setPage(page + 1)}
            >
              Next
              <ChevronRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>
        )}
      </div>

      {/* Single Permanent Delete Modal */}
      <Modal
        isOpen={Boolean(productToDelete)}
        onClose={() => setProductToDelete(null)}
        title="Permanently Delete Product"
        description="This action cannot be undone. The product will be completely removed from the database and any linked barcodes will lose their product reference."
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setProductToDelete(null)}
              disabled={forceDeleteMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              isLoading={forceDeleteMutation.isPending}
              onClick={() => forceDeleteMutation.mutate(productToDelete.id)}
            >
              Permanently Delete
            </Button>
          </>
        }
      >
        {productToDelete && (
          <div className="p-4 bg-rose-50/60 rounded-xl border border-rose-200/80 text-sm space-y-1">
            <div className="flex items-center gap-2 text-rose-800 font-semibold mb-1">
              <ShieldAlert className="w-4 h-4 text-rose-600" />
              <span>Permanent Deletion Warning</span>
            </div>
            <p className="font-semibold text-slate-900">{productToDelete.name}</p>
            <p className="text-xs font-mono text-slate-500">Item Code: {productToDelete.sku}</p>
          </div>
        )}
      </Modal>

      {/* Empty Bin Confirmation Modal */}
      <Modal
        isOpen={isEmptyBinModalOpen}
        onClose={() => setIsEmptyBinModalOpen(false)}
        title="Empty Recycle Bin"
        description="Are you sure you want to permanently delete ALL products in the Recycle Bin? This action cannot be undone."
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setIsEmptyBinModalOpen(false)}
              disabled={emptyTrashMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              isLoading={emptyTrashMutation.isPending}
              onClick={() => emptyTrashMutation.mutate()}
            >
              Empty Recycle Bin
            </Button>
          </>
        }
      />
    </div>
  );
}
