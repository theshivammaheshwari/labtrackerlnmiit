import React, { useEffect, useState } from 'react';
import {
  Search,
  LayoutGrid,
  Check,
  RotateCcw,
  Eraser,
  SlidersHorizontal,
} from 'lucide-react';

const FILTER_TABS = [
  { value: '', label: 'All' },
  { value: 'open', label: 'Open' },
  { value: 'progress', label: 'In Progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'ok', label: 'Healthy' },
];

export default function LayoutToolbar({
  arranging,
  onToggleArranging,
  filter,
  onFilterChange,
  search,
  onSearchChange,
  layout,
  onResize,
  onResetLayout,
  onBlankLayout,
}) {
  const [rows, setRows] = useState(layout.rows);
  const [cols, setCols] = useState(layout.cols);

  useEffect(() => {
    setRows(layout.rows);
    setCols(layout.cols);
  }, [layout.rows, layout.cols]);

  return (
    <div className="rounded-2xl border border-slate-800/80 bg-slate-900/55 backdrop-blur-xl p-3.5 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onToggleArranging}
            className={`px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all border ${
              arranging
                ? 'bg-sky-500 text-slate-950 border-sky-400 shadow-lg shadow-sky-500/25'
                : 'bg-slate-800/80 text-slate-200 border-slate-700 hover:border-sky-400/50 hover:text-white'
            }`}
          >
            {arranging ? <Check className="w-4 h-4" /> : <LayoutGrid className="w-4 h-4" />}
            {arranging ? 'Done Editing Layout' : 'Edit Lab Layout'}
          </button>

          {!arranging && (
            <div className="flex flex-wrap items-center gap-1 p-1 rounded-xl bg-slate-950/70 border border-slate-800">
              {FILTER_TABS.map((tab) => (
                <button
                  key={tab.label}
                  type="button"
                  onClick={() => onFilterChange(tab.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    filter === tab.value
                      ? 'bg-slate-800 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="relative flex-1 min-w-[210px] max-w-xs">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search PC #, issue, or note..."
            className="w-full pl-10 pr-3 py-2 rounded-xl border border-slate-800 bg-slate-950/70 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50"
          />
        </div>
      </div>

      {arranging && (
        <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
            <SlidersHorizontal className="w-4 h-4 text-sky-400" />
            <label className="flex items-center gap-1.5">
              Rows
              <input
                type="number"
                min={1}
                max={30}
                value={rows}
                onChange={(e) => setRows(Number(e.target.value))}
                className="w-16 px-2.5 py-1.5 rounded-lg border border-slate-700 bg-slate-950 text-white font-mono text-xs"
              />
            </label>
            <label className="flex items-center gap-1.5">
              Cols
              <input
                type="number"
                min={1}
                max={60}
                value={cols}
                onChange={(e) => setCols(Number(e.target.value))}
                className="w-16 px-2.5 py-1.5 rounded-lg border border-slate-700 bg-slate-950 text-white font-mono text-xs"
              />
            </label>
            <button
              type="button"
              onClick={() => onResize(rows, cols)}
              className="px-3 py-1.5 rounded-lg bg-sky-500/20 border border-sky-400/40 text-sky-200 hover:bg-sky-500/30 font-medium transition-colors"
            >
              Apply Size
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onBlankLayout}
              className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800/70 text-xs font-medium text-slate-300 hover:text-white hover:border-slate-600 flex items-center gap-1.5"
            >
              <Eraser className="w-3.5 h-3.5" />
              Blank Canvas
            </button>
            <button
              type="button"
              onClick={onResetLayout}
              className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800/70 text-xs font-medium text-slate-300 hover:text-white hover:border-slate-600 flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset 9×10
            </button>
          </div>

          <p className="w-full text-xs text-slate-400">
            Tip: Drag & drop any PC card onto another seat (they swap automatically), or click a PC and click a destination seat. Drop onto the tray below to unplace.
          </p>
        </div>
      )}
    </div>
  );
}
