import React, { useEffect, useRef, useState, useMemo } from 'react';
import JsBarcode from 'jsbarcode';
import QRCodeStyling from 'qr-code-styling';
import {
  Download,
  Save,
  RotateCcw,
  AlertTriangle,
  FileCode,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Move,
} from 'lucide-react';
import Button from '../../components/Button';
import { DPIS, toPx, fromPx, formatOutputDimensions } from '../../utils/units';

export default function PreviewPanel({
  type,
  format,
  value,
  settings,
  artboardSettings,
  onArtboardChange,
  isValid,
  validationError,
  captureRef, // Main capture target (artboard or code based on settings)
  codeCaptureRef, // Code-only container ref
  barcodeSvgRef, // Exposed barcode SVG ref for SVG download
  onSave,
  onDownloadPng,
  onDownloadSvg,
  onReset,
  isSaving,
  dpi = 300,
  onDpiChange,
  onCalculatedModuleWidth,
  onWarningsUpdate,
}) {
  const localBarcodeSvgRef = useRef(null);
  const activeBarcodeRef = barcodeSvgRef || localBarcodeSvgRef;
  const qrContainerRef = useRef(null);
  const workspaceRef = useRef(null);
  const artboardContainerRef = useRef(null);

  const [renderError, setRenderError] = useState(null);
  const [workspaceSize, setWorkspaceSize] = useState({ width: 400, height: 350 });

  // Zoom controls: 'fit' | '50' | '100' | '200' | 'manual'
  const [zoomMode, setZoomMode] = useState('fit');
  const [manualZoom, setManualZoom] = useState(1.0);

  // Drag state for interactive code placement inside artboard
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, startOffsetX: 0, startOffsetY: 0 });

  // Measure workspace size with ResizeObserver
  useEffect(() => {
    if (!workspaceRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0 && entry.contentRect.height > 0) {
          setWorkspaceSize({
            width: entry.contentRect.width,
            height: entry.contentRect.height,
          });
        }
      }
    });
    observer.observe(workspaceRef.current);
    return () => observer.disconnect();
  }, []);

  // Compute Raw Code Pixel Dimensions (at 96 DPI screen baseline)
  const codeUnit = settings.unit || 'px';
  const codeRawPxWidth = type === 'barcode'
    ? toPx(settings.width || 260, codeUnit)
    : toPx(settings.size || 220, codeUnit);
  const codeRawPxHeight = type === 'barcode'
    ? toPx(settings.height || 100, codeUnit)
    : toPx(settings.size || 220, codeUnit);

  // Artboard Dimensions
  const isAuto = !artboardSettings || artboardSettings.preset === 'auto';
  const artboardUnit = artboardSettings?.unit || 'mm';
  const artboardPxWidth = isAuto
    ? codeRawPxWidth
    : toPx(artboardSettings.width || 100, artboardUnit);
  const artboardPxHeight = isAuto
    ? codeRawPxHeight
    : toPx(artboardSettings.height || 50, artboardUnit);

  // Padding on Artboard
  const paddingPx = isAuto ? 0 : toPx(artboardSettings.padding !== undefined ? artboardSettings.padding : 5, artboardUnit);
  const availWidth = Math.max(10, artboardPxWidth - (2 * paddingPx));
  const availHeight = Math.max(10, artboardPxHeight - (2 * paddingPx));

  // Fit Scale Calculation
  const fitMode = artboardSettings?.fit || 'original';
  const fitScale = useMemo(() => {
    if (isAuto || fitMode === 'original') return 1;
    if (fitMode === 'fill-width') {
      return availWidth / codeRawPxWidth;
    }
    if (fitMode === 'fit') {
      return Math.min(availWidth / codeRawPxWidth, availHeight / codeRawPxHeight);
    }
    return 1;
  }, [isAuto, fitMode, availWidth, availHeight, codeRawPxWidth, codeRawPxHeight]);

  // Scaled Code Dimensions
  const scaledCodeW = codeRawPxWidth * fitScale;
  const scaledCodeH = codeRawPxHeight * fitScale;

  // Base Alignment Position (relative to artboard)
  const alignment = artboardSettings?.alignment || 'center';
  const basePos = useMemo(() => {
    if (isAuto) return { x: 0, y: 0 };

    let x = (artboardPxWidth - scaledCodeW) / 2;
    let y = (artboardPxHeight - scaledCodeH) / 2;

    if (alignment.includes('left')) x = paddingPx;
    if (alignment.includes('right')) x = artboardPxWidth - paddingPx - scaledCodeW;

    if (alignment.startsWith('top')) y = paddingPx;
    if (alignment.startsWith('bottom')) y = artboardPxHeight - paddingPx - scaledCodeH;

    return { x, y };
  }, [isAuto, alignment, artboardPxWidth, artboardPxHeight, scaledCodeW, scaledCodeH, paddingPx]);

  // Code Position with Offsets
  const codeX = Math.round(basePos.x + (artboardSettings?.xOffset || 0));
  const codeY = Math.round(basePos.y + (artboardSettings?.yOffset || 0));

  // Zoom Scale Calculation
  const effectiveZoom = useMemo(() => {
    if (zoomMode === 'fit') {
      const padding = 32;
      const targetW = Math.max(40, artboardPxWidth);
      const targetH = Math.max(40, artboardPxHeight);
      const scaleX = (workspaceSize.width - padding) / targetW;
      const scaleY = (workspaceSize.height - padding) / targetH;
      const fit = Math.min(scaleX, scaleY, 1.25);
      return Math.max(0.15, fit);
    }
    if (zoomMode === '50') return 0.5;
    if (zoomMode === '100') return 1.0;
    if (zoomMode === '200') return 2.0;
    return manualZoom;
  }, [zoomMode, manualZoom, artboardPxWidth, artboardPxHeight, workspaceSize]);

  // Render Barcode
  useEffect(() => {
    if (type !== 'barcode') return;
    if (!isValid || !value.trim()) {
      setRenderError(null);
      if (onCalculatedModuleWidth) onCalculatedModuleWidth(null);
      return;
    }

    try {
      if (activeBarcodeRef.current) {
        // Measure base module count
        const testSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        JsBarcode(testSvg, value.trim(), {
          format: settings.format || 'CODE128',
          width: 1,
          margin: 0,
          displayValue: false,
        });

        const naturalModuleCount = parseFloat(testSvg.getAttribute('width')) || 100;
        const marginPx = settings.margin !== undefined ? settings.margin : 10;
        const availableWidth = Math.max(10, codeRawPxWidth - (2 * marginPx));
        const calcModuleWidth = availableWidth / naturalModuleCount;

        if (onCalculatedModuleWidth) {
          onCalculatedModuleWidth(calcModuleWidth);
        }

        // Available height for bars
        const textOffset = settings.displayValue ? (settings.fontSize || 16) + 6 : 0;
        const availableHeight = Math.max(20, codeRawPxHeight - (2 * marginPx) - textOffset);

        JsBarcode(activeBarcodeRef.current, value.trim(), {
          format: settings.format || 'CODE128',
          width: Math.max(1, Math.round(calcModuleWidth)),
          height: Math.round(availableHeight),
          displayValue: settings.displayValue ?? true,
          fontSize: settings.fontSize || 16,
          lineColor: settings.lineColor || '#000000',
          background: isAuto ? (settings.background || '#ffffff') : 'transparent',
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
        const rawW = parseFloat(activeBarcodeRef.current.getAttribute('width')) || codeRawPxWidth;
        const rawH = parseFloat(activeBarcodeRef.current.getAttribute('height')) || codeRawPxHeight;
        activeBarcodeRef.current.setAttribute('viewBox', `0 0 ${rawW} ${rawH}`);
        activeBarcodeRef.current.style.width = `${Math.round(codeRawPxWidth)}px`;
        activeBarcodeRef.current.style.height = `${Math.round(codeRawPxHeight)}px`;
      }
    } catch (err) {
      setRenderError(err.message || 'Error rendering barcode.');
      if (onCalculatedModuleWidth) onCalculatedModuleWidth(null);
    }
  }, [type, format, value, settings, isValid, codeRawPxWidth, codeRawPxHeight, isAuto]);

  // Render QR Code
  useEffect(() => {
    if (type !== 'qr') return;
    if (!isValid || !value.trim() || !qrContainerRef.current) return;

    try {
      setRenderError(null);
      const displaySize = Math.max(80, Math.round(codeRawPxWidth));

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
          color: isAuto ? (settings.background || '#ffffff') : 'transparent',
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
  }, [type, value, settings, isValid, codeRawPxWidth, isAuto]);

  // Report Warnings (Scannability & Artboard Bounds)
  useEffect(() => {
    if (!onWarningsUpdate) return;

    let scannability = null;
    let bounds = null;

    if (!isAuto) {
      if (scaledCodeW > artboardPxWidth || scaledCodeH > artboardPxHeight) {
        bounds = `The code (${Math.round(scaledCodeW)}×${Math.round(scaledCodeH)}px) exceeds the artboard (${Math.round(artboardPxWidth)}×${Math.round(artboardPxHeight)}px). Choose "Fit to artboard" or increase canvas size.`;
      }

      if (type === 'barcode' && fitScale < 0.6) {
        scannability = `Barcode scaled down to ${(fitScale * 100).toFixed(0)}%. Bars may be too thin (< 1px) to scan reliably.`;
      }
    }

    onWarningsUpdate({ scannabilityWarning: scannability, codeExceedsWarning: bounds });
  }, [isAuto, scaledCodeW, scaledCodeH, artboardPxWidth, artboardPxHeight, type, fitScale, onWarningsUpdate]);

  // Interactive Dragging Handlers
  const handlePointerDown = (e) => {
    if (isAuto) return;
    e.preventDefault();
    e.stopPropagation();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch (err) {
      // Ignore if pointer capture fails
    }
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      startOffsetX: artboardSettings?.xOffset || 0,
      startOffsetY: artboardSettings?.yOffset || 0,
    };
  };

  const handlePointerMove = (e) => {
    if (!isDragging || isAuto) return;
    const deltaClientX = e.clientX - dragStartRef.current.x;
    const deltaClientY = e.clientY - dragStartRef.current.y;

    const deltaX = deltaClientX / effectiveZoom;
    const deltaY = deltaClientY / effectiveZoom;

    const desiredX = basePos.x + dragStartRef.current.startOffsetX + deltaX;
    const desiredY = basePos.y + dragStartRef.current.startOffsetY + deltaY;

    // Constrain inside artboard
    const maxX = Math.max(0, artboardPxWidth - scaledCodeW);
    const maxY = Math.max(0, artboardPxHeight - scaledCodeH);

    const clampedX = Math.max(0, Math.min(desiredX, maxX));
    const clampedY = Math.max(0, Math.min(desiredY, maxY));

    const newOffsetX = clampedX - basePos.x;
    const newOffsetY = clampedY - basePos.y;

    if (onArtboardChange) {
      onArtboardChange({
        ...artboardSettings,
        xOffset: Math.round(newOffsetX),
        yOffset: Math.round(newOffsetY),
      });
    }
  };

  const handlePointerUp = (e) => {
    if (!isDragging) return;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch (err) {
      // Ignore
    }
    setIsDragging(false);
  };

  const activeError = validationError || renderError;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 sm:p-5 flex flex-col w-full">
      {/* Header & Zoom Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-slate-900 text-sm sm:text-base">Live Preview</h2>
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold uppercase tracking-wider bg-indigo-50 text-indigo-700">
              {type === 'barcode' ? settings.format : 'QR CODE'}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {isAuto ? 'Direct code output' : `Artboard: ${artboardSettings?.preset || 'Custom'}`}
          </p>
        </div>

        {/* Zoom Controls Toolbar */}
        <div className="flex items-center gap-1 self-start sm:self-auto bg-slate-100 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setZoomMode('fit')}
            className={`px-2 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              zoomMode === 'fit'
                ? 'bg-white text-indigo-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            title="Fit to preview panel"
          >
            Fit
          </button>
          <button
            type="button"
            onClick={() => {
              setZoomMode('50');
              setManualZoom(0.5);
            }}
            className={`px-2 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              zoomMode === '50'
                ? 'bg-white text-indigo-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            50%
          </button>
          <button
            type="button"
            onClick={() => {
              setZoomMode('100');
              setManualZoom(1.0);
            }}
            className={`px-2 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              zoomMode === '100'
                ? 'bg-white text-indigo-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            100%
          </button>
          <button
            type="button"
            onClick={() => {
              setZoomMode('200');
              setManualZoom(2.0);
            }}
            className={`px-2 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              zoomMode === '200'
                ? 'bg-white text-indigo-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            200%
          </button>

          <div className="h-4 w-px bg-slate-200 mx-0.5" />

          {/* Minus & Plus */}
          <button
            type="button"
            onClick={() => {
              setZoomMode('manual');
              setManualZoom((prev) => Math.max(0.2, parseFloat((prev - 0.1).toFixed(1))));
            }}
            className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 rounded-md transition-colors cursor-pointer"
            title="Zoom out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>

          <span className="text-[11px] font-mono font-medium text-slate-600 px-1 min-w-[36px] text-center">
            {Math.round(effectiveZoom * 100)}%
          </span>

          <button
            type="button"
            onClick={() => {
              setZoomMode('manual');
              setManualZoom((prev) => Math.min(3.0, parseFloat((prev + 0.1).toFixed(1))));
            }}
            className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 rounded-md transition-colors cursor-pointer"
            title="Zoom in"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Neutral Gray Workspace Canvas */}
      <div
        ref={workspaceRef}
        className="my-3 w-full h-[320px] sm:h-[380px] lg:h-[420px] rounded-2xl bg-slate-100/90 border border-slate-200/90 relative overflow-hidden flex items-center justify-center p-4 select-none"
        style={{
          backgroundImage: 'radial-gradient(rgba(148, 163, 184, 0.25) 1px, transparent 1px)',
          backgroundSize: '16px 16px',
        }}
        onWheel={(e) => {
          if (e.ctrlKey) {
            e.preventDefault();
            const delta = e.deltaY < 0 ? 0.1 : -0.1;
            setZoomMode('manual');
            setManualZoom((prev) => Math.min(3.0, Math.max(0.2, parseFloat((prev + delta).toFixed(2)))));
          }
        }}
      >
        {activeError ? (
          <div className="p-6 text-center max-w-xs bg-white/95 rounded-2xl border border-rose-200 shadow-sm">
            <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-500 mx-auto flex items-center justify-center mb-2">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <p className="text-xs font-semibold text-rose-600">Unable to generate preview</p>
            <p className="text-[11px] text-slate-500 mt-1">{activeError}</p>
          </div>
        ) : !value.trim() ? (
          <div className="text-center text-slate-400 text-xs py-8 bg-white/80 px-6 rounded-2xl border border-slate-200/70 shadow-2xs">
            Enter content or pick a product to see the live artboard.
          </div>
        ) : (
          /* Scaled Artboard Stage Container */
          <div
            style={{
              transform: `scale(${effectiveZoom})`,
              transformOrigin: 'center center',
              transition: isDragging ? 'none' : 'transform 0.15s ease-out',
            }}
            className="shrink-0 flex items-center justify-center"
          >
            {/* The Physical Artboard Canvas Element */}
            <div
              ref={captureRef}
              style={{
                width: `${Math.round(artboardPxWidth)}px`,
                height: `${Math.round(artboardPxHeight)}px`,
                backgroundColor: artboardSettings?.background || '#ffffff',
                border: artboardSettings?.border?.enabled
                  ? `${artboardSettings.border.width || 1}px solid ${artboardSettings.border.color || '#cbd5e1'}`
                  : 'none',
                borderRadius: `${artboardSettings?.radius || 0}px`,
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                position: 'relative',
                overflow: 'hidden',
              }}
              className="transition-colors"
            >
              {/* Placed Code Object inside Artboard */}
              <div
                id="artboard-code-object"
                ref={codeCaptureRef}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                style={{
                  position: isAuto ? 'static' : 'absolute',
                  left: isAuto ? 'auto' : `${codeX}px`,
                  top: isAuto ? 'auto' : `${codeY}px`,
                  width: `${Math.round(codeRawPxWidth)}px`,
                  height: `${Math.round(codeRawPxHeight)}px`,
                  transform: isAuto || fitScale === 1 ? 'none' : `scale(${fitScale})`,
                  transformOrigin: 'top left',
                  cursor: isAuto ? 'default' : isDragging ? 'grabbing' : 'grab',
                  touchAction: 'none',
                }}
                className={`flex flex-col items-center justify-center group ${
                  !isAuto ? 'hover:ring-1 hover:ring-indigo-400/60 rounded-md transition-shadow' : ''
                }`}
                title={!isAuto ? 'Click & drag to position code inside artboard' : undefined}
              >
                {type === 'barcode' ? (
                  <div className="flex flex-col items-center max-w-full">
                    <svg ref={activeBarcodeRef} className="max-w-full h-auto block" />
                    {settings.label && (
                      <p className="mt-1 text-xs font-medium text-slate-800 text-center tracking-wide pointer-events-none">
                        {settings.label}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center max-w-full">
                    <div ref={qrContainerRef} className="flex justify-center max-w-full" />
                    {settings.label && (
                      <p className="mt-1.5 text-xs font-medium text-slate-800 text-center tracking-wide pointer-events-none">
                        {settings.label}
                      </p>
                    )}
                  </div>
                )}

                {/* Move Hint Pill on Hover */}
                {!isAuto && (
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none bg-slate-900/80 text-white text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 whitespace-nowrap shadow-xs">
                    <Move className="w-2.5 h-2.5" /> Drag to move
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Output Dimensions Readout Badge */}
      <div id="artboard-dimensions-readout" className="p-2.5 sm:p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-center mb-3">
        {!isAuto ? (
          <div className="space-y-0.5">
            <p className="text-xs font-semibold text-slate-800">
              Artboard:{' '}
              <span className="font-mono text-indigo-600 font-bold">
                {artboardSettings.width} × {artboardSettings.height} {artboardUnit}
              </span>{' '}
              <span className="text-slate-500 font-normal">
                ({Math.round((artboardPxWidth / 96) * dpi)} × {Math.round((artboardPxHeight / 96) * dpi)} px at {dpi} DPI)
              </span>
            </p>
            <p className="text-[11px] text-slate-500 font-mono">
              Code Object: {fromPx(scaledCodeW, artboardUnit, 1)} × {fromPx(scaledCodeH, artboardUnit, 1)} {artboardUnit}{' '}
              ({Math.round((scaledCodeW / 96) * dpi)} × {Math.round((scaledCodeH / 96) * dpi)} px)
            </p>
          </div>
        ) : (
          <p className="text-xs font-semibold text-slate-700">
            Artboard (Auto):{' '}
            <span className="font-mono text-indigo-600">
              {formatOutputDimensions({
                widthPx: codeRawPxWidth,
                heightPx: codeRawPxHeight,
                unit: codeUnit,
                dpi,
              })}
            </span>
          </p>
        )}
      </div>

      {/* Export DPI Selector */}
      <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 mb-3.5">
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
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
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
      <div className="space-y-2.5">
        <Button
          id="save-to-gallery-btn"
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
            id="download-png-btn"
            variant="outline"
            icon={Download}
            disabled={!isValid || Boolean(activeError)}
            onClick={() => onDownloadPng(dpi)}
          >
            PNG ({dpi} DPI)
          </Button>

          <Button
            id="download-svg-btn"
            variant="outline"
            icon={FileCode}
            disabled={!isValid || Boolean(activeError)}
            onClick={onDownloadSvg}
          >
            SVG ({!isAuto ? artboardUnit : codeUnit})
          </Button>
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="w-full text-slate-500"
          icon={RotateCcw}
          onClick={onReset}
        >
          Reset Settings
        </Button>
      </div>
    </div>
  );
}
