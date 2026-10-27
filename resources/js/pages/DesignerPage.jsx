import React, { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Barcode, QrCode, PenTool, Sparkles, ArrowLeft, Wand2, Check } from 'lucide-react';

import BarcodeControls from '../features/designer/BarcodeControls';
import QrControls from '../features/designer/QrControls';
import PreviewPanel from '../features/designer/PreviewPanel';
import ProductPicker from '../features/designer/ProductPicker';
import Skeleton from '../components/Skeleton';

import { getCode, createCode, updateCode } from '../api/codes';
import { getProduct } from '../api/products';
import { generateBarcodeNumber } from '../api/barcodes';
import { validateBarcode, validateQr } from '../utils/validators';
import { validateDimension, fromPx, toPx } from '../utils/units';
import {
  captureElementAsBlob,
  downloadElementAsPng,
  downloadSvgElement,
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

export default function DesignerPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const captureRef = useRef(null);

  // Core state
  const [type, setType] = useState('barcode'); // 'barcode' | 'qr'
  const [name, setName] = useState('My Product Barcode');
  const [value, setValue] = useState('AUD-WNC-001');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [dpi, setDpi] = useState(300);

  const [barcodeSettings, setBarcodeSettings] = useState(DEFAULT_BARCODE_SETTINGS);
  const [qrSettings, setQrSettings] = useState(DEFAULT_QR_SETTINGS);
  const [calculatedModuleWidth, setCalculatedModuleWidth] = useState(null);
  const [isGeneratingValue, setIsGeneratingValue] = useState(false);

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

  const isValid = validationResult.isValid && !sizeError;

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
      toast.error(validationResult.error || sizeError || 'Please correct errors before saving.');
      return;
    }

    try {
      // Capture element as blob at chosen DPI
      const blob = await captureElementAsBlob(captureRef.current, dpi);

      const settingsToSave = {
        ...activeSettings,
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
      toast.error('Failed to capture code preview.');
    }
  };

  // Action: Download PNG
  const handleDownloadPng = async (exportDpi) => {
    try {
      const filename = `${name.toLowerCase().replace(/[^a-z0-9]/g, '_') || 'code'}.png`;
      await downloadElementAsPng(captureRef.current, filename, exportDpi);
      toast.success(`PNG downloaded at ${exportDpi} DPI!`);
    } catch (err) {
      toast.error('Failed to download PNG.');
    }
  };

  // Action: Download SVG
  const handleDownloadSvg = (svgElement, physicalW, physicalH, unit) => {
    try {
      const filename = `${name.toLowerCase().replace(/[^a-z0-9]/g, '_') || 'barcode'}.svg`;
      downloadSvgElement(svgElement, filename, physicalW, physicalH, unit);
      toast.success(`SVG downloaded (${physicalW} ${unit})!`);
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            {id && (
              <button
                type="button"
                onClick={() => navigate('/')}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <PenTool className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              {id ? 'Edit Code' : 'Barcode & QR Designer'}
            </h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Generate crisp, print-ready barcodes and QR codes with precise measurement units.
          </p>
        </div>

        {/* Toggle Barcode | QR Code */}
        <div className="inline-flex p-1 bg-slate-200/70 rounded-xl self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setType('barcode')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
              type === 'barcode'
                ? 'bg-white text-indigo-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Barcode className="w-4 h-4" />
            <span>Barcode</span>
          </button>
          <button
            type="button"
            onClick={() => setType('qr')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
              type === 'qr'
                ? 'bg-white text-indigo-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <QrCode className="w-4 h-4" />
            <span>QR Code</span>
          </button>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="flex flex-col lg:grid lg:grid-cols-12 gap-6 lg:h-[calc(100vh-10.5rem)] lg:overflow-hidden items-start">
        {/* Left Column: Controls (scrolls independently on desktop) */}
        <div className="order-2 lg:order-1 lg:col-span-7 space-y-6 lg:h-full lg:overflow-y-auto lg:pr-3 min-h-0 w-full">
          {/* Card 1: Data Source & Content */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="font-semibold text-slate-900 text-base">Content & Product Link</h2>
              <span className="text-xs text-slate-400">Step 1</span>
            </div>

            {/* Code Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Code Label / Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Wireless Headphones SKU Barcode"
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
              />
            </div>

            {/* Product Autocomplete Picker */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Link with Stock Product <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                {selectedProduct && (
                  <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> Synced with stock
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
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Encoded Value <span className="text-rose-500">*</span>
                </label>
                <div className="flex items-center gap-2">
                  {type === 'barcode' && ['EAN13', 'EAN8', 'UPC', 'CODE128'].includes(barcodeSettings.format) && (
                    <button
                      type="button"
                      onClick={handleGenerateValidNumber}
                      disabled={isGeneratingValue}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-2 py-0.5 rounded-md transition-colors cursor-pointer disabled:opacity-50"
                      title={`Generate valid ${barcodeSettings.format} number`}
                    >
                      <Wand2 className="w-3 h-3" />
                      <span>{isGeneratingValue ? 'Generating...' : 'Generate Valid Number'}</span>
                    </button>
                  )}
                  <span className="text-xs text-slate-400">
                    {type === 'barcode' ? 'SKU or digits' : 'URL, text or SKU'}
                  </span>
                </div>
              </div>

              <input
                type="text"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={type === 'barcode' ? 'Enter barcode characters or digits' : 'https://example.com or custom text'}
                className={`w-full px-3.5 py-2.5 bg-white border rounded-xl text-sm font-mono text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-all ${
                  !validationResult.isValid
                    ? 'border-rose-400 focus:ring-rose-100'
                    : 'border-slate-300 focus:border-indigo-500 focus:ring-indigo-100'
                }`}
              />

              {/* Inline error and auto-fix actions */}
              {!validationResult.isValid && (
                <div className="mt-2 space-y-2">
                  <p className="text-xs text-rose-500 font-medium">
                    {validationResult.error}
                  </p>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* 1-click check digit auto-fix suggestion */}
                    {validationResult.canAutoFixCheckDigit && validationResult.suggestedFullNumber && (
                      <button
                        type="button"
                        onClick={() => {
                          setValue(validationResult.suggestedFullNumber);
                          toast.success(`Check digit added: ${validationResult.suggestedFullNumber}`);
                        }}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>
                          Add correct check digit (+{validationResult.suggestedCheckDigit}): <strong>{validationResult.suggestedFullNumber}</strong>
                        </span>
                      </button>
                    )}

                    {/* Generate valid number when format needs numbers */}
                    {type === 'barcode' && ['EAN13', 'EAN8', 'UPC'].includes(barcodeSettings.format) && (
                      <button
                        type="button"
                        onClick={handleGenerateValidNumber}
                        disabled={isGeneratingValue}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                      >
                        <Wand2 className="w-3.5 h-3.5" />
                        <span>Generate valid {barcodeSettings.format} number</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Card 2: Visual Styling Controls & Measurement Sizing */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
              <h2 className="font-semibold text-slate-900 text-base">
                {type === 'barcode' ? 'Barcode Sizing & Design' : 'QR Code Sizing & Styling'}
              </h2>
              <span className="text-xs text-slate-400">Step 2</span>
            </div>

            {type === 'barcode' ? (
              <BarcodeControls
                settings={barcodeSettings}
                onChange={setBarcodeSettings}
                validationError={!validationResult.isValid ? validationResult.error : null}
                calculatedModuleWidth={calculatedModuleWidth}
                sizeError={sizeError}
              />
            ) : (
              <QrControls
                settings={qrSettings}
                onChange={setQrSettings}
                validationError={!validationResult.isValid ? validationResult.error : null}
                sizeError={sizeError}
              />
            )}
          </div>
        </div>

        {/* Right Column: Live Preview & Action Controls */}
        <div className="order-1 lg:order-2 lg:col-span-5 w-full sticky top-0 lg:static z-20 bg-slate-50 lg:bg-transparent pb-3 lg:pb-0 lg:h-full lg:overflow-y-auto lg:pl-1 min-h-0">
          <PreviewPanel
            type={type}
            format={activeSettings.format}
            value={value}
            settings={activeSettings}
            isValid={isValid}
            validationError={validationResult.error || sizeError}
            captureRef={captureRef}
            onSave={handleSave}
            onDownloadPng={handleDownloadPng}
            onDownloadSvg={handleDownloadSvg}
            onReset={handleReset}
            isSaving={saveMutation.isPending}
            dpi={dpi}
            onDpiChange={handleDpiChange}
            onCalculatedModuleWidth={setCalculatedModuleWidth}
          />
        </div>
      </div>
    </div>
  );
}
