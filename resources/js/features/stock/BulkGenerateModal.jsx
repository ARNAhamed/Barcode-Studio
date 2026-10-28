import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { toPng } from 'html-to-image';
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  X,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Printer,
  LayoutGrid,
  Check,
  RotateCcw,
  RefreshCw,
  FileText,
  Bookmark,
  ChevronRight,
  Eye,
} from 'lucide-react';

import Modal from '../../components/Modal';
import Button from '../../components/Button';
import Badge from '../../components/Badge';
import { getTemplates } from '../../api/templates';
import { bulkGenerateBarcodes } from '../../api/products';
import { bulkCreateCodes } from '../../api/codes';
import { AVAILABLE_PLACEHOLDERS, fillPlaceholders } from '../../utils/placeholders';
import { validateBarcode, validateQr } from '../../utils/validators';
import BulkCodeRenderer from './BulkCodeRenderer';

export default function BulkGenerateModal({
  isOpen,
  onClose,
  selectedProducts = [],
  onSuccess,
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Wizard Step: 1 = Settings, 2 = Preview, 3 = Generate & Results
  const [step, setStep] = useState(1);

  // Step 1 Settings State
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [valueSource, setValueSource] = useState('barcode'); // 'barcode' | 'sku' | 'custom'
  const [customValuePattern, setCustomValuePattern] = useState('{sku}');
  const [labelMode, setLabelMode] = useState('template'); // 'template' | 'custom'
  const [customLabelPattern, setCustomLabelPattern] = useState('{name}');
  const [missingBarcodeAction, setMissingBarcodeAction] = useState('generate'); // 'generate' | 'sku' | 'skip'
  const [invalidValueAction, setInvalidValueAction] = useState('autofix'); // 'autofix' | 'skip'
  const [existingCodeAction, setExistingCodeAction] = useState('create_another'); // 'create_another' | 'replace' | 'skip'
  const [namingPattern, setNamingPattern] = useState('{name}');

  // Step 2 Preview State
  const [previewFilter, setPreviewFilter] = useState('all'); // 'all' | 'problems'
  const [evaluatedItems, setEvaluatedItems] = useState([]);

  // Step 3 Generation State
  const [generationState, setGenerationState] = useState('idle'); // 'idle' | 'running' | 'cancelled' | 'completed'
  const [currentProgressIndex, setCurrentProgressIndex] = useState(0);
  const [currentItemName, setCurrentItemName] = useState('');
  const [batchId, setBatchId] = useState(null);
  const [createdResults, setCreatedResults] = useState([]);
  const [failedResults, setFailedResults] = useState([]);
  const [isCancelled, setIsCancelled] = useState(false);
  const cancelRef = useRef(false);

  // Hidden Offscreen DOM element for capturing rendered codes
  const [renderItem, setRenderItem] = useState(null);
  const offscreenCaptureRef = useRef(null);

  // Fetch templates
  const { data: templatesResponse, isLoading: isTemplatesLoading } = useQuery({
    queryKey: ['templates-active'],
    queryFn: () => getTemplates(),
    enabled: isOpen,
  });

  const templates = templatesResponse?.data || [];

  // Default pre-selection for template
  useEffect(() => {
    if (templates.length > 0 && !selectedTemplateId) {
      const defaultTpl = templates.find((t) => t.is_default) || templates[0];
      setSelectedTemplateId(String(defaultTpl.id));
    }
  }, [templates, selectedTemplateId]);

  const selectedTemplate = useMemo(() => {
    return templates.find((t) => String(t.id) === String(selectedTemplateId)) || null;
  }, [templates, selectedTemplateId]);

  // Cap selection to 500 products
  const cappedProducts = useMemo(() => {
    return selectedProducts.slice(0, 500);
  }, [selectedProducts]);

  const hasExceededCap = selectedProducts.length > 500;

  // Reset modal on close
  const handleClose = () => {
    if (generationState === 'running') {
      if (!window.confirm('A generation run is in progress. Are you sure you want to exit? Completed codes will be preserved.')) {
        return;
      }
      cancelRef.current = true;
      setIsCancelled(true);
    }
    setStep(1);
    setEvaluatedItems([]);
    setGenerationState('idle');
    setCreatedResults([]);
    setFailedResults([]);
    setIsCancelled(false);
    cancelRef.current = false;
    onClose();
  };

  // Insert placeholder token at cursor
  const handleInsertPlaceholder = (setter, token) => {
    setter((prev) => (prev ? `${prev} ${token}` : token));
  };

  // Evaluate products when moving to Step 2
  const handleProceedToPreview = () => {
    if (!selectedTemplate) {
      toast.error('Please choose a design template to proceed.');
      return;
    }

    const tplType = selectedTemplate.type;
    const tplFormat = selectedTemplate.settings?.format || (tplType === 'qr' ? 'QR' : 'CODE128');
    const tplLabelPattern = selectedTemplate.settings?.label_pattern || selectedTemplate.settings?.label?.text || '';

    const items = cappedProducts.map((product) => {
      let rawValue = '';
      if (valueSource === 'barcode') {
        rawValue = (product.barcode_number || '').trim();
      } else if (valueSource === 'sku') {
        rawValue = (product.sku || '').trim();
      } else if (valueSource === 'public_url') {
        rawValue = product.public_url || `${window.location.origin}/p/${product.public_token || ''}`;
      } else {
        rawValue = fillPlaceholders(customValuePattern, product).trim();
      }

      let status = 'ready'; // 'ready' | 'will_generate' | 'warning' | 'error' | 'skipped'
      let reason = 'Ready to generate';
      let autoFixedValue = null;
      let effectiveValue = rawValue;

      // 1. Missing value handling
      if (!effectiveValue) {
        if (valueSource === 'barcode' && missingBarcodeAction === 'generate') {
          status = 'will_generate';
          reason = 'Missing barcode; will generate valid number automatically';
        } else if (valueSource === 'barcode' && missingBarcodeAction === 'sku' && product.sku) {
          effectiveValue = product.sku.trim();
        } else {
          status = 'skipped';
          reason = 'Missing barcode value on product';
        }
      }

      // 2. Format validation (if we have a value and not already generating a new number)
      if (status !== 'will_generate' && status !== 'skipped' && effectiveValue) {
        if (tplType === 'qr') {
          const valRes = validateQr(effectiveValue);
          if (!valRes.isValid) {
            status = 'error';
            reason = valRes.error || 'Invalid QR code content';
          }
        } else {
          const valRes = validateBarcode(tplFormat, effectiveValue);
          if (!valRes.isValid) {
            if (invalidValueAction === 'autofix') {
              if (valRes.canAutoFixCheckDigit && valRes.suggestedFullNumber) {
                status = 'warning';
                reason = `Invalid check digit; will auto-fix to ${valRes.suggestedFullNumber}`;
                autoFixedValue = valRes.suggestedFullNumber;
                effectiveValue = valRes.suggestedFullNumber;
              } else if (['EAN13', 'EAN8', 'UPC', 'CODE128'].includes(tplFormat)) {
                status = 'will_generate';
                reason = `Invalid ${tplFormat} format; will generate new valid number`;
              } else {
                status = 'error';
                reason = valRes.error || `Invalid value for ${tplFormat}`;
              }
            } else {
              status = 'error';
              reason = valRes.error || `Invalid value for ${tplFormat}`;
            }
          }
        }
      }

      // 3. Existing code check
      const hasExistingCode = (product.codes_count || 0) > 0;
      if (hasExistingCode) {
        if (existingCodeAction === 'skip') {
          status = 'skipped';
          reason = 'Product already has a saved code';
        } else if (existingCodeAction === 'replace') {
          if (status === 'ready' || status === 'warning') {
            reason = `${reason} (will replace existing code)`;
          }
        }
      }

      // 4. Resolve label text
      const patternToUse = labelMode === 'template' ? tplLabelPattern : customLabelPattern;
      const labelText = fillPlaceholders(patternToUse, product);

      // 5. Resolve code name
      const codeName = fillPlaceholders(namingPattern || '{name}', product) || product.name || 'Untitled Code';

      return {
        product,
        value: effectiveValue,
        autoFixedValue,
        format: tplFormat,
        type: tplType,
        status,
        reason,
        labelText,
        codeName,
      };
    });

    setEvaluatedItems(items);
    setStep(2);
  };

  // Preview counts
  const summaryCounts = useMemo(() => {
    const total = evaluatedItems.length;
    const ready = evaluatedItems.filter((i) => i.status === 'ready').length;
    const willGenerate = evaluatedItems.filter((i) => i.status === 'will_generate').length;
    const warnings = evaluatedItems.filter((i) => i.status === 'warning').length;
    const errors = evaluatedItems.filter((i) => i.status === 'error').length;
    const skipped = evaluatedItems.filter((i) => i.status === 'skipped').length;
    const operableCount = ready + willGenerate + warnings;

    return {
      total,
      ready,
      willGenerate,
      warnings,
      errors,
      skipped,
      operableCount,
      problemCount: errors + skipped + warnings,
    };
  }, [evaluatedItems]);

  const filteredPreviewItems = useMemo(() => {
    if (previewFilter === 'problems') {
      return evaluatedItems.filter((i) => ['warning', 'error', 'skipped'].includes(i.status));
    }
    return evaluatedItems;
  }, [evaluatedItems, previewFilter]);

  // Thumbnails of first 3 ready/operable items
  const thumbnailSampleItems = useMemo(() => {
    return evaluatedItems
      .filter((i) => ['ready', 'warning', 'will_generate'].includes(i.status))
      .slice(0, 3);
  }, [evaluatedItems]);

  // Execute Step 3: Generation Run
  const handleStartGeneration = async () => {
    setStep(3);
    setGenerationState('running');
    setIsCancelled(false);
    cancelRef.current = false;
    setCurrentProgressIndex(0);
    setCreatedResults([]);
    setFailedResults([]);

    const runBatchId = crypto.randomUUID();
    setBatchId(runBatchId);

    // Filter items to create
    const itemsToProcess = evaluatedItems.filter((i) =>
      ['ready', 'warning', 'will_generate'].includes(i.status)
    );

    if (itemsToProcess.length === 0) {
      setGenerationState('completed');
      return;
    }

    // Step 3.1: Generate missing numbers if any
    const needNumberItems = itemsToProcess.filter((i) => i.status === 'will_generate');
    const updatedItems = [...itemsToProcess];

    if (needNumberItems.length > 0) {
      setCurrentItemName('Generating missing barcode numbers in database...');
      try {
        const productIds = needNumberItems.map((i) => i.product.id);
        const tplFormat = selectedTemplate?.settings?.format || 'CODE128';
        const res = await bulkGenerateBarcodes({
          product_ids: productIds,
          format: tplFormat,
        });

        // Map fresh numbers back to items
        const freshProducts = res.products || [];
        freshProducts.forEach((fp) => {
          const target = updatedItems.find((ui) => ui.product.id === fp.id);
          if (target && fp.barcode_number) {
            target.value = fp.barcode_number;
            target.product.barcode_number = fp.barcode_number;
            target.status = 'ready';
          }
        });
      } catch (err) {
        console.error('Failed to auto-generate barcodes:', err);
        toast.error('Failed to generate automatic barcode numbers.');
      }
    }

    // Step 3.2: Offscreen render & batch upload in chunks of 10
    const CHUNK_SIZE = 10;
    const totalToGenerate = updatedItems.length;
    const allCreated = [];
    const allFailed = [];

    for (let chunkStart = 0; chunkStart < totalToGenerate; chunkStart += CHUNK_SIZE) {
      if (cancelRef.current) {
        break;
      }

      const chunk = updatedItems.slice(chunkStart, chunkStart + CHUNK_SIZE);
      const renderedChunkPayloads = [];

      for (let i = 0; i < chunk.length; i++) {
        if (cancelRef.current) break;

        const currentItem = chunk[i];
        const overallIndex = chunkStart + i;
        setCurrentProgressIndex(overallIndex + 1);
        setCurrentItemName(`Generating ${overallIndex + 1} of ${totalToGenerate}: ${currentItem.codeName}`);

        // Mount current item into offscreen renderer
        setRenderItem({
          template: selectedTemplate,
          value: currentItem.value || currentItem.autoFixedValue || 'CODE',
          labelText: currentItem.labelText,
        });

        // Allow DOM tick for JsBarcode/QRCodeStyling to render
        await new Promise((resolve) => setTimeout(resolve, 60));

        let previewDataUrl = null;
        if (offscreenCaptureRef.current) {
          try {
            previewDataUrl = await toPng(offscreenCaptureRef.current, {
              cacheBust: true,
              skipFonts: true,
              backgroundColor: '#ffffff',
              pixelRatio: 1.5,
            });
          } catch (e) {
            console.warn('Preview capture fallback:', e);
          }
        }

        renderedChunkPayloads.push({
          name: currentItem.codeName,
          type: selectedTemplate.type,
          format: currentItem.format,
          value: currentItem.value || currentItem.autoFixedValue,
          product_id: currentItem.product.id,
          template_id: selectedTemplate.id,
          settings: {
            ...selectedTemplate.settings,
            label: {
              ...(selectedTemplate.settings?.label || {}),
              text: currentItem.labelText,
            },
            template_name: selectedTemplate.name,
          },
          replace_existing: existingCodeAction === 'replace',
          preview: previewDataUrl,
        });
      }

      if (cancelRef.current || renderedChunkPayloads.length === 0) {
        break;
      }

      // Send chunk to POST /api/codes/bulk
      try {
        const response = await bulkCreateCodes({
          batch_id: runBatchId,
          codes: renderedChunkPayloads,
        });

        const results = response.results || [];
        results.forEach((r, idx) => {
          if (r.success) {
            allCreated.push({
              id: r.id,
              name: r.name,
              product: chunk[idx]?.product,
            });
          } else {
            allFailed.push({
              name: r.name,
              error: r.error || 'Validation or database error',
            });
          }
        });

        setCreatedResults([...allCreated]);
        setFailedResults([...allFailed]);
      } catch (err) {
        const errorMsg = err.response?.data?.message || 'Server error processing chunk';
        chunk.forEach((item) => {
          allFailed.push({
            name: item.codeName,
            error: errorMsg,
          });
        });
        setFailedResults([...allFailed]);
      }
    }

    setRenderItem(null);

    if (cancelRef.current) {
      setGenerationState('cancelled');
      toast('Bulk generation stopped. Created codes have been preserved.');
    } else {
      setGenerationState('completed');
      if (allCreated.length > 0) {
        toast.success(`Successfully generated ${allCreated.length} codes!`);
      }
    }

    // Refresh query caches
    queryClient.invalidateQueries({ queryKey: ['codes'] });
    queryClient.invalidateQueries({ queryKey: ['products'] });
    queryClient.invalidateQueries({ queryKey: ['products-summary'] });
    if (onSuccess) onSuccess();
  };

  const handleCancelRun = () => {
    cancelRef.current = true;
    setIsCancelled(true);
  };

  const handleRetryFailed = () => {
    // Re-evaluates failed items
    handleProceedToPreview();
  };

  const progressPercent = evaluatedItems.filter((i) =>
    ['ready', 'warning', 'will_generate'].includes(i.status)
  ).length > 0
    ? Math.round(
        (currentProgressIndex /
          evaluatedItems.filter((i) =>
            ['ready', 'warning', 'will_generate'].includes(i.status)
          ).length) *
          100
      )
    : 100;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Bulk Generate Codes"
      description={
        step === 1
          ? `Configure template styling and barcode assignment for ${cappedProducts.length} selected product${cappedProducts.length === 1 ? '' : 's'}.`
          : step === 2
          ? `Review validation checks and preview thumbnails before generating.`
          : generationState === 'running'
          ? `Generating codes in progress...`
          : `Bulk generation results.`
      }
      maxWidth="max-w-4xl"
      fullScreenMobile={true}
      headerExtra={
        <div className="flex items-center gap-2 pt-2 border-t border-gray-100 text-xs">
          <div
            className={`flex items-center gap-1.5 font-medium ${
              step === 1 ? 'text-indigo-600' : 'text-gray-500'
            }`}
          >
            <span
              className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] ${
                step === 1
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700'
              }`}
            >
              1
            </span>
            <span>Settings</span>
          </div>

          <ChevronRight className="w-3.5 h-3.5 text-gray-400" />

          <div
            className={`flex items-center gap-1.5 font-medium ${
              step === 2 ? 'text-indigo-600' : 'text-gray-500'
            }`}
          >
            <span
              className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] ${
                step === 2
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700'
              }`}
            >
              2
            </span>
            <span>Preview & Validation</span>
          </div>

          <ChevronRight className="w-3.5 h-3.5 text-gray-400" />

          <div
            className={`flex items-center gap-1.5 font-medium ${
              step === 3 ? 'text-indigo-600' : 'text-gray-500'
            }`}
          >
            <span
              className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] ${
                step === 3
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700'
              }`}
            >
              3
            </span>
            <span>Generate & Results</span>
          </div>
        </div>
      }
      footer={
        step === 1 ? (
          <>
            <Button variant="secondary" size="md" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="md"
              icon={ArrowRight}
              onClick={handleProceedToPreview}
              disabled={templates.length === 0}
            >
              Next: Preview ({cappedProducts.length})
            </Button>
          </>
        ) : step === 2 ? (
          <>
            <Button
              variant="secondary"
              size="md"
              icon={ArrowLeft}
              onClick={() => setStep(1)}
            >
              Back to Settings
            </Button>
            <Button
              variant="primary"
              size="md"
              icon={Sparkles}
              onClick={handleStartGeneration}
              disabled={summaryCounts.operableCount === 0}
            >
              Generate {summaryCounts.operableCount} Codes
            </Button>
          </>
        ) : (
          /* Step 3 Footer */
          <>
            {generationState === 'running' ? (
              <Button
                variant="danger"
                size="md"
                onClick={handleCancelRun}
                disabled={isCancelled}
              >
                {isCancelled ? 'Cancelling...' : 'Cancel'}
              </Button>
            ) : (
              <>
                {failedResults.length > 0 && (
                  <Button
                    variant="secondary"
                    size="md"
                    icon={RotateCcw}
                    onClick={handleRetryFailed}
                  >
                    Retry Failed ({failedResults.length})
                  </Button>
                )}

                {createdResults.length > 0 && (
                  <Button
                    variant="secondary"
                    size="md"
                    icon={Printer}
                    onClick={() => {
                      const ids = createdResults.map((c) => c.id).join(',');
                      navigate(`/print?code_ids=${ids}`);
                    }}
                  >
                    Print Labels
                  </Button>
                )}

                {batchId && createdResults.length > 0 && (
                  <Button
                    variant="secondary"
                    size="md"
                    icon={LayoutGrid}
                    onClick={() => {
                      navigate(`/?batch_id=${batchId}`);
                    }}
                  >
                    View in Gallery
                  </Button>
                )}

                <Button variant="primary" size="md" onClick={handleClose}>
                  Close
                </Button>
              </>
            )}
          </>
        )
      }
    >
      {/* 500 Limit Alert Banner if applicable */}
      {hasExceededCap && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2.5 text-xs text-amber-900">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" strokeWidth={1.5} />
          <div>
            <strong>500 products limit:</strong> You selected {selectedProducts.length} products. A single run is limited to 500 products. Only the first 500 products will be processed.
          </div>
        </div>
      )}

      {/* Hidden Offscreen DOM Element for Capturing PNG previews */}
      <div
        style={{
          position: 'fixed',
          left: '-9999px',
          top: '-9999px',
          pointerEvents: 'none',
          opacity: 0,
        }}
        aria-hidden="true"
      >
        {renderItem && (
          <BulkCodeRenderer
            captureRef={offscreenCaptureRef}
            template={renderItem.template}
            value={renderItem.value}
            labelText={renderItem.labelText}
          />
        )}
      </div>

      {/* STEP 1: SETTINGS */}
      {step === 1 && (
        <div className="space-y-5 text-sm">
          {/* Template Selection */}
          <div>
            <label className="block text-xs font-semibold text-gray-800 mb-1.5">
              Design Template <span className="text-red-500">*</span>
            </label>
            {isTemplatesLoading ? (
              <div className="h-10 bg-gray-100 rounded-lg animate-pulse" />
            ) : templates.length === 0 ? (
              <div className="p-4 bg-gray-50 border border-dashed border-gray-300 rounded-lg text-center">
                <Bookmark className="w-6 h-6 text-gray-400 mx-auto mb-1.5" strokeWidth={1.5} />
                <p className="text-xs font-medium text-gray-700">No design templates available</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Save a template in the Designer to use it for bulk generation.
                </p>
                <Button
                  variant="secondary"
                  size="sm"
                  className="mt-2.5"
                  onClick={() => navigate('/designer')}
                  icon={ExternalLink}
                >
                  Open Designer
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {templates.map((tpl) => {
                  const isSelected = String(tpl.id) === String(selectedTemplateId);
                  const format = tpl.settings?.format || (tpl.type === 'qr' ? 'QR' : 'CODE128');
                  const artboard = tpl.settings?.artboard;
                  const dimensions = artboard?.width && artboard?.height
                    ? `${artboard.width} × ${artboard.height} ${artboard.unit || 'mm'}`
                    : 'Auto size';

                  return (
                    <div
                      key={tpl.id}
                      onClick={() => setSelectedTemplateId(String(tpl.id))}
                      className={`p-3 rounded-lg border text-left cursor-pointer transition-colors flex items-center gap-3 ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-50/40 ring-1 ring-indigo-600'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      {/* Thumbnail or fallback */}
                      <div className="w-12 h-12 rounded bg-zinc-100 border border-gray-200 shrink-0 flex items-center justify-center overflow-hidden">
                        {tpl.thumbnail_url ? (
                          <img
                            src={tpl.thumbnail_url}
                            alt={tpl.name}
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <Bookmark className="w-5 h-5 text-gray-400" strokeWidth={1.5} />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-gray-900 truncate text-xs">
                            {tpl.name}
                          </span>
                          {tpl.is_default && (
                            <span className="text-[10px] bg-amber-100 text-amber-800 px-1 rounded font-medium">
                              Default
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-gray-500 mt-0.5 flex items-center gap-2">
                          <span className="font-mono uppercase">{format}</span>
                          <span>&bull;</span>
                          <span>{dimensions}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="border-t border-gray-100 pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Code Value Source */}
            <div>
              <label className="block text-xs font-semibold text-gray-800 mb-1.5">
                Code Value Source
              </label>
              <div className="space-y-1.5">
                <label className="flex items-center gap-2 p-2 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                  <input
                    type="radio"
                    name="valueSource"
                    value="barcode"
                    checked={valueSource === 'barcode'}
                    onChange={() => setValueSource('barcode')}
                    className="text-indigo-600 focus:ring-indigo-500"
                  />
                  <div>
                    <div className="text-xs font-medium text-gray-900">Barcode number</div>
                    <div className="text-[11px] text-gray-500">
                      Product's assigned barcode number
                    </div>
                  </div>
                </label>

                <label className="flex items-center gap-2 p-2 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                  <input
                    type="radio"
                    name="valueSource"
                    value="sku"
                    checked={valueSource === 'sku'}
                    onChange={() => setValueSource('sku')}
                    className="text-indigo-600 focus:ring-indigo-500"
                  />
                  <div>
                    <div className="text-xs font-medium text-gray-900">SKU</div>
                    <div className="text-[11px] text-gray-500">Use product SKU directly</div>
                  </div>
                </label>

                <label className="flex items-center gap-2 p-2 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                  <input
                    type="radio"
                    name="valueSource"
                    value="public_url"
                    checked={valueSource === 'public_url'}
                    onChange={() => setValueSource('public_url')}
                    className="text-indigo-600 focus:ring-indigo-500"
                  />
                  <div>
                    <div className="text-xs font-medium text-gray-900">Product Page URL (QR)</div>
                    <div className="text-[11px] text-gray-500">Public product details URL (/p/{`{token}`})</div>
                  </div>
                </label>

                <label className="flex items-center gap-2 p-2 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                  <input
                    type="radio"
                    name="valueSource"
                    value="custom"
                    checked={valueSource === 'custom'}
                    onChange={() => setValueSource('custom')}
                    className="text-indigo-600 focus:ring-indigo-500"
                  />
                  <div>
                    <div className="text-xs font-medium text-gray-900">Custom pattern</div>
                    <div className="text-[11px] text-gray-500">Use combined placeholder tokens</div>
                  </div>
                </label>
              </div>

              {valueSource === 'custom' && (
                <div className="mt-2.5 p-2.5 bg-gray-50 border border-gray-200 rounded-lg">
                  <input
                    type="text"
                    value={customValuePattern}
                    onChange={(e) => setCustomValuePattern(e.target.value)}
                    placeholder="e.g. {sku}-{barcode}"
                    className="w-full h-8 px-2.5 text-xs bg-white border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  />
                  <div className="flex flex-wrap items-center gap-1 mt-1.5">
                    <span className="text-[10px] text-gray-400">Insert:</span>
                    {AVAILABLE_PLACEHOLDERS.map((p) => (
                      <button
                        key={p.tag}
                        type="button"
                        onClick={() => handleInsertPlaceholder(setCustomValuePattern, p.tag)}
                        className="text-[10px] bg-white border border-gray-200 hover:border-indigo-300 px-1.5 py-0.5 rounded text-gray-700 hover:text-indigo-600 cursor-pointer transition-colors"
                      >
                        {p.tag}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Label Text Pattern */}
            <div>
              <label className="block text-xs font-semibold text-gray-800 mb-1.5">
                Label Text
              </label>
              <div className="space-y-1.5">
                <label className="flex items-center gap-2 p-2 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                  <input
                    type="radio"
                    name="labelMode"
                    value="template"
                    checked={labelMode === 'template'}
                    onChange={() => setLabelMode('template')}
                    className="text-indigo-600 focus:ring-indigo-500"
                  />
                  <div>
                    <div className="text-xs font-medium text-gray-900">Use template's pattern</div>
                    <div className="text-[11px] text-gray-500">
                      {selectedTemplate?.settings?.label_pattern || selectedTemplate?.settings?.label?.text
                        ? `"${selectedTemplate.settings.label_pattern || selectedTemplate.settings.label?.text}"`
                        : 'No label pattern in template'}
                    </div>
                  </div>
                </label>

                <label className="flex items-center gap-2 p-2 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                  <input
                    type="radio"
                    name="labelMode"
                    value="custom"
                    checked={labelMode === 'custom'}
                    onChange={() => setLabelMode('custom')}
                    className="text-indigo-600 focus:ring-indigo-500"
                  />
                  <div>
                    <div className="text-xs font-medium text-gray-900">Override with custom pattern</div>
                    <div className="text-[11px] text-gray-500">Set custom label text for this run</div>
                  </div>
                </label>
              </div>

              {labelMode === 'custom' && (
                <div className="mt-2.5 p-2.5 bg-gray-50 border border-gray-200 rounded-lg">
                  <input
                    type="text"
                    value={customLabelPattern}
                    onChange={(e) => setCustomLabelPattern(e.target.value)}
                    placeholder="e.g. {name} - {price}"
                    className="w-full h-8 px-2.5 text-xs bg-white border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  />
                  <div className="flex flex-wrap items-center gap-1 mt-1.5">
                    <span className="text-[10px] text-gray-400">Insert:</span>
                    {AVAILABLE_PLACEHOLDERS.map((p) => (
                      <button
                        key={p.tag}
                        type="button"
                        onClick={() => handleInsertPlaceholder(setCustomLabelPattern, p.tag)}
                        className="text-[10px] bg-white border border-gray-200 hover:border-indigo-300 px-1.5 py-0.5 rounded text-gray-700 hover:text-indigo-600 cursor-pointer transition-colors"
                      >
                        {p.tag}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-gray-100 pt-4 grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {/* Products without barcode number */}
            <div>
              <label className="block text-xs font-semibold text-gray-800 mb-1">
                Products without barcode
              </label>
              <select
                value={missingBarcodeAction}
                onChange={(e) => setMissingBarcodeAction(e.target.value)}
                className="w-full h-8 text-xs bg-white border border-gray-300 rounded-lg px-2 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
              >
                <option value="generate">Generate automatically</option>
                <option value="sku">Use SKU instead</option>
                <option value="skip">Skip these products</option>
              </select>
              <p className="text-[10px] text-gray-400 mt-1">
                Generated numbers are saved to the product.
              </p>
            </div>

            {/* Invalid values handling */}
            <div>
              <label className="block text-xs font-semibold text-gray-800 mb-1">
                Invalid values
              </label>
              <select
                value={invalidValueAction}
                onChange={(e) => setInvalidValueAction(e.target.value)}
                className="w-full h-8 text-xs bg-white border border-gray-300 rounded-lg px-2 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
              >
                <option value="autofix">Auto-fix check digit / generate valid</option>
                <option value="skip">Skip invalid products</option>
              </select>
              <p className="text-[10px] text-gray-400 mt-1">
                Fixes GS1 check digits or assigns a valid number.
              </p>
            </div>

            {/* If product already has code */}
            <div>
              <label className="block text-xs font-semibold text-gray-800 mb-1">
                If code already exists
              </label>
              <select
                value={existingCodeAction}
                onChange={(e) => setExistingCodeAction(e.target.value)}
                className="w-full h-8 text-xs bg-white border border-gray-300 rounded-lg px-2 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
              >
                <option value="create_another">Create another</option>
                <option value="replace">Replace existing (move to Bin)</option>
                <option value="skip">Skip</option>
              </select>
              <p className="text-[10px] text-gray-400 mt-1">
                Decide how to resolve previous designs.
              </p>
            </div>
          </div>

          {/* Code Naming Pattern */}
          <div className="border-t border-gray-100 pt-4">
            <label className="block text-xs font-semibold text-gray-800 mb-1">
              Code Naming Pattern
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={namingPattern}
                onChange={(e) => setNamingPattern(e.target.value)}
                placeholder="{name}"
                className="flex-1 h-8 px-2.5 text-xs bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
              />
            </div>
            <div className="flex flex-wrap items-center gap-1 mt-1.5">
              <span className="text-[10px] text-gray-400">Tokens:</span>
              {AVAILABLE_PLACEHOLDERS.map((p) => (
                <button
                  key={p.tag}
                  type="button"
                  onClick={() => handleInsertPlaceholder(setNamingPattern, p.tag)}
                  className="text-[10px] bg-gray-50 border border-gray-200 hover:border-indigo-300 px-1.5 py-0.5 rounded text-gray-700 hover:text-indigo-600 cursor-pointer transition-colors"
                >
                  {p.tag}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: PREVIEW */}
      {step === 2 && (
        <div className="space-y-4">
          {/* Summary counters bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-gray-50 border border-gray-200 rounded-lg text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-gray-900">
                Total: {summaryCounts.total}
              </span>
              <span className="text-gray-300">&bull;</span>
              <span className="inline-flex items-center gap-1 text-green-700 bg-green-50 border border-green-200/80 px-2 py-0.5 rounded font-medium">
                Ready: {summaryCounts.ready}
              </span>
              {summaryCounts.willGenerate > 0 && (
                <span className="inline-flex items-center gap-1 text-indigo-700 bg-indigo-50 border border-indigo-200/80 px-2 py-0.5 rounded font-medium">
                  Will generate number: {summaryCounts.willGenerate}
                </span>
              )}
              {summaryCounts.warnings > 0 && (
                <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded font-medium">
                  Warnings: {summaryCounts.warnings}
                </span>
              )}
              {summaryCounts.errors > 0 && (
                <span className="inline-flex items-center gap-1 text-red-700 bg-red-50 border border-red-200/80 px-2 py-0.5 rounded font-medium">
                  Errors: {summaryCounts.errors}
                </span>
              )}
              {summaryCounts.skipped > 0 && (
                <span className="inline-flex items-center gap-1 text-gray-600 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded font-medium">
                  Skipped: {summaryCounts.skipped}
                </span>
              )}
            </div>

            {/* Filter Toggle */}
            <div className="inline-flex rounded-md border border-gray-300 bg-white p-0.5">
              <button
                type="button"
                onClick={() => setPreviewFilter('all')}
                className={`px-2.5 py-1 text-xs rounded transition-colors ${
                  previewFilter === 'all'
                    ? 'bg-gray-100 text-gray-900 font-medium'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                All ({summaryCounts.total})
              </button>
              <button
                type="button"
                onClick={() => setPreviewFilter('problems')}
                className={`px-2.5 py-1 text-xs rounded transition-colors ${
                  previewFilter === 'problems'
                    ? 'bg-amber-100 text-amber-900 font-medium'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Only Problems ({summaryCounts.problemCount})
              </button>
            </div>
          </div>

          {/* Live Thumbnails of First 3 Ready Items */}
          {thumbnailSampleItems.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-indigo-600" />
                  Live Preview Samples ({thumbnailSampleItems.length})
                </span>
                <span className="text-[11px] text-gray-400">
                  Rendered with template: {selectedTemplate?.name}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-zinc-100 rounded-lg border border-gray-200">
                {thumbnailSampleItems.map((item, idx) => (
                  <div
                    key={idx}
                    className="bg-white rounded border border-gray-200 p-2 flex flex-col items-center justify-between"
                  >
                    <div className="w-full flex items-center justify-center p-2 min-h-[90px] overflow-hidden">
                      <BulkCodeRenderer
                        template={selectedTemplate}
                        value={item.value || 'SAMPLE'}
                        labelText={item.labelText}
                        scale={0.45}
                      />
                    </div>
                    <div className="w-full text-center border-t border-gray-100 pt-1.5 mt-1">
                      <p className="text-[11px] font-semibold text-gray-900 truncate">
                        {item.product.name}
                      </p>
                      <p className="text-[10px] font-mono text-gray-500 truncate">
                        {item.value || '(Auto-generated)'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Compact Table (no horizontal scroll) */}
          <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
            <div className="max-h-[36vh] overflow-y-auto divide-y divide-gray-100 [scrollbar-width:thin]">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-gray-50 text-gray-500 sticky top-0 border-b border-gray-200 z-10">
                  <tr>
                    <th className="py-2 px-3 font-medium text-left">Product</th>
                    <th className="py-2 px-3 font-medium text-center">Value</th>
                    <th className="py-2 px-3 font-medium text-center">Format</th>
                    <th className="py-2 px-3 font-medium text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-gray-700">
                  {filteredPreviewItems.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="text-center py-6 text-gray-400">
                        No items match the current filter.
                      </td>
                    </tr>
                  ) : (
                    filteredPreviewItems.map((item, idx) => {
                      return (
                        <tr key={idx} className="hover:bg-gray-50/75">
                          {/* Product */}
                          <td className="py-2 px-3 text-left">
                            <div className="font-semibold text-gray-900 truncate max-w-[200px]" title={item.product.name}>
                              {item.product.name}
                            </div>
                            <div className="text-[11px] text-gray-400 font-mono">
                              SKU: {item.product.sku}
                            </div>
                          </td>

                          {/* Value */}
                          <td className="py-2 px-3 text-center font-mono text-[11px]">
                            {item.value ? (
                              <span className="truncate max-w-[140px] inline-block" title={item.value}>
                                {item.value}
                              </span>
                            ) : (
                              <span className="text-indigo-600 font-medium">
                                (Will generate)
                              </span>
                            )}
                          </td>

                          {/* Format */}
                          <td className="py-2 px-3 text-center">
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-gray-100 text-gray-700 uppercase">
                              {item.format}
                            </span>
                          </td>

                          {/* Status */}
                          <td className="py-2 px-3 text-center">
                            <div className="flex flex-col items-center">
                              {item.status === 'ready' && (
                                <Badge variant="success" size="sm">Ready</Badge>
                              )}
                              {item.status === 'will_generate' && (
                                <Badge variant="info" size="sm">Will generate</Badge>
                              )}
                              {item.status === 'warning' && (
                                <Badge variant="warning" size="sm">Warning</Badge>
                              )}
                              {item.status === 'error' && (
                                <Badge variant="danger" size="sm">Error</Badge>
                              )}
                              {item.status === 'skipped' && (
                                <Badge variant="neutral" size="sm">Skipped</Badge>
                              )}
                              <span
                                className="text-[10px] text-gray-500 mt-0.5 max-w-[180px] truncate"
                                title={item.reason}
                              >
                                {item.reason}
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: GENERATION & RESULTS */}
      {step === 3 && (
        <div className="py-4 space-y-6">
          {generationState === 'running' && (
            <div className="text-center space-y-4">
              <div className="inline-flex p-3 rounded-full bg-indigo-50 text-indigo-600 animate-pulse">
                <Sparkles className="w-8 h-8" />
              </div>

              <div>
                <h4 className="text-base font-semibold text-gray-900">
                  Generating codes in bulk
                </h4>
                <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto truncate">
                  {currentItemName || 'Preparing codes...'}
                </p>
              </div>

              {/* Progress Bar */}
              <div className="w-full max-w-md mx-auto">
                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-indigo-600 h-2 transition-all duration-200"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <div className="flex justify-between items-center text-xs text-gray-500 mt-1.5 font-medium">
                  <span>{progressPercent}% completed</span>
                  <span>{currentProgressIndex} of {summaryCounts.operableCount}</span>
                </div>
              </div>
            </div>
          )}

          {(generationState === 'completed' || generationState === 'cancelled') && (
            <div className="space-y-5">
              <div className="text-center">
                <div className="inline-flex p-3 rounded-full bg-green-50 text-green-600 mb-2">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h4 className="text-base font-semibold text-gray-900">
                  {generationState === 'cancelled'
                    ? 'Generation Run Stopped'
                    : 'Generation Complete!'}
                </h4>
                <p className="text-xs text-gray-500 mt-1">
                  Batch ID: <span className="font-mono text-gray-700">{batchId}</span>
                </p>
              </div>

              {/* Result Summary Counters */}
              <div className="grid grid-cols-3 gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200 text-center">
                <div>
                  <div className="text-2xl font-bold text-green-600">
                    {createdResults.length}
                  </div>
                  <div className="text-xs text-gray-500 font-medium mt-0.5">
                    Created
                  </div>
                </div>

                <div>
                  <div className="text-2xl font-bold text-gray-600">
                    {summaryCounts.skipped}
                  </div>
                  <div className="text-xs text-gray-500 font-medium mt-0.5">
                    Skipped
                  </div>
                </div>

                <div>
                  <div className={`text-2xl font-bold ${failedResults.length > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                    {failedResults.length}
                  </div>
                  <div className="text-xs text-gray-500 font-medium mt-0.5">
                    Failed
                  </div>
                </div>
              </div>

              {/* Failures List if any */}
              {failedResults.length > 0 && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-red-800 mb-2">
                    <AlertCircle className="w-4 h-4 text-red-600" />
                    Failed Items ({failedResults.length})
                  </div>
                  <div className="max-h-32 overflow-y-auto space-y-1 text-xs text-red-700 [scrollbar-width:thin]">
                    {failedResults.map((f, i) => (
                      <div key={i} className="flex justify-between items-center py-0.5 border-b border-red-100 last:border-none">
                        <span className="font-medium truncate max-w-[200px]">{f.name}</span>
                        <span className="text-[11px] text-red-600 truncate max-w-[250px]">{f.error}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
