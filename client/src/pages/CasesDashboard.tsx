import React, { useState, useEffect } from 'react';
import { useCase } from '../context/CaseContext';
import { api } from '../api/client';
import { Case } from '../types';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Skeleton } from '../components/common/Skeleton';
import { useNavigate } from 'react-router-dom';
import {
  Layers,
  Plus,
  ArrowRight,
  User,
  Clock,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Database,
} from 'lucide-react';

export const CasesDashboard: React.FC = () => {
  const { cases, selectCase, loadDemoProject, isSeeding, refreshCase } = useCase();
  const [loading, setLoading] = useState<boolean>(false);
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [title, setTitle] = useState<string>('');
  const [departingMember, setDepartingMember] = useState<string>('');
  const [creating, setCreating] = useState<boolean>(false);
  const navigate = useNavigate();

  const handleSelect = async (c: Case) => {
    await selectCase(c._id);
    if (c.status === 'published') {
      navigate('/handover');
    } else {
      navigate('/review');
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !departingMember.trim()) return;

    setCreating(true);
    try {
      const res = await api.createCase({
        title: title.trim(),
        departingMemberName: departingMember.trim(),
      });
      if (res.case) {
        setShowCreateModal(false);
        setTitle('');
        setDepartingMember('');
        await refreshCase();
        await selectCase(res.case._id);
        navigate('/connect');
      }
    } catch (err) {
      console.error('Failed to create case:', err);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Layers className="text-teal-600" size={24} />
            Handover Cases
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Manage departing team members, reconstruct evidence, and track verification progress.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
          <Button
            size="sm"
            variant="outline"
            loading={isSeeding}
            onClick={loadDemoProject}
            icon={<Database size={14} />}
          >
            Reset Demo Project
          </Button>
          <Button
            size="sm"
            variant="primary"
            onClick={() => setShowCreateModal(true)}
            icon={<Plus size={14} />}
          >
            Create New Case
          </Button>
        </div>
      </div>

      {/* Cases Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cases.map((c) => {
          const stats: any = c.stats || {};
          const isPublished = c.status === 'published';

          return (
            <Card
              key={c._id}
              hoverable
              onClick={() => handleSelect(c)}
              className="flex flex-col justify-between space-y-4 border hover:border-teal-500 transition-all"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span
                    className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                      isPublished
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : c.status === 'in_review'
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                  >
                    {isPublished ? `Published (v${c.currentVersion || 1})` : c.status === 'in_review' ? 'In Review' : 'Draft'}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {c.createdAt ? new Date(c.createdAt).toLocaleDateString() : ''}
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white leading-snug">
                    {c.title}
                  </h3>
                  <div className="flex items-center space-x-1.5 text-xs text-slate-500 dark:text-slate-400 mt-1">
                    <User size={13} className="text-teal-600" />
                    <span>Departing: <strong>{c.departingMemberName}</strong></span>
                  </div>
                </div>

                {/* Progress Strip */}
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-center">
                  <div className="p-2 rounded-lg bg-slate-50 dark:bg-navy-950">
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      {stats.sourceCount ?? '-'}
                    </div>
                    <div className="text-[10px] text-slate-400">Sources</div>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-50 dark:bg-navy-950">
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      {stats.claimCount ?? '-'}
                    </div>
                    <div className="text-[10px] text-slate-400">Claims</div>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-50 dark:bg-navy-950">
                    <div className="text-xs font-bold text-emerald-600">
                      {stats.approvedCount ?? '-'}
                    </div>
                    <div className="text-[10px] text-slate-400">Approved</div>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs font-semibold text-teal-600 dark:text-teal-400">
                <span>Open Workflow</span>
                <ArrowRight size={14} />
              </div>
            </Card>
          );
        })}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white dark:bg-navy-900 rounded-2xl max-w-md w-full p-4 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[92vh] overflow-y-auto animate-in fade-in zoom-in-95">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">
              Initiate New Handover Case
            </h3>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Project / Initiative Title:
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Volunteer Check-In Module"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-navy-950 focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Departing Team Member:
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Alex (Fullstack Lead)"
                  value={departingMember}
                  onChange={(e) => setDepartingMember(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-navy-950 focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm" loading={creating}>
                  Create & Connect Sources
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
