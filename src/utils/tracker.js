export const STORAGE_KEY = 'lab-pc-tracker-v1';
export const TOTAL_PCS = 90;

export const CATEGORIES = [
  'Mouse',
  'Keyboard',
  'IP missing',
  'Network',
  'Monitor',
  'Power',
  'Software',
  'Other',
];

export const STATUS_LABELS = {
  ok: 'Healthy',
  open: 'Open',
  progress: 'In Progress',
  resolved: 'Resolved',
};

export const STATUS_STYLES = {
  ok: {
    card: 'bg-slate-900/60 border-slate-700/60 hover:border-sky-400/50 hover:bg-slate-800/80 text-slate-200',
    badge: 'bg-slate-800/90 text-slate-300 border-slate-700',
    dot: 'bg-emerald-400',
    glow: '',
  },
  open: {
    card: 'bg-rose-950/45 border-rose-500/50 hover:border-rose-400 hover:bg-rose-950/65 text-rose-100 shadow-[0_0_20px_-6px_rgba(244,63,94,0.45)]',
    badge: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
    dot: 'bg-rose-400 animate-pulse',
    glow: 'ring-1 ring-rose-500/30',
  },
  progress: {
    card: 'bg-amber-950/40 border-amber-500/50 hover:border-amber-400 hover:bg-amber-950/60 text-amber-100 shadow-[0_0_20px_-6px_rgba(245,158,11,0.4)]',
    badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    dot: 'bg-amber-400',
    glow: 'ring-1 ring-amber-500/30',
  },
  resolved: {
    card: 'bg-emerald-950/40 border-emerald-500/45 hover:border-emerald-400 hover:bg-emerald-950/60 text-emerald-100 shadow-[0_0_18px_-6px_rgba(16,185,129,0.35)]',
    badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    dot: 'bg-emerald-400',
    glow: 'ring-1 ring-emerald-500/25',
  },
};

export const defaultLayout = () => ({
  rows: 9,
  cols: 10,
  seats: Array.from({ length: TOTAL_PCS }, (_, index) => index + 1),
});

export function validDimensions(rows, cols) {
  return (
    Number.isInteger(rows) &&
    rows >= 1 &&
    rows <= 30 &&
    Number.isInteger(cols) &&
    cols >= 1 &&
    cols <= 60
  );
}

export function validateRecords(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('Invalid backup records');
  }
  for (const [id, entry] of Object.entries(data)) {
    if (
      !/^[1-9]\d?$/.test(id) ||
      Number(id) > TOTAL_PCS ||
      !entry ||
      !Object.hasOwn(STATUS_LABELS, entry.status) ||
      !Array.isArray(entry.issues) ||
      !entry.issues.every((issue) => CATEGORIES.includes(issue)) ||
      typeof entry.notes !== 'string' ||
      entry.notes.length > 3000 ||
      typeof entry.updated !== 'string' ||
      Number.isNaN(Date.parse(entry.updated))
    ) {
      throw new Error('Invalid backup entry');
    }
  }
  return data;
}

export function decodeTrackerData(data) {
  if (![2, 3].includes(data?.version)) {
    return {
      records: validateRecords(data || {}),
      layout: defaultLayout(),
      legacy: true,
    };
  }
  const { rows, cols, seats } = data.layout || {};
  const nonNullSeats = Array.isArray(seats) ? seats.filter((n) => n !== null) : [];
  if (
    !validDimensions(rows, cols) ||
    !Array.isArray(seats) ||
    seats.length !== rows * cols ||
    seats.some((n) => n !== null && (!Number.isInteger(n) || n < 1 || n > TOTAL_PCS)) ||
    new Set(nonNullSeats).size !== nonNullSeats.length
  ) {
    throw new Error('Invalid layout');
  }
  return {
    records: validateRecords(data.records || {}),
    layout: { rows, cols, seats },
    legacy: false,
  };
}

export const pcName = (id) => `PC ${String(id).padStart(2, '0')}`;

export function downloadFile(name, type, text) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function buildCsv(records) {
  const csvCell = (value) => {
    const text = String(value);
    return `"${/^\s*[=+@-]/.test(text) ? "'" : ''}${text.replaceAll('"', '""')}"`;
  };
  const lines = [['PC', 'Status', 'Issues', 'Notes', 'Updated']];
  for (let id = 1; id <= TOTAL_PCS; id++) {
    const entry = records[id];
    lines.push([
      pcName(id),
      STATUS_LABELS[entry?.status || 'ok'],
      entry?.issues.join(', ') || '',
      entry?.notes || '',
      entry?.updated || '',
    ]);
  }
  return '\uFEFF' + lines.map((line) => line.map(csvCell).join(',')).join('\r\n');
}
