import React, { useState, useRef } from 'react';
import {
  Upload,
  FileSpreadsheet,
  Download,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  FileText,
  RefreshCw,
} from 'lucide-react';
import Modal from '../../components/Modal';
import Button from '../../components/Button';
import Badge from '../../components/Badge';
import {
  downloadImportTemplate,
  previewProductImport,
  commitProductImport,
} from '../../api/products';
import toast from 'react-hot-toast';

export default function ImportModal({ isOpen, onClose, onSuccess }) {
  const [step, setStep] = useState(1); // 1: Upload, 2: Preview, 3: Result
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [fileError, setFileError] = useState('');

  // Loading states
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isCommitLoading, setIsCommitLoading] = useState(false);

  // Preview & Result data
  const [previewData, setPreviewData] = useState(null);
  const [importResult, setImportResult] = useState(null);

  // Import options
  const [importMode, setImportMode] = useState('update_existing'); // 'update_existing' | 'skip_existing'
  const [autoGenerateBarcodes, setAutoGenerateBarcodes] = useState(true);

  const fileInputRef = useRef(null);

  const resetState = () => {
    setStep(1);
    setFile(null);
    setIsDragging(false);
    setFileError('');
    setIsPreviewLoading(false);
    setIsCommitLoading(false);
    setPreviewData(null);
    setImportResult(null);
    setImportMode('update_existing');
    setAutoGenerateBarcodes(true);
  };

  const handleClose = () => {
    if (step === 3 && onSuccess) {
      onSuccess();
    }
    resetState();
    onClose();
  };

  const handleDownloadTemplate = async () => {
    try {
      await downloadImportTemplate();
      toast.success('Template downloaded.');
    } catch (err) {
      toast.error('Failed to download CSV template.');
    }
  };

  const validateAndSetFile = async (selectedFile) => {
    setFileError('');
    if (!selectedFile) return;

    // Check extension
    const name = selectedFile.name.toLowerCase();
    if (!name.endsWith('.csv') && !name.endsWith('.txt')) {
      setFileError('Invalid file type. Please upload a CSV file (.csv).');
      return;
    }

    // Check 5 MB limit
    const maxBytes = 5 * 1024 * 1024;
    if (selectedFile.size > maxBytes) {
      setFileError('File size exceeds the 5 MB limit.');
      return;
    }

    setFile(selectedFile);
    await processPreview(selectedFile);
  };

  const processPreview = async (fileToPreview) => {
    setIsPreviewLoading(true);
    setFileError('');
    try {
      const data = await previewProductImport(fileToPreview);
      setPreviewData(data);
      setStep(2);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to parse CSV file.';
      setFileError(msg);
      toast.error(msg);
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target?.files && e.target.files.length > 0) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const handleCommit = async () => {
    if (!file || !previewData || previewData.valid === 0) return;

    setIsCommitLoading(true);
    try {
      const result = await commitProductImport({
        file,
        mode: importMode,
        autoGenerateBarcodes,
      });

      setImportResult(result);
      setStep(3);
      if (onSuccess) {
        onSuccess();
      }
      toast.success(
        `Imported ${result.created} new, updated ${result.updated} products.`
      );
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to import products.');
    } finally {
      setIsCommitLoading(false);
    }
  };

  // Fixed 3-Step Indicator placed in Header (shrink-0)
  const stepIndicator = (
    <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px] text-slate-500 font-medium">
      <div className="flex items-center gap-1.5">
        <span
          className={`w-4.5 h-4.5 rounded-full flex items-center justify-center font-bold text-2xs ${
            step >= 1 ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600'
          }`}
        >
          1
        </span>
        <span className={step === 1 ? 'font-semibold text-slate-900' : ''}>
          Upload
        </span>
      </div>
      <div className="flex-1 mx-2 sm:mx-4 h-px bg-slate-200" />
      <div className="flex items-center gap-1.5">
        <span
          className={`w-4.5 h-4.5 rounded-full flex items-center justify-center font-bold text-2xs ${
            step >= 2 ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600'
          }`}
        >
          2
        </span>
        <span className={step === 2 ? 'font-semibold text-slate-900' : ''}>
          Preview & Options
        </span>
      </div>
      <div className="flex-1 mx-2 sm:mx-4 h-px bg-slate-200" />
      <div className="flex items-center gap-1.5">
        <span
          className={`w-4.5 h-4.5 rounded-full flex items-center justify-center font-bold text-2xs ${
            step === 3 ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'
          }`}
        >
          3
        </span>
        <span className={step === 3 ? 'font-semibold text-slate-900' : ''}>
          Completed
        </span>
      </div>
    </div>
  );

  // Footer Actions for each step - Fixed at bottom (shrink-0)
  const renderFooter = () => {
    if (step === 1) {
      return (
        <div className="flex items-center justify-end gap-2 w-full">
          <Button variant="secondary" size="md" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={() => file && processPreview(file)}
            disabled={!file}
            isLoading={isPreviewLoading}
            icon={ArrowRight}
          >
            Continue to Preview
          </Button>
        </div>
      );
    }

    if (step === 2) {
      return (
        <div className="flex items-center justify-between gap-2 w-full">
          <Button
            variant="outline"
            size="md"
            onClick={() => setStep(1)}
            icon={ArrowLeft}
            disabled={isCommitLoading}
          >
            Back
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="md"
              onClick={handleClose}
              disabled={isCommitLoading}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={handleCommit}
              disabled={!previewData || previewData.valid === 0 || isCommitLoading}
              isLoading={isCommitLoading}
              icon={CheckCircle2}
            >
              {isCommitLoading
                ? 'Importing...'
                : `Import ${previewData?.valid || 0} Valid Rows`}
            </Button>
          </div>
        </div>
      );
    }

    if (step === 3) {
      return (
        <div className="flex items-center justify-end w-full">
          <Button
            variant="primary"
            size="md"
            onClick={handleClose}
            icon={RefreshCw}
            className="w-full sm:w-auto"
          >
            Close & Refresh Stock
          </Button>
        </div>
      );
    }

    return null;
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={
        step === 1
          ? 'Import Products from CSV'
          : step === 2
          ? 'Review & Options'
          : 'Import Results'
      }
      description={
        step === 1
          ? 'Upload a CSV spreadsheet to add new products or update existing inventory.'
          : step === 2
          ? 'Review rows before committing changes to inventory.'
          : 'Your inventory has been updated successfully.'
      }
      headerExtra={stepIndicator}
      footer={renderFooter()}
      maxWidth="max-w-4xl"
      fullScreenMobile={true}
      bodyClassName="space-y-3.5 p-3 sm:p-5"
    >
      {/* STEP 1: Upload */}
      {step === 1 && (
        <div className="space-y-3">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-5 sm:p-6 text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
              isDragging
                ? 'border-indigo-500 bg-indigo-50/60 scale-[1.005]'
                : 'border-slate-200 bg-slate-50/60 hover:bg-slate-100/60 hover:border-slate-300'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv,text/plain"
              onChange={handleFileChange}
              className="hidden"
            />

            <div className="w-10 h-10 rounded-xl bg-white shadow-2xs border border-slate-200 text-indigo-600 flex items-center justify-center mb-2.5">
              <Upload className="w-5 h-5" />
            </div>

            <p className="text-sm font-semibold text-slate-900">
              Drag and drop your CSV file here, or{' '}
              <span className="text-indigo-600 underline">browse</span>
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              Supports comma (,) or semicolon (;) delimiters &bull; Max file size 5 MB
            </p>

            {file && (
              <div className="mt-3 px-3 py-1 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 flex items-center gap-2 shadow-2xs">
                <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="truncate max-w-xs">{file.name}</span>
                <span className="text-slate-400">
                  ({(file.size / 1024).toFixed(1)} KB)
                </span>
              </div>
            )}
          </div>

          {fileError && (
            <div className="flex items-center gap-2 p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{fileError}</span>
            </div>
          )}

          {/* Template download link & guidelines */}
          <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-slate-600 min-w-0">
              <FileText className="w-4 h-4 text-indigo-600 shrink-0" />
              <span className="truncate">Need formatting reference? Download our pre-filled template.</span>
            </div>
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer shrink-0 ml-2"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download template</span>
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Preview & Options */}
      {step === 2 && previewData && (
        <div className="space-y-3">
          {/* Summary Counters - Compact */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-[11px] text-slate-500 font-medium block">Total Rows</span>
              <span className="text-base font-bold text-slate-900">
                {previewData.total}
              </span>
            </div>
            <div className="p-2 bg-emerald-50/70 border border-emerald-200 rounded-xl">
              <span className="text-[11px] text-emerald-700 font-medium block">Valid Rows</span>
              <span className="text-base font-bold text-emerald-700">
                {previewData.valid}
              </span>
            </div>
            <div className="p-2 bg-rose-50/70 border border-rose-200 rounded-xl">
              <span className="text-[11px] text-rose-700 font-medium block">Errors</span>
              <span className="text-base font-bold text-rose-700">
                {previewData.invalid}
              </span>
            </div>
          </div>

          {/* Import Configuration Options - Compact */}
          <div className="p-2.5 bg-slate-50/80 border border-slate-200 rounded-xl space-y-2 text-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
              <span className="font-semibold text-slate-700">
                Existing Products (Matching SKU):
              </span>
              <div className="inline-flex rounded-lg border border-slate-300 bg-white p-0.5 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setImportMode('update_existing')}
                  className={`px-2.5 py-0.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                    importMode === 'update_existing'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Update existing
                </button>
                <button
                  type="button"
                  onClick={() => setImportMode('skip_existing')}
                  className={`px-2.5 py-0.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                    importMode === 'skip_existing'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Skip existing
                </button>
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer select-none pt-1 border-t border-slate-200 text-slate-700">
              <input
                type="checkbox"
                checked={autoGenerateBarcodes}
                onChange={(e) => setAutoGenerateBarcodes(e.target.checked)}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
              />
              <span className="text-xs font-medium">
                Auto-generate missing barcodes for rows with empty barcode numbers
              </span>
            </label>
          </div>

          {/* Preview Table - Capped to 40vh with its own vertical scroll, zero horizontal scroll */}
          <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
            <div className="max-h-[40vh] overflow-y-auto">
              <table className="w-full table-fixed text-xs divide-y divide-slate-100">
                <thead className="bg-slate-50/95 sticky top-0 z-10 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="w-9 px-2 py-2 text-center">#</th>
                    <th className="w-18 px-2 py-2 text-left">Status</th>
                    <th className="w-40 px-2 py-2 text-left">Product / SKU</th>
                    <th className="w-24 px-2 py-2 text-left">Price / Qty</th>
                    <th className="w-28 px-2 py-2 text-left">Barcode</th>
                    <th className="px-2 py-2 text-left">Details / Errors</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {previewData.rows.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                        No rows found in CSV file.
                      </td>
                    </tr>
                  ) : (
                    previewData.rows.map((r, idx) => {
                      const isErr = r.status === 'error';
                      const isUpdate = r.status === 'update';

                      return (
                        <tr
                          key={idx}
                          className={`transition-colors ${
                            isErr
                              ? 'bg-rose-50/40 hover:bg-rose-50/70'
                              : isUpdate
                              ? 'bg-indigo-50/30 hover:bg-indigo-50/50'
                              : 'hover:bg-slate-50'
                          }`}
                        >
                          <td className="px-2 py-1.5 text-center text-slate-400 font-mono text-2xs">
                            {r.row}
                          </td>
                          <td className="px-2 py-1.5">
                            {isErr ? (
                              <Badge variant="danger" size="sm" dot>
                                Error
                              </Badge>
                            ) : isUpdate ? (
                              <Badge variant="primary" size="sm" dot>
                                Update
                              </Badge>
                            ) : (
                              <Badge variant="success" size="sm" dot>
                                New
                              </Badge>
                            )}
                          </td>
                          <td className="px-2 py-1.5 min-w-0">
                            <p
                              className="font-semibold text-slate-900 truncate"
                              title={r.data.name || 'Untitled'}
                            >
                              {r.data.name || (
                                <span className="text-rose-500 italic">Missing name</span>
                              )}
                            </p>
                            <p
                              className="text-2xs font-mono text-slate-500 truncate"
                              title={`SKU: ${r.data.sku}`}
                            >
                              {r.data.sku || (
                                <span className="text-rose-500 italic">Missing SKU</span>
                              )}
                            </p>
                          </td>
                          <td className="px-2 py-1.5 min-w-0">
                            <span className="text-slate-800 font-medium">
                              ${parseFloat(r.data.price || 0).toFixed(2)}
                            </span>
                            <span className="text-slate-400 mx-1">&bull;</span>
                            <span className="text-slate-600">Qty: {r.data.quantity || 0}</span>
                          </td>
                          <td className="px-2 py-1.5 min-w-0">
                            {r.data.barcode_number ? (
                              <span
                                className="font-mono text-slate-700 text-2xs truncate block"
                                title={r.data.barcode_number}
                              >
                                {r.data.barcode_number}
                              </span>
                            ) : (
                              <span className="text-slate-400 italic text-2xs">
                                {autoGenerateBarcodes ? 'Auto-generate' : 'Empty'}
                              </span>
                            )}
                          </td>
                          <td className="px-2 py-1.5 min-w-0">
                            {r.errors && r.errors.length > 0 ? (
                              <div className="space-y-0.5">
                                {r.errors.map((err, eIdx) => (
                                  <p
                                    key={eIdx}
                                    className="text-rose-600 text-2xs font-medium leading-tight truncate"
                                    title={err}
                                  >
                                    &bull; {err}
                                  </p>
                                ))}
                              </div>
                            ) : (
                              <span className="text-slate-400 text-2xs">
                                {isUpdate ? 'Will update item' : 'Ready to create'}
                              </span>
                            )}
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

      {/* STEP 3: Results */}
      {step === 3 && importResult && (
        <div className="space-y-4 py-2 text-center">
          <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center shadow-2xs">
            <CheckCircle2 className="w-7 h-7" />
          </div>

          <div>
            <h3 className="text-base font-bold text-slate-900">
              CSV Import Completed
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Database transaction committed successfully.
            </p>
          </div>

          <div className="grid grid-cols-4 gap-2 text-center max-w-md mx-auto">
            <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl">
              <span className="text-[11px] text-emerald-700 font-medium block">Created</span>
              <span className="text-base font-bold text-emerald-800">
                {importResult.created}
              </span>
            </div>
            <div className="p-2.5 bg-indigo-50 border border-indigo-200 rounded-xl">
              <span className="text-[11px] text-indigo-700 font-medium block">Updated</span>
              <span className="text-base font-bold text-indigo-800">
                {importResult.updated}
              </span>
            </div>
            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-[11px] text-slate-600 font-medium block">Skipped</span>
              <span className="text-base font-bold text-slate-800">
                {importResult.skipped}
              </span>
            </div>
            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl">
              <span className="text-[11px] text-rose-700 font-medium block">Failed</span>
              <span className="text-base font-bold text-rose-800">
                {importResult.failed}
              </span>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
