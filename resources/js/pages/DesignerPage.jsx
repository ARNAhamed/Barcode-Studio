import React, { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  Barcode,
  QrCode,
  PenTool,
  Sparkles,
  ArrowLeft,
  Wand2,
  Check,
  Layers,
  Maximize2,
  Palette,
  Type,
  ChevronDown,
} from 'lucide-react';

import BarcodeControls from '../features/designer/BarcodeControls';
import QrControls from '../features/designer/QrControls';
import ArtboardControls from '../features/designer/ArtboardControls';
import PreviewPanel from '../features/designer/PreviewPanel';
import ProductPicker from '../features/designer/ProductPicker';
import Skeleton from '../components/Skeleton';
import PageHeader from '../components/PageHeader';

import { getCode, createCode, updateCode } from '../api/codes';
import { getProduct } from '../api/products';
import { generateBarcodeNumber } from '../api/barcodes';
import { validateBarcode, validateQr } from '../utils/validators';
import {
  validateDimension,
  validateArtboardDimension,
  fromPx,
  toPx,
  DEFAULT_ARTBOARD_SETTINGS,
} from '../utils/units';
import {
  captureElementAsBlob,
  downloadElementAsPng,
  downloadSvgElement,
  downloadArtboardSvg,
} from '../utils/downloadHelpers';

const DEFAULT_BARCODE_SETTINGS = {
  unit: 'px',
  width: 260,
  height: 100,
  lockAspectRatio: true,
  aspectRatio: 2.6,
  format: 'CODE128',
  margin: 10,
  displayValue: true,
  fontSize: 16,
  lineColor: '#000000',
  background: '#ffffff',
  label: '',
  dpi: 300,
};

const DEFAULT_QR_SETTINGS = {
  unit: 'px',
  size: 220,
  errorCorrection: 'Q',
  dotStyle: 'rounded',
  cornerStyle: 'extra-rounded',
  foreground: '#0F172A',
  background: '#ffffff',
  logo: null,
  label: '',
  dpi: 300,
};

// Collapsible Section (separated by thin dividers)
function CollapsibleSection({
  title,
  subtitle,
  icon: Icon,
  badge,
  isOpen,
  onToggle,
  children,
}) {
  return (
    <div className="transition-all">
      <button
        type="button"
        onClick={onToggle}
        className="w-full px-5 py-3.5 flex items-center justify-between text-left hover:bg-gray-50/75 transition-colors cursor-pointer select-none"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          {Icon && <Icon className="w-4 h-4 text-gray-500 stroke-[1.5] shrink-0" />}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-gray-900 text-sm tracking-tight truncate">
                {title}
              </h3>
              {badge && (
                <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded font-normal truncate max-w-[140px]">
                  {badge}
                </span>
              )}
            </div>
            {subtitle && (
              <p className="text-xs text-gray-500 truncate mt-0.5">{subtitle}</p>
            )}
          </div>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-gray-400 stroke-[1.5] transition-transform duration-150 shrink-0 ml-2 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>
      {isOpen && <div className="px-5 py-4 border-t border-gray-100">{children}</div>}
    </div>
  );
}

