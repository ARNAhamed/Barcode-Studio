import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutGrid, Plus, SearchX } from 'lucide-react';
import CodeCard from './CodeCard';
import Skeleton from '../../components/Skeleton';
import EmptyState from '../../components/EmptyState';

export default function CodeGrid({
  codes = [],
  isLoading = false,
  searchTerm = '',
  typeFilter = 'all',
  onResetFilters,
  onDelete,
}) {
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <Skeleton type="card" count={8} />
      </div>
    );
  }

  // Filtered empty state (search or filter returned nothing)
  if (codes.length === 0 && (searchTerm || typeFilter !== 'all')) {
    return (
      <EmptyState
        icon={SearchX}
        title="No matching codes found"
        description={
          searchTerm
            ? `No saved codes matched "${searchTerm}". Try adjusting your keywords or filter.`
            : 'No codes found for the selected filter.'
        }
        actionText="Clear Filters"
        onAction={onResetFilters}
      />
    );
  }

  // Completely empty gallery state
  if (codes.length === 0) {
    return (
      <EmptyState
        icon={LayoutGrid}
        title="No codes yet"
        description="Design your first barcode or QR code linked to a product from stock or custom text."
        actionText="Design your first code"
        onAction={() => navigate('/designer')}
        actionIcon={Plus}
        className="py-16"
      />
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {codes.map((code) => (
        <CodeCard key={code.id} code={code} onDelete={onDelete} />
      ))}
    </div>
  );
}
