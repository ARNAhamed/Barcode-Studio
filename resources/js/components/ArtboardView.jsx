import React, { useEffect, useRef, useMemo } from 'react';
import JsBarcode from 'jsbarcode';
import QRCodeStyling from 'qr-code-styling';
import { toPx } from '../utils/units';
import { fillPlaceholders } from '../utils/placeholders';
import { resolveLabelColor } from '../utils/artboardRenderer';

export default function ArtboardView({
  item,
  placement = {},
  className = '',
  style = {},
}) {
  const barcodeSvgRef = useRef(null);
  const qrContainerRef = useRef(null);

  const type = item?.type || 'barcode';
  const format = item?.format || (type === 'qr' ? 'QR' : 'CODE128');
  const value = item?.value || '';
  const settings = item?.settings || {};
  const artboardSettings = settings.artboard || {};

  // Check if item has enough settings for live rendering
  const canLiveRender = Boolean(value && (type === 'barcode' || type === 'qr'));

  // Label text resolution
  const resolvedLabel = useMemo(() => {
    let raw = settings.label;
    if (raw && typeof raw === 'object' && raw.text) {
      raw = raw.text;
    }
    if (typeof raw !== 'string') {
      raw = item?.label_text || '';
    }
    if (item?.product && raw) {
      return fillPlaceholders(raw, item.product);
    }
    return raw || '';
  }, [settings.label, item?.product, item?.label_text]);

  const hasLabel = Boolean(resolvedLabel && resolvedLabel.trim());

  // Dimensions
  const codeUnit = settings.unit || 'mm';
  const codeRawPxWidth =
    type === 'barcode'
      ? toPx(settings.width || 45, codeUnit)
      : toPx(settings.size || 25, codeUnit);
  const codeRawPxHeight =
    type === 'barcode'
      ? toPx(settings.height || 15, codeUnit)
      : toPx(settings.size || 25, codeUnit);

  const labelFontUnit = settings.labelFontUnit || 'pt';
  const labelFontSize = Number(settings.labelFontSize || (labelFontUnit === 'pt' ? 11 : 14));
  const labelFontSizePx = labelFontUnit === 'pt' ? (labelFontSize * 96) / 72 : labelFontSize;
  const labelGapPx = hasLabel ? Math.max(0, Number(settings.labelGap !== undefined ? settings.labelGap : 4)) : 0;
  const labelWeight = settings.labelWeight || 'normal';
  const labelAlign = settings.labelAlign || 'center';
  const labelColor = resolveLabelColor(settings, type);
  const numberColor = settings.numberColor || settings.lineColor || '#000000';
  const rawCodeBg = settings.codeBackground !== undefined ? settings.codeBackground : (settings.background || '#ffffff');
  const codeBg = rawCodeBg === 'transparent' ? 'transparent' : rawCodeBg;

  // Label sizing and word-boundary wrapping
  const estimatedCharWidth = labelFontSizePx * 0.55;
  const explicitLines = hasLabel ? resolvedLabel.split('\n') : [];
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

  const innerFitMode = artboardSettings?.fit || 'original';
  let fitScale = 1;
  if (!isAuto && innerFitMode === 'fill-width') {
    fitScale = availWidth / totalRawPxWidth;
  } else if (!isAuto && innerFitMode === 'fit') {
    fitScale = Math.min(availWidth / totalRawPxWidth, availHeight / totalRawPxHeight);
  }

  const scaledCodeW = totalRawPxWidth * fitScale;
  const scaledCodeH = totalRawPxHeight * fitScale;

  let baseX = (artboardPxWidth - scaledCodeW) / 2;
  let baseY = (artboardPxHeight - scaledCodeH) / 2;
  const alignment = artboardSettings?.alignment || 'center';

  if (!isAuto) {
    if (alignment.includes('left')) baseX = paddingPx;
    if (alignment.includes('right')) baseX = artboardPxWidth - paddingPx - scaledCodeW;
    if (alignment.startsWith('top')) baseY = paddingPx;
    if (alignment.startsWith('bottom')) baseY = artboardPxHeight - paddingPx - scaledCodeH;
  }

  const codeX = Math.round(baseX + (artboardSettings?.xOffset || 0));
  const codeY = Math.round(baseY + (artboardSettings?.yOffset || 0));

  // Render barcode into SVG
  useEffect(() => {
    if (!canLiveRender || type !== 'barcode' || !barcodeSvgRef.current) return;
    try {
      const displayVal = Boolean(settings.displayValue ?? true);
      JsBarcode(barcodeSvgRef.current, value, {
        format: format || settings.format || 'CODE128',
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

      if (displayVal && numberColor) {
        barcodeSvgRef.current.querySelectorAll('text').forEach((textEl) => {
          textEl.setAttribute('fill', numberColor);
          textEl.style.fill = numberColor;
        });
      }
    } catch (e) {
      console.warn('ArtboardView JsBarcode render error:', e);
    }
  }, [canLiveRender, type, format, value, settings, codeRawPxHeight, numberColor, codeBg]);

  // Render QR into container
  useEffect(() => {
    if (!canLiveRender || type !== 'qr' || !qrContainerRef.current) return;
    try {
      qrContainerRef.current.innerHTML = '';
      const qrCode = new QRCodeStyling({
        type: 'svg',
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
      qrCode.append(qrContainerRef.current);
    } catch (e) {
      console.warn('ArtboardView QRCodeStyling render error:', e);
    }
  }, [canLiveRender, type, value, settings, codeRawPxWidth, codeRawPxHeight, codeBg]);

  // Fallback to preview image if unable to live-render
  if (!canLiveRender && item?.preview_url) {
    return (
      <img
        src={item.preview_url}
        alt={item.name}
        className={`max-w-full max-h-full object-contain ${className}`}
        style={style}
      />
    );
  }

  const artboardBg =
    placement.showBackground !== false && artboardSettings.background
      ? artboardSettings.background
      : 'transparent';

  const showBorder =
    placement.showArtboardBorder && artboardSettings?.border?.enabled;
  const borderStyle = showBorder
    ? `${artboardSettings.border.width || 1}px solid ${artboardSettings.border.color || '#000000'}`
    : 'none';

  return (
    <div
      className={`relative overflow-hidden ${className}`}
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
        ...style,
      }}
    >
      {/* SVG ViewBox scaling wrapper: ensures exact aspect ratio scaling without distortion */}
      <svg
        viewBox={`0 0 ${artboardPxWidth} ${artboardPxHeight}`}
        style={{
          width: placement.fit === 'fill' ? '100%' : 'auto',
          height: placement.fit === 'fill' ? '100%' : 'auto',
          maxWidth: '100%',
          maxHeight: '100%',
          display: 'block',
        }}
      >
        <foreignObject width={artboardPxWidth} height={artboardPxHeight}>
          <div
            xmlns="http://www.w3.org/1999/xhtml"
            style={{
              width: `${artboardPxWidth}px`,
              height: `${artboardPxHeight}px`,
              backgroundColor: artboardBg,
              border: borderStyle,
              borderRadius: `${artboardSettings.radius || 0}px`,
              position: 'relative',
              overflow: 'hidden',
              boxSizing: 'border-box',
            }}
          >
            <div
              style={{
                position: isAuto ? 'static' : 'absolute',
                left: isAuto ? 'auto' : `${codeX}px`,
                top: isAuto ? 'auto' : `${codeY}px`,
                width: `${totalRawPxWidth}px`,
                height: `${totalRawPxHeight}px`,
                transform: isAuto || fitScale === 1 ? 'none' : `scale(${fitScale})`,
                transformOrigin: 'top left',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {type === 'barcode' ? (
                <div className="flex flex-col items-center w-full">
                  <svg ref={barcodeSvgRef} className="max-w-full h-auto block" />
                </div>
              ) : (
                <div className="flex flex-col items-center w-full">
                  <div ref={qrContainerRef} className="flex justify-center max-w-full" />
                </div>
              )}

              {hasLabel && (
                <div
                  style={{
                    marginTop: `${labelGapPx}px`,
                    fontSize: `${effectiveLabelFontSizePx}px`,
                    fontWeight: labelWeight === 'bold' ? 700 : 400,
                    textAlign: labelAlign,
                    color: labelColor,
                    maxWidth: `${Math.round(labelContainerWidth)}px`,
                    width: '100%',
                    fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
                    lineHeight: 1.25,
                    wordBreak: 'normal',
                    overflowWrap: 'break-word',
                    hyphens: 'none',
                  }}
                >
                  {explicitLines.map((line, idx) => (
                    <p
                      key={idx}
                      style={{
                        margin: 0,
                        padding: 0,
                        lineHeight: 1.25,
                        color: labelColor,
                        wordBreak: 'normal',
                        overflowWrap: 'break-word',
                      }}
                    >
                      {line}
                    </p>
                  ))}
                </div>
              )}
            </div>
          </div>
        </foreignObject>
      </svg>
    </div>
  );
}
