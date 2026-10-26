import React, { useEffect, useRef, useState } from 'react';
import JsBarcode from 'jsbarcode';
import QRCodeStyling from 'qr-code-styling';
import { Download, Save, RotateCcw, AlertTriangle, FileCode } from 'lucide-react';
import Button from '../../components/Button';
import { DPIS, toPx, formatOutputDimensions } from '../../utils/units';

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
  dpi = 300,
  onDpiChange,
  onCalculatedModuleWidth,
}) {
  const barcodeSvgRef = useRef(null);
  const qrContainerRef = useRef(null);
  const [renderError, setRenderError] = useState(null);

  // Compute screen pixel dimensions based on unit and sizing
  const currentUnit = settings.unit || 'px';
  const widthPx = type === 'barcode'
    ? toPx(settings.width || 260, currentUnit)
    : toPx(settings.size || 220, currentUnit);
  const heightPx = type === 'barcode'
    ? toPx(settings.height || 100, currentUnit)
    : toPx(settings.size || 220, currentUnit);

  // Render Barcode with automatic module width calculation
  useEffect(() => {
    if (type !== 'barcode') return;
    if (!isValid || !value.trim()) {
      setRenderError(null);
      if (onCalculatedModuleWidth) onCalculatedModuleWidth(null);
      return;
    }

    try {
      if (barcodeSvgRef.current) {
        // Measure base module count using a hidden test element
        const testSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        JsBarcode(testSvg, value.trim(), {
          format: settings.format || 'CODE128',
          width: 1,
          margin: 0,
          displayValue: false,
        });

        const naturalModuleCount = parseFloat(testSvg.getAttribute('width')) || 100;
        const marginPx = settings.margin !== undefined ? settings.margin : 10;
        const availableWidth = Math.max(10, widthPx - (2 * marginPx));
        const calcModuleWidth = availableWidth / naturalModuleCount;

        if (onCalculatedModuleWidth) {
          onCalculatedModuleWidth(calcModuleWidth);
        }

        // Available height for bars (subtracting margin and text height if displayed)
        const textOffset = settings.displayValue ? (settings.fontSize || 16) + 6 : 0;
        const availableHeight = Math.max(20, heightPx - (2 * marginPx) - textOffset);

        // Render actual SVG
        JsBarcode(barcodeSvgRef.current, value.trim(), {
          format: settings.format || 'CODE128',
          width: Math.max(1, Math.round(calcModuleWidth)),
          height: Math.round(availableHeight),
          displayValue: settings.displayValue ?? true,
          fontSize: settings.fontSize || 16,
          lineColor: settings.lineColor || '#000000',
          background: settings.background || '#ffffff',
          margin: marginPx,
          font: 'monospace',
          valid: (valid) => {
            if (!valid) {
              setRenderError(`Value is invalid for ${settings.format || 'selected format'}`);
            } else {
              setRenderError(null);
            }
          },
        });

        // Set dimensions and viewBox for precise physical scaling
        const rawW = parseFloat(barcodeSvgRef.current.getAttribute('width')) || widthPx;
        const rawH = parseFloat(barcodeSvgRef.current.getAttribute('height')) || heightPx;
        barcodeSvgRef.current.setAttribute('viewBox', `0 0 ${rawW} ${rawH}`);
        barcodeSvgRef.current.style.width = `${Math.round(widthPx)}px`;
        barcodeSvgRef.current.style.height = `${Math.round(heightPx)}px`;
      }
    } catch (err) {
      setRenderError(err.message || 'Error rendering barcode.');
      if (onCalculatedModuleWidth) onCalculatedModuleWidth(null);
    }
  }, [type, format, value, settings, isValid, widthPx, heightPx]);

  // Render QR Code
  useEffect(() => {
    if (type !== 'qr') return;
    if (!isValid || !value.trim() || !qrContainerRef.current) return;

    try {
      setRenderError(null);
      const displaySize = Math.min(340, Math.max(160, Math.round(widthPx)));

      const qrCode = new QRCodeStyling({
        width: displaySize,
        height: displaySize,
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
  }, [type, value, settings, isValid, widthPx]);

  const activeError = validationError || renderError;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 lg:sticky lg:top-8 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <div>
          <h2 className="font-semibold text-slate-900">Live Preview</h2>
          <p className="text-xs text-slate-400 mt-0.5">Real-time render at target dimensions</p>
        </div>
        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold uppercase tracking-wider bg-indigo-50 text-indigo-700">
          {type === 'barcode' ? settings.format : 'QR CODE'}
        </span>
      </div>

      {/* Code Render Area */}
      <div className="my-5 overflow-auto flex items-center justify-center">
        <div
          ref={captureRef}
          style={{ backgroundColor: settings.background || '#ffffff' }}
          className="p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col items-center justify-center transition-colors max-w-full"
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
            <div className="text-center text-slate-400 text-xs py-10">
              Enter content or choose a product to see the live preview.
            </div>
          ) : type === 'barcode' ? (
            <div className="flex flex-col items-center">
              <svg ref={barcodeSvgRef} className="max-w-full h-auto block" />
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

      {/* Output Dimensions & DPI Badge */}
      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 text-center mb-4">
        <p className="text-xs font-semibold text-slate-700">
          Output:{' '}
          <span className="font-mono text-indigo-600">
            {formatOutputDimensions({
              widthPx,
              heightPx,
              unit: currentUnit,
              dpi,
            })}
          </span>
        </p>
      </div>

      {/* Export DPI Selector */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
        <div>
          <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
            Export DPI
          </span>
          <p className="text-[11px] text-slate-400">High-res print resolution</p>
        </div>
        <div className="inline-flex p-0.5 bg-slate-200 rounded-lg">
          {DPIS.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => onDpiChange(d)}
              className={`px-2 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                dpi === d
                  ? 'bg-white text-indigo-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-3">
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
            onClick={() => onDownloadPng(dpi)}
          >
            PNG ({dpi} DPI)
          </Button>

          {type === 'barcode' ? (
            <Button
              variant="outline"
              icon={FileCode}
              disabled={!isValid || Boolean(activeError)}
              onClick={() =>
                onDownloadSvg(
                  barcodeSvgRef.current,
                  settings.width,
                  settings.height,
                  currentUnit
                )
              }
            >
              SVG ({currentUnit})
            </Button>
          ) : (
            <Button variant="secondary" icon={RotateCcw} onClick={onReset}>
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
