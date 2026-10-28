import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Wand2, Loader2, Plus } from 'lucide-react';
import Button from '../../components/Button';
import { generateBarcodeNumber } from '../../api/barcodes';
import { getSuppliers } from '../../api/suppliers';
import SupplierFormModal from '../suppliers/SupplierFormModal';

export default function ProductForm({
  product = null,
  onSubmit,
  onCancel,
  isSubmitting = false,
  serverErrors = {},
  formId = 'product-form',
  hideActions = false,
  onDirtyChange,
}) {
  const isEditing = Boolean(product?.id);
  const nameInputRef = useRef(null);
  const queryClient = useQueryClient();

  const [showNewSupplierModal, setShowNewSupplierModal] = useState(false);

  const { data: suppliersResponse } = useQuery({
    queryKey: ['active-suppliers'],
    queryFn: () => getSuppliers({ status: 'active', per_page: 100 }),
  });
  const activeSuppliers = suppliersResponse?.data || [];

  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    barcode_number: '',
    supplier_id: '',
    category: '',
    price: '',
    quantity: '0',
    low_stock_threshold: '10',
    description: '',
  });

  const [barcodeFormat, setBarcodeFormat] = useState('CODE128');
  const [isGenerating, setIsGenerating] = useState(false);
  const [autoGenerateOnCreate, setAutoGenerateOnCreate] = useState(false);
  const [clientErrors, setClientErrors] = useState({});
  const initialValuesRef = useRef(formData);

  const handleGenerateBarcode = async () => {
    setIsGenerating(true);
    try {
      const res = await generateBarcodeNumber(barcodeFormat);
      setFormData((prev) => {
        const next = { ...prev, barcode_number: res.number };
        if (onDirtyChange) onDirtyChange(true);
        return next;
      });
      setClientErrors((prev) => {
        const next = { ...prev };
        delete next.barcode_number;
        return next;
      });
      toast.success(`Generated valid ${res.format}: ${res.number}`, { duration: 3000 });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to generate barcode number.');
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    const initData = product
      ? {
          name: product.name || '',
          sku: product.sku || '',
          barcode_number: product.barcode_number || '',
          supplier_id: product.supplier_id ? String(product.supplier_id) : '',
          category: product.category || '',
          price: product.price !== undefined && product.price !== null ? String(product.price) : '',
          quantity: product.quantity !== undefined && product.quantity !== null ? String(product.quantity) : '0',
          low_stock_threshold: product.low_stock_threshold !== undefined && product.low_stock_threshold !== null ? String(product.low_stock_threshold) : '10',
          description: product.description || '',
        }
      : {
          name: '',
          sku: '',
          barcode_number: '',
          supplier_id: '',
          category: '',
          price: '',
          quantity: '0',
          low_stock_threshold: '10',
          description: '',
        };

    setFormData(initData);
    initialValuesRef.current = initData;
    setClientErrors({});
    if (onDirtyChange) onDirtyChange(false);

    // Autofocus first field when opened
    const timer = setTimeout(() => {
      nameInputRef.current?.focus();
    }, 50);
    return () => clearTimeout(timer);
  }, [product]);

  const checkIfDirty = (newFormData) => {
    const init = initialValuesRef.current;
    const isDirty = Object.keys(newFormData).some((key) => newFormData[key] !== init[key]);
    if (onDirtyChange) onDirtyChange(isDirty);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const next = { ...prev, [name]: value };
      checkIfDirty(next);
      return next;
    });
    if (clientErrors[name]) {
      setClientErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const validate = () => {
    const errors = {};
    if (!formData.name.trim()) errors.name = 'Product name is required.';
    if (!formData.sku.trim()) errors.sku = 'Item code is required.';
    if (formData.price === '' || isNaN(Number(formData.price)) || Number(formData.price) < 0) {
      errors.price = 'Price must be a positive number.';
    }
    if (formData.quantity === '' || isNaN(Number(formData.quantity)) || Number(formData.quantity) < 0) {
      errors.quantity = 'Quantity must be 0 or more.';
    }
    return errors;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setClientErrors(errors);
      return;
    }

    const payload = {
      name: formData.name.trim(),
      sku: formData.sku.trim(),
      barcode_number: formData.barcode_number.trim() || null,
      supplier_id: formData.supplier_id ? parseInt(formData.supplier_id, 10) : null,
      category: formData.category.trim() || null,
      price: parseFloat(formData.price),
      quantity: parseInt(formData.quantity, 10),
      low_stock_threshold: parseInt(formData.low_stock_threshold, 10) || 10,
      description: formData.description.trim() || null,
      auto_generate_barcode: !isEditing && autoGenerateOnCreate && !formData.barcode_number.trim(),
      auto_barcode_format: barcodeFormat,
    };

    onSubmit(payload);
  };

  const getFieldError = (field) => {
    return clientErrors[field] || (serverErrors[field] ? serverErrors[field][0] : null);
  };

  return (
    <form id={formId} onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {/* Product Name (Full width) */}
      <div className="col-span-1 sm:col-span-2">
        <label htmlFor="name" className="block text-xs font-medium text-gray-700 mb-1">
          Product Name <span className="text-red-500">*</span>
        </label>
        <input
          ref={nameInputRef}
          id="name"
          name="name"
          type="text"
          value={formData.name}
          onChange={handleChange}
          placeholder="e.g. Wireless Ergonomic Mouse"
          className={`w-full h-9 px-3 bg-white border rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 transition-colors ${
            getFieldError('name')
              ? 'border-red-500 focus:ring-red-500/20'
              : 'border-gray-300 focus:border-indigo-600 focus:ring-indigo-500/20'
          }`}
        />
        {getFieldError('name') && (
          <p className="mt-1 text-xs text-red-600">{getFieldError('name')}</p>
        )}
      </div>

      {/* Item Code (Column 1) */}
      <div className="col-span-1">
        <label htmlFor="sku" className="block text-xs font-medium text-gray-700 mb-1">
          Item Code <span className="text-red-500">*</span>
        </label>
        <input
          id="sku"
          name="sku"
          type="text"
          value={formData.sku}
          onChange={handleChange}
          placeholder="e.g. ELEC-MOU-01"
          className={`w-full h-9 px-3 bg-white border rounded-lg text-sm font-mono text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 transition-colors ${
            getFieldError('sku')
              ? 'border-red-500 focus:ring-red-500/20'
              : 'border-gray-300 focus:border-indigo-600 focus:ring-indigo-500/20'
          }`}
        />
        {getFieldError('sku') && (
          <p className="mt-1 text-xs text-red-600">{getFieldError('sku')}</p>
        )}
      </div>

      {/* Barcode Number (Column 2) with Format Selector & Generate Button */}
      <div className="col-span-1">
        <div className="flex items-center justify-between mb-1">
          <label htmlFor="barcode_number" className="block text-xs font-medium text-gray-700">
            Barcode / EAN <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <div className="flex items-center gap-1.5">
            <select
              value={barcodeFormat}
              onChange={(e) => setBarcodeFormat(e.target.value)}
              className="h-7 text-xs bg-white text-gray-700 font-medium rounded border border-gray-300 px-1.5 focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
              title="Select format to generate"
            >
              <option value="CODE128">CODE128</option>
              <option value="EAN13">EAN-13</option>
              <option value="EAN8">EAN-8</option>
              <option value="UPC">UPC-A</option>
            </select>
            <button
              type="button"
              onClick={handleGenerateBarcode}
              disabled={isGenerating}
              className="inline-flex items-center gap-1 px-2 h-7 text-xs font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded transition-colors cursor-pointer disabled:opacity-50"
              title="Generate valid unique barcode number"
            >
              {isGenerating ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Wand2 className="w-3 h-3" />
              )}
              <span>Generate</span>
            </button>
          </div>
        </div>
        <input
          id="barcode_number"
          name="barcode_number"
          type="text"
          value={formData.barcode_number}
          onChange={handleChange}
          placeholder="e.g. 8901234567890 or PRD-000001"
          className={`w-full h-9 px-3 bg-white border rounded-lg text-sm font-mono text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 transition-colors ${
            getFieldError('barcode_number')
              ? 'border-red-500 focus:ring-red-500/20'
              : 'border-gray-300 focus:border-indigo-600 focus:ring-indigo-500/20'
          }`}
        />
        {getFieldError('barcode_number') && (
          <p className="mt-1 text-xs text-red-600">{getFieldError('barcode_number')}</p>
        )}
      </div>

      {/* Auto-generate option on creation if barcode is empty */}
      {!isEditing && !formData.barcode_number && (
        <div className="col-span-1 sm:col-span-2 -mt-1">
          <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={autoGenerateOnCreate}
              onChange={(e) => setAutoGenerateOnCreate(e.target.checked)}
              className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500/20 cursor-pointer"
            />
            <span>Automatically assign unique <strong>{barcodeFormat}</strong> barcode on save</span>
          </label>
        </div>
      )}

      {/* Category (Column 1) */}
      <div className="col-span-1">
        <label htmlFor="category" className="block text-xs font-medium text-gray-700 mb-1">
          Category <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        <input
          id="category"
          name="category"
          type="text"
          value={formData.category}
          onChange={handleChange}
          placeholder="e.g. Electronics, Peripherals"
          className="w-full h-9 px-3 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 transition-colors"
        />
      </div>

      {/* Supplier (Column 2) with + New Supplier shortcut */}
      <div className="col-span-1">
        <div className="flex items-center justify-between mb-1">
          <label htmlFor="supplier_id" className="block text-xs font-medium text-gray-700">
            Supplier <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <button
            type="button"
            onClick={() => setShowNewSupplierModal(true)}
            className="text-xs text-indigo-600 hover:text-indigo-800 font-medium inline-flex items-center gap-1 cursor-pointer"
            title="Create a new supplier"
          >
            <Plus className="w-3 h-3" />
            <span>New supplier</span>
          </button>
        </div>
        <select
          id="supplier_id"
          name="supplier_id"
          value={formData.supplier_id}
          onChange={handleChange}
          className="w-full h-9 px-3 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 transition-colors cursor-pointer"
        >
          <option value="">No Supplier</option>
          {activeSuppliers.map((s) => (
            <option key={s.id} value={String(s.id)}>
              {s.name} {s.contact_person ? `(${s.contact_person})` : ''}
            </option>
          ))}
        </select>
      </div>

      {/* Price (Column 2) */}
      <div className="col-span-1">
        <label htmlFor="price" className="block text-xs font-medium text-gray-700 mb-1">
          Price ($) <span className="text-red-500">*</span>
        </label>
        <input
          id="price"
          name="price"
          type="number"
          step="0.01"
          min="0"
          value={formData.price}
          onChange={handleChange}
          placeholder="0.00"
          className={`w-full h-9 px-3 bg-white border rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 transition-colors ${
            getFieldError('price')
              ? 'border-red-500 focus:ring-red-500/20'
              : 'border-gray-300 focus:border-indigo-600 focus:ring-indigo-500/20'
          }`}
        />
        {getFieldError('price') && (
          <p className="mt-1 text-xs text-red-600">{getFieldError('price')}</p>
        )}
      </div>

      {/* Quantity (Column 1) */}
      <div className="col-span-1">
        <label htmlFor="quantity" className="block text-xs font-medium text-gray-700 mb-1">
          Initial Stock Quantity
        </label>
        <input
          id="quantity"
          name="quantity"
          type="number"
          min="0"
          value={formData.quantity}
          onChange={handleChange}
          placeholder="0"
          className={`w-full h-9 px-3 bg-white border rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 transition-colors ${
            getFieldError('quantity')
              ? 'border-red-500 focus:ring-red-500/20'
              : 'border-gray-300 focus:border-indigo-600 focus:ring-indigo-500/20'
          }`}
        />
        {getFieldError('quantity') && (
          <p className="mt-1 text-xs text-red-600">{getFieldError('quantity')}</p>
        )}
      </div>

      {/* Low Stock Threshold (Column 2) */}
      <div className="col-span-1">
        <label htmlFor="low_stock_threshold" className="block text-xs font-medium text-gray-700 mb-1">
          Low Stock Threshold
        </label>
        <input
          id="low_stock_threshold"
          name="low_stock_threshold"
          type="number"
          min="1"
          value={formData.low_stock_threshold}
          onChange={handleChange}
          placeholder="10"
          className={`w-full h-9 px-3 bg-white border rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 transition-colors ${
            getFieldError('low_stock_threshold')
              ? 'border-red-500 focus:ring-red-500/20'
              : 'border-gray-300 focus:border-indigo-600 focus:ring-indigo-500/20'
          }`}
        />
        <p className="mt-1 text-[11px] text-gray-400">Warning badge when stock drops to or below this.</p>
        {getFieldError('low_stock_threshold') && (
          <p className="mt-1 text-xs text-red-600">{getFieldError('low_stock_threshold')}</p>
        )}
      </div>

      {/* Description (Full width) */}
      <div className="col-span-1 sm:col-span-2">
        <label htmlFor="description" className="block text-xs font-medium text-gray-700 mb-1">
          Description <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        <textarea
          id="description"
          name="description"
          rows={3}
          value={formData.description}
          onChange={handleChange}
          placeholder="Product notes, specifications, or packaging details..."
          className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 transition-colors resize-none"
        />
      </div>

      {/* Actions (only rendered if not embedded in a modal footer) */}
      {!hideActions && (
        <div className="col-span-1 sm:col-span-2 flex items-center justify-end gap-2.5 pt-4 border-t border-gray-100">
          <Button variant="secondary" size="md" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="md" isLoading={isSubmitting}>
            {isEditing ? 'Save Changes' : 'Create Product'}
          </Button>
        </div>
      )}

      {/* Embedded New Supplier Modal Shortcut */}
      {showNewSupplierModal && (
        <SupplierFormModal
          isOpen={true}
          onClose={() => setShowNewSupplierModal(false)}
          onSuccess={(newSupplier) => {
            queryClient.invalidateQueries({ queryKey: ['active-suppliers'] });
            queryClient.invalidateQueries({ queryKey: ['suppliers'] });
            queryClient.invalidateQueries({ queryKey: ['suppliers-summary'] });
            if (newSupplier?.id) {
              setFormData((prev) => {
                const next = { ...prev, supplier_id: String(newSupplier.id) };
                checkIfDirty(next);
                return next;
              });
            }
          }}
        />
      )}
    </form>
  );
}
