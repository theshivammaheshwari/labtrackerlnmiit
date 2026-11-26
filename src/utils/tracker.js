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
    card: 'bg-white border-[#1EA83C] text-[#1EA83C] hover:bg-[#1EA83C] hover:text-white shadow-sm',
    badge: 'bg-emerald-50 text-[#1EA83C] border-[#1EA83C]/40',
    dot: 'bg-[#1EA83C]',
    glow: '',
  },
  open: {
    card: 'bg-[#FFF0F3] border-[#F84464] text-[#D91B42] hover:bg-[#F84464] hover:text-white shadow-sm',
    badge: 'bg-[#FFF0F3] text-[#D91B42] border-[#F84464]/40',
    dot: 'bg-[#F84464] animate-pulse',
    glow: 'ring-1 ring-[#F84464]/25',
  },
  progress: {
    card: 'bg-amber-50 border-amber-500 text-amber-700 hover:bg-amber-500 hover:text-white shadow-sm',
    badge: 'bg-amber-50 text-amber-700 border-amber-400',
    dot: 'bg-amber-500',
    glow: 'ring-1 ring-amber-400/30',
  },
  resolved: {
    card: 'bg-sky-50 border-sky-500 text-sky-700 hover:bg-sky-500 hover:text-white shadow-sm',
    badge: 'bg-sky-50 text-sky-700 border-sky-400',
    dot: 'bg-sky-500',
    glow: 'ring-1 ring-sky-400/25',
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
