import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Pencil,
  Trash2,
  Eye,
  Search,
  X,
  Truck,
  ExternalLink,
  Download,
} from 'lucide-react';
import Button from '../../components/Button';
import Skeleton from '../../components/Skeleton';
import EmptyState from '../../components/EmptyState';
import Pagination from '../../components/Pagination';

export default function SupplierTable({
  suppliers = [],
  meta,
  isLoading,
  sortBy,
  sortOrder,
  onSort,
  onPageChange,
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  selectedIds = [],
  onToggleSelect,
  onToggleSelectAll,
  onClearSelection,
  onView,
  onEdit,
  onDelete,
  onExportSelected,
  isExporting = false,
}) {
  const navigate = useNavigate();

  const handleHeaderSort = (field) => {
    if (sortBy === field) {
      onSort(field, sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      onSort(field, 'asc');
    }
  };

  const getSortIcon = (field) => {
    if (sortBy !== field) {
      return (
        <ArrowUpDown
          className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-600 transition-colors"
          strokeWidth={1.5}
        />
      );
    }
    return sortOrder === 'asc' ? (
      <ArrowUp className="w-3.5 h-3.5 text-indigo-600" strokeWidth={1.5} />
    ) : (
      <ArrowDown className="w-3.5 h-3.5 text-indigo-600" strokeWidth={1.5} />
    );
  };

  const selectedCount = selectedIds.length;

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden w-full">
      {/* Table Toolbar & Filters */}
      <div className="p-2.5 sm:p-3 border-b border-gray-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search
              className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
              strokeWidth={1.5}
            />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search by name, contact, mobile, city..."
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

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value)}
            className="h-9 text-xs bg-white text-gray-700 font-medium rounded-lg px-2.5 border border-gray-300 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 cursor-pointer transition-colors shrink-0"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
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
                onClick={onExportSelected}
                isLoading={isExporting}
                icon={Download}
              >
                Export CSV ({selectedCount})
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Desktop / Tablet Table (768px and above) - table-fixed without horizontal scroll */}
      <div className="hidden md:block w-full overflow-hidden">
        <table className="w-full table-fixed text-left border-collapse">
          <thead>
            <tr className="h-9 sm:h-10 border-b border-gray-200 text-xs font-medium text-gray-500 bg-white">
              <th className="py-2 pl-3 sm:pl-4 pr-1 w-[36px] min-w-[36px] text-center align-middle">
                <input
                  type="checkbox"
                  checked={
                    suppliers.length > 0 &&
                    suppliers.every((s) => selectedIds.includes(s.id))
                  }
                  onChange={onToggleSelectAll}
                  className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500/20 cursor-pointer"
                  title="Select all on this page"
                />
              </th>

              {/* Name & Contact Person */}
              <th
                onClick={() => handleHeaderSort('name')}
                className="py-2 px-3 sm:px-4 w-auto min-w-0 truncate text-left cursor-pointer select-none group hover:bg-gray-50 transition-colors align-middle"
              >
                <div className="inline-flex items-center gap-1 truncate">
                  <span>Name</span>
                  {getSortIcon('name')}
                </div>
              </th>

              {/* Mobile */}
              <th className="py-2 px-3 w-[140px] text-center truncate align-middle">
                Mobile
              </th>

              {/* Email (hidden below 1280px) */}
              <th className="hidden xl:table-cell py-2 px-3 w-[180px] text-center truncate align-middle">
                Email
              </th>

              {/* City (hidden below 1280px) */}
              <th
                onClick={() => handleHeaderSort('city')}
                className="hidden xl:table-cell py-2 px-3 w-[120px] text-center cursor-pointer select-none group hover:bg-gray-50 transition-colors align-middle"
              >
                <div className="inline-flex items-center justify-center gap-1 truncate">
                  <span>City</span>
                  {getSortIcon('city')}
                </div>
              </th>

              {/* Products count */}
              <th
                onClick={() => handleHeaderSort('products_count')}
                className="py-2 px-3 w-[90px] text-center cursor-pointer select-none group hover:bg-gray-50 transition-colors align-middle"
              >
                <div className="inline-flex items-center justify-center gap-1 truncate">
                  <span>Products</span>
                  {getSortIcon('products_count')}
                </div>
              </th>

              {/* Status */}
              <th className="py-2 px-3 w-[100px] text-center truncate align-middle">
                Status
              </th>

              {/* Actions */}
              <th className="py-2 px-3 text-center w-[120px] min-w-[120px] shrink-0 truncate align-middle">
                Actions
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100 text-sm">
            {isLoading ? (
              <Skeleton type="table-row" count={5} />
            ) : suppliers.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 px-4 text-center">
                  <EmptyState
                    icon={Truck}
                    title="No suppliers found"
                    description={
                      searchTerm || statusFilter
                        ? 'No suppliers matched your search filters. Try clearing your filters.'
                        : 'No suppliers registered yet. Click "Add Supplier" to create your first vendor.'
                    }
                    className="border-0 shadow-none bg-transparent"
                  />
                </td>
              </tr>
            ) : (
              suppliers.map((supplier) => (
                <tr
                  key={supplier.id}
                  className={`hover:bg-gray-50/75 transition-colors group ${
                    selectedIds.includes(supplier.id) ? 'bg-gray-50' : ''
                  }`}
                >
                  {/* Checkbox */}
                  <td className="py-2 pl-3 sm:pl-4 pr-1 text-center min-w-0 align-middle">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(supplier.id)}
                      onChange={() => onToggleSelect(supplier.id)}
                      className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500/20 cursor-pointer"
                    />
                  </td>

                  {/* Name and contact person */}
                  <td className="py-2 px-3 sm:px-4 min-w-0 align-middle text-left">
                    <div
                      className="font-medium text-gray-900 truncate text-sm leading-tight cursor-pointer hover:text-indigo-600"
                      onClick={() => onView(supplier)}
                      title={supplier.name}
                    >
                      {supplier.name}
                    </div>
                    {supplier.contact_person && (
                      <div
                        className="text-xs text-gray-400 truncate mt-0.5 leading-none"
                        title={supplier.contact_person}
                      >
                        {supplier.contact_person}
                      </div>
                    )}
                  </td>

                  {/* Mobile */}
                  <td className="py-2 px-3 font-mono text-[13px] text-gray-600 text-center min-w-0 align-middle">
                    <a
                      href={`tel:${supplier.mobile}`}
                      className="hover:underline hover:text-indigo-600 truncate block"
                      title={supplier.mobile}
                    >
                      {supplier.mobile}
                    </a>
                  </td>

                  {/* Email (hidden below 1280px) */}
                  <td className="hidden xl:table-cell py-2 px-3 text-xs text-gray-500 text-center min-w-0 align-middle">
                    {supplier.email ? (
                      <a
                        href={`mailto:${supplier.email}`}
                        className="truncate block hover:underline hover:text-indigo-600"
                        title={supplier.email}
                      >
                        {supplier.email}
                      </a>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>

                  {/* City (hidden below 1280px) */}
                  <td className="hidden xl:table-cell py-2 px-3 text-xs text-gray-600 text-center min-w-0 align-middle">
                    <div className="truncate" title={supplier.city || ''}>
                      {supplier.city || <span className="text-gray-300">—</span>}
                    </div>
                  </td>

                  {/* Products count linking to Items */}
                  <td className="py-2 px-3 text-center min-w-0 align-middle">
                    <button
                      type="button"
                      onClick={() =>
                        navigate(`/products/items?supplier_id=${supplier.id}`)
                      }
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors cursor-pointer"
                      title={`View ${supplier.products_count || 0} items for this supplier`}
                    >
                      <span>{supplier.products_count || 0}</span>
                      <ExternalLink className="w-2.5 h-2.5 text-gray-400" />
                    </button>
                  </td>

                  {/* Status (Active / Inactive dot + text) */}
                  <td className="py-2 px-3 text-center min-w-0 align-middle">
                    <div className="inline-flex items-center gap-1.5 text-xs font-medium">
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          supplier.status === 'active'
                            ? 'bg-[#16A34A]'
                            : 'bg-gray-400'
                        }`}
                      />
                      <span
                        className={
                          supplier.status === 'active'
                            ? 'text-gray-700 capitalize'
                            : 'text-gray-400 capitalize'
                        }
                      >
                        {supplier.status}
                      </span>
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="py-2 px-3 text-center shrink-0 min-w-0 align-middle">
                    <div className="inline-flex items-center justify-center gap-1">
                      <button
                        type="button"
                        onClick={() => onView(supplier)}
                        className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors cursor-pointer"
                        title="View details"
                      >
                        <Eye className="w-3.5 h-3.5" strokeWidth={1.5} />
                      </button>

                      <button
                        type="button"
                        onClick={() => onEdit(supplier)}
                        className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors cursor-pointer"
                        title="Edit supplier"
                      >
                        <Pencil className="w-3.5 h-3.5" strokeWidth={1.5} />
                      </button>

                      <button
                        type="button"
                        onClick={() => onDelete(supplier)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                        title="Move to Recycle Bin"
                      >
                        <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Stacked Cards (< 768px) */}
      <div className="md:hidden divide-y divide-gray-100">
        {isLoading ? (
          <div className="p-4 space-y-3">
            <Skeleton type="card" count={3} />
          </div>
        ) : suppliers.length === 0 ? (
          <div className="py-10 px-4 text-center">
            <EmptyState
              icon={Truck}
              title="No suppliers found"
              description="No suppliers matched your criteria."
              className="border-0 shadow-none bg-transparent"
            />
          </div>
        ) : (
          suppliers.map((supplier) => (
            <div
              key={supplier.id}
              className={`p-3.5 space-y-2.5 transition-colors ${
                selectedIds.includes(supplier.id) ? 'bg-gray-50' : 'bg-white'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2.5 min-w-0">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(supplier.id)}
                    onChange={() => onToggleSelect(supplier.id)}
                    className="mt-1 w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500/20"
                  />
                  <div className="min-w-0">
                    <h4
                      onClick={() => onView(supplier)}
                      className="text-sm font-semibold text-gray-900 truncate hover:text-indigo-600 cursor-pointer"
                    >
                      {supplier.name}
                    </h4>
                    {supplier.contact_person && (
                      <p className="text-xs text-gray-500 truncate mt-0.5">
                        {supplier.contact_person}
                      </p>
                    )}
                  </div>
                </div>

                <div className="inline-flex items-center gap-1.5 text-xs font-medium shrink-0">
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      supplier.status === 'active' ? 'bg-[#16A34A]' : 'bg-gray-400'
                    }`}
                  />
                  <span className="capitalize text-gray-600">{supplier.status}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 pt-1 border-t border-gray-100">
                <div>
                  <span className="text-gray-400 block text-[11px]">Mobile</span>
                  <a
                    href={`tel:${supplier.mobile}`}
                    className="font-mono text-gray-900 hover:underline"
                  >
                    {supplier.mobile}
                  </a>
                </div>
                <div>
                  <span className="text-gray-400 block text-[11px]">City</span>
                  <span className="text-gray-900">{supplier.city || '—'}</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-xs">
                <button
                  type="button"
                  onClick={() =>
                    navigate(`/products/items?supplier_id=${supplier.id}`)
                  }
                  className="inline-flex items-center gap-1 text-indigo-600 font-medium hover:underline"
                >
                  <span>{supplier.products_count || 0} products</span>
                  <ExternalLink className="w-3 h-3" />
                </button>

                <div className="flex items-center gap-1">
                  <Button
                    variant="secondary"
                    size="xs"
                    onClick={() => onView(supplier)}
                  >
                    View
                  </Button>
                  <Button
                    variant="secondary"
                    size="xs"
                    onClick={() => onEdit(supplier)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={() => onDelete(supplier)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination Bar */}
      {meta && meta.last_page > 1 && (
        <Pagination
          meta={meta}
          onPageChange={onPageChange}
          className="border-t border-gray-200"
        />
      )}
    </div>
  );
}
