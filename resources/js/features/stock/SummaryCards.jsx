import React from 'react';
import Skeleton from '../../components/Skeleton';

export default function SummaryCards({ summary, isLoading }) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Skeleton count={3} className="h-20" />
      </div>
    );
  }

  const total = summary?.total ?? 0;
  const low = summary?.low ?? 0;
  const out = summary?.out ?? 0;

  const cards = [
    {
      title: 'Total Products',
      value: total,
      description: 'Active items in inventory',
      valueColor: 'text-gray-900',
    },
    {
      title: 'Low Stock Alert',
      value: low,
      description: 'At or below threshold',
      valueColor: low > 0 ? 'text-[#D97706]' : 'text-gray-900',
    },
    {
      title: 'Out of Stock',
      value: out,
      description: 'Needs replenishment',
      valueColor: out > 0 ? 'text-[#DC2626]' : 'text-gray-900',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {cards.map((card) => (
        <div
          key={card.title}
          className="bg-white rounded-lg border border-gray-200 p-3.5"
        >
          <p className="text-xs text-gray-500 font-medium">
            {card.title}
          </p>
          <div className={`text-2xl font-semibold mt-1 tracking-tight ${card.valueColor}`}>
            {card.value}
          </div>
          <p className="text-xs text-gray-400 mt-1">{card.description}</p>
        </div>
      ))}
    </div>
  );
}
