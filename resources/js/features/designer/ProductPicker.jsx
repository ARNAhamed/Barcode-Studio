import React, { useState, useEffect, useRef } from 'react';
import { Search, Package, X, Check, Loader2 } from 'lucide-react';
import { lookupProducts } from '../../api/products';

export default function ProductPicker({
  selectedProduct,
  onSelectProduct,
  onClearProduct,
}) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  useEffect(() => {
    if (!query.trim() || selectedProduct) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const res = await lookupProducts(query);
        setSuggestions(res.data || []);
        setIsOpen(true);
      } catch (err) {
        console.error('Error looking up products:', err);
      } finally {
        setIsLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query, selectedProduct]);

  if (selectedProduct) {
    return (
      <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <Package className="w-4 h-4 text-gray-500 shrink-0 stroke-[1.5]" />
          <div className="min-w-0">
            <div className="text-xs font-semibold text-gray-900 truncate">
              {selectedProduct.name}
            </div>
            <div className="text-[11px] text-gray-500 font-mono mt-0.5 flex items-center gap-2">
              <span>SKU: {selectedProduct.sku}</span>
              {selectedProduct.barcode_number && (
                <span>• EAN: {selectedProduct.barcode_number}</span>
              )}
              <span>• ${parseFloat(selectedProduct.price || 0).toFixed(2)}</span>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            onClearProduct();
            setQuery('');
          }}
          className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-200/50 rounded transition-colors cursor-pointer shrink-0"
          title="Unlink product"
        >
          <X className="w-4 h-4 stroke-[1.5]" />
        </button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 stroke-[1.5]" />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => {
            if (suggestions.length > 0) setIsOpen(true);
          }}
          placeholder="Search stock by product name, SKU or barcode..."
          className="w-full h-9 pl-9 pr-8 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 transition-colors"
        />
        {isLoading ? (
          <Loader2 className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 animate-spin stroke-[1.5]" />
        ) : query ? (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setSuggestions([]);
            }}
            className="p-1 text-gray-400 hover:text-gray-600 absolute right-2 top-1/2 -translate-y-1/2 rounded transition-colors"
          >
            <X className="w-3.5 h-3.5 stroke-[1.5]" />
          </button>
        ) : null}
      </div>

      {/* Autocomplete Dropdown */}
      {isOpen && suggestions.length > 0 && (
        <div className="absolute z-30 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto divide-y divide-gray-100">
          {suggestions.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                onSelectProduct(p);
                setIsOpen(false);
                setQuery('');
              }}
              className="w-full px-3.5 py-2.5 text-left hover:bg-gray-50 transition-colors flex items-center justify-between group cursor-pointer"
            >
              <div>
                <p className="text-sm font-medium text-gray-900 group-hover:text-indigo-600">
                  {p.name}
                </p>
                <p className="text-xs text-gray-500 font-mono mt-0.5">
                  SKU: {p.sku} {p.barcode_number ? `• Barcode: ${p.barcode_number}` : ''} • ${parseFloat(p.price || 0).toFixed(2)}
                </p>
              </div>
              <span className="text-xs font-semibold text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity">
                Select
              </span>
            </button>
          ))}
        </div>
      )}

      {isOpen && query.trim() && !isLoading && suggestions.length === 0 && (
        <div className="absolute z-30 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-center text-xs text-gray-500">
          No matching products found in stock.
        </div>
      )}
    </div>
  );
}
