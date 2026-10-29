import { toPng, toBlob } from 'html-to-image';

/**
 * Trigger file download in browser
 */
export const downloadFile = (url, filename) => {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Capture an element as a Blob using html-to-image at given DPI
 */
export const captureElementAsBlob = async (element, dpi = 300) => {
  if (!element) return null;
  const pixelRatio = dpi / 96;
  try {
    return await toBlob(element, {
      cacheBust: true,
      skipFonts: true,
      fontEmbedCSS: '',
      pixelRatio: pixelRatio > 0 ? pixelRatio : 2,
      backgroundColor: '#ffffff',
    });
  } catch (err) {
    console.warn('html-to-image toBlob warning, falling back without pixelRatio:', err);
    return await toBlob(element, {
      cacheBust: true,
      skipFonts: true,
      fontEmbedCSS: '',
      backgroundColor: '#ffffff',
    });
  }
};

/**
 * Download a DOM element as a high-res PNG image at the requested physical size & DPI
 */
export const downloadElementAsPng = async (element, filename = 'code.png', dpi = 300) => {
  if (!element) return;
  const pixelRatio = dpi / 96;
  try {
    const dataUrl = await toPng(element, {
      cacheBust: true,
      skipFonts: true,
      fontEmbedCSS: '',
      pixelRatio: pixelRatio > 0 ? pixelRatio : 2,
      backgroundColor: '#ffffff',
    });
    downloadFile(dataUrl, filename);
  } catch (err) {
    console.warn('html-to-image toPng fallback:', err);
    const dataUrl = await toPng(element, {
      cacheBust: true,
      skipFonts: true,
      fontEmbedCSS: '',
      backgroundColor: '#ffffff',
    });
    downloadFile(dataUrl, filename);
  }
};

/**
 * Download an SVG element directly as a standalone .svg file with physical units
 */
export const downloadSvgElement = (
  svgElement,
  filename = 'barcode.svg',
  physicalWidth = null,
  physicalHeight = null,
  unit = 'px',
  labelOptions = null
) => {
  if (!svgElement) return;

  const clone = svgElement.cloneNode(true);
  if (!clone.getAttribute('xmlns')) {
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  }
  if (!clone.getAttribute('xmlns:xlink')) {
    clone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
  }

  let originalWidth = parseFloat(clone.getAttribute('width')) || clone.getBoundingClientRect()?.width || 200;
  let originalHeight = parseFloat(clone.getAttribute('height')) || clone.getBoundingClientRect()?.height || 100;

  if (labelOptions?.text) {
    const fontUnit = labelOptions.fontUnit || 'pt';
    const fontSize = parseFloat(labelOptions.fontSize) || 12;
    const fontSizePx = fontUnit === 'pt' ? (fontSize * 96) / 72 : fontSize;
    const gap = Math.max(0, parseFloat(labelOptions.gap) || 4);
    const weight = labelOptions.weight === 'bold' ? 'bold' : 'normal';
    const align = labelOptions.align || 'center';

    const textX = align === 'center' ? originalWidth / 2 : align === 'right' ? originalWidth : 0;
    const anchor = align === 'center' ? 'middle' : align === 'right' ? 'end' : 'start';

    const lines = String(labelOptions.text).split('\n');
    lines.forEach((line, idx) => {
      const textElem = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      const textY = originalHeight + gap + (fontSizePx * 0.85) + (idx * fontSizePx * 1.3);
      textElem.setAttribute('x', textX);
      textElem.setAttribute('y', textY);
      textElem.setAttribute('text-anchor', anchor);
      textElem.setAttribute('font-size', `${fontSizePx}px`);
      textElem.setAttribute('font-weight', weight);
      textElem.setAttribute('font-family', 'system-ui, -apple-system, sans-serif');
      textElem.setAttribute('fill', labelOptions.color || '#0F172A');
      textElem.textContent = line;
      clone.appendChild(textElem);
      if (idx === lines.length - 1) {
        originalHeight = textY + fontSizePx * 0.35;
      }
    });
  }

  clone.setAttribute('viewBox', `0 0 ${originalWidth} ${originalHeight}`);

  // If physical units specified, apply them (e.g. width="50mm" or width="5cm")
  if (physicalWidth && physicalHeight) {
    if (unit !== 'px') {
      clone.setAttribute('width', `${physicalWidth}${unit}`);
      clone.setAttribute('height', `${physicalHeight}${unit}`);
    } else {
      clone.setAttribute('width', `${Math.round(physicalWidth)}px`);
      clone.setAttribute('height', `${Math.round(physicalHeight)}px`);
    }
  } else {
    clone.setAttribute('width', `${Math.round(originalWidth)}px`);
    clone.setAttribute('height', `${Math.round(originalHeight)}px`);
  }

  const serializer = new XMLSerializer();
  const source =
    '<?xml version="1.0" encoding="utf-8" standalone="no"?>\r\n' +
    serializer.serializeToString(clone);
  const svgBlob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);
  downloadFile(url, filename);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

/**
 * Download complete artboard (canvas + code + label) as standalone .svg file
 */
export const downloadArtboardSvg = ({
  artboardWidth,
  artboardHeight,
  unit = 'mm',
  background = '#ffffff',
  border = null,
  radius = 0,
  codeSvgElement = null,
  codeX = 0,
  codeY = 0,
  fitScale = 1,
  filename = 'artboard.svg',
  labelOptions = null,
  codeRawWidth = 260,
  codeRawHeight = 100,
}) => {
  // Convert physical artboard size to 96 DPI viewBox pixels
  let artboardPxW = artboardWidth;
  let artboardPxH = artboardHeight;
  if (unit === 'inch') {
    artboardPxW = artboardWidth * 96;
    artboardPxH = artboardHeight * 96;
  } else if (unit === 'cm') {
    artboardPxW = artboardWidth * (96 / 2.54);
    artboardPxH = artboardHeight * (96 / 2.54);
  } else if (unit === 'mm') {
    artboardPxW = artboardWidth * (96 / 25.4);
    artboardPxH = artboardHeight * (96 / 25.4);
  }

  const radiusPx = radius || 0;
  const strokeColor = border?.enabled ? border.color || '#cbd5e1' : 'none';
  const strokeWidth = border?.enabled ? border.width || 1 : 0;

  let codeInnerXml = '';
  if (codeSvgElement) {
    const clone = codeSvgElement.cloneNode(true);
    if (labelOptions?.numberColor) {
      const texts = clone.querySelectorAll('text');
      texts.forEach((t) => t.setAttribute('fill', labelOptions.numberColor));
    }
    codeInnerXml = clone.outerHTML || new XMLSerializer().serializeToString(clone);
  }

  let labelXml = '';
  if (labelOptions?.text) {
    const fontUnit = labelOptions.fontUnit || 'pt';
    const fontSize = parseFloat(labelOptions.fontSize) || 12;
    const fontSizePx = fontUnit === 'pt' ? (fontSize * 96) / 72 : fontSize;
    const gap = Math.max(0, parseFloat(labelOptions.gap) || 4);
    const weight = labelOptions.weight === 'bold' ? 'bold' : 'normal';
    const align = labelOptions.align || 'center';

    const textX = align === 'center' ? codeRawWidth / 2 : align === 'right' ? codeRawWidth : 0;
    const anchor = align === 'center' ? 'middle' : align === 'right' ? 'end' : 'start';

    const lines = String(labelOptions.text).split('\n');
    labelXml = lines
      .map((line, idx) => {
        const lineY = codeRawHeight + gap + (fontSizePx * 0.85) + (idx * fontSizePx * 1.3);
        const escaped = String(line)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;');
        return `<text x="${textX}" y="${lineY}" text-anchor="${anchor}" font-size="${fontSizePx}" font-weight="${weight}" font-family="system-ui, -apple-system, sans-serif" fill="${labelOptions.color || '#0F172A'}">${escaped}</text>`;
      })
      .join('\n    ');
  }

  const svgContent = `<?xml version="1.0" encoding="utf-8" standalone="no"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
     width="${unit !== 'px' ? `${artboardWidth}${unit}` : `${Math.round(artboardPxW)}px`}"
     height="${unit !== 'px' ? `${artboardHeight}${unit}` : `${Math.round(artboardPxH)}px`}"
     viewBox="0 0 ${artboardPxW} ${artboardPxH}">
  <rect width="100%" height="100%" rx="${radiusPx}" ry="${radiusPx}"
        fill="${background || '#ffffff'}"
        stroke="${strokeColor}"
        stroke-width="${strokeWidth}" />
  <g transform="translate(${codeX}, ${codeY}) scale(${fitScale})">
    ${codeInnerXml}
    ${labelXml}
  </g>
</svg>`;

  const svgBlob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);
  downloadFile(url, filename);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
