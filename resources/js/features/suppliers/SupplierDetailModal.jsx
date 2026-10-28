import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Phone,
  Mail,
  MapPin,
  Globe,
  CreditCard,
  FileText,
  ExternalLink,
  Package,
  Calendar,
  Pencil,
  X,
} from 'lucide-react';
import Modal from '../../components/Modal';
import Button from '../../components/Button';
import Badge from '../../components/Badge';

export default function SupplierDetailModal({
  isOpen,
  supplier,
  onClose,
  onEdit,
}) {
  const navigate = useNavigate();
  if (!supplier) return null;

  const addressParts = [
    supplier.address_line1,
    supplier.address_line2,
    supplier.city,
    supplier.postal_code,
    supplier.country || 'Sri Lanka',
  ].filter(Boolean);

  const fullAddress = addressParts.join(', ');
  const mapUrl = fullAddress
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`
    : null;

  const products = supplier.products || [];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={supplier.name}
      description={supplier.contact_person ? `Contact: ${supplier.contact_person}` : 'Supplier Details'}
      size="lg"
      fullScreenMobile={true}
      bodyClassName="p-4 sm:p-5 space-y-5"
      footer={
        <div className="flex items-center justify-between w-full">
          <Badge
            variant={supplier.status === 'active' ? 'success' : 'neutral'}
            size="sm"
          >
            {supplier.status === 'active' ? 'Active Supplier' : 'Inactive'}
          </Badge>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={onClose}
            >
              Close
            </Button>
            {onEdit && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  onClose();
                  onEdit(supplier);
                }}
                icon={Pencil}
              >
                Edit Supplier
              </Button>
            )}
          </div>
        </div>
      }
    >
      {/* Contact Quick Action Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {/* Mobile Call */}
        {supplier.mobile ? (
          <a
            href={`tel:${supplier.mobile}`}
            className="flex items-center justify-center gap-2 p-2.5 bg-gray-50 hover:bg-gray-100/80 border border-gray-200 rounded-lg text-xs font-medium text-gray-900 transition-colors"
          >
            <Phone className="w-3.5 h-3.5 text-indigo-600" strokeWidth={1.5} />
            <span className="truncate">Call Mobile</span>
          </a>
        ) : (
          <div className="flex items-center justify-center gap-2 p-2.5 bg-gray-50/50 border border-gray-100 rounded-lg text-xs text-gray-400">
            <Phone className="w-3.5 h-3.5" strokeWidth={1.5} />
            <span>No Mobile</span>
          </div>
        )}

        {/* Email */}
        {supplier.email ? (
          <a
            href={`mailto:${supplier.email}`}
            className="flex items-center justify-center gap-2 p-2.5 bg-gray-50 hover:bg-gray-100/80 border border-gray-200 rounded-lg text-xs font-medium text-gray-900 transition-colors"
          >
            <Mail className="w-3.5 h-3.5 text-indigo-600" strokeWidth={1.5} />
            <span className="truncate">Send Email</span>
          </a>
        ) : (
          <div className="flex items-center justify-center gap-2 p-2.5 bg-gray-50/50 border border-gray-100 rounded-lg text-xs text-gray-400">
            <Mail className="w-3.5 h-3.5" strokeWidth={1.5} />
            <span>No Email</span>
          </div>
        )}

        {/* Map Link */}
        {mapUrl ? (
          <a
            href={mapUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 p-2.5 bg-gray-50 hover:bg-gray-100/80 border border-gray-200 rounded-lg text-xs font-medium text-gray-900 transition-colors"
          >
            <MapPin className="w-3.5 h-3.5 text-indigo-600" strokeWidth={1.5} />
            <span className="truncate">Google Maps</span>
          </a>
        ) : (
          <div className="flex items-center justify-center gap-2 p-2.5 bg-gray-50/50 border border-gray-100 rounded-lg text-xs text-gray-400">
            <MapPin className="w-3.5 h-3.5" strokeWidth={1.5} />
            <span>No Address</span>
          </div>
        )}

        {/* Website Link */}
        {supplier.website ? (
          <a
            href={supplier.website}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 p-2.5 bg-gray-50 hover:bg-gray-100/80 border border-gray-200 rounded-lg text-xs font-medium text-gray-900 transition-colors"
          >
            <Globe className="w-3.5 h-3.5 text-indigo-600" strokeWidth={1.5} />
            <span className="truncate">Visit Website</span>
          </a>
        ) : (
          <div className="flex items-center justify-center gap-2 p-2.5 bg-gray-50/50 border border-gray-100 rounded-lg text-xs text-gray-400">
            <Globe className="w-3.5 h-3.5" strokeWidth={1.5} />
            <span>No Website</span>
          </div>
        )}
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs bg-white border border-gray-200 rounded-lg p-3.5 sm:p-4">
        {/* Contact Information */}
        <div className="space-y-2">
          <span className="font-semibold text-gray-900 text-xs block pb-1 border-b border-gray-100">
            Contact Details
          </span>
          <div className="flex items-center justify-between py-0.5">
            <span className="text-gray-500">Contact Person:</span>
            <span className="font-medium text-gray-900">{supplier.contact_person || '—'}</span>
          </div>
          <div className="flex items-center justify-between py-0.5">
            <span className="text-gray-500">Mobile:</span>
            <span className="font-mono text-gray-900">{supplier.mobile || '—'}</span>
          </div>
          <div className="flex items-center justify-between py-0.5">
            <span className="text-gray-500">Phone (Landline):</span>
            <span className="font-mono text-gray-900">{supplier.phone || '—'}</span>
          </div>
          <div className="flex items-center justify-between py-0.5">
            <span className="text-gray-500">Email:</span>
            <span className="text-gray-900 truncate max-w-[180px]">{supplier.email || '—'}</span>
          </div>
          <div className="flex items-center justify-between py-0.5">
            <span className="text-gray-500">Payment Terms:</span>
            <span className="font-medium text-gray-900">{supplier.payment_terms || '—'}</span>
          </div>
        </div>

        {/* Address Information */}
        <div className="space-y-2">
          <span className="font-semibold text-gray-900 text-xs block pb-1 border-b border-gray-100">
            Address & Location
          </span>
          <div className="flex items-start justify-between py-0.5">
            <span className="text-gray-500 shrink-0 mr-2">Street:</span>
            <span className="text-gray-900 text-right">
              {[supplier.address_line1, supplier.address_line2].filter(Boolean).join(', ') || '—'}
            </span>
          </div>
          <div className="flex items-center justify-between py-0.5">
            <span className="text-gray-500">City:</span>
            <span className="text-gray-900">{supplier.city || '—'}</span>
          </div>
          <div className="flex items-center justify-between py-0.5">
            <span className="text-gray-500">Postal Code:</span>
            <span className="font-mono text-gray-900">{supplier.postal_code || '—'}</span>
          </div>
          <div className="flex items-center justify-between py-0.5">
            <span className="text-gray-500">Country:</span>
            <span className="text-gray-900">{supplier.country || 'Sri Lanka'}</span>
          </div>
        </div>
      </div>

      {/* Notes Section */}
      {supplier.notes && (
        <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-xs space-y-1">
          <span className="font-semibold text-gray-700 block">Supplier Notes</span>
          <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">{supplier.notes}</p>
        </div>
      )}

      {/* Linked Products Section */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-gray-900 text-xs flex items-center gap-1.5">
            <Package className="w-3.5 h-3.5 text-gray-500" strokeWidth={1.5} />
            <span>Supplied Products ({products.length})</span>
          </span>
          <button
            type="button"
            onClick={() => {
              onClose();
              navigate(`/products/items?supplier_id=${supplier.id}`);
            }}
            className="text-xs text-indigo-600 hover:text-indigo-800 font-medium inline-flex items-center gap-1 cursor-pointer"
          >
            <span>View all in Items</span>
            <ExternalLink className="w-3 h-3" strokeWidth={1.5} />
          </button>
        </div>

        {products.length === 0 ? (
          <div className="p-4 border border-dashed border-gray-200 rounded-lg text-center text-xs text-gray-400">
            No products are currently linked to this supplier.
          </div>
        ) : (
          <div className="border border-gray-200 rounded-lg overflow-hidden bg-white max-h-48 overflow-y-auto">
            <table className="w-full table-fixed text-xs divide-y divide-gray-100">
              <thead className="bg-gray-50 sticky top-0 z-10 text-gray-600 font-medium border-b border-gray-200">
                <tr>
                  <th className="px-3 py-2 text-left w-auto truncate">Product Name</th>
                  <th className="px-2 py-2 text-center w-28 truncate">SKU</th>
                  <th className="px-2 py-2 text-center w-20 truncate">Price</th>
                  <th className="px-2 py-2 text-center w-16 truncate">Qty</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {products.map((p) => (
                  <tr
                    key={p.id}
                    onClick={() => {
                      onClose();
                      navigate(`/products/items?search=${encodeURIComponent(p.sku)}`);
                    }}
                    className="hover:bg-gray-50/75 transition-colors cursor-pointer"
                    title={`Click to open ${p.name} in Items`}
                  >
                    <td className="px-3 py-2 font-medium text-gray-900 truncate">
                      {p.name}
                    </td>
                    <td className="px-2 py-2 font-mono text-gray-500 text-center truncate">
                      {p.sku}
                    </td>
                    <td className="px-2 py-2 text-gray-900 text-center truncate">
                      ${parseFloat(p.price || 0).toFixed(2)}
                    </td>
                    <td className="px-2 py-2 text-center truncate">
                      <span
                        className={`inline-block px-1.5 py-0.5 rounded text-[11px] font-medium ${
                          p.quantity <= 0
                            ? 'bg-red-50 text-red-700'
                            : p.quantity <= (p.low_stock_threshold || 10)
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-green-50 text-green-700'
                        }`}
                      >
                        {p.quantity}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Modal>
  );
}
