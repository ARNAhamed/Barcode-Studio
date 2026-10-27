import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Pencil,
  Trash2,
  Download,
  Calendar,
  Barcode as BarcodeIcon,
  QrCode as QrCodeIcon,
  Package,
  Printer,
} from 'lucide-react';
import Badge from '../../components/Badge';
import { downloadFile } from '../../utils/downloadHelpers';

export default function CodeCard({ code, onDelete }) {
  const navigate = useNavigate();

  const handleDownload = (e) => {
    e.stopPropagation();
    if (code.preview_url) {
      const filename = `${code.name.toLowerCase().replace(/[^a-z0-9]/g, '_') || 'code'}.png`;
      downloadFile(code.preview_url, filename);
    }
  };

  const formattedDate = code.created_at
    ? new Date(code.created_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : '';

  return (
    <div className="bg-white rounded-lg border border-gray-200 flex flex-col overflow-hidden group transition-colors duration-150">
      {/* Code Image Preview Container (#F4F4F5 / bg-zinc-100) */}
      <div
        onClick={() => navigate(`/designer/${code.id}`)}
        className="w-full h-40 bg-[#F4F4F5] border-b border-gray-200 flex items-center justify-center p-4 cursor-pointer relative"
      >
        {code.preview_url ? (
          <img
            src={code.preview_url}
            alt={code.name}
            className="max-h-full max-w-full object-contain"
            loading="lazy"
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-gray-300">
            {code.type === 'barcode' ? (
              <BarcodeIcon className="w-10 h-10" strokeWidth={1.5} />
            ) : (
              <QrCodeIcon className="w-10 h-10" strokeWidth={1.5} />
            )}
            <span className="text-xs text-gray-400 mt-1">No preview</span>
          </div>
        )}

        {/* Format Badge Overlay */}
        <div className="absolute top-2.5 right-2.5">
          <span className="px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-white/95 text-gray-700 border border-gray-200 uppercase">
            {code.format}
          </span>
        </div>
      </div>

      {/* Card Details */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <Badge size="xs">
              {code.type === 'barcode' ? 'Barcode' : 'QR Code'}
            </Badge>

            {code.product && (
              <span className="inline-flex items-center gap-1 text-[11px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded truncate max-w-[140px]">
                <Package className="w-3 h-3 text-gray-400 shrink-0" strokeWidth={1.5} />
                <span className="truncate">{code.product.name}</span>
              </span>
            )}
          </div>

          <h3
            onClick={() => navigate(`/designer/${code.id}`)}
            className="text-sm font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors truncate cursor-pointer"
            title={code.name}
          >
            {code.name}
          </h3>

          <p className="text-xs font-mono text-gray-500 truncate mt-0.5 select-all" title={code.value}>
            {code.value}
          </p>
        </div>

        {/* Footer with Date & Ghost Actions */}
        <div className="mt-3.5 pt-3 border-t border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <Calendar className="w-3.5 h-3.5" strokeWidth={1.5} />
            <span>{formattedDate}</span>
          </div>

          {/* Actions appear as ghost icon buttons on hover */}
          <div className="flex items-center gap-0.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
            {/* Print */}
            <button
              type="button"
              onClick={() => navigate(`/print?code_ids=${code.id}`)}
              className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors cursor-pointer"
              title="Print labels"
            >
              <Printer className="w-4 h-4" strokeWidth={1.5} />
            </button>

            {/* Download PNG */}
            <button
              type="button"
              onClick={handleDownload}
              className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors cursor-pointer"
              title="Download PNG"
            >
              <Download className="w-4 h-4" strokeWidth={1.5} />
            </button>

            {/* Edit */}
            <button
              type="button"
              onClick={() => navigate(`/designer/${code.id}`)}
              className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors cursor-pointer"
              title="Edit design"
            >
              <Pencil className="w-4 h-4" strokeWidth={1.5} />
            </button>

            {/* Delete */}
            <button
              type="button"
              onClick={() => onDelete(code)}
              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
              title="Move to Recycle Bin"
            >
              <Trash2 className="w-4 h-4" strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
