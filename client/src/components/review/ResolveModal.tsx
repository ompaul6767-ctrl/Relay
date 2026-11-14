import React, { useState } from 'react';
import { Claim } from '../../types';
import { Button } from '../common/Button';
import { X, AlertTriangle, Check } from 'lucide-react';

interface ResolveModalProps {
  claim: Claim | null;
  isOpen: boolean;
  onClose: () => void;
  onResolve: (claimId: string, value: string, notes: string) => Promise<void>;
}

export const ResolveModal: React.FC<ResolveModalProps> = ({
  claim,
  isOpen,
  onClose,
  onResolve,
}) => {
  const [selectedValue, setSelectedValue] = useState<string>('');
  const [customValue, setCustomValue] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  if (!isOpen || !claim) return null;

  const conflictingValues = claim.conflictDetails?.conflictingValues || [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalValue = customValue.trim() || selectedValue;
    if (!finalValue) return;

    setLoading(true);
    try {
      await onResolve(claim._id, finalValue, notes);
      onClose();
    } catch (err) {
      console.error('Failed to resolve conflict:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="relative bg-white dark:bg-navy-900 rounded-2xl max-w-lg w-full p-4 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[92vh] overflow-y-auto animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center space-x-2 text-rose-600 dark:text-rose-400">
            <AlertTriangle size={20} />
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
              Resolve Conflicting Claim
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="text-xs text-slate-600 dark:text-slate-400">
            Entity: <strong className="font-mono text-slate-800 dark:text-slate-200">{claim.entityKey}</strong> (Attribute: <span className="font-mono">{claim.attribute}</span>)
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Select Verified Truth:
            </label>
            <div className="space-y-2">
              {conflictingValues.map((cv: any, idx: number) => (
                <div
                  key={idx}
                  onClick={() => {
                    setSelectedValue(cv.value);
                    setCustomValue('');
                  }}
                  className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                    selectedValue === cv.value && !customValue
                      ? 'border-teal-600 bg-teal-50 dark:bg-teal-950/50 text-teal-900 dark:text-teal-200 shadow-sm'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-center justify-between font-semibold mb-1">
                    <span>Value: "{cv.value}"</span>
                    {selectedValue === cv.value && !customValue && (
                      <Check size={14} className="text-teal-600" />
                    )}
                  </div>
                  <p className="text-slate-500 italic">"{cv.quote}"</p>
                  <div className="text-[11px] text-slate-400 mt-1">Source: {cv.source} ({cv.spanId})</div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Or Enter Override Value:
            </label>
            <input
              type="text"
              value={customValue}
              onChange={(e) => setCustomValue(e.target.value)}
              placeholder="e.g. Co-owned by Aarav and Priya"
              className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-navy-950 focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Lead Resolution Justification (Mandatory):
            </label>
            <textarea
              required
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Record why this value was selected for audit compliance..."
              className="w-full text-xs p-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-navy-950 focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              loading={loading}
              disabled={(!selectedValue && !customValue.trim()) || !notes.trim()}
            >
              Confirm Resolution
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
