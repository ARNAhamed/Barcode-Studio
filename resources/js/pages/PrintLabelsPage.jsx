import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  Printer,
  FileDown,
  Layers,
  Sparkles,
  AlertCircle,
  RotateCcw,
  Plus,
  HelpCircle,
  Loader2,
} from 'lucide-react';

import Button from '../components/Button';
import DesignSelector from '../features/print/DesignSelector';
import SheetSettings from '../features/print/SheetSettings';
import PlacementSettings from '../features/print/PlacementSettings';
import PaperPreview from '../features/print/PaperPreview';
import DesignSelectorModal from '../features/print/DesignSelectorModal';
import ProductPickerModal from '../features/print/ProductPickerModal';
import SavePresetModal from '../features/print/SavePresetModal';

import { getCodes } from '../api/codes';
import { getProducts } from '../api/products';
import {
  getPrintPresets,
  createPrintPreset,
  deletePrintPreset,
} from '../api/printPresets';
import {
  STANDARD_SHEET_PRESETS,
  paginateLabels,
  exportSheetPdf,
  validateSheetFit,
} from '../utils/printHelpers';

const DEFAULT_CONFIG = {
  preset_id: '3x8',
  paper_size: 'a4',
  orientation: 'portrait',
  columns: 3,
  rows: 8,
  label_width: 63.5,
  label_height: 33.9,
  margin_top: 13.0,
  margin_left: 7.2,
  gap_horizontal: 2.5,
  gap_vertical: 0,
  corner_radius: 1.5,
  unit: 'mm',
};

const DEFAULT_PLACEMENT = {
  fit: 'fit', // 'fit' | 'original' | 'fill'
  alignment: 'center', // 'center' | 'top-left' | 'top-center'
  padding: 1.5, // mm
  showBackground: true,
  showArtboardBorder: false,
  showBorders: true,
};

