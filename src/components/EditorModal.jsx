import React, { useEffect, useState } from 'react';
import { X, Monitor, Save, Check, Lock, History, FileText, Cpu } from 'lucide-react';
import { CATEGORIES, STATUS_LABELS, STATUS_STYLES, pcName } from '../utils/tracker';

const STATUS_OPTIONS = [
  { value: 'open', label: 'Open Issue', active: 'bg-[#FFF0F3] border-[#F84464] text-[#D91B42]' },
  { value: 'progress', label: 'In Progress', active: 'bg-amber-50 border-amber-500 text-amber-800' },
  { value: 'resolved', label: 'Resolved', active: 'bg-sky-50 border-sky-500 text-sky-800' },
  { value: 'ok', label: 'Healthy (Clear)', active: 'bg-emerald-50 border-[#1EA83C] text-[#1EA83C]' },
];

export default function EditorModal({
  pcId,
  entry,
  history = [],
  asset = null,
  readOnly = false,
  onClose,
  onSave,
  onSaveAsset,
}) {
  const [tab, setTab] = useState('details');
  const [status, setStatus] = useState('open');
  const [issues, setIssues] = useState([]);
  const [notes, setNotes] = useState('');
  const [ip, setIp] = useState('');
  const [os, setOs] = useState('');
  const [assetCode, setAssetCode] = useState('');
  const [serialNo, setSerialNo] = useState('');

  useEffect(() => {
    if (!pcId) return;
    setTab('details');
    setStatus(entry?.status === 'ok' ? 'open' : entry?.status || 'open');
    setIssues(entry?.issues || []);
    setNotes(entry?.notes || '');
    setIp(asset?.ip || '');
    setOs(asset?.os || '');
    setAssetCode(asset?.assetCode || '');
    setSerialNo(asset?.serialNo || '');
  }, [pcId, entry, asset]);

  if (!pcId) return null;

  const toggleIssue = (cat) => {
    if (readOnly) return;
    setIssues((prev) =>
      prev.includes(cat) ? prev.filter((item) => item !== cat) : [...prev, cat]
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (readOnly) return;
    onSave(pcId, { status, issues, notes: notes.trim() });
  };

  const handleAssetSubmit = (e) => {
    e.preventDefault();
    if (readOnly || !onSaveAsset) return;
    onSaveAsset(pcId, {
      ip: ip.trim(),
      os: os.trim(),
      assetCode: assetCode.trim(),
      serialNo: serialNo.trim(),
    });
  };

  const currentStatus = entry?.status || 'ok';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1F2533]/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[90vh] flex flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-[#333545] text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#F84464] text-white">
              <Monitor className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold font-mono">{pcName(pcId)}</h2>
              <p className="text-xs text-slate-300">
                {entry?.updated
                  ? `Last updated ${new Date(entry.updated).toLocaleString()}`
                  : `Current status: ${STATUS_LABELS[currentStatus]}`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Details / Maintenance Log / PC Configuration Tabs */}
        <div className="flex border-b border-slate-200 bg-[#F5F5FA] px-4 sm:px-6 pt-2 gap-1.5 overflow-x-auto shrink-0">
          <button
            type="button"
            onClick={() => setTab('details')}
            className={`px-3 py-2 text-xs font-semibold rounded-t-lg border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-colors ${
              tab === 'details'
                ? 'border-[#F84464] text-[#F84464] bg-white'
                : 'border-transparent text-slate-500 hover:text-[#1F2533]'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Status &amp; Details
          </button>
          <button
            type="button"
            onClick={() => setTab('history')}
            className={`px-3 py-2 text-xs font-semibold rounded-t-lg border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-colors ${
              tab === 'history'
                ? 'border-[#F84464] text-[#F84464] bg-white'
                : 'border-transparent text-slate-500 hover:text-[#1F2533]'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            Maintenance Log ({history.length})
          </button>
          <button
            type="button"
            onClick={() => setTab('config')}
            className={`px-3 py-2 text-xs font-semibold rounded-t-lg border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-colors ${
              tab === 'config'
                ? 'border-[#F84464] text-[#F84464] bg-white'
                : 'border-transparent text-slate-500 hover:text-[#1F2533]'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            PC Configuration
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          {tab === 'config' ? (
            readOnly ? (
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="rounded-xl border border-slate-200 bg-[#F5F5FA] p-3.5">
                    <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      IP Address
                    </span>
                    <span className="mt-1 block font-mono text-sm font-bold text-[#1F2533]">
                      {asset?.ip || '—'}
                    </span>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-[#F5F5FA] p-3.5">
                    <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      Operating System (OS)
                    </span>
                    <span className="mt-1 block text-sm font-bold text-[#1F2533]">
                      {asset?.os || '—'}
                    </span>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-[#F5F5FA] p-3.5">
                    <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      Asset Code
                    </span>
                    <span className="mt-1 block font-mono text-sm font-bold text-[#1F2533]">
                      {asset?.assetCode || '—'}
                    </span>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-[#F5F5FA] p-3.5">
                    <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      Serial No
                    </span>
                    <span className="mt-1 block font-mono text-sm font-bold text-[#1F2533]">
                      {asset?.serialNo || '—'}
                    </span>
                  </div>
                </div>
                <div className="flex justify-end pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 rounded-lg bg-[#333545] text-white text-sm font-semibold hover:bg-[#1F2533]"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleAssetSubmit} className="p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                      IP Address
                    </label>
                    <input
                      type="text"
                      maxLength={45}
                      value={ip}
                      onChange={(e) => setIp(e.target.value)}
                      placeholder="e.g. 172.16.1.101"
                      className="w-full rounded-lg border border-slate-300 bg-[#F5F5FA] px-3 py-2 text-sm font-mono text-[#1F2533] focus:outline-none focus:ring-2 focus:ring-[#F84464]/40 focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                      OS
                    </label>
                    <input
                      type="text"
                      maxLength={60}
                      value={os}
                      onChange={(e) => setOs(e.target.value)}
                      placeholder="Windows / Ubuntu / Dual Boot"
                      className="w-full rounded-lg border border-slate-300 bg-[#F5F5FA] px-3 py-2 text-sm text-[#1F2533] focus:outline-none focus:ring-2 focus:ring-[#F84464]/40 focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                      Asset Code
                    </label>
                    <input
                      type="text"
                      maxLength={60}
                      value={assetCode}
                      onChange={(e) => setAssetCode(e.target.value)}
                      placeholder="e.g. LNMIIT-CSE-001"
                      className="w-full rounded-lg border border-slate-300 bg-[#F5F5FA] px-3 py-2 text-sm font-mono text-[#1F2533] focus:outline-none focus:ring-2 focus:ring-[#F84464]/40 focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                      Serial No
                    </label>
                    <input
                      type="text"
                      maxLength={80}
                      value={serialNo}
                      onChange={(e) => setSerialNo(e.target.value)}
                      placeholder="e.g. SN123456"
                      className="w-full rounded-lg border border-slate-300 bg-[#F5F5FA] px-3 py-2 text-sm font-mono text-[#1F2533] focus:outline-none focus:ring-2 focus:ring-[#F84464]/40 focus:bg-white"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 rounded-lg border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-lg bg-[#F84464] hover:bg-[#E03554] text-sm font-semibold text-white shadow-sm flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    Save Config
                  </button>
                </div>
              </form>
            )
          ) : tab === 'history' ? (
            <div className="p-6 space-y-3">
              {history.length === 0 ? (
                <div className="text-center py-8 text-sm text-slate-500">
                  No maintenance history recorded for {pcName(pcId)} yet.
                </div>
              ) : (
                <div className="relative pl-5 space-y-4 before:content-[''] before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                  {history.map((log, idx) => {
                    const style = STATUS_STYLES[log.status] || STATUS_STYLES.ok;
                    return (
                      <div key={idx} className="relative rounded-xl border border-slate-200 bg-[#F5F5FA] p-3.5">
                        <span
                          className={`absolute -left-[18px] top-4 w-2.5 h-2.5 rounded-full ring-4 ring-white ${style.dot}`}
                        />
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${style.badge}`}
                          >
                            {STATUS_LABELS[log.status] || log.status}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {log.timestamp ? new Date(log.timestamp).toLocaleString() : ''}
                          </span>
                        </div>

                        {log.issues?.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {log.issues.map((iss) => (
                              <span
                                key={iss}
                                className="px-2 py-0.5 rounded bg-white border border-slate-200 text-[11px] font-medium text-slate-700"
                              >
                                {iss}
                              </span>
                            ))}
                          </div>
                        )}

                        {log.notes && (
                          <p className="mt-2 text-xs text-[#1F2533] whitespace-pre-wrap">
                            {log.notes}
                          </p>
                        )}

                        {log.by && (
                          <p className="mt-1.5 text-[10px] text-slate-400">
                            Updated by {log.by}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="flex justify-end pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg bg-[#333545] text-white text-sm font-semibold hover:bg-[#1F2533]"
                >
                  Close
                </button>
              </div>
            </div>
          ) : readOnly ? (
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between rounded-lg bg-slate-50 border border-slate-200 px-3.5 py-2.5 text-xs text-slate-600">
                <span className="flex items-center gap-1.5 font-medium">
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                  View-Only · Only lab creator can edit
                </span>
                <span className="font-bold text-[#1F2533]">{STATUS_LABELS[currentStatus]}</span>
              </div>

              <div>
                <span className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                  Issue Tags
                </span>
                {entry?.issues?.length ? (
                  <div className="flex flex-wrap gap-2">
                    {entry.issues.map((cat) => (
                      <span
                        key={cat}
                        className="px-3 py-1 rounded-full text-xs font-semibold bg-[#FFF0F3] border border-[#F84464]/40 text-[#D91B42]"
                      >
                        {cat}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">No issues reported.</p>
                )}
              </div>

              <div>
                <span className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                  Notes
                </span>
                <p className="rounded-lg border border-slate-200 bg-[#F5F5FA] p-3 text-sm text-[#1F2533] whitespace-pre-wrap min-h-[60px]">
                  {entry?.notes || 'No notes added.'}
                </p>
              </div>

              <div className="flex justify-end pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg bg-[#333545] text-white text-sm font-semibold hover:bg-[#1F2533]"
                >
                  Close
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                  Seat / PC Status
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {STATUS_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setStatus(opt.value)}
                      className={`px-3 py-2.5 rounded-lg border text-sm font-semibold transition-all flex items-center justify-between ${
                        status === opt.value
                          ? opt.active
                          : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <span>{opt.label}</span>
                      {status === opt.value && <Check className="w-4 h-4" />}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                  Issue Tags
                </label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map((cat) => {
                    const selected = issues.includes(cat);
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => toggleIssue(cat)}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                          selected
                            ? 'bg-[#F84464] border-[#F84464] text-white shadow-sm'
                            : 'bg-white border-slate-300 text-slate-600 hover:border-slate-400'
                        }`}
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                  Notes
                </label>
                <textarea
                  rows={3}
                  maxLength={3000}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Mouse click nahi ho raha. IP assign karna hai."
                  className="w-full rounded-lg border border-slate-300 bg-[#F5F5FA] px-3.5 py-2.5 text-sm text-[#1F2533] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#F84464]/40 focus:bg-white resize-y"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-[#F84464] hover:bg-[#E03554] text-sm font-semibold text-white shadow-sm flex items-center gap-2 transition-colors"
                >
                  <Save className="w-4 h-4" />
                  Save to Cloud
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
