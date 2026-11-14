import React, { useState, useEffect } from 'react';
import { Claim } from '../../types';
import { Button } from '../common/Button';
import { X, Edit3, UserCheck } from 'lucide-react';

interface EditModalProps {
  claim: Claim | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (claimId: string, text: string, value: string, notes: string) => Promise<void>;
  reviewerName: string;
}

export const EditModal: React.FC<EditModalProps> = ({
  claim,
  isOpen,
  onClose,
  onSave,
  reviewerName,
}) => {
  const [text, setText] = useState<string>('');
  const [value, setValue] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (claim) {
      setText(claim.text || '');
      setValue(claim.value || '');
      setNotes(claim.reviewNotes || `Confirmed and attested by ${reviewerName}`);
    }
  }, [claim, reviewerName]);

  if (!isOpen || !claim) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;

    setLoading(true);
    try {
      await onSave(claim._id, text.trim(), value.trim(), notes.trim());
      onClose();
    } catch (err) {
      console.error('Failed to update claim:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="relative bg-white dark:bg-navy-900 rounded-2xl max-w-lg w-full p-4 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[92vh] overflow-y-auto animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center space-x-2 text-blue-600 dark:text-blue-400">
            <Edit3 size={20} />
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
              Edit & Attest Knowledge Claim
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
            <X size={18} />
          </button>
        </div>

        <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-900 text-xs text-blue-900 dark:text-blue-200 mt-3 flex items-start space-x-2">
          <UserCheck size={16} className="mt-0.5 flex-shrink-0 text-blue-600" />
          <div>
            <strong>Attestation Rule:</strong> Editing this claim marks its status as{' '}
            <span className="font-semibold underline">Attested</span> with your name (
            {reviewerName}) attached as the responsible authority.
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Claim Statement:
            </label>
            <textarea
              required
              rows={3}
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full text-xs p-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-navy-950 focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Extracted Attribute Value:
            </label>
            <input
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="e.g. Maria (Lead)"
              className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-navy-950 focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Attestation Notes / Verification Reason:
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
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
              disabled={!text.trim()}
            >
              Save as Attested
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
