import React, { useEffect, useState } from 'react';
import { Claim, Span } from '../../types';
import { api } from '../../api/client';
import { StatusChip } from '../common/StatusChip';
import { AclBadge } from '../common/AclBadge';
import { Button } from '../common/Button';
import {
  X,
  FileText,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  ExternalLink,
  Clock,
  User,
} from 'lucide-react';

interface EvidenceDrawerProps {
  claim: Claim | null;
  isOpen: boolean;
  onClose: () => void;
  onApprove?: (claimId: string) => void;
  onReject?: (claimId: string) => void;
  onOpenEdit?: (claim: Claim) => void;
  onOpenResolve?: (claim: Claim) => void;
  isLeadRole?: boolean;
}

export const EvidenceDrawer: React.FC<EvidenceDrawerProps> = ({
  claim,
  isOpen,
  onClose,
  onApprove,
  onReject,
  onOpenEdit,
  onOpenResolve,
  isLeadRole = false,
}) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [spanDetails, setSpanDetails] = useState<Span[]>([]);
  const [forbiddenError, setForbiddenError] = useState<string | null>(null);

  useEffect(() => {
    if (!claim || !isOpen) {
      setSpanDetails([]);
      setForbiddenError(null);
      return;
    }

    const loadSpans = async () => {
      setLoading(true);
      setForbiddenError(null);
      try {
        const spanRefs = claim.spanRefs || [];
        if (spanRefs.length === 0) {
          setSpanDetails([]);
          return;
        }

        const promises = spanRefs.map((ref) =>
          api.getSpan(ref.spanId, claim.caseId).catch((err) => {
            if (err.status === 403) {
              setForbiddenError('Access to this evidence is restricted to Lead authorization.');
            }
            return null;
          })
        );

        const results = await Promise.all(promises);
        const validSpans = results
          .filter(Boolean)
          .map((r: any) => r.span);
        setSpanDetails(validSpans);
      } catch (err: any) {
        console.error('[EvidenceDrawer] Error loading spans:', err);
      } finally {
        setLoading(false);
      }
    };

    loadSpans();
  }, [claim, isOpen]);

  if (!isOpen || !claim) return null;

  const highlightQuote = (text: string, quote: string) => {
    if (!quote) return text;
    const cleanQuote = quote.trim();
    const index = text.toLowerCase().indexOf(cleanQuote.toLowerCase());
    if (index === -1) return text;

    const before = text.substring(0, index);
    const match = text.substring(index, index + cleanQuote.length);
    const after = text.substring(index + cleanQuote.length);

    return (
      <>
        {before}
        <mark className="bg-amber-200 dark:bg-amber-900/60 text-slate-900 dark:text-amber-100 font-semibold px-1 rounded border-b-2 border-amber-500 animate-pulse">
          {match}
        </mark>
        {after}
      </>
    );
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-sm transition-opacity flex justify-end">
      <div className="relative w-full max-w-xl bg-white dark:bg-navy-900 h-full shadow-2xl flex flex-col border-l border-slate-200 dark:border-slate-800 animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-navy-950">
          <div className="flex items-center space-x-2">
            <FileText className="text-teal-600 dark:text-teal-400" size={20} />
            <h2 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white">
              Evidence & Citation Inspection
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-md"
            title="Close Drawer (Esc)"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
          {/* Claim Summary Card */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-navy-950/40 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <StatusChip status={claim.status} />
              <div className="flex items-center space-x-2">
                <AclBadge acl={claim.acl} size="sm" />
                <span className="text-xs uppercase font-mono px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  {claim.type}
                </span>
              </div>
            </div>

            <p className="text-sm font-medium text-slate-900 dark:text-slate-100 leading-relaxed">
              {claim.text}
            </p>

            {claim.value && (
              <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center space-x-2">
                <span className="font-semibold text-slate-600 dark:text-slate-300">Entity:</span>
                <code>{claim.entityKey || 'none'}</code>
                <span>•</span>
                <span className="font-semibold text-slate-600 dark:text-slate-300">Value:</span>
                <code>{claim.value}</code>
              </div>
            )}
          </div>

          {/* AI Support Verdict Strip */}
          <div className="flex items-center justify-between p-3 rounded-lg border border-teal-200 bg-teal-50/50 dark:border-teal-900 dark:bg-teal-950/30">
            <div className="flex items-center space-x-2">
              <Sparkles size={16} className="text-teal-600 dark:text-teal-400" />
              <span className="text-xs font-semibold text-teal-950 dark:text-teal-200">
                Support Check Verdict:
              </span>
            </div>
            <span
              className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                claim.aiSupportVerdict === 'yes'
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200'
                  : claim.aiSupportVerdict === 'partial'
                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200'
                  : 'bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200'
              }`}
            >
              {claim.aiSupportVerdict?.toUpperCase() || 'EVALUATED'}
            </span>
          </div>

          {/* Forbidden State if restricted */}
          {forbiddenError && (
            <div className="p-4 rounded-xl border border-rose-200 bg-rose-50 dark:border-rose-900 dark:bg-rose-950/30 flex items-start space-x-3 text-rose-800 dark:text-rose-200">
              <ShieldAlert size={20} className="flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold">Evidence Restricted</h4>
                <p className="text-xs mt-1 leading-relaxed">{forbiddenError}</p>
              </div>
            </div>
          )}

          {/* Conflict Details If Conflicting */}
          {claim.status === 'Conflicting' && claim.conflictDetails && (
            <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/70 dark:border-rose-900 dark:bg-rose-950/40 space-y-3">
              <div className="flex items-center space-x-2 text-rose-800 dark:text-rose-300">
                <AlertTriangle size={16} />
                <h4 className="text-xs font-bold uppercase tracking-wider">
                  Unresolved Conflict Detected
                </h4>
              </div>
              <p className="text-xs text-rose-700 dark:text-rose-300">
                Two different project sources state contradictory information for this entity. A human lead must select the true value.
              </p>
              <div className="space-y-2 mt-2">
                {(claim.conflictDetails.conflictingValues || []).map((cv: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-lg bg-white dark:bg-navy-900 border border-rose-200 dark:border-rose-800/80 text-xs"
                  >
                    <div className="flex justify-between items-center font-semibold text-slate-800 dark:text-slate-200 mb-1">
                      <span>Value: "{cv.value}"</span>
                      <span className="text-[11px] text-slate-500 font-mono">{cv.spanId}</span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-400 italic">"{cv.quote}"</p>
                    <div className="text-[11px] text-slate-400 mt-1">Source: {cv.source}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Missing Gap Guidance */}
          {claim.status === 'Missing' && (
            <div className="p-4 rounded-xl border border-purple-200 bg-purple-50/70 dark:border-purple-900 dark:bg-purple-950/40 space-y-2">
              <div className="flex items-center space-x-2 text-purple-800 dark:text-purple-300">
                <AlertTriangle size={16} />
                <h4 className="text-xs font-bold uppercase tracking-wider">Knowledge Gap Identified</h4>
              </div>
              <p className="text-xs text-purple-900 dark:text-purple-200 leading-relaxed">
                This item is essential for a smooth handover, but no authorized source records an answer or rationale.
              </p>
              {claim.suggestedPerson && (
                <div className="text-xs bg-white dark:bg-navy-900 p-2.5 rounded-lg border border-purple-200 dark:border-purple-800 flex items-center space-x-2">
                  <User size={14} className="text-purple-600" />
                  <span className="font-semibold text-purple-950 dark:text-purple-200">
                    Suggested Person to Ask:
                  </span>
                  <span className="text-slate-700 dark:text-slate-300">{claim.suggestedPerson}</span>
                </div>
              )}
            </div>
          )}

          {/* Spans and Cited Quotes */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Cited Source Spans ({claim.spanRefs?.length || 0})
            </h3>

            {loading ? (
              <div className="p-6 text-center text-xs text-slate-500">Loading verified span text...</div>
            ) : claim.spanRefs?.length === 0 ? (
              <div className="text-xs text-slate-500 italic p-4 border border-dashed rounded-lg text-center">
                No citations available (Synthesized or gap claim).
              </div>
            ) : (
              claim.spanRefs?.map((ref, idx) => {
                const span = spanDetails.find((s) => s.stableId === ref.spanId);
                const displayText = span ? span.text : ref.quote;

                return (
                  <div
                    key={idx}
                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-navy-900 space-y-2.5 shadow-sm"
                  >
                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-semibold text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/60 px-2 py-0.5 rounded border border-teal-200 dark:border-teal-800">
                          {ref.spanId}
                        </span>
                        {span?.author && (
                          <span className="flex items-center space-x-1">
                            <User size={12} />
                            <span>{span.author}</span>
                          </span>
                        )}
                        {span?.timestamp && (
                          <span className="flex items-center space-x-1">
                            <Clock size={12} />
                            <span>{new Date(span.timestamp).toLocaleDateString()}</span>
                          </span>
                        )}
                      </div>
                      <span className="inline-flex items-center text-emerald-600 dark:text-emerald-400 font-medium">
                        <CheckCircle2 size={12} className="mr-1" /> Deterministically Verified
                      </span>
                    </div>

                    <div className="text-xs font-mono bg-slate-50 dark:bg-navy-950 p-3 rounded-lg border border-slate-200 dark:border-slate-800 leading-relaxed text-slate-800 dark:text-slate-200 overflow-x-auto whitespace-pre-wrap">
                      {highlightQuote(displayText, ref.quote)}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Lead Review Actions Footer */}
        {isLeadRole && (
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-navy-950 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center space-x-2">
              {claim.status === 'Conflicting' && onOpenResolve && (
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => onOpenResolve(claim)}
                >
                  Resolve Conflict
                </Button>
              )}
              {onOpenEdit && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onOpenEdit(claim)}
                >
                  Edit / Attest (E)
                </Button>
              )}
            </div>

            <div className="flex items-center space-x-2">
              {onReject && (
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => onReject(claim._id)}
                >
                  Reject (R)
                </Button>
              )}
              {onApprove && claim.status !== 'Conflicting' && (
                <Button
                  size="sm"
                  variant="success"
                  onClick={() => onApprove(claim._id)}
                >
                  Approve (A)
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
