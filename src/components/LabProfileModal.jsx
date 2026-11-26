import React, { useEffect, useState } from 'react';
import { X, Building2, Save } from 'lucide-react';

export default function LabProfileModal({
  open,
  mode,
  initialLab,
  user,
  onClose,
  onSubmit,
}) {
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('');
  const [totalPcs, setTotalPcs] = useState(90);

  useEffect(() => {
    if (!open) return;
    if (mode === 'edit' && initialLab) {
      setName(initialLab.name || '');
      setLocation(initialLab.location || '');
      setOwnerName(initialLab.ownerName || '');
      setOwnerPhone(initialLab.ownerPhone || '');
      setTotalPcs(initialLab.totalPcs || 90);
    } else {
      setName('');
      setLocation('');
      setOwnerName(user?.displayName || '');
      setOwnerPhone('');
      setTotalPcs(90);
    }
  }, [open, mode, initialLab, user]);

  if (!open) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim() || !location.trim() || !ownerName.trim() || !ownerPhone.trim()) {
      return;
    }
    const clampedPcs = Math.max(1, Math.min(180, Number(totalPcs) || 90));
    onSubmit({
      name: name.trim(),
      location: location.trim(),
      ownerName: ownerName.trim(),
      ownerPhone: ownerPhone.trim(),
      totalPcs: clampedPcs,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1F2533]/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 bg-[#333545] text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#F84464] text-white">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">
                {mode === 'edit' ? 'Edit Lab Profile' : 'Create New Lab'}
              </h2>
              <p className="text-xs text-slate-300">
                {user?.email}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
              Lab Name *
            </label>
            <input
              type="text"
              required
              maxLength={80}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. CSE Lab 1 / CP Lab"
              className="w-full rounded-lg border border-slate-300 bg-[#F5F5FA] px-3.5 py-2 text-sm text-[#1F2533] focus:outline-none focus:ring-2 focus:ring-[#F84464]/40 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
              Lab Location *
            </label>
            <input
              type="text"
              required
              maxLength={100}
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Academic Block, 1st Floor, Room 104"
              className="w-full rounded-lg border border-slate-300 bg-[#F5F5FA] px-3.5 py-2 text-sm text-[#1F2533] focus:outline-none focus:ring-2 focus:ring-[#F84464]/40 focus:bg-white"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                Your Name *
              </label>
              <input
                type="text"
                required
                maxLength={60}
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                placeholder="e.g. Mr. Shivam Maheshwari"
                className="w-full rounded-lg border border-slate-300 bg-[#F5F5FA] px-3.5 py-2 text-sm text-[#1F2533] focus:outline-none focus:ring-2 focus:ring-[#F84464]/40 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                Phone Number *
              </label>
              <input
                type="tel"
                required
                maxLength={20}
                value={ownerPhone}
                onChange={(e) => setOwnerPhone(e.target.value)}
                placeholder="e.g. +91-9468955596"
                className="w-full rounded-lg border border-slate-300 bg-[#F5F5FA] px-3.5 py-2 text-sm text-[#1F2533] focus:outline-none focus:ring-2 focus:ring-[#F84464]/40 focus:bg-white"
              />
            </div>
          </div>

          {mode === 'create' && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                Total PCs in Lab
              </label>
              <input
                type="number"
                min={1}
                max={180}
                value={totalPcs}
                onChange={(e) => setTotalPcs(Number(e.target.value))}
                className="w-32 rounded-lg border border-slate-300 bg-[#F5F5FA] px-3.5 py-2 text-sm font-mono text-[#1F2533] focus:outline-none focus:ring-2 focus:ring-[#F84464]/40 focus:bg-white"
              />
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
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
              {mode === 'edit' ? 'Update Profile' : 'Create Lab'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
