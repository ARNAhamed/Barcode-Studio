import { jsPDF } from 'jspdf';
import { toPx, fromPx, convertUnit } from './units';

export const PAPER_SIZES = {
  a4: {
    id: 'a4',
    name: 'A4',
    widthMm: 210,
    heightMm: 297,
  },
  letter: {
    id: 'letter',
    name: 'US Letter',
    widthMm: 215.9,
    heightMm: 279.4,
  },
  a3: {
    id: 'a3',
    name: 'A3',
    widthMm: 297,
    heightMm: 420,
  },
  a5: {
    id: 'a5',
    name: 'A5',
    widthMm: 148,
    heightMm: 210,
  },
  a6: {
    id: 'a6',
    name: 'A6',
    widthMm: 105,
    heightMm: 148,
  },
  legal: {
    id: 'legal',
    name: 'US Legal',
    widthMm: 215.9,
    heightMm: 355.6,
  },
  '4x6': {
    id: '4x6',
    name: '4 × 6 inch',
    widthMm: 101.6,
    heightMm: 152.4,
  },
  custom: {
    id: 'custom',
    name: 'Custom',
    widthMm: 210,
    heightMm: 297,
  },
};

export const STANDARD_SHEET_PRESETS = [
  {
    id: '3x8',
    name: '3 × 8 (63.5 × 33.9 mm)',
    paper_size: 'a4',
    orientation: 'portrait',
    columns: 3,
    rows: 8,
    label_width: 63.5,
    label_height: 33.9,
    margin_top: 13.0,
    margin_left: 7.2,
    gap_horizontal: 2.5,
    gap_vertical: 0,
    corner_radius: 1.5,
    unit: 'mm',
  },
  {
    id: '2x7',
    name: '2 × 7 (99.1 × 38.1 mm)',
    paper_size: 'a4',
    orientation: 'portrait',
    columns: 2,
    rows: 7,
    label_width: 99.1,
    label_height: 38.1,
    margin_top: 15.1,
    margin_left: 4.7,
    gap_horizontal: 2.5,
    gap_vertical: 0,
    corner_radius: 1.5,
    unit: 'mm',
  },
  {
    id: '4x12',
    name: '4 × 12 (48.5 × 25.4 mm)',
    paper_size: 'a4',
    orientation: 'portrait',
    columns: 4,
    rows: 12,
    label_width: 48.5,
    label_height: 25.4,
    margin_top: 0,
    margin_left: 8.0,
    gap_horizontal: 0,
    gap_vertical: 0,
    corner_radius: 1.0,
    unit: 'mm',
  },
  {
    id: '5x13',
    name: '5 × 13 (38.1 × 21.2 mm)',
    paper_size: 'a4',
    orientation: 'portrait',
    columns: 5,
    rows: 13,
    label_width: 38.1,
    label_height: 21.2,
    margin_top: 10.7,
    margin_left: 4.8,
    gap_horizontal: 2.5,
    gap_vertical: 0,
    corner_radius: 1.0,
    unit: 'mm',
  },
  {
    id: 'custom',
    name: 'Custom Sheet',
    paper_size: 'a4',
    orientation: 'portrait',
    columns: 3,
    rows: 8,
    label_width: 63.5,
    label_height: 33.9,
    margin_top: 13.0,
    margin_left: 7.2,
    gap_horizontal: 2.5,
    gap_vertical: 0,
    corner_radius: 0,
    unit: 'mm',
  },
];

/**
 * Validate custom paper width and height (20mm - 1000mm)
 */
export const validateCustomPaper = (widthMm, heightMm) => {
  const w = parseFloat(widthMm);
  const h = parseFloat(heightMm);

  if (isNaN(w) || w === null || w === undefined || w <= 0) {
    return { isValid: false, error: 'Paper width is required and must be greater than 0.' };
  }
  if (isNaN(h) || h === null || h === undefined || h <= 0) {
    return { isValid: false, error: 'Paper height is required and must be greater than 0.' };
  }
  if (w < 20 || w > 1000) {
    return { isValid: false, error: 'Width must be between 20 mm and 1000 mm (0.79–39.37 in).' };
  }
  if (h < 20 || h > 1000) {
    return { isValid: false, error: 'Height must be between 20 mm and 1000 mm (0.79–39.37 in).' };
  }

  return { isValid: true, error: null };
};

/**
 * Get effective paper dimensions in mm considering orientation and custom sizes
 */
export const getPaperDimensions = (
  paperSizeKey = 'a4',
  orientation = 'portrait',
  customWidthMm = 210,
  customHeightMm = 297
) => {
  let base;
  if (paperSizeKey === 'custom') {
    base = {
      widthMm: parseFloat(customWidthMm) || 210,
      heightMm: parseFloat(customHeightMm) || 297,
    };
  } else {
    base = PAPER_SIZES[paperSizeKey] || PAPER_SIZES.a4;
  }

  if (orientation === 'landscape') {
    return {
      widthMm: base.heightMm,
      heightMm: base.widthMm,
    };
  }
  return {
    widthMm: base.widthMm,
    heightMm: base.heightMm,
  };
};

