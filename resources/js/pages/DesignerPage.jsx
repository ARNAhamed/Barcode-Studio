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

import TemplateBar from '../features/templates/TemplateBar';
import SaveTemplateModal from '../features/templates/SaveTemplateModal';
import TemplateManagerModal from '../features/templates/TemplateManagerModal';

import { getCode, createCode, updateCode } from '../api/codes';
import { getProduct } from '../api/products';
import { generateBarcodeNumber } from '../api/barcodes';
import { getTemplates, updateTemplate } from '../api/templates';
import { validateBarcode, validateQr } from '../utils/validators';
import { fillPlaceholders, hasPlaceholders } from '../utils/placeholders';
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
  labelFontSize: 12,
  labelFontUnit: 'pt',
  labelGap: 4,
  labelWeight: 'normal',
  labelAlign: 'center',
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
  labelFontSize: 12,
  labelFontUnit: 'pt',
  labelGap: 4,
  labelWeight: 'normal',
  labelAlign: 'center',
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

// Helper to extract comparable design attributes (excluding encoded value and dynamic UI states)
const extractDesignSettings = (mode, codeSettings, artboard, exportDpi) => {
  const base = {
    mode,
    dpi: exportDpi || 300,
    artboard: {
      preset: artboard?.preset,
      width: Number(artboard?.width),
      height: Number(artboard?.height),
      unit: artboard?.unit,
      orientation: artboard?.orientation,
      background: artboard?.background,
      border: Boolean(artboard?.border),
      radius: Number(artboard?.radius),
      alignment: artboard?.alignment,
      padding: Number(artboard?.padding),
      fit: artboard?.fit,
      xOffset: Number(artboard?.xOffset),
      yOffset: Number(artboard?.yOffset),
      exportCodeOnly: Boolean(artboard?.exportCodeOnly),
    },
  };

  if (mode === 'barcode') {
    return {
      ...base,
      format: codeSettings?.format,
      unit: codeSettings?.unit,
      width: Number(codeSettings?.width),
      height: Number(codeSettings?.height),
      lockAspectRatio: Boolean(codeSettings?.lockAspectRatio),
      margin: Number(codeSettings?.margin),
      displayValue: Boolean(codeSettings?.displayValue),
      fontSize: Number(codeSettings?.fontSize),
      lineColor: codeSettings?.lineColor,
      background: codeSettings?.background,
      labelFontSize: Number(codeSettings?.labelFontSize),
      labelFontUnit: codeSettings?.labelFontUnit,
      labelGap: Number(codeSettings?.labelGap),
      labelWeight: codeSettings?.labelWeight,
      labelAlign: codeSettings?.labelAlign,
      labelPattern: codeSettings?.labelPattern || '',
    };
  } else {
    return {
      ...base,
      unit: codeSettings?.unit,
      size: Number(codeSettings?.size),
      errorCorrection: codeSettings?.errorCorrection,
      dotStyle: codeSettings?.dotStyle,
      cornerStyle: codeSettings?.cornerStyle,
      foreground: codeSettings?.foreground,
      background: codeSettings?.background,
      labelFontSize: Number(codeSettings?.labelFontSize),
      labelFontUnit: codeSettings?.labelFontUnit,
      labelGap: Number(codeSettings?.labelGap),
      labelWeight: codeSettings?.labelWeight,
      labelAlign: codeSettings?.labelAlign,
      labelPattern: codeSettings?.labelPattern || '',
    };
  }
};

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
  const [linkToProductPage, setLinkToProductPage] = useState(true);
  const [dpi, setDpi] = useState(300);

  // Settings
  const [barcodeSettings, setBarcodeSettings] = useState(DEFAULT_BARCODE_SETTINGS);
  const [qrSettings, setQrSettings] = useState(DEFAULT_QR_SETTINGS);
  const [artboardSettings, setArtboardSettings] = useState(DEFAULT_ARTBOARD_SETTINGS);

  // Templates state
  const [appliedTemplate, setAppliedTemplate] = useState(null);
  const [appliedTemplateSnapshot, setAppliedTemplateSnapshot] = useState(null);
  const [isSaveTemplateModalOpen, setIsSaveTemplateModalOpen] = useState(false);
  const [isManagerModalOpen, setIsManagerModalOpen] = useState(false);
  const [isUpdatingTemplate, setIsUpdatingTemplate] = useState(false);
  const isInitialTemplateLoaded = useRef(false);

  const [calculatedModuleWidth, setCalculatedModuleWidth] = useState(null);
  const [isGeneratingValue, setIsGeneratingValue] = useState(false);
  const [warnings, setWarnings] = useState({ scannabilityWarning: null, codeExceedsWarning: null });

  // Query: Templates list
  const { data: templates = [], isLoading: isLoadingTemplates } = useQuery({
    queryKey: ['templates'],
    queryFn: async () => {
      const res = await getTemplates();
      return res.data || [];
    },
  });

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

  // Active settings shortcut
  const activeSettings = type === 'barcode' ? barcodeSettings : qrSettings;

  // Track if current design differs from applied template
  const currentDesignSnapshot = JSON.stringify(
    extractDesignSettings(type, activeSettings, artboardSettings, dpi)
  );
  const isModified = Boolean(
    appliedTemplate &&
    appliedTemplateSnapshot &&
    currentDesignSnapshot !== appliedTemplateSnapshot
  );

  // Apply template settings
  const applyTemplateSettings = (tpl, skipConfirm = false, showToast = true) => {
    if (appliedTemplate && isModified && !skipConfirm) {
      const confirmed = window.confirm(
        'You have unsaved modifications to your current design. Apply template and overwrite design settings?'
      );
      if (!confirmed) return false;
    }

    if (!tpl) {
      setAppliedTemplate(null);
      setAppliedTemplateSnapshot(null);
      return true;
    }

    const targetType = tpl.type;
    setType(targetType);

    // Artboard
    const newArtboard = {
      ...DEFAULT_ARTBOARD_SETTINGS,
      ...(tpl.settings?.artboard || {}),
    };
    setArtboardSettings(newArtboard);

    // DPI
    const newDpi = tpl.settings?.dpi || 300;
    setDpi(newDpi);

    if (tpl.settings?.linkToProductPage !== undefined) {
      setLinkToProductPage(Boolean(tpl.settings.linkToProductPage));
    }

    // Label Pattern
    const currentPattern = tpl.settings?.labelPattern || tpl.settings?.label || '';
    const resolvedLabel = selectedProduct && currentPattern
      ? fillPlaceholders(currentPattern, selectedProduct)
      : (tpl.settings?.label || currentPattern);

    let newCodeSettings;
    if (targetType === 'barcode') {
      newCodeSettings = {
        ...DEFAULT_BARCODE_SETTINGS,
        ...tpl.settings,
        label: resolvedLabel,
        labelPattern: currentPattern,
        dpi: newDpi,
      };
      delete newCodeSettings.artboard;
      delete newCodeSettings.value;
      setBarcodeSettings(newCodeSettings);
    } else {
      newCodeSettings = {
        ...DEFAULT_QR_SETTINGS,
        ...tpl.settings,
        label: resolvedLabel,
        labelPattern: currentPattern,
        dpi: newDpi,
        linkToProductPage: tpl.settings?.linkToProductPage !== undefined ? Boolean(tpl.settings.linkToProductPage) : true,
      };
      delete newCodeSettings.artboard;
      delete newCodeSettings.value;
      setQrSettings(newCodeSettings);
    }

    setAppliedTemplate(tpl);
    const snapshot = JSON.stringify(
      extractDesignSettings(targetType, newCodeSettings, newArtboard, newDpi)
    );
    setAppliedTemplateSnapshot(snapshot);

    if (showToast) {
      toast.success(`Applied template "${tpl.name}"`);
    }
    return true;
  };

  // Switch between Barcode & QR modes
  const handleTypeChange = (newType) => {
    if (newType === type) return;
    if (appliedTemplate && isModified) {
      const confirmed = window.confirm(
        'Switching format will change template settings. Discard modifications?'
      );
      if (!confirmed) return;
    }
    setType(newType);

    // Find default template for newType
    const defaultForNewType = templates.find((t) => t.type === newType && t.is_default);
    if (defaultForNewType) {
      applyTemplateSettings(defaultForNewType, true, false);
    } else {
      setAppliedTemplate(null);
      setAppliedTemplateSnapshot(null);
    }
  };

  // Reset to applied template
  const handleResetToTemplate = () => {
    if (!appliedTemplate) return;
    applyTemplateSettings(appliedTemplate, true, true);
  };

  // Update applied template with current design modifications
  const handleUpdateAppliedTemplate = async () => {
    if (!appliedTemplate) return;
    setIsUpdatingTemplate(true);
    try {
      const settingsToSave = {
        ...activeSettings,
        ...(type === 'qr' ? { linkToProductPage } : {}),
        artboard: {
          ...artboardSettings,
        },
        dpi,
      };
      delete settingsToSave.value;

      let thumbnailBlob = null;
      const captureNode =
        artboardSettings.preset !== 'auto' && !artboardSettings.exportCodeOnly
          ? captureRef.current
          : codeCaptureRef.current || captureRef.current;

      if (captureNode) {
        try {
          thumbnailBlob = await captureElementAsBlob(captureNode, 150);
        } catch (e) {
          console.warn('Could not capture updated thumbnail', e);
        }
      }

      const formData = new FormData();
      formData.append('name', appliedTemplate.name);
      formData.append('type', appliedTemplate.type);
      formData.append('settings', JSON.stringify(settingsToSave));
      if (thumbnailBlob) {
        formData.append('thumbnail', thumbnailBlob, 'thumbnail.png');
      }

      const res = await updateTemplate(appliedTemplate.id, formData);
      const updated = res.data;
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      setAppliedTemplate(updated);
      setAppliedTemplateSnapshot(
        JSON.stringify(extractDesignSettings(type, activeSettings, artboardSettings, dpi))
      );
      toast.success(`Template "${updated.name}" updated!`);
    } catch (err) {
      console.error('Update template error:', err);
      toast.error('Failed to update template.');
    } finally {
      setIsUpdatingTemplate(false);
    }
  };

  // Helper to capture preview thumbnail for SaveTemplateModal
  const captureTemplateThumbnail = async () => {
    const captureNode =
      artboardSettings.preset !== 'auto' && !artboardSettings.exportCodeOnly
        ? captureRef.current
        : codeCaptureRef.current || captureRef.current;
    if (!captureNode) return null;
    return await captureElementAsBlob(captureNode, 150);
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
      const restoredArtboard = c.settings?.artboard
        ? { ...DEFAULT_ARTBOARD_SETTINGS, ...c.settings.artboard }
        : { ...DEFAULT_ARTBOARD_SETTINGS, preset: 'auto' };
      setArtboardSettings(restoredArtboard);

      let restoredCodeSettings;
      if (c.type === 'barcode') {
        const savedUnit = c.settings?.unit || 'px';
        const savedWidth = c.settings?.width !== undefined ? c.settings.width : 260;
        const savedHeight = c.settings?.height !== undefined ? c.settings.height : 100;

        restoredCodeSettings = {
          ...DEFAULT_BARCODE_SETTINGS,
          ...(c.settings || {}),
          unit: savedUnit,
          width: savedWidth,
          height: savedHeight,
          format: c.format || c.settings?.format || 'CODE128',
          dpi: savedDpi,
        };
        setBarcodeSettings(restoredCodeSettings);
      } else {
        const savedUnit = c.settings?.unit || 'px';
        const savedSize = c.settings?.size !== undefined ? c.settings.size : 220;

        restoredCodeSettings = {
          ...DEFAULT_QR_SETTINGS,
          ...(c.settings || {}),
          unit: savedUnit,
          size: savedSize,
          dpi: savedDpi,
        };
        setQrSettings(restoredCodeSettings);
      }

      // If code was created from a template, link it and set baseline snapshot
      if (c.template_id && templates.length > 0) {
        const foundTpl = templates.find((t) => t.id === c.template_id);
        if (foundTpl) {
          setAppliedTemplate(foundTpl);
          const snapshot = JSON.stringify(
            extractDesignSettings(c.type, restoredCodeSettings, restoredArtboard, savedDpi)
          );
          setAppliedTemplateSnapshot(snapshot);
        }
      }
    }
  }, [codeData, templates]);

  // Handle URL pre-selection: /designer?product_id=X
  const initialProductId = searchParams.get('product_id');
  const { data: initialProductData } = useQuery({
    queryKey: ['product', initialProductId],
    queryFn: () => getProduct(initialProductId),
    enabled: Boolean(initialProductId) && !id,
  });

  // Format validation
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
    let autoValue = product.barcode_number || product.sku || '';
    if (type === 'qr' && linkToProductPage) {
      autoValue = product.public_url || `${window.location.origin}/p/${product.public_token || ''}`;
    }
    setValue(autoValue);
    setName(`${product.name} ${type === 'barcode' ? 'Barcode' : 'QR Code'}`);

    const currentPattern =
      activeSettings.labelPattern ||
      (hasPlaceholders(activeSettings.label) ? activeSettings.label : '{name} • {price}');

    const labelText = fillPlaceholders(currentPattern, product);

    if (type === 'barcode') {
      setBarcodeSettings((prev) => ({
        ...prev,
        label: labelText,
        labelPattern: currentPattern,
        format: product.barcode_number && /^\d{12,13}$/.test(product.barcode_number) ? 'EAN13' : prev.format,
      }));
    } else {
      setQrSettings((prev) => ({
        ...prev,
        label: labelText,
        labelPattern: currentPattern,
      }));
    }
  };

  const handleToggleLinkToProductPage = (checked) => {
    setLinkToProductPage(checked);
    if (!selectedProduct) return;
    if (checked) {
      const url = selectedProduct.public_url || `${window.location.origin}/p/${selectedProduct.public_token || ''}`;
      setValue(url);
    } else {
      setValue(selectedProduct.barcode_number || selectedProduct.sku || '');
    }
  };

  const handleClearProduct = () => {
    setSelectedProduct(null);
  };

  useEffect(() => {
    if (initialProductData?.data && !id) {
      const p = initialProductData.data;
      handleSelectProduct(p);
    }
  }, [initialProductData, id]);

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
        template_id: appliedTemplate?.id || null,
        template_name: appliedTemplate?.name || null,
      };

      const formData = new FormData();
      formData.append('name', name.trim() || 'Untitled Code');
      formData.append('type', type);
      formData.append('format', type === 'barcode' ? (barcodeSettings.format || 'CODE128') : 'QR');
      formData.append('value', value.trim());
      formData.append('settings', JSON.stringify(settingsToSave));

      if (appliedTemplate?.id) {
        formData.append('template_id', appliedTemplate.id);
      }

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
      const hasLabel = Boolean(activeSettings.label && activeSettings.label.trim());
      const labelFontUnit = activeSettings.labelFontUnit || 'pt';
      const labelFontSize = Number(activeSettings.labelFontSize || (labelFontUnit === 'pt' ? 12 : 16));
      const labelFontSizePx = labelFontUnit === 'pt' ? (labelFontSize * 96) / 72 : labelFontSize;
      const labelGapPx = hasLabel ? Math.max(0, Number(activeSettings.labelGap !== undefined ? activeSettings.labelGap : 4)) : 0;
      const labelWeight = activeSettings.labelWeight || 'normal';
      const labelAlign = activeSettings.labelAlign || 'center';

      const labelOptions = hasLabel ? {
        text: activeSettings.label,
        fontSize: labelFontSize,
        fontUnit: labelFontUnit,
        gap: labelGapPx,
        weight: labelWeight,
        align: labelAlign,
      } : null;

      const codeW = toPx(activeSettings.width || activeSettings.size, activeSettings.unit);
      const codeH = toPx(activeSettings.height || activeSettings.size, activeSettings.unit);

      // Estimate label height
      const estimatedCharWidth = labelFontSizePx * 0.55;
      const estimatedTextWidth = hasLabel ? activeSettings.label.trim().length * estimatedCharWidth : 0;
      const isLabelWider = hasLabel && estimatedTextWidth > codeW;
      const labelLines = isLabelWider ? Math.min(3, Math.ceil(estimatedTextWidth / Math.max(80, codeW))) : 1;
      const labelPxHeight = hasLabel ? Math.round(labelFontSizePx * 1.35 * labelLines) : 0;
      const totalH = codeH + (hasLabel ? labelGapPx + labelPxHeight : 0);

      if (artboardSettings.preset !== 'auto' && !artboardSettings.exportCodeOnly) {
        // Export entire Artboard as SVG
        const artboardPxW = toPx(artboardSettings.width, artboardSettings.unit);
        const artboardPxH = toPx(artboardSettings.height, artboardSettings.unit);

        let fitScale = 1;
        const paddingPx = toPx(artboardSettings.padding || 5, artboardSettings.unit);
        const availW = Math.max(10, artboardPxW - (2 * paddingPx));
        const availH = Math.max(10, artboardPxH - (2 * paddingPx));

        if (artboardSettings.fit === 'fit') {
          fitScale = Math.min(availW / codeW, availH / totalH);
        } else if (artboardSettings.fit === 'fill-width') {
          fitScale = availW / codeW;
        }

        const scaledW = codeW * fitScale;
        const scaledH = totalH * fitScale;

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
          labelOptions,
          codeRawWidth: codeW,
          codeRawHeight: codeH,
        });
        toast.success(`Artboard SVG downloaded (${artboardSettings.width} × ${artboardSettings.height} ${artboardSettings.unit})!`);
      } else {
        // Code-only SVG download
        downloadSvgElement(
          barcodeSvgRef.current,
          filename,
          activeSettings.width || activeSettings.size,
          activeSettings.height || activeSettings.size,
          activeSettings.unit,
          labelOptions
        );
        toast.success(`Code SVG downloaded!`);
      }
    } catch (err) {
      toast.error('Failed to download SVG.');
    }
  };

  // Action: Reset
  const handleReset = () => {
    if (appliedTemplate) {
      applyTemplateSettings(appliedTemplate, true, false);
      toast.success(`Reset to applied "${appliedTemplate.name}" template.`);
      return;
    }
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
    <div className="flex flex-col flex-1 min-h-0 w-full h-full lg:overflow-hidden">
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
                onClick={() => handleTypeChange('barcode')}
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
                onClick={() => handleTypeChange('qr')}
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
        <div className="order-2 lg:order-2 w-full lg:w-[380px] xl:w-[420px] min-w-0 lg:min-w-[340px] lg:max-w-[440px] shrink-0 lg:h-full lg:overflow-y-auto lg:pr-1 [scrollbar-width:thin] [overscroll-behavior:contain]">
          <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100 overflow-hidden">
            {/* Top Bar: Design Templates */}
            <TemplateBar
              type={type}
              templates={templates}
              appliedTemplate={appliedTemplate}
              isModified={isModified}
              onSelectTemplate={(tpl) => applyTemplateSettings(tpl)}
              onResetToTemplate={handleResetToTemplate}
              onOpenSaveModal={() => setIsSaveTemplateModalOpen(true)}
              onUpdateTemplate={handleUpdateAppliedTemplate}
              onOpenManager={() => setIsManagerModalOpen(true)}
              isUpdating={isUpdatingTemplate}
            />

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

                {type === 'qr' && selectedProduct && (
                  <div className="mt-2.5 p-2 bg-indigo-50/70 border border-indigo-100 rounded-lg flex items-center justify-between gap-3 text-xs">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={linkToProductPage}
                        onChange={(e) => handleToggleLinkToProductPage(e.target.checked)}
                        className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-gray-300 cursor-pointer"
                      />
                      <span className="font-medium text-gray-900">Link to product page</span>
                    </label>
                    <span className="text-[11px] text-indigo-700 font-mono truncate max-w-[200px]" title={value}>
                      {value}
                    </span>
                  </div>
                )}
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
                  selectedProduct={selectedProduct}
                />
              ) : (
                <QrControls
                  settings={qrSettings}
                  onChange={setQrSettings}
                  section="label"
                  selectedProduct={selectedProduct}
                />
              )}
            </CollapsibleSection>
          </div>
        </div>
      </div>

      {/* Save as Template Modal */}
      <SaveTemplateModal
        isOpen={isSaveTemplateModalOpen}
        onClose={() => setIsSaveTemplateModalOpen(false)}
        type={type}
        currentDesign={{
          barcodeSettings,
          qrSettings: { ...qrSettings, linkToProductPage },
          artboardSettings,
          dpi,
        }}
        captureThumbnail={captureTemplateThumbnail}
        onSaved={(newTpl) => {
          queryClient.invalidateQueries({ queryKey: ['templates'] });
          applyTemplateSettings(newTpl, true, false);
        }}
      />

      {/* Template Manager Modal */}
      <TemplateManagerModal
        isOpen={isManagerModalOpen}
        onClose={() => setIsManagerModalOpen(false)}
        activeMode={type}
        appliedTemplateId={appliedTemplate?.id}
        onApplyTemplate={(tpl) => applyTemplateSettings(tpl)}
      />
    </div>
  );
}
