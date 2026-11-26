import React, { useState } from 'react';
import { X, Lock, Plus, Trash2, CheckCircle2, Circle, StickyNote } from 'lucide-react';

export default function PrivateNotesModal({
  open,
  labName,
  ownerEmail,
  notes,
  onClose,
  onAddNote,
  onToggleDone,
  onDeleteNote,
}) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  if (!open) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim() && !body.trim()) return;
    onAddNote({
      title: title.trim() || 'Reminder',
      body: body.trim(),
    });
    setTitle('');
    setBody('');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1F2533]/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl max-h-[88vh] flex flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 bg-[#333545] text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#F84464] text-white">
              <StickyNote className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2">
                Private In-Charge Notes
              </h2>
              <p className="text-xs text-slate-300 flex items-center gap-1">
                <Lock className="w-3 h-3 text-emerald-300" />
                Only visible to you ({ownerEmail}) · {labName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10"
            aria-label="Close private notes"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 border-b border-slate-200 bg-[#F5F5FA] space-y-3 shrink-0">
          <input
            type="text"
            maxLength={120}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Note title (e.g. Order 10 Logitech mice, Check switch port 4)"
            className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-[#1F2533] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#F84464]/40"
          />
          <div className="flex gap-2">
            <textarea
              rows={2}
              maxLength={2000}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Details / reminder notes..."
              className="flex-1 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-[#1F2533] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#F84464]/40 resize-none"
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-[#F84464] hover:bg-[#E03554] text-sm font-semibold text-white shadow-sm flex items-center gap-1.5 self-end"
            >
              <Plus className="w-4 h-4" />
              Add
            </button>
          </div>
        </form>

        <div className="flex-1 overflow-y-auto p-5 space-y-2.5">
          {notes.length === 0 ? (
            <div className="text-center py-8 text-sm text-slate-500">
              No private notes yet. Add reminders or maintenance tasks here — visitors cannot see them.
            </div>
          ) : (
            notes.map((note) => (
              <div
                key={note.id}
                className={`rounded-xl border p-3.5 transition-all flex items-start gap-3 ${
                  note.done
                    ? 'bg-slate-50 border-slate-200 opacity-70'
                    : 'bg-white border-slate-200 shadow-sm'
                }`}
              >
                <button
                  type="button"
                  onClick={() => onToggleDone(note)}
                  className="mt-0.5 text-slate-400 hover:text-[#1EA83C] shrink-0"
                  title={note.done ? 'Mark as pending' : 'Mark as done'}
                >
                  {note.done ? (
                    <CheckCircle2 className="w-5 h-5 text-[#1EA83C]" />
                  ) : (
                    <Circle className="w-5 h-5" />
                  )}
                </button>
                <div className="flex-1 min-w-0">
                  <h3
                    className={`text-sm font-bold text-[#1F2533] ${
                      note.done ? 'line-through text-slate-500' : ''
                    }`}
                  >
                    {note.title}
                  </h3>
                  {note.body && (
                    <p className="mt-1 text-xs text-slate-600 whitespace-pre-wrap">
                      {note.body}
                    </p>
                  )}
                  <p className="mt-1.5 text-[10px] text-slate-400">
                    {note.createdAt ? new Date(note.createdAt).toLocaleString() : ''}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onDeleteNote(note.id)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-[#D91B42] hover:bg-[#FFF0F3] shrink-0"
                  title="Delete note"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
