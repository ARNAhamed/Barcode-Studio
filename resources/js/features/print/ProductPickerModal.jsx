import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import Modal from '../../components/Modal';
import Button from '../../components/Button';
import Badge from '../../components/Badge';
import Skeleton from '../../components/Skeleton';
import { getProducts } from '../../api/products';
import { Search, Package, PlusCircle, Check, AlertCircle, Sparkles } from 'lucide-react';

export default function ProductPickerModal({
  isOpen,
  onClose,
  allCodes = [],
  onAddCodes,
}) {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [selectedProductIds, setSelectedProductIds] = useState(new Set());

  // Fetch all active products
  const { data: productsData, isLoading } = useQuery({
    queryKey: ['products-for-print-picker'],
    queryFn: () => getProducts({ per_page: 250 }),
    enabled: isOpen,
  });

  const products = productsData?.data || [];

  // Map each product to its saved codes
  const productCodeMap = useMemo(() => {
    const map = new Map();
    allCodes.forEach((code) => {
      if (code.product_id) {
        const existing = map.get(code.product_id) || [];
        existing.push(code);
        map.set(code.product_id, existing);
      }
    });
    return map;
  }, [allCodes]);

  const filteredProducts = useMemo(() => {
    if (!search.trim()) return products;
    const q = search.toLowerCase();
    return products.filter(
      (p) =>
        p.name?.toLowerCase().includes(q) ||
        p.sku?.toLowerCase().includes(q) ||
        p.barcode_number?.toLowerCase().includes(q)
    );
  }, [products, search]);

  const toggleProduct = (id) => {
    const next = new Set(selectedProductIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedProductIds(next);
  };

  const handleSelectAllWithCodes = () => {
    const next = new Set();
    filteredProducts.forEach((p) => {
      if (productCodeMap.has(p.id) && productCodeMap.get(p.id).length > 0) {
        next.add(p.id);
      }
    });
    setSelectedProductIds(next);
  };

  const handleClear = () => {
    setSelectedProductIds(new Set());
  };

  const handleConfirm = () => {
    // Gather all saved codes for selected products
    const codesToAdd = [];
    selectedProductIds.forEach((pId) => {
      const codes = productCodeMap.get(pId) || [];
      codes.forEach((c) => codesToAdd.push(c));
    });

    onAddCodes(codesToAdd);
    onClose();
  };

  // Count how many codes would be added from current selection
  const totalCodesFromSelection = useMemo(() => {
    let count = 0;
    selectedProductIds.forEach((pId) => {
      const list = productCodeMap.get(pId) || [];
      count += list.length;
    });
    return count;
  }, [selectedProductIds, productCodeMap]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Codes for Selected Products"
      description="Choose products from your inventory to add their saved barcode/QR designs to this sheet."
      maxWidth="max-w-2xl"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleConfirm}
            disabled={totalCodesFromSelection === 0}
            icon={Check}
          >
            Add {totalCodesFromSelection} Code{totalCodesFromSelection === 1 ? '' : 's'} to Sheet
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {/* Search & Bulk selection bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products by name, SKU..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-100"
            />
          </div>
          <div className="flex items-center gap-2 text-xs">
            <button
              type="button"
              onClick={handleSelectAllWithCodes}
              className="text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
            >
              Select with codes
            </button>
            <span className="text-slate-300">&bull;</span>
            <button
              type="button"
              onClick={handleClear}
              className="text-slate-500 hover:text-slate-700 cursor-pointer"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Product List */}
        <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
          {isLoading ? (
            <Skeleton count={4} className="h-14 mb-2" />
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-xs sm:text-sm">
              No products found matching &ldquo;{search}&rdquo;.
            </div>
          ) : (
            filteredProducts.map((p) => {
              const codes = productCodeMap.get(p.id) || [];
              const hasCodes = codes.length > 0;
              const isSelected = selectedProductIds.has(p.id);

              return (
                <div
                  key={p.id}
                  onClick={() => {
                    if (hasCodes) toggleProduct(p.id);
                  }}
                  className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                    isSelected
                      ? 'border-indigo-500 bg-indigo-50/60 shadow-2xs'
                      : hasCodes
                      ? 'border-slate-200 hover:border-slate-300 bg-white cursor-pointer'
                      : 'border-slate-200 bg-slate-50/70 opacity-80'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      disabled={!hasCodes}
                      onChange={() => toggleProduct(p.id)}
                      className="w-4 h-4 rounded-sm text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer"
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs sm:text-sm text-slate-900 truncate">
                          {p.name}
                        </span>
                        <span className="text-xs font-mono text-slate-500 shrink-0">
                          [{p.sku}]
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 truncate mt-0.5">
                        {p.barcode_number ? `Barcode: ${p.barcode_number}` : 'No barcode number'}
                      </div>
                    </div>
                  </div>

                  {/* Status / Action */}
                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    {hasCodes ? (
                      <Badge variant="success" size="sm">
                        {codes.length} saved code{codes.length === 1 ? '' : 's'}
                      </Badge>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-amber-600 flex items-center gap-1 font-medium">
                          <AlertCircle className="w-3.5 h-3.5" />
                          No saved code
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/designer?product_id=${p.id}`);
                          }}
                          className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer"
                          title="Design a barcode for this product"
                        >
                          <PlusCircle className="w-3 h-3" />
                          <span>Create code</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </Modal>
  );
}
