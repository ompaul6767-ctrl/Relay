import React, { useState, useEffect } from 'react';
import { useCase } from '../context/CaseContext';
import { api } from '../api/client';
import { Claim, ClaimType } from '../types';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { StatusChip } from '../components/common/StatusChip';
import { AclBadge } from '../components/common/AclBadge';
import { EvidenceDrawer } from '../components/evidence/EvidenceDrawer';
import { useNavigate } from 'react-router-dom';
import {
  Cpu,
  Play,
  ArrowRight,
  AlertTriangle,
  HelpCircle,
  CheckCircle2,
  Lock,
  Layers,
  Sparkles,
  ExternalLink,
} from 'lucide-react';

export const ReconstructPage: React.FC = () => {
  const { currentCase, refreshCase, setBannerMessage, bannerMessage } = useCase();
  const navigate = useNavigate();

  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [reconstructing, setReconstructing] = useState<boolean>(false);
  const [summary, setSummary] = useState<any>(null);

  // Evidence Drawer State
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);

  const fetchClaims = async () => {
    if (!currentCase) return;
    setLoading(true);
    try {
      const res = await api.getClaims(currentCase._id);
      if (res.claims) {
        setClaims(res.claims);
        // Calculate status counts
        const byStatus = {
          Verified: res.claims.filter((c: Claim) => c.status === 'Verified').length,
          Attested: res.claims.filter((c: Claim) => c.status === 'Attested').length,
          Inferred: res.claims.filter((c: Claim) => c.status === 'Inferred').length,
          Conflicting: res.claims.filter((c: Claim) => c.status === 'Conflicting').length,
          Missing: res.claims.filter((c: Claim) => c.status === 'Missing').length,
          Restricted: res.claims.filter((c: Claim) => c.status === 'Restricted' || c.isRestrictedStub).length,
          Rejected: res.claims.filter((c: Claim) => c.status === 'Rejected').length,
        };
        setSummary({
          total: res.claims.length,
          byStatus,
          conflictsCount: byStatus.Conflicting,
          gapsCount: byStatus.Missing,
        });
      }
    } catch (err: any) {
      console.error('Failed to fetch claims:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClaims();
  }, [currentCase]);

  const handleRunReconstruct = async () => {
    if (!currentCase) return;
    setReconstructing(true);
    try {
      const res = await api.reconstructCase(currentCase._id);
      if (res.bannerMessage) {
        setBannerMessage(res.bannerMessage);
      } else {
        setBannerMessage(null);
      }
      if (res.summary) {
        setSummary(res.summary);
      }
      await fetchClaims();
      await refreshCase();
    } catch (err: any) {
      console.error('Reconstruction failed:', err);
    } finally {
      setReconstructing(false);
    }
  };

  const handleOpenEvidence = (claim: Claim) => {
    setSelectedClaim(claim);
    setDrawerOpen(true);
  };

  // Group claims by type
  const claimTypes: ClaimType[] = [
    'decision',
    'owner',
    'risk',
    'dependency',
    'question',
    'action',
    'fact',
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="text-xs font-bold text-teal-600 dark:text-teal-400 uppercase tracking-wider">
            Step 2 & 3
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Cpu className="text-teal-600" size={24} />
            Reconstruct & Verify Claims
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Extract atomic facts with Gemini (or deterministic fallback), verify exact span citations, detect conflicting owners, and uncover knowledge gaps.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <Button
            variant="primary"
            size="sm"
            loading={reconstructing}
            onClick={handleRunReconstruct}
            icon={<Play size={14} />}
          >
            {claims.length > 0 ? 'Re-Run Pipeline' : 'Run Reconstruction Pipeline'}
          </Button>

          {claims.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/review')}
              icon={<ArrowRight size={14} />}
            >
              Go to Review Workspace
            </Button>
          )}
        </div>
      </div>

      {/* Summary Strip (Counts by Status, Conflicts, Gaps) */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-navy-900 text-center">
            <div className="text-lg font-extrabold text-slate-800 dark:text-slate-100">
              {summary.total}
            </div>
            <div className="text-[10px] text-slate-400 font-semibold uppercase">Total Facts</div>
          </div>

          <div className="p-3 rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/50 dark:bg-emerald-950/20 text-center">
            <div className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400">
              {summary.byStatus?.Verified ?? 0}
            </div>
            <div className="text-[10px] text-emerald-700 dark:text-emerald-300 font-semibold uppercase">
              Verified
            </div>
          </div>

          <div className="p-3 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/20 text-center">
            <div className="text-lg font-extrabold text-rose-600 dark:text-rose-400">
              {summary.byStatus?.Conflicting ?? 0}
            </div>
            <div className="text-[10px] text-rose-700 dark:text-rose-300 font-semibold uppercase">
              Conflicts
            </div>
          </div>

          <div className="p-3 rounded-xl border border-purple-200 dark:border-purple-900/60 bg-purple-50/50 dark:bg-purple-950/20 text-center">
            <div className="text-lg font-extrabold text-purple-600 dark:text-purple-400">
              {summary.byStatus?.Missing ?? 0}
            </div>
            <div className="text-[10px] text-purple-700 dark:text-purple-300 font-semibold uppercase">
              Gaps
            </div>
          </div>

          <div className="p-3 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/20 text-center">
            <div className="text-lg font-extrabold text-amber-600 dark:text-amber-400">
              {summary.byStatus?.Inferred ?? 0}
            </div>
            <div className="text-[10px] text-amber-700 dark:text-amber-300 font-semibold uppercase">
              Inferred
            </div>
          </div>

          <div className="p-3 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/50 dark:bg-blue-950/20 text-center">
            <div className="text-lg font-extrabold text-blue-600 dark:text-blue-400">
              {summary.byStatus?.Attested ?? 0}
            </div>
            <div className="text-[10px] text-blue-700 dark:text-blue-300 font-semibold uppercase">
              Attested
            </div>
          </div>

          <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 text-center">
            <div className="text-lg font-extrabold text-slate-600 dark:text-slate-300">
              {summary.byStatus?.Restricted ?? 0}
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold uppercase">
              Restricted
            </div>
          </div>
        </div>
      )}

      {/* Claims Grouped by Type */}
      <div className="space-y-8">
        {loading ? (
          <div className="text-xs text-slate-400 p-8 text-center">Loading reconstructed claims...</div>
        ) : claims.length === 0 ? (
          <Card className="p-12 text-center space-y-4">
            <div className="w-12 h-12 mx-auto rounded-full bg-teal-50 dark:bg-teal-950 text-teal-600 flex items-center justify-center">
              <Cpu size={24} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
                Pipeline Not Yet Executed
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                Run the pipeline to extract atomic facts from connected sources, verify citations, and assemble the claim ledger.
              </p>
            </div>
            <Button
              variant="primary"
              size="sm"
              loading={reconstructing}
              onClick={handleRunReconstruct}
              icon={<Play size={14} />}
            >
              Run Reconstruction & Verification
            </Button>
          </Card>
        ) : (
          claimTypes.map((type) => {
            const groupClaims = claims.filter((c) => c.type === type);
            if (groupClaims.length === 0) return null;

            return (
              <div key={type} className="space-y-3">
                <div className="flex items-center justify-between pb-1 border-b border-slate-200 dark:border-slate-800">
                  <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <span className="capitalize">{type}s</span>
                    <span className="text-xs font-normal text-slate-400">
                      ({groupClaims.length})
                    </span>
                  </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {groupClaims.map((claim) => (
                    <Card
                      key={claim._id}
                      hoverable
                      onClick={() => handleOpenEvidence(claim)}
                      className="p-4 flex flex-col justify-between space-y-3 border hover:border-teal-500/70 transition-all"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <StatusChip status={claim.status} size="sm" />
                          <div className="flex items-center space-x-1.5">
                            <AclBadge acl={claim.acl} size="sm" />
                            {claim.reviewDecision === 'approved' && (
                              <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                                Approved
                              </span>
                            )}
                          </div>
                        </div>

                        <p className="text-xs font-medium text-slate-900 dark:text-slate-100 leading-relaxed">
                          {claim.text}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                        <span>
                          {claim.spanRefs?.length || 0} span citation{claim.spanRefs?.length === 1 ? '' : 's'}
                        </span>
                        <span className="text-teal-600 dark:text-teal-400 font-semibold flex items-center space-x-1">
                          <span>Inspect Evidence</span>
                          <ExternalLink size={11} />
                        </span>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Evidence Inspection Drawer */}
      <EvidenceDrawer
        claim={selectedClaim}
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />
    </div>
  );
};
