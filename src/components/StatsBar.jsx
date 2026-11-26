import React from 'react';
import { Monitor, AlertTriangle, Clock, CheckCircle2, ShieldCheck } from 'lucide-react';
import { TOTAL_PCS } from '../utils/tracker';

const CARDS = [
  {
    key: '',
    label: 'Total Lab PCs',
    icon: Monitor,
    accent: 'text-sky-400',
    border: 'border-sky-500/20 hover:border-sky-400/40',
    bg: 'from-sky-500/10 to-transparent',
  },
  {
    key: 'open',
    label: 'Open Issues',
    icon: AlertTriangle,
    accent: 'text-rose-400',
    border: 'border-rose-500/25 hover:border-rose-400/50',
    bg: 'from-rose-500/10 to-transparent',
  },
  {
    key: 'progress',
    label: 'In Progress',
    icon: Clock,
    accent: 'text-amber-400',
    border: 'border-amber-500/25 hover:border-amber-400/50',
    bg: 'from-amber-500/10 to-transparent',
  },
  {
    key: 'resolved',
    label: 'Resolved',
    icon: CheckCircle2,
    accent: 'text-emerald-400',
    border: 'border-emerald-500/25 hover:border-emerald-400/50',
    bg: 'from-emerald-500/10 to-transparent',
  },
  {
    key: 'ok',
    label: 'Healthy / Unmarked',
    icon: ShieldCheck,
    accent: 'text-slate-300',
    border: 'border-slate-700/60 hover:border-slate-500/60',
    bg: 'from-slate-500/10 to-transparent',
  },
];

export default function StatsBar({ counts, filter, onFilterChange }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {CARDS.map(({ key, label, icon: Icon, accent, border, bg }) => {
        const value = key === '' ? TOTAL_PCS : counts[key] || 0;
        const active = filter === key;
        return (
          <button
            key={label}
            type="button"
            onClick={() => onFilterChange(active && key !== '' ? '' : key)}
            className={`group text-left rounded-2xl border backdrop-blur-xl bg-slate-900/55 bg-gradient-to-br ${bg} ${border} p-4 transition-all duration-200 ${
              active ? 'ring-2 ring-sky-400/60 bg-slate-800/70' : 'hover:-translate-y-0.5'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
                {label}
              </span>
              <Icon className={`w-4 h-4 ${accent} transition-transform group-hover:scale-110`} />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight text-white font-mono">
                {value}
              </span>
              {key !== '' && (
                <span className="text-xs text-slate-500 font-mono">
                  {Math.round((value / TOTAL_PCS) * 100)}%
                </span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
