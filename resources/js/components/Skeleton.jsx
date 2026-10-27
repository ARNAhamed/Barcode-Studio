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
            className={`bg-white rounded-lg border border-gray-200 p-5 animate-pulse ${className}`}
          >
            <div className="w-full h-36 bg-gray-100 rounded-md mb-4" />
            <div className="h-4 bg-gray-100 rounded w-3/4 mb-2" />
            <div className="h-3 bg-gray-100 rounded w-1/2 mb-4" />
            <div className="flex items-center justify-between pt-3 border-t border-gray-100">
              <div className="h-5 w-16 bg-gray-100 rounded" />
              <div className="h-7 w-16 bg-gray-100 rounded" />
            </div>
          </div>
        );

      case 'table-row':
        return (
          <tr key={index} className="animate-pulse border-b border-gray-100">
            <td className="py-3 px-3"><div className="h-3.5 w-32 bg-gray-100 rounded" /></td>
            <td className="py-3 px-3"><div className="h-3.5 w-24 bg-gray-100 rounded" /></td>
            <td className="py-3 px-3"><div className="h-3.5 w-28 bg-gray-100 rounded" /></td>
            <td className="py-3 px-3"><div className="h-3.5 w-20 bg-gray-100 rounded" /></td>
            <td className="py-3 px-3"><div className="h-3.5 w-16 bg-gray-100 rounded" /></td>
            <td className="py-3 px-3"><div className="h-3.5 w-12 bg-gray-100 rounded" /></td>
            <td className="py-3 px-3"><div className="h-5 w-16 bg-gray-100 rounded" /></td>
            <td className="py-3 px-3"><div className="h-7 w-16 bg-gray-100 rounded" /></td>
          </tr>
        );

      case 'text':
        return (
          <div
            key={index}
            className={`h-3.5 bg-gray-100 rounded animate-pulse ${className}`}
          />
        );

      case 'rectangle':
      default:
        return (
          <div
            key={index}
            className={`bg-gray-100 rounded-lg animate-pulse ${className}`}
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
