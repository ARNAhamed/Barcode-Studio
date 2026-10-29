import JsBarcode from 'jsbarcode';
import QRCodeStyling from 'qr-code-styling';
import { toBlob, toPng } from 'html-to-image';
import { toPx, convertUnit } from './units';
import { fillPlaceholders } from './placeholders';

/**
 * Calculates luminance for a hex color (0 to 1)
 */
export function getLuminance(hex) {
  if (!hex || typeof hex !== 'string') return 0;
  const clean = hex.replace('#', '');
  if (clean.length < 6) return 0;
  const r = parseInt(clean.substring(0, 2), 16) / 255;
  const g = parseInt(clean.substring(2, 4), 16) / 255;
  const b = parseInt(clean.substring(4, 6), 16) / 255;
  if (isNaN(r) || isNaN(g) || isNaN(b)) return 0;
  const a = [r, g, b].map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
  return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
}

/**
 * Calculates contrast ratio between two hex colors (1 to 21)
 */
export function getContrastRatio(hex1, hex2) {
  const lum1 = getLuminance(hex1);
  const lum2 = getLuminance(hex2);
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  return (brightest + 0.05) / (darkest + 0.05);
}

/**
 * Resolves effective label color with backward-compatible fallbacks.
 */
export function resolveLabelColor(settings = {}, type = 'barcode') {
  if (settings.labelColor) return settings.labelColor;
  if (settings.label_color) return settings.label_color;
  if (settings.label && typeof settings.label === 'object' && settings.label.color) {
    return settings.label.color;
  }
  if (type === 'barcode') {
    return settings.lineColor || '#000000';
  }
  return settings.foreground || '#0F172A';
}

/**
 * Generates an unscaled, unclipped offscreen render of the complete artboard.
 * Guaranteed to capture the full code matrix, label text, margins, and borders,
 * completely immune to on-screen zoom, pan, pane overflow, or exportCodeOnly flags.
 *
 * @param {Object} options
 * @param {'barcode'|'qr'} [options.type='barcode']
 * @param {string} [options.format='CODE128']
 * @param {string} [options.value='']
 * @param {Object} [options.settings={}]
 * @param {Object} [options.artboardSettings={}]
 * @param {string} [options.labelText='']
 * @param {Object} [options.product=null]
 * @param {number} [options.pixelRatio=2]
 * @param {number} [options.maxDimension=1200]
 * @param {boolean} [options.asDataUrl=false]
 * @returns {Promise<Blob|string|null>}
 */
