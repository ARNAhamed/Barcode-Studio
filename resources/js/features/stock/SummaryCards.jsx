import React from 'react';
import { Package, AlertTriangle, AlertCircle } from 'lucide-react';
import Skeleton from '../../components/Skeleton';

export default function SummaryCards({ summary, isLoading }) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <Skeleton count={3} className="h-28" />
      </div>
    );
  }

  const cards = [
    {
      title: 'Total Products',
      value: summary?.total ?? 0,
      description: 'Active items in inventory',
      icon: Package,
      iconBg: 'bg-indigo-50 text-indigo-600',
      borderAccent: 'border-l-indigo-500',
    },
    {
      title: 'Low Stock Alert',
      value: summary?.low ?? 0,
      description: 'At or below threshold',
      icon: AlertTriangle,
      iconBg: 'bg-amber-50 text-amber-600',
      borderAccent: 'border-l-amber-500',
    },
    {
      title: 'Out of Stock',
      value: summary?.out ?? 0,
      description: 'Needs immediate replenishment',
      icon: AlertCircle,
      iconBg: 'bg-rose-50 text-rose-600',
      borderAccent: 'border-l-rose-500',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.title}
            className={`bg-white rounded-2xl border border-slate-200 border-l-4 ${card.borderAccent} p-5 shadow-xs transition-shadow hover:shadow-sm flex items-center justify-between`}
          >
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                {card.title}
              </p>
              <h3 className="text-2xl sm:text-3xl font-bold text-slate-900 mt-1 tracking-tight">
                {card.value}
              </h3>
              <p className="text-xs text-slate-400 mt-1">{card.description}</p>
            </div>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${card.iconBg}`}>
              <Icon className="w-6 h-6" />
            </div>
          </div>
        );
      })}
    </div>
  );
}
