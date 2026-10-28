import React from 'react';
import { NavLink } from 'react-router-dom';
import { Package, Truck } from 'lucide-react';

export default function ProductsTabNav() {
  return (
    <div className="flex items-center gap-1 p-1 bg-gray-100/80 rounded-lg w-fit mb-5 border border-gray-200/60">
      <NavLink
        to="/products/items"
        className={({ isActive }) =>
          `flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
            isActive
              ? 'bg-white text-gray-900 shadow-xs font-semibold'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/50'
          }`
        }
      >
        <Package className="w-3.5 h-3.5 text-gray-500" strokeWidth={1.5} />
        <span>Items</span>
      </NavLink>

      <NavLink
        to="/products/suppliers"
        className={({ isActive }) =>
          `flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
            isActive
              ? 'bg-white text-gray-900 shadow-xs font-semibold'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/50'
          }`
        }
      >
        <Truck className="w-3.5 h-3.5 text-gray-500" strokeWidth={1.5} />
        <span>Suppliers</span>
      </NavLink>
    </div>
  );
}
