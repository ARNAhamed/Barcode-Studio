import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { Truck, AlertCircle, X, Check } from 'lucide-react';
import Modal from '../../components/Modal';
import Button from '../../components/Button';
import { createSupplier, updateSupplier } from '../../api/suppliers';

export default function SupplierFormModal({
  isOpen,
  supplier = null,
  onClose,
  onSuccess,
}) {
  const isEditing = Boolean(supplier?.id);
  const nameInputRef = useRef(null);

  const initialForm = {
    name: '',
    contact_person: '',
    mobile: '',
    phone: '',
    email: '',
    address_line1: '',
    address_line2: '',
    city: '',
    postal_code: '',
    country: 'Sri Lanka',
    website: '',
    payment_terms: '',
    notes: '',
    status: 'active',
  };

  const [formData, setFormData] = useState(initialForm);
  const [clientErrors, setClientErrors] = useState({});
  const [serverErrors, setServerErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [showUnsavedConfirm, setShowUnsavedConfirm] = useState(false);
  const initialValuesRef = useRef(initialForm);

  useEffect(() => {
    if (isOpen) {
      const data = supplier
        ? {
            name: supplier.name || '',
            contact_person: supplier.contact_person || '',
            mobile: supplier.mobile || '',
            phone: supplier.phone || '',
            email: supplier.email || '',
            address_line1: supplier.address_line1 || '',
            address_line2: supplier.address_line2 || '',
            city: supplier.city || '',
            postal_code: supplier.postal_code || '',
            country: supplier.country || 'Sri Lanka',
            website: supplier.website || '',
            payment_terms: supplier.payment_terms || '',
            notes: supplier.notes || '',
            status: supplier.status || 'active',
          }
        : initialForm;

      setFormData(data);
      initialValuesRef.current = data;
      setClientErrors({});
      setServerErrors({});
      setIsDirty(false);
      setShowUnsavedConfirm(false);

      const timer = setTimeout(() => {
        nameInputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen, supplier]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const updated = { ...prev, [name]: value };
      const changed = Object.keys(updated).some(
        (key) => updated[key] !== initialValuesRef.current[key]
      );
      setIsDirty(changed);
      return updated;
    });

    if (clientErrors[name]) {
      setClientErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }

    if (serverErrors[name]) {
      setServerErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const validate = () => {
    const errs = {};
    if (!formData.name.trim()) {
      errs.name = 'Supplier name is required.';
    }

    const mobileTrim = formData.mobile.trim();
    if (!mobileTrim) {
      errs.mobile = 'Mobile number is required.';
    } else {
      const slMobileRegex = /^(?:\+94|0094|0)?7\d{8}$/;
      if (!slMobileRegex.test(mobileTrim.replace(/[\s-]/g, ''))) {
        errs.mobile = 'Enter a valid Sri Lankan mobile (e.g., 0771234567 or +94771234567).';
      }
    }

    if (formData.phone && formData.phone.trim()) {
      const slPhoneRegex = /^(?:\+94|0094|0)?\d{9}$/;
      if (!slPhoneRegex.test(formData.phone.trim().replace(/[\s-]/g, ''))) {
        errs.phone = 'Enter a valid Sri Lankan phone number (e.g., 0112345678).';
      }
    }

    if (formData.email && formData.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email.trim())) {
        errs.email = 'Enter a valid email address.';
      }
    }

    if (formData.website && formData.website.trim()) {
      try {
        new URL(formData.website.trim());
      } catch {
        errs.website = 'Enter a valid website URL (must start with http:// or https://).';
      }
    }

    return errs;
  };

  const handleRequestClose = () => {
    if (isDirty) {
      setShowUnsavedConfirm(true);
    } else {
      onClose();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setClientErrors(errs);
      return;
    }

    setIsSubmitting(true);
    setServerErrors({});

    try {
      const payload = {
        ...formData,
        mobile: formData.mobile.trim().replace(/[\s-]/g, ''),
        phone: formData.phone ? formData.phone.trim().replace(/[\s-]/g, '') : null,
        email: formData.email ? formData.email.trim() : null,
        website: formData.website ? formData.website.trim() : null,
      };

      let result;
      if (isEditing) {
        result = await updateSupplier(supplier.id, payload);
        toast.success(`Supplier '${payload.name}' updated.`);
      } else {
        result = await createSupplier(payload);
        toast.success(`Supplier '${payload.name}' created.`);
      }

      setIsDirty(false);
      if (onSuccess) {
        onSuccess(result?.data || result);
      }
      onClose();
    } catch (err) {
      if (err.response?.status === 422 && err.response?.data?.errors) {
        setServerErrors(err.response.data.errors);
      } else {
        toast.error(err.response?.data?.message || 'Failed to save supplier.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={handleRequestClose}
        title={isEditing ? 'Edit Supplier' : 'Add New Supplier'}
        description={
          isEditing
            ? `Update contact and address information for ${supplier?.name}.`
            : 'Register a new vendor or wholesale supplier for inventory items.'
        }
        size="lg"
        fullScreenMobile={true}
        bodyClassName="p-4 sm:p-5"
        footer={
          <div className="flex items-center justify-between w-full">
            <span className="text-xs text-gray-400">
              {isDirty ? (
                <span className="text-amber-600 font-medium">&bull; Unsaved changes</span>
              ) : (
                'All changes saved'
              )}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleRequestClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                type="submit"
                form="supplier-form"
                isLoading={isSubmitting}
              >
                {isEditing ? 'Save Changes' : 'Create Supplier'}
              </Button>
            </div>
          </div>
        }
      >
        <form id="supplier-form" onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Supplier Name */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Supplier Name <span className="text-red-500">*</span>
              </label>
              <input
                ref={nameInputRef}
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g. Lanka Office Supplies Ltd"
                className={`w-full h-9 px-3 bg-white border rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 transition-colors ${
                  clientErrors.name || serverErrors.name
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20'
                    : 'border-gray-300 focus:border-indigo-600 focus:ring-indigo-500/20'
                }`}
              />
              {(clientErrors.name || serverErrors.name?.[0]) && (
                <p className="mt-1 text-xs text-red-600">
                  {clientErrors.name || serverErrors.name[0]}
                </p>
              )}
            </div>

            {/* Contact Person */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Contact Person
              </label>
              <input
                type="text"
                name="contact_person"
                value={formData.contact_person}
                onChange={handleChange}
                placeholder="e.g. Rohan Perera"
                className="w-full h-9 px-3 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-colors"
              />
            </div>

            {/* Status */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full h-9 px-3 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-colors cursor-pointer"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            {/* Mobile Number */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Mobile Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="mobile"
                value={formData.mobile}
                onChange={handleChange}
                placeholder="e.g. 0771234567 or +94771234567"
                className={`w-full h-9 px-3 bg-white border rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 transition-colors ${
                  clientErrors.mobile || serverErrors.mobile
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20'
                    : 'border-gray-300 focus:border-indigo-600 focus:ring-indigo-500/20'
                }`}
              />
              {(clientErrors.mobile || serverErrors.mobile?.[0]) && (
                <p className="mt-1 text-xs text-red-600">
                  {clientErrors.mobile || serverErrors.mobile[0]}
                </p>
              )}
            </div>

            {/* Phone Number */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Phone Number (Landline)
              </label>
              <input
                type="text"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="e.g. 0112456789"
                className={`w-full h-9 px-3 bg-white border rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 transition-colors ${
                  clientErrors.phone || serverErrors.phone
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20'
                    : 'border-gray-300 focus:border-indigo-600 focus:ring-indigo-500/20'
                }`}
              />
              {(clientErrors.phone || serverErrors.phone?.[0]) && (
                <p className="mt-1 text-xs text-red-600">
                  {clientErrors.phone || serverErrors.phone[0]}
                </p>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="e.g. sales@lankaoffice.lk"
                className={`w-full h-9 px-3 bg-white border rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 transition-colors ${
                  clientErrors.email || serverErrors.email
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20'
                    : 'border-gray-300 focus:border-indigo-600 focus:ring-indigo-500/20'
                }`}
              />
              {(clientErrors.email || serverErrors.email?.[0]) && (
                <p className="mt-1 text-xs text-red-600">
                  {clientErrors.email || serverErrors.email[0]}
                </p>
              )}
            </div>

            {/* Website */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Website
              </label>
              <input
                type="text"
                name="website"
                value={formData.website}
                onChange={handleChange}
                placeholder="e.g. https://lankaoffice.lk"
                className={`w-full h-9 px-3 bg-white border rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 transition-colors ${
                  clientErrors.website || serverErrors.website
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20'
                    : 'border-gray-300 focus:border-indigo-600 focus:ring-indigo-500/20'
                }`}
              />
              {(clientErrors.website || serverErrors.website?.[0]) && (
                <p className="mt-1 text-xs text-red-600">
                  {clientErrors.website || serverErrors.website[0]}
                </p>
              )}
            </div>

            {/* Address Line 1 */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Address Line 1
              </label>
              <input
                type="text"
                name="address_line1"
                value={formData.address_line1}
                onChange={handleChange}
                placeholder="e.g. No. 45, Galle Road"
                className="w-full h-9 px-3 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-colors"
              />
            </div>

            {/* Address Line 2 */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Address Line 2
              </label>
              <input
                type="text"
                name="address_line2"
                value={formData.address_line2}
                onChange={handleChange}
                placeholder="e.g. Kollupitiya"
                className="w-full h-9 px-3 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-colors"
              />
            </div>

            {/* City */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                City
              </label>
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleChange}
                placeholder="e.g. Colombo"
                className="w-full h-9 px-3 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-colors"
              />
            </div>

            {/* Postal Code */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Postal Code
              </label>
              <input
                type="text"
                name="postal_code"
                value={formData.postal_code}
                onChange={handleChange}
                placeholder="e.g. 00300"
                className="w-full h-9 px-3 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-colors"
              />
            </div>

            {/* Country */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Country
              </label>
              <input
                type="text"
                name="country"
                value={formData.country}
                onChange={handleChange}
                placeholder="Sri Lanka"
                className="w-full h-9 px-3 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-colors"
              />
            </div>

            {/* Payment Terms */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Payment Terms
              </label>
              <input
                type="text"
                name="payment_terms"
                value={formData.payment_terms}
                onChange={handleChange}
                placeholder="e.g. 30 days, Net 15"
                className="w-full h-9 px-3 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-colors"
              />
            </div>

            {/* Notes */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                name="notes"
                rows={2}
                value={formData.notes}
                onChange={handleChange}
                placeholder="Optional supplier notes, delivery schedules, account notes..."
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-colors resize-none"
              />
            </div>
          </div>
        </form>
      </Modal>

      {/* Confirmation Modal for Unsaved Changes */}
      {showUnsavedConfirm && (
        <Modal
          isOpen={true}
          onClose={() => setShowUnsavedConfirm(false)}
          title="Discard Unsaved Changes?"
          description="You have unsaved edits in this supplier form. If you close now, your changes will be lost."
          size="sm"
          footer={
            <div className="flex items-center justify-end gap-2 w-full">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowUnsavedConfirm(false)}
              >
                Keep Editing
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => {
                  setShowUnsavedConfirm(false);
                  setIsDirty(false);
                  onClose();
                }}
              >
                Discard & Close
              </Button>
            </div>
          }
        >
          <div className="p-1 text-sm text-gray-600">
            Are you sure you want to exit without saving?
          </div>
        </Modal>
      )}
    </>
  );
}
