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
  Printer,
  Sparkles,
} from 'lucide-react';
import Badge from '../../components/Badge';
import Button from '../../components/Button';
import Skeleton from '../../components/Skeleton';
import EmptyState from '../../components/EmptyState';
import Pagination from '../../components/Pagination';
import { bulkGenerateBarcodes } from '../../api/products';

export default function ProductTable({
  products = [],
  meta,
  isLoading,
  sortBy,
  sortOrder,
  onSort,
  onPageChange,
  searchTerm,
  onSearchChange,
  supplierFilter = '',
  onSupplierFilterChange,
  suppliersList = [],
  onEdit,
  onDelete,
  selectedIds = [],
  onToggleSelect,
  onToggleSelectAll,
  onClearSelection,
  onSelectAllMatching,
  isSelectAllMatching = false,
  onOpenBulkGenerate,
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [bulkFormat, setBulkFormat] = useState('CODE128');
  const [isBulkGenerating, setIsBulkGenerating] = useState(false);

  const selectedCount = isSelectAllMatching ? meta?.total || 0 : selectedIds.length;

  const handleBulkGenerate = async () => {
    try {
      setIsBulkGenerating(true);
      const payload = {
        format: bulkFormat,
        apply_all: isSelectAllMatching,
        product_ids: isSelectAllMatching ? [] : selectedIds,
      };

      const res = await bulkGenerateBarcodes(payload);
      toast.success(res.message || 'Barcodes generated successfully.');
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['products-summary'] });
      if (onClearSelection) onClearSelection();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to generate barcodes.';
      toast.error(msg);
    } finally {
      setIsBulkGenerating(false);
    }
  };

  const handleHeaderSort = (field) => {
    if (sortBy === field) {
      onSort(field, sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      onSort(field, 'asc');
    }
  };

  const getSortIcon = (field) => {
    if (sortBy !== field) {
      return <ArrowUpDown className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-600 transition-colors" strokeWidth={1.5} />;
    }
    return sortOrder === 'asc' ? (
      <ArrowUp className="w-3.5 h-3.5 text-indigo-600" strokeWidth={1.5} />
    ) : (
      <ArrowDown className="w-3.5 h-3.5 text-indigo-600" strokeWidth={1.5} />
    );
  };

  const getStatusBadge = (product) => {
    const qty = product.quantity;
    const threshold = product.low_stock_threshold ?? 10;

    if (qty <= 0) {
      return (
        <Badge variant="danger" size="sm">
          Out of stock
        </Badge>
      );
    }
    if (qty <= threshold) {
      return (
        <Badge variant="warning" size="sm">
          Low stock
        </Badge>
      );
    }
    return (
      <Badge variant="success" size="sm">
        In stock
      </Badge>
    );
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden w-full">
      {/* Table Toolbar & Bulk Actions */}
      <div className="p-2.5 sm:p-3 border-b border-gray-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2 w-full sm:w-auto flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" strokeWidth={1.5} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search by name, item code, barcode..."
              className="w-full h-9 pl-9 pr-8 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-colors"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 rounded-md cursor-pointer"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" strokeWidth={1.5} />
              </button>
            )}
          </div>

          {/* Supplier filter */}
          {onSupplierFilterChange && (
            <select
              value={supplierFilter || ''}
              onChange={(e) => onSupplierFilterChange(e.target.value)}
              className="h-9 text-xs bg-white text-gray-700 font-medium rounded-lg px-2.5 border border-gray-300 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 cursor-pointer transition-colors shrink-0 max-w-[150px] truncate"
              title="Filter by supplier"
            >
              <option value="">All suppliers</option>
              <option value="no_supplier">No supplier</option>
              {suppliersList.map((s) => (
                <option key={s.id} value={String(s.id)}>
                  {s.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Bulk Action Controls */}
        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          {selectedCount > 0 && (
            <>
              <div className="flex items-center gap-1.5 bg-gray-100 text-gray-700 px-2.5 py-1 rounded-md text-xs font-medium">
                <span>{selectedCount} selected</span>
                <span className="text-gray-300">&bull;</span>
                <button
                  type="button"
                  onClick={onClearSelection}
                  className="text-indigo-600 hover:text-indigo-800 underline font-medium cursor-pointer"
                >
                  Clear
                </button>
              </div>

              <Button
                variant="secondary"
                size="sm"
                onClick={() => navigate(`/print?product_ids=${selectedIds.join(',')}`)}
                icon={Printer}
              >
                Print labels ({selectedCount})
              </Button>

              {onOpenBulkGenerate && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={onOpenBulkGenerate}
                  icon={Sparkles}
                >
                  Generate codes ({selectedCount})
                </Button>
              )}
            </>
          )}

          <div className="flex items-center gap-1.5">
            <select
              value={bulkFormat}
              onChange={(e) => setBulkFormat(e.target.value)}
              className="h-8 text-xs bg-white hover:bg-gray-50 text-gray-700 font-medium rounded-lg px-2 border border-gray-300 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 cursor-pointer transition-colors"
              title="Barcode format for bulk generation"
            >
              <option value="CODE128">CODE128</option>
              <option value="EAN13">EAN-13</option>
              <option value="EAN8">EAN-8</option>
              <option value="UPC">UPC-A</option>
            </select>

            <Button
              variant="secondary"
              size="sm"
              onClick={handleBulkGenerate}
              isLoading={isBulkGenerating}
              icon={Wand2}
            >
              Generate barcodes
            </Button>
          </div>
        </div>
      </div>

      {/* Cross-page Selection Banner */}
      {products.length > 0 &&
        products.every((p) => selectedIds.includes(p.id)) &&
        (meta?.total || 0) > products.length && (
          <div className="bg-gray-50 border-b border-gray-200 px-3 py-1.5 text-xs text-gray-700 text-center">
            {isSelectAllMatching ? (
              <span>
                All <strong>{meta.total}</strong> products across all pages are selected.{' '}
                <button
                  type="button"
                  onClick={onClearSelection}
                  className="font-medium text-indigo-600 hover:text-indigo-800 underline ml-1 cursor-pointer"
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
                  className="font-medium text-indigo-600 hover:text-indigo-800 underline ml-1 cursor-pointer"
                >
                  Select all {meta.total} products in inventory
                </button>
              </span>
            )}
          </div>
        )}

      {/* Desktop / Tablet Table (768px and above) - table-fixed without horizontal scroll */}
      <div className="hidden md:block w-full overflow-hidden">
        <table className="w-full table-fixed text-left border-collapse">
          <thead>
            <tr className="h-9 sm:h-10 border-b border-gray-200 text-xs font-medium text-gray-500 bg-white">
              <th className="py-2 pl-3 sm:pl-4 pr-1 w-[36px] min-w-[36px] text-center align-middle">
                <input
                  type="checkbox"
                  checked={
                    isSelectAllMatching ||
                    (products.length > 0 && products.every((p) => selectedIds.includes(p.id)))
                  }
                  onChange={onToggleSelectAll}
                  className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500/20 cursor-pointer"
                  title="Select all on this page"
                />
              </th>
              <th
                onClick={() => handleHeaderSort('name')}
                className="py-2 px-3 sm:px-4 min-w-[220px] w-[28%] lg:w-[30%] align-middle text-left cursor-pointer select-none group hover:bg-gray-50 transition-colors"
                title="Sort by product name"
              >
                <div className="inline-flex items-center gap-1 font-medium text-gray-500 group-hover:text-gray-900 transition-colors">
                  <span>Product</span>
                  {getSortIcon('name')}
                </div>
              </th>
              <th className="hidden lg:table-cell py-2 px-2.5 w-[120px] text-center truncate align-middle">
                Barcode
              </th>
              <th
                onClick={() => handleHeaderSort('category')}
                className="hidden 2xl:table-cell py-2 px-2 w-[110px] text-center cursor-pointer select-none group hover:bg-gray-50 transition-colors align-middle"
              >
                <div className="inline-flex items-center justify-center gap-1 truncate">
                  <span>Category</span>
                  {getSortIcon('category')}
                </div>
              </th>
              <th className="hidden xl:table-cell py-2 px-2 w-[130px] text-center truncate align-middle">
                Supplier
              </th>
              <th
                onClick={() => handleHeaderSort('price')}
                className="py-2 px-2 w-[88px] min-w-[88px] text-center cursor-pointer select-none group hover:bg-gray-50 transition-colors align-middle"
              >
                <div className="inline-flex items-center justify-center gap-1 truncate">
                  <span>Price</span>
                  {getSortIcon('price')}
                </div>
              </th>
              <th
                onClick={() => handleHeaderSort('quantity')}
                className="py-2 px-1.5 w-[56px] min-w-[56px] text-center cursor-pointer select-none group hover:bg-gray-50 transition-colors align-middle"
              >
                <div className="inline-flex items-center justify-center gap-1 truncate">
                  <span>Qty</span>
                  {getSortIcon('quantity')}
                </div>
              </th>
              <th className="py-2 px-2 w-[100px] min-w-[100px] text-center truncate align-middle">Status</th>
              <th className="py-2 px-2 text-center w-[108px] min-w-[108px] shrink-0 truncate align-middle">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100 text-sm">
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
                  className={`h-10 sm:h-11 hover:bg-gray-50/75 transition-colors group ${
                    selectedIds.includes(product.id) ? 'bg-gray-50' : ''
                  }`}
                >
                  {/* Row Checkbox */}
                  <td className="py-1.5 pl-3 sm:pl-4 pr-1 text-center min-w-0 align-middle">
                    <input
                      id={`product-checkbox-${product.id}`}
                      type="checkbox"
                      aria-label={`Select ${product.name}`}
                      checked={isSelectAllMatching || selectedIds.includes(product.id)}
                      onChange={() => onToggleSelect(product.id)}
                      className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500/20 cursor-pointer"
                    />
                  </td>

                  {/* Product (Name wraps up to 2 lines with tooltip, Item code underneath) */}
                  <td className="py-1.5 px-3 sm:px-4 min-w-[220px] align-middle text-left">
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

                  {/* Barcode (hidden on <lg) */}
                  <td className="hidden lg:table-cell py-1.5 px-2.5 font-mono text-xs text-gray-500 text-center min-w-0 align-middle">
                    <div className="truncate max-w-[110px] mx-auto" title={product.barcode_number || ''}>
                      {product.barcode_number || <span className="text-gray-300">—</span>}
                    </div>
                  </td>

                  {/* Category (hidden on <2xl) */}
                  <td className="hidden 2xl:table-cell py-1.5 px-2 text-center min-w-0 align-middle">
                    {product.category ? (
                      <span
                        className="inline-block max-w-[100px] truncate px-2 py-0.5 rounded text-xs text-gray-600 bg-gray-100"
                        title={product.category}
                      >
                        {product.category}
                      </span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>

                  {/* Supplier (hidden on <xl) */}
                  <td className="hidden xl:table-cell py-1.5 px-2 text-center min-w-0 align-middle">
                    {product.supplier ? (
                      <span
                        className={`inline-block max-w-[120px] truncate text-xs ${
                          product.supplier.deleted_at
                            ? 'text-gray-400 italic line-through decoration-gray-300'
                            : 'text-gray-600'
                        }`}
                        title={
                          product.supplier.deleted_at
                            ? `${product.supplier.name} (deleted)`
                            : product.supplier.name
                        }
                      >
                        {product.supplier.name}
                        {product.supplier.deleted_at && ' (deleted)'}
                      </span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>

                  {/* Price */}
                  <td className="py-1.5 px-2 font-normal text-gray-900 text-center min-w-0 align-middle text-sm">
                    <div className="truncate">
                      ${parseFloat(product.price).toFixed(2)}
                    </div>
                  </td>

                  {/* Quantity */}
                  <td className="py-1.5 px-1.5 font-medium text-gray-800 text-center min-w-0 align-middle text-sm">
                    <div className="truncate">
                      {product.quantity}
                    </div>
                  </td>

                  {/* Status Badge */}
                  <td className="py-1.5 px-2 text-center align-middle">
                    <div className="flex justify-center">
                      {getStatusBadge(product)}
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="py-1.5 px-2 text-center w-[108px] min-w-[108px] shrink-0 align-middle">
                    <div className="inline-flex items-center justify-center gap-1 shrink-0">
                      {/* Compact button for Generate */}
                      <button
                        type="button"
                        onClick={() => navigate(`/designer?product_id=${product.id}`)}
                        className="w-7 h-7 inline-flex items-center justify-center rounded-md text-gray-500 hover:text-indigo-600 hover:bg-gray-100 transition-colors cursor-pointer shrink-0"
                        title="Generate Code"
                        aria-label="Generate Code"
                      >
                        <Barcode className="w-4 h-4 shrink-0" strokeWidth={1.5} />
                      </button>

                      {/* Edit button */}
                      <button
                        type="button"
                        onClick={() => onEdit(product)}
                        className="w-7 h-7 inline-flex items-center justify-center text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors cursor-pointer shrink-0"
                        title="Edit product"
                        aria-label="Edit product"
                      >
                        <Pencil className="w-4 h-4 shrink-0" strokeWidth={1.5} />
                      </button>

                      {/* Delete button */}
                      <button
                        type="button"
                        onClick={() => onDelete(product)}
                        className="w-7 h-7 inline-flex items-center justify-center text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer shrink-0"
                        title="Move to Recycle Bin"
                        aria-label="Move to Recycle Bin"
                      >
                        <Trash2 className="w-4 h-4 shrink-0" strokeWidth={1.5} />
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
      <div className="md:hidden divide-y divide-gray-100 w-full">
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
              className={`p-4 space-y-2 bg-white hover:bg-gray-50/50 transition-colors ${
                selectedIds.includes(product.id) ? 'bg-gray-50' : ''
              }`}
            >
              {/* Row 1: Checkbox, Name & Status */}
              <div className="flex items-start justify-between gap-2.5">
                <input
                  type="checkbox"
                  checked={isSelectAllMatching || selectedIds.includes(product.id)}
                  onChange={() => onToggleSelect(product.id)}
                  className="w-4 h-4 mt-0.5 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500/20 cursor-pointer shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <h3 className="font-medium text-gray-900 text-sm truncate" title={product.name}>
                    {product.name}
                  </h3>
                  <p className="font-mono text-xs text-gray-500 mt-0.5 truncate" title={product.sku}>
                    Item Code: {product.sku}
                  </p>
                  {product.supplier && (
                    <p className="text-[11px] text-gray-500 mt-0.5 truncate">
                      <span className="text-gray-400">Supplier: </span>
                      <span className={product.supplier.deleted_at ? 'line-through text-gray-400 italic' : 'text-gray-700'}>
                        {product.supplier.name}
                        {product.supplier.deleted_at && ' (deleted)'}
                      </span>
                    </p>
                  )}
                </div>
                <div className="shrink-0">
                  {getStatusBadge(product)}
                </div>
              </div>

              {/* Row 2: Price, Qty & Actions */}
              <div className="flex items-center justify-between pt-1 border-t border-gray-100">
                <div className="flex items-center gap-3 text-xs">
                  <div>
                    <span className="text-gray-400">Price: </span>
                    <span className="font-medium text-gray-900">${parseFloat(product.price).toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Qty: </span>
                    <span className="font-medium text-gray-900">{product.quantity}</span>
                  </div>
                  {product.category && (
                    <span className="px-1.5 py-0.5 rounded text-[11px] text-gray-600 bg-gray-100 truncate max-w-[80px]">
                      {product.category}
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div className="inline-flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => navigate(`/designer?product_id=${product.id}`)}
                    className="w-7 h-7 inline-flex items-center justify-center rounded-md text-gray-500 hover:text-indigo-600 hover:bg-gray-100 transition-colors cursor-pointer"
                    title="Generate Code"
                    aria-label="Generate Code"
                  >
                    <Barcode className="w-4 h-4" strokeWidth={1.5} />
                  </button>
                  <button
                    type="button"
                    onClick={() => onEdit(product)}
                    className="w-7 h-7 inline-flex items-center justify-center text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors cursor-pointer"
                    title="Edit product"
                    aria-label="Edit product"
                  >
                    <Pencil className="w-4 h-4" strokeWidth={1.5} />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(product)}
                    className="w-7 h-7 inline-flex items-center justify-center text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                    title="Move to Recycle Bin"
                    aria-label="Move to Recycle Bin"
                  >
                    <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Shared Pagination Component */}
      {meta && (
        <Pagination
          page={meta.current_page}
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
