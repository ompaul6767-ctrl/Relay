import React, { useState } from 'react';
import { api } from '../../api/client';
import { Button } from '../common/Button';
import { ShieldCheck, XCircle, CheckCircle2, Play, AlertOctagon, X } from 'lucide-react';

interface CitationTestModalProps {
  caseId: string;
  isOpen: boolean;
  onClose: () => void;
}

export const CitationTestModal: React.FC<CitationTestModalProps> = ({
  caseId,
  isOpen,
  onClose,
}) => {
  const [spanId, setSpanId] = useState<string>('S1.L3');
  const [fakeQuote, setFakeQuote] = useState<string>(
    'The team decided to migrate entire backend to PHP on bare metal servers without authorization.'
  );
  const [claimText, setClaimText] = useState<string>(
    'Critical Architecture Decision: Backend migrated to legacy PHP'
  );
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<any>(null);

  if (!isOpen) return null;

  const runTest = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await api.testFakeQuote({
        caseId,
        spanId,
        fakeQuote,
        claimText,
      });
      setResult(res);
    } catch (err: any) {
      setResult({ error: err.message || 'Citation test failed to execute.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative bg-white dark:bg-navy-900 rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center space-x-2 text-teal-600 dark:text-teal-400">
            <ShieldCheck size={20} />
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
              Deterministic Citation Validation Test
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
            <X size={18} />
          </button>
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-400 mt-3 leading-relaxed">
          Relay strictly prohibits hallucinated or unbacked claims. This tool submits a simulated claim
          citing an authentic project span (<code className="text-teal-600">{spanId}</code>) but with a fabricated quote to prove the citation verifier catches and rejects it deterministically.
        </p>

        <div className="mt-4 space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Target Span ID:
            </label>
            <input
              type="text"
              value={spanId}
              onChange={(e) => setSpanId(e.target.value)}
              className="w-full text-xs font-mono px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-navy-950 focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Simulated Claim Statement:
            </label>
            <input
              type="text"
              value={claimText}
              onChange={(e) => setClaimText(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-navy-950 focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Fabricated Quote (Not in Source):
            </label>
            <textarea
              rows={2}
              value={fakeQuote}
              onChange={(e) => setFakeQuote(e.target.value)}
              className="w-full text-xs font-mono p-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-navy-950 focus:ring-2 focus:ring-teal-500 text-rose-700 dark:text-rose-400"
            />
          </div>

          <Button
            onClick={runTest}
            loading={loading}
            variant="primary"
            size="sm"
            className="w-full mt-2"
            icon={<Play size={14} />}
          >
            Submit Fabricated Quote to Citation Validator
          </Button>

          {/* Test Execution Output */}
          {result && (
            <div
              className={`p-4 rounded-xl border text-xs space-y-2 mt-4 animate-in fade-in duration-200 ${
                !result.verificationPassed
                  ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900 text-rose-900 dark:text-rose-200'
                  : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900 text-emerald-900 dark:text-emerald-200'
              }`}
            >
              <div className="flex items-center space-x-2 font-bold">
                {!result.verificationPassed ? (
                  <>
                    <XCircle size={18} className="text-rose-600" />
                    <span>Deterministic Check PASSED: Fabricated Citation Rejected</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={18} className="text-emerald-600" />
                    <span>Citation Verified</span>
                  </>
                )}
              </div>

              <div>
                <strong>Assigned Status:</strong>{' '}
                <span className="font-mono uppercase font-bold px-2 py-0.5 rounded bg-rose-200 dark:bg-rose-900 text-rose-900 dark:text-rose-100">
                  {result.resultingStatus}
                </span>
              </div>

              {result.rejectionReason && (
                <div>
                  <strong>Rejection Reason:</strong>{' '}
                  <span className="font-mono text-[11px] block mt-0.5 p-2 rounded bg-white/70 dark:bg-navy-900/70 border border-rose-200 dark:border-rose-800">
                    {result.rejectionReason}
                  </span>
                </div>
              )}

              {result.spanOriginalText && (
                <div className="pt-1">
                  <strong className="text-slate-600 dark:text-slate-400">Actual Source Span Content:</strong>
                  <div className="p-2 rounded bg-white dark:bg-navy-900 border border-slate-200 dark:border-slate-800 font-mono text-[11px] text-slate-700 dark:text-slate-300 mt-1 max-h-24 overflow-y-auto">
                    {result.spanOriginalText}
                  </div>
                </div>
              )}

              <p className="text-[11px] text-slate-500 pt-1 italic">
                Rule verified: "The quote must appear in that span's text (whitespace-normalised exact match). Otherwise reject the claim with reason 'citation failed'."
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
