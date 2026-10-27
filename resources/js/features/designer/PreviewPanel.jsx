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

  const [renderError, setRenderError] = useState(null);
  const [workspaceSize, setWorkspaceSize] = useState({ width: 400, height: 350 });

  // Zoom controls: 'fit' | '50' | '100' | '200' | 'manual'
  const [zoomMode, setZoomMode] = useState('fit');
  const [manualZoom, setManualZoom] = useState(1.0);

  // Drag state for interactive code placement inside artboard
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, startOffsetX: 0, startOffsetY: 0 });

  // Panning state for dragging canvas when zoomed
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 });

  // Measure workspace size with ResizeObserver
  useEffect(() => {
    if (!workspaceRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setWorkspaceSize({ width, height });
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

  // Fit Scale Calculation inside artboard
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

  // Scaled Code Dimensions inside artboard
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

  // Canvas Zoom Scale: fits artboard inside canvas in BOTH width and height with small margin
  const effectiveZoom = useMemo(() => {
    if (zoomMode === 'fit') {
      const padding = 24; // margin around artboard
      const availW = Math.max(20, workspaceSize.width - padding);
      const availH = Math.max(20, workspaceSize.height - padding);
      const scaleX = availW / Math.max(20, artboardPxWidth);
      const scaleY = availH / Math.max(20, artboardPxHeight);
      const fit = Math.min(scaleX, scaleY);
      return Math.max(0.1, parseFloat(fit.toFixed(3)));
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
        JsBarcode(activeBarcodeRef.current, value, {
          format: format || settings.format || 'CODE128',
          width: 2,
          height: Math.max(20, Math.round(codeRawPxHeight * 0.7)),
          displayValue: settings.displayValue ?? true,
          font: 'monospace',
          fontSize: settings.fontSize || 16,
          textMargin: 4,
          margin: settings.margin ?? 10,
          background: settings.background || '#ffffff',
          lineColor: settings.lineColor || '#000000',
        });
        setRenderError(null);

        // Calculate module width
        const svgBBox = activeBarcodeRef.current.getBBox?.();
        if (svgBBox && svgBBox.width > 0) {
          const estimatedBars = value.length * 11 + 35;
          const calculatedMw = svgBBox.width / estimatedBars;
          if (onCalculatedModuleWidth) onCalculatedModuleWidth(calculatedMw);
        }
      }
    } catch (err) {
      setRenderError(err.message || 'Invalid barcode content for symbology');
      if (onCalculatedModuleWidth) onCalculatedModuleWidth(null);
    }
  }, [
    type,
    format,
    value,
    settings,
    isValid,
    codeRawPxWidth,
    codeRawPxHeight,
    onCalculatedModuleWidth,
    activeBarcodeRef,
  ]);

  // Render QR Code
  useEffect(() => {
    if (type !== 'qr') return;
    if (!isValid || !value.trim()) {
      setRenderError(null);
      return;
    }

    try {
      if (qrContainerRef.current) {
        qrContainerRef.current.innerHTML = '';
        const qrCode = new QRCodeStyling({
          width: Math.round(codeRawPxWidth),
          height: Math.round(codeRawPxHeight),
          data: value,
          dotsOptions: {
            color: settings.foreground || '#0F172A',
            type: settings.dotStyle || 'rounded',
          },
          cornersSquareOptions: {
            color: settings.foreground || '#0F172A',
            type: settings.cornerStyle || 'extra-rounded',
          },
          backgroundOptions: {
            color: settings.background || '#ffffff',
          },
          imageOptions: {
            crossOrigin: 'anonymous',
            margin: 4,
          },
          image: settings.logo || undefined,
          qrOptions: {
            errorCorrectionLevel: settings.errorCorrection || 'Q',
          },
        });
        qrCode.append(qrContainerRef.current);
        setRenderError(null);
      }
    } catch (err) {
      setRenderError(err.message || 'Invalid QR configuration');
    }
  }, [type, value, settings, isValid, codeRawPxWidth, codeRawPxHeight]);

  // Validation Warnings Effect
  useEffect(() => {
    if (!onWarningsUpdate) return;
    let scannabilityWarning = null;
    let codeExceedsWarning = null;

    if (!isAuto) {
      const codeRight = codeX + scaledCodeW;
      const codeBottom = codeY + scaledCodeH;

      if (codeX < 0 || codeY < 0 || codeRight > artboardPxWidth || codeBottom > artboardPxHeight) {
        codeExceedsWarning = 'Code object boundaries exceed the artboard edge. Some portions may be clipped when printed.';
      }

      const marginDistanceX = Math.min(codeX, artboardPxWidth - codeRight);
      const marginDistanceY = Math.min(codeY, artboardPxHeight - codeBottom);
      if (marginDistanceX < 10 || marginDistanceY < 10) {
        scannabilityWarning = 'Code placed very close to artboard margin (< 2.5 mm). Scanners require a clear quiet zone around the edges.';
      }
    }

    onWarningsUpdate({ scannabilityWarning, codeExceedsWarning });
  }, [isAuto, codeX, codeY, scaledCodeW, scaledCodeH, artboardPxWidth, artboardPxHeight, onWarningsUpdate]);

  // Interactive Drag-to-Position Handlers (Code on Artboard)
  const handlePointerDown = (e) => {
    if (isAuto || !onArtboardChange) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      startOffsetX: artboardSettings?.xOffset || 0,
      startOffsetY: artboardSettings?.yOffset || 0,
    };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e) => {
    if (!isDragging || isAuto || !onArtboardChange) return;
    const dx = (e.clientX - dragStartRef.current.x) / effectiveZoom;
    const dy = (e.clientY - dragStartRef.current.y) / effectiveZoom;

    onArtboardChange((prev) => ({
      ...prev,
      xOffset: Math.round(dragStartRef.current.startOffsetX + dx),
      yOffset: Math.round(dragStartRef.current.startOffsetY + dy),
    }));
  };

  const handlePointerUp = (e) => {
    if (!isDragging) return;
    e.currentTarget.releasePointerCapture?.(e.pointerId);
    setIsDragging(false);
  };

  // Canvas Panning Handlers (when zoomed bigger than canvas)
  const handleCanvasPointerDown = (e) => {
    if (e.target.closest('#artboard-code-object')) return;
    if (!workspaceRef.current) return;
    isPanningRef.current = true;
    panStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      scrollLeft: workspaceRef.current.scrollLeft,
      scrollTop: workspaceRef.current.scrollTop,
    };
    workspaceRef.current.setPointerCapture?.(e.pointerId);
  };

  const handleCanvasPointerMove = (e) => {
    if (!isPanningRef.current || !workspaceRef.current) return;
    const dx = e.clientX - panStartRef.current.x;
    const dy = e.clientY - panStartRef.current.y;
    workspaceRef.current.scrollLeft = panStartRef.current.scrollLeft - dx;
    workspaceRef.current.scrollTop = panStartRef.current.scrollTop - dy;
  };

  const handleCanvasPointerUp = (e) => {
    if (!isPanningRef.current) return;
    workspaceRef.current?.releasePointerCapture?.(e.pointerId);
    isPanningRef.current = false;
  };

  const activeError = validationError || renderError;

  return (
    <div className="bg-white rounded-lg border border-gray-200 flex flex-col w-full h-full min-w-0 overflow-hidden">
      {/* 1. Header Bar (shrink-0): Two-Part Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 sm:px-4 py-2 border-b border-gray-100 min-w-0 shrink-0 bg-white">
        {/* Left: Title + Format Badge on one line */}
        <div className="flex items-center gap-2 min-w-0 whitespace-nowrap">
          <h2 className="font-semibold text-gray-900 text-sm whitespace-nowrap">Live Preview</h2>
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-mono font-medium bg-gray-100 text-gray-700 uppercase">
            {type === 'barcode' ? (settings.format || 'CODE128') : 'QR CODE'}
          </span>
        </div>

        {/* Right: Compact Zoom Controls (Fit, 50%, 100%, 200%, -, %, +) */}
        <div className="flex items-center gap-0.5 bg-gray-100 p-0.5 rounded-lg border border-gray-200 min-w-0">
          <div className="inline-flex items-center">
            {['fit', '50', '100', '200'].map((mode) => {
              const isSelected = zoomMode === mode;
              return (
                <button
                  key={mode}
                  type="button"
                  onClick={() => {
                    setZoomMode(mode);
                    if (mode !== 'fit') setManualZoom(parseFloat(mode) / 100);
                  }}
                  className={`px-1.5 sm:px-2 py-0.5 text-xs rounded transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-white text-indigo-600 font-semibold shadow-xs'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {mode === 'fit' ? 'Fit' : `${mode}%`}
                </button>
              );
            })}
          </div>

          <div className="h-3 w-px bg-gray-300 mx-0.5 shrink-0" />

          {/* Minus icon */}
          <button
            type="button"
            onClick={() => {
              setZoomMode('manual');
              setManualZoom((prev) => Math.max(0.2, parseFloat((prev - 0.1).toFixed(1))));
            }}
            className="p-1 text-gray-500 hover:text-gray-800 rounded transition-colors cursor-pointer shrink-0"
            title="Zoom out"
            aria-label="Zoom out"
          >
            <ZoomOut className="w-3.5 h-3.5 stroke-[1.5]" />
          </button>

          {/* Real Zoom % */}
          <span className="text-[11px] font-mono text-gray-600 px-1 text-center whitespace-nowrap min-w-[34px] shrink-0">
            {Math.round(effectiveZoom * 100)}%
          </span>

          {/* Plus icon */}
          <button
            type="button"
            onClick={() => {
              setZoomMode('manual');
              setManualZoom((prev) => Math.min(3.0, parseFloat((prev + 0.1).toFixed(1))));
            }}
            className="p-1 text-gray-500 hover:text-gray-800 rounded transition-colors cursor-pointer shrink-0"
            title="Zoom in"
            aria-label="Zoom in"
          >
            <ZoomIn className="w-3.5 h-3.5 stroke-[1.5]" />
          </button>
        </div>
      </div>

      {/* 2. Preview Canvas Area: flex-1, min-h-0, overflow-auto, centered content, no panel scrollbar */}
      <div
        ref={workspaceRef}
        onPointerDown={handleCanvasPointerDown}
        onPointerMove={handleCanvasPointerMove}
        onPointerUp={handleCanvasPointerUp}
        onPointerCancel={handleCanvasPointerUp}
        className="flex-1 min-h-0 w-full bg-[#F4F4F5] relative overflow-auto p-3 select-none flex items-center justify-center [scrollbar-width:thin]"
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
          <div className="p-4 text-center max-w-xs bg-white rounded-lg border border-red-200">
            <AlertTriangle className="w-5 h-5 text-red-500 mx-auto mb-1.5" strokeWidth={1.5} />
            <p className="text-xs font-semibold text-red-600">Unable to generate preview</p>
            <p className="text-xs text-gray-500 mt-1">{activeError}</p>
          </div>
        ) : !value.trim() ? (
          <div className="text-center text-gray-400 text-xs py-6 bg-white px-4 rounded-lg border border-gray-200">
            Enter content or pick a product to see the live artboard.
          </div>
        ) : (
          /* Scaled Artboard Stage Container: sized precisely to scaled pixels so DOM flow never overflows in Fit */
          <div
            style={{
              width: `${Math.round(artboardPxWidth * effectiveZoom)}px`,
              height: `${Math.round(artboardPxHeight * effectiveZoom)}px`,
            }}
            className="relative shrink-0 select-none m-auto"
          >
            {/* The Physical Artboard Canvas Element */}
            <div
              ref={captureRef}
              style={{
                width: `${Math.round(artboardPxWidth)}px`,
                height: `${Math.round(artboardPxHeight)}px`,
                transform: `scale(${effectiveZoom})`,
                transformOrigin: 'top left',
                backgroundColor: artboardSettings?.background || '#ffffff',
                border: artboardSettings?.border?.enabled
                  ? `${artboardSettings.border.width || 1}px solid ${artboardSettings.border.color || '#D1D5DB'}`
                  : '1px solid #E5E7EB',
                borderRadius: `${artboardSettings?.radius || 0}px`,
                boxShadow: 'none',
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
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none bg-gray-900 text-white text-[10px] px-2 py-0.5 rounded flex items-center gap-1 whitespace-nowrap">
                    <Move className="w-2.5 h-2.5" /> Drag to move
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. Compact Fixed Footer (shrink-0): Info line + DPI picker + Action Buttons */}
      <div className="shrink-0 border-t border-gray-200 bg-white p-2.5 sm:p-3 space-y-2">
        {/* Row 1: Info Line & DPI Selector */}
        <div className="flex flex-wrap items-center justify-between gap-1 text-[11px] leading-tight">
          <div id="artboard-dimensions-readout" className="text-gray-600 min-w-0 truncate">
            {!isAuto ? (
              <span>
                Artboard:{' '}
                <strong className="text-gray-900 font-mono">
                  {artboardSettings.width} × {artboardSettings.height} {artboardUnit}
                </strong>{' '}
                <span className="text-gray-400">
                  ({Math.round((artboardPxWidth / 96) * dpi)} × {Math.round((artboardPxHeight / 96) * dpi)} px)
                </span>
              </span>
            ) : (
              <span>
                Artboard (Auto):{' '}
                <strong className="text-gray-900 font-mono">
                  {formatOutputDimensions({
                    widthPx: codeRawPxWidth,
                    heightPx: codeRawPxHeight,
                    unit: codeUnit,
                    dpi,
                  })}
                </strong>
              </span>
            )}
          </div>

          {/* Compact DPI Picker */}
          <div className="flex items-center gap-1 shrink-0 text-[11px]">
            <span className="text-gray-400">DPI:</span>
            <div className="inline-flex p-0.5 bg-gray-100 rounded border border-gray-200">
              {DPIS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => onDpiChange(d)}
                  className={`px-1.5 py-0.5 text-[10px] font-medium rounded transition-colors cursor-pointer ${
                    dpi === d
                      ? 'bg-white text-indigo-600 font-semibold shadow-xs'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Row 2: Action Buttons (flex-wrap with gap-1.5, never clipped) */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <Button
            id="save-to-gallery-btn"
            variant="primary"
            size="sm"
            className="flex-1 min-w-[120px] h-8.5 text-xs"
            icon={Save}
            disabled={!isValid || Boolean(activeError)}
            isLoading={isSaving}
            onClick={onSave}
          >
            Save to Gallery
          </Button>

          <Button
            id="download-png-btn"
            variant="secondary"
            size="sm"
            className="h-8.5 px-2.5 text-xs whitespace-nowrap"
            icon={Download}
            disabled={!isValid || Boolean(activeError)}
            onClick={() => onDownloadPng(dpi)}
          >
            PNG ({dpi})
          </Button>

          <Button
            id="download-svg-btn"
            variant="secondary"
            size="sm"
            className="h-8.5 px-2.5 text-xs whitespace-nowrap"
            icon={FileCode}
            disabled={!isValid || Boolean(activeError)}
            onClick={onDownloadSvg}
          >
            SVG
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="h-8.5 px-2 text-xs text-gray-500 hover:text-gray-700"
            icon={RotateCcw}
            onClick={onReset}
            title="Reset Settings"
          >
            <span className="hidden sm:inline">Reset</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
