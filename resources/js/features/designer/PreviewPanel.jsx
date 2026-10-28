import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import JsBarcode from 'jsbarcode';
import QRCodeStyling from 'qr-code-styling';
import {
  Download,
  Save,
  RotateCcw,
  Copy,
  MoreVertical,
  Check,
  AlertTriangle,
  ZoomIn,
  ZoomOut,
  Sparkles,
  Move,
  ChevronDown,
} from 'lucide-react';
import Button from '../../components/Button';
import { DPIS, toPx, fromPx } from '../../utils/units';
import { fillPlaceholders, hasPlaceholders } from '../../utils/placeholders';

const SAMPLE_PRODUCT = {
  name: 'Wireless Headphones',
  sku: 'AUD-WNC-001',
  price: '89.00',
  category: 'Audio',
  barcode_number: '9312345678907',
  quantity: '42',
  supplier: {
    name: 'Apex Audio Co.',
    contact_person: 'John Doe',
    mobile: '+61 400 123 456',
    phone: '(03) 9000 1122',
    email: 'orders@apexaudio.com',
    city: 'Melbourne',
  },
};

const ZOOM_STEPS = [0.25, 0.50, 0.75, 1.00, 1.50, 2.00, 3.00, 4.00];

export default function PreviewPanel({
  type = 'barcode',
  format = 'CODE128',
  value = '',
  onChangeValue,
  settings = {},
  artboardSettings = {},
  onArtboardChange,
  isValid = true,
  validationError = null,
  validationResult = null,
  selectedProduct = null,
  captureRef,
  codeCaptureRef,
  barcodeSvgRef,
  onSave,
  onDownloadPng,
  onDownloadSvg,
  onReset,
  onDuplicate,
  onAutoFixCheckDigit,
  onGenerateValidNumber,
  onEditLabel,
  isSaving = false,
  isModified = false,
  dpi = 300,
  onDpiChange,
  onCalculatedModuleWidth,
  onWarningsUpdate,
}) {
  const localBarcodeSvgRef = useRef(null);
  const sampleBarcodeSvgRef = useRef(null);
  const activeBarcodeRef = barcodeSvgRef || localBarcodeSvgRef;
  const qrContainerRef = useRef(null);
  const sampleQrContainerRef = useRef(null);
  const workspaceRef = useRef(null);

  const [renderError, setRenderError] = useState(null);
  const [workspaceSize, setWorkspaceSize] = useState({ width: 400, height: 350 });

  // Zoom state: 'fit' | 'manual'
  const [zoomMode, setZoomMode] = useState('fit');
  const [manualZoom, setManualZoom] = useState(1.0);
  const [isZoomDropdownOpen, setIsZoomDropdownOpen] = useState(false);
  const zoomDropdownRef = useRef(null);

  // Drag state for interactive code placement inside artboard
  const [isDraggingCode, setIsDraggingCode] = useState(false);
  const codeDragStartRef = useRef({ x: 0, y: 0, startOffsetX: 0, startOffsetY: 0 });

  // Panning state for dragging canvas when zoomed
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 });

  // Touch pinch-to-zoom tracking
  const touchDistanceRef = useRef(null);

  // Popover menus state
  const [isDownloadMenuOpen, setIsDownloadMenuOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const downloadMenuRef = useRef(null);
  const moreMenuRef = useRef(null);

  // Close menus on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (downloadMenuRef.current && !downloadMenuRef.current.contains(e.target)) {
        setIsDownloadMenuOpen(false);
      }
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target)) {
        setIsMoreMenuOpen(false);
      }
      if (zoomDropdownRef.current && !zoomDropdownRef.current.contains(e.target)) {
        setIsZoomDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

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

  // Resolved Label Text for live canvas rendering and export
  const isPatternUnlinked = !selectedProduct && hasPlaceholders(settings.label);
  const resolvedLabelText = useMemo(() => {
    if (!settings.label) return '';
    if (selectedProduct) {
      return fillPlaceholders(settings.label, selectedProduct);
    }
    if (hasPlaceholders(settings.label)) {
      return fillPlaceholders(settings.label, SAMPLE_PRODUCT);
    }
    return settings.label;
  }, [settings.label, selectedProduct]);

  // Compute Raw Code Pixel Dimensions
  const codeUnit = settings.unit || 'px';
  const codeRawPxWidth = type === 'barcode'
    ? toPx(settings.width || 45, codeUnit)
    : toPx(settings.size || 25, codeUnit);
  const codeRawPxHeight = type === 'barcode'
    ? toPx(settings.height || 15, codeUnit)
    : toPx(settings.size || 25, codeUnit);

  // Label Text & Unified Object Dimensions
  const hasLabel = Boolean(resolvedLabelText && resolvedLabelText.trim());
  const labelFontUnit = settings.labelFontUnit || 'pt';
  const labelFontSize = Number(settings.labelFontSize || (labelFontUnit === 'pt' ? 11 : 14));
  const labelFontSizePx = labelFontUnit === 'pt' ? (labelFontSize * 96) / 72 : labelFontSize;
  const labelGapPx = hasLabel ? Math.max(0, Number(settings.labelGap !== undefined ? settings.labelGap : 4)) : 0;
  const labelWeight = settings.labelWeight || 'normal';
  const labelAlign = settings.labelAlign || 'center';

  // Multi-line estimation
  const estimatedCharWidth = labelFontSizePx * 0.55;
  const explicitLines = hasLabel ? resolvedLabelText.split('\n') : [];
  let totalLabelLines = 0;
  explicitLines.forEach((line) => {
    const lineW = line.trim().length * estimatedCharWidth;
    const wrapped = lineW > codeRawPxWidth ? Math.ceil(lineW / Math.max(80, codeRawPxWidth)) : 1;
    totalLabelLines += wrapped;
  });
  totalLabelLines = Math.max(explicitLines.length, totalLabelLines);
  const labelPxHeight = hasLabel ? Math.round(labelFontSizePx * 1.35 * totalLabelLines) : 0;

  // Total raw dimensions
  const totalRawPxWidth = codeRawPxWidth;
  const totalRawPxHeight = codeRawPxHeight + (hasLabel ? labelGapPx + labelPxHeight : 0);

  // Artboard Dimensions
  const isAuto = !artboardSettings || artboardSettings.preset === 'auto';
  const artboardUnit = artboardSettings?.unit || 'mm';
  const artboardPxWidth = isAuto
    ? totalRawPxWidth
    : toPx(artboardSettings.width || 60, artboardUnit);
  const artboardPxHeight = isAuto
    ? totalRawPxHeight
    : toPx(artboardSettings.height || 40, artboardUnit);

  // Padding
  const paddingPx = isAuto ? 0 : toPx(artboardSettings.padding !== undefined ? artboardSettings.padding : 5, artboardUnit);
  const availWidth = Math.max(10, artboardPxWidth - (2 * paddingPx));
  const availHeight = Math.max(10, artboardPxHeight - (2 * paddingPx));

  // Fit Scale Calculation inside Artboard
  const fitMode = artboardSettings?.fit || 'original';
  const fitScale = useMemo(() => {
    if (isAuto || fitMode === 'original') return 1;
    if (fitMode === 'fill-width') {
      return availWidth / totalRawPxWidth;
    }
    if (fitMode === 'fit') {
      return Math.min(availWidth / totalRawPxWidth, availHeight / totalRawPxHeight);
    }
    return 1;
  }, [isAuto, fitMode, availWidth, availHeight, totalRawPxWidth, totalRawPxHeight]);

  const scaledCodeW = totalRawPxWidth * fitScale;
  const scaledCodeH = totalRawPxHeight * fitScale;

  // Base Alignment
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

  const codeX = Math.round(basePos.x + (artboardSettings?.xOffset || 0));
  const codeY = Math.round(basePos.y + (artboardSettings?.yOffset || 0));

  // Dynamic Fit Zoom Calculation
  const fitZoom = useMemo(() => {
    const margin = 32;
    const availW = Math.max(20, workspaceSize.width - margin);
    const availH = Math.max(20, workspaceSize.height - margin);
    const scaleX = availW / Math.max(20, artboardPxWidth);
    const scaleY = availH / Math.max(20, artboardPxHeight);
    const fit = Math.min(scaleX, scaleY);
    return Math.max(0.15, Math.min(2.5, parseFloat(fit.toFixed(3))));
  }, [workspaceSize, artboardPxWidth, artboardPxHeight]);

  // Current Effective Zoom
  const effectiveZoom = zoomMode === 'fit' ? fitZoom : manualZoom;

  // Zoom Stepping Controls: - and + switch from Fit to manual steps
  const handleZoomIn = useCallback(() => {
    const current = effectiveZoom;
    const nextStep = ZOOM_STEPS.find((s) => s > current + 0.02) || 4.0;
    setZoomMode('manual');
    setManualZoom(nextStep);
  }, [effectiveZoom]);

  const handleZoomOut = useCallback(() => {
    const current = effectiveZoom;
    const prevStep = [...ZOOM_STEPS].reverse().find((s) => s < current - 0.02) || 0.25;
    setZoomMode('manual');
    setManualZoom(prevStep);
  }, [effectiveZoom]);

  const handleSelectZoomStep = (step) => {
    setZoomMode('manual');
    setManualZoom(step);
    setIsZoomDropdownOpen(false);
  };

  const handleResetFit = () => {
    setZoomMode('fit');
    setIsZoomDropdownOpen(false);
  };

  // Keyboard navigation on workspace focus: +, -, 0
  const handleKeyDown = (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    if (e.key === '+' || e.key === '=') {
      e.preventDefault();
      handleZoomIn();
    } else if (e.key === '-' || e.key === '_') {
      e.preventDefault();
      handleZoomOut();
    } else if (e.key === '0') {
      e.preventDefault();
      handleResetFit();
    }
  };

  // Ctrl + Wheel Zoom
  const handleWheel = (e) => {
    if (e.ctrlKey) {
      e.preventDefault();
      if (e.deltaY < 0) {
        handleZoomIn();
      } else {
        handleZoomOut();
      }
    }
  };

  // Touch Pinch-to-zoom
  const handleTouchStart = (e) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      touchDistanceRef.current = dist;
    }
  };

  const handleTouchMove = (e) => {
    if (e.touches.length === 2 && touchDistanceRef.current) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const ratio = dist / touchDistanceRef.current;
      if (Math.abs(ratio - 1) > 0.05) {
        setZoomMode('manual');
        setManualZoom((prev) => Math.min(4.0, Math.max(0.25, parseFloat((prev * ratio).toFixed(2)))));
        touchDistanceRef.current = dist;
      }
    }
  };

  const handleTouchEnd = () => {
    touchDistanceRef.current = null;
  };

  // Canvas Drag to Pan (when zoomed in)
  const isOverflowingCanvas =
    artboardPxWidth * effectiveZoom > workspaceSize.width ||
    artboardPxHeight * effectiveZoom > workspaceSize.height;

  const handleCanvasPointerDown = (e) => {
    if (e.target.closest('#artboard-code-object')) return;
    if (!workspaceRef.current) return;
    setIsPanning(true);
    panStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      scrollLeft: workspaceRef.current.scrollLeft,
      scrollTop: workspaceRef.current.scrollTop,
    };
    workspaceRef.current.setPointerCapture?.(e.pointerId);
  };

  const handleCanvasPointerMove = (e) => {
    if (!isPanning || !workspaceRef.current) return;
    const dx = e.clientX - panStartRef.current.x;
    const dy = e.clientY - panStartRef.current.y;
    workspaceRef.current.scrollLeft = panStartRef.current.scrollLeft - dx;
    workspaceRef.current.scrollTop = panStartRef.current.scrollTop - dy;
  };

  const handleCanvasPointerUp = (e) => {
    if (!isPanning) return;
    workspaceRef.current?.releasePointerCapture?.(e.pointerId);
    setIsPanning(false);
  };

  const isEmpty = !value.trim();

  // Render Barcode
  useEffect(() => {
    if (type !== 'barcode') return;
    if (isEmpty || !isValid) {
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
          fontSize: settings.fontSize || 14,
          textMargin: 4,
          margin: settings.margin ?? 6,
          background: settings.background || '#ffffff',
          lineColor: settings.lineColor || '#000000',
        });
        setRenderError(null);

        const svgBBox = activeBarcodeRef.current.getBBox?.();
        if (svgBBox && svgBBox.width > 0) {
          const estimatedBars = value.length * 11 + 35;
          const calculatedMw = svgBBox.width / estimatedBars;
          if (onCalculatedModuleWidth) onCalculatedModuleWidth(calculatedMw);
        }
      }
    } catch (err) {
      setRenderError(err.message || 'Invalid barcode content');
      if (onCalculatedModuleWidth) onCalculatedModuleWidth(null);
    }
  }, [
    type,
    format,
    value,
    settings,
    isValid,
    isEmpty,
    codeRawPxWidth,
    codeRawPxHeight,
    onCalculatedModuleWidth,
    activeBarcodeRef,
  ]);

  // Render Sample Barcode on Empty
  useEffect(() => {
    if (type !== 'barcode' || !isEmpty) return;
    try {
      if (sampleBarcodeSvgRef.current) {
        JsBarcode(sampleBarcodeSvgRef.current, '123456789012', {
          format: 'CODE128',
          width: 2,
          height: 60,
          displayValue: true,
          font: 'monospace',
          fontSize: 14,
          margin: 10,
          background: 'transparent',
          lineColor: '#94a3b8',
        });
      }
    } catch (e) {
      // ignore
    }
  }, [type, isEmpty]);

  // Render QR Code
  useEffect(() => {
    if (type !== 'qr') return;
    if (isEmpty || !isValid) {
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
  }, [type, value, settings, isValid, isEmpty, codeRawPxWidth, codeRawPxHeight]);

  // Render Sample QR on Empty
  useEffect(() => {
    if (type !== 'qr' || !isEmpty) return;
    try {
      if (sampleQrContainerRef.current) {
        sampleQrContainerRef.current.innerHTML = '';
        const qrCode = new QRCodeStyling({
          width: 140,
          height: 140,
          data: 'https://example.com/demo',
          dotsOptions: { color: '#94a3b8', type: 'rounded' },
          cornersSquareOptions: { color: '#94a3b8', type: 'extra-rounded' },
          backgroundOptions: { color: 'transparent' },
          qrOptions: { errorCorrectionLevel: 'M' },
        });
        qrCode.append(sampleQrContainerRef.current);
      }
    } catch (e) {
      // ignore
    }
  }, [type, isEmpty]);

  // Warnings check
  const [warnings, setWarnings] = useState({ scannabilityWarning: null, codeExceedsWarning: null });
  useEffect(() => {
    let scannabilityWarning = null;
    let codeExceedsWarning = null;

    if (!isAuto && !isEmpty) {
      const codeRight = codeX + scaledCodeW;
      const codeBottom = codeY + scaledCodeH;

      if (codeX < 0 || codeY < 0 || codeRight > artboardPxWidth || codeBottom > artboardPxHeight) {
        codeExceedsWarning = 'Code exceeds artboard edge';
      }

      const marginDistanceX = Math.min(codeX, artboardPxWidth - codeRight);
      const marginDistanceY = Math.min(codeY, artboardPxHeight - codeBottom);
      if (marginDistanceX < 8 || marginDistanceY < 8) {
        scannabilityWarning = 'Code placed very close to edge';
      }
    }

    setWarnings({ scannabilityWarning, codeExceedsWarning });
    if (onWarningsUpdate) {
      onWarningsUpdate({ scannabilityWarning, codeExceedsWarning });
    }
  }, [isAuto, isEmpty, codeX, codeY, scaledCodeW, scaledCodeH, artboardPxWidth, artboardPxHeight, onWarningsUpdate]);

  // Drag Code Handlers
  const handleCodePointerDown = (e) => {
    if (isAuto || !onArtboardChange) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingCode(true);
    codeDragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      startOffsetX: artboardSettings?.xOffset || 0,
      startOffsetY: artboardSettings?.yOffset || 0,
    };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };

  const handleCodePointerMove = (e) => {
    if (!isDraggingCode || isAuto || !onArtboardChange) return;
    const dx = (e.clientX - codeDragStartRef.current.x) / effectiveZoom;
    const dy = (e.clientY - codeDragStartRef.current.y) / effectiveZoom;

    onArtboardChange({
      ...artboardSettings,
      xOffset: Math.round(codeDragStartRef.current.startOffsetX + dx),
      yOffset: Math.round(codeDragStartRef.current.startOffsetY + dy),
    });
  };

  const handleCodePointerUp = (e) => {
    if (!isDraggingCode) return;
    e.currentTarget.releasePointerCapture?.(e.pointerId);
    setIsDraggingCode(false);
  };

  // Double click to reset position
  const handleCodeDoubleClick = (e) => {
    e.stopPropagation();
    if (!isAuto && onArtboardChange) {
      onArtboardChange({
        ...artboardSettings,
        xOffset: 0,
        yOffset: 0,
      });
    }
  };

  // Single Status Line Problem & Fix Resolver
  let statusProblem = null;
  let statusFixAction = null;
  let statusFixLabel = 'Fix';

  if (!isValid || validationError || renderError) {
    if (validationResult?.canAutoFixCheckDigit && validationResult?.suggestedFullNumber) {
      statusProblem = `Invalid check digit: needs ${validationResult.suggestedCheckDigit}`;
      statusFixAction = () => onAutoFixCheckDigit?.(validationResult.suggestedFullNumber);
      statusFixLabel = 'Add check digit';
    } else if (type === 'barcode' && ['EAN13', 'EAN8', 'UPC'].includes(format) && onGenerateValidNumber) {
      statusProblem = `${format} needs valid digits`;
      statusFixAction = onGenerateValidNumber;
      statusFixLabel = 'Generate valid';
    } else {
      statusProblem = validationError || renderError || 'Invalid code format';
    }
  } else if (warnings.codeExceedsWarning) {
    statusProblem = 'Code exceeds artboard edge';
    statusFixAction = () => onArtboardChange?.({ ...artboardSettings, fit: 'fit' });
    statusFixLabel = 'Fit to artboard';
  } else if (warnings.scannabilityWarning) {
    statusProblem = warnings.scannabilityWarning;
  }

  // Artboard Size readout chip
  const sizeChipText = isAuto
    ? 'Auto'
    : `${artboardSettings.width || 60} × ${artboardSettings.height || 40} ${artboardUnit}`;

  return (
    <div
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className="bg-white rounded-lg border border-gray-200 flex flex-col w-full h-full min-w-0 overflow-hidden relative focus:outline-none"
    >
      {/* 1. Preview Canvas Area with Floating Indicators */}
      <div
        ref={workspaceRef}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onPointerDown={handleCanvasPointerDown}
        onPointerMove={handleCanvasPointerMove}
        onPointerUp={handleCanvasPointerUp}
        onPointerCancel={handleCanvasPointerUp}
        className={`flex-1 min-h-0 w-full bg-[#FAFAFA] relative overflow-auto p-4 select-none flex items-center justify-center [scrollbar-width:thin] ${
          isPanning ? 'cursor-grabbing' : isOverflowingCanvas ? 'cursor-grab' : 'cursor-default'
        }`}
      >
        {/* Floating Artboard Size Chip (Top Left) */}
        <div className="absolute top-3 left-3 z-10 pointer-events-none">
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-mono font-medium bg-white/95 backdrop-blur border border-gray-200 shadow-xs text-gray-700">
            {sizeChipText}
          </span>
        </div>

        {/* Floating Zoom Controls (Top Right) */}
        <div className="absolute top-3 right-3 z-20 flex items-center gap-0.5 bg-white/95 backdrop-blur p-0.5 rounded-lg border border-gray-200 shadow-xs">
          {/* Fit Button */}
          <button
            type="button"
            onClick={handleResetFit}
            className={`px-2 py-1 text-[11px] font-medium rounded transition-colors cursor-pointer ${
              zoomMode === 'fit'
                ? 'bg-indigo-50 text-indigo-700 font-semibold'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
            title="Recalculate best fit (Shortcut: 0)"
          >
            Fit
          </button>

          {/* Minus Button */}
          <button
            type="button"
            onClick={handleZoomOut}
            className="p-1 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded cursor-pointer transition-colors"
            title="Zoom out (Shortcut: -)"
          >
            <ZoomOut className="w-3.5 h-3.5 stroke-[1.5]" />
          </button>

          {/* Percentage Dropdown Trigger */}
          <div className="relative" ref={zoomDropdownRef}>
            <button
              type="button"
              onClick={() => setIsZoomDropdownOpen((prev) => !prev)}
              className="text-[11px] font-mono font-medium text-gray-700 hover:text-gray-900 px-1 py-0.5 rounded flex items-center gap-0.5 hover:bg-gray-100 cursor-pointer transition-colors min-w-[42px] justify-center"
            >
              <span>{Math.round(effectiveZoom * 100)}%</span>
              <ChevronDown className="w-2.5 h-2.5 text-gray-400 stroke-[1.5]" />
            </button>

            {isZoomDropdownOpen && (
              <div className="absolute right-0 top-full mt-1 w-24 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-30 text-xs animate-in fade-in zoom-in-95 duration-100">
                {ZOOM_STEPS.map((step) => (
                  <button
                    key={step}
                    type="button"
                    onClick={() => handleSelectZoomStep(step)}
                    className={`w-full px-2.5 py-1 text-left text-[11px] font-mono flex items-center justify-between cursor-pointer ${
                      Math.round(effectiveZoom * 100) === Math.round(step * 100) && zoomMode !== 'fit'
                        ? 'bg-indigo-50 text-indigo-700 font-semibold'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span>{Math.round(step * 100)}%</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Plus Button */}
          <button
            type="button"
            onClick={handleZoomIn}
            className="p-1 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded cursor-pointer transition-colors"
            title="Zoom in (Shortcut: +)"
          >
            <ZoomIn className="w-3.5 h-3.5 stroke-[1.5]" />
          </button>
        </div>

        {/* Empty State: Friendly Sample Code Preview */}
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center p-6 text-center max-w-xs select-none">
            <div className="opacity-40 pointer-events-none mb-3">
              {type === 'barcode' ? (
                <svg ref={sampleBarcodeSvgRef} className="block" />
              ) : (
                <div ref={sampleQrContainerRef} className="flex justify-center" />
              )}
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-gray-200 rounded-full shadow-xs text-xs font-medium text-gray-600">
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
              <span>Pick a template or a product to begin</span>
            </div>
          </div>
        ) : (
          /* Scaled Artboard Stage Container */
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
                onPointerDown={handleCodePointerDown}
                onPointerMove={handleCodePointerMove}
                onPointerUp={handleCodePointerUp}
                onPointerCancel={handleCodePointerUp}
                onDoubleClick={handleCodeDoubleClick}
                style={{
                  position: isAuto ? 'static' : 'absolute',
                  left: isAuto ? 'auto' : `${codeX}px`,
                  top: isAuto ? 'auto' : `${codeY}px`,
                  width: `${Math.round(totalRawPxWidth)}px`,
                  height: `${Math.round(totalRawPxHeight)}px`,
                  transform: isAuto || fitScale === 1 ? 'none' : `scale(${fitScale})`,
                  transformOrigin: 'top left',
                  cursor: isAuto ? 'default' : isDraggingCode ? 'grabbing' : 'grab',
                  touchAction: 'none',
                }}
                className={`flex flex-col items-center justify-center group ${
                  !isAuto
                    ? 'hover:outline hover:outline-1 hover:outline-dashed hover:outline-indigo-400 hover:ring-2 hover:ring-indigo-100/50 rounded transition-all'
                    : ''
                }`}
                title={!isAuto ? 'Click & drag to move • Double-click to reset position' : undefined}
              >
                {type === 'barcode' ? (
                  <div className="flex flex-col items-center w-full">
                    <svg ref={activeBarcodeRef} className="max-w-full h-auto block" />
                    {hasLabel && (
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditLabel?.();
                        }}
                        className="w-full select-none flex flex-col cursor-pointer hover:bg-indigo-50/50 rounded transition-colors"
                        style={{
                          marginTop: `${labelGapPx}px`,
                          fontSize: `${labelFontSizePx}px`,
                          fontWeight: labelWeight === 'bold' ? 700 : 400,
                          textAlign: labelAlign,
                          color: '#0F172A',
                          maxWidth: `${Math.round(codeRawPxWidth)}px`,
                        }}
                        title="Click to edit label text"
                      >
                        {resolvedLabelText.split('\n').map((line, idx) => (
                          <p
                            key={idx}
                            style={{ color: isPatternUnlinked ? '#64748B' : '#0F172A' }}
                            className="w-full break-words whitespace-normal leading-tight m-0 p-0"
                          >
                            {line}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center w-full">
                    <div ref={qrContainerRef} className="flex justify-center max-w-full" />
                    {hasLabel && (
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditLabel?.();
                        }}
                        className="w-full select-none flex flex-col cursor-pointer hover:bg-indigo-50/50 rounded transition-colors"
                        style={{
                          marginTop: `${labelGapPx}px`,
                          fontSize: `${labelFontSizePx}px`,
                          fontWeight: labelWeight === 'bold' ? 700 : 400,
                          textAlign: labelAlign,
                          maxWidth: `${Math.round(codeRawPxWidth)}px`,
                        }}
                        title="Click to edit label text"
                      >
                        {resolvedLabelText.split('\n').map((line, idx) => (
                          <p
                            key={idx}
                            style={{ color: isPatternUnlinked ? '#64748B' : '#0F172A' }}
                            className="w-full break-words whitespace-normal leading-tight m-0 p-0"
                          >
                            {line}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 2. Single Status Line Under Preview */}
      <div className="px-3 py-1.5 bg-gray-50/90 border-t border-gray-100 flex items-center justify-between text-xs shrink-0 min-h-[32px] min-w-0">
        {statusProblem ? (
          <div className="flex items-center gap-1.5 text-amber-700 min-w-0 truncate">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
            <span className="truncate font-medium">{statusProblem}</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-emerald-700 min-w-0 truncate">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
            <span className="font-medium truncate">Ready to scan</span>
          </div>
        )}

        {statusFixAction && (
          <button
            type="button"
            onClick={statusFixAction}
            className="ml-2 px-2 py-0.5 bg-amber-100 hover:bg-amber-200 text-amber-800 rounded font-semibold text-[11px] transition-colors cursor-pointer shrink-0"
          >
            {statusFixLabel}
          </button>
        )}
      </div>

      {/* 3. Action Footer: Never Clipped, Responsive */}
      <div className="shrink-0 border-t border-gray-200 bg-white p-2.5 sm:p-3 flex items-center justify-between gap-2 min-w-0">
        {/* Left: Saved Status Indicator */}
        <div className="flex items-center gap-1.5 text-xs shrink-0">
          {isModified ? (
            <span className="text-gray-400 font-medium">Unsaved changes</span>
          ) : (
            <span className="text-emerald-700 font-medium flex items-center gap-1">
              <Check className="w-3.5 h-3.5 stroke-[2]" />
              <span className="hidden sm:inline">Saved</span>
            </span>
          )}
        </div>

        {/* Right: Save + Download Menu + More Menu */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Primary Save Button (36px h-9) */}
          <Button
            id="save-to-gallery-btn"
            variant="primary"
            size="md"
            className="h-9 px-3.5 sm:px-4 text-xs font-semibold"
            icon={Save}
            disabled={!isValid || Boolean(validationError) || Boolean(renderError)}
            isLoading={isSaving}
            onClick={onSave}
          >
            Save
          </Button>

          {/* Download Dropdown Popover */}
          <div className="relative" ref={downloadMenuRef}>
            <button
              id="download-menu-btn"
              type="button"
              onClick={() => setIsDownloadMenuOpen((prev) => !prev)}
              disabled={!isValid || Boolean(validationError) || Boolean(renderError)}
              className="h-9 px-2.5 sm:px-3 bg-white hover:bg-gray-50 border border-gray-300 rounded-lg text-xs font-medium text-gray-700 flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors"
            >
              <Download className="w-3.5 h-3.5 stroke-[1.5]" />
              <span className="hidden sm:inline">Download</span>
            </button>

            {isDownloadMenuOpen && (
              <div className="absolute right-0 bottom-full mb-1.5 w-48 bg-white rounded-lg shadow-xl border border-gray-200 p-2 z-40 text-xs animate-in fade-in zoom-in-95 duration-100 space-y-2">
                <div className="space-y-1">
                  <button
                    type="button"
                    onClick={() => {
                      onDownloadPng(dpi);
                      setIsDownloadMenuOpen(false);
                    }}
                    className="w-full px-2.5 py-1.5 text-left text-xs text-gray-800 hover:bg-indigo-50 hover:text-indigo-700 rounded-md flex items-center justify-between cursor-pointer font-medium"
                  >
                    <span>Download PNG</span>
                    <span className="text-[10px] text-gray-400 font-mono">{dpi} DPI</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onDownloadSvg();
                      setIsDownloadMenuOpen(false);
                    }}
                    className="w-full px-2.5 py-1.5 text-left text-xs text-gray-800 hover:bg-indigo-50 hover:text-indigo-700 rounded-md flex items-center justify-between cursor-pointer font-medium"
                  >
                    <span>Download SVG</span>
                    <span className="text-[10px] text-gray-400 font-mono">Vector</span>
                  </button>
                </div>

                <div className="border-t border-gray-100 pt-1.5">
                  <span className="block text-[10px] text-gray-400 mb-1 font-medium">Export DPI</span>
                  <div className="grid grid-cols-4 gap-0.5 bg-gray-100 p-0.5 rounded border border-gray-200">
                    {DPIS.map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => onDpiChange?.(d)}
                        className={`py-0.5 text-[10px] font-mono rounded cursor-pointer ${
                          dpi === d ? 'bg-white text-indigo-600 font-semibold shadow-xs' : 'text-gray-600'
                        }`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* More Actions Dropdown Menu */}
          <div className="relative" ref={moreMenuRef}>
            <button
              type="button"
              onClick={() => setIsMoreMenuOpen((prev) => !prev)}
              className="w-9 h-9 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center justify-center text-gray-600 hover:text-gray-900 cursor-pointer transition-colors"
              title="More actions"
            >
              <MoreVertical className="w-3.5 h-3.5 stroke-[1.5]" />
            </button>

            {isMoreMenuOpen && (
              <div className="absolute right-0 bottom-full mb-1.5 w-44 bg-white rounded-lg shadow-xl border border-gray-200 py-1.5 z-40 text-xs animate-in fade-in zoom-in-95 duration-100">
                <button
                  type="button"
                  onClick={() => {
                    onReset?.();
                    setIsMoreMenuOpen(false);
                  }}
                  className="w-full px-3 py-1.5 text-left text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3 text-gray-400 stroke-[1.5]" />
                  <span>Reset settings</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onDuplicate?.();
                    setIsMoreMenuOpen(false);
                  }}
                  className="w-full px-3 py-1.5 text-left text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2 cursor-pointer"
                >
                  <Copy className="w-3 h-3 text-gray-400 stroke-[1.5]" />
                  <span>Duplicate as new</span>
                </button>

                <div className="h-px bg-gray-100 my-1" />

                <label className="w-full px-3 py-1.5 text-left text-xs text-gray-700 hover:bg-gray-50 flex items-center justify-between cursor-pointer select-none">
                  <span>Export code only</span>
                  <input
                    type="checkbox"
                    checked={artboardSettings.exportCodeOnly ?? false}
                    onChange={(e) =>
                      onArtboardChange?.({
                        ...artboardSettings,
                        exportCodeOnly: e.target.checked,
                      })
                    }
                    className="w-3.5 h-3.5 rounded text-indigo-600 focus:ring-indigo-500 border-gray-300"
                  />
                </label>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
