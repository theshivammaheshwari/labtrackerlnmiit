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
  Plus,
  Pencil,
  Trash2,
  MapPin,
  UserCheck,
  Phone,
  LogIn,
  LogOut,
  Building2,
  StickyNote,
  Lock,
  LayoutGrid,
  List,
} from 'lucide-react';
import {
  auth,
  db,
  labsCollection,
  googleProvider,
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from './firebase';
import {
  DEFAULT_TOTAL_PCS,
  STATUS_LABELS,
  STATUS_STYLES,
  buildCsv,
  buildMaintenanceLogCsv,
  buildAssetTemplateCsv,
  parseAssetExcel,
  decodeTrackerData,
  defaultLayout,
  downloadFile,
  pcName,
  validDimensions,
} from './utils/tracker';
import StatsBar from './components/StatsBar';
import LayoutToolbar from './components/LayoutToolbar';
import EditorModal from './components/EditorModal';
import LabProfileModal from './components/LabProfileModal';
import PrivateNotesModal from './components/PrivateNotesModal';

const ALLOWED_DOMAIN = '@lnmiit.ac.in';
const SELECTED_LAB_KEY = 'lab-tracker-selected-lab';

function isAllowedEmail(email) {
  return typeof email === 'string' && email.toLowerCase().endsWith(ALLOWED_DOMAIN);
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
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [labs, setLabs] = useState([]);
  const [selectedLabId, setSelectedLabId] = useState(
    () => localStorage.getItem(SELECTED_LAB_KEY) || ''
  );
  const [cloudState, setCloudState] = useState({
    status: 'connecting',
    text: 'Connecting to Firebase...',
  });
  const [toast, setToast] = useState('');
  const [filter, setFilter] = useState('');
  const [search, setSearch] = useState('');
  const [arranging, setArranging] = useState(false);
  const [viewMode, setViewMode] = useState('map'); // 'map' | 'list'
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkSelected, setBulkSelected] = useState([]);
  const [picked, setPicked] = useState(null);
  const [draggedId, setDraggedId] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [editingPcId, setEditingPcId] = useState(null);
  const [profileModal, setProfileModal] = useState({ open: false, mode: 'create' });
  const [privateNotes, setPrivateNotes] = useState([]);
  const [notesModalOpen, setNotesModalOpen] = useState(false);
  const fileInputRef = useRef(null);
  const assetInputRef = useRef(null);

  const showToast = (msg) => setToast(msg);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(''), 3600);
    return () => clearTimeout(timer);
  }, [toast]);

  // Listen to Firebase Auth and enforce @lnmiit.ac.in domain
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser && !isAllowedEmail(currentUser.email)) {
        await signOut(auth);
        setUser(null);
        setAuthLoading(false);
        showToast('Only @lnmiit.ac.in Google accounts are allowed.');
        return;
      }
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsub();
  }, []);

  // Listen to all labs in Firestore (publicly readable)
  useEffect(() => {
    const q = query(labsCollection, orderBy('name'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setLabs(list);
        setCloudState({ status: 'synced', text: 'Cloud Synced · Live' });
        setSelectedLabId((prev) => {
          if (prev && list.some((l) => l.id === prev)) return prev;
          return list[0]?.id || '';
        });
      },
      (err) => {
        console.error('Firestore labs error:', err);
        setCloudState({
          status: 'error',
          text:
            err?.code === 'permission-denied'
              ? 'Firestore permission denied (check Rules)'
              : 'Offline · Could not load labs',
        });
      }
    );
    return () => unsub();
  }, []);

  useEffect(() => {
    if (selectedLabId) {
      localStorage.setItem(SELECTED_LAB_KEY, selectedLabId);
    }
    setArranging(false);
    setBulkMode(false);
    setBulkSelected([]);
    setPicked(null);
  }, [selectedLabId]);

  const selectedLab = useMemo(
    () => labs.find((l) => l.id === selectedLabId) || null,
    [labs, selectedLabId]
  );

  const totalPcs = selectedLab?.totalPcs || DEFAULT_TOTAL_PCS;
  const canEdit = Boolean(user && selectedLab && user.uid === selectedLab.ownerUid);
  const historyMap = selectedLab?.history || {};
  const assetsMap = selectedLab?.assets || {};

  // Private In-Charge Notes (ONLY fetched when user is the lab owner)
  useEffect(() => {
    if (!canEdit || !selectedLab?.id) {
      setPrivateNotes([]);
      setNotesModalOpen(false);
      return;
    }
    const notesRef = collection(db, 'labs', selectedLab.id, 'privateNotes');
    const q = query(notesRef, orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setPrivateNotes(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      },
      (err) => {
        console.error('Private notes listener error:', err);
      }
    );
    return () => unsub();
  }, [canEdit, selectedLab?.id]);

  const { records, layout } = useMemo(() => {
    if (!selectedLab) {
      return { records: {}, layout: defaultLayout(DEFAULT_TOTAL_PCS) };
    }
    try {
      const decoded = decodeTrackerData(
        { version: 3, records: selectedLab.records || {}, layout: selectedLab.layout },
        totalPcs
      );
      return { records: decoded.records, layout: decoded.layout };
    } catch {
      return { records: {}, layout: defaultLayout(totalPcs) };
    }
  }, [selectedLab, totalPcs]);

  const handleGoogleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (!isAllowedEmail(result.user?.email)) {
        await signOut(auth);
        showToast('Access denied: Only @lnmiit.ac.in Google accounts are allowed.');
        return;
      }
      showToast(`Signed in as ${result.user.displayName || result.user.email}`);
    } catch (err) {
      if (err?.code !== 'auth/popup-closed-by-user') {
        console.error('Google Sign-In failed:', err);
        showToast('Google Sign-In failed. Enable Google Auth in Firebase Console.');
      }
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setArranging(false);
    setPicked(null);
    showToast('Signed out.');
  };

  const persistLabData = async (
    nextRecords,
    nextLayout = layout,
    nextHistory = historyMap,
    nextAssets = assetsMap
  ) => {
    if (!selectedLab || !canEdit) return;
    setCloudState({ status: 'saving', text: 'Saving to Firebase...' });
    try {
      await updateDoc(doc(db, 'labs', selectedLab.id), {
        version: 3,
        records: nextRecords,
        layout: nextLayout,
        history: nextHistory,
        assets: nextAssets,
        updatedAt: new Date().toISOString(),
      });
      setCloudState({ status: 'synced', text: 'Cloud Synced · Live' });
    } catch (err) {
      console.error('Firebase save error:', err);
      setCloudState({
        status: 'error',
        text:
          err?.code === 'permission-denied'
            ? 'Permission denied (owner only)'
            : 'Cloud save failed',
      });
      showToast('Could not save changes to Firebase.');
    }
  };

  const handleSaveLabProfile = async (formValues) => {
    if (!user) return;
    try {
      if (profileModal.mode === 'edit' && selectedLab && canEdit) {
        await updateDoc(doc(db, 'labs', selectedLab.id), {
          name: formValues.name,
          location: formValues.location,
          ownerName: formValues.ownerName,
          ownerPhone: formValues.ownerPhone,
          updatedAt: new Date().toISOString(),
        });
        showToast('Lab profile updated.');
      } else {
        const now = new Date().toISOString();
        const created = await addDoc(labsCollection, {
          name: formValues.name,
          location: formValues.location,
          ownerName: formValues.ownerName,
          ownerPhone: formValues.ownerPhone,
          ownerEmail: user.email,
          ownerUid: user.uid,
          totalPcs: formValues.totalPcs,
          version: 3,
          records: {},
          layout: defaultLayout(formValues.totalPcs),
          createdAt: now,
          updatedAt: now,
        });
        setSelectedLabId(created.id);
        showToast(`Lab "${formValues.name}" created!`);
      }
      setProfileModal({ open: false, mode: 'create' });
    } catch (err) {
      console.error('Save lab profile error:', err);
      showToast('Failed to save lab. Check Firestore rules.');
    }
  };

  const handleDeleteLab = async () => {
    if (!selectedLab || !canEdit) return;
    if (
      !window.confirm(
        `Delete "${selectedLab.name}" permanently? This cannot be undone.`
      )
    ) {
      return;
    }
    try {
      await deleteDoc(doc(db, 'labs', selectedLab.id));
      showToast(`Lab "${selectedLab.name}" deleted.`);
    } catch (err) {
      console.error('Delete lab error:', err);
      showToast('Failed to delete lab.');
    }
  };

  const placedSet = useMemo(
    () => new Set(layout.seats.filter((id) => id !== null)),
    [layout.seats]
  );

  const unplacedIds = useMemo(() => {
    const all = [];
    for (let id = 1; id <= totalPcs; id++) {
      if (!placedSet.has(id)) all.push(id);
    }
    return all;
  }, [placedSet, totalPcs]);

  const counts = useMemo(() => {
    const c = { ok: 0, open: 0, progress: 0, resolved: 0 };
    for (let id = 1; id <= totalPcs; id++) {
      const st = records[id]?.status || 'ok';
      c[st] = (c[st] || 0) + 1;
    }
    return c;
  }, [records, totalPcs]);

  const matchesSearch = (id) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    const entry = records[id];
    const asset = assetsMap[id];
    return (
      pcName(id).toLowerCase().includes(q) ||
      String(id).includes(q) ||
      (entry?.issues || []).some((iss) => iss.toLowerCase().includes(q)) ||
      (entry?.notes || '').toLowerCase().includes(q) ||
      (asset?.ip || '').toLowerCase().includes(q) ||
      (asset?.os || '').toLowerCase().includes(q) ||
      (asset?.assetCode || '').toLowerCase().includes(q) ||
      (asset?.cpuModel || '').toLowerCase().includes(q) ||
      (asset?.cpuSerialNo || '').toLowerCase().includes(q) ||
      (asset?.tftModel || '').toLowerCase().includes(q) ||
      (asset?.tftSerialNo || '').toLowerCase().includes(q) ||
      (asset?.serialNo || '').toLowerCase().includes(q)
    );
  };

  const placePC = (id, targetIndex) => {
    if (!id || !canEdit) return;
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
    persistLabData(records, { ...layout, seats });
    showToast(
      targetIndex >= 0 ? `${pcName(id)} placed.` : `${pcName(id)} moved to tray.`
    );
  };

  const toggleBulkPc = (id) => {
    setBulkSelected((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const placeBulkFromIndex = (startIndex) => {
    if (!canEdit || bulkSelected.length === 0) return;
    const seats = [...layout.seats];
    const movingSet = new Set(bulkSelected);
    // Clear selected PCs from their previous positions
    for (let i = 0; i < seats.length; i++) {
      if (seats[i] !== null && movingSet.has(seats[i])) {
        seats[i] = null;
      }
    }
    let placedCount = 0;
    for (let i = startIndex; i < seats.length && placedCount < bulkSelected.length; i++) {
      if (seats[i] === null) {
        seats[i] = bulkSelected[placedCount];
        placedCount++;
      }
    }
    if (placedCount === 0) {
      showToast('No empty seats available from that position.');
      return;
    }
    setBulkSelected([]);
    persistLabData(records, { ...layout, seats });
    showToast(
      placedCount < bulkSelected.length
        ? `Placed ${placedCount} PC(s). Remaining had no empty seats.`
        : `Placed ${placedCount} PC(s) in sequence!`
    );
  };

  const handleSelectAllTray = () => {
    setBulkSelected(unplacedIds);
  };

  const handleReturnSelectedToTray = () => {
    if (!canEdit || bulkSelected.length === 0) return;
    const selectedSet = new Set(bulkSelected);
    const seats = layout.seats.map((id) => (id !== null && selectedSet.has(id) ? null : id));
    const count = bulkSelected.length;
    setBulkSelected([]);
    persistLabData(records, { ...layout, seats });
    showToast(`Moved ${count} PC(s) to tray.`);
  };

  const handleAutoFillEmpty = () => {
    if (!canEdit || unplacedIds.length === 0) return;
    const seats = [...layout.seats];
    let idx = 0;
    for (let i = 0; i < seats.length && idx < unplacedIds.length; i++) {
      if (seats[i] === null) {
        seats[i] = unplacedIds[idx++];
      }
    }
    if (idx === 0) {
      showToast('No empty seats available. Increase Rows/Cols first.');
      return;
    }
    setBulkSelected([]);
    persistLabData(records, { ...layout, seats });
    showToast(`Auto-placed ${idx} PC(s) into empty seats!`);
  };

  const handleAddPrivateNote = async ({ title, body }) => {
    if (!canEdit || !selectedLab?.id) return;
    try {
      await addDoc(collection(db, 'labs', selectedLab.id, 'privateNotes'), {
        title,
        body,
        done: false,
        createdAt: new Date().toISOString(),
      });
      showToast('Private note saved.');
    } catch (err) {
      console.error('Add private note error:', err);
      showToast('Could not save private note. Check Firestore rules.');
    }
  };

  const handleTogglePrivateNote = async (note) => {
    if (!canEdit || !selectedLab?.id) return;
    try {
      await updateDoc(doc(db, 'labs', selectedLab.id, 'privateNotes', note.id), {
        done: !note.done,
      });
    } catch (err) {
      console.error('Toggle private note error:', err);
    }
  };

  const handleDeletePrivateNote = async (noteId) => {
    if (!canEdit || !selectedLab?.id) return;
    try {
      await deleteDoc(doc(db, 'labs', selectedLab.id, 'privateNotes', noteId));
      showToast('Note deleted.');
    } catch (err) {
      console.error('Delete private note error:', err);
    }
  };

  const handleSeatClick = (index) => {
    if (!arranging || !canEdit) {
      const id = layout.seats[index];
      if (id) setEditingPcId(id);
      return;
    }
    if (bulkMode) {
      const id = layout.seats[index];
      if (id) {
        toggleBulkPc(id);
      } else if (bulkSelected.length > 0) {
        placeBulkFromIndex(index);
      } else {
        showToast('Select PCs first, then click an empty seat (+) to place them.');
      }
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
    if (!canEdit) return;
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
    persistLabData(records, { rows, cols, seats });
    showToast(
      displaced
        ? `Resized to ${rows}×${cols}. ${displaced} PC(s) moved to tray.`
        : `Layout resized to ${rows}×${cols}.`
    );
  };

  const handleBlankLayout = () => {
    if (!canEdit) return;
    if (!window.confirm('Move all PCs to the tray? Issue records will be kept.')) return;
    const rows = Math.max(layout.rows, 9);
    const cols = Math.max(layout.cols, 12);
    setPicked(null);
    persistLabData(records, { rows, cols, seats: Array(rows * cols).fill(null) });
    showToast('Canvas cleared. Drag PCs from the tray.');
  };

  const handleResetLayout = () => {
    if (!canEdit) return;
    if (!window.confirm('Reset PC positions to default? Issue records will be kept.')) return;
    setPicked(null);
    persistLabData(records, defaultLayout(totalPcs));
    showToast('Default layout restored.');
  };

  const handleSavePc = (pcId, { status, issues, notes }) => {
    if (!canEdit) return;
    const now = new Date().toISOString();
    const next = { ...records };
    if (status === 'ok') {
      delete next[pcId];
    } else {
      next[pcId] = {
        status,
        issues,
        notes,
        updated: now,
      };
    }
    const prevLogs = Array.isArray(historyMap[pcId]) ? historyMap[pcId] : [];
    const newLog = {
      status,
      issues: status === 'ok' ? [] : issues,
      notes,
      timestamp: now,
      by: user?.displayName || user?.email || 'Lab In-Charge',
    };
    const nextHistory = {
      ...historyMap,
      [pcId]: [newLog, ...prevLogs].slice(0, 50),
    };
    persistLabData(next, layout, nextHistory);
    setEditingPcId(null);
    showToast(`${pcName(pcId)} updated.`);
  };

  const handleSaveAsset = (pcId, assetObj) => {
    if (!canEdit) return;
    const nextAssets = { ...assetsMap, [pcId]: assetObj };
    persistLabData(records, layout, historyMap, nextAssets);
    showToast(`${pcName(pcId)} configuration saved.`);
  };

  const handleAssetExcelUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !canEdit) return;
    try {
      const buf = await file.arrayBuffer();
      const { assets: parsed, count } = parseAssetExcel(buf, totalPcs);
      const nextAssets = { ...assetsMap, ...parsed };
      await persistLabData(records, layout, historyMap, nextAssets);
      showToast(`Imported PC Configuration for ${count} PC(s)!`);
    } catch (err) {
      console.error('Asset Excel upload error:', err);
      showToast(err?.message || 'Could not parse Excel file.');
    }
  };

  const handleRestore = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !canEdit) return;
    try {
      if (file.size > 1_500_000) throw new Error('Too large');
      const decoded = decodeTrackerData(JSON.parse(await file.text()), totalPcs);
      if (
        window.confirm(
          'Restore this backup? It replaces current PC records and layout for this lab.'
        )
      ) {
        setPicked(null);
        persistLabData(decoded.records, decoded.legacy ? layout : decoded.layout);
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
      {/* BookMyShow-style Top Navbar with Top-Right Google Sign-In */}
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
                Public Lab Status · @lnmiit.ac.in Staff Management
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Cloud Status Pill */}
            <div
              className={`hidden md:flex px-3 py-1.5 rounded-full text-xs font-medium border items-center gap-1.5 ${
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

            {selectedLab && (
              <>
                <button
                  type="button"
                  onClick={() =>
                    downloadFile(
                      `${selectedLab.name.replace(/\s+/g, '-').toLowerCase()}-backup.json`,
                      'application/json',
                      JSON.stringify({ version: 3, records, layout }, null, 2)
                    )
                  }
                  className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-medium text-white flex items-center gap-1.5 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  JSON
                </button>

                <button
                  type="button"
                  onClick={() =>
                    downloadFile(
                      `${selectedLab.name.replace(/\s+/g, '-').toLowerCase()}-report.csv`,
                      'text/csv;charset=utf-8',
                      buildCsv(records, totalPcs)
                    )
                  }
                  className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-medium text-white flex items-center gap-1.5 transition-colors"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  CSV
                </button>

                {canEdit && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        const csv = buildMaintenanceLogCsv(historyMap, totalPcs);
                        if (!csv) {
                          showToast('No maintenance log entries recorded yet.');
                          return;
                        }
                        downloadFile(
                          `${selectedLab.name.replace(/\s+/g, '-').toLowerCase()}-maintenance-log.csv`,
                          'text/csv;charset=utf-8',
                          csv
                        );
                        showToast('Maintenance log downloaded for Excel.');
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/40 text-xs font-semibold text-emerald-200 flex items-center gap-1.5 transition-colors"
                      title="Download full Maintenance Log (Start to End) in Excel CSV"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      Log (Excel)
                    </button>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-medium text-white flex items-center gap-1.5 transition-colors"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      Restore
                    </button>
                  </>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={handleRestore}
                />
              </>
            )}

            {/* BookMyShow-style Top-Right Google Sign-In */}
            {authLoading ? (
              <div className="px-3 py-1.5 rounded-lg bg-white/10 text-xs text-slate-300">
                Checking auth...
              </div>
            ) : user ? (
              <div className="flex items-center gap-2 pl-2 border-l border-white/15">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'User'}
                    className="w-7 h-7 rounded-full border border-white/30"
                  />
                ) : null}
                <div className="hidden sm:block text-left leading-tight">
                  <div className="text-xs font-semibold text-white">
                    {user.displayName || 'LNMIIT User'}
                  </div>
                  <div className="text-[10px] text-slate-300">{user.email}</div>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-[#F84464] text-xs font-semibold text-white flex items-center gap-1.5 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sign out
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleGoogleLogin}
                className="px-4 py-1.5 rounded-lg bg-[#F84464] hover:bg-[#E03554] text-xs font-semibold text-white shadow-sm flex items-center gap-1.5 transition-colors"
              >
                <LogIn className="w-3.5 h-3.5" />
                Sign in (@lnmiit.ac.in)
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-[1600px] w-full mx-auto px-4 sm:px-6 py-5 space-y-4">
        {/* Lab Selector & Lab Profile Card */}
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[260px]">
            <div className="p-2.5 rounded-lg bg-[#FFF0F3] text-[#F84464]">
              <Building2 className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-[220px] max-w-md">
              <label
                htmlFor="lab-select"
                className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1"
              >
                Select Lab to View
              </label>
              <select
                id="lab-select"
                value={selectedLabId}
                onChange={(e) => setSelectedLabId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-[#F5F5FA] px-3 py-2 text-sm font-semibold text-[#1F2533] focus:outline-none focus:ring-2 focus:ring-[#F84464]/40 focus:bg-white"
              >
                {labs.length === 0 ? (
                  <option value="">No labs available yet</option>
                ) : (
                  labs.map((lab) => (
                    <option key={lab.id} value={lab.id}>
                      {lab.name} — {lab.location}
                    </option>
                  ))
                )}
              </select>
            </div>

            {selectedLab && (
              <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-slate-600 pl-1">
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#F84464]" />
                  <strong className="text-[#1F2533]">{selectedLab.location}</strong>
                </span>
                <span className="flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-[#1EA83C]" />
                  <span>{selectedLab.ownerName}</span>
                </span>
                {selectedLab.ownerPhone && (
                  <a
                    href={`tel:${selectedLab.ownerPhone}`}
                    className="flex items-center gap-1.5 hover:text-[#F84464] font-medium"
                  >
                    <Phone className="w-3.5 h-3.5 text-sky-600" />
                    <span>{selectedLab.ownerPhone}</span>
                  </a>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {user ? (
              <button
                type="button"
                onClick={() => setProfileModal({ open: true, mode: 'create' })}
                className="px-3.5 py-2 rounded-lg bg-[#333545] hover:bg-[#1F2533] text-xs font-semibold text-white flex items-center gap-1.5 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Your Lab
              </button>
            ) : (
              <button
                type="button"
                onClick={handleGoogleLogin}
                className="px-3.5 py-2 rounded-lg border border-[#F84464] text-[#F84464] hover:bg-[#FFF0F3] text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Sign in to Add Lab
              </button>
            )}

            {canEdit && (
              <>
                <button
                  type="button"
                  onClick={() => assetInputRef.current?.click()}
                  className="px-3 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-xs font-semibold text-white flex items-center gap-1.5 shadow-sm"
                  title="Upload Excel (.xlsx/.xls/.csv) with PC, IP Address, OS, Asset Code, Serial No"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Upload Assets (Excel)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    downloadFile(
                      'pc-assets-template.csv',
                      'text/csv;charset=utf-8',
                      buildAssetTemplateCsv(totalPcs)
                    );
                    showToast('Sample Asset Excel/CSV template downloaded.');
                  }}
                  className="px-2.5 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-medium text-slate-600 flex items-center gap-1"
                  title="Download sample Excel/CSV template"
                >
                  <Download className="w-3.5 h-3.5" />
                  Template
                </button>
                <input
                  ref={assetInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={handleAssetExcelUpload}
                />
                <button
                  type="button"
                  onClick={() => setNotesModalOpen(true)}
                  className="px-3 py-2 rounded-lg bg-[#333545] hover:bg-[#1F2533] text-xs font-semibold text-white flex items-center gap-1.5 shadow-sm"
                  title="Private In-Charge Notes (Only visible to you)"
                >
                  <Lock className="w-3.5 h-3.5 text-emerald-300" />
                  <StickyNote className="w-3.5 h-3.5" />
                  Private Notes
                  {privateNotes.filter((n) => !n.done).length > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full bg-[#F84464] text-[10px] font-mono">
                      {privateNotes.filter((n) => !n.done).length}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setProfileModal({ open: true, mode: 'edit' })}
                  className="px-3 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-1.5"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Edit Profile
                </button>
                <button
                  type="button"
                  onClick={handleDeleteLab}
                  className="px-3 py-2 rounded-lg border border-rose-200 bg-[#FFF0F3] hover:bg-rose-100 text-xs font-semibold text-[#D91B42] flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </button>
              </>
            )}
          </div>
        </section>

        {!selectedLab ? (
          <section className="rounded-xl border border-slate-200 bg-white p-10 text-center shadow-sm space-y-3">
            <div className="mx-auto w-12 h-12 rounded-full bg-[#FFF0F3] text-[#F84464] flex items-center justify-center">
              <Building2 className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-[#1F2533]">No Labs Added Yet</h2>
            <p className="text-sm text-slate-500 max-w-md mx-auto">
              LNMIIT `@lnmiit.ac.in` account se Sign In karke apni pehli lab create karein. Uske baad koi bhi user aapki lab ka live status dekh sakta hai.
            </p>
            <button
              type="button"
              onClick={() =>
                user ? setProfileModal({ open: true, mode: 'create' }) : handleGoogleLogin()
              }
              className="px-5 py-2.5 rounded-lg bg-[#F84464] hover:bg-[#E03554] text-sm font-semibold text-white shadow-sm inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              {user ? 'Create First Lab' : 'Sign in with @lnmiit.ac.in'}
            </button>
          </section>
        ) : (
          <>
            <StatsBar
              counts={counts}
              totalPcs={totalPcs}
              filter={filter}
              onFilterChange={setFilter}
            />

            <LayoutToolbar
              canEdit={canEdit}
              arranging={arranging}
              onToggleArranging={() => {
                if (!canEdit) return;
                setArranging((v) => !v);
                setBulkMode(false);
                setBulkSelected([]);
                setPicked(null);
              }}
              bulkMode={bulkMode}
              onToggleBulkMode={() => {
                setBulkMode((v) => !v);
                setBulkSelected([]);
                setPicked(null);
              }}
              bulkCount={bulkSelected.length}
              unplacedCount={unplacedIds.length}
              onSelectAllTray={handleSelectAllTray}
              onClearBulk={() => setBulkSelected([])}
              onReturnSelectedToTray={handleReturnSelectedToTray}
              onAutoFillEmpty={handleAutoFillEmpty}
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
            <section className="rounded-xl border border-slate-200 bg-white p-3.5 sm:p-6 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-4 border-b border-slate-100">
                <div className="flex flex-wrap items-center gap-3 sm:gap-5 text-xs font-medium text-slate-600">
                  <span className="flex items-center gap-1.5">
                    <span className="w-3.5 h-3.5 rounded border-2 border-[#1EA83C] bg-white inline-block" />
                    Healthy
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3.5 h-3.5 rounded border-2 border-[#F84464] bg-[#FFF0F3] inline-block" />
                    Open
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3.5 h-3.5 rounded border-2 border-amber-500 bg-amber-50 inline-block" />
                    In Progress
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3.5 h-3.5 rounded border-2 border-sky-500 bg-sky-50 inline-block" />
                    Resolved
                  </span>
                </div>

                {!arranging && (
                  <div className="flex items-center gap-1 p-1 rounded-lg bg-[#F5F5FA] border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setViewMode('map')}
                      className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1 transition-all ${
                        viewMode === 'map'
                          ? 'bg-white text-[#F84464] shadow-sm'
                          : 'text-slate-600 hover:text-[#1F2533]'
                      }`}
                    >
                      <LayoutGrid className="w-3.5 h-3.5" />
                      Seat Map
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode('list')}
                      className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1 transition-all ${
                        viewMode === 'list'
                          ? 'bg-white text-[#F84464] shadow-sm'
                          : 'text-slate-600 hover:text-[#1F2533]'
                      }`}
                    >
                      <List className="w-3.5 h-3.5" />
                      Mobile List
                    </button>
                  </div>
                )}
              </div>

              {viewMode === 'list' && !arranging ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {Array.from({ length: totalPcs }, (_, i) => i + 1)
                    .filter((id) => {
                      const state = records[id]?.status || 'ok';
                      return (!filter || state === filter) && matchesSearch(id);
                    })
                    .map((id) => {
                      const entry = records[id];
                      const state = entry?.status || 'ok';
                      const style = STATUS_STYLES[state];
                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() => setEditingPcId(id)}
                          className="text-left rounded-xl border border-slate-200 bg-[#F5F5FA] hover:bg-white hover:border-[#F84464]/50 p-3 flex items-start justify-between gap-3 transition-all shadow-sm"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-sm text-[#1F2533]">
                                {pcName(id)}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${style.badge}`}
                              >
                                {STATUS_LABELS[state]}
                              </span>
                            </div>
                            {entry?.issues?.length > 0 && (
                              <p className="mt-1 text-xs font-medium text-[#D91B42] truncate">
                                {entry.issues.join(' · ')}
                              </p>
                            )}
                            {entry?.notes && (
                              <p className="mt-0.5 text-xs text-slate-500 line-clamp-1">
                                {entry.notes}
                              </p>
                            )}
                          </div>
                          <Monitor className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                        </button>
                      );
                    })}
                </div>
              ) : (
                <>
                  <div className="mb-4 flex flex-col items-center">
                    <div className="w-full max-w-md h-3 border-t-4 border-sky-300/80 rounded-t-[100%] shadow-[0_-6px_14px_-4px_rgba(56,189,248,0.35)]" />
                    <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400 text-center">
                      All eyes this way · Front of {selectedLab.name}
                    </span>
                  </div>

                  <div className="seat-map-wrap space-y-1.5 sm:space-y-2">
                    {rowsArray.map((rowSeats, rIdx) => (
                      <div
                        key={rIdx}
                        className="flex items-center gap-1.5 sm:gap-2.5"
                        style={{ '--cols': layout.cols }}
                      >
                        <span className="w-5 shrink-0 text-center font-mono text-[10px] sm:text-xs font-bold text-slate-500">
                          {rowLabel(rIdx)}
                        </span>
                        <div className="flex-1 seat-grid-row">
                      {rowSeats.map((id, cIdx) => {
                        const index = rIdx * layout.cols + cIdx;
                        const isDropTarget = canEdit && arranging && dragOverIndex === index;

                        if (!id) {
                          return canEdit && arranging ? (
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
                              className={`seat-tile border-dashed text-xs font-mono transition-all flex items-center justify-center ${
                                isDropTarget
                                  ? 'border-[#F84464] bg-[#FFF0F3] text-[#F84464] scale-[1.03]'
                                  : 'border-slate-300 bg-slate-50 text-slate-400 hover:border-[#F84464] hover:text-[#F84464]'
                              }`}
                              title="Empty seat (click or drop PC here)"
                            >
                              +
                            </button>
                          ) : (
                            <div key={`spacer-${index}`} className="seat-tile border-transparent" />
                          );
                        }

                        const entry = records[id];
                        const state = entry?.status || 'ok';
                        const style = STATUS_STYLES[state];
                        const dimmed =
                          !arranging &&
                          ((filter && state !== filter) || !matchesSearch(id));
                        const isPicked = canEdit && arranging && !bulkMode && picked === id;
                        const bulkOrder = canEdit && arranging && bulkMode ? bulkSelected.indexOf(id) : -1;

                        return (
                          <button
                            key={id}
                            type="button"
                            disabled={dimmed}
                            draggable={canEdit && arranging && !bulkMode}
                            onDragStart={(e) => {
                              if (!canEdit) return;
                              setDraggedId(id);
                              e.dataTransfer.setData('text/plain', pcName(id));
                              e.dataTransfer.effectAllowed = 'move';
                            }}
                            onDragEnd={() => {
                              setDraggedId(null);
                              setDragOverIndex(null);
                            }}
                            onDragOver={(e) => {
                              if (!canEdit || !arranging || draggedId === null) return;
                              e.preventDefault();
                              setDragOverIndex(index);
                            }}
                            onDragLeave={() => setDragOverIndex(null)}
                            onDrop={(e) => {
                              if (!canEdit || !arranging) return;
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
                            className={`seat-tile relative flex flex-col items-center justify-center gap-0.5 transition-all duration-150 overflow-hidden ${
                              style.card
                            } ${style.glow} ${
                              dimmed ? 'opacity-20 grayscale pointer-events-none' : ''
                            } ${canEdit && arranging && !bulkMode ? 'cursor-grab active:cursor-grabbing' : ''} ${
                              isPicked || bulkOrder >= 0 ? 'ring-2 ring-[#F84464] scale-[1.04]' : ''
                            } ${
                              isDropTarget
                                ? 'ring-2 ring-[#F84464] scale-[1.05]'
                                : ''
                            }`}
                          >
                            {canEdit && arranging && !bulkMode && (
                              <GripVertical className="w-3 h-3 opacity-50 absolute top-1 left-0.5 hidden sm:block" />
                            )}
                            {bulkOrder >= 0 && (
                              <span className="absolute -top-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-[#F84464] text-white text-[9px] sm:text-[10px] font-bold flex items-center justify-center shadow">
                                {bulkOrder + 1}
                              </span>
                            )}
                            <span className="seat-code font-mono font-bold">
                              <span className="sm:hidden">{String(id).padStart(2, '0')}</span>
                              <span className="hidden sm:inline">
                                {dense ? String(id).padStart(2, '0') : pcName(id)}
                              </span>
                            </span>
                            {!dense && (
                              <span className="seat-status hidden sm:block font-medium opacity-85 truncate max-w-full">
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
                </>
              )}
            </section>

            {/* Unplaced PCs Tray */}
            {((canEdit && arranging) || unplacedIds.length > 0) && (
              <section
                onDragOver={(e) => {
                  if (canEdit && arranging && draggedId !== null) e.preventDefault();
                }}
                onDrop={(e) => {
                  if (!canEdit || !arranging) return;
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
                  {canEdit && arranging && picked !== null && placedSet.has(picked) && (
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
                    All {totalPcs} PCs are placed on the lab map. Drag any PC here to unplace it.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto pr-1">
                    {unplacedIds.map((id) => {
                      const state = records[id]?.status || 'ok';
                      const style = STATUS_STYLES[state];
                      const isPicked = canEdit && arranging && !bulkMode && picked === id;
                      const bulkOrder = canEdit && arranging && bulkMode ? bulkSelected.indexOf(id) : -1;
                      return (
                        <button
                          key={id}
                          type="button"
                          draggable={canEdit && arranging && !bulkMode}
                          onDragStart={(e) => {
                            if (!canEdit || bulkMode) return;
                            setDraggedId(id);
                            e.dataTransfer.setData('text/plain', pcName(id));
                            e.dataTransfer.effectAllowed = 'move';
                          }}
                          onDragEnd={() => setDraggedId(null)}
                          onClick={() => {
                            if (canEdit && arranging) {
                              if (bulkMode) toggleBulkPc(id);
                              else setPicked((prev) => (prev === id ? null : id));
                            } else {
                              setEditingPcId(id);
                            }
                          }}
                          className={`relative px-3 py-2 rounded-lg border-2 text-xs font-mono font-bold flex items-center gap-1.5 transition-all ${
                            style.card
                          } ${isPicked || bulkOrder >= 0 ? 'ring-2 ring-[#F84464]' : ''}`}
                        >
                          <Monitor className="w-3.5 h-3.5" />
                          {pcName(id)}
                          {bulkOrder >= 0 && (
                            <span className="ml-1 px-1.5 py-0.5 rounded-full bg-[#F84464] text-white text-[10px] leading-none">
                              {bulkOrder + 1}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </section>
            )}
          </>
        )}
      </main>

      {/* Footer Attribution */}
      <footer className="mt-8 border-t border-slate-200 bg-[#333545] text-slate-300">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
          <p className="text-center sm:text-left">
            Website designed &amp; developed by{' '}
            <span className="font-semibold text-white">Mr. Shivam Maheshwari</span>,{' '}
            <span>Technical Superintendent, CSE</span>
          </p>
          <a
            href="tel:+919468955596"
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 hover:bg-[#F84464] text-white font-semibold transition-colors"
          >
            <Phone className="w-3.5 h-3.5" />
            +91-9468955596
          </a>
        </div>
      </footer>

      <EditorModal
        pcId={editingPcId}
        entry={editingPcId ? records[editingPcId] : null}
        history={editingPcId ? historyMap[editingPcId] || [] : []}
        asset={editingPcId ? assetsMap[editingPcId] || null : null}
        readOnly={!canEdit}
        onClose={() => setEditingPcId(null)}
        onSave={handleSavePc}
        onSaveAsset={handleSaveAsset}
      />

      <LabProfileModal
        open={profileModal.open}
        mode={profileModal.mode}
        initialLab={selectedLab}
        user={user}
        onClose={() => setProfileModal({ open: false, mode: 'create' })}
        onSubmit={handleSaveLabProfile}
      />

      {canEdit && (
        <PrivateNotesModal
          open={notesModalOpen}
          labName={selectedLab?.name}
          ownerEmail={user?.email}
          notes={privateNotes}
          onClose={() => setNotesModalOpen(false)}
          onAddNote={handleAddPrivateNote}
          onToggleDone={handleTogglePrivateNote}
          onDeleteNote={handleDeletePrivateNote}
        />
      )}

      {toast && (
        <div className="fixed bottom-5 right-5 z-50 px-4 py-2.5 rounded-xl bg-[#333545] text-white text-sm font-medium shadow-xl border border-white/10">
          {toast}
        </div>
      )}
    </div>
  );
}
