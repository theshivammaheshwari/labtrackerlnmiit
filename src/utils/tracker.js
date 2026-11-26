import * as XLSX from 'xlsx';

export const STORAGE_KEY = 'lab-pc-tracker-v1';
export const DEFAULT_TOTAL_PCS = 90;

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

export const defaultLayout = (totalPcs = DEFAULT_TOTAL_PCS) => {
  const cols = totalPcs <= 20 ? Math.min(totalPcs, 5) : 10;
  const rows = Math.max(1, Math.ceil(totalPcs / cols));
  const seats = Array.from({ length: rows * cols }, (_, index) =>
    index < totalPcs ? index + 1 : null
  );
  return { rows, cols, seats };
};

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

export function validateRecords(data, totalPcs = DEFAULT_TOTAL_PCS) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('Invalid backup records');
  }
  for (const [id, entry] of Object.entries(data)) {
    if (
      !/^[1-9]\d*$/.test(id) ||
      Number(id) > totalPcs ||
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

export function decodeTrackerData(data, totalPcs = DEFAULT_TOTAL_PCS) {
  if (![2, 3].includes(data?.version)) {
    return {
      records: validateRecords(data || {}, totalPcs),
      layout: defaultLayout(totalPcs),
      legacy: true,
    };
  }
  const { rows, cols, seats } = data.layout || {};
  const nonNullSeats = Array.isArray(seats) ? seats.filter((n) => n !== null) : [];
  if (
    !validDimensions(rows, cols) ||
    !Array.isArray(seats) ||
    seats.length !== rows * cols ||
    seats.some((n) => n !== null && (!Number.isInteger(n) || n < 1 || n > totalPcs)) ||
    new Set(nonNullSeats).size !== nonNullSeats.length
  ) {
    throw new Error('Invalid layout');
  }
  return {
    records: validateRecords(data.records || {}, totalPcs),
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

export function buildCsv(records, totalPcs = DEFAULT_TOTAL_PCS) {
  const csvCell = (value) => {
    const text = String(value);
    return `"${/^\s*[=+@-]/.test(text) ? "'" : ''}${text.replaceAll('"', '""')}"`;
  };
  const lines = [['PC', 'Status', 'Issues', 'Notes', 'Updated']];
  for (let id = 1; id <= totalPcs; id++) {
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

export function buildMaintenanceLogCsv(historyMap = {}, totalPcs = DEFAULT_TOTAL_PCS) {
  const csvCell = (value) => {
    const text = String(value ?? '');
    return `"${/^\s*[=+@-]/.test(text) ? "'" : ''}${text.replaceAll('"', '""')}"`;
  };

  const allEntries = [];
  for (let id = 1; id <= totalPcs; id++) {
    const logs = Array.isArray(historyMap[id]) ? historyMap[id] : [];
    for (const log of logs) {
      allEntries.push({ pcId: id, ...log });
    }
  }

  // Sort chronologically from start (oldest) to end (latest)
  allEntries.sort((a, b) => Date.parse(a.timestamp || 0) - Date.parse(b.timestamp || 0));

  if (allEntries.length === 0) return null;

  const lines = [['Date & Time', 'PC', 'Status', 'Issues', 'Notes', 'Person Name', 'Department']];
  for (const item of allEntries) {
    lines.push([
      item.timestamp ? new Date(item.timestamp).toLocaleString() : '',
      pcName(item.pcId),
      STATUS_LABELS[item.status] || item.status || '',
      Array.isArray(item.issues) ? item.issues.join(', ') : '',
      item.notes || '',
      item.personName || item.by || '',
      item.department || '',
    ]);
  }
  return '\uFEFF' + lines.map((line) => line.map(csvCell).join(',')).join('\r\n');
}

export function buildAssetTemplateCsv(totalPcs = DEFAULT_TOTAL_PCS) {
  const lines = [
    ['PC', 'IP_Address', 'OS', 'Asset_Code', 'CPU_Model', 'CPU_Serial_No', 'TFT_Model', 'TFT_Serial_No'],
    ['PC 01', '172.16.1.101', 'Dual Boot (Windows / Ubuntu)', 'LNMIIT-CSE-001', 'HP ProDesk 400 G7', 'CPU-SN-12345', 'HP P22v G4', 'TFT-SN-67890'],
    ['PC 02', '172.16.1.102', 'Ubuntu', 'LNMIIT-CSE-002', 'HP ProDesk 400 G7', 'CPU-SN-12346', 'HP P22v G4', 'TFT-SN-67891'],
  ];
  return '\uFEFF' + lines.map((l) => l.map((v) => `"${v}"`).join(',')).join('\r\n');
}

export function parseAssetExcel(arrayBuffer, totalPcs = DEFAULT_TOTAL_PCS) {
  const wb = XLSX.read(arrayBuffer, { type: 'array' });
  const firstSheet = wb.Sheets[wb.SheetNames[0]];
  if (!firstSheet) throw new Error('Empty workbook');
  const rows = XLSX.utils.sheet_to_json(firstSheet, { defval: '' });
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error('No rows found in Excel');
  }

  const normalizeKey = (k) => String(k).toLowerCase().replace(/[^a-z0-9]/g, '');
  const nextAssets = {};
  let matchedCount = 0;

  for (const row of rows) {
    const mapped = {};
    for (const [k, v] of Object.entries(row)) {
      mapped[normalizeKey(k)] = String(v ?? '').trim();
    }

    const rawPc = mapped.pc || mapped.pcno || mapped.pcnumber || mapped.computer || mapped.id || '';
    const pcMatch = rawPc.match(/\d+/);
    if (!pcMatch) continue;
    const pcId = Number(pcMatch[0]);
    if (!Number.isInteger(pcId) || pcId < 1 || pcId > totalPcs) continue;

    const ip = mapped.ipaddress || mapped.ip || '';
    const os = mapped.os || mapped.operatingsystem || '';
    const assetCode = mapped.assetcode || mapped.asset || mapped.assetid || '';
    const cpuModel = mapped.cpumodel || mapped.cpu || '';
    const cpuSerialNo =
      mapped.cpuserialno ||
      mapped.cpuserial ||
      mapped.serialno ||
      mapped.serialnumber ||
      mapped.serial ||
      mapped.sn ||
      '';
    const tftModel = mapped.tftmodel || mapped.monitormodel || mapped.tft || '';
    const tftSerialNo =
      mapped.tftserialno ||
      mapped.tftserial ||
      mapped.monitorserialno ||
      mapped.monitorserial ||
      '';

    nextAssets[pcId] = {
      ip,
      os,
      assetCode,
      cpuModel,
      cpuSerialNo,
      tftModel,
      tftSerialNo,
    };
    matchedCount++;
  }

  if (matchedCount === 0) {
    throw new Error('No valid PC rows found (need a PC column like PC 01 or 1)');
  }
  return { assets: nextAssets, count: matchedCount };
}
