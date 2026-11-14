import React, { useState, useEffect, useCallback } from 'react';
import { useCase } from '../context/CaseContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { Claim, ClaimStatus, ClaimType, ACL } from '../types';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { StatusChip } from '../components/common/StatusChip';
import { AclBadge } from '../components/common/AclBadge';
import { ResolveModal } from '../components/review/ResolveModal';
import { EditModal } from '../components/review/EditModal';
import { CitationTestModal } from '../components/review/CitationTestModal';
import { useNavigate } from 'react-router-dom';
import {
  ClipboardCheck,
  Check,
  X,
  Edit2,
  AlertTriangle,
  HelpCircle,
  FileText,
  User,
  Clock,
  Send,
  ShieldCheck,
  Sparkles,
  Layers,
  Filter,
} from 'lucide-react';

export const ReviewPage: React.FC = () => {
  const { currentCase, refreshCase } = useCase();
  const { user, role } = useAuth();
  const navigate = useNavigate();

  const isLead = role === 'lead';

  const [claims, setClaims] = useState<Claim[]>([]);
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [publishing, setPublishing] = useState<boolean>(false);
  const [bulkApproving, setBulkApproving] = useState<boolean>(false);

  // Filters
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterAcl, setFilterAcl] = useState<string>('all');
  const [filterDecision, setFilterDecision] = useState<string>('all');

  // Modals
  const [resolveModalOpen, setResolveModalOpen] = useState<boolean>(false);
  const [editModalOpen, setEditModalOpen] = useState<boolean>(false);
  const [citationTestOpen, setCitationTestOpen] = useState<boolean>(false);

  const fetchClaims = async () => {
    if (!currentCase) return;
    setLoading(true);
    try {
      const filters: Record<string, string> = {};
      if (filterStatus !== 'all') filters.status = filterStatus;
      if (filterType !== 'all') filters.type = filterType;
      if (filterDecision !== 'all') filters.reviewDecision = filterDecision;

      const res = await api.getClaims(currentCase._id, filters);
      if (res.claims) {
        setClaims(res.claims);
        // Default select first claim if none selected
        if (!selectedClaim && res.claims.length > 0) {
          setSelectedClaim(res.claims[0]);
        } else if (selectedClaim) {
          const updated = res.claims.find((c: Claim) => c._id === selectedClaim._id);
          if (updated) setSelectedClaim(updated);
        }
      }
    } catch (err: any) {
      console.error('Failed to fetch claims:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClaims();
  }, [currentCase, filterStatus, filterType, filterDecision]);

  // Review Actions
  const handleApprove = async (claimId: string) => {
    if (!isLead) return;
    try {
      await api.patchClaim(claimId, { action: 'approve' });
      await fetchClaims();
      await refreshCase();
    } catch (err: any) {
      alert(err.message || 'Approval failed');
    }
  };

  const handleReject = async (claimId: string) => {
    if (!isLead) return;
    try {
      await api.patchClaim(claimId, { action: 'reject' });
      await fetchClaims();
      await refreshCase();
    } catch (err: any) {
      alert(err.message || 'Rejection failed');
    }
  };

  const handleEditSave = async (claimId: string, text: string, value: string, notes: string) => {
    if (!isLead) return;
    try {
      await api.patchClaim(claimId, {
        action: 'edit',
        text,
        value,
        reviewNotes: notes,
      });
      await fetchClaims();
      await refreshCase();
    } catch (err: any) {
      alert(err.message || 'Edit failed');
    }
  };

  const handleResolveConflict = async (claimId: string, value: string, notes: string) => {
    if (!isLead) return;
    try {
      await api.patchClaim(claimId, {
        action: 'resolve',
        value,
        reviewNotes: notes,
      });
      await fetchClaims();
      await refreshCase();
    } catch (err: any) {
      alert(err.message || 'Resolution failed');
    }
  };

  // Bulk Approve Verified Claims Only
  const handleBulkApprove = async () => {
    if (!isLead || !currentCase) return;
    const verifiedPending = claims.filter(
      (c) => c.status === 'Verified' && c.reviewDecision === 'pending'
    );
    if (verifiedPending.length === 0) {
      alert('No pending Verified claims found for bulk approval. Note: Conflicting and Missing claims must be opened and reviewed individually.');
      return;
    }

    setBulkApproving(true);
    try {
      await api.bulkApproveClaims(
        currentCase._id,
        verifiedPending.map((c) => c._id)
      );
      await fetchClaims();
      await refreshCase();
    } catch (err: any) {
      alert(err.message || 'Bulk approval failed');
    } finally {
      setBulkApproving(false);
    }
  };

  // Publish Version
  const handlePublish = async () => {
    if (!isLead || !currentCase) return;
    setPublishing(true);
    try {
      const res = await api.publishVersion(currentCase._id);
      await refreshCase();
      navigate('/handover');
    } catch (err: any) {
      alert(err.message || 'Publishing failed. Please approve at least one claim.');
    } finally {
      setPublishing(false);
    }
  };

  // Keyboard Shortcuts: A -> Approve, R -> Reject, E -> Edit
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Don't trigger if typing inside an input/textarea
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;
      if (!selectedClaim || !isLead) return;

      if (e.key === 'a' || e.key === 'A') {
        if (selectedClaim.status !== 'Conflicting') {
          handleApprove(selectedClaim._id);
        }
      } else if (e.key === 'r' || e.key === 'R') {
        handleReject(selectedClaim._id);
      } else if (e.key === 'e' || e.key === 'E') {
        setEditModalOpen(true);
      }
    },
    [selectedClaim, isLead]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const highlightQuote = (text: string, quote: string) => {
    if (!quote) return text;
    const clean = quote.trim();
    const idx = text.toLowerCase().indexOf(clean.toLowerCase());
    if (idx === -1) return text;
    return (
      <>
        {text.substring(0, idx)}
        <mark className="bg-amber-200 dark:bg-amber-900/60 text-slate-900 dark:text-amber-100 font-semibold px-1 rounded border-b-2 border-amber-500 animate-pulse">
          {text.substring(idx, idx + clean.length)}
        </mark>
        {text.substring(idx + clean.length)}
      </>
    );
  };

  const pendingCount = claims.filter((c) => c.reviewDecision === 'pending').length;
  const approvedCount = claims.filter((c) => c.reviewDecision === 'approved').length;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Top Bar with Lead Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="text-xs font-bold text-teal-600 dark:text-teal-400 uppercase tracking-wider">
            Step 4: Lead Review Workspace
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ClipboardCheck className="text-teal-600" size={24} />
            Human Lead Approval Gate
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Review claims side-by-side with source text. Shortcuts: <code>A</code> Approve, <code>R</code> Reject, <code>E</code> Edit.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Test Citation Check Button */}
          <Button
            size="sm"
            variant="outline"
            onClick={() => setCitationTestOpen(true)}
            icon={<ShieldCheck size={14} className="text-teal-600" />}
          >
            Test Citation Check (Live Demo)
          </Button>

          {isLead && (
            <>
              <Button
                size="sm"
                variant="outline"
                loading={bulkApproving}
                onClick={handleBulkApprove}
                icon={<Check size={14} className="text-emerald-600" />}
              >
                Bulk Approve Verified
              </Button>

              <Button
                size="sm"
                variant="primary"
                loading={publishing}
                onClick={handlePublish}
                disabled={approvedCount === 0}
                icon={<Send size={14} />}
              >
                Publish Handover Plan ({approvedCount} Approved)
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center gap-3 p-3 bg-white dark:bg-navy-900 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
        <div className="flex items-center space-x-1.5 text-slate-500 font-semibold pr-2 border-r border-slate-200 dark:border-slate-800">
          <Filter size={14} />
          <span>Filters:</span>
        </div>

        {/* Status Filter */}
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-navy-950 font-medium"
        >
          <option value="all">All Statuses ({claims.length})</option>
          <option value="Verified">Verified Only</option>
          <option value="Conflicting">Conflicting Only</option>
          <option value="Missing">Missing Gaps Only</option>
          <option value="Inferred">Inferred Only</option>
          <option value="Attested">Attested Only</option>
        </select>

        {/* Type Filter */}
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-navy-950 font-medium"
        >
          <option value="all">All Types</option>
          <option value="owner">Owner</option>
          <option value="decision">Decision</option>
          <option value="risk">Risk</option>
          <option value="dependency">Dependency</option>
          <option value="question">Question</option>
          <option value="action">Action</option>
        </select>

        {/* Decision Filter */}
        <select
          value={filterDecision}
          onChange={(e) => setFilterDecision(e.target.value)}
          className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-navy-950 font-medium"
        >
          <option value="all">All Decisions</option>
          <option value="pending">Pending Review Only ({pendingCount})</option>
          <option value="approved">Approved Only ({approvedCount})</option>
          <option value="rejected">Rejected Only</option>
        </select>

        <div className="ml-auto text-slate-400 font-mono text-[11px]">
          Showing {claims.length} claim(s)
        </div>
      </div>

      {/* Split View Review Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Claim List (5 cols) */}
        <div className="lg:col-span-5 space-y-3 max-h-[calc(100vh-16rem)] overflow-y-auto pr-1">
          {loading ? (
            <div className="p-8 text-center text-xs text-slate-400">Loading claims...</div>
          ) : claims.length === 0 ? (
            <Card className="p-8 text-center text-xs text-slate-500">
              No claims match the active filter criteria.
            </Card>
          ) : (
            claims.map((claim) => {
              const isSelected = selectedClaim?._id === claim._id;
              const isPending = claim.reviewDecision === 'pending';

              return (
                <div
                  key={claim._id}
                  onClick={() => setSelectedClaim(claim)}
                  className={`p-4 rounded-xl border text-xs cursor-pointer transition-all ${
                    isSelected
                      ? 'border-teal-500 bg-teal-50/50 dark:bg-teal-950/40 shadow-sm ring-1 ring-teal-500/50'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-navy-900 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <StatusChip status={claim.status} size="sm" />
                    <div className="flex items-center space-x-1.5">
                      <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                        {claim.type}
                      </span>
                      {claim.reviewDecision === 'approved' ? (
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950 px-1.5 py-0.5 rounded">
                          Approved
                        </span>
                      ) : claim.reviewDecision === 'rejected' ? (
                        <span className="text-[10px] font-bold text-rose-600 bg-rose-50 dark:bg-rose-950 px-1.5 py-0.5 rounded">
                          Rejected
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-950 px-1.5 py-0.5 rounded">
                          Pending
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="font-medium text-slate-900 dark:text-slate-100 line-clamp-2 leading-relaxed">
                    {claim.text}
                  </p>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80 mt-2 text-[11px] text-slate-400">
                    <span>{claim.spanRefs?.length || 0} citations</span>
                    {claim.value && (
                      <span className="font-mono text-slate-600 dark:text-slate-300 truncate max-w-[140px]">
                        {claim.value}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right Column: Evidence Panel & Verification Deep Dive (7 cols) */}
        <div className="lg:col-span-7">
          {selectedClaim ? (
            <Card className="p-6 space-y-6 border-slate-300 dark:border-slate-800 shadow-sm sticky top-24">
              {/* Header */}
              <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <StatusChip status={selectedClaim.status} />
                    <AclBadge acl={selectedClaim.acl} size="sm" />
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 uppercase font-semibold">
                      {selectedClaim.type}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white pt-1">
                    {selectedClaim.text}
                  </h3>
                </div>

                {/* Status indicator */}
                <div className="text-right">
                  <span
                    className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                      selectedClaim.reviewDecision === 'approved'
                        ? 'bg-emerald-100 text-emerald-800'
                        : selectedClaim.reviewDecision === 'rejected'
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {selectedClaim.reviewDecision.toUpperCase()}
                  </span>
                  {selectedClaim.reviewedBy && (
                    <div className="text-[10px] text-slate-400 mt-1">
                      by {selectedClaim.reviewedBy}
                    </div>
                  )}
                </div>
              </div>

              {/* Conflict Alert & Resolution */}
              {selectedClaim.status === 'Conflicting' && (
                <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/70 dark:border-rose-900 dark:bg-rose-950/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-rose-700 dark:text-rose-300 font-bold text-xs uppercase">
                      <AlertTriangle size={16} />
                      <span>Planted Conflict Detected</span>
                    </div>
                    {isLead && (
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => setResolveModalOpen(true)}
                      >
                        Resolve Conflict
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-rose-800 dark:text-rose-200 leading-relaxed">
                    Two sources state contradictory values for "{selectedClaim.entityKey}". Both are shown with dates. The lead must select the true value.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                    {(selectedClaim.conflictDetails?.conflictingValues || []).map((cv: any, i: number) => (
                      <div
                        key={i}
                        className="p-3 rounded-lg bg-white dark:bg-navy-900 border border-rose-200 dark:border-rose-800 text-xs"
                      >
                        <div className="font-semibold text-slate-800 dark:text-slate-200">
                          Value: "{cv.value}"
                        </div>
                        <div className="text-slate-500 italic mt-1">"{cv.quote}"</div>
                        <div className="text-[10px] text-slate-400 mt-1">
                          Source: {cv.source} ({cv.spanId})
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Missing Gap Guidance */}
              {selectedClaim.status === 'Missing' && (
                <div className="p-4 rounded-xl border border-purple-200 bg-purple-50/70 dark:border-purple-900 dark:bg-purple-950/40 space-y-2">
                  <div className="flex items-center space-x-2 text-purple-700 dark:text-purple-300 font-bold text-xs uppercase">
                    <HelpCircle size={16} />
                    <span>Planted Knowledge Gap (Missing)</span>
                  </div>
                  <p className="text-xs text-purple-900 dark:text-purple-200">
                    A required item is not answered in the project sources.
                  </p>
                  {selectedClaim.suggestedPerson && (
                    <div className="text-xs bg-white dark:bg-navy-900 p-2.5 rounded-lg border border-purple-200 dark:border-purple-800 flex items-center space-x-2">
                      <User size={14} className="text-purple-600" />
                      <span className="font-semibold text-purple-950 dark:text-purple-200">
                        Suggested Person to Ask:
                      </span>
                      <span className="text-slate-700 dark:text-slate-300">
                        {selectedClaim.suggestedPerson}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* AI Support Verdict Strip */}
              <div className="flex items-center justify-between p-3 rounded-lg border border-teal-200 bg-teal-50/50 dark:border-teal-900 dark:bg-teal-950/30">
                <div className="flex items-center space-x-2">
                  <Sparkles size={16} className="text-teal-600" />
                  <span className="text-xs font-semibold text-teal-950 dark:text-teal-200">
                    Second-Pass Support Check:
                  </span>
                </div>
                <span
                  className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                    selectedClaim.aiSupportVerdict === 'yes'
                      ? 'bg-emerald-100 text-emerald-800'
                      : selectedClaim.aiSupportVerdict === 'partial'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  {selectedClaim.aiSupportVerdict?.toUpperCase() || 'EVALUATED'}
                </span>
              </div>

              {/* Verbatim Source Evidence */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Cited Source Text & Highlighted Quote
                </h4>

                {selectedClaim.spanRefs?.length === 0 ? (
                  <div className="p-4 rounded-xl border border-dashed text-xs text-slate-400 text-center italic">
                    No span citations (synthetic gap or unassigned claim).
                  </div>
                ) : (
                  selectedClaim.spanRefs?.map((ref, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-navy-950 space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between text-slate-500 text-[11px]">
                        <span className="font-mono font-bold text-teal-700 dark:text-teal-400">
                          Span ID: {ref.spanId}
                        </span>
                        <span className="text-emerald-600 font-semibold flex items-center space-x-1">
                          <Check size={12} />
                          <span>Exact Whitespace Match</span>
                        </span>
                      </div>

                      <div className="font-mono p-3 rounded-lg bg-white dark:bg-navy-900 border border-slate-200 dark:border-slate-800 leading-relaxed text-slate-800 dark:text-slate-200">
                        {highlightQuote(ref.quote, ref.quote)}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Action Buttons Footer */}
              {isLead ? (
                <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditModalOpen(true)}
                      icon={<Edit2 size={13} />}
                    >
                      Edit & Attest (E)
                    </Button>
                    {selectedClaim.status === 'Conflicting' && (
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => setResolveModalOpen(true)}
                      >
                        Resolve Conflict
                      </Button>
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => handleReject(selectedClaim._id)}
                      icon={<X size={14} />}
                    >
                      Reject (R)
                    </Button>
                    {selectedClaim.status !== 'Conflicting' && (
                      <Button
                        size="sm"
                        variant="success"
                        onClick={() => handleApprove(selectedClaim._id)}
                        icon={<Check size={14} />}
                      >
                        Approve (A)
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs text-slate-500 text-center">
                  You are viewing as <strong>{role}</strong>. Switch to <strong>Engineering Lead</strong> to approve, edit, or reject claims.
                </div>
              )}
            </Card>
          ) : (
            <Card className="p-12 text-center text-xs text-slate-400">
              Select a claim on the left to inspect its evidence and approval actions.
            </Card>
          )}
        </div>
      </div>

      {/* Modals */}
      <ResolveModal
        claim={selectedClaim}
        isOpen={resolveModalOpen}
        onClose={() => setResolveModalOpen(false)}
        onResolve={handleResolveConflict}
      />

      <EditModal
        claim={selectedClaim}
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        onSave={handleEditSave}
        reviewerName={user?.name || 'Maya (Lead)'}
      />

      <CitationTestModal
        caseId={currentCase?._id || ''}
        isOpen={citationTestOpen}
        onClose={() => setCitationTestOpen(false)}
      />
    </div>
  );
};
