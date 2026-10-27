import React, { useState, useRef } from 'react';
import toast from 'react-hot-toast';
import {
  Upload,
  Download,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  X,
  FileText,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
} from 'lucide-react';
import Modal from '../../components/Modal';
import Button from '../../components/Button';
import Badge from '../../components/Badge';
import {
  previewProductImport,
  commitProductImport,
  downloadImportTemplate,
} from '../../api/products';

export default function ImportModal({ isOpen, onClose, onSuccess }) {
  const [step, setStep] = useState(1); // 1: Upload, 2: Preview & Options, 3: Completed Results
  const [file, setFile] = useState(null);
  const [fileError, setFileError] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  // Import options
  const [importMode, setImportMode] = useState('update_existing'); // 'skip_existing' | 'update_existing'
  const [autoGenerateBarcodes, setAutoGenerateBarcodes] = useState(false);

  // Preview & Result data
  const [previewData, setPreviewData] = useState(null);
  const [importResult, setImportResult] = useState(null);

  // Loading states
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isCommitLoading, setIsCommitLoading] = useState(false);

  const fileInputRef = useRef(null);

  const handleClose = () => {
    setStep(1);
    setFile(null);
    setFileError(null);
    setPreviewData(null);
    setImportResult(null);
    setAutoGenerateBarcodes(false);
    setImportMode('update_existing');
    onClose();
  };

  const handleDownloadTemplate = () => {
    try {
      downloadImportTemplate();
      toast.success('Sample template downloaded.');
    } catch {
      toast.error('Failed to download sample template.');
    }
  };

  const validateAndSetFile = (uploadedFile) => {
    setFileError(null);
    if (!uploadedFile) return;

    const validExtensions = ['.csv', '.txt'];
    const hasValidExt = validExtensions.some((ext) =>
      uploadedFile.name.toLowerCase().endsWith(ext)
    );

    if (!hasValidExt && uploadedFile.type !== 'text/csv' && uploadedFile.type !== 'text/plain') {
      setFileError('Please upload a valid CSV file.');
      return;
    }

    if (uploadedFile.size > 5 * 1024 * 1024) {
      setFileError('File size exceeds 5 MB limit.');
      return;
    }

    setFile(uploadedFile);
  };

  const processPreview = async (targetFile) => {
    setIsPreviewLoading(true);
    setFileError(null);
    try {
      const data = await previewProductImport(targetFile);
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
    <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-xs text-gray-500 font-medium">
      <div className="flex items-center gap-1.5">
        <span
          className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-semibold ${
            step >= 1 ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-600'
          }`}
        >
          1
        </span>
        <span className={step === 1 ? 'font-medium text-gray-900' : ''}>
          Upload
        </span>
      </div>
      <div className="flex-1 mx-2 sm:mx-4 h-px bg-gray-200" />
      <div className="flex items-center gap-1.5">
        <span
          className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-semibold ${
            step >= 2 ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-600'
          }`}
        >
          2
        </span>
        <span className={step === 2 ? 'font-medium text-gray-900' : ''}>
          Preview & Options
        </span>
      </div>
      <div className="flex-1 mx-2 sm:mx-4 h-px bg-gray-200" />
      <div className="flex items-center gap-1.5">
        <span
          className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-semibold ${
            step === 3 ? 'bg-[#16A34A] text-white' : 'bg-gray-200 text-gray-600'
          }`}
        >
          3
        </span>
        <span className={step === 3 ? 'font-medium text-gray-900' : ''}>
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
            variant="secondary"
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
      bodyClassName="space-y-4 p-4 sm:p-5"
    >
      {/* STEP 1: Upload */}
      {step === 1 && (
        <div className="space-y-4">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-lg p-6 sm:p-8 text-center transition-colors cursor-pointer flex flex-col items-center justify-center ${
              isDragging
                ? 'border-indigo-600 bg-gray-50'
                : 'border-gray-300 bg-gray-50/50 hover:bg-gray-100/50 hover:border-gray-400'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv,text/plain"
              onChange={handleFileChange}
              className="hidden"
            />

            <Upload className="w-6 h-6 text-gray-400 mb-2" strokeWidth={1.5} />

            <p className="text-sm font-medium text-gray-900">
              Drag and drop your CSV file here, or{' '}
              <span className="text-indigo-600 underline">browse</span>
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Supports comma (,) or semicolon (;) delimiters &bull; Max file size 5 MB
            </p>

            {file && (
              <div className="mt-3 px-3 py-1 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-700 flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-[#16A34A] shrink-0" strokeWidth={1.5} />
                <span className="truncate max-w-xs">{file.name}</span>
                <span className="text-gray-400">
                  ({(file.size / 1024).toFixed(1)} KB)
                </span>
              </div>
            )}
          </div>

          {fileError && (
            <div className="flex items-center gap-2 p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0" strokeWidth={1.5} />
              <span>{fileError}</span>
            </div>
          )}

          {/* Template download link & guidelines */}
          <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-gray-600 min-w-0">
              <FileText className="w-4 h-4 text-gray-400 shrink-0" strokeWidth={1.5} />
              <span className="truncate">Need formatting reference? Download our pre-filled template.</span>
            </div>
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer shrink-0 ml-2"
            >
              <Download className="w-3.5 h-3.5" strokeWidth={1.5} />
              <span>Download template</span>
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Preview & Options */}
      {step === 2 && previewData && (
        <div className="space-y-3.5">
          {/* Summary Counters - Plain Bordered Boxes */}
          <div className="grid grid-cols-3 gap-2.5 text-center">
            <div className="p-2.5 bg-white border border-gray-200 rounded-lg">
              <span className="text-xs text-gray-500 font-medium block">Total Rows</span>
              <span className="text-base font-semibold text-gray-900 mt-0.5 block">
                {previewData.total}
              </span>
            </div>
            <div className="p-2.5 bg-white border border-gray-200 rounded-lg">
              <span className="text-xs text-gray-500 font-medium block">Valid Rows</span>
              <span className="text-base font-semibold text-[#16A34A] mt-0.5 block">
                {previewData.valid}
              </span>
            </div>
            <div className="p-2.5 bg-white border border-gray-200 rounded-lg">
              <span className="text-xs text-gray-500 font-medium block">Errors</span>
              <span className={`text-base font-semibold mt-0.5 block ${previewData.invalid > 0 ? 'text-[#DC2626]' : 'text-gray-900'}`}>
                {previewData.invalid}
              </span>
            </div>
          </div>

          {/* Import Configuration Options - Plain Bordered Box */}
          <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg space-y-2 text-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
              <span className="font-medium text-gray-700">
                Existing Products (Matching SKU):
              </span>
              <div className="inline-flex rounded-lg border border-gray-300 bg-white p-0.5">
                <button
                  type="button"
                  onClick={() => setImportMode('update_existing')}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                    importMode === 'update_existing'
                      ? 'bg-indigo-600 text-white'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Update existing
                </button>
                <button
                  type="button"
                  onClick={() => setImportMode('skip_existing')}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                    importMode === 'skip_existing'
                      ? 'bg-indigo-600 text-white'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Skip existing
                </button>
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer select-none pt-2 border-t border-gray-200 text-gray-700">
              <input
                type="checkbox"
                checked={autoGenerateBarcodes}
                onChange={(e) => setAutoGenerateBarcodes(e.target.checked)}
                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500/20 w-4 h-4 cursor-pointer"
              />
              <span className="text-xs">
                Auto-generate missing barcodes for rows with empty barcode numbers
              </span>
            </label>
          </div>

          {/* Preview Table - Capped to 40vh with its own vertical scroll, zero horizontal scroll */}
          <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
            <div className="max-h-[40vh] overflow-y-auto">
              <table className="w-full table-fixed text-xs divide-y divide-gray-100">
                <thead className="bg-gray-50 sticky top-0 z-10 text-gray-600 font-medium border-b border-gray-200">
                  <tr>
                    <th className="w-9 px-2 py-2 text-center">#</th>
                    <th className="w-20 px-2 py-2 text-center">Status</th>
                    <th className="w-40 px-2 py-2 text-left">Product / SKU</th>
                    <th className="w-24 px-2 py-2 text-center">Price / Qty</th>
                    <th className="w-28 px-2 py-2 text-center">Barcode</th>
                    <th className="px-2 py-2 text-left">Details / Errors</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {previewData.rows.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-6 text-center text-gray-400">
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
                          className={`hover:bg-gray-50/75 transition-colors ${
                            isErr ? 'bg-red-50/20' : ''
                          }`}
                        >
                          <td className="px-2 py-1.5 text-center text-gray-400 font-mono text-[11px]">
                            {r.row}
                          </td>
                          <td className="px-2 py-1.5 text-center">
                            <div className="flex justify-center">
                              {isErr ? (
                                <Badge variant="danger" size="xs">
                                  Error
                                </Badge>
                              ) : isUpdate ? (
                                <Badge variant="primary" size="xs">
                                  Update
                                </Badge>
                              ) : (
                                <Badge variant="success" size="xs">
                                  New
                                </Badge>
                              )}
                            </div>
                          </td>
                          <td className="px-2 py-1.5 min-w-0">
                            <p
                              className="font-medium text-gray-900 truncate"
                              title={r.data.name || 'Untitled'}
                            >
                              {r.data.name || (
                                <span className="text-red-500 italic">Missing name</span>
                              )}
                            </p>
                            <p
                              className="text-[11px] font-mono text-gray-500 truncate"
                              title={`SKU: ${r.data.sku}`}
                            >
                              {r.data.sku || (
                                <span className="text-red-500 italic">Missing SKU</span>
                              )}
                            </p>
                          </td>
                          <td className="px-2 py-1.5 min-w-0 text-center">
                            <span className="text-gray-900 font-normal">
                              ${parseFloat(r.data.price || 0).toFixed(2)}
                            </span>
                            <span className="text-gray-300 mx-1">&bull;</span>
                            <span className="text-gray-600">Qty: {r.data.quantity || 0}</span>
                          </td>
                          <td className="px-2 py-1.5 min-w-0 text-center">
                            {r.data.barcode_number ? (
                              <span
                                className="font-mono text-gray-700 text-[11px] truncate block text-center"
                                title={r.data.barcode_number}
                              >
                                {r.data.barcode_number}
                              </span>
                            ) : (
                              <span className="text-gray-400 italic text-[11px] block text-center">
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
                                    className="text-red-600 text-[11px] font-medium leading-tight truncate"
                                    title={err}
                                  >
                                    &bull; {err}
                                  </p>
                                ))}
                              </div>
                            ) : (
                              <span className="text-gray-400 text-[11px]">
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
        <div className="space-y-4 py-4 text-center">
          <CheckCircle2 className="w-8 h-8 text-[#16A34A] mx-auto" strokeWidth={1.5} />

          <div>
            <h3 className="text-base font-semibold text-gray-900">
              CSV Import Completed
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Database transaction committed successfully.
            </p>
          </div>

          <div className="grid grid-cols-4 gap-2 text-center max-w-md mx-auto">
            <div className="p-2.5 bg-white border border-gray-200 rounded-lg">
              <span className="text-xs text-gray-500 font-medium block">Created</span>
              <span className="text-base font-semibold text-gray-900 mt-0.5 block">
                {importResult.created}
              </span>
            </div>
            <div className="p-2.5 bg-white border border-gray-200 rounded-lg">
              <span className="text-xs text-gray-500 font-medium block">Updated</span>
              <span className="text-base font-semibold text-gray-900 mt-0.5 block">
                {importResult.updated}
              </span>
            </div>
            <div className="p-2.5 bg-white border border-gray-200 rounded-lg">
              <span className="text-xs text-gray-500 font-medium block">Skipped</span>
              <span className="text-base font-semibold text-gray-900 mt-0.5 block">
                {importResult.skipped}
              </span>
            </div>
            <div className="p-2.5 bg-white border border-gray-200 rounded-lg">
              <span className="text-xs text-gray-500 font-medium block">Failed</span>
              <span className={`text-base font-semibold mt-0.5 block ${importResult.failed > 0 ? 'text-[#DC2626]' : 'text-gray-900'}`}>
                {importResult.failed}
              </span>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
