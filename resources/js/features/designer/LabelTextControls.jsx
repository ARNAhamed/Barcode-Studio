import React, { useRef } from 'react';
import { AlignLeft, AlignCenter, AlignRight } from 'lucide-react';
import { toPx, fromPx } from '../../utils/units';
import { AVAILABLE_PLACEHOLDERS, fillPlaceholders, hasPlaceholders } from '../../utils/placeholders';

export default function LabelTextControls({
  settings,
  onChange,
  activeUnit = 'px',
  selectedProduct = null,
}) {
  const inputRef = useRef(null);
  const label = settings.label || '';
  const fontUnit = settings.labelFontUnit || 'pt';
  const fontSize =
    settings.labelFontSize !== undefined
      ? Number(settings.labelFontSize)
      : fontUnit === 'pt'
      ? 12
      : 16;
  const gapPx = settings.labelGap !== undefined ? Number(settings.labelGap) : 4;
  const weight = settings.labelWeight || 'normal';
  const align = settings.labelAlign || 'center';

  const handleInsertPlaceholder = (tag) => {
    const input = inputRef.current;
    const current = settings.label || '';
    if (!input) {
      onChange({ ...settings, label: current ? `${current} ${tag}` : tag });
      return;
    }

    const start = input.selectionStart ?? current.length;
    const end = input.selectionEnd ?? current.length;
    const nextVal = current.substring(0, start) + tag + current.substring(end);
    onChange({ ...settings, label: nextVal });

    setTimeout(() => {
      input.focus();
      input.setSelectionRange(start + tag.length, start + tag.length);
    }, 0);
  };

  // Gap in display unit
  const gapInUnit = activeUnit === 'px' ? gapPx : fromPx(gapPx, activeUnit);
  const maxGapInUnit = activeUnit === 'px' ? 50 : fromPx(50, activeUnit);
  const stepGap = activeUnit === 'px' ? 1 : activeUnit === 'mm' ? 0.2 : 0.01;

  // Font size bounds
  const minFontSize = fontUnit === 'pt' ? 6 : 8;
  const maxFontSize = fontUnit === 'pt' ? 72 : 96;
  const stepFontSize = 0.5;

  const handleFontSizeChange = (newVal) => {
    const parsed = parseFloat(newVal);
    if (isNaN(parsed)) return;
    const clamped = Math.max(minFontSize, Math.min(maxFontSize, parsed));
    onChange({
      ...settings,
      labelFontSize: Math.round(clamped * 10) / 10,
    });
  };

  const handleStepFontSize = (delta) => {
    const next = Math.max(minFontSize, Math.min(maxFontSize, fontSize + delta));
    onChange({
      ...settings,
      labelFontSize: Math.round(next * 10) / 10,
    });
  };

  const handleFontUnitChange = (newUnit) => {
    if (newUnit === fontUnit) return;
    let converted;
    if (newUnit === 'px') {
      converted = Math.round((fontSize * 96) / 72);
    } else {
      converted = Math.round(((fontSize * 72) / 96) * 10) / 10;
    }
    onChange({
      ...settings,
      labelFontUnit: newUnit,
      labelFontSize: converted,
    });
  };

  const handleGapChange = (newValInUnit) => {
    const parsed = parseFloat(newValInUnit);
    if (isNaN(parsed)) return;
    const inPx = activeUnit === 'px' ? parsed : toPx(parsed, activeUnit);
    const clampedPx = Math.max(0, Math.min(50, Math.round(inPx)));
    onChange({
      ...settings,
      labelGap: clampedPx,
    });
  };

  const handleStepGap = (deltaInUnit) => {
    const current = gapInUnit;
    const next = Math.max(0, current + deltaInUnit);
    handleGapChange(next);
  };

  return (
    <div className="space-y-4">
      {/* 1. Custom Label Input & Placeholders */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1.5">
          Custom Label Text <span className="text-gray-400 font-normal">(supports {`{placeholders}`})</span>
        </label>
        <input
          ref={inputRef}
          type="text"
          value={label}
          onChange={(e) => onChange({ ...settings, label: e.target.value })}
          placeholder="e.g. {name} • {price}"
          className="w-full h-9 px-3 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 transition-colors font-mono"
        />

        {/* Click-to-insert placeholder chips */}
        <div className="mt-2 space-y-1.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] text-gray-500 font-medium">Insert:</span>
            {AVAILABLE_PLACEHOLDERS.map((p) => (
              <button
                key={p.tag}
                type="button"
                onClick={() => handleInsertPlaceholder(p.tag)}
                title={`Insert ${p.label}`}
                className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-mono text-gray-700 bg-gray-100 hover:bg-gray-200 border border-gray-200 transition-colors cursor-pointer select-none"
              >
                {p.tag}
              </button>
            ))}
          </div>

          {selectedProduct && hasPlaceholders(label) && (
            <div className="px-2.5 py-1.5 bg-indigo-50/60 border border-indigo-100 rounded-md text-xs text-indigo-900 flex items-start gap-1.5">
              <span className="font-semibold text-indigo-700 shrink-0">Live preview:</span>
              <span className="text-indigo-950 truncate font-mono">
                {fillPlaceholders(label, selectedProduct) || '(empty)'}
              </span>
            </div>
          )}
        </div>

        <p className="mt-1 text-[11px] text-gray-500">
          Positioned with the code as one unified object on the artboard and exports.
        </p>
      </div>

      {/* 2. Font Size: Number input + slider + A- / A+ buttons + unit selector */}
      <div className="space-y-1.5 p-3 bg-gray-50/70 border border-gray-200 rounded-lg">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-gray-700">Font Size</label>
          <div className="flex items-center gap-1 bg-white border border-gray-200 p-0.5 rounded-md text-[11px]">
            <button
              type="button"
              onClick={() => handleFontUnitChange('pt')}
              className={`px-1.5 py-0.5 rounded transition-colors cursor-pointer ${
                fontUnit === 'pt'
                  ? 'bg-indigo-600 text-white font-semibold'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              pt
            </button>
            <button
              type="button"
              onClick={() => handleFontUnitChange('px')}
              className={`px-1.5 py-0.5 rounded transition-colors cursor-pointer ${
                fontUnit === 'px'
                  ? 'bg-indigo-600 text-white font-semibold'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              px
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* A- Step Button */}
          <button
            type="button"
            onClick={() => handleStepFontSize(-1)}
            disabled={fontSize <= minFontSize}
            className="w-8 h-8 flex items-center justify-center bg-white border border-gray-300 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-100 disabled:opacity-40 transition-colors cursor-pointer shrink-0"
            title="Decrease font size"
          >
            A-
          </button>

          {/* Number Input */}
          <input
            type="number"
            step={stepFontSize}
            min={minFontSize}
            max={maxFontSize}
            value={fontSize}
            onChange={(e) => handleFontSizeChange(e.target.value)}
            className="w-16 h-8 px-2 bg-white border border-gray-300 rounded-lg text-xs font-medium text-center text-gray-900 focus:outline-none focus:border-indigo-600 shrink-0"
          />

          {/* Slider */}
          <input
            type="range"
            min={minFontSize}
            max={maxFontSize}
            step={stepFontSize}
            value={fontSize}
            onChange={(e) => handleFontSizeChange(e.target.value)}
            className="flex-1 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
          />

          {/* A+ Step Button */}
          <button
            type="button"
            onClick={() => handleStepFontSize(1)}
            disabled={fontSize >= maxFontSize}
            className="w-8 h-8 flex items-center justify-center bg-white border border-gray-300 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-100 disabled:opacity-40 transition-colors cursor-pointer shrink-0"
            title="Increase font size"
          >
            A+
          </button>
        </div>
      </div>

      {/* 3. Gap Between Code and Text: Number input + slider + - / + buttons in active unit */}
      <div className="space-y-1.5 p-3 bg-gray-50/70 border border-gray-200 rounded-lg">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-gray-700">Gap Between Code & Text</label>
          <span className="text-[11px] font-mono text-gray-500">
            {gapInUnit} {activeUnit} ({gapPx} px)
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* - Step Button */}
          <button
            type="button"
            onClick={() => handleStepGap(-stepGap)}
            disabled={gapPx <= 0}
            className="w-8 h-8 flex items-center justify-center bg-white border border-gray-300 rounded-lg text-sm font-bold text-gray-700 hover:bg-gray-100 disabled:opacity-40 transition-colors cursor-pointer shrink-0"
            title="Decrease gap"
          >
            −
          </button>

          {/* Number Input */}
          <input
            type="number"
            step={stepGap}
            min={0}
            max={maxGapInUnit}
            value={gapInUnit}
            onChange={(e) => handleGapChange(e.target.value)}
            className="w-16 h-8 px-2 bg-white border border-gray-300 rounded-lg text-xs font-medium text-center text-gray-900 focus:outline-none focus:border-indigo-600 shrink-0"
          />

          {/* Slider */}
          <input
            type="range"
            min={0}
            max={maxGapInUnit}
            step={stepGap}
            value={gapInUnit}
            onChange={(e) => handleGapChange(e.target.value)}
            className="flex-1 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
          />

          {/* + Step Button */}
          <button
            type="button"
            onClick={() => handleStepGap(stepGap)}
            disabled={gapPx >= 50}
            className="w-8 h-8 flex items-center justify-center bg-white border border-gray-300 rounded-lg text-sm font-bold text-gray-700 hover:bg-gray-100 disabled:opacity-40 transition-colors cursor-pointer shrink-0"
            title="Increase gap"
          >
            +
          </button>
        </div>
      </div>

      {/* 4. Font Weight & Text Alignment */}
      <div className="grid grid-cols-2 gap-3">
        {/* Font Weight */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">Weight</label>
          <div className="flex bg-gray-100 p-0.5 rounded-lg border border-gray-200 h-9">
            <button
              type="button"
              onClick={() => onChange({ ...settings, labelWeight: 'normal' })}
              className={`flex-1 rounded-md text-xs font-medium transition-colors cursor-pointer flex items-center justify-center ${
                weight === 'normal'
                  ? 'bg-white text-gray-900 font-semibold shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Regular
            </button>
            <button
              type="button"
              onClick={() => onChange({ ...settings, labelWeight: 'bold' })}
              className={`flex-1 rounded-md text-xs font-medium transition-colors cursor-pointer flex items-center justify-center ${
                weight === 'bold'
                  ? 'bg-white text-gray-900 font-bold shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Bold
            </button>
          </div>
        </div>

        {/* Text Alignment */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">Alignment</label>
          <div className="flex bg-gray-100 p-0.5 rounded-lg border border-gray-200 h-9">
            <button
              type="button"
              onClick={() => onChange({ ...settings, labelAlign: 'left' })}
              className={`flex-1 rounded-md text-xs font-medium transition-colors cursor-pointer flex items-center justify-center ${
                align === 'left'
                  ? 'bg-white text-gray-900 font-semibold shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              title="Align Left"
            >
              <AlignLeft className="w-4 h-4 stroke-[1.5]" />
            </button>
            <button
              type="button"
              onClick={() => onChange({ ...settings, labelAlign: 'center' })}
              className={`flex-1 rounded-md text-xs font-medium transition-colors cursor-pointer flex items-center justify-center ${
                align === 'center'
                  ? 'bg-white text-gray-900 font-semibold shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              title="Align Center"
            >
              <AlignCenter className="w-4 h-4 stroke-[1.5]" />
            </button>
            <button
              type="button"
              onClick={() => onChange({ ...settings, labelAlign: 'right' })}
              className={`flex-1 rounded-md text-xs font-medium transition-colors cursor-pointer flex items-center justify-center ${
                align === 'right'
                  ? 'bg-white text-gray-900 font-semibold shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              title="Align Right"
            >
              <AlignRight className="w-4 h-4 stroke-[1.5]" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