export default function DesignerPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const captureRef = useRef(null); // Whole Artboard
  const codeCaptureRef = useRef(null); // Code only
  const barcodeSvgRef = useRef(null); // Barcode SVG

  // Core state
  const [type, setType] = useState('barcode'); // 'barcode' | 'qr'
  const [name, setName] = useState('My Product Barcode');
  const [value, setValue] = useState('AUD-WNC-001');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [dpi, setDpi] = useState(300);

  // Settings
  const [barcodeSettings, setBarcodeSettings] = useState(DEFAULT_BARCODE_SETTINGS);
  const [qrSettings, setQrSettings] = useState(DEFAULT_QR_SETTINGS);
  const [artboardSettings, setArtboardSettings] = useState(DEFAULT_ARTBOARD_SETTINGS);

  const [calculatedModuleWidth, setCalculatedModuleWidth] = useState(null);
  const [isGeneratingValue, setIsGeneratingValue] = useState(false);
  const [warnings, setWarnings] = useState({ scannabilityWarning: null, codeExceedsWarning: null });

  // Collapsible accordion open states
  const [openSections, setOpenSections] = useState({
    artboard: true,
    codeSize: true,
    colors: false,
    label: false,
  });

  const toggleSection = (key) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const areAllSectionsOpen = Object.values(openSections).every(Boolean);
  const handleToggleAllSections = () => {
    const nextState = !areAllSectionsOpen;
    setOpenSections({
      artboard: nextState,
      codeSize: nextState,
      colors: nextState,
      label: nextState,
    });
  };

  const handleGenerateValidNumber = async () => {
    setIsGeneratingValue(true);
    try {
      const targetFormat = barcodeSettings.format || 'EAN13';
      const res = await generateBarcodeNumber(targetFormat);
      setValue(res.number);
      toast.success(`Generated valid ${res.format}: ${res.number}`, { duration: 3000 });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to generate barcode number.');
    } finally {
      setIsGeneratingValue(false);
    }
  };

  // Fetch code if in edit mode (/designer/:id)
  const { data: codeData, isLoading: isLoadingCode } = useQuery({
    queryKey: ['code', id],
    queryFn: () => getCode(id),
    enabled: Boolean(id),
  });

  // Populate state when editing an existing code
  useEffect(() => {
    if (codeData?.data) {
      const c = codeData.data;
      setType(c.type || 'barcode');
      setName(c.name || 'Untitled Code');
      setValue(c.value || '');
      if (c.product) {
        setSelectedProduct(c.product);
      }

      const savedDpi = c.settings?.dpi || 300;
      setDpi(savedDpi);

      // Restore artboard settings (default to auto preset for legacy saved codes)
      if (c.settings?.artboard) {
        setArtboardSettings({
          ...DEFAULT_ARTBOARD_SETTINGS,
          ...c.settings.artboard,
        });
      } else {
        setArtboardSettings({
          ...DEFAULT_ARTBOARD_SETTINGS,
          preset: 'auto',
        });
      }

      if (c.type === 'barcode') {
        const savedUnit = c.settings?.unit || 'px';
        const savedWidth = c.settings?.width !== undefined ? c.settings.width : 260;
        const savedHeight = c.settings?.height !== undefined ? c.settings.height : 100;

        setBarcodeSettings({
          ...DEFAULT_BARCODE_SETTINGS,
          ...(c.settings || {}),
          unit: savedUnit,
          width: savedWidth,
          height: savedHeight,
          format: c.format || c.settings?.format || 'CODE128',
          dpi: savedDpi,
        });
      } else {
        const savedUnit = c.settings?.unit || 'px';
        const savedSize = c.settings?.size !== undefined ? c.settings.size : 220;

        setQrSettings({
          ...DEFAULT_QR_SETTINGS,
          ...(c.settings || {}),
          unit: savedUnit,
          size: savedSize,
          dpi: savedDpi,
        });
      }
    }
  }, [codeData]);

  // Handle URL pre-selection: /designer?product_id=X
  const initialProductId = searchParams.get('product_id');
  const { data: initialProductData } = useQuery({
    queryKey: ['product', initialProductId],
    queryFn: () => getProduct(initialProductId),
    enabled: Boolean(initialProductId) && !id,
  });

  useEffect(() => {
    if (initialProductData?.data && !id) {
      const p = initialProductData.data;
      handleSelectProduct(p);
    }
  }, [initialProductData, id]);

  // Format validation
  const activeSettings = type === 'barcode' ? barcodeSettings : qrSettings;
  const validationResult =
    type === 'barcode'
      ? validateBarcode(activeSettings.format, value)
      : validateQr(value);

  // Size validation
  const sizeError =
    type === 'barcode'
      ? validateDimension(barcodeSettings.width, barcodeSettings.unit) ||
        validateDimension(barcodeSettings.height, barcodeSettings.unit)
      : validateDimension(qrSettings.size, qrSettings.unit);

  // Artboard validation
  const artboardError =
    artboardSettings.preset !== 'auto'
      ? validateArtboardDimension(artboardSettings.width, artboardSettings.unit) ||
        validateArtboardDimension(artboardSettings.height, artboardSettings.unit)
      : null;

  const isValid = validationResult.isValid && !sizeError && !artboardError;

  // Handle product selection
  const handleSelectProduct = (product) => {
    setSelectedProduct(product);
    const autoValue = product.barcode_number || product.sku || '';
    setValue(autoValue);
    setName(`${product.name} ${type === 'barcode' ? 'Barcode' : 'QR Code'}`);

    const labelText = `${product.name} • $${parseFloat(product.price || 0).toFixed(2)}`;
    if (type === 'barcode') {
      setBarcodeSettings((prev) => ({
        ...prev,
        label: labelText,
        format: product.barcode_number && /^\d{12,13}$/.test(product.barcode_number) ? 'EAN13' : prev.format,
      }));
    } else {
      setQrSettings((prev) => ({
        ...prev,
        label: labelText,
      }));
    }
  };

  const handleClearProduct = () => {
    setSelectedProduct(null);
  };

  const handleDpiChange = (newDpi) => {
    setDpi(newDpi);
    if (type === 'barcode') {
      setBarcodeSettings((prev) => ({ ...prev, dpi: newDpi }));
    } else {
      setQrSettings((prev) => ({ ...prev, dpi: newDpi }));
    }
  };

  // Mutation: Save / Update
  const saveMutation = useMutation({
    mutationFn: async (formData) => {
      if (id) {
        return await updateCode(id, formData);
      }
      return await createCode(formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['codes'] });
      toast.success(id ? 'Code updated successfully!' : 'Code saved to Gallery!');
      navigate('/');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to save code to gallery.');
    },
  });

  // Action: Save to Gallery
  const handleSave = async () => {
    if (!isValid) {
      toast.error(validationResult.error || sizeError || artboardError || 'Please correct errors before saving.');
      return;
    }

    try {
      // Determine capture target: full artboard or code-only
      const captureNode =
        artboardSettings.preset !== 'auto' && !artboardSettings.exportCodeOnly
          ? captureRef.current
          : codeCaptureRef.current || captureRef.current;

      const blob = await captureElementAsBlob(captureNode, dpi);

      const settingsToSave = {
        ...activeSettings,
        artboard: {
          preset: artboardSettings.preset,
          width: artboardSettings.width,
          height: artboardSettings.height,
          unit: artboardSettings.unit,
          orientation: artboardSettings.orientation,
          lockAspectRatio: artboardSettings.lockAspectRatio,
          background: artboardSettings.background,
          border: artboardSettings.border,
          radius: artboardSettings.radius,
          alignment: artboardSettings.alignment,
          padding: artboardSettings.padding,
          fit: artboardSettings.fit,
          xOffset: artboardSettings.xOffset,
          yOffset: artboardSettings.yOffset,
          exportCodeOnly: Boolean(artboardSettings.exportCodeOnly),
        },
        dpi,
      };

      const formData = new FormData();
      formData.append('name', name.trim() || 'Untitled Code');
      formData.append('type', type);
      formData.append('format', type === 'barcode' ? (barcodeSettings.format || 'CODE128') : 'QR');
      formData.append('value', value.trim());
      formData.append('settings', JSON.stringify(settingsToSave));

      if (selectedProduct?.id) {
        formData.append('product_id', selectedProduct.id);
      }

      if (blob) {
        formData.append('preview', blob, 'preview.png');
      }

      saveMutation.mutate(formData);
    } catch (err) {
      console.error('Save error:', err);
      toast.error('Failed to capture preview image.');
    }
  };

  // Action: Download PNG
  const handleDownloadPng = async (exportDpi) => {
    try {
      const filename = `${name.toLowerCase().replace(/[^a-z0-9]/g, '_') || 'code'}.png`;
      const captureNode =
        artboardSettings.preset !== 'auto' && !artboardSettings.exportCodeOnly
          ? captureRef.current
          : codeCaptureRef.current || captureRef.current;

      await downloadElementAsPng(captureNode, filename, exportDpi);
      toast.success(`PNG downloaded at ${exportDpi} DPI!`);
    } catch (err) {
      toast.error('Failed to download PNG.');
    }
  };

  // Action: Download SVG
  const handleDownloadSvg = () => {
    try {
      const filename = `${name.toLowerCase().replace(/[^a-z0-9]/g, '_') || 'code'}.svg`;

      if (artboardSettings.preset !== 'auto' && !artboardSettings.exportCodeOnly) {
        // Export entire Artboard as SVG
        const artboardPxW = toPx(artboardSettings.width, artboardSettings.unit);
        const artboardPxH = toPx(artboardSettings.height, artboardSettings.unit);
        const codeW = toPx(activeSettings.width || activeSettings.size, activeSettings.unit);
        const codeH = toPx(activeSettings.height || activeSettings.size, activeSettings.unit);

        let fitScale = 1;
        const paddingPx = toPx(artboardSettings.padding || 5, artboardSettings.unit);
        const availW = Math.max(10, artboardPxW - (2 * paddingPx));
        const availH = Math.max(10, artboardPxH - (2 * paddingPx));

        if (artboardSettings.fit === 'fit') {
          fitScale = Math.min(availW / codeW, availH / codeH);
        } else if (artboardSettings.fit === 'fill-width') {
          fitScale = availW / codeW;
        }

        const scaledW = codeW * fitScale;
        const scaledH = codeH * fitScale;

        let baseX = (artboardPxW - scaledW) / 2;
        let baseY = (artboardPxH - scaledH) / 2;
        if (artboardSettings.alignment?.includes('left')) baseX = paddingPx;
        if (artboardSettings.alignment?.includes('right')) baseX = artboardPxW - paddingPx - scaledW;
        if (artboardSettings.alignment?.startsWith('top')) baseY = paddingPx;
        if (artboardSettings.alignment?.startsWith('bottom')) baseY = artboardPxH - paddingPx - scaledH;

        const codeX = Math.round(baseX + (artboardSettings.xOffset || 0));
        const codeY = Math.round(baseY + (artboardSettings.yOffset || 0));

        downloadArtboardSvg({
          artboardWidth: artboardSettings.width,
          artboardHeight: artboardSettings.height,
          unit: artboardSettings.unit,
          background: artboardSettings.background,
          border: artboardSettings.border,
          radius: artboardSettings.radius,
          codeSvgElement: barcodeSvgRef.current,
          codeX,
          codeY,
          fitScale,
          filename,
        });
        toast.success(`Artboard SVG downloaded (${artboardSettings.width} × ${artboardSettings.height} ${artboardSettings.unit})!`);
      } else {
        // Code-only SVG download
        downloadSvgElement(
          barcodeSvgRef.current,
          filename,
          activeSettings.width || activeSettings.size,
          activeSettings.height || activeSettings.size,
          activeSettings.unit
        );
        toast.success(`Code SVG downloaded!`);
      }
    } catch (err) {
      toast.error('Failed to download SVG.');
    }
  };

  // Action: Reset
  const handleReset = () => {
    if (type === 'barcode') {
      setBarcodeSettings(DEFAULT_BARCODE_SETTINGS);
    } else {
      setQrSettings(DEFAULT_QR_SETTINGS);
    }
    setArtboardSettings(DEFAULT_ARTBOARD_SETTINGS);
    setDpi(300);
    toast.success('Settings reset to defaults.');
  };

  if (id && isLoadingCode) {
    return (
      <div className="space-y-6">
        <Skeleton count={1} className="h-10 w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7">
            <Skeleton count={4} className="h-24 mb-4" />
          </div>
          <div className="lg:col-span-5">
            <Skeleton count={1} className="h-96" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 w-full lg:h-[calc(100dvh-4.25rem)] lg:overflow-hidden">
      {/* Header */}
      <PageHeader
        title={id ? 'Edit Code' : 'Barcode & QR Designer'}
        description="Design print-ready barcodes and QR codes with customizable artboards and precise physical dimensions."
        className="shrink-0 pb-2.5 mb-3 border-b border-gray-200"
        action={
          <div className="flex items-center gap-2">
            {id && (
              <button
                type="button"
                onClick={() => navigate('/')}
                className="inline-flex items-center gap-1.5 px-3 h-9 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4 stroke-[1.5]" />
                <span>Back</span>
              </button>
            )}
            <div className="inline-flex p-0.5 bg-gray-100 border border-gray-200 rounded-lg">
              <button
                type="button"
                onClick={() => setType('barcode')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                  type === 'barcode'
                    ? 'bg-white text-indigo-600 font-semibold'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Barcode className="w-3.5 h-3.5 stroke-[1.5]" />
                <span>Barcode</span>
              </button>
              <button
                type="button"
                onClick={() => setType('qr')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                  type === 'qr'
                    ? 'bg-white text-indigo-600 font-semibold'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <QrCode className="w-3.5 h-3.5 stroke-[1.5]" />
                <span>QR Code</span>
              </button>
            </div>
          </div>
        }
      />

      {/* Main Two-Pane Layout: PREVIEW on LEFT (65-70%), EDITOR on RIGHT (30-35%, clamped 340-440px) */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-4 lg:gap-5 items-stretch w-full overflow-hidden">
        {/* Left Column: Live Preview (fills remaining width, fixed on desktop, sticky on mobile) */}
        <div className="order-1 lg:order-1 lg:flex-1 w-full min-w-0 sticky top-0 lg:static z-20 bg-[#FAFAFA] lg:bg-transparent pb-3 lg:pb-0 h-[360px] sm:h-[400px] lg:h-full lg:overflow-hidden flex flex-col">
          <PreviewPanel
            type={type}
            format={activeSettings.format}
            value={value}
            settings={activeSettings}
            artboardSettings={artboardSettings}
            onArtboardChange={setArtboardSettings}
            isValid={isValid}
            validationError={validationResult.error || sizeError || artboardError}
            captureRef={captureRef}
            codeCaptureRef={codeCaptureRef}
            barcodeSvgRef={barcodeSvgRef}
            onSave={handleSave}
            onDownloadPng={handleDownloadPng}
            onDownloadSvg={handleDownloadSvg}
            onReset={handleReset}
            isSaving={saveMutation.isPending}
            dpi={dpi}
            onDpiChange={handleDpiChange}
            onCalculatedModuleWidth={setCalculatedModuleWidth}
            onWarningsUpdate={setWarnings}
          />
        </div>

        {/* Right Column: Controls Editor (clamped 340px to 440px, scrolls independently on desktop) */}
        <div className="order-2 lg:order-2 w-full lg:w-[380px] xl:w-[420px] min-w-0 lg:min-w-[340px] lg:max-w-[440px] shrink-0 lg:h-full lg:overflow-y-auto lg:pr-1">
          <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
            {/* Card 1: Data Source & Content */}
            <div className="p-4 sm:p-5 space-y-3.5">
              <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-semibold text-gray-900">Content & Product Link</h2>
                  <span className="text-[11px] text-gray-400">Step 1</span>
                </div>
                {/* Collapse all / expand all toggle control */}
                <button
                  type="button"
                  onClick={handleToggleAllSections}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-medium cursor-pointer"
                >
                  {areAllSectionsOpen ? 'Collapse all' : 'Expand all'}
                </button>
              </div>

              {/* Code Name */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Code Label / Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Wireless Headphones SKU Barcode"
                  className="w-full h-9 px-3 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 transition-colors"
                />
              </div>

              {/* Product Autocomplete Picker */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-medium text-gray-700">
                    Link with Stock Product <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  {selectedProduct && (
                    <span className="text-xs text-green-700 flex items-center gap-1 font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500" /> Synced with stock
                    </span>
                  )}
                </div>
                <ProductPicker
                  selectedProduct={selectedProduct}
                  onSelectProduct={handleSelectProduct}
                  onClearProduct={handleClearProduct}
                />
              </div>

              {/* Encoded Content / Value */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-medium text-gray-700">
                    Encoded Value <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center gap-2">
                    {type === 'barcode' && ['EAN13', 'EAN8', 'UPC', 'CODE128'].includes(barcodeSettings.format) && (
                      <button
                        type="button"
                        onClick={handleGenerateValidNumber}
                        disabled={isGeneratingValue}
                        className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700 bg-gray-100 hover:bg-gray-200 px-2 py-0.5 rounded-lg border border-gray-200 transition-colors cursor-pointer disabled:opacity-50"
                        title={`Generate valid ${barcodeSettings.format} number`}
                      >
                        <Wand2 className="w-3 h-3 stroke-[1.5]" />
                        <span>{isGeneratingValue ? 'Generating...' : 'Generate Valid Number'}</span>
                      </button>
                    )}
                    <span className="text-xs text-gray-400">
                      {type === 'barcode' ? 'SKU or digits' : 'URL, text or SKU'}
                    </span>
                  </div>
                </div>

                <input
                  type="text"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder={type === 'barcode' ? 'Enter barcode characters or digits' : 'https://example.com or custom text'}
                  className={`w-full h-9 px-3 bg-white border rounded-lg text-sm font-mono text-gray-900 placeholder:text-gray-400 focus:outline-none transition-colors ${
                    !validationResult.isValid
                      ? 'border-red-400 focus:ring-2 focus:ring-red-100'
                      : 'border-gray-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20'
                  }`}
                />

                {/* Inline error and auto-fix actions */}
                {!validationResult.isValid && (
                  <div className="mt-2 space-y-2">
                    <p className="text-xs text-red-600 font-medium">
                      {validationResult.error}
                    </p>

                    <div className="flex flex-wrap items-center gap-2">
                      {validationResult.canAutoFixCheckDigit && validationResult.suggestedFullNumber && (
                        <button
                          type="button"
                          onClick={() => {
                            setValue(validationResult.suggestedFullNumber);
                            toast.success(`Check digit added: ${validationResult.suggestedFullNumber}`);
                          }}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 rounded-lg transition-colors cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5 stroke-[1.5]" />
                          <span>
                            Add correct check digit (+{validationResult.suggestedCheckDigit}): <strong>{validationResult.suggestedFullNumber}</strong>
                          </span>
                        </button>
                      )}

                      {type === 'barcode' && ['EAN13', 'EAN8', 'UPC'].includes(barcodeSettings.format) && (
                        <button
                          type="button"
                          onClick={handleGenerateValidNumber}
                          disabled={isGeneratingValue}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-indigo-600 hover:text-indigo-700 bg-white hover:bg-gray-50 border border-gray-300 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                        >
                          <Wand2 className="w-3.5 h-3.5 stroke-[1.5]" />
                          <span>Generate valid {barcodeSettings.format} number</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Collapsible Section 1: Artboard */}
            <CollapsibleSection
              title="Artboard"
              subtitle="Label or card canvas the code is placed on"
              icon={Layers}
              badge={artboardSettings.preset === 'auto' ? 'Auto' : artboardSettings.preset.replace('_', ' ')}
              isOpen={openSections.artboard}
              onToggle={() => toggleSection('artboard')}
            >
              <ArtboardControls
                settings={artboardSettings}
                onChange={setArtboardSettings}
                codeDimensions={{
                  widthPx: type === 'barcode' ? toPx(barcodeSettings.width, barcodeSettings.unit) : toPx(qrSettings.size, qrSettings.unit),
                  heightPx: type === 'barcode' ? toPx(barcodeSettings.height, barcodeSettings.unit) : toPx(qrSettings.size, qrSettings.unit),
                }}
                scannabilityWarning={warnings.scannabilityWarning}
                codeExceedsWarning={warnings.codeExceedsWarning}
              />
            </CollapsibleSection>

            {/* Collapsible Section 2: Code Size */}
            <CollapsibleSection
              title="Code Size"
              subtitle="Width, height, and module scaling of the code"
              icon={Maximize2}
              badge={`${type === 'barcode' ? `${barcodeSettings.width}×${barcodeSettings.height}` : `${qrSettings.size}×${qrSettings.size}`} ${activeSettings.unit}`}
              isOpen={openSections.codeSize}
              onToggle={() => toggleSection('codeSize')}
            >
              {type === 'barcode' ? (
                <BarcodeControls
                  settings={barcodeSettings}
                  onChange={setBarcodeSettings}
                  validationError={!validationResult.isValid ? validationResult.error : null}
                  calculatedModuleWidth={calculatedModuleWidth}
                  sizeError={sizeError}
                  section="size"
                />
              ) : (
                <QrControls
                  settings={qrSettings}
                  onChange={setQrSettings}
                  validationError={!validationResult.isValid ? validationResult.error : null}
                  sizeError={sizeError}
                  section="size"
                />
              )}
            </CollapsibleSection>

            {/* Collapsible Section 3: Colors & Styling */}
            <CollapsibleSection
              title="Colors & Styling"
              subtitle="Symbology, foreground & background colors, style"
              icon={Palette}
              isOpen={openSections.colors}
              onToggle={() => toggleSection('colors')}
            >
              {type === 'barcode' ? (
                <BarcodeControls
                  settings={barcodeSettings}
                  onChange={setBarcodeSettings}
                  validationError={!validationResult.isValid ? validationResult.error : null}
                  section="colors"
                />
              ) : (
                <QrControls
                  settings={qrSettings}
                  onChange={setQrSettings}
                  validationError={!validationResult.isValid ? validationResult.error : null}
                  section="colors"
                />
              )}
            </CollapsibleSection>

            {/* Collapsible Section 4: Label Text */}
            <CollapsibleSection
              title="Label Text"
              subtitle="Optional caption or product price under code"
              icon={Type}
              badge={activeSettings.label ? 'Set' : 'None'}
              isOpen={openSections.label}
              onToggle={() => toggleSection('label')}
            >
              {type === 'barcode' ? (
                <BarcodeControls
                  settings={barcodeSettings}
                  onChange={setBarcodeSettings}
                  section="label"
                />
              ) : (
                <QrControls
                  settings={qrSettings}
                  onChange={setQrSettings}
                  section="label"
                />
              )}
            </CollapsibleSection>
          </div>
        </div>
      </div>
    </div>
  );
}
