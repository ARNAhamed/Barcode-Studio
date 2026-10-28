import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Sidebar from './components/Sidebar';
import GalleryPage from './pages/GalleryPage';
import DesignerPage from './pages/DesignerPage';
import ItemsPage from './pages/ItemsPage';
import SuppliersPage from './pages/SuppliersPage';
import RecycleBinPage from './pages/RecycleBinPage';
import PrintLabelsPage from './pages/PrintLabelsPage';

export default function MainApp() {
  const location = useLocation();
  const isTwoPane =
    location.pathname.startsWith('/designer') ||
    location.pathname.startsWith('/print');

  return (
    <div
      className={`min-h-screen bg-[#FAFAFA] flex flex-col lg:flex-row w-full text-gray-900 ${
        isTwoPane ? 'lg:h-screen lg:max-h-screen lg:overflow-hidden' : ''
      }`}
    >
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3500,
          style: {
            background: '#FFFFFF',
            color: '#111827',
            border: '1px solid #E5E7EB',
            fontSize: '13px',
            borderRadius: '8px',
            padding: '10px 14px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05)',
          },
          success: {
            iconTheme: {
              primary: '#16A34A',
              secondary: '#FFFFFF',
            },
          },
          error: {
            iconTheme: {
              primary: '#DC2626',
              secondary: '#FFFFFF',
            },
          },
        }}
      />

      {/* Sidebar Component */}
      <Sidebar />

      {/* Main Content Area */}
      <div
        className={`flex-1 lg:pl-56 print:pl-0 print:m-0 flex flex-col min-h-screen min-w-0 max-w-full ${
          isTwoPane ? 'lg:min-h-0 lg:h-screen lg:max-h-screen lg:overflow-hidden' : ''
        }`}
      >
        <main
          className={`flex-1 p-4 sm:p-6 lg:p-6 print:p-0 print:m-0 max-w-7xl print:max-w-none w-full mx-auto min-w-0 flex flex-col ${
            isTwoPane ? 'lg:min-h-0 lg:h-full lg:overflow-hidden lg:pb-4' : ''
          }`}
        >
          <Routes>
            <Route path="/" element={<GalleryPage />} />
            <Route path="/designer" element={<DesignerPage />} />
            <Route path="/designer/:id" element={<DesignerPage />} />
            <Route path="/products" element={<Navigate to="/products/items" replace />} />
            <Route path="/products/items" element={<ItemsPage />} />
            <Route path="/products/suppliers" element={<SuppliersPage />} />
            <Route path="/stock" element={<Navigate to="/products/items" replace />} />
            <Route path="/stock/items" element={<Navigate to="/products/items" replace />} />
            <Route path="/stock/suppliers" element={<Navigate to="/products/suppliers" replace />} />
            <Route path="/stock/bin" element={<Navigate to="/bin?tab=products" replace />} />
            <Route path="/stock/*" element={<Navigate to="/products/items" replace />} />
            <Route path="/print" element={<PrintLabelsPage />} />
            <Route path="/bin" element={<RecycleBinPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
