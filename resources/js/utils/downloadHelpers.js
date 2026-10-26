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
  return await toBlob(element, {
    cacheBust: true,
    pixelRatio: pixelRatio > 0 ? pixelRatio : 2,
    backgroundColor: '#ffffff',
  });
};

/**
 * Download a DOM element as a high-res PNG image at the requested physical size & DPI
 */
export const downloadElementAsPng = async (element, filename = 'code.png', dpi = 300) => {
  if (!element) return;
  const pixelRatio = dpi / 96;
  const dataUrl = await toPng(element, {
    cacheBust: true,
    pixelRatio: pixelRatio > 0 ? pixelRatio : 2,
    backgroundColor: '#ffffff',
  });
  downloadFile(dataUrl, filename);
};

/**
 * Download an SVG element directly as a standalone .svg file with physical units
 */
export const downloadSvgElement = (
  svgElement,
  filename = 'barcode.svg',
  physicalWidth = null,
  physicalHeight = null,
  unit = 'px'
) => {
  if (!svgElement) return;

  const clone = svgElement.cloneNode(true);
  if (!clone.getAttribute('xmlns')) {
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  }
  if (!clone.getAttribute('xmlns:xlink')) {
    clone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
  }

  // Ensure viewBox exists to preserve aspect ratio and scalability
  const originalWidth = clone.getAttribute('width') || clone.getBoundingClientRect()?.width || 200;
  const originalHeight = clone.getAttribute('height') || clone.getBoundingClientRect()?.height || 100;

  if (!clone.getAttribute('viewBox')) {
    clone.setAttribute('viewBox', `0 0 ${originalWidth} ${originalHeight}`);
  }

  // If physical units specified, apply them (e.g. width="50mm" or width="5cm")
  if (physicalWidth && physicalHeight) {
    if (unit !== 'px') {
      clone.setAttribute('width', `${physicalWidth}${unit}`);
      clone.setAttribute('height', `${physicalHeight}${unit}`);
    } else {
      clone.setAttribute('width', `${Math.round(physicalWidth)}px`);
      clone.setAttribute('height', `${Math.round(physicalHeight)}px`);
    }
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