export default function PrintLabelsPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // State
  const [selectedItems, setSelectedItems] = useState([]); // Array of { ...code, copies: 1 }
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [placement, setPlacement] = useState(DEFAULT_PLACEMENT);
  const [startPosition, setStartPosition] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);

  // Modals state
  const [designModalOpen, setDesignModalOpen] = useState(false);
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  // Queries
  const { data: codesData, isLoading: isLoadingCodes } = useQuery({
    queryKey: ['codes-for-print'],
    queryFn: () => getCodes(),
  });
  const allCodes = useMemo(() => codesData?.data || [], [codesData]);

  const { data: presetsData } = useQuery({
    queryKey: ['print-presets'],
    queryFn: getPrintPresets,
  });
  const savedPresets = useMemo(() => presetsData?.data || [], [presetsData]);

  // Mutations
  const savePresetMutation = useMutation({
    mutationFn: (name) => {
      return createPrintPreset({
        name,
        paper_size: config.paper_size,
        orientation: config.orientation,
        columns: config.columns,
        rows: config.rows,
        label_width: config.label_width,
        label_height: config.label_height,
        margin_top: config.margin_top,
        margin_left: config.margin_left,
        gap_horizontal: config.gap_horizontal,
        gap_vertical: config.gap_vertical,
        corner_radius: config.corner_radius || 0,
        unit: config.unit || 'mm',
        settings: placement,
      });
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['print-presets'] });
      toast.success('Sheet preset saved successfully.');
      setSaveModalOpen(false);
      if (res?.data?.id) {
        setConfig((prev) => ({ ...prev, preset_id: `saved_${res.data.id}` }));
      }
    },
    onError: (err) => {
      const msg = err.response?.data?.message || 'Failed to save preset.';
      toast.error(msg);
    },
  });

  const deletePresetMutation = useMutation({
    mutationFn: (id) => deletePrintPreset(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['print-presets'] });
      toast.success('Preset deleted.');
      setConfig((prev) => ({ ...prev, preset_id: 'custom' }));
    },
    onError: () => toast.error('Failed to delete preset.'),
  });

  // Handle URL query pre-selection: ?code_ids=1,2 or ?product_ids=3,4
  useEffect(() => {
    if (!allCodes.length) return;

    const codeIdsParam = searchParams.get('code_ids');
    const productIdsParam = searchParams.get('product_ids');

    if (codeIdsParam) {
      const ids = codeIdsParam.split(',').map((id) => parseInt(id.trim(), 10));
      const matched = allCodes.filter((c) => ids.includes(c.id));
      if (matched.length > 0) {
        setSelectedItems((prev) => {
          // Merge without duplicates
          const existingIds = new Set(prev.map((i) => i.id));
          const toAdd = matched
            .filter((m) => !existingIds.has(m.id))
            .map((m) => ({ ...m, copies: 1 }));
          return [...prev, ...toAdd];
        });
      }
    } else if (productIdsParam) {
      const pIds = productIdsParam.split(',').map((id) => parseInt(id.trim(), 10));
      const matched = allCodes.filter((c) => c.product_id && pIds.includes(c.product_id));
      if (matched.length > 0) {
        setSelectedItems((prev) => {
          const existingIds = new Set(prev.map((i) => i.id));
          const toAdd = matched
            .filter((m) => !existingIds.has(m.id))
            .map((m) => ({ ...m, copies: 1 }));
          return [...prev, ...toAdd];
        });
      }
    }
  }, [allCodes, searchParams]);

  // Pagination & Sheet Layout Calculation
  const paginationData = useMemo(() => {
    return paginateLabels(selectedItems, config, startPosition);
  }, [selectedItems, config, startPosition]);

  // Keep currentPage valid when total pages change
  useEffect(() => {
    if (currentPage > (paginationData.totalPages || 1)) {
      setCurrentPage(Math.max(1, paginationData.totalPages || 1));
    }
  }, [paginationData.totalPages, currentPage]);

  // Handlers for Items
  const handleUpdateCopies = (id, copies) => {
    setSelectedItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, copies: Math.max(1, copies) } : item))
    );
  };

  const handleRemoveItem = (id) => {
    setSelectedItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleSetAllCopies = (copies) => {
    setSelectedItems((prev) => prev.map((item) => ({ ...item, copies: Math.max(1, copies) })));
    toast.success(`Set all designs to ${copies} copies.`);
  };

  const handleClearAll = () => {
    setSelectedItems([]);
  };

  const handleAddCodesFromModal = (codes) => {
    setSelectedItems((prev) => {
      const existingMap = new Map(prev.map((i) => [i.id, i.copies]));
      return codes.map((c) => ({
        ...c,
        copies: existingMap.get(c.id) || 1,
      }));
    });
  };

  const handleAddCodesFromProducts = (codes) => {
    setSelectedItems((prev) => {
      const existingIds = new Set(prev.map((i) => i.id));
      const toAdd = codes
        .filter((c) => !existingIds.has(c.id))
        .map((c) => ({ ...c, copies: 1 }));
      return [...prev, ...toAdd];
    });
    toast.success(`Added ${codes.length} code(s) for selected products.`);
  };

  // Browser Print trigger
  const handlePrint = () => {
    if (selectedItems.length === 0) {
      toast.error('Please select at least one design to print.');
      return;
    }
    window.print();
  };

  // PDF Export trigger
  const handleExportPdf = async () => {
    if (selectedItems.length === 0) {
      toast.error('Please select at least one design to download as PDF.');
      return;
    }

    try {
      setIsExportingPdf(true);
      const toastId = toast.loading('Generating 300 DPI PDF document...');

      await exportSheetPdf({
        config,
        pages: paginationData.pages,
        placement,
        onProgress: (cur, total) => {
          toast.loading(`Rendering page ${cur} of ${total}...`, { id: toastId });
        },
      });

      toast.success('PDF downloaded successfully!', { id: toastId });
    } catch (err) {
      console.error('PDF export failed:', err);
      toast.error('Failed to generate PDF. Please try again.');
    } finally {
      setIsExportingPdf(false);
    }
  };

  const fitValidation = useMemo(() => validateSheetFit(config), [config]);

  return (
    <div className="w-full space-y-5">
      {/* Page Header (Hidden on print) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-4 no-print">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <Printer className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Print Labels
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Generate label sheets on A4 or US Letter paper with precise Avery & custom grids.
          </p>
        </div>

        {/* Action Buttons & Print scale note */}
        <div className="flex flex-col sm:items-end gap-1.5">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="md"
              onClick={handleExportPdf}
              disabled={selectedItems.length === 0 || isExportingPdf}
              isLoading={isExportingPdf}
              icon={FileDown}
              className="text-xs sm:text-sm shadow-xs"
            >
              Download PDF
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={handlePrint}
              disabled={selectedItems.length === 0}
              icon={Printer}
              className="text-xs sm:text-sm shadow-xs"
            >
              Print Labels
            </Button>
          </div>
          <p className="text-[11px] text-slate-400">
            In the print dialog, set <strong className="text-slate-600">Scale to 100%</strong> (turn off &lsquo;Fit to page&rsquo;) and <strong className="text-slate-600">Margins to None</strong>.
          </p>
        </div>
      </div>

      {/* Main Two-Pane Layout */}
      {/* On desktop: left pane scrolls independently, right pane is fixed / sticky */}
      {/* On tablet/mobile: stacked with preview sticky at the top */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-start gap-6 w-full">
        {/* Right Pane (Paper Preview) on Mobile is sticky top; on Desktop is fixed sticky on the right */}
        {/* We place preview inside order-1 lg:order-2 so on mobile it stacks on top */}
        <div className="w-full lg:flex-1 min-w-0 order-1 lg:order-2 sticky top-14 sm:top-16 lg:top-6 z-20 lg:z-10 bg-slate-100/90 lg:bg-slate-100/70 backdrop-blur-md rounded-2xl border border-slate-200 p-3 sm:p-5 shadow-xs overflow-hidden flex flex-col items-center">
          <PaperPreview
            config={config}
            paginationData={paginationData}
            placement={placement}
            onChangePlacement={setPlacement}
            currentPage={currentPage}
            onChangeCurrentPage={setCurrentPage}
            startPosition={startPosition}
            onChangeStartPosition={setStartPosition}
          />
        </div>

        {/* Left Pane (Settings & Controls) */}
        {/* On desktop: scrolls independently */}
        <div className="w-full lg:w-[460px] xl:w-[500px] shrink-0 order-2 lg:order-1 space-y-5 lg:overflow-y-auto lg:max-h-[calc(100vh-5rem)] pr-0 lg:pr-1 no-print">
          {/* Section 1: Choose What to Print */}
          <DesignSelector
            items={selectedItems}
            onUpdateCopies={handleUpdateCopies}
            onRemoveItem={handleRemoveItem}
            onSetAllCopies={handleSetAllCopies}
            onClearAll={handleClearAll}
            onOpenDesignModal={() => setDesignModalOpen(true)}
            onOpenProductModal={() => setProductModalOpen(true)}
          />

          {/* Section 2: Sheet Settings */}
          <SheetSettings
            config={config}
            onChangeConfig={setConfig}
            items={selectedItems}
            savedPresets={savedPresets}
            onDeleteSavedPreset={(id) => deletePresetMutation.mutate(id)}
            onOpenSaveModal={() => setSaveModalOpen(true)}
            startPosition={startPosition}
            onChangeStartPosition={setStartPosition}
          />

          {/* Section 3: Placement & Fitting */}
          <PlacementSettings
            placement={placement}
            onChangePlacement={setPlacement}
            config={config}
            items={selectedItems}
          />
        </div>
      </div>

      {/* Modals */}
      <DesignSelectorModal
        isOpen={designModalOpen}
        onClose={() => setDesignModalOpen(false)}
        allCodes={allCodes}
        selectedIds={selectedItems.map((i) => i.id)}
        onSelectCodes={handleAddCodesFromModal}
      />

      <ProductPickerModal
        isOpen={productModalOpen}
        onClose={() => setProductModalOpen(false)}
        allCodes={allCodes}
        onAddCodes={handleAddCodesFromProducts}
      />

      <SavePresetModal
        isOpen={saveModalOpen}
        onClose={() => setSaveModalOpen(false)}
        config={config}
        onSave={(name) => savePresetMutation.mutate(name)}
        isSaving={savePresetMutation.isPending}
      />
    </div>
  );
}
