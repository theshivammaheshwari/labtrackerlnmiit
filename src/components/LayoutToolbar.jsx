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
    <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onToggleArranging}
            className={`px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all border ${
              arranging
                ? 'bg-[#1EA83C] text-white border-[#1EA83C] shadow-sm'
                : 'bg-[#F84464] text-white border-[#F84464] hover:bg-[#E03554] shadow-sm'
            }`}
          >
            {arranging ? <Check className="w-4 h-4" /> : <LayoutGrid className="w-4 h-4" />}
            {arranging ? 'Done Editing Layout' : 'Edit Lab Layout'}
          </button>

          {!arranging && (
            <div className="flex flex-wrap items-center gap-1 p-1 rounded-lg bg-[#F5F5FA] border border-slate-200">
              {FILTER_TABS.map((tab) => (
                <button
                  key={tab.label}
                  type="button"
                  onClick={() => onFilterChange(tab.value)}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                    filter === tab.value
                      ? 'bg-white text-[#F84464] shadow-sm'
                      : 'text-slate-600 hover:text-[#1F2533]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="relative flex-1 min-w-[210px] max-w-xs">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search PC #, issue, or note..."
            className="w-full pl-10 pr-3 py-2 rounded-lg border border-slate-200 bg-[#F5F5FA] text-sm text-[#1F2533] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#F84464]/40 focus:bg-white"
          />
        </div>
      </div>

      {arranging && (
        <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-600">
            <SlidersHorizontal className="w-4 h-4 text-[#F84464]" />
            <label className="flex items-center gap-1.5">
              Rows
              <input
                type="number"
                min={1}
                max={30}
                value={rows}
                onChange={(e) => setRows(Number(e.target.value))}
                className="w-16 px-2.5 py-1.5 rounded-md border border-slate-300 bg-white text-[#1F2533] font-mono text-xs"
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
                className="w-16 px-2.5 py-1.5 rounded-md border border-slate-300 bg-white text-[#1F2533] font-mono text-xs"
              />
            </label>
            <button
              type="button"
              onClick={() => onResize(rows, cols)}
              className="px-3 py-1.5 rounded-md bg-[#333545] text-white hover:bg-[#1F2533] font-medium transition-colors"
            >
              Apply Size
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onBlankLayout}
              className="px-3 py-1.5 rounded-md border border-slate-300 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-1.5"
            >
              <Eraser className="w-3.5 h-3.5" />
              Blank Canvas
            </button>
            <button
              type="button"
              onClick={onResetLayout}
              className="px-3 py-1.5 rounded-md border border-slate-300 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset 9×10
            </button>
          </div>

          <p className="w-full text-xs text-slate-500">
            Tip: Drag & drop any PC seat onto another seat to swap, or click a PC and click a destination seat. Drop into the tray below to unplace.
          </p>
        </div>
      )}
    </div>
  );
}
