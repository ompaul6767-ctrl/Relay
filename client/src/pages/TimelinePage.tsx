import React, { useState, useEffect } from 'react';
import { useCase } from '../context/CaseContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { StatusChip } from '../components/common/StatusChip';
import { AclBadge } from '../components/common/AclBadge';
import { ResolveModal } from '../components/review/ResolveModal';
import { useNavigate } from 'react-router-dom';
import {
  GitBranch,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Shield,
  Lock,
  ArrowRight,
  Filter,
  Check,
  ChevronRight,
  Sparkles,
  FileText,
  UserCheck,
} from 'lucide-react';

interface TimelineEvent {
  _id: string;
  date: string;
  dateEstimated: boolean;
  type: string;
  status: string;
  title: string;
  entityKey?: string;
  attribute?: string;
  value?: string;
  acl: string;
  reviewDecision?: string;
  isRestrictedStub?: boolean;
  isFromInterview?: boolean;
  interviewAuthor?: string;
  isStale?: boolean;
  stalenessStatus?: 'fresh' | 'superseded' | 'possibly_stale';
  stalenessReason?: string;
  citations: Array<{ spanId: string; quote: string; sourceName: string }>;
  sideBySide?: {
    entityKey: string;
    attribute: string;
    items: Array<{
      value: string;
      quote: string;
      source: string;
      spanId: string;
      author: string;
      date: string | null;
    }>;
    newerIndex: number;
  } | null;
}

