import React, { useEffect, useState } from 'react';
import { X, Monitor, Save, Check, Lock } from 'lucide-react';
import { CATEGORIES, STATUS_LABELS, pcName } from '../utils/tracker';

const STATUS_OPTIONS = [
  { value: 'open', label: 'Open Issue', active: 'bg-[#FFF0F3] border-[#F84464] text-[#D91B42]' },
  { value: 'progress', label: 'In Progress', active: 'bg-amber-50 border-amber-500 text-amber-800' },
  { value: 'resolved', label: 'Resolved', active: 'bg-sky-50 border-sky-500 text-sky-800' },
  { value: 'ok', label: 'Healthy (Clear)', active: 'bg-emerald-50 border-[#1EA83C] text-[#1EA83C]' },
];

export default function EditorModal({ pcId, entry, readOnly = false, onClose, onSave }) {
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

  const currentStatus = entry?.status || 'ok';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1F2533]/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-[#333545] text-white">
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

        {readOnly ? (
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
  );
}
