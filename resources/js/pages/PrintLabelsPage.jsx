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
import PageHeader from '../components/PageHeader';
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
  custom_width: 210,
  custom_height: 297,
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
        settings: {
          ...placement,
          custom_width: config.custom_width,
          custom_height: config.custom_height,
        },
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
    <div className="flex flex-col flex-1 min-h-0 w-full h-full lg:overflow-hidden">
      {/* Page Header (Hidden on print) */}
      <div className="no-print shrink-0">
        <PageHeader
          title="Print Labels"
          description="Generate label sheets on A4 or US Letter paper with precise Avery & custom grids."
          action={
            <div className="flex flex-col items-end gap-1">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="md"
                  onClick={handleExportPdf}
                  disabled={selectedItems.length === 0 || isExportingPdf}
                  isLoading={isExportingPdf}
                  icon={FileDown}
                >
                  Download PDF
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  onClick={handlePrint}
                  disabled={selectedItems.length === 0}
                  icon={Printer}
                >
                  Print Labels
                </Button>
              </div>
              {config?.paper_size === 'custom' && (
                <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                  Choose the same paper size in the print dialog and set the scale to 100%.
                </p>
              )}
            </div>
          }
        />
      </div>

      {/* Main Two-Pane Layout: PREVIEW on LEFT (larger), SETTINGS on RIGHT (narrower, clamped 340-440px) */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-4 lg:gap-5 items-stretch w-full overflow-hidden">
        {/* Left Pane (Paper Preview): on mobile sticky top (max 40vh); on desktop fixed on the left */}
        <div className="w-full lg:flex-1 min-w-0 order-1 lg:order-1 sticky top-0 lg:static z-20 lg:z-10 h-[360px] sm:h-[400px] lg:h-full flex flex-col overflow-hidden">
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

        {/* Right Pane (Settings & Controls): scrolls independently on desktop */}
        <div className="w-full lg:w-[380px] xl:w-[420px] min-w-0 lg:min-w-[340px] lg:max-w-[440px] shrink-0 order-2 lg:order-2 space-y-4 lg:overflow-y-auto lg:h-full pr-0 lg:pr-1 [scrollbar-width:thin] [overscroll-behavior:contain] no-print">
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
