import React, { useState, useEffect } from 'react';
import { useCase } from '../context/CaseContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { useNavigate } from 'react-router-dom';
import {
  HelpCircle,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Shield,
  UserCheck,
  RotateCcw,
  SkipForward,
  UserPlus,
  Lock,
  Sparkles,
  FileText,
  Compass,
} from 'lucide-react';

interface QuestionItem {
  _id: string;
  caseId: string;
  targetClaimId?: string;
  type: 'missing_owner' | 'decision_reason' | 'open_question' | 'conflict' | 'custom';
  entityKey?: string;
  attribute?: string;
  question: string;
  conflictingValues: string[];
  suggestedContact?: string;
  status: 'open' | 'answered' | 'skipped' | 'reassigned';
  acl: string;
  reassignedTo?: string;
  answer?: {
    text: string;
    chosenValue?: string;
    answeredBy?: string;
    answeredAt?: string;
    spanId?: string;
    claimId?: string;
    acl?: string;
  };
}

export const InterviewPage: React.FC = () => {
  const { currentCase, refreshCase } = useCase();
  const { user, role } = useAuth();
  const navigate = useNavigate();

  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [stats, setStats] = useState<any>({
    total: 0,
    answered: 0,
    open: 0,
    skipped: 0,
    reassigned: 0,
    completionPercentage: 0,
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [generating, setGenerating] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'open' | 'answered' | 'all'>('open');

  // Input states per question
  const [answersInput, setAnswersInput] = useState<Record<string, string>>({});
  const [chosenValues, setChosenValues] = useState<Record<string, string>>({});
  const [selectedAcls, setSelectedAcls] = useState<Record<string, string>>({});
  const [reassignInput, setReassignInput] = useState<Record<string, string>>({});
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchQuestions = async () => {
    if (!currentCase) return;
    setLoading(true);
    try {
      const res = await api.getInterviewQuestions(currentCase._id);
      if (res.questions) {
        setQuestions(res.questions);
        setStats(res.stats || {});
      }
    } catch (err: any) {
      console.error('Failed to fetch interview questions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, [currentCase]);

  const handleGenerate = async () => {
    if (!currentCase) return;
    setGenerating(true);
    try {
      const res = await api.generateInterviewQuestions(currentCase._id);
      if (res.questions) {
        setQuestions(res.questions);
        setStats(res.stats || {});
        setSuccessMessage('Generated gap-driven interview questions from project gaps and conflicts.');
        setTimeout(() => setSuccessMessage(null), 3500);
      }
    } catch (err: any) {
      alert(err.message || 'Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const handleAnswerSubmit = async (q: QuestionItem) => {
    if (!currentCase) return;
    const text = answersInput[q._id] || '';
    const chosenVal = chosenValues[q._id] || '';
    const acl = selectedAcls[q._id] || 'team';

    if (!text.trim() && !chosenVal) {
      alert('Please provide an answer or select a resolution value.');
      return;
    }

    setSubmittingId(q._id);
    try {
      await api.answerInterviewQuestion(currentCase._id, q._id, {
        answer: text.trim(),
        chosenValue: chosenVal,
        acl,
      });
      await fetchQuestions();
      await refreshCase();
      setSuccessMessage('Answer recorded as Attested evidence! Sent to Lead Review queue.');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to submit answer');
    } finally {
      setSubmittingId(null);
    }
  };

  const handleSkip = async (questionId: string) => {
    if (!currentCase) return;
    try {
      await api.skipInterviewQuestion(currentCase._id, questionId);
      await fetchQuestions();
    } catch (err: any) {
      alert(err.message || 'Failed to skip');
    }
  };

  const handleReassign = async (questionId: string) => {
    if (!currentCase) return;
    const contact = reassignInput[questionId];
    if (!contact || !contact.trim()) {
      alert('Please enter a contact name to reassign to.');
      return;
    }

    try {
      await api.reassignInterviewQuestion(currentCase._id, questionId, {
        suggestedContact: contact.trim(),
      });
      await fetchQuestions();
    } catch (err: any) {
      alert(err.message || 'Failed to reassign');
    }
  };

  const filteredQuestions = questions.filter((q) => {
    if (activeTab === 'open') return q.status === 'open';
    if (activeTab === 'answered') return q.status === 'answered';
    return true;
  });

  const isLead = role === 'lead';
  const isDeparting = role === 'departing';

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header & Purpose Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-xs font-semibold mb-1">
            <UserCheck size={14} />
            <span>Improvement 1: Gap-Driven Leaver Interview</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            Leaver Exit Interview
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-2xl mt-1">
            Every Missing gap and Conflicting claim is turned into a targeted question for the departing engineer ({currentCase?.departingMemberName || 'Aarav'}). Answers become verbatim spans and Attested claims pending Lead review.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            loading={generating}
            onClick={handleGenerate}
            icon={<RotateCcw size={14} />}
          >
            Regenerate Questions
          </Button>

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
      </div>

      {successMessage && (
        <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs flex items-center space-x-2">
          <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Progress & Completion Bar */}
      <Card className="p-5 bg-gradient-to-r from-slate-50 to-emerald-50/30 dark:from-navy-900 dark:to-emerald-950/10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div>
            <div className="text-xs font-bold text-slate-700 dark:text-slate-200">
              Interview Completion Progress
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              {stats.answered} of {stats.total} questions answered ({stats.open} open gaps remaining)
            </div>
          </div>
          <div className="flex items-center space-x-3 text-xs">
            <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-base">
              {stats.completionPercentage}%
            </span>
          </div>
        </div>

        {/* Visual Progress Bar */}
        <div className="w-full bg-slate-200 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
          <div
            className="bg-emerald-500 h-2.5 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${stats.completionPercentage}%` }}
          />
        </div>

        <div className="flex flex-wrap gap-4 mt-3 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
          <span className="flex items-center space-x-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Answered: {stats.answered}</span>
          </span>
          <span className="flex items-center space-x-1">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span>Open Gaps: {stats.open}</span>
          </span>
          <span className="flex items-center space-x-1">
            <span className="w-2 h-2 rounded-full bg-slate-400" />
            <span>Skipped: {stats.skipped}</span>
          </span>
          {stats.reassigned > 0 && (
            <span className="flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-indigo-500" />
              <span>Reassigned: {stats.reassigned}</span>
            </span>
          )}
        </div>
      </Card>

      {/* Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('open')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            activeTab === 'open'
              ? 'bg-emerald-600 text-white'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Open Questions ({stats.open})
        </button>
        <button
          onClick={() => setActiveTab('answered')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            activeTab === 'answered'
              ? 'bg-emerald-600 text-white'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Answered ({stats.answered})
        </button>
        <button
          onClick={() => setActiveTab('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            activeTab === 'all'
              ? 'bg-emerald-600 text-white'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          All ({questions.length})
        </button>
      </div>

      {/* Questions List */}
      <div className="space-y-4">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading interview questions...</div>
        ) : filteredQuestions.length === 0 ? (
          <Card className="p-8 text-center space-y-3">
            <CheckCircle2 size={32} className="mx-auto text-emerald-500" />
            <div className="text-sm font-bold text-slate-800 dark:text-white">
              No open questions, nothing left to hand over!
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              All identified knowledge gaps, owner ambiguities, and conflicting facts have been answered or resolved.
            </p>
            {isLead && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => navigate('/review')}
                className="mt-2"
              >
                Go to Review & Publish
              </Button>
            )}
          </Card>
        ) : (
          filteredQuestions.map((q, idx) => {
            const isAnswered = q.status === 'answered';
            const isSkipped = q.status === 'skipped';
            const isConflict = q.type === 'conflict';

            return (
              <Card
                key={q._id}
                className={`p-5 space-y-4 border transition-all ${
                  isAnswered
                    ? 'border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/20 dark:bg-emerald-950/10'
                    : isConflict
                    ? 'border-rose-200 dark:border-rose-900/60 bg-rose-50/20 dark:bg-rose-950/10'
                    : 'border-slate-200 dark:border-slate-800'
                }`}
              >
                {/* Question Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 font-mono">
                        Q{idx + 1}
                      </span>

                      {/* Type Badge */}
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                          isConflict
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                            : q.type === 'missing_owner'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            : q.type === 'decision_reason'
                            ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300'
                            : 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300'
                        }`}
                      >
                        {isConflict
                          ? 'Conflicting Evidence'
                          : q.type === 'missing_owner'
                          ? 'Missing Owner Gap'
                          : q.type === 'decision_reason'
                          ? 'Missing Decision Reason'
                          : 'Open Knowledge Gap'}
                      </span>

                      {/* Target Entity */}
                      {q.entityKey && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {q.entityKey}
                        </span>
                      )}

                      {/* Suggested Contact */}
                      {q.suggestedContact && (
                        <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
                          Suggested contact: <strong>{q.suggestedContact}</strong>
                        </span>
                      )}

                      {/* ACL Badge */}
                      {q.acl === 'leads_only' && (
                        <span className="inline-flex items-center space-x-1 text-[10px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950 px-1.5 py-0.5 rounded">
                          <Lock size={10} />
                          <span>Leads Only</span>
                        </span>
                      )}
                    </div>

                    <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-snug pt-1">
                      {q.question}
                    </h3>
                  </div>

                  {/* Status Indicator */}
                  <div>
                    {isAnswered ? (
                      <span className="inline-flex items-center space-x-1 text-[11px] font-bold text-emerald-700 bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300 px-2.5 py-1 rounded-full">
                        <CheckCircle2 size={13} />
                        <span>Answered</span>
                      </span>
                    ) : isSkipped ? (
                      <span className="text-[11px] font-bold text-slate-600 bg-slate-100 dark:bg-slate-800 dark:text-slate-400 px-2.5 py-1 rounded-full">
                        Skipped (Gap Remains)
                      </span>
                    ) : (
                      <span className="text-[11px] font-bold text-amber-700 bg-amber-100 dark:bg-amber-950 dark:text-amber-300 px-2.5 py-1 rounded-full">
                        Needs Answer
                      </span>
                    )}
                  </div>
                </div>

                {/* Conflict Choice Buttons (If conflicting values exist) */}
                {isConflict && !isAnswered && q.conflictingValues && q.conflictingValues.length > 0 && (
                  <div className="p-3 rounded-xl bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/60 space-y-2">
                    <div className="text-[11px] font-semibold text-rose-900 dark:text-rose-200">
                      Select which source value is correct according to reality:
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {q.conflictingValues.map((val) => {
                        const isChosen = chosenValues[q._id] === val;
                        return (
                          <button
                            key={val}
                            type="button"
                            onClick={() => setChosenValues({ ...chosenValues, [q._id]: val })}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                              isChosen
                                ? 'bg-rose-600 text-white shadow-sm ring-2 ring-rose-600/30'
                                : 'bg-white dark:bg-slate-800 border border-rose-200 dark:border-rose-800 text-slate-800 dark:text-slate-200 hover:border-rose-400'
                            }`}
                          >
                            ✓ Value: "{val}"
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* If Already Answered: Show Verbatim Evidence */}
                {isAnswered && q.answer && (
                  <div className="p-3.5 rounded-xl bg-white dark:bg-navy-950 border border-emerald-200 dark:border-emerald-900 text-xs space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                      <span className="font-semibold text-emerald-800 dark:text-emerald-300">
                        Recorded Answer (Span: {q.answer.spanId || 'INT.Q'}):
                      </span>
                      <span>By {q.answer.answeredBy}</span>
                    </div>
                    <blockquote className="p-2.5 bg-slate-50 dark:bg-slate-900 rounded-lg border-l-2 border-emerald-500 font-mono text-[11px] text-slate-800 dark:text-slate-200 italic">
                      "{q.answer.text}"
                    </blockquote>
                    <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1">
                      <span>Linked Attested Claim created</span>
                      <span className="font-semibold text-amber-600 dark:text-amber-400">
                        Pending Lead Approval in Review
                      </span>
                    </div>
                  </div>
                )}

                {/* Answer Input Box (If open) */}
                {!isAnswered && (
                  <div className="space-y-3 pt-2">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        {isConflict ? 'Context & Reason for Chosen Value:' : 'Your Answer (will be stored as verbatim cited evidence):'}
                      </label>
                      <textarea
                        rows={3}
                        value={answersInput[q._id] || ''}
                        onChange={(e) =>
                          setAnswersInput({ ...answersInput, [q._id]: e.target.value })
                        }
                        placeholder={
                          isConflict
                            ? 'Explain why this choice is correct and which previous decision or code change made it so...'
                            : 'Provide the specific factual answer, current status, and handover context...'
                        }
                        className="w-full text-xs p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-sans"
                      />
                    </div>

                    {/* Sensitivity selector and action buttons */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                      <div className="flex items-center space-x-2 text-xs">
                        <span className="text-slate-500 dark:text-slate-400 text-[11px]">Visibility:</span>
                        <select
                          value={selectedAcls[q._id] || 'team'}
                          onChange={(e) =>
                            setSelectedAcls({ ...selectedAcls, [q._id]: e.target.value })
                          }
                          className="text-[11px] px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-navy-950 font-medium"
                        >
                          <option value="team">Whole Team (General Handover)</option>
                          <option value="leads_only">Leads Only (Confidential / Billing)</option>
                        </select>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSkip(q._id)}
                          className="text-slate-500 hover:text-slate-800 text-xs"
                          icon={<SkipForward size={14} />}
                        >
                          Skip
                        </Button>

                        <Button
                          variant="primary"
                          size="sm"
                          loading={submittingId === q._id}
                          onClick={() => handleAnswerSubmit(q)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm"
                          icon={<CheckCircle2 size={14} />}
                        >
                          Attest & Submit Answer
                        </Button>
                      </div>
                    </div>

                    {/* Lead tools: Reassignment */}
                    {isLead && (
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center space-x-2 text-xs">
                        <span className="text-slate-400 text-[11px]">Lead Tool: Reassign to</span>
                        <input
                          type="text"
                          placeholder="e.g. Priya (Tech Lead)"
                          value={reassignInput[q._id] || ''}
                          onChange={(e) =>
                            setReassignInput({ ...reassignInput, [q._id]: e.target.value })
                          }
                          className="text-[11px] px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleReassign(q._id)}
                          className="text-[11px] py-1 px-2"
                        >
                          Reassign
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
};
