import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  ZoomIn,
  ZoomOut,
  Maximize,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Check,
  Printer,
  FileDown,
} from 'lucide-react';
import { getPaperDimensions } from '../../utils/printHelpers';
import { convertUnit } from '../../utils/units';

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
  const containerRef = useRef(null);
  const [zoomMode, setZoomMode] = useState('fit'); // 'fit' | '50' | '100'
  const [scale, setScale] = useState(0.8);

  const { widthMm, heightMm } = getPaperDimensions(config.paper_size, config.orientation);

  // 1mm = 3.7795275591 px at 96 DPI
  const MM_TO_PX = 3.7795275591;
  const sheetWidthPx = widthMm * MM_TO_PX;
  const sheetHeightPx = heightMm * MM_TO_PX;

  // Auto-fit calculation
  useEffect(() => {
    const updateScale = () => {
      if (!containerRef.current) return;
      const containerWidth = containerRef.current.clientWidth - 32; // padding
      const containerHeight = window.innerHeight * 0.75;

      if (zoomMode === 'fit') {
        const scaleX = containerWidth / sheetWidthPx;
        const scaleY = containerHeight / sheetHeightPx;
        setScale(Math.min(1.0, Math.min(scaleX, scaleY)));
      } else if (zoomMode === '50') {
        setScale(0.5);
      } else if (zoomMode === '100') {
        setScale(1.0);
      }
    };

    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, [zoomMode, sheetWidthPx, sheetHeightPx]);

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

  return (
    <div className="w-full flex flex-col h-full select-none" ref={containerRef}>
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

      {/* Preview Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white/90 backdrop-blur-xs border border-slate-200/80 rounded-xl p-2.5 mb-3 shadow-2xs no-print">
        {/* Left: Info & Border Toggle */}
        <div className="flex items-center gap-3">
          <div className="text-xs font-semibold text-slate-800">
            {totalLabels} label{totalLabels === 1 ? '' : 's'}
            <span className="text-slate-400 font-normal ml-1">
              ({totalPages} page{totalPages === 1 ? '' : 's'} &bull; {cols * rows} / sheet)
            </span>
          </div>

          <label className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 cursor-pointer">
            <input
              type="checkbox"
              checked={showLabelBorders}
              onChange={(e) =>
                onChangePlacement({ ...placement, showBorders: e.target.checked })
              }
              className="w-3.5 h-3.5 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
            />
            <span>Show label borders</span>
          </label>
        </div>

        {/* Right: Zoom & Page Navigation */}
        <div className="flex items-center gap-2">
          {/* Zoom controls */}
          <div className="flex items-center bg-slate-100 rounded-lg p-0.5 text-xs">
            {['fit', '50', '100'].map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setZoomMode(mode)}
                className={`px-2 py-0.5 rounded-md font-medium transition-colors ${
                  zoomMode === mode
                    ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {mode === 'fit' ? 'Fit' : `${mode}%`}
              </button>
            ))}
          </div>

          {/* Page Selector if multiple pages */}
          {totalPages > 1 && (
            <div className="flex items-center gap-1 pl-2 border-l border-slate-200">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => onChangeCurrentPage(currentPage - 1)}
                className="p-1 text-slate-500 hover:text-slate-900 disabled:opacity-30 rounded-md cursor-pointer"
                title="Previous page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-semibold text-slate-700">
                {currentPage} / {totalPages}
              </span>
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => onChangeCurrentPage(currentPage + 1)}
                className="p-1 text-slate-500 hover:text-slate-900 disabled:opacity-30 rounded-md cursor-pointer"
                title="Next page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Scaled Preview Canvas Area (Screen interactive view) */}
      <div className="flex-1 flex items-center justify-center overflow-auto min-h-[380px] sm:min-h-[480px] p-2 no-print">
        <div
          style={{
            width: `${sheetWidthPx * scale}px`,
            height: `${sheetHeightPx * scale}px`,
          }}
          className="relative transition-all duration-150 shrink-0"
        >
          {/* Paper Sheet container */}
          <div
            style={{
              width: `${widthMm}mm`,
              height: `${heightMm}mm`,
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
            }}
            className="absolute top-0 left-0 bg-white shadow-xl border border-slate-300/80 rounded-sm overflow-hidden"
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
                      : cell.item
                      ? `Slot #${cell.slot}: ${cell.item.name}`
                      : `Slot #${cell.slot} (Empty). Click to set start position.`
                  }
                  className={`box-border transition-colors cursor-pointer flex items-center justify-center overflow-hidden ${
                    showLabelBorders
                      ? 'border border-dashed border-slate-300 hover:border-indigo-400'
                      : 'hover:outline-1 hover:outline-dashed hover:outline-indigo-300'
                  } ${
                    cell.isUsedSlot
                      ? 'bg-slate-100/90 text-slate-400'
                      : isStartSlot
                      ? 'bg-indigo-50/40 ring-1 ring-indigo-500'
                      : 'bg-white'
                  }`}
                >
                  {/* Hatched pattern or label for used slot */}
                  {cell.isUsedSlot ? (
                    <div className="text-[10px] font-semibold text-slate-400 flex flex-col items-center justify-center">
                      <span>#{cell.slot}</span>
                      <span className="text-[9px] text-slate-400/80 uppercase">Used</span>
                    </div>
                  ) : cell.isEmpty ? (
                    <span className="text-[9px] text-slate-300 font-mono">#{cell.slot}</span>
                  ) : (
                    /* Render code preview */
                    <div
                      className={`w-full h-full flex overflow-hidden ${
                        placement.alignment === 'top-left'
                          ? 'items-start justify-start'
                          : placement.alignment === 'top-center'
                          ? 'items-start justify-center'
                          : 'items-center justify-center'
                      }`}
                    >
                      {cell.item?.preview_url ? (
                        <img
                          src={cell.item.preview_url}
                          alt={cell.item.name}
                          style={{
                            maxWidth: placement.fit === 'fill' ? '100%' : '100%',
                            maxHeight: placement.fit === 'fill' ? '100%' : '100%',
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
                          className="pointer-events-none"
                        />
                      ) : (
                        <div className="text-center">
                          <span className="text-xs font-bold text-slate-800 truncate block">
                            {cell.item?.name}
                          </span>
                          <span className="text-[10px] font-mono text-slate-500">
                            {cell.item?.value}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Hidden container exclusively for browser window.print() */}
      <div className="hidden print-pages-sheet-wrapper">
        {pages.map((page, pIdx) => (
          <div
            key={page.pageNumber || pIdx}
            className="print-sheet-page"
            style={{
              position: 'relative',
              width: `${widthMm}mm`,
              height: `${heightMm}mm`,
              backgroundColor: '#ffffff',
            }}
          >
            {page.cells?.map((cell) => {
              const slotIndex = cell.slot - 1;
              const col = slotIndex % cols;
              const row = Math.floor(slotIndex / cols);

              const cellX = leftMMm + col * (labelWMm + gapHMm);
              const cellY = topMMm + row * (labelHMm + gapVMm);

              return (
                <div
                  key={cell.slot}
                  className="print-label-cell"
                  style={{
                    position: 'absolute',
                    left: `${cellX}mm`,
                    top: `${cellY}mm`,
                    width: `${labelWMm}mm`,
                    height: `${labelHMm}mm`,
                    borderRadius: `${cornerRMm}mm`,
                    padding: `${paddingMm}mm`,
                    border: showLabelBorders ? '0.15mm dashed #cbd5e1' : 'none',
                    backgroundColor: '#ffffff',
                  }}
                >
                  {!cell.isEmpty && cell.item?.preview_url && (
                    <div
                      style={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
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
        ))}
      </div>
    </div>
  );
}
