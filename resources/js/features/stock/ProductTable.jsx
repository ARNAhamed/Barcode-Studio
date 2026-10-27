import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Pencil,
  Trash2,
  Barcode,
  Search,
  X,
  PackageOpen,
  Wand2,
  Loader2,
} from 'lucide-react';
import Badge from '../../components/Badge';
import Skeleton from '../../components/Skeleton';
import EmptyState from '../../components/EmptyState';
import Pagination from '../../components/Pagination';
import { bulkGenerateBarcodes } from '../../api/products';

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
  selectedIds = [],
  onToggleSelect,
  onToggleSelectAll,
  isSelectAllMatching = false,
  onSelectAllMatching,
  onClearSelection,
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [bulkFormat, setBulkFormat] = useState('CODE128');
  const [isBulkGenerating, setIsBulkGenerating] = useState(false);

  const selectedCount = isSelectAllMatching
    ? meta?.total || products.length
    : selectedIds.length;

  const handleBulkGenerate = async () => {
    setIsBulkGenerating(true);
    try {
      const targetIds = isSelectAllMatching
        ? undefined
        : selectedIds.length > 0
        ? selectedIds
        : undefined;

      const res = await bulkGenerateBarcodes({
        product_ids: targetIds,
        all_matching: isSelectAllMatching,
        format: bulkFormat,
      });

      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['products-summary'] });
      if (onClearSelection) {
        onClearSelection();
      }
      toast.success(res.message || `${res.count} barcodes generated`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to generate missing barcodes.');
    } finally {
      setIsBulkGenerating(false);
    }
  };

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
      return <ArrowUp className="w-3.5 h-3.5 text-indigo-600 shrink-0" />;
    }
    if (sortField === `-${column}`) {
      return <ArrowDown className="w-3.5 h-3.5 text-indigo-600 shrink-0" />;
    }
    return <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 shrink-0" />;
  };

  const getStatusBadge = (product) => {
    const qty = product.quantity;
    const threshold = product.low_stock_threshold ?? 10;

    if (qty <= 0) {
      return (
        <Badge variant="danger" size="sm" dot>
          Out of stock
        </Badge>
      );
    }
    if (qty <= threshold) {
      return (
        <Badge variant="warning" size="sm" dot>
          Low stock
        </Badge>
      );
    }
    return (
      <Badge variant="success" size="sm" dot>
        In stock
      </Badge>
    );
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden w-full">
      {/* Table Toolbar & Bulk Actions */}
      <div className="p-3.5 sm:p-4 border-b border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by name, SKU, barcode..."
            className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100 transition-all shadow-2xs"
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

        {/* Bulk Action Controls */}
        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          {selectedCount > 0 && (
            <div className="flex items-center gap-1.5 bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg text-xs font-semibold">
              <span>{selectedCount} selected</span>
              <span className="text-slate-300">&bull;</span>
              <button
                type="button"
                onClick={onClearSelection}
                className="text-indigo-600 hover:text-indigo-800 underline font-medium cursor-pointer"
              >
                Clear selection
              </button>
            </div>
          )}

          <div className="flex items-center gap-1.5">
            <select
              value={bulkFormat}
              onChange={(e) => setBulkFormat(e.target.value)}
              className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg px-2 py-1.5 border-0 focus:ring-1 focus:ring-indigo-500 cursor-pointer transition-colors"
              title="Barcode format for bulk generation"
            >
              <option value="CODE128">CODE128</option>
              <option value="EAN13">EAN-13</option>
              <option value="EAN8">EAN-8</option>
              <option value="UPC">UPC-A</option>
            </select>

            <button
              type="button"
              onClick={handleBulkGenerate}
              disabled={isBulkGenerating}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 active:bg-indigo-200 rounded-lg transition-colors cursor-pointer shrink-0 disabled:opacity-50"
              title="Generate missing barcodes for selected or missing products"
            >
              {isBulkGenerating ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Wand2 className="w-3.5 h-3.5" />
              )}
              <span>Generate missing barcodes</span>
            </button>
          </div>
        </div>
      </div>

      {/* Cross-page Selection Banner */}
      {products.length > 0 &&
        products.every((p) => selectedIds.includes(p.id)) &&
        (meta?.total || 0) > products.length && (
          <div className="bg-indigo-50 border-b border-indigo-100 px-4 py-2 text-xs text-slate-700 text-center font-medium">
            {isSelectAllMatching ? (
              <span>
                All <strong>{meta.total}</strong> products across all pages are selected.{' '}
                <button
                  type="button"
                  onClick={onClearSelection}
                  className="font-semibold text-indigo-600 hover:text-indigo-800 underline ml-1 cursor-pointer"
                >
                  Clear selection
                </button>
              </span>
            ) : (
              <span>
                All <strong>{products.length}</strong> products on this page are selected.{' '}
                <button
                  type="button"
                  onClick={onSelectAllMatching}
                  className="font-semibold text-indigo-600 hover:text-indigo-800 underline ml-1 cursor-pointer"
                >
                  Select all {meta.total} products
                </button>
              </span>
            )}
          </div>
        )}

      {/* Desktop / Tablet Table (768px and above) - table-fixed without horizontal scroll */}
      <div className="hidden md:block w-full">
        <table className="w-full table-fixed text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/75 border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              <th className="py-3 pl-3 sm:pl-4 pr-1 w-[36px] min-w-[36px] text-center">
                <input
                  type="checkbox"
                  checked={
                    isSelectAllMatching ||
                    (products.length > 0 && products.every((p) => selectedIds.includes(p.id)))
                  }
                  onChange={onToggleSelectAll}
                  className="w-3.5 h-3.5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                  title="Select all on this page"
                />
              </th>
              <th className="py-3 px-3 sm:px-4 w-auto min-w-0 truncate">Product</th>
              <th
                onClick={() => handleHeaderSort('sku')}
                className="hidden lg:table-cell py-3 px-3 w-[17%] xl:w-[13%] cursor-pointer select-none group hover:bg-slate-100/60 transition-colors"
              >
                <div className="flex items-center gap-1.5 truncate">
                  <span>SKU</span>
                  {getSortIcon('sku')}
                </div>
              </th>
              <th className="hidden xl:table-cell py-3 px-3 xl:w-[15%] truncate">Barcode / EAN</th>
              <th
                onClick={() => handleHeaderSort('category')}
                className="hidden xl:table-cell py-3 px-3 xl:w-[12%] cursor-pointer select-none group hover:bg-slate-100/60 transition-colors"
              >
                <div className="flex items-center gap-1.5 truncate">
                  <span>Category</span>
                  {getSortIcon('category')}
                </div>
              </th>
              <th
                onClick={() => handleHeaderSort('price')}
                className="py-3 px-3 w-[80px] min-w-[80px] cursor-pointer select-none group hover:bg-slate-100/60 transition-colors"
              >
                <div className="flex items-center gap-1.5 truncate">
                  <span>Price</span>
                  {getSortIcon('price')}
                </div>
              </th>
              <th
                onClick={() => handleHeaderSort('quantity')}
                className="py-3 px-3 w-[60px] min-w-[60px] cursor-pointer select-none group hover:bg-slate-100/60 transition-colors"
              >
                <div className="flex items-center gap-1.5 truncate">
                  <span>Qty</span>
                  {getSortIcon('quantity')}
                </div>
              </th>
              <th className="py-3 px-3 w-[110px] min-w-[110px] truncate">Status</th>
              <th className="py-3 pr-4 pl-2 text-right w-[132px] min-w-[132px] shrink-0 truncate">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 text-sm">
            {isLoading ? (
              <Skeleton type="table-row" count={5} />
            ) : products.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-12 px-4 text-center">
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
                  className={`hover:bg-slate-50/80 transition-colors group ${
                    selectedIds.includes(product.id) ? 'bg-indigo-50/30' : ''
                  }`}
                >
                  {/* Row Checkbox */}
                  <td className="py-3 pl-3 sm:pl-4 pr-1 text-center min-w-0">
                    <input
                      type="checkbox"
                      checked={isSelectAllMatching || selectedIds.includes(product.id)}
                      onChange={() => onToggleSelect(product.id)}
                      className="w-3.5 h-3.5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                    />
                  </td>

                  {/* Name, SKU under name on <1024px, and Description */}
                  <td className="py-3 px-3 sm:px-4 min-w-0">
                    <div
                      className="font-semibold text-slate-900 truncate"
                      title={product.name}
                    >
                      {product.name}
                    </div>
                    {/* Show SKU under product name below 1024px */}
                    <div
                      className="text-xs text-slate-400 font-mono truncate mt-0.5 lg:hidden"
                      title={product.sku}
                    >
                      SKU: {product.sku}
                    </div>
                    {product.description && (
                      <div
                        className="text-xs text-slate-400 truncate mt-0.5 hidden xl:block"
                        title={product.description}
                      >
                        {product.description}
                      </div>
                    )}
                  </td>

                  {/* SKU Column (visible on lg+) */}
                  <td className="hidden lg:table-cell py-3 px-3 font-mono text-xs font-semibold text-slate-700 min-w-0">
                    <div className="truncate" title={product.sku}>
                      {product.sku}
                    </div>
                  </td>

                  {/* Barcode Number (visible on xl+) */}
                  <td className="hidden xl:table-cell py-3 px-3 font-mono text-xs text-slate-500 min-w-0">
                    <div className="truncate" title={product.barcode_number || ''}>
                      {product.barcode_number || <span className="text-slate-300">—</span>}
                    </div>
                  </td>

                  {/* Category (visible on xl+) */}
                  <td className="hidden xl:table-cell py-3 px-3 min-w-0">
                    {product.category ? (
                      <span
                        className="inline-block max-w-full truncate px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-600"
                        title={product.category}
                      >
                        {product.category}
                      </span>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>

                  {/* Price */}
                  <td className="py-3 px-3 font-medium text-slate-900 min-w-0">
                    <div className="truncate">
                      ${parseFloat(product.price).toFixed(2)}
                    </div>
                  </td>

                  {/* Quantity */}
                  <td className="py-3 px-3 font-semibold text-slate-800 min-w-0">
                    <div className="truncate">
                      {product.quantity}
                    </div>
                  </td>

                  {/* Status Badge */}
                  <td className="py-3 px-3 w-[115px] min-w-[115px]">
                    {getStatusBadge(product)}
                  </td>

                  {/* Actions */}
                  <td className="py-3 pr-4 pl-2 text-right w-[132px] min-w-[132px] shrink-0">
                    <div className="inline-flex items-center justify-end gap-1.5 shrink-0">
                      {/* Compact icon button for Generate */}
                      <button
                        type="button"
                        onClick={() => navigate(`/designer?product_id=${product.id}`)}
                        className="w-7 h-7 inline-flex items-center justify-center rounded-lg text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition-colors cursor-pointer shrink-0"
                        title="Generate Code for this product"
                        aria-label="Generate Code"
                      >
                        <Barcode className="w-3.5 h-3.5 shrink-0" />
                      </button>

                      {/* Edit button */}
                      <button
                        type="button"
                        onClick={() => onEdit(product)}
                        className="w-7 h-7 inline-flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer shrink-0"
                        title="Edit product"
                        aria-label="Edit product"
                      >
                        <Pencil className="w-3.5 h-3.5 shrink-0" />
                      </button>

                      {/* Delete button */}
                      <button
                        type="button"
                        onClick={() => onDelete(product)}
                        className="w-7 h-7 inline-flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer shrink-0"
                        title="Move to Recycle Bin"
                        aria-label="Move to Recycle Bin"
                      >
                        <Trash2 className="w-3.5 h-3.5 shrink-0" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Stacked Cards (below 768px) - zero horizontal overflow */}
      <div className="md:hidden divide-y divide-slate-100 w-full">
        {isLoading ? (
          <div className="p-4 space-y-3">
            <Skeleton type="card" count={3} />
          </div>
        ) : products.length === 0 ? (
          <div className="py-12 px-4 text-center">
            <EmptyState
              icon={PackageOpen}
              title="No products found"
              description={
                searchTerm
                  ? `No products matched "${searchTerm}".`
                  : 'Your inventory is empty.'
              }
              className="border-0 shadow-none bg-transparent"
            />
          </div>
        ) : (
          products.map((product) => (
            <div
              key={product.id}
              className={`p-4 space-y-2.5 bg-white hover:bg-slate-50/50 transition-colors ${
                selectedIds.includes(product.id) ? 'bg-indigo-50/25' : ''
              }`}
            >
              {/* Row 1: Checkbox, Name & Status */}
              <div className="flex items-start justify-between gap-2.5">
                <input
                  type="checkbox"
                  checked={isSelectAllMatching || selectedIds.includes(product.id)}
                  onChange={() => onToggleSelect(product.id)}
                  className="w-4 h-4 mt-0.5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-slate-900 text-sm truncate" title={product.name}>
                    {product.name}
                  </h3>
                  <p className="font-mono text-xs text-slate-500 mt-0.5 truncate" title={product.sku}>
                    SKU: {product.sku}
                  </p>
                </div>
                <div className="shrink-0">
                  {getStatusBadge(product)}
                </div>
              </div>

              {/* Row 2: Price, Qty & Actions */}
              <div className="flex items-center justify-between pt-1 border-t border-slate-100/80">
                <div className="flex items-center gap-3 text-xs">
                  <div>
                    <span className="text-slate-400">Price: </span>
                    <span className="font-semibold text-slate-900">${parseFloat(product.price).toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Qty: </span>
                    <span className="font-semibold text-slate-900">{product.quantity}</span>
                  </div>
                  {product.category && (
                    <span className="px-1.5 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-600 truncate max-w-[80px]">
                      {product.category}
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div className="inline-flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => navigate(`/designer?product_id=${product.id}`)}
                    className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition-colors cursor-pointer"
                    title="Generate Code"
                    aria-label="Generate Code"
                  >
                    <Barcode className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onEdit(product)}
                    className="w-8 h-8 inline-flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                    title="Edit product"
                    aria-label="Edit product"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(product)}
                    className="w-8 h-8 inline-flex items-center justify-center text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                    title="Move to Recycle Bin"
                    aria-label="Move to Recycle Bin"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination Footer */}
      {meta && (
        <Pagination
          page={page}
          lastPage={meta.last_page}
          from={meta.from}
          to={meta.to}
          total={meta.total}
          itemLabel="products"
          onPageChange={onPageChange}
          isLoading={isLoading}
        />
      )}
    </div>
  );
}
