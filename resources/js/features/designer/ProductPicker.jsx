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
      <div className="p-3.5 bg-indigo-50/70 border border-indigo-200/80 rounded-xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-semibold text-indigo-950 line-clamp-1">
              {selectedProduct.name}
            </div>
            <div className="text-[11px] text-indigo-700/80 font-mono mt-0.5 flex items-center gap-2">
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
          className="p-1.5 text-indigo-600 hover:text-indigo-900 hover:bg-indigo-100 rounded-lg transition-colors cursor-pointer"
          title="Unlink product"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
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
          className="w-full pl-9 pr-9 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
        />
        {isLoading ? (
          <Loader2 className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 animate-spin" />
        ) : query ? (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setSuggestions([]);
            }}
            className="p-1 text-slate-400 hover:text-slate-600 absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        ) : null}
      </div>

      {/* Autocomplete Dropdown */}
      {isOpen && suggestions.length > 0 && (
        <div className="absolute z-30 left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-y-auto divide-y divide-slate-100">
          {suggestions.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                onSelectProduct(p);
                setIsOpen(false);
                setQuery('');
              }}
              className="w-full px-4 py-3 text-left hover:bg-indigo-50/60 transition-colors flex items-center justify-between group cursor-pointer"
            >
              <div>
                <p className="text-sm font-semibold text-slate-900 group-hover:text-indigo-600">
                  {p.name}
                </p>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  SKU: {p.sku} {p.barcode_number ? `• Barcode: ${p.barcode_number}` : ''} • ${parseFloat(p.price || 0).toFixed(2)}
                </p>
              </div>
              <span className="text-xs font-medium text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity">
                Select
              </span>
            </button>
          ))}
        </div>
      )}

      {isOpen && query.trim() && !isLoading && suggestions.length === 0 && (
        <div className="absolute z-30 left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-lg p-4 text-center text-xs text-slate-500">
          No matching products found in stock.
        </div>
      )}
    </div>
  );
}
