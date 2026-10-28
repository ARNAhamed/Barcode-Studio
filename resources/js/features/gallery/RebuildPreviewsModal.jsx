import React, { useState, useRef } from 'react';
import toast from 'react-hot-toast';
import { RefreshCw, CheckCircle2, AlertTriangle, X } from 'lucide-react';
import Modal from '../../components/Modal';
import Button from '../../components/Button';
import { renderArtboardOffscreen } from '../../utils/artboardRenderer';
import { updateCode } from '../../api/codes';

export default function RebuildPreviewsModal({
  isOpen,
  onClose,
  codes = [],
  onSuccess,
}) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentName, setCurrentName] = useState('');
  const [successCount, setSuccessCount] = useState(0);
  const [failCount, setFailCount] = useState(0);

  const isCancelledRef = useRef(false);

  const handleStart = async () => {
    if (!codes || codes.length === 0) return;

    setIsProcessing(true);
    setCurrentIndex(0);
    setCurrentName('');
    setSuccessCount(0);
    setFailCount(0);
    isCancelledRef.current = false;

    let success = 0;
    let failed = 0;

    for (let i = 0; i < codes.length; i++) {
      if (isCancelledRef.current) {
        break;
      }

      const code = codes[i];
      setCurrentIndex(i + 1);
      setCurrentName(code.name || `Design #${code.id}`);

      try {
        const settings = typeof code.settings === 'string'
          ? JSON.parse(code.settings)
          : (code.settings || {});

        const blob = await renderArtboardOffscreen({
          type: code.type,
          format: code.format,
          value: code.value,
          settings,
          artboardSettings: settings.artboard || {},
          labelText: settings.label || code.label_text || '',
          product: code.product || null,
          pixelRatio: 2,
          formatType: 'blob',
        });

        if (blob) {
          const formData = new FormData();
          formData.append('name', code.name);
          formData.append('type', code.type);
          formData.append('format', code.format);
          formData.append('value', code.value);
          formData.append('settings', JSON.stringify(settings));
          if (code.product_id) formData.append('product_id', code.product_id);
          if (code.template_id) formData.append('template_id', code.template_id);
          formData.append('preview', blob, 'preview.png');

          await updateCode(code.id, formData);
          success++;
          setSuccessCount(success);
        } else {
          failed++;
          setFailCount(failed);
        }
      } catch (err) {
        console.warn(`Failed to rebuild preview for code #${code.id}:`, err);
        failed++;
        setFailCount(failed);
      }
    }

    setIsProcessing(false);
    if (onSuccess) onSuccess();

    if (isCancelledRef.current) {
      toast('Rebuilding previews cancelled.', { icon: '⚠️' });
    } else {
      toast.success(`Successfully rebuilt ${success} preview(s)!`);
      onClose();
    }
  };

  const handleCancel = () => {
    if (isProcessing) {
      isCancelledRef.current = true;
    } else {
      onClose();
    }
  };

  const total = codes.length;
  const progressPct = total > 0 ? Math.round((currentIndex / total) * 100) : 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleCancel}
      title="Rebuild Preview Images"
      description="Regenerate high-resolution, uncropped preview thumbnails for your saved designs using their exact design settings."
      footer={
        <div className="flex items-center justify-end gap-2 w-full">
          {isProcessing ? (
            <Button
              variant="secondary"
              onClick={handleCancel}
            >
              Cancel
            </Button>
          ) : (
            <>
              <Button
                variant="secondary"
                onClick={onClose}
              >
                Close
              </Button>
              <Button
                variant="primary"
                onClick={handleStart}
                icon={RefreshCw}
                disabled={total === 0}
              >
                Start Rebuilding ({total})
              </Button>
            </>
          )}
        </div>
      }
    >
      <div className="space-y-4 py-1 text-sm text-gray-700">
        {!isProcessing && currentIndex === 0 && (
          <div className="p-3.5 bg-gray-50 rounded-lg border border-gray-200 space-y-2">
            <p className="font-medium text-gray-900">
              Ready to rebuild {total} saved design{total === 1 ? '' : 's'}.
            </p>
            <p className="text-xs text-gray-500 leading-relaxed">
              This process renders each design off-screen with full code bars/matrices, custom label colors, typography, and borders at an uncropped 2x pixel ratio, replacing outdated or clipped previews.
            </p>
          </div>
        )}

        {isProcessing && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-medium">
              <span className="text-gray-900 truncate max-w-[280px]">
                Processing: <span className="text-indigo-600">{currentName}</span>
              </span>
              <span className="text-gray-500 font-mono">
                {currentIndex} / {total} ({progressPct}%)
              </span>
            </div>

            {/* Progress bar */}
            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-600 transition-all duration-200 rounded-full"
                style={{ width: `${progressPct}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-xs text-gray-500 pt-1">
              <span>Updated: {successCount}</span>
              {failCount > 0 && <span className="text-amber-600">Skipped: {failCount}</span>}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
