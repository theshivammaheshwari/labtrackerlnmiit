import React, { useEffect, useState } from 'react';
import {
  Search,
  LayoutGrid,
  Check,
  RotateCcw,
  Eraser,
  SlidersHorizontal,
  Eye,
  CheckSquare,
  Wand2,
  Undo2,
  XCircle,
} from 'lucide-react';

const FILTER_TABS = [
  { value: '', label: 'All' },
  { value: 'open', label: 'Open' },
  { value: 'progress', label: 'In Progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'ok', label: 'Healthy' },
];

export default function LayoutToolbar({
  canEdit,
  arranging,
  onToggleArranging,
  bulkMode,
  onToggleBulkMode,
  bulkCount,
  unplacedCount,
  onSelectAllTray,
  onClearBulk,
  onReturnSelectedToTray,
  onAutoFillEmpty,
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
          {canEdit ? (
            <>
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

              {arranging && (
                <button
                  type="button"
                  onClick={onToggleBulkMode}
                  className={`px-3.5 py-2 rounded-lg text-sm font-semibold flex items-center gap-1.5 transition-all border ${
                    bulkMode
                      ? 'bg-[#333545] text-white border-[#333545] shadow-sm'
                      : 'bg-[#F5F5FA] text-[#1F2533] border-slate-300 hover:border-[#333545]'
                  }`}
                >
                  <CheckSquare className="w-4 h-4 text-[#F84464]" />
                  {bulkMode ? `Bulk Select ON (${bulkCount})` : 'Bulk Select'}
                </button>
              )}
            </>
          ) : (
            <span className="px-3 py-2 rounded-lg bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-600 flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-slate-500" />
              View-Only Mode
            </span>
          )}

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

      {canEdit && arranging && (
        <div className="pt-3 border-t border-slate-200 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-3">
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
              {unplacedCount > 0 && (
                <button
                  type="button"
                  onClick={onAutoFillEmpty}
                  className="px-3 py-1.5 rounded-md bg-emerald-50 border border-[#1EA83C]/50 text-xs font-semibold text-[#1EA83C] hover:bg-[#1EA83C] hover:text-white flex items-center gap-1.5 transition-colors"
                >
                  <Wand2 className="w-3.5 h-3.5" />
                  Auto-Fill Empty Seats ({unplacedCount})
                </button>
              )}
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
                Reset Default
              </button>
            </div>
          </div>

          {bulkMode && (
            <div className="flex flex-wrap items-center gap-2 rounded-lg bg-[#F5F5FA] border border-slate-200 px-3 py-2">
              <span className="text-xs font-bold text-[#333545]">
                Bulk Selected: {bulkCount} PC(s)
              </span>
              {unplacedCount > 0 && (
                <button
                  type="button"
                  onClick={onSelectAllTray}
                  className="px-2.5 py-1 rounded bg-white border border-slate-300 text-xs font-medium text-slate-700 hover:border-[#F84464] hover:text-[#F84464]"
                >
                  Select All Tray ({unplacedCount})
                </button>
              )}
              {bulkCount > 0 && (
                <>
                  <button
                    type="button"
                    onClick={onReturnSelectedToTray}
                    className="px-2.5 py-1 rounded bg-[#333545] text-white text-xs font-medium hover:bg-[#1F2533] flex items-center gap-1"
                  >
                    <Undo2 className="w-3 h-3" />
                    Move Selected to Tray
                  </button>
                  <button
                    type="button"
                    onClick={onClearBulk}
                    className="px-2.5 py-1 rounded bg-white border border-slate-300 text-xs font-medium text-slate-600 hover:text-[#D91B42] flex items-center gap-1"
                  >
                    <XCircle className="w-3 h-3" />
                    Clear
                  </button>
                </>
              )}
              <span className="text-[11px] text-slate-500 ml-auto">
                Click PCs to select in order (1, 2, 3...), then click any empty seat (+) to place all at once!
              </span>
            </div>
          )}

          {!bulkMode && (
            <p className="text-xs text-slate-500">
              Tip: Drag & drop any PC seat onto another seat to swap, or turn on <strong>Bulk Select</strong> to arrange many PCs at once.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
