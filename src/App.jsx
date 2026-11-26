import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Monitor,
  Download,
  Upload,
  FileSpreadsheet,
  Cloud,
  CloudOff,
  Loader2,
  GripVertical,
  Undo2,
} from 'lucide-react';
import { cloudDoc, onSnapshot, setDoc } from './firebase';
import {
  STORAGE_KEY,
  STATUS_LABELS,
  STATUS_STYLES,
  TOTAL_PCS,
  buildCsv,
  decodeTrackerData,
  defaultLayout,
  downloadFile,
  pcName,
  validDimensions,
} from './utils/tracker';
import StatsBar from './components/StatsBar';
import LayoutToolbar from './components/LayoutToolbar';
import EditorModal from './components/EditorModal';

function loadInitialLocal() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { records: {}, layout: defaultLayout() };
    const decoded = decodeTrackerData(JSON.parse(raw));
    return { records: decoded.records, layout: decoded.layout };
  } catch {
    return { records: {}, layout: defaultLayout() };
  }
}

function rowLabel(rowIndex) {
  let label = '';
  let n = rowIndex;
  do {
    label = String.fromCharCode(65 + (n % 26)) + label;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return label;
}

export default function App() {
  const initial = useMemo(() => loadInitialLocal(), []);
  const [records, setRecords] = useState(initial.records);
  const [layout, setLayout] = useState(initial.layout);
  const [cloudState, setCloudState] = useState({
    status: 'connecting',
    text: 'Connecting to Firebase...',
  });
  const [toast, setToast] = useState('');
  const [filter, setFilter] = useState('');
  const [search, setSearch] = useState('');
  const [arranging, setArranging] = useState(false);
  const [picked, setPicked] = useState(null);
  const [draggedId, setDraggedId] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [editingPcId, setEditingPcId] = useState(null);
  const fileInputRef = useRef(null);

  const showToast = (msg) => setToast(msg);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(''), 3200);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    const unsub = onSnapshot(
      cloudDoc,
      (snap) => {
        if (!snap.exists()) {
          setCloudState({
            status: 'connected',
            text: 'Firebase ready · Save a change to sync',
          });
          return;
        }
        if (snap.metadata.hasPendingWrites) return;
        try {
          const decoded = decodeTrackerData(snap.data());
          setRecords(decoded.records);
          setLayout(decoded.layout);
          localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({ version: 3, records: decoded.records, layout: decoded.layout })
          );
          setCloudState({ status: 'synced', text: 'Cloud Synced · Live' });
        } catch (err) {
          console.error('Cloud decode error:', err);
          setCloudState({ status: 'error', text: 'Cloud data format error' });
        }
      },
      (err) => {
        console.error('Firestore listener error:', err);
        setCloudState({
          status: 'error',
          text:
            err?.code === 'permission-denied'
              ? 'Firestore permission denied (check Rules)'
              : 'Offline · Using local cache',
        });
      }
    );
    return () => unsub();
  }, []);

  const persist = (nextRecords, nextLayout = layout) => {
    setRecords(nextRecords);
    setLayout(nextLayout);
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ version: 3, records: nextRecords, layout: nextLayout })
      );
    } catch {
      showToast('Browser storage full.');
    }

    setCloudState({ status: 'saving', text: 'Saving to Firebase...' });
    setDoc(cloudDoc, {
      version: 3,
      records: nextRecords,
      layout: nextLayout,
    })
      .then(() => {
        setCloudState({ status: 'synced', text: 'Cloud Synced · Live' });
      })
      .catch((err) => {
        console.error('Firebase save error:', err);
        setCloudState({
          status: 'error',
          text:
            err?.code === 'permission-denied'
              ? 'Firestore permission denied'
              : 'Cloud save failed (saved locally)',
        });
        showToast('Saved locally; Firebase sync failed.');
      });
  };

  const placedSet = useMemo(
    () => new Set(layout.seats.filter((id) => id !== null)),
    [layout.seats]
  );

  const unplacedIds = useMemo(() => {
    const all = [];
    for (let id = 1; id <= TOTAL_PCS; id++) {
      if (!placedSet.has(id)) all.push(id);
    }
    return all;
  }, [placedSet]);

  const counts = useMemo(() => {
    const c = { ok: 0, open: 0, progress: 0, resolved: 0 };
    for (let id = 1; id <= TOTAL_PCS; id++) {
      const st = records[id]?.status || 'ok';
      c[st] = (c[st] || 0) + 1;
    }
    return c;
  }, [records]);

  const matchesSearch = (id) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    const entry = records[id];
    return (
      pcName(id).toLowerCase().includes(q) ||
      String(id).includes(q) ||
      (entry?.issues || []).some((iss) => iss.toLowerCase().includes(q)) ||
      (entry?.notes || '').toLowerCase().includes(q)
    );
  };

  const placePC = (id, targetIndex) => {
    if (!id) return;
    const seats = [...layout.seats];
    const origin = seats.indexOf(id);
    if (origin === targetIndex) return;
    if (origin >= 0) {
      seats[origin] = targetIndex >= 0 ? seats[targetIndex] : null;
    }
    if (targetIndex >= 0) {
      seats[targetIndex] = id;
    }
    setPicked(null);
    persist(records, { ...layout, seats });
    showToast(
      targetIndex >= 0 ? `${pcName(id)} placed.` : `${pcName(id)} moved to tray.`
    );
  };

  const handleSeatClick = (index) => {
    if (!arranging) {
      const id = layout.seats[index];
      if (id) setEditingPcId(id);
      return;
    }
    if (picked !== null && picked !== layout.seats[index]) {
      placePC(picked, index);
      return;
    }
    const id = layout.seats[index];
    setPicked((prev) => (prev === id ? null : id));
  };

  const handleResize = (rows, cols) => {
    if (!validDimensions(rows, cols)) {
      showToast('Use 1–30 rows and 1–60 columns.');
      return;
    }
    const seats = Array(rows * cols).fill(null);
    let displaced = 0;
    layout.seats.forEach((id, index) => {
      if (!id) return;
      const r = Math.floor(index / layout.cols);
      const c = index % layout.cols;
      if (r < rows && c < cols) seats[r * cols + c] = id;
      else displaced++;
    });
    setPicked(null);
    persist(records, { rows, cols, seats });
    showToast(
      displaced
        ? `Resized to ${rows}×${cols}. ${displaced} PC(s) moved to tray.`
        : `Layout resized to ${rows}×${cols}.`
    );
  };

  const handleBlankLayout = () => {
    if (!window.confirm('Move all PCs to the tray? Issue records will be kept.')) return;
    const rows = Math.max(layout.rows, 9);
    const cols = Math.max(layout.cols, 12);
    setPicked(null);
    persist(records, { rows, cols, seats: Array(rows * cols).fill(null) });
    showToast('Canvas cleared. Drag PCs from the tray.');
  };

  const handleResetLayout = () => {
    if (!window.confirm('Reset PC positions to 9 × 10? Issue records will be kept.')) return;
    setPicked(null);
    persist(records, defaultLayout());
    showToast('Default 9×10 layout restored.');
  };

  const handleSavePc = (pcId, { status, issues, notes }) => {
    const next = { ...records };
    if (status === 'ok') {
      delete next[pcId];
    } else {
      next[pcId] = {
        status,
        issues,
        notes,
        updated: new Date().toISOString(),
      };
    }
    persist(next);
    setEditingPcId(null);
    showToast(`${pcName(pcId)} updated.`);
  };

  const handleRestore = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      if (file.size > 1_500_000) throw new Error('Too large');
      const decoded = decodeTrackerData(JSON.parse(await file.text()));
      if (
        window.confirm(
          'Restore this backup? It replaces current PC records and layout.'
        )
      ) {
        setPicked(null);
        persist(decoded.records, decoded.legacy ? layout : decoded.layout);
        showToast('Backup restored and synced to cloud.');
      }
    } catch {
      showToast('Invalid Lab PC Tracker backup file.');
    }
  };

  const dense = layout.cols > 14;
  const rowsArray = useMemo(() => {
    const list = [];
    for (let r = 0; r < layout.rows; r++) {
      list.push(layout.seats.slice(r * layout.cols, (r + 1) * layout.cols));
    }
    return list;
  }, [layout.rows, layout.cols, layout.seats]);

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F5FA]">
      {/* BookMyShow-style Top Navbar */}
      <header className="sticky top-0 z-30 bg-[#333545] text-white shadow-md">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="px-2.5 py-2 rounded-lg bg-[#F84464] text-white font-bold text-sm tracking-tight shadow-sm flex items-center gap-1.5">
              <Monitor className="w-4 h-4" />
              <span>LNMIIT</span>
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-white">
                Lab PC Tracker
              </h1>
              <p className="text-[11px] text-slate-300">
                90-Seat Lab Map · Real-time Issue & Layout Manager
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div
              className={`px-3 py-1.5 rounded-full text-xs font-medium border flex items-center gap-1.5 ${
                cloudState.status === 'synced' || cloudState.status === 'connected'
                  ? 'bg-emerald-500/15 border-emerald-400/40 text-emerald-200'
                  : cloudState.status === 'error'
                  ? 'bg-[#F84464]/20 border-[#F84464]/50 text-rose-200'
                  : 'bg-white/10 border-white/20 text-slate-200'
              }`}
            >
              {cloudState.status === 'saving' || cloudState.status === 'connecting' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : cloudState.status === 'error' ? (
                <CloudOff className="w-3.5 h-3.5" />
              ) : (
                <Cloud className="w-3.5 h-3.5" />
              )}
              <span>{cloudState.text}</span>
            </div>

            <button
              type="button"
              onClick={() =>
                downloadFile(
                  'lab-pc-backup.json',
                  'application/json',
                  JSON.stringify({ version: 3, records, layout }, null, 2)
                )
              }
              className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-medium text-white flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              JSON
            </button>

            <button
              type="button"
              onClick={() =>
                downloadFile(
                  'lab-pc-report.csv',
                  'text/csv;charset=utf-8',
                  buildCsv(records)
                )
              }
              className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-medium text-white flex items-center gap-1.5 transition-colors"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              CSV
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-medium text-white flex items-center gap-1.5 transition-colors"
            >
              <Upload className="w-3.5 h-3.5" />
              Restore
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleRestore}
            />
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-[1600px] w-full mx-auto px-4 sm:px-6 py-5 space-y-4">
        <StatsBar
          counts={counts}
          filter={filter}
          onFilterChange={setFilter}
        />

        <LayoutToolbar
          arranging={arranging}
          onToggleArranging={() => {
            setArranging((v) => !v);
            setPicked(null);
          }}
          filter={filter}
          onFilterChange={setFilter}
          search={search}
          onSearchChange={setSearch}
          layout={layout}
          onResize={handleResize}
          onResetLayout={handleResetLayout}
          onBlankLayout={handleBlankLayout}
        />

        {/* BookMyShow-style Seat Map Card */}
        <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm">
          {/* Legend Bar */}
          <div className="flex flex-wrap items-center justify-center gap-5 pb-4 mb-5 border-b border-slate-100 text-xs font-medium text-slate-600">
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 rounded border-2 border-[#1EA83C] bg-white inline-block" />
              Healthy
            </span>
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 rounded border-2 border-[#F84464] bg-[#FFF0F3] inline-block" />
              Open Issue
            </span>
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 rounded border-2 border-amber-500 bg-amber-50 inline-block" />
              In Progress
            </span>
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 rounded border-2 border-sky-500 bg-sky-50 inline-block" />
              Resolved
            </span>
          </div>

          {/* BookMyShow Curved Screen Indicator */}
          <div className="mb-6 flex flex-col items-center">
            <div className="w-full max-w-md h-3 border-t-4 border-sky-300/80 rounded-t-[100%] shadow-[0_-6px_14px_-4px_rgba(56,189,248,0.35)]" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
              All eyes this way · Front of Lab
            </span>
          </div>

          {/* Rows with Cinema Row Letters (A, B, C...) */}
          <div className="space-y-2 overflow-x-auto pb-2">
            {rowsArray.map((rowSeats, rIdx) => (
              <div key={rIdx} className="flex items-center gap-2 sm:gap-3">
                <span className="w-6 shrink-0 text-center font-mono text-xs font-bold text-slate-400">
                  {rowLabel(rIdx)}
                </span>
                <div
                  className="flex-1 grid gap-1.5 sm:gap-2"
                  style={{
                    gridTemplateColumns: `repeat(${layout.cols}, minmax(0, 1fr))`,
                  }}
                >
                  {rowSeats.map((id, cIdx) => {
                    const index = rIdx * layout.cols + cIdx;
                    const isDropTarget = arranging && dragOverIndex === index;

                    if (!id) {
                      return arranging ? (
                        <button
                          key={`empty-${index}`}
                          type="button"
                          onClick={() => handleSeatClick(index)}
                          onDragOver={(e) => {
                            if (draggedId !== null) e.preventDefault();
                            setDragOverIndex(index);
                          }}
                          onDragLeave={() => setDragOverIndex(null)}
                          onDrop={(e) => {
                            e.preventDefault();
                            setDragOverIndex(null);
                            if (draggedId !== null) placePC(draggedId, index);
                            setDraggedId(null);
                          }}
                          className={`min-h-[48px] sm:min-h-[54px] rounded-lg border border-dashed text-xs font-mono transition-all flex items-center justify-center ${
                            isDropTarget
                              ? 'border-[#F84464] bg-[#FFF0F3] text-[#F84464] scale-[1.03]'
                              : 'border-slate-300 bg-slate-50 text-slate-400 hover:border-[#F84464] hover:text-[#F84464]'
                          }`}
                          title="Empty seat (click or drop PC here)"
                        >
                          +
                        </button>
                      ) : (
                        <div key={`spacer-${index}`} className="min-h-[48px] sm:min-h-[54px]" />
                      );
                    }

                    const entry = records[id];
                    const state = entry?.status || 'ok';
                    const style = STATUS_STYLES[state];
                    const dimmed =
                      !arranging &&
                      ((filter && state !== filter) || !matchesSearch(id));
                    const isPicked = arranging && picked === id;

                    return (
                      <button
                        key={id}
                        type="button"
                        disabled={dimmed}
                        draggable={arranging}
                        onDragStart={(e) => {
                          setDraggedId(id);
                          e.dataTransfer.setData('text/plain', pcName(id));
                          e.dataTransfer.effectAllowed = 'move';
                        }}
                        onDragEnd={() => {
                          setDraggedId(null);
                          setDragOverIndex(null);
                        }}
                        onDragOver={(e) => {
                          if (!arranging || draggedId === null) return;
                          e.preventDefault();
                          setDragOverIndex(index);
                        }}
                        onDragLeave={() => setDragOverIndex(null)}
                        onDrop={(e) => {
                          if (!arranging) return;
                          e.preventDefault();
                          setDragOverIndex(null);
                          if (draggedId !== null) placePC(draggedId, index);
                          setDraggedId(null);
                        }}
                        onClick={() => handleSeatClick(index)}
                        title={
                          entry?.issues?.length
                            ? `${pcName(id)}: ${entry.issues.join(', ')}`
                            : `${pcName(id)} · ${STATUS_LABELS[state]}`
                        }
                        className={`relative min-h-[48px] sm:min-h-[54px] rounded-lg border-2 px-1 py-1 flex flex-col items-center justify-center gap-0.5 transition-all duration-150 ${
                          style.card
                        } ${style.glow} ${
                          dimmed ? 'opacity-20 grayscale pointer-events-none' : ''
                        } ${arranging ? 'cursor-grab active:cursor-grabbing' : ''} ${
                          isPicked ? 'ring-2 ring-[#F84464] scale-[1.04]' : ''
                        } ${
                          isDropTarget
                            ? 'ring-2 ring-[#F84464] scale-[1.05]'
                            : ''
                        }`}
                      >
                        {arranging && (
                          <GripVertical className="w-3 h-3 opacity-50 absolute top-1 left-0.5" />
                        )}
                        <span className="font-mono font-bold text-[11px] sm:text-xs leading-none">
                          {dense ? String(id).padStart(2, '0') : pcName(id)}
                        </span>
                        {!dense && (
                          <span className="text-[9px] sm:text-[10px] font-medium opacity-85 truncate max-w-full">
                            {STATUS_LABELS[state]}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Unplaced PCs Tray */}
        {(arranging || unplacedIds.length > 0) && (
          <section
            onDragOver={(e) => {
              if (arranging && draggedId !== null) e.preventDefault();
            }}
            onDrop={(e) => {
              if (!arranging) return;
              e.preventDefault();
              if (draggedId !== null) placePC(draggedId, -1);
              setDraggedId(null);
            }}
            className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm space-y-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-[#1F2533]">Unplaced PCs Tray</h2>
                <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-[#F5F5FA] text-slate-600 border border-slate-200">
                  {unplacedIds.length}
                </span>
              </div>
              {arranging && picked !== null && placedSet.has(picked) && (
                <button
                  type="button"
                  onClick={() => placePC(picked, -1)}
                  className="px-3 py-1.5 rounded-lg bg-[#333545] hover:bg-[#1F2533] text-xs font-medium text-white flex items-center gap-1.5"
                >
                  <Undo2 className="w-3.5 h-3.5" />
                  Return {pcName(picked)} to tray
                </button>
              )}
            </div>

            {unplacedIds.length === 0 ? (
              <p className="text-xs text-slate-500">
                All 90 PCs are currently placed on the lab map. Drag any PC here to unplace it.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto pr-1">
                {unplacedIds.map((id) => {
                  const state = records[id]?.status || 'ok';
                  const style = STATUS_STYLES[state];
                  const isPicked = arranging && picked === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      draggable={arranging}
                      onDragStart={(e) => {
                        setDraggedId(id);
                        e.dataTransfer.setData('text/plain', pcName(id));
                        e.dataTransfer.effectAllowed = 'move';
                      }}
                      onDragEnd={() => setDraggedId(null)}
                      onClick={() =>
                        arranging
                          ? setPicked((prev) => (prev === id ? null : id))
                          : setEditingPcId(id)
                      }
                      className={`px-3 py-2 rounded-lg border-2 text-xs font-mono font-bold flex items-center gap-1.5 transition-all ${
                        style.card
                      } ${isPicked ? 'ring-2 ring-[#F84464]' : ''}`}
                    >
                      <Monitor className="w-3.5 h-3.5" />
                      {pcName(id)}
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        )}
      </main>

      <EditorModal
        pcId={editingPcId}
        entry={editingPcId ? records[editingPcId] : null}
        onClose={() => setEditingPcId(null)}
        onSave={handleSavePc}
      />

      {toast && (
        <div className="fixed bottom-5 right-5 z-50 px-4 py-2.5 rounded-xl bg-[#333545] text-white text-sm font-medium shadow-xl">
          {toast}
        </div>
      )}
    </div>
  );
}
