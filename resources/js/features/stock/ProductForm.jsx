import React, { useState, useEffect } from 'react';
import Button from '../../components/Button';

export default function ProductForm({
  product = null,
  onSubmit,
  onCancel,
  isSubmitting = false,
  serverErrors = {},
}) {
  const isEditing = Boolean(product?.id);

  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    barcode_number: '',
    category: '',
    price: '',
    quantity: '0',
    low_stock_threshold: '10',
    description: '',
  });

  const [clientErrors, setClientErrors] = useState({});

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || '',
        sku: product.sku || '',
        barcode_number: product.barcode_number || '',
        category: product.category || '',
        price: product.price !== undefined && product.price !== null ? String(product.price) : '',
        quantity: product.quantity !== undefined && product.quantity !== null ? String(product.quantity) : '0',
        low_stock_threshold: product.low_stock_threshold !== undefined && product.low_stock_threshold !== null ? String(product.low_stock_threshold) : '10',
        description: product.description || '',
      });
    } else {
      setFormData({
        name: '',
        sku: '',
        barcode_number: '',
        category: '',
        price: '',
        quantity: '0',
        low_stock_threshold: '10',
        description: '',
      });
    }
    setClientErrors({});
  }, [product]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (clientErrors[name]) {
      setClientErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const validate = () => {
    const errors = {};
    if (!formData.name.trim()) {
      errors.name = 'Product name is required.';
    }
    if (!formData.sku.trim()) {
      errors.sku = 'SKU is required.';
    }
    if (formData.price && (isNaN(Number(formData.price)) || Number(formData.price) < 0)) {
      errors.price = 'Price must be a valid positive number.';
    }
    if (formData.quantity && (isNaN(Number(formData.quantity)) || Number(formData.quantity) < 0)) {
      errors.quantity = 'Quantity must be 0 or higher.';
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
      sku: formData.sku.trim().toUpperCase(),
      barcode_number: formData.barcode_number.trim() || null,
      category: formData.category.trim() || null,
      price: formData.price ? parseFloat(formData.price) : 0,
      quantity: parseInt(formData.quantity || '0', 10),
      low_stock_threshold: parseInt(formData.low_stock_threshold || '10', 10),
      description: formData.description.trim() || null,
    };

    onSubmit(payload);
  };

  const getFieldError = (field) => {
    return clientErrors[field] || (serverErrors[field] ? serverErrors[field][0] : null);
  };

  return (
    <form id="product-form" onSubmit={handleSubmit} className="space-y-5">
      {/* Product Name */}
      <div>
        <label htmlFor="name" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
          Product Name <span className="text-rose-500">*</span>
        </label>
        <input
          id="name"
          name="name"
          type="text"
          value={formData.name}
          onChange={handleChange}
          placeholder="e.g. Wireless Ergonomic Mouse"
          className={`w-full px-3.5 py-2.5 bg-white border rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-all ${
            getFieldError('name')
              ? 'border-rose-400 focus:ring-rose-200'
              : 'border-slate-300 focus:border-indigo-500 focus:ring-indigo-100'
          }`}
        />
        {getFieldError('name') && (
          <p className="mt-1 text-xs text-rose-500">{getFieldError('name')}</p>
        )}
      </div>

      {/* SKU & Barcode Number */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="sku" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            SKU <span className="text-rose-500">*</span>
          </label>
          <input
            id="sku"
            name="sku"
            type="text"
            value={formData.sku}
            onChange={handleChange}
            placeholder="e.g. ELEC-MOU-01"
            className={`w-full px-3.5 py-2.5 bg-white border rounded-xl text-sm font-mono text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-all ${
              getFieldError('sku')
                ? 'border-rose-400 focus:ring-rose-200'
                : 'border-slate-300 focus:border-indigo-500 focus:ring-indigo-100'
            }`}
          />
          {getFieldError('sku') && (
            <p className="mt-1 text-xs text-rose-500">{getFieldError('sku')}</p>
          )}
        </div>

        <div>
          <label htmlFor="barcode_number" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            Barcode / EAN <span className="text-slate-400 font-normal">(optional)</span>
          </label>
          <input
            id="barcode_number"
            name="barcode_number"
            type="text"
            value={formData.barcode_number}
            onChange={handleChange}
            placeholder="e.g. 8901234567890"
            className={`w-full px-3.5 py-2.5 bg-white border rounded-xl text-sm font-mono text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-all ${
              getFieldError('barcode_number')
                ? 'border-rose-400 focus:ring-rose-200'
                : 'border-slate-300 focus:border-indigo-500 focus:ring-indigo-100'
            }`}
          />
          {getFieldError('barcode_number') && (
            <p className="mt-1 text-xs text-rose-500">{getFieldError('barcode_number')}</p>
          )}
        </div>
      </div>

      {/* Category & Price */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="category" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            Category
          </label>
          <input
            id="category"
            name="category"
            type="text"
            list="category-suggestions"
            value={formData.category}
            onChange={handleChange}
            placeholder="Select or type..."
            className={`w-full px-3.5 py-2.5 bg-white border rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-all ${
              getFieldError('category')
                ? 'border-rose-400 focus:ring-rose-200'
                : 'border-slate-300 focus:border-indigo-500 focus:ring-indigo-100'
            }`}
          />
          <datalist id="category-suggestions">
            <option value="Electronics" />
            <option value="Apparel" />
            <option value="Office Supplies" />
            <option value="Food & Beverage" />
            <option value="Home & Living" />
          </datalist>
          {getFieldError('category') && (
            <p className="mt-1 text-xs text-rose-500">{getFieldError('category')}</p>
          )}
        </div>

        <div>
          <label htmlFor="price" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            Price ($)
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
            className={`w-full px-3.5 py-2.5 bg-white border rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-all ${
              getFieldError('price')
                ? 'border-rose-400 focus:ring-rose-200'
                : 'border-slate-300 focus:border-indigo-500 focus:ring-indigo-100'
            }`}
          />
          {getFieldError('price') && (
            <p className="mt-1 text-xs text-rose-500">{getFieldError('price')}</p>
          )}
        </div>
      </div>

      {/* Quantity & Low Stock Threshold */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="quantity" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
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
            className={`w-full px-3.5 py-2.5 bg-white border rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-all ${
              getFieldError('quantity')
                ? 'border-rose-400 focus:ring-rose-200'
                : 'border-slate-300 focus:border-indigo-500 focus:ring-indigo-100'
            }`}
          />
          {getFieldError('quantity') && (
            <p className="mt-1 text-xs text-rose-500">{getFieldError('quantity')}</p>
          )}
        </div>

        <div>
          <label htmlFor="low_stock_threshold" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
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
            className={`w-full px-3.5 py-2.5 bg-white border rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-all ${
              getFieldError('low_stock_threshold')
                ? 'border-rose-400 focus:ring-rose-200'
                : 'border-slate-300 focus:border-indigo-500 focus:ring-indigo-100'
            }`}
          />
          <p className="mt-1 text-[11px] text-slate-400">Triggers warning badge when stock drops to or below this.</p>
          {getFieldError('low_stock_threshold') && (
            <p className="mt-1 text-xs text-rose-500">{getFieldError('low_stock_threshold')}</p>
          )}
        </div>
      </div>

      {/* Description */}
      <div>
        <label htmlFor="description" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
          Description <span className="text-slate-400 font-normal">(optional)</span>
        </label>
        <textarea
          id="description"
          name="description"
          rows={3}
          value={formData.description}
          onChange={handleChange}
          placeholder="Product notes, specifications, or packaging details..."
          className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all resize-none"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
        <Button variant="secondary" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" isLoading={isSubmitting}>
          {isEditing ? 'Save Changes' : 'Create Product'}
        </Button>
      </div>
    </form>
  );
}
