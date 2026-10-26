import React from 'react';

export default function Skeleton({
  type = 'rectangle',
  count = 1,
  className = '',
}) {
  const getSkeletonItem = (index) => {
    switch (type) {
      case 'card':
        return (
          <div
            key={index}
            className={`bg-white rounded-2xl border border-slate-200 p-5 shadow-xs animate-pulse ${className}`}
          >
            <div className="w-full h-36 bg-slate-200 rounded-xl mb-4" />
            <div className="h-5 bg-slate-200 rounded-md w-3/4 mb-2" />
            <div className="h-4 bg-slate-200 rounded-md w-1/2 mb-4" />
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <div className="h-6 w-16 bg-slate-200 rounded-full" />
              <div className="h-8 w-20 bg-slate-200 rounded-xl" />
            </div>
          </div>
        );

      case 'table-row':
        return (
          <tr key={index} className="animate-pulse border-b border-slate-100">
            <td className="py-4 px-4"><div className="h-4 w-32 bg-slate-200 rounded" /></td>
            <td className="py-4 px-4"><div className="h-4 w-24 bg-slate-200 rounded" /></td>
            <td className="py-4 px-4"><div className="h-4 w-28 bg-slate-200 rounded" /></td>
            <td className="py-4 px-4"><div className="h-4 w-20 bg-slate-200 rounded" /></td>
            <td className="py-4 px-4"><div className="h-4 w-16 bg-slate-200 rounded" /></td>
            <td className="py-4 px-4"><div className="h-4 w-12 bg-slate-200 rounded" /></td>
            <td className="py-4 px-4"><div className="h-6 w-20 bg-slate-200 rounded-full" /></td>
            <td className="py-4 px-4"><div className="h-8 w-16 bg-slate-200 rounded-xl" /></td>
          </tr>
        );

      case 'text':
        return (
          <div
            key={index}
            className={`h-4 bg-slate-200 rounded animate-pulse ${className}`}
          />
        );

      case 'rectangle':
      default:
        return (
          <div
            key={index}
            className={`bg-slate-200 rounded-xl animate-pulse ${className}`}
          />
        );
    }
  };

  return (
    <>
      {Array.from({ length: count }).map((_, i) => getSkeletonItem(i))}
    </>
  );
}
