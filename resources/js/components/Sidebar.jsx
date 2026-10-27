import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { LayoutGrid, PenTool, Package, Printer, Menu, X, Barcode, Trash2 } from 'lucide-react';
import { getBinSummary } from '../api/bin';

export default function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  const { data: binSummary } = useQuery({
    queryKey: ['bin-summary'],
    queryFn: getBinSummary,
  });

  const totalTrash = binSummary?.total ?? 0;

  const navItems = [
    {
      to: '/',
      label: 'Gallery',
      icon: LayoutGrid,
      end: true,
    },
    {
      to: '/designer',
      label: 'Designer',
      icon: PenTool,
      end: false,
    },
    {
      to: '/stock',
      label: 'Stock Management',
      icon: Package,
      end: false,
    },
    {
      to: '/print',
      label: 'Print Labels',
      icon: Printer,
      end: false,
    },
    {
      to: '/bin',
      label: 'Recycle Bin',
      icon: Trash2,
      end: false,
      count: totalTrash,
    },
  ];

  return (
    <>
      {/* Mobile Top Header */}
      <header className="lg:hidden print:hidden flex items-center justify-between px-4 h-14 bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="flex items-center gap-2">
          <Barcode className="w-5 h-5 text-gray-900" strokeWidth={1.5} />
          <span className="font-semibold text-gray-900 text-sm">Barcode Studio</span>
        </div>
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="p-1.5 text-gray-500 hover:text-gray-900 rounded-lg hover:bg-gray-100"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" strokeWidth={1.5} />
        </button>
      </header>

      {/* Mobile Backdrop & Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-gray-900/40 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 w-56 bg-white shadow-lg flex flex-col z-10 border-r border-gray-200">
            <div className="flex items-center justify-between px-4 h-14 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <Barcode className="w-5 h-5 text-gray-900" strokeWidth={1.5} />
                <span className="font-semibold text-gray-900 text-sm">Barcode Studio</span>
              </div>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100"
              >
                <X className="w-4 h-4" strokeWidth={1.5} />
              </button>
            </div>
            <nav className="flex-1 p-2 space-y-0.5">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    onClick={() => setMobileOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center justify-between px-3 h-9 rounded-lg text-sm transition-colors ${
                        isActive
                          ? 'bg-gray-100 text-indigo-600 font-medium'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                      }`
                    }
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className="w-4 h-4" strokeWidth={1.5} />
                      <span>{item.label}</span>
                    </div>
                    {item.count !== undefined && item.count > 0 && (
                      <span className="text-xs text-gray-400 font-normal">
                        {item.count}
                      </span>
                    )}
                  </NavLink>
                );
              })}
            </nav>
          </div>
        </div>
      )}

      {/* Desktop Sidebar (Width 224px = w-56) */}
      <aside className="hidden lg:flex lg:flex-col lg:w-56 lg:fixed lg:inset-y-0 bg-white border-r border-gray-200 z-30 print:hidden">
        {/* Simple Brand Header */}
        <div className="flex items-center gap-2.5 px-4 h-14 border-b border-gray-200">
          <Barcode className="w-5 h-5 text-gray-900" strokeWidth={1.5} />
          <span className="font-semibold text-gray-900 text-sm tracking-tight">Barcode Studio</span>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 p-2 space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3 h-9 rounded-lg text-sm transition-colors ${
                    isActive
                      ? 'bg-gray-100 text-indigo-600 font-medium'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`
                }
              >
                <div className="flex items-center gap-2.5">
                  <Icon className="w-4 h-4" strokeWidth={1.5} />
                  <span>{item.label}</span>
                </div>
                {item.count !== undefined && item.count > 0 && (
                  <span className="text-xs text-gray-400 font-normal">
                    {item.count}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
