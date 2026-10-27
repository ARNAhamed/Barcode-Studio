import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { getPaperDimensions } from '../../utils/printHelpers';

export default function PaperPreview({
  config,
  paginationData,
  placement,
  onChangePlacement,
  currentPage = 1,
  onChangeCurrentPage,
  startPosition = 1,
  onChangeStartPosition,
}) {
  const canvasRef = useRef(null);
  const [zoomMode, setZoomMode] = useState('fit'); // 'fit' | '50' | '100' | 'manual'
  const [scale, setScale] = useState(0.5);
  const [canvasSize, setCanvasSize] = useState({ width: 500, height: 400 });

  // Panning state for dragging canvas when zoomed
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 });

  const { widthMm, heightMm } = getPaperDimensions(config.paper_size, config.orientation);

  // 1mm = 3.7795275591 px at 96 DPI
  const MM_TO_PX = 3.7795275591;
  const sheetWidthPx = widthMm * MM_TO_PX;
  const sheetHeightPx = heightMm * MM_TO_PX;

  // Measure canvas size with ResizeObserver
  useEffect(() => {
    if (!canvasRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setCanvasSize({ width, height });
        }
      }
    });
    observer.observe(canvasRef.current);
    return () => observer.disconnect();
  }, []);

  // Calculate Scale to fit paper in BOTH width and height with small margin
  useEffect(() => {
    if (zoomMode === 'fit') {
      const padding = 24;
      const availW = Math.max(40, canvasSize.width - padding);
      const availH = Math.max(40, canvasSize.height - padding);
      const scaleX = availW / sheetWidthPx;
      const scaleY = availH / sheetHeightPx;
      const fitScale = Math.min(scaleX, scaleY);
      setScale(Math.max(0.05, parseFloat(fitScale.toFixed(3))));
    } else if (zoomMode === '50') {
      setScale(0.5);
    } else if (zoomMode === '100') {
      setScale(1.0);
    }
  }, [zoomMode, canvasSize, sheetWidthPx, sheetHeightPx]);

  const { pages = [], totalLabels = 0, totalPages = 1 } = paginationData;
  const activePageObj = pages[currentPage - 1] || pages[0] || { cells: [] };

  const cols = parseInt(config.columns, 10) || 1;
  const rows = parseInt(config.rows, 10) || 1;
  const labelWMm = parseFloat(config.label_width) || 0;
  const labelHMm = parseFloat(config.label_height) || 0;
  const topMMm = parseFloat(config.margin_top) || 0;
  const leftMMm = parseFloat(config.margin_left) || 0;
  const gapHMm = parseFloat(config.gap_horizontal) || 0;
  const gapVMm = parseFloat(config.gap_vertical) || 0;
  const cornerRMm = parseFloat(config.corner_radius) || 0;
  const paddingMm = parseFloat(placement.padding) || 0;

  const showLabelBorders = placement.showBorders !== false;

  // Canvas Panning Handlers
  const handleCanvasPointerDown = (e) => {
    if (e.target.closest('.print-label-cell')) return;
    if (!canvasRef.current) return;
    isPanningRef.current = true;
    panStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      scrollLeft: canvasRef.current.scrollLeft,
      scrollTop: canvasRef.current.scrollTop,
    };
    canvasRef.current.setPointerCapture?.(e.pointerId);
  };

  const handleCanvasPointerMove = (e) => {
    if (!isPanningRef.current || !canvasRef.current) return;
    const dx = e.clientX - panStartRef.current.x;
    const dy = e.clientY - panStartRef.current.y;
    canvasRef.current.scrollLeft = panStartRef.current.scrollLeft - dx;
    canvasRef.current.scrollTop = panStartRef.current.scrollTop - dy;
  };

  const handleCanvasPointerUp = (e) => {
    if (!isPanningRef.current) return;
    canvasRef.current?.releasePointerCapture?.(e.pointerId);
    isPanningRef.current = false;
  };

  return (
    <div className="w-full flex flex-col h-full select-none bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Print-only CSS stylesheet injected into DOM */}
      <style>{`
        @media print {
          @page {
            size: ${widthMm}mm ${heightMm}mm;
            margin: 0mm !important;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            width: ${widthMm}mm !important;
            height: auto !important;
          }
          /* Hide all non-printable elements */
          .no-print,
          aside,
          header,
          nav,
          .toaster,
          button,
          .print-controls {
            display: none !important;
          }
          /* Printable pages container */
          .print-pages-sheet-wrapper {
            display: block !important;
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            width: ${widthMm}mm !important;
            background: transparent !important;
          }
          .print-sheet-page {
            position: relative !important;
            display: block !important;
            width: ${widthMm}mm !important;
            height: ${heightMm}mm !important;
            page-break-after: always !important;
            break-after: page !important;
            overflow: hidden !important;
            box-shadow: none !important;
            border: none !important;
            background: #ffffff !important;
            margin: 0 !important;
            padding: 0 !important;
            box-sizing: border-box !important;
          }
          .print-label-cell {
            box-sizing: border-box !important;
            position: absolute !important;
            overflow: hidden !important;
          }
        }
      `}</style>

      {/* 1. Header Bar (shrink-0): Label count, border toggle, and compact zoom controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 sm:px-4 py-2 border-b border-gray-100 bg-white shrink-0 min-w-0 no-print">
        {/* Left: Info & Border Toggle */}
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="text-xs font-semibold text-gray-900 truncate">
            {totalLabels} label{totalLabels === 1 ? '' : 's'}
          </span>
          <span className="text-[11px] text-gray-500 font-normal shrink-0">
            ({totalPages}p &bull; {cols * rows}/sheet)
          </span>

          <label className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-gray-900 cursor-pointer ml-1">
            <input
              type="checkbox"
              checked={showLabelBorders}
              onChange={(e) =>
                onChangePlacement({ ...placement, showBorders: e.target.checked })
              }
              className="w-3.5 h-3.5 rounded text-indigo-600 focus:ring-indigo-500 border-gray-300"
            />
            <span className="text-xs">Show borders</span>
          </label>
        </div>

        {/* Right: Zoom controls (Fit, 50%, 100%, -, %, +) */}
        <div className="flex items-center gap-0.5 bg-gray-100 p-0.5 rounded-lg border border-gray-200 min-w-0 text-xs">
          <div className="inline-flex items-center">
            {['fit', '50', '100'].map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setZoomMode(mode)}
                className={`px-1.5 sm:px-2 py-0.5 rounded text-xs transition-colors cursor-pointer ${
                  zoomMode === mode
                    ? 'bg-white text-indigo-600 font-semibold shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {mode === 'fit' ? 'Fit' : `${mode}%`}
              </button>
            ))}
          </div>

          <div className="h-3 w-px bg-gray-300 mx-0.5 shrink-0" />

          {/* Minus icon */}
          <button
            type="button"
            onClick={() => {
              setZoomMode('manual');
              setScale((prev) => Math.max(0.1, parseFloat((prev - 0.1).toFixed(2))));
            }}
            className="p-1 text-gray-500 hover:text-gray-800 rounded transition-colors cursor-pointer shrink-0"
            title="Zoom out"
            aria-label="Zoom out"
          >
            <ZoomOut className="w-3.5 h-3.5 stroke-[1.5]" />
          </button>

          {/* Real Zoom % */}
          <span className="text-[11px] font-mono text-gray-600 px-1 text-center whitespace-nowrap min-w-[34px] shrink-0">
            {Math.round(scale * 100)}%
          </span>

          {/* Plus icon */}
          <button
            type="button"
            onClick={() => {
              setZoomMode('manual');
              setScale((prev) => Math.min(2.0, parseFloat((prev + 0.1).toFixed(2))));
            }}
            className="p-1 text-gray-500 hover:text-gray-800 rounded transition-colors cursor-pointer shrink-0"
            title="Zoom in"
            aria-label="Zoom in"
          >
            <ZoomIn className="w-3.5 h-3.5 stroke-[1.5]" />
          </button>
        </div>
      </div>

      {/* 2. Scaled Preview Canvas Area (flex-1, min-h-0, overflow-auto, centered content) */}
      <div
        ref={canvasRef}
        onPointerDown={handleCanvasPointerDown}
        onPointerMove={handleCanvasPointerMove}
        onPointerUp={handleCanvasPointerUp}
        onPointerCancel={handleCanvasPointerUp}
        className="flex-1 min-h-0 w-full bg-[#F4F4F5] relative overflow-auto p-3 select-none flex items-center justify-center [scrollbar-width:thin] no-print"
        onWheel={(e) => {
          if (e.ctrlKey) {
            e.preventDefault();
            const delta = e.deltaY < 0 ? 0.05 : -0.05;
            setZoomMode('manual');
            setScale((prev) => Math.min(2.0, Math.max(0.1, parseFloat((prev + delta).toFixed(2)))));
          }
        }}
      >
        {/* Scaled Sheet Wrapper: sized precisely to scaled pixels so layout flow never overflows in Fit */}
        <div
          style={{
            width: `${Math.round(sheetWidthPx * scale)}px`,
            height: `${Math.round(sheetHeightPx * scale)}px`,
          }}
          className="relative transition-all duration-150 shrink-0 m-auto select-none"
        >
          {/* Paper Sheet container */}
          <div
            style={{
              width: `${widthMm}mm`,
              height: `${heightMm}mm`,
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
            }}
            className="absolute top-0 left-0 bg-white border border-gray-300 rounded-sm overflow-hidden shadow-xs"
          >
            {/* Render label cells for current active page */}
            {activePageObj.cells?.map((cell) => {
              const slotIndex = cell.slot - 1;
              const col = slotIndex % cols;
              const row = Math.floor(slotIndex / cols);

              const cellX = leftMMm + col * (labelWMm + gapHMm);
              const cellY = topMMm + row * (labelHMm + gapVMm);

              const isStartSlot = cell.slot === startPosition && currentPage === 1;

              return (
                <div
                  key={cell.slot}
                  onClick={() => {
                    // Click on cell to set start position
                    if (currentPage === 1) {
                      onChangeStartPosition(cell.slot);
                    }
                  }}
                  style={{
                    position: 'absolute',
                    left: `${cellX}mm`,
                    top: `${cellY}mm`,
                    width: `${labelWMm}mm`,
                    height: `${labelHMm}mm`,
                    borderRadius: `${cornerRMm}mm`,
                    padding: `${paddingMm}mm`,
                  }}
                  title={
                    cell.isUsedSlot
                      ? `Slot #${cell.slot} (Skipped used slot). Click to set as start position.`
                      : isStartSlot
                      ? `Slot #${cell.slot} (Start Position)`
                      : `Slot #${cell.slot}. Click to start printing from here.`
                  }
                  className={`print-label-cell flex items-center justify-center transition-colors cursor-pointer ${
                    cell.isUsedSlot
                      ? 'bg-gray-100/80 opacity-40'
                      : isStartSlot
                      ? 'ring-2 ring-indigo-500 bg-indigo-50/20'
                      : showLabelBorders
                      ? 'border border-dashed border-gray-300 hover:border-indigo-400'
                      : 'hover:bg-gray-50/50'
                  }`}
                >
                  {/* Slot Number watermark if empty */}
                  {!cell.item && (
                    <span className="text-[10px] font-mono text-gray-300 select-none">
                      #{cell.slot}
                    </span>
                  )}

                  {/* Start position badge */}
                  {isStartSlot && (
                    <span className="absolute top-0.5 left-0.5 bg-indigo-600 text-white text-[9px] font-bold px-1 rounded select-none z-10 shadow-xs">
                      START
                    </span>
                  )}

                  {/* Render design code item inside label */}
                  {cell.item && (
                    <div
                      className="w-full h-full flex"
                      style={{
                        alignItems:
                          placement.alignment === 'top-left' || placement.alignment === 'top-center'
                            ? 'flex-start'
                            : 'center',
                        justifyContent:
                          placement.alignment === 'top-left' ? 'flex-start' : 'center',
                      }}
                    >
                      <img
                        src={cell.item.preview_url}
                        alt={cell.item.name}
                        style={{
                          maxWidth: '100%',
                          maxHeight: '100%',
                          width: placement.fit === 'fill' ? '100%' : 'auto',
                          height: placement.fit === 'fill' ? '100%' : 'auto',
                          objectFit: placement.fit === 'fill' ? 'fill' : 'contain',
                          border:
                            placement.showArtboardBorder && cell.item.settings?.artboard?.borderWidth
                              ? `${cell.item.settings.artboard.borderWidth}px solid ${cell.item.settings.artboard.borderColor || '#000000'}`
                              : 'none',
                          backgroundColor:
                            placement.showBackground !== false &&
                            cell.item.settings?.artboard?.background
                              ? cell.item.settings.artboard.background
                              : 'transparent',
                        }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 3. Footer Bar (shrink-0): Sheet dimensions & page navigation */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 sm:px-4 py-2 border-t border-gray-200 bg-white shrink-0 min-w-0 no-print">
        {/* Sheet Physical Dimensions Info */}
        <div className="text-[11px] text-gray-600 truncate">
          <strong>{config.paper_size.toUpperCase()}</strong> ({config.orientation}) &bull; {widthMm} &times; {heightMm} mm
        </div>

        {/* Page Navigation */}
        <div className="flex items-center gap-1.5 text-xs font-medium">
          <button
            type="button"
            disabled={currentPage <= 1}
            onClick={() => onChangeCurrentPage(currentPage - 1)}
            className="p-1 text-gray-500 hover:text-gray-900 disabled:opacity-30 rounded cursor-pointer"
            title="Previous page"
          >
            <ChevronLeft className="w-3.5 h-3.5 stroke-[1.5]" />
          </button>
          <span className="text-[11px] font-mono text-gray-700 px-1">
            Page {currentPage} of {totalPages}
          </span>
          <button
            type="button"
            disabled={currentPage >= totalPages}
            onClick={() => onChangeCurrentPage(currentPage + 1)}
            className="p-1 text-gray-500 hover:text-gray-900 disabled:opacity-30 rounded cursor-pointer"
            title="Next page"
          >
            <ChevronRight className="w-3.5 h-3.5 stroke-[1.5]" />
          </button>
        </div>
      </div>
    </div>
  );
}
