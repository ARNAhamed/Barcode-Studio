import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  Barcode,
  QrCode,
  ArrowLeft,
  Save,
} from 'lucide-react';

import DesignGroupControls from '../features/designer/DesignGroupControls';
import AdvancedAccordion from '../features/designer/AdvancedAccordion';
import PreviewPanel from '../features/designer/PreviewPanel';
import ProductPicker from '../features/designer/ProductPicker';
import CompactTemplatePicker from '../features/templates/CompactTemplatePicker';
import SaveTemplateModal from '../features/templates/SaveTemplateModal';
import TemplateManagerModal from '../features/templates/TemplateManagerModal';
import Skeleton from '../components/Skeleton';
import PageHeader from '../components/PageHeader';
import Button from '../components/Button';

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
  convertUnit,
  DEFAULT_ARTBOARD_SETTINGS,
} from '../utils/units';
import {
  captureElementAsBlob,
  downloadElementAsPng,
  downloadSvgElement,
  downloadArtboardSvg,
} from '../utils/downloadHelpers';

const DEFAULT_BARCODE_SETTINGS = {
  unit: 'mm',
  width: 60,
  height: 25,
  lockAspectRatio: true,
  aspectRatio: 2.4,
  format: 'CODE128',
  margin: 6,
  displayValue: true,
  fontSize: 14,
  lineColor: '#000000',
  background: '#ffffff',
  label: '',
  labelFontSize: 11,
  labelFontUnit: 'pt',
  labelGap: 4,
  labelWeight: 'normal',
  labelAlign: 'center',
  dpi: 300,
};

const DEFAULT_QR_SETTINGS = {
  unit: 'mm',
  size: 35,
  errorCorrection: 'Q',
  dotStyle: 'rounded',
  cornerStyle: 'extra-rounded',
  foreground: '#0F172A',
  background: '#ffffff',
  logo: null,
  label: '',
  labelFontSize: 11,
  labelFontUnit: 'pt',
  labelGap: 4,
  labelWeight: 'normal',
  labelAlign: 'center',
  dpi: 300,
};

// Default Artboard for new designs: Medium shelf-label 60x40 mm
const INITIAL_ARTBOARD_SETTINGS = {
  ...DEFAULT_ARTBOARD_SETTINGS,
  preset: 'shelf_label',
  unit: 'mm',
  width: 60,
  height: 40,
  orientation: 'landscape',
};

