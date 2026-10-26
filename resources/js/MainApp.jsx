import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Sidebar from './components/Sidebar';
import GalleryPage from './pages/GalleryPage';
import DesignerPage from './pages/DesignerPage';
import StockPage from './pages/StockPage';
import RecycleBinPage from './pages/RecycleBinPage';

export default function MainApp() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row w-full">
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3500,
          style: {
            background: '#0F172A',
            color: '#FFFFFF',
            fontSize: '14px',
            borderRadius: '12px',
            padding: '12px 16px',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
          },
          success: {
            iconTheme: {
              primary: '#22C55E',
              secondary: '#FFFFFF',
            },
          },
          error: {
            iconTheme: {
              primary: '#EF4444',
              secondary: '#FFFFFF',
            },
          },
        }}
      />

      {/* Sidebar Component */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-64 flex flex-col min-h-screen min-w-0 max-w-full">
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto min-w-0">
          <Routes>
            <Route path="/" element={<GalleryPage />} />
            <Route path="/designer" element={<DesignerPage />} />
            <Route path="/designer/:id" element={<DesignerPage />} />
            <Route path="/stock" element={<StockPage />} />
            <Route path="/bin" element={<RecycleBinPage />} />
            <Route path="/stock/bin" element={<Navigate to="/bin?tab=products" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
