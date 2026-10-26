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
 * Capture an element as a Blob using html-to-image
 */
export const captureElementAsBlob = async (element) => {
  if (!element) return null;
  return await toBlob(element, {
    cacheBust: true,
    pixelRatio: 2,
    backgroundColor: '#ffffff',
  });
};

/**
 * Download a DOM element as a high-res PNG image
 */
export const downloadElementAsPng = async (element, filename = 'code.png') => {
  if (!element) return;
  const dataUrl = await toPng(element, {
    cacheBust: true,
    pixelRatio: 2,
    backgroundColor: '#ffffff',
  });
  downloadFile(dataUrl, filename);
};

/**
 * Download an SVG element directly as a standalone .svg file
 */
export const downloadSvgElement = (svgElement, filename = 'barcode.svg') => {
  if (!svgElement) return;

  const clone = svgElement.cloneNode(true);
  if (!clone.getAttribute('xmlns')) {
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  }
  if (!clone.getAttribute('xmlns:xlink')) {
    clone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
  }

  const serializer = new XMLSerializer();
  const source = '<?xml version="1.0" encoding="utf-8" standalone="no"?>\r\n' + serializer.serializeToString(clone);
  const svgBlob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);
  downloadFile(url, filename);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
