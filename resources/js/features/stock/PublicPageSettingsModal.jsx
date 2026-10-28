import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Globe, Building2, ExternalLink } from 'lucide-react';
import Modal from '../../components/Modal';
import Button from '../../components/Button';
import { getSettings, updateSettings } from '../../api/settings';

export default function PublicPageSettingsModal({ isOpen, onClose }) {
  const queryClient = useQueryClient();

  const { data: settingsData, isLoading } = useQuery({
    queryKey: ['app-settings'],
    queryFn: getSettings,
    enabled: isOpen,
  });

  const [pageEnabled, setPageEnabled] = useState(true);
  const [showSupplier, setShowSupplier] = useState(true);

  useEffect(() => {
    if (settingsData) {
      setPageEnabled(Boolean(settingsData.public_page_enabled));
      setShowSupplier(Boolean(settingsData.public_page_show_supplier));
    }
  }, [settingsData]);

  const mutation = useMutation({
    mutationFn: updateSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['app-settings'] });
      queryClient.invalidateQueries({ queryKey: ['public-product'] });
      toast.success('Public product page settings saved.');
      onClose();
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to update settings.');
    },
  });

  const handleSave = () => {
    mutation.mutate({
      public_page_enabled: pageEnabled,
      public_page_show_supplier: showSupplier,
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Public Product Page Settings"
      description="Configure public visibility when customers scan QR codes or open product links."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSave}
            isLoading={mutation.isPending}
          >
            Save Settings
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {/* Toggle 1: Enable Public Product Page */}
        <div className="p-3.5 bg-gray-50/70 border border-gray-200 rounded-lg flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 font-medium text-xs text-gray-900">
              <Globe className="w-4 h-4 text-indigo-600 stroke-[1.5]" />
              <span>Enable public product pages</span>
            </div>
            <p className="text-xs text-gray-500 leading-relaxed">
              When enabled, customers can scan QR codes or visit <code className="text-[11px] font-mono bg-white px-1 py-0.5 rounded border border-gray-200">/p/{'{token}'}</code> to view product details. When disabled, a neutral "This page is not available" screen is shown.
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-0.5">
            <input
              type="checkbox"
              checked={pageEnabled}
              onChange={(e) => setPageEnabled(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
          </label>
        </div>

        {/* Toggle 2: Show Supplier Details */}
        <div className="p-3.5 bg-gray-50/70 border border-gray-200 rounded-lg flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 font-medium text-xs text-gray-900">
              <Building2 className="w-4 h-4 text-indigo-600 stroke-[1.5]" />
              <span>Show supplier details</span>
            </div>
            <p className="text-xs text-gray-500 leading-relaxed">
              When enabled, supplier contact info (name, phone, email, and address) is shown on public product pages. When disabled, supplier data is completely omitted from the public API response.
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-0.5">
            <input
              type="checkbox"
              checked={showSupplier}
              disabled={!pageEnabled}
              onChange={(e) => setShowSupplier(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600 peer-disabled:opacity-40"></div>
          </label>
        </div>

        {/* Informative Note */}
        <div className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-lg text-xs text-indigo-900 leading-relaxed">
          <span className="font-semibold block mb-0.5">Mobile Phone Access:</span>
          Phones scanning QR codes must reach this computer over local Wi-Fi or a public domain. See README for configuring <code className="font-mono text-[11px] bg-white px-1 rounded">APP_URL</code>.
        </div>
      </div>
    </Modal>
  );
}