/**
 * Calculate if label sheet configuration fits within paper bounds
 */
export const validateSheetFit = (config) => {
  const { widthMm, heightMm } = getPaperDimensions(
    config.paper_size,
    config.orientation,
    config.custom_width,
    config.custom_height
  );

  const cols = parseInt(config.columns, 10) || 1;
  const rows = parseInt(config.rows, 10) || 1;
  const labelW = parseFloat(config.label_width) || 0;
  const labelH = parseFloat(config.label_height) || 0;
  const topM = parseFloat(config.margin_top) || 0;
  const leftM = parseFloat(config.margin_left) || 0;
  const gapH = parseFloat(config.gap_horizontal) || 0;
  const gapV = parseFloat(config.gap_vertical) || 0;

  const totalWidth = leftM + cols * labelW + (cols - 1) * gapH;
  const totalHeight = topM + rows * labelH + (rows - 1) * gapV;

  const widthOverflow = totalWidth > widthMm;
  const heightOverflow = totalHeight > heightMm;

  return {
    isValid: !widthOverflow && !heightOverflow,
    totalWidth: parseFloat(totalWidth.toFixed(2)),
    totalHeight: parseFloat(totalHeight.toFixed(2)),
    paperWidth: widthMm,
    paperHeight: heightMm,
    widthOverflow,
    heightOverflow,
    message: widthOverflow || heightOverflow
      ? `Sheet layout (${totalWidth.toFixed(1)} × ${totalHeight.toFixed(1)} mm) exceeds ${config.paper_size.toUpperCase()} paper dimensions (${widthMm} × ${heightMm} mm).`
      : null,
  };
};

/**
 * Build auto-grid matching design dimensions
 */
export const calculateAutoGrid = (designWidthMm, designHeightMm, config) => {
  const { widthMm, heightMm } = getPaperDimensions(
    config.paper_size,
    config.orientation,
    config.custom_width,
    config.custom_height
  );

  const leftM = parseFloat(config.margin_left) || 8;
  const topM = parseFloat(config.margin_top) || 10;
  const gapH = parseFloat(config.gap_horizontal) || 2;
  const gapV = parseFloat(config.gap_vertical) || 2;

  const availableW = Math.max(10, widthMm - 2 * leftM);
  const availableH = Math.max(10, heightMm - 2 * topM);

  const cols = Math.max(1, Math.floor((availableW + gapH) / (designWidthMm + gapH)));
  const rows = Math.max(1, Math.floor((availableH + gapV) / (designHeightMm + gapV)));

  return {
    columns: cols,
    rows: rows,
    label_width: parseFloat(designWidthMm.toFixed(2)),
    label_height: parseFloat(designHeightMm.toFixed(2)),
    margin_left: leftM,
    margin_top: topM,
    gap_horizontal: gapH,
    gap_vertical: gapV,
  };
};

/**
 * Distribute chosen items (with copy counts) across multi-page sheets considering startPosition
 */
export const paginateLabels = (items = [], config, startPosition = 1) => {
  const cols = parseInt(config.columns, 10) || 1;
  const rows = parseInt(config.rows, 10) || 1;
  const labelsPerSheet = cols * rows;

  // Flatten items by copy count
  const flattened = [];
  items.forEach((item) => {
    const copies = parseInt(item.copies, 10) || 1;
    for (let c = 0; c < copies; c++) {
      flattened.push(item);
    }
  });

  const totalLabels = flattened.length;
  if (totalLabels === 0) {
    return {
      pages: [],
      totalLabels: 0,
      totalPages: 0,
      labelsPerSheet,
    };
  }

  const pages = [];
  let itemIndex = 0;
  let pageIndex = 0;

  while (itemIndex < totalLabels) {
    const pageCells = [];
    const isFirstPage = pageIndex === 0;
    const startIndex = isFirstPage ? Math.max(1, Math.min(startPosition, labelsPerSheet)) : 1;

    for (let slot = 1; slot <= labelsPerSheet; slot++) {
      // Prior slots on first page before startPosition remain empty
      if (isFirstPage && slot < startIndex) {
        pageCells.push({
          slot,
          isEmpty: true,
          isUsedSlot: true,
          item: null,
        });
      } else if (itemIndex < totalLabels) {
        pageCells.push({
          slot,
          isEmpty: false,
          isUsedSlot: false,
          item: flattened[itemIndex],
        });
        itemIndex++;
      } else {
        // Blank slots at the end of the last page
        pageCells.push({
          slot,
          isEmpty: true,
          isUsedSlot: false,
          item: null,
        });
      }
    }

    pages.push({
      pageNumber: pageIndex + 1,
      cells: pageCells,
    });
    pageIndex++;
  }

  return {
    pages,
    totalLabels,
    totalPages: pages.length,
    labelsPerSheet,
  };
};

/**
 * Load an image URL to an HTMLImageElement for canvas/pdf rendering
 */
