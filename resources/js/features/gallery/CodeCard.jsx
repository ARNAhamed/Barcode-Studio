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
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col overflow-hidden group">
      {/* Code Image Preview Container */}
      <div
        onClick={() => navigate(`/designer/${code.id}`)}
        className="w-full h-44 bg-slate-50 border-b border-slate-100 flex items-center justify-center p-4 cursor-pointer relative group-hover:bg-slate-100/50 transition-colors"
      >
        {code.preview_url ? (
          <img
            src={code.preview_url}
            alt={code.name}
            className="max-h-full max-w-full object-contain filter drop-shadow-xs transition-transform duration-200 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-slate-300">
            {code.type === 'barcode' ? (
              <BarcodeIcon className="w-12 h-12" />
            ) : (
              <QrCodeIcon className="w-12 h-12" />
            )}
            <span className="text-xs text-slate-400 mt-1">Preview not available</span>
          </div>
        )}

        {/* Format Badge Overlay */}
        <div className="absolute top-3 right-3">
          <span className="px-2.5 py-1 rounded-lg text-[11px] font-mono font-semibold bg-white/95 text-slate-700 shadow-xs border border-slate-200/80 uppercase">
            {code.format}
          </span>
        </div>
      </div>

      {/* Card Details */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge
              variant={code.type === 'barcode' ? 'primary' : 'accent'}
              size="sm"
            >
              {code.type === 'barcode' ? 'Barcode' : 'QR Code'}
            </Badge>

            {code.product && (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full line-clamp-1">
                <Package className="w-3 h-3 text-slate-400 shrink-0" />
                <span className="truncate max-w-[120px]">{code.product.name}</span>
              </span>
            )}
          </div>

          <h3
            onClick={() => navigate(`/designer/${code.id}`)}
            className="text-base font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1 cursor-pointer"
            title={code.name}
          >
            {code.name}
          </h3>

          <p className="text-xs font-mono text-slate-400 truncate mt-1 select-all" title={code.value}>
            {code.value}
          </p>
        </div>

        {/* Footer with Date & Actions */}
        <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Calendar className="w-3.5 h-3.5" />
            <span>{formattedDate}</span>
          </div>

          <div className="flex items-center gap-1">
            {/* Print */}
            <button
              type="button"
              onClick={() => navigate(`/print?code_ids=${code.id}`)}
              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
              title="Print label sheet"
            >
              <Printer className="w-4 h-4" />
            </button>

            {/* Download PNG */}
            <button
              type="button"
              onClick={handleDownload}
              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
              title="Download PNG"
            >
              <Download className="w-4 h-4" />
            </button>

            {/* Edit */}
            <button
              type="button"
              onClick={() => navigate(`/designer/${code.id}`)}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              title="Edit in Designer"
            >
              <Pencil className="w-4 h-4" />
            </button>

            {/* Delete */}
            <button
              type="button"
              onClick={() => onDelete(code)}
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
              title="Delete code"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
