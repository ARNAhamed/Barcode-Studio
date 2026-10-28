import React, { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Package,
  Phone,
  Mail,
  MapPin,
  Building2,
  Barcode,
  CreditCard,
  User,
  ShieldAlert,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { getPublicProduct } from '../api/publicProduct';

export default function PublicProductPage() {
  const { token } = useParams();

  const { data, isLoading, error } = useQuery({
    queryKey: ['public-product', token],
    queryFn: () => getPublicProduct(token),
    retry: false,
    staleTime: 60 * 1000,
  });

  // Set Open Graph tags & Document title
  useEffect(() => {
    if (data?.product) {
      document.title = `${data.product.name} | Product Details`;

      const setMetaTag = (property, content) => {
        let el = document.querySelector(`meta[property="${property}"]`);
        if (!el) {
          el = document.createElement('meta');
          el.setAttribute('property', property);
          document.head.appendChild(el);
        }
        el.setAttribute('content', content);
      };

      setMetaTag('og:title', data.product.name);
      setMetaTag(
        'og:description',
        `Item Code: ${data.product.sku} • Price: $${parseFloat(data.product.price || 0).toFixed(2)} • ${data.product.availability}`
      );
      setMetaTag('og:type', 'product');
    }
  }, [data]);

  return (
    <div className="min-h-screen bg-[#FAFAFA] dark:bg-zinc-950 text-gray-900 dark:text-zinc-100 flex flex-col font-sans antialiased">
      {/* Sleek Minimal Header - No sidebar or app navigation */}
      <header className="w-full bg-white dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-800 py-3.5 px-4 sm:px-6 sticky top-0 z-10 shadow-xs">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-xs shadow-xs">
              <Barcode className="w-4 h-4 stroke-[2]" />
            </div>
            <span className="font-semibold text-sm tracking-tight text-gray-900 dark:text-white">
              Barcode Studio
            </span>
          </div>
          <span className="text-[11px] font-medium text-gray-400 dark:text-zinc-500 uppercase tracking-wider">
            Public View
          </span>
        </div>
      </header>

      {/* Main Details View */}
      <main className="flex-1 w-full max-w-xl mx-auto px-4 py-6 sm:py-8 space-y-5">
        {/* Loading Skeleton */}
        {isLoading && (
          <div className="space-y-4 animate-pulse">
            <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-gray-200 dark:border-zinc-800 space-y-4">
              <div className="h-6 bg-gray-200 dark:bg-zinc-800 rounded w-2/3" />
              <div className="h-4 bg-gray-200 dark:bg-zinc-800 rounded w-1/4" />
              <div className="space-y-3 pt-3">
                <div className="h-4 bg-gray-200 dark:bg-zinc-800 rounded w-full" />
                <div className="h-4 bg-gray-200 dark:bg-zinc-800 rounded w-full" />
                <div className="h-4 bg-gray-200 dark:bg-zinc-800 rounded w-3/4" />
              </div>
            </div>
            <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-gray-200 dark:border-zinc-800 space-y-3">
              <div className="h-5 bg-gray-200 dark:bg-zinc-800 rounded w-1/2" />
              <div className="h-4 bg-gray-200 dark:bg-zinc-800 rounded w-3/4" />
            </div>
          </div>
        )}

        {/* Disabled Public Page Error */}
        {(data?.enabled === false || error?.response?.status === 403) && (
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 p-8 text-center space-y-3 shadow-xs">
            <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-zinc-800 flex items-center justify-center mx-auto text-gray-400 dark:text-zinc-500">
              <ShieldAlert className="w-6 h-6 stroke-[1.5]" />
            </div>
            <h1 className="text-base font-semibold text-gray-900 dark:text-white">
              This page is not available.
            </h1>
            <p className="text-xs text-gray-500 dark:text-zinc-400 max-w-sm mx-auto leading-relaxed">
              Public product details are currently turned off. Please contact the seller or store administrator.
            </p>
          </div>
        )}

        {/* 404 / Missing Product */}
        {error && error?.response?.status !== 403 && (
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 p-8 text-center space-y-3 shadow-xs">
            <div className="w-12 h-12 rounded-full bg-red-50 dark:bg-red-950/40 flex items-center justify-center mx-auto text-red-500">
              <AlertCircle className="w-6 h-6 stroke-[1.5]" />
            </div>
            <h1 className="text-base font-semibold text-gray-900 dark:text-white">
              Product Not Found
            </h1>
            <p className="text-xs text-gray-500 dark:text-zinc-400 max-w-sm mx-auto leading-relaxed">
              This product link is invalid, has expired, or the product has been removed.
            </p>
          </div>
        )}

        {/* Successful Product Details */}
        {data?.product && (
          <>
            {/* 1. Item Card */}
            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 p-5 sm:p-6 shadow-xs space-y-5">
              {/* Header: Title & Category */}
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white tracking-tight leading-snug">
                  {data.product.name}
                </h1>
                {data.product.category && (
                  <span className="mt-1.5 inline-block text-xs font-medium text-gray-600 dark:text-zinc-400 bg-gray-100 dark:bg-zinc-800 px-2 py-0.5 rounded">
                    {data.product.category}
                  </span>
                )}
              </div>

              {/* Data Rows */}
              <div className="divide-y divide-gray-100 dark:divide-zinc-800/80 text-sm">
                {/* Price */}
                <div className="py-2.5 flex items-center justify-between">
                  <span className="text-xs text-gray-500 dark:text-zinc-400 font-medium">Price</span>
                  <span className="text-base font-bold text-indigo-600 dark:text-indigo-400">
                    ${parseFloat(data.product.price || 0).toFixed(2)}
                  </span>
                </div>

                {/* Item Code */}
                <div className="py-2.5 flex items-center justify-between">
                  <span className="text-xs text-gray-500 dark:text-zinc-400 font-medium">Item Code</span>
                  <span className="font-mono text-xs font-semibold text-gray-800 dark:text-zinc-200">
                    {data.product.sku}
                  </span>
                </div>

                {/* Barcode Number */}
                {data.product.barcode_number && (
                  <div className="py-2.5 flex items-center justify-between">
                    <span className="text-xs text-gray-500 dark:text-zinc-400 font-medium">Barcode</span>
                    <span className="font-mono text-xs text-gray-700 dark:text-zinc-300">
                      {data.product.barcode_number}
                    </span>
                  </div>
                )}

                {/* Availability Status */}
                <div className="py-2.5 flex items-center justify-between">
                  <span className="text-xs text-gray-500 dark:text-zinc-400 font-medium">Availability</span>
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-900 dark:text-zinc-200">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        data.product.stock_status === 'in'
                          ? 'bg-green-500'
                          : data.product.stock_status === 'low'
                          ? 'bg-amber-500'
                          : 'bg-red-500'
                      }`}
                    />
                    {data.product.availability}
                  </span>
                </div>
              </div>
            </div>

            {/* 2. Supplier Card (Only rendered if supplier key exists in API response) */}
            {data.hasOwnProperty('supplier') && (
              <div className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 p-5 sm:p-6 shadow-xs space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-gray-100 dark:divide-zinc-800">
                  <Building2 className="w-4 h-4 text-gray-400 dark:text-zinc-500 stroke-[1.5]" />
                  <h2 className="text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">
                    Supplier Information
                  </h2>
                </div>

                {/* Case A: No Supplier */}
                {data.supplier === null && (
                  <p className="text-xs text-gray-400 dark:text-zinc-500 italic py-1">
                    No supplier information
                  </p>
                )}

                {/* Case B: Supplier Unavailable (Soft-deleted) */}
                {data.supplier?.unavailable && (
                  <div className="p-3 bg-gray-50 dark:bg-zinc-800/50 rounded-lg border border-gray-200 dark:border-zinc-800 text-xs text-gray-500 dark:text-zinc-400">
                    Supplier unavailable
                  </div>
                )}

                {/* Case C: Active Supplier Details */}
                {data.supplier && !data.supplier.unavailable && (
                  <div className="space-y-3 text-sm">
                    {/* Supplier Name */}
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white text-base">
                        {data.supplier.name}
                      </h3>
                      {data.supplier.contact_person && (
                        <p className="text-xs text-gray-500 dark:text-zinc-400 flex items-center gap-1.5 mt-0.5">
                          <User className="w-3.5 h-3.5 text-gray-400 stroke-[1.5]" />
                          Contact: {data.supplier.contact_person}
                        </p>
                      )}
                    </div>

                    {/* Contact Links & Rows */}
                    <div className="divide-y divide-gray-100 dark:divide-zinc-800/80 text-xs pt-1">
                      {/* Mobile (Tap to Call) */}
                      {data.supplier.mobile && (
                        <div className="py-2 flex items-center justify-between">
                          <span className="text-gray-500 dark:text-zinc-400 flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5 text-gray-400 stroke-[1.5]" /> Mobile
                          </span>
                          <a
                            href={`tel:${data.supplier.mobile}`}
                            className="font-medium text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                          >
                            {data.supplier.mobile}
                          </a>
                        </div>
                      )}

                      {/* Phone */}
                      {data.supplier.phone && (
                        <div className="py-2 flex items-center justify-between">
                          <span className="text-gray-500 dark:text-zinc-400 flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5 text-gray-400 stroke-[1.5]" /> Landline
                          </span>
                          <a
                            href={`tel:${data.supplier.phone}`}
                            className="font-medium text-gray-700 dark:text-zinc-300 hover:text-indigo-600 dark:hover:text-indigo-400"
                          >
                            {data.supplier.phone}
                          </a>
                        </div>
                      )}

                      {/* Email (Tap to Email) */}
                      {data.supplier.email && (
                        <div className="py-2 flex items-center justify-between">
                          <span className="text-gray-500 dark:text-zinc-400 flex items-center gap-1.5">
                            <Mail className="w-3.5 h-3.5 text-gray-400 stroke-[1.5]" /> Email
                          </span>
                          <a
                            href={`mailto:${data.supplier.email}`}
                            className="font-medium text-indigo-600 dark:text-indigo-400 hover:underline truncate max-w-[200px]"
                            title={data.supplier.email}
                          >
                            {data.supplier.email}
                          </a>
                        </div>
                      )}

                      {/* Address (Tap to Open in Maps) */}
                      {data.supplier.address && (
                        <div className="py-2 flex items-start justify-between gap-3">
                          <span className="text-gray-500 dark:text-zinc-400 flex items-center gap-1.5 shrink-0 mt-0.5">
                            <MapPin className="w-3.5 h-3.5 text-gray-400 stroke-[1.5]" /> Address
                          </span>
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                              data.supplier.address
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium text-indigo-600 dark:text-indigo-400 hover:underline text-right leading-relaxed flex items-center gap-1"
                          >
                            <span>{data.supplier.address}</span>
                            <ExternalLink className="w-3 h-3 shrink-0" />
                          </a>
                        </div>
                      )}

                      {/* Payment Terms */}
                      {data.supplier.payment_terms && (
                        <div className="py-2 flex items-center justify-between">
                          <span className="text-gray-500 dark:text-zinc-400 flex items-center gap-1.5">
                            <CreditCard className="w-3.5 h-3.5 text-gray-400 stroke-[1.5]" /> Terms
                          </span>
                          <span className="font-medium text-gray-700 dark:text-zinc-300">
                            {data.supplier.payment_terms}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>

      {/* Minimal Footer */}
      <footer className="w-full py-4 text-center text-xs text-gray-400 dark:text-zinc-600 mt-auto">
        Powered by <span className="font-semibold text-gray-600 dark:text-zinc-400">Barcode Studio</span>
      </footer>
    </div>
  );
}