export const loadImg = (url) => {
  return new Promise((resolve, reject) => {
    if (!url) {
      return reject(new Error('No image URL'));
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = url;
  });
};

/**
 * Generate 300 DPI PDF document using jsPDF matching the sheet layout exactly
 */
export const exportSheetPdf = async ({
  config,
  pages = [],
  placement = {},
  onProgress,
}) => {
  const { widthMm, heightMm } = getPaperDimensions(
    config.paper_size,
    config.orientation,
    config.custom_width,
    config.custom_height
  );
  const orientation = config.orientation === 'landscape' ? 'landscape' : 'portrait';

  const doc = new jsPDF({
    orientation,
    unit: 'mm',
    format: [widthMm, heightMm],
    compress: true,
  });

  const cols = parseInt(config.columns, 10) || 1;
  const rows = parseInt(config.rows, 10) || 1;
  const labelW = parseFloat(config.label_width) || 0;
  const labelH = parseFloat(config.label_height) || 0;
  const topM = parseFloat(config.margin_top) || 0;
  const leftM = parseFloat(config.margin_left) || 0;
  const gapH = parseFloat(config.gap_horizontal) || 0;
  const gapV = parseFloat(config.gap_vertical) || 0;
  const cornerR = parseFloat(config.corner_radius) || 0;

  const fitMode = placement.fit || 'fit'; // 'original' | 'fit' | 'fill'
  const paddingMm = parseFloat(placement.padding) || 1.5;
  const showBorders = Boolean(placement.showBorders);

  // Cache loaded images
  const imageCache = new Map();

  for (let pIdx = 0; pIdx < pages.length; pIdx++) {
    if (pIdx > 0) {
      doc.addPage([widthMm, heightMm], orientation);
    }

    if (onProgress) {
      onProgress(pIdx + 1, pages.length);
    }

    const page = pages[pIdx];

    for (let cIdx = 0; cIdx < page.cells.length; cIdx++) {
      const cell = page.cells[cIdx];
      const slotIndex = cell.slot - 1;
      const col = slotIndex % cols;
      const row = Math.floor(slotIndex / cols);

      const cellX = leftM + col * (labelW + gapH);
      const cellY = topM + row * (labelH + gapV);

      // Draw label outline if requested
      if (showBorders) {
        doc.setDrawColor(210, 215, 225);
        doc.setLineWidth(0.15);
        if (cornerR > 0) {
          doc.roundedRect(cellX, cellY, labelW, labelH, cornerR, cornerR);
        } else {
          doc.rect(cellX, cellY, labelW, labelH);
        }
      }

      // Draw item if slot is not empty
      if (!cell.isEmpty && cell.item?.preview_url) {
        try {
          const url = cell.item.preview_url;
          let img = imageCache.get(url);
          if (!img) {
            img = await loadImg(url);
            imageCache.set(url, img);
          }

          // Available inner cell area after padding
          const innerX = cellX + paddingMm;
          const innerY = cellY + paddingMm;
          const innerW = Math.max(1, labelW - 2 * paddingMm);
          const innerH = Math.max(1, labelH - 2 * paddingMm);

          const imgAspect = (img.naturalWidth || 1) / (img.naturalHeight || 1);
          const innerAspect = innerW / innerH;

          let targetW = innerW;
          let targetH = innerH;
          let targetX = innerX;
          let targetY = innerY;

          if (fitMode === 'original') {
            // Calculate natural size from artboard settings if available
            const artboard = cell.item.settings?.artboard;
            if (artboard?.width && artboard?.height && artboard?.unit) {
              const origWMm = convertUnit(artboard.width, artboard.unit, 'mm');
              const origHMm = convertUnit(artboard.height, artboard.unit, 'mm');
              targetW = Math.min(origWMm, innerW);
              targetH = Math.min(origHMm, innerH);
            } else {
              targetW = Math.min(innerW, innerH * imgAspect);
              targetH = targetW / imgAspect;
            }
            targetX = innerX + (innerW - targetW) / 2;
            targetY = innerY + (innerH - targetH) / 2;
          } else if (fitMode === 'fill') {
            targetW = innerW;
            targetH = innerH;
            targetX = innerX;
            targetY = innerY;
          } else {
            // 'fit' (preserve aspect ratio)
            if (imgAspect > innerAspect) {
              targetW = innerW;
              targetH = innerW / imgAspect;
            } else {
              targetH = innerH;
              targetW = innerH * imgAspect;
            }
            targetX = innerX + (innerW - targetW) / 2;
            targetY = innerY + (innerH - targetH) / 2;
          }

          doc.addImage(img, 'PNG', targetX, targetY, targetW, targetH, undefined, 'FAST');
        } catch (err) {
          console.warn('Could not draw label image in PDF:', err);
        }
      }
    }
  }

  const today = new Date().toISOString().split('T')[0];
  const filename = `labels_${config.paper_size}_${config.columns}x${config.rows}_${today}.pdf`;
  doc.save(filename);
};