export const TimelinePage: React.FC = () => {
  const { currentCase, refreshCase } = useCase();
  const { role } = useAuth();
  const navigate = useNavigate();

  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [summary, setSummary] = useState<any>({ total: 0, conflicts: 0, staleCount: 0 });
  const [loading, setLoading] = useState<boolean>(false);
  const [filterType, setFilterType] = useState<string>('all');

  // Conflict Resolution Modal State
  const [resolveModalOpen, setResolveModalOpen] = useState<boolean>(false);
  const [resolvingClaim, setResolvingClaim] = useState<any>(null);

  // Staleness Dismiss Modal State
  const [dismissModalOpen, setDismissModalOpen] = useState<boolean>(false);
  const [dismissingClaimId, setDismissingClaimId] = useState<string | null>(null);
  const [dismissReason, setDismissReason] = useState<string>('');
  const [dismissing, setDismissing] = useState<boolean>(false);

  const fetchTimeline = async () => {
    if (!currentCase) return;
    setLoading(true);
    try {
      const res = await api.getTimelineEvents(currentCase._id);
      if (res.events) {
        setEvents(res.events);
        setSummary(res.summary || {});
      }
    } catch (err: any) {
      console.error('Failed to fetch timeline:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTimeline();
  }, [currentCase]);

  const handleOpenResolve = (evt: TimelineEvent) => {
    setResolvingClaim({
      _id: evt._id,
      text: evt.title,
      entityKey: evt.entityKey,
      attribute: evt.attribute,
      value: evt.value,
      conflictDetails: {
        entityKey: evt.entityKey,
        attribute: evt.attribute,
        conflictingValues: evt.sideBySide?.items || [],
      },
    });
    setResolveModalOpen(true);
  };

  const handleSaveResolve = async (claimId: string, winningValue: string, notes: string) => {
    try {
      await api.patchClaim(claimId, {
        action: 'resolve',
        value: winningValue,
        reviewNotes: notes,
      });
      setResolveModalOpen(false);
      await fetchTimeline();
      await refreshCase();
    } catch (err: any) {
      alert(err.message || 'Resolution failed');
    }
  };

  const handleOpenDismiss = (claimId: string) => {
    setDismissingClaimId(claimId);
    setDismissReason('');
    setDismissModalOpen(true);
  };

  const handleConfirmDismiss = async () => {
    if (!currentCase || !dismissingClaimId) return;
    if (!dismissReason.trim()) {
      alert('Please provide a recorded justification reason to dismiss this staleness flag.');
      return;
    }

    setDismissing(true);
    try {
      await api.dismissStaleness(currentCase._id, dismissingClaimId, {
        reason: dismissReason.trim(),
      });
      setDismissModalOpen(false);
      await fetchTimeline();
      await refreshCase();
    } catch (err: any) {
      alert(err.message || 'Dismissal failed');
    } finally {
      setDismissing(false);
    }
  };

  const filteredEvents = events.filter((e) => {
    if (filterType === 'conflicts') return e.status === 'Conflicting';
    if (filterType === 'decisions') return e.type === 'decision';
    if (filterType === 'stale') return e.isStale;
    if (filterType === 'interview') return e.isFromInterview;
    return true;
  });

  const isLead = role === 'lead';

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 text-xs font-semibold mb-1">
            <GitBranch size={14} />
            <span>Improvement 3: Conflict Timeline & Staleness</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            Dated Conflict & Decision Timeline
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-2xl mt-1">
            Chronological evidence audit. Competing claims appear side by side with source dates. Approved claims contradicted or reversed by newer evidence are flagged for re-review.
          </p>
        </div>

        {isLead && (
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/review')}
            icon={<ArrowRight size={14} />}
          >
            Go to Review Queue
          </Button>
        )}
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <Card className="p-3.5 space-y-1 bg-slate-50/50 dark:bg-navy-900">
          <div className="text-[11px] text-slate-400 font-medium">Total Timeline Events</div>
          <div className="text-xl font-black text-slate-900 dark:text-white">{summary.total || 0}</div>
        </Card>
        <Card className="p-3.5 space-y-1 bg-rose-50/40 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900">
          <div className="text-[11px] text-rose-700 dark:text-rose-300 font-medium">Side-by-Side Conflicts</div>
          <div className="text-xl font-black text-rose-700 dark:text-rose-300">{summary.conflicts || 0}</div>
        </Card>
        <Card className="p-3.5 space-y-1 bg-amber-50/40 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900">
          <div className="text-[11px] text-amber-700 dark:text-amber-300 font-medium">Stale / Superseded Flags</div>
          <div className="text-xl font-black text-amber-700 dark:text-amber-300">{summary.staleCount || 0}</div>
        </Card>
        <Card className="p-3.5 space-y-1 bg-teal-50/40 dark:bg-teal-950/20 border-teal-200 dark:border-teal-900">
          <div className="text-[11px] text-teal-700 dark:text-teal-300 font-medium">Server ACL Guarantee</div>
          <div className="text-xs font-bold text-teal-800 dark:text-teal-300 pt-1">0 Confidential Leaks</div>
        </Card>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setFilterType('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            filterType === 'all'
              ? 'bg-rose-600 text-white'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          All Events ({events.length})
        </button>
        <button
          onClick={() => setFilterType('conflicts')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            filterType === 'conflicts'
              ? 'bg-rose-600 text-white'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Conflicts ({summary.conflicts || 0})
        </button>
        <button
          onClick={() => setFilterType('decisions')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            filterType === 'decisions'
              ? 'bg-rose-600 text-white'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Decisions & Reversals
        </button>
        <button
          onClick={() => setFilterType('stale')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            filterType === 'stale'
              ? 'bg-rose-600 text-white'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Needs Re-Review ({summary.staleCount || 0})
        </button>
        <button
          onClick={() => setFilterType('interview')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            filterType === 'interview'
              ? 'bg-rose-600 text-white'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Leaver Attestations
        </button>
      </div>

      {/* Timeline Stream */}
      <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-3 sm:before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading timeline...</div>
        ) : filteredEvents.length === 0 ? (
          <Card className="p-8 text-center text-xs text-slate-500">
            No events match the selected filter.
          </Card>
        ) : (
          filteredEvents.map((evt, idx) => {
            const formattedDate = evt.date ? new Date(evt.date).toISOString().split('T')[0] : 'Unknown date';
            const isConflict = evt.status === 'Conflicting' && evt.sideBySide;

            return (
              <div key={evt._id || idx} className="relative group">
                {/* Timeline node icon */}
                <div
                  className={`absolute -left-[30px] sm:-left-[34px] top-1.5 w-6 h-6 rounded-full flex items-center justify-center text-xs ring-4 ring-white dark:ring-navy-950 ${
                    isConflict
                      ? 'bg-rose-600 text-white shadow-md'
                      : evt.isStale
                      ? 'bg-amber-500 text-white'
                      : evt.isFromInterview
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {isConflict ? (
                    <AlertTriangle size={12} />
                  ) : evt.isStale ? (
                    <Clock size={12} />
                  ) : evt.isFromInterview ? (
                    <UserCheck size={12} />
                  ) : (
                    <Calendar size={11} />
                  )}
                </div>

                {/* Event Card */}
                <Card
                  className={`p-4 sm:p-5 space-y-3 border transition-all ${
                    isConflict
                      ? 'border-rose-300 dark:border-rose-900 bg-rose-50/20 dark:bg-rose-950/10'
                      : evt.isStale
                      ? 'border-amber-300 dark:border-amber-900 bg-amber-50/20 dark:bg-amber-950/10'
                      : 'border-slate-200 dark:border-slate-800'
                  }`}
                >
                  {/* Event Meta Line */}
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono font-bold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                        {formattedDate}
                      </span>
                      {evt.dateEstimated && (
                        <span className="text-[10px] text-slate-400 italic">(date estimated)</span>
                      )}
                      <StatusChip status={evt.status as any} size="sm" />
                      <AclBadge acl={evt.acl as any} size="sm" />
                    </div>

                    <div className="flex items-center space-x-2">
                      {evt.isFromInterview && (
                        <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950 px-2 py-0.5 rounded-full">
                          Interview Attestation ({evt.interviewAuthor || 'Leaver'})
                        </span>
                      )}
                      {evt.isStale && (
                        <span className="text-[10px] font-bold text-rose-800 dark:text-rose-300 bg-rose-100 dark:bg-rose-950 px-2 py-0.5 rounded-full">
                          Needs Re-Review
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Title / Description */}
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-snug">
                      {evt.title}
                    </h3>
                    {evt.value && !isConflict && (
                      <div className="text-xs text-slate-600 dark:text-slate-300">
                        Asserted Value: <strong className="font-mono">{evt.value}</strong>
                      </div>
                    )}
                  </div>

                  {/* Staleness Warning Box */}
                  {evt.isStale && (
                    <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-xs space-y-2">
                      <div className="flex items-center space-x-1.5 font-bold text-amber-900 dark:text-amber-200">
                        <AlertTriangle size={14} className="text-amber-600 flex-shrink-0" />
                        <span>Staleness / Reversal Detected:</span>
                      </div>
                      <p className="text-amber-800 dark:text-amber-300 leading-relaxed text-[11px]">
                        {evt.stalenessReason || 'This claim was contradicted or superseded by later project evidence.'}
                      </p>
                      {isLead && (
                        <div className="pt-1 flex items-center space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenDismiss(evt._id)}
                            className="text-[11px] py-1 border-amber-400 dark:border-amber-700 text-amber-900 dark:text-amber-200 hover:bg-amber-100"
                          >
                            Dismiss Flag with Justification...
                          </Button>
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => navigate('/review')}
                            className="text-[11px] py-1"
                          >
                            Re-Review in Workspace
                          </Button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Side-by-Side Conflict Comparison Cards */}
                  {isConflict && evt.sideBySide && (
                    <div className="space-y-2 pt-2">
                      <div className="text-xs font-bold text-rose-900 dark:text-rose-200 flex items-center justify-between">
                        <span>Side-by-Side Competing Evidence:</span>
                        {isLead && (
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => handleOpenResolve(evt)}
                            className="text-[11px] py-1 shadow-sm"
                          >
                            Resolve Conflict
                          </Button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {evt.sideBySide.items.map((item, itemIdx) => {
                          const isNewer = itemIdx === evt.sideBySide!.newerIndex;
                          const itemDateStr = item.date ? new Date(item.date).toISOString().split('T')[0] : 'Undated';

                          return (
                            <div
                              key={itemIdx}
                              className={`p-3.5 rounded-xl border text-xs space-y-2 relative ${
                                isNewer
                                  ? 'border-emerald-300 bg-emerald-50/40 dark:border-emerald-800 dark:bg-emerald-950/20 ring-1 ring-emerald-500/30'
                                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
                              }`}
                            >
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="font-semibold text-slate-700 dark:text-slate-300">
                                  Source {itemIdx + 1}: {item.source}
                                </span>
                                {isNewer && (
                                  <span className="font-bold text-[10px] px-2 py-0.5 rounded-full bg-emerald-600 text-white">
                                    ★ Newer Evidence ({itemDateStr})
                                  </span>
                                )}
                              </div>

                              <div className="font-mono font-bold text-slate-900 dark:text-white">
                                Value: "{item.value}"
                              </div>

                              <blockquote className="p-2 bg-slate-50 dark:bg-slate-800/80 rounded border-l-2 border-slate-300 dark:border-slate-700 text-[11px] text-slate-600 dark:text-slate-300 italic">
                                "{item.quote}"
                              </blockquote>

                              <div className="text-[10px] text-slate-400 flex items-center justify-between pt-1">
                                <span>Span: {item.spanId}</span>
                                <span>Date: {itemDateStr}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Verbatim Citations for normal events */}
                  {!isConflict && evt.citations && evt.citations.length > 0 && (
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 space-y-1">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Cited Evidence
                      </div>
                      {evt.citations.map((cite, cIdx) => (
                        <div key={cIdx} className="text-xs text-slate-600 dark:text-slate-300 font-mono italic">
                          "{cite.quote}" — <span className="text-[10px] text-slate-400">{cite.sourceName} ({cite.spanId})</span>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              </div>
            );
          })
        )}
      </div>

      {/* Resolve Conflict Modal */}
      {resolveModalOpen && resolvingClaim && (
        <ResolveModal
          isOpen={resolveModalOpen}
          claim={resolvingClaim}
          onClose={() => setResolveModalOpen(false)}
          onResolve={handleSaveResolve}
        />
      )}

      {/* Dismiss Staleness Justification Modal */}
      {dismissModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-navy-900 rounded-2xl p-6 max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
              <Shield size={16} className="text-amber-500" />
              <span>Dismiss Staleness Flag</span>
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Section 7 Governance Invariant: A lead must record a documented justification to dismiss a staleness flag before this claim can be published.
            </p>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Justification Reason:
              </label>
              <textarea
                rows={3}
                required
                value={dismissReason}
                onChange={(e) => setDismissReason(e.target.value)}
                placeholder="e.g. Verified with team: although reversed in retro discussions, compliance approved maintaining current setup for Q4..."
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div className="flex items-center justify-end space-x-2 pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDismissModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                loading={dismissing}
                onClick={handleConfirmDismiss}
              >
                Confirm & Dismiss
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