export async function renderArtboardOffscreen({
  type = 'barcode',
  format = 'CODE128',
  value = '',
  settings = {},
  artboardSettings = {},
  labelText = '',
  product = null,
  pixelRatio = 2,
  maxDimension = 1200,
  asDataUrl = false,
}) {
  const cleanValue = String(value || '').trim() || (type === 'barcode' ? '123456789012' : 'https://example.com');

  // Resolve label text
  let rawText = labelText;
  if (rawText === undefined || rawText === null || rawText === '') {
    if (typeof settings.label === 'string') {
      rawText = settings.label;
    } else if (settings.label && typeof settings.label === 'object' && settings.label.text) {
      rawText = settings.label.text;
    }
  }
  if (product && rawText) {
    rawText = fillPlaceholders(rawText, product);
  }
  const resolvedText = String(rawText || '').trim();
  const hasLabel = Boolean(resolvedText);

  // Units and dimensions
  const codeUnit = settings.unit || 'mm';
  const codeRawPxWidth =
    type === 'barcode'
      ? toPx(settings.width || 45, codeUnit)
      : toPx(settings.size || 25, codeUnit);
  const codeRawPxHeight =
    type === 'barcode'
      ? toPx(settings.height || 15, codeUnit)
      : toPx(settings.size || 25, codeUnit);

  // Label Typography
  const labelFontUnit = settings.labelFontUnit || 'pt';
  const labelFontSize = Number(settings.labelFontSize || (labelFontUnit === 'pt' ? 11 : 14));
  const labelFontSizePx = labelFontUnit === 'pt' ? (labelFontSize * 96) / 72 : labelFontSize;
  const labelGapPx = hasLabel ? Math.max(0, Number(settings.labelGap !== undefined ? settings.labelGap : 4)) : 0;
  const labelWeight = settings.labelWeight === 'bold' ? 'bold' : 'normal';
  const labelAlign = settings.labelAlign || 'center';
  const effectiveLabelColor = resolveLabelColor(settings, type);

  // Estimate label sizing and word-boundary wrapping
  const estimatedCharWidth = labelFontSizePx * 0.55;
  const explicitLines = hasLabel ? resolvedText.split('\n') : [];
  let maxSingleWordLen = 0;
  let maxLineCharCount = 0;
  explicitLines.forEach((line) => {
    const trimmed = line.trim();
    if (trimmed.length > maxLineCharCount) maxLineCharCount = trimmed.length;
    const words = trimmed.split(/\s+/);
    words.forEach((w) => {
      if (w.length > maxSingleWordLen) maxSingleWordLen = w.length;
    });
  });

  const isAuto = !artboardSettings || artboardSettings.preset === 'auto';
  const artboardUnit = artboardSettings?.unit || 'mm';

  // In auto mode, grow artboard width to fit label up to a sensible limit (e.g. 2.5x code width or ~280px)
  let autoArtboardWidth = Math.max(40, Math.round(codeRawPxWidth));
  if (isAuto && hasLabel) {
    const neededLabelPx = Math.round(maxLineCharCount * estimatedCharWidth + 16);
    const maxAutoGrowth = Math.max(codeRawPxWidth * 2.2, 260);
    autoArtboardWidth = Math.min(maxAutoGrowth, Math.max(codeRawPxWidth, neededLabelPx));
  }

  const artboardPxWidth = isAuto
    ? autoArtboardWidth
    : Math.max(20, Math.round(toPx(artboardSettings.width || 60, artboardUnit)));
  const paddingPx = isAuto
    ? 0
    : toPx(artboardSettings.padding !== undefined ? artboardSettings.padding : 5, artboardUnit);
  const availWidth = Math.max(10, artboardPxWidth - 2 * paddingPx);

  // Calculate label container width (inner width) and handle single word shrinking if needed
  const labelContainerWidth = isAuto ? autoArtboardWidth : availWidth;
  const longestWordPx = maxSingleWordLen * estimatedCharWidth;
  const singleWordScale = longestWordPx > labelContainerWidth && labelContainerWidth > 20
    ? Math.max(0.65, (labelContainerWidth - 8) / longestWordPx)
    : 1;
  const effectiveLabelFontSizePx = Math.round(labelFontSizePx * singleWordScale);
  const effectiveCharWidth = effectiveLabelFontSizePx * 0.55;

  let totalLabelLines = 0;
  explicitLines.forEach((line) => {
    const lineW = line.trim().length * effectiveCharWidth;
    const wrapped = lineW > labelContainerWidth ? Math.ceil(lineW / Math.max(40, labelContainerWidth)) : 1;
    totalLabelLines += wrapped;
  });
  totalLabelLines = Math.max(explicitLines.length, totalLabelLines);
  const labelPxHeight = hasLabel ? Math.round(effectiveLabelFontSizePx * 1.35 * totalLabelLines) : 0;

  const totalRawPxWidth = isAuto ? autoArtboardWidth : Math.max(40, Math.round(codeRawPxWidth));
  const totalRawPxHeight = Math.max(20, Math.round(codeRawPxHeight + (hasLabel ? labelGapPx + labelPxHeight : 0)));

  const artboardPxHeight = isAuto
    ? totalRawPxHeight
    : Math.max(20, Math.round(toPx(artboardSettings.height || 40, artboardUnit)));
  const availHeight = Math.max(10, artboardPxHeight - 2 * paddingPx);

  const fitMode = artboardSettings?.fit || 'original';
  let fitScale = 1;
  if (!isAuto && fitMode === 'fill-width') {
    fitScale = availWidth / totalRawPxWidth;
  } else if (!isAuto && fitMode === 'fit') {
    fitScale = Math.min(availWidth / totalRawPxWidth, availHeight / totalRawPxHeight);
  }

  const scaledContentW = totalRawPxWidth * fitScale;
  const scaledContentH = totalRawPxHeight * fitScale;

  let baseX = (artboardPxWidth - scaledContentW) / 2;
  let baseY = (artboardPxHeight - scaledContentH) / 2;
  const alignment = artboardSettings?.alignment || 'center';

  if (!isAuto) {
    if (alignment.includes('left')) baseX = paddingPx;
    if (alignment.includes('right')) baseX = artboardPxWidth - paddingPx - scaledContentW;
    if (alignment.startsWith('top')) baseY = paddingPx;
    if (alignment.startsWith('bottom')) baseY = artboardPxHeight - paddingPx - scaledContentH;
  }

  const codeX = Math.round(baseX + (artboardSettings?.xOffset || 0));
  const codeY = Math.round(baseY + (artboardSettings?.yOffset || 0));

  // Determine separate code background and artboard background
  // Backward compatibility: if artboard background is not set, map old settings.background
  const artboardBg = artboardSettings?.background !== undefined
    ? artboardSettings.background
    : (settings.background || '#ffffff');

  const rawCodeBg = settings.codeBackground !== undefined
    ? settings.codeBackground
    : (settings.background || '#ffffff');
  const codeBg = rawCodeBg === 'transparent' ? 'transparent' : rawCodeBg;

  const borderEnabled = Boolean(artboardSettings?.border?.enabled);
  const borderWidth = borderEnabled ? parseInt(artboardSettings.border.width, 10) || 1 : 0;
  const borderColor = borderEnabled ? artboardSettings.border.color || '#D1D5DB' : 'transparent';
  const borderRadius = parseInt(artboardSettings?.radius, 10) || 0;

  // Build offscreen container
  const host = document.createElement('div');
  host.style.position = 'fixed';
  host.style.left = '-9999px';
  host.style.top = '0';
  host.style.width = `${artboardPxWidth}px`;
  host.style.height = `${artboardPxHeight}px`;
  host.style.pointerEvents = 'none';
  host.style.zIndex = '-9999';
  host.style.margin = '0';
  host.style.padding = '0';
  host.style.boxSizing = 'border-box';
  host.style.overflow = 'visible';

  // Physical Artboard element
  const artboard = document.createElement('div');
  artboard.style.width = `${artboardPxWidth}px`;
  artboard.style.height = `${artboardPxHeight}px`;
  artboard.style.backgroundColor = artboardBg;
  artboard.style.border = borderEnabled ? `${borderWidth}px solid ${borderColor}` : 'none';
  artboard.style.borderRadius = `${borderRadius}px`;
  artboard.style.position = 'relative';
  artboard.style.overflow = 'hidden';
  artboard.style.boxSizing = 'border-box';
  host.appendChild(artboard);

  // Content wrapper
  const contentWrapper = document.createElement('div');
  contentWrapper.style.position = isAuto ? 'static' : 'absolute';
  if (!isAuto) {
    contentWrapper.style.left = `${codeX}px`;
    contentWrapper.style.top = `${codeY}px`;
  }
  contentWrapper.style.width = `${totalRawPxWidth}px`;
  contentWrapper.style.height = `${totalRawPxHeight}px`;
  if (!isAuto && fitScale !== 1) {
    contentWrapper.style.transform = `scale(${fitScale})`;
    contentWrapper.style.transformOrigin = 'top left';
  }
  contentWrapper.style.display = 'flex';
  contentWrapper.style.flexDirection = 'column';
  contentWrapper.style.alignItems = 'center';
  contentWrapper.style.justifyContent = 'center';
  artboard.appendChild(contentWrapper);

  try {
    if (type === 'barcode') {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.style.maxWidth = '100%';
      svg.style.height = 'auto';
      svg.style.display = 'block';
      contentWrapper.appendChild(svg);

      const targetFormat = format || settings.format || 'CODE128';
      const displayVal = Boolean(settings.displayValue ?? true);
      const numberColor = settings.numberColor || settings.lineColor || '#000000';

      JsBarcode(svg, cleanValue, {
        format: targetFormat,
        width: 2,
        height: Math.max(20, Math.round(codeRawPxHeight * 0.7)),
        displayValue: displayVal,
        font: 'monospace',
        fontSize: settings.fontSize || 14,
        textMargin: 4,
        margin: settings.margin ?? 6,
        background: codeBg === 'transparent' ? 'rgba(0,0,0,0)' : codeBg,
        lineColor: settings.lineColor || '#000000',
      });

      // Barcode number follows numberColor (or lineColor), NOT labelColor
      if (displayVal && numberColor) {
        svg.querySelectorAll('text').forEach((textEl) => {
          textEl.setAttribute('fill', numberColor);
          textEl.style.fill = numberColor;
        });
      }
    } else {
      const qrContainer = document.createElement('div');
      qrContainer.style.display = 'flex';
      qrContainer.style.justifyContent = 'center';
      qrContainer.style.alignItems = 'center';
      qrContainer.style.width = '100%';
      contentWrapper.appendChild(qrContainer);

      const qrCode = new QRCodeStyling({
        type: 'svg',
        width: Math.round(codeRawPxWidth),
        height: Math.round(codeRawPxHeight),
        data: cleanValue,
        dotsOptions: {
          color: settings.foreground || '#0F172A',
          type: settings.dotStyle || 'rounded',
        },
        cornersSquareOptions: {
          color: settings.foreground || '#0F172A',
          type: settings.cornerStyle || 'extra-rounded',
        },
        backgroundOptions: {
          color: codeBg,
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

      qrCode.append(qrContainer);

      // Apply shape-rendering crispEdges for square dots to ensure extreme sharpness
      setTimeout(() => {
        const svgEl = qrContainer.querySelector('svg');
        if (svgEl) {
          svgEl.style.width = `${Math.round(codeRawPxWidth)}px`;
          svgEl.style.height = `${Math.round(codeRawPxHeight)}px`;
          if (settings.dotStyle === 'square') {
            svgEl.querySelectorAll('rect').forEach((r) => r.setAttribute('shape-rendering', 'crispEdges'));
          }
        }
      }, 0);
    }

    // Append label text if present
    if (hasLabel) {
      const labelDiv = document.createElement('div');
      labelDiv.style.marginTop = `${labelGapPx}px`;
      labelDiv.style.fontSize = `${effectiveLabelFontSizePx}px`;
      labelDiv.style.fontWeight = labelWeight;
      labelDiv.style.textAlign = labelAlign;
      labelDiv.style.color = effectiveLabelColor;
      labelDiv.style.maxWidth = `${Math.round(labelContainerWidth)}px`;
      labelDiv.style.width = '100%';
      labelDiv.style.fontFamily = 'Inter, system-ui, -apple-system, sans-serif';
      labelDiv.style.lineHeight = '1.25';
      labelDiv.style.wordBreak = 'normal';
      labelDiv.style.overflowWrap = 'break-word';
      labelDiv.style.hyphens = 'none';

      explicitLines.forEach((line) => {
        const p = document.createElement('p');
        p.textContent = line;
        p.style.margin = '0';
        p.style.padding = '0';
        p.style.lineHeight = '1.25';
        p.style.color = effectiveLabelColor;
        p.style.wordBreak = 'normal';
        p.style.overflowWrap = 'break-word';
        labelDiv.appendChild(p);
      });

      contentWrapper.appendChild(labelDiv);
    }

    document.body.appendChild(host);

    // Wait for fonts and svg/canvas rendering to flush
    if (document.fonts?.ready) {
      try {
        await document.fonts.ready;
      } catch (e) {
        // ignore font wait errors
      }
    }

    // Give QR styling a tick to render SVG
    await new Promise((resolve) => setTimeout(resolve, type === 'qr' ? 60 : 30));

    // Calculate capped pixel ratio to prevent memory spikes
    const longestSide = Math.max(artboardPxWidth, artboardPxHeight);
    let effectiveRatio = pixelRatio || 2;
    if (longestSide * effectiveRatio > maxDimension) {
      effectiveRatio = Math.max(1, parseFloat((maxDimension / longestSide).toFixed(2)));
    }

    if (asDataUrl) {
      return await toPng(artboard, {
        cacheBust: true,
        pixelRatio: effectiveRatio,
        backgroundColor: artboardBg,
      });
    }

    return await toBlob(artboard, {
      cacheBust: true,
      pixelRatio: effectiveRatio,
      backgroundColor: artboardBg,
    });
  } catch (err) {
    console.error('renderArtboardOffscreen failed:', err);
    return null;
  } finally {
    if (host && host.parentNode) {
      host.parentNode.removeChild(host);
    }
  }
}