// Helper to extract comparable design attributes
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
      border: Boolean(artboard?.border?.enabled),
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
  const labelInputRef = useRef(null); // Ref for label input in Design group

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
  const [artboardSettings, setArtboardSettings] = useState(INITIAL_ARTBOARD_SETTINGS);

  // Templates state
  const [appliedTemplate, setAppliedTemplate] = useState(null);
  const [appliedTemplateSnapshot, setAppliedTemplateSnapshot] = useState(null);
  const [isSaveTemplateModalOpen, setIsSaveTemplateModalOpen] = useState(false);
  const [isManagerModalOpen, setIsManagerModalOpen] = useState(false);
  const [isUpdatingTemplate, setIsUpdatingTemplate] = useState(false);

  const [calculatedModuleWidth, setCalculatedModuleWidth] = useState(null);
  const [isGeneratingValue, setIsGeneratingValue] = useState(false);
  const [warnings, setWarnings] = useState({ scannabilityWarning: null, codeExceedsWarning: null });

  // Baseline snapshot for change tracking (Saved / Unsaved changes)
  const [baselineSnapshot, setBaselineSnapshot] = useState(null);

  // Query: Templates list
  const { data: templates = [], isLoading: isLoadingTemplates } = useQuery({
    queryKey: ['templates'],
    queryFn: async () => {
      const res = await getTemplates();
      return res.data || [];
    },
  });

  // Active settings shortcut
  const activeSettings = type === 'barcode' ? barcodeSettings : qrSettings;

  // Track if current design differs from applied template
  const currentDesignSnapshot = JSON.stringify(
    extractDesignSettings(type, activeSettings, artboardSettings, dpi)
  );

  const isTemplateModified = Boolean(
    appliedTemplate &&
    appliedTemplateSnapshot &&
    currentDesignSnapshot !== appliedTemplateSnapshot
  );

  // Track if user has modified anything since loading/saving
  const isModified = baselineSnapshot !== null && currentDesignSnapshot !== baselineSnapshot;

  // Load last used template & colors from localStorage for new designs
  const initialMemoryLoadedRef = useRef(false);
  useEffect(() => {
    if (id || initialMemoryLoadedRef.current || templates.length === 0) return;
    initialMemoryLoadedRef.current = true;

    // Check last used template
    const lastTemplateId = localStorage.getItem('designer_last_template_id');
    const defaultTemplate = templates.find((t) => t.type === type && t.is_default);
    const targetTemplate =
      (lastTemplateId && templates.find((t) => String(t.id) === String(lastTemplateId) && t.type === type)) ||
      defaultTemplate;

    if (targetTemplate) {
      applyTemplateSettings(targetTemplate, true, false);
    } else {
      // Check saved colors
      try {
        const savedColors = JSON.parse(localStorage.getItem('designer_last_colors') || '{}');
        if (savedColors.lineColor) {
          setBarcodeSettings((prev) => ({ ...prev, lineColor: savedColors.lineColor, background: savedColors.background || '#ffffff' }));
        }
        if (savedColors.foreground) {
          setQrSettings((prev) => ({ ...prev, foreground: savedColors.foreground, background: savedColors.background || '#ffffff' }));
        }
      } catch (e) {
        // ignore
      }
      setBaselineSnapshot(currentDesignSnapshot);
    }
  }, [id, templates, type]);

  // Apply template settings
  const applyTemplateSettings = (tpl, skipConfirm = false, showToast = true) => {
    if (appliedTemplate && isTemplateModified && !skipConfirm) {
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
      ...INITIAL_ARTBOARD_SETTINGS,
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
    setBaselineSnapshot(snapshot);
    localStorage.setItem('designer_last_template_id', String(tpl.id));

    if (showToast) {
      toast.success(`Applied template "${tpl.name}"`);
    }
    return true;
  };

  // Switch Barcode & QR modes
  const handleTypeChange = (newType) => {
    if (newType === type) return;
    if (appliedTemplate && isTemplateModified) {
      const confirmed = window.confirm(
        'Switching format will change template settings. Discard modifications?'
      );
      if (!confirmed) return;
    }
    setType(newType);

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

  // Update applied template
  const handleUpdateAppliedTemplate = async () => {
    if (!appliedTemplate) return;
    setIsUpdatingTemplate(true);
    try {
      const settingsToSave = {
        ...activeSettings,
        ...(type === 'qr' ? { linkToProductPage } : {}),
        artboard: { ...artboardSettings },
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
      toast.error('Failed to update template.');
    } finally {
      setIsUpdatingTemplate(false);
    }
  };

  // Helper for SaveTemplateModal thumbnail
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

  // Populate state when editing existing code
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

      const restoredArtboard = c.settings?.artboard
        ? { ...INITIAL_ARTBOARD_SETTINGS, ...c.settings.artboard }
        : { ...INITIAL_ARTBOARD_SETTINGS, preset: 'auto' };
      setArtboardSettings(restoredArtboard);

      let restoredCodeSettings;
      if (c.type === 'barcode') {
        const savedUnit = c.settings?.unit || 'mm';
        restoredCodeSettings = {
          ...DEFAULT_BARCODE_SETTINGS,
          ...(c.settings || {}),
          unit: savedUnit,
          format: c.format || c.settings?.format || 'CODE128',
          dpi: savedDpi,
        };
        setBarcodeSettings(restoredCodeSettings);
      } else {
        const savedUnit = c.settings?.unit || 'mm';
        restoredCodeSettings = {
          ...DEFAULT_QR_SETTINGS,
          ...(c.settings || {}),
          unit: savedUnit,
          dpi: savedDpi,
        };
        setQrSettings(restoredCodeSettings);
      }

      const snapshot = JSON.stringify(
        extractDesignSettings(c.type, restoredCodeSettings, restoredArtboard, savedDpi)
      );
      setBaselineSnapshot(snapshot);

      if (c.template_id && templates.length > 0) {
        const foundTpl = templates.find((t) => t.id === c.template_id);
        if (foundTpl) {
          setAppliedTemplate(foundTpl);
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
      handleSelectProduct(initialProductData.data);
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

  // Generate valid number
  const handleGenerateValidNumber = async () => {
    setIsGeneratingValue(true);
    try {
      const targetFormat = barcodeSettings.format || 'EAN13';
      const res = await generateBarcodeNumber(targetFormat);
      setValue(res.number);
      toast.success(`Generated valid ${res.format}: ${res.number}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to generate number.');
    } finally {
      setIsGeneratingValue(false);
    }
  };

  // Color swap handler
  const handleSwapColors = () => {
    if (type === 'barcode') {
      const oldLine = barcodeSettings.lineColor || '#000000';
      const oldBg = barcodeSettings.background || '#ffffff';
      setBarcodeSettings((prev) => ({ ...prev, lineColor: oldBg, background: oldLine }));
      if (artboardSettings.preset !== 'auto') {
        setArtboardSettings((prev) => ({ ...prev, background: oldLine }));
      }
      localStorage.setItem('designer_last_colors', JSON.stringify({ lineColor: oldBg, background: oldLine }));
    } else {
      const oldFg = qrSettings.foreground || '#0F172A';
      const oldBg = qrSettings.background || '#ffffff';
      setQrSettings((prev) => ({ ...prev, foreground: oldBg, background: oldFg }));
      if (artboardSettings.preset !== 'auto') {
        setArtboardSettings((prev) => ({ ...prev, background: oldFg }));
      }
      localStorage.setItem('designer_last_colors', JSON.stringify({ foreground: oldBg, background: oldFg }));
    }
  };

  // Reset Advanced Settings only
  const handleResetAdvanced = () => {
    setArtboardSettings(INITIAL_ARTBOARD_SETTINGS);
    if (type === 'barcode') {
      setBarcodeSettings((prev) => ({
        ...prev,
        margin: 6,
        displayValue: true,
        fontSize: 14,
        labelFontSize: 11,
        labelFontUnit: 'pt',
        labelGap: 4,
        labelWeight: 'normal',
        labelAlign: 'center',
        lockAspectRatio: true,
      }));
    } else {
      setQrSettings((prev) => ({
        ...prev,
        errorCorrection: 'Q',
        dotStyle: 'rounded',
        cornerStyle: 'extra-rounded',
        logo: null,
        labelFontSize: 11,
        labelFontUnit: 'pt',
        labelGap: 4,
        labelWeight: 'normal',
        labelAlign: 'center',
      }));
    }
    toast.success('Advanced settings restored to defaults.');
  };

  // Action: Save to Gallery
  const saveMutation = useMutation({
    mutationFn: async (formData) => {
      if (id) {
        return await updateCode(id, formData);
      }
      return await createCode(formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['codes'] });
      setBaselineSnapshot(currentDesignSnapshot);
      toast.success(id ? 'Code updated successfully!' : 'Code saved to Gallery!');
      navigate('/');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to save code to gallery.');
    },
  });

  const handleSave = async () => {
    if (!isValid) {
      toast.error(validationResult.error || sizeError || artboardError || 'Please correct errors before saving.');
      return;
    }

    try {
      const captureNode =
        artboardSettings.preset !== 'auto' && !artboardSettings.exportCodeOnly
          ? captureRef.current
          : codeCaptureRef.current || captureRef.current;

      const blob = await captureElementAsBlob(captureNode, dpi);

      const settingsToSave = {
        ...activeSettings,
        artboard: { ...artboardSettings },
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
      toast.error('Failed to capture preview image.');
    }
  };

  // Action: Duplicate as new
  const handleDuplicate = () => {
    setName((prev) => `${prev} (Copy)`);
    navigate('/designer', { replace: true });
    toast.success('Duplicated as new design. Click Save when ready.');
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
      toast.success(`PNG downloaded (${exportDpi} DPI)`);
    } catch (err) {
      toast.error('Failed to download PNG.');
    }
  };

  // Action: Download SVG
  const handleDownloadSvg = () => {
    try {
      const filename = `${name.toLowerCase().replace(/[^a-z0-9]/g, '_') || 'code'}.svg`;
      const hasLbl = Boolean(activeSettings.label && activeSettings.label.trim());
      const labelFontUnit = activeSettings.labelFontUnit || 'pt';
      const labelFontSize = Number(activeSettings.labelFontSize || (labelFontUnit === 'pt' ? 12 : 16));
      const labelFontSizePx = labelFontUnit === 'pt' ? (labelFontSize * 96) / 72 : labelFontSize;
      const labelGapPx = hasLbl ? Math.max(0, Number(activeSettings.labelGap !== undefined ? activeSettings.labelGap : 4)) : 0;
      const labelWeight = activeSettings.labelWeight || 'normal';
      const labelAlign = activeSettings.labelAlign || 'center';

      const labelOptions = hasLbl ? {
        text: activeSettings.label,
        fontSize: labelFontSize,
        fontUnit: labelFontUnit,
        gap: labelGapPx,
        weight: labelWeight,
        align: labelAlign,
      } : null;

      const codeW = toPx(activeSettings.width || activeSettings.size, activeSettings.unit);
      const codeH = toPx(activeSettings.height || activeSettings.size, activeSettings.unit);

      const estimatedCharW = labelFontSizePx * 0.55;
      const estimatedTextW = hasLbl ? activeSettings.label.trim().length * estimatedCharW : 0;
      const isLabelWider = hasLbl && estimatedTextW > codeW;
      const labelLines = isLabelWider ? Math.min(3, Math.ceil(estimatedTextW / Math.max(80, codeW))) : 1;
      const labelPxHeight = hasLbl ? Math.round(labelFontSizePx * 1.35 * labelLines) : 0;
      const totalH = codeH + (hasLbl ? labelGapPx + labelPxHeight : 0);

      if (artboardSettings.preset !== 'auto' && !artboardSettings.exportCodeOnly) {
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
        toast.success(`Artboard SVG downloaded (${artboardSettings.width} × ${artboardSettings.height} ${artboardSettings.unit})`);
      } else {
        downloadSvgElement(
          barcodeSvgRef.current,
          filename,
          activeSettings.width || activeSettings.size,
          activeSettings.height || activeSettings.size,
          activeSettings.unit,
          labelOptions
        );
        toast.success('Code SVG downloaded');
      }
    } catch (err) {
      toast.error('Failed to download SVG.');
    }
  };

  // Action: Reset All
  const handleReset = () => {
    if (appliedTemplate) {
      applyTemplateSettings(appliedTemplate, true, false);
      toast.success(`Reset to "${appliedTemplate.name}" template.`);
      return;
    }
    if (type === 'barcode') {
      setBarcodeSettings(DEFAULT_BARCODE_SETTINGS);
    } else {
      setQrSettings(DEFAULT_QR_SETTINGS);
    }
    setArtboardSettings(INITIAL_ARTBOARD_SETTINGS);
    setDpi(300);
    toast.success('Reset to defaults.');
  };

  // Focus label text input from preview canvas click
  const handleFocusLabelInput = () => {
    if (labelInputRef.current) {
      labelInputRef.current.focus();
      labelInputRef.current.classList.add('ring-2', 'ring-indigo-500');
      setTimeout(() => {
        labelInputRef.current?.classList.remove('ring-2', 'ring-indigo-500');
      }, 1000);
    }
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
    <div className="flex flex-col flex-1 min-h-0 w-full h-full lg:overflow-hidden pb-14 lg:pb-0">
      {/* Header */}
      <PageHeader
        title={id ? 'Edit Code' : 'Designer'}
        className="shrink-0 pb-2 mb-2.5 border-b border-gray-200"
        action={
          <div className="flex items-center gap-2">
            {id && (
              <button
                type="button"
                onClick={() => navigate('/')}
                className="inline-flex items-center gap-1.5 px-3 h-9 text-xs font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5 stroke-[1.5]" />
                <span>Back</span>
              </button>
            )}

            {/* Code Title Input */}
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Code title"
              className="h-9 px-3 bg-white border border-gray-300 rounded-lg text-xs font-medium text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 transition-colors w-40 sm:w-56"
            />
          </div>
        }
      />

      {/* Main Two-Pane Layout: PREVIEW on LEFT (65-70%), EDITOR on RIGHT (30-35%, clamped 340-440px) */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-4 lg:gap-5 items-stretch w-full overflow-hidden">
        {/* Left Column: Live Preview (fills remaining width, fixed on desktop, sticky on mobile) */}
        <div className="order-1 lg:order-1 lg:flex-1 w-full min-w-0 sticky top-0 lg:static z-20 bg-[#FAFAFA] lg:bg-transparent pb-2 lg:pb-0 h-[360px] sm:h-[400px] lg:h-full lg:overflow-hidden flex flex-col">
          <PreviewPanel
            type={type}
            format={activeSettings.format}
            value={value}
            onChangeValue={setValue}
            settings={activeSettings}
            artboardSettings={artboardSettings}
            onArtboardChange={setArtboardSettings}
            isValid={isValid}
            validationError={validationResult.error || sizeError || artboardError}
            validationResult={validationResult}
            captureRef={captureRef}
            codeCaptureRef={codeCaptureRef}
            barcodeSvgRef={barcodeSvgRef}
            onSave={handleSave}
            onDownloadPng={handleDownloadPng}
            onDownloadSvg={handleDownloadSvg}
            onReset={handleReset}
            onDuplicate={handleDuplicate}
            onAutoFixCheckDigit={(suggested) => {
              setValue(suggested);
              toast.success(`Check digit added: ${suggested}`);
            }}
            onGenerateValidNumber={handleGenerateValidNumber}
            onEditLabel={handleFocusLabelInput}
            isSaving={saveMutation.isPending}
            isModified={isModified}
            dpi={dpi}
            onDpiChange={handleDpiChange}
            onCalculatedModuleWidth={setCalculatedModuleWidth}
            onWarningsUpdate={setWarnings}
          />
        </div>

        {/* Right Column: Controls Editor (clamped 340px to 440px, scrolls independently) */}
        <div className="order-2 lg:order-2 w-full lg:w-[380px] xl:w-[420px] min-w-0 lg:min-w-[340px] lg:max-w-[440px] shrink-0 lg:h-full lg:overflow-y-auto lg:pr-1 pb-20 lg:pb-8 [scrollbar-width:thin] [overscroll-behavior:contain]">
          <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100 overflow-hidden min-w-0">
            {/* a) Top Row: Mode Toggle + Template & Product Row */}
            <div className="p-4 space-y-3 bg-gray-50/60 min-w-0">
              {/* Barcode | QR Code Toggle */}
              <div className="grid grid-cols-2 p-0.5 bg-gray-200/70 rounded-lg border border-gray-300 min-w-0">
                <button
                  type="button"
                  onClick={() => handleTypeChange('barcode')}
                  className={`h-8 rounded-md text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer min-w-0 truncate ${
                    type === 'barcode'
                      ? 'bg-white text-indigo-700 font-semibold shadow-xs'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Barcode className="w-3.5 h-3.5 stroke-[1.5] shrink-0" />
                  <span className="truncate">Barcode</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleTypeChange('qr')}
                  className={`h-8 rounded-md text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer min-w-0 truncate ${
                    type === 'qr'
                      ? 'bg-white text-indigo-700 font-semibold shadow-xs'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <QrCode className="w-3.5 h-3.5 stroke-[1.5] shrink-0" />
                  <span className="truncate">QR Code</span>
                </button>
              </div>

              {/* Template & Product Picker on One Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 min-w-0">
                <div className="min-w-0">
                  <label className="block text-[11px] font-medium text-gray-700 mb-1 truncate">
                    Template
                  </label>
                  <CompactTemplatePicker
                    type={type}
                    templates={templates}
                    appliedTemplate={appliedTemplate}
                    isModified={isTemplateModified}
                    onSelectTemplate={(tpl) => applyTemplateSettings(tpl)}
                    onResetToTemplate={handleResetToTemplate}
                    onOpenSaveModal={() => setIsSaveTemplateModalOpen(true)}
                    onUpdateTemplate={handleUpdateAppliedTemplate}
                    onOpenManager={() => setIsManagerModalOpen(true)}
                    isUpdating={isUpdatingTemplate}
                  />
                </div>

                <div className="min-w-0">
                  <label className="block text-[11px] font-medium text-gray-700 mb-1 truncate">
                    Product
                  </label>
                  <ProductPicker
                    selectedProduct={selectedProduct}
                    onSelectProduct={handleSelectProduct}
                    onClearProduct={handleClearProduct}
                  />
                </div>
              </div>
            </div>

            {/* b) "Design" Group (Always Visible, Everyday Controls) */}
            <div className="p-4 space-y-4">
              <DesignGroupControls
                type={type}
                value={value}
                onChangeValue={setValue}
                format={activeSettings.format}
                onChangeFormat={(newFmt) => setBarcodeSettings((prev) => ({ ...prev, format: newFmt }))}
                onGenerateValidNumber={handleGenerateValidNumber}
                isGeneratingValue={isGeneratingValue}
                selectedProduct={selectedProduct}
                linkToProductPage={linkToProductPage}
                onToggleLinkToProductPage={handleToggleLinkToProductPage}
                settings={activeSettings}
                onChangeSettings={(newSt) => {
                  if (type === 'barcode') setBarcodeSettings(newSt);
                  else setQrSettings(newSt);
                }}
                artboardSettings={artboardSettings}
                onChangeArtboard={setArtboardSettings}
                onSwapColors={handleSwapColors}
                labelInputRef={labelInputRef}
              />
            </div>

            {/* c) "Advanced" Accordion (Collapsed by Default, One Group at a Time) */}
            <AdvancedAccordion
              type={type}
              settings={activeSettings}
              onChangeSettings={(newSt) => {
                if (type === 'barcode') setBarcodeSettings(newSt);
                else setQrSettings(newSt);
              }}
              artboardSettings={artboardSettings}
              onChangeArtboard={setArtboardSettings}
              dpi={dpi}
              onChangeDpi={handleDpiChange}
              onResetAdvanced={handleResetAdvanced}
            />
          </div>
        </div>
      </div>

      {/* Sticky Save Button for Mobile / Small Screens */}
      <div className="fixed bottom-0 left-0 right-0 p-3 bg-white/95 backdrop-blur border-t border-gray-200 z-30 lg:hidden flex items-center justify-between gap-3 shadow-lg">
        <div className="text-xs">
          {isModified ? (
            <span className="text-gray-400 font-medium">Unsaved changes</span>
          ) : (
            <span className="text-emerald-700 font-medium">Saved</span>
          )}
        </div>
        <Button
          variant="primary"
          size="md"
          className="flex-1 max-w-[200px] h-9 text-xs font-semibold"
          icon={Save}
          disabled={!isValid || Boolean(validationResult.error) || Boolean(sizeError) || Boolean(artboardError)}
          isLoading={saveMutation.isPending}
          onClick={handleSave}
        >
          Save
        </Button>
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
