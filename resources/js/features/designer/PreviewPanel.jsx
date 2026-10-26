import React, { useEffect, useRef, useState } from 'react';
import JsBarcode from 'jsbarcode';
import QRCodeStyling from 'qr-code-styling';
import { Download, Save, RotateCcw, AlertTriangle, FileCode } from 'lucide-react';
import Button from '../../components/Button';

export default function PreviewPanel({
  type,
  format,
  value,
  settings,
  isValid,
  validationError,
  captureRef,
  onSave,
  onDownloadPng,
  onDownloadSvg,
  onReset,
  isSaving,
}) {
  const barcodeSvgRef = useRef(null);
  const qrContainerRef = useRef(null);
  const [renderError, setRenderError] = useState(null);

  // Render Barcode
  useEffect(() => {
    if (type !== 'barcode') return;
    if (!isValid || !value.trim()) {
      setRenderError(null);
      return;
    }

    try {
      if (barcodeSvgRef.current) {
        JsBarcode(barcodeSvgRef.current, value.trim(), {
          format: settings.format || 'CODE128',
          width: settings.width || 2,
          height: settings.height || 80,
          displayValue: settings.displayValue ?? true,
          fontSize: settings.fontSize || 16,
          lineColor: settings.lineColor || '#000000',
          background: settings.background || '#ffffff',
          margin: settings.margin ?? 10,
          font: 'monospace',
          valid: (valid) => {
            if (!valid) {
              setRenderError(`Value is invalid for ${settings.format || 'selected format'}`);
            } else {
              setRenderError(null);
            }
          },
        });
      }
    } catch (err) {
      setRenderError(err.message || 'Error rendering barcode.');
    }
  }, [type, format, value, settings, isValid]);

  // Render QR Code
  useEffect(() => {
    if (type !== 'qr') return;
    if (!isValid || !value.trim() || !qrContainerRef.current) return;

    try {
      setRenderError(null);
      const qrCode = new QRCodeStyling({
        width: settings.size || 220,
        height: settings.size || 220,
        data: value.trim(),
        image: settings.logo || undefined,
        dotsOptions: {
          color: settings.foreground || '#0F172A',
          type: settings.dotStyle || 'rounded',
        },
        backgroundOptions: {
          color: settings.background || '#ffffff',
        },
        imageOptions: {
          crossOrigin: 'anonymous',
          margin: 6,
          imageSize: 0.32,
        },
        cornersSquareOptions: {
          type: settings.cornerStyle === 'extra-rounded' ? 'extra-rounded' : settings.cornerStyle || 'square',
          color: settings.foreground || '#0F172A',
        },
        cornersDotOptions: {
          type: settings.cornerStyle === 'dot' ? 'dot' : undefined,
          color: settings.foreground || '#0F172A',
        },
        qrOptions: {
          errorCorrectionLevel: settings.errorCorrection || 'Q',
        },
      });

      qrContainerRef.current.innerHTML = '';
      qrCode.append(qrContainerRef.current);
    } catch (err) {
      setRenderError(err.message || 'Error rendering QR code.');
    }
  }, [type, value, settings, isValid]);

  const activeError = validationError || renderError;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 lg:sticky lg:top-8 flex flex-col">
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <div>
          <h2 className="font-semibold text-slate-900">Live Preview</h2>
          <p className="text-xs text-slate-400 mt-0.5">Real-time render of your code</p>
        </div>
        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold uppercase tracking-wider bg-indigo-50 text-indigo-700">
          {type === 'barcode' ? settings.format : 'QR CODE'}
        </span>
      </div>

      {/* Code Render Area */}
      <div className="my-6">
        <div
          ref={captureRef}
          style={{ backgroundColor: settings.background || '#ffffff' }}
          className="w-full min-h-[260px] p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col items-center justify-center transition-colors overflow-hidden"
        >
          {activeError ? (
            <div className="p-6 text-center max-w-xs">
              <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-500 mx-auto flex items-center justify-center mb-2.5">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <p className="text-xs font-semibold text-rose-600">Unable to generate preview</p>
              <p className="text-xs text-slate-500 mt-1">{activeError}</p>
            </div>
          ) : !value.trim() ? (
            <div className="text-center text-slate-400 text-xs">
              Enter content or choose a product to see the live preview.
            </div>
          ) : type === 'barcode' ? (
            <div className="flex flex-col items-center">
              <svg ref={barcodeSvgRef} className="max-w-full h-auto" />
              {settings.label && (
                <p className="mt-2 text-xs font-medium text-slate-800 text-center tracking-wide">
                  {settings.label}
                </p>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <div ref={qrContainerRef} className="flex justify-center" />
              {settings.label && (
                <p className="mt-3 text-xs font-medium text-slate-800 text-center tracking-wide">
                  {settings.label}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-3 pt-2 border-t border-slate-100">
        <Button
          variant="primary"
          size="lg"
          className="w-full"
          icon={Save}
          disabled={!isValid || Boolean(activeError)}
          isLoading={isSaving}
          onClick={onSave}
        >
          Save to Gallery
        </Button>

        <div className="grid grid-cols-2 gap-2.5">
          <Button
            variant="outline"
            icon={Download}
            disabled={!isValid || Boolean(activeError)}
            onClick={onDownloadPng}
          >
            PNG
          </Button>

          {type === 'barcode' ? (
            <Button
              variant="outline"
              icon={FileCode}
              disabled={!isValid || Boolean(activeError)}
              onClick={() => onDownloadSvg(barcodeSvgRef.current)}
            >
              SVG
            </Button>
          ) : (
            <Button
              variant="secondary"
              icon={RotateCcw}
              onClick={onReset}
            >
              Reset
            </Button>
          )}
        </div>

        {type === 'barcode' && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-slate-500"
            icon={RotateCcw}
            onClick={onReset}
          >
            Reset Settings
          </Button>
        )}
      </div>
    </div>
  );
}
