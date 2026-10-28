import React, { useState, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  LayoutGrid,
  PenTool,
  Package,
  Printer,
  Menu,
  X,
  Barcode,
  Trash2,
  ChevronDown,
  ChevronRight,
  Boxes,
  Truck,
} from 'lucide-react';
import { getBinSummary } from '../api/bin';

export default function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const isProductsActive =
    location.pathname.startsWith('/products') ||
    location.pathname.startsWith('/stock');

  const [productsExpanded, setProductsExpanded] = useState(isProductsActive);

  useEffect(() => {
    if (isProductsActive) {
      setProductsExpanded(true);
    }
  }, [isProductsActive]);

  const { data: binSummary } = useQuery({
    queryKey: ['bin-summary'],
    queryFn: getBinSummary,
  });

  const totalTrash = binSummary?.total ?? 0;

  const topNavItems = [
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
  ];

  const bottomNavItems = [
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

  const renderProductsGroup = (onItemClick) => (
    <div className="space-y-0.5">
      {/* Products Group Parent Header */}
      <div
        onClick={() => {
          if (!productsExpanded) {
            setProductsExpanded(true);
            if (!isProductsActive) {
              navigate('/products/items');
              if (onItemClick) onItemClick();
            }
          } else {
            setProductsExpanded(!productsExpanded);
          }
        }}
        className={`flex items-center justify-between px-3 h-9 rounded-lg text-sm cursor-pointer transition-colors ${
          isProductsActive
            ? 'bg-gray-100 text-gray-900 font-medium'
            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
        }`}
      >
        <div className="flex items-center gap-2.5">
          <Package className={`w-4 h-4 ${isProductsActive ? 'text-indigo-600' : 'text-gray-500'}`} strokeWidth={1.5} />
          <span>Products</span>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setProductsExpanded(!productsExpanded);
          }}
          className="p-0.5 text-gray-400 hover:text-gray-600 rounded"
          aria-label={productsExpanded ? 'Collapse Products' : 'Expand Products'}
        >
          {productsExpanded ? (
            <ChevronDown className="w-4 h-4" strokeWidth={1.5} />
          ) : (
            <ChevronRight className="w-4 h-4" strokeWidth={1.5} />
          )}
        </button>
      </div>

      {/* Sub-items */}
      {productsExpanded && (
        <div className="pl-6 space-y-0.5 pt-0.5">
          <NavLink
            to="/products/items"
            onClick={onItemClick}
            className={({ isActive }) =>
              `flex items-center gap-2 px-3 h-8 rounded-lg text-xs transition-colors ${
                isActive || location.pathname.startsWith('/stock')
                  ? 'bg-indigo-50 text-indigo-700 font-medium'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`
            }
          >
            <Boxes className="w-3.5 h-3.5 text-gray-400" strokeWidth={1.5} />
            <span>Items</span>
          </NavLink>

          <NavLink
            to="/products/suppliers"
            onClick={onItemClick}
            className={({ isActive }) =>
              `flex items-center gap-2 px-3 h-8 rounded-lg text-xs transition-colors ${
                isActive
                  ? 'bg-indigo-50 text-indigo-700 font-medium'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`
            }
          >
            <Truck className="w-3.5 h-3.5 text-gray-400" strokeWidth={1.5} />
            <span>Suppliers</span>
          </NavLink>
        </div>
      )}
    </div>
  );

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
          <div className="fixed inset-y-0 left-0 w-60 bg-white shadow-lg flex flex-col z-10 border-r border-gray-200">
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
            <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
              {topNavItems.map((item) => {
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
                  </NavLink>
                );
              })}

              {renderProductsGroup(() => setMobileOpen(false))}

              {bottomNavItems.map((item) => {
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
                      <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full font-medium">
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
        <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
          {topNavItems.map((item) => {
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
              </NavLink>
            );
          })}

          {renderProductsGroup()}

          {bottomNavItems.map((item) => {
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
                  <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full font-medium">
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
