import React from 'react';
import { Monitor, AlertTriangle, Clock, CheckCircle2, ShieldCheck } from 'lucide-react';
import { DEFAULT_TOTAL_PCS } from '../utils/tracker';

const CARDS = [
  {
    key: '',
    label: 'Total Lab PCs',
    icon: Monitor,
    accent: 'text-[#333545]',
    border: 'border-slate-200 hover:border-slate-300',
    ring: 'ring-[#F84464]',
  },
  {
    key: 'open',
    label: 'Open Issues',
    icon: AlertTriangle,
    accent: 'text-[#F84464]',
    border: 'border-rose-200 hover:border-[#F84464]/60',
    ring: 'ring-[#F84464]',
  },
  {
    key: 'progress',
    label: 'In Progress',
    icon: Clock,
    accent: 'text-amber-500',
    border: 'border-amber-200 hover:border-amber-400',
    ring: 'ring-amber-500',
  },
  {
    key: 'resolved',
    label: 'Resolved',
    icon: CheckCircle2,
    accent: 'text-sky-500',
    border: 'border-sky-200 hover:border-sky-400',
    ring: 'ring-sky-500',
  },
  {
    key: 'ok',
    label: 'Healthy PCs',
    icon: ShieldCheck,
    accent: 'text-[#1EA83C]',
    border: 'border-emerald-200 hover:border-[#1EA83C]',
    ring: 'ring-[#1EA83C]',
  },
];

export default function StatsBar({ counts, totalPcs = DEFAULT_TOTAL_PCS, filter, onFilterChange }) {
  const safeTotal = Math.max(1, totalPcs);
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {CARDS.map(({ key, label, icon: Icon, accent, border, ring }, idx) => {
        const value = key === '' ? totalPcs : counts[key] || 0;
        const active = filter === key;
        return (
          <button
            key={label}
            type="button"
            onClick={() => onFilterChange(active && key !== '' ? '' : key)}
            className={`group text-left rounded-xl border bg-white ${border} p-3.5 sm:p-4 shadow-sm transition-all duration-150 ${
              idx === 0 ? 'col-span-2 sm:col-span-1' : ''
            } ${
              active ? `ring-2 ${ring}` : 'hover:-translate-y-0.5 hover:shadow-md'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                {label}
              </span>
              <Icon className={`w-4 h-4 ${accent} transition-transform group-hover:scale-110`} />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight text-[#1F2533] font-mono">
                {value}
              </span>
              {key !== '' && (
                <span className="text-xs text-slate-400 font-mono">
                  {Math.round((value / safeTotal) * 100)}%
                </span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
