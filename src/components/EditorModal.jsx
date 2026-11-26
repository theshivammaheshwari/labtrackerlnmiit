import React, { useEffect, useState } from 'react';
import { X, Monitor, Save, Check } from 'lucide-react';
import { CATEGORIES, STATUS_LABELS, pcName } from '../utils/tracker';

const STATUS_OPTIONS = [
  { value: 'open', label: 'Open Issue', active: 'bg-rose-500/20 border-rose-400 text-rose-200' },
  { value: 'progress', label: 'In Progress', active: 'bg-amber-500/20 border-amber-400 text-amber-200' },
  { value: 'resolved', label: 'Resolved', active: 'bg-emerald-500/20 border-emerald-400 text-emerald-200' },
  { value: 'ok', label: 'Healthy (Clear)', active: 'bg-sky-500/20 border-sky-400 text-sky-200' },
];

export default function EditorModal({ pcId, entry, onClose, onSave }) {
  const [status, setStatus] = useState('open');
  const [issues, setIssues] = useState([]);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!pcId) return;
    setStatus(entry?.status === 'ok' ? 'open' : entry?.status || 'open');
    setIssues(entry?.issues || []);
    setNotes(entry?.notes || '');
  }, [pcId, entry]);

  if (!pcId) return null;

  const toggleIssue = (cat) => {
    setIssues((prev) =>
      prev.includes(cat) ? prev.filter((item) => item !== cat) : [...prev, cat]
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(pcId, { status, issues, notes: notes.trim() });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-3xl border border-slate-700/70 bg-slate-900/90 backdrop-blur-2xl shadow-2xl shadow-black/60 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/80 bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-sky-500/15 border border-sky-400/30 text-sky-400">
              <Monitor className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white font-mono">{pcName(pcId)}</h2>
              <p className="text-xs text-slate-400">
                {entry?.updated
                  ? `Last updated ${new Date(entry.updated).toLocaleString()}`
                  : `Current status: ${STATUS_LABELS[entry?.status || 'ok']}`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Status
            </label>
            <div className="grid grid-cols-2 gap-2">
              {STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setStatus(opt.value)}
                  className={`px-3 py-2.5 rounded-xl border text-sm font-medium transition-all flex items-center justify-between ${
                    status === opt.value
                      ? opt.active
                      : 'border-slate-700/70 bg-slate-800/40 text-slate-300 hover:border-slate-600'
                  }`}
                >
                  <span>{opt.label}</span>
                  {status === opt.value && <Check className="w-4 h-4" />}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
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
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                      selected
                        ? 'bg-sky-500/20 border-sky-400/70 text-sky-200 shadow-sm'
                        : 'bg-slate-800/50 border-slate-700/70 text-slate-400 hover:text-slate-200 hover:border-slate-600'
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Notes
            </label>
            <textarea
              rows={3}
              maxLength={3000}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Mouse click nahi ho raha. IP assign karna hai."
              className="w-full rounded-2xl border border-slate-700/80 bg-slate-950/70 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/60 focus:border-sky-500/60 resize-y"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-700 text-sm font-medium text-slate-300 hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-500 hover:from-sky-400 hover:to-indigo-400 text-sm font-semibold text-white shadow-lg shadow-sky-500/25 flex items-center gap-2 transition-all"
            >
              <Save className="w-4 h-4" />
              Save to Cloud
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
