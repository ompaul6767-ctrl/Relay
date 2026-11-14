import React, { useState, useEffect } from 'react';
import { useCase } from '../context/CaseContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { Claim, Version } from '../types';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { StatusChip } from '../components/common/StatusChip';
import { AclBadge } from '../components/common/AclBadge';
import { EvidenceDrawer } from '../components/evidence/EvidenceDrawer';
import {
  Send,
  Printer,
  Calendar,
  CheckCircle2,
  Lock,
  User,
  Shield,
  HelpCircle,
  AlertTriangle,
  Clock,
  Layers,
  Sparkles,
  MessageCircle,
  ExternalLink,
  ChevronDown,
} from 'lucide-react';

export const HandoverPage: React.FC = () => {
  const { currentCase } = useCase();
  const { user, role } = useAuth();

  const [handoverData, setHandoverData] = useState<any>(null);
  const [versions, setVersions] = useState<Version[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<number | undefined>(undefined);
  const [loading, setLoading] = useState<boolean>(false);

  // Evidence Drawer
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);

  // Acknowledgement & Question
  const [acknowledged, setAcknowledged] = useState<boolean>(false);
  const [questionText, setQuestionText] = useState<string>('');
  const [ackLoading, setAckLoading] = useState<boolean>(false);
  const [ackMessage, setAckMessage] = useState<string | null>(null);

  // Stretch Q&A
  const [askQuery, setAskQuery] = useState<string>('');
  const [askLoading, setAskLoading] = useState<boolean>(false);
  const [askResponse, setAskResponse] = useState<any>(null);

  const fetchHandover = async (ver?: number) => {
    if (!currentCase) return;
    setLoading(true);
    try {
      const res = await api.getHandover(currentCase._id, ver);
      setHandoverData(res);
      if (res.acknowledgement) {
        setAcknowledged(true);
      } else {
        setAcknowledged(false);
      }
    } catch (err: any) {
      console.error('Failed to load handover:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchVersions = async () => {
    if (!currentCase) return;
    try {
      const res = await api.getVersions(currentCase._id);
      if (res.versions) {
        setVersions(res.versions);
      }
    } catch (err) {
      console.error('Failed to fetch versions:', err);
    }
  };

  useEffect(() => {
    fetchHandover(selectedVersion);
    fetchVersions();
  }, [currentCase, role, selectedVersion]);

  const handleAcknowledge = async () => {
    if (!currentCase || !handoverData) return;
    setAckLoading(true);
    setAckMessage(null);
    try {
      const res = await api.acknowledgeVersion(currentCase._id, {
        versionNumber: handoverData.activeVersionNumber || 1,
        question: questionText.trim() || undefined,
      });
      setAcknowledged(true);
      setAckMessage(res.message || 'Receipt acknowledged.');
      setQuestionText('');
    } catch (err: any) {
      alert(err.message || 'Failed to acknowledge receipt.');
    } finally {
      setAckLoading(false);
    }
  };

  const handleAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCase || !askQuery.trim()) return;
    setAskLoading(true);
    setAskResponse(null);
    try {
      const res = await api.askQuestion(currentCase._id, askQuery.trim());
      setAskResponse(res);
    } catch (err: any) {
      setAskResponse({ error: err.message || 'Failed to answer question.' });
    } finally {
      setAskLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const sections = handoverData?.sections || {};

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-16 print:p-0 print:max-w-none">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800 print:hidden">
        <div>
          <div className="text-xs font-bold text-teal-600 dark:text-teal-400 uppercase tracking-wider">
            Step 5: Handover Plan
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Project Continuation & Handover
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Assembled strictly from approved claims. Server-side ACL filtered for role: <strong>{role}</strong>.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Version Selector */}
          {versions.length > 0 && (
            <select
              value={selectedVersion || handoverData?.activeVersionNumber || ''}
              onChange={(e) => setSelectedVersion(Number(e.target.value))}
              className="text-xs px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-navy-900 font-semibold"
            >
              {versions.map((v) => (
                <option key={v.number} value={v.number}>
                  Version {v.number} ({new Date(v.publishedAt).toLocaleDateString()})
                </option>
              ))}
            </select>
          )}

          <Button
            size="sm"
            variant="outline"
            onClick={handlePrint}
            icon={<Printer size={14} />}
          >
            Print / PDF Export
          </Button>
        </div>
      </div>

      {/* Printable Document Sheet */}
      <div className="bg-white dark:bg-navy-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-6 md:p-8 shadow-sm space-y-6 sm:space-y-8 print:border-none print:shadow-none print:p-0">
        {/* Document Title Banner */}
        <div className="border-b border-slate-200 dark:border-slate-800 pb-6 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-950 px-2.5 py-1 rounded border border-teal-200 dark:border-teal-800">
              Handover Dossier • Version {handoverData?.activeVersionNumber || 1}
            </span>
            <span className="text-xs text-slate-400 font-mono">
              Published: {new Date().toLocaleDateString()}
            </span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
            {currentCase?.title || 'Project Handover'}
          </h2>

          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 dark:text-slate-400 pt-1">
            <div>
              Departing Member:{' '}
              <strong className="text-slate-800 dark:text-slate-200">
                {currentCase?.departingMemberName}
              </strong>
            </div>
            <span>•</span>
            <div>
              Audience Persona:{' '}
              <strong className="text-slate-800 dark:text-slate-200 capitalize">
                {role.replace('_', ' ')}
              </strong>
            </div>
            <span>•</span>
            <div className="flex items-center space-x-1 text-emerald-600 font-semibold">
              <Shield size={13} />
              <span>Evidence-Backed & Lead Approved</span>
            </div>
          </div>
        </div>

        {/* Restricted Stubs Banner (Section 2 & 5.5) */}
        {handoverData?.restrictedStub && (
          <div className="p-4 rounded-xl border border-slate-300 bg-slate-100 dark:border-slate-700 dark:bg-slate-800/80 flex items-center justify-between text-xs text-slate-700 dark:text-slate-300">
            <div className="flex items-center space-x-2.5">
              <Lock size={16} className="text-slate-500" />
              <span>
                <strong>Confidential Content Guard:</strong> {handoverData.restrictedStub.label}
              </span>
            </div>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold">
              {handoverData.restrictedStub.count} Restricted Stub{handoverData.restrictedStub.count === 1 ? '' : 's'}
            </span>
          </div>
        )}

        {/* Section 1: Who Owns What */}
        <section className="space-y-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800 pb-2">
            1. Who Owns What (Ownership & Key Contacts)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {(sections.whoOwnsWhat || []).map((c: Claim) => (
              <div
                key={c._id}
                onClick={() => {
                  setSelectedClaim(c);
                  setDrawerOpen(true);
                }}
                className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-teal-500 cursor-pointer transition-all space-y-1.5"
              >
                <div className="flex items-center justify-between text-xs">
                  <StatusChip status={c.status} size="sm" />
                  <span className="text-[11px] text-teal-600 dark:text-teal-400 font-semibold flex items-center space-x-0.5">
                    <span>Evidence</span>
                    <ExternalLink size={10} />
                  </span>
                </div>
                <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                  {c.text}
                </p>
                {c.value && (
                  <div className="text-[11px] text-slate-500 font-mono">
                    Owner: <strong>{c.value}</strong>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Section 2: Decisions and Why */}
        <section className="space-y-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800 pb-2">
            2. Decisions and Why (Architectural & Design Choices)
          </h3>
          <div className="space-y-2.5">
            {(sections.decisionsAndWhy || []).map((c: Claim) => (
              <div
                key={c._id}
                onClick={() => {
                  setSelectedClaim(c);
                  setDrawerOpen(true);
                }}
                className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-teal-500 cursor-pointer transition-all flex items-start justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <StatusChip status={c.status} size="sm" />
                    <span className="text-[11px] font-mono text-slate-400">
                      {c.entityKey}
                    </span>
                  </div>
                  <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                    {c.text}
                  </p>
                </div>
                <ExternalLink size={14} className="text-slate-400 flex-shrink-0 mt-1" />
              </div>
            ))}
          </div>
        </section>

        {/* Section 3: Risks */}
        <section className="space-y-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800 pb-2">
            3. Risks & Recurring Deficiencies
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {(sections.risks || []).map((c: Claim) => (
              <div
                key={c._id}
                onClick={() => {
                  setSelectedClaim(c);
                  setDrawerOpen(true);
                }}
                className="p-3.5 rounded-xl border border-rose-200 dark:border-rose-950 bg-rose-50/30 dark:bg-rose-950/20 hover:border-rose-400 cursor-pointer transition-all space-y-1.5"
              >
                <div className="flex items-center justify-between text-xs">
                  <StatusChip status={c.status} size="sm" />
                  <span className="text-[11px] text-rose-600 font-semibold flex items-center space-x-0.5">
                    <span>Evidence</span>
                    <ExternalLink size={10} />
                  </span>
                </div>
                <p className="text-xs text-rose-950 dark:text-rose-200 font-medium">
                  {c.text}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Section 4: Dependencies & Blockers */}
        <section className="space-y-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800 pb-2">
            4. External Dependencies & Blockers
          </h3>
          <div className="space-y-2">
            {(sections.dependencies || []).map((c: Claim) => (
              <div
                key={c._id}
                onClick={() => {
                  setSelectedClaim(c);
                  setDrawerOpen(true);
                }}
                className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-teal-500 cursor-pointer text-xs flex justify-between items-center"
              >
                <span className="text-slate-800 dark:text-slate-200 font-medium">
                  {c.text}
                </span>
                <ExternalLink size={13} className="text-slate-400 ml-2" />
              </div>
            ))}
          </div>
        </section>

        {/* Section 5 & 6: Open Questions & Knowledge Gaps */}
        <section className="space-y-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800 pb-2">
            5 & 6. Open Questions & Knowledge Gaps
          </h3>
          <div className="space-y-2.5">
            {[...(sections.openQuestions || []), ...(sections.gaps || [])].map((c: Claim) => (
              <div
                key={c._id}
                onClick={() => {
                  setSelectedClaim(c);
                  setDrawerOpen(true);
                }}
                className="p-3.5 rounded-xl border border-purple-200 dark:border-purple-950 bg-purple-50/40 dark:bg-purple-950/20 text-xs space-y-1 cursor-pointer hover:border-purple-400"
              >
                <div className="flex items-center justify-between">
                  <StatusChip status={c.status} size="sm" />
                  {c.suggestedPerson && (
                    <span className="text-[11px] font-semibold text-purple-700 dark:text-purple-300">
                      Suggested: {c.suggestedPerson}
                    </span>
                  )}
                </div>
                <p className="text-xs text-purple-950 dark:text-purple-200 font-medium">
                  {c.text}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Section 7: Timeline (Chronological events & decisions) */}
        <section className="space-y-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800 pb-2">
            7. Chronological Project Timeline
          </h3>
          <div className="relative pl-6 border-l-2 border-teal-500/30 space-y-4">
            {(sections.timeline || []).map((t: any, idx: number) => (
              <div key={idx} className="relative group">
                <div className="absolute -left-[31px] top-1 w-3 h-3 rounded-full bg-teal-600 border-2 border-white dark:border-navy-900" />
                <div className="text-[11px] font-mono text-teal-700 dark:text-teal-400 font-bold">
                  {new Date(t.date).toLocaleDateString()}
                </div>
                <p className="text-xs text-slate-800 dark:text-slate-200 font-medium mt-0.5">
                  {t.title}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Section 8: Next Actions (Day 1 / Week 1 / Day 30) */}
        <section className="space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800 pb-2">
            8. Continuation Plan (Day 1 / Week 1 / Day 30)
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Day 1 */}
            <div className="p-4 rounded-xl border border-teal-200 dark:border-teal-900 bg-teal-50/30 dark:bg-teal-950/20 space-y-3">
              <div className="text-xs font-extrabold uppercase tracking-wider text-teal-800 dark:text-teal-300 pb-1 border-b border-teal-200 dark:border-teal-900 flex items-center justify-between">
                <span>Day 1: Onboarding</span>
                <span className="text-[10px] bg-teal-200 dark:bg-teal-900 px-1.5 py-0.5 rounded">
                  Immediate
                </span>
              </div>
              <div className="space-y-2 text-xs">
                {(sections.nextActions?.day1 || []).map((act: any) => (
                  <div key={act.id} className="p-2.5 rounded-lg bg-white dark:bg-navy-900 border border-teal-100 dark:border-teal-900/50">
                    <div className="font-bold text-slate-900 dark:text-slate-100">{act.title}</div>
                    <div className="text-[11px] text-slate-500 mt-1">{act.description}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Week 1 */}
            <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50/30 dark:bg-blue-950/20 space-y-3">
              <div className="text-xs font-extrabold uppercase tracking-wider text-blue-800 dark:text-blue-300 pb-1 border-b border-blue-200 dark:border-blue-900 flex items-center justify-between">
                <span>Week 1: Shadowing</span>
                <span className="text-[10px] bg-blue-200 dark:bg-blue-900 px-1.5 py-0.5 rounded">
                  Pairing
                </span>
              </div>
              <div className="space-y-2 text-xs">
                {(sections.nextActions?.week1 || []).map((act: any) => (
                  <div key={act.id} className="p-2.5 rounded-lg bg-white dark:bg-navy-900 border border-blue-100 dark:border-blue-900/50">
                    <div className="font-bold text-slate-900 dark:text-slate-100">{act.title}</div>
                    <div className="text-[11px] text-slate-500 mt-1">{act.description}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Day 30 */}
            <div className="p-4 rounded-xl border border-purple-200 dark:border-purple-900 bg-purple-50/30 dark:bg-purple-950/20 space-y-3">
              <div className="text-xs font-extrabold uppercase tracking-wider text-purple-800 dark:text-purple-300 pb-1 border-b border-purple-200 dark:border-purple-900 flex items-center justify-between">
                <span>Day 30: Autonomous</span>
                <span className="text-[10px] bg-purple-200 dark:bg-purple-900 px-1.5 py-0.5 rounded">
                  Full Ownership
                </span>
              </div>
              <div className="space-y-2 text-xs">
                {(sections.nextActions?.day30 || []).map((act: any) => (
                  <div key={act.id} className="p-2.5 rounded-lg bg-white dark:bg-navy-900 border border-purple-100 dark:border-purple-900/50">
                    <div className="font-bold text-slate-900 dark:text-slate-100">{act.title}</div>
                    <div className="text-[11px] text-slate-500 mt-1">{act.description}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Acknowledgement of Receipt Section (Section 5.5) */}
        <section className="p-4 sm:p-6 rounded-2xl border-2 border-teal-500/40 bg-teal-50/40 dark:bg-teal-950/30 space-y-4 print:hidden">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center space-x-2 text-teal-900 dark:text-teal-200 font-bold text-sm">
              <CheckCircle2 size={18} className="text-teal-600 flex-shrink-0" />
              <span>Formal Acknowledgement of Receipt</span>
            </div>
            {acknowledged && (
              <span className="text-xs font-bold text-emerald-700 bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300 px-2.5 py-1 rounded-full">
                Receipt Acknowledged
              </span>
            )}
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            As the incoming recipient, acknowledging receipt confirms you have received Version{' '}
            {handoverData?.activeVersionNumber || 1} of this handover plan. You can optionally raise questions back to the lead.
          </p>

          {!acknowledged ? (
            <div className="space-y-3">
              <textarea
                rows={2}
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
                placeholder="Optional: Raise a question or clarification request back to the lead..."
                className="w-full text-xs p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-navy-900 focus:ring-2 focus:ring-teal-500"
              />
              <Button
                size="sm"
                variant="primary"
                loading={ackLoading}
                onClick={handleAcknowledge}
                className="w-full sm:w-auto"
                icon={<CheckCircle2 size={14} />}
              >
                Acknowledge Receipt of Version {handoverData?.activeVersionNumber || 1}
              </Button>
            </div>
          ) : (
            <div className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 p-3 rounded-xl border border-emerald-200 dark:border-emerald-900">
              ✓ Successfully acknowledged by {user?.name} on {new Date().toLocaleDateString()}.
            </div>
          )}
        </section>

        {/* Stretch Q&A Assistant */}
        <section className="p-4 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-navy-950/60 space-y-4 print:hidden">
          <div className="flex items-center space-x-2 text-slate-900 dark:text-white font-bold text-sm">
            <Sparkles size={16} className="text-teal-600" />
            <span>Ask Relay Q&A Assistant (Cited Answers Only)</span>
          </div>

          <p className="text-xs text-slate-500">
            Ask questions about the handover. Answers are synthesized ONLY from approved claims within your permission scope.
          </p>

          <form onSubmit={handleAsk} className="flex gap-2">
            <input
              type="text"
              value={askQuery}
              onChange={(e) => setAskQuery(e.target.value)}
              placeholder="e.g. How is deployment handled? or Who owns Redis?"
              className="flex-1 text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-navy-900 focus:ring-2 focus:ring-teal-500"
            />
            <Button type="submit" variant="primary" size="sm" loading={askLoading}>
              Ask
            </Button>
          </form>

          {askResponse && (
            <div className="p-4 rounded-xl bg-white dark:bg-navy-900 border border-slate-200 dark:border-slate-800 text-xs space-y-2 animate-in fade-in">
              <div className="font-semibold text-slate-800 dark:text-slate-200">Answer:</div>
              <p className="text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                {askResponse.answer}
              </p>
              {askResponse.citations?.length > 0 && (
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400">
                  <span>Cited {askResponse.citations.length} approved claim(s).</span>
                </div>
              )}
            </div>
          )}
        </section>
      </div>

      {/* Evidence Drawer */}
      <EvidenceDrawer
        claim={selectedClaim}
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />
    </div>
  );
};
