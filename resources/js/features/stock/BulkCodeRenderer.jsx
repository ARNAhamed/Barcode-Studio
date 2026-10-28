import React, { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';
import QRCodeStyling from 'qr-code-styling';
import { toPx } from '../../utils/units';

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

  // Estimate label height in px with multi-line support
  const estimatedCharWidth = labelFontSizePx * 0.55;
  const explicitLines = hasLabel ? labelText.split('\n') : [];
  let totalLabelLines = 0;
  explicitLines.forEach((line) => {
    const lineW = line.trim().length * estimatedCharWidth;
    const wrapped = lineW > codeRawPxWidth ? Math.ceil(lineW / Math.max(80, codeRawPxWidth)) : 1;
    totalLabelLines += wrapped;
  });
  totalLabelLines = Math.max(explicitLines.length, totalLabelLines);
  const labelPxHeight = hasLabel ? Math.round(labelFontSizePx * 1.35 * totalLabelLines) : 0;

  const totalRawPxWidth = codeRawPxWidth;
  const totalRawPxHeight = codeRawPxHeight + (hasLabel ? labelGapPx + labelPxHeight : 0);

  const isAuto = !artboardSettings || artboardSettings.preset === 'auto';
  const artboardUnit = artboardSettings?.unit || 'mm';
  const artboardPxWidth = isAuto
    ? totalRawPxWidth
    : toPx(artboardSettings.width || 100, artboardUnit);
  const artboardPxHeight = isAuto
    ? totalRawPxHeight
    : toPx(artboardSettings.height || 50, artboardUnit);

  const paddingPx = isAuto ? 0 : toPx(artboardSettings.padding !== undefined ? artboardSettings.padding : 5, artboardUnit);
  const availWidth = Math.max(10, artboardPxWidth - (2 * paddingPx));
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
          background: settings.background || 'transparent',
          margin: 0,
        });
      } catch (err) {
        // If JsBarcode throws on invalid format, clear SVG
        if (svgRef.current) {
          svgRef.current.innerHTML = '';
        }
      }
    }
  }, [type, format, value, settings]);

  useEffect(() => {
    if (type === 'qr' && qrRef.current && value) {
      try {
        qrRef.current.innerHTML = '';
        const qrCode = new QRCodeStyling({
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
        qrCode.append(qrRef.current);
      } catch (err) {
        if (qrRef.current) {
          qrRef.current.innerHTML = '';
        }
      }
    }
  }, [type, value, settings, codeRawPxWidth, codeRawPxHeight]);

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
                  fontSize: `${labelFontSizePx}px`,
                  fontWeight: labelWeight === 'bold' ? 700 : 400,
                  textAlign: labelAlign,
                  color: '#0F172A',
                  maxWidth: `${Math.round(codeRawPxWidth)}px`,
                }}
              >
                {labelText.split('\n').map((line, idx) => (
                  <p
                    key={idx}
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
            <div ref={qrRef} className="flex justify-center max-w-full" />
            {hasLabel && (
              <div
                className="w-full pointer-events-none select-none flex flex-col"
                style={{
                  marginTop: `${labelGapPx}px`,
                  fontSize: `${labelFontSizePx}px`,
                  fontWeight: labelWeight === 'bold' ? 700 : 400,
                  textAlign: labelAlign,
                  color: '#0F172A',
                  maxWidth: `${Math.round(codeRawPxWidth)}px`,
                }}
              >
                {labelText.split('\n').map((line, idx) => (
                  <p
                    key={idx}
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
