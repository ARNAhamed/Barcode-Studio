import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Pencil,
  Trash2,
  Barcode,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  PackageOpen,
} from 'lucide-react';
import Badge from '../../components/Badge';
import Button from '../../components/Button';
import Skeleton from '../../components/Skeleton';
import EmptyState from '../../components/EmptyState';

export default function ProductTable({
  products = [],
  meta = null,
  isLoading = false,
  searchTerm = '',
  onSearchChange,
  sortField = '-created_at',
  onSortChange,
  page = 1,
  onPageChange,
  onEdit,
  onDelete,
}) {
  const navigate = useNavigate();

  const handleHeaderSort = (column) => {
    if (sortField === column) {
      onSortChange(`-${column}`);
    } else if (sortField === `-${column}`) {
      onSortChange(column);
    } else {
      onSortChange(column);
    }
  };

  const getSortIcon = (column) => {
    if (sortField === column) {
      return <ArrowUp className="w-3.5 h-3.5 text-indigo-600" />;
    }
    if (sortField === `-${column}`) {
      return <ArrowDown className="w-3.5 h-3.5 text-indigo-600" />;
    }
    return <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600" />;
  };

  const getStatusBadge = (product) => {
    const qty = product.quantity;
    const threshold = product.low_stock_threshold ?? 10;

    if (qty <= 0) {
      return (
        <Badge variant="danger" dot>
          Out of stock
        </Badge>
      );
    }
    if (qty <= threshold) {
      return (
        <Badge variant="warning" dot>
          Low stock ({qty})
        </Badge>
      );
    }
    return (
      <Badge variant="success" dot>
        In stock ({qty})
      </Badge>
    );
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
      {/* Table Toolbar */}
      <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by name, SKU, barcode..."
            className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100 transition-all"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-md cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {meta && (
          <div className="text-xs text-slate-500 font-medium self-start sm:self-auto">
            Showing <span className="font-semibold text-slate-700">{meta.from ?? 0}</span> to{' '}
            <span className="font-semibold text-slate-700">{meta.to ?? 0}</span> of{' '}
            <span className="font-semibold text-slate-700">{meta.total ?? 0}</span> products
          </div>
        )}
      </div>

      {/* Table Element */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[640px]">
          <thead>
            <tr className="bg-slate-50/75 border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              <th className="py-3 px-4 sm:px-6">Product</th>
              <th
                onClick={() => handleHeaderSort('sku')}
                className="py-3 px-4 cursor-pointer select-none group hover:bg-slate-100/60 transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  <span>SKU</span>
                  {getSortIcon('sku')}
                </div>
              </th>
              <th className="py-3 px-4">Barcode / EAN</th>
              <th
                onClick={() => handleHeaderSort('category')}
                className="py-3 px-4 cursor-pointer select-none group hover:bg-slate-100/60 transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  <span>Category</span>
                  {getSortIcon('category')}
                </div>
              </th>
              <th
                onClick={() => handleHeaderSort('price')}
                className="py-3 px-4 cursor-pointer select-none group hover:bg-slate-100/60 transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  <span>Price</span>
                  {getSortIcon('price')}
                </div>
              </th>
              <th
                onClick={() => handleHeaderSort('quantity')}
                className="py-3 px-4 cursor-pointer select-none group hover:bg-slate-100/60 transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  <span>Qty</span>
                  {getSortIcon('quantity')}
                </div>
              </th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 sm:px-6 text-right">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 text-sm">
            {isLoading ? (
              <Skeleton type="table-row" count={5} />
            ) : products.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 px-4 text-center">
                  <EmptyState
                    icon={PackageOpen}
                    title="No products found"
                    description={
                      searchTerm
                        ? `No products matched "${searchTerm}". Try resetting your search filter.`
                        : 'Your inventory is empty. Add your first product to get started.'
                    }
                    className="border-0 shadow-none bg-transparent"
                  />
                </td>
              </tr>
            ) : (
              products.map((product) => (
                <tr
                  key={product.id}
                  className="hover:bg-slate-50/80 transition-colors group"
                >
                  {/* Name & Description */}
                  <td className="py-3.5 px-4 sm:px-6">
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
                  <td className="py-3.5 px-4 font-mono text-xs font-medium text-slate-700">
                    {product.sku}
                  </td>

                  {/* Barcode Number */}
                  <td className="py-3.5 px-4 font-mono text-xs text-slate-500">
                    {product.barcode_number || <span className="text-slate-300">—</span>}
                  </td>

                  {/* Category */}
                  <td className="py-3.5 px-4">
                    {product.category ? (
                      <span className="inline-block px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-600">
                        {product.category}
                      </span>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>

                  {/* Price */}
                  <td className="py-3.5 px-4 font-medium text-slate-900">
                    ${parseFloat(product.price).toFixed(2)}
                  </td>

                  {/* Quantity */}
                  <td className="py-3.5 px-4 font-semibold text-slate-800">
                    {product.quantity}
                  </td>

                  {/* Status Badge */}
                  <td className="py-3.5 px-4">
                    {getStatusBadge(product)}
                  </td>

                  {/* Actions */}
                  <td className="py-3.5 px-4 sm:px-6 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {/* Generate Code button */}
                      <button
                        type="button"
                        onClick={() => navigate(`/designer?product_id=${product.id}`)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition-colors cursor-pointer"
                        title="Open Designer for this product"
                      >
                        <Barcode className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Generate</span>
                      </button>

                      {/* Edit button */}
                      <button
                        type="button"
                        onClick={() => onEdit(product)}
                        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                        title="Edit product"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>

                      {/* Delete button */}
                      <button
                        type="button"
                        onClick={() => onDelete(product)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Delete product"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {meta && meta.last_page > 1 && (
        <div className="p-4 sm:px-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <Button
            size="sm"
            variant="outline"
            disabled={page <= 1 || isLoading}
            onClick={() => onPageChange(page - 1)}
            icon={ChevronLeft}
            className="w-full sm:w-auto"
          >
            Previous
          </Button>

          <div className="flex items-center gap-1 overflow-x-auto max-w-full py-1">
            {Array.from({ length: meta.last_page }, (_, i) => i + 1).map((pageNum) => {
              const isCurrent = pageNum === page;
              return (
                <button
                  key={pageNum}
                  type="button"
                  onClick={() => onPageChange(pageNum)}
                  className={`w-8 h-8 rounded-lg text-xs font-semibold transition-colors cursor-pointer shrink-0 ${
                    isCurrent
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>

          <Button
            size="sm"
            variant="outline"
            disabled={page >= meta.last_page || isLoading}
            onClick={() => onPageChange(page + 1)}
            className="w-full sm:w-auto"
          >
            Next
            <ChevronRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
}
