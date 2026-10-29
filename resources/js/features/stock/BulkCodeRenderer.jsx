import React, { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';
import QRCodeStyling from 'qr-code-styling';
import { toPx } from '../../utils/units';
import { resolveLabelColor } from '../../utils/artboardRenderer';

export default function BulkCodeRenderer({
  template,
  value,
  labelText,
  captureRef,
  className = '',
  scale = 1,
}) {
  const svgRef = useRef(null);
  const qrRef = useRef(null);

  const type = template?.type || 'barcode';
  const format = template?.settings?.format || (type === 'qr' ? 'QR' : 'CODE128');
  const settings = template?.settings || {};
  const artboardSettings = settings.artboard || {};
  const labelColor = resolveLabelColor(settings, type);

  const codeUnit = settings.unit || 'px';
  const codeRawPxWidth = type === 'barcode'
    ? toPx(settings.width || 260, codeUnit)
    : toPx(settings.size || 220, codeUnit);
  const codeRawPxHeight = type === 'barcode'
    ? toPx(settings.height || 100, codeUnit)
    : toPx(settings.size || 220, codeUnit);

  const hasLabel = Boolean(labelText && labelText.trim());
  const labelFontUnit = settings.labelFontUnit || 'pt';
  const labelFontSize = Number(settings.labelFontSize || (labelFontUnit === 'pt' ? 12 : 16));
  const labelFontSizePx = labelFontUnit === 'pt' ? (labelFontSize * 96) / 72 : labelFontSize;
  const labelGapPx = hasLabel ? Math.max(0, Number(settings.labelGap !== undefined ? settings.labelGap : 4)) : 0;
  const labelWeight = settings.labelWeight || 'normal';
  const labelAlign = settings.labelAlign || 'center';
  const numberColor = settings.numberColor || settings.lineColor || '#000000';

  const rawCodeBg = settings.codeBackground !== undefined ? settings.codeBackground : (settings.background || '#ffffff');
  const codeBg = rawCodeBg === 'transparent' ? 'transparent' : rawCodeBg;

  // Estimate label sizing and word-boundary wrapping
  const estimatedCharWidth = labelFontSizePx * 0.55;
  const explicitLines = hasLabel ? labelText.split('\n') : [];
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
    : toPx(artboardSettings.width || 100, artboardUnit);
  const paddingPx = isAuto ? 0 : toPx(artboardSettings.padding !== undefined ? artboardSettings.padding : 5, artboardUnit);
  const availWidth = Math.max(10, artboardPxWidth - (2 * paddingPx));

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

  const totalRawPxWidth = isAuto ? autoArtboardWidth : codeRawPxWidth;
  const totalRawPxHeight = codeRawPxHeight + (hasLabel ? labelGapPx + labelPxHeight : 0);

  const artboardPxHeight = isAuto
    ? totalRawPxHeight
    : toPx(artboardSettings.height || 50, artboardUnit);
  const availHeight = Math.max(10, artboardPxHeight - (2 * paddingPx));

  const fitMode = artboardSettings?.fit || 'original';
  let fitScale = 1;
  if (!isAuto && fitMode === 'fill-width') {
    fitScale = availWidth / totalRawPxWidth;
  } else if (!isAuto && fitMode === 'fit') {
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
    if (alignment.includes('top')) baseY = paddingPx;
    if (alignment.includes('bottom')) baseY = artboardPxHeight - paddingPx - scaledCodeH;
  }

  const codeX = Math.round(baseX + toPx(artboardSettings?.xOffset || 0, artboardUnit));
  const codeY = Math.round(baseY + toPx(artboardSettings?.yOffset || 0, artboardUnit));

  useEffect(() => {
    if (type === 'barcode' && svgRef.current && value) {
      try {
        JsBarcode(svgRef.current, String(value), {
          format: format || 'CODE128',
          width: Math.max(1, Number(settings.barWidth || 2)),
          height: Math.max(10, Number(settings.barHeight || 80)),
          displayValue: Boolean(settings.displayValue ?? false),
          text: settings.displayValue ? String(value) : undefined,
          font: 'monospace',
          fontSize: Number(settings.fontSize || 14),
          lineColor: settings.lineColor || '#000000',
          background: codeBg === 'transparent' ? 'rgba(0,0,0,0)' : codeBg,
          margin: 0,
        });

        if (svgRef.current) {
          const textEls = svgRef.current.querySelectorAll('text');
          textEls.forEach((t) => t.setAttribute('fill', numberColor));
        }
      } catch (err) {
        if (svgRef.current) {
          svgRef.current.innerHTML = '';
        }
      }
    }
  }, [type, format, value, settings, numberColor, codeBg]);

  useEffect(() => {
    if (type === 'qr' && qrRef.current && value) {
      try {
        qrRef.current.innerHTML = '';
        const qrCode = new QRCodeStyling({
          type: 'svg',
          width: Math.round(codeRawPxWidth),
          height: Math.round(codeRawPxHeight),
          data: String(value),
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
        qrCode.append(qrRef.current);
      } catch (err) {
        if (qrRef.current) {
          qrRef.current.innerHTML = '';
        }
      }
    }
  }, [type, value, settings, codeRawPxWidth, codeRawPxHeight, codeBg]);

  const artboardElement = (
    <div
      ref={captureRef}
      style={{
        width: `${Math.round(artboardPxWidth)}px`,
        height: `${Math.round(artboardPxHeight)}px`,
        backgroundColor: artboardSettings?.background || '#ffffff',
        border: artboardSettings?.border?.enabled
          ? `${artboardSettings.border.width || 1}px solid ${artboardSettings.border.color || '#D1D5DB'}`
          : '1px solid #E5E7EB',
        borderRadius: `${artboardSettings?.radius || 0}px`,
        position: 'relative',
        overflow: 'hidden',
        boxSizing: 'border-box',
      }}
      className="bg-white"
    >
      <div
        style={{
          position: isAuto ? 'static' : 'absolute',
          left: isAuto ? 'auto' : `${codeX}px`,
          top: isAuto ? 'auto' : `${codeY}px`,
          width: `${Math.round(totalRawPxWidth)}px`,
          height: `${Math.round(totalRawPxHeight)}px`,
          transform: isAuto || fitScale === 1 ? 'none' : `scale(${fitScale})`,
          transformOrigin: 'top left',
        }}
        className="flex flex-col items-center justify-center"
      >
        {type === 'barcode' ? (
          <div className="flex flex-col items-center w-full">
            <svg ref={svgRef} className="max-w-full h-auto block" />
            {hasLabel && (
              <div
                className="w-full pointer-events-none select-none flex flex-col"
                style={{
                  marginTop: `${labelGapPx}px`,
                  fontSize: `${effectiveLabelFontSizePx}px`,
                  fontWeight: labelWeight === 'bold' ? 700 : 400,
                  textAlign: labelAlign,
                  color: labelColor,
                  maxWidth: `${Math.round(labelContainerWidth)}px`,
                  wordBreak: 'normal',
                  overflowWrap: 'break-word',
                  hyphens: 'none',
                }}
              >
                {explicitLines.map((line, idx) => (
                  <p
                    key={idx}
                    className="w-full leading-tight m-0 p-0"
                    style={{ wordBreak: 'normal', overflowWrap: 'break-word' }}
                  >
                    {line}
                  </p>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center w-full">
            <div ref={qrRef} className="flex justify-center max-w-full" />
            {hasLabel && (
              <div
                className="w-full pointer-events-none select-none flex flex-col"
                style={{
                  marginTop: `${labelGapPx}px`,
                  fontSize: `${effectiveLabelFontSizePx}px`,
                  fontWeight: labelWeight === 'bold' ? 700 : 400,
                  textAlign: labelAlign,
                  color: labelColor,
                  maxWidth: `${Math.round(labelContainerWidth)}px`,
                  wordBreak: 'normal',
                  overflowWrap: 'break-word',
                  hyphens: 'none',
                }}
              >
                {explicitLines.map((line, idx) => (
                  <p
                    key={idx}
                    className="w-full leading-tight m-0 p-0"
                    style={{ wordBreak: 'normal', overflowWrap: 'break-word' }}
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
  );

  if (scale !== 1) {
    return (
      <div
        style={{
          width: `${Math.round(artboardPxWidth * scale)}px`,
          height: `${Math.round(artboardPxHeight * scale)}px`,
        }}
        className={`relative overflow-hidden shrink-0 ${className}`}
      >
        <div
          style={{
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
          }}
        >
          {artboardElement}
        </div>
      </div>
    );
  }

  return artboardElement;
}
